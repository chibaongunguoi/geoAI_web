@echo off
setlocal enabledelayedexpansion

REM Start GeoAI Web Application (Frontend + Node.js API + Python Backend)
REM This script starts all components

echo.
echo ===============================================
echo GeoAI Web Application Startup
echo ===============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Step 1: Installing dependencies (if needed)...
echo.
cd /d "%~dp0"
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)

echo Step 2: Starting Python GeoAI Backend Server...
echo.
REM Backend is now in the same folder
cd /d "%~dp0"

REM Install Python dependencies if needed
if exist "requirements.txt" (
    pip list | findstr /i "flask" >nul
    if errorlevel 1 (
        echo Installing Python packages...
        pip install -r requirements.txt
    )
)

echo Starting Python backend server...
start "GeoAI Backend" cmd /k "python geoai_backend.py"

REM Wait for Python server to start
echo.
echo Waiting for Python backend to start (5 seconds)...
timeout /t 5 /nobreak

REM Check if Python server is running
echo.
echo Checking Python backend health...
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Python backend may not be responding yet
    echo If analysis fails later, check the Backend window
) else (
    echo OK: Python backend is running on http://localhost:5000
)

echo.
echo Step 3: Starting Next.js Web Frontend...
echo.
cd /d "%~dp0"

REM Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| find "3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo Web frontend will start on http://localhost:3000
echo Open your browser and navigate to http://localhost:3000
echo.
echo Press Ctrl+C to stop the web server
echo.

npm run dev

pause