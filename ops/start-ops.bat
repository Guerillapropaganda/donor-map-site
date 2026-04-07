@echo off
title Donor Map Ops
color 0A
echo.
echo  ========================================
echo   DONOR MAP OPERATIONS CENTER
echo  ========================================
echo.
echo  Starting server...
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo  First run detected — installing dependencies...
    echo.
    call npm install
    echo.
)

:: Start the dev server and open browser
start "" http://localhost:3333
call npm run dev
