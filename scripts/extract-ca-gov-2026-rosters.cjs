#!/usr/bin/env node
/**
 * extract-ca-gov-2026-rosters.cjs
 *
 * Phase 2-B of CA Gov 2026 dossier plan (2026-05-01).
 *
 * Filters data/derived/cal-access-bulk.jsonl + cal-access-expn.jsonl by the 8
 * candidates' names (the records are already librarian-edge-shaped — `from`/`to`
 * are candidate proper names, not raw filer IDs). Builds per-candidate roster
 * artifacts at data/derived/ca-gov-2026/{slug}.json with:
 *   - top_donors (top 50 by aggregate $)
 *   - total_raised (state-level only — federal totals come from Phase 2-D)
 *   - total_spent
 *   - cycles_active
 *   - committees_referenced (FPPC IDs cross-referenced via evidence fields)
 *   - sample_evidence (first evidence string per top donor for verification)
 *
 * Run: node scripts/extract-ca-gov-2026-rosters.cjs
 *      (always writes — this is a derived artifact, regenerate freely)
 *
 * Output is research scaffolding for editorial dossier work — not published.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CANDIDATES = [
  { slug: 'becerra', name: 'Xavier Becerra' },
  { slug: 'porter', name: 'Katie Porter' },
  { slug: 'steyer', name: 'Tom Steyer' },
  { slug: 'hilton', name: 'Steve Hilton' },
  { slug: 'bianco', name: 'Chad Bianco' },
  { slug: 'villaraigosa', name: 'Antonio Villaraigosa' },
  { slug: 'mahan', name: 'Matt Mahan' },
  { slug: 'thurmond', name: 'Tony Thurmond' },
];

const OUT_DIR = path.join('data', 'derived', 'ca-gov-2026');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Per-candidate accumulator
const acc = {};
for (const c of CANDIDATES) {
  acc[c.slug] = {
    candidate: c.name,
    slug: c.slug,
    incoming_donors: new Map(), // donorName -> { total, count, evidence: [] }
    incoming_donors_2026: new Map(),
    outgoing_recipients: new Map(),
    outgoing_recipients_2026: new Map(),
    total_raised: 0,
    total_raised_2026: 0,
    total_spent: 0,
    total_spent_2026: 0,
    incoming_edge_count: 0,
    outgoing_edge_count: 0,
    cycles_active: new Set(),
    committees_referenced: new Set(),
  };
}

const candByName = new Map(CANDIDATES.map(c => [c.name, c.slug]));

async function processFile(filepath, isExpn) {
  if (!fs.existsSync(filepath)) {
    console.error(`MISSING: ${filepath}`);
    return;
  }
  const stream = fs.createReadStream(filepath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let total = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    total++;

    const cycle = String(r.cycle || '');
    const is2026 = cycle === '2026';

    // INCOMING (donor -> candidate) — bulk file primary use
    const slugIn = candByName.get(r.to);
    if (slugIn && r.type === 'monetary') {
      const a = acc[slugIn];
      const donor = r.from || '(unknown)';
      const amt = +r.amount || 0;
      const prev = a.incoming_donors.get(donor) || { total: 0, count: 0, evidence: [] };
      prev.total += amt;
      prev.count += 1;
      if (prev.evidence.length < 2 && r.evidence?.[0]) prev.evidence.push(r.evidence[0]);
      a.incoming_donors.set(donor, prev);
      a.total_raised += amt;
      a.incoming_edge_count += 1;
      if (cycle) a.cycles_active.add(cycle);
      if (is2026) {
        const p2 = a.incoming_donors_2026.get(donor) || { total: 0, count: 0, evidence: [] };
        p2.total += amt; p2.count += 1;
        if (p2.evidence.length < 2 && r.evidence?.[0]) p2.evidence.push(r.evidence[0]);
        a.incoming_donors_2026.set(donor, p2);
        a.total_raised_2026 += amt;
      }
      for (const e of (r.evidence || [])) {
        const m = e.match(/filer (\d+)/);
        if (m) a.committees_referenced.add(m[1]);
      }
    }

    // OUTGOING (candidate -> recipient) — expn file primary use
    const slugOut = candByName.get(r.from);
    if (slugOut && r.type === 'monetary' && r.from_type === 'politician') {
      const a = acc[slugOut];
      const recipient = r.to || '(unknown)';
      const amt = +r.amount || 0;
      const prev = a.outgoing_recipients.get(recipient) || { total: 0, count: 0, evidence: [], role: r.role };
      prev.total += amt;
      prev.count += 1;
      if (prev.evidence.length < 2 && r.evidence?.[0]) prev.evidence.push(r.evidence[0]);
      a.outgoing_recipients.set(recipient, prev);
      a.total_spent += amt;
      a.outgoing_edge_count += 1;
      if (cycle) a.cycles_active.add(cycle);
      if (is2026) {
        const p2 = a.outgoing_recipients_2026.get(recipient) || { total: 0, count: 0, evidence: [], role: r.role };
        p2.total += amt; p2.count += 1;
        if (p2.evidence.length < 2 && r.evidence?.[0]) p2.evidence.push(r.evidence[0]);
        a.outgoing_recipients_2026.set(recipient, p2);
        a.total_spent_2026 += amt;
      }
      for (const e of (r.evidence || [])) {
        const m = e.match(/filer (\d+)/);
        if (m) a.committees_referenced.add(m[1]);
      }
    }
  }
  console.log(`processed ${path.basename(filepath)}: ${total} records`);
}

function topN(map, n) {
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

(async () => {
  console.log('=== Phase 2-B: Cal-Access deep extract ===\n');
  await processFile(path.join('data', 'derived', 'cal-access-bulk.jsonl'), false);
  await processFile(path.join('data', 'derived', 'cal-access-expn.jsonl'), true);

  console.log('\n--- per-candidate summary ---');
  const summary = [];
  for (const c of CANDIDATES) {
    const a = acc[c.slug];
    const out = {
      candidate: a.candidate,
      slug: a.slug,
      lifetime: {
        total_raised: Math.round(a.total_raised),
        total_spent: Math.round(a.total_spent),
        unique_donors: a.incoming_donors.size,
        unique_recipients: a.outgoing_recipients.size,
        top_50_donors: topN(a.incoming_donors, 50),
        top_25_recipients: topN(a.outgoing_recipients, 25),
      },
      cycle_2026: {
        total_raised: Math.round(a.total_raised_2026),
        total_spent: Math.round(a.total_spent_2026),
        unique_donors: a.incoming_donors_2026.size,
        unique_recipients: a.outgoing_recipients_2026.size,
        top_50_donors: topN(a.incoming_donors_2026, 50),
        top_25_recipients: topN(a.outgoing_recipients_2026, 25),
      },
      incoming_edge_count: a.incoming_edge_count,
      outgoing_edge_count: a.outgoing_edge_count,
      cycles_active: [...a.cycles_active].sort(),
      committees_referenced: [...a.committees_referenced].sort(),
      generated: new Date().toISOString(),
    };
    const fp = path.join(OUT_DIR, `${c.slug}.json`);
    fs.writeFileSync(fp, JSON.stringify(out, null, 2), 'utf-8');
    console.log(`${c.slug.padEnd(15)} 2026: $${(out.cycle_2026.total_raised/1000).toFixed(0)}K / ${out.cycle_2026.unique_donors} donors  |  lifetime: $${(out.lifetime.total_raised/1000).toFixed(0)}K / ${out.lifetime.unique_donors} donors / ${out.cycles_active.length} cycles`);
    summary.push({
      slug: c.slug,
      candidate: c.candidate,
      raised_2026: out.cycle_2026.total_raised,
      spent_2026: out.cycle_2026.total_spent,
      donors_2026: out.cycle_2026.unique_donors,
      raised_lifetime: out.lifetime.total_raised,
      spent_lifetime: out.lifetime.total_spent,
      donors_lifetime: out.lifetime.unique_donors,
      cycles: out.cycles_active,
      committees: out.committees_referenced,
    });
  }
  fs.writeFileSync(path.join(OUT_DIR, '_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\nWrote ${CANDIDATES.length + 1} files to ${OUT_DIR}/`);
})();
