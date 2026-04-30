#!/usr/bin/env node
/**
 * fix-votes-jsonl-result-corruption.cjs
 *
 * Surfaced by audit-thesis-data-vs-sources.cjs (cc_p3_206) — 4.0% of
 * data/votes.jsonl records (949 of 24,023, all Senate) carry a corrupted
 * `result` field that captured XML markup beyond the canonical
 * `<vote_result>` tag content. Pattern:
 *
 *   "Nomination Confirmed (58-35)</vote_result_text>
 *     <question>On the Nomination</question>
 *     <vote_title>...</vote_title>
 *     <majority_requirement>1/2</majority_requirement>
 *     <vote_result>Nomination Confirmed"
 *
 * The corruption pre-dates the current ingest-congress-votes.cjs regex
 * (which extracts <vote_result> cleanly when run fresh — confirmed by
 * spot-test against senate.gov source XML). Treating it as a one-shot
 * data repair: extract the trailing clean string after the LAST
 * `<vote_result>` opening tag, which is the canonical vote_result tag
 * content per the senate.gov XML schema.
 *
 * Falls back to the prefix-before-parentheses if no embedded
 * `<vote_result>` is found (defensive — the prefix already carries the
 * canonical result text, just with the parenthesized vote count appended).
 *
 * Usage:
 *   node scripts/fix-votes-jsonl-result-corruption.cjs            # dry-run
 *   node scripts/fix-votes-jsonl-result-corruption.cjs --apply    # write
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VOTES = path.join(ROOT, 'data', 'votes.jsonl');
const APPLY = process.argv.includes('--apply');

function cleanResult(corrupted) {
  if (!corrupted || typeof corrupted !== 'string') return corrupted;
  // Detect corruption markers
  const hasMarker = corrupted.includes('</vote_result_text>') || corrupted.includes('<vote_result>') || corrupted.length > 80;
  if (!hasMarker) return corrupted;

  // Strategy 1: extract content after the LAST <vote_result> opening tag.
  // The corrupted suffix invariably ends with "<vote_result>{clean text}"
  // (the regex stopped before the matching </vote_result>).
  const after = corrupted.lastIndexOf('<vote_result>');
  if (after >= 0) {
    const tail = corrupted.slice(after + '<vote_result>'.length).trim();
    if (tail.length > 0 && tail.length < 80) return tail;
  }

  // Strategy 2: take the prefix before the parenthesized vote count.
  // "Nomination Confirmed (58-35)..." → "Nomination Confirmed"
  const parenIdx = corrupted.indexOf(' (');
  if (parenIdx > 0 && parenIdx < 80) {
    return corrupted.slice(0, parenIdx).trim();
  }

  // Strategy 3: take the prefix before the first XML tag.
  const tagIdx = corrupted.indexOf('<');
  if (tagIdx > 0 && tagIdx < 80) {
    return corrupted.slice(0, tagIdx).trim();
  }

  return corrupted; // Give up — surface as inconclusive.
}

function main() {
  console.log(`[fix-votes-result-corruption] ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  if (!fs.existsSync(VOTES)) { console.error(`Missing: ${VOTES}`); process.exit(1); }

  const lines = fs.readFileSync(VOTES, 'utf-8').split('\n');
  let total = 0, fixed = 0, unchanged = 0, gaveUp = 0;
  const out = [];
  const samples = [];
  for (const line of lines) {
    if (!line.trim()) { out.push(line); continue; }
    total++;
    let v;
    try { v = JSON.parse(line); } catch { out.push(line); continue; }
    const before = v.result;
    const after = cleanResult(before);
    if (after !== before) {
      v.result = after;
      fixed++;
      if (samples.length < 5) samples.push({ id: v.vote_id, before: before?.slice(0, 50), after });
    } else if (before && (before.includes('<vote_result') || before.length > 80)) {
      gaveUp++;
    } else {
      unchanged++;
    }
    out.push(JSON.stringify(v));
  }

  console.log(`  total: ${total.toLocaleString()}`);
  console.log(`  fixed: ${fixed.toLocaleString()}`);
  console.log(`  gave up (still corrupted): ${gaveUp.toLocaleString()}`);
  console.log(`  unchanged (clean): ${unchanged.toLocaleString()}`);
  console.log('\n  sample fixes:');
  for (const s of samples) console.log(`    ${s.id}: "${s.before}" → "${s.after}"`);

  if (!APPLY) {
    console.log('\n  rerun with --apply to write changes.');
    return;
  }
  fs.writeFileSync(VOTES, out.join('\n'));
  console.log(`\n  wrote ${out.length} lines to ${VOTES}`);
}
main();
