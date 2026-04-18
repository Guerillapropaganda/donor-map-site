#!/usr/bin/env node
/**
 * ingest-unitedstates-legislators.cjs
 *
 * Pulls the unitedstates/congress-legislators YAML files and normalizes them
 * into local JSONL registries used as the canonical cross-reference source
 * for bioguide/FEC/govtrack/ICPSR/OpenSecrets/Wikipedia IDs, term history,
 * and current committee assignments.
 *
 * Output:
 *   data/bulk/unitedstates-legislators/*.yaml            (raw cache)
 *   data/legislator-registry.jsonl                       (one row per legislator, keyed by bioguide)
 *   data/legislator-committees.jsonl                     (one row per committee assignment)
 *
 * Network failure → falls back to cached YAML if present, else exits non-zero.
 *
 * Flags:
 *   --include-historical   also ingest legislators-historical.yaml (former members)
 *   --dry-run              fetch + parse, report diffs, write nothing
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const BULK_DIR = path.join(ROOT, 'data', 'bulk', 'unitedstates-legislators');
const REGISTRY_PATH = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const COMMITTEES_PATH = path.join(ROOT, 'data', 'legislator-committees.jsonl');

const BASE = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main';

const FILES = {
  current: 'legislators-current.yaml',
  social: 'legislators-social-media.yaml',
  offices: 'legislators-district-offices.yaml',
  committees: 'committees-current.yaml',
  membership: 'committee-membership-current.yaml',
  historical: 'legislators-historical.yaml',
};

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const INCLUDE_HISTORICAL = args.has('--include-historical');

const BIOGUIDE_RE = /^[A-Z][0-9]{6}$/;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TheDonorMap/1.0 (thedonormap.org) legislator-registry-ingest' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject);
  });
}

async function fetchWithFallback(key, filename) {
  const cachePath = path.join(BULK_DIR, filename);
  const url = `${BASE}/${filename}`;
  try {
    const body = await httpGet(url);
    if (!DRY_RUN) {
      fs.mkdirSync(BULK_DIR, { recursive: true });
      fs.writeFileSync(cachePath, body);
    }
    return { body, source: 'network' };
  } catch (err) {
    if (fs.existsSync(cachePath)) {
      console.warn(`[warn] ${key}: fetch failed (${err.message}) — using cached copy`);
      return { body: fs.readFileSync(cachePath, 'utf-8'), source: 'cache' };
    }
    throw new Error(`${key}: fetch failed and no cache at ${cachePath}: ${err.message}`);
  }
}

function pickLastTerm(terms) {
  if (!Array.isArray(terms) || terms.length === 0) return null;
  return terms[terms.length - 1];
}

function normalizeLegislator(entry) {
  const ids = entry.id || {};
  const name = entry.name || {};
  const bio = entry.bio || {};
  const lastTerm = pickLastTerm(entry.terms);

  const bioguide = ids.bioguide;
  if (!bioguide || !BIOGUIDE_RE.test(bioguide)) {
    return { invalid: true, reason: `bad bioguide: ${bioguide}`, entry };
  }

  return {
    bioguide,
    name_official: name.official_full || `${name.first || ''} ${name.last || ''}`.trim(),
    name_first: name.first || null,
    name_last: name.last || null,
    name_middle: name.middle || null,
    name_nickname: name.nickname || null,
    birthday: bio.birthday || null,
    gender: bio.gender || null,
    ids: {
      bioguide,
      govtrack: ids.govtrack || null,
      icpsr: ids.icpsr || null,
      fec: Array.isArray(ids.fec) ? ids.fec : (ids.fec ? [ids.fec] : []),
      opensecrets: ids.opensecrets || null,
      votesmart: ids.votesmart || null,
      wikipedia: ids.wikipedia || null,
      wikidata: ids.wikidata || null,
      lis: ids.lis || null,
      house_history: ids.house_history || null,
      ballotpedia: ids.ballotpedia || null,
      maplight: ids.maplight || null,
      cspan: ids.cspan || null,
    },
    current_term: lastTerm ? {
      chamber: lastTerm.type === 'sen' ? 'senate' : 'house',
      type: lastTerm.type || null,
      start: lastTerm.start || null,
      end: lastTerm.end || null,
      state: lastTerm.state || null,
      district: lastTerm.district ?? null,
      party: lastTerm.party || null,
      state_rank: lastTerm.state_rank || null,
      office: lastTerm.office || null,
      phone: lastTerm.phone || null,
      url: lastTerm.url || null,
    } : null,
    terms_count: Array.isArray(entry.terms) ? entry.terms.length : 0,
    leadership_roles: entry.leadership_roles || [],
    _status: entry.terms && entry.terms.some(t => !t.end || t.end >= new Date().toISOString().slice(0, 10)) ? 'current' : 'historical',
  };
}

function readExistingRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return new Map();
  const map = new Map();
  const text = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (row.bioguide) map.set(row.bioguide, row);
    } catch { /* skip bad line */ }
  }
  return map;
}

