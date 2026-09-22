@echo off
title Ghibli Flight - Cloudflare Server
cd /d "%~dp0"
echo =======================================================
echo Starting Ghibli Flight Local + Cloudflare Tunnel Server
echo Folder: %~dp0
echo =======================================================
echo.

REM Start the local Python server in the background if not already running
netstat -ano | findstr :8000 >nul
if %ERRORLEVEL% neq 0 (
    echo Starting local game server on port 8000...
    start /B python server.py 8000
    timeout /t 2 /nobreak >nul
) else (
    echo Local game server is already active on port 8000.
)

echo.
echo Starting secure Cloudflare Tunnel to port 8000...
echo Keep this window open while playing on your phone.
echo Look for the "https://....trycloudflare.com" link below!
echo.
cloudflared tunnel --url http://127.0.0.1:8000
pause
