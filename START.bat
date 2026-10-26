@echo off
cd /d "%~dp0"
start "" http://localhost:8000
where node >nul 2>nul && (node server.js) || (powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1")
pause
