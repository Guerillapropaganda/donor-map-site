#!/usr/bin/env node
/**
 * migrate-frontmatter-to-relationships-jsonl.cjs
 *
 * One-time migration producing the initial data/relationships.jsonl from
 * existing profile frontmatter fields. Part of Phase 3 (Data Model Only).
 *
 * ### What it does
 *
 * For every profile under content/, this script reads the frontmatter fields
 * that currently encode relationships and emits one JSONL edge per extracted
 * wikilink target, tagged with `source: frontmatter-migration` and
 * `confidence: 0.5`.
 *
 * Field → relationship type mapping:
 *
 *   related              → related                  (profile → target)
 *   donors               → monetary                 (target → profile, REVERSE)
 *   top-donors           → monetary                 (target → profile, REVERSE)
 *   politicians-funded   → monetary                 (profile → target)
 *   opposes              → political-opposition     (profile → target)
 *   politicians-opposed  → political-opposition     (profile → target)
 *   stories              → story-link               (profile → target)
 *
 * Monetary edges emitted from migration have no `amount` or `cycle` — they
 * are exempt from the type-required-extras check via the MIGRATION_SOURCES
 * allowlist in relationship-edge-validator.cjs. The categorizer in Phase 3
 * Part 2 upgrades these with Tier 1 FEC data later.
 *
 * ### Safety
 *
 * - Does NOT mutate any .md file. Read-only walk of the vault.
 * - Writes atomically to data/relationships.jsonl via tmp+rename.
 * - Writes a migration report to content/Admin Notes/relationship-migration-report.md.
 * - Supports --dry-run to print stats without writing.
 *
 * ### Usage
 *
 *   node scripts/migrate-frontmatter-to-relationships-jsonl.cjs --dry-run
 *   node scripts/migrate-frontmatter-to-relationships-jsonl.cjs
 */
const fs = require('fs');
const path = require('path');
const {
  TYPE_META,
  normalizeTitle,
  computeEdgeId,
  validateEdge,
  buildTitleIndex,
} = require('./lib/relationship-edge-validator.cjs');
const { walkDir } = require('./lib/shared.cjs');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'relationships.jsonl');
const REPORT_FILE = path.join(
  CONTENT_DIR,
  'Admin Notes',
  'relationship-migration-report.md'
);

// ─── Field → type table ────────────────────────────────────────────────

/**
 * Each entry describes how a frontmatter field maps to an edge:
 *   field:     frontmatter key name
 *   type:      relationship type enum
 *   direction: "outgoing" (profile → target) | "incoming" (target → profile)
 */
const FIELD_MAP = [
  { field: 'related', type: 'related', direction: 'outgoing' },
  { field: 'donors', type: 'monetary', direction: 'incoming' },
  { field: 'top-donors', type: 'monetary', direction: 'incoming' },
  { field: 'politicians-funded', type: 'monetary', direction: 'outgoing' },
  { field: 'opposes', type: 'political-opposition', direction: 'outgoing' },
  { field: 'politicians-opposed', type: 'political-opposition', direction: 'outgoing' },
  { field: 'stories', type: 'story-link', direction: 'outgoing' },
];

// ─── Wikilink extraction ──────────────────────────────────────────────

/**
 * Extract normalized target titles from a frontmatter value.
 *
 * Handles:
 *   - string form: "[[A]] · [[B|Alias]] · [[C]]"  → ["A", "B", "C"]
 *   - string form without wikilinks, dot-separated: "A · B · C" → ["A", "B", "C"]
 *   - array form: ["[[A]]", "bare title", "[[B|C]]"] → ["A", "bare title", "B"]
 *   - null / undefined / "" → []
 *   - top-donors sector strings like "Individual donor type (17%)" are
 *     returned as-is and filtered out later when they don't match the
 *     title index.
 *
 * Returns an array of normalized titles (strings, already normalizeTitle'd).
 */
