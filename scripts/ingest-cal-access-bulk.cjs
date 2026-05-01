#!/usr/bin/env node
/**
 * ingest-cal-access-bulk.cjs — Cal-Access bulk → vault.
 *
 * Reads the unzipped CA SoS Cal-Access bulk dump from
 * `C:\donor-map-data\bulk\CalAccess\DATA` (override with
 * CAL_ACCESS_BULK_DIR env var), aggregates donor → committee receipts,
 * and emits canonical relationship edges for the 10 CA Governor 2026
 * candidates per `data/cal-access-filer-overrides.json`.
 *
 * Output:
 *   data/derived/cal-access-bulk.jsonl   — canonical edges (donor → committee/candidate)
 *   data/cal-access-bulk-summary.json    — run stats
 *
 * Edge model (option 2 from the plan note — IE committees are SEPARATE
 * entities targeting the candidate):
 *
 *   role=controlled committee:
 *     edge: donor → "<Candidate>"  type=monetary  source=cal-access-bulk
 *
 *   role=ie_supporting committee:
 *     edge: donor → "<Committee Name>"  type=monetary
 *     edge: "<Committee Name>" → "<Candidate>"  type=political-support
 *
 *   role=ie_opposing committee:
 *     edge: donor → "<Committee Name>"  type=monetary
 *     edge: "<Committee Name>" → "<Candidate>"  type=political-opposition
 *
 * Donor names are NOT vault-profile-existence-checked (cal-access-bulk
 * is in MIGRATION_SOURCES). Aggregation key is donor + committee +
 * cycle so multiple receipts collapse to one edge with summed amount.
 *
 * Usage:
 *   node scripts/ingest-cal-access-bulk.cjs                 # full run
 *   node scripts/ingest-cal-access-bulk.cjs --dry-run       # no writes
 *   node scripts/ingest-cal-access-bulk.cjs --limit 100000  # cap RCPT rows scanned
 *   node scripts/ingest-cal-access-bulk.cjs --verbose       # log progress
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  assertBulkDir,
  streamTSV,
  buildFilingToFiler,
  buildFilerNames,
  tablePath,
  contributorName,
  isoDate,
  cycleFromDate,
  cycleAttribution,
  BULK_DIR,
} = require('./lib/cal-access-helpers.cjs');

const { upsertEdges } = require('./lib/relationships-store.cjs');
const { addOrFindSource } = require('./lib/sources-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.join(__dirname, '..');
const OVERRIDES_FILE = path.join(ROOT, 'data', 'cal-access-filer-overrides.json');
const NON_DONOR_FILE = path.join(ROOT, 'data', 'cal-access-non-donor-filers.json');
const ALIASES_FILE = path.join(ROOT, 'data', 'cal-access-donor-aliases.json');
const SUMMARY_FILE = path.join(ROOT, 'data', 'cal-access-bulk-summary.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const LIMIT_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(args[LIMIT_IDX + 1], 10) : 0;

function nowIso() { return new Date().toISOString(); }

function normalizeDonorName(raw) {
  if (!raw) return '';
  // Title-case normalization for individual donors. Cal-Access stores
  // most names in ALL CAPS. We don't want vault edges shouting.
  const cleaned = String(raw).trim().replace(/\s+/g, ' ');
  if (!/[A-Z]/.test(cleaned) || /[a-z]/.test(cleaned)) return cleaned;
  return cleaned
    .split(' ')
    .map((w) => {
      if (w.length <= 1) return w;
      // Preserve likely acronyms (LLC, PAC, USA, INC) — all caps, ≤4 chars
      if (w.length <= 4 && /^[A-Z]+$/.test(w)) return w;
      return w[0] + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) {
    throw new Error(`Override map missing: ${OVERRIDES_FILE}\nRun: node scripts/cal-access-discover-committees.cjs`);
  }
  return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
}

// Audit Remediation #3: public-fund / non-donor blocklist. Filters out
// receipts whose CTRIB_NAML is a known public-fund disbursement vehicle
// (e.g. LA Ethics Commission matching funds) before we treat the receipt
// as a donor contribution.
function loadNonDonorFilter() {
  if (!fs.existsSync(NON_DONOR_FILE)) return { names: new Set(), patterns: [] };
  const j = JSON.parse(fs.readFileSync(NON_DONOR_FILE, 'utf-8'));
  const names = new Set((j.non_donor_names || []).map((r) => (r.name_normalized || r.name || '').toLowerCase().trim()));
  const patterns = (j.non_donor_name_patterns || []).map((r) => ({
    re: new RegExp(r.regex),
    rationale: r.rationale,
  }));
  return { names, patterns };
}

function isNonDonor(name, filter) {
  if (!name) return false;
  const norm = name.toLowerCase().trim();
  if (filter.names.has(norm)) return true;
  for (const p of filter.patterns) if (p.re.test(name)) return true;
  return false;
}

// Audit Remediation #7: detect cross-cycle internal transfers.
// When donor name matches a same-lastname-as-candidate committee pattern,
// the receipt is the same person moving money between their own committees
// across cycles (Becerra-AG-2018 → Becerra-Gov-2026). These are NOT
// external donations and should not inflate donor totals.
function makeInternalTransferPatterns(lastName) {
  if (!lastName || lastName.length < 4) return null;
  return [
    new RegExp(`^${lastName} for (Governor|Senate|Assembly|Congress|Mayor|Attorney General|Superintendent|Controller|Board of Equalization|Sheriff)\\b`, 'i'),
    new RegExp(`^${lastName} Officeholder Account\\b`, 'i'),
    new RegExp(`^Friends of (\\S+\\s+)?${lastName}\\b`, 'i'),
    new RegExp(`^Committee to (Elect|Reelect|Re-elect) (\\S+\\s+)?${lastName}\\b`, 'i'),
    new RegExp(`^${lastName} \\d{4}\\b`, 'i'),
  ];
}

function isInternalTransfer(donorName, candidateName) {
  if (!donorName || !candidateName) return false;
  const lastName = candidateName.split(/\s+/).slice(-1)[0];
  const patterns = makeInternalTransferPatterns(lastName);
  if (!patterns) return false;
  for (const re of patterns) if (re.test(donorName)) return true;
  return false;
}

// Audit Remediation #8: donor-name alias merge. Loads the alias map
// at startup and returns a function variant→canonical. Variants are
// matched case-insensitively + whitespace-collapsed.
function loadDonorAliases() {
  if (!fs.existsSync(ALIASES_FILE)) return new Map();
  const j = JSON.parse(fs.readFileSync(ALIASES_FILE, 'utf-8'));
  const map = new Map();
  for (const entry of j.aliases || []) {
    const canonical = entry.canonical;
    if (!canonical) continue;
    for (const variant of entry.variants || []) {
      const k = variant.toLowerCase().replace(/\s+/g, ' ').trim();
      if (k) map.set(k, canonical);
    }
  }
  return map;
}

function applyDonorAlias(donorName, aliasMap) {
  if (!donorName || aliasMap.size === 0) return donorName;
  const k = donorName.toLowerCase().replace(/\s+/g, ' ').trim();
  return aliasMap.get(k) || donorName;
}

(async function main() {
  console.log(`[ingest-cal-access-bulk] start  dry-run=${DRY_RUN}  limit=${LIMIT || 'none'}  bulk=${BULK_DIR}`);
  assertBulkDir();

  const t0 = Date.now();
  const overrides = loadOverrides();

  // Build: filer_id → { candidate_vault_title, role, committee_name }
  const filerToTarget = new Map();
  for (const [candName, c] of Object.entries(overrides.candidates)) {
    for (const role of ['controlled', 'ie_supporting', 'ie_opposing']) {
      for (const rec of (c[role] || [])) {
        filerToTarget.set(String(rec.filer_id), {
          candidate: candName,
          role,
          committee_name: rec.name,
          filer_id: rec.filer_id,
        });
      }
    }
  }
  console.log(`[ingest-cal-access-bulk] override map: ${filerToTarget.size} filer IDs across ${Object.keys(overrides.candidates).length} candidates`);

  const nonDonorFilter = loadNonDonorFilter();
  console.log(`[ingest-cal-access-bulk] non-donor blocklist: ${nonDonorFilter.names.size} exact + ${nonDonorFilter.patterns.length} pattern(s)`);

  const donorAliases = loadDonorAliases();
  console.log(`[ingest-cal-access-bulk] donor-alias map: ${donorAliases.size} variants → canonical`);
  const aliasHits = new Map();

  if (filerToTarget.size === 0) {
    throw new Error('Override map is empty. Re-run cal-access-discover-committees.cjs first.');
  }

  // ── Pass 1: filing → filer
  console.log('[ingest-cal-access-bulk] Pass 1: building filing→filer map from FILER_FILINGS_CD...');
  const p1t0 = Date.now();
  const { map: filingToFiler, rowsScanned: ffRows } = await buildFilingToFiler();
  console.log(`  ${ffRows} rows scanned, ${filingToFiler.size} filings mapped (${((Date.now() - p1t0) / 1000).toFixed(1)}s)`);

  // ── Pass 2: filer name lookup (for fallback display + sanity)
  console.log('[ingest-cal-access-bulk] Pass 2: loading FILERNAME_CD...');
  const p2t0 = Date.now();
  const filerNames = await buildFilerNames();
  console.log(`  ${filerNames.size} filer names loaded (${((Date.now() - p2t0) / 1000).toFixed(1)}s)`);

  // ── Pass 3: stream RCPT_CD, classify, aggregate
  console.log('[ingest-cal-access-bulk] Pass 3: streaming RCPT_CD...');
  const p3t0 = Date.now();

  // Aggregation key: donor|committee|cycle|role
  // Each entry: { donor, committee_name, candidate, role, filer_id, total_amount, txn_count, first_date, last_date }
  const agg = new Map();

  let rcptRows = 0;
  let matched = 0;
  let unmatched = 0;
  let droppedNoDonor = 0;
  let droppedNoAmount = 0;
  let droppedNonDonor = 0;
  let cycleDivergenceCount = 0;
  const nonDonorMoneyByName = new Map();

  for await (const row of streamTSV(tablePath('RCPT_CD'), { limit: LIMIT || Infinity })) {
    rcptRows++;
    if (rcptRows % 1000000 === 0) {
      const rate = (rcptRows / ((Date.now() - p3t0) / 1000)).toFixed(0);
      process.stdout.write(`  ${rcptRows} rows  matched=${matched}  ${rate}/s\r`);
    }

    const filingId = row.FILING_ID;
    if (!filingId) continue;
    const recipientFilerId = filingToFiler.get(filingId);
    if (!recipientFilerId) continue;

    const target = filerToTarget.get(recipientFilerId);
    if (!target) { unmatched++; continue; }

    matched++;

    // Donor name
    const donorRaw = contributorName(row);
    if (!donorRaw) { droppedNoDonor++; continue; }
    let donor = normalizeDonorName(donorRaw);

    // Audit Remediation #8: alias-merge spelling variants
    const aliased = applyDonorAlias(donor, donorAliases);
    if (aliased !== donor) {
      aliasHits.set(donor, (aliasHits.get(donor) || 0) + 1);
      donor = aliased;
    }

    // Audit Remediation #3: filter out public-fund / non-donor disbursements
    if (isNonDonor(donor, nonDonorFilter) || isNonDonor(donorRaw, nonDonorFilter)) {
      droppedNonDonor++;
      const amt = parseFloat(row.AMOUNT || '0') || 0;
      nonDonorMoneyByName.set(donor, (nonDonorMoneyByName.get(donor) || 0) + amt);
      continue;
    }

    // Amount
    const amount = parseFloat(row.AMOUNT || '0');
    if (!amount || amount <= 0) { droppedNoAmount++; continue; }

    // Cycle attribution — use DATE_THRU when it diverges from RCPT_DATE by
    // >1 cycle (amended filing of a historical transaction). Phase 5 fix.
    const cycleAttr = cycleAttribution(row.RCPT_DATE, row.DATE_THRU);
    const cycle = cycleAttr.cycle;
    const dateIso = cycleAttr.date_used === 'date_thru' ? cycleAttr.thru_iso : cycleAttr.rcpt_iso;
    if (!cycle) continue;
    if (cycleAttr.divergence_detected) {
      cycleDivergenceCount++;
    }

    // Aggregation
    // For controlled committees: edge target = candidate name
    // For IE committees: edge target = committee name (separate entity)
    const edgeTarget = target.role === 'controlled' ? target.candidate : target.committee_name;
    const aggKey = `${donor}|${edgeTarget}|${cycle}`;

    let entry = agg.get(aggKey);
    if (!entry) {
      entry = {
        donor,
        edge_target: edgeTarget,
        candidate: target.candidate,
        role: target.role,
        filer_id: target.filer_id,
        committee_name: target.committee_name,
        cycle,
        total_amount: 0,
        txn_count: 0,
        first_date: dateIso,
        last_date: dateIso,
        donor_city: row.CTRIB_CITY || '',
        donor_st: row.CTRIB_ST || '',
        donor_emp: row.CTRIB_EMP || '',
        donor_occ: row.CTRIB_OCC || '',
        sample_tran_id: row.TRAN_ID || '',
      };
      agg.set(aggKey, entry);
    }
    entry.total_amount += amount;
    entry.txn_count += 1;
    if (dateIso && (!entry.first_date || dateIso < entry.first_date)) entry.first_date = dateIso;
    if (dateIso && (!entry.last_date || dateIso > entry.last_date)) entry.last_date = dateIso;
  }

  const p3secs = ((Date.now() - p3t0) / 1000).toFixed(1);
  console.log(`\n  ${rcptRows} RCPT rows scanned in ${p3secs}s`);
  console.log(`  matched=${matched}  unmatched=${unmatched}  dropped_no_donor=${droppedNoDonor}  dropped_no_amount=${droppedNoAmount}  dropped_non_donor=${droppedNonDonor}`);
  if (cycleDivergenceCount > 0) {
    console.log(`  cycle-divergence: ${cycleDivergenceCount} amended filings (used DATE_THRU instead of RCPT_DATE)`);
  }
  if (aliasHits.size > 0) {
    const totalAliasHits = [...aliasHits.values()].reduce((a, b) => a + b, 0);
    console.log(`  alias merges: ${totalAliasHits} receipts collapsed across ${aliasHits.size} variant strings`);
    for (const [variant, count] of [...aliasHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`    "${variant}" → canonical (${count} receipts)`);
    }
  }
  if (droppedNonDonor > 0) {
    console.log('  non-donor amounts blocklisted:');
    for (const [name, amt] of [...nonDonorMoneyByName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`    ${name}: $${(amt / 1_000_000).toFixed(2)}M`);
    }
  }
  console.log(`  aggregated to ${agg.size} unique (donor, target, cycle) edges`);

  // ── Build edges
  console.log('[ingest-cal-access-bulk] Building edges...');
  const edges = [];
  // Audit Remediation #2: self-funding tracking. Pre-validator detection
  // of donor === recipient. Validator rejects these as self-loops (correct
  // for graph integrity), but they're the dominant fact about Steyer's
  // campaign and need to surface SOMEWHERE. Emit to a separate tracking
  // file the auto-block builder reads.
  const selfFundingRecords = [];
  // Audit Remediation #7: cross-cycle internal-transfer tracking.
  // Same shape as self-funding records — partitioned out of canonical edges
  // to avoid inflating donor totals.
  const internalTransferRecords = [];
  const ieToCandidate = new Map(); // committee_name → { candidate, role } for political-support/oppose edges

  for (const entry of agg.values()) {
    // Audit Remediation #2: self-funding partition. If donor === target,
    // this is the candidate giving to their own committee. Track separately
    // (validator would reject; we want to keep it visible).
    const isSelfFunding = entry.donor === entry.edge_target;
    if (isSelfFunding) {
      selfFundingRecords.push({
        candidate: entry.candidate,
        donor: entry.donor,
        committee_name: entry.committee_name,
        filer_id: entry.filer_id,
        cycle: String(entry.cycle),
        amount: Math.round(entry.total_amount * 100) / 100,
        txn_count: entry.txn_count,
        first_date: entry.first_date,
        last_date: entry.last_date,
        evidence: `Cal-Access RCPT_CD: ${entry.txn_count} self-funding receipt(s) totaling $${entry.total_amount.toFixed(2)} from "${entry.donor}" to own committee ${entry.filer_id} (${entry.committee_name}) in ${entry.cycle}`,
      });
      continue;
    }

    // Audit Remediation #7: cross-cycle internal transfer detection.
    // Donor name matches the candidate's same-lastname committee pattern
    // (Becerra-AG-2018 → Xavier Becerra). Partition out of canonical edges.
    if (entry.role === 'controlled' && isInternalTransfer(entry.donor, entry.candidate)) {
      internalTransferRecords.push({
        candidate: entry.candidate,
        donor: entry.donor,
        committee_name: entry.committee_name,
        filer_id: entry.filer_id,
        cycle: String(entry.cycle),
        amount: Math.round(entry.total_amount * 100) / 100,
        txn_count: entry.txn_count,
        first_date: entry.first_date,
        last_date: entry.last_date,
        evidence: `Cal-Access RCPT_CD: ${entry.txn_count} cross-cycle internal-transfer receipt(s) totaling $${entry.total_amount.toFixed(2)} from candidate's prior-cycle committee "${entry.donor}" to current committee ${entry.filer_id} (${entry.committee_name}) in ${entry.cycle}`,
      });
      continue;
    }

    const donorEdge = {
      from: entry.donor,
      to: entry.edge_target,
      from_type: 'donor',
      to_type: entry.role === 'controlled' ? 'politician' : 'donor',
      type: 'monetary',
      direction: 'directed',
      confidence: 0.95,
      source: 'cal-access-bulk',
      source_url: `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=${entry.filer_id}`,
      amount: Math.round(entry.total_amount * 100) / 100,
      cycle: String(entry.cycle),
      role: 'direct',
      first_seen: entry.first_date || nowIso().slice(0, 10),
      last_verified: nowIso(),
      status: 'active',
      evidence: [
        `Cal-Access RCPT_CD: ${entry.txn_count} receipt(s) totaling $${entry.total_amount.toFixed(2)} from "${entry.donor}" to filer ${entry.filer_id} (${entry.committee_name}) in ${entry.cycle}`,
      ],
    };
    donorEdge.id = computeEdgeId(donorEdge);
    edges.push(donorEdge);

    // For IE committees, also build the committee→candidate edge
    if (entry.role !== 'controlled') {
      const key = `${entry.edge_target}||${entry.candidate}||${entry.role}`;
      if (!ieToCandidate.has(key)) {
        ieToCandidate.set(key, {
          committee: entry.edge_target,
          candidate: entry.candidate,
          role: entry.role,
          filer_id: entry.filer_id,
          first_seen: entry.first_date,
        });
      }
    }
  }

  for (const ie of ieToCandidate.values()) {
    const edge = {
      from: ie.committee,
      to: ie.candidate,
      from_type: 'donor',
      to_type: 'politician',
      type: ie.role === 'ie_opposing' ? 'political-opposition' : 'political-support',
      direction: 'directed',
      confidence: 0.95,
      source: 'cal-access-bulk',
      source_url: `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=${ie.filer_id}`,
      first_seen: ie.first_seen || nowIso().slice(0, 10),
      last_verified: nowIso(),
      status: 'active',
      evidence: [
        `Cal-Access committee ${ie.filer_id} (${ie.committee}) classified as ${ie.role.replace('_', '-')} for ${ie.candidate} per FILER_TO_FILER_TYPE_CD sub_category=40102`,
      ],
    };
    edge.id = computeEdgeId(edge);
    edges.push(edge);
  }

  console.log(`[ingest-cal-access-bulk] Built ${edges.length} edges (${edges.length - ieToCandidate.size} monetary + ${ieToCandidate.size} support/oppose)`);

  // ── Top spot-check before writes
  if (VERBOSE || DRY_RUN) {
    console.log('\n[ingest-cal-access-bulk] Top 10 by candidate, by donor amount:');
    const byCandidate = new Map();
    const targetByName = new Map(); // committee name OR candidate name → candidate
    for (const [candName, c] of Object.entries(overrides.candidates)) {
      targetByName.set(candName, candName);
      for (const role of ['controlled', 'ie_supporting', 'ie_opposing']) {
        for (const r of (c[role] || [])) targetByName.set(r.name, candName);
      }
    }
    for (const e of edges) {
      if (e.type !== 'monetary') continue;
      const cand = targetByName.get(e.to) || '?';
      if (!byCandidate.has(cand)) byCandidate.set(cand, []);
      byCandidate.get(cand).push(e);
    }
    for (const [cand, list] of byCandidate.entries()) {
      list.sort((a, b) => b.amount - a.amount);
      const top = list.slice(0, 3);
      console.log(`  ${cand}: ${list.length} edges, top:`);
      for (const e of top) console.log(`    $${e.amount.toFixed(0).padStart(10)}  ${e.from} → ${e.to} (${e.cycle})`);
    }
  }

  // ── Source registration
  if (!DRY_RUN) {
    console.log('[ingest-cal-access-bulk] Registering source...');
    const src = addOrFindSource({
      url: 'https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip',
      title: 'California Cal-Access Bulk Campaign-Finance Export',
      tier: 1,
      source_type: 'government_primary',
      domain: 'sos.ca.gov',
      publisher: 'California Secretary of State',
      first_seen: nowIso(),
      status: 'live',
      notes: 'Daily bulk dump of every campaign-finance filing reported under Cal-Access. RCPT_CD + EXPN_CD + filer registry tables. Ingested by scripts/ingest-cal-access-bulk.cjs.',
    });
    console.log(`  source: ${src.id}`);
  }

  // ── Edge upsert via canonical store
  if (!DRY_RUN) {
    console.log('[ingest-cal-access-bulk] Upserting edges via relationships-store...');
    const result = upsertEdges(edges);
    console.log(`  added=${result.added}  updated=${result.updated}  skipped=${result.skipped}  invalid=${result.invalid}  total=${result.total}`);
    if (result.errors.length > 0) {
      console.log('\n  First validation errors:');
      for (const e of result.errors.slice(0, 5)) console.log(`    ${e.id || '?'}  ${e.from} → ${e.to}: ${e.error}`);
    }
  } else {
    console.log('[ingest-cal-access-bulk] DRY RUN — skipping source + edge writes.');
  }

  // ── Self-funding + internal-transfer tracking files (Remediations #2, #7)
  // Both written AFTER upsertEdges and to data/ (not data/derived/) to
  // avoid the relationships-store partitioner truncating them.
  if (!DRY_RUN) {
    const selfFundingFile = path.join(ROOT, 'data', 'cal-access-self-funding.jsonl');
    if (selfFundingRecords.length > 0) {
      const lines = selfFundingRecords.map((r) => JSON.stringify(r)).join('\n') + '\n';
      fs.writeFileSync(selfFundingFile, lines, 'utf-8');
      console.log(`[ingest-cal-access-bulk] wrote ${selfFundingRecords.length} self-funding records to ${selfFundingFile}`);
      const totalSelf = selfFundingRecords.reduce((s, r) => s + r.amount, 0);
      console.log(`  total self-funding: $${(totalSelf / 1_000_000).toFixed(2)}M`);
    } else if (fs.existsSync(selfFundingFile)) {
      fs.unlinkSync(selfFundingFile);
    }

    const internalTransferFile = path.join(ROOT, 'data', 'cal-access-internal-transfers.jsonl');
    if (internalTransferRecords.length > 0) {
      const lines = internalTransferRecords.map((r) => JSON.stringify(r)).join('\n') + '\n';
      fs.writeFileSync(internalTransferFile, lines, 'utf-8');
      console.log(`[ingest-cal-access-bulk] wrote ${internalTransferRecords.length} internal-transfer records to ${internalTransferFile}`);
      const totalIT = internalTransferRecords.reduce((s, r) => s + r.amount, 0);
      console.log(`  total cross-cycle internal transfers: $${(totalIT / 1_000_000).toFixed(2)}M`);
    } else if (fs.existsSync(internalTransferFile)) {
      fs.unlinkSync(internalTransferFile);
    }
  }

  // ── Audit Remediation #9: dump manifest. Capture metadata of the
  // bulk dump's source TSV files (size + mtime + sha256 of headers)
  // so the summary preserves "what data we read this run." Doesn't
  // hash the full files (RCPT_CD is 3.6GB) — header + size + mtime
  // is enough to detect dump rotation between runs.
  const manifestTables = ['RCPT_CD', 'EXPN_CD', 'LOAN_CD', 'FILER_FILINGS_CD', 'FILERNAME_CD', 'FILER_TO_FILER_TYPE_CD'];
  const dumpManifest = {};
  for (const tbl of manifestTables) {
    const fp = tablePath(tbl);
    if (!fs.existsSync(fp)) continue;
    const stat = fs.statSync(fp);
    // Read first 8KB and hash for fingerprint (catches header changes
    // + first-row drift; cheap on giant files).
    const fd = fs.openSync(fp, 'r');
    const buf = Buffer.alloc(8192);
    fs.readSync(fd, buf, 0, 8192, 0);
    fs.closeSync(fd);
    const headerHash = require('crypto').createHash('sha256').update(buf).digest('hex').slice(0, 16);
    dumpManifest[tbl] = {
      size_bytes: stat.size,
      mtime: stat.mtime.toISOString(),
      header_8kb_sha256_prefix: headerHash,
    };
  }

  // ── Summary
  const summary = {
    run_at: nowIso(),
    dry_run: DRY_RUN,
    limit: LIMIT || null,
    bulk_dir: BULK_DIR,
    dump_manifest: dumpManifest,
    rcpt_rows_scanned: rcptRows,
    rcpt_rows_matched: matched,
    rcpt_rows_unmatched: unmatched,
    aggregated_edges: agg.size,
    monetary_edges: edges.length - ieToCandidate.size,
    political_edges: ieToCandidate.size,
    elapsed_seconds: Math.round((Date.now() - t0) / 1000),
    candidates: Object.fromEntries(
      Object.keys(overrides.candidates).map((cand) => {
        const candEdges = edges.filter((e) => {
          if (e.type === 'monetary') {
            const target = e.to;
            // Matches if target is candidate OR target is one of their IE committees
            if (target === cand) return true;
            const candData = overrides.candidates[cand];
            for (const role of ['ie_supporting', 'ie_opposing']) {
              if ((candData[role] || []).some((r) => r.name === target)) return true;
            }
          }
          return false;
        });
        const total = candEdges.reduce((s, e) => s + (e.amount || 0), 0);
        return [cand, {
          edge_count: candEdges.length,
          total_dollars: Math.round(total * 100) / 100,
        }];
      })
    ),
  };

  if (!DRY_RUN) fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log('\n[ingest-cal-access-bulk] DONE');
  console.log(JSON.stringify(summary.candidates, null, 2));
})().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
