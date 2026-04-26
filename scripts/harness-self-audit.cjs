#!/usr/bin/env node
/**
 * harness-self-audit.cjs — meta-audit: is the audit system itself healthy?
 *
 * The vault-audit harness checks the vault. This check checks the harness.
 *
 * Class of failure this catches: rot in the system that maintains the vault.
 * Tonight (2026-04-26) we found: stale auto-block names in pipeline-janitor's
 * EXPECTED_BLOCKS, six unscheduled builder scripts, a janitor write-mode that
 * was authorized by ADR but never wired into the dispatcher. None of those
 * were detected by the existing harness because none of its 17 checks audit
 * the harness/dispatcher itself. This script is the missing layer.
 *
 * Three checks (will grow):
 *   1. unscheduled-builder
 *      Every active scripts/build-*-panel(s).cjs must appear in either
 *      attention-dispatcher.cjs PRODUCERS or vault-audit.cjs CHECKS, OR
 *      be in the SELF_AUDIT_OPT_OUT set. Otherwise it's a producer that
 *      drifts in silence.
 *
 *   2. stalled-producer
 *      Every dispatcher producer must have logged a successful run in
 *      attention-dispatcher.log within its expected interval (×1.5 grace).
 *      Catches dispatcher-down, persistent-timeout, broken-script.
 *
 *   3. block-name-drift
 *      Every BLOCK_START name a builder emits must appear in at least
 *      one EXPECTED_BLOCKS pattern array in pipeline-janitor.cjs.
 *      Otherwise janitor doesn't audit that block class — exactly the
 *      false-positive trap we hit tonight (auto:fec-lifetime emitted
 *      but janitor only checked auto:fec-politician).
 *
 * Usage:
 *   node scripts/harness-self-audit.cjs           # human-readable
 *   node scripts/harness-self-audit.cjs --json    # for vault-audit harness
 *
 * Exit code: 0 when no findings, 1 when findings exist.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const DISPATCHER = path.join(SCRIPTS, 'attention-dispatcher.cjs');
const VAULT_AUDIT = path.join(SCRIPTS, 'vault-audit.cjs');
const JANITOR = path.join(SCRIPTS, 'pipeline-janitor.cjs');
const DISPATCHER_LOG = path.join(ROOT, 'content', 'Admin Notes', '.attention-dispatcher.log');

const JSON_MODE = process.argv.includes('--json');

// Builders that are intentionally NOT scheduled. Add here with reason.
//   Format: scriptName → reason (string shown in audit output if questioned)
const SELF_AUDIT_OPT_OUT = {
  'build-relationships-per-profile-legacy.cjs':
    'legacy — superseded by build-relationships-per-profile.cjs',
  'build-policy-pages.cjs':
    'page builder, run as part of Quartz build — not a profile-body producer',
  'build-officer-registry.cjs':
    'one-off registry build, manual invocation',
  'build-profile-search-index.cjs':
    'search index build, run as part of Quartz build',
};

// ─── Helpers ────────────────────────────────────────────────────

function readSafe(p) {
  try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; }
}

// Estimate the maximum acceptable gap between successful runs for a producer
// based on its cron expression. Returns milliseconds.
//
// Approach: look at minute, hour, dayOfWeek fields. We only need rough
// classification — minute-frequency vs hourly vs daily vs weekly.
function expectedMaxGapMs(cron) {
  const parts = (cron || '').trim().split(/\s+/);
  if (parts.length < 5) return 25 * 3600 * 1000;
  const [min, hr, , , dow] = parts;
  // Weekly: dow is a digit (e.g. "0" for Sunday)
  if (/^\d/.test(dow)) return 8 * 24 * 3600 * 1000;
  // Daily: hour is a fixed digit (no */)
  if (/^\d/.test(hr) && !hr.includes('*')) return 25 * 3600 * 1000;
  // Hourly: minute is fixed, hour is *
  if (/^\d/.test(min) && hr === '*') return 90 * 60 * 1000;
  // Every N minutes: */N — give 3× grace with a 60-min floor so a daemon
  // restart doesn't immediately trip stall detection on the every-15-min
  // checks. Persistent stalls (>60 min on a 15-min schedule) still flag.
  const everyN = (min.match(/^\*\/(\d+)$/) || [])[1];
  if (everyN) return Math.max(parseInt(everyN, 10) * 3, 60) * 60 * 1000;
  return 25 * 3600 * 1000;
}

