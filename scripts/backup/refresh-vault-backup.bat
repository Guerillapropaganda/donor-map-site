@echo off
REM refresh-vault-backup.bat — Push current v4 to backup remote daily
REM
REM Registered with Windows Task Scheduler to run at 3:00 AM.
REM
REM Setup (run once):
REM   git remote add backup https://github.com/Guerillapropaganda/donor-map-vault.git
REM
REM Install schedule (run once):
REM   scripts\backup\install-backup-schedule.bat
REM
REM Uninstall:
REM   schtasks /delete /tn "DonorMapVaultBackup" /f

set REPO_DIR=C:\Users\third\donor-map-site
set LOG_FILE=%REPO_DIR%\scripts\backup\backup.log
set DATE_TAG=backup/%date:~10,4%-%date:~4,2%-%date:~7,2%

echo [%date% %time%] Starting backup... >> "%LOG_FILE%"

cd /d "%REPO_DIR%"

REM Check if backup remote exists
git remote get-url backup >nul 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERROR: backup remote not configured. Run: git remote add backup https://github.com/Guerillapropaganda/donor-map-vault.git >> "%LOG_FILE%"
    exit /b 1
)

REM Push v4 branch to backup
git push backup v4 --force-with-lease >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERROR: Failed to push v4 to backup remote >> "%LOG_FILE%"
    exit /b 1
)

REM Create and push dated tag
git tag -f "%DATE_TAG%" HEAD >> "%LOG_FILE%" 2>&1
git push backup "%DATE_TAG%" --force >> "%LOG_FILE%" 2>&1

echo [%date% %time%] Backup complete. Tag: %DATE_TAG% >> "%LOG_FILE%"
