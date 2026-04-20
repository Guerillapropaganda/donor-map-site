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
      // Bare FEC committee names (all-caps, contain PAC/COMMITTEE/etc.) are
      // expected orphans — they're canonical upstream references.
      if (/^[A-Z0-9 &.,'/()-]{5,}$/.test(name) && /(PAC|COMMITTEE|FUND|CAMPAIGN|FOR|VICTORY|LEADERSHIP)/.test(name)) continue;
      const k = `${name}||${e[side === 'from' ? 'from_type' : 'to_type']}`;
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
  const RELATIONAL_FIELDS = ['related', 'donors', 'top-donors', 'politicians-funded', 'opposes'];
  const mdFiles = walkMd(path.join(ROOT, 'content'));
  const profilePaths = new Set(ents.filter((e) => e.profile_path).map((e) => e.profile_path.replace(/\\/g, '/')));
  const profileBasenames = new Set();
  for (const p of profilePaths) profileBasenames.add(path.basename(p, '.md'));
  for (const e of ents) profileBasenames.add(e.name);

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
