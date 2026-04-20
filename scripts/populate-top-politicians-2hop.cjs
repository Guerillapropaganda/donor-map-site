#!/usr/bin/env node
/**
 * populate-top-politicians-2hop.cjs
 *
 * Fixes 168 profiles (Leonard Leo, JCN, MAGA Inc, Fairshake PAC,
 * and ~164 others) whose auto-panel "Top politicians funded" table
 * shows names with empty "—" amounts. Root cause: signals.top_
 * politicians_funded is populated with donor-subject wikilinks from
 * frontmatter but without dollar amounts, because dark-money donors
 * (and corporations, orgs) route money THROUGH controlled vehicles
 * rather than making direct donor→politician gifts.
 *
 * Leo → MFT → JCN → IE-support on Gorsuch confirmation. 1-hop query
 * Leo→Gorsuch returns 0 edges; 2-hop Leo→(via MFT)→Gorsuch surfaces
 * the real flow.
 *
 * Logic:
 *   1. Direct edges (1-hop): entity → politician, type=monetary or
 *      ie-support, amount > 0.
 *   2. 2-hop via controlled vehicles: entity → {vehicle} (affiliation
 *      with leadership role) → politician (monetary / ie-support).
 *      Leadership roles: Trustee, Chairman, Board Chair, Director,
 *      CEO, President, Founder, General Counsel.
 *   3. Merge, sum by politician name, sort by amount desc, take top 10.
 *   4. Update entities.jsonl in place.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { loadEdges } = require('./lib/relationships-store.cjs');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT_TO = (() => {
  const i = process.argv.indexOf('--entity');
  return i === -1 ? null : process.argv[i + 1];
})();

const LEADERSHIP_ROLES = /trustee|chair(?:man|woman|person)?|director|ceo|president|founder|general counsel|board member|board-member|officer|secretary|treasurer/i;
const SCAN_ENTITY_TYPES = new Set(['donor', 'corporation', 'nonprofit', 'org', 'pac']);

function main() {
  const ents = loadEntities();
  const entByName = new Map(ents.map((e) => [e.name, e]));
  const politicianNames = new Set(ents.filter((e) => e.entity_type === 'politician').map((e) => e.name));

  const edges = loadEdges();
  const outByFrom = new Map();
  for (const e of edges) {
    if (e.status === 'deprecated') continue;
    if (!outByFrom.has(e.from)) outByFrom.set(e.from, []);
    outByFrom.get(e.from).push(e);
  }

  const updates = [];
  const eligible = ents.filter((e) =>
    SCAN_ENTITY_TYPES.has(e.entity_type) &&
    (LIMIT_TO ? e.name === LIMIT_TO : true)
  );

  for (const ent of eligible) {
    const byPol = new Map();
    const directOut = outByFrom.get(ent.name) || [];

    // 1-hop direct
    for (const e of directOut) {
      if (!politicianNames.has(e.to)) continue;
      if (e.type !== 'monetary' && !(e.type === 'funding' || e.role === 'ie-support')) continue;
      if (!e.amount || e.amount <= 0) continue;
      const cur = byPol.get(e.to) || { name: e.to, type: 'politician', amount: 0, count: 0, via: new Set() };
      cur.amount += e.amount;
      cur.count += 1;
      cur.via.add('direct');
      byPol.set(e.to, cur);
    }

    // 2-hop via controlled vehicles
    const controlled = new Set();
    for (const e of directOut) {
      if (e.type !== 'affiliation') continue;
      if (!e.role || !LEADERSHIP_ROLES.test(e.role)) continue;
      if (!entByName.has(e.to)) continue;
      controlled.add(e.to);
    }
    for (const vehName of controlled) {
      const vehOut = outByFrom.get(vehName) || [];
      for (const e of vehOut) {
        if (!politicianNames.has(e.to)) continue;
        if (e.type !== 'monetary' && !(e.type === 'funding' || e.role === 'ie-support')) continue;
        if (!e.amount || e.amount <= 0) continue;
        const cur = byPol.get(e.to) || { name: e.to, type: 'politician', amount: 0, count: 0, via: new Set() };
        cur.amount += e.amount;
        cur.count += 1;
        cur.via.add(vehName);
        byPol.set(e.to, cur);
      }
    }

    if (byPol.size === 0) continue;

    const top = [...byPol.values()]
      .map((p) => ({
        name: p.name,
        type: p.type,
        amount: Math.round(p.amount),
        count: p.count,
        via: [...p.via],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const existing = ent.signals?.top_politicians_funded || [];
    // Only update if we have meaningful new data (any amount > 0)
    const hasReal = top.some((t) => t.amount > 0);
    if (!hasReal) continue;

    // Preserve existing names not captured (so frontmatter wikilinks aren't lost).
    const capturedNames = new Set(top.map((t) => t.name));
    for (const p of existing) {
      if (p && p.name && !capturedNames.has(p.name) && top.length < 10) {
        top.push({ name: p.name, type: p.type || 'politician', amount: p.amount || 0, count: p.count || 0, via: ['frontmatter-only'] });
      }
    }

    updates.push({ entity: ent.name, top });
    if (VERBOSE) {
      console.log(`\n${ent.name}:`);
      for (const t of top.slice(0, 5)) console.log(`  $${(t.amount/1e6).toFixed(2)}M  ${t.name}  (via ${t.via.join(',')}, ${t.count}tx)`);
    }
  }

  console.log(`\n[populate-top-politicians-2hop] ${WRITE ? 'WRITE' : 'dry-run'}`);
  console.log(`  scanned entities:           ${eligible.length}`);
  console.log(`  entities with 2-hop hits:   ${updates.length}`);
  if (updates.length === 0) { if (!WRITE) console.log('  rerun with --write to apply.'); return; }

  if (!WRITE) {
    console.log('  rerun with --write to apply.');
    return;
  }

  // Rewrite entities.jsonl
  const text = fs.readFileSync(ENT_FILE, 'utf-8');
  const out = [];
  const updateMap = new Map(updates.map((u) => [u.entity, u.top]));
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(line); } catch { out.push(line); continue; }
    if (updateMap.has(rec.name)) {
      rec.signals = rec.signals || {};
      rec.signals.top_politicians_funded = updateMap.get(rec.name);
      rec.signals.top_politicians_funded_computed_at = new Date().toISOString();
      out.push(JSON.stringify(rec));
    } else {
      out.push(line);
    }
  }
  fs.writeFileSync(ENT_FILE, out.join('\n'));
  console.log(`  wrote ${updates.length} entity updates.`);
}

main();
