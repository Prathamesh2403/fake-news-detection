"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

const VERDICT_CONFIG = {
  "Likely Real": {
    icon: "✓",
    label: "Likely Real",
    className: styles.verdictReal,
  },
  "Likely Fake": {
    icon: "✕",
    label: "Likely Fake",
    className: styles.verdictFake,
  },
  Uncertain: {
    icon: "?",
    label: "Uncertain",
    className: styles.verdictUncertain,
  },
};

const EXAMPLE_CLAIMS = [
  "NASA confirms discovery of seasonal liquid water streams on Mars",
  "Scientists confirm the Moon is hollow and constructed by ancient aliens",
  "Drinking ocean water twice daily cures all viral infections in 24 hours",
  "Federal Reserve adjusts benchmark interest rates following monthly meeting",
];

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(1);
  const [error, setError] = useState("");
  const timerRefs = useRef([]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(clearTimeout);
    };
  }, []);

  async function handleCheck(claimToTest) {
    const textToSubmit = typeof claimToTest === "string" ? claimToTest : text;
    const trimmed = textToSubmit.trim();

    if (!trimmed) {
      setError("Please enter a news headline or article snippet.");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);
    setPipelineStep(1);

    // Clear old timers
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    // Simulate 3-step pipeline progress transitions
    const t1 = setTimeout(() => setPipelineStep(2), 1200);
    const t2 = setTimeout(() => setPipelineStep(3), 3200);
    timerRefs.current = [t1, t2];

    try {
      const res = await fetch("/api/check-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong during check. Please try again.");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
      timerRefs.current.forEach(clearTimeout);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleCheck();
    }
  }

  function handleSelectExample(claim) {
    setText(claim);
    setError("");
    handleCheck(claim);
  }

  const verdictInfo = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG["Uncertain"] : null;
  const isInsufficientEvidence =
    result?.verdict === "Uncertain" &&
    result?.red_flags?.some((flag) => flag.toLowerCase().includes("insufficient external evidence"));

  return (
    <main className={styles.main}>
      {/* Background Orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.badge}>Multi-Source Fact Checker</div>
          <h1 className={styles.title}>
            Fake News <span className={styles.titleAccent}>Detector</span>
          </h1>
          <p className={styles.subtitle}>
            Cross-reference news claims in real-time against live web sources, 
            detecting <strong>Likely Real</strong>, <strong>Likely Fake</strong>, or{" "}
            <strong>Uncertain</strong> content.
          </p>
        </header>

        {/* Input Card */}
        <div className={styles.card}>
          <label htmlFor="news-input" className={styles.label}>
            News Headline or Snippet
          </label>
          <textarea
            id="news-input"
            className={styles.textarea}
            placeholder="Paste a news headline, article excerpt, or social media claim here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            disabled={loading}
          />
          <div className={styles.textareaFooter}>
            <span className={styles.hint}>Tip: Press Ctrl+Enter to check</span>
            <span className={styles.charCount}>{text.length} chars</span>
          </div>

          {/* Example Claims */}
          <div className={styles.examplesContainer}>
            <span className={styles.examplesTitle}>Try an example claim:</span>
            <div className={styles.examplesList}>
              {EXAMPLE_CLAIMS.map((claim, idx) => (
                <button
                  key={idx}
                  className={styles.exampleChip}
                  onClick={() => handleSelectExample(claim)}
                  disabled={loading}
                >
                  "{claim.slice(0, 45)}…"
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="check-button"
            className={styles.button}
            onClick={() => handleCheck()}
            disabled={loading || !text.trim()}
          >
            <span className={styles.buttonInner}>
              <span className={styles.buttonIcon} aria-hidden="true">⚡</span>
              {loading ? "Analyzing Claim Pipeline..." : "Check News Claim"}
            </span>
          </button>

          {/* Error Message */}
          {error && (
            <div className={styles.errorBox} role="alert">
              <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
              {error}
            </div>
          )}
        </div>

        {/* Pipeline Loading State (3 Steps) */}
        {loading && (
          <div className={styles.pipelineCard} role="status">
            <div className={styles.pipelineHeader}>Real-Time Verification Pipeline</div>
            <div className={styles.pipelineSteps}>
              <div
                className={`${styles.pipelineStepItem} ${
                  pipelineStep > 1
                    ? styles.stepCompleted
                    : pipelineStep === 1
                    ? styles.stepActive
                    : styles.stepPending
                }`}
              >
                <div className={styles.stepIconContainer}>
                  {pipelineStep > 1 ? "✓" : "1"}
                </div>
                <span>Step 1: Extracting core claim statement…</span>
              </div>

              <div
                className={`${styles.pipelineStepItem} ${
                  pipelineStep > 2
                    ? styles.stepCompleted
                    : pipelineStep === 2
                    ? styles.stepActive
                    : styles.stepPending
                }`}
              >
                <div className={styles.stepIconContainer}>
                  {pipelineStep > 2 ? "✓" : "2"}
                </div>
                <span>Step 2: Cross-referencing Tavily & NewsData sources…</span>
              </div>

              <div
                className={`${styles.pipelineStepItem} ${
                  pipelineStep === 3 ? styles.stepActive : styles.stepPending
                }`}
              >
                <div className={styles.stepIconContainer}>3</div>
                <span>Step 3: Synthesizing evidence & verdict classification…</span>
              </div>
            </div>
          </div>
        )}

        {/* Results Card */}
        {result && verdictInfo && !loading && (
          <div
            className={`${styles.resultCard} ${verdictInfo.className}`}
            role="region"
            aria-label="Fact check verdict result"
          >
            {/* Header: Verdict + Confidence Score */}
            <div className={styles.verdictHeaderRow}>
              <div className={styles.verdictRow}>
                <span className={styles.verdictIcon} aria-hidden="true">
                  {verdictInfo.icon}
                </span>
                <div>
                  <div className={styles.verdictLabel}>Verdict</div>
                  <div className={styles.verdictText}>{verdictInfo.label}</div>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className={styles.confidenceBox}>
                <div className={styles.confidenceHeader}>
                  <span>Confidence Score</span>
                  <span className={styles.confidenceValue}>{result.confidence}%</span>
                </div>
                <div className={styles.confidenceTrack}>
                  <div
                    className={styles.confidenceFill}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Extracted Claim */}
            {result.claim_extracted && (
              <div className={styles.claimBox}>
                <div className={styles.claimLabel}>Extracted Factual Claim</div>
                <div className={styles.claimText}>"{result.claim_extracted}"</div>
              </div>
            )}

            {/* Reasoning */}
            <div className={styles.reasoning}>
              <div className={styles.reasoningLabel}>Fact-Check Reasoning</div>
              <p className={styles.reasoningText}>{result.reasoning}</p>
            </div>

            {/* Insufficient External Evidence Callout */}
            {isInsufficientEvidence && (
              <div className={styles.insufficientCallout}>
                <span className={styles.calloutIcon}>⚠️</span>
                <span>Not enough external sources found to verify this claim.</span>
              </div>
            )}

            {/* Evidence Columns */}
            <div className={styles.evidenceSection}>
              <div className={styles.evidenceGrid}>
                {/* Supporting Sources */}
                <div className={styles.evidenceColumn}>
                  <div className={`${styles.evidenceHeader} ${styles.supportingHeader}`}>
                    <span>Supporting Sources</span>
                    <span className={styles.sourceBadgeCount}>
                      {result.supporting_sources?.length || 0}
                    </span>
                  </div>
                  <div className={styles.sourceList}>
                    {result.supporting_sources && result.supporting_sources.length > 0 ? (
                      result.supporting_sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceCard}
                        >
                          <div className={styles.sourceTop}>
                            <span className={styles.sourceName}>{src.name}</span>
                            <span className={styles.sourceIcon}>↗</span>
                          </div>
                          {src.snippet && (
                            <p className={styles.sourceSnippet}>{src.snippet}</p>
                          )}
                        </a>
                      ))
                    ) : (
                      <div className={styles.emptySources}>No supporting sources found</div>
                    )}
                  </div>
                </div>

                {/* Contradicting Sources */}
                <div className={styles.evidenceColumn}>
                  <div className={`${styles.evidenceHeader} ${styles.contradictingHeader}`}>
                    <span>Contradicting Sources</span>
                    <span className={styles.sourceBadgeCount}>
                      {result.contradicting_sources?.length || 0}
                    </span>
                  </div>
                  <div className={styles.sourceList}>
                    {result.contradicting_sources && result.contradicting_sources.length > 0 ? (
                      result.contradicting_sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceCard}
                        >
                          <div className={styles.sourceTop}>
                            <span className={styles.sourceName}>{src.name}</span>
                            <span className={styles.sourceIcon}>↗</span>
                          </div>
                          {src.snippet && (
                            <p className={styles.sourceSnippet}>{src.snippet}</p>
                          )}
                        </a>
                      ))
                    ) : (
                      <div className={styles.emptySources}>No contradicting sources found</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Red Flags */}
            {result.red_flags && result.red_flags.length > 0 && (
              <div className={styles.redFlagsSection}>
                <div className={styles.redFlagsLabel}>Flags & Risk Indicators</div>
                <div className={styles.redFlagsList}>
                  {result.red_flags.map((flag, idx) => {
                    const isSevere =
                      flag.toLowerCase().includes("fake") ||
                      flag.toLowerCase().includes("insufficient") ||
                      flag.toLowerCase().includes("misinformation");
                    return (
                      <span
                        key={idx}
                        className={`${styles.redFlagChip} ${
                          isSevere ? styles.chipRed : styles.chipOrange
                        }`}
                      >
                        <span className={styles.flagIcon}>⚠️</span>
                        {flag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <p>
            Powered by Gemini AI, Tavily Search & NewsData.io · Results are indicative ·
            Always verify news from official primary sources
          </p>
        </footer>
      </div>
    </main>
  );
}
