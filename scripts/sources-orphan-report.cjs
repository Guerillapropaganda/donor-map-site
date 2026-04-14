#!/usr/bin/env node
/**
 * sources-orphan-report.cjs — Phase 1 / Source Registry
 *
 * Reads data/sources.jsonl and emits a human-readable report of
 * problematic sources for editor triage. This is the "some links got
 * in that don't go anywhere" report David asked for.
 *
 * Priority order (worst first):
 *   1. dead            — fetch failed or 4xx/5xx
 *   2. generic_orphan  — generic title + shallow path
 *   3. needs_review    — generic title with depth (ambiguous)
 *   4. redirected      — host changed under us
 *
 * Grouped by entity_ref so David can fix clusters of bad sources on
 * one profile at a time.
 *
 * Output: content/Admin Notes/orphan-citations-report.md
 *
 * Usage:
 *   node scripts/sources-orphan-report.cjs              # default report
 *   node scripts/sources-orphan-report.cjs --all        # include redirected
 *   node scripts/sources-orphan-report.cjs --stdout     # print to stdout
 */

const fs = require('fs');
const path = require('path');
const store = require('./lib/sources-store.cjs');

const argv = process.argv.slice(2);
const INCLUDE_REDIRECTED = argv.includes('--all');
const TO_STDOUT = argv.includes('--stdout');
const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'content',
  'Admin Notes',
  'orphan-citations-report.md'
);

function main() {
  store.loadSources();
  const total = store.countSources();

  const dead = store.querySources({ status: 'dead' });
  const generic = store.querySources({ status: 'generic_orphan' });
  const needsReview = store.querySources({ status: 'needs_review' });
  const redirected = INCLUDE_REDIRECTED ? store.querySources({ status: 'redirected' }) : [];

  const all = [
    ...dead.map((r) => ({ ...r, _severity: 1 })),
    ...generic.map((r) => ({ ...r, _severity: 2 })),
    ...needsReview.map((r) => ({ ...r, _severity: 3 })),
    ...redirected.map((r) => ({ ...r, _severity: 4 })),
  ];

  // Group by entity_ref
  const byEntity = {};
  for (const r of all) {
    const key = r.entity_ref || '(no entity)';
    if (!byEntity[key]) byEntity[key] = [];
    byEntity[key].push(r);
  }
  const entities = Object.keys(byEntity).sort(
    (a, b) => byEntity[b].length - byEntity[a].length
  );

  const lines = [];
  lines.push('---');
  lines.push('title: Orphan Citations Report');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`generator: scripts/sources-orphan-report.cjs`);
  lines.push('---');
  lines.push('');
  lines.push('# Orphan Citations Report');
  lines.push('');
  lines.push('Sources in the registry flagged as problematic by the fingerprint pass. Triage in Ops `/sources` or fix directly in profile bodies.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total sources in registry: **${total}**`);
  lines.push(`- Dead (fetch failed or HTTP 4xx/5xx): **${dead.length}**`);
  lines.push(`- Generic orphan (200 OK but landed on homepage/search): **${generic.length}**`);
  lines.push(`- Needs review (ambiguous title/path combo): **${needsReview.length}**`);
  if (INCLUDE_REDIRECTED) {
    lines.push(`- Redirected (host changed): **${redirected.length}**`);
  }
  lines.push(`- Total flagged: **${all.length}**  (${((all.length / Math.max(total, 1)) * 100).toFixed(1)}% of registry)`);
  lines.push('');
  lines.push('## Triage order');
  lines.push('');
  lines.push('1. **Dead** — hard failures. Fix URL, archive (strikethrough), or replace.');
  lines.push('2. **Generic orphan** — the link "works" but the citation is gone. Usually means the site reorganized and the specific page moved. Look for the current URL or archive.');
  lines.push('3. **Needs review** — generic title but non-shallow path. Could be a genuine page with a bad title tag, or a soft 404. Eyeball check.');
  if (INCLUDE_REDIRECTED) {
    lines.push('4. **Redirected** — host changed. Often fine (www → canonical), sometimes a takeover. Verify new host is legitimate.');
  }
  lines.push('');
  lines.push('## Flagged sources, grouped by entity');
  lines.push('');
  lines.push(`Showing ${entities.length} entities with flagged citations, sorted by count.`);
  lines.push('');

  for (const entity of entities) {
    const list = byEntity[entity].sort((a, b) => a._severity - b._severity);
    lines.push(`### ${entity} (${list.length})`);
    lines.push('');
    for (const r of list) {
      const badge = `[${r.status}]`;
      const title = r.title ? ` "${r.title.slice(0, 80)}"` : '';
      const canonical = r.canonical_url && r.canonical_url !== r.url ? ` → ${r.canonical_url}` : '';
      lines.push(`- ${badge} \`${r.id}\` ${r.url}${canonical}${title}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Regenerate: `node scripts/sources-orphan-report.cjs`*');
  lines.push('');

  const output = lines.join('\n');

  if (TO_STDOUT) {
    console.log(output);
  } else {
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');
    console.log('');
    console.log('═══ orphan report ═══');
    console.log(`  total flagged: ${all.length}`);
    console.log(`    dead:           ${dead.length}`);
    console.log(`    generic_orphan: ${generic.length}`);
    console.log(`    needs_review:   ${needsReview.length}`);
    if (INCLUDE_REDIRECTED) console.log(`    redirected:     ${redirected.length}`);
    console.log(`  entities affected: ${entities.length}`);
    console.log(`  written: ${OUTPUT_PATH}`);
    console.log('');
  }
}

main();
