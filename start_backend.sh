#!/bin/bash

# Start only the Python GeoAI Backend Server
# Use this if you want to test the backend separately

echo ""
echo "==============================================="
echo "GeoAI Backend Server"
echo "==============================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ first"
    exit 1
fi

echo ""
echo "Backend directory: $(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

if [ ! -f "geoai_backend.py" ]; then
    echo "ERROR: geoai_backend.py not found in current directory"
    echo "Expected location: $SCRIPT_DIR/geoai_backend.py"
    exit 1
fi

echo ""
echo "Installing Python dependencies (if needed)..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo ""
    echo "Installing packages from requirements.txt..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    else
        echo "WARNING: requirements.txt not found"
        echo "Installing minimum dependencies..."
        pip install flask flask-cors pillow numpy
    fi
fi

echo ""
echo "==============================================="
echo "Starting GeoAI Backend Server"
echo "==============================================="
echo ""
echo "Backend URL: http://localhost:5000"
echo "Health check: http://localhost:5000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 geoai_backend.py
