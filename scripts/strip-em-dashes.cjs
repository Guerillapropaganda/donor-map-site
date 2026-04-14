#!/usr/bin/env node
/**
 * strip-em-dashes.cjs — Remove em dashes from profile body text
 *
 * The voice-drift-detector hard-blocks any ready/verified profile with
 * em dashes in the body. This script replaces them mechanically:
 *   - " — " between clauses → ". " (capitalize next word)
 *   - " —" or "— " → ", " or ". " depending on context
 *   - In lists or short fragments → ": "
 *
 * Skips: blockquotes (> lines, real news quotes), auto-blocks
 *        (<!-- auto: -->), code blocks, URLs, and the
 *        content/Vault Maintenance/ archive tree.
 *
 * With --all: processes every profile regardless of content-readiness
 * AND strips em dashes inside frontmatter string values (central-thesis,
 * known-gaps, internal-notes etc).
 *
 * Usage:
 *   node scripts/strip-em-dashes.cjs                    # all ready/verified profiles only
 *   node scripts/strip-em-dashes.cjs --all              # every profile + frontmatter
 *   node scripts/strip-em-dashes.cjs --file=path.md     # single file
 *   node scripts/strip-em-dashes.cjs --dry-run           # preview only
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DRY_RUN = process.argv.includes('--dry-run');
const ALL_MODE = process.argv.includes('--all');
const FILE_ARG = process.argv.find(a => a.startsWith('--file='));
const SINGLE_FILE = FILE_ARG ? FILE_ARG.split('=')[1] : null;

const EM_DASH = '\u2014'; // —

function stripEmDashes(body) {
  const lines = body.split('\n');
  const result = [];

  let inCodeBlock = false;
  let inAutoBlock = false;

  for (const line of lines) {
    // Skip code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }
    if (inCodeBlock) { result.push(line); continue; }

    // Skip auto-blocks
    if (line.includes('<!-- auto:')) { inAutoBlock = true; }
    if (inAutoBlock) {
      if (line.includes('<!-- /auto:') || line.includes('end auto')) inAutoBlock = false;
      result.push(line);
      continue;
    }

    // Blockquotes:
    //   > [!money] / > [!class] / > [!contradiction] etc — OUR analysis,
    //     wrap it as a callout, so strip em dashes.
    //   > "actual quote" — external news/source text, leave alone.
    const trimmed = line.trimStart();
    if (trimmed.startsWith('>')) {
      if (/^>\s*\[!/.test(trimmed)) {
        // Callout line — fall through to the em dash replacement below
      } else {
        result.push(line);
        continue;
      }
    }

    // Skip lines that are just frontmatter markers
    if (line.trim() === '---') { result.push(line); continue; }

    // Replace em dashes
    let fixed = line;

    // Pattern 1: " — " (spaced em dash between clauses)
    // Replace with period + capitalize, or comma for short asides
    fixed = fixed.replace(/ \u2014 /g, (match, offset, str) => {
      // Check what follows — if it's a lowercase word, likely an aside (use comma)
      // If it starts with a capital or number, use period
      const after = str.slice(offset + match.length);
      const nextChar = after[0];
      if (nextChar && nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase()) {
        return '. '; // Already capitalized — use period
      }
      return ', '; // Lowercase follows — use comma
    });

    // Pattern 2: "word— word" or "word —word" (unspaced on one side)
    fixed = fixed.replace(/(\w)\u2014 /g, '$1, ');
    fixed = fixed.replace(/ \u2014(\w)/g, ', $1');

    // Pattern 3: "word—word" (no spaces, tight dash)
    fixed = fixed.replace(/(\w)\u2014(\w)/g, '$1, $2');

    // Pattern 4: any remaining standalone em dashes
    fixed = fixed.replace(/\u2014/g, ', ');

    // Clean up double spaces
    fixed = fixed.replace(/  +/g, ' ');

    // Clean up ", ," or ". ." patterns
    fixed = fixed.replace(/[,.](\s*)[,.]/g, '.$1');

    result.push(fixed);
  }

  return result.join('\n');
}

// Strip em dashes from YAML frontmatter line-by-line while preserving
// structure. Skips internal-notes (pipeline-written logs) and any field
// whose name ends in `-notes` to avoid fighting script-generated content.
// Multiline scalars in those fields are left alone on purpose.
function stripEmDashesInFrontmatter(fm) {
  const lines = fm.split('\n');
  const result = [];
  let skippingMultiline = false; // inside an internal-notes-style value
  for (const line of lines) {
    if (line.trim() === '---' || line.trim() === '') {
      result.push(line);
      continue;
    }
    // Key: value at column 0 starts a new field — reset skip state
    const newKeyMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (newKeyMatch) {
      const key = newKeyMatch[1];
      skippingMultiline = /notes$/i.test(key) || key === 'internal-notes';
      if (skippingMultiline) {
        result.push(line);
        continue;
      }
      result.push(line.replace(/\u2014/g, ', '));
      continue;
    }
    // Continuation of a skipped field
    if (skippingMultiline) {
      result.push(line);
      continue;
    }
    // List items (either "- foo" or "  - foo")
    const listMatch = line.match(/^(\s*-\s+)(.*)$/);
    if (listMatch) {
      result.push(listMatch[1] + listMatch[2].replace(/\u2014/g, ', '));
      continue;
    }
    // Nested key: value (indented)
    const nestedKv = line.match(/^(\s+[A-Za-z0-9_-]+\s*:\s*)(.*)$/);
    if (nestedKv) {
      result.push(nestedKv[1] + nestedKv[2].replace(/\u2014/g, ', '));
      continue;
    }
    // Indented continuation (multiline folded scalar)
    if (/^\s+/.test(line)) {
      result.push(line.replace(/\u2014/g, ', '));
      continue;
    }
    result.push(line);
  }
  // Preserve leading whitespace; only collapse runs of 2+ spaces after content
  return result.join('\n')
    .replace(/([^\n ]) {2,}/g, '$1 ')
    .replace(/,\s*,/g, ',');
}

function processFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');

  // Split frontmatter from body
  const fmMatch = text.match(/^(---\n)([\s\S]*?)(\n---\n)([\s\S]*)$/);
  if (!fmMatch) return { changed: false };

  const fmOpen = fmMatch[1];
  const fmBody = fmMatch[2];
  const fmClose = fmMatch[3];
  const body = fmMatch[4];

  const bodyCount = (body.match(/\u2014/g) || []).length;
  const fmCount = ALL_MODE ? (fmBody.match(/\u2014/g) || []).length : 0;
  const emCount = bodyCount + fmCount;
  if (emCount === 0) return { changed: false, count: 0 };

  const fixedBody = stripEmDashes(body);
  const fixedFm = ALL_MODE ? stripEmDashesInFrontmatter(fmBody) : fmBody;
  const newEmCount = (fixedBody.match(/\u2014/g) || []).length + (fixedFm.match(/\u2014/g) || []).length;

  // Safety: verify the new frontmatter still parses as YAML
  if (ALL_MODE && fixedFm !== fmBody) {
    try { yaml.load(fixedFm); }
    catch (e) {
      return { changed: false, count: 0, yamlBroke: e.message.split('\n')[0], path: filePath };
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, fmOpen + fixedFm + fmClose + fixedBody, 'utf-8');
  }

  return { changed: true, count: emCount, remaining: newEmCount };
}

// ── Main ─────────────────────────────────────────────────────────────────

if (SINGLE_FILE) {
  const result = processFile(SINGLE_FILE);
  if (result.changed) {
    console.log(`${DRY_RUN ? 'Would fix' : 'Fixed'}: ${result.count} em dashes in ${SINGLE_FILE} (${result.remaining} remaining in blockquotes/code)`);
  } else {
    console.log(`No em dashes found in ${SINGLE_FILE}`);
  }
  process.exit(0);
}

// Find all profiles with em dashes
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}  scope: ${ALL_MODE ? 'ALL profiles + frontmatter' : 'ready/verified body only'}`);
console.log('Scanning...\n');

let fixed = 0, totalDashes = 0, yamlBrokeCount = 0;
const yamlBroke = [];
function walk(dir) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      // Skip the Vault Maintenance archive tree — historical content
      if (entry.isDirectory()) {
        if (/Vault Maintenance$/.test(full)) continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.md')) continue;
      const text = fs.readFileSync(full, 'utf-8');
      const fm = text.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;

      if (!ALL_MODE) {
        // Default: only ready/verified profiles
        const readiness = fm[1].match(/^content-readiness:\s*(.+)/m);
        if (!readiness) continue;
        const level = readiness[1].trim().toLowerCase();
        if (level !== 'ready' && level !== 'verified') continue;
      }

      const result = processFile(full);
      if (result.yamlBroke) {
        yamlBrokeCount++;
        yamlBroke.push({ f: result.path, e: result.yamlBroke });
        continue;
      }
      if (result.changed) {
        const shortPath = full.replace(/.*content[\/\\]/, 'content/');
        if (fixed < 30) console.log(`  ${DRY_RUN ? 'WOULD FIX' : 'FIXED'}: ${shortPath} (${result.count} dashes, ${result.remaining} in protected blocks)`);
        if (fixed === 30) console.log('  ... (suppressing further per-file output)');
        fixed++;
        totalDashes += result.count;
      }
    }
  } catch {}
}

walk('content');
console.log(`\n=== Results ===`);
console.log(`Profiles fixed: ${fixed}`);
console.log(`Em dashes removed: ${totalDashes}`);
if (yamlBrokeCount > 0) {
  console.log(`\nYAML broke in ${yamlBrokeCount} file(s) — skipped:`);
  yamlBroke.slice(0, 10).forEach(y => console.log(`  ${y.f} — ${y.e}`));
}
