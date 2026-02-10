# Backend API (Serverless Ready)

This directory contains the Python backend for DeliverIQ Enterprise, structured for **Vercel Serverless Functions**.

## Structure

- `index.py`: **Entrypoint** for Vercel. Exposes `app` from `app.main`.
- `app/`: Application source code.
  - `main.py`: FastAPI application factory.
  - `core/`: Core infrastructure (Neo4j, OpenAI, Configuration).
    - **CRITICAL**: `neo4j_client.py` and `model_router.py` use **Lazy Loading**. exact instantiation happens on *first request*, not at import time. This prevents cold-start crashes.
  - `agents/`: AI Agents for risk, finance, hiring, etc.
  - `api/`: API Routes (CRUD endpoints).

## Local Development

Run the startup script in the root directory:
```powershell
.\start_dev.ps1
```

Or run manually:
```bash
uvicorn api.app.main:app --reload --port 8001
```

## Deployment

Deployed automatically to Vercel via GitHub.
Configuration is in `vercel.json` (Legacy `@vercel/python` builder).
