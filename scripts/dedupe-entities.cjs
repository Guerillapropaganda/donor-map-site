#!/usr/bin/env node
/**
 * dedupe-entities.cjs
 *
 * Pattern H fix. Merges canonical entity-name duplicates that drift
 * through the ingest layer:
 *
 *   • Prefix variants:  "DSCC - Democratic Senatorial Campaign Committee"
 *                     ↔ "Democratic Senatorial Campaign Committee"
 *     (same entity; prefix form came from pas2 aliasing, canonical from
 *     the vault profile)
 *
 *   • FEC-shape LAST,FIRST variants: "SANDERS, BERNARD"
 *                                  ↔ "Bernie Sanders"
 *     (FEC candidate-master rows vs vault politician profiles)
 *
 *   • Case-only variants:  "RETIRE CAREER POLITICIANS"
 *                        ↔ "Retire Career Politicians"
 *
 *   • Literal triplicates from multiple ingest passes (SANDERS, BERNARD
 *     × 3 in entities.jsonl)
 *
 * Rule: the canonical name is the one that matches a politician/donor
 * profile in the vault. If no profile matches, pick the most readable
 * form (title-cased over ALL-CAPS, no "DSCC -" prefix).
 *
 * Output:
 *   1. Merged entities.jsonl (one row per canonical name)
 *   2. Rewrites edges in relationships.jsonl + data/derived/*.jsonl
 *      so `from` / `to` fields reference the canonical name
 *
 * Dry-run by default; --apply to write. Writes a backup of entities.jsonl
 * + each modified derived file to a .pre-dedupe.bak next to the original.
 *
 * Usage:
 *   node scripts/dedupe-entities.cjs
 *   node scripts/dedupe-entities.cjs --apply
 */
const fs = require('fs');
const path = require('path');
const { computeEdgeId, buildTitleIndex } = require('./lib/relationship-edge-validator.cjs');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REL_FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');

