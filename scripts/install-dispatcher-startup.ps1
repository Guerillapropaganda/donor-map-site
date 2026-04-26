# install-dispatcher-startup.ps1
#
# One-shot installer for the Attention Queue dispatcher daemon. Creates
# a shortcut to scripts\attention-dispatcher.bat in the Windows Startup
# folder, so the dispatcher launches silently on every login.
#
# Why this exists: dispatcher-alive harness check has been firing because
# the daemon was never installed on the dev machine. Manual install steps
# (Win+R → shell:startup → drag shortcut) work but invite forgetting.
# This script does it in one double-click.
#
# Usage:
#   Right-click → Run with PowerShell
#   OR
#   powershell -ExecutionPolicy Bypass -File scripts\install-dispatcher-startup.ps1
#
# To uninstall, run:
#   Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Donor Map Dispatcher.lnk"

$ErrorActionPreference = "Stop"

# Resolve repo root (parent of scripts/ where this file lives)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$batPath   = Join-Path $scriptDir "attention-dispatcher.bat"

if (-not (Test-Path $batPath)) {
    Write-Host "ERROR: $batPath not found." -ForegroundColor Red
    Write-Host "Are you running this from the repo's scripts/ folder?"
    exit 1
}

# Build shortcut path in user Startup folder
$startupDir   = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "Donor Map Dispatcher.lnk"

if (Test-Path $shortcutPath) {
    Write-Host "Shortcut already exists at:" -ForegroundColor Yellow
    Write-Host "  $shortcutPath"
    $reply = Read-Host "Overwrite? (y/N)"
    if ($reply -ne "y" -and $reply -ne "Y") {
        Write-Host "Aborted. Existing shortcut left in place."
        exit 0
    }
    Remove-Item $shortcutPath
}

# Create the .lnk via WScript.Shell COM
$shell    = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath       = $batPath
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description      = "Donor Map Attention Queue Dispatcher (auto-start)"
$shortcut.WindowStyle      = 7  # 7 = minimized
$shortcut.Save()

Write-Host "[OK] Installed startup shortcut:" -ForegroundColor Green
Write-Host "     $shortcutPath"
Write-Host ""
Write-Host "The dispatcher will launch on next login. To start it right now:"
Write-Host "  Double-click  $batPath"
Write-Host ""
Write-Host "To verify health, run:"
Write-Host "  node scripts\dispatcher-alive-check.cjs"
