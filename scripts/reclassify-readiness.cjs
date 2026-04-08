/**
 * reclassify-readiness.cjs — Readiness Tier Reclassification
 *
 * Scans all vault profiles and assigns the correct readiness tier
 * based on actual content quality, source diversity, and enrichment state.
 *
 * New 4-tier system:
 *   verified (A+) — 2+ Tier 1 source types, connections, enriched <90d, editorial sign-off
 *   ready (B)     — body + sources + enriched + connections
 *   draft (C)     — some content, missing key pieces
 *   raw (D-F)     — stub, needs everything
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

// ─── Classification Logic ──────────────────────────────────────

function classify(data, body, content, sourceTypes, tier1Count) {
  const bodyLength = body.length;
  const hasConnections = !!(data.related || data.donors || data.opposes);
  const lastEnriched = data['last-enriched'];
  const hasHumanSignoff = data['last-verified-by'] === 'editorial';
  const hasUnresolvedContradictions = hasContradictions(content);

  let daysSinceEnriched = Infinity;
  if (lastEnriched) {
    daysSinceEnriched = (Date.now() - new Date(lastEnriched).getTime()) / (24 * 60 * 60 * 1000);
  }

  // A+ (verified): 2+ source types, connections, enriched <90d, human sign-off, no contradictions
  if (
    sourceTypes.length >= 2 &&
    tier1Count >= 2 &&
    hasConnections &&
    daysSinceEnriched <= 90 &&
    hasHumanSignoff &&
    !hasUnresolvedContradictions &&
    bodyLength > 500
  ) {
    return 'verified';
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

// ─── Main ──────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Readiness Reclassification — The Donor Map');
  console.log('  4-tier system: raw (D-F) → draft (C) → ready (B) → verified (A+)');
  console.log(`  Mode: ${WRITE ? 'WRITE (applying changes)' : 'DRY RUN (report only)'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const files = walkDir(CONTENT_DIR);
  const results = [];
  const summary = { raw: 0, draft: 0, ready: 0, verified: 0 };
  const transitions = {};
  let changed = 0;
  let skipped = 0;

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
  console.log(`    raw (D-F):      ${summary.raw || 0}`);
  console.log(`    draft (C):      ${summary.draft || 0}`);
  console.log(`    ready (B):      ${summary.ready || 0}`);
  console.log(`    verified (A+):  ${summary.verified || 0}`);

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
