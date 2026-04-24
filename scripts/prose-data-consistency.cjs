#!/usr/bin/env node
/**
 * prose-data-consistency.cjs
 *
 * Detects internal numeric contradictions in publication-tier profiles
 * (content-readiness: data-complete or verified). Narrow pattern matcher
 * per the ADR-0021 Phase 3 design call — ships with a small allowlist of
 * high-signal patterns, extend as drift cases surface.
 *
 * Motivating case (2026-04-23):
 *   Trump profile infobox row: "2024 mega-donors (>$100M each) | 6 individuals"
 *   Trump profile prose:       "44% came from just 10 megadonors"
 *   → two different N values for the same concept in the same profile.
 *
 * What this check does NOT do:
 *   - validate prose against external facts (that's David's job)
 *   - validate prose against frontmatter list lengths (too noisy — lists
 *     and named examples don't always 1:1)
 *   - catch non-numeric contradictions (different check)
 *
 * Strategy: for each pattern, collect every integer it matches in the
 * profile body. If there's more than one distinct value, that's a finding.
 *
 * Usage:
 *   node scripts/prose-data-consistency.cjs              # scan, print summary
 *   node scripts/prose-data-consistency.cjs --json       # machine-readable
 *   node scripts/prose-data-consistency.cjs --verbose    # print each finding
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

const JSON_OUT = process.argv.includes('--json');
const VERBOSE = process.argv.includes('--verbose');

// ─── Patterns ─────────────────────────────────────────────────────────
//
// Each pattern captures a single integer in a named group `n`. The label
// is used to group matches within a profile — matches that share a label
// are expected to agree on N. Patterns are intentionally tight to keep
// false-positive rate near zero; add cases as drift surfaces.

const PATTERNS = [
  {
    label: 'mega-donors',
    // "6 individuals" in an infobox row that also mentions mega-donor
    re: /\b(?<n>\d{1,3})\s+(?:individuals?|megadonors?|mega[- ]donors?)\b/gi,
    // context gate: line must mention mega-donor to count
    contextRe: /mega[- ]?donor/i,
  },
  {
    label: 'top-donors',
    re: /\btop\s+(?<n>\d{1,3})\s+(?:donors?|contributors?|funders?)\b/gi,
    contextRe: null,
  },
];

// ─── Collect profiles ─────────────────────────────────────────────────

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
}

function parseProfile(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  let fm;
  try { fm = yaml.load(m[1]); } catch { return null; }
  if (!fm || typeof fm !== 'object') return null;
  return { file, frontmatter: fm, body: text.slice(m[0].length) };
}

function isPublicationTier(fm) {
  const r = fm['content-readiness'];
  return r === 'verified' || r === 'data-complete';
}

// ─── Scan one profile ─────────────────────────────────────────────────

function scanProfile(profile) {
  const findings = [];
  const lines = profile.body.split('\n');

  for (const pattern of PATTERNS) {
    // (value, line) tuples
    const hits = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (pattern.contextRe && !pattern.contextRe.test(line)) continue;
      pattern.re.lastIndex = 0;
      let m;
      while ((m = pattern.re.exec(line)) !== null) {
        const n = parseInt(m.groups.n, 10);
        if (!Number.isFinite(n)) continue;
        hits.push({ value: n, line_no: i + 1, text: line.trim().slice(0, 160) });
      }
    }

    const distinct = [...new Set(hits.map(h => h.value))];
    if (distinct.length > 1) {
      findings.push({
        pattern: pattern.label,
        values: distinct,
        occurrences: hits,
      });
    }
  }

  return findings;
}

// ─── Main ─────────────────────────────────────────────────────────────

(function main() {
  const allFiles = [];
  walk(CONTENT, allFiles);

  let scanned = 0;
  const profileFindings = [];

  for (const f of allFiles) {
    const p = parseProfile(f);
    if (!p) continue;
    if (!isPublicationTier(p.frontmatter)) continue;
    scanned++;
    const findings = scanProfile(p);
    if (findings.length > 0) {
      profileFindings.push({
        file: path.relative(ROOT, f).replace(/\\/g, '/'),
        findings,
      });
    }
  }

  const totalFindings = profileFindings.reduce(
    (s, p) => s + p.findings.length, 0
  );

  const artifact = {
    scanned,
    profiles_with_findings: profileFindings.length,
    total_findings: totalFindings,
    findings: profileFindings,
  };

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(artifact, null, 2));
    process.stdout.write('\n');
    process.exit(0);
  }

  console.log(`prose-data-consistency: scanned ${scanned} publication-tier profile(s)`);
  console.log(`  ${profileFindings.length} with contradictions, ${totalFindings} finding(s) total`);

  if (VERBOSE || profileFindings.length > 0) {
    console.log('');
    for (const p of profileFindings) {
      console.log(`  ${p.file}`);
      for (const f of p.findings) {
        console.log(`    [${f.pattern}] distinct values: ${f.values.join(', ')}`);
        if (VERBOSE) {
          for (const o of f.occurrences) {
            console.log(`      L${o.line_no}: ${o.text}`);
          }
        }
      }
    }
  }

  process.exit(0);
})();
