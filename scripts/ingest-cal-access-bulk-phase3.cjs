#!/usr/bin/env node
/**
 * ingest-cal-access-bulk-phase3.cjs — Phase 3 of the Cal-Access pipeline.
 *
 * Three modes (one entry point, --mode flag):
 *   --mode expn   → EXPN_CD (15.2M rows / 2.95GB) → committee → payee
 *                   monetary edges. Source: cal-access-expn. Role from
 *                   EXPN_CODE category.
 *   --mode loans  → LOAN_CD (96k rows / 18MB) → lender → committee
 *                   monetary edges. Role=loan. Source: cal-access-loans.
 *   --mode orgs   → F501_502_CD (21k rows / 4.7MB) → treasurer/officer
 *                   → committee affiliation edges. Source: cal-access-orgs.
 *
 * Scope: filters to the 78 candidate-mapped committees in
 * data/cal-access-filer-overrides.json. Other committees are not
 * material to the donor-map currently.
 *
 * Edges write through scripts/lib/relationships-store.cjs.upsertEdges
 * which routes to data/derived/<source>.jsonl per the canonical store
 * partitioning rules.
 *
 * Usage:
 *   node --max-old-space-size=4096 scripts/ingest-cal-access-bulk-phase3.cjs --mode expn
 *   node scripts/ingest-cal-access-bulk-phase3.cjs --mode loans
 *   node scripts/ingest-cal-access-bulk-phase3.cjs --mode orgs
 *   --dry-run / --limit N / --verbose flags supported on all modes
 */

'use strict';

const fs = require('fs');
const path = require('path');

