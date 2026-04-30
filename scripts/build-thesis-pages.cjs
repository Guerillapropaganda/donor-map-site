#!/usr/bin/env node
/**
 * build-thesis-pages.cjs
 *
 * Precompute ADR-0024 Phase 3 thesis-query results at build time and
 * render as static markdown pages in content/thesis/. The Quartz build
 * picks them up like any other markdown content. Pages stay GATED
 * (not added to data/public-routes.json) until David flips the switch
 * — the source content exists, the deploy build skips them in
 * construction mode.
 *
 * Pages produced:
 *   content/thesis/both-sides.md            — corpus-wide bothSidesDonors
 *   content/thesis/influence/{slug}.md      — per-flagship influenceMap
 *                                             (one page per politician
 *                                             in FLAGSHIP_POLITICIANS)
 *
 * Why static markdown rather than client-side JS: Quartz builds to
 * static HTML. Library-side thesis queries can't run client-side
 * (would need to ship the entire librarian). Pre-computing once at
 * build time + serializing the result is the canonical static-site
 * pattern.
 *
 * Re-running this script regenerates pages from current librarian
 * state. Idempotent.
 *
 * Usage:
 *   npx tsx scripts/build-thesis-pages.cjs
 *
 * Authorized by ADR-0029 §10 amendment 2026-04-30 (cc_p3_209) and
 * David's session-end directive "build everything in but keep gated."
 */
'use strict';

// Use tsx to load the librarian's TypeScript directly. The script is
// .cjs but invoked via npx tsx which handles both formats.
const path = require('path');
const fs = require('fs');

