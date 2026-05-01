#!/usr/bin/env node
/**
 * cycle-divergence-check.cjs — harness check for the amended-filing
 * cycle-misattribution bug.
 *
 * What it detects:
 *   Cal-Access RCPT records where RCPT_DATE (filing/amendment date) and
 *   DATE_THRU (original transaction date) diverge by more than one cycle.
 *   Pre-fix librarian behavior used RCPT_DATE-only, producing edges
 *   tagged "cycle 2026" for transactions that actually happened in 2016
 *   or earlier. This check counts those.
 *
 * Why this check exists:
 *   Surfaced 2026-05-01 in CA Gov 2026 dossier work. A "Steyer to Becerra
 *   $2,700 in cycle 2026" bulk-derived edge turned out to be a 2016
 *   transaction filed via 2025 amendment. cycleAttribution() helper
 *   added to scripts/lib/cal-access-helpers.cjs to use DATE_THRU when
 *   it diverges. This check audits how many records would be affected
 *   by a re-ingest with the fix.
 *
 * Output: --json mode emits findings_count + sample.
 *
 * Usage:
 *   node scripts/cycle-divergence-check.cjs           # human-readable
 *   node scripts/cycle-divergence-check.cjs --json    # harness mode
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { streamTSV, tablePath, cycleAttribution, BULK_DIR } = require('./lib/cal-access-helpers.cjs');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const LIMIT_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(args[LIMIT_IDX + 1], 10) : 0;

(async function main() {
  if (!fs.existsSync(BULK_DIR)) {
    const out = { check: 'cycle-divergence', status: 'skipped', reason: 'bulk dir not present', findings_count: 0 };
    if (JSON_MODE) console.log(JSON.stringify(out));
    else console.log(`SKIPPED: ${out.reason}`);
    process.exit(0);
  }

  let scanned = 0;
  let divergent = 0;
  const samples = [];

  for await (const row of streamTSV(tablePath('RCPT_CD'), { limit: LIMIT || Infinity })) {
    scanned++;
    if (!row.RCPT_DATE || !row.DATE_THRU) continue;
    const attr = cycleAttribution(row.RCPT_DATE, row.DATE_THRU);
    if (attr.divergence_detected) {
      divergent++;
      if (samples.length < 10) {
        samples.push({
          filing_id: row.FILING_ID,
          tran_id: row.TRAN_ID,
          ctrib_naml: row.CTRIB_NAML,
          ctrib_namf: row.CTRIB_NAMF,
          rcpt_date: row.RCPT_DATE,
          date_thru: row.DATE_THRU,
          rcpt_cycle: attr.rcpt_iso ? attr.rcpt_iso.slice(0, 4) : null,
          thru_cycle: attr.thru_iso ? attr.thru_iso.slice(0, 4) : null,
          amount: row.AMOUNT,
        });
      }
    }
  }

  const result = {
    check: 'cycle-divergence',
    status: 'ok',
    description: 'Cal-Access RCPT records where RCPT_DATE diverges from DATE_THRU by >1 cycle (amended filings of historical transactions).',
    rcpt_rows_scanned: scanned,
    findings_count: divergent,
    pct_divergent: scanned > 0 ? +(100 * divergent / scanned).toFixed(3) : 0,
    samples,
    interpretation: divergent === 0
      ? 'No amended-filing cycle divergences in current bulk dump.'
      : `${divergent} amended-filing records where filing date diverges from transaction date by >1 cycle. Pre-fix librarian would have mis-attributed cycle on these. Re-ingest with cycleAttribution() helper to fix.`,
    fix: 'scripts/ingest-cal-access-bulk.cjs uses cycleAttribution() helper from scripts/lib/cal-access-helpers.cjs (added 2026-05-01). Re-run ingest to apply.',
    generated_at: new Date().toISOString(),
  };

  if (JSON_MODE) console.log(JSON.stringify(result));
  else {
    console.log(`Cycle divergence check: ${divergent}/${scanned} (${result.pct_divergent}%) RCPT records have RCPT_DATE/DATE_THRU divergence > 1 cycle`);
    console.log(`Sample (${samples.length}):`);
    samples.forEach(s => console.log(`  filing=${s.filing_id} ${s.ctrib_namf} ${s.ctrib_naml} | RCPT=${s.rcpt_date} DATE_THRU=${s.date_thru} | amount=${s.amount}`));
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
