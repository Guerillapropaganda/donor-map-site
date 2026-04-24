#!/usr/bin/env node
/**
 * dispatcher-alive-check.cjs — ADR-0021 / P-028 follow-up.
 *
 * Flags if the Attention Queue dispatcher daemon is dead or stuck.
 *
 * Why this exists: the 2026-04-23 /attention audit found the dispatcher
 * had NEVER run on the dev machine. The `.attention-dispatcher.log` file
 * was absent, all queue entries were 3-13 days stale, and no ops-app
 * surface reported the silent-death failure. This check surfaces that
 * class of failure.
 *
 * How it works: reads the mtime of
 *   content/Admin Notes/.attention-dispatcher.log
 * The dispatcher appends to this log every time any producer runs. The
 * fastest-cadence producer (voice-drift-detector) runs every 30 minutes.
 * If the log mtime is >90 minutes old (grace margin for slow runs),
 * the dispatcher is either dead or stuck.
 *
 * Expected operational state (David is at the computer 9am-10pm):
 *   - log mtime is usually <30 min old during working hours
 *   - during overnight (10pm-9am) the log freezes (computer off) — that's fine
 *   - on login, dispatcher fires everything once, log updates immediately
 *
 * The check only fires during expected-uptime hours. Overnight staleness
 * is not a problem — it's a property of "computer is off", not a failure.
 *
 * Usage:
 *   node scripts/dispatcher-alive-check.cjs          # text report
 *   node scripts/dispatcher-alive-check.cjs --json   # for vault-audit harness
 */

const fs = require('fs');
const path = require('path');

const JSON_OUT = process.argv.includes('--json');

const LOG_FILE = path.join('content', 'Admin Notes', '.attention-dispatcher.log');
const STALE_THRESHOLD_MS = 90 * 60 * 1000; // 90 minutes

// Expected-uptime window (local time). Outside this window, staleness is
// not a failure — the computer is off by design.
const UPTIME_START_HOUR = 8;  // 8am — buffer before 9am dev start
const UPTIME_END_HOUR = 23;   // 11pm — buffer after 10pm

function nowLocalHour() {
  return new Date().getHours();
}

function inUptimeWindow() {
  const h = nowLocalHour();
  return h >= UPTIME_START_HOUR && h < UPTIME_END_HOUR;
}

function report(obj) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(obj) + '\n');
  } else {
    console.log(JSON.stringify(obj, null, 2));
  }
}

// 1. Is the log file present?
if (!fs.existsSync(LOG_FILE)) {
  report({
    status: 'missing',
    findings_count: 1,
    log_file: LOG_FILE,
    age_minutes: null,
    in_uptime_window: inUptimeWindow(),
    message: 'Dispatcher log file does not exist. Daemon has never run on this machine. Install the Windows Startup shortcut or run scripts/attention-dispatcher.bat manually.',
  });
  process.exit(0);
}

// 2. How old is it?
const stat = fs.statSync(LOG_FILE);
const ageMs = Date.now() - stat.mtime.getTime();
const ageMin = Math.floor(ageMs / 60000);

// 3. Interpret
const inUptime = inUptimeWindow();

if (!inUptime) {
  // Outside expected uptime — staleness is fine
  report({
    status: 'sleeping',
    findings_count: 0,
    log_file: LOG_FILE,
    age_minutes: ageMin,
    in_uptime_window: false,
    message: `Outside expected uptime window (${UPTIME_START_HOUR}:00-${UPTIME_END_HOUR}:00 local). Log ${ageMin} min old. Dispatcher resumes on next login.`,
  });
  process.exit(0);
}

if (ageMs <= STALE_THRESHOLD_MS) {
  report({
    status: 'alive',
    findings_count: 0,
    log_file: LOG_FILE,
    age_minutes: ageMin,
    in_uptime_window: true,
    message: `Dispatcher alive — last producer run ${ageMin} min ago.`,
  });
  process.exit(0);
}

// Stale during uptime = failure
report({
  status: 'stale',
  findings_count: 1,
  log_file: LOG_FILE,
  age_minutes: ageMin,
  in_uptime_window: true,
  message: `Dispatcher log is ${ageMin} min old during expected-uptime window (threshold ${STALE_THRESHOLD_MS / 60000}min). Daemon may be dead or stuck. Check: (1) is the node process running? (2) any errors in the tail of the log? Restart with scripts/attention-dispatcher.bat.`,
});
process.exit(0);
