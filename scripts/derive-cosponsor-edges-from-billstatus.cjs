#!/usr/bin/env node
/**
 * derive-cosponsor-edges-from-billstatus.cjs
 *
 * Reads BILLSTATUS-{congress}-{type}.zip files from the bulk dir and
 * emits ONLY cosponsor-role sponsorship edges to data/derived/govinfo-
 * bill-status.jsonl via the canonical upsertEdges. Skips sponsor edges
 * (already derived from data/bills.jsonl by derive-sponsorship-edges-
 * from-bills.cjs) and skips the bills.jsonl rewrite (the canonical
 * ingest-bill-status-bulk.cjs handles that on a separate cadence).
 *
 * Authorized by ADR-0029 §10 amendment (cc_p3_209 item 7) and the
 * bulk-data download permission added by ADR-0030 §10 amendment.
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/derive-cosponsor-edges-from-billstatus.cjs
 *   node --max-old-space-size=8192 scripts/derive-cosponsor-edges-from-billstatus.cjs --write
 *   node --max-old-space-size=8192 scripts/derive-cosponsor-edges-from-billstatus.cjs --write --congress 119
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadEntities } = require('./lib/entities-store.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const BULK_DIR = 'C:/donor-map-data/bulk/Bill Status';
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const CONGRESS_FILTER = (() => {
  const i = process.argv.indexOf('--congress');
  return i === -1 ? null : process.argv[i + 1];
})();

// adm-zip lives in main repo's node_modules — resolve from there so
// this script works in worktrees too.
const MAIN_MODULES = 'C:/Users/third/donor-map-site/node_modules';
if (fs.existsSync(path.join(MAIN_MODULES, 'adm-zip'))) {
  require('module').Module._nodeModulePaths = (function (orig) {
    return function (from) { return [MAIN_MODULES].concat(orig.call(this, from)); };
  })(require('module').Module._nodeModulePaths);
}
const AdmZip = require('adm-zip');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function extractTopLevelItems(xml, parentTag) {
  const outer = xml.match(new RegExp(`<${parentTag}>([\\s\\S]*?)<\\/${parentTag}>`));
  if (!outer) return [];
  const body = outer[1];
  const items = [];
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
  if (!fs.existsSync(BULK_DIR)) {
    console.error(`[derive-cosponsor] missing bulk dir: ${BULK_DIR}`);
    process.exit(1);
  }
  console.log(`[derive-cosponsor-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);

  const ents = loadEntities();
  const bioguideToName = new Map();
  for (const e of ents) {
    const bg = e.signals?.bioguide_id;
    if (bg) bioguideToName.set(bg, e.name);
  }
  console.log(`  bioguide → vault entity: ${bioguideToName.size} politicians`);

  // ALSO load legislator-registry for fallback name lookup — many
  // historical / state politicians have bioguide records there but
  // no entities.jsonl record. The librarian's resolver mints stub
  // politician nodes for these, so the cosponsor edge resolves cleanly
  // even if the politician has no vault profile.
  const regFile = path.join(ROOT, 'data', 'legislator-registry.jsonl');
  if (fs.existsSync(regFile)) {
    let added = 0;
    for (const line of fs.readFileSync(regFile, 'utf-8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (r.bioguide && !bioguideToName.has(r.bioguide)) {
          bioguideToName.set(r.bioguide, r.name_official || r.name);
          added++;
        }
      } catch { /* skip */ }
    }
    console.log(`  + legislator-registry fallback: ${added} additional bioguides`);
  }

  const zips = fs.readdirSync(BULK_DIR)
    .filter((f) => f.startsWith('BILLSTATUS-') && f.endsWith('.zip'))
    .filter((f) => !CONGRESS_FILTER || f.includes(`-${CONGRESS_FILTER}-`))
    .sort();
  console.log(`  zips to process: ${zips.length}`);

  const edges = [];
  const unknownBioguides = new Map();
  const nowIso = new Date().toISOString();

  let zipIdx = 0;
  let totalBills = 0, totalCosponsors = 0;

  for (const zipName of zips) {
    zipIdx++;
    const zipPath = path.join(BULK_DIR, zipName);
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries().filter((e) => e.entryName.endsWith('.xml'));
    let billsInZip = 0, cosponsorsInZip = 0;

    for (const entry of entries) {
      const xml = entry.getData().toString('utf-8');
      const billXml = xml.match(/<bill>([\s\S]*?)<\/bill>/);
      if (!billXml) continue;
      const b = billXml[1];
      const type = extractTag(b, 'type');
      const number = extractTag(b, 'number');
      const congress = extractTag(b, 'congress');
      if (!type || !number || !congress) continue;
      const bid = `${type}.${number}-${congress}`;
      billsInZip++;
      const policyArea = (() => {
        const pa = b.match(/<policyArea>([\s\S]*?)<\/policyArea>/);
        return pa ? extractTag(pa[1], 'name') : null;
      })();
      const lawsBlock = b.match(/<laws>([\s\S]*?)<\/laws>/);
      const becameLaw = !!(lawsBlock && /<item>/.test(lawsBlock[1]));

      const cosponsorItems = extractTopLevelItems(b, 'cosponsors');
      const cosponsorBioguides = cosponsorItems.map((it) => extractTag(it, 'bioguideId')).filter(Boolean);

      for (const bg of cosponsorBioguides) {
        cosponsorsInZip++;
        const from = bioguideToName.get(bg);
        if (!from) {
          unknownBioguides.set(bg, (unknownBioguides.get(bg) || 0) + 1);
          continue;
        }
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
      }
    }
    totalBills += billsInZip;
    totalCosponsors += cosponsorsInZip;
    if (VERBOSE || zipIdx % 3 === 0 || zipIdx === zips.length) {
      console.log(`  [${zipIdx}/${zips.length}] ${zipName}: ${billsInZip} bills, ${cosponsorsInZip} cosponsor refs, ${edges.length.toLocaleString()} edges so far`);
    }
  }

  console.log(`\n  bills processed: ${totalBills.toLocaleString()}`);
  console.log(`  total cosponsor refs: ${totalCosponsors.toLocaleString()}`);
  console.log(`  cosponsor edges to emit: ${edges.length.toLocaleString()}`);
  console.log(`  unique unknown bioguides: ${unknownBioguides.size.toLocaleString()}`);
  if (unknownBioguides.size > 0) {
    const top = [...unknownBioguides.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`  top missing bioguides: ${top.map(([b, n]) => `${b}(${n})`).join(' ')}`);
  }

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  console.log('\n  upserting cosponsor edges in 100K chunks...');
  const CHUNK = 100_000;
  let added = 0, updated = 0, skipped = 0, invalid = 0;
  for (let i = 0; i < edges.length; i += CHUNK) {
    const slice = edges.slice(i, i + CHUNK);
    const res = upsertEdges(slice);
    added += res.added;
    updated += res.updated;
    skipped += res.skipped;
    invalid += res.invalid;
    console.log(`    ${Math.min(i + CHUNK, edges.length).toLocaleString()}/${edges.length.toLocaleString()} ... +${res.added} ~${res.updated} =${res.skipped} ✗${res.invalid}`);
  }
  console.log(`\n  done: added=${added}, updated=${updated}, skipped=${skipped}, invalid=${invalid}`);
}

main();
