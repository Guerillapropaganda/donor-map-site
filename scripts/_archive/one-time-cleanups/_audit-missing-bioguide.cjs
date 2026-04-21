// One-off triage script — safe to delete after audit.
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function norm(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

const rows = fs.readFileSync('data/legislator-registry.jsonl', 'utf-8').split('\n').filter(Boolean).map(JSON.parse);
const byKey = new Map();
for (const r of rows) {
  const keys = [
    norm((r.name_first || '') + ' ' + (r.name_last || '')),
    norm((r.name_nickname || r.name_first || '') + ' ' + (r.name_last || '')),
    norm(r.name_official),
  ];
  for (const k of keys) if (k && !byKey.has(k)) byKey.set(k, r);
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
const matchable = [];
const unmatched = [];
const outOfScope = { Cabinet: 0, State: 0, Presidential: 0, Candidates: 0, Other: 0 };

const SEP = path.sep;
function inFolder(file, name) {
  return file.includes(SEP + name + SEP);
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  let fm;
  try { fm = yaml.load(m[1]) || {}; } catch { continue; }
  if (fm.type !== 'politician' && !/_.*Master Profile/i.test(file)) continue;
  if (fm['bioguide-id'] || fm.bioguide || fm.bioguide_id) continue;

  if (/Cabinet/i.test(file)) { outOfScope.Cabinet++; continue; }
  if (inFolder(file, 'Presidential')) { outOfScope.Presidential++; continue; }
  if (/State Legislat|Governors|Mayors/i.test(file)) { outOfScope.State++; continue; }

  const folder = path.basename(path.dirname(file));
  const titleName = fm.title ? String(fm.title).replace(/Master Profile|Profile/i, '').trim() : '';
  const candidates = [norm(folder), norm(titleName)].filter(Boolean);
  let hit = null;
  for (const k of candidates) { if (byKey.has(k)) { hit = byKey.get(k); break; } }

  const inCongress = inFolder(file, 'Senate') || inFolder(file, 'House');
  if (hit && inCongress) {
    matchable.push({ file, bg: hit.bioguide, name: hit.name_official });
  } else if (inCongress) {
    outOfScope.Candidates++;
    unmatched.push(file);
  } else {
    outOfScope.Other++;
    unmatched.push(file);
  }
}

console.log('=== MISSING BIOGUIDE TRIAGE ===');
console.log('Auto-backfillable (sitting member, name matches registry): ' + matchable.length);
console.log('Out of scope:');
console.log('  Cabinet:     ' + outOfScope.Cabinet);
console.log('  State/local: ' + outOfScope.State);
console.log('  Presidents:  ' + outOfScope.Presidential);
console.log('  Senate/House but no registry match (candidates/former): ' + outOfScope.Candidates);
console.log('  Other:       ' + outOfScope.Other);
console.log('');

if (matchable.length) {
  console.log('*** AUTO-BACKFILL CANDIDATES ***');
  for (const x of matchable) console.log('  ' + x.bg + ' → ' + x.name + ' — ' + x.file);
}

console.log('\n*** UNMATCHED IN SENATE/HOUSE — likely candidates or typos (first 20) ***');
const senHouseUnmatched = unmatched.filter(f => inFolder(f, 'Senate') || inFolder(f, 'House'));
for (const f of senHouseUnmatched.slice(0, 20)) console.log('  ' + f);
