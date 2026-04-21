#!/usr/bin/env node
/**
 * backfill-bioguide-ids.cjs
 *
 * Scans content/Politicians/** for profiles missing `bioguide-id` in
 * frontmatter, matches them against data/legislator-registry.jsonl on
 * first+last name (lowercase), and writes the bioguide-id into the
 * frontmatter YAML if exactly one match is found.
 *
 * Why: ex-legislators who moved to Cabinet/VP/Governor folders (Kamala
 * Harris, Obama, DeSantis, MTG, Stefanik, Pompeo, Noem, …) often had
 * their bioguide-id stripped when the profile was relocated, which
 * broke /api/ask voting_record lookups for them.
 *
 * Usage:
 *   node scripts/backfill-bioguide-ids.cjs           # dry-run, prints plan
 *   node scripts/backfill-bioguide-ids.cjs --apply   # actually write
 */
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const REG_PATH = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const POL_DIR = path.join(ROOT, 'content', 'Politicians');

// Only consider legislators who served in the modern era. Without this,
// common names like "Stephen Miller" (an 1831 SC senator) or "John Kelly"
// (an 1857 NY rep) match 19th-century ghosts and get wrongly attached
// to modern Cabinet / advisor profiles. Cutoff: last term ended after 1970.
const MODERN_TERM_CUTOFF = '1970-01-01';

function loadRegistry() {
  const out = new Map();
  const text = fs.readFileSync(REG_PATH, 'utf-8');
  for (const line of text.split(/\n/)) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const end = r.current_term && r.current_term.end;
    if (!end || end < MODERN_TERM_CUTOFF) continue;
    const k = `${(r.name_first || '').toLowerCase()} ${(r.name_last || '').toLowerCase()}`.trim();
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
}

function walk(dir, hits) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, hits);
    else if (e.name.endsWith('.md')) hits.push(f);
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return { raw: m[1], end: m[0].length };
}

function main() {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} (pass --apply to write)\n`);
  const reg = loadRegistry();
  const files = [];
  walk(POL_DIR, files);

  const matches = [], ambiguous = [];
  let skipped = 0;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf-8');
    const fm = parseFrontmatter(text);
    if (!fm) continue;
    if (!/\btype:\s*politician/i.test(fm.raw)) continue;
    if (/\bbioguide-id:\s*["']?[A-Z0-9]+/.test(fm.raw)) { skipped++; continue; }
    const titleMatch = fm.raw.match(/^title:\s*["']?([^"'\n]+?)["']?\s*$/m);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    const parts = title.toLowerCase().split(/\s+/);
    if (parts.length < 2) continue;
    const key = `${parts[0]} ${parts[parts.length - 1]}`;
    let cands = reg.get(key) || [];
    // Middle-name disambiguation: if the profile title has a middle token
    // (e.g. "George W. Bush", "Marjorie Taylor Greene"), require the
    // candidate's middle name to share the first letter. This prevents
    // "George W. Bush" (son, never in Congress) from matching G.H.W. Bush.
    if (parts.length >= 3 && cands.length > 0) {
      const mid = parts[1].replace(/\./g, '');
      const midInitial = mid.charAt(0);
      const filtered = cands.filter(c => {
        const cm = (c.name_middle || '').toLowerCase();
        return cm && cm.charAt(0) === midInitial;
      });
      // If filtering leaves zero, the title's middle doesn't match any
      // registry candidate — that's a real mismatch, skip.
      cands = filtered;
    }
    if (cands.length === 1) matches.push({ title, bio: cands[0].bioguide, f, text, fm });
    else if (cands.length > 1) ambiguous.push({ title, cands, f });
  }

  console.log(`politicians with bioguide-id already: ${skipped}`);
  console.log(`EXACT matches to backfill:            ${matches.length}`);
  console.log(`AMBIGUOUS (manual pick needed):       ${ambiguous.length}\n`);

  for (const m of matches) console.log(`  ${m.bio}  ←  ${m.title}`);
  if (ambiguous.length) {
    console.log('\nAMBIGUOUS:');
    for (const a of ambiguous) {
      const opts = a.cands.map(c => `${c.bioguide} (${c.current_term.state || '?'} ${c.current_term.start || ''}-${c.current_term.end || ''})`).join(' | ');
      console.log(`  ${a.title}  →  ${opts}`);
    }
  }

  if (!APPLY) { console.log('\n(dry-run — no files written)'); return; }

  let written = 0;
  for (const m of matches) {
    // Insert `bioguide-id: <ID>` after the `title:` line to keep a
    // readable top-of-frontmatter ordering. If a type line exists,
    // insert right after type instead.
    const insertAfter = m.fm.raw.match(/^type:[^\n]+/m) ? /^(type:[^\n]+\n)/m : /^(title:[^\n]+\n)/m;
    const newFm = m.fm.raw.replace(insertAfter, `$1bioguide-id: ${m.bio}\n`);
    const newText = `---\n${newFm}\n---\n` + m.text.slice(m.fm.end);
    fs.writeFileSync(m.f, newText, 'utf-8');
    written++;
  }
  console.log(`\nwrote bioguide-id to ${written} profile(s)`);
}

main();
