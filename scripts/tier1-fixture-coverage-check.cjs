#!/usr/bin/env node
/**
 * tier1-fixture-coverage-check.cjs
 *
 * Harness check (ADR-0029 Rule 16 enforcement).
 *
 * Verifies that every editorial-decision class with a Tier 1 predicate
 * has matching fixture coverage in data/calibration-fixture.jsonl. The
 * pipeline's register() call already enforces this at startup time, but
 * this check catches the case where a fixture gets deleted AFTER
 * registration succeeded — i.e. someone editing the fixture file manually
 * or a bad migration drops the protective fixtures, leaving auto-apply
 * authority without the corresponding semantic safety net.
 *
 * Findings:
 *   - tier1 class registered but calibration_coverage[] empty
 *   - tier1 class references a profile name not in the fixture file
 *
 * If this check ever fires, the system has authority Claude shouldn't
 * have. It's a "stop the world, fix immediately" finding — leverage 5,
 * blocking bucket.
 *
 * --json: machine-readable for vault-audit.
 */

'use strict';

const path = require('path');
const pipeline = require(path.join(__dirname, 'lib', 'editorial-decision-pipeline.cjs'));
require(path.join(__dirname, 'classes', 'index.cjs'));

const args = process.argv.slice(2);
const asJson = args.includes('--json');

const findings = [];
const fixtureProfiles = pipeline._loadCalibrationFixtureProfiles();
const classes = pipeline.listClasses();

for (const meta of classes) {
  if (!meta.has_tier1) continue;

  if (!Array.isArray(meta.calibration_coverage) || meta.calibration_coverage.length === 0) {
    findings.push({
      class: meta.name,
      kind: 'tier1-no-calibration-coverage',
      detail: 'class has tier1_predicate but calibration_coverage[] is empty',
    });
    continue;
  }

  const missing = meta.calibration_coverage.filter((p) => !fixtureProfiles.has(p));
  for (const p of missing) {
    findings.push({
      class: meta.name,
      kind: 'tier1-fixture-missing',
      detail: `coverage references "${p}" but no matching fixture in data/calibration-fixture.jsonl`,
    });
  }
}

if (asJson) {
  console.log(JSON.stringify({
    findings_count: findings.length,
    findings,
    classes_with_tier1: classes.filter((c) => c.has_tier1).length,
    fixture_profiles_total: fixtureProfiles.size,
  }));
  process.exit(0);
}

console.log(`tier1-fixture-coverage: ${findings.length} finding(s)`);
if (findings.length === 0) {
  console.log('✓ all Tier 1 classes have matching fixture coverage');
} else {
  for (const f of findings) console.log(`  ✗ ${f.class} — ${f.kind}: ${f.detail}`);
  process.exit(1);
}
