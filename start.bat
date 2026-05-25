@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
if "%USE_ELASTICSEARCH%"=="" set "USE_ELASTICSEARCH=1"

echo.
echo ===============================================
echo GeoAI full stack startup
echo ===============================================
echo.

set "PYTHON_EXE=python"
if exist ".venv310\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv310\Scripts\python.exe"
if not exist ".venv310\Scripts\python.exe" if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  pause
  exit /b 1
)

"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python was not found. Checked: %PYTHON_EXE%
  pause
  exit /b 1
)

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker CLI was not found in PATH.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker is not running or is not reachable.
  echo Start Docker Desktop first, then run this file again.
  pause
  exit /b 1
)

echo Checking required ports...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = 3000,4000,5000,5055,9200; $busy = @(); foreach ($p in $ports) { $c = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue; if ($c) { $busy += $p } }; if ($busy.Count -gt 0) { Write-Host ('WARNING: Port(s) already listening: ' + ($busy -join ', ')); Write-Host 'If these are old GeoAI processes, close them before continuing.' } else { Write-Host 'OK: required ports are free.' }"

echo.
echo Step 1: Installing npm dependencies if needed...
if not exist "node_modules" (
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
) else (
  echo OK: node_modules exists.
)

echo.
echo Step 2: Generating Prisma client...
call npm run prisma:generate
if errorlevel 1 (
  echo ERROR: Prisma client generation failed.
  pause
  exit /b 1
)

echo.
echo Step 3: Starting Elasticsearch container...
docker compose -f docker-compose.search.yml up -d
if errorlevel 1 (
  echo ERROR: Could not start Elasticsearch with Docker Compose.
  pause
  exit /b 1
)

set "ALL_READY=1"

echo Waiting for Elasticsearch on http://localhost:9200 ...
call :probe "Elasticsearch" "http://localhost:9200/_cluster/health" 90
if errorlevel 1 set "ALL_READY=0"

echo.
echo Step 4: Starting Python GeoAI backend on http://localhost:5000 ...
set "GEOAI_LOCAL_DATA_ONLY=true"
set "GEOAI_FORCE_OVERTURE_SCAN=true"
set "GEOAI_DEFAULT_SCAN_MODE=overture"
set "GEOAI_ALLOW_RUNTIME_AI_EXTRACTION=false"
set "GEOAI_DOWNLOAD_OVERTURE_IF_MISSING=false"
set "GEOAI_SKIP_STARTUP_PRELOAD=true"
set "GEOAI_PRELOAD_OVERTURE=false"
set "GEOAI_PRELOAD_GEOTIFFS=false"
start "GeoAI Python Backend :5000" cmd /k ""%PYTHON_EXE%" geoai_backend.py"

echo Waiting for Python backend on http://localhost:5000/health ...
call :probe "Python backend" "http://localhost:5000/health" 60
if errorlevel 1 set "ALL_READY=0"

echo.
echo Step 5: Starting NestJS API on http://localhost:4000 ...
if /i "%USE_ELASTICSEARCH%"=="1" (
  echo USE_ELASTICSEARCH=1 detected; starting embedding service on http://localhost:5055 and enabling Elasticsearch search provider.
  if "%EMBEDDING_DEVICE%"=="" set "EMBEDDING_DEVICE=auto"
  echo Embedding device: %EMBEDDING_DEVICE%
  start "GeoAI Embedding Service :5055" cmd /k "set EMBEDDING_DEVICE=%EMBEDDING_DEVICE%&& ""%PYTHON_EXE%"" scripts\property_embedding_service.py"
  echo Waiting for embedding service on http://localhost:5055/health ...
  call :probe "Embedding service" "http://localhost:5055/health" 90
  if errorlevel 1 set "ALL_READY=0"
  echo Warming up MiniLM embeddings on http://localhost:5055/embed ...
  call :probe_embed "Embedding warmup" "http://localhost:5055/embed" 180
  if errorlevel 1 set "ALL_READY=0"
  start "GeoAI NestJS API :4000" cmd /k "set PROPERTY_SEARCH_PROVIDER=elasticsearch&& set ELASTICSEARCH_URL=http://localhost:9200&& set EMBEDDING_SERVICE_URL=http://localhost:5055&& npm run dev:api"
) else (
  echo Elasticsearch is running, but API search provider remains SQLite/default.
  echo To force Elasticsearch search, run: set USE_ELASTICSEARCH=1 before start.bat
  start "GeoAI NestJS API :4000" cmd /k "npm run dev:api"
)

