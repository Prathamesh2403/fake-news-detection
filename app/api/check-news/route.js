import { NextResponse } from "next/server";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `You are an expert fact-checking assistant. A user will provide a news headline or article snippet.

Your task:
1. Analyze the text for signs of misinformation, sensationalism, logical inconsistencies, or known false claims.
2. Classify it as one of exactly three verdicts:
   - "Likely Real" — the content appears credible, uses measured language, and aligns with established facts.
   - "Likely Fake" — the content contains clear signs of misinformation, fabricated claims, extreme sensationalism, or logical impossibilities.
   - "Uncertain" — the content cannot be confidently classified either way (e.g., opinion pieces, claims requiring specialist knowledge, or insufficient context).
3. Write a 1–2 sentence reasoning explaining your classification.

IMPORTANT: You MUST respond with ONLY valid JSON — no markdown, no code fences, no extra text. Use this exact shape:
{"verdict": "<Likely Real | Likely Fake | Uncertain>", "reasoning": "<1-2 sentences>"}`;

export async function POST(request) {
  // 1. Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { text } = body ?? {};

  // 2. Validate input
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide a non-empty 'text' field." },
      { status: 400 }
    );
  }

  if (text.trim().length > 5000) {
    return NextResponse.json(
      { error: "Text is too long. Please keep it under 5000 characters." },
      { status: 400 }
    );
  }

  // 3. Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set.");
    return NextResponse.json(
      { error: "Server configuration error. API key is missing." },
      { status: 500 }
    );
  }

  // 4. Call Gemini API
  let rawText;
  try {
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: text.trim() }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errData = await geminiResponse.json().catch(() => ({}));
      console.error("Gemini API error:", geminiResponse.status, errData);
      return NextResponse.json(
        { error: "AI service is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();
    rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch (networkErr) {
    console.error("Network error calling Gemini:", networkErr);
    return NextResponse.json(
      { error: "Failed to reach the AI service. Please try again." },
      { status: 502 }
    );
  }

  // 5. Parse JSON response from model
  let parsed;
  try {
    // Robustly find JSON object {...} in rawText (handles preamble text or markdown fences)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : rawText.trim();
    parsed = JSON.parse(jsonString);
  } catch {
    console.error("Failed to parse model response:", rawText);
    return NextResponse.json(
      { error: "Unexpected response from AI. Please try again." },
      { status: 500 }
    );
  }

  // 6. Validate verdict field
  const VALID_VERDICTS = ["Likely Real", "Likely Fake", "Uncertain"];
  if (!VALID_VERDICTS.includes(parsed.verdict) || typeof parsed.reasoning !== "string") {
    console.error("Invalid model JSON shape:", parsed);
    return NextResponse.json(
      { error: "Unexpected response format from AI. Please try again." },
      { status: 500 }
    );
  }

  // 7. Return clean result
  return NextResponse.json(
    {
      verdict: parsed.verdict,
      reasoning: parsed.reasoning.trim(),
    },
    { status: 200 }
  );
}
