@echo off
REM Attention Queue Dispatcher — auto-runs producers in the background.
REM
REM To auto-start on Windows login:
REM   1. Press Win+R, type:  shell:startup
REM   2. Copy a SHORTCUT to this .bat into that folder.
REM      (Right-click this file → Create shortcut → drag shortcut to startup folder)
REM   3. It will launch silently every login.
REM
REM To run right now without installing:
REM   Double-click this file.
REM
REM To stop:
REM   Close the terminal window that opens.

cd /d "%~dp0\.."
node scripts\attention-dispatcher.cjs --daemon
pause
