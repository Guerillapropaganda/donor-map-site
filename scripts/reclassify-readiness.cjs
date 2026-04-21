/**
 * reclassify-readiness.cjs — Readiness Tier Reclassification
 *
 * Scans all vault profiles and assigns the correct readiness tier
 * based on actual content quality, source diversity, and enrichment state.
 *
 * 5-tier system (ADR-0017):
 *   verified (A+)      — data-complete + editorial sign-off + Class Analysis
 *   data-complete (A)  — all auto-sections populated, ≥1 Tier 1 source, fresh,
 *                        no blocking flags. Publishable with auto-generated banner.
 *                        Editorial prose optional.
 *   ready (B)          — body + sources + enriched + connections
 *   draft (C)          — some content, missing key pieces
 *   raw (D-F)          — stub, needs everything
 *
 * Usage:
 *   node scripts/reclassify-readiness.cjs                    # dry run (report only)
 *   node scripts/reclassify-readiness.cjs --write            # apply changes
 *   node scripts/reclassify-readiness.cjs --profile="Name"   # single profile
 *   node scripts/reclassify-readiness.cjs --write --verbose  # detailed output
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, writeReport, log } = require('./lib/shared.cjs');

// ─── Config ────────────────────────────────────────────────────

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const DIAGNOSE = process.argv.includes('--diagnose');
const PROFILE_FLAG = process.argv.find(a => a.startsWith('--profile='));
const TARGET_PROFILE = PROFILE_FLAG ? PROFILE_FLAG.split('=')[1].replace(/"/g, '') : null;

// Tier 1 source type detection by URL domain
const SOURCE_TYPE_PATTERNS = {
  'FEC': /fec\.gov/i,
  'Congress': /congress\.gov/i,
  'LDA': /lda\.(gov|senate\.gov)/i,
  'USASpending': /usaspending\.gov/i,
  'SAM': /sam\.gov/i,
  'GovTrack': /govtrack\.us/i,
  'FARA': /fara\.us/i,
  'SEC': /(efts\.)?sec\.gov/i,
  'Courts': /courtlistener\.com/i,
  'DOJ': /justice\.gov/i,
  'EPA': /echo\.epa\.gov/i,
  'OSHA': /dol\.gov/i,
  'FederalRegister': /federalregister\.gov/i,
  'Treasury': /treasury\.gov/i,
  'LobbyView': /lobbyview\.org/i,
};

// Known gaps by profile type — what data SHOULD exist
const EXPECTED_DATA = {
  politician: ['FEC', 'Congress', 'GovTrack'],
  donor: ['FEC', 'LDA'],
  corporation: ['SEC', 'FEC', 'LDA'],
  'think-tank': ['FEC'],
  'lobbying-firm': ['LDA', 'FARA'],
  pac: ['FEC'],
  'media-profile': [],
};

// ─── Analysis Functions ────────────────────────────────────────

function detectSourceTypes(content) {
  const sourceSection = content.split('## Sources')[1] || '';
  const types = new Set();

  // Also check auto-blocks
  const fullText = content;

  for (const [typeName, pattern] of Object.entries(SOURCE_TYPE_PATTERNS)) {
    if (pattern.test(sourceSection) || pattern.test(fullText)) {
      types.add(typeName);
    }
  }
  return Array.from(types).sort();
}

function countTier1Sources(content) {
  const sourceSection = content.split('## Sources')[1] || '';
  return (sourceSection.match(/\(Tier 1\)/g) || []).length;
}

function countCorroboration(sourceTypes) {
  // Corroboration = number of distinct Tier 1 source types
  // A fact is "corroborated" when 2+ independent source types exist
  return sourceTypes.length >= 2 ? sourceTypes.length : 0;
}

function detectKnownGaps(profileType, sourceTypes, data, bodyLength) {
  const gaps = [];
  const expected = EXPECTED_DATA[profileType] || [];

  for (const src of expected) {
    if (!sourceTypes.includes(src)) {
      const labels = {
        'FEC': 'No FEC contribution data',
        'Congress': 'No legislative record from Congress.gov',
        'GovTrack': 'No voting record data',
        'LDA': 'No lobbying disclosure data',
        'SEC': 'No SEC corporate filings',
        'FARA': 'No foreign agent registration data',
        'SAM': 'No SAM.gov entity data',
      };
      gaps.push(labels[src] || `Missing ${src} data`);
    }
  }

  if (!data.related && !data.donors && !data.opposes) {
    gaps.push('No mapped relationships');
  }

  if (bodyLength < 200) {
    gaps.push('Minimal editorial content');
  }

  return gaps;
}

function hasContradictions(content) {
  // Check for unresolved contradiction callouts
  return /\[!contradiction\]/i.test(content);
}

// ADR-0017: flags that block any publication (verified AND data-complete)
const BLOCKING_FLAGS = [
  /\(URL NEEDED\)/,
  /\(UNVERIFIED\)/,
  /\(NEEDS REVIEW\)/,
  /defamation-sanitized/i,
];

function hasBlockingFlags(content) {
  // Only scan visible text (before the Archived section if present)
  const visible = content.split(/^##+\s*Archived/im)[0] || content;
  return BLOCKING_FLAGS.some((re) => re.test(visible));
}

// ─── Type-Specific A+ Requirements ─────────────────────────────

const TYPE_REQUIREMENTS = {
  politician: [
    { id: 'voting-records', check: (d, c) => c.includes('<!-- auto:govtrack') || c.includes('<!-- auto:voting-record') },
    { id: 'committees', check: (d) => !!d.committees || !!d['committee-assignments'] },
    { id: 'bills', check: (d) => parseInt(d['bills-sponsored'] || 0) > 0 || parseInt(d['bills-cosponsored'] || 0) > 0 },
    { id: 'fec-data', check: (d, c) => !!d['total-raised'] || c.includes('<!-- auto:fec') },
  ],
  donor: [
    { id: 'politicians-funded', check: (d) => !!d['politicians-funded'] },
    { id: 'contribution-amounts', check: (d) => !!d['total-political-spend'] || !!d['total-raised'] },
    { id: 'sector', check: (d) => !!d.sector },
  ],
  corporation: [
    { id: 'pac-contributions', check: (d, c) => !!d['politicians-funded'] || c.includes('<!-- auto:fec') },
    { id: 'lobbying', check: (d, c) => !!d['lobbying-spend'] || c.includes('<!-- auto:lda') },
    { id: 'contracts', check: (d, c) => c.includes('<!-- auto:usaspending') || c.includes('<!-- auto:sam') },
  ],
  'think-tank': [
    { id: 'funders', check: (d) => !!d.donors || !!d.related },
    { id: '990-data', check: (d, c) => !!d.ein || !!d['total-revenue'] || c.includes('<!-- auto:nonprofit-990') },
  ],
  'lobbying-firm': [
    { id: 'lobbying-spend', check: (d) => !!d['lobbying-spend'] },
    { id: 'client-list', check: (d, c) => c.includes('<!-- auto:lda') },
  ],
  'media-profile': [
    { id: 'category', check: (d) => !!d.category },
    { id: 'connected', check: (d) => !!d.related },
  ],
  pac: [
    { id: 'fec-data', check: (d, c) => c.includes('<!-- auto:fec') },
    { id: 'donors-mapped', check: (d) => !!d.donors },
  ],
};

// ─── Classification Logic ──────────────────────────────────────

// Editorial types: graded by URL count, not enrichment
const EDITORIAL_TYPES = ['story', 'event', 'sub-note', 'daily-update'];

function countUrls(content) {
  return (content.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length;
}

function classifyEditorial(data, content, tier1Count) {
  const urlCount = countUrls(content);
  const hasSignoff = data['last-verified-by'] === 'editorial';

  // Investigation (A+): 10+ URLs, 3+ Tier 1, sign-off
  if (urlCount >= 10 && tier1Count >= 3 && hasSignoff) {
    return 'verified';
  }
  // Report (B): 5+ URLs
  if (urlCount >= 5) {
    return 'ready';
  }
  // Story (C): has some URLs
  if (urlCount >= 1) {
    return 'draft';
  }
  // Raw: no URLs
  return 'raw';
}

/**
 * ADR-0017 --diagnose helper.
 *
 * Returns the array of specific criteria the profile fails for
 * data-complete promotion. Each failure is a short machine-readable
 * token; the aggregator groups by token and prints a histogram so we
 * know which bulk pipeline or cleanup pass unlocks the most profiles.
 *
 * Tokens align 1:1 with the 6 data-complete gates:
 *   - typeReqs:<id>    — a specific type-specific auto-section missing
 *   - noConnections    — no related/donors/opposes edges
 *   - noTier1          — no (Tier 1) source in ## Sources
 *   - stale:<days>     — last-enriched older than 90d (or missing)
 *   - contradictions   — unresolved [!contradiction] callout
 *   - blocked:<flag>   — URL NEEDED / UNVERIFIED / NEEDS REVIEW / defamation
 *
 * Only runs for profile types eligible for data-complete. Editorial
 * types (story, event, sub-note, daily-update) return [] — they are
 * classified on a different axis and aren't bottlenecked by these
 * gates.
 */
