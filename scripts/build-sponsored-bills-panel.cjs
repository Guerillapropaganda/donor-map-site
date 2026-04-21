#!/usr/bin/env node
/**
 * build-sponsored-bills-panel.cjs
 *
 * Injects an "auto:sponsored-bills" auto-block into every politician
 * profile with a bioguide-id. Panel shows:
 *
 *   - total bills sponsored (number) + total enacted (number)
 *   - top 5 enacted laws (title · PL number · date)
 *   - up to 5 most-recent pending-or-failed sponsorships (title · date · policy area)
 *   - editorial-pinned bills first (via frontmatter `key_bills:`)
 *   - link to full list: /ask/?q=bills+sponsored+by+{bioguide}
 *
 * Reads:
 *   data/bills.jsonl — structured bill records from ingest-bill-status-bulk.cjs
 *   content/Politicians/** profiles (for bioguide-id + key_bills frontmatter)
 *
 * Writes:
 *   auto-block into each politician profile (idempotent, between markers)
 *
 * Usage:
 *   node scripts/build-sponsored-bills-panel.cjs            # dry-run
 *   node scripts/build-sponsored-bills-panel.cjs --write    # apply
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const BILLS = path.join(ROOT, 'data', 'bills.jsonl');
const PROFILES = path.join(ROOT, 'content', 'Politicians');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

const BLOCK_START = '<!-- auto:sponsored-bills start -->';
const BLOCK_END = '<!-- auto:sponsored-bills end -->';

function walkMd(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function main() {
  console.log(`[build-sponsored-bills-panel] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  if (!fs.existsSync(BILLS)) { console.error('Missing data/bills.jsonl. Run ingest-bill-status-bulk.cjs --write first.'); process.exit(1); }

  // Load bills, build bioguide → sponsored-bills index.
  console.log('  loading bills...');
  const bySponsor = new Map();
  const billsById = new Map();
  let totalBills = 0;
  for (const line of fs.readFileSync(BILLS, 'utf-8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let b;
    try { b = JSON.parse(line); } catch { continue; }
    totalBills++;
    billsById.set(b.id, b);
    for (const bg of b.sponsor_bioguides || []) {
      if (!bySponsor.has(bg)) bySponsor.set(bg, []);
      bySponsor.get(bg).push(b);
    }
  }
  console.log(`  bills indexed: ${totalBills.toLocaleString()}, unique sponsors: ${bySponsor.size.toLocaleString()}`);

  // Walk profiles
  const files = walkMd(PROFILES);
  let scanned = 0, injected = 0, noBio = 0, noBills = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    let frontmatter;
    try { frontmatter = yaml.load(fm[1]) || {}; } catch { continue; }
    if (frontmatter.type !== 'politician') continue;
    scanned++;
    const bio = frontmatter['bioguide-id'] || frontmatter.bioguide;
    if (!bio) { noBio++; continue; }
    const bills = bySponsor.get(bio);
    if (!bills || bills.length === 0) { noBills++; continue; }

    // Bucket by enacted vs. not.
    const enacted = bills.filter((b) => b.became_law).sort((a, b) => String(b.approved_date || b.introduced_date || '').localeCompare(String(a.approved_date || a.introduced_date || '')));
    const pending = bills.filter((b) => !b.became_law).sort((a, b) => String(b.introduced_date || '').localeCompare(String(a.introduced_date || '')));

    // Editorial pins (frontmatter key_bills: list of bill IDs).
    const pinned = [];
    if (Array.isArray(frontmatter.key_bills)) {
      for (const bid of frontmatter.key_bills) {
        const b = billsById.get(bid);
        if (b && bills.includes(b)) pinned.push(b);
      }
    }
    const pinnedIds = new Set(pinned.map((b) => b.id));
    const topEnacted = [...pinned.filter((b) => b.became_law), ...enacted.filter((b) => !pinnedIds.has(b.id))].slice(0, 5);
    const topPending = [...pinned.filter((b) => !b.became_law), ...pending.filter((b) => !pinnedIds.has(b.id))].slice(0, 5);

    // Policy-area distribution (for summary line)
    const policyCounts = new Map();
    for (const b of bills) if (b.policy_area) policyCounts.set(b.policy_area, (policyCounts.get(b.policy_area) || 0) + 1);
    const topPolicies = [...policyCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p);

    // Render panel
    const lines = [''];
    lines.push(`*Bills sponsored in the 108th–119th Congress, from GovInfo Bill Status bulk data. ${pinned.length > 0 ? `${pinned.length} editorially pinned (via \`key_bills\` frontmatter).` : 'Ranked by enactment + recency.'}*`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|---|---:|');
    lines.push(`| Total sponsored | ${bills.length.toLocaleString()} |`);
    lines.push(`| Enacted into law | ${enacted.length.toLocaleString()} |`);
    if (topPolicies.length > 0) lines.push(`| Top policy areas | ${topPolicies.join(' · ')} |`);
    lines.push('');

    if (topEnacted.length > 0) {
      lines.push('**Enacted laws (top 5):**');
      lines.push('');
      lines.push('| PL # | Date | Bill | Title |');
      lines.push('|---|---|---|---|');
      for (const b of topEnacted) {
        const title = (b.title || '').replace(/\|/g, '\\|').slice(0, 90);
        const plcell = b.public_law_number ? `PL ${b.public_law_number}` : '—';
        lines.push(`| ${plcell} | ${b.approved_date || b.introduced_date || '—'} | ${b.id} | ${title} |`);
      }
      lines.push('');
    }

    if (topPending.length > 0) {
      lines.push(`**Recent sponsored bills${topEnacted.length > 0 ? ' (non-enacted, top 5)' : ''}:**`);
      lines.push('');
      lines.push('| Introduced | Bill | Policy area | Title |');
      lines.push('|---|---|---|---|');
      for (const b of topPending) {
        const title = (b.title || '').replace(/\|/g, '\\|').slice(0, 90);
        lines.push(`| ${b.introduced_date || '—'} | ${b.id} | ${b.policy_area || '—'} | ${title} |`);
      }
      lines.push('');
    }

    lines.push(`*Full list: query Ask with* \`subject: bills, sponsor_bioguide: ${bio}\` *· Source: GovInfo Bill Status XML bulk.*`);

    const panelMd = lines.join('\n');
    const blockRe = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
    const newBlock = `${BLOCK_START}\n${panelMd}\n${BLOCK_END}`;
    let newText;
    if (blockRe.test(text)) newText = text.replace(blockRe, newBlock);
    else {
      // Place after auto:voting-record end, or auto:fec-lifetime end, or EOF.
      const after = text.includes('<!-- auto:voting-record end -->')
        ? '<!-- auto:voting-record end -->'
        : text.includes('<!-- auto:fec-lifetime end -->')
        ? '<!-- auto:fec-lifetime end -->'
        : null;
      if (after) newText = text.replace(after, after + '\n\n' + newBlock);
      else newText = text + '\n\n' + newBlock + '\n';
    }
    if (newText === text) continue;

    if (!WRITE) { if (VERBOSE) console.log(`  [would inject] ${frontmatter.title || path.basename(file)}: ${bills.length} bills, ${enacted.length} enacted`); injected++; continue; }
    fs.writeFileSync(file, newText);
    injected++;
  }

  console.log(`\nResults: scanned=${scanned}, ${WRITE ? 'injected' : 'would-inject'}=${injected}, no-bioguide=${noBio}, no-bills=${noBills}`);
  if (!WRITE) console.log('Dry-run. Use --write to apply.');
}
main();
