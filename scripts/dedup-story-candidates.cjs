#!/usr/bin/env node
/**
 * dedup-story-candidates.cjs
 *
 * Tier 1 mechanical dedup of story candidates surfaced by
 * story-pages-integrity-check.cjs (24 duplicates as of 2026-04-30).
 * Authorized by ADR-0029 §10 amendment (cc_p3_209).
 *
 * Algorithm:
 *   1. Group non-published / non-archived stories by
 *      (detector_type, subject, counterparty).
 *   2. For each group with >1 candidate, pick survivor by:
 *      a. highest count parsed from headline (more evidence = better story)
 *      b. tie-break by most recent first_seen (fresh signal)
 *   3. Archive all others, set state=archived with editorial_notes
 *      explaining "superseded by {survivor.id}".
 *
 * No new factual claims; consolidates already-detected pattern matches.
 *
 * Usage:
 *   node scripts/dedup-story-candidates.cjs              # dry-run
 *   node scripts/dedup-story-candidates.cjs --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STORIES = path.join(ROOT, 'data', 'stories.jsonl');
const APPLY = process.argv.includes('--apply');

function dedupKey(story) {
  const subj = (story.linked_entities || []).find((e) => e.role === 'subject')?.ref;
  if (!subj) return null;
  const cp = (story.linked_entities || []).find((e) => e.role === 'counterparty')?.ref || '';
  return `${story.detector_type}|${subj.toLowerCase()}|${cp.toLowerCase()}`;
}

/** Parse the headline for "funds N <type>" or "sponsored N <type>" etc. — we
 *  use the integer N as the evidence-count proxy when no explicit `evidence`
 *  field is on the record. Returns 0 when no number is found. */
function evidenceCount(story) {
  const h = story.headline || '';
  const m = h.match(/\b(\d+)\b/);
  return m ? parseInt(m[1], 10) : 0;
}

function pickSurvivor(group) {
  // 1. Highest evidence count
  // 2. Tie-break by latest first_seen (most recent fresh signal)
  return [...group].sort((a, b) => {
    const dE = evidenceCount(b) - evidenceCount(a);
    if (dE !== 0) return dE;
    const tA = new Date(a.first_seen || 0).getTime();
    const tB = new Date(b.first_seen || 0).getTime();
    return tB - tA;
  })[0];
}

function main() {
  console.log(`[dedup-stories] ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const raw = fs.readFileSync(STORIES, 'utf-8').split('\n');
  const stories = [];
  const lineByIndex = [];
  for (const line of raw) {
    if (!line.trim()) { lineByIndex.push(null); continue; }
    try {
      const s = JSON.parse(line);
      lineByIndex.push(s);
      stories.push(s);
    } catch {
      lineByIndex.push(null);
    }
  }

  const groups = new Map();
  for (const s of stories) {
    if (s.state === 'published' || s.state === 'archived') continue;
    const k = dedupKey(s);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }

  let archivedCount = 0;
  const archivedIds = new Set();
  const samples = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const survivor = pickSurvivor(group);
    for (const s of group) {
      if (s.id === survivor.id) continue;
      archivedIds.add(s.id);
      archivedCount++;
      if (samples.length < 5) {
        samples.push({
          archived: s.id,
          archived_headline: s.headline,
          archived_count: evidenceCount(s),
          survivor: survivor.id,
          survivor_headline: survivor.headline,
          survivor_count: evidenceCount(survivor),
        });
      }
    }
  }

  console.log(`  groups: ${groups.size}`);
  console.log(`  duplicate groups (>1): ${[...groups.values()].filter((g) => g.length > 1).length}`);
  console.log(`  stories to archive: ${archivedCount}`);
  if (samples.length) {
    console.log('\n  sample archives:');
    for (const s of samples) {
      console.log(`    archive ${s.archived} ("${s.archived_headline}", count=${s.archived_count})`);
      console.log(`      → superseded by ${s.survivor} ("${s.survivor_headline}", count=${s.survivor_count})`);
    }
  }

  if (!APPLY) { console.log('\n  rerun with --apply to write changes.'); return; }

  // Identify the survivor IDs by group for the editorial_notes pointer.
  const survivorIdByArchivedId = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const survivor = pickSurvivor(group);
    for (const s of group) if (s.id !== survivor.id) survivorIdByArchivedId.set(s.id, survivor.id);
  }

  // Rewrite stories.jsonl in place. Mutate only the archived rows;
  // every other line stays byte-identical.
  const nowIso = new Date().toISOString();
  const outLines = lineByIndex.map((rec) => {
    if (!rec) return null;
    if (!archivedIds.has(rec.id)) return JSON.stringify(rec);
    rec.state = 'archived';
    const survivor = survivorIdByArchivedId.get(rec.id);
    const reason = `superseded-by:${survivor}`;
    rec.editorial_notes = rec.editorial_notes
      ? `${rec.editorial_notes}\n[${nowIso}] dedup-story-candidates: ${reason}`
      : `[${nowIso}] dedup-story-candidates: ${reason}`;
    rec.last_updated = nowIso;
    rec.integrity_status = 'archived';
    rec.integrity_note = `archived as duplicate of ${survivor} by Tier 1 dedup`;
    rec.integrity_checked_at = nowIso;
    return JSON.stringify(rec);
  });
  // Re-attach the original empty-line / null markers so file shape stays intact.
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].trim() === '') out.push('');
    else out.push(outLines[i] ?? raw[i]);
  }
  fs.writeFileSync(STORIES, out.join('\n'));
  console.log(`\n  wrote ${stories.length} stories (${archivedCount} archived).`);
}

main();
