@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0\.."

set "PYTHON_EXE=python"
if exist ".venv310\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv310\Scripts\python.exe"
if not exist ".venv310\Scripts\python.exe" if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

set "EMBEDDING_BATCH_SIZE=%EMBEDDING_BATCH_SIZE%"
if "%EMBEDDING_BATCH_SIZE%"=="" set "EMBEDDING_BATCH_SIZE=512"

set "EMBEDDING_ENCODE_BATCH_SIZE=%EMBEDDING_ENCODE_BATCH_SIZE%"
if "%EMBEDDING_ENCODE_BATCH_SIZE%"=="" set "EMBEDDING_ENCODE_BATCH_SIZE=512"

set "SKIP_CONFIRM=0"
:collect_args
if "%~1"=="" goto args_done
if /i "%~1"=="--yes" (
  set "SKIP_CONFIRM=1"
  shift
  goto collect_args
)
if /i "%~1"=="-y" (
  set "SKIP_CONFIRM=1"
  shift
  goto collect_args
)
shift
goto collect_args
:args_done

echo.
echo ===============================================
echo Prepare Hai Chau semantic search data
echo ===============================================
echo.

"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python was not found. Checked: %PYTHON_EXE%
  exit /b 1
)

for /f %%A in ('call "%PYTHON_EXE%" -c "import sqlite3; c=sqlite3.connect('geoai_data/geoai.db'); print(c.execute('select count(*) from Place').fetchone()[0]); c.close()"') do set "PLACE_COUNT=%%A"
if "%PLACE_COUNT%"=="" set "PLACE_COUNT=0"

echo Place rows in SQLite: %PLACE_COUNT%
if %PLACE_COUNT% LSS 1000 (
  echo Importing Overture Places because Place table looks empty...
  call scripts\import_danang_overture_places.bat
  if errorlevel 1 exit /b 1
) else (
  echo Skipping Overture Places import; existing Place data is sufficient.
)

echo.
echo Reindexing BuildingProperty for Hai Chau...
if "%SKIP_CONFIRM%"=="1" (
  call scripts\reindex_elasticsearch_properties.bat --yes --district "Hai Chau"
) else (
  call scripts\reindex_elasticsearch_properties.bat --district "Hai Chau"
)
if errorlevel 1 exit /b 1

echo.
echo Reindexing Place POIs for Hai Chau...
if "%SKIP_CONFIRM%"=="1" (
  call scripts\reindex_elasticsearch_places.bat --yes --district "Hai Chau"
) else (
  call scripts\reindex_elasticsearch_places.bat --district "Hai Chau"
)
if errorlevel 1 exit /b 1

echo.
echo Hai Chau semantic data preparation completed.
exit /b 0
