# 🚀 Deployment Guide: DeliverIQ Enterprise

Your project is configured for **Vercel Serverless**.

## Option 1: Automatic (Recommended)

Since your project is connected to GitHub, **deployment happens automatically** whenever you push to `main` or `master`.

1.  Commit your changes:
    ```bash
    git add .
    git commit -m "Update feature X"
    ```
2.  Push to GitHub:
    ```bash
    git push origin main
    ```
3.  Watch the build on your [Vercel Dashboard](https://vercel.com/dashboard).

## Option 2: Manual (CLI)

If you want to deploy directly from your local machine (bypassing GitHub):

1.  Run the deploy command:
    ```bash
    npx vercel --prod
    ```
2.  Follow the prompts.

## ✅ Verification

After deployment, verify your live site:

- **Frontend**: `https://enterprise-final.vercel.app`
- **Backend Health**: `https://enterprise-final.vercel.app/api/health`

## 🔑 Environment Variables (Production)

Ensure these are set in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEO4J_URI` | `neo4j+s://...` (or `bolt+ssc://...`) |
| `NEO4J_USERNAME` | `neo4j` |
| `NEO4J_PASSWORD` | `********` |
| `FEATHERLESS_API_KEY` | `sk-...` |
| `FEATHERLESS_BASE_URL` | `https://api.featherless.ai/v1` |