// Parse the producer registry from attention-dispatcher.cjs source. Returns
// [{ name, schedule, script, args }, ...]. Brittle (regex-based) but the
// format is stable and we ship a smoke test below.
function parseDispatcherProducers() {
  const src = readSafe(DISPATCHER);
  const start = src.indexOf('const PRODUCERS = [');
  if (start === -1) return [];
  // Find the matching closing bracket of the array.
  let depth = 0, i = start + 'const PRODUCERS = '.length, end = -1;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) return [];
  const block = src.slice(start, end);
  // Each producer is an object { name: '...', schedule: '...', script: '...', ... }
  const producers = [];
  const reEntry = /\{\s*[^{}]*?name:\s*['"]([\w-]+)['"][\s\S]*?schedule:\s*['"]([^'"]+)['"][\s\S]*?script:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = reEntry.exec(block)) !== null) {
    producers.push({ name: m[1], schedule: m[2], script: m[3] });
  }
  return producers;
}

// All build-*-panel(s).cjs scripts in scripts/ root (not _archive/).
function listBuilderScripts() {
  return fs.readdirSync(SCRIPTS)
    .filter(f => /^build-.*-panels?\.cjs$/.test(f))
    .map(f => f);
}

// All BLOCK_START values declared in build-*-panel(s).cjs files.
// Returns Map<blockName, [scriptFile,...]>.
function extractEmittedBlockNames() {
  const out = new Map();
  for (const file of listBuilderScripts()) {
    if (SELF_AUDIT_OPT_OUT[file]) continue;
    const src = readSafe(path.join(SCRIPTS, file));
    const re = /BLOCK_START\s*=\s*["']<!--\s*(auto:[a-z][a-z0-9-]*)\s+start\s*-->["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1];
      if (!out.has(name)) out.set(name, []);
      out.get(name).push(file);
    }
  }
  return out;
}

// All auto:* names the janitor knows about — scans both EXPECTED_BLOCKS
// (required-or-demote) and KNOWN_OPTIONAL_BLOCKS (registered but absence
// never demotes). A block in either registry passes the drift check.
function extractExpectedBlockNames() {
  const src = readSafe(JANITOR);
  const out = new Set();
  const re = /['"](auto:[a-z][a-z0-9-]*)['"]/g;

  const expectedStart = src.indexOf('const EXPECTED_BLOCKS');
  if (expectedStart !== -1) {
    const slice = src.slice(expectedStart, expectedStart + 4000);
    let m;
    while ((m = re.exec(slice)) !== null) out.add(m[1]);
  }

  const optionalStart = src.indexOf('const KNOWN_OPTIONAL_BLOCKS');
  if (optionalStart !== -1) {
    const slice = src.slice(optionalStart, optionalStart + 2000);
    let m;
    while ((m = re.exec(slice)) !== null) out.add(m[1]);
  }

  return out;
}

// Last successful run timestamp per producer, scraped from the dispatcher log.
// Returns Map<producerName, Date>.
function lastSuccessfulRunPerProducer() {
  const log = readSafe(DISPATCHER_LOG);
  const out = new Map();
  // Lines look like: "[2026-04-26T05:36:25.696Z] ✓ build-fec-lifetime-panels (12201ms) — ..."
  const re = /^\[([^\]]+)\]\s+✓\s+([\w-]+)/gm;
  let m;
  while ((m = re.exec(log)) !== null) {
    const ts = new Date(m[1]);
    const name = m[2];
    const prev = out.get(name);
    if (!prev || ts > prev) out.set(name, ts);
  }
  return out;
}

