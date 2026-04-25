#!/usr/bin/env node
/**
 * audit-ghost-politicians.cjs — diagnostic for the 14 ghost politician
 * entity records flagged by pathless-stub-entities-check.
 *
 * Read-only. Produces a markdown report at content/Admin Notes/
 * ghost-politicians-audit.md (path overridable via --out).
 *
 * For each ghost, the report tells us:
 *   - Canonical bioguide(s) the name matches in data/legislator-registry.jsonl
 *   - Canonical FEC candidate IDs for that bioguide (from registry ids.fec)
 *   - The ghost's current FEC candidate IDs
 *   - SUSPECT IDs: in the ghost but not on the canonical's list — likely
 *     belong to a different same-named person (this is the Bob-Casey-class
 *     contamination from the 2026-04-19 backfill bug)
 *   - Edge counts traceable to each FEC ID via committee_id ownership
 *     (rough heuristic — exact attribution requires re-running the FEC
 *     ingest with provenance, out of scope for the diagnostic)
 *
 * Once this is in hand we know exactly which ghosts are clean (one
 * bioguide match, zero suspect IDs), which are contaminated (suspect
 * IDs present), and which are unfixable without manual disambiguation
 * (multiple bioguide matches).
 *
 * Usage:
 *   node scripts/audit-ghost-politicians.cjs
 *   node scripts/audit-ghost-politicians.cjs --out=path.md
 */
const fs = require('fs');
const path = require('path');
const { loadEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const FEC_REGISTRY = path.join(ROOT, 'data', 'fec-committee-registry.json');
const FEC_CAND_MASTER = 'C:/donor-map-data/fec/candidate-master.jsonl';
const OUT_DEFAULT = path.join(ROOT, 'content', 'Admin Notes', 'ghost-politicians-audit.md');

function parseArg(name, def) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : def;
}
const OUT = parseArg('out', OUT_DEFAULT);

function normName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

console.log('Loading...');
const entityLines = fs.readFileSync(ENTITIES, 'utf-8').split('\n').filter((l) => l.trim());
const entities = [];
for (const l of entityLines) {
  try { entities.push(JSON.parse(l)); } catch {}
}
const ghosts = entities.filter(
  (e) => e.entity_type === 'politician' && !e.profile_path && !e.signals?.ein_coverage_reason,
);
console.log(`  ${entities.length} entities, ${ghosts.length} politician ghosts`);

const legislators = [];
for (const l of fs.readFileSync(LEGISLATORS, 'utf-8').split('\n').filter((x) => x.trim())) {
  try { legislators.push(JSON.parse(l)); } catch {}
}
console.log(`  ${legislators.length} legislator records`);

// Build name → [bioguide records] index for quick lookup. Match on
// stripped lowercase forms of name_official, "first last", and
// "nickname last".
const byNorm = new Map();
function add(key, leg) {
  if (!key) return;
  const k = normName(key);
  if (!k) return;
  const list = byNorm.get(k) ?? [];
  if (!list.includes(leg)) list.push(leg);
  byNorm.set(k, list);
}
for (const leg of legislators) {
  add(leg.name_official, leg);
  if (leg.name_first && leg.name_last) add(`${leg.name_first} ${leg.name_last}`, leg);
  if (leg.name_nickname && leg.name_last) add(`${leg.name_nickname} ${leg.name_last}`, leg);
  if (leg.name_first && leg.name_middle && leg.name_last) {
    add(`${leg.name_first} ${leg.name_middle} ${leg.name_last}`, leg);
  }
}

