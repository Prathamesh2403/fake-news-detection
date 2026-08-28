# 🔍 Fake News Detector & Multi-Source Verification Pipeline

An AI-powered web app that cross-references news claims in real-time against live web search & news data APIs (Gemini 2.5 Flash, Tavily, and NewsData.io), classifying news as **Likely Real**, **Likely Fake**, or **Uncertain** with evidence sources and confidence scores.

---

## ✨ Key Upgrades & Features

- **3-Stage Stateless Pipeline**:
  1. **Claim Extraction**: Gemini extracts the core factual claim statement.
  2. **Parallel Evidence Search**: Tavily Search & NewsData.io queried in parallel to gather real-time articles & web evidence.
  3. **AI Verdict Synthesis**: Gemini synthesizes the claim and merged evidence into structured JSON.
- **Structured Verification Cards**:
  - Verdict Badge (**Likely Real** / **Likely Fake** / **Uncertain**)
  - Animated Confidence Indicator progress bar (0–100%)
  - Extracted Factual Claim statement box
  - Fact-Check Reasoning
  - Side-by-side **Supporting Sources** vs **Contradicting Sources** (clickable external links)
  - **Flags & Risk Indicators** (red/orange warning chips)
  - Insufficient external evidence alert banner
- **3-Step Real-Time Pipeline Progress Indicator**
- **Preset Example Claims** for quick one-click testing
- **Color Theme System**: Strict Green / Yellow / Orange / Red semantic color mapping

---

## 🚀 Getting Started Locally

### 1. Clone the repo

```bash
git clone https://github.com/Prathamesh2403/fake-news-detection.git
cd fake-news-detection
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_KEYS=key1,key2,key3
GEMINI_MODEL=gemini-2.5-flash

# NewsData.io
NEWSDATA_API_KEY=your_newsdata_api_key
NEWSDATA_API_KEYS=key1,key2,key3

# EventRegistry NewsAPI
NEWSAPI_KEY=your_newsapi_key

# Tavily Search API
TAVILY_API_KEY=your_tavily_api_key
TAVILY_API_KEYS=key1,key2
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

Pushing changes to GitHub automatically triggers a Vercel build if linked.

Ensure the environment variables (`GEMINI_API_KEY`, `TAVILY_API_KEY`, `NEWSDATA_API_KEY`) are set in your Vercel Dashboard under **Settings → Environment Variables**.
