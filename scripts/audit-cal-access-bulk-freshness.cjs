#!/usr/bin/env node
/**
 * audit-cal-access-bulk-freshness.cjs — first concrete use case for
 * ADR-0030.
 *
 * What it does:
 *   1. HEAD-requests the Cal-Access bulk export CDN URL
 *      (https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip)
 *   2. Reads our last ingest's timestamp from
 *      data/cal-access-bulk-summary.json
 *   3. Compares the CDN's last-modified to our local ingest run_at.
 *      If the CDN dump is newer, file a bug-queue entry suggesting
 *      a re-run.
 *
 * Why this audit:
 *   The Cal-Access dump refreshes daily. Our ingest is manual. Without
 *   this check, our derived edges silently drift from "current" reality
 *   the moment a fresh dump is published. The auto-blocks render
 *   "as of <our last run>" but a journalist citing a number is implicitly
 *   citing it "as of now" — the gap matters.
 *
 * Why not the per-filer Detail.aspx audit (the original first-use-case
 * idea):
 *   Tested 2026-04-30 — Cal-Access committee Detail.aspx pages are
 *   Imperva-protected. Bot-block fires on every fetch. Per-filer audit
 *   needs either (a) browser automation (out of scope for ADR-0030 §1)
 *   or (b) a different verification surface. Bulk-dump-freshness is the
 *   verification surface that actually works at the CDN tier.
 *
 * Usage:
 *   node scripts/audit-cal-access-bulk-freshness.cjs           # check + log
 *   node scripts/audit-cal-access-bulk-freshness.cjs --json    # machine-readable
 *   node scripts/audit-cal-access-bulk-freshness.cjs --no-bug  # check only, don't file bug
 *
 * Exit codes:
 *   0 = local dump is current (within tolerance)
 *   1 = local dump is stale (CDN has newer)
 *   2 = unable to verify (CDN unreachable, etc.)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { fetchForAudit, recordResult } = require('./lib/code-audit-fetcher.cjs');

const ROOT = path.join(__dirname, '..');
const SUMMARY_FILE = path.join(ROOT, 'data', 'cal-access-bulk-summary.json');
const BUG_QUEUE = path.join(ROOT, 'content', 'Admin Notes', 'bug-queue.md');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const NO_BUG = args.includes('--no-bug');

// Tolerance: consider local dump "current" if within this many hours of CDN.
// 36h default — daily dump cycle + 12h slop for ingest scheduling.
const STALENESS_THRESHOLD_HOURS = 36;

function out(msg) { if (!JSON_MODE) console.log(msg); }

async function main() {
  out('[audit-bulk-freshness] starting freshness check');

  // Read local ingest timestamp
  let localRunAt = null;
  if (fs.existsSync(SUMMARY_FILE)) {
    const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf-8'));
    localRunAt = summary.run_at;
  }
  if (!localRunAt) {
    out('  no local ingest summary found — recommend running ingest-cal-access-bulk.cjs');
    if (JSON_MODE) console.log(JSON.stringify({ status: 'no-local', exit: 2 }));
    process.exit(2);
  }
  out(`  local run_at: ${localRunAt}`);

  // HEAD CDN
  const cdnUrl = 'https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip';
  out(`  HEAD ${cdnUrl}`);
  const fetched = await fetchForAudit({
    url: cdnUrl,
    method: 'HEAD',
    purpose: 'verify whether Cal-Access bulk export CDN has a fresher dump than our last local ingest',
    script: 'audit-cal-access-bulk-freshness.cjs',
    expected: { local_run_at: localRunAt, threshold_hours: STALENESS_THRESHOLD_HOURS },
  });

  if (fetched.status !== 'ok') {
    out(`  fetch status: ${fetched.status}  detail: ${fetched.discrepancy_detail || '(none)'}`);
    if (JSON_MODE) console.log(JSON.stringify({ status: fetched.status, fetch_id: fetched.id, exit: 2 }));
    process.exit(2);
  }

  const cdnLastModified = fetched.headers['last-modified'];
  const cdnEtag = fetched.headers.etag;
  const cdnContentLength = fetched.headers['content-length'];
  out(`  CDN last-modified: ${cdnLastModified}`);
  out(`  CDN etag: ${cdnEtag}`);
  out(`  CDN content-length: ${cdnContentLength}`);

  if (!cdnLastModified) {
    out('  CDN response missing Last-Modified header — cannot determine freshness');
    recordResult({ id: fetched.id, result: 'inconclusive', discrepancyDetail: 'CDN response missing Last-Modified' });
    if (JSON_MODE) console.log(JSON.stringify({ status: 'inconclusive', fetch_id: fetched.id, exit: 2 }));
    process.exit(2);
  }

  // Compare timestamps
  const cdnDate = new Date(cdnLastModified);
  const localDate = new Date(localRunAt);
  const ageMs = cdnDate.getTime() - localDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  out(`  age delta (CDN minus local): ${ageHours.toFixed(1)}h`);

  const isStale = ageHours > STALENESS_THRESHOLD_HOURS;
  const result = isStale ? 'discrepancy' : 'verified';
  const detail = isStale
    ? `Local Cal-Access dump is ${ageHours.toFixed(1)}h older than CDN (threshold ${STALENESS_THRESHOLD_HOURS}h). Re-run scripts/ingest-cal-access-bulk.cjs against fresh dump.`
    : null;

  recordResult({
    id: fetched.id,
    result,
    discrepancyDetail: detail,
  });

  if (isStale) {
    out(`  ⚠ STALE: local dump ${ageHours.toFixed(1)}h older than CDN`);
    if (!NO_BUG) {
      _fileBug({
        cdnLastModified,
        localRunAt,
        ageHours,
        fetchId: fetched.id,
        cdnEtag,
        cdnContentLength,
      });
    }
    if (JSON_MODE) console.log(JSON.stringify({ status: 'stale', fetch_id: fetched.id, age_hours: ageHours, exit: 1 }));
    process.exit(1);
  }

  out('  ✓ local dump is current (within threshold)');
  if (JSON_MODE) console.log(JSON.stringify({ status: 'current', fetch_id: fetched.id, age_hours: ageHours, exit: 0 }));
  process.exit(0);
}

function _fileBug({ cdnLastModified, localRunAt, ageHours, fetchId, cdnEtag, cdnContentLength }) {
  const today = new Date().toISOString().slice(0, 10);
  const entry = `
### Cal-Access bulk dump is stale (${today})

**Surfaced by:** \`audit-cal-access-bulk-freshness.cjs\` per ADR-0030 audit fetch \`${fetchId}\`.

- **Local ingest:** ${localRunAt}
- **CDN last-modified:** ${cdnLastModified}
- **Age delta:** ${ageHours.toFixed(1)}h (threshold ${STALENESS_THRESHOLD_HOURS}h)
- **CDN ETag:** ${cdnEtag}
- **CDN size:** ${cdnContentLength} bytes

**Action:** download fresh dump, re-run \`scripts/ingest-cal-access-bulk.cjs\` and \`scripts/build-cal-access-panels.cjs --write\`.

**Provenance:** see \`data/code-audit-fetches.jsonl\` entry \`${fetchId}\`.
`;
  if (!fs.existsSync(BUG_QUEUE)) {
    out(`  bug queue not found at ${BUG_QUEUE}; skipping bug filing`);
    return;
  }
  // Append to the bug-queue.md (avoid duplicate spam — only file if no
  // existing today-dated cal-access-stale entry)
  const existing = fs.readFileSync(BUG_QUEUE, 'utf-8');
  if (existing.includes(`Cal-Access bulk dump is stale (${today})`)) {
    out('  bug already filed today; not duplicating');
    return;
  }
  fs.appendFileSync(BUG_QUEUE, entry, 'utf-8');
  out(`  bug filed: ${BUG_QUEUE}`);
}

main().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  if (JSON_MODE) console.log(JSON.stringify({ status: 'error', error: err.message, exit: 3 }));
  process.exit(3);
});
