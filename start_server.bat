@echo off
title Stage 01 - Initial Base (Port 8001)
cd /d "%~dp0"
echo Starting local server for Stage 01 at http://localhost:8001/
echo On your phone (same Wi-Fi): http://192.168.0.22:8001/
start "" "http://localhost:8001/"
python server.py 8001
pause