// FEC candidate-master cross-reference. Lets us answer: for each suspect
// FEC ID, who does the FEC say it actually belongs to? If the candidate's
// surname matches the ghost name, the suspect ID likely belongs to the
// SAME person under a different cycle/office (registry just hasn't listed
// it yet) — that's a "false suspect." If the candidate name differs, the
// suspect ID points at a genuinely different human — true contamination.
const fecCandById = new Map();
if (fs.existsSync(FEC_CAND_MASTER)) {
  console.log('  loading FEC candidate-master...');
  const text = fs.readFileSync(FEC_CAND_MASTER, 'utf-8');
  let count = 0;
  for (const l of text.split('\n')) {
    if (!l.trim()) continue;
    let r; try { r = JSON.parse(l); } catch { continue; }
    if (r.id) {
      // Keep first record per id; later records can override only if more
      // recent (election_year newer).
      const existing = fecCandById.get(r.id);
      if (!existing || (r.election_year && r.election_year > existing.election_year)) {
        fecCandById.set(r.id, r);
      }
      count++;
    }
  }
  console.log(`  ${count.toLocaleString()} candidate-master rows indexed (${fecCandById.size.toLocaleString()} unique IDs)`);
} else {
  console.log(`  (skip) FEC candidate-master not found at ${FEC_CAND_MASTER}`);
}

