#!/usr/bin/env node
/**
 * librarian-gap-audit.cjs
 *
 * Diagnostic harness check. Walks every guarded frontmatter wikilink across
 * the vault and classifies it into a gap class against the librarian.
 *
 * Question this answers (per ADR-0024 + ADR-0027):
 *   "If a wikilink doesn't connect to the librarian's data, WHY not?"
 *
 * The librarian is the source of truth (ADR-0024) and the orphan-candidates
 * store (ADR-0027 P1) catalogs cases where a frontmatter cache and the
 * librarian disagree. This audit takes the next step: by classifying each
 * gap, it gives editorial + infra a priority queue. Closing the most
 * common class closes the most gaps.
 *
 * GAP CLASSES (v1 — narrow set, all read-only diagnostic):
 *
 *   unresolvable
 *     Wikilink name appears nowhere in entities.jsonl OR as edge.from /
 *     edge.to. The librarian has zero awareness of this name. Either the
 *     wikilink is wrong (typo, alias) OR the entity needs to be added.
 *     Highest-leverage class to fix because every appearance is closed at
 *     once.
 *
 *   node-isolated
 *     Name exists in entities.jsonl OR as edge endpoint, but has zero
 *     edges in any direction. Registered but no relationship data ever
 *     written. Pipeline coverage gap.
 *
 *   fec-committee-suspect
 *     Wikilink shape matches FEC committee patterns (ALL CAPS, "FOR
 *     CONGRESS" / "FOR SENATE" / committee_id shape). Subset of the
 *     documented FEC committee-stub-resolution multi-session project
 *     (~10hr per content/Admin Notes/fec-committee-stub-resolution.md).
 *     Surfaced separately because the fix has its own owner and timeline.
 *
 *   alias-candidate
 *     Wikilink resolves and has edges, AND there's a high-similarity
 *     variant in entities.jsonl / edges that looks like the same entity
 *     (e.g. "ActBlue" alongside "ACTBLUE - ACT BLUE FED COMM"). Closable
 *     by alias unification work.
 *
 *   ok
 *     Wikilink resolves cleanly to a node with edges. Not a gap.
 *
 * USAGE:
 *   node scripts/librarian-gap-audit.cjs --json
 *   node scripts/librarian-gap-audit.cjs           # human output
 *   node scripts/librarian-gap-audit.cjs --top=50  # show top-N per class
 *
 * Findings count = unresolvable + node-isolated + fec-committee-suspect +
 * alias-candidate. The 'ok' bucket isn't a finding.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const ENTITIES_FILE = path.join(ROOT, 'data', 'entities.jsonl');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const TOP_N = (() => {
  const a = ARGS.find((x) => x.startsWith('--top='));
  return a ? parseInt(a.slice(6), 10) : 25;
})();

const GUARDED_FIELDS = ['politicians-funded', 'donors', 'top-donors', 'opposes', 'related'];

// ─── Helpers ───────────────────────────────────────────────────────────

function* walkProfiles(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      yield* walkProfiles(path.join(dir, e.name));
    } else if (e.name.endsWith('.md')) {
      yield path.join(dir, e.name);
    }
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]); } catch { return null; }
}

function extractWikilinks(field) {
  if (!field) return [];
  const s = Array.isArray(field) ? field.join(' · ') : String(field);
  const out = [];
  const re = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1].trim());
  return out;
}

function normalize(s) {
  return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Looks like an FEC committee name? Heuristic: more than half the chars
 * are uppercase letters AND the string is long enough to have committee
 * shape. Catches "AMERICAN CROSSROADS", "MITCH MCCONNELL FOR SENATE",
 * "C00012345" forms, etc. Misses sentence-case committees but those are
 * rarer in canonical FEC data.
 */
function looksLikeFecCommittee(name) {
  if (!name) return false;
  const s = String(name).trim();
  if (s.length < 5) return false;
  if (/^C\d{8}$/.test(s)) return true; // raw committee_id
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length === 0) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  const ratio = upper / letters.length;
  if (ratio < 0.7) return false;
  // Final filter: typical committee phrasing keywords. Not strictly needed
  // (the uppercase ratio catches most) but reduces false positives on
  // ALL-CAPS proper names like Wall Street institution names.
  if (
    /\bFOR\b|\bPAC\b|\bFUND\b|\bCOMMITTEE\b|\bINC\b|\bLLC\b|\bSENATE\b|\bCONGRESS\b|FED CMTE/.test(s)
  ) {
    return true;
  }
  return ratio > 0.9 && s.length > 10; // very-uppercase fallback
}

/** Levenshtein distance — for alias candidate similarity. */
function distance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[a.length][b.length];
}

// ─── Load reference data ───────────────────────────────────────────────

