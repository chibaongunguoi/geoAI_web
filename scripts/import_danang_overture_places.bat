@echo off
setlocal

cd /d "%~dp0\.."

set "PYTHON_EXE=python"
if exist ".venv310\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv310\Scripts\python.exe"
if not exist ".venv310\Scripts\python.exe" if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

echo.
echo ===============================================
echo Import Da Nang Overture Places POIs
echo ===============================================
echo.

"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python was not found. Checked: %PYTHON_EXE%
  exit /b 1
)

"%PYTHON_EXE%" scripts\import_danang_overture_places.py %*
if errorlevel 1 (
  echo ERROR: Overture Places import failed.
  exit /b 1
)

echo.
echo Overture Places import completed.
exit /b 0
