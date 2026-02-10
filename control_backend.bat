@echo off
title DeliverIQ Backend
color 0A
echo Starting FastAPI Server...
cd /d "%~dp0"
python -m uvicorn api.app.main:app --reload --port 8001
pause
