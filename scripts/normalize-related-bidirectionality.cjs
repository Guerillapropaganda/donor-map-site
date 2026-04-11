#!/usr/bin/env node
/**
 * normalize-related-bidirectionality.cjs
 *
 * Phase 3 Part 4 — orphan cleanup driven by the canonical JSONL store.
 *
 * The `related` relationship type is semantically symmetric — if A is
 * "related to" B, then B is "related to" A. But the migration + discovery
 * scanner produce directed edges (from/to in storage), and in practice
 * many profiles listed each other asymmetrically in their `related:`
 * frontmatter fields (Research Claude updated one side but not the other).
 *
 * This script reads the canonical edge store, finds every `related` edge
 * A→B for which no reverse B→A edge exists, and creates the missing
 * reverse edge via upsertEdges with source "bidirectional-normalizer".
 * The new edges inherit the same confidence as their origin edge so they
 * don't gain unwarranted authority.
 *
 * Only `related` is auto-mirrored. Other types are explicitly excluded
 * because their direction carries meaning:
 *   - monetary: donor → recipient (flipping would invert the money flow)
 *   - political-opposition: opponent → opposed (asymmetric by default)
 *   - staffing: employee → principal (direction is factual)
 *   - media-appearance: guest → outlet (direction is factual)
 *   - story-link: profile → story (direction is factual)
 *   - affiliation: member → organization (direction is factual)
 *   - legal: plaintiff → defendant (direction is factual)
 *   - family: already stored as undirected with canonical from<to order
 *
 * Usage:
 *   node scripts/normalize-related-bidirectionality.cjs --dry-run
 *   node scripts/normalize-related-bidirectionality.cjs
 */
const { loadEdges, upsertEdges, clearEdgesCache } = require('./lib/relationships-store.cjs');
const { computeEdgeId, TYPE_META } = require('./lib/relationship-edge-validator.cjs');

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const t0 = Date.now();

  console.log('Phase 3 Part 4 — Related bidirectional normalizer');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log('');

  // Reload from disk (clear any stale cache)
  clearEdgesCache();
  const edges = loadEdges();
  console.log(`Loaded ${edges.length} total edges from data/relationships.jsonl`);

  // Only look at `related` type and only active status
  const relatedEdges = edges.filter((e) => e.type === 'related' && e.status === 'active');
  console.log(`Active related edges: ${relatedEdges.length}`);

  // Build a Set of existing (from, to) pairs so we can check reverse lookups in O(1)
  const existingPairs = new Set();
  for (const e of relatedEdges) {
    if (!e.from || !e.to) continue;
    existingPairs.add(`${e.from}||${e.to}`);
  }

  // For each edge A→B, check if B→A exists. If not, record it for mirroring.
  //
  // Exclude mirrors INTO aggregator-type endpoints: meta profiles
  // (indexes, archives, session history, methodology docs) and story
  // profiles are asymmetric by nature — they're aggregators that
  // receive inbound references. Mirroring would bloat those pages with
  // thousands of outbound related links to every profile that references
  // them, which is useless noise. The inbound edge (X → Index) stays
  // intact; we just don't create the reverse Index → X.
  //
  // We also skip mirrors where to_type is `event` because events are
  // time-bounded references, not ongoing relationships.
  const SKIP_MIRROR_INTO = new Set(['meta', 'story', 'event']);

  const mirrorsToCreate = [];
  let alreadySymmetric = 0;
  let selfLoops = 0;
  let skippedAggregator = 0;

  for (const edge of relatedEdges) {
    const { from, to } = edge;
    if (!from || !to) continue;
    if (from === to) {
      selfLoops++;
      continue;
    }
    const reverseKey = `${to}||${from}`;
    if (existingPairs.has(reverseKey)) {
      alreadySymmetric++;
      continue;
    }
    // Skip if the TARGET of the mirror would be an aggregator type.
    // The mirror edge is (edge.to → edge.from), so mirror.to === edge.from.
    // We don't want to create reverse edges pointing INTO meta/story/event
    // pages because those are inbound-only aggregators (indexes, archives,
    // news events). Mirroring would bloat them with thousands of outbound
    // related refs. We check edge.from_type because that's what mirror.to_type
    // will be.
    if (SKIP_MIRROR_INTO.has(edge.from_type)) {
      skippedAggregator++;
      continue;
    }

    // Build the mirror edge: swap from and to (including type + subcategory),
    // preserve confidence, tag with bidirectional-normalizer source.
    const timestamp = new Date().toISOString();
    const mirror = {
      id: '',
      from: edge.to,
      from_slug: edge.to_slug || null,
      from_type: edge.to_type,
      from_subcategory: edge.to_subcategory,
      to: edge.from,
      to_slug: edge.from_slug || null,
      to_type: edge.from_type,
      to_subcategory: edge.from_subcategory,
      type: 'related',
      direction: 'directed',
      confidence: edge.confidence,
      source: 'bidirectional-normalizer',
      source_url: null,
      evidence: [`mirror of edge ${edge.id}`],
      amount: null,
      cycle: null,
      date_range: null,
      role: null,
      first_seen: timestamp,
      last_verified: timestamp,
      status: 'active',
    };
    mirror.id = computeEdgeId(mirror);
    mirrorsToCreate.push(mirror);

    // Also add the new pair to existingPairs so we don't double-count
    // when the reverse comes up in the loop.
    existingPairs.add(`${edge.to}||${edge.from}`);
  }

  console.log('');
  console.log('--- analysis ---');
  console.log(`related edges scanned:    ${relatedEdges.length}`);
  console.log(`already symmetric:        ${alreadySymmetric}`);
  console.log(`self-loops (skipped):     ${selfLoops}`);
  console.log(`skipped aggregator target: ${skippedAggregator}`);
  console.log(`orphan pairs identified:  ${mirrorsToCreate.length}`);
  console.log('');

  if (mirrorsToCreate.length === 0) {
    console.log('No orphans to fix. Store is already symmetric.');
    return;
  }

  // Sample the first 5 mirrors for visual inspection
  console.log('Sample of mirrors (first 5):');
  for (const m of mirrorsToCreate.slice(0, 5)) {
    console.log(`  ${m.from} (${m.from_type}) → ${m.to} (${m.to_type}) [conf=${m.confidence}]`);
  }
  console.log('');

  if (dryRun) {
    console.log(`(dry-run) ${mirrorsToCreate.length} mirror edges would be upserted`);
    console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    return;
  }

  const result = upsertEdges(mirrorsToCreate);
  console.log('--- upsert result ---');
  console.log(`added:    ${result.added}`);
  console.log(`updated:  ${result.updated}`);
  console.log(`skipped:  ${result.skipped}`);
  console.log(`invalid:  ${result.invalid}`);
  console.log(`total after: ${result.total}`);
  if (result.errors.length > 0) {
    console.log('');
    console.log('first 5 errors:');
    for (const err of result.errors.slice(0, 5)) {
      console.log(`  ${err.from} → ${err.to} (${err.type}): ${err.error}`);
    }
  }
  console.log('');
  console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(2)}s`);
}

if (require.main === module) {
  main();
}
