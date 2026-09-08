"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";

const VERDICT_CONFIG = {
  "Likely Real": {
    icon: "✓",
    label: "Likely Real",
    className: styles.verdictReal,
    glowColor: "rgba(34, 197, 94, 0.25)",
    strokeColor: "#22c55e",
  },
  "Likely Fake": {
    icon: "✕",
    label: "Likely Fake",
    className: styles.verdictFake,
    glowColor: "rgba(239, 68, 68, 0.25)",
    strokeColor: "#ef4444",
  },
  Uncertain: {
    icon: "?",
    label: "Uncertain",
    className: styles.verdictUncertain,
    glowColor: "rgba(234, 179, 8, 0.25)",
    strokeColor: "#eab308",
  },
};

const EXAMPLE_CLAIMS = [
  "NASA confirms discovery of seasonal liquid water streams on Mars",
  "Scientists confirm the Moon is hollow and constructed by ancient aliens",
  "Drinking ocean water twice daily cures all viral infections in 24 hours",
  "Federal Reserve adjusts benchmark interest rates following monthly meeting",
];

function getSourceDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* Radial / Circular Confidence Gauge */
function RadialConfidenceGauge({ score, strokeColor }) {
  const radius = 38;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className={styles.radialGaugeWrapper}>
      <svg
        className={styles.radialSvg}
        width="100"
        height="100"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle
          className={styles.radialTrack}
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={styles.radialIndicator}
          cx="50"
          cy="50"
          r={radius}
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className={styles.radialDataCenter}>
        <span className={styles.radialScoreNumber} style={{ color: strokeColor }}>
          {safeScore}%
        </span>
        <span className={styles.radialScoreLabel}>CONFIDENCE</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(1);
  const [error, setError] = useState("");
  const [expandedSources, setExpandedSources] = useState({});
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
    setExpandedSources({});

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

  function toggleExpandSource(id) {
    setExpandedSources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  const verdictInfo = result ? VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG["Uncertain"] : null;
  const isInsufficientEvidence =
    result?.verdict === "Uncertain" &&
    result?.red_flags?.some((flag) => flag.toLowerCase().includes("insufficient external evidence"));

  // Unified citations array combining supporting & contradicting sources
  const allSources = result
    ? [
        ...(result.supporting_sources || []).map((src, i) => ({
          ...src,
          type: "supporting",
          id: `sup-${i}`,
        })),
        ...(result.contradicting_sources || []).map((src, i) => ({
          ...src,
          type: "contradicting",
          id: `con-${i}`,
        })),
      ]
    : [];

  const supportingCount = result?.supporting_sources?.length || 0;
  const contradictingCount = result?.contradicting_sources?.length || 0;

  return (
    <main className={styles.main}>
      {/* Background Orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <div className={styles.container}>
        {/* Header - tightened vertically */}
        <header className={styles.header}>
          <div className={styles.badge}>Multi-Source Fact Checker</div>
          <h1 className={styles.title}>
            Fake News <span className={styles.titleAccent}>Detector</span>
          </h1>
          <p className={styles.subtitle}>
            Cross-reference news claims in real-time against live web sources, detecting{" "}
            <strong>Likely Real</strong>, <strong>Likely Fake</strong>, or <strong>Uncertain</strong> content.
          </p>
        </header>

        {/* Input Card - tightened padding & dense wrapping chips */}
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
            rows={4}
            disabled={loading}
          />
          <div className={styles.textareaFooter}>
            <span className={styles.hint}>Tip: Press Ctrl+Enter to check</span>
            <span className={styles.charCount}>{text.length} chars</span>
          </div>

          {/* Example Claims - single denser wrapping row */}
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
                  "{claim.slice(0, 48)}…"
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

        {/* Results View: Two-Column Split Layout (~65% / 35%) */}
        {result && verdictInfo && !loading && (
          <div
            className={styles.resultsGrid}
            role="region"
            aria-label="Fact check verdict and sources"
          >
            {/* Left Column: Main Analysis (~65%) */}
            <div className={`${styles.mainColumn} ${verdictInfo.className}`}>
              {/* Verdict Card with Radial Speedometer Gauge */}
              <div className={styles.verdictCard}>
                <div className={styles.verdictMeta}>
                  <div className={styles.verdictIconWrapper} aria-hidden="true">
                    {verdictInfo.icon}
                  </div>
                  <div>
                    <div className={styles.verdictSubtext}>VERDICT CLASSIFICATION</div>
                    <div className={styles.verdictTitle}>{verdictInfo.label}</div>
                  </div>
                </div>

                <RadialConfidenceGauge
                  score={result.confidence}
                  strokeColor={verdictInfo.strokeColor}
                />
              </div>

              {/* Extracted Factual Claim as Highlighted Quote Block */}
              {result.claim_extracted && (
                <div className={styles.claimQuoteCard}>
                  <div className={styles.claimQuoteHeader}>
                    <span className={styles.claimQuoteSymbol}>“</span>
                    <span className={styles.claimQuoteTitle}>Extracted Factual Claim</span>
                  </div>
                  <blockquote className={styles.claimQuoteText}>
                    "{result.claim_extracted}"
                  </blockquote>
                </div>
              )}

              {/* Fact-Check Reasoning */}
              <div className={styles.reasoningCard}>
                <div className={styles.sectionHeaderLabel}>Fact-Check Reasoning</div>
                <p className={styles.reasoningParagraph}>{result.reasoning}</p>
              </div>

              {/* Insufficient Evidence Warning */}
              {isInsufficientEvidence && (
                <div className={styles.insufficientCallout}>
                  <span className={styles.calloutIcon}>⚠️</span>
                  <span>Not enough external sources found to verify this claim.</span>
                </div>
              )}

              {/* Flags & Risk Indicators */}
              {result.red_flags && result.red_flags.length > 0 && (
                <div className={styles.redFlagsCard}>
                  <div className={styles.sectionHeaderLabel}>Flags & Risk Indicators</div>
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

            {/* Right Column: Sticky Unified Citations Sidebar (~35%) */}
            <aside className={styles.sidebarColumn}>
              <div className={styles.sidebarSticky}>
                <div className={styles.sidebarHeader}>
                  <div className={styles.sidebarHeadingGroup}>
                    <h2 className={styles.sidebarTitle}>Citations & Sources</h2>
                    <span className={styles.summaryChip}>
                      Sources: <strong className={styles.summaryReal}>{supportingCount} supporting</strong> ·{" "}
                      <strong className={styles.summaryFake}>{contradictingCount} contradicting</strong>
                    </span>
                  </div>
                </div>

                <div className={styles.sourcesContainer}>
                  {allSources.length > 0 ? (
                    allSources.map((src) => {
                      const isExpanded = !!expandedSources[src.id];
                      const domain = getSourceDomain(src.url);
                      const isSupporting = src.type === "supporting";

                      return (
                        <div
                          key={src.id}
                          className={`${styles.sourceCard} ${
                            isSupporting ? styles.sourceSupporting : styles.sourceContradicting
                          }`}
                        >
                          <div className={styles.sourceCardTop}>
                            <div className={styles.sourceIdentity}>
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                alt=""
                                className={styles.sourceFavicon}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <div className={styles.sourceNameWrap}>
                                <span className={styles.sourceName} title={src.name}>
                                  {src.name}
                                </span>
                                {domain && <span className={styles.sourceDomain}>{domain}</span>}
                              </div>
                            </div>

                            <div className={styles.sourceActions}>
                              <span
                                className={`${styles.sourceBadge} ${
                                  isSupporting ? styles.badgeSupporting : styles.badgeContradicting
                                }`}
                              >
                                {isSupporting ? "Supporting" : "Contradicting"}
                              </span>
                              {src.url && (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.sourceLinkArrow}
                                  title="Open source in new tab"
                                >
                                  ↗
                                </a>
                              )}
                            </div>
                          </div>

                          {src.snippet && (
                            <div className={styles.sourceSnippetWrapper}>
                              <p
                                className={`${styles.sourceSnippet} ${
                                  isExpanded ? styles.snippetExpanded : styles.snippetCollapsed
                                }`}
                              >
                                {src.snippet}
                              </p>
                              {src.snippet.length > 85 && (
                                <button
                                  type="button"
                                  className={styles.expandButton}
                                  onClick={() => toggleExpandSource(src.id)}
                                >
                                  {isExpanded ? "Collapse ▲" : "Expand full snippet ▼"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptySources}>No sources cross-referenced.</div>
                  )}
                </div>
              </div>
            </aside>
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
