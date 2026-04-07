@echo off
echo Creating desktop shortcut for Donor Map Ops...

set SCRIPT_DIR=%~dp0
set SHORTCUT=%USERPROFILE%\Desktop\Donor Map Ops.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%SCRIPT_DIR%start-ops.bat'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'The Donor Map Operations Center'; $s.Save()"

if exist "%SHORTCUT%" (
    echo.
    echo  Shortcut created on your Desktop!
    echo  Double-click "Donor Map Ops" to start.
    echo.
) else (
    echo.
    echo  Failed to create shortcut. You can manually create one
    echo  pointing to: %SCRIPT_DIR%start-ops.bat
    echo.
)

pause
