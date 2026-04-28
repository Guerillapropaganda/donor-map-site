#!/usr/bin/env node
/**
 * rebuild-relationship-caches.cjs — sync frontmatter caches from canonical store
 *
 * Rule 1 in CLAUDE.md: "data/relationships.jsonl" is the canonical source.
 * Frontmatter relationship fields are read-caches rebuilt from the store.
 *
 * This script ADDS missing canonical links to frontmatter.
 * It does NOT remove stale links (to avoid erasing data not yet in the store).
 *
 * Scope (CURRENT IMPLEMENTATION — verified by grep 2026-04-28):
 *   - monetary edges → donors / top-donors on politician profiles
 *                    → politicians-funded on donor profiles
 *   - related edges  → related field (bidirectional)
 *
 * NOT YET HANDLED (per Phase B-1 of ADR-0026 follow-up):
 *   - political-opposition edges → opposes field
 *     (255 graph-only opposes entries observed 2026-04-28)
 *   - story-link edges → stories field
 *
 * Run: node scripts/rebuild-relationship-caches.cjs [--write] [--dry-run] [--verbose]
 *      --write    : actually modify files (default is dry-run)
 *      --verbose  : show each change
 *      --monetary-only : only process monetary edges
 *
 * The canonical-store-sentinel allows commits that stage this file alongside
 * changed frontmatter files (this script is the authorized "rebuilder").
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_DIR = path.join(ROOT, 'content');

const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const MONETARY_ONLY = process.argv.includes('--monetary-only');
const REPORT_ORPHANS = process.argv.includes('--report-orphans');

// ─── Load canonical edges ─────────────────────────────────────────────────
// Uses the relationships-store library (see scripts/lib/relationships-store.cjs)
// which reads BOTH data/relationships.jsonl AND every .jsonl under data/derived/.
// Previously this script read only the canonical file, which made it blind to
// the ~162k monetary edges the FEC/IRS ingesters write to data/derived/. That
// was the direct cause of the 2026-04-24 backfill failure: the script ran,
// found "0 monetary edges," and no-oped on every donor profile's
// politicians-funded cache.

const { loadEdges: loadAllEdges } = require('./lib/relationships-store.cjs');

function loadEdges() {
  return loadAllEdges().filter(e => !e.status || e.status === 'active');
}

// ─── Build profile index ──────────────────────────────────────────────────

function walkProfiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkProfiles(full, results);
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]); } catch { return null; }
}

function serializeFrontmatter(fm) {
  return yaml.dump(fm, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

function replaceFrontmatter(content, newFm) {
  const serialized = serializeFrontmatter(newFm);
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${serialized}---`);
}

// Parse wikilinks from a frontmatter string field
function extractWikilinks(field) {
  if (!field) return new Set();
  const raw = Array.isArray(field) ? field.join(' ') : String(field);
  const names = new Set();
  for (const m of raw.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    names.add(m[1].trim());
  }
  return names;
}

// Build a "[[Name]]" wikilink string from a set of names, preserving existing format
function buildWikilinkString(names, existing) {
  // Preserve existing separator if present
  const sep = existing && existing.includes(' · ') ? ' · ' : ', ';
  return [...names].map(n => `[[${n}]]`).join(sep);
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('═══ rebuild-relationship-caches ═══');
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log();

  const edges = loadEdges();
  console.log(`  ${edges.length} active canonical edges loaded`);

  // Build name-indexed edge maps
  const monetaryByTo = new Map(); // politician name (lowercase) → donor names
  const monetaryByFrom = new Map(); // donor name (lowercase) → politician names
  // Phase B-1 (ADR-0026): opposes-cache feeds. Schema convention:
  //   politician profile opposes:[X] = "X opposes me" → graph edges TO=me
  //   PAC profile      opposes:[X] = "I oppose X"   → graph edges FROM=me
  const opposeByTo = new Map();   // target (politician) → opposers (PACs/politicians)
  const opposeByFrom = new Map(); // opposer (PAC/politician) → targets (politicians)

  for (const e of edges) {
    const from = e.from;
    const to = e.to;
    if (!from || !to) continue;

    if (e.type === 'monetary') {
      // Skip independent-expenditure OPPOSITION edges — those are spending
      // AGAINST the target (attack ads), not donations. Writing them into
      // frontmatter `donors` mis-labelled anti-Trump super PACs as "donors
      // of Trump." They belong in the opposition view instead, which reads
      // from the canonical edge store directly (not from frontmatter).
      if (e.role === 'ie-oppose') continue;

      // Type-aware caching (added 2026-04-25). Without these gates the
      // PAS2 aggregator's recipient_cmte_id resolution started routing money
      // to FEC committee stubs (e.g. "MCCAUL FOR CONGRESS, INC"), which
      // then leaked into politicians-funded as raw committee names. Keep
      // the politicians-funded cache to vault politicians, and the donors
      // cache to actual donor/corporation entities.
      if (e.to_type === 'politician') {
        const toKey = to.toLowerCase();
        if (!monetaryByTo.has(toKey)) monetaryByTo.set(toKey, new Set());
        monetaryByTo.get(toKey).add(from);

        if (e.from_type === 'donor' || e.from_type === 'corporation') {
          const fromKey = from.toLowerCase();
          if (!monetaryByFrom.has(fromKey)) monetaryByFrom.set(fromKey, new Set());
          monetaryByFrom.get(fromKey).add(to);
        }
      }
    } else if (e.type === 'political-opposition') {
      // Both directions are populated so each profile gets the right cache
      // regardless of whether it's the opposer side or the opposed side.
      const toKey = to.toLowerCase();
      const fromKey = from.toLowerCase();
      if (!opposeByTo.has(toKey)) opposeByTo.set(toKey, new Set());
      opposeByTo.get(toKey).add(from);
      if (!opposeByFrom.has(fromKey)) opposeByFrom.set(fromKey, new Set());
      opposeByFrom.get(fromKey).add(to);
    }
  }

  console.log(`  ${monetaryByTo.size} profiles have incoming monetary edges`);
  console.log(`  ${monetaryByFrom.size} profiles have outgoing monetary edges`);
  console.log(`  ${opposeByTo.size} profiles have incoming political-opposition edges`);
  console.log(`  ${opposeByFrom.size} profiles have outgoing political-opposition edges`);
  console.log();

  // Walk vault
  const profiles = walkProfiles(CONTENT_DIR);
  let updated = 0, skipped = 0, checked = 0;

  for (const filePath of profiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm) { skipped++; continue; }

    const title = fm.title || path.basename(filePath, '.md');
    const titleLower = title.toLowerCase();
    const profileType = fm.type;

    let changed = false;
    const newFm = { ...fm };

    // ── Politicians: update `donors` / `top-donors` from incoming monetary edges ──
    if (!MONETARY_ONLY || true) {
      if (profileType === 'politician') {
        const canonicalDonors = monetaryByTo.get(titleLower);
        if (canonicalDonors && canonicalDonors.size > 0) {
          // Merge with existing donors field
          const existingField = fm.donors || fm['top-donors'] || '';
          const existingNames = extractWikilinks(existingField);

          const missingDonors = [...canonicalDonors].filter(d => !existingNames.has(d));
          if (missingDonors.length > 0) {
            const allNames = new Set([...existingNames, ...canonicalDonors]);
            // Prefer updating 'donors' field, fall back to 'top-donors'
            const fieldToUpdate = fm.donors !== undefined ? 'donors' : 'top-donors';
            newFm[fieldToUpdate] = buildWikilinkString(allNames, fm[fieldToUpdate] || fm.donors);
            changed = true;
            if (VERBOSE) {
              console.log(`  + ${title} (politician): adding ${missingDonors.length} donors to ${fieldToUpdate}`);
              for (const d of missingDonors) console.log(`      + [[${d}]]`);
            }
          }
        }
      }

      // ── Donors/corporations: update `politicians-funded` from outgoing monetary edges ──
      if (profileType === 'donor' || profileType === 'corporation') {
        const canonicalFunded = monetaryByFrom.get(titleLower);
        if (canonicalFunded && canonicalFunded.size > 0) {
          const existingField = fm['politicians-funded'] || '';
          const existingNames = extractWikilinks(existingField);

          const missingFunded = [...canonicalFunded].filter(p => !existingNames.has(p));
          if (missingFunded.length > 0) {
            const allNames = new Set([...existingNames, ...canonicalFunded]);
            newFm['politicians-funded'] = buildWikilinkString(allNames, fm['politicians-funded']);
            changed = true;
            if (VERBOSE) {
              console.log(`  + ${title} (donor): adding ${missingFunded.length} politicians to politicians-funded`);
              for (const p of missingFunded) console.log(`      + [[${p}]]`);
            }
          }
        }
      }
    }

    // ── opposes: cache from political-opposition edges ──
    // Skip when --monetary-only.
    if (!MONETARY_ONLY) {
      // Pick the right edge direction by profile type. politicians read
      // incoming opposition (PACs that oppose them); PAC/donor profiles
      // read outgoing opposition (politicians they oppose).
      let canonicalOpposes = null;
      if (profileType === 'politician') {
        canonicalOpposes = opposeByTo.get(titleLower);
      } else if (profileType === 'donor' || profileType === 'corporation') {
        canonicalOpposes = opposeByFrom.get(titleLower);
      }

      if (canonicalOpposes && canonicalOpposes.size > 0) {
        const existingField = fm.opposes || '';
        const existingNames = extractWikilinks(existingField);
        const missing = [...canonicalOpposes].filter(o => !existingNames.has(o));
        if (missing.length > 0) {
          const allNames = new Set([...existingNames, ...canonicalOpposes]);
          newFm.opposes = buildWikilinkString(allNames, fm.opposes);
          changed = true;
          if (VERBOSE) {
            console.log(`  + ${title} (${profileType}): adding ${missing.length} entries to opposes`);
            for (const o of missing) console.log(`      + [[${o}]]`);
          }
        }
      }
    }

    if (changed) {
      checked++;
      if (WRITE) {
        const newContent = replaceFrontmatter(content, newFm);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        updated++;
        if (!VERBOSE) process.stdout.write('.');
      } else {
        updated++;
      }
    }
  }

  if (!VERBOSE && updated > 0) console.log();
  console.log();
  console.log(`  profiles checked: ${profiles.length}`);
  console.log(`  profiles with changes: ${updated}`);
  console.log(`  skipped (no frontmatter): ${skipped}`);
  if (!WRITE) console.log('\n  DRY RUN — re-run with --write to apply changes');
  else console.log('\n  ✓ Done');
}

// ─── ADR-0027: --report-orphans mode ─────────────────────────────────────
//
// Walks every donor/corporation profile, computes the set of names in
// `politicians-funded` that have NO librarian backing (no monetary edge from
// this entity to that name), writes orphan candidates to
// data/frontmatter-orphan-candidates.jsonl via the canonical store helper.
//
// P1 scope: politicians-funded only. donors/top-donors/opposes deferred to
// later phases — those fields are pipeline-driven and likely tens of
// thousands of orphans, which would overwhelm the editor-in-the-loop review
// flow before we have UX to triage at scale.
//
// No frontmatter writes. The actual prune happens later via --apply-approved.

/**
 * Build a name → entity-forms index. For each entity, the set of every
 * lowercase form that should resolve to that entity: canonical name,
 * declared aliases, profile-path-derived stem variants. Used by the
 * orphan check to probe edges in an alias-aware way per ADR-0024.
 */
