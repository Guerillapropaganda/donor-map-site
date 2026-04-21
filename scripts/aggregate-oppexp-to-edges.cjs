#!/usr/bin/env node
/**
 * aggregate-oppexp-to-edges.cjs
 *
 * Reads FEC Operating Expenditures (C:\donor-map-data\fec\
 * oppexp-by-committee.jsonl) and emits edges to data/derived/
 * fec-oppexp.jsonl — but only where the flow can be attached to at
 * least one vault entity. Most oppexp rows are to uninteresting
 * vendors (print shops, Squarespace subscriptions); emitting every
 * one would drown the edge store. We keep the politically-relevant
 * subset:
 *
 *   - source committee resolves to a vault entity (politician
 *     campaign cmte, PAC, etc.)
 *   - AND/OR recipient_name matches a vault entity name or known
 *     ticker/connected-org
 *
 * Edge type: 'operating-expense' — a new type distinct from
 * 'monetary' (donor→politician) and funding. Emits:
 *   from = source entity (committee sponsor)
 *   to = recipient entity (vendor/consultant/media buyer)
 *   type = 'operating-expense'
 *   amount = total dollars across matched cycles
 *   cycle = last_cycle (most recent)
 *   source = 'fec-oppexp'
 *
 * Usage:
 *   node scripts/aggregate-oppexp-to-edges.cjs             # dry-run
 *   node scripts/aggregate-oppexp-to-edges.cjs --write     # apply
 *   node scripts/aggregate-oppexp-to-edges.cjs --min-amount 10000
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const OPPEXP_FILE = 'C:/donor-map-data/fec/oppexp-by-committee.jsonl';
const WRITE = process.argv.includes('--write');
const MIN_AMOUNT = (() => {
  const i = process.argv.indexOf('--min-amount');
  return i === -1 ? 10000 : Number(process.argv[i + 1]);
})();

function normOrg(s) {
  return (s || '').toUpperCase()
    .replace(/['\u2019\u2018\x60]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|INCORPORATED|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|THE|OF|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

(async function main() {
  console.log(`[aggregate-oppexp-to-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'} min=$${MIN_AMOUNT}\n`);

  // Committee id → vault entity (non-politician only for PACs/orgs)
  const ents = loadEntities();
  const cmteToEntity = new Map();
  const orgToEntity = new Map();
  for (const e of ents) {
    if (e.entity_type === 'politician') continue;
    if (!e.signals) continue;
    if (e.signals.fec_committee_id) cmteToEntity.set(e.signals.fec_committee_id, e);
    if (Array.isArray(e.signals.fec_committee_ids)) {
      for (const id of e.signals.fec_committee_ids) {
        if (!cmteToEntity.has(id)) cmteToEntity.set(id, e);
      }
    }
    const keys = [normOrg(e.name)];
    if (e.signals.ticker) keys.push(normOrg(String(e.signals.ticker)));
    const firstWord = normOrg(e.name).split(' ')[0];
    if (firstWord && firstWord.length >= 4) keys.push(firstWord);
    for (const k of keys) {
      if (k && k.length >= 3 && !orgToEntity.has(k)) orgToEntity.set(k, e);
    }
  }
  // Politician campaign committees: route to the politician entity as
  // the source of the outflow (their campaign paid a vendor).
  const polCmteToEntity = new Map();
  for (const e of ents) {
    if (e.entity_type !== 'politician') continue;
    if (!e.signals) continue;
    if (e.signals.fec_committee_id) polCmteToEntity.set(e.signals.fec_committee_id, e);
    if (Array.isArray(e.signals.fec_committee_ids)) {
      for (const id of e.signals.fec_committee_ids) {
        if (!polCmteToEntity.has(id)) polCmteToEntity.set(id, e);
      }
    }
  }
  console.log(`  cmteToEntity: ${cmteToEntity.size} PACs/orgs, ${polCmteToEntity.size} politician cmtes`);
  console.log(`  orgToEntity index size: ${orgToEntity.size}`);

  const nowIso = new Date().toISOString();
  const edges = [];
  let scanned = 0, below = 0, srcUnresolved = 0, bothResolved = 0, srcOnly = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(OPPEXP_FILE) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    scanned++;
    const total = Number(r.total) || 0;
    if (total < MIN_AMOUNT) { below++; continue; }

    // Resolve source committee — PAC/org first, then politician.
    let srcEnt = cmteToEntity.get(r.cmte_id);
    let srcIsPol = false;
    if (!srcEnt) {
      srcEnt = polCmteToEntity.get(r.cmte_id);
      if (srcEnt) srcIsPol = true;
    }
    if (!srcEnt) { srcUnresolved++; continue; }

    // Recipient resolution: normalize recipient name, look up in orgToEntity.
    const recipNorm = normOrg(r.recipient_name);
    let dstEnt = orgToEntity.get(recipNorm);
    if (!dstEnt && recipNorm) {
      // Try first-word fallback only for multi-word recipient names.
      const first = recipNorm.split(' ')[0];
      if (first && first.length >= 5) dstEnt = orgToEntity.get(first);
    }

    // Emit edge. If dst resolves, use vault name; else use raw FEC
    // recipient name so the flow is still recorded (helpful for
    // vendor-network analysis even with "ACME Consulting" on the right).
    const dstName = dstEnt ? dstEnt.name : r.recipient_name;
    const dstType = dstEnt ? dstEnt.entity_type : 'donor'; // "donor" is schema-compatible for raw orgs
    if (dstEnt) bothResolved++; else srcOnly++;
    const edge = {
      from: srcEnt.name,
      to: dstName,
      from_type: srcEnt.entity_type,
      to_type: dstType,
      type: 'monetary',
      role: 'operating-expense',
      direction: 'directed',
      confidence: 0.95,
      amount: Math.round(total),
      cycle: String(r.last_cycle || ''),
      cycles: r.cycles || [],
      source: 'fec-oppexp',
      source_url: `https://www.fec.gov/data/disbursements/?committee_id=${r.cmte_id}`,
      evidence: [`FEC oppexp, ${r.first_cycle}-${r.last_cycle}, ${r.count} disbursements, category=${r.category_desc || 'n/a'}`],
      metadata: {
        cmte_id: r.cmte_id,
        recipient_state: r.recipient_state,
        disbursement_count: r.count,
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

  console.log(`  scanned: ${scanned.toLocaleString()}`);
  console.log(`  below $${MIN_AMOUNT}: ${below.toLocaleString()}`);
  console.log(`  source unresolvable: ${srcUnresolved.toLocaleString()}`);
  console.log(`  both sides resolved: ${bothResolved.toLocaleString()}`);
  console.log(`  source-only (raw recipient): ${srcOnly.toLocaleString()}`);
  console.log(`  edges to emit: ${edges.length.toLocaleString()}`);

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }
  console.log('\n  upserting...');
  const res = upsertEdges(edges, { source: 'fec-oppexp' });
  console.log('  added:', res.added, ' updated:', res.updated, ' skipped:', res.skipped, ' invalid:', res.invalid);
})();
