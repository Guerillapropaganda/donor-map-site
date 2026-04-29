#!/usr/bin/env node
/**
 * calibration-drift-check.cjs — semantic regression detector
 *
 * The harness has 30 STRUCTURAL checks (parses cleanly, no nulls, no
 * orphans). None of them catch SEMANTIC drift: "Pfizer's top recipient
 * is now Mark Kelly $22K instead of Clyburn $91K." Every individual edge
 * is well-formed; only the answer is implausible.
 *
 * This check loads a hand-curated fixture (`data/calibration-fixture.jsonl`)
 * of known-good top-N facts ("Pfizer top-15 must include Clyburn, McCarthy,
 * Hoyer, Pallone, Grassley") and verifies the current
 * `data/relationships-per-profile.json` artifact still satisfies them.
 *
 * Each fixture line lists `must_include` names that MUST appear in the
 * actual top-N when entries are sorted by amount desc. If any are missing,
 * the fixture fails. One failed fixture = one finding.
 *
 * Why this catches the 2026-04-28 cascade: when the artifact went stale
 * and data-panels regenerated from it, Pfizer's $91K Clyburn dropped out
 * of the visible top-N. This check would have fired within 15 min of the
 * dispatcher cycle. Future regressions of the same shape (role drift,
 * propagation gap, classifier bug, librarian rewiring) all surface the
 * same way: known-good top-N entries fall off. One check, many bug classes.
 *
 * Add a fixture: append a JSONL line with profile, bucket, top_n,
 * must_include[], snapshot_date, note. Re-snapshot after deliberate
 * editorial changes that legitimately drop a fixture entry.
 *
 * Usage:
 *   node scripts/calibration-drift-check.cjs           # human-readable
 *   node scripts/calibration-drift-check.cjs --json    # for vault-audit
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FIXTURE_PATH = path.join(ROOT, 'data/calibration-fixture.jsonl');
const ARTIFACT_PATH = path.join(ROOT, 'data/relationships-per-profile.json');

const args = process.argv.slice(2);
const asJson = args.includes('--json');

function loadFixtures() {
  if (!fs.existsSync(FIXTURE_PATH)) return [];
  return fs.readFileSync(FIXTURE_PATH, 'utf-8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => JSON.parse(l));
}

function loadArtifact() {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    return { error: 'artifact missing — run scripts/build-relationships-per-profile.cjs' };
  }
  return JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf-8'));
}

function topNNames(entries, n) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  // Strings: pass through (e.g. politicians-funded is a flat name list).
  if (typeof entries[0] === 'string') return entries.slice(0, n);
  // Objects: aggregate by name (multi-cycle entries sum) then sort by total.
  // This matches build-profile-data-panels which surfaces lifetime totals.
  const totals = new Map();
  for (const e of entries) {
    if (!e || !e.name) continue;
    totals.set(e.name, (totals.get(e.name) || 0) + (e.amount || 0));
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
}

// 2026-04-29 extension: readiness fixtures assert content-readiness state
// of a profile's markdown frontmatter (used by mechanical-readiness-promotion
// class to satisfy Rule 16). Fixture shape:
//   { "profile": "Pfizer Inc.", "bucket": "readiness", "expected": "data-complete" }
function evaluateReadinessFixture(fixture) {
  // Find the profile by frontmatter `title:` matching fixture.profile.
  // Walk content/ once; cache hits across calls.
  if (!evaluateReadinessFixture._titleIndex) {
    const idx = new Map();
    const stack = [path.join(ROOT, 'content')];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
      catch { continue; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.name.endsWith('.md')) {
          try {
            const text = fs.readFileSync(full, 'utf-8');
            const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            if (!m) continue;
            const fm = m[1];
            const titleMatch = fm.match(/^title:\s*"?(.*?)"?\s*$/m);
            const readinessMatch = fm.match(/^content-readiness:\s*"?(.*?)"?\s*$/m);
            const title = titleMatch ? titleMatch[1].trim() : null;
            const readiness = readinessMatch ? readinessMatch[1].trim() : null;
            if (title) idx.set(title, { path: full, readiness });
          } catch { /* skip */ }
        }
      }
    }
    evaluateReadinessFixture._titleIndex = idx;
  }
  const idx = evaluateReadinessFixture._titleIndex;
  const found = idx.get(fixture.profile);
  if (!found) {
    return {
      profile: fixture.profile,
      bucket: 'readiness',
      ok: false,
      reason: 'profile not found in vault by title',
      expected: fixture.expected,
      actual: null,
    };
  }
  if (found.readiness !== fixture.expected) {
    return {
      profile: fixture.profile,
      bucket: 'readiness',
      ok: false,
      reason: 'content-readiness drifted',
      expected: fixture.expected,
      actual: found.readiness,
      missing: [`expected content-readiness=${fixture.expected}, got ${found.readiness || '(unset)'}`],
    };
  }
  return {
    profile: fixture.profile,
    bucket: 'readiness',
    ok: true,
    expected: fixture.expected,
    actual: found.readiness,
    note: fixture.note,
  };
}