echo Waiting for NestJS API on http://localhost:4000/auth/me ...
call :probe_auth "NestJS API" "http://localhost:4000/auth/me" 90
if errorlevel 1 set "ALL_READY=0"

echo.
echo Step 6: Starting Next.js frontend on http://localhost:3000 ...
start "GeoAI Web Frontend :3000" cmd /k "npm run dev:web"

echo Waiting for Next web on http://localhost:3000 ...
call :probe_any "Next web" "http://localhost:3000" 120
if errorlevel 1 set "ALL_READY=0"

echo.
echo ===============================================
echo Service URLs:
echo   Frontend:      http://localhost:3000
echo   NestJS API:    http://localhost:4000
echo   Python GeoAI:  http://localhost:5000
if /i "%USE_ELASTICSEARCH%"=="1" echo   Embeddings:    http://localhost:5055
echo   Elasticsearch: http://localhost:9200
echo ===============================================
if "%ALL_READY%"=="1" (
  echo ALL SERVICES READY
) else (
  echo WARNING: One or more services did not become ready within the deadline.
  echo Inspect the matching service window for error logs.
)
echo.
echo Keep the opened service windows running.
pause
exit /b 0

REM --- Shared probe subroutines (DRY: called 4+ times above) ---

REM probe: pass when HTTP status is 2xx. Used for Elasticsearch and Python /health.
:probe
set "PROBE_NAME=%~1"
set "PROBE_URL=%~2"
set "PROBE_DEADLINE=%~3"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(%PROBE_DEADLINE%); do { try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%PROBE_URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { exit 0 } } catch { } ; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo WARNING: %PROBE_NAME% did not become healthy within %PROBE_DEADLINE% seconds.
  exit /b 1
)
echo OK: %PROBE_NAME% is ready.
exit /b 0

REM probe_auth: pass when HTTP status is 200 or 401 (an auth-gated endpoint alive).
:probe_auth
set "PROBE_NAME=%~1"
set "PROBE_URL=%~2"
set "PROBE_DEADLINE=%~3"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(%PROBE_DEADLINE%); do { try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%PROBE_URL%' -TimeoutSec 2; if ($r.StatusCode -eq 200 -or $r.StatusCode -eq 401) { exit 0 } } catch { if ($_.Exception.Response -and ($_.Exception.Response.StatusCode.value__ -eq 401 -or $_.Exception.Response.StatusCode.value__ -eq 200)) { exit 0 } } ; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo WARNING: %PROBE_NAME% did not become healthy within %PROBE_DEADLINE% seconds.
  exit /b 1
)
echo OK: %PROBE_NAME% is ready.
exit /b 0

REM probe_any: pass on any successful HTTP response including redirects. Used for Next web root.
:probe_any
set "PROBE_NAME=%~1"
set "PROBE_URL=%~2"
set "PROBE_DEADLINE=%~3"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(%PROBE_DEADLINE%); do { try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%PROBE_URL%' -TimeoutSec 2 -MaximumRedirection 0 -ErrorAction SilentlyContinue; if ($r) { exit 0 } } catch { $code = $_.Exception.Response.StatusCode.value__ 2>$null; if ($code -ge 200 -and $code -lt 400) { exit 0 } } ; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo WARNING: %PROBE_NAME% did not become healthy within %PROBE_DEADLINE% seconds.
  exit /b 1
)
echo OK: %PROBE_NAME% is ready.
exit /b 0

REM probe_embed: pass when the embedding service can encode a real query.
:probe_embed
set "PROBE_NAME=%~1"
set "PROBE_URL=%~2"
set "PROBE_DEADLINE=%~3"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(%PROBE_DEADLINE%); $body = @{ texts = @('nha hai chau'); model = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2' } | ConvertTo-Json; do { try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%PROBE_URL%' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 60; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300 -and $r.Content -like '*embeddings*') { exit 0 } } catch { } ; Start-Sleep -Seconds 2 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
  echo WARNING: %PROBE_NAME% did not complete within %PROBE_DEADLINE% seconds.
  exit /b 1
)
echo OK: %PROBE_NAME% completed.
exit /b 0
