#!/usr/bin/env node
/**
 * connection-suggester.cjs — Propose missing relationships
 *
 * Uses the committee→pipeline map to detect relationships that SHOULD
 * exist based on committee assignments and donor sectors but don't.
 *
 * Example:
 *   - Politician A is on Banking Committee
 *   - Donor B is a bank (sector: Wall Street) in the vault
 *   - If A doesn't list B in `donors:` / `opposes:` / `related:`, and
 *     B doesn't list A in `politicians-funded:`, the script suggests
 *     the connection for Research Claude to investigate.
 *
 * This is a SUGGESTION engine, not an auto-fix. The output is a markdown
 * report listing candidates with justifications. Research Claude (or
 * David) reviews each one and adds the connection manually if valid.
 *
 * Usage: node scripts/connection-suggester.cjs
 *        node scripts/connection-suggester.cjs --politician="Elizabeth Warren"
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const { getRequiredPipelinesForCommittees } = require('./lib/committee-pipeline-map.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const POLITICIAN_ARG = process.argv.find(a => a.startsWith('--politician='));
const TARGET_POLITICIAN = POLITICIAN_ARG ? POLITICIAN_ARG.split('=')[1].replace(/"/g, '') : null;
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'connection-suggestions.md');

// Committee → sector mapping (for donor-pairing logic)
const COMMITTEE_TO_SECTOR = [
  { match: /banking|financial services/i, sectors: ['Wall Street', 'Banking', 'Finance'] },
  { match: /armed services|defense/i, sectors: ['Defense', 'Defense & Intelligence'] },
  { match: /energy/i, sectors: ['Energy & Utilities', 'Oil & Gas', 'Energy'] },
  { match: /agriculture|\bhelp\b/i, sectors: ['Agriculture', 'Food'] },
  { match: /commerce/i, sectors: ['Tech', 'Telecom', 'Retail'] },
  { match: /judiciary/i, sectors: ['Legal', 'Dark Money'] },
  { match: /foreign|intelligence/i, sectors: ['Israel Lobby', 'Defense & Intelligence'] },
  { match: /transportation|infrastructure/i, sectors: ['Transportation', 'Construction'] },
  { match: /ways and means|finance committee/i, sectors: ['Wall Street', 'Insurance', 'Real Estate'] },
];

function normalizeTitle(s) {
  return String(s || '')
    .replace(/^_/, '')
    .replace(/\s+Master Profile\s*$/i, '')
    .toLowerCase()
    .trim();
}

function parseWikilinks(field) {
  if (!field) return [];
  const str = Array.isArray(field) ? field.join(' · ') : String(field);
  const matches = str.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0]);
}

function hasConnection(profile, targetName) {
  const targetNorm = normalizeTitle(targetName);
  const fields = [profile.data.related, profile.data.donors, profile.data.opposes, profile.data['politicians-funded']];
  for (const f of fields) {
    const links = parseWikilinks(f);
    if (links.some(l => normalizeTitle(l) === targetNorm)) return true;
  }
  return false;
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const politicians = [];
  const donorsBySector = new Map();

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data } = parseFrontmatter(content);
    if (!data || !data.title) continue;

    if (data.type === 'politician') {
      if (TARGET_POLITICIAN && data.title !== TARGET_POLITICIAN && !data.title.includes(TARGET_POLITICIAN)) continue;
      politicians.push({ filePath: f, data });
    } else if (data.type === 'donor' || data.type === 'corporation') {
      const sector = data.sector;
      if (sector) {
        if (!donorsBySector.has(sector)) donorsBySector.set(sector, []);
        donorsBySector.get(sector).push({ filePath: f, data });
      }
    }
  }

  const suggestions = [];

  for (const pol of politicians) {
    const committees = pol.data.committees;
    if (!committees) continue;
    const committeeStr = Array.isArray(committees) ? committees.join(' ') : String(committees);

    // For each committee mapping, find donors in the relevant sectors
    for (const row of COMMITTEE_TO_SECTOR) {
      if (!row.match.test(committeeStr)) continue;
      for (const sector of row.sectors) {
        const sectorDonors = donorsBySector.get(sector) || [];
        for (const donor of sectorDonors) {
          if (hasConnection(pol, donor.data.title)) continue;
          if (hasConnection(donor, pol.data.title)) continue;
          suggestions.push({
            politician: pol.data.title,
            politicianType: pol.data.type,
            donor: donor.data.title,
            donorSector: sector,
            reason: `${pol.data.title} is on a committee matching /${row.match.source}/ which regulates ${sector}, but no connection to ${donor.data.title} is documented.`,
            politicianPath: pol.filePath,
            donorPath: donor.filePath,
          });
        }
      }
    }
  }

  // Group suggestions by politician for cleaner report
  const byPol = new Map();
  for (const s of suggestions) {
    if (!byPol.has(s.politician)) byPol.set(s.politician, []);
    byPol.get(s.politician).push(s);
  }

  const lines = [];
  lines.push('---');
  lines.push('title: "Connection Suggestions"');
  lines.push('type: admin-note');
  lines.push('note-type: research');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`);
  lines.push('generated-by: scripts/connection-suggester.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# Missing-connection candidates');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('These are candidate relationships that _should_ probably exist based on committee-to-sector overlap, but aren\'t currently in the vault. Each suggestion needs Research Claude review — some will be real hits, others will be noise (e.g., a donor\'s sector is technically "Wall Street" but they never actually gave to this politician).');
  lines.push('');
  lines.push(`**Total suggestions:** ${suggestions.length} across ${byPol.size} politicians.`);
  lines.push('');

  for (const [pol, sugs] of byPol) {
    lines.push(`## ${pol}  _(${sugs.length} candidates)_`);
    lines.push('');
    sugs.slice(0, 20).forEach(s => {
      lines.push(`- **${s.donor}** _(${s.donorSector})_`);
      lines.push(`  - ${s.reason}`);
    });
    if (sugs.length > 20) lines.push(`- _...and ${sugs.length - 20} more_`);
    lines.push('');
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`Suggestions report: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`Politicians analyzed: ${politicians.length}`);
  console.log(`Suggestions: ${suggestions.length}`);
}

main();
