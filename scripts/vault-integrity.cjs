/**
 * vault-integrity.cjs — Vault Integrity Scanner
 *
 * Runs three checks:
 *   1. Wikilink integrity — every [[link]] resolves to a real profile
 *   2. Orphan detection — profiles with zero incoming wikilinks
 *   3. Cross-reference consistency — same facts match across related profiles
 *
 * Usage:
 *   node scripts/vault-integrity.cjs                    # full scan
 *   node scripts/vault-integrity.cjs --check=wikilinks  # just wikilinks
 *   node scripts/vault-integrity.cjs --check=orphans    # just orphans
 *   node scripts/vault-integrity.cjs --check=crossref   # just cross-refs
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, writeReport } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const CHECK_FLAG = process.argv.find(a => a.startsWith('--check='));
const CHECK = CHECK_FLAG ? CHECK_FLAG.split('=')[1] : 'all';

// ─── Load All Files ────────────────────────────────────────────

function loadVault() {
  const files = walkDir(CONTENT_DIR);
  const profiles = [];
  const titleToPath = new Map();

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data, body } = parseFrontmatter(content);
      const title = data.title || path.basename(filePath, '.md');
      const relPath = path.relative(CONTENT_DIR, filePath);

      profiles.push({ filePath, relPath, title, data, body, content });
      // Map both exact title and cleaned title
      titleToPath.set(title, relPath);
      titleToPath.set(title.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, ''), relPath);
    } catch { /* skip unreadable */ }
  }

  return { profiles, titleToPath };
}

// ─── 1. Wikilink Integrity ─────────────────────────────────────

function checkWikilinks(profiles, titleToPath) {
  console.log('\n═══ WIKILINK INTEGRITY ═══════════════════════════════\n');
  const broken = [];

  for (const p of profiles) {
    const links = p.content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
    for (const link of links) {
      const target = link.replace('[[', '').replace(']]', '').split('|')[0].trim();
      // Check if target exists in title map
      if (!titleToPath.has(target) && !titleToPath.has(target.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, ''))) {
        broken.push({ source: p.title, target, file: p.relPath });
      }
    }
  }

  // Deduplicate by target
  const byTarget = new Map();
  for (const b of broken) {
    const existing = byTarget.get(b.target) || [];
    existing.push(b.source);
    byTarget.set(b.target, existing);
  }

  console.log(`  Broken wikilinks: ${byTarget.size} unique targets`);
  console.log(`  Total references: ${broken.length}`);

  const sorted = [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [target, sources] of sorted.slice(0, 30)) {
    console.log(`  [[${target}]] — referenced by ${sources.length} profile${sources.length > 1 ? 's' : ''}`);
  }
  if (sorted.length > 30) console.log(`  ... and ${sorted.length - 30} more`);

  return { brokenCount: byTarget.size, totalRefs: broken.length, items: sorted.map(([t, s]) => ({ target: t, referencedBy: s.length })) };
}

// ─── 2. Orphan Detection ───────────────────────────────────────

function checkOrphans(profiles, titleToPath) {
  console.log('\n═══ ORPHAN DETECTION ═════════════════════════════════\n');

  // Count incoming links for each profile
  const incomingLinks = new Map();
  for (const [title] of titleToPath) {
    incomingLinks.set(title, 0);
  }

  for (const p of profiles) {
    const links = p.content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
    for (const link of links) {
      const target = link.replace('[[', '').replace(']]', '').split('|')[0].trim();
      if (incomingLinks.has(target)) {
        incomingLinks.set(target, incomingLinks.get(target) + 1);
      }
      // Also check cleaned name
      const cleaned = target.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, '');
      if (incomingLinks.has(cleaned)) {
        incomingLinks.set(cleaned, Math.max(incomingLinks.get(cleaned), 1));
      }
    }
  }

  const profileTypes = ['politician', 'donor', 'corporation', 'think-tank', 'lobbying-firm', 'media-profile', 'pac'];
  const orphans = profiles
    .filter(p => profileTypes.includes(p.data.type))
    .filter(p => {
      const count = incomingLinks.get(p.title) || 0;
      const cleanedCount = incomingLinks.get(p.title.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, '')) || 0;
      return count + cleanedCount === 0;
    })
    .map(p => ({ title: p.title, type: p.data.type, path: p.relPath }));

  console.log(`  Orphan profiles (zero incoming links): ${orphans.length}`);
  for (const o of orphans.slice(0, 30)) {
    console.log(`  ${o.type}: ${o.title}`);
  }
  if (orphans.length > 30) console.log(`  ... and ${orphans.length - 30} more`);

  return { orphanCount: orphans.length, items: orphans };
}

