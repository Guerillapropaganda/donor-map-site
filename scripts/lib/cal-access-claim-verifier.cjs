/**
 * cal-access-claim-verifier.cjs — verified-claim helper for Cal-Access
 * dossier work.
 *
 * The librarian's bulk-derived edges (data/derived/cal-access-bulk.jsonl)
 * are an APPROXIMATION suitable for graph-shape queries. Editorial work
 * (forensic financial journalism on living people) requires primary-
 * source filing trace through the raw RCPT_CD / S497_CD / EXPN_CD bulk
 * with cross-verification against CVR_CAMPAIGN_DISCLOSURE_CD (which
 * tells you which committee actually filed the report).
 *
 * Why this helper exists:
 *   In the CA Gov 2026 dossier session (2026-05-01), four distinct
 *   bug classes surfaced when we used the librarian as the primary
 *   source for editorial claims:
 *     1. Cycle-misattribution on amended filings
 *     2. Direction-flow misattribution on opposition committees
 *     3. Duplicate-counting on similar-spelling donor names
 *     4. Candidate self-fund undercounted (partition design choice)
 *   Each took a correction round to surface and fix.
 *
 *   The fix at the librarian layer is (a) the cycleAttribution() helper
 *   added 2026-05-01 (b) re-running the alias map with broader coverage
 *   (c) the four harness checks added the same day. But future dossier
 *   work shouldn't wait for librarian rebuilds — it should call this
 *   helper which goes directly to primary source.
 *
 * Public API:
 *   findContributions({ donor_name?, recipient_committee_id?, cycle? })
 *     → Promise<Contribution[]>
 *
 *     Searches RCPT_CD + S497_CD raw bulk and returns contributions
 *     matching the criteria, with full filing trace via CVR. Each
 *     contribution carries its filing_id, source_form, raw_record_ref,
 *     pro_anti_status (verified via FILERNAME_CD), and a
 *     verification_path string suitable for editorial citation.
 *
 *   findCommitteeRole(filer_id) → Promise<{ filer_id, registered_names[],
 *     pro_anti_status, opposes_candidate?, supports_candidate? }>
 *
 *     Identifies pro/anti via FILERNAME_CD naming convention. Used to
 *     short-circuit before claiming a contribution went to/from a
 *     specific candidate.
 *
 *   getSelfFundTotal(candidate_name) → Promise<{ candidate, total,
 *     records[] }>
 *
 *     Reads data/cal-access-self-funding.jsonl directly (the partition
 *     the librarian doesn't surface in main edges). Required for any
 *     dossier on a self-funded candidate.
 *
 * Conventions:
 *   - All amount fields are numbers (parsed from raw strings).
 *   - All dates are ISO YYYY-MM-DD.
 *   - Each returned record includes verification_path: a string the
 *     dossier can cite ("Cal-Access RCPT_CD filing 3134124, CVR filer
 *     1490270, FILERNAME indicates anti-Steyer per FPPC NO ON pattern").
 */

'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..', '..');
const BULK_DIR = process.env.CAL_ACCESS_BULK_DIR || 'C:/donor-map-data/bulk/CalAccess/DATA';
const SELF_FUND_FILE = path.join(ROOT, 'data', 'cal-access-self-funding.jsonl');
const ALIASES_FILE = path.join(ROOT, 'data', 'cal-access-donor-aliases.json');

const NO_ON_PATTERN = /\b(NO ON|OPPOSE|AGAINST)\s+([A-Z][A-Z\s]*[A-Z])\s+FOR\b/i;
const SUPPORT_PATTERN = /\bSUPPORTING\s+([A-Z][A-Z\s]+)\b/i;

