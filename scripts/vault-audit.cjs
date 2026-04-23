#!/usr/bin/env node
/**
 * vault-audit.cjs — the unified audit harness (ADR-0021 Phase 1 skeleton)
 *
 * COORDINATION ONLY. This script does not add new checks. It invokes
 * existing audit scripts, captures their output, and aggregates findings
 * into one JSON artifact: content/Admin Notes/vault-audit-latest.json.
 *
 * Phase plan (ADR-0021):
 *   Phase 1 (THIS):  skeleton — run existing scripts, aggregate, report
 *   Phase 2 (next):  Ops UI reads the artifact
 *   Phase 3 (later): add missing checks (prose-data consistency, type-specific
 *                    A+ bars, stamp expiry, etc.)
 *   Phase 4 (later): auto-fix triage — safe fixes applied automatically,
 *                    judgment calls routed to Attention Queue
 *   Phase 5 (later): script pruning — archive scripts the harness subsumes
 *
 * What this does NOT do yet (deliberately):
 *   - No categorization (auto-fix vs queue vs known)
 *   - No auto-fixes
 *   - No Attention Queue writes
 *   - No cron / hook wiring
 *   - No new check types
 *
 * Usage:
 *   node scripts/vault-audit.cjs                 # run all checks, write artifact
 *   node scripts/vault-audit.cjs --only=REGEX    # only checks whose name matches REGEX
 *   node scripts/vault-audit.cjs --skip=REGEX    # skip checks whose name matches REGEX
 *   node scripts/vault-audit.cjs --json          # print artifact to stdout, no file
 *   node scripts/vault-audit.cjs --quiet         # suppress terminal summary
 *
 * Exit codes:
 *   0 = harness completed (individual check failures still count; read artifact)
 *   1 = harness itself errored (couldn't run, couldn't write)
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'content', 'Admin Notes', 'vault-audit-latest.json');

// ─── Args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argValue = (flag) => {
  const a = args.find(a => a.startsWith(flag + '='));
  return a ? a.slice(flag.length + 1) : null;
};
const ONLY = argValue('--only');
const SKIP = argValue('--skip');
const JSON_STDOUT = args.includes('--json');
const QUIET = args.includes('--quiet');

// ─── Registered checks ─────────────────────────────────────────────
//
// Each entry:
//   name          — short identifier (becomes key in artifact)
//   description   — one-line plain English
//   cmd           — argv array (first element is executable)
//   parse         — fn(stdout, stderr, exit) → { findings_count, sample, artifact_ref }
//                   Controls what we show to David. Can return null findings
//                   for scripts that only produce a pass/fail signal.
//   timeout_ms    — per-check wall-clock limit
//
// To add a check: append an entry. To remove: delete the entry. No other
// code change needed.

const CHECKS = [
  {
    name: 'pipeline-janitor',
    description: 'Zombie auto-blocks, stale enrichment, A+ audit checks on ready/verified profiles',
    cmd: ['node', 'scripts/pipeline-janitor.cjs', '--tier=a-plus', '--cohort'],
    parse: parsePipelineJanitor,
    timeout_ms: 120000,
  },
  {
    name: 'audit-committee-registry',
    description: 'FEC committee registry mis-mappings (Fairshake-pattern)',
    cmd: ['node', 'scripts/audit-committee-registry.cjs'],
    parse: parseSimpleCountFromLine,
    timeout_ms: 60000,
  },
  {
    name: 'reconcile-canonical-totals',
    description: 'Canonical total drift for hand-curated subjects (Trump, Harris, Leo, McConnell)',
    cmd: ['node', 'scripts/reconcile-canonical-totals.cjs', '--strict'],
    parse: parseCanonicalTotals,
    timeout_ms: 120000,
  },
  {
    name: 'no-inline-field',
    description: 'Dataview-style `field:: value` in profile body (banned)',
    cmd: ['node', 'scripts/no-inline-field-sentinel.cjs', '--all'],
    parse: parseInlineField,
    timeout_ms: 30000,
  },
  {
    name: 'publication-readiness',
    description: 'Profiles referenced in public-routes.json must pass all 8 publication gates',
    cmd: ['node', 'scripts/publication-readiness-check.cjs', '--public-only', '--json'],
    parse: parsePublicationReadiness,
    timeout_ms: 120000,
  },
  {
    name: 'reconciliation-framework-tier-1',
    description: 'Data integrity: absurd-value frontmatter, self-loop edges, duplicates, orphans',
    cmd: ['node', 'scripts/verify-all.cjs', '--tier', '1'],
    parse: parseVerifyAll,
    timeout_ms: 300000,
  },
];

// ─── Output parsers (one per check) ────────────────────────────────
//
// These are intentionally small. If a check's output format is hard to
// parse, prefer adding --json to the underlying script rather than
// writing a fragile regex here.

function parsePipelineJanitor(stdout, _stderr, _exit) {
  // Format: "With issues: NN" in output.
  const m = stdout.match(/With issues:\s+(\d+)/);
  const count = m ? parseInt(m[1], 10) : 0;
  const scanned = (stdout.match(/Scanned:\s+(\d+)/) || [])[1];
  return {
    findings_count: count,
    notes: `Scanned ${scanned || '?'} profiles. ${count} had issues.`,
  };
}

function parseSimpleCountFromLine(stdout, _stderr, exit) {
  // audit-committee-registry prints a summary line. Fall back to exit.
  const m = stdout.match(/(\d+)\s+(?:critical|high|issues?|anomalies?)/i);
  return {
    findings_count: m ? parseInt(m[1], 10) : (exit === 0 ? 0 : 1),
    notes: 'See full output in the raw stdout tail.',
  };
}

function parseCanonicalTotals(stdout, _stderr, exit) {
  const inBounds = (stdout.match(/in bounds:\s+(\d+)/) || [])[1] || '0';
  const tolerated = (stdout.match(/tolerated.*?:\s+(\d+)/) || [])[1] || '0';
  const out = (stdout.match(/out of bounds:\s+(\d+)/) || [])[1] || '0';
  return {
    findings_count: parseInt(out, 10),
    notes: `${inBounds} in-bounds, ${tolerated} tolerated, ${out} out-of-bounds. Exit ${exit}.`,
  };
}

function parseInlineField(stdout, stderr, _exit) {
  // sentinel prints to stderr on violation: "Total: NN violation(s) across NN file(s)"
  const text = stdout + '\n' + stderr;
  const m = text.match(/Total:\s+(\d+)\s+violation/);
  return {
    findings_count: m ? parseInt(m[1], 10) : 0,
    notes: m ? m[0] : 'clean',
  };
}

function parsePublicationReadiness(stdout, _stderr, _exit) {
  try {
    const j = JSON.parse(stdout);
    return {
      findings_count: j.failed || 0,
      notes: `${j.total || 0} scanned, ${j.passed || 0} passed, ${j.failed || 0} failed.`,
    };
  } catch {
    return { findings_count: 0, notes: '(json parse failed — likely 0 public routes yet)' };
  }
}

function parseVerifyAll(stdout, _stderr, _exit) {
  // format: "TOTAL: NN error, NN warn (NN findings)"
  const m = stdout.match(/TOTAL:\s+(\d+)\s+error,\s+(\d+)\s+warn\s+\((\d+)\s+findings/);
  if (!m) return { findings_count: 0, notes: '(no total line found)' };
  return {
    findings_count: parseInt(m[1], 10),
    notes: `${m[1]} error, ${m[2]} warn (${m[3]} findings total).`,
  };
}

// ─── Runner ────────────────────────────────────────────────────────

function runCheck(check) {
  const start = Date.now();
  const [cmd, ...cmdArgs] = check.cmd;
  let result;
  try {
    result = spawnSync(cmd, cmdArgs, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: check.timeout_ms,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    return {
      name: check.name,
      description: check.description,
      cmd: check.cmd,
      exit: null,
      duration_ms: Date.now() - start,
      error: err.message,
      findings_count: null,
      notes: 'harness error invoking check',
    };
  }

  const parsed = (() => {
    try {
      return check.parse(result.stdout || '', result.stderr || '', result.status);
    } catch (e) {
      return { findings_count: null, notes: `parse error: ${e.message}` };
    }
  })();

  return {
    name: check.name,
    description: check.description,
    cmd: check.cmd,
    exit: result.status,
    duration_ms: Date.now() - start,
    timed_out: result.signal === 'SIGTERM',
    findings_count: parsed.findings_count,
    notes: parsed.notes,
    stdout_tail: (result.stdout || '').split('\n').slice(-10).join('\n'),
    stderr_tail: (result.stderr || '').split('\n').slice(-5).join('\n'),
  };
}

// ─── Main ──────────────────────────────────────────────────────────

(function main() {
  const startAll = Date.now();

  const filtered = CHECKS.filter(c => {
    if (ONLY && !new RegExp(ONLY).test(c.name)) return false;
    if (SKIP && new RegExp(SKIP).test(c.name)) return false;
    return true;
  });

  if (!QUIET && !JSON_STDOUT) {
    console.log(`[vault-audit] running ${filtered.length} check(s)...`);
    console.log('');
  }

  const results = [];
  for (const c of filtered) {
    if (!QUIET && !JSON_STDOUT) process.stdout.write(`  -> ${c.name}... `);
    const r = runCheck(c);
    results.push(r);
    if (!QUIET && !JSON_STDOUT) {
      const mark = r.error ? '!' : (r.findings_count === 0 ? '✓' : '△');
      const fc = r.findings_count === null ? '?' : r.findings_count;
      const ms = (r.duration_ms / 1000).toFixed(1);
      console.log(`${mark} ${fc} finding(s) in ${ms}s`);
    }
  }

  const artifact = {
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startAll,
    harness_version: 'phase-1-skeleton',
    checks: results,
    summary: {
      checks_run: results.length,
      checks_clean: results.filter(r => r.findings_count === 0).length,
      checks_with_findings: results.filter(r => (r.findings_count || 0) > 0).length,
      checks_errored: results.filter(r => r.error || r.exit === null).length,
      total_findings: results.reduce((s, r) => s + (r.findings_count || 0), 0),
    },
  };

  if (JSON_STDOUT) {
    process.stdout.write(JSON.stringify(artifact, null, 2));
    process.stdout.write('\n');
    process.exit(0);
  }

  try {
    fs.writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2));
  } catch (err) {
    console.error(`[vault-audit] failed to write artifact: ${err.message}`);
    process.exit(1);
  }

  if (!QUIET) {
    console.log('');
    console.log('─'.repeat(60));
    console.log(`  ${artifact.summary.checks_clean}/${artifact.summary.checks_run} clean`);
    console.log(`  ${artifact.summary.checks_with_findings} with findings`);
    if (artifact.summary.checks_errored > 0) {
      console.log(`  ${artifact.summary.checks_errored} errored`);
    }
    console.log(`  ${artifact.summary.total_findings} total findings`);
    console.log(`  artifact: content/Admin Notes/vault-audit-latest.json`);
    console.log(`  ran in ${(artifact.duration_ms / 1000).toFixed(1)}s`);
  }

  process.exit(0);
})();
