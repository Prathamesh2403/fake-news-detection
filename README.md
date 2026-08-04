# 🔍 Fake News Detector

An AI-powered web app that classifies a news headline or article snippet as **Likely Real**, **Likely Fake**, or **Uncertain**, with a short reasoning — built with Next.js and the Google Gemini API.

---

## ✨ Features

- Single-page interface: paste text, click **Check**, see the verdict
- Powered by **Gemini 2.5 Flash** via the Gemini API
- Loading state with spinner while awaiting analysis
- Color-coded verdict cards (green / red / amber)
- Graceful error handling for empty input and API failures
- No database, no authentication — completely stateless

---

## 🚀 Getting Started Locally

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd fake-news-detection
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set the API key

Create a `.env.local` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

> You can obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel will auto-detect it as a Next.js project — no extra config needed

### 3. Set the Environment Variable

In the Vercel dashboard for your project:

1. Go to **Settings → Environment Variables**
2. Add a new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your Gemini API key
   - **Environment:** Production (and optionally Preview)
3. Click **Save**
4. Redeploy (or trigger via a new push)

> ⚠️ Never hardcode the API key in your source code. It must only live in environment variables.

---

## 🗂 Project Structure

```
fake-news-detection/
├── app/
│   ├── api/
│   │   └── check-news/
│   │       └── route.js      # POST /api/check-news — calls Gemini API
│   ├── globals.css            # Global CSS design tokens
│   ├── layout.js              # Root layout with metadata
│   ├── page.js                # Main UI page
│   └── page.module.css        # Page-scoped styles
├── .env.local                 # Local API key (git-ignored)
├── next.config.mjs
└── package.json
```

---

## 🔐 API Route

**`POST /api/check-news`**

**Request body:**
```json
{ "text": "Your headline or snippet here" }
```

**Response:**
```json
{
  "verdict": "Likely Real | Likely Fake | Uncertain",
  "reasoning": "1–2 sentence explanation."
}
```

---

## ⚖️ Disclaimer

AI verdicts are indicative, not definitive. Always verify news from multiple trusted sources.
