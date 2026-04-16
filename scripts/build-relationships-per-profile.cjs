#!/usr/bin/env node
/**
 * build-relationships-per-profile.cjs
 *
 * Phase 3 Part 4a — build the per-profile relationship artifact.
 *
 * Reads the canonical edge store at data/relationships.jsonl and
 * produces data/relationships-per-profile.json — a map from normalized
 * profile title to the connections that profile participates in, in
 * the LEGACY Connection shape that Quartz components (DiscoveryPanel,
 * ProfileWidget) currently expect from frontmatter.
 *
 * Structure:
 *
 *   {
 *     "Koch Industries": {
 *       "related":            ["Smith Family Farms", ...],
 *       "donors":             [],                         // Koch has no donors listed
 *       "politicians-funded": ["Ted Cruz", "Josh Hawley", ...],
 *       "opposes":            [],
 *       "stories":            ["Cross-Politician Contradiction Map", ...]
 *     },
 *     "Ted Cruz": {
 *       "related":            [...],
 *       "donors":             ["Koch Industries", ...],   // reverse view of monetary edges
 *       "politicians-funded": [],
 *       "opposes":            [...],
 *       "stories":            [...]
 *     },
 *     ...
 *   }
 *
 * Semantics — matches how the frontmatter fields were historically used:
 *   - related            : profile.related[]            (type=related, profile is `from`)
 *   - donors             : profile.donors[]             (type=monetary, profile is `to`, donor is the `from`)
 *   - politicians-funded : profile.politicians-funded[] (type=monetary, profile is `from`, recipient is the `to`)
 *   - opposes            : profile.opposes[]            (type=political-opposition, profile is `from`)
 *   - stories            : profile.stories[]            (type=story-link, profile is `from`)
 *
 * Only includes active edges (status: "active"). Deprecated/historical/disputed
 * edges are filtered out so the frontend view matches the canonical "what is
 * currently true" answer.
 *
 * This artifact is the handoff point for Phase 3 Part 4b — Quartz
 * components (DiscoveryPanel, ProfileWidget) will read from this file at
 * build time instead of from frontmatter. The shape is deliberately
 * identical to what the components already expect so the component edit
 * is minimal.
 *
 * Usage:
 *   node scripts/build-relationships-per-profile.cjs
 *   node scripts/build-relationships-per-profile.cjs --dry-run
 */
const fs = require('fs');
const path = require('path');
const { loadEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'relationships-per-profile.json');

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const t0 = Date.now();

  console.log('Phase 3 Part 4a — per-profile relationship artifact');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}`);
  console.log('');

  const edges = loadEdges().filter((e) => e.status === 'active');
  console.log(`Loaded ${edges.length} active edges from data/relationships.jsonl`);

  const byProfile = new Map();

  function ensure(title) {
    if (!byProfile.has(title)) {
      byProfile.set(title, {
        related: [],
        donors: [],
        'politicians-funded': [],
        opposes: [],
        stories: [],
        'government-contracts': [],
        // Monetary detail: { name, amount, cycle, confidence }[] for rendering dollar amounts
        'monetary-detail': [],
        'contract-detail': [],
      });
    }
    return byProfile.get(title);
  }
  function addUnique(arr, value) {
    if (!arr.includes(value)) arr.push(value);
  }
  function addMonetaryDetail(arr, name, amount, cycle, confidence) {
    // Dedup by name+cycle, keep highest amount
    const existing = arr.find(d => d.name === name && d.cycle === cycle)
    if (existing) {
      if (amount > existing.amount) existing.amount = amount
    } else {
      arr.push({ name, amount: amount || 0, cycle: cycle || '', confidence: confidence || 0 })
    }
  }

  let mapped = 0;
  let skippedType = 0;

  for (const edge of edges) {
    const { from, to, type } = edge;
    if (!from || !to) continue;

    switch (type) {
      case 'related': {
        const entry = ensure(from);
        addUnique(entry.related, to);
        mapped++;
        break;
      }
      case 'monetary': {
        // Donor gave to recipient. Store in BOTH endpoints:
        //   - recipient.donors                  ← donor
        //   - donor.politicians-funded          ← recipient (if recipient is political)
        const donorEntry = ensure(from);
        addUnique(donorEntry['politicians-funded'], to);
        addMonetaryDetail(donorEntry['monetary-detail'], to, edge.amount, edge.cycle, edge.confidence);
        const recipientEntry = ensure(to);
        addUnique(recipientEntry.donors, from);
        addMonetaryDetail(recipientEntry['monetary-detail'], from, edge.amount, edge.cycle, edge.confidence);
        mapped++;
        break;
      }
      case 'government-contract': {
        // Agency awarded contract to corporation
        const corpEntry = ensure(to);
        addUnique(corpEntry['government-contracts'], from);
        addMonetaryDetail(corpEntry['contract-detail'], from, edge.amount, edge.cycle, edge.confidence);
        mapped++;
        break;
      }
      case 'political-opposition': {
        const entry = ensure(from);
        addUnique(entry.opposes, to);
        mapped++;
        break;
      }
      case 'story-link': {
        const entry = ensure(from);
        addUnique(entry.stories, to);
        mapped++;
        break;
      }
      default:
        // Staffing, media-appearance, affiliation, legal, family — no
        // legacy frontmatter field equivalent, skip.
        skippedType++;
        break;
    }
  }

  // Sort each array for stable output
  for (const entry of byProfile.values()) {
    entry.related.sort();
    entry.donors.sort();
    entry['politicians-funded'].sort();
    entry.opposes.sort();
    entry.stories.sort();
  }

  // Sort profile keys for stable git diff
  const sortedEntries = Array.from(byProfile.entries()).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  const output = {};
  for (const [title, fields] of sortedEntries) output[title] = fields;

  if (!dryRun) {
    const DATA_DIR = path.dirname(OUTPUT);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${OUTPUT}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(output, null, 2) + '\n', 'utf-8');
    fs.renameSync(tmp, OUTPUT);
    console.log(`\n✓ Wrote ${Object.keys(output).length} profile entries → ${path.relative(ROOT, OUTPUT)}`);
  } else {
    console.log(`\n(dry-run) ${Object.keys(output).length} profile entries would be written`);
  }

  // Summary stats
  let totalRelated = 0;
  let totalDonors = 0;
  let totalPoliticiansFunded = 0;
  let totalOpposes = 0;
  let totalStories = 0;
  for (const e of byProfile.values()) {
    totalRelated += e.related.length;
    totalDonors += e.donors.length;
    totalPoliticiansFunded += e['politicians-funded'].length;
    totalOpposes += e.opposes.length;
    totalStories += e.stories.length;
  }

  console.log('');
  console.log('--- summary ---');
  console.log(`active edges processed:   ${edges.length}`);
  console.log(`edges mapped:             ${mapped}`);
  console.log(`edges skipped (type):     ${skippedType}`);
  console.log(`unique profiles:          ${byProfile.size}`);
  console.log('');
  console.log('Per-profile field totals:');
  console.log(`  related:              ${totalRelated.toLocaleString()}`);
  console.log(`  donors:               ${totalDonors.toLocaleString()}`);
  console.log(`  politicians-funded:   ${totalPoliticiansFunded.toLocaleString()}`);
  console.log(`  opposes:              ${totalOpposes.toLocaleString()}`);
  console.log(`  stories:              ${totalStories.toLocaleString()}`);
  console.log('');
  console.log(`elapsed: ${((Date.now() - t0) / 1000).toFixed(2)}s`);
}

if (require.main === module) {
  main();
}
