/**
 * staleness-decay.cjs — Automatic Readiness Decay
 *
 * Demotes profiles that haven't been re-enriched:
 *   verified → ready  after 90 days without enrichment
 *   ready → draft     after 180 days without any update
 *
 * Usage:
 *   node scripts/staleness-decay.cjs                    # dry run (report only)
 *   node scripts/staleness-decay.cjs --write            # apply demotions
 *   node scripts/staleness-decay.cjs --write --verbose  # detailed output
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, writeReport, log } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

const VERIFIED_DECAY_DAYS = 90;
const READY_DECAY_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Staleness Decay — The Donor Map');
  console.log(`  verified → ready after ${VERIFIED_DECAY_DAYS}d, ready → draft after ${READY_DECAY_DAYS}d`);
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const files = walkDir(CONTENT_DIR);
  const now = Date.now();
  const demotions = [];
  const profileTypes = ['politician', 'donor', 'corporation', 'think-tank', 'lobbying-firm', 'media-profile', 'pac', 'story'];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data } = parseFrontmatter(content);

    if (!data.type || !profileTypes.includes(data.type)) continue;

    const readiness = data['content-readiness'];
    const lastEnriched = data['last-enriched'];
    const lastUpdated = data['last-updated'];
    const title = data.title || path.basename(filePath, '.md');

    // Verified → Ready (90 days)
    if (readiness === 'verified' && lastEnriched) {
      const days = (now - new Date(lastEnriched).getTime()) / DAY_MS;
      if (days > VERIFIED_DECAY_DAYS) {
        demotions.push({
          title,
          path: filePath,
          from: 'verified',
          to: 'ready',
          daysSince: Math.round(days),
          reason: `Last enriched ${Math.round(days)} days ago (threshold: ${VERIFIED_DECAY_DAYS}d)`,
        });

        if (WRITE) {
          let updated = content.replace(
            /^content-readiness:\s*.+$/m,
            'content-readiness: ready'
          );
          fs.writeFileSync(filePath, updated, 'utf8');
        }
      }
    }

    // Ready → Draft (180 days)
    if (readiness === 'ready') {
      const enrichedDays = lastEnriched ? (now - new Date(lastEnriched).getTime()) / DAY_MS : Infinity;
      const updatedDays = lastUpdated ? (now - new Date(lastUpdated).getTime()) / DAY_MS : Infinity;
      const mostRecentDays = Math.min(enrichedDays, updatedDays);

      if (mostRecentDays > READY_DECAY_DAYS) {
        demotions.push({
          title,
          path: filePath,
          from: 'ready',
          to: 'draft',
          daysSince: Math.round(mostRecentDays),
          reason: `No update in ${Math.round(mostRecentDays)} days (threshold: ${READY_DECAY_DAYS}d)`,
        });

        if (WRITE) {
          let updated = content.replace(
            /^content-readiness:\s*.+$/m,
            'content-readiness: draft'
          );
          fs.writeFileSync(filePath, updated, 'utf8');
        }
      }
    }
  }

  // Report
  console.log(`\n  Decay candidates: ${demotions.length}\n`);

  const verifiedToReady = demotions.filter(d => d.from === 'verified');
  const readyToDraft = demotions.filter(d => d.from === 'ready');

  if (verifiedToReady.length > 0) {
    console.log(`  verified → ready: ${verifiedToReady.length}`);
    if (VERBOSE) {
      for (const d of verifiedToReady.slice(0, 20)) {
        console.log(`    ${d.title} (${d.daysSince}d since enrichment)`);
      }
    }
  }

  if (readyToDraft.length > 0) {
    console.log(`  ready → draft: ${readyToDraft.length}`);
    if (VERBOSE) {
      for (const d of readyToDraft.slice(0, 20)) {
        console.log(`    ${d.title} (${d.daysSince}d since last activity)`);
      }
    }
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — no changes written. Use --write to apply.\n');
  } else {
    console.log(`\n  ✓ ${demotions.length} profiles demoted.\n`);
  }

  // Write report
  try {
    const reportData = {
      timestamp: new Date().toISOString(),
      mode: WRITE ? 'write' : 'dry-run',
      demotions: demotions.map(d => ({ title: d.title, from: d.from, to: d.to, daysSince: d.daysSince })),
      summary: { verifiedToReady: verifiedToReady.length, readyToDraft: readyToDraft.length },
    };
    const reportMd = [
      `# Staleness Decay Report`,
      `**Date:** ${new Date().toISOString().split('T')[0]}`,
      `**Mode:** ${WRITE ? 'Applied' : 'Dry Run'}`,
      ``,
      `| Transition | Count |`,
      `|-----------|-------|`,
      `| verified → ready (${VERIFIED_DECAY_DAYS}d) | ${verifiedToReady.length} |`,
      `| ready → draft (${READY_DECAY_DAYS}d) | ${readyToDraft.length} |`,
    ].join('\n');
    writeReport('staleness-decay', reportData, reportMd);
  } catch (e) {
    // Report dir may not exist
  }
}

main();
