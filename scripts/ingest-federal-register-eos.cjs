#!/usr/bin/env node
/**
 * ingest-federal-register-eos.cjs
 *
 * Reads FR-{YYYY}.zip files from C:/donor-map-data/bulk/Federal Register/
 * and extracts executive orders + presidential proclamations + directives.
 * Writes to data/executive-actions.jsonl (new store, separate from edges).
 *
 * Output shape (per record):
 *   { id: "EO-14134",
 *     type: "executive-order" | "proclamation" | "memo" | "directive",
 *     number: 14134,
 *     date: "2025-01-03",
 *     title: "Providing an Order of Succession Within the Department of Agriculture",
 *     president: "Biden" | "Trump" | null,
 *     fr_volume: 90, fr_number: 1,
 *     fr_citation: "90 FR 1",
 *     text_excerpt: first-500-char summary }
 *
 * Scope decision: full daily issues are 100K+ records incl. agency
 * rules/notices (noisy). This script extracts ONLY Presidential
 * Documents (EXECORD, PROCLA, PRESDOCU) — the high-signal subset.
 * Agency rulemakings are a separate pass (optional).
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/ingest-federal-register-eos.cjs
 *   node --max-old-space-size=8192 scripts/ingest-federal-register-eos.cjs --write
 *   node --max-old-space-size=8192 scripts/ingest-federal-register-eos.cjs --year 2025 --write
 */
const fs = require('fs');
const path = require('path');
const MAIN_MODULES = 'C:/Users/third/donor-map-site/node_modules';
require('module').Module._nodeModulePaths = (function (orig) {
  return function (from) { return [MAIN_MODULES].concat(orig.call(this, from)); };
})(require('module').Module._nodeModulePaths);
const AdmZip = require('adm-zip');

const ROOT = path.resolve(__dirname, '..');
const BULK_DIR = 'C:/donor-map-data/bulk/Federal Register';
const OUT_FILE = path.join(ROOT, 'data', 'executive-actions.jsonl');
const WRITE = process.argv.includes('--write');
const YEAR_FILTER = (() => {
  const i = process.argv.indexOf('--year');
  return i === -1 ? null : process.argv[i + 1];
})();

// Map year → president (best-effort for title attribution).
function presidentForDate(dateStr) {
  if (!dateStr) return null;
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7) || 0);
  if (y < 1993) return null;
  if (y < 2001) return 'Clinton';
  if (y < 2009) return 'G.W. Bush';
  if (y < 2017) return 'Obama';
  if (y < 2021) return 'Trump';
  // Trump's second term: Jan 20, 2025 onward
  if (y < 2025 || (y === 2025 && m === 1 && (Number(dateStr.slice(8, 10)) < 20))) return 'Biden';
  return 'Trump';
}

