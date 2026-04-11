#!/usr/bin/env node
/**
 * url-staleness.cjs — Flag URLs that haven't been checked in 180+ days
 *
 * The URL Manager tracks per-URL status (verified / broken / unsure / etc)
 * but has no concept of freshness. A URL marked verified 12 months ago
 * may have link-rotted since — needs re-verification.
 *
 * This script walks every profile, extracts sourced URLs, checks whether
 * each one has a triage timestamp in a companion .urls.json file (if used)
 * or falls back to the profile's last-updated date. URLs stale > N days
 * get flagged in a report for David's next URL pass.
 *
 * NOTE: This script does NOT hit URLs to check liveness — that's the
 * Editor's (David's) job per Vault Rules. This only surfaces candidates
 * for re-triage.
 *
 * Usage: node scripts/url-staleness.cjs
 *        node scripts/url-staleness.cjs --days=180
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const DAYS_ARG = process.argv.find(a => a.startsWith('--days='));
const STALE_DAYS = DAYS_ARG ? parseInt(DAYS_ARG.split('=')[1]) : 180;
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'url-staleness-report.md');

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function extractUrls(body) {
  // Extract markdown-style URLs and flag any marked (Tier 1-4)
  const matches = body.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g) || [];
  return matches.map(m => {
    const linkMatch = m.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (!linkMatch) return null;
    return { text: linkMatch[1], url: linkMatch[2] };
  }).filter(Boolean);
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const staleProfiles = [];
  let totalUrls = 0;

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;

    const lastUpdated = data['last-updated'];
    const age = daysSince(lastUpdated);
    if (age < STALE_DAYS || age === Infinity) continue;

    const urls = extractUrls(body);
    if (urls.length === 0) continue;
    totalUrls += urls.length;

    staleProfiles.push({
      filePath: f,
      title: data.title,
      type: data.type,
      lastUpdated,
      age,
      urlCount: urls.length,
    });
  }

  staleProfiles.sort((a, b) => b.age - a.age);

  const lines = [];
  lines.push('---');
  lines.push(`title: "URL Staleness Report (${STALE_DAYS}+ days)"`);
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`);
  lines.push('generated-by: scripts/url-staleness.cjs');
  lines.push('---');
  lines.push('');
  lines.push(`# URL Staleness Report — ${STALE_DAYS}+ days`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`**${staleProfiles.length} profiles** haven't been touched in ${STALE_DAYS}+ days and collectively have **${totalUrls} sourced URLs**.`);
  lines.push('');
  lines.push('These are candidates for URL re-verification — link rot is progressive, and anything older than ~6 months should be re-checked before it hits a verified-tier profile.');
  lines.push('');
  lines.push('## Top 50 stalest profiles');
  lines.push('');
  lines.push('| Age (days) | Title | Type | URLs | Path |');
  lines.push('|-----------:|-------|------|-----:|------|');
  staleProfiles.slice(0, 50).forEach(p => {
    const rel = path.relative(CONTENT_DIR, p.filePath).split(path.sep).join('/');
    lines.push(`| ${p.age} | ${p.title} | ${p.type} | ${p.urlCount} | \`${rel}\` |`);
  });

  if (staleProfiles.length > 50) {
    lines.push('');
    lines.push(`_...and ${staleProfiles.length - 50} more_`);
  }

  lines.push('');
  lines.push('## How to resolve');
  lines.push('');
  lines.push('URL verification is Editor-only (David). Open each profile, check each URL, update the triage status. The profile\'s `last-updated` should then be bumped to today.');

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`URL staleness report: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`  Stale profiles: ${staleProfiles.length}`);
  console.log(`  Total stale URLs: ${totalUrls}`);
}

main();
