@echo off
setlocal

set "ROOT=%~dp0.."
cd /d "%ROOT%"

set "PYTHON_EXE=%ROOT%\.venv310\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

"%PYTHON_EXE%" scripts\convert_pois_to_assets.py %*
if errorlevel 1 (
  echo ERROR: POI to asset conversion failed.
  exit /b 1
)

echo POI to asset conversion completed.
