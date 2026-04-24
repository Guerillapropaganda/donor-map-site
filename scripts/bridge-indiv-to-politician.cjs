#!/usr/bin/env node
/**
 * bridge-indiv-to-politician.cjs
 *
 * Pattern G1 fix. Individual-contribution edges in
 * data/derived/fec-indiv-by-committee.jsonl land on COMMITTEES (e.g.
 * "Alexandria Ocasio-Cortez for Congress"), not on the politicians
 * themselves. The committee→politician mapping already exists in
 * data/fec-committee-registry.json (919 politicians mapped to 1,281
 * committee fec_names), but no script was writing the bridged edges.
 *
 * Fallout this closes: AOC's "who funds them" panel showed $54K in
 * support from 21 PAC contributions — 1000x+ low against her actual
 * $50M+ career raise. Same structural gap affects Bernie ($6M shown
 * vs real hundreds of millions), Pelosi ($1.2M shown vs tens of M),
 * and ~515 of the 726 profiled politicians.
 *
 * Strategy:
 *   1. Load the committee registry → build committeeName → { profile, name } map
 *   2. Stream fec-indiv-by-committee.jsonl; for every edge whose `to`
 *      matches a registered committee, emit a NEW mirror edge with:
 *        from: <original donor>
 *        to:   <politician name from registry>
 *        role: "direct-contribution"
 *        source: "fec-indiv-bridged"
 *      Preserves original fields (cycle, amount, evidence).
 *   3. Write bridged edges to data/derived/fec-indiv-by-politician.jsonl
 *      (separate file — source unchanged, ci-prebuild regenerable).
 *
 * Both edges survive in the loaded graph because the query layer unions
 * all derived files. The committee-facing edge still exists for queries
 * that want committee-level views; the politician-facing edge makes
 * "who funds X" return the actual donor list.
 *
 * Dry-run by default. --apply to write.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'derived', 'fec-indiv-by-committee.jsonl');
const REG_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');
const OUT = path.join(ROOT, 'data', 'derived', 'fec-indiv-by-politician.jsonl');

function loadRegistry() {
  const raw = JSON.parse(fs.readFileSync(REG_FILE, 'utf-8'));
  const all = Array.isArray(raw) ? raw : Object.values(raw);
  // fec_name in the registry is the committee's FEC name (matches the
  // `to` field of source edges via committee-stub pooling). Map to the
  // politician name derived from vault_profile.
  const byName = new Map();
  for (const r of all) {
    if (!r.fec_name || !r.vault_profile) continue;
    // Derive politician display name from profile path:
    //   content/Politicians/.../Alexandria Ocasio-Cortez/_Alexandria Ocasio-Cortez Master Profile.md
    // → "Alexandria Ocasio-Cortez"
    const m = r.vault_profile.match(/\/([^/]+)\/_[^/]+Master Profile\.md$/i);
    if (!m) continue;
    const polName = m[1];
    // Multiple committees can resolve to the same politician — keep the
    // first mapping, but note it's many-to-one.
    const key = r.fec_name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { politician: polName, vault_profile: r.vault_profile });
    }
  }
  return byName;
}

async function main() {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);
  const reg = loadRegistry();
  console.log(`registry: ${reg.size} committee→politician mappings loaded\n`);

  let scanned = 0, matched = 0, skippedNoAmount = 0, perPol = new Map();
  const emit = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(SRC, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    scanned++;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (!e.to) continue;
    const hit = reg.get(e.to.toLowerCase());
    if (!hit) continue;
    matched++;
    if (!e.amount) { skippedNoAmount++; continue; }
    perPol.set(hit.politician, (perPol.get(hit.politician) || 0) + e.amount);
    emit.push({
      from: e.from,
      from_type: e.from_type || 'donor',
      to: hit.politician,
      to_type: 'politician',
      type: 'monetary',
      direction: 'directed',
      confidence: 0.9,
      amount: e.amount,
      cycle: e.cycle,
      source: 'fec-indiv-bridged',
      source_url: e.source_url,
      evidence: e.evidence ? [...e.evidence, `bridged from committee: ${e.to}`] : [`bridged from committee: ${e.to}`],
      role: 'direct-contribution',
      status: 'active',
      first_seen: e.first_seen,
      last_verified: new Date().toISOString(),
      id: `bridged-${e.id || ''}`,
      bridged_from_edge_id: e.id,
      bridged_from_committee: e.to,
    });
  }
  console.log(`scanned edges:           ${scanned.toLocaleString()}`);
  console.log(`matched registry:        ${matched.toLocaleString()} (${(100 * matched / scanned).toFixed(1)}%)`);
  console.log(`skipped (no amount):     ${skippedNoAmount.toLocaleString()}`);
  console.log(`emit candidates:         ${emit.length.toLocaleString()}`);
  console.log(`\ntop 10 politicians by bridged support total:`);
  const top = [...perPol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [name, amt] of top) {
    console.log(`  $${Math.round(amt / 1_000_000)}M`.padStart(8) + '  ' + name);
  }

  if (!APPLY) { console.log('\n(dry-run — no file written)'); return; }
  fs.writeFileSync(OUT, emit.map((x) => JSON.stringify(x)).join('\n') + '\n');
  const size = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
  console.log(`\nwrote ${OUT} (${emit.length.toLocaleString()} edges, ${size} MB)`);
  console.log('Restart the ops server to pick up new derived edges.');
}

main().catch((e) => { console.error(e); process.exit(1); });
