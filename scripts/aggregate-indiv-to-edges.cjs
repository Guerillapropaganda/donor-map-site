#!/usr/bin/env node
/**
 * aggregate-indiv-to-edges.cjs
 *
 * Turns individual FEC contributions (C:\donor-map-data\fec\indiv-by-committee.jsonl)
 * into donor→committee monetary edges in the canonical relationship store.
 *
 * The original ingest-fec-individual-bulk.cjs only emits aggregate
 * employer-contribution edges (Google → ActBlue etc.). Natural-person
 * donors giving ≥$200 directly to a campaign committee were never
 * surfaced as edges, and the receiving committee was matched by fuzzy
 * name only. Result: Donald J Trump for President 2024's $463M in
 * individual receipts never appeared in the donor graph.
 *
 * This script fills that gap by resolving cmte_id → vault entity via
 * fec-committee-registry.json (after sync-campaign-committees.cjs
 * populates it), and emitting one edge per (donor, committee) pair
 * with the aggregated total.
 *
 * Scope: only commits edges where the receiving committee is a known
 * vault entity. The donor side retains the raw "LAST, FIRST" name even
 * when unmatched — these become orphan-from edges but are queryable
 * by committee target ("who funds MAGA Inc").
 *
 * Usage:
 *   node scripts/aggregate-indiv-to-edges.cjs                     # dry-run
 *   node scripts/aggregate-indiv-to-edges.cjs --write             # apply
 *   node scripts/aggregate-indiv-to-edges.cjs --min-amount 10000  # only $10K+
 *   node scripts/aggregate-indiv-to-edges.cjs --cmte C00892471    # filter
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { loadEntities } = require('./lib/entities-store.cjs');
const { computeEdgeId, buildTitleIndex } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';
const INDIV_FILE = path.join(FEC_ROOT, 'indiv-by-committee.jsonl');
const REGISTRY_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');
const MIN_AMOUNT = parseFloat(argVal('--min-amount', '1000')); // drop <$1K by default (reduces noise)
const FILTER_CMTE = argVal('--cmte', null);

// Normalize a donor name to Title Case for display: "TRUMP, DONALD J" → "Donald J Trump"
function titleCaseName(fecName) {
  if (!fecName) return null;
  const clean = String(fecName).trim();
  // Skip obvious non-person names like corporations donating
  const parts = clean.split(',');
  if (parts.length >= 2) {
    const last = parts[0].trim();
    const first = parts.slice(1).join(',').trim();
    const toTC = (s) => s.toLowerCase().split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
    return `${toTC(first)} ${toTC(last)}`;
  }
  return clean;
}

(async function main() {
  console.log(`[aggregate-indiv-to-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'} min=$${MIN_AMOUNT}${FILTER_CMTE ? ` cmte=${FILTER_CMTE}` : ''}\n`);

  // Load committee registry — resolve cmte_id → vault entity
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));

  // Title index maps profile title → rulebook-derived top-level type
  // ("entity" / "politician" / "story"). This is what the edge
  // validator checks edge.to_type against — NOT the entity-registry's
  // entity_type field. Use the title index for to_type derivation so
  // we match the validator's expectation.
  console.log('  building title index...');
  const titleIndex = buildTitleIndex(path.join(ROOT, 'content'));
  function titleIndexType(name) {
    const entry = titleIndex.get(name);
    if (!entry) return null;
    if (Array.isArray(entry)) return entry[0]?.type || null;
    return entry.type || null;
  }

  // Build a cmte_id → vault_entity map. Strict precedence:
  //   1. Committee-shaped entities (entity_type='donor' with a single
  //      fec_committee_id) — these are the stub records for actual
  //      campaign committees / PACs. They're the right resolution target.
  //   2. Politician entities are EXPLICITLY NOT used for resolution
  //      even if their signals.fec_committee_ids array contains the
  //      cmte_id. Those arrays include every committee that ever made
  //      a coordinated expenditure for the candidate (NRSC / DSCC /
  //      state parties). Using them would incorrectly route an NRSC
  //      donation to whichever senator NRSC happened to support —
  //      surfaced as "Barbara Zorich → Dan Sullivan" when the real
  //      flow is "Barbara Zorich → NRSC."
  const ents = loadEntities();
  const entByName = new Map(ents.map((e) => [e.name, e]));
  const cmteToEntity = new Map();
  for (const e of ents) {
    if (!e.signals) continue;
    if (e.entity_type === 'politician') continue;
    if (e.signals.fec_committee_id) cmteToEntity.set(e.signals.fec_committee_id, e);
    // Non-politician entities (PACs, super PACs, corporations) can have
    // multiple committee IDs if they're aliased across re-registrations;
    // index them all.
    if (Array.isArray(e.signals.fec_committee_ids)) {
      for (const cid of e.signals.fec_committee_ids) {
        if (!cmteToEntity.has(cid)) cmteToEntity.set(cid, e);
      }
    }
  }
  // Also merge from the registry for cases where a committee wasn't
  // stubbed by sync-campaign-committees but DOES point to a non-
  // politician vault_profile (e.g. Super PAC profiles where the registry
  // attached a cmte_id via fec-committee-resolver). Still skip when the
  // registry points to a politician profile — same reasoning as above.
  const entByPath = new Map(ents.filter((e) => e.profile_path).map((e) => [e.profile_path, e]));
  for (const [cmteId, r] of Object.entries(registry)) {
    if (cmteToEntity.has(cmteId)) continue;
    if (r.vault_profile && entByPath.has(r.vault_profile)) {
      const ent = entByPath.get(r.vault_profile);
      if (ent.entity_type !== 'politician') cmteToEntity.set(cmteId, ent);
    }
  }
  console.log(`  committees resolvable to vault entity: ${cmteToEntity.size}`);

  // Stream indiv records. Aggregate by (donor_name, vault_entity_name).
  const agg = new Map();
  let scanned = 0, below = 0, unresolved = 0, matched = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(INDIV_FILE) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    scanned++;
    if (FILTER_CMTE && r.cmte_id !== FILTER_CMTE) continue;
    const total = Number(r.total) || 0;
    if (total < MIN_AMOUNT) { below++; continue; }
    const cmte = r.cmte_id;
    const vaultEnt = cmteToEntity.get(cmte);
    if (!vaultEnt) { unresolved++; continue; }
    matched++;

    const donor = titleCaseName(r.donor_name) || r.donor_name;
    if (!donor) continue;
    // Aggregate by (donor, vault cmte, last_cycle) so cycle is preserved
    const cycle = String(r.last_cycle || '');
    const key = `${donor}|${vaultEnt.name}|${cycle}`;
    if (!agg.has(key)) {
      // Prefer the title index's rulebook-derived type so edge.to_type
      // matches the denormalization check in the validator. Fall back
      // to entity_type for stub entities that don't have a profile
      // file yet.
      const toType = titleIndexType(vaultEnt.name) || vaultEnt.entity_type || 'donor';
      agg.set(key, {
        from: donor,
        to: vaultEnt.name,
        to_type: toType,
        cycle,
        amount: 0,
        count: 0,
        cmteIds: new Set(),
        cycles: new Set(),
      });
    }
    const a = agg.get(key);
    a.amount += total;
    a.count += (r.count || 1);
    a.cmteIds.add(cmte);
    for (const c of (r.cycles || [])) a.cycles.add(c);
  }

  console.log(`  scanned: ${scanned.toLocaleString()}`);
  console.log(`  below $${MIN_AMOUNT}: ${below.toLocaleString()}`);
  console.log(`  unresolvable committees: ${unresolved.toLocaleString()}`);
  console.log(`  matched: ${matched.toLocaleString()}`);
  console.log(`  unique edges to emit: ${agg.size.toLocaleString()}`);

  // Build edges
  const now = new Date().toISOString();
  const edges = [];
  for (const a of agg.values()) {
    // from_type mirrors title-index type when the raw donor name happens
    // to collide with a vault profile (e.g. "Elon Musk" as a natural-
    // person donor matches his politician-adjacent profile). Default to
    // 'donor' when no match — consistent with "raw FEC contributor"
    // semantics.
    const fromType = titleIndexType(a.from) || 'donor';
    const edge = {
      from: a.from,
      to: a.to,
      from_type: fromType,
      to_type: a.to_type,
      type: 'monetary',
      direction: 'directed',
      confidence: 0.9,
      source: 'fec-indiv-by-committee',
      source_url: null,
      evidence: [
        `FEC indiv-by-committee: ${a.count} txns totaling $${Math.round(a.amount).toLocaleString()} (cycle ${a.cycle})`,
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
    console.log('\nTop 12 new edges preview:');
    for (const e of top) console.log(`  $${(e.amount / 1e6).toFixed(2).padStart(7)}M  ${e.from} → ${e.to} (${e.cycle})`);
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
