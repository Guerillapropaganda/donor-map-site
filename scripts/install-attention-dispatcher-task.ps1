# Install / reinstall the "DonorMap Attention Dispatcher" Windows
# scheduled task. The dispatcher is a long-lived Node daemon that runs
# scripts/attention-dispatcher.cjs in node-cron mode, firing each
# producer on its own schedule (voice-drift every 30min, promotion
# queue hourly, top-N weekly, etc).
#
# Task configuration (verified working 2026-04-29):
#   - One trigger: AtLogOn — start when user logs in
#   - Working directory: main repo at C:\Users\third\donor-map-site
#     (NOT this worktree; the worktree disappears between sessions)
#   - Restart on failure every 5 minutes, up to 3 times
#   - Runs under current user, RunLevel Limited, no elevation needed
#
# !! AtStartup attempted 2026-04-28 + 2026-04-29 — does NOT work !!
# Register-ScheduledTask returns 0x80070005 (Access denied) when an
# AtStartup trigger is combined with a -User <regular_user> task, even
# from elevated PowerShell. Boot-time triggers fire before any user
# session exists, so Windows requires either:
#   - `-User "SYSTEM"` (runs as SYSTEM at boot — different user PATH;
#     verify the dispatcher's writes still land in the right places)
#   - `-LogonType S4U` (still your user, no password — needs "Log on as
#     a batch job" right granted in local security policy first)
# Neither has been validated. See:
#   ~/.claude/projects/.../memory/project_dispatcher_atstartup_blocked.md
#
# Practical impact: the gap is "machine reboots without user logon
# soon after." Rare in practice. The currently-running dispatcher
# process survives task-definition edits — only fresh boots are at risk.
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

# Side-effect warning: schtasks /Delete kills any *running* instance of
# the named task (along with the task definition). We learned this the
# hard way 2026-04-29 when a failed reinstall left the dispatcher dead
# for 3.5 hours. Warn explicitly and require -Force to proceed when
# there's a live instance.
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    $isRunning = ($existingTask.State -eq "Running")
    if ($isRunning -and -not $args.Contains("-Force")) {
        Write-Host ""
        Write-Host "WARNING: Task '$TaskName' is currently RUNNING." -ForegroundColor Yellow
        Write-Host "Reinstalling will kill the running dispatcher process. If the new" -ForegroundColor Yellow
        Write-Host "Register-ScheduledTask call fails (e.g. permissions issue), the" -ForegroundColor Yellow
        Write-Host "dispatcher will stay dead until you manually restart it via:" -ForegroundColor Yellow
        Write-Host "  Start-Process -FilePath '$NodeExe' -ArgumentList '$Script' -WorkingDirectory '$MainRepo'" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Re-run with -Force to proceed anyway." -ForegroundColor Yellow
        exit 2
    }
}

# Remove existing task if present (silent on missing)
schtasks /Delete /TN $TaskName /F 2>$null | Out-Null

# Register-ScheduledTask handles path quoting cleanly; schtasks CLI
# struggles with nested quotes around "Program Files" + script path.
$action = New-ScheduledTaskAction `
    -Execute $NodeExe `
    -Argument "--max-old-space-size=4096 `"$Script`"" `
    -WorkingDirectory $MainRepo

# AtLogOn only. AtStartup was attempted twice and failed both times
# — see header docstring + memory note for the full story. If you want
# to revisit, the change is to switch -User / -LogonType in the
# Register-ScheduledTask call below; the trigger array is the easy part.
$triggers = @(New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME)

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
    -Description "DonorMap attention-queue producers. Trigger: AtLogOn (AtStartup deferred — Windows rejects under -User regular_user; needs SYSTEM or S4U)." `
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
