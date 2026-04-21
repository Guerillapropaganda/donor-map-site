#!/usr/bin/env node
/**
 * ingest-plaw-bulk.cjs
 *
 * Reads PLAW-{congress}-{public|private}.zip from
 * C:/donor-map-data/bulk/PLAW/ to enrich data/bills.jsonl with a
 * became_law_confirmed flag + approved_date + public_law_number.
 *
 * PLAW XML is in USLM format. We only need the metadata block:
 *   - congress
 *   - docNumber (public law number, e.g. "1" for PL 118-1)
 *   - approvedDate
 *   - citableAs (e.g. "Public Law 118–1")
 *   - references to the originating bill (e.g. H.R. 26 → PL 118-1)
 *
 * The bill → law linkage is usually referenced in the law's preamble
 * text ("To amend ... as introduced in H.R. 26"). We extract that
 * pattern via regex and update bills.jsonl accordingly.
 *
 * PLAW adds NO new edges — it's a metadata enrichment pass on the
 * bills store emitted by ingest-bill-status-bulk.cjs.
 *
 * Usage:
 *   node scripts/ingest-plaw-bulk.cjs
 *   node scripts/ingest-plaw-bulk.cjs --write
 */
const fs = require('fs');
const path = require('path');
const MAIN_MODULES = 'C:/Users/third/donor-map-site/node_modules';
require('module').Module._nodeModulePaths = (function (orig) {
  return function (from) { return [MAIN_MODULES].concat(orig.call(this, from)); };
})(require('module').Module._nodeModulePaths);
const AdmZip = require('adm-zip');

const ROOT = path.resolve(__dirname, '..');
const BULK_DIR = 'C:/donor-map-data/bulk/PLAW';
const BILLS_FILE = path.join(ROOT, 'data', 'bills.jsonl');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// Bill-reference extraction. PLAW XMLs commonly cite the originating
// bill like: "H.R. 26", "S. 870", "H.J. Res. 7". Normalize to our
// bills.jsonl key form "HR.26-118".
function extractBillRef(xml, congress) {
  const patterns = [
    /\bH\.\s*R\.\s*(\d+)\b/i,
    /\bS\.\s*(\d+)\b(?!\s*Res)/i,   // avoid matching "S. Res."
    /\bH\.\s*J\.\s*Res\.?\s*(\d+)\b/i,
    /\bS\.\s*J\.\s*Res\.?\s*(\d+)\b/i,
  ];
  const types = ['HR', 'S', 'HJRES', 'SJRES'];
  for (let i = 0; i < patterns.length; i++) {
    const m = xml.match(patterns[i]);
    if (m) return `${types[i]}.${m[1]}-${congress}`;
  }
  return null;
}

function main() {
  console.log(`[ingest-plaw-bulk] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  if (!fs.existsSync(BILLS_FILE)) {
    console.error(`Missing ${BILLS_FILE}. Run ingest-bill-status-bulk.cjs --write first.`);
    process.exit(1);
  }
  if (!fs.existsSync(BULK_DIR)) { console.error(`Missing ${BULK_DIR}`); process.exit(1); }

  // Load existing bills.
  const bills = new Map();
  for (const line of fs.readFileSync(BILLS_FILE, 'utf-8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { const b = JSON.parse(line); bills.set(b.id, b); } catch {}
  }
  console.log(`  loaded bills: ${bills.size.toLocaleString()}`);

  const zips = fs.readdirSync(BULK_DIR).filter((f) => f.startsWith('PLAW-') && f.endsWith('.zip')).sort();
  console.log(`  PLAW zips: ${zips.length}`);

  const updates = [];
  const unmatchedLaws = [];

  for (const zipName of zips) {
    const m = zipName.match(/PLAW-(\d+)-(public|private)\.zip/);
    if (!m) continue;
    const congress = m[1];
    const kind = m[2];
    const zip = new AdmZip(path.join(BULK_DIR, zipName));
    const entries = zip.getEntries().filter((e) => e.entryName.endsWith('.xml'));
    let parsed = 0, matched = 0;
    for (const entry of entries) {
      const xml = entry.getData().toString('utf-8');
      // Law number from filename: PLAW-118publ1.xml → 1
      const fn = entry.entryName;
      const lawNumMatch = fn.match(/(?:publ|pvtl)(\d+)\.xml$/);
      if (!lawNumMatch) continue;
      const lawNum = lawNumMatch[1];
      // Approval date + bill ref — scan just the first few KB (metadata block).
      const header = xml.slice(0, 6000);
      const approvedDate = (header.match(/<approvedDate>([^<]+)<\/approvedDate>/) || [])[1]
        || (header.match(/<dc:date>([^<]+)<\/dc:date>/) || [])[1]
        || null;
      const billRef = extractBillRef(header, congress);
      parsed++;
      if (!billRef) { unmatchedLaws.push(`PL ${congress}-${lawNum} (${kind})`); continue; }
      const existing = bills.get(billRef);
      if (!existing) { unmatchedLaws.push(`PL ${congress}-${lawNum} → ${billRef} (no bills record)`); continue; }
      matched++;
      updates.push({
        bill_id: billRef,
        public_law_number: `${congress}-${lawNum}`,
        public_law_kind: kind,
        approved_date: approvedDate,
      });
    }
    console.log(`  ${zipName}: ${parsed} laws parsed, ${matched} matched to bills`);
  }

  console.log(`\n  updates to apply: ${updates.length.toLocaleString()}`);
  console.log(`  unmatched laws:   ${unmatchedLaws.length.toLocaleString()}`);
  if (VERBOSE) {
    console.log('  first 10 unmatched:', unmatchedLaws.slice(0, 10).join(', '));
  }

  if (!WRITE) { console.log('\n  rerun with --write to apply.'); return; }

  // Apply: rewrite bills.jsonl with law metadata added.
  const updMap = new Map(updates.map((u) => [u.bill_id, u]));
  const fd = fs.openSync(BILLS_FILE, 'w');
  let touched = 0;
  try {
    const CHUNK = 5000;
    let buf = '';
    let i = 0;
    for (const [bid, bill] of bills) {
      const u = updMap.get(bid);
      if (u) {
        bill.public_law_number = u.public_law_number;
        bill.public_law_kind = u.public_law_kind;
        bill.approved_date = u.approved_date;
        bill.became_law = true;
        touched++;
      }
      buf += JSON.stringify(bill) + '\n';
      i++;
      if (i % CHUNK === 0) { fs.writeSync(fd, buf); buf = ''; }
    }
    if (buf) fs.writeSync(fd, buf);
  } finally { fs.closeSync(fd); }
  console.log(`  wrote ${bills.size.toLocaleString()} bills (${touched} enriched with law metadata)`);
}
main();