function normForKey(s) {
  return String(s)
    .toLowerCase()
    // Strip committee-acronym prefix like "DSCC - " / "NRSC - "
    .replace(/^(dscc|nrsc|dcc|nrcc|dnc|rnc|dccc|senate majority|national republican|democratic national|republican national|afl[- ]cio)\s*-\s*/, '')
    // Strip punctuation, collapse whitespace
    .replace(/[^a-z0-9 ,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fecShapeToTitleCase(name) {
  // "SANDERS, BERNARD" → "Bernard Sanders"
  const parts = name.split(',');
  if (parts.length !== 2) return null;
  const last = parts[0].trim();
  const first = parts[1].trim();
  const title = (s) => s.toLowerCase().replace(/(^|\s|-)(\w)/g, (_m, p, c) => p + c.toUpperCase());
  return `${title(first)} ${title(last)}`;
}

function pickCanonical(candidates, vaultNames) {
  // Prefer: matches a vault profile > title-case > no acronym prefix > shortest
  const matchesVault = candidates.filter((c) => vaultNames.has(c));
  if (matchesVault.length === 1) return matchesVault[0];
  // Try FEC-shape normalized
  for (const c of candidates) {
    const tc = fecShapeToTitleCase(c);
    if (tc && vaultNames.has(tc)) return tc; // the vault one wins even if not in candidates
  }
  // Prefer names without acronym prefix (DSCC - X → X)
  const clean = candidates.filter((c) => !/^[A-Z]{3,5}\s*-\s*/.test(c));
  if (clean.length === 1) return clean[0];
  // Prefer title-cased over all-caps
  const titleCased = candidates.filter((c) => c !== c.toUpperCase());
  if (titleCased.length === 1) return titleCased[0];
  // Fallback: longest (most descriptive)
  return [...candidates].sort((a, b) => b.length - a.length)[0];
}

function main() {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  // Load entities
  const entLines = fs.readFileSync(ENT_FILE, 'utf-8').split('\n');
  const ents = [];
  for (const l of entLines) {
    if (!l.trim()) continue;
    try { ents.push(JSON.parse(l)); } catch {}
  }
  const vaultNames = new Set(ents.filter((e) => e.profile_path).map((e) => e.name));

  // Group by normalized key
  const groups = new Map();
  for (const e of ents) {
    // Also treat FEC-shape LAST,FIRST as a group key
    const k1 = normForKey(e.name);
    const tc = fecShapeToTitleCase(e.name);
    const k2 = tc ? normForKey(tc) : null;
    const k = k2 || k1;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }

  const rename = new Map(); // old name → canonical
  const canonicalEnts = [];
  let dupGroups = 0, dupEnts = 0;
  for (const [k, group] of groups) {
    if (group.length === 1) { canonicalEnts.push(group[0]); continue; }
    dupGroups++;
    dupEnts += group.length - 1;
    const names = group.map((e) => e.name);
    const canonical = pickCanonical(names, vaultNames);
    // Merge signals: prefer the canonical's signals; for missing fields,
    // fall back to any group member's signal.
    const merged = group.find((e) => e.name === canonical) || group[0];
    for (const other of group) {
      if (other.name === canonical) continue;
      // merge signals (canonical wins on conflict; others fill in blanks)
      merged.signals = merged.signals || {};
      other.signals = other.signals || {};
      for (const [k, v] of Object.entries(other.signals)) {
        if (merged.signals[k] == null && v != null) merged.signals[k] = v;
      }
      // capital_type, class_position — preserve if blank on canonical
      if (!merged.capital_type && other.capital_type) merged.capital_type = other.capital_type;
      if (!merged.class_position && other.class_position) merged.class_position = other.class_position;
      rename.set(other.name, canonical);
    }
    merged.name = canonical; // if canonical was a vault name we weren't the row for
    canonicalEnts.push(merged);
    if (dupGroups <= 20) {
      console.log(`  group: ${names.map((n) => `"${n}"`).join(' / ')} → canonical "${canonical}"`);
    }
  }
  console.log(`\n${dupGroups} duplicate groups (${dupEnts} rows to collapse)`);
  console.log(`entities: ${ents.length} → ${canonicalEnts.length}`);

  // Show edge-impact estimate without reading relationships.jsonl yet
  console.log(`\n${rename.size} old-name → canonical rewrites queued for edge files\n`);

  if (!APPLY) { console.log('(dry-run — no write)'); return; }

  // Backup + write entities
  fs.copyFileSync(ENT_FILE, ENT_FILE + '.pre-dedupe.bak');
  fs.writeFileSync(ENT_FILE, canonicalEnts.map((e) => JSON.stringify(e)).join('\n') + '\n');
  console.log(`wrote ${ENT_FILE} (${canonicalEnts.length} rows, backup at .pre-dedupe.bak)`);

  // Build name → type index from PROFILE FRONTMATTER via buildTitleIndex,
  // the same source of truth the relationship-edge-sentinel uses to
  // validate denormalization. Previous version used entity-store
  // entity_type, which disagrees with profile-frontmatter type for many
  // vault entities (e.g. "Apple" profile frontmatter says type:
  // corporation, entity store may say entity_type: donor). Refreshing
  // from entity store produced 13,567 sentinel errors.
  const titleIdx = buildTitleIndex();
  const nameToType = new Map();
  for (const [title, matches] of titleIdx) {
    const m = Array.isArray(matches) ? matches[0] : matches;
    if (m && m.type) nameToType.set(title, m.type);
  }

  // Rewrite edges in canonical + derived. Two passes:
  //   1. Rename from/to, recompute id, refresh from_type/to_type.
  //   2. Deduplicate edges that now share an id (two name variants
  //      collapsed to the same canonical → same hash). Merge by
  //      summing amount, concatenating evidence, earliest first_seen,
  //      latest last_verified.
  const edgeFiles = [REL_FILE];
  if (fs.existsSync(DERIVED_DIR)) {
    for (const f of fs.readdirSync(DERIVED_DIR)) {
      if (f.endsWith('.jsonl')) edgeFiles.push(path.join(DERIVED_DIR, f));
    }
  }
  let edgesRewritten = 0, edgesMerged = 0;
  for (const f of edgeFiles) {
    if (!fs.existsSync(f)) continue;
    fs.copyFileSync(f, f + '.pre-dedupe.bak');
    const lines = fs.readFileSync(f, 'utf-8').split('\n');
    const edgesByNewId = new Map(); // id → merged edge
    const unmodifiedLines = []; // non-JSON / invalid lines pass through
    let fileHits = 0, fileMerges = 0;
    for (const line of lines) {
      if (!line.trim()) { unmodifiedLines.push({ pos: edgesByNewId.size + unmodifiedLines.length, raw: line }); continue; }
      let e;
      try { e = JSON.parse(line); } catch { unmodifiedLines.push({ pos: edgesByNewId.size + unmodifiedLines.length, raw: line }); continue; }
      let changed = false;
      if (rename.has(e.from)) { e.from = rename.get(e.from); changed = true; }
      if (rename.has(e.to)) { e.to = rename.get(e.to); changed = true; }
      // Refresh denormalized type fields regardless of rename — sentinel
      // validates all edges, not just rewritten ones.
      const fromType = nameToType.get(e.from);
      const toType = nameToType.get(e.to);
      if (fromType && e.from_type && e.from_type !== fromType) { e.from_type = fromType; changed = true; }
      if (toType && e.to_type && e.to_type !== toType) { e.to_type = toType; changed = true; }
      if (changed) {
        e.id = computeEdgeId(e);
        fileHits++;
      }
      // Merge on id collision
      if (e.id && edgesByNewId.has(e.id)) {
        const existing = edgesByNewId.get(e.id);
        if (e.amount != null) existing.amount = (Number(existing.amount) || 0) + Number(e.amount);
        if (Array.isArray(e.evidence)) {
          existing.evidence = Array.from(new Set([...(existing.evidence || []), ...e.evidence]));
        }
        if (e.first_seen && (!existing.first_seen || e.first_seen < existing.first_seen)) existing.first_seen = e.first_seen;
        if (e.last_verified && (!existing.last_verified || e.last_verified > existing.last_verified)) existing.last_verified = e.last_verified;
        fileMerges++;
      } else {
        edgesByNewId.set(e.id || `__no_id_${edgesByNewId.size}`, e);
      }
    }
    const outLines = [...edgesByNewId.values()].map((e) => JSON.stringify(e));
    fs.writeFileSync(f, outLines.join('\n') + '\n');
    if (fileHits > 0 || fileMerges > 0) {
      console.log(`  ${path.basename(f)}: ${fileHits} rewritten, ${fileMerges} merged into existing`);
    }
    edgesRewritten += fileHits;
    edgesMerged += fileMerges;
  }
  console.log(`\ntotal edges rewritten: ${edgesRewritten}`);
  console.log(`total edges merged (id collisions): ${edgesMerged}`);
}

main();
