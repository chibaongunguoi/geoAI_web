@echo off
setlocal

cd /d "%~dp0\.."

echo.
echo ===============================================
echo Reindex Hai Chau BuildingProperty semantics
echo ===============================================
echo.

call scripts\reindex_elasticsearch_properties.bat --yes --district "Hai Chau"
if errorlevel 1 (
  echo ERROR: Hai Chau BuildingProperty reindex failed.
  exit /b 1
)

echo.
echo Hai Chau BuildingProperty reindex completed.
exit /b 0
