import { NextResponse } from "next/server";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── Timeouts (ms) ────────────────────────────────────────────────
const SEARCH_OVERALL_TIMEOUT_MS = 4_500;   // 4.5s max for external search APIs
const PIPELINE_HARD_LIMIT_MS    = 20_000;  // 20s total pipeline hard cap

// Helper: collect de-duped keys from single env var + comma-list env var
function getApiKeys(singleVar, listVar) {
  const keys = [];
  if (singleVar) keys.push(singleVar);
  if (listVar) {
    listVar.split(",").map((k) => k.trim()).filter(Boolean).forEach((k) => {
      if (!keys.includes(k)) keys.push(k);
    });
  }
  return keys;
}

function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "Web Source";
  }
}

// ── Gemini call with proper thought part filtering and timeout ─────
async function callGemini(systemPrompt, userPrompt, isJson = false, maxTokens = 4096, timeoutMs = 7000) {
  const geminiKeys = getApiKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS);
  if (geminiKeys.length === 0) throw new Error("GEMINI_API_KEY is not set.");

  let lastError = null;
  for (const apiKey of geminiKeys) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${GEMINI_BASE_URL}?key=${apiKey}`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: maxTokens,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            ...(isJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
      });
      clearTimeout(timer);

      if (!response.ok) {
        // If 400 (e.g. thinkingConfig not supported), retry without thinkingConfig
        if (response.status === 400) {
          const fallbackRes = await fetch(`${GEMINI_BASE_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: maxTokens,
                ...(isJson ? { responseMimeType: "application/json" } : {}),
              },
            }),
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            return extractTextFromGeminiResponse(data);
          }
        }
        lastError = new Error(`Gemini HTTP ${response.status}`);
        continue; // rotate to next key
      }

      const data = await response.json();
      return extractTextFromGeminiResponse(data);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini API keys failed or timed out.");
}

// Robustly extracts actual response text, skipping internal thought blocks in Gemini 2.5
function extractTextFromGeminiResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  if (parts.length === 0) return "";

  // Filter out thought parts (Gemini 2.5 marks thinking parts with thought: true)
  const finalParts = parts.filter((p) => !p.thought && typeof p.text === "string");
  if (finalParts.length > 0) {
    return finalParts.map((p) => p.text).join("");
  }
  // If no parts explicitly marked, return the last part (as thoughts precede final answer)
  return parts[parts.length - 1]?.text ?? "";
}

// ── Tavily search with overall timeout ────────────────────────────
async function searchTavily(query) {
  const keys = getApiKeys(process.env.TAVILY_API_KEY, process.env.TAVILY_API_KEYS);
  if (keys.length === 0) return [];

  const overallController = new AbortController();
  const overallTimer = setTimeout(() => overallController.abort(), SEARCH_OVERALL_TIMEOUT_MS);

  for (const apiKey of keys) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        signal: overallController.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "advanced",
          include_answer: true,
          max_results: 5,
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      clearTimeout(overallTimer);
      return (data?.results || []).map((item) => ({
        source_name: item.title || getDomain(item.url),
        url: item.url,
        snippet: (item.content || item.title || "").slice(0, 180),
        published_date: item.published_date || null,
      }));
    } catch {
      if (overallController.signal.aborted) break;
    }
  }
  clearTimeout(overallTimer);
  return [];
}

// ── NewsData.io search with overall timeout ───────────────────────
async function searchNewsData(query) {
  const keys = getApiKeys(process.env.NEWSDATA_API_KEY, process.env.NEWSDATA_API_KEYS);
  if (keys.length === 0) return [];

  const overallController = new AbortController();
  const overallTimer = setTimeout(() => overallController.abort(), SEARCH_OVERALL_TIMEOUT_MS);

  for (const apiKey of keys) {
    try {
      const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { signal: overallController.signal });

      if (!res.ok) continue;

      const data = await res.json();
      clearTimeout(overallTimer);
      return (data?.results || []).map((item) => ({
        source_name: item.source_name || item.source_id || getDomain(item.link),
        url: item.link,
        snippet: (item.description || item.title || "").slice(0, 180),
        published_date: item.pubDate || null,
      }));
    } catch {
      if (overallController.signal.aborted) break;
    }
  }
  clearTimeout(overallTimer);
  return [];
}

