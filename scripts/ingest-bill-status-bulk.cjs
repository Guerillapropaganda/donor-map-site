#!/usr/bin/env node
/**
 * ingest-bill-status-bulk.cjs
 *
 * Reads BILLSTATUS-{congress}-{type}.zip files from
 * C:/donor-map-data/bulk/Bill Status/ and emits:
 *
 *   - data/bills.jsonl                       — structured bill records
 *   - data/derived/bill-sponsorship.jsonl    — sponsor/cosponsor edges
 *
 * Edge shape:
 *   { from: <sponsor bioguide vault-name>,
 *     to: "<type>.<number>-<congress>",     e.g. "HR.1-119"
 *     type: 'sponsorship',
 *     role: 'sponsor' | 'cosponsor',
 *     source: 'govinfo-bill-status' }
 *
 * Bill record shape (data/bills.jsonl):
 *   { id, congress, type, number, introduced_date, title, short_title,
 *     policy_area, subjects, sponsor_bioguide, cosponsor_bioguides,
 *     became_law, action_count, latest_action_date }
 *
 * Uses regex extraction (not full XML parse) — matches the existing
 * ingest-congress-bills-bulk.cjs pattern and avoids dep issues.
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/ingest-bill-status-bulk.cjs
 *   node --max-old-space-size=8192 scripts/ingest-bill-status-bulk.cjs --write
 *   node --max-old-space-size=8192 scripts/ingest-bill-status-bulk.cjs --congress 119 --write
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('./lib/entities-store.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

// AdmZip is in the main repo's node_modules, not the worktree's.
// Resolve via absolute path so this script runs in both locations.
const MAIN_MODULES = 'C:/Users/third/donor-map-site/node_modules';
if (fs.existsSync(path.join(MAIN_MODULES, 'adm-zip'))) {
  require('module').Module._nodeModulePaths = (function (orig) {
    return function (from) { return [MAIN_MODULES].concat(orig.call(this, from)); };
  })(require('module').Module._nodeModulePaths);
}
const AdmZip = require('adm-zip');

const ROOT = path.resolve(__dirname, '..');
const BULK_DIR = 'C:/donor-map-data/bulk/Bill Status';
const BILLS_OUT = path.join(ROOT, 'data', 'bills.jsonl');
const WRITE = process.argv.includes('--write');
const CONGRESS_FILTER = (() => {
  const i = process.argv.indexOf('--congress');
  return i === -1 ? null : process.argv[i + 1];
})();
const VERBOSE = process.argv.includes('--verbose');

// Regex extractors matching the pattern in ingest-congress-bills-bulk.cjs
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}
function extractAllTags(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}
// Extract <item> blocks but ONLY the ones directly inside a given parent tag.
// Used so we get the BILL's sponsors, not sponsors of related bills that
// nest under <relatedBills><item><sponsors><item>.
function extractTopLevelItems(xml, parentTag) {
  const outer = xml.match(new RegExp(`<${parentTag}>([\\s\\S]*?)</${parentTag}>`));
  if (!outer) return [];
  // Only match <item>...</item> at depth 1 (not nested).
  // Quick-and-dirty: split on top-level </item> boundaries.
  const body = outer[1];
  const items = [];
  // We need balanced <item>...</item> so use a depth-tracking pass.
  let depth = 0, start = -1;
  const re = /<\/?item>/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[0] === '<item>') {
      if (depth === 0) start = m.index + 6;
      depth++;
    } else {
      depth--;
      if (depth === 0 && start !== -1) {
        items.push(body.slice(start, m.index));
        start = -1;
      }
    }
  }
  return items;
}

function main() {
  // Build bioguide → vault politician name index (for edge from-name resolution)
  const ents = loadEntities();
  const bioguideToName = new Map();
  for (const e of ents) {
    const bg = e.signals?.bioguide_id;
    if (bg) bioguideToName.set(bg, e.name);
  }
  console.log(`[ingest-bill-status-bulk] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  console.log(`  bioguide → vault name: ${bioguideToName.size} politicians`);

  // Enumerate zips
  if (!fs.existsSync(BULK_DIR)) { console.error(`Missing: ${BULK_DIR}`); process.exit(1); }
  const zips = fs.readdirSync(BULK_DIR)
    .filter((f) => f.startsWith('BILLSTATUS-') && f.endsWith('.zip'))
    .filter((f) => !CONGRESS_FILTER || f.includes(`-${CONGRESS_FILTER}-`))
    .sort();
  console.log(`  zips to process: ${zips.length}`);

  const billRecords = [];
  const edges = [];
  const unknownBioguides = new Map();
  const nowIso = new Date().toISOString();

  let zipIdx = 0;
  for (const zipName of zips) {
    zipIdx++;
    const zipPath = path.join(BULK_DIR, zipName);
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries().filter((e) => e.entryName.endsWith('.xml'));
    let bills = 0, edgesInZip = 0;
    for (const entry of entries) {
      const xml = entry.getData().toString('utf-8');
      // Parse one bill
      const billXml = xml.match(/<bill>([\s\S]*?)<\/bill>/);
      if (!billXml) continue;
      const b = billXml[1];
      const type = extractTag(b, 'type');
      const number = extractTag(b, 'number');
      const congress = extractTag(b, 'congress');
      if (!type || !number || !congress) continue;
      const bid = `${type}.${number}-${congress}`;
      const introDate = extractTag(b, 'introducedDate');
      const title = extractTag(b, 'title');
      const policyArea = (() => {
        const pa = b.match(/<policyArea>([\s\S]*?)<\/policyArea>/);
        return pa ? extractTag(pa[1], 'name') : null;
      })();
      // Subjects: only count legislativeSubjects (skip the nested policyArea).
      const ls = b.match(/<legislativeSubjects>([\s\S]*?)<\/legislativeSubjects>/);
      const subjects = ls ? extractAllTags(ls[1], 'name') : [];
      // Sponsors: top-level <sponsors> block.
      const sponsorItems = extractTopLevelItems(b, 'sponsors');
      const cosponsorItems = extractTopLevelItems(b, 'cosponsors');
      // <laws> present if enacted.
      const lawsBlock = b.match(/<laws>([\s\S]*?)<\/laws>/);
      const becameLaw = !!(lawsBlock && /<item>/.test(lawsBlock[1]));

      const sponsorBioguides = sponsorItems.map((it) => extractTag(it, 'bioguideId')).filter(Boolean);
      const cosponsorBioguides = cosponsorItems.map((it) => extractTag(it, 'bioguideId')).filter(Boolean);

      billRecords.push({
        id: bid,
        congress: Number(congress),
        type,
        number: Number(number),
        introduced_date: introDate,
        title: title ? title.replace(/\s+/g, ' ').slice(0, 500) : null,
        policy_area: policyArea,
        subjects,
        sponsor_bioguides: sponsorBioguides,
        cosponsor_count: cosponsorBioguides.length,
        became_law: becameLaw,
      });
      bills++;

      // Emit edges.
      for (const bg of sponsorBioguides) {
        const from = bioguideToName.get(bg);
        if (!from) { unknownBioguides.set(bg, (unknownBioguides.get(bg) || 0) + 1); continue; }
        const edge = {
          from,
          to: bid,
          from_type: 'politician',
          to_type: 'bill',
          type: 'sponsorship',
          role: 'sponsor',
          direction: 'directed',
          confidence: 1.0,
          source: 'govinfo-bill-status',
          source_url: `https://www.congress.gov/bill/${congress}th-congress/${type.toLowerCase()}/${number}`,
          evidence: [`Sponsor of ${type}${number} (${congress}th Congress)`],
          metadata: { congress: Number(congress), bill_type: type, bill_number: Number(number), policy_area: policyArea, became_law: becameLaw },
          status: 'active',
          first_seen: nowIso, last_verified: nowIso, created_at: nowIso, updated_at: nowIso,
        };
        edge.id = computeEdgeId(edge);
        edges.push(edge);
        edgesInZip++;
      }
      for (const bg of cosponsorBioguides) {
        const from = bioguideToName.get(bg);
        if (!from) { unknownBioguides.set(bg, (unknownBioguides.get(bg) || 0) + 1); continue; }
        const edge = {
          from,
          to: bid,
          from_type: 'politician',
          to_type: 'bill',
          type: 'sponsorship',
          role: 'cosponsor',
          direction: 'directed',
          confidence: 1.0,
          source: 'govinfo-bill-status',
          source_url: `https://www.congress.gov/bill/${congress}th-congress/${type.toLowerCase()}/${number}`,
          evidence: [`Cosponsor of ${type}${number} (${congress}th Congress)`],
          metadata: { congress: Number(congress), bill_type: type, bill_number: Number(number), policy_area: policyArea, became_law: becameLaw },
          status: 'active',
          first_seen: nowIso, last_verified: nowIso, created_at: nowIso, updated_at: nowIso,
        };
        edge.id = computeEdgeId(edge);
        edges.push(edge);
        edgesInZip++;
      }
    }
    if (VERBOSE || zipIdx % 5 === 0 || zipIdx === zips.length) {
      console.log(`  [${zipIdx}/${zips.length}] ${zipName}: ${bills} bills, ${edgesInZip} edges`);
    }
  }

  console.log(`\n  total bills: ${billRecords.length.toLocaleString()}`);
  console.log(`  total edges: ${edges.length.toLocaleString()}`);
  console.log(`  unique unknown bioguides: ${unknownBioguides.size}`);
  if (VERBOSE) {
    const top = [...unknownBioguides.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(`  top missing bioguides: ${top.map(([b, n]) => `${b}(${n})`).join(' ')}`);
  }

  if (!WRITE) { console.log('\n  rerun with --write to apply.'); return; }

  // Write bills.jsonl (stream, 10K per chunk)
  console.log('\n  writing data/bills.jsonl...');
  const fd = fs.openSync(BILLS_OUT, 'w');
  try {
    for (let i = 0; i < billRecords.length; i += 10000) {
      const chunk = billRecords.slice(i, i + 10000).map(JSON.stringify).join('\n') + '\n';
      fs.writeSync(fd, chunk);
    }
  } finally { fs.closeSync(fd); }
  console.log(`  wrote ${billRecords.length.toLocaleString()} bills to ${BILLS_OUT}`);

  // Upsert edges in 100K chunks to avoid heap spikes
  console.log('\n  upserting sponsorship edges...');
  const CHUNK = 100_000;
  let added = 0, updated = 0, invalid = 0;
  for (let i = 0; i < edges.length; i += CHUNK) {
    const slice = edges.slice(i, i + CHUNK);
    const res = upsertEdges(slice, { source: 'govinfo-bill-status' });
    added += res.added; updated += res.updated; invalid += res.invalid;
    console.log(`    ${Math.min(i + CHUNK, edges.length).toLocaleString()}/${edges.length.toLocaleString()} ... +${res.added} / ~${res.updated} / ✗${res.invalid}`);
  }
  console.log(`\n  total: added=${added}, updated=${updated}, invalid=${invalid}`);
}
main();
