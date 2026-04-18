#!/usr/bin/env node
/**
 * ingest-irs-990-bulk.cjs
 *
 * Selectively extracts IRS Form 990 XML filings relevant to the Donor Map.
 * The bulk archive is ~25GB of XML across ~5M filings (every tax-exempt
 * org). We care about ~228 EINs. Filter early, parse late.
 *
 * Strategy:
 *   1. Load EINs of interest from data/entities.jsonl (signals.ein).
 *   2. For each IRS zip, extract contents to temp dir.
 *   3. For each XML file, fast-scan first ~2KB for <EIN>...</EIN>.
 *      99%+ early-reject on EIN mismatch without parsing the full doc.
 *   4. For the handful of matching files per zip, read full XML and
 *      extract: filer info, Schedule I grants, Schedule J comp,
 *      Part VII officers.
 *   5. Write to data/nonprofit-990.jsonl + data/nonprofit-grants.jsonl.
 *
 * Output:
 *   data/nonprofit-990.jsonl       — one row per (EIN, tax_year) filing
 *   data/nonprofit-grants.jsonl    — one row per Schedule I grant
 *
 * Resume-friendly via per-zip checkpoint (ADR-0014).
 *
 * Usage:
 *   node scripts/ingest-irs-990-bulk.cjs
 *   node scripts/ingest-irs-990-bulk.cjs --resume
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  loadCheckpoint, markComplete, cleanupPartials, fmtBytes,
  DERIVED_ROOT, ensureDerivedDirs,
} = require('./lib/fec-ingest-helpers.cjs');

const ROOT = path.resolve(__dirname, '..');
const PIPELINE = 'irs-990';
const BULK_DIR = 'C:\\donor-map-data\\bulk\\IRS 990';
const FILINGS_OUT = path.join(ROOT, 'data', 'nonprofit-990.jsonl');
const GRANTS_OUT = path.join(ROOT, 'data', 'nonprofit-grants.jsonl');

const args = process.argv.slice(2);
const RESUME = args.includes('--resume');

// ─── Load EINs of interest ──────────────────────────────────
function loadEinsOfInterest() {
  const eins = new Set();
  const byEin = new Map();
  for (const line of fs.readFileSync(path.join(ROOT, 'data', 'entities.jsonl'), 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      const ein = r.signals && r.signals.ein;
      if (ein) {
        const clean = String(ein).replace(/\D/g, '');
        if (clean.length === 9) {
          eins.add(clean);
          byEin.set(clean, { entity_id: r.id, name: r.name, type: r.entity_type });
        }
      }
    } catch {}
  }
  return { eins, byEin };
}

// ─── XML parsing helpers ─────────────────────────────────────
// 990 XML uses an eFile schema with namespaced elements. Simple regex
// extraction is safer + faster than a full DOM parse for millions of
// files.

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractAll(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

function extractEinFast(xml) {
  // First EIN in document is the filer's. Schema places it near top
  // inside <Filer><EIN>...</EIN></Filer>.
  const m = xml.match(/<EIN[^>]*>(\d{9})<\/EIN>/);
  return m ? m[1] : null;
}

function parse990(xml, einMeta) {
  const filer = extractTag(xml, 'Filer') || '';
  const filerName =
    extractTag(filer, 'BusinessNameLine1Txt') ||
    extractTag(filer, 'BusinessNameLine1') ||
    extractTag(xml, 'OrganizationName') ||
    einMeta.name;
  const taxPeriodEnd = extractTag(xml, 'TaxPeriodEndDt') || extractTag(xml, 'TaxPeriodEndDate');
  const taxYear = taxPeriodEnd ? parseInt(taxPeriodEnd.slice(0, 4), 10) : null;
  const returnType = extractTag(xml, 'ReturnTypeCd') || extractTag(xml, 'ReturnType') || null;

  const totalRevenue = parseFloat(extractTag(xml, 'TotalRevenueAmt') || extractTag(xml, 'TotalRevenue') || '0') || 0;
  const totalExpenses = parseFloat(extractTag(xml, 'TotalFunctionalExpensesAmt') || extractTag(xml, 'TotalExpenses') || '0') || 0;
  const totalAssets = parseFloat(extractTag(xml, 'TotalAssetsEOYAmt') || extractTag(xml, 'TotalAssetsEOY') || '0') || 0;
  const contribRevenue = parseFloat(extractTag(xml, 'TotalContributionsAmt') || extractTag(xml, 'TotalContributions') || '0') || 0;

  // Schedule I (grants to other orgs). The 990 schedule's recipient entries.
  const grants = [];
  // Grants to US orgs (schedule I part II)
  const grantBlocks = extractAll(xml, 'RecipientTable');
  for (const block of grantBlocks) {
    const recName =
      extractTag(block, 'RecipientBusinessName/BusinessNameLine1Txt') ||
      extractTag(block, 'BusinessNameLine1Txt') ||
      extractTag(block, 'RecipientPersonNm') ||
      extractTag(block, 'RecipientNameBusiness') ||
      null;
    const recEin = extractTag(block, 'RecipientEIN');
    const recIrsSection = extractTag(block, 'IRCSectionDesc');
    const cashAmt = parseFloat(extractTag(block, 'CashGrantAmt') || '0') || 0;
    const nonCashAmt = parseFloat(extractTag(block, 'NonCashAssistanceAmt') || '0') || 0;
    const purpose = extractTag(block, 'PurposeOfGrantTxt') || extractTag(block, 'PurposeOfGrant') || null;
    if (recName && (cashAmt + nonCashAmt > 0)) {
      grants.push({
        recipient_name: recName,
        recipient_ein: recEin,
        recipient_irs_section: recIrsSection,
        cash: cashAmt,
        non_cash: nonCashAmt,
        total: cashAmt + nonCashAmt,
        purpose,
      });
    }
  }

  // Top 5 officers / key employees (Part VII A)
  const officers = [];
  const officerBlocks = extractAll(xml, 'Form990PartVIISectionAGrp');
  for (const block of officerBlocks.slice(0, 10)) {
    const name = extractTag(block, 'PersonNm') || extractTag(block, 'OfficerName');
    const title = extractTag(block, 'TitleTxt') || extractTag(block, 'Title');
    const compensation = parseFloat(extractTag(block, 'ReportableCompFromOrgAmt') || '0') || 0;
    if (name) officers.push({ name, title, compensation });
  }

  return {
    ein: einMeta.ein_full,
    entity_id: einMeta.entity_id,
    vault_name: einMeta.name,
    vault_entity_type: einMeta.type,
    filer_name: filerName,
    tax_year: taxYear,
    tax_period_end: taxPeriodEnd,
    return_type: returnType,
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    total_assets: totalAssets,
    contribution_revenue: contribRevenue,
    grant_count: grants.length,
    grant_total: grants.reduce((a, b) => a + b.total, 0),
    officer_count: officers.length,
    officers,
    grants,
  };
}

// ─── Main loop ──────────────────────────────────────────────

function listZips() {
  return fs.readdirSync(BULK_DIR).filter(f => f.endsWith('.zip')).sort();
}

function appendLine(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}

(async function main() {
  ensureDerivedDirs();
  const t0 = Date.now();
  const { eins, byEin } = loadEinsOfInterest();
  console.log(`[ingest-irs-990-bulk] ${RESUME ? 'RESUME' : 'FRESH'}. ${eins.size} EINs of interest.`);

  if (!RESUME) {
    if (fs.existsSync(FILINGS_OUT)) fs.rmSync(FILINGS_OUT);
    if (fs.existsSync(GRANTS_OUT)) fs.rmSync(GRANTS_OUT);
    const cp = path.join(DERIVED_ROOT, '.checkpoints', `${PIPELINE}.json`);
    if (fs.existsSync(cp)) fs.rmSync(cp);
  }
  cleanupPartials();

  const zips = listZips();
  const completed = new Set(loadCheckpoint(PIPELINE).completed);
  const pending = zips.filter(z => !completed.has(z));
  console.log(`  zips: total=${zips.length} completed=${completed.size} pending=${pending.length}`);

  let totalFilings = 0, totalGrants = 0;

  for (const zip of pending) {
    const zipPath = path.join(BULK_DIR, zip);
    const sizeBytes = fs.statSync(zipPath).size;
    process.stdout.write(`  ${zip} (${fmtBytes(sizeBytes)})... `);
    const zt0 = Date.now();

    // Extract to temp dir
    const tmp = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `irs990-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    fs.mkdirSync(tmp, { recursive: true });

    try {
      execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmp}' -Force"`, { stdio: 'pipe' });

      // Find the extracted directory (usually a single subfolder)
      let xmlDir = tmp;
      const entries = fs.readdirSync(tmp, { withFileTypes: true });
      if (entries.length === 1 && entries[0].isDirectory()) xmlDir = path.join(tmp, entries[0].name);

      // Walk XMLs
      let scanned = 0, matched = 0, grantsInZip = 0;
      const xmlFiles = fs.readdirSync(xmlDir).filter(f => f.endsWith('.xml'));
      for (const f of xmlFiles) {
        scanned++;
        const full = path.join(xmlDir, f);
        // Fast EIN peek: read first 2KB
        const fd = fs.openSync(full, 'r');
        const buf = Buffer.alloc(4096);
        fs.readSync(fd, buf, 0, 4096, 0);
        fs.closeSync(fd);
        const head = buf.toString('utf-8');
        const ein = extractEinFast(head);
        if (!ein || !eins.has(ein)) continue;

        // Match — read full file and parse
        const xml = fs.readFileSync(full, 'utf-8');
        const meta = byEin.get(ein);
        try {
          const filing = parse990(xml, { ...meta, ein_full: ein });
          appendLine(FILINGS_OUT, filing);
          for (const g of filing.grants) {
            appendLine(GRANTS_OUT, {
              grantor_ein: ein,
              grantor_name: filing.filer_name,
              tax_year: filing.tax_year,
              recipient_name: g.recipient_name,
              recipient_ein: g.recipient_ein,
              recipient_irs_section: g.recipient_irs_section,
              amount: g.total,
              purpose: g.purpose,
            });
          }
          matched++;
          grantsInZip += filing.grants.length;
          totalFilings++;
          totalGrants += filing.grants.length;
        } catch (e) {
          // Skip filings that fail to parse
        }
      }
      markComplete(PIPELINE, zip);
      console.log(`scanned=${scanned} matched=${matched} grants=${grantsInZip} in ${((Date.now() - zt0) / 1000).toFixed(1)}s`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  console.log(`\n[done] ${((Date.now() - t0) / 60000).toFixed(1)} min. ${totalFilings} filings, ${totalGrants} grants.`);
  console.log(`[out] ${FILINGS_OUT}`);
  console.log(`[out] ${GRANTS_OUT}`);
})().catch(err => { console.error(err); process.exit(1); });