async function main() {
  const { Graph } = await import('../lib/donor-map/graph.ts');
  const ROOT = path.resolve(__dirname, '..');
  const dataDir = path.resolve(ROOT, 'data');

  console.log('[build-thesis-pages] loading librarian...');
  const t0 = Date.now();
  const g = Graph.load({ data_dir: dataDir });
  console.log(`  graph: ${g.stats().nodes.toLocaleString()} nodes, ${g.stats().edges.toLocaleString()} edges (loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  const outDir = path.join(ROOT, 'content', 'thesis');
  const influenceDir = path.join(outDir, 'influence');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(influenceDir, { recursive: true });

  // ─── /thesis/index.md ────────────────────────────────────────
  const indexMd = `---
title: "Thesis Queries"
tags:
  - interactive
  - tool
content-readiness: data-complete
last-updated: ${new Date().toISOString().slice(0, 10)}
---

# Thesis Queries

Pre-computed analysis from the donor map's relationship graph. Each page below answers one specific question by walking the librarian — the canonical resolver of every entity, every edge, every classification.

## Available analyses

- **[Both-Sides Donors](both-sides.md)** — donors who funded politicians on opposite sides of an opposition pair. The same money picks both sides; the question is *whose interests* survive that hedge.

- **Influence Maps** — per-politician portrait of who funds them, what kind of capital it is, and (where data permits) how their voting record diverges from peers funded by the same donors.

  Examples:
${listFlagshipsLinkBlock(FLAGSHIP_POLITICIANS)}

## How this is built

Numbers come from the unified librarian (ADR-0024). Sources include FEC bulk + API, FEC individual contributions, IRS 8872 dark-money filings, ICIJ offshore leaks, Cal-Access (California state-level), Voteview roll-call records, and govinfo.gov bill sponsorship + cosponsorship data.

Re-built mechanically by \`scripts/build-thesis-pages.cjs\`. Last refresh: ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC.
`;
  fs.writeFileSync(path.join(outDir, 'index.md'), indexMd);
  console.log('  wrote content/thesis/index.md');

  // ─── /thesis/both-sides.md ────────────────────────────────────
  console.log('  computing bothSidesDonors...');
  const bs = g.bothSidesDonors({ min_total_each: 5000, limit: 100 });
  const bsRows = bs.pairs.map((p, i) => {
    return `| ${i + 1} | ${escapeMd(p.donor.name)} | ${escapeMd(p.pol_a.name)} | ${fmtMoney(p.total_to_a)} | ${escapeMd(p.pol_b.name)} | ${fmtMoney(p.total_to_b)} |`;
  }).join('\n');

  const bsMd = `---
title: "Both-Sides Donors"
tags:
  - thesis
  - both-sides
content-readiness: data-complete
last-updated: ${new Date().toISOString().slice(0, 10)}
last-enriched: "${new Date().toISOString().slice(0, 10)}"
---

# Both-Sides Donors

${bs.pairs.length === 0 ? 'No pairs match the current threshold.' : `**${bs.pairs.length}** donor(s) funded politicians on **opposite sides of a recorded opposition pair** at $5,000+ to each side${bs.truncated ? ' (truncated; raise limit for full list)' : ''}.`}

A "both-sides" donation isn't necessarily nefarious — sometimes it's a hedge, sometimes it's a relationship investment, sometimes it's strategic ambiguity. But it's structurally important: when the same money funds politicians who oppose each other, *whose policy preferences end up dominant* is the question worth asking.

| # | Donor | Side A (politician) | $ to A | Side B (politician) | $ to B |
|---|---|---|---:|---|---:|
${bsRows || '| — | (no qualifying pairs at current threshold) | | | | |'}

## How to read this

Each row is one donor + two politicians. The two politicians have a recorded **political-opposition** edge between them in the librarian (a primary opponent, a recorded statement of opposition on a key issue, etc.). The donor gave $5K+ to each.

Threshold: $5,000+ to each side. Below that, hedging is normal cocktail-party-ticket behavior; above, it's a deliberate strategic choice.

## Sources

Edges come from FEC bulk + FEC individual contributions + Cal-Access (California state). Opposition edges come from \`data/relationships.jsonl\` (manual-curated + auto-discovered).

---

*Auto-generated. Edits to this file will be overwritten on next \`scripts/build-thesis-pages.cjs\` run. To change the threshold or limit, modify the script.*
`;
  fs.writeFileSync(path.join(outDir, 'both-sides.md'), bsMd);
  console.log(`  wrote content/thesis/both-sides.md (${bs.pairs.length} pairs)`);

  // ─── /thesis/influence/{slug}.md ──────────────────────────────
  console.log('  computing per-flagship influenceMap...');
  let influencePages = 0;
  for (const pol of FLAGSHIP_POLITICIANS) {
    let r;
    try { r = g.influenceMap(pol.name); }
    catch (e) {
      console.log(`    skip ${pol.name}: ${e.message}`);
      continue;
    }
    const md = renderInfluencePage(pol, r);
    const file = path.join(influenceDir, `${pol.slug}.md`);
    fs.writeFileSync(file, md);
    influencePages++;
    console.log(`    wrote ${path.relative(ROOT, file).replace(/\\/g, '/')} (${r.donor_class_profile.capital_clusters.length} capital clusters, ${r.policy_signal.available ? 'has' : 'lacks'} policy signal)`);
  }
  console.log(`\n  ${influencePages} /thesis/influence/{slug}.md page(s) generated`);
  console.log('\n[build-thesis-pages] done. Pages stay GATED — not in data/public-routes.json.');
}

// ─── Helpers ──────────────────────────────────────────────────────────

const FLAGSHIP_POLITICIANS = [
  { name: 'Alexandria Ocasio-Cortez', slug: 'aoc' },
  { name: 'Joe Manchin', slug: 'joe-manchin' },
  { name: 'Mitch McConnell', slug: 'mitch-mcconnell' },
  { name: 'Bernie Sanders', slug: 'bernie-sanders' },
  { name: 'Elizabeth Warren', slug: 'elizabeth-warren' },
  { name: 'Susan Collins', slug: 'susan-collins' },
  { name: 'Ted Cruz', slug: 'ted-cruz' },
  { name: 'Chuck Schumer', slug: 'chuck-schumer' },
];

function listFlagshipsLinkBlock(list) {
  return list.map((p) => `  - [${p.name}](influence/${p.slug}.md)`).join('\n');
}

function fmtMoney(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n === 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function escapeMd(s) {
  if (typeof s !== 'string') return String(s);
  // Keep mostly-readable but escape pipe so it doesn't break tables.
  return s.replace(/\|/g, '\\|');
}

function renderInfluencePage(pol, r) {
  const dominantCap = r.dominant_capital_cluster;
  const dominantStr = dominantCap
    ? `**Dominant capital cluster:** ${dominantCap.cluster_key} — ${fmtMoney(dominantCap.total_amount)} from ${dominantCap.donor_count} donor(s)`
    : `**Dominant capital cluster:** *(no class-tagged donors at current threshold)*`;

  const capRows = r.donor_class_profile.capital_clusters.slice(0, 10).map((c) => {
    const top = c.top_donors.slice(0, 5).map((d) => `${escapeMd(d.node.name)} (${fmtMoney(d.amount)})`).join(', ');
    return `| ${escapeMd(c.cluster_key)} | ${fmtMoney(c.total_amount)} | ${c.donor_count} | ${top || '*(none)*'} |`;
  }).join('\n');

  const ideoRows = r.donor_class_profile.ideological_clusters.slice(0, 10).map((c) => {
    const top = c.top_donors.slice(0, 5).map((d) => `${escapeMd(d.node.name)} (${fmtMoney(d.amount)})`).join(', ');
    return `| ${escapeMd(c.cluster_key)} | ${fmtMoney(c.total_amount)} | ${c.donor_count} | ${top || '*(none)*'} |`;
  }).join('\n');

  const policyBlock = r.policy_signal.available
    ? `**Policy alignment data:** available. ${r.policy_signal.alignments?.length ?? 0} per-policy alignment score(s) computed.`
    : `**Policy alignment data:** unavailable. Honest data-gap report:\n\n${r.policy_signal.data_gaps.map((g) => `- ${g}`).join('\n')}`;

  return `---
title: "Influence Map: ${pol.name}"
tags:
  - thesis
  - influence-map
content-readiness: data-complete
last-updated: ${new Date().toISOString().slice(0, 10)}
last-enriched: "${new Date().toISOString().slice(0, 10)}"
---

# Influence Map: ${pol.name}

Total incoming: **${fmtMoney(r.donor_class_profile.total_in)}** across **${r.donor_class_profile.edge_count.toLocaleString()}** donor edges in the librarian.

${dominantStr}

## Capital clusters

Donors grouped by what KIND of capital they represent (fossil-capital, finance-capital, military-industrial, etc. — the [class-tag vocabulary](../../Decisions/0001-class-tag-vocabulary.md) per ADR-0001).

${r.donor_class_profile.capital_clusters.length === 0
  ? '*(no donors with class tags at current threshold — many donors haven\'t been class-tagged yet)*'
  : `| Cluster | Total | Donors | Top 5 |\n|---|---:|---:|---|\n${capRows}`}

## Ideological clusters

Donors grouped by ideological function (Republican-establishment, MAGA-coalition, progressive-coalition, corporate-Democrat, etc.).

${r.donor_class_profile.ideological_clusters.length === 0
  ? '*(no donors with ideological tags at current threshold)*'
  : `| Cluster | Total | Donors | Top 5 |\n|---|---:|---:|---|\n${ideoRows}`}

${r.donor_class_profile.unclassified.donor_count > 0
  ? `## Unclassified\n\n**${r.donor_class_profile.unclassified.donor_count}** donors representing **${fmtMoney(r.donor_class_profile.unclassified.total_amount)}** of total — class tags pending.`
  : ''}

## Policy alignment

${policyBlock}

## How to read this

The map answers: "what KIND of money is buying influence here?" Not which individual donors — that's a different list. Class clusters are about *interest groups* — when fossil-capital is a politician's #1 cluster, that's a structural fact about their political base regardless of which specific PAC wrote which check.

## Sources

Aggregated from FEC bulk + FEC individual contributions + Cal-Access state filings + IRS 8872 dark-money + ICIJ offshore leaks. Class tags applied per [ADR-0001](../../Decisions/0001-class-tag-vocabulary.md) (5-dimension schema).

---

*Auto-generated. Edits to this file will be overwritten on next \`scripts/build-thesis-pages.cjs\` run.*
`;
}

main().catch((err) => { console.error('build-thesis-pages failed:', err); process.exit(1); });
