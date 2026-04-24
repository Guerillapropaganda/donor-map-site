#!/usr/bin/env node
/**
 * url-domain-policy.cjs
 *
 * Flags URLs to known-dead or demoted domains in publication-tier
 * profiles (content-readiness: data-complete or verified). Policy is
 * codified in CLAUDE.md "URL + source citation rules" — this check
 * enforces it mechanically.
 *
 * Rules (as of 2026-04-24):
 *   followthemoney.org — dead (merged into OpenSecrets)
 *   lda.senate.gov     — broken until June 2026 (migration to lda.gov)
 *   opensecrets.org    — demoted from Tier 1 → Tier 2
 *
 * A URL wrapped in web.archive.org/web/... is treated as archived and
 * not flagged. Live references are findings.
 *
 * URL verification and replacement is Editor-only (CLAUDE.md Rule 13).
 * This script surfaces — it does not fix.
 *
 * Complements (does not overlap with) scripts/url-staleness.cjs, which
 * tracks per-URL re-triage freshness, not domain policy.
 *
 * Usage:
 *   node scripts/url-domain-policy.cjs               # summary
 *   node scripts/url-domain-policy.cjs --json        # machine-readable
 *   node scripts/url-domain-policy.cjs --verbose     # per-profile detail
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

const JSON_OUT = process.argv.includes('--json');
const VERBOSE = process.argv.includes('--verbose');

const RULES = [
  {
    id: 'followthemoney-dead',
    domain: 'followthemoney.org',
    severity: 'dead',
    why: 'FollowTheMoney merged into OpenSecrets. All URLs broken.',
  },
  {
    id: 'lda-senate-pre-migration',
    domain: 'lda.senate.gov',
    severity: 'broken-until',
    why: 'Migrating to lda.gov. Links broken until June 2026 sunset.',
  },
  {
    id: 'opensecrets-demoted',
    domain: 'opensecrets.org',
    severity: 'demoted',
    why: 'Demoted Tier 1 → Tier 2 per CLAUDE.md URL rules. Prefer FEC or state DBs.',
  },
];

const URL_RE = /https?:\/\/[^\s)'"<>]+/gi;

function isArchived(url) {
  return /web\.archive\.org\/web\//i.test(url);
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
}

function scanText(text) {
  const hits = [];
  URL_RE.lastIndex = 0;
  const urls = text.match(URL_RE) || [];
  for (const url of urls) {
    if (isArchived(url)) continue;
    for (const rule of RULES) {
      if (url.toLowerCase().includes(rule.domain)) {
        hits.push({ rule: rule.id, severity: rule.severity, url });
        break;
      }
    }
  }
  return hits;
}

(function main() {
  const files = [];
  walk(CONTENT, files);

  let scanned = 0;
  const perProfile = [];
  const bySeverity = { dead: 0, 'broken-until': 0, demoted: 0 };
  const byRule = {};

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

    const hits = scanText(text);
    if (hits.length === 0) continue;

    perProfile.push({
      file: path.relative(ROOT, f).replace(/\\/g, '/'),
      tier,
      hits,
    });
    for (const h of hits) {
      bySeverity[h.severity] = (bySeverity[h.severity] || 0) + 1;
      byRule[h.rule] = (byRule[h.rule] || 0) + 1;
    }
  }

  const totalHits = perProfile.reduce((s, p) => s + p.hits.length, 0);

  const artifact = {
    scanned,
    profiles_with_hits: perProfile.length,
    total_findings: totalHits,
    by_severity: bySeverity,
    by_rule: byRule,
    findings: perProfile,
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(artifact, null, 2));
    process.stdout.write('\n');
    process.exit(0);
  }

  console.log(`url-domain-policy: scanned ${scanned} publication-tier profile(s)`);
  console.log(`  ${perProfile.length} with stale URLs, ${totalHits} URL finding(s) total`);
  console.log('');
  console.log('  By severity:');
  for (const [s, n] of Object.entries(bySeverity)) console.log(`    ${s}: ${n}`);
  console.log('');
  console.log('  By rule:');
  for (const [r, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${n}\t${r}`);
  }

  if (VERBOSE && perProfile.length > 0) {
    console.log('');
    for (const p of perProfile.slice(0, 30)) {
      console.log(`  ${p.file}`);
      for (const h of p.hits.slice(0, 5)) {
        console.log(`    [${h.severity}] ${h.url.slice(0, 120)}`);
      }
      if (p.hits.length > 5) console.log(`    ... and ${p.hits.length - 5} more URL(s)`);
    }
    if (perProfile.length > 30) console.log(`  ... and ${perProfile.length - 30} more profile(s)`);
  }

  process.exit(0);
})();
