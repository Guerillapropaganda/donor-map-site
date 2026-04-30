#!/usr/bin/env node
/**
 * ingest-cal-access-bulk.cjs — PLACEHOLDER, not yet implemented.
 *
 * Spec:
 *   Read California Cal-Access bulk dump TSVs from data/bulk/california/
 *   and emit edges to data/derived/cal-access-receipts.jsonl (one edge
 *   per receipt: donor → committee → candidate, with amount + cycle +
 *   filing date). Mirrors the FEC bulk ingester pattern in
 *   scripts/ingest-fec-pas2-bulk.cjs.
 *
 * Why a placeholder lands today:
 *   The ops /races/ca-gov-2026 page references this script's eventual
 *   output. Having the file present (even as a no-op) makes the
 *   pipeline shape visible in the script catalog and prevents the
 *   /races page from looking like it's missing infrastructure.
 *
 * Implementation plan:
 *   See content/Admin Notes/cal-access-pipeline-plan.md for the full
 *   build spec — table mappings, edge schema, alias handling for the
 *   committee-to-candidate join, edge-id collision strategy with the
 *   FEC bulk output.
 *
 * Effort estimate: ~1 full session (~$15-25 Opus). Owns the same
 * complexity surface as the FEC bulk ingester. Most of the lift is
 * the filer-to-candidate join (Cal-Access doesn't have a clean
 * "controlled committee" link the way FEC does — the committee type
 * code + the FILER_FILINGS_CD walk are how you get there).
 */

'use strict';

const path = require('path');
const fs = require('fs');

const BULK_DIR = path.resolve(__dirname, '..', 'data', 'bulk', 'california');

if (!fs.existsSync(BULK_DIR)) {
  console.error('[ingest-cal-access-bulk] not implemented yet — see content/Admin Notes/cal-access-pipeline-plan.md');
  console.error(`[ingest-cal-access-bulk] expected bulk dir: ${BULK_DIR} (does not exist)`);
  process.exit(2);
}

const files = fs.readdirSync(BULK_DIR).filter((f) => /\.(tsv|dbf)$/i.test(f));
console.error('[ingest-cal-access-bulk] not implemented yet — see content/Admin Notes/cal-access-pipeline-plan.md');
console.error(`[ingest-cal-access-bulk] discovered ${files.length} bulk file(s) in ${BULK_DIR}:`);
for (const f of files) console.error('  ' + f);
process.exit(2);