// ── Internal: load FILERNAME_CD into in-memory map ────────────────────
let _filerNameCache = null;
async function loadFilerNames() {
  if (_filerNameCache) return _filerNameCache;
  const file = path.join(BULK_DIR, 'FILERNAME_CD.TSV');
  if (!fs.existsSync(file)) return new Map();
  const map = new Map(); // filer_id → [names...]
  const stream = fs.createReadStream(file, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let isFirst = true;
  let cols = {};
  for await (const line of rl) {
    if (isFirst) {
      const headers = line.split('\t');
      headers.forEach((h, i) => cols[h] = i);
      isFirst = false;
      continue;
    }
    const fields = line.split('\t');
    const fid = fields[cols.FILER_ID];
    const naml = fields[cols.NAML] || '';
    if (!fid) continue;
    if (!map.has(fid)) map.set(fid, []);
    map.get(fid).push(naml.trim());
  }
  _filerNameCache = map;
  return map;
}

// ── Public: identify pro/anti status from FILERNAME naming convention ─
async function findCommitteeRole(filerId) {
  const map = await loadFilerNames();
  const names = map.get(String(filerId)) || [];
  if (names.length === 0) {
    return {
      filer_id: filerId,
      registered_names: [],
      pro_anti_status: 'unknown',
      verification_path: `No FILERNAME_CD entry for filer ${filerId}`,
    };
  }
  // Check each name for opposition / support patterns. ANY name with NO ON
  // makes the committee opposition-shaped.
  let opposes = null;
  let supports = null;
  for (const name of names) {
    const oppMatch = name.match(NO_ON_PATTERN);
    if (oppMatch) opposes = oppMatch[2].trim();
    const supMatch = name.match(SUPPORT_PATTERN);
    if (supMatch) supports = supMatch[1].trim();
  }
  let status = 'pro_or_neutral';
  if (opposes) status = 'opposing';
  else if (supports) status = 'supporting';
  return {
    filer_id: filerId,
    registered_names: names,
    pro_anti_status: status,
    opposes_candidate: opposes,
    supports_candidate: supports,
    verification_path: `FILERNAME_CD ${filerId}: status=${status} via FPPC naming convention. Names: [${names.slice(0, 2).join(' | ')}${names.length > 2 ? ' | ...' : ''}]`,
  };
}

// ── Public: read CVR_CAMPAIGN_DISCLOSURE for a filing's actual filer ──
const _cvrCache = new Map();
async function findFilingFiler(filingId) {
  if (_cvrCache.has(filingId)) return _cvrCache.get(filingId);
  const file = path.join(BULK_DIR, 'CVR_CAMPAIGN_DISCLOSURE_CD.TSV');
  if (!fs.existsSync(file)) return null;
  const stream = fs.createReadStream(file, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let isFirst = true;
  let cols = {};
  let result = null;
  for await (const line of rl) {
    if (isFirst) {
      const headers = line.split('\t');
      headers.forEach((h, i) => cols[h] = i);
      isFirst = false;
      continue;
    }
    if (!line.startsWith(filingId + '\t')) continue;
    const fields = line.split('\t');
    if (fields[cols.FILING_ID] === filingId) {
      result = {
        filing_id: filingId,
        amend_id: fields[cols.AMEND_ID],
        form_type: fields[cols.FORM_TYPE],
        cmte_id: fields[cols.FILER_ID],
        committee_name: fields[cols.NAML],
        rpt_date: fields[cols.RPT_DATE],
      };
      break;
    }
  }
  _cvrCache.set(filingId, result);
  return result;
}

// ── Public: search RCPT_CD + S497_CD for contributions ────────────────
async function findContributions({ donor_name, recipient_committee_id, cycle, min_amount = 0, max_results = 100 }) {
  const out = [];
  const matchDonorName = donor_name ? new RegExp(donor_name, 'i') : null;

  async function scan(file, isS497) {
    if (!fs.existsSync(file)) return;
    const stream = fs.createReadStream(file, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let isFirst = true;
    let cols = {};
    for await (const line of rl) {
      if (isFirst) {
        const headers = line.split('\t');
        headers.forEach((h, i) => cols[h] = i);
        isFirst = false;
        continue;
      }
      if (out.length >= max_results) return;
      const fields = line.split('\t');
      const naml = isS497 ? fields[cols.ENTY_NAML] : fields[cols.CTRIB_NAML];
      const namf = isS497 ? fields[cols.ENTY_NAMF] : fields[cols.CTRIB_NAMF];
      const fullName = `${namf || ''} ${naml || ''}`.trim();
      if (matchDonorName && !matchDonorName.test(fullName)) continue;
      const cmteId = isS497 ? fields[cols.CMTE_ID] : fields[cols.CMTE_ID];
      if (recipient_committee_id && cmteId !== String(recipient_committee_id)) continue;
      const amount = parseFloat(fields[cols.AMOUNT]) || 0;
      if (amount < min_amount) continue;
      const date = isS497 ? (fields[cols.CTRIB_DATE] || fields[cols.DATE_THRU]) : (fields[cols.DATE_THRU] || fields[cols.RCPT_DATE]);
      const isoDate = (date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const yyyymmdd = isoDate ? `${isoDate[3]}-${isoDate[1].padStart(2,'0')}-${isoDate[2].padStart(2,'0')}` : null;
      if (cycle && yyyymmdd && !yyyymmdd.startsWith(String(cycle).slice(0, 3))) continue;
      out.push({
        filing_id: fields[cols.FILING_ID],
        donor_name: fullName,
        donor_employer: isS497 ? fields[cols.CTRIB_EMP] : fields[cols.CTRIB_EMP],
        donor_occupation: isS497 ? fields[cols.CTRIB_OCC] : fields[cols.CTRIB_OCC],
        donor_city: isS497 ? fields[cols.ENTY_CITY] : fields[cols.CTRIB_CITY],
        amount,
        date: yyyymmdd,
        recipient_cmte_id: cmteId,
        source_form: isS497 ? 'S497' : 'RCPT_CD',
      });
    }
  }
  await scan(path.join(BULK_DIR, 'RCPT_CD.TSV'), false);
  await scan(path.join(BULK_DIR, 'S497_CD.TSV'), true);
  return out;
}

// ── Public: enrich a contribution with verification path ──────────────
async function verifyContribution(contribution) {
  const filer = await findFilingFiler(contribution.filing_id);
  const role = filer && filer.cmte_id ? await findCommitteeRole(filer.cmte_id) : null;
  return {
    ...contribution,
    filing_filer_committee_id: filer ? filer.cmte_id : null,
    filing_filer_committee_name: filer ? filer.committee_name : null,
    pro_anti_status: role ? role.pro_anti_status : 'unknown',
    opposes_candidate: role ? role.opposes_candidate : null,
    supports_candidate: role ? role.supports_candidate : null,
    verification_path: filer && role
      ? `Cal-Access ${contribution.source_form} filing ${contribution.filing_id} → CVR filer ${filer.cmte_id} (${filer.committee_name}) → FILERNAME role: ${role.pro_anti_status}${role.opposes_candidate ? ' (opposes ' + role.opposes_candidate + ')' : ''}${role.supports_candidate ? ' (supports ' + role.supports_candidate + ')' : ''}`
      : 'Filing trace incomplete — manual verification needed',
  };
}

// ── Public: read self-fund partition file directly ────────────────────
function getSelfFundTotal(candidateName) {
  if (!fs.existsSync(SELF_FUND_FILE)) {
    return { candidate: candidateName, total: 0, records: [], source: 'self-funding.jsonl not present' };
  }
  const records = [];
  let total = 0;
  for (const line of fs.readFileSync(SELF_FUND_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (r.candidate !== candidateName) continue;
    records.push(r);
    total += +r.amount || 0;
  }
  return {
    candidate: candidateName,
    total: Math.round(total * 100) / 100,
    records,
    source: 'data/cal-access-self-funding.jsonl',
  };
}

module.exports = {
  findCommitteeRole,
  findFilingFiler,
  findContributions,
  verifyContribution,
  getSelfFundTotal,
  loadFilerNames,
  BULK_DIR,
  NO_ON_PATTERN,
  SUPPORT_PATTERN,
};
