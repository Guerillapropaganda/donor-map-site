#!/usr/bin/env node
/**
 * build-executive-actions-panel.cjs
 *
 * Injects an "auto:executive-actions" auto-block into president
 * profiles (vault chamber=Presidential). Panel shows:
 *
 *   - total EOs / proclamations / directives signed
 *   - top 5 EOs (editor-pinned via frontmatter key_eos, else most-recent)
 *   - top 3 most-recent proclamations
 *   - link to full list: /ask subject=executive_actions, president={name}
 *
 * Reads:
 *   data/executive-actions.jsonl — structured records from
 *   ingest-federal-register-eos.cjs
 *
 * Frontmatter pinning:
 *   key_eos: [EO-14134, EO-14147]   # EO ids
 *
 * Usage:
 *   node scripts/build-executive-actions-panel.cjs
 *   node scripts/build-executive-actions-panel.cjs --write
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const EA_FILE = path.join(ROOT, 'data', 'executive-actions.jsonl');
const PROFILES = path.join(ROOT, 'content', 'Politicians');
const WRITE = process.argv.includes('--write');

const BLOCK_START = '<!-- auto:executive-actions start -->';
const BLOCK_END = '<!-- auto:executive-actions end -->';

// Title → president-field value used in executive-actions.jsonl.
// presidentForDate() in the ingester wrote "Clinton" / "G.W. Bush" /
// "Obama" / "Trump" / "Biden" based on signing date.
const TITLE_TO_PRESIDENT = {
  'Bill Clinton': 'Clinton',
  'George W. Bush': 'G.W. Bush',
  'George W Bush': 'G.W. Bush',
  'Barack Obama': 'Obama',
  'Donald Trump': 'Trump',
  'Joe Biden': 'Biden',
};

function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function main() {
  console.log(`[build-executive-actions-panel] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  if (!fs.existsSync(EA_FILE)) { console.error('Missing data/executive-actions.jsonl'); process.exit(1); }

  // Load + bucket by president.
  const byPresident = new Map();
  const byId = new Map();
  for (const line of fs.readFileSync(EA_FILE, 'utf-8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    if (!r.president) continue;
    if (!byPresident.has(r.president)) byPresident.set(r.president, []);
    byPresident.get(r.president).push(r);
    if (r.id) byId.set(r.id, r);
  }
  console.log(`  executive actions by president:`);
  for (const [p, recs] of byPresident) console.log(`    ${p}: ${recs.length.toLocaleString()}`);

  // Walk president profiles.
  const files = walkMd(PROFILES);
  let scanned = 0, injected = 0, unmatched = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    let frontmatter;
    try { frontmatter = yaml.load(fm[1]) || {}; } catch { continue; }
    if (frontmatter.type !== 'politician') continue;
    if (frontmatter.chamber !== 'Presidential') continue;
    scanned++;
    const title = frontmatter.title;
    const presKey = TITLE_TO_PRESIDENT[title];
    if (!presKey) { unmatched++; continue; }
    const recs = byPresident.get(presKey) || [];
    if (recs.length === 0) { unmatched++; continue; }

    const eos = recs.filter((r) => r.type === 'executive-order').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const procs = recs.filter((r) => r.type === 'proclamation').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const dirs = recs.filter((r) => r.type === 'directive').sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Editorial pins.
    const pinned = [];
    if (Array.isArray(frontmatter.key_eos)) {
      for (const id of frontmatter.key_eos) {
        const r = byId.get(id);
        if (r && r.president === presKey) pinned.push(r);
      }
    }
    const pinnedIds = new Set(pinned.map((r) => r.id));
    const topEos = [...pinned.filter((r) => r.type === 'executive-order'), ...eos.filter((r) => !pinnedIds.has(r.id))].slice(0, 5);
    const topProcs = procs.slice(0, 3);

    const lines = [''];
    lines.push(`*Presidential actions signed during ${presKey}'s tenure, from the GovInfo Federal Register bulk data. ${pinned.length > 0 ? `${pinned.length} editorially pinned (via \`key_eos\` frontmatter).` : 'Ranked by recency.'}*`);
    lines.push('');
    lines.push('| Category | Count |');
    lines.push('|---|---:|');
    lines.push(`| Executive Orders | ${eos.length.toLocaleString()} |`);
    lines.push(`| Proclamations | ${procs.length.toLocaleString()} |`);
    lines.push(`| Directives / memoranda | ${dirs.length.toLocaleString()} |`);
    lines.push(`| **Total** | **${recs.length.toLocaleString()}** |`);
    lines.push('');

    if (topEos.length > 0) {
      lines.push(`**${pinned.length > 0 ? 'Signature' : 'Most-recent'} Executive Orders${pinned.length === 0 ? ' (top 5)' : ''}:**`);
      lines.push('');
      lines.push('| EO # | Date | Title |');
      lines.push('|---|---|---|');
      for (const r of topEos) {
        const title = (r.title || '').replace(/\|/g, '\\|').slice(0, 120);
        lines.push(`| ${r.number || '—'} | ${r.date || '—'} | ${title} |`);
      }
      lines.push('');
    }

    if (topProcs.length > 0) {
      lines.push('**Most-recent Proclamations (top 3):**');
      lines.push('');
      lines.push('| Proc # | Date | Title |');
      lines.push('|---|---|---|');
      for (const r of topProcs) {
        const title = (r.title || '').replace(/\|/g, '\\|').slice(0, 120);
        lines.push(`| ${r.number || '—'} | ${r.date || '—'} | ${title} |`);
      }
      lines.push('');
    }

    lines.push(`*Full list: query Ask with* \`subject: executive_actions, president: ${presKey}\` *· Source: GovInfo Federal Register bulk (FRMergedXML).*`);

    const panelMd = lines.join('\n');
    const blockRe = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
    const newBlock = `${BLOCK_START}\n${panelMd}\n${BLOCK_END}`;
    let newText;
    if (blockRe.test(text)) newText = text.replace(blockRe, newBlock);
    else {
      // Insert after voting-record end, or sponsored-bills end, or EOF
      const after = text.includes('<!-- auto:sponsored-bills end -->')
        ? '<!-- auto:sponsored-bills end -->'
        : text.includes('<!-- auto:voting-record end -->')
        ? '<!-- auto:voting-record end -->'
        : null;
      if (after) newText = text.replace(after, after + '\n\n' + newBlock);
      else newText = text + '\n\n' + newBlock + '\n';
    }
    if (newText === text) continue;
    if (!WRITE) { injected++; continue; }
    fs.writeFileSync(file, newText);
    injected++;
  }

  console.log(`\nResults: scanned=${scanned} presidents, ${WRITE ? 'injected' : 'would-inject'}=${injected}, unmatched=${unmatched}`);
  if (!WRITE) console.log('Dry-run. Use --write to apply.');
}
main();
