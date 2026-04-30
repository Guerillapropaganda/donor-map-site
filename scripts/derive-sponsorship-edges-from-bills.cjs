#!/usr/bin/env node
/**
 * derive-sponsorship-edges-from-bills.cjs
 *
 * Reads data/bills.jsonl (already-extracted bill records) and emits
 * sponsorship edges into data/derived/govinfo-bill-status.jsonl via the
 * canonical upsertEdges helper.
 *
 * Gap-fill for the case where the BILLSTATUS-{congress}-{type}.zip bulk
 * source files are not present on disk — ingest-bill-status-bulk.cjs is
 * the primary path and would also emit cosponsor edges. This script only
 * emits SPONSOR edges because data/bills.jsonl as currently shaped carries
 * `sponsor_bioguides` but only `cosponsor_count` (no cosponsor list).
 *
 * Usage:
 *   node scripts/derive-sponsorship-edges-from-bills.cjs            # dry-run
 *   node scripts/derive-sponsorship-edges-from-bills.cjs --write    # apply
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const BILLS = path.join(ROOT, 'data', 'bills.jsonl');
const WRITE = process.argv.includes('--write');

async function main() {
  if (!fs.existsSync(BILLS)) {
    console.error(`Missing: ${BILLS}`);
    process.exit(1);
  }

  // Build bioguide → vault entity name lookup.
  const ents = loadEntities();
  const bioguideToName = new Map();
  for (const e of ents) {
    const bg = e.signals?.bioguide_id;
    if (bg) bioguideToName.set(bg, e.name);
  }
  console.log(`[derive-sponsorship] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  console.log(`  bioguide → vault entity: ${bioguideToName.size} politicians`);

  const nowIso = new Date().toISOString();
  const edges = [];
  const unknownBioguides = new Map();
  let bills = 0;
  let billsWithSponsor = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(BILLS) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let bill;
    try { bill = JSON.parse(line); } catch { continue; }
    bills++;
    const sponsors = Array.isArray(bill.sponsor_bioguides) ? bill.sponsor_bioguides : [];
    if (sponsors.length === 0) continue;
    billsWithSponsor++;
    const bid = bill.id; // e.g. "HR.1-119"
    const congress = Number(bill.congress);
    const billType = bill.type;
    const number = Number(bill.number);
    const sourceUrl = `https://www.congress.gov/bill/${congress}th-congress/${(billType || '').toLowerCase()}/${number}`;

    for (const bg of sponsors) {
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
        role: 'sponsor',
        direction: 'directed',
        confidence: 1.0,
        source: 'govinfo-bill-status',
        source_url: sourceUrl,
        evidence: [`Sponsor of ${billType}${number} (${congress}th Congress)`],
        metadata: {
          congress,
          bill_type: billType,
          bill_number: number,
          policy_area: bill.policy_area || null,
          became_law: !!bill.became_law,
        },
        status: 'active',
        first_seen: nowIso,
        last_verified: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      edge.id = computeEdgeId(edge);
      edges.push(edge);
    }
  }

  console.log(`\n  bills scanned: ${bills.toLocaleString()}`);
  console.log(`  bills with sponsor: ${billsWithSponsor.toLocaleString()}`);
  console.log(`  sponsorship edges to emit: ${edges.length.toLocaleString()}`);
  console.log(`  unique unknown bioguides: ${unknownBioguides.size.toLocaleString()}`);
  if (unknownBioguides.size > 0) {
    const top = [...unknownBioguides.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`  top missing bioguides: ${top.map(([b, n]) => `${b}(${n})`).join(' ')}`);
  }

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  console.log('\n  upserting sponsorship edges in 100K chunks...');
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
    if (res.errors && res.errors.length && invalid - res.invalid === 0) {
      console.log(`    sample invalid: ${JSON.stringify(res.errors[0])}`);
    }
  }
  console.log(`\n  done: added=${added}, updated=${updated}, skipped=${skipped}, invalid=${invalid}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
