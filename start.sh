#!/bin/bash

# ==============================================================================
# Enterprise Application Startup Script
# ==============================================================================

# Enable error handling
set -e

echo "🚀 Starting Enterprise Application..."

# 1. Backend Setup
echo "🔹 checking backend configuration..."
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "✅ Virtual environment activated."

echo "🔹 Installing/Updating Python dependencies..."
pip install -r api/requirements.txt > /dev/null
echo "✅ Python dependencies installed."

# 2. Frontend & Root Setup
echo "🔹 Checking root dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  Root dependencies not found. Installing..."
    npm install
fi

echo "🔹 Checking frontend configuration..."
if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  Frontend dependencies not found. Installing..."
    cd frontend && npm install && cd ..
fi
echo "✅ Frontend dependencies ready."

# 3. Check for .env
if [ ! -f "api/.env" ]; then
    echo "⚠️  api/.env not found! Copying from example..."
    cp api/.env.example api/.env
    echo "⚠️  Please update api/.env with real credentials!"
fi

# 4. Start Application
echo "🚀 Launching application..."
echo "   - Backend: http://localhost:8001"
echo "   - Frontend: http://localhost:8081"
echo "   (Press Ctrl+C to stop)"

# Use concurrent execution via npm if available, or fall back to background jobs
npm run dev
