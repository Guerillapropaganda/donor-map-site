#!/usr/bin/env node
/**
 * backfill-and-prune-related-edges.cjs
 *
 * Two passes on "related" edges:
 *
 *   1. BACKFILL — every frontmatter-migration edge had evidence: null
 *      because the one-shot migration only mirrored wiki-links without
 *      attaching provenance. Set a standardized evidence string so the
 *      user-facing "why is X related to Y?" question has a real answer.
 *
 *   2. PRUNE — a related edge pointing to/from an entity that doesn't
 *      exist in entities.jsonl is dead weight. It won't render in the
 *      network graph (no node to attach), and it can't be clicked
 *      through. Mark status='deprecated' so it's hidden from queries
 *      but preserved for audit / potential reconnection.
 *
 * Usage:
 *   node scripts/backfill-and-prune-related-edges.cjs         # dry-run
 *   node scripts/backfill-and-prune-related-edges.cjs --write # apply
 */

const fs = require('fs');
const path = require('path');
const { loadEdges, upsertEdges } = require('./lib/relationships-store.cjs');
const { loadEntities } = require('./lib/entities-store.cjs');

const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

(function main() {
  console.log(`[backfill-and-prune-related-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  const edges = loadEdges();
  const ents = loadEntities();
  const entNames = new Set(ents.map((e) => e.name));

  const updates = [];
  let backfilled = 0;
  let pruned = 0;
  let alreadyOk = 0;
  let prunedReasons = { orphanFrom: 0, orphanTo: 0, both: 0 };

  for (const e of edges) {
    if (e.type !== 'related') continue;
    if (e.status === 'deprecated') continue;

    const orphanFrom = !entNames.has(e.from);
    const orphanTo = !entNames.has(e.to);

    // Prune only when BOTH endpoints are missing from the registry.
    // A single-orphan edge (essay → real entity, OR real entity →
    // essay) often hides a person we just haven't created a stub for
    // yet (Dave Rubin, Lee Camp, Jake Tapper showed up this way in
    // the initial audit). Bi-orphan edges are unambiguously navigation
    // between essay pages — safe to drop from the relationship graph.
    if (orphanFrom && orphanTo) {
      pruned++;
      prunedReasons.both++;
      updates.push({
        ...e,
        status: 'deprecated',
        evidence: [...(Array.isArray(e.evidence) ? e.evidence : []), `deprecated: both endpoints not in entities.jsonl (essay-to-essay navigation, not a relationship edge)`],
        last_verified: new Date().toISOString(),
      });
      continue;
    }
    if (orphanFrom) prunedReasons.orphanFrom++;
    else if (orphanTo) prunedReasons.orphanTo++;

    // Backfill: evidence-less survivors from frontmatter-migration get a
    // standardized provenance string.
    if (!Array.isArray(e.evidence) || e.evidence.length === 0) {
      if (e.source === 'frontmatter-migration') {
        backfilled++;
        updates.push({
          ...e,
          evidence: [
            `wikilink mirrored from "related:" frontmatter field of "${e.from}" during 2026-04 frontmatter-to-edges migration. Confidence ${e.confidence ?? 0.5} reflects wiki-adjacency signal, not verified evidence of material connection.`,
          ],
          last_verified: new Date().toISOString(),
        });
      } else if (e.source === 'bidirectional-normalizer') {
        // Normalizer usually left evidence on the mirror; any gap here
        // we backfill with a generic mirror-of-peer note.
        backfilled++;
        updates.push({
          ...e,
          evidence: [`mirror of reverse edge ${e.to} → ${e.from} (bidirectional-normalizer)`],
          last_verified: new Date().toISOString(),
        });
      }
      // Unknown-source evidence gap: skip, too risky to guess
    } else {
      alreadyOk++;
    }
  }

  console.log('Related-edges audit:');
  console.log(`  already have evidence:  ${alreadyOk.toLocaleString()}`);
  console.log(`  backfilled evidence:    ${backfilled.toLocaleString()}`);
  console.log(`  pruned (orphan endpoint): ${pruned.toLocaleString()}`);
  console.log(`    └─ orphan from only: ${prunedReasons.orphanFrom.toLocaleString()}`);
  console.log(`    └─ orphan to only:   ${prunedReasons.orphanTo.toLocaleString()}`);
  console.log(`    └─ orphan both ends: ${prunedReasons.both.toLocaleString()}`);
  console.log(`  total updates:          ${updates.length.toLocaleString()}`);

  if (VERBOSE && pruned > 0) {
    console.log('\nSample pruned edges:');
    updates.filter((u) => u.status === 'deprecated').slice(0, 10).forEach((u) => {
      console.log(`  ${u.from} → ${u.to} (${u.evidence[u.evidence.length - 1]})`);
    });
  }

  if (!WRITE) {
    console.log('\n[dry-run] no writes. Use --write to apply.');
    return;
  }

  if (updates.length === 0) { console.log('\nNothing to do.'); return; }

  console.log('\nApplying...');
  const result = upsertEdges(updates);
  console.log(`  updated: ${result.updated}`);
  console.log(`  skipped: ${result.skipped}`);
  console.log(`  invalid: ${result.invalid}`);
  if (result.errors?.length) {
    result.errors.slice(0, 5).forEach((err) => console.log('  ', err));
  }
})();
