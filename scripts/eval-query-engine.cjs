#!/usr/bin/env node
/**
 * eval-query-engine.cjs — Golden-query regression runner
 *
 * Reads data/evals/queries.jsonl, executes each query via
 * scripts/lib/query-engine.cjs, checks expectations, reports results.
 *
 * Complements scripts/query-engine-contract-tests.cjs (which locks in
 * the API shape). This harness tests ACCURACY — do queries return
 * plausibly-correct data for canonical questions? The first version
 * ADR-0016 was needed to exist because the query engine was returning
 * wrong labels on perfectly-shaped results.
 *
 * Usage:
 *   node scripts/eval-query-engine.cjs                  # run all
 *   node scripts/eval-query-engine.cjs --id foo         # single
 *   node scripts/eval-query-engine.cjs --grep donors    # pattern
 *   node scripts/eval-query-engine.cjs --verbose        # show actual vs expected
 *   node scripts/eval-query-engine.cjs --json           # machine-readable output
 *
 * Exit: 0 all passed, 1 at least one failed, 2 harness error.
 */

const fs = require('fs');
const path = require('path');
const { createQueryEngine } = require('./lib/query-engine.cjs');

const ROOT = path.join(__dirname, '..');
const QUERIES_PATH = path.join(ROOT, 'data', 'evals', 'queries.jsonl');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const JSON_OUT = args.includes('--json');
const idIdx = args.indexOf('--id');
const TARGET_ID = idIdx >= 0 ? args[idIdx + 1] : null;
const grepIdx = args.indexOf('--grep');
const GREP_PATTERN = grepIdx >= 0 ? args[grepIdx + 1] : null;

function loadQueries() {
  if (!fs.existsSync(QUERIES_PATH)) {
    console.error(`ERROR: ${QUERIES_PATH} not found`);
    process.exit(2);
  }
  const lines = fs.readFileSync(QUERIES_PATH, 'utf-8').split(/\r?\n/).filter(Boolean);
  const queries = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      queries.push(JSON.parse(lines[i]));
    } catch (e) {
      console.error(`ERROR: queries.jsonl line ${i + 1} is not valid JSON: ${e.message}`);
      process.exit(2);
    }
  }
  return queries;
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function fieldContains(rowValue, expectedValue) {
  return norm(rowValue).includes(norm(expectedValue));
}

function runCheck(q, result) {
  const failures = [];
  const expect = q.expect || {};

  if (expect.shouldThrow) {
    // handled by caller around the try/catch; if we get here, the query
    // did NOT throw when it was expected to.
    failures.push(`expected to throw but query returned {total:${result.total}}`);
    return failures;
  }

  if (typeof expect.minTotal === 'number' && result.total < expect.minTotal) {
    failures.push(`total=${result.total} < minTotal=${expect.minTotal}`);
  }
  if (typeof expect.maxTotal === 'number' && result.total > expect.maxTotal) {
    failures.push(`total=${result.total} > maxTotal=${expect.maxTotal}`);
  }

  const rows = result.rows || [];

  // rowFieldExists: every row has non-null values for these fields
  if (Array.isArray(expect.rowFieldExists)) {
    for (const field of expect.rowFieldExists) {
      const missing = rows.filter((r) => r[field] === null || r[field] === undefined).length;
      if (missing > 0 && rows.length > 0) {
        failures.push(`${missing}/${rows.length} rows missing field "${field}"`);
      }
    }
  }

  // rowFieldContains: at least one row has field matching expected substring
  if (expect.rowFieldContains && typeof expect.rowFieldContains === 'object') {
    for (const [field, expected] of Object.entries(expect.rowFieldContains)) {
      const matches = rows.some((r) => fieldContains(r[field], expected));
      if (!matches) {
        failures.push(`no row has field "${field}" containing "${expected}"`);
      }
    }
  }

  // rowFieldMinValue: at least one row has field >= expected
  if (expect.rowFieldMinValue && typeof expect.rowFieldMinValue === 'object') {
    for (const [field, expected] of Object.entries(expect.rowFieldMinValue)) {
      const matches = rows.some((r) => Number(r[field]) >= Number(expected));
      if (!matches) {
        failures.push(`no row has field "${field}" >= ${expected}`);
      }
    }
  }

  return failures;
}

function main() {
  const started = Date.now();
  const allQueries = loadQueries();
  let queries = allQueries;
  if (TARGET_ID) queries = queries.filter((q) => q.id === TARGET_ID);
  if (GREP_PATTERN) {
    const re = new RegExp(GREP_PATTERN, 'i');
    queries = queries.filter((q) => re.test(q.id) || re.test(q.description || ''));
  }

  if (queries.length === 0) {
    console.error(`No queries matched filter. Total loaded: ${allQueries.length}`);
    process.exit(2);
  }

  if (!JSON_OUT) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Query Engine Eval Harness');
    console.log(`  ${queries.length} of ${allQueries.length} queries`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  const engine = createQueryEngine();
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const q of queries) {
    const started = Date.now();
    let result = null;
    let thrown = null;
    try {
      result = engine.query(q.spec || {});
    } catch (e) {
      thrown = e;
    }
    const ms = Date.now() - started;

    let failures = [];
    const expect = q.expect || {};

    if (expect.shouldThrow) {
      if (!thrown) {
        failures.push('expected to throw but query succeeded');
      }
    } else if (thrown) {
      failures.push(`unexpected throw: ${thrown.message}`);
    } else {
      failures = runCheck(q, result);
    }

    const pass = failures.length === 0;
    if (pass) passed++;
    else failed++;

    const entry = {
      id: q.id,
      pass,
      ms,
      total: result?.total ?? null,
      failures,
    };
    results.push(entry);

    if (!JSON_OUT) {
      const mark = pass ? '✓' : '✗';
      const color = pass ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      const totalStr = result ? `total=${result.total}` : thrown ? '(threw)' : '';
      console.log(`  ${color}${mark}${reset} ${q.id.padEnd(34)} ${String(ms).padStart(5)}ms  ${totalStr}`);
      if (!pass) {
        for (const f of failures) console.log(`      ↳ ${f}`);
      }
      if (VERBOSE && pass && result) {
        console.log(`      returned=${result.returned} rows, subject=${result.subject}`);
      }
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ passed, failed, elapsedMs: Date.now() - started, results }, null, 2));
  } else {
    console.log('\n═══ SUMMARY ═══════════════════════════════════════════════\n');
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Elapsed: ${Date.now() - started}ms\n`);
    if (failed > 0) {
      console.log('  Failed queries:');
      for (const r of results.filter((r) => !r.pass)) {
        console.log(`    - ${r.id}: ${r.failures.join('; ')}`);
      }
      console.log('');
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