const {
  assertBulkDir,
  streamTSV,
  buildFilingToFiler,
  tablePath,
  isoDate,
  cycleFromDate,
  BULK_DIR,
} = require('./lib/cal-access-helpers.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { addOrFindSource } = require('./lib/sources-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.join(__dirname, '..');
const OVERRIDES_FILE = path.join(ROOT, 'data', 'cal-access-filer-overrides.json');

const args = process.argv.slice(2);
const MODE_IDX = args.indexOf('--mode');
const MODE = MODE_IDX >= 0 ? args[MODE_IDX + 1] : null;
if (!['expn', 'loans', 'orgs'].includes(MODE)) {
  console.error('--mode must be one of: expn, loans, orgs');
  process.exit(1);
}
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const LIMIT_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(args[LIMIT_IDX + 1], 10) : 0;

const nowIso = () => new Date().toISOString();

function normalizeName(raw) {
  if (!raw) return '';
  const cleaned = String(raw).trim().replace(/\s+/g, ' ');
  if (!/[A-Z]/.test(cleaned) || /[a-z]/.test(cleaned)) return cleaned;
  return cleaned
    .split(' ')
    .map((w) => {
      if (w.length <= 1) return w;
      if (w.length <= 4 && /^[A-Z]+$/.test(w)) return w;
      return w[0] + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function joinNameParts(last, first, suffix) {
  const l = (last || '').trim();
  const f = (first || '').trim();
  const s = (suffix || '').trim();
  if (!l && !f) return '';
  if (!f) return l;
  return s ? `${f} ${l} ${s}` : `${f} ${l}`;
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) {
    throw new Error(`Override map missing: ${OVERRIDES_FILE}\nRun: node scripts/cal-access-discover-committees.cjs`);
  }
  return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
}

// Build filerId → { candidate, role, committee_name } across all candidates
function buildFilerToTarget(overrides) {
  const filerToTarget = new Map();
  for (const [candName, c] of Object.entries(overrides.candidates)) {
    for (const role of ['controlled', 'ie_supporting', 'ie_opposing']) {
      for (const rec of c[role] || []) {
        filerToTarget.set(String(rec.filer_id), {
          candidate: candName,
          role,
          committee_name: rec.name,
          filer_id: rec.filer_id,
        });
      }
    }
  }
  return filerToTarget;
}

// EXPN_CODE → human-readable role (per Cal-Access codebook category list)
const EXPN_CODE_LABEL = {
  CMP: 'campaign-paraphernalia',
  CNS: 'consultant',
  CTB: 'contribution-out',
  CVC: 'civic-donation',
  FIL: 'fundraising',
  FND: 'fundraising-event',
  IND: 'independent-expenditure',
  LEG: 'legal',
  LIT: 'literature',
  MBR: 'member-communications',
  MTG: 'meetings',
  OFC: 'office-expense',
  PET: 'petition-circulating',
  PHO: 'phone-banks',
  POL: 'polling',
  POS: 'postage',
  PRO: 'professional',
  PRT: 'print-ads',
  RAD: 'radio-airtime',
  RFD: 'returned-contribution',
  SAL: 'staff-salary',
  TEL: 'tv-advertising',
  TRC: 'candidate-travel',
  TRS: 'staff-travel',
  TSF: 'transfer',
  VOT: 'voter-contact',
  WEB: 'web-ads',
};

async function ingestExpn(filerToTarget) {
  console.log('[expn] Pass 1: filing→filer map...');
  const p1t0 = Date.now();
  const { map: filingToFiler, rowsScanned: ffRows } = await buildFilingToFiler();
  console.log(`  ${ffRows} rows scanned, ${filingToFiler.size} filings mapped (${((Date.now() - p1t0) / 1000).toFixed(1)}s)`);

  console.log('[expn] Pass 2: streaming EXPN_CD...');
  const p2t0 = Date.now();

  // Aggregation: (committee, payee, cycle, role) → { total, txns, dates }
  const agg = new Map();
  let rows = 0;
  let matched = 0;
  let droppedNoPayee = 0;
  let droppedNoAmount = 0;

  for await (const row of streamTSV(tablePath('EXPN_CD'), { limit: LIMIT || Infinity })) {
    rows++;
    if (rows % 1_000_000 === 0) {
      const rate = (rows / ((Date.now() - p2t0) / 1000)).toFixed(0);
      process.stdout.write(`  ${rows} rows  matched=${matched}  ${rate}/s\r`);
    }
    const filingId = row.FILING_ID;
    if (!filingId) continue;
    const spenderFilerId = filingToFiler.get(filingId);
    if (!spenderFilerId) continue;
    const target = filerToTarget.get(spenderFilerId);
    if (!target) continue;

    matched++;
    const payeeRaw = joinNameParts(row.PAYEE_NAML, row.PAYEE_NAMF, row.PAYEE_NAMS);
    if (!payeeRaw) { droppedNoPayee++; continue; }
    const payee = normalizeName(payeeRaw);
    const amount = parseFloat(row.AMOUNT || '0');
    if (!amount || amount <= 0) { droppedNoAmount++; continue; }
    const dateIso = isoDate(row.EXPN_DATE);
    const cycle = cycleFromDate(dateIso);
    if (!cycle) continue;

    const expnRole = EXPN_CODE_LABEL[(row.EXPN_CODE || '').trim()] || 'vendor-payment';

    // Source = the spending committee (rolled up to candidate identity
    // for controlled committees, kept as committee name for IE PACs —
    // same convention as the receipts ingester).
    const sourceEntity = target.role === 'controlled' ? target.candidate : target.committee_name;
    const aggKey = `${sourceEntity}|${payee}|${cycle}|${expnRole}`;
    let entry = agg.get(aggKey);
    if (!entry) {
      entry = {
        from: sourceEntity,
        to: payee,
        cycle,
        role: expnRole,
        target,
        total: 0,
        txns: 0,
        first_date: dateIso,
        last_date: dateIso,
        sample_descr: (row.EXPN_DSCR || '').trim().slice(0, 120),
      };
      agg.set(aggKey, entry);
    }
    entry.total += amount;
    entry.txns += 1;
    if (dateIso && dateIso < entry.first_date) entry.first_date = dateIso;
    if (dateIso && dateIso > entry.last_date) entry.last_date = dateIso;
  }
  console.log(`\n  ${rows} EXPN rows scanned in ${((Date.now() - p2t0) / 1000).toFixed(1)}s`);
  console.log(`  matched=${matched}  agg_edges=${agg.size}  dropped_no_payee=${droppedNoPayee}  dropped_no_amount=${droppedNoAmount}`);

  // Build edges
  const edges = [];
  for (const e of agg.values()) {
    const edge = {
      from: e.from,
      to: e.to,
      from_type: e.target.role === 'controlled' ? 'politician' : 'donor',
      to_type: 'donor',
      type: 'monetary',
      direction: 'directed',
      confidence: 0.92,
      source: 'cal-access-expn',
      source_url: `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=${e.target.filer_id}`,
      amount: Math.round(e.total * 100) / 100,
      cycle: String(e.cycle),
      role: e.role,
      first_seen: e.first_date || nowIso().slice(0, 10),
      last_verified: nowIso(),
      status: 'active',
      evidence: [
        `Cal-Access EXPN_CD: ${e.txns} expenditure(s) totaling $${e.total.toFixed(2)} from filer ${e.target.filer_id} (${e.target.committee_name}) to "${e.to}" in ${e.cycle}, role=${e.role}${e.sample_descr ? ` — sample: "${e.sample_descr}"` : ''}`,
      ],
    };
    edge.id = computeEdgeId(edge);
    edges.push(edge);
  }
  return edges;
}

async function ingestLoans(filerToTarget) {
  console.log('[loans] Pass 1: filing→filer map...');
  const p1t0 = Date.now();
  const { map: filingToFiler } = await buildFilingToFiler();
  console.log(`  ${filingToFiler.size} filings mapped (${((Date.now() - p1t0) / 1000).toFixed(1)}s)`);

  console.log('[loans] Pass 2: streaming LOAN_CD...');
  const p2t0 = Date.now();
  const agg = new Map();
  let rows = 0;
  let matched = 0;

  for await (const row of streamTSV(tablePath('LOAN_CD'), { limit: LIMIT || Infinity })) {
    rows++;
    const filingId = row.FILING_ID;
    if (!filingId) continue;
    const borrowerFilerId = filingToFiler.get(filingId);
    if (!borrowerFilerId) continue;
    const target = filerToTarget.get(borrowerFilerId);
    if (!target) continue;
    matched++;

    const lenderRaw = joinNameParts(row.LNDR_NAML, row.LNDR_NAMF, row.LNDR_NAMS);
    if (!lenderRaw) continue;
    const lender = normalizeName(lenderRaw);

    // LOAN_AMT1 = amount made / outstanding (use as primary)
    const amount = parseFloat(row.LOAN_AMT1 || '0') || parseFloat(row.LOAN_AMT2 || '0');
    if (!amount || amount <= 0) continue;
    const dateIso = isoDate(row.LOAN_DATE1);
    const cycle = cycleFromDate(dateIso);
    if (!cycle) continue;

    const recipient = target.role === 'controlled' ? target.candidate : target.committee_name;
    const aggKey = `${lender}|${recipient}|${cycle}`;
    let entry = agg.get(aggKey);
    if (!entry) {
      entry = {
        from: lender,
        to: recipient,
        cycle,
        target,
        total: 0,
        txns: 0,
        rate: row.LOAN_RATE || '',
        first_date: dateIso,
      };
      agg.set(aggKey, entry);
    }
    entry.total += amount;
    entry.txns += 1;
  }
  console.log(`\n  ${rows} LOAN rows scanned in ${((Date.now() - p2t0) / 1000).toFixed(1)}s`);
  console.log(`  matched=${matched}  agg_edges=${agg.size}`);

  const edges = [];
  for (const e of agg.values()) {
    const edge = {
      from: e.from,
      to: e.to,
      from_type: 'donor',
      to_type: e.target.role === 'controlled' ? 'politician' : 'donor',
      type: 'monetary',
      direction: 'directed',
      confidence: 0.95,
      source: 'cal-access-loans',
      source_url: `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=${e.target.filer_id}`,
      amount: Math.round(e.total * 100) / 100,
      cycle: String(e.cycle),
      role: 'loan',
      first_seen: e.first_date || nowIso().slice(0, 10),
      last_verified: nowIso(),
      status: 'active',
      evidence: [
        `Cal-Access LOAN_CD: ${e.txns} loan(s) totaling $${e.total.toFixed(2)} from "${e.from}" to filer ${e.target.filer_id} (${e.target.committee_name}) in ${e.cycle}${e.rate ? `, rate=${e.rate}` : ''}`,
      ],
    };
    edge.id = computeEdgeId(edge);
    edges.push(edge);
  }
  return edges;
}

async function ingestOrgs(filerToTarget) {
  // F501/F502 carries treasurer (FIN_NAML/F) + candidate (CAND_NAML/F).
  // The treasurer affiliation is the structural insight — who runs the
  // committee.
  console.log('[orgs] streaming F501_502_CD...');
  const p1t0 = Date.now();
  const seen = new Map(); // (treasurer,committee) → record
  let rows = 0;
  let matched = 0;

  for await (const row of streamTSV(tablePath('F501_502_CD'), { limit: LIMIT || Infinity })) {
    rows++;
    // F501/F502 keys committees by COMMITTEE_ID column, not FILER_ID
    // (FILER_ID is the candidate-side filer; we hold committee-side
    // filer IDs in the override map).
    const committeeId = (row.COMMITTEE_ID || '').trim();
    if (!committeeId) continue;
    const target = filerToTarget.get(committeeId);
    if (!target) continue;
    matched++;

    const treasurerRaw = joinNameParts(row.FIN_NAML, row.FIN_NAMF, row.FIN_NAMS);
    if (!treasurerRaw) continue;
    const treasurer = normalizeName(treasurerRaw);
    if (treasurer.toLowerCase() === 'self') continue;

    const committee = target.committee_name;
    const aggKey = `${treasurer}|${committee}`;
    if (seen.has(aggKey)) continue;
    seen.set(aggKey, {
      from: treasurer,
      to: committee,
      target,
      first_date: isoDate(row.RPT_DATE) || isoDate(row.ACCT_OP_DT),
    });
  }
  console.log(`  ${rows} F501/F502 rows scanned in ${((Date.now() - p1t0) / 1000).toFixed(1)}s`);
  console.log(`  matched=${matched}  unique_affiliations=${seen.size}`);

  const edges = [];
  for (const e of seen.values()) {
    const edge = {
      from: e.from,
      to: e.to,
      from_type: 'donor',
      to_type: 'donor',
      type: 'affiliation',
      direction: 'directed',
      confidence: 0.95,
      source: 'cal-access-orgs',
      source_url: `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=${e.target.filer_id}`,
      role: 'treasurer',
      first_seen: e.first_date || nowIso().slice(0, 10),
      last_verified: nowIso(),
      status: 'active',
      evidence: [
        `Cal-Access F501/F502: "${e.from}" listed as financial controller/treasurer of filer ${e.target.filer_id} (${e.target.committee_name})`,
      ],
    };
    edge.id = computeEdgeId(edge);
    edges.push(edge);
  }
  return edges;
}

const SOURCE_META = {
  expn: {
    url: 'https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip#EXPN_CD',
    title: 'California Cal-Access EXPN_CD (expenditures)',
    notes: 'Per-row expenditures from CA SoS Cal-Access bulk dump. Committee → vendor / payee / IE target. Role from EXPN_CODE.',
  },
  loans: {
    url: 'https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip#LOAN_CD',
    title: 'California Cal-Access LOAN_CD (loans to committees)',
    notes: 'Per-row loans from CA SoS Cal-Access. Lender → committee. Includes self-loans by candidates.',
  },
  orgs: {
    url: 'https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip#F501_502_CD',
    title: 'California Cal-Access F501/F502 (Statement of Organization)',
    notes: 'Committee setup metadata. Treasurer / financial controller assignments.',
  },
};

(async function main() {
  console.log(`[cal-access-phase3] mode=${MODE}  dry-run=${DRY_RUN}  limit=${LIMIT || 'none'}  bulk=${BULK_DIR}`);
  assertBulkDir();
  const t0 = Date.now();
  const overrides = loadOverrides();
  const filerToTarget = buildFilerToTarget(overrides);
  console.log(`  ${filerToTarget.size} filer IDs across ${Object.keys(overrides.candidates).length} candidates`);

  let edges = [];
  if (MODE === 'expn') edges = await ingestExpn(filerToTarget);
  else if (MODE === 'loans') edges = await ingestLoans(filerToTarget);
  else if (MODE === 'orgs') edges = await ingestOrgs(filerToTarget);
  console.log(`[cal-access-phase3] built ${edges.length} edges`);

  if (VERBOSE && edges.length > 0) {
    console.log('  Top 5 by amount/connection:');
    const sorted = [...edges].sort((a, b) => (b.amount || 0) - (a.amount || 0));
    for (const e of sorted.slice(0, 5)) {
      const amt = e.amount ? `$${e.amount.toLocaleString()}` : '(no amount)';
      console.log(`    ${amt}  ${e.from} → ${e.to}  role=${e.role || '-'}  cycle=${e.cycle || '-'}`);
    }
  }

  if (!DRY_RUN) {
    const meta = SOURCE_META[MODE];
    const src = addOrFindSource({
      url: meta.url,
      title: meta.title,
      tier: 1,
      source_type: 'government_primary',
      domain: 'sos.ca.gov',
      publisher: 'California Secretary of State',
      first_seen: nowIso(),
      status: 'live',
      notes: meta.notes,
    });
    console.log(`  source: ${src.id}`);
    const result = upsertEdges(edges);
    console.log(`  upsert: added=${result.added} updated=${result.updated} skipped=${result.skipped} invalid=${result.invalid} total=${result.total}`);
    if (result.errors.length > 0) {
      console.log('  First validation errors:');
      for (const e of result.errors.slice(0, 5)) console.log(`    ${e.id || '?'}  ${e.from} → ${e.to}: ${e.error}`);
    }
  } else {
    console.log('[cal-access-phase3] DRY RUN — skipping writes');
  }

  console.log(`[cal-access-phase3] elapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