// ── Main pipeline ─────────────────────────────────────────────────
async function runPipeline(text) {
  const now = new Date();
  const currentDateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // STAGE 1 — Fast Claim Extraction
  let extractedClaim = text.trim();
  try {
    const extractionSystemPrompt = `You are a fact-checking claim extractor.
Convert the user's input (which may be a question like "Is it true that X?" or "Has X happened?") into a single direct, affirmative declarative factual statement to verify (e.g. "Narendra Modi has resigned as the Prime Minister of India").
Do NOT output questions. Return ONLY the plain text declarative sentence.`;

    const raw = await callGemini(extractionSystemPrompt, text.trim(), false, 200, 3500);
    const cleaned = raw.trim().replace(/^["']|["']$/g, "");
    if (cleaned.length > 4 && !cleaned.endsWith("?")) {
      extractedClaim = cleaned;
    }
  } catch {
    extractedClaim = text.trim();
  }

  // STAGE 2 — Parallel evidence search (Tavily + NewsData)
  const [tavilyResults, newsDataResults] = await Promise.all([
    searchTavily(extractedClaim),
    searchNewsData(extractedClaim),
  ]);

  // Merge & deduplicate by domain, cap at 6 sources
  const seenDomains = new Set();
  const evidence = [];
  for (const item of [...tavilyResults, ...newsDataResults]) {
    if (!item.url) continue;
    const domain = getDomain(item.url);
    if (seenDomains.has(domain)) continue;
    seenDomains.add(domain);
    evidence.push({
      source_name: item.source_name || domain,
      url: item.url,
      snippet: (item.snippet || "").slice(0, 180),
      published_date: item.published_date || null,
    });
    if (evidence.length >= 6) break;
  }

  // STAGE 3 — Final verdict via Gemini
  const evidenceBlock = evidence.length > 0
    ? evidence.map((e, i) =>
        `[${i + 1}] ${e.source_name} | ${e.url}${e.published_date ? ` (Date: ${e.published_date})` : ""}\n    Snippet: ${e.snippet}`
      ).join("\n")
    : "NO EXTERNAL EVIDENCE FOUND.";

  const systemPrompt = `You are an expert fact-checking AI assistant.
Today's reference date is: ${currentDateStr} (Year: ${now.getFullYear()}).

Analyze the claim against the provided evidence and general factual knowledge. Output a single valid JSON object:
{
  "verdict": "Likely Real" | "Likely Fake" | "Uncertain",
  "confidence": number (0 to 100),
  "claim_extracted": string,
  "reasoning": string (2-3 concise sentences explaining why the claim is true, false, or uncertain),
  "supporting_sources": [{ "name": string, "url": string, "snippet": string }],
  "contradicting_sources": [{ "name": string, "url": string, "snippet": string }],
  "red_flags": string[]
}

RULES:
1. TEMPORAL & CURRENT STATUS GROUNDING:
   - If a claim asserts a sitting leader or official has resigned or vacated office, but in reality they currently remain in power (or the resignation mentioned in articles was a past procedural formality before taking oath again), classify as "Likely Fake" or "Uncertain" and clarify in reasoning that they remain the current leader.
   - If credible recent news confirms an active, ongoing crisis, event, or announcement, classify as "Likely Real".
2. EVIDENCE CATEGORIZATION:
   - "supporting_sources": Sources confirming the specific claim is currently true.
   - "contradicting_sources": Sources stating the claim is false, debunked, misleading, or confirming the opposite status.
3. NO EVIDENCE: If 0 sources found and claim is unverified, verdict="Uncertain", confidence<=30, add "insufficient external evidence" to red_flags.
4. Keep reasoning concise (under 60 words). Return ONLY the raw JSON object.`;

  const userPrompt = `Today's Date: ${currentDateStr}
User Input: ${text.trim().slice(0, 400)}
Extracted Claim: ${extractedClaim.slice(0, 200)}
Live Evidence Sources (${evidence.length}):
${evidenceBlock}`;

  const rawVerdict = await callGemini(systemPrompt, userPrompt, true, 2048, 7500);

  // STAGE 4 — Parse JSON robustly
  const jsonMatch = rawVerdict.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Verdict parse failure, raw:", rawVerdict.slice(0, 300));
    throw new Error("AI returned unparseable response. Please try again.");
  }
  const parsed = JSON.parse(jsonMatch[0]);

  // Validate + enforce fallback rules
  const VALID = ["Likely Real", "Likely Fake", "Uncertain"];
  let verdict = VALID.includes(parsed.verdict) ? parsed.verdict : "Uncertain";
  let confidence = typeof parsed.confidence === "number"
    ? Math.min(100, Math.max(0, parsed.confidence)) : 50;
  let redFlags = Array.isArray(parsed.red_flags)
    ? parsed.red_flags.map((f) => String(f).trim()).filter(Boolean) : [];

  if (evidence.length === 0 && verdict === "Uncertain") {
    confidence = Math.min(confidence, 30);
    if (!redFlags.some((f) => f.toLowerCase().includes("insufficient"))) {
      redFlags.unshift("insufficient external evidence");
    }
  }

  const mapSource = (s) => ({
    name: s.name || getDomain(s.url || ""),
    url:  s.url  || "#",
    snippet: (s.snippet || "").slice(0, 140),
  });

  return {
    verdict,
    confidence,
    claim_extracted: extractedClaim,
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "Analysis complete.",
    supporting_sources:    (Array.isArray(parsed.supporting_sources)    ? parsed.supporting_sources    : []).map(mapSource),
    contradicting_sources: (Array.isArray(parsed.contradicting_sources) ? parsed.contradicting_sources : []).map(mapSource),
    red_flags: redFlags,
  };
}

// ── Route handler ─────────────────────────────────────────────────
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { text } = body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Please provide a non-empty news headline or snippet." },
      { status: 400 }
    );
  }
  if (text.trim().length > 5000) {
    return NextResponse.json(
      { error: "Text is too long. Please keep it under 5000 characters." },
      { status: 400 }
    );
  }

  // Hard 20-second total timeout via Promise.race
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Analysis timed out. The AI service is overloaded — please try again in a moment.")), PIPELINE_HARD_LIMIT_MS)
  );

  try {
    const result = await Promise.race([runPipeline(text), timeout]);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const isTimeout = err.message.toLowerCase().includes("timed out") ||
                      err.message.toLowerCase().includes("abort");
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
