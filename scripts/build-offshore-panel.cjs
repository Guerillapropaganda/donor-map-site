#!/usr/bin/env node
/**
 * build-offshore-panel.cjs
 *
 * Injects an "auto:offshore-records" auto-block into any vault profile
 * (corporation / donor / politician) that appears in the ICIJ Offshore
 * Leaks Database (Panama / Paradise / Pandora / Offshore / Bahamas).
 *
 * Principle: DESCRIPTIVE, not judgment-laden. We show the raw fact
 * ("Apple is listed as the linked vault entity for 17 records in the
 * ICIJ leaks, across Panama Papers + Paradise Papers + Offshore Leaks")
 * and link to the source. No "exposure" badge, no risk score.
 *
 * Appearing in these files does NOT imply wrongdoing — many are
 * legitimate foreign subsidiaries, advisory relationships, or pre-
 * existing corporate structures predating the leaks. The journalism
 * value is that the public can now cross-reference who shows up where.
 *
 * Reads: data/offshore-entities.jsonl
 * Writes: auto-block into matched vault profiles.
 *
 * Usage:
 *   node scripts/build-offshore-panel.cjs
 *   node scripts/build-offshore-panel.cjs --write
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const OFFSHORE = path.join(ROOT, 'data', 'offshore-entities.jsonl');
const CONTENT = path.join(ROOT, 'content');
const WRITE = process.argv.includes('--write');

const BLOCK_START = '<!-- auto:offshore-records start -->';
const BLOCK_END = '<!-- auto:offshore-records end -->';

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
  console.log(`[build-offshore-panel] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  if (!fs.existsSync(OFFSHORE)) { console.error('Missing data/offshore-entities.jsonl'); process.exit(1); }

  // Load offshore records, build vault-name → [records] index.
  const byVaultEntity = new Map();
  for (const line of fs.readFileSync(OFFSHORE, 'utf-8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    for (const v of r.linked_vault_entities || []) {
      if (!byVaultEntity.has(v)) byVaultEntity.set(v, []);
      byVaultEntity.get(v).push(r);
    }
  }
  console.log(`  offshore records loaded: ${byVaultEntity.size} vault entities linked`);

  // Walk profiles
  const files = walkMd(CONTENT);
  let scanned = 0, injected = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    let frontmatter;
    try { frontmatter = yaml.load(fm[1]) || {}; } catch { continue; }
    const title = frontmatter.title;
    if (!title) continue;
    const recs = byVaultEntity.get(title);
    if (!recs || recs.length === 0) continue;
    scanned++;

    // Summarize leak sources.
    const bySource = new Map();
    const byJurisdiction = new Map();
    for (const r of recs) {
      const s = r.sourceID || 'ICIJ';
      bySource.set(s, (bySource.get(s) || 0) + 1);
      if (r.jurisdiction) byJurisdiction.set(r.jurisdiction, (byJurisdiction.get(r.jurisdiction) || 0) + 1);
    }
    const topLeaks = [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topJurisdictions = [...byJurisdiction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const lines = [''];
    lines.push('*This entity appears in the ICIJ Offshore Leaks Database. Appearing in these files does not imply wrongdoing — records cover legitimate foreign subsidiaries, advisory relationships, and pre-existing corporate structures. Cross-reference with context.*');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|---|---:|');
    lines.push(`| Records linked | ${recs.length} |`);
    lines.push(`| Leak sources | ${topLeaks.map(([s, n]) => `${s} (${n})`).join(' · ')} |`);
    if (topJurisdictions.length > 0) lines.push(`| Top jurisdictions | ${topJurisdictions.map(([j, n]) => `${j} (${n})`).join(' · ')} |`);
    lines.push('');
    lines.push('**Example linked entities:**');
    lines.push('');
    lines.push('| Name | Kind | Jurisdiction | Leak |');
    lines.push('|---|---|---|---|');
    for (const r of recs.slice(0, 5)) {
      const name = (r.name || '').replace(/\|/g, '\\|').slice(0, 80);
      lines.push(`| ${name} | ${r.kind || '—'} | ${r.jurisdiction || '—'} | ${r.sourceID || 'ICIJ'} |`);
    }
    lines.push('');
    lines.push(`*Full list: query Ask with* \`subject: offshore_entities, linked_vault_entity: ${title}\` *· Source: [ICIJ Offshore Leaks Database](https://offshoreleaks.icij.org/) · [ICIJ methodology](https://www.icij.org/about/).*`);

    const panelMd = lines.join('\n');
    const blockRe = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
    const newBlock = `${BLOCK_START}\n${panelMd}\n${BLOCK_END}`;
    let newText;
    if (blockRe.test(text)) newText = text.replace(blockRe, newBlock);
    else {
      // Append before Sources section, or at EOF
      if (text.match(/\n## Sources\b/i)) {
        newText = text.replace(/\n## Sources\b/i, '\n\n' + newBlock + '\n\n## Sources');
      } else newText = text + '\n\n' + newBlock + '\n';
    }
    if (newText === text) continue;
    if (!WRITE) { injected++; continue; }
    fs.writeFileSync(file, newText);
    injected++;
  }

  console.log(`\nResults: scanned=${scanned}, ${WRITE ? 'injected' : 'would-inject'}=${injected}`);
  if (!WRITE) console.log('Dry-run. Use --write to apply.');
}
main();
