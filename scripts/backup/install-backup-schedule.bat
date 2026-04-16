@echo off
REM install-backup-schedule.bat — Register daily 3 AM backup with Windows Task Scheduler
REM
REM Run this once. It creates a scheduled task that runs refresh-vault-backup.bat daily.
REM
REM Prerequisites:
REM   1. git remote add backup https://github.com/Guerillapropaganda/donor-map-vault.git
REM   2. gh auth login (for the staleness check)
REM
REM Uninstall:
REM   schtasks /delete /tn "DonorMapVaultBackup" /f

echo Creating scheduled task "DonorMapVaultBackup"...
schtasks /create /tn "DonorMapVaultBackup" /tr "C:\Users\third\donor-map-site\scripts\backup\refresh-vault-backup.bat" /sc daily /st 03:00 /f

if errorlevel 1 (
    echo Failed to create scheduled task. Try running as Administrator.
    exit /b 1
)

echo.
echo Task created successfully.
echo   Name:     DonorMapVaultBackup
echo   Schedule: Daily at 3:00 AM
echo   Script:   C:\Users\third\donor-map-site\scripts\backup\refresh-vault-backup.bat
echo.
echo To verify: schtasks /query /tn "DonorMapVaultBackup"
echo To remove: schtasks /delete /tn "DonorMapVaultBackup" /f
