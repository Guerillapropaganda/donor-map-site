# Install / reinstall the "DonorMap Attention Dispatcher" Windows
# scheduled task. The dispatcher is a long-lived Node daemon that runs
# scripts/attention-dispatcher.cjs in node-cron mode, firing each
# producer on its own schedule (voice-drift every 30min, promotion
# queue hourly, financial-disclosures daily at 6am, top-N weekly).
#
# Task configuration:
#   - Runs at user logon
#   - Working directory: main repo at C:\Users\third\donor-map-site
#     (NOT this worktree; the worktree disappears between sessions)
#   - Restart on failure every 5 minutes, up to 3 times
#   - Runs under current user, no elevated privileges needed
#
# Run once to install, re-run to reinstall with latest config.
# Uninstall with:  schtasks /Delete /TN "DonorMap Attention Dispatcher" /F

$TaskName = "DonorMap Attention Dispatcher"
$MainRepo = "C:\Users\third\donor-map-site"
$NodeExe  = "C:\Program Files\nodejs\node.exe"
$Script   = "$MainRepo\scripts\attention-dispatcher.cjs"
$LogDir   = "$MainRepo\content\Admin Notes"

if (-not (Test-Path $NodeExe))   { Write-Error "Node.exe not found at $NodeExe"; exit 1 }
if (-not (Test-Path $Script))    { Write-Error "Dispatcher script missing: $Script"; exit 1 }

# Remove existing task if present (silent on missing)
schtasks /Delete /TN $TaskName /F 2>$null | Out-Null

# Register-ScheduledTask handles path quoting cleanly; schtasks CLI
# struggles with nested quotes around "Program Files" + script path.
$action = New-ScheduledTaskAction `
    -Execute $NodeExe `
    -Argument "--max-old-space-size=4096 `"$Script`"" `
    -WorkingDirectory $MainRepo

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Restart 3 times at 5-min intervals if the process crashes; keep
# running indefinitely between logons. No time limit.
$settings = New-ScheduledTaskSettingsSet `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

# Remove existing task of same name
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "DonorMap attention-queue producers (voice-drift, hallucination-catcher, promotion-queue, financial-disclosures, top-N scorer)" `
    -User $env:USERNAME `
    -RunLevel Limited | Out-Null

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Error "Task creation failed. Exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Task installed. It will start next time you log on." -ForegroundColor Green
Write-Host "To start it now without logging out:"
Write-Host "  schtasks /Run /TN `"$TaskName`""
Write-Host ""
Write-Host "To check status:"
Write-Host "  schtasks /Query /TN `"$TaskName`" /V /FO LIST"
Write-Host ""
Write-Host "Dispatcher logs land in:"
Write-Host "  $LogDir\.attention-dispatcher.log"