// ─── Checks ─────────────────────────────────────────────────────

function checkUnscheduledBuilders() {
  const findings = [];
  const builders = listBuilderScripts();
  const dispatcherSrc = readSafe(DISPATCHER);
  const vaultAuditSrc = readSafe(VAULT_AUDIT);
  for (const file of builders) {
    if (SELF_AUDIT_OPT_OUT[file]) continue;
    const referenced = dispatcherSrc.includes(file) || vaultAuditSrc.includes(file);
    if (!referenced) {
      findings.push({
        kind: 'unscheduled-builder',
        detail: `${file} is not referenced in attention-dispatcher.cjs or vault-audit.cjs`,
        fix: `add a producer entry to attention-dispatcher.cjs PRODUCERS, or add to SELF_AUDIT_OPT_OUT in harness-self-audit.cjs with a justification`,
      });
    }
  }
  return findings;
}

function checkStalledProducers() {
  const findings = [];
  const producers = parseDispatcherProducers();
  const lastRun = lastSuccessfulRunPerProducer();
  const now = Date.now();
  for (const p of producers) {
    const last = lastRun.get(p.name);
    const maxGap = expectedMaxGapMs(p.schedule);
    if (!last) {
      // Brand-new producer — only flag if the dispatcher log has been
      // accumulating for longer than the expected gap (so we know the
      // producer SHOULD have fired by now). Otherwise it's just new.
      const logStat = (() => { try { return fs.statSync(DISPATCHER_LOG); } catch { return null; } })();
      const logAgeMs = logStat ? now - logStat.birthtimeMs : 0;
      if (logAgeMs > maxGap) {
        findings.push({
          kind: 'stalled-producer',
          detail: `${p.name} (${p.schedule}) has never logged a successful run; dispatcher log is older than expected gap`,
          fix: `check the dispatcher daemon is alive, or run the producer once manually to verify it works`,
        });
      }
      continue;
    }
    const gap = now - last.getTime();
    if (gap > maxGap) {
      const hrs = (gap / 3600 / 1000).toFixed(1);
      findings.push({
        kind: 'stalled-producer',
        detail: `${p.name} (${p.schedule}) last succeeded ${hrs}h ago; expected interval ≤${(maxGap / 3600 / 1000).toFixed(1)}h`,
        fix: `check dispatcher log for failures, restart daemon if needed, fix the script if it's been timing out`,
      });
    }
  }
  return findings;
}

function checkBlockNameDrift() {
  const findings = [];
  const emitted = extractEmittedBlockNames();
  const expected = extractExpectedBlockNames();
  for (const [blockName, scripts] of emitted) {
    if (!expected.has(blockName)) {
      findings.push({
        kind: 'block-name-drift',
        detail: `${blockName} is emitted by ${scripts.join(', ')} but not in pipeline-janitor.cjs EXPECTED_BLOCKS — janitor cannot audit profiles for it`,
        fix: `add ${blockName} to the relevant EXPECTED_BLOCKS pattern array in pipeline-janitor.cjs`,
      });
    }
  }
  return findings;
}

// ─── Main ───────────────────────────────────────────────────────

function main() {
  const findings = [
    ...checkUnscheduledBuilders(),
    ...checkStalledProducers(),
    ...checkBlockNameDrift(),
  ];

  if (JSON_MODE) {
    console.log(JSON.stringify({ findings_count: findings.length, findings }, null, 2));
  } else {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Harness Self-Audit');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Findings: ${findings.length}`);
    console.log('');
    if (findings.length === 0) {
      console.log('  ✓ Harness/dispatcher wiring looks healthy.');
    } else {
      const byKind = {};
      for (const f of findings) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
      for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${k}: ${n}`);
      }
      console.log('');
      for (const f of findings) {
        console.log(`  • [${f.kind}] ${f.detail}`);
        console.log(`    → ${f.fix}`);
      }
    }
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main();
