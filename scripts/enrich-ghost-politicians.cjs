#!/usr/bin/env node
/**
 * enrich-ghost-politicians.cjs
 *
 * Upgrades the ghost politician entity records flagged by
 * pathless-stub-entities-check + audit-ghost-politicians to "real"
 * entities by attaching the existing flat .md profile that was already
 * sitting in the vault all along. Same structural fix as the Goldman
 * case in merge-phantom-entity-records — the data was there, the
 * entity record just didn't know.
 *
 * For each enriched ghost the script sets:
 *   - profile_path  → the existing flat .md path
 *   - signals.bioguide_id (when known)
 *   - signals.party / chamber / state (from legislator-registry)
 *
 * Bob Casey is included in a second pass with explicit FEC ID
 * pruning (prune_fec_candidate_ids_to + prune_fec_committee_ids_drop)
 * after edge analysis showed his ghost was a 4-Casey chimera but the
 * actual edge contamination is small enough to publish safely with
 * pruned identifiers. See ghost-politicians-audit.md for the analysis.
 *
 * Dry-run by default. --apply to write.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const APPLY = process.argv.includes('--apply');

// Hand-curated mapping of (ghost name) → (existing flat .md path,
// bioguide if any). Each row was verified against the audit output
// 2026-04-25; same-person ambiguous cases (Mace, Lee, Bennet) keep all
// FEC IDs because the suspect IDs are their own additional cycles.
const ENRICHMENT_PLAN = [
  { name: 'Bill Hagerty',             path: 'content/Politicians/Republicans/Senate/Bill Hagerty.md',           bioguide: 'H000601' },
  { name: 'Mark Kelly',               path: 'content/Politicians/Democrats/Senate/Mark Kelly.md',               bioguide: 'K000377' },
  { name: 'Katie Britt',              path: 'content/Politicians/Republicans/Senate/Katie Britt.md',            bioguide: 'B001319' },
  { name: 'Catherine Cortez Masto',   path: 'content/Politicians/Democrats/Senate/Catherine Cortez Masto.md',   bioguide: 'C001113' },
  { name: 'Ritchie Torres',           path: 'content/Politicians/Democrats/House/Ritchie Torres.md',            bioguide: 'T000486' },
  { name: 'Nancy Mace',               path: 'content/Politicians/Republicans/House/Nancy Mace.md',              bioguide: 'M000194' },
  { name: 'Bernie Moreno',            path: 'content/Politicians/Republicans/Senate/Bernie Moreno.md',          bioguide: 'M001242' },
  { name: 'Barbara Lee',              path: 'content/Politicians/Democrats/House/Barbara Lee.md',               bioguide: 'L000551' },
  { name: 'Adam Schiff',              path: 'content/Politicians/Democrats/Senate/Adam Schiff.md',              bioguide: 'S001150' },
  { name: 'Sherrod Brown',            path: 'content/Politicians/Democrats/Former/Sherrod Brown.md',            bioguide: 'B000944' },
  { name: 'Dianne Feinstein',         path: 'content/Politicians/Democrats/Senate/Dianne Feinstein.md',         bioguide: 'F000062' },
  { name: 'Michael Bennet',           path: 'content/Politicians/Democrats/Senate/Michael Bennet.md',           bioguide: 'B001267' },
  { name: 'Chris Christie',           path: 'content/Politicians/Independent/Chris Christie.md',                bioguide: null /* never federal Congress */ },
  // Bob Casey added 2026-04-25 evening (second pass). The ghost was a chimera of 4
  // Robert/Bob Caseys (Sr presidential 1996, Jr PA Senator, Robert D MI House 2006,
  // Robert J PA House 1978). Edge analysis showed 365/780 definitively Casey Jr via
  // FEC committee provenance, 19 cycle-2006 PAS2 ambiguous (Jr's first Senate run
  // overlap with Robert D MI House 2006), 396 wikilink-class (no provenance — vault
  // content is contemporary so safely Jr). Surgery below: prune FEC candidate IDs to
  // just S6PA00217 (Casey Jr) and committee IDs to the 24 owned by him per FEC CCL.
  // Drops C00397380 (Robert D Casey MI principal cmte) and C00301762 (Casey Sr 1996
  // presidential cmte). Residual 19-edge cycle-2006 PAS2 ambiguity documented in the
  // ghost audit; fix needs PAS2 re-ingest with recipient_cmte_id captured.
  {
    name: 'Bob Casey',
    path: 'content/Politicians/Democrats/Senate/Bob Casey.md',
    bioguide: 'C001070',
    prune_fec_candidate_ids_to: ['S6PA00217'],
    prune_fec_committee_ids_drop: ['C00397380', 'C00301762'],
  },
];

console.log('enrich-ghost-politicians');
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log('');

