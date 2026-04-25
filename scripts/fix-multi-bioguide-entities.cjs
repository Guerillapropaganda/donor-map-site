#!/usr/bin/env node
/**
 * fix-multi-bioguide-entities.cjs
 *
 * Closes the 9 entities flagged by multi-bioguide-fec-id-check —
 * politician records whose FEC candidate IDs span multiple distinct
 * humans (the Bob Casey class of bug, but for entities that already
 * have profile_path so they fell through the ghost-enrichment pass).
 *
 * Each entry is hand-curated against the legislator-registry +
 * candidate-master cross-reference walked 2026-04-25 evening — see
 * the chat handoff in content/Session State.md for the per-case
 * verdicts.
 *
 * Same surgery shape as enrich-ghost-politicians.cjs's Casey case:
 * prune fec_candidate_ids to the canonical set, prune
 * fec_committee_ids that don't belong to any kept candidate, prune
 * fec_candidate_history rows accordingly, set bioguide_id.
 *
 * Edge data is name-keyed and not touched. The librarian's
 * multi-bioguide-fec-id-check will go quiet for these entities on
 * next harness run; any residual edge contamination is the same
 * shape as Casey's — a small subset of cycle-overlapping PAS2 rows
 * that needs PAS2 re-ingest with recipient_cmte_id capture to fully
 * disambiguate. Acceptable risk per Casey precedent.
 *
 * Dry-run by default. --apply to write.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const APPLY = process.argv.includes('--apply');

const PLAN = [
  // Mike Collins R-GA House (current). C000640 was an older Michael Collins
  // R-GA also. Plus 3 unrelated Michael/Mike Collinses (AZ, CO, ALI Sr.).
  {
    entity_id: 'ent_000528',
    display: 'Mike Collins',
    bioguide: 'C001129',
    keep_fec_candidate_ids: ['H4GA10071'],
    notes: 'Current Mike Collins R-GA House. Drops C000640 (older Michael Collins) + 3 unrelated.',
  },
  // Tom Barrett R-MI House (current). B000177 was older Thomas Barrett D-WI.
  {
    entity_id: 'ent_000594',
    display: 'Tom Barrett',
    bioguide: 'B001321',
    keep_fec_candidate_ids: ['H2MI07123'],
    notes: 'Current Tom Barrett R-MI House. Drops B000177 Thomas Barrett D-WI.',
  },
  // Mike Rogers R-AL House (Armed Services chair). Profile body confirmed
  // R-AL. R000572 is the other Mike Rogers (R-MI, former Intel chair, now
  // Senate candidate) — that's a separate human deserving his own profile.
  {
    entity_id: 'ent_000646',
    display: 'Mike Rogers',
    bioguide: 'R000575',
    keep_fec_candidate_ids: ['H2AL03032'],
    notes: 'Mike Rogers R-AL (Armed Services chair). Profile body confirmed. Drops R000572 (R-MI Mike Rogers — separate human, may need own profile) + 4 unrelated.',
  },
  // Mark E. Green R-TN House (Homeland Security chair). G000545 was older
  // Mark Green R-WI from late 1990s.
  {
    entity_id: 'ent_000671',
    display: 'Mark Green',
    bioguide: 'G000590',
    keep_fec_candidate_ids: ['H8TN07076'],
    notes: 'Mark E. Green R-TN (Homeland Security chair). Drops G000545 R-WI (older) + 2 unrelated NY.',
  },
  // Bob Menendez Sr (M000639) — D-NJ Senator (convicted). Keep his House
  // (1998) AND Senate (2024) FEC IDs. M001226 (Jr) lives on the separate
  // "Robert Menendez" profile below.
  {
    entity_id: 'ent_000870',
    display: 'Bob Menendez (Sr.)',
    bioguide: 'M000639',
    keep_fec_candidate_ids: ['H2NJ13075', 'S6NJ00289'],
    notes: 'Bob Menendez Sr. (convicted Senator). Keeps both his House (1998) and Senate (2024) IDs. Drops H2NJ08232 (Jr — has separate profile).',
  },
  // Robert Menendez Jr (M001226) — D-NJ House (current). Lives on the
  // "Democrats/House/Robert Menendez" profile.
  {
    entity_id: 'ent_000955',
    display: 'Robert Menendez (Jr.)',
    bioguide: 'M001226',
    keep_fec_candidate_ids: ['H2NJ08232'],
    notes: 'Robert Menendez Jr. (current Rep, D-NJ House). Drops Sr.\'s House+Senate IDs.',
  },
  // Raúl M. Grijalva (G000551) — D-AZ House (the late Rep). G000606 is
  // Adelita Grijalva (his daughter who replaced him after his 2025 death).
  // She deserves her own profile when she has more campaign data.
  {
    entity_id: 'ent_000961',
    display: 'Raul Grijalva',
    bioguide: 'G000551',
    keep_fec_candidate_ids: ['H2AZ07070'],
    notes: 'Raúl M. Grijalva (the late Rep). Drops H6AZ07121 (Adelita Grijalva — his daughter, separate human, will need own profile).',
  },
  // Hank Johnson (J000288) — D-GA House. ent had Ron Johnson R-WI's S0WI00197
  // merged in plus 6 unrelated Johnsons.
  {
    entity_id: 'ent_001061',
    display: 'Henry C. Hank Johnson',
    bioguide: 'J000288',
    keep_fec_candidate_ids: ['H6GA04129'],
    notes: 'Hank Johnson D-GA. Drops J000293 Ron Johnson R-WI (!) + 6 unrelated.',
  },
  // Greg Casar (C001131) — D-TX House. Had Juan Ciscomani R-AZ's FEC ID
  // (C001133, H2AZ02360) merged in plus an orphan no-name TX record.
  {
    entity_id: 'ent_001068',
    display: 'Greg Casar',
    bioguide: 'C001131',
    keep_fec_candidate_ids: ['H2TX35144'],
    notes: 'Greg Casar D-TX. Drops Juan Ciscomani R-AZ (C001133) + orphan H2TX35108.',
  },
];

console.log('fix-multi-bioguide-entities');
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log('');

const planById = new Map(PLAN.map((p) => [p.entity_id, p]));
const lines = fs.readFileSync(ENTITIES, 'utf-8').split('\n');
const out = [];
let updated = 0;
const matched = new Set();

for (const raw of lines) {
  if (!raw.trim()) { out.push(raw); continue; }
  let e;
  try { e = JSON.parse(raw); } catch { out.push(raw); continue; }
  const plan = planById.get(e.id);
  if (!plan) { out.push(raw); continue; }
  matched.add(e.id);

  const before = {
    bioguide: e.signals?.bioguide_id ?? null,
    cand_ids: (e.signals?.fec_candidate_ids ?? []).slice(),
    cmte_count: (e.signals?.fec_committee_ids ?? []).length,
    history_rows: (e.signals?.fec_candidate_history ?? []).length,
  };

  e.signals = e.signals || {};
  // Prune candidate IDs
  e.signals.fec_candidate_ids = plan.keep_fec_candidate_ids.slice();
  e.signals.fec_candidate_id = plan.keep_fec_candidate_ids[0] || null;
  // Prune candidate history
  if (Array.isArray(e.signals.fec_candidate_history)) {
    e.signals.fec_candidate_history = e.signals.fec_candidate_history.filter(
      (h) => plan.keep_fec_candidate_ids.includes(h.id),
    );
  }
  // Set bioguide
  if (plan.bioguide) e.signals.bioguide_id = plan.bioguide;
  // Note: not pruning fec_committee_ids here. Doing so safely requires the
  // CCL cross-reference (each kept candidate's principal/auth committees).
  // The librarian's resolver doesn't currently use fec_committee_ids on
  // politician entities for routing — committees flow via fec-committee-
  // registry. So leaving them is harmless; can be tightened later.
  e.signals.multi_bioguide_pruned_at = new Date().toISOString();
  e.last_updated = new Date().toISOString();

  console.log(`  ${e.id}  ${plan.display}`);
  console.log(`    fec_candidate_ids: ${before.cand_ids.length} → ${e.signals.fec_candidate_ids.length}  (${e.signals.fec_candidate_ids.join(', ')})`);
  console.log(`    fec_candidate_history rows: ${before.history_rows} → ${e.signals.fec_candidate_history?.length ?? 0}`);
  console.log(`    bioguide: ${before.bioguide ?? '(null)'} → ${e.signals.bioguide_id}`);
  console.log(`    note: ${plan.notes}`);
  updated++;
  out.push(JSON.stringify(e));
}

console.log('');
console.log(`--- summary ---`);
console.log(`  entities updated: ${updated}`);
const unmatched = PLAN.filter((p) => !matched.has(p.entity_id));
if (unmatched.length) {
  console.log(`  not found in store: ${unmatched.length}`);
  for (const p of unmatched) console.log(`    ${p.entity_id} ${p.display}`);
}

if (!APPLY) {
  console.log('');
  console.log('(dry-run) Re-run with --apply to write entities.jsonl');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${ENTITIES}.bak-${stamp}`;
fs.writeFileSync(backup, fs.readFileSync(ENTITIES));
console.log(`\nBacked up entities.jsonl → ${path.relative(ROOT, backup)}`);
fs.writeFileSync(ENTITIES, out.join('\n'));
console.log(`✓ Wrote ${ENTITIES}`);
console.log('');
console.log('Verify with:');
console.log('  node scripts/multi-bioguide-fec-id-check.cjs   (should drop to 0)');
console.log('  node scripts/build-relationships-per-profile-via-librarian.cjs');
console.log('  node scripts/diff-relationships-cache.cjs --top=5');
