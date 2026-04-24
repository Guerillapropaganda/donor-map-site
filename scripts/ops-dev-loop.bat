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

setlocal
cd /d "%~dp0\..\ops"
set OPS_AUTH_BYPASS=1

:loop
echo.
echo ================================================================
echo  [ops-dev-loop] starting next dev on port 3333
echo  Click "Restart dev server" in the Dashboard, or Ctrl+C here.
echo ================================================================
echo.
call npx next dev -p 3333
echo.
echo [ops-dev-loop] dev server exited (code %ERRORLEVEL%). Respawning in 1s...
echo [ops-dev-loop] Press Ctrl+C now to stop the loop instead of restarting.
timeout /t 1 >nul
goto loop
