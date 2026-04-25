#!/usr/bin/env node
/**
 * audit-donor-ghost-stubs.cjs — diagnostic for the 411 AFSCME-class
 * donor ghost entity records (Blocker 3 in the ADR-0024 Phase 3 prep
 * sequence). These are entities with `entity_type: donor` and no
 * profile_path, whose names look like FEC campaign committee names
 * (TIM SHEEHY FOR MONTANA, FRIENDS OF STEVE DAINES, RAND PAUL FOR US
 * SENATE, etc.). They should resolve to the candidate's vault profile,
 * not exist as standalone donor entities.
 *
 * Read-only. Produces a markdown report at content/Admin Notes/
 * donor-ghost-stubs-audit.md (path overridable via --out).
 *
 * Per-ghost diagnosis answers:
 *   - Does the ghost's fec_committee_id appear in
 *     data/fec-committee-registry.json with vault_profile set?
 *   - If yes: CLEAN — librarian's Step 3 already attaches the name as
 *     alias on the candidate's entity. The ghost record is redundant
 *     and can be deleted.
 *   - If registry has the committee but vault_profile=null: REGISTRY_GAP
 *     — we have the FEC mapping but never wired it to a vault profile.
 *     Need to look up candidate via candidate-committees and add.
 *   - If registry doesn't have the committee at all: REGISTRY_MISSING
 *     — need to add the registry entry.
 *
 * Usage:
 *   node scripts/audit-donor-ghost-stubs.cjs
 *   node scripts/audit-donor-ghost-stubs.cjs --out=path.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const FEC_REGISTRY = path.join(ROOT, 'data', 'fec-committee-registry.json');
const FEC_CAND_COMMITTEES = 'C:/donor-map-data/fec/candidate-committees.jsonl';
const FEC_CAND_MASTER = 'C:/donor-map-data/fec/candidate-master.jsonl';
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const OUT_DEFAULT = path.join(ROOT, 'content', 'Admin Notes', 'donor-ghost-stubs-audit.md');

function parseArg(name, def) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : def;
}
const OUT = parseArg('out', OUT_DEFAULT);

console.log('Loading...');
const entityLines = fs.readFileSync(ENTITIES, 'utf-8').split('\n').filter((l) => l.trim());
const entities = [];
for (const l of entityLines) { try { entities.push(JSON.parse(l)); } catch {} }
const ghosts = entities.filter(
  (e) => e.entity_type === 'donor' && !e.profile_path && !e.signals?.ein_coverage_reason,
);
console.log(`  ${entities.length} entities, ${ghosts.length} donor ghosts`);

const reg = JSON.parse(fs.readFileSync(FEC_REGISTRY, 'utf-8'));
console.log(`  ${Object.keys(reg).length} registry entries`);

// committee_id → [{cand_id, year}]
const cmteToCands = new Map();
if (fs.existsSync(FEC_CAND_COMMITTEES)) {
  for (const l of fs.readFileSync(FEC_CAND_COMMITTEES, 'utf-8').split('\n')) {
    if (!l.trim()) continue;
    let r; try { r = JSON.parse(l); } catch { continue; }
    if (r.cmte_id && r.cand_id) {
      const list = cmteToCands.get(r.cmte_id) ?? [];
      if (!list.find((x) => x.cand_id === r.cand_id)) list.push({ cand_id: r.cand_id, year: r.year });
      cmteToCands.set(r.cmte_id, list);
    }
  }
}
console.log(`  ${cmteToCands.size} committee→candidate mappings`);

const candById = new Map();
if (fs.existsSync(FEC_CAND_MASTER)) {
  for (const l of fs.readFileSync(FEC_CAND_MASTER, 'utf-8').split('\n')) {
    if (!l.trim()) continue;
    let r; try { r = JSON.parse(l); } catch { continue; }
    if (r.id) candById.set(r.id, r);
  }
}
console.log(`  ${candById.size} candidate-master rows`);

const legByBioguide = new Map();
const fecToBio = new Map();
for (const l of fs.readFileSync(LEGISLATORS, 'utf-8').split('\n').filter((x) => x.trim())) {
  let r; try { r = JSON.parse(l); } catch { continue; }
  if (r.bioguide) legByBioguide.set(r.bioguide, r);
  for (const fid of r.ids?.fec || []) fecToBio.set(fid, r.bioguide);
}
console.log(`  ${legByBioguide.size} legislators (fec→bioguide map: ${fecToBio.size})`);

// candidate's vault profile? Look up via entities.jsonl by bioguide_id signal
const entityByBioguide = new Map();
for (const e of entities) {
  const bg = e.signals?.bioguide_id;
  if (bg && e.profile_path) entityByBioguide.set(bg, e);
}

console.log('');
console.log('Diagnosing each ghost...');

const report = [];
for (const ghost of ghosts) {
  const r = {
    id: ghost.id,
    name: ghost.name,
    cmte_id: ghost.signals?.fec_committee_id || (ghost.signals?.fec_committee_ids || [])[0] || null,
    edge_count: ghost.signals?.edge_count || 0,
    diagnosis: null,
    registry_entry: null,
    candidate_match: null,
    target_profile_path: null,
  };

  if (!r.cmte_id) {
    r.diagnosis = 'NO_FEC_COMMITTEE_ID — ghost has no fec_committee_id; manual lookup needed';
    report.push(r);
    continue;
  }

  // Check registry
  const regEntry = reg[r.cmte_id];
  if (regEntry) {
    r.registry_entry = { fec_name: regEntry.fec_name, vault_profile: regEntry.vault_profile, mapping_reason: regEntry.mapping_reason };
    if (regEntry.vault_profile) {
      r.target_profile_path = regEntry.vault_profile;
      r.diagnosis = 'CLEAN — registry already maps committee to a vault profile; ghost record is redundant and can be deleted';
    } else {
      r.diagnosis = 'REGISTRY_GAP — registry has committee but vault_profile is null';
    }
  } else {
    r.diagnosis = 'REGISTRY_MISSING — committee not in fec-committee-registry';
  }

  // For REGISTRY_GAP and REGISTRY_MISSING, try to find candidate via cand-committees
  if (r.diagnosis !== null && r.diagnosis.startsWith('CLEAN')) { report.push(r); continue; }
  const cands = cmteToCands.get(r.cmte_id) || [];
  if (cands.length === 0) {
    r.candidate_match = '(no candidate-committee link)';
    r.diagnosis += ' + no candidate-committee link';
    report.push(r); continue;
  }
  // Pick the most recent candidate-committee row by year
  cands.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  const cand = cands[0];
  const candRec = candById.get(cand.cand_id);
  const bg = fecToBio.get(cand.cand_id);
  const candEntity = bg ? entityByBioguide.get(bg) : null;
  r.candidate_match = {
    cand_id: cand.cand_id,
    cand_name: candRec?.name || null,
    cand_year: cand.year,
    bioguide: bg || null,
    candidate_entity_id: candEntity?.id || null,
    candidate_profile_path: candEntity?.profile_path || null,
  };
  if (candEntity?.profile_path) {
    r.target_profile_path = candEntity.profile_path;
    r.diagnosis += ` — fix by setting registry vault_profile to ${candEntity.profile_path}`;
  } else if (bg) {
    r.diagnosis += ` — bioguide ${bg} known but no entity record with profile_path; need to verify candidate has a vault profile`;
  } else {
    r.diagnosis += ` — candidate ${cand.cand_id} has no bioguide in legislator-registry (likely state/local or pre-Congress)`;
  }
  report.push(r);
}

// Render
const dx = { CLEAN: 0, REGISTRY_GAP: 0, REGISTRY_MISSING: 0, NO_FEC_COMMITTEE_ID: 0 };
for (const r of report) {
  for (const k of Object.keys(dx)) if ((r.diagnosis || '').startsWith(k)) { dx[k]++; break; }
}

const lines = [];
lines.push('---');
lines.push('title: Donor Ghost Stubs Audit');
lines.push(`generated: ${new Date().toISOString()}`);
lines.push('source-script: scripts/audit-donor-ghost-stubs.cjs');
lines.push('---');
lines.push('');
lines.push('# Donor Ghost Stubs Audit — ' + new Date().toISOString().slice(0, 10));
lines.push('');
lines.push('Diagnostic for the 411 donor entity records flagged by `pathless-stub-entities-check.cjs` whose names look like FEC campaign committee names (TIM SHEEHY FOR MONTANA, FRIENDS OF STEVE DAINES, RAND PAUL FOR US SENATE, etc.). Phase 3 cache-builder cutover blocker.');
lines.push('');
lines.push('Each entry exists as a separate entity that the librarian-backed cache builds an empty bucket for, while the candidate\'s real vault profile sits separately. The fix path: ensure each committee resolves to the candidate\'s entity via `data/fec-committee-registry.json`.');
lines.push('');
lines.push('## Headline counts');
lines.push('');
lines.push(`- Total donor ghosts: **${report.length}**`);
lines.push(`- CLEAN (registry already maps; ghost record can be deleted): **${dx.CLEAN}**`);
lines.push(`- REGISTRY_GAP (registry has committee but no vault_profile): **${dx.REGISTRY_GAP}**`);
lines.push(`- REGISTRY_MISSING (committee not in registry at all): **${dx.REGISTRY_MISSING}**`);
lines.push(`- NO_FEC_COMMITTEE_ID (ghost has no committee_id; manual lookup): **${dx.NO_FEC_COMMITTEE_ID}**`);
lines.push('');
const totalEdges = report.reduce((s, r) => s + r.edge_count, 0);
lines.push(`- Total edges across all ghost names: **${totalEdges.toLocaleString()}**`);
lines.push('');

// Per-class samples
function dumpClass(name, predicate, limit) {
  const rows = report.filter(predicate);
  if (rows.length === 0) return;
  lines.push(`## ${name} (${rows.length})`);
  lines.push('');
  for (const r of rows.slice(0, limit)) {
    lines.push(`### ${r.name}  *(${r.id})*`);
    lines.push('');
    lines.push(`- **diagnosis:** ${r.diagnosis}`);
    lines.push(`- committee: \`${r.cmte_id || '(none)'}\``);
    lines.push(`- edges: ${r.edge_count}`);
    if (r.target_profile_path) lines.push(`- target profile: \`${r.target_profile_path}\``);
    if (r.candidate_match && typeof r.candidate_match === 'object') {
      const m = r.candidate_match;
      lines.push(`- candidate: ${m.cand_name || '?'} (\`${m.cand_id}\`, year ${m.cand_year}, bioguide \`${m.bioguide || '-'}\`)`);
    }
    lines.push('');
  }
  if (rows.length > limit) lines.push(`*...and ${rows.length - limit} more — see JSON output for full list*`);
  lines.push('');
}

dumpClass('CLEAN — registry already maps; ghost record deletable', (r) => r.diagnosis.startsWith('CLEAN'), 10);
dumpClass('REGISTRY_GAP — committee in registry but vault_profile null', (r) => r.diagnosis.startsWith('REGISTRY_GAP'), 10);
dumpClass('REGISTRY_MISSING — committee not in registry', (r) => r.diagnosis.startsWith('REGISTRY_MISSING'), 10);
dumpClass('NO_FEC_COMMITTEE_ID — manual lookup needed', (r) => r.diagnosis.startsWith('NO_FEC_COMMITTEE_ID'), 5);

lines.push('## Next steps');
lines.push('');
lines.push('1. **CLEAN ghosts** — delete entity record. The librarian already routes the committee name to the candidate via fec-committee-registry alias attachment (resolver.ts Step 3). Removing the ghost stops it from creating an empty bucket.');
lines.push('2. **REGISTRY_GAP ghosts** — patch the registry entry: set `vault_profile` to the candidate\'s entity profile_path. Then delete the entity record.');
lines.push('3. **REGISTRY_MISSING ghosts** — add a registry entry with `vault_profile` set, then delete the entity record.');
lines.push('4. **NO_FEC_COMMITTEE_ID ghosts** — manual review. May not be FEC-shaped at all.');

if (!fs.existsSync(path.dirname(OUT))) fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n') + '\n');

console.log('');
console.log('--- summary ---');
for (const [k, v] of Object.entries(dx)) console.log(`  ${k.padEnd(22)} ${v}`);
console.log(`  total edges:           ${totalEdges.toLocaleString()}`);
console.log('');
console.log(`✓ Wrote ${path.relative(ROOT, OUT)}`);
