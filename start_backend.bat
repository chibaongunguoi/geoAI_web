@echo off
REM Start only the Python GeoAI Backend Server
REM Use this if you want to test the backend separately

echo.
echo ===============================================
echo GeoAI Backend Server
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

echo.
echo Backend directory: %~dp0
cd /d "%~dp0"

if not exist "geoai_backend.py" (
    echo ERROR: geoai_backend.py not found in current directory
    echo Expected location: %cd%\geoai_backend.py
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies (if needed)...
pip list | findstr /i "flask" >nul
if errorlevel 1 (
    echo.
    echo Installing packages from requirements.txt...
    if exist "requirements.txt" (
        pip install -r requirements.txt
    ) else (
        echo WARNING: requirements.txt not found
        echo Installing minimum dependencies...
        pip install flask flask-cors pillow numpy
    )
)

echo.
echo ===============================================
echo Starting GeoAI Backend Server
echo ===============================================
echo.
echo Backend URL: http://localhost:5000
echo Health check: http://localhost:5000/health
echo.
echo Press Ctrl+C to stop the server
echo.

python geoai_backend.py

pause
