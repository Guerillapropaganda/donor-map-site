#!/usr/bin/env node
/**
 * ingest-icij-offshore.cjs
 *
 * Ingests the ICIJ Offshore Leaks Database (combined Panama Papers +
 * Paradise Papers + Pandora Papers + Offshore Leaks + Bahamas Leaks)
 * into two stores:
 *
 *   data/offshore-entities.jsonl  — the ICIJ nodes matched to vault
 *                                   entities (shell companies, officers,
 *                                   intermediaries whose name matches a
 *                                   donor, corp, or politician we track)
 *
 *   data/derived/icij-offshore.jsonl — affiliation edges, one per
 *                                      matched relationship. Shape:
 *     {
 *       from: <vault entity name>,
 *       to: <shell company name (may not be a vault entity)>,
 *       type: 'affiliation',
 *       role: 'officer' | 'intermediary' | 'beneficial-owner',
 *       source: 'icij-offshore-leaks',
 *       metadata: { icij_node_id, sourceID (leak name), jurisdiction, ... }
 *     }
 *
 * Resolution strategy:
 *   1. Build normalized-name index of vault entities (donors, corps,
 *      politicians by both official name + aliases)
 *   2. Stream each ICIJ node file, normalize, check against index
 *   3. Record node_id → vault entity name for matched nodes
 *   4. Stream relationships.csv, emit edges where AT LEAST ONE endpoint
 *      resolves to a vault entity
 *
 * Scope: only emit edges for rel_types we care about:
 *   - officer_of           → role: 'officer'
 *   - intermediary_of      → role: 'intermediary'
 *   - beneficial_owner_of  → role: 'beneficial-owner' (rare in data)
 *   - underlying           → role: 'beneficial-owner' (Pandora pattern)
 *
 * Skips: registered_address, same_name_as, similar, connected_to
 * (these are registry-metadata, not real economic relationships).
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/ingest-icij-offshore.cjs
 *   node --max-old-space-size=8192 scripts/ingest-icij-offshore.cjs --write
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const ZIP_FILE = 'C:/donor-map-data/bulk/full-oldb.LATEST.zip';
const OFFSHORE_OUT = path.join(ROOT, 'data', 'offshore-entities.jsonl');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// Normalize for name matching. Strip corporate-form suffixes; strip
// punctuation; collapse whitespace; uppercase.
function normName(s) {
  return (s || '').toUpperCase()
    .replace(/['\u2019\u2018\x60]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|INCORPORATED|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|HOLDINGS|TRUST|FOUNDATION|THE|OF|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse a CSV row (RFC-4180, handles quoted fields with embedded commas).
function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

// Stream a CSV from inside the zip. Yields {row, header} per line.
async function* streamCsv(csvName) {
  const proc = spawn('unzip', ['-p', ZIP_FILE, csvName]);
  const rl = readline.createInterface({ input: proc.stdout });
  let header = null;
  for await (const line of rl) {
    if (!line) continue;
    if (!header) { header = parseCsvRow(line).map((s) => s.trim()); continue; }
    yield { row: parseCsvRow(line), header };
  }
}

// Role mapping. Only emit for rel_types with economic meaning.
const ROLE_MAP = {
  officer_of: 'officer',
  intermediary_of: 'intermediary',
  beneficial_owner_of: 'beneficial-owner',
  underlying: 'beneficial-owner',
};

(async function main() {
  console.log(`[ingest-icij-offshore] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);

  // Build vault name → entity index. Use normName + first-word fallback.
  const ents = loadEntities();
  const nameIndex = new Map();
  for (const e of ents) {
    const n = normName(e.name);
    if (n.length >= 4 && !nameIndex.has(n)) nameIndex.set(n, e);
    // Also signals.ticker as a shortcut ("NVDA" → Nvidia)
    const ticker = e.signals?.ticker;
    if (ticker) {
      const tn = normName(String(ticker));
      if (tn.length >= 3 && !nameIndex.has(tn)) nameIndex.set(tn, e);
    }
  }
  // Politicians: also index under "LAST, FIRST" form since ICIJ uses that.
  for (const e of ents) {
    if (e.entity_type !== 'politician') continue;
    const parts = e.name.split(/\s+/);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const first = parts[0];
      const alt = normName(`${last} ${first}`);
      if (alt.length >= 4 && !nameIndex.has(alt)) nameIndex.set(alt, e);
    }
  }
  console.log(`  vault entities: ${ents.length}, normalized name index: ${nameIndex.size}`);

  // Scan nodes (entities + officers + others + intermediaries) and
  // build icij_node_id → vault entity name map for matched nodes.
  // Also build icij_node_id → raw ICIJ name map for ALL nodes so we
  // can emit raw-name edges on the other side of a partial match.
  const matchedNodes = new Map();
  const allNames = new Map();
  const leakBreakdown = { 'Panama Papers': 0, 'Paradise Papers': 0, 'Pandora Papers': 0, 'Offshore Leaks': 0, 'Bahamas Leaks': 0, 'other': 0 };

  const nodeFiles = [
    { file: 'nodes-entities.csv', kind: 'entity', nameCol: 'name' },
    { file: 'nodes-officers.csv', kind: 'officer', nameCol: 'name' },
    { file: 'nodes-intermediaries.csv', kind: 'intermediary', nameCol: 'name' },
    { file: 'nodes-others.csv', kind: 'other', nameCol: 'name' },
  ];

  for (const nf of nodeFiles) {
    console.log(`  scanning ${nf.file}...`);
    let total = 0, matched = 0;
    for await (const { row, header } of streamCsv(nf.file)) {
      total++;
      const idCol = header.indexOf('node_id');
      const nameCol = header.indexOf(nf.nameCol);
      const srcCol = header.indexOf('sourceID');
      const jurCol = header.indexOf('jurisdiction_description');
      if (idCol < 0 || nameCol < 0) continue;
      const nodeId = row[idCol];
      const name = row[nameCol];
      if (!nodeId || !name) continue;
      allNames.set(nodeId, { name, kind: nf.kind, sourceID: row[srcCol] || null, jurisdiction: jurCol >= 0 ? row[jurCol] : null });
      const k = normName(name);
      if (k.length < 4) continue;
      const vaultEnt = nameIndex.get(k);
      if (vaultEnt) {
        matchedNodes.set(nodeId, { vault_name: vaultEnt.name, vault_type: vaultEnt.entity_type, icij_name: name, icij_kind: nf.kind });
        matched++;
      }
    }
    console.log(`    ${total.toLocaleString()} rows, ${matched.toLocaleString()} matched to vault entities`);
  }
  console.log(`\n  total nodes indexed: ${allNames.size.toLocaleString()}`);
  console.log(`  vault-matched nodes: ${matchedNodes.size.toLocaleString()}`);

  if (VERBOSE && matchedNodes.size > 0) {
    console.log('  sample 15 matches:');
    let i = 0;
    for (const [nid, m] of matchedNodes) {
      if (i++ >= 15) break;
      console.log(`    ${nid} | ${m.vault_name} (${m.vault_type}) ← ${m.icij_name} [${m.icij_kind}]`);
    }
  }

  // Scan relationships. Emit edges where at least one side is matched.
  console.log('\n  scanning relationships.csv (3.3M rows)...');
  const edges = [];
  const offshoreEntities = new Map(); // node_id → entity record (for the matched or neighbor nodes)
  let relTotal = 0, relMatched = 0, relSkipped = 0;
  for await (const { row, header } of streamCsv('relationships.csv')) {
    relTotal++;
    const [startCol, endCol, typeCol, srcCol] = ['node_id_start', 'node_id_end', 'rel_type', 'sourceID'].map((n) => header.indexOf(n));
    const start = row[startCol], end = row[endCol], relType = row[typeCol], sourceID = row[srcCol];
    if (!start || !end || !relType) continue;
    const role = ROLE_MAP[relType];
    if (!role) { relSkipped++; continue; }
    const mStart = matchedNodes.get(start);
    const mEnd = matchedNodes.get(end);
    if (!mStart && !mEnd) continue;
    relMatched++;
    // Determine direction. officer_of: start is officer, end is entity.
    // So edge from = vault (if officer side) → to = shell (entity side).
    const startName = mStart ? mStart.vault_name : (allNames.get(start)?.name || start);
    const endName = mEnd ? mEnd.vault_name : (allNames.get(end)?.name || end);
    const startIsVault = !!mStart;
    const endIsVault = !!mEnd;
    const jurisdiction = allNames.get(end)?.jurisdiction || allNames.get(start)?.jurisdiction || null;
    const leak = sourceID || allNames.get(end)?.sourceID || allNames.get(start)?.sourceID || 'ICIJ';
    if (leakBreakdown[leak] !== undefined) leakBreakdown[leak]++; else leakBreakdown.other++;
    // Record the offshore-side node in offshore-entities.jsonl
    const shellNodeId = startIsVault ? end : start;
    const shellMeta = allNames.get(shellNodeId);
    if (shellMeta) {
      if (!offshoreEntities.has(shellNodeId)) {
        offshoreEntities.set(shellNodeId, {
          icij_node_id: shellNodeId,
          name: shellMeta.name,
          kind: shellMeta.kind,
          jurisdiction: shellMeta.jurisdiction,
          sourceID: shellMeta.sourceID,
          linked_vault_entities: new Set(),
        });
      }
      const vaultNode = startIsVault ? startName : endName;
      offshoreEntities.get(shellNodeId).linked_vault_entities.add(vaultNode);
    }

    const nowIso = new Date().toISOString();
    const edge = {
      from: startName,
      to: endName,
      from_type: startIsVault ? (mStart.vault_type) : 'donor',
      to_type: endIsVault ? (mEnd.vault_type) : 'donor',
      type: 'affiliation',
      role,
      direction: 'directed',
      confidence: 0.85,
      source: 'icij-offshore-leaks',
      source_url: 'https://offshoreleaks.icij.org/',
      evidence: [`ICIJ ${leak}: ${role} relationship`],
      metadata: { icij_start: start, icij_end: end, rel_type: relType, leak, jurisdiction },
      status: 'active',
      first_seen: nowIso, last_verified: nowIso, created_at: nowIso, updated_at: nowIso,
    };
    edge.id = computeEdgeId(edge);
    edges.push(edge);
  }
  console.log(`    relationships scanned: ${relTotal.toLocaleString()}`);
  console.log(`    emit-eligible (officer/intermediary/beneficial-owner): ${(relTotal - relSkipped).toLocaleString()}`);
  console.log(`    matched to vault: ${relMatched.toLocaleString()}`);
  console.log(`    edges to emit:    ${edges.length.toLocaleString()}`);
  console.log(`    offshore nodes surfaced: ${offshoreEntities.size.toLocaleString()}`);
  console.log(`  leak breakdown:`);
  for (const [k, v] of Object.entries(leakBreakdown)) console.log(`    ${String(v).padStart(6)} ${k}`);

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  // Write offshore-entities.jsonl
  console.log('\n  writing offshore-entities.jsonl...');
  const fd = fs.openSync(OFFSHORE_OUT, 'w');
  try {
    let buf = '';
    let i = 0;
    for (const rec of offshoreEntities.values()) {
      rec.linked_vault_entities = [...rec.linked_vault_entities];
      buf += JSON.stringify(rec) + '\n';
      i++;
      if (i % 1000 === 0) { fs.writeSync(fd, buf); buf = ''; }
    }
    if (buf) fs.writeSync(fd, buf);
  } finally { fs.closeSync(fd); }
  console.log(`  wrote ${offshoreEntities.size.toLocaleString()} offshore entities`);

  // Upsert edges
  console.log('\n  upserting edges...');
  const CHUNK = 50_000;
  let added = 0, updated = 0, invalid = 0;
  for (let i = 0; i < edges.length; i += CHUNK) {
    const slice = edges.slice(i, i + CHUNK);
    const res = upsertEdges(slice, { source: 'icij-offshore-leaks' });
    added += res.added; updated += res.updated; invalid += res.invalid;
    console.log(`    ${Math.min(i + CHUNK, edges.length).toLocaleString()}/${edges.length.toLocaleString()} ... +${res.added} / ~${res.updated} / ✗${res.invalid}`);
  }
  console.log(`\n  total: added=${added}, updated=${updated}, invalid=${invalid}`);
})().catch((e) => { console.error(e); process.exit(1); });
