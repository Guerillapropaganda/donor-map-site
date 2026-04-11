#!/usr/bin/env node
/**
 * featured-date-enforcer.cjs — Catch profiles featured on homepage below tier
 *
 * The Quartz homepage features profiles with `featured-date:` set. Currently
 * this bypasses the readiness tier — Raytheon, AIPAC, Koch Network have
 * featured-date but are below verified (A+).
 *
 * Once the A+ / S-tier pool is large enough to enforce gating, this script
 * will warn about profiles that shouldn't be featured. For now it's a
 * diagnostic — runs in dry-mode and outputs a report listing every profile
 * with featured-date plus its current readiness.
 *
 * Usage: node scripts/featured-date-enforcer.cjs
 *        node scripts/featured-date-enforcer.cjs --strict   # fail exit if any below verified
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const STRICT = process.argv.includes('--strict');
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'featured-date-audit.md');

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const featured = [];

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data } = parseFrontmatter(content);
    if (!data || !data['featured-date']) continue;
    featured.push({
      filePath: f,
      title: data.title,
      type: data.type,
      featuredDate: data['featured-date'],
      readiness: data['content-readiness'] || 'unknown',
      hasAngle: !!data.angle,
      hasAuditStamp: !!data['audit-a-plus-passed'],
    });
  }

  const okTiers = new Set(['verified', 's-tier']);
  const belowTier = featured.filter(f => !okTiers.has(f.readiness));
  const atTier = featured.filter(f => okTiers.has(f.readiness));

  const lines = [];
  lines.push('---');
  lines.push('title: "Featured-date audit"');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`);
  lines.push('generated-by: scripts/featured-date-enforcer.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# Featured-date audit');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`**${featured.length} profiles** have \`featured-date:\` set.`);
  lines.push('');
  lines.push(`- **${atTier.length}** are at verified or s-tier ✓`);
  lines.push(`- **${belowTier.length}** are BELOW verified ⚠️`);
  lines.push('');
  lines.push('## At tier (OK to feature)');
  lines.push('');
  if (atTier.length === 0) {
    lines.push('_None yet._');
  } else {
    atTier.forEach(f => {
      lines.push(`- **${f.title}** _(${f.readiness})_ — featured ${f.featuredDate}`);
    });
  }
  lines.push('');
  lines.push('## Below tier — should not be featured once enforcement is enabled');
  lines.push('');
  if (belowTier.length === 0) {
    lines.push('_None — all featured profiles are at tier._');
  } else {
    belowTier.forEach(f => {
      const rel = path.relative(CONTENT_DIR, f.filePath).split(path.sep).join('/');
      lines.push(`- **${f.title}** _(${f.readiness})_ — featured ${f.featuredDate} — \`${rel}\``);
    });
  }
  lines.push('');
  lines.push('## How to resolve');
  lines.push('');
  lines.push('1. Run the A+ audit on each below-tier profile: `node scripts/pipeline-janitor.cjs --tier=a-plus --write`');
  lines.push('2. Fill in missing fields (central-thesis, story-grade, etc.)');
  lines.push('3. David signs off → profile becomes verified');
  lines.push('4. The Quartz homepage will then render them through the A+ gate instead of the curated featured-date list');

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`Featured-date audit: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`  At tier: ${atTier.length}`);
  console.log(`  Below tier: ${belowTier.length}`);

  if (STRICT && belowTier.length > 0) {
    console.log(`\nSTRICT MODE: ${belowTier.length} below-tier featured profiles. Exiting 1.`);
    process.exit(1);
  }
}

main();
