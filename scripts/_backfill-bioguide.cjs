// One-off backfill script — safe to delete after use.
// Matches missing-bioguide profiles to the registry using multiple passes:
//   1. Exact full-name match (norm)
//   2. First+last with nickname variants
//   3. Last-name + chamber + state (from frontmatter or folder)
//   4. Last-name + chamber (only if exactly one candidate)
//
// Applies via --apply flag; otherwise reports proposed changes.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const APPLY = process.argv.includes('--apply');
const APPLY_FUZZY = process.argv.includes('--apply-fuzzy');

function norm(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const rows = fs.readFileSync('data/legislator-registry.jsonl', 'utf-8').split('\n').filter(Boolean).map(JSON.parse);

// Build lookup indexes
const byFullName = new Map();
const byLastChamberState = new Map();
const byLastChamber = new Map();
for (const r of rows) {
  const chamber = r.current_term && r.current_term.chamber;
  const state = r.current_term && r.current_term.state;
  const last = norm(r.name_last);
  const variants = new Set([
    norm((r.name_first || '') + ' ' + r.name_last),
    norm((r.name_nickname || '') + ' ' + r.name_last),
    norm(r.name_official),
  ]);
  variants.delete('');
  for (const v of variants) if (!byFullName.has(v)) byFullName.set(v, r);

  if (chamber && state && last) {
    const k = `${last}|${chamber}|${state}`;
    if (!byLastChamberState.has(k)) byLastChamberState.set(k, []);
    byLastChamberState.get(k).push(r);
  }
  if (chamber && last) {
    const k = `${last}|${chamber}`;
    if (!byLastChamber.has(k)) byLastChamber.set(k, []);
    byLastChamber.get(k).push(r);
  }
}

function walk(d) {
  const o = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) o.push(...walk(f));
    else if (e.name.endsWith('.md')) o.push(f);
  }
  return o;
}

const files = walk('content/Politicians');
const SEP = path.sep;
function inFolder(file, name) { return file.includes(SEP + name + SEP); }

const proposals = [];
const stillUnmatched = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  let fm;
  try { fm = yaml.load(m[1]) || {}; } catch { continue; }
  if (fm.type !== 'politician' && !/_.*Master Profile/i.test(file)) continue;
  if (fm['bioguide-id'] || fm.bioguide || fm.bioguide_id) continue;

  // Only in-scope: Senate or House folders
  const isSenate = inFolder(file, 'Senate');
  const isHouse = inFolder(file, 'House');
  if (!isSenate && !isHouse) continue;
  const chamber = isSenate ? 'senate' : 'house';

  const folder = path.basename(path.dirname(file));
  const titleName = fm.title ? String(fm.title).replace(/Master Profile|Profile/i, '').trim() : '';
  const fileLeaf = path.basename(file).replace(/^_|\.md$|Master Profile|Profile/gi, '').trim();

  // Derive candidate name strings
  const nameCandidates = [folder, titleName, fileLeaf].filter(Boolean).map(norm);
  const lastName = norm((folder.split(/\s+/).pop() || '').replace(/[^a-z]/gi, ''));
  const stateFm = (fm.state || '').trim();
  const stateAbbr = (fm['state-abbr'] || '').trim().toUpperCase();

  let hit = null;
  let method = null;

  // Pass 1: full-name
  for (const n of nameCandidates) {
    if (byFullName.has(n)) { hit = byFullName.get(n); method = 'full-name'; break; }
  }
  // Pass 2: last + chamber + state
  if (!hit && lastName && stateAbbr) {
    const arr = byLastChamberState.get(`${lastName}|${chamber}|${stateAbbr}`) || [];
    if (arr.length === 1) { hit = arr[0]; method = 'last+chamber+state'; }
  }
  // Pass 3: last + chamber (only if unique)
  if (!hit && lastName) {
    const arr = byLastChamber.get(`${lastName}|${chamber}`) || [];
    if (arr.length === 1) { hit = arr[0]; method = 'last+chamber-unique'; }
  }

  if (hit) proposals.push({ file, bg: hit.bioguide, name: hit.name_official, method });
  else stillUnmatched.push(file);
}

console.log(`Proposals: ${proposals.length}`);
const byMethod = {};
for (const p of proposals) byMethod[p.method] = (byMethod[p.method] || 0) + 1;
for (const [k, v] of Object.entries(byMethod)) console.log(`  ${k}: ${v}`);
console.log('');
for (const p of proposals) console.log(`  [${p.method}] ${p.bg} → ${p.name}`);
console.log(`\nStill unmatched in Senate/House: ${stillUnmatched.length}`);
for (const f of stillUnmatched) console.log(`  ${f}`);

if (!APPLY) {
  console.log('\n[dry-run] rerun with --apply to write changes');
  return;
}

// Apply: insert `bioguide-id: XXXXXXX` into frontmatter, right after fec-candidate-id if present,
// else after chamber, else at end of frontmatter
let applied = 0;
for (const p of proposals) {
  if (!APPLY_FUZZY && p.method !== 'full-name') continue;
  const text = fs.readFileSync(p.file, 'utf-8');
  const m = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!m) continue;
  let fm = m[2];
  // Skip if somehow already has bioguide-id (safety)
  if (/\nbioguide-id:/.test('\n' + fm)) continue;
  // Insert after an anchor line
  const insertLine = `bioguide-id: ${p.bg}`;
  let newFm;
  if (/\n(fec-candidate-id:[^\n]*)/.test('\n' + fm)) {
    newFm = ('\n' + fm).replace(/\n(fec-candidate-id:[^\n]*)/, `\n$1\n${insertLine}`).slice(1);
  } else if (/\n(chamber:[^\n]*)/.test('\n' + fm)) {
    newFm = ('\n' + fm).replace(/\n(chamber:[^\n]*)/, `\n$1\n${insertLine}`).slice(1);
  } else {
    newFm = fm + '\n' + insertLine;
  }
  const newText = m[1] + newFm + m[3] + text.slice(m[0].length);
  fs.writeFileSync(p.file, newText);
  applied++;
}
console.log(`\n[applied] inserted bioguide-id into ${applied} file(s)`);