function diffEntries(existing, incoming) {
  const added = [];
  const changed = [];
  const unchanged = [];
  for (const [bioguide, row] of incoming) {
    const prev = existing.get(bioguide);
    if (!prev) { added.push(bioguide); continue; }
    if (JSON.stringify(prev) !== JSON.stringify(row)) changed.push(bioguide);
    else unchanged.push(bioguide);
  }
  const removed = [];
  for (const bioguide of existing.keys()) {
    if (!incoming.has(bioguide)) removed.push(bioguide);
  }
  return { added, changed, removed, unchanged };
}

(async function main() {
  console.log(`[ingest-unitedstates-legislators] ${DRY_RUN ? 'DRY RUN — ' : ''}starting`);

  // 1. Fetch all files
  const loaded = {};
  for (const key of ['current', 'social', 'offices', 'committees', 'membership']) {
    const { body, source } = await fetchWithFallback(key, FILES[key]);
    loaded[key] = yaml.load(body);
    console.log(`  ${key}: ${Array.isArray(loaded[key]) ? loaded[key].length : Object.keys(loaded[key]).length} entries (${source})`);
  }
  if (INCLUDE_HISTORICAL) {
    const { body, source } = await fetchWithFallback('historical', FILES.historical);
    loaded.historical = yaml.load(body);
    console.log(`  historical: ${loaded.historical.length} entries (${source})`);
  }

  // 2. Normalize legislators
  const registry = new Map();
  const invalid = [];
  const current = Array.isArray(loaded.current) ? loaded.current : [];
  for (const entry of current) {
    const norm = normalizeLegislator(entry);
    if (norm.invalid) { invalid.push(norm); continue; }
    registry.set(norm.bioguide, norm);
  }
  if (INCLUDE_HISTORICAL && loaded.historical) {
    for (const entry of loaded.historical) {
      const norm = normalizeLegislator(entry);
      if (norm.invalid) { invalid.push(norm); continue; }
      if (!registry.has(norm.bioguide)) registry.set(norm.bioguide, norm);
    }
  }

  // 3. Merge social media + district offices into registry
  if (Array.isArray(loaded.social)) {
    for (const s of loaded.social) {
      const bg = s.id && s.id.bioguide;
      const row = registry.get(bg);
      if (row) row.social = s.social || {};
    }
  }
  if (Array.isArray(loaded.offices)) {
    for (const o of loaded.offices) {
      const bg = o.id && o.id.bioguide;
      const row = registry.get(bg);
      if (row) row.district_offices = o.offices || [];
    }
  }

  // 4. Normalize committees
  const committeeRows = [];
  const membership = loaded.membership || {};
  const committees = Array.isArray(loaded.committees) ? loaded.committees : [];
  const committeeByCode = new Map();
  for (const c of committees) {
    committeeByCode.set(c.thomas_id, c);
    if (Array.isArray(c.subcommittees)) {
      for (const sc of c.subcommittees) {
        committeeByCode.set(`${c.thomas_id}${sc.thomas_id}`, { ...sc, parent: c.thomas_id, parent_name: c.name });
      }
    }
  }
  for (const [code, members] of Object.entries(membership)) {
    const committee = committeeByCode.get(code);
    if (!committee) continue;
    for (const m of members) {
      if (!m.bioguide || !BIOGUIDE_RE.test(m.bioguide)) continue;
      committeeRows.push({
        bioguide: m.bioguide,
        thomas_id: code,
        committee_name: committee.name || null,
        parent_thomas_id: committee.parent || null,
        parent_name: committee.parent_name || null,
        chamber: code.startsWith('H') ? 'house' : code.startsWith('S') ? 'senate' : code.startsWith('J') ? 'joint' : null,
        rank: m.rank || null,
        title: m.title || null,
        party: m.party || null,
      });
    }
  }

  // 5. Diff + report
  const existing = readExistingRegistry();
  const diff = diffEntries(existing, registry);
  console.log('\n[diff vs existing registry]');
  console.log(`  added:     ${diff.added.length}`);
  console.log(`  changed:   ${diff.changed.length}`);
  console.log(`  removed:   ${diff.removed.length}`);
  console.log(`  unchanged: ${diff.unchanged.length}`);
  if (diff.changed.length > 0 && diff.changed.length <= 20) {
    console.log(`  changed IDs: ${diff.changed.join(', ')}`);
  }
  if (invalid.length > 0) {
    console.log(`\n[warn] ${invalid.length} entries rejected (bad bioguide)`);
    for (const inv of invalid.slice(0, 5)) console.log(`    - ${inv.reason}`);
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] no files written');
    return;
  }

  // 6. Write outputs
  const registryLines = [...registry.values()]
    .sort((a, b) => a.bioguide.localeCompare(b.bioguide))
    .map(r => JSON.stringify(r))
    .join('\n') + '\n';
  fs.writeFileSync(REGISTRY_PATH, registryLines);

  const committeeLines = committeeRows
    .sort((a, b) => (a.bioguide + a.thomas_id).localeCompare(b.bioguide + b.thomas_id))
    .map(r => JSON.stringify(r))
    .join('\n') + '\n';
  fs.writeFileSync(COMMITTEES_PATH, committeeLines);

  console.log(`\n[write] ${REGISTRY_PATH} — ${registry.size} legislators`);
  console.log(`[write] ${COMMITTEES_PATH} — ${committeeRows.length} assignments`);
  console.log('[done]');
})().catch(err => {
  console.error(`[fatal] ${err.message}`);
  process.exit(1);
});
