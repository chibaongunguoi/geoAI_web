#!/bin/bash

# Start GeoAI Web Application (Frontend + Node.js API + Python Backend)
# This script starts all components for Linux/Mac

echo ""
echo "==============================================="
echo "GeoAI Web Application Startup"
echo "==============================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$SCRIPT_DIR"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ first"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js first"
    exit 1
fi

echo "Step 1: Installing dependencies (if needed)..."
echo ""
cd "$PROJECT_ROOT"
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
fi

echo ""
echo "Step 2: Starting Python GeoAI Backend Server..."
echo ""
cd "$BACKEND_DIR" || exit 1

# Install Python dependencies if needed
if [ -f "requirements.txt" ]; then
    if ! python3 -c "import flask" 2>/dev/null; then
        echo "Installing Python packages..."
        pip install -r requirements.txt
    fi
fi

echo "Starting Python backend server on http://localhost:5000..."
python3 geoai_backend.py &
PYTHON_PID=$!

# Wait for Python server to start
echo ""
echo "Waiting for Python backend to start (5 seconds)..."
sleep 5

# Check if Python server is running
echo ""
echo "Checking Python backend health..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "OK: Python backend is running"
else
    echo "WARNING: Python backend may not be responding yet"
    echo "If analysis fails later, check the backend terminal"
fi

echo ""
echo "Step 3: Starting Next.js Web Frontend..."
echo ""
cd "$PROJECT_ROOT" || exit 1

# Kill any existing process on port 3000
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

echo ""
echo "Web frontend will start on http://localhost:3000"
echo "Open your browser and navigate to http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the web server"
echo ""

npm run dev

# Cleanup - kill Python backend when web server stops
kill $PYTHON_PID 2>/dev/null || true

echo ""
echo "GeoAI application stopped"
echo ""