#!/usr/bin/env node
/**
 * find-mistyped-politicians.cjs — detect profiles that have type: politician
 * but aren't actually politician master profiles.
 *
 * The canonical politician profile is always `_Name Master Profile.md` inside
 * a politician directory. Anything else nested under content/Politicians/ that
 * has type: politician is mis-typed (probably a sub-note or story that should
 * have type: sub-note or type: story).
 *
 * These mis-typed profiles show up in the Ops app grid with the "POLITICIAN"
 * badge and get audited by the checklist as if they were politicians — which
 * is why David sees stories listed as "needing pipeline enrichment" at ready.
 *
 * Usage: node scripts/find-mistyped-politicians.cjs
 */
const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.obsidian'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (e.name.endsWith('.md')) files.push(full);
  }
  return files;
}

const files = walk('content/Politicians');
const mistyped = [];

for (const f of files) {
  const base = path.basename(f, '.md');
  // Skip canonical master profiles (_Name Master Profile.md)
  if (/^_.*Master Profile$/.test(base)) continue;
  // Skip files at top-level of a politician dir (they're usually the master)
  // Actually keep them — if they have type: politician but aren't a master, they're suspect

  const c = fs.readFileSync(f, 'utf-8');
  const fm = c.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) continue;
  const typeMatch = fm[1].match(/^type:\s*"?([^"\n]+?)"?\s*$/m);
  if (!typeMatch) continue;
  const type = typeMatch[1].trim();
  if (type !== 'politician') continue;

  const titleMatch = fm[1].match(/^title:\s*"?([^"\n]+?)"?\s*$/m);
  const title = titleMatch ? titleMatch[1] : base;
  const rel = path.relative('content', f).split(path.sep).join('/');
  mistyped.push({ title, rel, base });
}

console.log(`Found ${mistyped.length} non-master files with type: politician`);
console.log('');
if (mistyped.length > 0) {
  console.log('First 30:');
  for (const m of mistyped.slice(0, 30)) {
    console.log(`  ${m.title.padEnd(50)} ${m.rel}`);
  }
  if (mistyped.length > 30) console.log(`  ... and ${mistyped.length - 30} more`);
}
