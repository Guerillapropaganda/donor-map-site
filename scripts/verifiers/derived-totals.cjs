/**
 * derived-totals.cjs — tier 1 checker.
 *
 * Confirms that rendered "top X" tables in profile auto-panels agree
 * with the underlying edge data. The Leo profile bug we hit:
 *
 *   Frontmatter:    politicians-funded: "[[Gorsuch]], [[Thomas]], ..."
 *   Auto-panel:     | Politician | Amount |
 *                   | Gorsuch    | —      |     ← empty because no direct edge exists
 *                   | Thomas     | —      |
 *
 * The panel is querying direct edges only, but Leo's giving runs
 * through controlled vehicles (MFT, 85 Fund), so the edges don't
 * exist at that grain. The table is self-inconsistent: it lists
 * names it implicitly promised to quantify, then fails to quantify
 * them.
 *
 * Rule: any auto:data-panel table with ≥3 rows where ≥50% of the
 * amount cells are "—" is flagged. This catches the empty-table bug
 * without false-positives on donors who genuinely have 1-2 untracked
 * recipients.
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('../lib/entities-store.cjs');
const { finding } = require('./_framework.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

async function run(opts = {}) {
  const findings = [];
  const entityFilter = opts.entities ? new Set(opts.entities) : null;
  const ents = loadEntities();
  const byPath = new Map();
  for (const e of ents) if (e.profile_path) byPath.set(e.profile_path, e);

  const mdFiles = walkMd(path.join(ROOT, 'content'));
  for (const file of mdFiles) {
    const profileName = path.basename(file, '.md').replace(/^_/, '').replace(/ Master Profile$/, '');
    if (entityFilter && !entityFilter.has(profileName)) continue;
    const text = fs.readFileSync(file, 'utf-8');
    const panelMatch = text.match(/<!-- auto:data-panel start -->([\s\S]*?)<!-- auto:data-panel end -->/);
    if (!panelMatch) continue;
    const panel = panelMatch[1];

    // Find each markdown table in the panel and check it.
    const tableBlocks = [...panel.matchAll(/\|[^\n]+\|\n\|[\s:|-]+\|\n((?:\|[^\n]+\|\n)+)/g)];
    for (const tb of tableBlocks) {
      const headerLine = panel.slice(Math.max(0, tb.index - 200), tb.index).split('\n').filter(Boolean).pop() || '';
      const body = tb[1];
      const rows = body.trim().split('\n').filter((r) => r.trim().startsWith('|'));
      if (rows.length < 3) continue;
      // Extract amount column (last column) from each row.
      const amounts = rows.map((r) => {
        const cells = r.split('|').map((c) => c.trim()).filter(Boolean);
        return cells[cells.length - 1];
      });
      const emptyCount = amounts.filter((a) => a === '—' || a === '-' || a === '' || a === 'N/A').length;
      if (emptyCount / amounts.length >= 0.5) {
        findings.push(finding({
          severity: 'warn',
          entity: profileName,
          metric: 'derived-panel',
          internal: `${emptyCount}/${amounts.length} rows empty`,
          cause: 'empty-derived-table',
          detail: `auto:data-panel table (${rows.length} rows, "${headerLine.trim()}") has ${emptyCount}/${amounts.length} empty amount cells — rendering logic can't resolve amounts from the edge store, likely needs multi-hop walk via controlled vehicles`,
        }));
      }
    }

    // Check for same-amount repeated rows (the Schwab $154M twice bug)
    for (const section of (text.match(/\*\*Support:\*\*[^\n]+/g) || [])) {
      const entries = section.split(',').map((s) => s.trim());
      const seen = new Map();
      for (const e of entries) {
        seen.set(e, (seen.get(e) || 0) + 1);
      }
      for (const [entry, count] of seen) {
        if (count >= 2 && /\$[\d.]+[MBK]/.test(entry)) {
          findings.push(finding({
            severity: 'warn',
            entity: profileName,
            metric: 'support-row-dup',
            internal: count,
            cause: 'support-dup',
            detail: `"${entry}" appears ${count}× in a Support row — likely duplicate edge or double-render bug`,
          }));
        }
      }
    }
  }

  return findings;
}

function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(full));
    else if (ent.name.endsWith('.md')) out.push(full);
  }
  return out;
}

module.exports = {
  name: 'derived-totals',
  tier: 1,
  description: 'Auto-panel tables with mostly-empty amount columns and duplicated support entries',
  run,
};
