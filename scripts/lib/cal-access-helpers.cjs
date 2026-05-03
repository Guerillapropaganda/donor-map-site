/**
 * cal-access-helpers.cjs — shared utilities for the Cal-Access bulk ingester.
 *
 * Cal-Access bulk dump = a directory of TSV files exported from the CA
 * SoS campaign-finance database. Tables we care about:
 *   - RCPT_CD.TSV          — receipts (the big one, ~19M rows / 3.6GB)
 *   - EXPN_CD.TSV          — expenditures (Phase 3 / deferred)
 *   - FILERNAME_CD.TSV     — committee/filer name registry (~1.3M rows)
 *   - FILER_FILINGS_CD.TSV — filing → filer join table (~2.8M rows)
 *   - FILER_TO_FILER_TYPE_CD.TSV — committee type taxonomy (~700k rows)
 *
 * TSV format: tab-separated, no quoting, no escaping. Empty fields are
 * just consecutive tabs. First line is the column header.
 *
 * Default bulk dir: C:\donor-map-data\bulk\CalAccess\DATA. Override with
 * env var CAL_ACCESS_BULK_DIR.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BULK_DIR = process.env.CAL_ACCESS_BULK_DIR
  || 'C:\\donor-map-data\\bulk\\CalAccess\\DATA';

function tablePath(name) {
  return path.join(BULK_DIR, `${name}.TSV`);
}

function assertBulkDir() {
  if (!fs.existsSync(BULK_DIR)) {
    throw new Error(`Cal-Access bulk dir not found: ${BULK_DIR}\nSet CAL_ACCESS_BULK_DIR env var to the unzipped DATA directory.`);
  }
}

/**
 * Stream a TSV file row by row. Yields objects keyed by column header.
 * Use for tables we can't load fully into memory (RCPT_CD).
 */
async function* streamTSV(filePath, opts = {}) {
  const limit = opts.limit || Infinity;
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header = null;
  let count = 0;
  for await (const line of rl) {
    if (!header) {
      header = line.split('\t');
      continue;
    }
    if (count >= limit) break;
    const parts = line.split('\t');
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = parts[i] || '';
    yield row;
    count++;
  }
  rl.close();
}

/**
 * Load a TSV fully into memory as an array. Only safe for the smaller
 * join tables (FILERNAME_CD, FILER_FILINGS_CD, FILER_TO_FILER_TYPE_CD).
 */
async function loadTSV(filePath, opts = {}) {
  const out = [];
  for await (const row of streamTSV(filePath, opts)) out.push(row);
  return out;
}

/**
 * Build the FILING_ID → FILER_ID join map. Used to resolve the recipient
 * of a receipt — RCPT_CD rows carry FILING_ID; the committee that filed
 * it lives one hop away in FILER_FILINGS_CD.
 *
 * Amendment dedup: when a filer amends a Form 460, Cal-Access creates a
 * NEW FILING_ID (with incremented FILING_SEQUENCE) and re-submits every
 * receipt under that new filing. The original FILING_ID and its receipts
 * remain in the export. Without dedup, every amended transaction is
 * counted twice (or N times). The fix: per (FILER_ID, PERIOD_ID, FORM_ID),
 * keep only the FILING_ID with the highest FILING_SEQUENCE. Earlier
 * amendments' FILING_IDs get dropped from the map, so any RCPT_CD lookup
 * for a superseded filing misses and is skipped as unmatched.
 *
 * Returns Map<string, string>. Memory budget: ~2.8M entries = ~250-400MB.
 */
async function buildFilingToFiler() {
  // First pass: bucket filings by (filer, period, form) keeping max sequence.
  const activeByBucket = new Map(); // key → { filing_id, sequence }
  let n = 0;
  for await (const row of streamTSV(tablePath('FILER_FILINGS_CD'))) {
    const fid = row.FILING_ID;
    const filer = row.FILER_ID;
    if (!fid || !filer) { n++; continue; }
    const period = row.PERIOD_ID || '';
    const form = row.FORM_ID || '';
    const seq = parseInt(row.FILING_SEQUENCE || '0', 10) || 0;
    const bucketKey = `${filer}|${period}|${form}`;
    const cur = activeByBucket.get(bucketKey);
    if (!cur || seq > cur.sequence) {
      activeByBucket.set(bucketKey, { filing_id: fid, sequence: seq, filer });
    }
    n++;
  }

  // Second pass: emit only the winning FILING_IDs.
  const map = new Map();
  let supersededCount = 0;
  for (const { filing_id, filer } of activeByBucket.values()) {
    map.set(filing_id, filer);
  }
  // n - map.size = total filings rows minus distinct (filer,period,form)
  // buckets, which equals the number of superseded amendment rows dropped.
  supersededCount = n - map.size;
  return { map, rowsScanned: n, supersededCount };
}

/**
 * Build the FILER_ID → committee name map from FILERNAME_CD. Returns
 * Map<filerId, { name, type, status, city, st }>. The same filer can
 * appear under multiple xref aliases — we keep the first non-empty NAML
 * we see for each FILER_ID.
 */
