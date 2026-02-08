@echo off
echo Starting Backend Server (Flask on port 5000)...
start "Backend" cmd /k ".venv\Scripts\python.exe app.py"

echo Starting Frontend (Vite on port 5174)...
cd graph-viz
start "Frontend" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo Once ready, open: http://localhost:5174
pause
