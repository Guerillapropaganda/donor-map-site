#!/usr/bin/env node
/**
 * code-audit-fetch-discrepancy-check.cjs — harness check for ADR-0030 §9.
 *
 * Reads data/code-audit-fetches.jsonl. Surfaces any entry where:
 *   - status = blocked-by-cf | unreachable | session-cap-reached | parse-failed
 *     and the most recent result-update for that fetch is still 'inconclusive'
 *   - result = discrepancy and the discrepancy isn't yet linked to a
 *     bug-queue entry or an editorial-decision-pipeline record
 *
 * Steady state expectation: 0 unaddressed.
 *
 * Output:
 *   --json: { findings_count, findings: [...] }
 *   default: human-readable summary
 *
 * Wiring: scripts/vault-audit.cjs (every 15min via dispatcher).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FETCH_LOG = path.join(ROOT, 'data', 'code-audit-fetches.jsonl');
const BUG_QUEUE = path.join(ROOT, 'content', 'Admin Notes', 'bug-queue.md');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');

function loadFetchLog() {
  if (!fs.existsSync(FETCH_LOG)) return [];
  const out = [];
  for (const line of fs.readFileSync(FETCH_LOG, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return out;
}

function bugQueueContent() {
  if (!fs.existsSync(BUG_QUEUE)) return '';
  return fs.readFileSync(BUG_QUEUE, 'utf-8');
}

const log = loadFetchLog();

// Index result-updates by original_id; keep latest
const resultByFetch = new Map();
for (const rec of log) {
  if (rec.kind === 'result-update' && rec.original_id) {
    resultByFetch.set(rec.original_id, rec);
  }
}

const fetches = log.filter((r) => r.id && !r.kind);

const bugContent = bugQueueContent();

const findings = [];

for (const f of fetches) {
  const update = resultByFetch.get(f.id);
  const finalResult = update ? update.result : f.result;
  const linkedToBug = bugContent.includes(f.id);

  // Stuck-inconclusive: fetch attempted, never marked verified or
  // discrepancy. Suggests caller forgot to call recordResult().
  if (finalResult === 'inconclusive' && f.status !== 'ok') {
    findings.push({
      kind: 'inconclusive-stuck',
      fetch_id: f.id,
      url: f.url,
      status: f.status,
      timestamp: f.timestamp,
      detail: `Fetch attempt with status=${f.status}; never marked verified/discrepancy. Caller may have forgotten to call recordResult().`,
    });
    continue;
  }

  // Discrepancy not linked to bug
  if (finalResult === 'discrepancy' && !linkedToBug) {
    findings.push({
      kind: 'discrepancy-unlinked',
      fetch_id: f.id,
      url: f.url,
      timestamp: f.timestamp,
      detail: update ? update.discrepancy_detail : f.discrepancy_detail,
    });
  }
}

if (JSON_MODE) {
  console.log(JSON.stringify({
    findings_count: findings.length,
    findings,
    log_size: fetches.length,
  }, null, 2));
} else {
  console.log(`code-audit-fetch-discrepancy-check: ${findings.length} unaddressed`);
  console.log(`  total fetches in log: ${fetches.length}`);
  for (const f of findings.slice(0, 10)) {
    console.log(`  [${f.kind}] ${f.fetch_id}  ${f.url}`);
    console.log(`    ${f.detail}`);
  }
  if (findings.length > 10) console.log(`  ... and ${findings.length - 10} more`);
}

process.exit(0);