function extract(re, xml) {
  const m = xml.match(re);
  return m ? m[1] : null;
}
// Strip inline XML tags for title/text extraction.
function strip(s) {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function extractBlocks(xml, openTag, closeTag) {
  const out = [];
  const re = new RegExp(`<${openTag}[^>]*>([\\s\\S]*?)<\\/${closeTag}>`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function main() {
  console.log(`[ingest-federal-register-eos] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  if (!fs.existsSync(BULK_DIR)) { console.error(`Missing ${BULK_DIR}`); process.exit(1); }

  const zips = fs.readdirSync(BULK_DIR)
    .filter((f) => f.startsWith('FR-') && f.endsWith('.zip'))
    .filter((f) => !YEAR_FILTER || f === `FR-${YEAR_FILTER}.zip`)
    .sort();
  console.log(`  zips: ${zips.length}`);

  const records = [];
  const byType = { 'executive-order': 0, 'proclamation': 0, 'memo': 0, 'directive': 0, 'other-presidential': 0 };

  for (const zipName of zips) {
    const year = zipName.match(/FR-(\d{4})\.zip/)[1];
    const zip = new AdmZip(path.join(BULK_DIR, zipName));
    const entries = zip.getEntries().filter((e) => e.entryName.endsWith('.xml'));
    let zipRecs = 0;
    for (const entry of entries) {
      const xml = entry.getData().toString('utf-8');
      const frDate = extract(/<DATE>([^<]+)<\/DATE>/, xml);
      const frVol = extract(/<VOL>([^<]+)<\/VOL>/, xml);
      const frNum = extract(/<NO>([^<]+)<\/NO>/, xml);
      // Extract each EO block.
      for (const block of extractBlocks(xml, 'EXECORD', 'EXECORD')) {
        const header = extract(/<EXECORDR>([^<]+)<\/EXECORDR>/, block);
        if (!header) continue;
        const numMatch = header.match(/Executive Order (\d+)/i);
        const dateMatch = header.match(/of\s+([A-Z][a-z]+\s+\d+,?\s+\d{4})/i);
        const title = extract(/<HD[^>]*>([\s\S]*?)<\/HD>/, block);
        const firstFp = extract(/<FP[^>]*>([\s\S]*?)<\/FP>/, block);
        let isoDate = null;
        if (dateMatch) { const d = new Date(dateMatch[1]); if (!isNaN(d)) isoDate = d.toISOString().slice(0, 10); }
        records.push({
          id: numMatch ? `EO-${numMatch[1]}` : `EO-unknown-${records.length}`,
          type: 'executive-order',
          number: numMatch ? Number(numMatch[1]) : null,
          date: isoDate,
          title: strip(title),
          president: presidentForDate(isoDate),
          fr_volume: Number(frVol),
          fr_number: Number(frNum),
          fr_citation: `${frVol} FR ${frNum}`,
          text_excerpt: strip(firstFp).slice(0, 500),
          source_url: isoDate ? `https://www.federalregister.gov/documents/search?conditions%5Btype%5D%5B%5D=PRESDOCU&conditions%5Bpresidential_document_type%5D%5B%5D=executive_order&conditions%5Bpublication_date%5D%5Byear%5D=${year}` : null,
        });
        byType['executive-order']++;
        zipRecs++;
      }
      // Proclamations (PROCLA)
      for (const block of extractBlocks(xml, 'PROCLA', 'PROCLA')) {
        const header = extract(/<PRLNUM>([^<]+)<\/PRLNUM>/, block) || extract(/<HD[^>]*>([\s\S]*?)<\/HD>/, block);
        const numMatch = (header || '').match(/Proclamation (\d+)/i);
        const title = extract(/<HD[^>]*>([\s\S]*?)<\/HD>/, block);
        const dateMatch = (header || '').match(/of\s+([A-Z][a-z]+\s+\d+,?\s+\d{4})/i);
        let isoDate = null;
        if (dateMatch) { const d = new Date(dateMatch[1]); if (!isNaN(d)) isoDate = d.toISOString().slice(0, 10); }
        records.push({
          id: numMatch ? `PROC-${numMatch[1]}` : `PROC-unknown-${records.length}`,
          type: 'proclamation',
          number: numMatch ? Number(numMatch[1]) : null,
          date: isoDate,
          title: strip(title),
          president: presidentForDate(isoDate),
          fr_volume: Number(frVol),
          fr_number: Number(frNum),
          fr_citation: `${frVol} FR ${frNum}`,
        });
        byType['proclamation']++;
        zipRecs++;
      }
      // Presidential memoranda / determinations (PRESDOCU)
      for (const block of extractBlocks(xml, 'PRESDOCU', 'PRESDOCU')) {
        const title = extract(/<HD[^>]*>([\s\S]*?)<\/HD>/, block);
        if (!title) continue;
        let isoDate = null;
        if (frDate) {
          const d = new Date(frDate);
          if (!isNaN(d)) isoDate = d.toISOString().slice(0, 10);
        }
        records.push({
          id: `PRESDOC-${records.length}`,
          type: 'directive',
          number: null,
          date: isoDate,
          title: strip(title),
          president: presidentForDate(isoDate),
          fr_volume: Number(frVol),
          fr_number: Number(frNum),
          fr_citation: `${frVol} FR ${frNum}`,
        });
        byType['directive']++;
        zipRecs++;
      }
    }
    console.log(`  ${zipName}: ${zipRecs} presidential actions`);
  }

  console.log('\n  records by type:');
  for (const [t, n] of Object.entries(byType)) console.log(`    ${n.toString().padStart(6)} ${t}`);
  console.log(`  total: ${records.length.toLocaleString()}`);

  if (!WRITE) { console.log('\n  rerun with --write to apply.'); return; }

  const fd = fs.openSync(OUT_FILE, 'w');
  try {
    const CHUNK = 5000;
    for (let i = 0; i < records.length; i += CHUNK) {
      fs.writeSync(fd, records.slice(i, i + CHUNK).map(JSON.stringify).join('\n') + '\n');
    }
  } finally { fs.closeSync(fd); }
  console.log(`  wrote ${records.length.toLocaleString()} to ${OUT_FILE}`);
}
main();
