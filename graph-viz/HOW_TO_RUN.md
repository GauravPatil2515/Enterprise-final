# How to Run the Enterprise Intelligence Graph

This guide explains how to start the Neo4j-powered enterprise visualization on your machine.

## Prerequisites
- **Python** (Already installed)
- **Node.js** (Already installed)
- **Neo4j Access** (Configured in `app.py`)

## Quick Start (Recommended)
Simply double-click the `start_viz.bat` file in this directory. It will open two command windows (one for the backend, one for the frontend) and launch the web page automatically.

---

## Manual Start (Step-by-Step)

If you prefer to use the terminal yourself, follow these steps:

### 1. Start the Backend (Python/Flask)
This server connects to Neo4j and provides data to the frontend.
1. Open a terminal in `Hackathons\Datathon 26`.
2. Activate the virtual environment:
   ```powershell
   .venv\Scripts\activate
   ```
3. Run the Flask app:
   ```powershell
   python app.py
   ```
   *You should see "Running on http://127.0.0.1:5000"*

### 2. Start the Frontend (React/Vite)
This is the web interface you interact with.
1. Open a **new** terminal window.
2. Navigate to the frontend folder:
   ```powershell
   cd graph-viz
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```
   *You should see "Local: http://localhost:5173"*

### 3. Open in Browser
Go to **[http://localhost:5173](http://localhost:5173)** to view the application.

## Troubleshooting
- **Port In Use Error**: If you see an error about port 5000 or 5173 being in use, close any existing python/node processes or restart your terminal.
- **White Screen**: Ensure both backend and frontend servers are running. The frontend needs the backend to fetch data.