function diagnoseDataCompleteFailures(data, content, sourceTypes, tier1Count) {
  const failures = [];
  if (EDITORIAL_TYPES.includes(data.type)) return failures;
  if (!PUBLISHABLE_TYPES.has(data.type)) return failures;

  // 1. Type-specific auto-sections
  const typeReqs = TYPE_REQUIREMENTS[data.type] || [];
  const naItems = (data['checklist-na'] || []);
  const isNa = (id) => naItems.some(n => typeof n === 'string' && n.startsWith(`${id}:`));
  for (const req of typeReqs) {
    if (!isNa(req.id) && !req.check(data, content)) {
      failures.push(`typeReqs:${req.id}`);
    }
  }

  // 2. Connections
  if (!(data.related || data.donors || data.opposes)) {
    failures.push('noConnections');
  }

  // 3. Tier 1 source
  if (tier1Count < 1) {
    failures.push('noTier1');
  }

  // 4. Freshness
  const lastEnriched = data['last-enriched'];
  if (!lastEnriched) {
    failures.push('stale:never-enriched');
  } else {
    const days = Math.floor((Date.now() - new Date(lastEnriched).getTime()) / (24 * 60 * 60 * 1000));
    if (days > 90) failures.push(`stale:${days}d`);
  }

  // 5. (Contradictions check removed 2026-04-21 — see classifyProfile comment.)

  // 6. Blocking flags — return one token per flag kind present
  const visible = content.split(/^##+\s*Archived/im)[0] || content;
  if (/\(URL NEEDED\)/.test(visible)) failures.push('blocked:URL-NEEDED');
  if (/\(UNVERIFIED\)/.test(visible)) failures.push('blocked:UNVERIFIED');
  if (/\(NEEDS REVIEW\)/.test(visible)) failures.push('blocked:NEEDS-REVIEW');
  if (/defamation-sanitized/i.test(visible)) failures.push('blocked:defamation-sanitized');

  return failures;
}

// Publishable profile types (from ADR-0017 + constructionMode.ts)
const PUBLISHABLE_TYPES = new Set([
  'politician', 'state-politician', 'local-politician',
  'donor', 'corporation', 'pac', 'think-tank', 'lobbying-firm',
]);

function classifyProfile(data, body, content, sourceTypes, tier1Count) {
  const bodyLength = body.length;
  const hasConnections = !!(data.related || data.donors || data.opposes);
  const lastEnriched = data['last-enriched'];
  const hasHumanSignoff = data['last-verified-by'] === 'editorial';
  const hasUnresolvedContradictions = hasContradictions(content);
  const naItems = (data['checklist-na'] || []);

  const isNa = (id) => naItems.some(n => typeof n === 'string' && n.startsWith(`${id}:`));

  let daysSinceEnriched = Infinity;
  if (lastEnriched) {
    daysSinceEnriched = (Date.now() - new Date(lastEnriched).getTime()) / (24 * 60 * 60 * 1000);
  }

  // Type-specific requirements for A+
  const typeReqs = TYPE_REQUIREMENTS[data.type] || [];
  const typeReqsMet = typeReqs.every(req => isNa(req.id) || req.check(data, content));
  const minSourceTypes = ['media-profile', 'think-tank'].includes(data.type) ? 1 : 2;

  // ADR-0017: blocking flags disqualify from any publishable tier
  const blocked = hasBlockingFlags(content);

  // NOTE: we previously gated on `contradictionsClear` (no `[!contradiction]`
  // callout in the body). That check was vestigial from a pre-ADR regime
  // where `[!contradiction]` meant "scanner flagged, needs editorial
  // resolution." Under the current editorial regime `[!contradiction]`
  // is a callout primitive used in the required `## The Contradictions`
  // section — it's content, not a warning. Removing the check 2026-04-21.
  // Defamation risk is handled by hasBlockingFlags() (URL NEEDED / UNVERIFIED
  // / NEEDS REVIEW / defamation-sanitized) which remains strict.

  // A+ (verified): type-specific reqs + universal reqs + editorial sign-off
  if (
    typeReqsMet &&
    sourceTypes.length >= minSourceTypes &&
    tier1Count >= minSourceTypes &&
    hasConnections &&
    daysSinceEnriched <= 90 &&
    hasHumanSignoff &&
    bodyLength > 500 &&
    !blocked
  ) {
    return 'verified';
  }

  // A (data-complete, ADR-0017): all automatable checks pass, no editorial gate.
  // Publishes with auto-generated banner. Required: type-specific reqs,
  // ≥1 Tier 1 source, connections, fresh data, clean flag scan.
  // Editorial prose (Class Analysis, Who They Are) optional.
  if (
    typeReqsMet &&
    tier1Count >= 1 &&
    hasConnections &&
    daysSinceEnriched <= 90 &&
    !blocked
  ) {
    return 'data-complete';
  }

  // B (ready): body + sources + enriched + connections
  if (
    bodyLength > 500 &&
    tier1Count >= 1 &&
    (lastEnriched || sourceTypes.length >= 1) &&
    hasConnections
  ) {
    return 'ready';
  }

  // C (draft): some content exists
  if (bodyLength > 100 || tier1Count >= 1) {
    return 'draft';
  }

  // D-F (raw): stub
  return 'raw';
}

function classify(data, body, content, sourceTypes, tier1Count) {
  if (EDITORIAL_TYPES.includes(data.type)) {
    return classifyEditorial(data, content, tier1Count);
  }
  return classifyProfile(data, body, content, sourceTypes, tier1Count);
}

// ─── Main ──────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Readiness Reclassification — The Donor Map');
  console.log('  5-tier system: raw → draft → ready → data-complete → verified (ADR-0017)');
  console.log(`  Mode: ${WRITE ? 'WRITE (applying changes)' : 'DRY RUN (report only)'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const files = walkDir(CONTENT_DIR);
  const results = [];
  const summary = { raw: 0, draft: 0, ready: 0, 'data-complete': 0, verified: 0 };
  const transitions = {};
  let changed = 0;
  let skipped = 0;

  // --diagnose: per-criterion failure counts + buckets for stale freshness
  const diagCounts = {};                 // token → count of profiles failing
  const diagByCurrent = {};              // current tier → token → count
  const staleBuckets = { '<=90': 0, '91-180': 0, '181-365': 0, '>365': 0, 'never': 0 };

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data, body } = parseFrontmatter(content);

    // Skip files without content-readiness or type
    const allTypes = ['politician', 'donor', 'corporation', 'think-tank', 'lobbying-firm', 'media-profile', 'pac', 'story', 'event', 'sub-note', 'daily-update', 'meta', 'reference', 'index', 'methodology'];
    if (!data.type || !data['content-readiness']) {
      skipped++;
      continue;
    }

    const title = data.title || path.basename(filePath, '.md');

    // Single-profile mode
    if (TARGET_PROFILE && !title.toLowerCase().includes(TARGET_PROFILE.toLowerCase())) {
      continue;
    }

    const currentReadiness = data['content-readiness'] || 'raw';
    const sourceTypes = detectSourceTypes(content);
    const tier1Count = countTier1Sources(content);
    const corrobCount = countCorroboration(sourceTypes);
    const knownGaps = detectKnownGaps(data.type, sourceTypes, data, body.length);
    const newReadiness = classify(data, body, content, sourceTypes, tier1Count);

    const result = {
      title,
      path: filePath,
      type: data.type,
      current: currentReadiness,
      proposed: newReadiness,
      changed: currentReadiness !== newReadiness,
      sourceTypes,
      tier1Count,
      corroborationCount: corrobCount,
      knownGaps,
      bodyLength: body.length,
      lastEnriched: data['last-enriched'] || null,
      hasConnections: !!(data.related || data.donors || data.opposes),
    };

    results.push(result);
    summary[newReadiness] = (summary[newReadiness] || 0) + 1;

    // ADR-0017 --diagnose: tabulate why profiles don't reach data-complete.
    // Only meaningful for profiles that currently aren't publishable —
    // everyone already at data-complete or verified is a success.
    if (DIAGNOSE && !['data-complete', 'verified'].includes(newReadiness)) {
      const failures = diagnoseDataCompleteFailures(data, content, sourceTypes, tier1Count);
      for (const token of failures) {
        // Group freshness into buckets — raw day counts are too noisy
        const key = token.startsWith('stale:') ? 'stale' : token;
        diagCounts[key] = (diagCounts[key] || 0) + 1;
        diagByCurrent[currentReadiness] = diagByCurrent[currentReadiness] || {};
        diagByCurrent[currentReadiness][key] = (diagByCurrent[currentReadiness][key] || 0) + 1;

        // Stale bucket distribution for deciding whether ingest-refresh is the fix
        if (token === 'stale:never-enriched') {
          staleBuckets['never']++;
        } else if (token.startsWith('stale:')) {
          const days = parseInt(token.split(':')[1]);
          if (days <= 180) staleBuckets['91-180']++;
          else if (days <= 365) staleBuckets['181-365']++;
          else staleBuckets['>365']++;
        }
      }
    }

    if (result.changed) {
      changed++;
      const key = `${currentReadiness} → ${newReadiness}`;
      transitions[key] = (transitions[key] || 0) + 1;

      if (VERBOSE) {
        console.log(`  ${title}: ${currentReadiness} → ${newReadiness} (${sourceTypes.length} source types, ${body.length} chars)`);
      }
    }

    // Write changes
    if (WRITE && result.changed) {
      let updated = content;

      // Update content-readiness
      updated = updated.replace(
        /^content-readiness:\s*.+$/m,
        `content-readiness: ${newReadiness}`
      );

      // Add/update source-types
      if (sourceTypes.length > 0) {
        const sourceTypesYaml = `source-types:\n${sourceTypes.map(s => `  - ${s}`).join('\n')}`;
        if (/^source-types:/m.test(updated)) {
          // Replace existing (including array lines)
          updated = updated.replace(/^source-types:[\s\S]*?(?=^[a-zA-Z]|\n---)/m, sourceTypesYaml + '\n');
        } else {
          // Add before closing ---
          updated = updated.replace(/\n---\n/, `\n${sourceTypesYaml}\n---\n`);
        }
      }

      // Add/update corroboration-count
      if (corrobCount > 0) {
        if (/^corroboration-count:/m.test(updated)) {
          updated = updated.replace(/^corroboration-count:\s*.+$/m, `corroboration-count: ${corrobCount}`);
        } else {
          updated = updated.replace(/\n---\n/, `\ncorroboration-count: ${corrobCount}\n---\n`);
        }
      }

      // Add/update known-gaps
      if (knownGaps.length > 0) {
        const gapsYaml = `known-gaps:\n${knownGaps.map(g => `  - "${g}"`).join('\n')}`;
        if (/^known-gaps:/m.test(updated)) {
          updated = updated.replace(/^known-gaps:[\s\S]*?(?=^[a-zA-Z]|\n---)/m, gapsYaml + '\n');
        } else {
          updated = updated.replace(/\n---\n/, `\n${gapsYaml}\n---\n`);
        }
      }

      fs.writeFileSync(filePath, updated, 'utf8');
    }
  }

  // ─── Report ────────────────────────────────────────────────────

  console.log('\n═══ SUMMARY ═══════════════════════════════════════════════\n');
  console.log(`  Profiles scanned: ${results.length}`);
  console.log(`  Skipped (non-profile): ${skipped}`);
  console.log(`  Changes: ${changed}\n`);

  console.log('  New Distribution:');
  console.log(`    raw (D-F):         ${summary.raw || 0}`);
  console.log(`    draft (C):         ${summary.draft || 0}`);
  console.log(`    ready (B):         ${summary.ready || 0}`);
  console.log(`    data-complete (A): ${summary['data-complete'] || 0}`);
  console.log(`    verified (A+):     ${summary.verified || 0}`);

  if (Object.keys(transitions).length > 0) {
    console.log('\n  Transitions:');
    for (const [key, count] of Object.entries(transitions).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${key}: ${count} profiles`);
    }
  }

  // Source type diversity stats
  const withMultiSource = results.filter(r => r.sourceTypes.length >= 2).length;
  const withNoSources = results.filter(r => r.sourceTypes.length === 0).length;
  console.log('\n  Source Diversity:');
  console.log(`    2+ Tier 1 source types: ${withMultiSource}`);
  console.log(`    No Tier 1 sources: ${withNoSources}`);

  // ─── ADR-0017 --diagnose output ──────────────────────────────────
  if (DIAGNOSE) {
    console.log('\n═══ DATA-COMPLETE BOTTLENECK DIAGNOSIS ═══════════════════\n');
    console.log('  Each count = # of non-publishable profiles blocked by this criterion.');
    console.log('  A profile can fail multiple criteria, so totals are not mutually exclusive.\n');

    const sortedTokens = Object.entries(diagCounts).sort((a, b) => b[1] - a[1]);
    const pad = (s, n) => String(s).padEnd(n);
    console.log('  Histogram (all non-publishable profiles):');
    for (const [token, count] of sortedTokens) {
      const bar = '█'.repeat(Math.min(50, Math.round(count / Math.max(1, sortedTokens[0][1]) * 50)));
      console.log(`    ${pad(token, 32)} ${pad(count, 6)} ${bar}`);
    }

    console.log('\n  Staleness distribution (only profiles blocked on stale + those never enriched):');
    for (const [bucket, count] of Object.entries(staleBuckets)) {
      if (count === 0) continue;
      console.log(`    ${pad(bucket, 14)} ${count}`);
    }

    console.log('\n  By current tier (who is closest to data-complete?):');
    for (const [tier, tokens] of Object.entries(diagByCurrent)) {
      const topFailures = Object.entries(tokens).sort((a, b) => b[1] - a[1]).slice(0, 3);
      console.log(`    ${pad(tier, 12)} top blockers: ${topFailures.map(([k, v]) => `${k} (${v})`).join(', ')}`);
    }

    console.log('\n  Interpretation hints:');
    console.log('    - High "stale:*" → run bulk ingest pipeline + build-profile-data-panels.cjs');
    console.log('    - High "noTier1" → run source-harvester or citation-rebuilder');
    console.log('    - High "noConnections" → run rebuild-relationship-caches.cjs');
    console.log('    - High "typeReqs:*" → fix specific pipeline that populates that auto-section');
    console.log('    - High "blocked:*" → editorial cleanup (URL work is David-only per rule 13)');
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — no changes written. Use --write to apply.\n');
  } else {
    console.log(`\n  ✓ ${changed} profiles updated.\n`);
  }

  // Write report
  const reportData = {
    timestamp: new Date().toISOString(),
    mode: WRITE ? 'write' : 'dry-run',
    summary,
    transitions,
    changed,
    total: results.length,
    profiles: results.filter(r => r.changed).map(r => ({
      title: r.title,
      type: r.type,
      from: r.current,
      to: r.proposed,
      sourceTypes: r.sourceTypes,
      gaps: r.knownGaps,
    })),
  };

  const reportMd = [
    `# Readiness Reclassification Report`,
    ``,
    `**Date:** ${new Date().toISOString().split('T')[0]}`,
    `**Mode:** ${WRITE ? 'Applied' : 'Dry Run'}`,
    `**Profiles scanned:** ${results.length}`,
    `**Changes:** ${changed}`,
    ``,
    `## New Distribution`,
    `| Tier | Count |`,
    `|------|-------|`,
    `| raw (D-F) | ${summary.raw || 0} |`,
    `| draft (C) | ${summary.draft || 0} |`,
    `| ready (B) | ${summary.ready || 0} |`,
    `| verified (A+) | ${summary.verified || 0} |`,
    ``,
    `## Transitions`,
    ...Object.entries(transitions).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: **${v}** profiles`),
  ].join('\n');

  try {
    writeReport('reclassify-readiness', reportData, reportMd);
  } catch (e) {
    // Report dir may not exist, that's fine
  }
}

main();