// ─── 3. Cross-Reference Consistency ────────────────────────────

function checkCrossRefs(profiles) {
  console.log('\n═══ CROSS-REFERENCE CONSISTENCY ══════════════════════\n');
  const mismatches = [];

  // Build a map of profile titles to their total-raised values
  const raisedByTitle = new Map();
  const donorsByTitle = new Map();

  for (const p of profiles) {
    if (p.data['total-raised']) {
      raisedByTitle.set(p.title, p.data['total-raised']);
    }
    if (p.data['politicians-funded']) {
      donorsByTitle.set(p.title, p.data['politicians-funded']);
    }
  }

  // Check: if Profile A lists Profile B as a donor, does B list A as politicians-funded?
  for (const p of profiles) {
    const donorsRaw = p.data.donors || '';
    const donorsField = Array.isArray(donorsRaw) ? donorsRaw.join(' ') : String(donorsRaw);
    const donorLinks = donorsField.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];

    for (const link of donorLinks) {
      const donorName = link.replace('[[', '').replace(']]', '').split('|')[0].trim();
      const donorProfile = profiles.find(dp => dp.title === donorName || dp.title.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, '') === donorName);

      if (donorProfile) {
        const fundedField = donorProfile.data['politicians-funded'] || donorProfile.content;
        const politicianName = p.title.replace(/^_/, '').replace(/\s+Master\s+Profile$/i, '');
        if (!fundedField.includes(politicianName) && !fundedField.includes(p.title)) {
          mismatches.push({
            type: 'missing-backlink',
            from: p.title,
            to: donorName,
            detail: `${p.title} lists ${donorName} as donor, but ${donorName} doesn't list ${politicianName} as funded`,
          });
        }
      }
    }
  }

  console.log(`  Cross-reference mismatches: ${mismatches.length}`);
  for (const m of mismatches.slice(0, 20)) {
    console.log(`  ${m.detail}`);
  }
  if (mismatches.length > 20) console.log(`  ... and ${mismatches.length - 20} more`);

  return { mismatchCount: mismatches.length, items: mismatches.slice(0, 50) };
}

// ─── Main ──────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Vault Integrity Scanner — The Donor Map');
  console.log(`  Check: ${CHECK}`);
  console.log('═══════════════════════════════════════════════════════════');

  const { profiles, titleToPath } = loadVault();
  console.log(`\n  Loaded ${profiles.length} files, ${titleToPath.size} title mappings`);

  const results = {};

  if (CHECK === 'all' || CHECK === 'wikilinks') {
    results.wikilinks = checkWikilinks(profiles, titleToPath);
  }
  if (CHECK === 'all' || CHECK === 'orphans') {
    results.orphans = checkOrphans(profiles, titleToPath);
  }
  if (CHECK === 'all' || CHECK === 'crossref') {
    results.crossref = checkCrossRefs(profiles);
  }

  // Summary
  console.log('\n═══ SUMMARY ═══════════════════════════════════════════\n');
  if (results.wikilinks) console.log(`  Broken wikilinks: ${results.wikilinks.brokenCount} targets (${results.wikilinks.totalRefs} references)`);
  if (results.orphans) console.log(`  Orphan profiles: ${results.orphans.orphanCount}`);
  if (results.crossref) console.log(`  Cross-ref mismatches: ${results.crossref.mismatchCount}`);

  // Write report
  try {
    const reportMd = [
      '# Vault Integrity Report',
      `**Date:** ${new Date().toISOString().split('T')[0]}`,
      `**Files scanned:** ${profiles.length}`,
      '',
      results.wikilinks ? `## Broken Wikilinks: ${results.wikilinks.brokenCount}\n${results.wikilinks.items.slice(0, 50).map(i => `- [[${i.target}]] (${i.referencedBy} refs)`).join('\n')}` : '',
      results.orphans ? `## Orphan Profiles: ${results.orphans.orphanCount}\n${results.orphans.items.slice(0, 50).map(i => `- ${i.type}: ${i.title}`).join('\n')}` : '',
      results.crossref ? `## Cross-Ref Mismatches: ${results.crossref.mismatchCount}\n${results.crossref.items.slice(0, 50).map(i => `- ${i.detail}`).join('\n')}` : '',
    ].join('\n\n');
    writeReport('vault-integrity', results, reportMd);
  } catch { /* report dir may not exist */ }
}

main();
