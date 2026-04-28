#!/usr/bin/env node
/**
 * aggregate-pas2-to-edges.cjs
 *
 * Reads the PAS2 split files produced by ingest-fec-pas2-bulk.cjs
 * and emits edges to data/derived/fec-pas2.jsonl:
 *
 *   pas2-ie-support.jsonl    → monetary edges, role=ie-support
 *   pas2-ie-oppose.jsonl     → monetary edges, role=ie-oppose
 *   pas2-direct-donors.jsonl → monetary edges (committee → candidate direct)
 *   pas2-comm-cost.jsonl     → monetary edges, role=coordinated-party-expense
 *   pas2-party.jsonl         → monetary edges, role=party-coordinated
 *
 * Skips pas2-conduit (pass-through transactions not useful as direct
 * support edges — the conduit's source pays the candidate, not the
 * conduit itself), pas2-electioneering (tiny), pas2-anomalies, and
 * pas2-unknown.
 *
 * Aggregates by (src_cmte_id, cand_id, cycle) — one edge per
 * committee-candidate-cycle tuple per file, matching the indiv
 * aggregator's granularity.
 *
 * Recipient resolution (2026-04-25 fix): for each PAS2 row we prefer
 * lookup by `other_id` (the recipient committee's FEC ID) over lookup
 * by `cand_id` (the FEC candidate ID). other_id is more precise: it
 * tells us WHICH committee received the money, not just which
 * politician was the ultimate beneficiary. This routes leadership-PAC
 * contributions to the leadership-PAC entity if it has its own profile,
 * and disambiguates the multi-bioguide / multi-committee cases the
 * librarian flagged. Falls back to cand_id when other_id is empty
 * (e.g. IE-support / IE-oppose rows where the spending committee
 * doesn't transfer to another committee). The recipient_cmte_id is
 * recorded in edge metadata for downstream traceability.
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/aggregate-pas2-to-edges.cjs          # dry-run
 *   node --max-old-space-size=8192 scripts/aggregate-pas2-to-edges.cjs --write
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';
const WRITE = process.argv.includes('--write');
const MIN_AMOUNT = 1000;

// Per-split file → edge role mapping.
const FILES = [
  { file: 'pas2-ie-support.jsonl',    role: 'ie-support' },
  { file: 'pas2-ie-oppose.jsonl',     role: 'ie-oppose' },
  { file: 'pas2-direct-donors.jsonl', role: 'direct-contribution' },
  { file: 'pas2-comm-cost.jsonl',     role: 'coordinated-party-expense' },
  { file: 'pas2-party.jsonl',         role: 'party-coordinated' },
];

(async function main() {
  console.log(`[aggregate-pas2-to-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  const ents = loadEntities();
  // Build cmte_id → entity for both politicians and non-politicians.
  const cmteToEntity = new Map();
  const candIdToEntity = new Map();
  // Index entities by profile_path so registry → entity lookup works.
  const entByProfilePath = new Map();
  for (const e of ents) {
    if (e.profile_path) entByProfilePath.set(e.profile_path, e);
    if (!e.signals) continue;
    if (e.signals.fec_committee_id) cmteToEntity.set(e.signals.fec_committee_id, e);
    if (Array.isArray(e.signals.fec_committee_ids)) {
      for (const id of e.signals.fec_committee_ids) {
        if (!cmteToEntity.has(id)) cmteToEntity.set(id, e);
      }
    }
    if (e.signals.fec_candidate_id) candIdToEntity.set(e.signals.fec_candidate_id, e);
    if (Array.isArray(e.signals.fec_candidate_ids)) {
      for (const id of e.signals.fec_candidate_ids) {
        if (!candIdToEntity.has(id)) candIdToEntity.set(id, e);
      }
    }
  }
  const cmteIndexFromSignals = cmteToEntity.size;

  // Per ADR-0024: fec-committee-registry.json is the canonical mapping
  // of FEC committee IDs to vault profiles. Consult it as a fallback
  // when entity signals don't have the committee_id set. This closes
  // the Fairshake-shape gap surfaced 2026-04-28: today's 371 stub-
  // resolution mappings landed in the registry but the entity records
  // were not backfilled with signals.fec_committee_id. Without this,
  // the aggregator was blind to those mappings on first run.
  const REGISTRY_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');
  let registryMappingsAdded = 0;
  if (fs.existsSync(REGISTRY_FILE)) {
    const reg = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
    for (const [cid, entry] of Object.entries(reg)) {
      if (!entry || !entry.vault_profile) continue;
      if (cmteToEntity.has(cid)) continue; // entity signals win
      const ent = entByProfilePath.get(entry.vault_profile);
      if (!ent) continue; // registry points at a profile we don't have an entity record for
      cmteToEntity.set(cid, ent);
      registryMappingsAdded++;
    }
  }
  console.log(`  cmte index: ${cmteToEntity.size} (${cmteIndexFromSignals} from entity signals + ${registryMappingsAdded} from registry fallback), cand index: ${candIdToEntity.size}`);

  const nowIso = new Date().toISOString();
  const allEdges = [];
  let grandScanned = 0, grandEmitted = 0;

  for (const { file, role } of FILES) {
    const filePath = path.join(FEC_ROOT, file);
    if (!fs.existsSync(filePath)) { console.log(`  (missing ${file})`); continue; }

    // Aggregate by (src_cmte, dst, cycle).
    const agg = new Map();
    let scanned = 0, below = 0, unresolved = 0;
    let resolvedViaOtherId = 0, resolvedViaCandId = 0;
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      scanned++;
      const amt = Number(r.amount) || 0;
      if (amt < MIN_AMOUNT) { below++; continue; }
      const src = cmteToEntity.get(r.src_cmte_id);
      // Prefer other_id (recipient committee) over cand_id (candidate).
      // other_id resolves to the actual receiving committee — more
      // precise for politicians with multiple committees (campaign vs
      // leadership PAC vs joint cmte) and disambiguates multi-bioguide
      // edge cases the librarian surfaced.
      let dst = null;
      let resolvedVia = null;
      if (r.other_id) {
        dst = cmteToEntity.get(r.other_id) || null;
        if (dst) { resolvedVia = 'other_id'; resolvedViaOtherId++; }
      }
      if (!dst && r.cand_id) {
        dst = candIdToEntity.get(r.cand_id) || null;
        if (dst) { resolvedVia = 'cand_id'; resolvedViaCandId++; }
      }
      if (!src || !dst) { unresolved++; continue; }
      // Don't emit politician-self edges (campaign cmte → own candidate).
      if (src.name === dst.name) continue;
      const key = `${src.name}|${dst.name}|${r.cycle || ''}`;
      const cur = agg.get(key) || {
        src, dst, cycle: r.cycle, amount: 0, count: 0,
        txnTypes: new Set(), recipientCmteIds: new Set(),
      };
      cur.amount += amt;
      cur.count += 1;
      if (r.txn_tp) cur.txnTypes.add(r.txn_tp);
      if (r.other_id) cur.recipientCmteIds.add(r.other_id);
      agg.set(key, cur);
    }
    console.log(`  ${file}: scanned=${scanned.toLocaleString()}, below=${below.toLocaleString()}, unresolved=${unresolved.toLocaleString()}, edges=${agg.size.toLocaleString()} (resolved: other_id=${resolvedViaOtherId.toLocaleString()}, cand_id=${resolvedViaCandId.toLocaleString()})`);
    grandScanned += scanned;

    for (const a of agg.values()) {
      const edge = {
        from: a.src.name,
        to: a.dst.name,
        from_type: a.src.entity_type,
        to_type: a.dst.entity_type,
        type: 'monetary',
        role,
        direction: 'directed',
        confidence: 0.98,
        amount: Math.round(a.amount),
        cycle: String(a.cycle || ''),
        source: 'fec-pas2',
        source_url: `https://www.fec.gov/data/committee/${a.src.signals?.fec_committee_id || ''}/`,
        evidence: [`FEC PAS2 ${role}, ${a.count} transactions, txn_tp=${[...a.txnTypes].join(',')}`],
        metadata: {
          src_cmte_id: a.src.signals?.fec_committee_id,
          recipient_cmte_ids: [...a.recipientCmteIds],
          txn_count: a.count,
          txn_types: [...a.txnTypes],
        },
        status: 'active',
        first_seen: nowIso,
        last_verified: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };
      edge.id = computeEdgeId(edge);
      allEdges.push(edge);
      grandEmitted++;
    }
  }

  console.log(`\n  total scanned: ${grandScanned.toLocaleString()}`);
  console.log(`  total edges:   ${allEdges.length.toLocaleString()}`);

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }
  console.log('\n  upserting...');
  const res = upsertEdges(allEdges, { source: 'fec-pas2' });
  console.log('  added:', res.added, ' updated:', res.updated, ' skipped:', res.skipped, ' invalid:', res.invalid);
})();
