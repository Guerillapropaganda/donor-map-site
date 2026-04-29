#!/usr/bin/env node
/**
 * auto-bug-harness-crashes.cjs
 *
 * Scans the latest vault-audit artifact for genuinely-crashed checks
 * and auto-files bug-queue entries. Closes the gap where a harness
 * check throws or times out and the failure sits silently in the
 * artifact's `errored` summary.
 *
 * "Crashed" = `r.error` exists OR `r.exit === null` OR `r.timed_out`.
 * (Per scripts/vault-audit.cjs:1033 — `checks_errored` definition.)
 * Checks that exit 1 with a parsed findings_count are NOT crashes —
 * those use exit code as a "has findings" signal and are the harness
 * working as designed.
 *
 * Each crashed check produces one bug entry with:
 *   - producer:  harness-crash
 *   - key:       <check-name>     (idempotent: re-runs find existing)
 *   - title:     "Harness check '<name>' crashed"
 *   - severity:  high             (broken safety net = real risk)
 *   - predicate: harness-check=<name>
 *
 * Predicate fires when the next harness run reports the check as clean
 * (findings_count >= 0), so the bug auto-resolves without human action.
 *
 * Wired into attention-dispatcher.cjs every 15 min, 7 minutes after
 * vault-audit, so findings are fresh.
 *
 * Usage:
 *   node scripts/auto-bug-harness-crashes.cjs           # apply (default)
 *   node scripts/auto-bug-harness-crashes.cjs --dry-run # preview only
 *   node scripts/auto-bug-harness-crashes.cjs --json    # machine output
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_PATH = path.join(ROOT, 'content', 'Admin Notes', 'vault-audit-latest.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const AS_JSON = args.includes('--json');

if (!fs.existsSync(ARTIFACT_PATH)) {
  const msg = { skipped: 'no-artifact', path: ARTIFACT_PATH };
  if (AS_JSON) console.log(JSON.stringify(msg));
  else console.log('auto-bug-harness-crashes: no harness artifact yet — nothing to do');
  process.exit(0);
}

const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf-8'));
const checks = Array.isArray(artifact.checks) ? artifact.checks : [];

// Distinguish genuine crashes from intentional exit-1 (= has findings).
const crashed = checks.filter((c) =>
  c.error || c.exit === null || c.timed_out === true
);

if (crashed.length === 0) {
  const msg = { crashed: 0, summary: artifact.summary || null };
  if (AS_JSON) console.log(JSON.stringify(msg));
  else console.log('auto-bug-harness-crashes: 0 crashed checks');
  process.exit(0);
}

if (DRY_RUN) {
  const out = { dry_run: true, crashed: crashed.length, names: crashed.map((c) => c.name) };
  if (AS_JSON) console.log(JSON.stringify(out));
  else {
    console.log(`auto-bug-harness-crashes (dry-run): ${crashed.length} would-be bug(s)`);
    crashed.forEach((c) => console.log(`  ${c.name} — exit=${c.exit} timed_out=${c.timed_out} error=${c.error || '(none)'}`));
  }
  process.exit(0);
}

const { addBug } = require('./lib/bugs-store.cjs');
const results = [];

for (const c of crashed) {
  const reason = c.timed_out
    ? `timed out after ${c.duration_ms || '?'}ms`
    : c.error
      ? `threw: ${String(c.error).slice(0, 200)}`
      : 'exited without status code';
  const stderr = (c.stderr_tail || '').slice(-300).trim();
  const r = addBug({
    producer: 'harness-crash',
    key: c.name,
    title: `Harness check '${c.name}' crashed`,
    severity: 'high',
    where: `scripts/vault-audit.cjs (check: ${c.name})`,
    what: `${c.description || c.name} — ${reason}.${stderr ? ' stderr: ' + stderr : ''}`,
    predicate: `harness-check=${c.name}`,
    metadata: {
      'check-cmd': Array.isArray(c.cmd) ? c.cmd.join(' ') : String(c.cmd || ''),
      'last-failure': artifact.generated_at || new Date().toISOString(),
    },
  });
  results.push({ check: c.name, ...r });
}

if (AS_JSON) {
  console.log(JSON.stringify({ crashed: crashed.length, results }));
} else {
  const created = results.filter((r) => r.status === 'created').length;
  const existing = results.filter((r) => r.status === 'exists').length;
  console.log(`auto-bug-harness-crashes: ${results.length} crashed, ${created} new bug(s), ${existing} existing`);
  results.forEach((r) => console.log(`  ${r.id} (${r.status}) — ${r.check}`));
}
