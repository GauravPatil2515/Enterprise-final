# DeliverIQ Enterprise - Deployment Guide

## 🚀 Recommended Deployment Architecture

### Option 1: Vercel (Frontend) + Railway/Render (Backend) ⭐ RECOMMENDED

**Frontend (Vercel):**
- ✅ Free tier available
- ✅ Automatic deployments from GitHub
- ✅ CDN + Edge caching
- ✅ Perfect for React/Vite apps

**Backend (Railway/Render):**
- ✅ Always-on server (not serverless)
- ✅ WebSocket/SSE streaming support
- ✅ Better for FastAPI with Neo4j connections
- ✅ Free tier available

---

## 📋 Deployment Steps

### Step 1: Deploy Backend to Railway (Recommended)

1. Go to [Railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `GauravPatil2515/Enterprise-final`
4. Railway will auto-detect Python and use `backend/` folder
5. Add these environment variables in Railway dashboard:
   ```
   FEATHERLESS_API_KEY=rc_fe628153d9c56b700e32cb57fa79182f77de4c7e9ff6aa0c18fb27d13f5be0dd
   FEATHERLESS_BASE_URL=https://api.featherless.ai/v1
   MODEL_ID=Qwen/Qwen2.5-32B-Instruct
   NEO4J_URI=neo4j+s://41ac015d.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=ftY3pDjAKmfZnNmamHryWY04ODjCBDCIrgK_1NVen4Y
   NEO4J_DATABASE=neo4j
   PORT=8000
   ```
6. Set **Root Directory** to `backend`
7. Set **Start Command** to: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
8. Deploy! You'll get a URL like: `https://your-app.railway.app`

### Step 2: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"** → Import `GauravPatil2515/Enterprise-final`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```
   (Use your Railway backend URL from Step 1)
5. Deploy!

### Step 3: Update Frontend API Configuration

After deploying backend, update `frontend/vite.config.ts`:
```typescript
// For production, use Railway URL
const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';

export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
      },
      '/graph': {
        target: API_URL,
        changeOrigin: true,
      },
    },
  },
});
```

---

## 🔧 Alternative: Deploy Backend to Vercel (Serverless)

⚠️ **Note**: Vercel serverless has limitations:
- 10-second timeout on Hobby plan
- SSE streaming might be unstable
- Cold starts for Neo4j connections

If you still want to try:

1. In Vercel, select **"FastAPI"** preset
2. Set **Root Directory** to `backend`
3. Add all environment variables from `.env`
4. Deploy

**Frontend separately**:
1. Create a new Vercel project
2. Set Root Directory to `frontend`
3. Add `VITE_API_URL` pointing to backend Vercel URL

---

## 🔐 Environment Variables Summary

### Backend Required:
- `FEATHERLESS_API_KEY`
- `FEATHERLESS_BASE_URL`
- `MODEL_ID`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `NEO4J_DATABASE`

### Frontend Optional:
- `VITE_API_URL` (backend URL for production)

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check: `https://your-backend-url/api/teams`
- [ ] Frontend loads and connects to backend
- [ ] Chat streaming works (SSE endpoint)
- [ ] Graph visualization loads data
- [ ] Neo4j connection stable
- [ ] All role dashboards render
- [ ] Team simulator works

---

## 🐛 Troubleshooting

**Backend times out on Vercel:**
→ Use Railway/Render instead

**Frontend can't connect to backend:**
→ Check CORS settings in `backend/app/main.py`
→ Verify `VITE_API_URL` is correct

**Neo4j connection fails:**
→ Check firewall rules in Neo4j Aura
→ Verify credentials are correct

**Chat streaming not working:**
→ Serverless functions don't support long SSE streams well
→ Use Railway/Render for backend

---

## 🎯 Recommended Final Setup

```
Frontend: Vercel (https://your-app.vercel.app)
    ↓
Backend: Railway (https://your-app.railway.app)
    ↓
Database: Neo4j Aura (neo4j+s://41ac015d.databases.neo4j.io)
    ↓
AI: Featherless API (https://api.featherless.ai)
```

**Estimated Cost**: $0/month (all free tiers)
