#!/usr/bin/env node
/**
 * derive-partisan-committees.cjs
 *
 * Empirically derives partisan-alignment for FEC committees by scanning
 * every monetary edge TO a politician with a known party. A committee
 * whose spending is ≥ threshold% to one party is flagged partisan; one
 * that spends meaningfully to both is flagged NEUTRAL (bipartisan /
 * both-sides) to prevent mis-classification by classify-ie-edges.cjs.
 *
 * This replaces the hand-curated map in classify-ie-edges.cjs for the
 * long tail. The human map stays as an override for edge cases where
 * behavior is ambiguous or editorial judgment matters (e.g. Lincoln
 * Project technically spends against R candidates but reads as anti-
 * Trump-specific, which the human map captures).
 *
 * Output: scripts/derived/partisan-committees.auto.json
 *
 * Usage:
 *   node scripts/derive-partisan-committees.cjs            # write report only
 *   node scripts/derive-partisan-committees.cjs --write    # write auto.json
 *   node scripts/derive-partisan-committees.cjs --threshold 0.9
 *   node scripts/derive-partisan-committees.cjs --min-edges 5
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { loadEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const POLITICIANS_DIR = path.join(ROOT, 'content', 'Politicians');
const OUT_DIR = path.join(__dirname, 'derived');
const OUT_FILE = path.join(OUT_DIR, 'partisan-committees.auto.json');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const WRITE = args.includes('--write');
const COMPARE = args.includes('--compare');
const THRESHOLD = parseFloat(argVal('--threshold', '0.9'));   // % to one side
const MIN_EDGES = parseInt(argVal('--min-edges', '5'), 10);    // ignore tiny committees
const MIN_DOLLARS = parseFloat(argVal('--min-dollars', '10000')); // ignore < $10K

// Load the hand map from classify-ie-edges.cjs for compare mode
function loadHandMap() {
  try {
    const src = fs.readFileSync(path.join(__dirname, 'classify-ie-edges.cjs'), 'utf-8');
    const m = src.match(/const PARTISAN_COMMITTEES = \{([\s\S]*?)\n\};/);
    if (!m) return new Map();
    const out = new Map();
    for (const line of m[1].split('\n')) {
      const mm = line.match(/^\s*['"]([^'"]+)['"]\s*:\s*['"]([A-Z]+)['"]/);
      if (mm) out.set(mm[1].toLowerCase().trim(), mm[2]);
    }
    return out;
  } catch { return new Map(); }
}

function loadPoliticianParties() {
  const parties = new Map();
  const stack = [POLITICIANS_DIR];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name.endsWith('.md')) {
        try {
          const text = fs.readFileSync(full, 'utf-8');
          const m = text.match(/^---\n([\s\S]*?)\n---/);
          if (!m) continue;
          const fm = yaml.load(m[1]) || {};
          if (!fm.title) continue;
          const partyRaw = (fm.party || '').toString().toLowerCase();
          const party = partyRaw.startsWith('r') ? 'R'
                      : partyRaw.startsWith('d') ? 'D'
                      : partyRaw.startsWith('i') ? 'I' : null;
          if (party) parties.set(fm.title, party);
        } catch {}
      }
    }
  }
  return parties;
}

(function main() {
  console.log(`[derive-partisan-committees] threshold=${THRESHOLD} min-edges=${MIN_EDGES} min-dollars=$${MIN_DOLLARS}\n`);

  const parties = loadPoliticianParties();
  const edges = loadEdges();

  // Per-committee: raw D/R engagement (support + attack) so we can detect
  // intra-party primary IE (same party supports + opposes) vs inter-party
  // (only attacks one party). This disambiguates NARAL-style D-aligned
  // primarying from SLF-style inter-party attack spending.
  const byCmte = new Map();

  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (!e.from || !e.to) continue;
    if (!e.source || !e.source.startsWith('fec-')) continue;

    const toParty = parties.get(e.to);
    if (toParty !== 'D' && toParty !== 'R') continue;

    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;

    if (!byCmte.has(e.from)) {
      byCmte.set(e.from, {
        // Track support / oppose / donation per target-party so we can
        // detect intra-party primarying (support to D + oppose to D).
        D: { support: 0, oppose: 0, donation: 0 },
        R: { support: 0, oppose: 0, donation: 0 },
        total_edges: 0,
        total_amount: 0,
        roles: { null: 0, 'ie-support': 0, 'ie-oppose': 0 },
      });
    }
    const rec = byCmte.get(e.from);
    const bucket = e.role === 'ie-support' ? 'support'
                 : e.role === 'ie-oppose' ? 'oppose'
                 : 'donation';
    rec[toParty][bucket] += amt;
    rec.total_edges++;
    rec.total_amount += amt;
    const roleKey = e.role || 'null';
    if (roleKey in rec.roles) rec.roles[roleKey]++;
  }

  const results = { R: [], D: [], NEUTRAL: [], WEAK: [] };

  for (const [name, rec] of byCmte.entries()) {
    if (rec.total_edges < MIN_EDGES) continue;
    if (rec.total_amount < MIN_DOLLARS) continue;

    // Alignment heuristic:
    //   "Pro" a party = support + donations to that party + oppose against
    //      the OTHER party. Intra-party oppose (support & oppose same side)
    //      does NOT count as supporting the other side — it's primary
    //      activity.
    //   A committee that pro-Ds also has some pro-R spend is NEUTRAL only
    //   if the split is meaningful (>threshold). Otherwise aligned.
    const sameDonationSupport = (p, other) => {
      // intra-party primarying if support + oppose against same party
      return rec[p].support > 0 && rec[p].oppose > 0
    }
    const dIntraParty = sameDonationSupport('D');
    const rIntraParty = sameDonationSupport('R');

    // Pro-D = donations to D + support for D + (oppose R if NOT intra-R)
    const proD = rec.D.donation + rec.D.support + (rIntraParty ? 0 : rec.R.oppose);
    const proR = rec.R.donation + rec.R.support + (dIntraParty ? 0 : rec.D.oppose);
    const total = proD + proR;

    // Committees with only intra-party oppose and nothing else can't be
    // disambiguated from this data alone — classify as WEAK (dropped).
    if (total === 0) {
      results.WEAK.push({ name, reason: 'only intra-party oppose, no support signal', rec });
      continue;
    }

    const dPct = proD / total;
    const rPct = proR / total;

    let alignment;
    if (rPct >= THRESHOLD) alignment = 'R';
    else if (dPct >= THRESHOLD) alignment = 'D';
    else alignment = 'NEUTRAL';

    const summary = {
      name,
      alignment,
      pro_d: Math.round(proD),
      pro_r: Math.round(proR),
      d_support: Math.round(rec.D.support),
      d_oppose: Math.round(rec.D.oppose),
      d_donation: Math.round(rec.D.donation),
      r_support: Math.round(rec.R.support),
      r_oppose: Math.round(rec.R.oppose),
      r_donation: Math.round(rec.R.donation),
      intra_d: dIntraParty,
      intra_r: rIntraParty,
      total_edges: rec.total_edges,
      total_amount: Math.round(rec.total_amount),
      d_pct: +dPct.toFixed(3),
      r_pct: +rPct.toFixed(3),
      roles: rec.roles,
    };
    results[alignment].push(summary);
  }

  for (const k of ['R', 'D', 'NEUTRAL']) {
    results[k].sort((a, b) => b.total_amount - a.total_amount);
  }

  console.log('Derivation summary:');
  console.log(`  committees examined (≥${MIN_EDGES} edges, ≥$${MIN_DOLLARS}): ${results.R.length + results.D.length + results.NEUTRAL.length + results.WEAK.length}`);
  console.log(`  → R-aligned: ${results.R.length}`);
  console.log(`  → D-aligned: ${results.D.length}`);
  console.log(`  → NEUTRAL (both-sides):  ${results.NEUTRAL.length}`);
  console.log(`  → WEAK (undeterminable):  ${results.WEAK.length}`);

  const intraFlag = r => (r.intra_d ? ' [primaries D]' : '') + (r.intra_r ? ' [primaries R]' : '');
  console.log('\nTop 10 R-aligned (auto):');
  results.R.slice(0, 10).forEach(r => console.log(`  $${(r.total_amount / 1e6).toFixed(1).padStart(7)}M  ${(r.r_pct * 100).toFixed(0)}% R  ${r.name}${intraFlag(r)}`));

  console.log('\nTop 10 D-aligned (auto):');
  results.D.slice(0, 10).forEach(r => console.log(`  $${(r.total_amount / 1e6).toFixed(1).padStart(7)}M  ${(r.d_pct * 100).toFixed(0)}% D  ${r.name}${intraFlag(r)}`));

  console.log('\nTop 10 NEUTRAL / both-sides (auto):');
  results.NEUTRAL.slice(0, 10).forEach(r => console.log(`  $${(r.total_amount / 1e6).toFixed(1).padStart(7)}M  D=${(r.d_pct * 100).toFixed(0)}%/R=${(r.r_pct * 100).toFixed(0)}%  ${r.name}`));

  if (COMPARE) {
    const hand = loadHandMap();
    console.log(`\nHand map entries: ${hand.size}`);

    const missingFromHand = [];
    const conflicts = [];
    for (const alignment of ['R', 'D']) {
      for (const r of results[alignment]) {
        const k = r.name.toLowerCase().trim();
        const handVal = hand.get(k);
        if (!handVal) {
          missingFromHand.push({ ...r, auto: alignment });
        } else if (handVal !== alignment && handVal !== 'NEUTRAL') {
          conflicts.push({ ...r, auto: alignment, hand: handVal });
        }
      }
    }

    console.log(`\nCandidates for hand map (auto-aligned, not in hand): ${missingFromHand.length}`);
    missingFromHand.slice(0, 25).forEach(r => {
      console.log(`  ${r.auto}  $${(r.total_amount / 1e6).toFixed(1).padStart(7)}M  ${(r[r.auto === 'R' ? 'r_pct' : 'd_pct'] * 100).toFixed(0)}%  ${r.name}`);
    });

    if (conflicts.length > 0) {
      console.log(`\nCONFLICTS (hand says X, auto says Y): ${conflicts.length}`);
      conflicts.forEach(r => {
        console.log(`  hand=${r.hand} auto=${r.auto}  D=${(r.d_pct * 100).toFixed(0)}%/R=${(r.r_pct * 100).toFixed(0)}%  ${r.name}`);
      });
    }
  }

  if (!WRITE) {
    console.log('\n[dry-run] no writes. Use --write to save to', path.relative(ROOT, OUT_FILE));
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const payload = {
    generated_at: new Date().toISOString(),
    threshold: THRESHOLD,
    min_edges: MIN_EDGES,
    min_dollars: MIN_DOLLARS,
    counts: {
      R: results.R.length,
      D: results.D.length,
      NEUTRAL: results.NEUTRAL.length,
    },
    // Flattened: name → alignment. Consumed by classify-ie-edges.cjs.
    alignment: {
      ...Object.fromEntries(results.R.map(r => [r.name.toLowerCase().trim(), 'R'])),
      ...Object.fromEntries(results.D.map(r => [r.name.toLowerCase().trim(), 'D'])),
      ...Object.fromEntries(results.NEUTRAL.map(r => [r.name.toLowerCase().trim(), 'NEUTRAL'])),
    },
    // Full diagnostic detail for review.
    committees: {
      R: results.R,
      D: results.D,
      NEUTRAL: results.NEUTRAL,
    },
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUT_FILE}`);
})();
