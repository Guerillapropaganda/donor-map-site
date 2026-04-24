@echo off
rem ops-dev-loop.bat — launch the ops dev server in a respawn loop.
rem
rem Why: Next.js dev-server hot-reload sometimes fails to pick up changes
rem that add new React hooks / useState / useEffect logic (see P-038 in
rem content/Admin Notes/ops-audit-2026-04-23.md). The Dashboard has a
rem "Restart dev server" button that POSTs to /api/ops-restart, which
rem calls process.exit(0). This wrapper notices the exit and re-launches
rem the server automatically. End result: David clicks one button in the
rem browser, the server recycles itself, the page auto-reloads ~5s later
rem with fresh code.
rem
rem Usage:
rem   scripts\ops-dev-loop.bat
rem
rem Stopping:
rem   Hit Ctrl+C once. Cmd will ask "Terminate batch job? (Y/N)" — press Y
rem   to exit the wrapper (not just the inner dev server).
rem
rem Assumes OPS_AUTH_BYPASS=1 (local-dev-only; see ops/README.md).

setlocal EnableDelayedExpansion
cd /d "%~dp0\..\ops"
set OPS_AUTH_BYPASS=1
set FAIL_STREAK=0

:loop
echo.
echo ================================================================
echo  [ops-dev-loop] starting next dev on port 3333
echo  Click "Restart dev server" in the Dashboard, or Ctrl+C here.
echo ================================================================
echo.

rem Capture start time (Unix seconds) via PowerShell. Simpler than
rem parsing %TIME% and handles midnight rollover correctly.
for /f "usebackq" %%i in (`powershell -NoProfile -Command "[int64][double]::Parse((Get-Date -UFormat %%s))"`) do set START=%%i

call npx next dev -p 3333
set EXITCODE=!ERRORLEVEL!

for /f "usebackq" %%i in (`powershell -NoProfile -Command "[int64][double]::Parse((Get-Date -UFormat %%s))"`) do set END=%%i
set /a ELAPSED=!END! - !START!

echo.
echo [ops-dev-loop] dev server exited (code !EXITCODE!, ran !ELAPSED!s)

rem Fail-fast: 3 rapid exits in a row (each under 3s) means something
rem is wrong (port held by another process, missing dependency, syntax
rem error on cold start). Stop the loop instead of burning CPU.
if !ELAPSED! LSS 3 (
    set /a FAIL_STREAK+=1
    echo [ops-dev-loop] quick exit — streak !FAIL_STREAK!/3
    if !FAIL_STREAK! GEQ 3 (
        echo.
        echo ================================================================
        echo  [ops-dev-loop] STOPPING — 3 rapid exits in a row.
        echo  Likely causes:
        echo    1. Port 3333 is held by another process.
        echo       Check: netstat -ano ^| findstr :3333
        echo       Kill:  taskkill /PID ^<pid^> /F
        echo    2. Syntax error on cold start. Scroll up for the error.
        echo    3. Missing deps. Try: cd ops ^&^& npm install
        echo.
        echo  Fix the root cause, then re-run this script.
        echo ================================================================
        endlocal
        exit /b 1
    )
) else (
    set FAIL_STREAK=0
)

echo [ops-dev-loop] respawning in 1s (Ctrl+C to stop)...
timeout /t 1 >nul
goto loop