async function buildFilerNames() {
  const map = new Map();
  for await (const row of streamTSV(tablePath('FILERNAME_CD'))) {
    const fid = row.FILER_ID;
    if (!fid) continue;
    const naml = (row.NAML || '').trim();
    if (!naml) continue;
    if (!map.has(fid)) {
      map.set(fid, {
        name: naml,
        type: row.FILER_TYPE || '',
        status: row.STATUS || '',
        city: (row.CITY || '').trim(),
        st: (row.ST || '').trim(),
      });
    }
  }
  return map;
}

/**
 * Build the FILER_ID → committee category map from FILER_TO_FILER_TYPE_CD.
 * The CATEGORY column distinguishes candidate-controlled (CTL) from
 * independent expenditure (IND) etc. SUB_CATEGORY narrows further.
 */
async function buildFilerCategories() {
  const map = new Map();
  for await (const row of streamTSV(tablePath('FILER_TO_FILER_TYPE_CD'))) {
    const fid = row.FILER_ID;
    if (!fid) continue;
    if (!map.has(fid)) {
      map.set(fid, {
        category: row.CATEGORY || '',
        sub_category: row.SUB_CATEGORY || '',
        party: row.PARTY_CD || '',
        district: row.DISTRICT_CD || '',
        active: row.ACTIVE || '',
      });
    }
  }
  return map;
}

/**
 * Build a contributor display name from CTRIB_NAML/F/T/S columns.
 * Cal-Access stores: NAML = last (or org name), NAMF = first, NAMT =
 * title (Mr/Ms/Dr), NAMS = suffix (Jr/III). For organizations only
 * NAML is populated.
 */
function contributorName(row) {
  const last = (row.CTRIB_NAML || '').trim();
  const first = (row.CTRIB_NAMF || '').trim();
  if (!last && !first) return '';
  if (!first) return last; // organization
  const suf = (row.CTRIB_NAMS || '').trim();
  return suf ? `${first} ${last} ${suf}` : `${first} ${last}`;
}

/**
 * Normalize a Cal-Access date like "1/20/2000 12:00:00 AM" or
 * "1/20/2000" to ISO YYYY-MM-DD. Returns '' on parse failure.
 */
function isoDate(raw) {
  if (!raw) return '';
  const m = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/** Cycle (election year, even) from a date string. */
function cycleFromDate(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (y % 2 === 0) return y;
  return y + 1; // off-year contribution counts toward the next election
}

/**
 * Cycle attribution that prefers transaction date (DATE_THRU) over filing
 * date (RCPT_DATE) when they diverge — fixes the amended-filing bug where
 * a 2016 transaction filed via 2025 amendment got tagged as cycle=2026.
 *
 * Logic:
 *   - If only RCPT_DATE present → use it (most common case)
 *   - If only DATE_THRU present → use it (rare but valid)
 *   - If BOTH present → check divergence:
 *       - Same year or off-by-one (normal for late-cycle filings) → RCPT_DATE
 *       - More than 1 cycle apart → DATE_THRU is the actual transaction date,
 *         use it; flag the divergence so the harness can audit it
 *
 * Returns: { cycle: number|null, date_used: 'rcpt'|'date_thru'|null,
 *            divergence_detected: boolean, rcpt_iso: string, thru_iso: string }
 */
function cycleAttribution(rcptDateRaw, dateThruRaw) {
  const rcptIso = isoDate(rcptDateRaw);
  const thruIso = isoDate(dateThruRaw);
  const rcptCycle = cycleFromDate(rcptIso);
  const thruCycle = cycleFromDate(thruIso);

  if (!rcptCycle && !thruCycle) {
    return { cycle: null, date_used: null, divergence_detected: false, rcpt_iso: rcptIso, thru_iso: thruIso };
  }
  if (rcptCycle && !thruCycle) {
    return { cycle: rcptCycle, date_used: 'rcpt', divergence_detected: false, rcpt_iso: rcptIso, thru_iso: thruIso };
  }
  if (!rcptCycle && thruCycle) {
    return { cycle: thruCycle, date_used: 'date_thru', divergence_detected: false, rcpt_iso: rcptIso, thru_iso: thruIso };
  }
  // Both present — detect divergence
  const yearDelta = Math.abs(rcptCycle - thruCycle);
  if (yearDelta <= 2) {
    // Within 1 cycle — normal late-filing pattern, prefer rcpt (matches pre-fix behavior)
    return { cycle: rcptCycle, date_used: 'rcpt', divergence_detected: false, rcpt_iso: rcptIso, thru_iso: thruIso };
  }
  // More than 1 cycle apart — RCPT is an amendment of a historical transaction.
  // Use DATE_THRU as the real transaction cycle.
  return { cycle: thruCycle, date_used: 'date_thru', divergence_detected: true, rcpt_iso: rcptIso, thru_iso: thruIso };
}

module.exports = {
  BULK_DIR,
  tablePath,
  assertBulkDir,
  streamTSV,
  loadTSV,
  cycleAttribution,
  buildFilingToFiler,
  buildFilerNames,
  buildFilerCategories,
  contributorName,
  isoDate,
  cycleFromDate,
};
