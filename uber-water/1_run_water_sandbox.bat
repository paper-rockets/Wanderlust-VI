@echo off
title Uber Stylized Water Sandbox
cd /d "%~dp0"
echo Starting Uber Stylized Water Sandbox on port 5180...
echo On this computer:             http://localhost:5180
echo On your phone (same Wi-Fi):   http://192.168.0.22:5180
echo On your phone via Tailscale:  http://100.83.82.18:5180
call npm run dev
pause
