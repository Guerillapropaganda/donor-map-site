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
// Handles FEC data quirks:
//   • Orgs logged as "ORG_NAME, ." (literal period as "first name") —
//     the period should be discarded, not emitted as leading ". Org Name".
//     Common for organizational donors (National Association of Realtors,
//     Native American tribes, PACs in corp form).
//   • Empty "first" after comma ("FOO, ") — same treatment.
//   • Trailing truncation — FEC caps the NAME field at ~34 chars. We
//     accept the truncated form; the orphan-audit's dedup via PhRMA-
//     style prefix/suffix matching handles cross-variant joining.
function titleCaseName(fecName) {
  if (!fecName) return null;
  const clean = String(fecName).trim();
  const parts = clean.split(',');
  const toTC = (s) => s.toLowerCase().split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
  if (parts.length >= 2) {
    const last = parts[0].trim();
    const first = parts.slice(1).join(',').trim();
    // If the "first name" is empty or just punctuation ("." / "-" / "/"),
    // the input is really just the org name with a trailing comma-period
    // artifact. Title-case just the last part and drop the junk.
    if (!first || /^[.\-/\\]+$/.test(first)) {
      return toTC(last);
    }
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
    // Previous logic excluded politicians here (`if (entity_type === 'politician') continue`),
    // with the rationale that summary-level receipts would surface on
    // politician profiles. But the Ask panel's "who funds X" query
    // traces donor→politician edges — without them AOC showed $54K from
    // 21 PACs against her real ~$50M career raise. Including politicians
    // here closes the Pattern G1 bridge: individual FEC contributions
    // aggregated at ≥$10K become donor→politician edges directly.
    if (e.signals.fec_committee_id) cmteToEntity.set(e.signals.fec_committee_id, e);
    // Multiple committee IDs — principal + affiliates across re-
    // registrations. Index all.
    if (Array.isArray(e.signals.fec_committee_ids)) {
      for (const cid of e.signals.fec_committee_ids) {
        if (!cmteToEntity.has(cid)) cmteToEntity.set(cid, e);
      }
    }
  }
  // Registry merge — for committees stubbed via politician-historical-
  // coverage-backfill or fec-committee-resolver that point to a vault
  // profile. Politicians included now (see note above).
  const entByPath = new Map(ents.filter((e) => e.profile_path).map((e) => [e.profile_path, e]));
  for (const [cmteId, r] of Object.entries(registry)) {
    if (cmteToEntity.has(cmteId)) continue;
    if (r.vault_profile && entByPath.has(r.vault_profile)) {
      cmteToEntity.set(cmteId, entByPath.get(r.vault_profile));
    }
  }
  console.log(`  committees resolvable to vault entity: ${cmteToEntity.size}`);

  // Signals-based enrichment: for committees tied to an org (via
  // committee-master's connected_org field) where the org matches a
  // vault entity, route the cmte_id to that entity. Fixes cases where
  // the corp PAC's committee ID isn't in the entity's signals yet.
  function normOrg(s) {
    return (s || '').toUpperCase()
      .replace(/['\u2019\u2018\x60]/g, '')
      .replace(/[^A-Z0-9 ]+/g, ' ')
      .replace(/\b(INC|INCORPORATED|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|THE|OF|AND)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const orgToEntity = new Map();
  for (const e of ents) {
    if (e.entity_type === 'politician') continue;
    const s = e.signals || {};
    const keys = [normOrg(e.name)];
    if (s.ticker) keys.push(normOrg(String(s.ticker)));
    const firstWord = normOrg(e.name).split(' ')[0];
    if (firstWord && firstWord.length >= 4) keys.push(firstWord);
    for (const k of keys) {
      if (k && k.length >= 3 && !orgToEntity.has(k)) orgToEntity.set(k, e);
    }
  }
  const masterPath = 'C:/donor-map-data/fec/committee-master.jsonl';
  if (fs.existsSync(masterPath)) {
    const cmRl = readline.createInterface({ input: fs.createReadStream(masterPath) });
    let enriched = 0;
    for await (const line of cmRl) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (!r.id || !r.connected_org) continue;
        if (cmteToEntity.has(r.id)) continue;
        const normed = normOrg(r.connected_org);
        if (!normed) continue;
        const firstWord = normed.split(' ')[0];
        const ent = orgToEntity.get(normed) || (firstWord.length >= 4 ? orgToEntity.get(firstWord) : null);
        if (ent) { cmteToEntity.set(r.id, ent); enriched++; }
      } catch {}
    }
    console.log(`  committees enriched via connected_org: ${enriched}`);
  }

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
      // Individual FEC contributions to a candidate committee are
      // direct-contribution edges. Previous null role left them out
      // of Pattern A's isSupport / isPolitical filters, which is why
      // AOC's $45M small-dollar base showed $54K on the donors_to
      // panel — Pattern A's filter treated null-role as "neither
      // support nor oppose." Setting the role correctly makes every
      // small-dollar politician's "who funds them" query report
      // real numbers.
      role: 'direct-contribution',
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