function extractWikilinkTargets(value) {
  if (value == null || value === '') return [];
  const targets = [];

  const pushString = (s) => {
    if (typeof s !== 'string') return;
    const trimmed = s.trim();
    if (!trimmed) return;
    // Try wikilink extraction first
    const linkRegex = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
    let match;
    let found = false;
    while ((match = linkRegex.exec(trimmed)) !== null) {
      targets.push(normalizeTitle(match[1]));
      found = true;
    }
    if (found) return;
    // Fallback: split on " · " separator
    if (trimmed.includes('·')) {
      for (const part of trimmed.split('·')) {
        const p = part.trim();
        if (p) targets.push(normalizeTitle(p));
      }
      return;
    }
    // Plain string — preserve as-is (will be filtered against title index)
    targets.push(normalizeTitle(trimmed));
  };

  if (Array.isArray(value)) {
    for (const v of value) pushString(v);
  } else {
    pushString(value);
  }

  return targets.filter((t) => t.length > 0);
}

// ─── Edge construction ────────────────────────────────────────────────

function buildEdge({ from, fromProfile, to, toProfile, type, source, timestamp }) {
  const meta = TYPE_META[type];
  const edge = {
    id: '',
    from,
    from_slug: fromProfile && fromProfile.slug ? fromProfile.slug : null,
    from_type: fromProfile && fromProfile.type ? fromProfile.type : null,
    from_subcategory:
      fromProfile && fromProfile.subcategory ? fromProfile.subcategory : null,
    to,
    to_slug: toProfile && toProfile.slug ? toProfile.slug : null,
    to_type: toProfile && toProfile.type ? toProfile.type : null,
    to_subcategory:
      toProfile && toProfile.subcategory ? toProfile.subcategory : null,
    type,
    direction: meta && meta.directed === false ? 'undirected' : 'directed',
    confidence: 0.5,
    source,
    source_url: null,
    evidence: null,
    amount: null,
    cycle: null,
    date_range: null,
    role: null,
    first_seen: timestamp,
    last_verified: timestamp,
    status: 'active',
  };

  // Normalize undirected edges to canonical from<to order
  if (meta && meta.directed === false && edge.from > edge.to) {
    const tmpFrom = edge.from;
    const tmpFromSlug = edge.from_slug;
    const tmpFromType = edge.from_type;
    const tmpFromSub = edge.from_subcategory;
    edge.from = edge.to;
    edge.from_slug = edge.to_slug;
    edge.from_type = edge.to_type;
    edge.from_subcategory = edge.to_subcategory;
    edge.to = tmpFrom;
    edge.to_slug = tmpFromSlug;
    edge.to_type = tmpFromType;
    edge.to_subcategory = tmpFromSub;
  }

  edge.id = computeEdgeId(edge);
  return edge;
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const t0 = Date.now();
  const timestamp = new Date().toISOString();

  console.log('Phase 3 — frontmatter → data/relationships.jsonl migration');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log('');

  // 1. Build title index (single pass).
  console.log('Building title index...');
  const titleIndex = buildTitleIndex(CONTENT_DIR);
  const collisionTitles = new Set();
  for (const [t, v] of titleIndex) if (Array.isArray(v)) collisionTitles.add(t);
  console.log(`  ${titleIndex.size} profiles, ${collisionTitles.size} title collisions`);

  // 2. Walk content/ and build an edge candidate list.
  let yaml = null;
  try {
    yaml = require('js-yaml');
  } catch (_) {
    yaml = null;
  }
  const { parseFrontmatter: permissiveParse } = require('./lib/shared.cjs');

  const files = walkDir(CONTENT_DIR, '.md');
  console.log(`\nWalking ${files.length} profiles...`);

  const edgesById = new Map();
  const stats = {
    profilesScanned: 0,
    profilesWithRelationships: 0,
    rawCandidates: 0,
    emitted: 0,
    dedupedCorroborated: 0,
    skippedMissingTarget: 0,
    skippedMissingSource: 0,
    skippedCollisionAmbiguous: 0,
    skippedValidation: 0,
    byFieldType: {},
    byType: {},
    missingTargets: new Map(), // target → count
    collisionHits: new Map(), // target → count
    validationErrors: [],
  };

  for (const filePath of files) {
    stats.profilesScanned++;
    let data = {};
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) continue;
      if (yaml) {
        try {
          data = yaml.load(match[1]) || {};
        } catch (_) {
          data = permissiveParse(content).data;
        }
      } else {
        data = permissiveParse(content).data;
      }
    } catch (_) {
      continue;
    }

    const rawTitle = data.title;
    if (!rawTitle || typeof rawTitle !== 'string') continue;
    const fromTitle = normalizeTitle(rawTitle);
    if (!fromTitle) continue;

    const fromIndexEntry = titleIndex.get(fromTitle);
    if (!fromIndexEntry) {
      stats.skippedMissingSource++;
      continue;
    }

    // Pick the canonical profile entry for this source file (handle collisions)
    let fromProfile;
    if (Array.isArray(fromIndexEntry)) {
      // Find the one whose path matches this file
      fromProfile = fromIndexEntry.find((p) => p.path === filePath) || fromIndexEntry[0];
    } else {
      fromProfile = fromIndexEntry;
    }

    let profileContributed = false;

    for (const mapping of FIELD_MAP) {
      const val = data[mapping.field];
      if (val == null || val === '') continue;
      const targets = extractWikilinkTargets(val);
      if (targets.length === 0) continue;

      stats.byFieldType[mapping.field] = stats.byFieldType[mapping.field] || 0;

      for (const rawTarget of targets) {
        stats.rawCandidates++;
        const targetTitle = rawTarget; // already normalized by extractWikilinkTargets
        if (!targetTitle || targetTitle === fromTitle) continue;

        // Look up the target profile
        const toIndexEntry = titleIndex.get(targetTitle);
        if (!toIndexEntry) {
          stats.skippedMissingTarget++;
          stats.missingTargets.set(
            targetTitle,
            (stats.missingTargets.get(targetTitle) || 0) + 1
          );
          continue;
        }

        let toProfile;
        if (Array.isArray(toIndexEntry)) {
          // Collision — can't disambiguate automatically. Skip and report.
          stats.skippedCollisionAmbiguous++;
          stats.collisionHits.set(
            targetTitle,
            (stats.collisionHits.get(targetTitle) || 0) + 1
          );
          continue;
        } else {
          toProfile = toIndexEntry;
        }

        // Decide from/to based on field direction
        let edgeFromTitle, edgeFromProfile, edgeToTitle, edgeToProfile;
        if (mapping.direction === 'outgoing') {
          edgeFromTitle = fromTitle;
          edgeFromProfile = fromProfile;
          edgeToTitle = targetTitle;
          edgeToProfile = toProfile;
        } else {
          // incoming: target → profile (e.g. donor.top-donors means the donor gave to the profile)
          edgeFromTitle = targetTitle;
          edgeFromProfile = toProfile;
          edgeToTitle = fromTitle;
          edgeToProfile = fromProfile;
        }

        const edge = buildEdge({
          from: edgeFromTitle,
          fromProfile: edgeFromProfile,
          to: edgeToTitle,
          toProfile: edgeToProfile,
          type: mapping.type,
          source: 'frontmatter-migration',
          timestamp,
        });

        const valResult = validateEdge(edge);
        if (!valResult.ok) {
          stats.skippedValidation++;
          if (stats.validationErrors.length < 20) {
            stats.validationErrors.push({
              id: edge.id,
              from: edge.from,
              to: edge.to,
              type: edge.type,
              errors: valResult.errors,
            });
          }
          continue;
        }

        // Upsert by id. Corroboration: if we've seen this edge before
        // (same id, from the reverse side of the relationship), bump
        // confidence slightly from 0.5 → 0.6 and record it.
        if (edgesById.has(edge.id)) {
          const existing = edgesById.get(edge.id);
          if (existing.confidence < 0.6) {
            existing.confidence = 0.6;
            stats.dedupedCorroborated++;
          }
          // Keep the later last_verified, newest first_seen wins (same timestamp anyway)
          existing.last_verified = timestamp;
        } else {
          edgesById.set(edge.id, edge);
          stats.emitted++;
          stats.byType[edge.type] = (stats.byType[edge.type] || 0) + 1;
          stats.byFieldType[mapping.field] += 1;
        }

        profileContributed = true;
      }
    }

    if (profileContributed) stats.profilesWithRelationships++;
  }

  // 3. Sort by id for stable git diffs
  const sortedEdges = Array.from(edgesById.values()).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );

  // 4. Write output atomically (unless dry-run)
  if (!dryRun) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${OUTPUT_FILE}.tmp-${process.pid}-${Date.now()}`;
    const body = sortedEdges.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(tmp, body, 'utf-8');
    fs.renameSync(tmp, OUTPUT_FILE);
    console.log(`\n✓ Wrote ${sortedEdges.length} edges → ${path.relative(ROOT, OUTPUT_FILE)}`);
  } else {
    console.log(`\n(dry-run) ${sortedEdges.length} edges would be written`);
  }

  // 5. Build + write the migration report
  const report = buildReport(stats, sortedEdges.length, dryRun, timestamp);
  if (!dryRun) {
    const adminNotesDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(adminNotesDir)) fs.mkdirSync(adminNotesDir, { recursive: true });
    fs.writeFileSync(REPORT_FILE, report, 'utf-8');
    console.log(`✓ Wrote migration report → ${path.relative(ROOT, REPORT_FILE)}`);
  }

  // 6. Print summary
  console.log('');
  console.log('--- summary ---');
  console.log(`profiles scanned:              ${stats.profilesScanned}`);
  console.log(`profiles with relationships:   ${stats.profilesWithRelationships}`);
  console.log(`raw edge candidates:           ${stats.rawCandidates}`);
  console.log(`edges emitted:                 ${stats.emitted}`);
  console.log(`deduped corroborated edges:    ${stats.dedupedCorroborated}`);
  console.log(`skipped: missing target        ${stats.skippedMissingTarget}`);
  console.log(`skipped: missing source        ${stats.skippedMissingSource}`);
  console.log(`skipped: title collision       ${stats.skippedCollisionAmbiguous}`);
  console.log(`skipped: validation failure    ${stats.skippedValidation}`);
  console.log('');
  console.log('by relationship type:');
  for (const [t, n] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t.padEnd(24)} ${n}`);
  }
  console.log('');
  console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(2)}s`);

  if (stats.validationErrors.length > 0) {
    console.log('');
    console.log('first 5 validation errors:');
    for (const err of stats.validationErrors.slice(0, 5)) {
      console.log(`  ${err.from} → ${err.to} (${err.type}): ${err.errors[0]}`);
    }
  }
}

function buildReport(stats, emittedCount, dryRun, timestamp) {
  const lines = [];
  lines.push('---');
  lines.push('title: Relationship Migration Report');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: ${timestamp.slice(0, 10)}`);
  lines.push('---');
  lines.push('');
  lines.push('# Relationship Migration Report');
  lines.push('');
  lines.push(`Generated: ${timestamp}`);
  lines.push(`Mode: ${dryRun ? '**DRY RUN** (no files written)' : 'WRITE'}`);
  lines.push(
    `Script: [scripts/migrate-frontmatter-to-relationships-jsonl.cjs](../../scripts/migrate-frontmatter-to-relationships-jsonl.cjs)`
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Profiles scanned: **${stats.profilesScanned}**`);
  lines.push(`- Profiles with relationship fields: **${stats.profilesWithRelationships}**`);
  lines.push(`- Raw edge candidates extracted: **${stats.rawCandidates}**`);
  lines.push(`- Edges emitted to \`data/relationships.jsonl\`: **${emittedCount}**`);
  lines.push(`- Deduped corroborated edges (seen from both endpoints): **${stats.dedupedCorroborated}**`);
  lines.push('');
  lines.push('## Skipped');
  lines.push('');
  lines.push(`- Target profile not found: **${stats.skippedMissingTarget}**`);
  lines.push(`- Source profile not found: **${stats.skippedMissingSource}**`);
  lines.push(`- Title collision (ambiguous target): **${stats.skippedCollisionAmbiguous}**`);
  lines.push(`- Validation failure: **${stats.skippedValidation}**`);
  lines.push('');
  lines.push('## By relationship type');
  lines.push('');
  lines.push('| Type | Count |');
  lines.push('|------|-------|');
  for (const [t, n] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${t}\` | ${n} |`);
  }
  lines.push('');
  lines.push('## By source frontmatter field');
  lines.push('');
  lines.push('| Field | Contributed edges |');
  lines.push('|-------|-------------------|');
  for (const [f, n] of Object.entries(stats.byFieldType).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${f}\` | ${n} |`);
  }
  lines.push('');

  // Missing targets (top 30)
  if (stats.missingTargets.size > 0) {
    const sorted = Array.from(stats.missingTargets.entries()).sort((a, b) => b[1] - a[1]);
    lines.push('## Top missing targets');
    lines.push('');
    lines.push('Wikilinks pointing to profiles that do not exist in the vault. These edges were');
    lines.push('dropped during migration. The future categorizer or a content session can either');
    lines.push('create the missing profiles or remove the dangling links.');
    lines.push('');
    lines.push('| Target title | Dangling references |');
    lines.push('|--------------|----------------------|');
    for (const [t, n] of sorted.slice(0, 30)) {
      lines.push(`| ${t} | ${n} |`);
    }
    if (sorted.length > 30) {
      lines.push(`| _...and ${sorted.length - 30} more_ | |`);
    }
    lines.push('');
  }

  // Title collisions
  if (stats.collisionHits.size > 0) {
    lines.push('## Title collisions encountered');
    lines.push('');
    lines.push('Target titles that matched multiple profiles. These edges were skipped —');
    lines.push('disambiguation via `from_slug` / `to_slug` requires manual review.');
    lines.push('');
    lines.push('| Target title | References that collided |');
    lines.push('|--------------|--------------------------|');
    for (const [t, n] of Array.from(stats.collisionHits.entries()).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${t} | ${n} |`);
    }
    lines.push('');
  }

  // Validation errors (first 20)
  if (stats.validationErrors.length > 0) {
    lines.push('## Validation errors');
    lines.push('');
    lines.push('First 20 edges that failed the validator during migration. Each is represented');
    lines.push('by its from → to → type triple and the first validation error message.');
    lines.push('');
    lines.push('| From | To | Type | First error |');
    lines.push('|------|----|------|-------------|');
    for (const err of stats.validationErrors) {
      const msg = err.errors[0] || '';
      lines.push(
        `| ${err.from} | ${err.to} | ${err.type} | ${msg.replace(/\|/g, '\\|')} |`
      );
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push(
    '- All edges are tagged `source: frontmatter-migration`, `confidence: 0.5`. Corroborated edges'
  );
  lines.push(
    '  (where the same relationship was found on both endpoints\' frontmatter) are upgraded to `0.6`.'
  );
  lines.push(
    '- Monetary edges have `null` amount / cycle — they are exempt from the type-required-extras'
  );
  lines.push(
    '  check via the `MIGRATION_SOURCES` allowlist in `scripts/lib/relationship-edge-validator.cjs`.'
  );
  lines.push(
    '  The Phase 3 Part 2 categorizer will upgrade them once Tier 1 pipeline data (FEC, LDA) fills'
  );
  lines.push('  in the missing metadata.');
  lines.push(
    '- No profile `.md` files were modified. Frontmatter fields are still the canonical legacy view.'
  );
  lines.push(
    '  Phase 3 Parts 2–4 will gradually rewire consumers to read from `data/relationships.jsonl`.'
  );
  lines.push('');

  return lines.join('\n');
}

if (require.main === module) {
  main();
}
