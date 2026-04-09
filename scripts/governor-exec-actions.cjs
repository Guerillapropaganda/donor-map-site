/**
 * governor-exec-actions.cjs — Governor Executive Actions Pipeline
 *
 * Scrapes executive orders from state governor websites.
 * Each state has a different format — this handles the states we track.
 *
 * Supported states:
 *   - California (gov.ca.gov RSS feed)
 *   - New York (governor.ny.gov/executiveorders)
 *   - Florida (flgov.com — HTML scrape)
 *   - Texas (gov.texas.gov — via Legislative Reference Library)
 *
 * Usage:
 *   node scripts/governor-exec-actions.cjs                        # dry run (all governors)
 *   node scripts/governor-exec-actions.cjs --write                # write to vault
 *   node scripts/governor-exec-actions.cjs --state=CA             # just California
 *   node scripts/governor-exec-actions.cjs --profile="Gavin Newsom" --write
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter, httpGet, writeReport, log, logError } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const STATE_FLAG = process.argv.find(a => a.startsWith('--state='));
const STATE_FILTER = STATE_FLAG ? STATE_FLAG.split('=')[1].toUpperCase() : null;
const PROFILE_FLAG = process.argv.find(a => a.startsWith('--profile='));
const PROFILE_FILTER = PROFILE_FLAG ? PROFILE_FLAG.split('=')[1].replace(/"/g, '') : null;

// ─── State Scrapers ───────────────────────────────────────────

async function fetchCaliforniaEOs() {
  log('  Fetching California executive orders (RSS)...');
  try {
    const res = await httpGet('https://www.gov.ca.gov/category/executive-orders/feed/');
    const xml = res.data;

    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]>/)||item.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]>/s)||item.match(/<description>(.*?)<\/description>/s))?.[1] || '';

      if (title && link) {
        items.push({
          title: title.replace(/<[^>]+>/g, '').trim(),
          url: link.trim(),
          date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : '',
          summary: desc.replace(/<[^>]+>/g, '').trim().slice(0, 200),
        });
      }
    }

    log(`  Found ${items.length} California executive orders`);
    return items;
  } catch (e) {
    logError(`California RSS failed: ${e.message}`);
    return [];
  }
}

async function fetchNewYorkEOs() {
  log('  Fetching New York executive orders...');
  try {
    const res = await httpGet('https://www.governor.ny.gov/executiveorders');
    const html = res.data;

    const items = [];
    // NY page has structured list items with EO numbers and titles
    const eoRegex = /href="(\/executive-order\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = eoRegex.exec(html)) !== null) {
      items.push({
        title: match[2].trim(),
        url: `https://www.governor.ny.gov${match[1]}`,
        date: '',
        summary: '',
      });
    }

    log(`  Found ${items.length} New York executive orders`);
    return items;
  } catch (e) {
    logError(`New York scrape failed: ${e.message}`);
    return [];
  }
}

async function fetchFloridaEOs() {
  log('  Fetching Florida executive orders...');
  try {
    const res = await httpGet('https://www.flgov.com/eog/news/executive-orders');
    const html = res.data;

    const items = [];
    // FL page has links to individual EOs
    const eoRegex = /href="([^"]*executive-order[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = eoRegex.exec(html)) !== null) {
      const url = match[1].startsWith('http') ? match[1] : `https://www.flgov.com${match[1]}`;
      items.push({
        title: match[2].trim(),
        url,
        date: '',
        summary: '',
      });
    }

    log(`  Found ${items.length} Florida executive orders`);
    return items;
  } catch (e) {
    logError(`Florida scrape failed: ${e.message}`);
    return [];
  }
}

async function fetchTexasEOs() {
  log('  Fetching Texas executive orders (Legislative Reference Library)...');
  try {
    const res = await httpGet('https://lrl.texas.gov/legeLeaders/governors/searchproc.cfm?govdoctypeID=5&governorID=45');
    const html = res.data;

    const items = [];
    // TX LRL has a structured table of EOs
    const eoRegex = /href="([^"]*govdocs_govorders[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = eoRegex.exec(html)) !== null) {
      const url = match[1].startsWith('http') ? match[1] : `https://lrl.texas.gov${match[1]}`;
      items.push({
        title: match[2].trim(),
        url,
        date: '',
        summary: '',
      });
    }

    log(`  Found ${items.length} Texas executive orders`);
    return items;
  } catch (e) {
    logError(`Texas scrape failed: ${e.message}`);
    return [];
  }
}

// ─── Governor Config ──────────────────────────────────────────

const GOVERNORS = [
  { name: 'Gavin Newsom', state: 'CA', fetcher: fetchCaliforniaEOs, profilePattern: /Gavin Newsom/ },
  { name: 'Kathy Hochul', state: 'NY', fetcher: fetchNewYorkEOs, profilePattern: /Kathy Hochul/ },
  { name: 'Ron DeSantis', state: 'FL', fetcher: fetchFloridaEOs, profilePattern: /Ron DeSantis/ },
  { name: 'Greg Abbott', state: 'TX', fetcher: fetchTexasEOs, profilePattern: /Greg Abbott/ },
];

// ─── Write to Vault ───────────────────────────────────────────

function findProfile(governor) {
  const files = walkDir(CONTENT_DIR);
  for (const f of files) {
    if (governor.profilePattern.test(path.basename(f)) && f.includes('Master Profile')) {
      return f;
    }
  }
  return null;
}

function writeExecActions(profilePath, items, governor) {
  const content = fs.readFileSync(profilePath, 'utf8');
  const { data } = parseFrontmatter(content);

  // Build the auto-block
  const blockName = 'governor-exec-actions';
  const startTag = `<!-- auto:${blockName} start -->`;
  const endTag = `<!-- auto:${blockName} end -->`;

  const lines = [
    startTag,
    `### Executive Actions (${governor.state})`,
    '',
    `| # | Title | Date | Link |`,
    `|---|-------|------|------|`,
  ];

  for (let i = 0; i < Math.min(items.length, 50); i++) {
    const item = items[i];
    const title = item.title.length > 80 ? item.title.slice(0, 77) + '...' : item.title;
    lines.push(`| ${i + 1} | ${title} | ${item.date || 'N/A'} | [Link](${item.url}) |`);
  }

  if (items.length > 50) {
    lines.push(``, `_Showing 50 of ${items.length} executive actions_`);
  }

  lines.push('', `- [Source: ${governor.state} Governor's Office](${items[0]?.url || '#'}) (Tier 1)`);
  lines.push(endTag);

  const block = lines.join('\n');

  // Replace existing block or append before Sources section
  let newContent;
  const blockRegex = new RegExp(`${startTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

  if (blockRegex.test(content)) {
    newContent = content.replace(blockRegex, block);
  } else {
    // Insert before ## Sources or at end
    const sourcesIdx = content.indexOf('## Sources');
    if (sourcesIdx > 0) {
      newContent = content.slice(0, sourcesIdx) + block + '\n\n' + content.slice(sourcesIdx);
    } else {
      newContent = content + '\n\n' + block + '\n';
    }
  }

  // Update frontmatter
  const now = new Date().toISOString().split('T')[0];
  if (!newContent.includes('executive-actions:')) {
    // Add count to frontmatter
    newContent = newContent.replace(/^(---\r?\n[\s\S]*?)(---)/m, `$1executive-actions: ${items.length}\nlast-enriched: "${now}"\n$2`);
  } else {
    newContent = newContent.replace(/executive-actions:\s*\d+/, `executive-actions: ${items.length}`);
    newContent = newContent.replace(/last-enriched:\s*"?\d{4}-\d{2}-\d{2}"?/, `last-enriched: "${now}"`);
  }

  fs.writeFileSync(profilePath, newContent, 'utf8');
  return items.length;
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('Governor Executive Actions Pipeline');
  console.log(`Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  if (STATE_FILTER) console.log(`State filter: ${STATE_FILTER}`);
  if (PROFILE_FILTER) console.log(`Profile filter: ${PROFILE_FILTER}`);
  console.log('');

  const results = [];

  for (const governor of GOVERNORS) {
    if (STATE_FILTER && governor.state !== STATE_FILTER) continue;
    if (PROFILE_FILTER && !governor.name.includes(PROFILE_FILTER)) continue;

    console.log(`\n── ${governor.name} (${governor.state}) ──`);

    const items = await governor.fetcher();

    if (items.length === 0) {
      results.push({ governor: governor.name, state: governor.state, count: 0, status: 'no-data' });
      continue;
    }

    const profilePath = findProfile(governor);
    if (!profilePath) {
      console.log(`  Profile not found for ${governor.name}`);
      results.push({ governor: governor.name, state: governor.state, count: items.length, status: 'no-profile' });
      continue;
    }

    console.log(`  Profile: ${path.relative(CONTENT_DIR, profilePath)}`);
    console.log(`  Found: ${items.length} executive actions`);

    if (items.length > 0) {
      console.log(`  Latest: ${items[0].title}`);
    }

    if (WRITE) {
      const written = writeExecActions(profilePath, items, governor);
      console.log(`  Wrote ${written} actions to profile`);
      results.push({ governor: governor.name, state: governor.state, count: written, status: 'written' });
    } else {
      results.push({ governor: governor.name, state: governor.state, count: items.length, status: 'dry-run' });
    }
  }

  // Report
  console.log('\n\n═══ Summary ═══');
  for (const r of results) {
    console.log(`  ${r.governor} (${r.state}): ${r.count} actions — ${r.status}`);
  }

  const jsonData = { results, scannedAt: new Date().toISOString() };
  const md = [
    '# Governor Executive Actions Report',
    `_Generated: ${new Date().toISOString().split('T')[0]}_`,
    '',
    '| Governor | State | Actions | Status |',
    '|----------|-------|---------|--------|',
    ...results.map(r => `| ${r.governor} | ${r.state} | ${r.count} | ${r.status} |`),
  ].join('\n');

  writeReport('governor-exec-actions', jsonData, md);
}

main().catch(console.error);