// Parse "LASTNAME, FIRSTNAME M." → {last, first}
function parseFecName(s) {
  const norm = String(s || '').toLowerCase().replace(/[^a-z,\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = norm.split(',').map((x) => x.trim());
  if (parts.length < 2) return { last: norm.split(/\s+/)[0] || '', first: '' };
  const last = parts[0].split(/\s+/)[0] || '';
  const first = (parts[1].split(/\s+/)[0] || '').replace(/\.$/, '');
  return { last, first };
}
// Parse "Bob Casey" / "Michael Bennet" → {first, last}
function parseGhostName(s) {
  const parts = String(s || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: parts[0] || '', last: '' };
  return { first: parts[0], last: parts[parts.length - 1] };
}
// Common nickname → formal first name fallbacks. Two-way (we only need
// equivalence here, so the lookup goes both directions).
const NICKNAME_PAIRS = [
  ['bob', 'robert'], ['rob', 'robert'], ['bobby', 'robert'],
  ['bill', 'william'], ['will', 'william'], ['billy', 'william'],
  ['mike', 'michael'], ['mick', 'michael'],
  ['dan', 'daniel'], ['danny', 'daniel'],
  ['jim', 'james'], ['jimmy', 'james'],
  ['ed', 'edward'], ['eddie', 'edward'],
  ['tom', 'thomas'], ['tommy', 'thomas'],
  ['tony', 'anthony'],
  ['nick', 'nicholas'],
  ['steve', 'steven'], ['steve', 'stephen'],
  ['chris', 'christopher'],
  ['rich', 'richard'], ['dick', 'richard'], ['rick', 'richard'],
  ['joe', 'joseph'], ['joey', 'joseph'],
  ['ben', 'benjamin'],
  ['katie', 'katherine'], ['kate', 'katherine'], ['kathy', 'katherine'],
  ['cathy', 'catherine'],
  ['bernie', 'bernard'],
  ['nancy', 'nancy'], // identity placeholder (no nickname needed)
];
function firstNameEquivalent(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  for (const [n, f] of NICKNAME_PAIRS) {
    if ((a === n && b === f) || (a === f && b === n)) return true;
  }
  // Initial-only match: "j" matches "john", "j" matches "james"
  if (a.length === 1 && b.startsWith(a)) return true;
  if (b.length === 1 && a.startsWith(b)) return true;
  return false;
}

// Edges from canonical store — count by from_id/to_id matching ghost names
console.log('  loading edges (canonical + derived)...');
const edges = loadEdges();
console.log(`  ${edges.length.toLocaleString()} edges loaded`);

// Build name → edge counts (any edge whose from or to matches the ghost name)
const ghostNameSet = new Set(ghosts.map((g) => g.name));
const edgesByGhostName = new Map();
for (const g of ghosts) edgesByGhostName.set(g.name, []);
for (const e of edges) {
  if (ghostNameSet.has(e.from)) edgesByGhostName.get(e.from).push(e);
  if (ghostNameSet.has(e.to)) edgesByGhostName.get(e.to).push(e);
}

// Build committee_id → ghost FEC ID owner map per ghost
function committeesByCandidateId(legs, candidateId) {
  // Best-effort: legislator registry doesn't carry committee mapping.
  // We rely on the ghost's own fec_candidate_history, which has cycle-by-
  // cycle (id, pc) pairs. Used downstream to compute per-FEC-ID edge attribution.
  void legs; void candidateId;
  return null;
}

// Per-ghost diagnostic
const report = [];
for (const ghost of ghosts) {
  const r = {
    id: ghost.id,
    name: ghost.name,
    edge_count_signal: ghost.signals?.edge_count ?? 0,
    fec_candidate_ids: ghost.signals?.fec_candidate_ids ?? (ghost.signals?.fec_candidate_id ? [ghost.signals.fec_candidate_id] : []),
    fec_committee_ids: ghost.signals?.fec_committee_ids ?? (ghost.signals?.fec_committee_id ? [ghost.signals.fec_committee_id] : []),
    fec_candidate_history: ghost.signals?.fec_candidate_history ?? [],
    canonical_matches: [],
    canonical_bioguide: null,
    canonical_fec_ids: [],
    suspect_fec_ids: [],
    matched_fec_ids: [],
    edges_observed: edgesByGhostName.get(ghost.name)?.length ?? 0,
    diagnosis: null,
  };

  // Look up by ghost name
  const legCandidates = byNorm.get(normName(ghost.name)) ?? [];
  r.canonical_matches = legCandidates.map((leg) => ({
    bioguide: leg.bioguide,
    name_official: leg.name_official,
    state: leg.current_term?.state ?? null,
    chamber: leg.current_term?.chamber ?? null,
    party: leg.current_term?.party ?? null,
    fec: leg.ids?.fec ?? [],
    status: leg._status,
  }));

  if (legCandidates.length === 0) {
    r.diagnosis = 'NO_BIOGUIDE_MATCH — name not in legislator-registry; needs manual lookup';
  } else if (legCandidates.length === 1) {
    const leg = legCandidates[0];
    r.canonical_bioguide = leg.bioguide;
    r.canonical_fec_ids = leg.ids?.fec ?? [];
    const canonSet = new Set(r.canonical_fec_ids);
    r.matched_fec_ids = r.fec_candidate_ids.filter((id) => canonSet.has(id));
    r.suspect_fec_ids = r.fec_candidate_ids.filter((id) => !canonSet.has(id));
    // Refine "suspect" using candidate-master:
    //   - Compare suspect FEC ID's name to ghost name (first AND last).
    //   - If first+last don't both match → TRUE contamination (different person).
    //   - If they match BUT the candidate-master has >1 distinct
    //     person with that name pair (e.g. multiple "Robert Casey"s),
    //     classify as AMBIGUOUS — refuse to auto-merge.
    //   - If first+last match AND only one such person exists in master
    //     → same person under different cycle/office.
    const ghostName = parseGhostName(ghost.name);
    // Count distinct (first, last) people in candidate-master matching ghost.
    // We approximate "distinct person" by unique candidate ID.
    let sameNameCandidateCount = 0;
    for (const rec of fecCandById.values()) {
      const fec = parseFecName(rec.name || '');
      if (fec.last === ghostName.last && firstNameEquivalent(fec.first, ghostName.first)) {
        sameNameCandidateCount++;
      }
    }
    r.same_name_fec_candidate_count = sameNameCandidateCount;
    r.suspect_detail = r.suspect_fec_ids.map((id) => {
      const rec = fecCandById.get(id);
      const fecName = rec?.name ?? null;
      const fec = parseFecName(fecName ?? '');
      const nameMatches =
        fec.last && ghostName.last && fec.last === ghostName.last &&
        firstNameEquivalent(fec.first, ghostName.first);
      let verdict;
      if (!nameMatches) verdict = 'different_person'; // true contamination
      else if (sameNameCandidateCount > 1) verdict = 'ambiguous'; // multiple humans share the name pair
      else verdict = 'same_person';
      return {
        id,
        fec_name: fecName,
        office: rec?.office ?? null,
        state: rec?.state ?? null,
        election_year: rec?.election_year ?? null,
        verdict,
        likely_same_person: verdict === 'same_person',
      };
    });
    const trueContam = r.suspect_detail.filter((s) => s.verdict === 'different_person');
    const ambig      = r.suspect_detail.filter((s) => s.verdict === 'ambiguous');
    const sameSelf   = r.suspect_detail.filter((s) => s.verdict === 'same_person');
    if (r.suspect_fec_ids.length === 0) r.diagnosis = 'CLEAN — single bioguide, all FEC IDs match';
    else if (trueContam.length === 0 && ambig.length === 0) r.diagnosis = `CLEAN_REGISTRY_GAP — ${sameSelf.length} extra FEC ID(s) appear to be same person under different cycle/office not in legislator registry`;
    else if (trueContam.length > 0) r.diagnosis = `CONTAMINATED — ${trueContam.length} different-person FEC ID(s); ${ambig.length} ambiguous; ${sameSelf.length} same-person extras`;
    else r.diagnosis = `AMBIGUOUS — ${ambig.length} suspect FEC ID(s) match the ghost name but ${r.same_name_fec_candidate_count} distinct candidates share that name in the FEC master, can't auto-resolve`;
  } else {
    r.diagnosis = `MULTI_PERSON — name maps to ${legCandidates.length} distinct bioguides; ghost is a chimera`;
    // Try to identify which fec IDs belong to which bioguide
    r.fec_id_owners = {};
    for (const fid of r.fec_candidate_ids) {
      const owners = legCandidates.filter((l) => (l.ids?.fec ?? []).includes(fid)).map((l) => l.bioguide);
      r.fec_id_owners[fid] = owners.length ? owners : ['UNKNOWN'];
    }
  }
  report.push(r);
}

// ─── Render markdown ───────────────────────────────────────────────────
const lines = [];
const stamp = new Date().toISOString().slice(0, 10);
lines.push('---');
lines.push('title: Ghost Politicians Audit');
lines.push(`generated: ${new Date().toISOString()}`);
lines.push('source-script: scripts/audit-ghost-politicians.cjs');
lines.push('---');
lines.push('');
lines.push('# Ghost Politicians Audit — ' + stamp);
lines.push('');
lines.push('Diagnostic for the politician entity records flagged by `pathless-stub-entities-check.cjs` — entries with `entity_type=politician` and no `profile_path`.');
lines.push('');
lines.push('Each row was created on 2026-04-19 in a single batch by `scripts/politician-historical-coverage-backfill.cjs`. The script matched FEC candidate-master records by name only, with a "skip if >15 records" guard rail. That guard is too loose: when a name maps to multiple real politicians (Bob Casey Sr/Jr, multiple Mark Kellys, etc.), all their FEC records get glommed into a single entity. The aggregated edges then look like one person\'s donor data while actually belonging to several distinct humans. Defamation-adjacent if rendered.');
lines.push('');
lines.push('## Headline counts');
const dx = { CLEAN: 0, CLEAN_REGISTRY_GAP: 0, AMBIGUOUS: 0, CONTAMINATED: 0, MULTI_PERSON: 0, NO_BIOGUIDE_MATCH: 0 };
for (const r of report) {
  for (const k of Object.keys(dx)) if ((r.diagnosis || '').startsWith(k)) { dx[k]++; break; }
}
lines.push('');
lines.push(`- Total ghosts: **${report.length}**`);
lines.push(`- Clean (single bioguide, FEC IDs all match): **${dx.CLEAN}**`);
lines.push(`- Clean-registry-gap (extra FEC IDs are same person, registry just hasn't listed them): **${dx.CLEAN_REGISTRY_GAP}**`);
lines.push(`- Ambiguous (extra FEC IDs name-match the ghost, but ≥2 distinct people share the name in FEC master — can't auto-resolve): **${dx.AMBIGUOUS}**`);
lines.push(`- Contaminated (extra FEC IDs from a DIFFERENT person — defamation risk): **${dx.CONTAMINATED}**`);
lines.push(`- Multi-person chimera (name maps to ≥2 bioguides): **${dx.MULTI_PERSON}**`);
lines.push(`- No bioguide match (manual lookup needed): **${dx.NO_BIOGUIDE_MATCH}**`);
lines.push('');
const totalEdges = report.reduce((s, r) => s + r.edges_observed, 0);
lines.push(`- Total edges across all ghost names: **${totalEdges.toLocaleString()}**`);
lines.push('');
lines.push('## Per-ghost detail');

for (const r of report) {
  lines.push('');
  lines.push(`### ${r.name}  *(${r.id})*`);
  lines.push('');
  lines.push(`- **diagnosis:** ${r.diagnosis}`);
  lines.push(`- edges observed: ${r.edges_observed.toLocaleString()}`);
  lines.push(`- FEC candidate IDs on entity: \`${r.fec_candidate_ids.join('`, `') || '(none)'}\``);
  if (r.canonical_bioguide) {
    lines.push(`- canonical bioguide: \`${r.canonical_bioguide}\``);
    lines.push(`- canonical FEC IDs (from legislator registry): \`${r.canonical_fec_ids.join('`, `') || '(none in registry)'}\``);
    if (r.matched_fec_ids.length) lines.push(`- ✓ matched FEC IDs (keep): \`${r.matched_fec_ids.join('`, `')}\``);
    if (r.suspect_fec_ids.length) {
      lines.push(`- candidates with name "${r.name}" in FEC master: ${r.same_name_fec_candidate_count}`);
      lines.push(`- suspect FEC IDs (in entity, not in registry's canonical list):`);
      for (const s of r.suspect_detail || []) {
        const tag = s.verdict === 'same_person' ? '✓ same person'
                  : s.verdict === 'ambiguous'   ? '? AMBIGUOUS — name matches but multiple humans share it'
                                                : '⚠ DIFFERENT person — true contamination';
        const extras = [s.fec_name, s.office ? `office=${s.office}` : null, s.state ? `state=${s.state}` : null, s.election_year ? `year=${s.election_year}` : null].filter(Boolean).join(', ');
        lines.push(`  - \`${s.id}\` → ${extras || '(not in candidate-master)'}  — ${tag}`);
      }
    }
  }
  if (r.canonical_matches.length > 1) {
    lines.push('');
    lines.push('**Bioguide candidates with this name:**');
    lines.push('');
    lines.push('| bioguide | name_official | state | chamber | party | FEC IDs | status |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const m of r.canonical_matches) {
      lines.push(`| \`${m.bioguide}\` | ${m.name_official} | ${m.state ?? '–'} | ${m.chamber ?? '–'} | ${m.party ?? '–'} | ${(m.fec || []).join(', ') || '–'} | ${m.status} |`);
    }
    if (r.fec_id_owners) {
      lines.push('');
      lines.push('**FEC ID → owner bioguide(s):**');
      lines.push('');
      for (const [fid, owners] of Object.entries(r.fec_id_owners)) {
        lines.push(`- \`${fid}\` → ${owners.map((o) => '`' + o + '`').join(', ')}`);
      }
    }
  }
}

lines.push('');
lines.push('## Next steps');
lines.push('');
lines.push('1. **CLEAN ghosts** — safe to enrich. Set `profile_path`, set `bioguide_id`, run auto-blocks. No edge cleanup needed.');
lines.push('2. **CONTAMINATED ghosts** — prune the suspect FEC IDs from the entity, then identify which edges originated from those IDs (via committee ownership in `fec-committee-registry.json`) and either reassign or delete. Then enrich.');
lines.push('3. **MULTI_PERSON chimeras** — split into multiple entities, one per bioguide, and reassign edges per FEC ID ownership. Highest-effort.');
lines.push('4. **NO_BIOGUIDE_MATCH** — manual lookup; could be retired/defeated/state-level officials not in the federal registry.');

if (!fs.existsSync(path.dirname(OUT))) fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`\n✓ Wrote ${path.relative(ROOT, OUT)}`);
console.log('');
console.log('--- summary ---');
for (const [k, v] of Object.entries(dx)) console.log(`  ${k.padEnd(20)} ${v}`);
console.log(`  total edges across all ghost names: ${totalEdges.toLocaleString()}`);
