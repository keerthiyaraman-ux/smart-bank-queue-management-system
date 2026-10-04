@echo off
title SmartQueue Bank Management System
echo ===================================================
echo     SmartQueue Bank Management System
echo ===================================================
echo Starting backend server on http://localhost:5000 ...
echo.

cd /d "%~dp0backend"

:: Check if node_modules exists, if not install
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

:: Start the server
node server.js

pause
