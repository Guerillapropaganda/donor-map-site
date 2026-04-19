#!/usr/bin/env node
/**
 * reconcile-canonical-totals.cjs
 *
 * End-to-end verification that /ask's pooled-total computation for a
 * canonical set of subjects matches a hand-curated expected range. Runs
 * the same pooling logic as route.ts handleDonorsTo (main entity +
 * vehiclesFor expansion, filter out ie-oppose + deprecated + self-
 * edges, sum amounts) and compares to curated BOUNDS per subject.
 *
 * The bounds are wide (±tolerance around an expected mid-point)
 * because our edge data aggregates multiple cycles plus committee-to-
 * committee transfers that OpenSecrets may report differently. What
 * matters is the magnitude: if we report $228M where OpenSecrets
 * reports $1.45B, that's a bug. If we report $1.72B where OpenSecrets
 * reports $1.45B, the extras are cross-cycle + JFC pass-throughs and
 * we're in the right neighborhood.
 *
 * Refresh CANONICAL_SUBJECTS as new large figures enter the launch-50.
 * Each entry: { name, expectedMid, tolerance, why } where tolerance is
 * the acceptable fractional deviation from expectedMid.
 *
 * Usage:
 *   node scripts/reconcile-canonical-totals.cjs           # print report
 *   node scripts/reconcile-canonical-totals.cjs --strict  # exit 1 on any fail
 */

const fs = require('fs');
const path = require('path');
const { loadEdges } = require('./lib/relationships-store.cjs');
const { loadEntities } = require('./lib/entities-store.cjs');

const STRICT = process.argv.includes('--strict');
const VERBOSE = process.argv.includes('--verbose');

// ─── Manual vehicle map (mirror of ops/src/app/api/ask/route.ts) ─────
// Kept in sync with the frontend's MANUAL_VEHICLE_MAP. When a new entry
// is added there, add it here too.
const MANUAL_VEHICLE_MAP = {
  "Donald Trump": [
    "MAGA Inc", "Make America Great Again Inc", "MAKE AMERICA GREAT AGAIN INC.",
    "Save America PAC", "Trump Victory", "Trump National Committee JFC",
    "Donald J. Trump for President", "DONALD J. TRUMP REPUBLICAN NOMINEE FUND 2024",
    "Team Trump", "Right for America", "Preserve America", "America PAC - Elon Musk",
  ],
  "Kamala Harris": [
    "Harris for President", "Harris Victory Fund", "KAMALA HARRIS VICTORY FUND",
    "HARRIS VICTORY FUND", "FF PAC", "Future Forward USA Action", "FUTURE FORWARD USA ACTION",
  ],
  "Leonard Leo": [
    "Marble Freedom Trust", "The 85 Fund", "Concord Fund",
    "Judicial Crisis Network", "Rule of Law Trust", "DonorsTrust",
  ],
  "Charles Koch": ["Americans for Prosperity", "Stand Together", "Koch Industries"],
  "Mitch McConnell": ["Senate Leadership Fund", "SLF PAC", "One Nation"],
  "Chuck Schumer": ["Senate Majority PAC", "Majority Forward"],
  "Nancy Pelosi": ["House Majority PAC", "HMP"],
};

// ─── vehiclesFor (mirror of route.ts) ────────────────────────────────
function vehiclesFor(personName, ents) {
  if (!personName) return [];
  const out = new Set(MANUAL_VEHICLE_MAP[personName] || []);
  if (personName.length > 6) {
    const needle = personName.toLowerCase();
    const controllerTypes = new Set(['donor', 'pac', 'nonprofit', 'corporation', 'network']);
    for (const e of ents) {
      if (e.name === personName) continue;
      if (e.name.length <= personName.length) continue;
      if (!controllerTypes.has(e.entity_type || '')) continue;
      if (e.name.toLowerCase().includes(needle)) out.add(e.name);
    }
  }
  return [...out];
}