function buildEntityFormsIndex() {
  const ENTITIES_FILE = path.join(DATA_DIR, 'entities.jsonl');
  if (!fs.existsSync(ENTITIES_FILE)) return new Map();
  const lines = fs.readFileSync(ENTITIES_FILE, 'utf-8').split(/\r?\n/).filter(Boolean);
  const index = new Map(); // lowercase form → array of {entity, all_forms}
  for (const line of lines) {
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r || !r.name) continue;
    const forms = new Set([String(r.name).toLowerCase()]);
    if (Array.isArray(r.aliases)) {
      for (const a of r.aliases) forms.add(String(a).toLowerCase());
    }
    // Profile-path-derived stem alias (mirrors lib/donor-map/resolver.ts
    // → profilePathToWikilinkAlias). Inlined here to avoid pulling the
    // canonical-name-resolver's full registry load — orphan-check just
    // needs the form set, not the resolver.
    if (r.profile_path) {
      const slash = String(r.profile_path).lastIndexOf('/');
      const stem = (slash === -1 ? r.profile_path : r.profile_path.slice(slash + 1)).replace(/\.md$/i, '');
      if (stem) {
        forms.add(stem.toLowerCase());
        if (/^_?.+ Master Profile$/.test(stem)) {
          if (stem.startsWith('_')) forms.add(stem.replace(/^_/, '').toLowerCase());
          else forms.add(('_' + stem).toLowerCase());
        }
      }
    }
    const formArr = [...forms];
    const slot = { entity: r, all_forms: formArr };
    for (const f of formArr) {
      if (!index.has(f)) index.set(f, []);
      index.get(f).push(slot);
    }
  }
  return index;
}

