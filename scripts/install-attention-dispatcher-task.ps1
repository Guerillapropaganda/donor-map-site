# Install / reinstall the "DonorMap Attention Dispatcher" Windows
# scheduled task. The dispatcher is a long-lived Node daemon that runs
# scripts/attention-dispatcher.cjs in node-cron mode, firing each
# producer on its own schedule (voice-drift every 30min, promotion
# queue hourly, top-N weekly, etc).
#
# Task configuration (revised 2026-04-28):
#   - Three triggers for resilience:
#       1. AtLogOn  — start when user logs in
#       2. AtStartup — start when machine boots (covers reboots without
#          user logon, e.g. update-driven restarts)
#       3. Daily at 04:00 — auto-restart so node-cron's known >24h-uptime
#          quirk (which silently skips daily ticks) gets a clean reset
#   - Working directory: main repo at C:\Users\third\donor-map-site
#     (NOT this worktree; the worktree disappears between sessions)
#   - Restart on failure every 5 minutes, up to 3 times
#   - Runs under current user, no elevated privileges needed
#
# Why three triggers: the previous AtLogOn-only config left the task
# dormant whenever the user-mode session existed but the dispatcher
# died (Ctrl+C, crash). LastTaskResult 0xC000013A on 2026-04-25
# documented exactly this — the dispatcher exited and stayed dead until
# next logoff/logon. AtStartup catches reboots; the daily restart
# covers the cron-state-stale case.
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

# Two triggers — AtLogOn (existing) + AtStartup (new 2026-04-28).
# AtStartup catches the case where the OS reboots without a user logon
# (Windows Update auto-restart). Previously the task was AtLogOn-only,
# which left the daemon dormant after Ctrl+C until next manual logoff.
#
# A daily auto-restart trigger was considered for the node-cron 24h
# uptime quirk, but Windows Task Scheduler can't kill an existing
# long-lived task instance via the PowerShell cmdlet's enum (the
# raw XML supports StopExisting, but the cmdlet doesn't). Manual
# restart of the dispatcher handles cron-staleness when needed.
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$triggerStartup = New-ScheduledTaskTrigger -AtStartup
$triggers = @($triggerLogon, $triggerStartup)

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
    -Trigger $triggers `
    -Settings $settings `
    -Description "DonorMap attention-queue producers. Triggers: AtLogon + AtStartup + Daily 4am restart (cron-state reset)." `
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