// ─── Pool donor inflows: same rules as route.ts handleDonorsTo ───────
function pooledInflows(edges, subject, vehicles) {
  const tSet = new Set([subject, ...vehicles]);
  let total = 0;
  const perVehicle = {};
  let count = 0;
  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (!e.amount) continue;
    if (e.role === 'ie-oppose') continue;
    if (e.status === 'deprecated') continue;
    if (e.from === e.to) continue;
    if (!tSet.has(e.to)) continue;
    total += e.amount;
    perVehicle[e.to] = (perVehicle[e.to] || 0) + e.amount;
    count++;
  }
  return { total, perVehicle, count };
}

// ─── Canonical bounds ────────────────────────────────────────────────
// Each row: name, expected mid-point dollars, tolerance fraction, why
// the number is what it is. Bounds are intentionally generous because
// our store aggregates multiple cycles + JFCs + IE that OpenSecrets
// may report in separate buckets.
const CANONICAL_SUBJECTS = [
  {
    name: 'Donald Trump',
    expectedMid: 1.2e9,
    tolerance: 0.50, // 50% — our total crosses many cycles, OpenSecrets is 1-cycle snapshot
    why: 'OpenSecrets 2024-only: $1.45B (campaign + outside). Our pool includes multiple cycles + JFCs.',
  },
  {
    name: 'Kamala Harris',
    expectedMid: 1.0e9,
    tolerance: 0.50,
    why: 'OpenSecrets 2024: ~$1B (campaign + Future Forward $540M). Our pool adds prior cycles.',
  },
  {
    name: 'Leonard Leo',
    expectedMid: 1.2e9,
    tolerance: 0.60,
    why: 'Marble Freedom Trust + 85 Fund + Judicial Crisis Network lifetime grants.',
  },
  {
    name: 'Mitch McConnell',
    expectedMid: 1.4e9,
    tolerance: 0.50,
    why: 'SLF PAC lifetime receipts alone $1.48B across 2015-2026 cycles + One Nation ~$14M. SLF is the largest Republican Senate super PAC.',
  },
];

(function main() {
  console.log(`[reconcile-canonical-totals]${STRICT ? ' STRICT' : ''}\n`);

  const edges = loadEdges();
  const ents = loadEntities();

  let okCount = 0, failCount = 0;
  const failed = [];

  for (const subj of CANONICAL_SUBJECTS) {
    const vehicles = vehiclesFor(subj.name, ents);
    const pool = pooledInflows(edges, subj.name, vehicles);
    const low = subj.expectedMid * (1 - subj.tolerance);
    const high = subj.expectedMid * (1 + subj.tolerance);
    const pass = pool.total >= low && pool.total <= high;
    if (pass) okCount++; else { failCount++; failed.push({ subj, pool }); }

    const marker = pass ? '✓' : '✗';
    const actualM = (pool.total / 1e6).toFixed(0);
    const midM = (subj.expectedMid / 1e6).toFixed(0);
    const lowM = (low / 1e6).toFixed(0);
    const highM = (high / 1e6).toFixed(0);

    console.log(`  ${marker} ${subj.name.padEnd(20)} actual=$${actualM}M  expected=$${midM}M ±${(subj.tolerance * 100).toFixed(0)}% [$${lowM}M–$${highM}M]`);
    console.log(`      ${pool.count} edges pooled across ${vehicles.length + 1} entities`);
    if (VERBOSE || !pass) {
      const topVehicles = Object.entries(pool.perVehicle).sort((a, b) => b[1] - a[1]).slice(0, 5);
      topVehicles.forEach(([v, a]) => console.log(`        $${(a / 1e6).toFixed(0).padStart(5)}M  ${v}`));
    }
    console.log(`      why: ${subj.why}\n`);
  }

  console.log('─'.repeat(80));
  console.log(`  ✓ in bounds: ${okCount}`);
  console.log(`  ✗ out of bounds: ${failCount}`);

  if (STRICT && failCount > 0) {
    console.log('\nOut-of-bounds entries (fix before merging):');
    failed.forEach(f => console.log(`  ${f.subj.name}: actual $${(f.pool.total / 1e6).toFixed(0)}M vs expected $${(f.subj.expectedMid / 1e6).toFixed(0)}M ±${(f.subj.tolerance * 100).toFixed(0)}%`));
    process.exitCode = 1;
  }
})();
