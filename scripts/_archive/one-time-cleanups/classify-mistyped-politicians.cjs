#!/usr/bin/env node
/**
 * classify-mistyped-politicians.cjs — Split the 52 non-master profiles
 * currently typed `politician` into three categories for manual review:
 *
 *   1. REAL_POLITICIAN — flat-file politician profile, filename matches a
 *      human name (usually the last path segment). Keep type: politician.
 *
 *   2. SUB_NOTE — filename is a descriptive story/event title, not a
 *      human name. Lives under a politician directory but is actually
 *      a narrative sub-note. Should be type: sub-note or type: story.
 *
 *   3. MAYBE_STATE — flat-file politician profile but known to be a
 *      state-level politician. Should be type: state-politician.
 *
 * Uses filename heuristics + a small hardcoded list of known state
 * politicians. Not fully automated — outputs a report for David to
 * review before any changes.
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

// Known state-level politicians (state assembly/senate, governors, lt gov, etc.)
// Added manually based on inspection of the 52-file list.
const KNOWN_STATE_POLITICIANS = new Set([
  'Anthony Rendon',    // Former CA State Assembly Speaker
  'Ash Kalra',         // CA State Assembly
  'Buffy Wicks',       // CA State Assembly
  'Kathy Hochul',      // NY Governor
  'Brian Kemp',        // GA Governor
]);

// Known international politicians (not federal US, not state US)
const KNOWN_INTERNATIONAL = new Set([
  'Bezalel Smotrich',
  'Itamar Ben-Gvir',
  'Volodymyr Zelenskyy',
]);

// Heuristic: does a filename look like a human personal name, or a story title?
// Human names: 1-4 words, mostly capitalized, no punctuation except hyphens/apostrophes
// Story titles: longer, often contain words like "The", "and", "—", verbs, etc.
function looksLikeHumanName(filename) {
  const base = path.basename(filename, '.md').replace(/^_/, '').replace(/\s+Master Profile$/i, '');
  // Strip suffix markers
  const words = base.split(/\s+/);

  // Story indicators — if present, this is probably a story/sub-note
  const storyWords = ['The', 'And', 'a', 'an', 'or', 'of', 'for', 'from', 'with', 'to', 'by', 'in', 'on', '—', '-', 'vs', 'Who', 'How', 'Why', 'What', 'Where', 'When'];
  const lowerWords = base.toLowerCase().split(/\s+/);
  const hasStoryWord = lowerWords.some(w => storyWords.includes(w));
  if (hasStoryWord) return false;

  // Too many words = probably a title, not a name
  if (words.length > 5) return false;

  // Contains a hyphen between words (not in a name like "Cortez-Masto")? Could go either way.
  // If contains " - " (spaced dash), probably a title
  if (base.includes(' - ')) return false;

  // Otherwise assume it's a name
  return true;
}

const files = walk('content/Politicians');
const real = [];
const subNote = [];
const maybeState = [];
const international = [];

for (const f of files) {
  const base = path.basename(f, '.md');
  // Skip canonical master profiles
  if (/^_.*Master Profile$/.test(base)) continue;

  const c = fs.readFileSync(f, 'utf-8');
  const fm = c.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) continue;
  const typeMatch = fm[1].match(/^type:\s*"?([^"\n]+?)"?\s*$/m);
  if (!typeMatch) continue;
  const type = typeMatch[1].trim();
  if (type !== 'politician') continue;

  const titleMatch = fm[1].match(/^title:\s*"?([^"\n]+?)"?\s*$/m);
  const title = titleMatch ? titleMatch[1].replace(/\s+Master Profile$/i, '') : base;
  const rel = path.relative('content', f).split(path.sep).join('/');

  if (KNOWN_STATE_POLITICIANS.has(title)) {
    maybeState.push({ title, rel });
  } else if (KNOWN_INTERNATIONAL.has(title)) {
    international.push({ title, rel });
  } else if (looksLikeHumanName(base)) {
    real.push({ title, rel });
  } else {
    subNote.push({ title, rel });
  }
}

console.log(`\n=== REAL politicians (${real.length}) — flat file, keep type: politician ===`);
real.forEach(m => console.log(`  ${m.title.padEnd(40)} ${m.rel}`));

console.log(`\n=== LIKELY SUB-NOTES / STORIES (${subNote.length}) — need type change to sub-note/story ===`);
subNote.forEach(m => console.log(`  ${m.title.padEnd(60)} ${m.rel}`));

console.log(`\n=== STATE POLITICIANS (${maybeState.length}) — need type: state-politician ===`);
maybeState.forEach(m => console.log(`  ${m.title.padEnd(40)} ${m.rel}`));

console.log(`\n=== INTERNATIONAL (${international.length}) — defer for now ===`);
international.forEach(m => console.log(`  ${m.title.padEnd(40)} ${m.rel}`));

console.log(`\nTotal: ${real.length + subNote.length + maybeState.length + international.length}`);
