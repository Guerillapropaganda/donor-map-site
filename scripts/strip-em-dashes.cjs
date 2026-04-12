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
 * Skips: frontmatter, blockquotes (> lines), auto-blocks (<!-- auto: -->),
 *        code blocks, and URLs.
 *
 * Usage:
 *   node scripts/strip-em-dashes.cjs                    # all ready/verified profiles
 *   node scripts/strip-em-dashes.cjs --file=path.md     # single file
 *   node scripts/strip-em-dashes.cjs --dry-run           # preview only
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DRY_RUN = process.argv.includes('--dry-run');
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

    // Skip blockquotes
    if (line.trimStart().startsWith('>')) { result.push(line); continue; }

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

function processFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');

  // Split frontmatter from body
  const fmMatch = text.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!fmMatch) return { changed: false };

  const frontmatter = fmMatch[1];
  const body = fmMatch[2];

  const emCount = (body.match(/\u2014/g) || []).length;
  if (emCount === 0) return { changed: false, count: 0 };

  const fixedBody = stripEmDashes(body);
  const newEmCount = (fixedBody.match(/\u2014/g) || []).length;

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, frontmatter + fixedBody, 'utf-8');
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

// Find all ready/verified profiles with em dashes
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log('Scanning for ready/verified profiles with em dashes...\n');

let fixed = 0, totalDashes = 0;
function walk(dir) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.md')) {
        const text = fs.readFileSync(full, 'utf-8');
        const fm = text.match(/^---\n([\s\S]*?)\n---/);
        if (!fm) continue;

        // Only process ready/verified profiles
        const readiness = fm[1].match(/^content-readiness:\s*(.+)/m);
        if (!readiness) continue;
        const level = readiness[1].trim().toLowerCase();
        if (level !== 'ready' && level !== 'verified') continue;

        const result = processFile(full);
        if (result.changed) {
          const shortPath = full.replace(/.*content[\/\\]/, 'content/');
          console.log(`  ${DRY_RUN ? 'WOULD FIX' : 'FIXED'}: ${shortPath} (${result.count} dashes, ${result.remaining} in protected blocks)`);
          fixed++;
          totalDashes += result.count;
        }
      }
    }
  } catch {}
}

walk('content');
console.log(`\n=== Results ===`);
console.log(`Profiles fixed: ${fixed}`);
console.log(`Em dashes removed: ${totalDashes}`);
