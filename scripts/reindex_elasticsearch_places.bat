@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0\.."

set "PYTHON_EXE=python"
if exist ".venv310\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv310\Scripts\python.exe"
if not exist ".venv310\Scripts\python.exe" if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

set "ELASTICSEARCH_URL=%ELASTICSEARCH_URL%"
if "%ELASTICSEARCH_URL%"=="" set "ELASTICSEARCH_URL=http://localhost:9200"

set "EMBEDDING_SERVICE_URL=%EMBEDDING_SERVICE_URL%"
if "%EMBEDDING_SERVICE_URL%"=="" set "EMBEDDING_SERVICE_URL=http://localhost:5055"

set "PLACE_INDEX_NAME=%PLACE_INDEX_NAME%"
if "%PLACE_INDEX_NAME%"=="" set "PLACE_INDEX_NAME=places_v1"

set "EMBEDDING_BATCH_SIZE=%EMBEDDING_BATCH_SIZE%"
if "%EMBEDDING_BATCH_SIZE%"=="" set "EMBEDDING_BATCH_SIZE=512"

set "EMBEDDING_ENCODE_BATCH_SIZE=%EMBEDDING_ENCODE_BATCH_SIZE%"
if "%EMBEDDING_ENCODE_BATCH_SIZE%"=="" set "EMBEDDING_ENCODE_BATCH_SIZE=512"

set "SKIP_CONFIRM=0"
set "INDEX_ARGS="
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
set "INDEX_ARGS=!INDEX_ARGS! "%~1""
shift
goto collect_args
:args_done

echo.
echo ===============================================
echo Reindex Place POIs into Elasticsearch
echo ===============================================
echo Elasticsearch: %ELASTICSEARCH_URL%
echo Embeddings:    %EMBEDDING_SERVICE_URL%
echo Index:         %PLACE_INDEX_NAME%
echo Batch size:    %EMBEDDING_BATCH_SIZE%
echo Encode batch:  %EMBEDDING_ENCODE_BATCH_SIZE%
echo.

"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python was not found. Checked: %PYTHON_EXE%
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%ELASTICSEARCH_URL%/_cluster/health' -TimeoutSec 5; if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 300) { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo ERROR: Elasticsearch is not reachable. Start it first, usually with: docker compose -f docker-compose.search.yml up -d
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%EMBEDDING_SERVICE_URL%/health' -TimeoutSec 5; if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 300) { exit 1 } } catch { exit 1 }"
if errorlevel 1 (
  echo ERROR: Embedding service is not reachable. Start it first with:
  echo   "%PYTHON_EXE%" scripts\property_embedding_service.py
  exit /b 1
)

if "%SKIP_CONFIRM%"=="1" goto run_index

echo This will DELETE and recreate Elasticsearch index "%PLACE_INDEX_NAME%".
set /p CONFIRM=Type REINDEX to continue: 
if /i not "%CONFIRM%"=="REINDEX" (
  echo Cancelled.
  exit /b 1
)

:run_index
"%PYTHON_EXE%" scripts\index_places.py --recreate-index --batch-size %EMBEDDING_BATCH_SIZE% %INDEX_ARGS%
if errorlevel 1 (
  echo ERROR: Place reindex failed.
  exit /b 1
)

echo.
echo Place reindex completed.
exit /b 0
