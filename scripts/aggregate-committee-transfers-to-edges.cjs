#!/usr/bin/env node
/**
 * aggregate-committee-transfers-to-edges.cjs
 *
 * Turns the FEC `oth` committee-to-committee transfer file
 * (C:\donor-map-data\fec\oth-transfers.jsonl, ~6.9M rows) into
 * donor→recipient monetary edges. Committee-to-committee flows are
 * the dominant receipt type for party committees (RNC, DCCC, NRCC,
 * DSCC, NRSC) and joint-fundraising committees (Trump Victory, Harris
 * Victory Fund, Save America PAC). verify-committee-receipts showed
 * these consistently under-reporting by 70-99% because their transfer-
 * in dollars were never emitted as edges.
 *
 * Design decisions:
 *
 *   Aggregation: sum by (src_cmte, dst_cmte, cycle). 6.9M rows
 *   collapse to ~50-100K edges.
 *
 *   Resolution: both src and dst must resolve to a vault entity.
 *   Unresolvable pairs are dropped rather than emitted as orphan
 *   edges — the party committees and big PACs all have registry
 *   entries, so this drops only obscure state-level PAC-to-PAC
 *   chatter.
 *
 *   Role classification: most oth transfers are routine affiliated-
 *   committee rebalancing. We keep role=null and rely on txn_tp to
 *   give humans a hint in the evidence string (24G = affiliated
 *   transfer, 24A = IE-oppose, 24E = IE-support, etc.).
 *
 *   Self-edges: if src_cmte and dst_cmte both resolve to the same
 *   vault entity (MAGA Inc's multiple CMTE_IDs for example), we skip
 *   — it's intra-entity accounting, not an external flow.
 *
 * Usage:
 *   node scripts/aggregate-committee-transfers-to-edges.cjs             # dry-run
 *   node scripts/aggregate-committee-transfers-to-edges.cjs --write     # apply
 *   node scripts/aggregate-committee-transfers-to-edges.cjs --min-amount 10000
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { loadEntities } = require('./lib/entities-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';
const OTH_FILE = path.join(FEC_ROOT, 'oth-transfers.jsonl');
const REGISTRY_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');
const MIN_AMOUNT = parseFloat(argVal('--min-amount', '1000'));

(async function main() {
  console.log(`[aggregate-committee-transfers-to-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'} min=$${MIN_AMOUNT}\n`);

  // Build cmte_id → vault entity. Include politician campaign committees
  // (sync-campaign-committees attached signals.fec_committee_ids to them)
  // BUT route transfers TO those IDs to the CAMPAIGN COMMITTEE entity if
  // one exists, not to the politician directly — transfers are official
  // committee flows, not "donor gave to politician."
  const ents = loadEntities();
  const cmteToEntity = new Map();
  // First pass: stub campaign committees + super PACs + other donors
  for (const e of ents) {
    if (e.entity_type === 'politician') continue;
    if (!e.signals) continue;
    if (e.signals.fec_committee_id) cmteToEntity.set(e.signals.fec_committee_id, e);
    if (Array.isArray(e.signals.fec_committee_ids)) {
      for (const cid of e.signals.fec_committee_ids) {
        if (!cmteToEntity.has(cid)) cmteToEntity.set(cid, e);
      }
    }
  }
  // Second pass: registry vault_profile fallback (for committees registered
  // in fec-committee-registry.json but without a stub entity).
  // Third pass: fec_name → entity name case-insensitive match when
  // the registry path is stale (Fairshake PAC moved directories but the
  // registry still points at the old path).
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  const entByPath = new Map(ents.filter((e) => e.profile_path).map((e) => [e.profile_path, e]));
  const entByLowerName = new Map(ents.map((e) => [e.name.toLowerCase(), e]));
  for (const [cmteId, r] of Object.entries(registry)) {
    if (cmteToEntity.has(cmteId)) continue;
    if (r.vault_profile && entByPath.has(r.vault_profile)) {
      const ent = entByPath.get(r.vault_profile);
      if (ent.entity_type !== 'politician') cmteToEntity.set(cmteId, ent);
      continue;
    }
    // Fallback: case-insensitive match of fec_name against any entity name
    if (r.fec_name) {
      const ent = entByLowerName.get(r.fec_name.toLowerCase())
              || entByLowerName.get(r.fec_name.toLowerCase() + ' pac');
      if (ent && ent.entity_type !== 'politician') cmteToEntity.set(cmteId, ent);
    }
  }
  console.log(`  resolvable committees: ${cmteToEntity.size}`);

  // Also load the FEC committee-master so unresolved src/dst sides can
  // emit with the raw FEC committee name (rather than being dropped).
  // RNC receives $600M+ in 2020 transfers; most sources are obscure
  // state-level PACs with no vault profile. Dropping those flows leaves
  // RNC's receipts severely under-reported. Keeping them — with raw
  // FEC name on the unresolved side — matches the indiv-to-edges
  // pattern of emitting raw donor names.
  console.log('  loading committee-master for raw name fallback...');
  const cmteToRawName = new Map();
  const masterRl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'committee-master.jsonl')) });
  for await (const line of masterRl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.id && r.name) cmteToRawName.set(r.id, r.name);
    } catch {}
  }
  console.log(`  committee-master names loaded: ${cmteToRawName.size}`);

  // Build title index for to_type denormalization
  const { buildTitleIndex } = require('./lib/relationship-edge-validator.cjs');
  const titleIndex = buildTitleIndex(path.join(ROOT, 'content'));
  function titleType(name) {
    const entry = titleIndex.get(name);
    if (!entry) return null;
    if (Array.isArray(entry)) return entry[0]?.type || null;
    return entry.type || null;
  }

  // Aggregate by (src_entity_name, dst_entity_name, cycle).
  const agg = new Map();
  let scanned = 0, below = 0, resolvedBoth = 0, selfSkipped = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(OTH_FILE) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    scanned++;
    const amt = Number(r.amount) || 0;
    if (amt < MIN_AMOUNT) { below++; continue; }
    const srcEnt = cmteToEntity.get(r.src_cmte_id);
    const dstEnt = cmteToEntity.get(r.dst_cmte_id);
    // Drop only when NEITHER side resolves — keep flows with one
    // resolved side and the other as raw FEC committee name.
    if (!srcEnt && !dstEnt) continue;
    const srcName = srcEnt ? srcEnt.name : cmteToRawName.get(r.src_cmte_id);
    const dstName = dstEnt ? dstEnt.name : cmteToRawName.get(r.dst_cmte_id);
    if (!srcName || !dstName) continue; // missing in committee-master
    if (srcName === dstName) { selfSkipped++; continue; }
    resolvedBoth++;
    const cycle = String(r.cycle || '');
    const key = `${srcName}|${dstName}|${cycle}`;
    if (!agg.has(key)) {
      agg.set(key, {
        from: srcName,
        to: dstName,
        from_type: (srcEnt ? (titleType(srcName) || srcEnt.entity_type) : 'donor') || 'donor',
        to_type: (dstEnt ? (titleType(dstName) || dstEnt.entity_type) : 'donor') || 'donor',
        cycle,
        amount: 0,
        count: 0,
        txnTypes: new Set(),
        srcCmteIds: new Set(),
        dstCmteIds: new Set(),
      });
    }
    const a = agg.get(key);
    a.amount += amt;
    a.count++;
    if (r.txn_tp) a.txnTypes.add(r.txn_tp);
    a.srcCmteIds.add(r.src_cmte_id);
    a.dstCmteIds.add(r.dst_cmte_id);
  }

  console.log(`  scanned: ${scanned.toLocaleString()}`);
  console.log(`  below $${MIN_AMOUNT}: ${below.toLocaleString()}`);
  console.log(`  intra-entity (skipped): ${selfSkipped.toLocaleString()}`);
  console.log(`  resolved on both sides: ${resolvedBoth.toLocaleString()}`);
  console.log(`  unique edges to emit: ${agg.size.toLocaleString()}`);

  // Build edges
  const now = new Date().toISOString();
  const edges = [];
  for (const a of agg.values()) {
    const edge = {
      from: a.from,
      to: a.to,
      from_type: a.from_type,
      to_type: a.to_type,
      type: 'monetary',
      direction: 'directed',
      confidence: 0.92,
      source: 'fec-oth-transfers',
      source_url: null,
      evidence: [
        `FEC oth-transfers: ${a.count} txns totaling $${Math.round(a.amount).toLocaleString()} (cycle ${a.cycle})`,
      ],
      amount: Math.round(a.amount),
      cycle: a.cycle,
      role: null,
      date_range: null,
      first_seen: now,
      last_verified: now,
      status: 'active',
    };
    edge.id = computeEdgeId(edge);
    edges.push(edge);
  }

  if (VERBOSE) {
    const top = [...edges].sort((a, b) => b.amount - a.amount).slice(0, 12);
    console.log('\nTop 12 new transfer edges:');
    top.forEach((e) => console.log(`  $${(e.amount / 1e6).toFixed(1).padStart(7)}M  ${e.from} → ${e.to} (${e.cycle})`));
  }

  if (!WRITE) {
    console.log(`\n[dry-run] ${edges.length.toLocaleString()} edges would be upserted. Use --write to apply.`);
    return;
  }
  if (edges.length === 0) { console.log('\nNothing to emit.'); return; }

  console.log('\nUpserting...');
  const result = upsertEdges(edges);
  console.log(`  added:   ${result.added}`);
  console.log(`  updated: ${result.updated}`);
  console.log(`  skipped: ${result.skipped}`);
  console.log(`  invalid: ${result.invalid}`);
  if (result.errors?.length) {
    console.log('  first errors:');
    result.errors.slice(0, 5).forEach((e) => console.log('   ', e));
  }
})();
