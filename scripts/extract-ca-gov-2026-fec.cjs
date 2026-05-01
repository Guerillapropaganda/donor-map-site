#!/usr/bin/env node
/**
 * extract-ca-gov-2026-fec.cjs
 *
 * Phase 2-D of CA Gov 2026 dossier plan (2026-05-01).
 *
 * Pulls federal-level (FEC) money flows for the 3 candidates with federal
 * records — Becerra (former US Rep), Porter (former US Rep), Steyer
 * (presidential 2020 + NextGen). Hilton/Bianco/Villaraigosa/Mahan/Thurmond
 * are state-only — no federal records expected.
 *
 * Reads librarian (data/relationships.jsonl) for edges from `source: "fec-bulk"`
 * or `source: "fec-api"` with the candidate as recipient. Aggregates to
 * data/derived/ca-gov-2026/{slug}-fec.json.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const FEDERAL_CANDIDATES = [
  { slug: 'becerra', name: 'Xavier Becerra', fec_ids: ['H2CA30143', 'C00264101'] },
  { slug: 'porter',  name: 'Katie Porter',   fec_ids: ['S4CA00522', 'H8CA45130', 'C00636571', 'C00831107'] },
  { slug: 'steyer',  name: 'Tom Steyer',     fec_ids: ['P00012716'] },
];
const FEC_SOURCES = new Set(['fec-bulk', 'fec-api', 'fec-individual', 'fec-individual-bulk', 'fec-oppexp']);
const OUT_DIR = path.join('data', 'derived', 'ca-gov-2026');
fs.mkdirSync(OUT_DIR, { recursive: true });

const acc = {};
for (const c of FEDERAL_CANDIDATES) {
  acc[c.slug] = {
    candidate: c.name,
    slug: c.slug,
    fec_ids: c.fec_ids,
    incoming_donors: new Map(),
    outgoing: new Map(),
    total_raised: 0,
    total_outgoing: 0,
    incoming_edge_count: 0,
    outgoing_edge_count: 0,
    sources_seen: new Set(),
    cycles_active: new Set(),
  };
}
const candByName = new Map(FEDERAL_CANDIDATES.map(c => [c.name, c.slug]));

async function processFile(fp) {
  if (!fs.existsSync(fp)) {
    console.error(`MISSING: ${fp}`);
    return { total: 0, hits: 0 };
  }
  const rl = readline.createInterface({
    input: fs.createReadStream(fp, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  let total = 0, fecHits = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    total++;
    // For relationship-store records we still gate on source; for fec-*.jsonl
    // files every record is FEC-sourced so the gate is a no-op there.
    if (r.source && !FEC_SOURCES.has(r.source)) continue;

    // INCOMING: candidate is recipient
    const slugIn = candByName.get(r.to);
    if (slugIn && r.type === 'monetary') {
      const a = acc[slugIn];
      const donor = r.from || '(unknown)';
      const amt = +r.amount || 0;
      const prev = a.incoming_donors.get(donor) || { total: 0, count: 0, evidence: [] };
      prev.total += amt;
      prev.count += 1;
      if (prev.evidence.length < 1 && r.evidence?.[0]) prev.evidence.push(r.evidence[0]);
      a.incoming_donors.set(donor, prev);
      a.total_raised += amt;
      a.incoming_edge_count += 1;
      a.sources_seen.add(r.source);
      if (r.cycle) a.cycles_active.add(String(r.cycle));
      fecHits++;
    }

    // OUTGOING: candidate is donor (Steyer's NextGen-related giving e.g.)
    const slugOut = candByName.get(r.from);
    if (slugOut && r.type === 'monetary') {
      const a = acc[slugOut];
      const recipient = r.to || '(unknown)';
      const amt = +r.amount || 0;
      const prev = a.outgoing.get(recipient) || { total: 0, count: 0, evidence: [], role: r.role };
      prev.total += amt;
      prev.count += 1;
      if (prev.evidence.length < 1 && r.evidence?.[0]) prev.evidence.push(r.evidence[0]);
      a.outgoing.set(recipient, prev);
      a.total_outgoing += amt;
      a.outgoing_edge_count += 1;
      a.sources_seen.add(r.source);
      if (r.cycle) a.cycles_active.add(String(r.cycle));
      fecHits++;
    }
  }
  return { total, hits: fecHits };
}

(async () => {
  console.log('=== Phase 2-D: FEC summary pulls ===\n');
  const FEC_FILES = [
    'data/relationships.jsonl',
    'data/derived/fec-bulk.jsonl',
    'data/derived/fec-api.jsonl',
    'data/derived/fec-individual-bulk.jsonl',
    'data/derived/fec-oppexp.jsonl',
  ];
  for (const fp of FEC_FILES) {
    const { total, hits } = await processFile(fp);
    console.log(`  ${fp.padEnd(45)} scanned ${total}, FEC hits ${hits}`);
  }
  console.log('\n--- per-candidate federal summary ---');
  for (const c of FEDERAL_CANDIDATES) {
    const a = acc[c.slug];
    const out = {
      candidate: a.candidate,
      slug: a.slug,
      fec_ids: a.fec_ids,
      total_raised_federal: Math.round(a.total_raised),
      total_outgoing_federal: Math.round(a.total_outgoing),
      incoming_edge_count: a.incoming_edge_count,
      outgoing_edge_count: a.outgoing_edge_count,
      unique_donors: a.incoming_donors.size,
      unique_recipients: a.outgoing.size,
      sources_seen: [...a.sources_seen].sort(),
      cycles_active: [...a.cycles_active].sort(),
      top_50_donors: [...a.incoming_donors.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((x, y) => y.total - x.total)
        .slice(0, 50),
      top_25_recipients: [...a.outgoing.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((x, y) => y.total - x.total)
        .slice(0, 25),
      generated: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(OUT_DIR, `${c.slug}-fec.json`), JSON.stringify(out, null, 2), 'utf-8');
    console.log(`${c.slug.padEnd(10)} federal raised: $${(out.total_raised_federal/1000).toFixed(0)}K  outgoing: $${(out.total_outgoing_federal/1000).toFixed(0)}K  donors: ${out.unique_donors}  cycles: [${out.cycles_active.join(',')}]`);
  }
})();