// 2026-04-29 extension: class-tag fixtures assert a specific entity's
// class-tag field (capital_type, class_position, etc.) in
// data/entities.jsonl. Used by class-tag-path-b-application class to
// satisfy Rule 16 — Path B's Tier 1 predicate auto-applies capital_type
// from folder-path; if Pfizer ever drifts off pharma-capital, drift
// fires within 15 min, calibration-auto-revert moves the bad decision
// back to candidate, and a bug lands on /bugs.
//
// Fixture shape:
//   { "profile": "Pfizer Inc.", "bucket": "class-tag",
//     "field": "capital_type", "expected": "pharma-capital" }
function evaluateClassTagFixture(fixture) {
  if (!evaluateClassTagFixture._entityIndex) {
    const idx = new Map();
    const entitiesPath = path.join(ROOT, 'data', 'entities.jsonl');
    if (fs.existsSync(entitiesPath)) {
      for (const line of fs.readFileSync(entitiesPath, 'utf-8').split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line);
          if (e.name) idx.set(e.name, e);
        } catch { /* skip malformed */ }
      }
    }
    evaluateClassTagFixture._entityIndex = idx;
  }
  const idx = evaluateClassTagFixture._entityIndex;
  const ent = idx.get(fixture.profile);
  if (!ent) {
    return {
      profile: fixture.profile,
      bucket: 'class-tag',
      ok: false,
      reason: 'entity not found in entities.jsonl by name',
      expected: fixture.expected,
      actual: null,
    };
  }
  const field = fixture.field || 'capital_type';
  const actual = ent[field];
  if (actual !== fixture.expected) {
    return {
      profile: fixture.profile,
      bucket: 'class-tag',
      field,
      ok: false,
      reason: `class-tag drifted on field=${field}`,
      expected: fixture.expected,
      actual,
      missing: [`expected ${field}=${fixture.expected}, got ${actual === null ? '(null)' : actual === undefined ? '(unset)' : actual}`],
    };
  }
  return {
    profile: fixture.profile,
    bucket: 'class-tag',
    field,
    ok: true,
    expected: fixture.expected,
    actual,
    note: fixture.note,
  };
}

function evaluateFixture(fixture, artifact) {
  if (fixture.bucket === 'readiness') return evaluateReadinessFixture(fixture);
  if (fixture.bucket === 'class-tag') return evaluateClassTagFixture(fixture);
  const bucket = artifact[fixture.profile]?.[fixture.bucket];
  if (!bucket) {
    return {
      profile: fixture.profile,
      bucket: fixture.bucket,
      ok: false,
      reason: `profile or bucket missing from artifact`,
      missing: fixture.must_include,
    };
  }
  const actualTop = topNNames(bucket, fixture.top_n);
  const actualSet = new Set(actualTop.map((n) => (n || '').toLowerCase()));
  const missing = fixture.must_include.filter(
    (name) => !actualSet.has(name.toLowerCase())
  );
  return {
    profile: fixture.profile,
    bucket: fixture.bucket,
    ok: missing.length === 0,
    missing,
    actual_top_n: actualTop,
    note: fixture.note,
  };
}

const fixtures = loadFixtures();
const artifact = loadArtifact();

if (artifact.error) {
  if (asJson) {
    console.log(JSON.stringify({
      findings_count: 1,
      findings: [{ kind: 'artifact-missing', detail: artifact.error }],
    }));
  } else {
    console.log(`✗ ${artifact.error}`);
  }
  process.exit(0);
}

const results = fixtures.map((f) => evaluateFixture(f, artifact));
const failed = results.filter((r) => !r.ok);

if (asJson) {
  const findings = failed.map((r) => ({
    kind: 'calibration-drift',
    profile: r.profile,
    bucket: r.bucket,
    missing: r.missing,
    actual_top_n: r.actual_top_n,
    reason: r.reason,
    note: r.note,
  }));
  console.log(JSON.stringify({
    findings_count: findings.length,
    findings,
    fixtures_total: fixtures.length,
    fixtures_passed: results.length - failed.length,
  }));
  process.exit(0);
}

console.log(`Calibration drift check — ${fixtures.length} fixture(s)`);
console.log(`  passed: ${results.length - failed.length}`);
console.log(`  failed: ${failed.length}`);
if (failed.length > 0) {
  console.log('');
  for (const r of failed) {
    console.log(`✗ ${r.profile} / ${r.bucket}`);
    if (r.reason) console.log(`    reason: ${r.reason}`);
    if (r.missing && r.missing.length > 0) console.log(`    missing from top-${r.actual_top_n?.length}: ${r.missing.join(', ')}`);
    if (r.note) console.log(`    note: ${r.note}`);
  }
  process.exit(1);
}
console.log('✓ all fixtures pass');
