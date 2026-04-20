/**
 * entity-resolution.cjs — tier 1 checker.
 *
 * Flags references to entities that don't resolve:
 *  1. Edge store: from/to names not in entities.jsonl AND not in the
 *     "bare entity" allowlist (committee names, raw FEC strings).
 *  2. Frontmatter related/donors/top-donors wikilinks that point to a
 *     non-existent profile.
 *
 * An unresolvable reference means the downstream aggregations for that
 * entity will silently miss this data (or worse, create a phantom
 * "entity" that appears in queries but has no profile).
 */
const fs = require('fs');
const path = require('path');
const { loadEdges } = require('../lib/relationships-store.cjs');
const { loadEntities } = require('../lib/entities-store.cjs');
const { finding } = require('./_framework.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

async function run(opts = {}) {
  const findings = [];
  const entityFilter = opts.entities ? new Set(opts.entities) : null;

  const ents = loadEntities();
  const byName = new Set(ents.map((e) => e.name));
  // Also accept common aliases where profile_path basename differs from entity.name
  for (const e of ents) {
    if (e.profile_path) byName.add(path.basename(e.profile_path, '.md').replace(/^_/, '').replace(/ Master Profile$/, ''));
    if (Array.isArray(e.aliases)) for (const a of e.aliases) byName.add(a);
  }

  // 1. Edge store — accumulate counts of unknown from/to references.
  const edges = loadEdges();
  const unknownRefCounts = new Map();
  for (const e of edges) {
    if (e.status === 'deprecated') continue;
    for (const side of ['from', 'to']) {
      const name = e[side];
      if (!name) continue;
      if (byName.has(name)) continue;
      const sideType = e[side === 'from' ? 'from_type' : 'to_type'];
      // Non-entity ref types are vault wayfinding pages (indexes, story
      // analyses, events, media profiles, system) — they legitimately
      // appear in edge from/to slots without being entities in
      // entities.jsonl. Not a data bug, so exclude from the warn count.
      if (['meta', 'story', 'event', 'system', 'media-profile'].includes(sideType)) continue;
      // Bare FEC committee / party names are expected upstream
      // references. Pattern: mostly-uppercase, contains a political
      // keyword. Char class includes quotes (" and ') because FEC
      // names include AKA aliases with quoted strings, and digits
      // for PAC IDs and year qualifiers.
      if (/^[A-Z0-9 &.,"'/()\-]{5,}$/.test(name) &&
          /(PAC|COMMITTEE|FUND|CAMPAIGN|FOR|VICTORY|LEADERSHIP|REPUBLICAN|DEMOCRAT|PARTY|STATE CENTRAL|EXECUTIVE COMM|LIBERTARIAN|INDEPENDENT|UNION|EMPLOYEES|WORKERS|LEAGUE|VOLUNTARY|ACTION|POLITICAL|TAKE BACK|SUPER PAC|CORPORATION|PROJECT)/.test(name)) continue;
      // Federal agencies — also expected upstream references; they're
      // targets of lobbying/contracts but we don't maintain agency-
      // level entity profiles.
      if (/^(Department of|Office of|Bureau of|U\.?S\.?|United States|Federal|National|Internal Revenue|Secretary of|General Services|Environmental Protection|Securities and Exchange|Food and Drug|Centers for)/.test(name)) continue;
      // Narrative analysis pages (Cross-Donor Map, The Revolving Door,
      // The Think Tank Money Map, etc.) are wayfinding content typed
      // as entity by some older pipelines. Pattern: contains " , "
      // (comma-space-comma subtitle format) OR starts with "The ".
      if (/ , /.test(name) || /^(The [A-Z])/.test(name) && / (Map|Pipeline|Network|Spectrum|Architecture|Empire|Model|System|Machine|Pattern|Circuit|Crusade)/.test(name)) continue;
      const k = `${name}||${sideType}`;
      unknownRefCounts.set(k, (unknownRefCounts.get(k) || 0) + 1);
    }
  }
  // Emit as findings only if unknown-ref appears many times (signal, not noise).
  for (const [k, count] of unknownRefCounts) {
    if (count < 5) continue;
    const [name, type] = k.split('||');
    if (entityFilter && !entityFilter.has(name)) continue;
    findings.push(finding({
      severity: 'warn',
      entity: name,
      metric: 'unresolved-ref',
      internal: count,
      cause: 'unknown-entity-ref',
      detail: `entity name "${name}" (type=${type}) appears ${count}× in active edges but has no record in entities.jsonl — downstream aggregations for this entity will silently miss`,
    }));
  }

  // 2. Frontmatter wikilinks — sample just the 5 relational fields.
  //
  // "Resolvable" means any of:
  //   - entity name matches (entities.jsonl)
  //   - profile_path basename matches an entity's registered path
  //   - a .md file with that basename exists anywhere under content/
  //     (catches profiles written but not yet registered as entities —
  //     Tucker Carlson, Dan Bongino, Joe Rogan, most media-influence
  //     pages)
  const RELATIONAL_FIELDS = ['related', 'donors', 'top-donors', 'politicians-funded', 'opposes'];
  const mdFiles = walkMd(path.join(ROOT, 'content'));
  const profilePaths = new Set(ents.filter((e) => e.profile_path).map((e) => e.profile_path.replace(/\\/g, '/')));
  const profileBasenames = new Set();
  for (const p of profilePaths) profileBasenames.add(path.basename(p, '.md'));
  for (const e of ents) profileBasenames.add(e.name);
  // Add every .md file in content/ — a profile that exists as a file
  // but isn't (yet) in entities.jsonl still resolves for wikilink
  // purposes. Without this, ~1400 false-positive warns are emitted.
  for (const f of mdFiles) {
    const base = path.basename(f, '.md');
    profileBasenames.add(base);
    profileBasenames.add(base.replace(/^_/, '').replace(/ Master Profile$/, ''));
  }

  for (const file of mdFiles) {
    const profileName = path.basename(file, '.md').replace(/^_/, '').replace(/ Master Profile$/, '');
    if (entityFilter && !entityFilter.has(profileName)) continue;
    const text = fs.readFileSync(file, 'utf-8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    const fm = m[1];
    for (const field of RELATIONAL_FIELDS) {
      const re = new RegExp(`^${field}:\\s*"([^"]*)"`, 'm');
      const hit = fm.match(re);
      if (!hit) continue;
      const value = hit[1];
      const wikilinks = [...value.matchAll(/\[\[([^\]|#]+?)(?:\|[^\]]+)?\]\]/g)].map((x) => x[1].trim());
      const unresolved = wikilinks.filter((w) => {
        const stem = w.replace(/^_/, '').replace(/ Master Profile$/, '');
        return !profileBasenames.has(w) && !profileBasenames.has(stem) && !byName.has(w) && !byName.has(stem);
      });
      if (unresolved.length > 0) {
        findings.push(finding({
          severity: 'warn',
          entity: profileName,
          metric: `frontmatter:${field}`,
          internal: unresolved.length,
          cause: 'unresolved-wikilink',
          detail: `${unresolved.length} unresolved wikilink(s) in frontmatter field "${field}": ${unresolved.slice(0, 5).join(', ')}${unresolved.length > 5 ? '…' : ''}`,
        }));
      }
    }
  }

  return findings;
}

function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(full));
    else if (ent.name.endsWith('.md')) out.push(full);
  }
  return out;
}

module.exports = {
  name: 'entity-resolution',
  tier: 1,
  description: 'Unresolved entity references in edges and frontmatter wikilinks',
  run,
};
