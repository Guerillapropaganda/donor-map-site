#!/usr/bin/env node
/**
 * backfill-frontmatter-from-registries.cjs
 *
 * Tier 1 mechanical backfill of frontmatter fields that are
 * deterministically derivable from path or canonical registries
 * (legislator-registry, fec-committee-registry). Authorized by ADR-0029
 * §10 amendment 2026-04-30 (David approved cc_p3_209).
 *
 * Strict predicates only — exact-name lookup, no fuzzy matching.
 * Calibration fixtures live in data/calibration-fixture.jsonl per
 * Rule 16; this script registers no new Tier 1 class but rather
 * applies deterministic transformations whose correctness is provable
 * from the input alone.
 *
 * Fields filled (all deterministic, no judgment):
 *
 *   1. entity-type — from path. Politicians directory → politician,
 *      Donors directory → donor (or sector-specific), Think Tanks
 *      directory → think-tank, Media directory → media-profile.
 *
 *   2. chamber — from path. Politicians/{Party}/Senate/* → senate,
 *      House/* → house, Governors/* → governor (state).
 *
 *   3. party — from path. Politicians/Democrats/* → Democrat,
 *      /Republicans/* → Republican, /Independent/* → Independent.
 *
 *   4. parent (sub-notes) — from folder name. Sub-notes inside
 *      `Foo Master Profile` folder get parent=Foo.
 *
 *   5. bioguide-id (politician) — exact-name match against
 *      legislator-registry.jsonl. Skips collisions (Bob Casey class).
 *
 *   6. fec-committee-id (donor / PAC) — exact-name match against
 *      fec-committee-registry.json. Multiple committees per profile
 *      packed into an array.
 *
 * Skips (editorial, judgment-required, NOT this script's lane):
 *   - story-grade, central-thesis (Research Claude)
 *   - related, politicians-funded (derivable but risky)
 *   - source-types (per-source review needed)
 *
 * Usage:
 *   node scripts/backfill-frontmatter-from-registries.cjs            # dry-run
 *   node scripts/backfill-frontmatter-from-registries.cjs --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const SCHEMA = require('./lib/frontmatter-schema.cjs');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

/** Build the set of fields required by the schema for a profile of
 *  `profileType`. Includes both `required` (hard) and `proposed_required`
 *  if the field is one we can derive deterministically. */
function requiredFieldsForType(profileType) {
  const cfg = SCHEMA.types?.[profileType];
  if (!cfg) return new Set();
  const out = new Set(cfg.required || []);
  // id_substitute counts as one slot — we only fill if NONE present
  return out;
}

function idSubstituteForType(profileType) {
  return SCHEMA.types?.[profileType]?.id_substitute || null;
}

// ─── Load registries ────────────────────────────────────────────────

function loadLegislatorRegistry() {
  const file = path.join(ROOT, 'data', 'legislator-registry.jsonl');
  if (!fs.existsSync(file)) return { byName: new Map(), nameCollisions: new Set() };
  const lines = fs.readFileSync(file, 'utf-8').split('\n').filter((l) => l.trim());
  const byName = new Map(); // normalized name → bioguide
  const nameCollisions = new Set();
  for (const line of lines) {
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r.bioguide) continue;
    const forms = [r.name_official, [r.name_first, r.name_last].filter(Boolean).join(' ')];
    for (const f of forms) {
      if (!f) continue;
      const key = f.toLowerCase().trim();
      if (byName.has(key) && byName.get(key) !== r.bioguide) {
        nameCollisions.add(key);
        byName.delete(key);
      } else if (!nameCollisions.has(key)) {
        byName.set(key, r.bioguide);
      }
    }
  }
  return { byName, nameCollisions };
}

function loadFecRegistry() {
  const file = path.join(ROOT, 'data', 'fec-committee-registry.json');
  if (!fs.existsSync(file)) return { byVaultProfile: new Map() };
  const reg = JSON.parse(fs.readFileSync(file, 'utf-8'));
  // Group committees by their vault_profile (a profile may map to
  // multiple committees — that's expected, e.g. Trump's profile maps
  // to several cycles' committees).
  const byVaultProfile = new Map();
  for (const [committee_id, entry] of Object.entries(reg)) {
    if (!entry.vault_profile) continue;
    const profilePath = entry.vault_profile;
    const arr = byVaultProfile.get(profilePath) || [];
    arr.push(committee_id);
    byVaultProfile.set(profilePath, arr);
  }
  return { byVaultProfile };
}

