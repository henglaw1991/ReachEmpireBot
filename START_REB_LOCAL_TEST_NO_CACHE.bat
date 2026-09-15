@echo off
title ReachEmpireBot Website - No Cache Server
cd /d "%~dp0"
echo Stopping old server on port 8080 if found...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)
echo.
echo Starting ReachEmpireBot no-cache server...
python run_local_no_cache.py
pause
