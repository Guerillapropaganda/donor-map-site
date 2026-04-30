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
 * Returns Map<string, string>. Memory budget: ~2.8M entries = ~250-400MB.
 */
async function buildFilingToFiler() {
  const map = new Map();
  let n = 0;
  for await (const row of streamTSV(tablePath('FILER_FILINGS_CD'))) {
    const fid = row.FILING_ID;
    const filer = row.FILER_ID;
    if (fid && filer) {
      // Multiple rows per filing (amendments). Last write wins, which
      // gives us the most recent filing-level filer assignment.
      map.set(fid, filer);
    }
    n++;
  }
  return { map, rowsScanned: n };
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

module.exports = {
  BULK_DIR,
  tablePath,
  assertBulkDir,
  streamTSV,
  loadTSV,
  buildFilingToFiler,
  buildFilerNames,
  buildFilerCategories,
  contributorName,
  isoDate,
  cycleFromDate,
};