// ─── Derivers ───────────────────────────────────────────────────────

function deriveFromPath(rel) {
  const norm = rel.replace(/\\/g, '/');
  const out = {};

  // entity-type
  if (norm.startsWith('content/Politicians/')) out['entity-type'] = 'politician';
  else if (norm.startsWith('content/Donors')) out['entity-type'] = 'donor';
  else if (norm.startsWith('content/Think Tanks')) out['entity-type'] = 'think-tank';
  else if (norm.startsWith('content/Media')) out['entity-type'] = 'media-profile';

  // party
  if (/^content\/Politicians\/Democrats\//.test(norm)) out.party = 'Democrat';
  else if (/^content\/Politicians\/Republicans\//.test(norm)) out.party = 'Republican';
  else if (/^content\/Politicians\/Independent\//.test(norm)) out.party = 'Independent';

  // chamber
  if (/\/Senate\//.test(norm)) out.chamber = 'senate';
  else if (/\/House\//.test(norm)) out.chamber = 'house';
  else if (/\/Governors\//.test(norm)) out.chamber = 'governor';
  else if (/\/Presidential\//.test(norm)) out.chamber = 'president';
  else if (/\/SCOTUS\//.test(norm)) out.chamber = 'supreme-court';

  return out;
}

function deriveParentFromFolder(rel) {
  // For sub-notes inside `_Foo Master Profile.md` siblings: the
  // containing folder is named `Foo` and contains the master profile.
  // Sub-notes look like `content/.../Foo/Some Note.md` (no underscore
  // prefix). Parent is `Foo`.
  const norm = rel.replace(/\\/g, '/');
  const m = norm.match(/^(content\/Politicians\/[^/]+\/[^/]+\/)([^/]+)\/([^/]+)\.md$/);
  if (!m) return null;
  const parentFolder = m[2];
  const filename = m[3];
  // If filename matches `_Foo Master Profile`, it IS the master profile
  // (not a sub-note). Skip.
  if (filename === `_${parentFolder} Master Profile`) return null;
  return parentFolder;
}

// ─── Main ──────────────────────────────────────────────────────────

function parseMd(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  let fm;
  try { fm = yaml.load(m[1]) || {}; } catch { return null; }
  return { frontmatter: fm, frontmatterRaw: m[1], body: m[2], hasFinalNewline: text.endsWith('\n') };
}

/**
 * Format-preserving inject. Appends new fields at the END of the
 * existing frontmatter block, leaving everything else byte-identical.
 * Avoids the round-trip-through-yaml.dump noise that would re-wrap
 * lines, change quoting style, and reorder keys.
 */
function injectFields(originalText, additions) {
  const m = originalText.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)([\s\S]*)$/);
  if (!m) return null;
  const [, openMarker, fmRaw, closeMarker, body] = m;
  // Determine line ending from existing content.
  const eol = fmRaw.includes('\r\n') ? '\r\n' : '\n';
  const newLines = [];
  for (const [k, v] of Object.entries(additions)) {
    let line;
    if (Array.isArray(v)) {
      // Block-sequence form for arrays — keeps it readable in vault editors.
      line = `${k}:`;
      for (const item of v) line += `${eol}  - ${formatScalar(item)}`;
    } else {
      line = `${k}: ${formatScalar(v)}`;
    }
    newLines.push(line);
  }
  const sep = fmRaw.endsWith(eol) ? '' : eol;
  return openMarker + fmRaw + sep + newLines.join(eol) + closeMarker + body;
}

/** YAML-safe scalar formatter. Quotes strings that would otherwise be
 *  parsed as types or contain colons. */
function formatScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  // Quote if contains characters that need escaping or starts with reserved char.
  if (/^[!&*\-?[{>|%@`'"]/.test(s) || /[:#]/.test(s) || /^(true|false|null|yes|no|on|off|\d)/i.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === '_archive') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(full, out);
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function main() {
  console.log(`[backfill-frontmatter] ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const legreg = loadLegislatorRegistry();
  const fecreg = loadFecRegistry();
  console.log(`  legislator-registry: ${legreg.byName.size} unambiguous names, ${legreg.nameCollisions.size} collisions skipped`);
  console.log(`  fec-committee-registry: ${fecreg.byVaultProfile.size} profiles with committee mappings`);

  const dirs = ['Politicians', 'Donors & Power Networks', 'Think Tanks & Policy Infrastructure', 'Media & Influence Pipeline'];
  const files = [];
  for (const d of dirs) walkMd(path.join(ROOT, 'content', d), files);

  const stats = {
    scanned: 0,
    skipped_no_frontmatter: 0,
    fields_filled: 0,
    profiles_touched: 0,
    by_field: {},
  };
  const samples = [];

  for (const abs of files) {
    stats.scanned++;
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    let text;
    try { text = fs.readFileSync(abs, 'utf-8'); } catch { continue; }
    const parsed = parseMd(text);
    if (!parsed) { stats.skipped_no_frontmatter++; continue; }
    const fm = parsed.frontmatter || {};

    const additions = {};
    const profileType = fm.type;
    if (!profileType) continue; // can't determine required fields

    const required = requiredFieldsForType(profileType);
    const idSubs = idSubstituteForType(profileType);
    const pathDerived = deriveFromPath(rel);

    // Only fill fields the schema actually requires for this type AND
    // that we can derive deterministically.
    // Use `field in fm` rather than `fm[field] == null` so an explicit
    // `parent: null` (a valid declarative absence) doesn't get overwritten
    // by an injected duplicate — that breaks YAML with "duplicated
    // mapping key." Surfaced 2026-04-30 by JB Pritzker - Donor Network
    // which had `parent: null` and got a second `parent: "JB Pritzker"`
    // line appended.
    const fieldAlreadyDeclared = (k) => k in fm;

    const tryFill = (field, value) => {
      if (!required.has(field)) return; // not required for this type
      if (fieldAlreadyDeclared(field)) return; // already declared (even if null)
      if (value == null || value === '') return;
      additions[field] = value;
    };

    tryFill('entity-type', pathDerived['entity-type']);
    tryFill('chamber', pathDerived.chamber);
    tryFill('party', pathDerived.party);
    if (required.has('parent') && !fieldAlreadyDeclared('parent')) {
      const p = deriveParentFromFolder(rel);
      if (p) additions.parent = p;
    }

    // ID substitute (politicians + state/local-politicians): only fill
    // bioguide-id if NONE of the substitutes are already declared.
    if (idSubs && idSubs.length > 0) {
      const hasAnyId = idSubs.some((f) => fieldAlreadyDeclared(f) && fm[f] != null && fm[f] !== '');
      const allUndeclared = idSubs.every((f) => !fieldAlreadyDeclared(f));
      if (!hasAnyId && allUndeclared) {
        const candidateName = (fm.title || path.basename(rel, '.md').replace(/^_/, '').replace(/ Master Profile$/i, '')).trim();
        const key = candidateName.toLowerCase();
        const bg = legreg.byName.get(key);
        if (bg) additions['bioguide-id'] = bg;
      }
    }

    // fec-committee-id(s) — only fill when vault_profile mapping exists
    // in the registry. Schema doesn't always require this but the
    // registry IS the source of truth, so fill when available regardless
    // of required-status — it's strictly additive truthful metadata.
    if (!fieldAlreadyDeclared('fec-committee-id') && !fieldAlreadyDeclared('fec-committee-ids')) {
      const cids = fecreg.byVaultProfile.get(rel);
      if (cids && cids.length > 0) {
        if (cids.length === 1) additions['fec-committee-id'] = cids[0];
        else additions['fec-committee-ids'] = cids;
      }
    }

    if (Object.keys(additions).length === 0) continue;
    stats.profiles_touched++;
    for (const k of Object.keys(additions)) {
      stats.fields_filled++;
      stats.by_field[k] = (stats.by_field[k] || 0) + 1;
    }
    if (samples.length < 8) samples.push({ rel, additions });

    if (APPLY) {
      try {
        const newText = injectFields(text, additions);
        if (newText && newText !== text) fs.writeFileSync(abs, newText);
      } catch (err) {
        console.warn(`  write failed ${rel}: ${err.message}`);
      }
    }
  }

  console.log(`\n  scanned: ${stats.scanned}`);
  console.log(`  skipped (no frontmatter): ${stats.skipped_no_frontmatter}`);
  console.log(`  profiles touched: ${stats.profiles_touched}`);
  console.log(`  fields filled: ${stats.fields_filled}`);
  console.log(`  by field:`);
  for (const [k, v] of Object.entries(stats.by_field).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k}: ${v}`);
  }
  if (samples.length > 0) {
    console.log(`\n  sample fills:`);
    for (const s of samples) console.log(`    ${s.rel} ← ${JSON.stringify(s.additions)}`);
  }
  if (!APPLY) console.log('\n  rerun with --apply to write changes.');
}
main();