// Verify every planned profile_path exists on disk
const missingFiles = ENRICHMENT_PLAN.filter((p) => !fs.existsSync(path.join(ROOT, p.path)));
if (missingFiles.length) {
  console.error('ABORT — these planned profile_paths do not exist on disk:');
  for (const m of missingFiles) console.error('  ' + m.name + '  →  ' + m.path);
  process.exit(1);
}
console.log(`Verified ${ENRICHMENT_PLAN.length} flat .md profiles exist`);

// Load legislator-registry for party/chamber/state lookup
const legByBioguide = new Map();
for (const l of fs.readFileSync(LEGISLATORS, 'utf-8').split('\n').filter((x) => x.trim())) {
  let r; try { r = JSON.parse(l); } catch { continue; }
  if (r.bioguide) legByBioguide.set(r.bioguide, r);
}
console.log(`Loaded ${legByBioguide.size} legislator records for cross-reference`);

// Walk entities.jsonl
const lines = fs.readFileSync(ENTITIES, 'utf-8').split('\n');
let updated = 0;
let unmatched = 0;
const unmatchedNames = [];
const planByName = new Map(ENRICHMENT_PLAN.map((p) => [p.name, p]));
const matched = new Set();

const out = [];
for (const raw of lines) {
  if (!raw.trim()) { out.push(raw); continue; }
  let e;
  try { e = JSON.parse(raw); } catch { out.push(raw); continue; }
  const plan = planByName.get(e.name);
  if (!plan || e.entity_type !== 'politician' || e.profile_path) {
    out.push(raw);
    continue;
  }
  matched.add(e.name);

  // Derive party/chamber/state from legislator-registry if possible
  const leg = plan.bioguide ? legByBioguide.get(plan.bioguide) : null;
  const t = leg?.current_term || {};

  e.profile_path = plan.path;
  e.signals = e.signals || {};
  if (plan.bioguide) e.signals.bioguide_id = plan.bioguide;
  if (t.party && !e.signals.party) e.signals.party = t.party;
  if (t.chamber && !e.signals.chamber) {
    e.signals.chamber = t.chamber.charAt(0).toUpperCase() + t.chamber.slice(1);
  }
  if (t.state && !e.signals.state_abbr) e.signals.state_abbr = t.state;
  // Per-ghost contamination pruning (Bob Casey case): prune FEC IDs that
  // belong to a different same-named human, identified by FEC candidate-
  // master cross-reference.
  if (Array.isArray(plan.prune_fec_candidate_ids_to)) {
    e.signals.fec_candidate_ids = plan.prune_fec_candidate_ids_to.slice();
    e.signals.fec_candidate_id = plan.prune_fec_candidate_ids_to[0] || null;
    if (Array.isArray(e.signals.fec_candidate_history)) {
      e.signals.fec_candidate_history = e.signals.fec_candidate_history.filter(
        (h) => plan.prune_fec_candidate_ids_to.includes(h.id),
      );
    }
  }
  if (Array.isArray(plan.prune_fec_committee_ids_drop) && Array.isArray(e.signals.fec_committee_ids)) {
    const drop = new Set(plan.prune_fec_committee_ids_drop);
    e.signals.fec_committee_ids = e.signals.fec_committee_ids.filter((c) => !drop.has(c));
    if (drop.has(e.signals.fec_committee_id)) e.signals.fec_committee_id = e.signals.fec_committee_ids[0] || null;
  }
  e.signals.enriched_via_ghost_promotion_at = new Date().toISOString();
  e.last_updated = new Date().toISOString();

  console.log(`  ${e.id}  ${e.name.padEnd(28)} → ${plan.path}${plan.bioguide ? '  bioguide=' + plan.bioguide : ''}`);
  updated++;
  out.push(JSON.stringify(e));
}

for (const planned of ENRICHMENT_PLAN) {
  if (!matched.has(planned.name)) {
    unmatched++;
    unmatchedNames.push(planned.name);
  }
}

console.log('');
console.log(`--- summary ---`);
console.log(`  ghosts enriched:                 ${updated}`);
console.log(`  planned but not found in store:  ${unmatched}`);
if (unmatchedNames.length) {
  for (const n of unmatchedNames) console.log('    ' + n);
}

if (!APPLY) {
  console.log('');
  console.log('(dry-run) Re-run with --apply to write entities.jsonl');
  process.exit(0);
}

// Backup + write
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${ENTITIES}.bak-${stamp}`;
fs.writeFileSync(backup, fs.readFileSync(ENTITIES));
console.log(`\nBacked up entities.jsonl → ${path.relative(ROOT, backup)}`);
fs.writeFileSync(ENTITIES, out.join('\n'));
console.log(`✓ Wrote ${ENTITIES}`);
console.log('');
console.log('Re-run scripts/build-relationships-per-profile-via-librarian.cjs +');
console.log('scripts/diff-relationships-cache.cjs to confirm enriched ghosts now');
console.log('resolve in the librarian-backed cache.');
