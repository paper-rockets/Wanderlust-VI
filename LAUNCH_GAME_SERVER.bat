@echo off
echo =========================================
echo Starting Flight Game Server
echo Folder: ONLY HERE NOWHERE ELSE
echo =========================================

REM Open the browser
start "" "http://localhost:8150/"

REM Run the python server
python server.py 8150

pause