/**
 * Given a wikilink/title name, return the set of every lowercase form
 * that should be probed when looking up edges. If the name resolves to
 * one or more entities, expand to all their forms. Otherwise just the
 * input lowercased.
 */
function entityForms(name, entityIndex) {
  if (!name) return new Set();
  const k = String(name).toLowerCase();
  const slots = entityIndex.get(k);
  if (!slots || slots.length === 0) return new Set([k]);
  const out = new Set();
  for (const slot of slots) {
    for (const f of slot.all_forms) out.add(f);
  }
  return out;
}

function reportOrphans() {
  const store = require('./lib/frontmatter-orphan-candidates-store.cjs');
  const { createCanonicalNameResolver } = require('./lib/canonical-name-resolver.cjs');
  console.log('═══ rebuild-relationship-caches --report-orphans ═══');
  console.log('  Scope: politicians-funded only (P1 per ADR-0027)');
  console.log();

  // Per ADR-0024: route every name lookup through the librarian's
  // resolver. Today's alias additions (entities.jsonl) and FEC committee
  // mappings (fec-committee-registry.json) flow through automatically —
  // no need for the local entityForms index that was the previous
  // workaround. Edges with fec_name forms canonicalize to entity names
  // before the orphan probe runs, so e.g. edges from "BANK OF AMERICA,NA"
  // unify with "Bank of America" edges, and the 13,818-edge FEC stub
  // resolution sweep done 2026-04-28 PM is reflected in counts.
  const resolver = createCanonicalNameResolver();

  const edges = loadEdges();
  console.log(`  ${edges.length} active canonical edges loaded`);

  // Edge maps keyed by CANONICAL name (resolver-resolved). Variant forms
  // collapse into one bucket per entity.
  const monetaryOut = new Map();          // canonicalFrom → Map<canonicalTo, count>
  const oppositionOut = new Map();
  const oppositionInRev = new Map();
  function bump(map, k1, k2) {
    if (!map.has(k1)) map.set(k1, new Map());
    const inner = map.get(k1);
    inner.set(k2, (inner.get(k2) || 0) + 1);
  }
  for (const e of edges) {
    if (!e.from || !e.to) continue;
    const fromCanon = resolver.resolve(e.from);
    const toCanon = resolver.resolve(e.to);
    const fk = String(fromCanon || e.from).toLowerCase();
    const tk = String(toCanon || e.to).toLowerCase();
    if (e.type === 'monetary' && e.role !== 'ie-oppose') {
      bump(monetaryOut, fk, tk);
    } else if (e.type === 'monetary' && e.role === 'ie-oppose') {
      bump(oppositionOut, fk, tk);
      bump(oppositionInRev, tk, fk);
    } else if (e.type === 'political-opposition') {
      bump(oppositionOut, fk, tk);
      bump(oppositionInRev, tk, fk);
    }
  }
  console.log(`  ${monetaryOut.size} entities have outgoing monetary edges`);
  console.log(`  ${oppositionOut.size} entities have outgoing opposition edges`);
  console.log();

  const profiles = walkProfiles(CONTENT_DIR);
  const scanned = [];
  let inspected = 0;

  for (const filePath of profiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm) continue;
    const profileType = fm.type;
    if (profileType !== 'donor' && profileType !== 'corporation') continue;

    const subject = fm.title || path.basename(filePath, '.md');
    const profileRel = path.relative(ROOT, filePath).replace(/\\/g, '/');

    const fundedNames = extractWikilinks(fm['politicians-funded']);
    if (fundedNames.size === 0) continue;
    inspected++;

    const opposesNames = extractWikilinks(fm.opposes);
    const opposesLower = new Set([...opposesNames].map((n) => n.toLowerCase()));

    // Resolver-based probe per ADR-0024: edges are now keyed by canonical
    // entity names (resolver canonicalized them at index-build time), so
    // a single resolve(subject) → canonical key probe sees every alias /
    // FEC-committee variant of subject's edges.
    const subjectCanon = (resolver.resolve(subject) || subject).toLowerCase();

    for (const name of fundedNames) {
      const targetCanon = (resolver.resolve(name) || name).toLowerCase();
      const monEdges = (monetaryOut.get(subjectCanon)?.get(targetCanon) || 0);
      // Opposition edges in EITHER direction count as "real relationship,
      // even though no $ flowed for-side." That's the librarian-gap signal:
      // we know they're connected, just not monetarily.
      const oppEdgesOut = (oppositionOut.get(subjectCanon)?.get(targetCanon) || 0);
      const oppEdgesIn = (oppositionInRev.get(targetCanon)?.get(subjectCanon) || 0);
      const oppEdges = oppEdgesOut + oppEdgesIn;

      if (monEdges > 0) continue; // backed — not an orphan

      scanned.push({
        profile_path: profileRel,
        subject,
        field: 'politicians-funded',
        name,
        in_opposes: opposesLower.has(name.toLowerCase()),
        librarian_monetary_edges: 0,
        librarian_opposition_edges: oppEdges,
      });
    }
  }

  console.log(`  ${inspected} donor/corporation profile(s) had non-empty politicians-funded`);
  console.log(`  ${scanned.length} orphan signals (no backing monetary edge)`);

  const result = store.reconcile(scanned);
  console.log();
  console.log(`  store: +${result.added} new candidate(s), ${result.updated} updated, ${result.resolved} auto-resolved`);
  console.log(`  ${result.total} total record(s) in ${path.relative(ROOT, store.STORE_FILE)}`);
  console.log();
}

if (REPORT_ORPHANS) {
  reportOrphans();
} else {
  main();
}
