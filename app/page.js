"use client";

import { useState } from "react";
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

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheck() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please enter a headline or article snippet.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/check-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleCheck();
    }
  }

  const verdictInfo = result ? VERDICT_CONFIG[result.verdict] : null;

  return (
    <main className={styles.main}>
      {/* Background gradient orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.badge}>AI-Powered</div>
          <h1 className={styles.title}>
            Fake News <span className={styles.titleAccent}>Detector</span>
          </h1>
          <p className={styles.subtitle}>
            Paste a news headline or article snippet below. Our AI will classify
            it as <strong>Likely Real</strong>, <strong>Likely Fake</strong>, or{" "}
            <strong>Uncertain</strong>.
          </p>
        </header>

        {/* Input card */}
        <div className={styles.card}>
          <label htmlFor="news-input" className={styles.label}>
            News Headline or Snippet
          </label>
          <textarea
            id="news-input"
            className={styles.textarea}
            placeholder="Paste a news headline or article snippet here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
            disabled={loading}
          />
          <div className={styles.textareaFooter}>
            <span className={styles.hint}>Tip: Press Ctrl+Enter to check</span>
            <span className={styles.charCount}>{text.length} chars</span>
          </div>

          <button
            id="check-button"
            className={styles.button}
            onClick={handleCheck}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <span className={styles.buttonInner}>
                <span className={styles.spinner} aria-hidden="true" />
                Analyzing…
              </span>
            ) : (
              <span className={styles.buttonInner}>
                <span className={styles.buttonIcon} aria-hidden="true">⚡</span>
                Check News
              </span>
            )}
          </button>

          {/* Error message */}
          {error && (
            <div className={styles.errorBox} role="alert">
              <span className={styles.errorIcon} aria-hidden="true">⚠</span>
              {error}
            </div>
          )}
        </div>

        {/* Result card */}
        {result && verdictInfo && (
          <div
            className={`${styles.resultCard} ${verdictInfo.className}`}
            role="region"
            aria-label="Analysis result"
          >
            <div className={styles.verdictRow}>
              <span className={styles.verdictIcon} aria-hidden="true">
                {verdictInfo.icon}
              </span>
              <div>
                <div className={styles.verdictLabel}>Verdict</div>
                <div className={styles.verdictText}>{verdictInfo.label}</div>
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.reasoning}>
              <div className={styles.reasoningLabel}>Reasoning</div>
              <p className={styles.reasoningText}>{result.reasoning}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <p>
            Powered by Gemini AI · Results are indicative, not definitive ·
            Always verify from trusted sources
          </p>
        </footer>
      </div>
    </main>
  );
}