function loadEntities() {
  if (!fs.existsSync(ENTITIES_FILE)) return [];
  return fs
    .readFileSync(ENTITIES_FILE, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function loadEdgesFromStore() {
  const { loadEdges } = require('./lib/relationships-store.cjs');
  return loadEdges().filter((e) => !e.status || e.status === 'active');
}

// ─── Build name indexes ─────────────────────────────────────────────────

function buildNameIndex(entities, edges) {
  // entityNames: normalized → original entity record(s). Multiple entities
  // sharing a normalized name get collected — the resolver would flag
  // them as ambiguous, but for gap-audit purposes we only care that the
  // name maps to at least one entity.
  const entityNames = new Map();
  for (const e of entities) {
    if (!e.name) continue;
    const k = normalize(e.name);
    if (!entityNames.has(k)) entityNames.set(k, []);
    entityNames.get(k).push(e);
  }

  // edgeNames: every from/to string ever mentioned in an edge. Used to
  // detect "name appears in data but has no entity record" (resolver gap).
  // Track edge counts per direction so we can spot node-isolated.
  const edgeOut = new Map();    // normalized name → outgoing edge count
  const edgeIn = new Map();
  function bump(map, k) { map.set(k, (map.get(k) || 0) + 1); }
  for (const e of edges) {
    if (e.from) bump(edgeOut, normalize(e.from));
    if (e.to) bump(edgeIn, normalize(e.to));
  }

  // similarNamesByPrefix: for alias-candidate detection. Keyed by first
  // 4 normalized chars to make similarity check tractable.
  const similarPrefix = new Map();
  function recordPrefix(name) {
    const k = normalize(name);
    if (k.length < 4) return;
    const p = k.slice(0, 4);
    if (!similarPrefix.has(p)) similarPrefix.set(p, new Set());
    similarPrefix.get(p).add(name); // keep ORIGINAL casing for human-readable output
  }
  for (const e of entities) if (e.name) recordPrefix(e.name);
  for (const e of edges) {
    if (e.from) recordPrefix(e.from);
    if (e.to) recordPrefix(e.to);
  }

  return { entityNames, edgeOut, edgeIn, similarPrefix };
}

// ─── Per-wikilink classification ───────────────────────────────────────

/**
 * Find similar variants of a name in the corpus. Returns up to 3 close
 * matches by edit distance with threshold = max(2, len/4). Used to detect
 * alias candidates ("ActBlue" alongside "ACTBLUE - ACT BLUE").
 */
function findSimilar(name, similarPrefix) {
  const k = normalize(name);
  if (k.length < 4) return [];
  const p = k.slice(0, 4);
  const pool = similarPrefix.get(p);
  if (!pool) return [];
  const threshold = Math.max(2, Math.floor(k.length / 4));
  const matches = [];
  for (const candidate of pool) {
    const ck = normalize(candidate);
    if (ck === k) continue;
    const d = distance(k, ck);
    if (d <= threshold) matches.push({ name: candidate, distance: d });
  }
  matches.sort((a, b) => a.distance - b.distance);
  return matches.slice(0, 3);
}

function classify(name, idx) {
  const k = normalize(name);
  const inEntities = idx.entityNames.has(k);
  const outCount = idx.edgeOut.get(k) || 0;
  const inCount = idx.edgeIn.get(k) || 0;
  const totalEdges = outCount + inCount;
  const fecShape = looksLikeFecCommittee(name);

  if (!inEntities && totalEdges === 0) {
    if (fecShape) return { gap_class: 'fec-committee-suspect', edges_total: 0, similar: [] };
    return { gap_class: 'unresolvable', edges_total: 0, similar: findSimilar(name, idx.similarPrefix) };
  }

  if (totalEdges === 0) {
    return { gap_class: 'node-isolated', edges_total: 0, similar: [] };
  }

  // Has edges. Could still be alias-suspect if there's a near-duplicate variant.
  const similar = findSimilar(name, idx.similarPrefix);
  if (similar.length > 0) {
    return { gap_class: 'alias-candidate', edges_total: totalEdges, similar };
  }

  return { gap_class: 'ok', edges_total: totalEdges, similar: [] };
}

// ─── Main scan ─────────────────────────────────────────────────────────

function main() {
  const entities = loadEntities();
  const edges = loadEdgesFromStore();
  const idx = buildNameIndex(entities, edges);

  // Per-wikilink aggregation. Key = normalized name.
  // Tracks original_name (most common casing seen), appearances per field,
  // sample profiles.
  const perName = new Map();

  for (const file of walkProfiles(CONTENT_DIR)) {
    let text;
    try { text = fs.readFileSync(file, 'utf-8'); } catch { continue; }
    const fm = parseFrontmatter(text);
    if (!fm || typeof fm !== 'object') continue;

    const profileRel = path.relative(ROOT, file).replace(/\\/g, '/');

    for (const field of GUARDED_FIELDS) {
      const names = extractWikilinks(fm[field]);
      for (const n of names) {
        const k = normalize(n);
        if (!k) continue;
        let slot = perName.get(k);
        if (!slot) {
          slot = {
            name: n,
            appearances: 0,
            by_field: {},
            sample_profiles: [],
          };
          perName.set(k, slot);
        }
        slot.appearances++;
        slot.by_field[field] = (slot.by_field[field] || 0) + 1;
        if (slot.sample_profiles.length < 3) slot.sample_profiles.push(profileRel);
      }
    }
  }

  // Classify each unique wikilink
  const buckets = {
    unresolvable: [],
    'node-isolated': [],
    'fec-committee-suspect': [],
    'alias-candidate': [],
    ok: [],
  };
  for (const [, slot] of perName) {
    const c = classify(slot.name, idx);
    const record = {
      name: slot.name,
      appearances: slot.appearances,
      by_field: slot.by_field,
      sample_profiles: slot.sample_profiles,
      edges_total: c.edges_total,
      similar: c.similar,
    };
    buckets[c.gap_class].push(record);
  }

  // Sort each by leverage (appearances desc)
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => b.appearances - a.appearances);
  }

  // High-leverage threshold: names appearing in >= 10 profiles. Closing one
  // of these collapses 10+ orphans at once. Anything below the threshold is
  // long-tail — visible in the Admin Note, but not a queue-driving signal.
  const HIGH_LEVERAGE_THRESHOLD = 10;
  const isHighLeverage = (r) => r.appearances >= HIGH_LEVERAGE_THRESHOLD;
  const high_leverage_count =
    buckets.unresolvable.filter(isHighLeverage).length +
    buckets['node-isolated'].filter(isHighLeverage).length +
    buckets['fec-committee-suspect'].filter(isHighLeverage).length +
    buckets['alias-candidate'].filter(isHighLeverage).length;

  const total_gap_count =
    buckets.unresolvable.length +
    buckets['node-isolated'].length +
    buckets['fec-committee-suspect'].length +
    buckets['alias-candidate'].length;

  // findings_count = high-leverage only. The full picture is in by_class
  // and surfaced through the Admin Note priority queue.
  const findings_count = high_leverage_count;

  const totalAppearances = (bucket) =>
    bucket.reduce((a, r) => a + r.appearances, 0);

  const result = {
    findings_count,
    high_leverage_count,
    total_gap_count,
    high_leverage_threshold: HIGH_LEVERAGE_THRESHOLD,
    total_unique_wikilinks: perName.size,
    by_class: {
      unresolvable: {
        count: buckets.unresolvable.length,
        total_appearances: totalAppearances(buckets.unresolvable),
        top: buckets.unresolvable.slice(0, TOP_N),
      },
      'node-isolated': {
        count: buckets['node-isolated'].length,
        total_appearances: totalAppearances(buckets['node-isolated']),
        top: buckets['node-isolated'].slice(0, TOP_N),
      },
      'fec-committee-suspect': {
        count: buckets['fec-committee-suspect'].length,
        total_appearances: totalAppearances(buckets['fec-committee-suspect']),
        top: buckets['fec-committee-suspect'].slice(0, TOP_N),
      },
      'alias-candidate': {
        count: buckets['alias-candidate'].length,
        total_appearances: totalAppearances(buckets['alias-candidate']),
        top: buckets['alias-candidate'].slice(0, TOP_N),
      },
      ok: {
        count: buckets.ok.length,
        total_appearances: totalAppearances(buckets.ok),
      },
    },
    summary:
      `${perName.size} unique wikilinks across guarded fields. ` +
      `Gap classes: ${buckets.unresolvable.length} unresolvable, ` +
      `${buckets['node-isolated'].length} node-isolated, ` +
      `${buckets['fec-committee-suspect'].length} fec-committee-suspect, ` +
      `${buckets['alias-candidate'].length} alias-candidate, ` +
      `${buckets.ok.length} ok.`,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  console.log('═══ librarian-gap-audit ═══');
  console.log(result.summary);
  console.log();
  for (const gc of ['unresolvable', 'node-isolated', 'fec-committee-suspect', 'alias-candidate']) {
    const b = result.by_class[gc];
    if (b.count === 0) continue;
    console.log(`${gc} — ${b.count} unique names, ${b.total_appearances} total appearance(s)`);
    for (const r of b.top.slice(0, 10)) {
      const fields = Object.entries(r.by_field).map(([f, n]) => `${f}×${n}`).join(', ');
      const simNote = r.similar.length > 0 ? ` ← similar: ${r.similar.map((s) => `"${s.name}" (d=${s.distance})`).join('; ')}` : '';
      console.log(`  ${r.appearances}  ${r.name}  [${fields}]${simNote}`);
    }
    console.log();
  }
}

main();
