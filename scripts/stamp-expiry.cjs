#!/usr/bin/env node
/**
 * stamp-expiry.cjs
 *
 * Flags publication-tier profiles whose `last-enriched` stamp is older
 * than the per-tier window. ADR-0017 requires data freshness ≤90 days
 * for data-complete; verified tolerates longer since editor review is
 * less frequent than pipeline reruns.
 *
 * Windows (per Phase 3 design call, 2026-04-23):
 *   verified       → 180 days  (editorial cycle, slower drift)
 *   data-complete  → 90 days   (pipeline-fed, needs fresh data)
 *
 * Missing stamp is always a finding. Malformed stamp is always a finding.
 *
 * Usage:
 *   node scripts/stamp-expiry.cjs                 # summary
 *   node scripts/stamp-expiry.cjs --json          # machine-readable
 *   node scripts/stamp-expiry.cjs --verbose       # per-file listing
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

const JSON_OUT = process.argv.includes('--json');
const VERBOSE = process.argv.includes('--verbose');

const WINDOW_DAYS = {
  verified: 180,
  'data-complete': 90,
};

const NOW = Date.now();
const DAY_MS = 86400000;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
}

function parseStamp(v) {
  if (!v) return { ok: false, reason: 'missing' };
  const s = typeof v === 'string' ? v : (v instanceof Date ? v.toISOString() : String(v));
  const t = Date.parse(s);
  if (isNaN(t)) return { ok: false, reason: 'malformed' };
  return { ok: true, time: t, age_days: Math.floor((NOW - t) / DAY_MS) };
}

(function main() {
  const files = [];
  walk(CONTENT, files);

  let scanned = 0;
  const findings = [];

  for (const f of files) {
    const text = fs.readFileSync(f, 'utf-8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    let fm;
    try { fm = yaml.load(m[1]); } catch { continue; }
    if (!fm || typeof fm !== 'object') continue;

    const tier = fm['content-readiness'];
    if (tier !== 'verified' && tier !== 'data-complete') continue;
    scanned++;

    const window = WINDOW_DAYS[tier];
    const stamp = parseStamp(fm['last-enriched']);

    if (!stamp.ok) {
      findings.push({
        file: path.relative(ROOT, f).replace(/\\/g, '/'),
        tier,
        reason: `last-enriched ${stamp.reason}`,
        age_days: null,
        window_days: window,
      });
      continue;
    }

    if (stamp.age_days > window) {
      findings.push({
        file: path.relative(ROOT, f).replace(/\\/g, '/'),
        tier,
        reason: 'expired',
        age_days: stamp.age_days,
        window_days: window,
      });
    }
  }

  const by_tier = {};
  for (const f of findings) {
    by_tier[f.tier] = (by_tier[f.tier] || 0) + 1;
  }

  const artifact = {
    scanned,
    total_findings: findings.length,
    by_tier,
    window_days: WINDOW_DAYS,
    findings,
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(artifact, null, 2));
    process.stdout.write('\n');
    process.exit(0);
  }

  console.log(`stamp-expiry: scanned ${scanned} publication-tier profile(s)`);
  console.log(`  windows: verified=${WINDOW_DAYS.verified}d, data-complete=${WINDOW_DAYS['data-complete']}d`);
  console.log(`  ${findings.length} expired/missing`);
  for (const [t, n] of Object.entries(by_tier)) {
    console.log(`    ${t}: ${n}`);
  }

  if (VERBOSE && findings.length > 0) {
    console.log('');
    const sorted = [...findings].sort((a, b) => (b.age_days || 1e9) - (a.age_days || 1e9));
    for (const f of sorted.slice(0, 50)) {
      const age = f.age_days === null ? f.reason : `${f.age_days}d (>${f.window_days}d)`;
      console.log(`  [${f.tier}] ${age}  ${f.file}`);
    }
    if (sorted.length > 50) console.log(`  ... and ${sorted.length - 50} more`);
  }

  process.exit(0);
})();
