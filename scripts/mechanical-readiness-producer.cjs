#!/usr/bin/env node
/**
 * mechanical-readiness-producer.cjs
 *
 * Phase 2C of ADR-0029. Walks every profile in the vault, runs the
 * existing reclassify-readiness classification, and:
 *
 *   - If profile's CURRENT state < computed state AND target is one of
 *     {draft, ready}: upsert a candidate to the mechanical-readiness
 *     pipeline class. Tier 1 predicate matches → claude-auto promotion
 *     happens on the next pipeline run.
 *
 *   - If profile is at draft and FAILS one specific gate to reach
 *     ready (e.g. just `noTier1`): record state='stuck' with gap_reasons
 *     so David sees what's blocking. Surface to attention queue with
 *     plain-words "X is one Tier-1 source away from ready."
 *
 *   - If computed state > 'ready' (i.e. data-complete or verified):
 *     STRICT — refuse to propose. David promotes manually past ready.
 *
 * Demotions: not handled here. ADR-0025 / pipeline-janitor owns the
 * mechanical-demote authority for closed-set issue kinds. This producer
 * is promotion-only.
 *
 * Wired into the dispatcher every 30 min.
 *
 * Usage:
 *   node scripts/mechanical-readiness-producer.cjs            # apply
 *   node scripts/mechanical-readiness-producer.cjs --dry-run  # preview
 *   node scripts/mechanical-readiness-producer.cjs --json     # machine
 *   node scripts/mechanical-readiness-producer.cjs --limit 50 # cap scan
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const AS_JSON = args.includes('--json');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || '0', 10) : 0;

// NOTE: we intentionally do NOT require scripts/reclassify-readiness.cjs
// because it self-executes main() on require. Its full classification
// logic includes data-complete + verified gates which we explicitly
// don't want to evaluate here (strict per David's directive). The
// inline classifyForTier1() below covers ONLY the raw → draft and
// draft → ready transitions Claude is allowed to make.

// ─── helpers ───────────────────────────────────────────────────────

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const fm = m[1];
  const data = {};
  const titleM = fm.match(/^title:\s*"?(.*?)"?\s*$/m);
  const typeM = fm.match(/^type:\s*"?(.*?)"?\s*$/m);
  const readinessM = fm.match(/^content-readiness:\s*"?(.*?)"?\s*$/m);
  if (titleM) data.title = titleM[1].trim();
  if (typeM) data.type = typeM[1].trim();
  if (readinessM) data.readiness = readinessM[1].trim();
  return data;
}

const STATE_RANK = { 'raw': 0, 'draft': 1, 'ready': 2, 'data-complete': 3, 'verified': 4 };

function walkContent(callback) {
  const stack = [path.join(ROOT, 'content')];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        // Skip clearly-non-profile dirs to keep the scan fast.
        if (e.name === 'Archive' || e.name === 'Drafts') continue;
        stack.push(full);
      } else if (e.name.endsWith('.md')) {
        callback(full);
      }
    }
  }
}

// Shell out to reclassify-readiness for the classification (single source
// of truth). For each profile, we want both the COMPUTED class and the
// gap reasons if it falls short. The script in batch mode is too coarse;
// inspect classify-result via a wrapper.
//
// Pragmatic path: walk the vault, parse minimal frontmatter, then for
// each profile run a small subprocess against reclassify-readiness's
// internals. To avoid 1700 subprocess starts, we'll do something simpler:
// directly compute promotion targets using the same reclassify-readiness
// rules but inline.
//
// HOWEVER — we must NOT drift from reclassify-readiness's logic. So:
// inline classification will check ONLY the conditions for raw → draft
// and draft → ready (the only Tier-1-allowed promotions), and rely on
// reclassify-readiness for everything else. This is intentional: the
// strict scope keeps the producer mechanically simple AND aligned with
// the rule that data-complete + verified are David's lane.

function classifyForTier1(text, fm) {
  // Returns { target, gap_reasons[] } where target is 'draft', 'ready',
  // or null (no Tier-1-eligible promotion).
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const bodyLength = body.length;
  const tier1Count = (text.match(/\(Tier 1\)/g) || []).length;
  const sourceTypeCount = (text.match(/\(Tier [12]\)/g) || []).length;

  const reasons = [];
  const fromRank = STATE_RANK[fm.readiness || 'raw'];
  if (fromRank === undefined) return { target: null, gap_reasons: ['unknown-current-state'] };

  // raw → draft: trivially "has some content"
  if (fromRank < STATE_RANK.draft) {
    if (bodyLength > 100 || tier1Count >= 1) {
      return { target: 'draft', gap_reasons: [] };
    } else {
      return { target: 'draft', gap_reasons: ['bodyLength<100', 'noTier1'] };
    }
  }

  // draft → ready: body + tier1 + connections + (lastEnriched or any source)
  if (fromRank < STATE_RANK.ready) {
    if (bodyLength <= 500) reasons.push('bodyLength<=500');
    if (tier1Count < 1) reasons.push('noTier1');
    if (sourceTypeCount < 1) reasons.push('noSources');
    // Connections check: look for related/donors/opposes in the
    // raw frontmatter text. The producer doesn't load the librarian —
    // an absence of any of these in frontmatter isn't proof of no
    // connections, but for the producer's sake, we conservatively
    // require at least one to be present non-empty.
    const fmText = (text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/) || [, ''])[1];
    const hasConnFields = /^(related|donors|opposes|top-donors|politicians-funded):\s*\n\s*-/m.test(fmText);
    if (!hasConnFields) reasons.push('noConnections');
    return { target: 'ready', gap_reasons: reasons };
  }

  // Already at ready or higher. STRICT: producer does not propose
  // past ready.
  return { target: null, gap_reasons: [] };
}

// ─── main ──────────────────────────────────────────────────────────

const pipeline = require('./lib/editorial-decision-pipeline.cjs');
require('./classes/index.cjs'); // register all classes including ours

const cls = pipeline.getClass('mechanical-readiness-promotion');
const records = cls.store.loadAll();

const summary = {
  scanned: 0,
  promotion_eligible: 0,
  stuck: 0,
  already_at_or_past_ready: 0,
  errors: 0,
  per_state_seen: {},
  examples_eligible: [],
  examples_stuck: [],
};

const stuckEntries = []; // for attention queue

walkContent((full) => {
  if (LIMIT && summary.scanned >= LIMIT) return;
  let text;
  try { text = fs.readFileSync(full, 'utf-8'); }
  catch { summary.errors++; return; }
  const fm = parseFrontmatter(text);
  if (!fm || !fm.type) return;
  // Skip non-profile types
  const ELIGIBLE_TYPES = new Set(['politician', 'donor', 'corporation', 'think-tank', 'media-profile', 'lobbying-firm']);
  if (!ELIGIBLE_TYPES.has(fm.type)) return;

  summary.scanned++;
  summary.per_state_seen[fm.readiness || '(unset)'] = (summary.per_state_seen[fm.readiness || '(unset)'] || 0) + 1;

  const fromState = fm.readiness || 'raw';
  if (STATE_RANK[fromState] >= STATE_RANK.ready) {
    summary.already_at_or_past_ready++;
    return;
  }

  const { target, gap_reasons } = classifyForTier1(text, fm);
  if (!target) return;

  const relPath = path.relative(ROOT, full).replace(/\\/g, '/');
  const candidate = {
    profile_path: relPath,
    profile_title: fm.title,
    profile_type: fm.type,
    from_state: fromState,
    to_state: target,
    gap_reasons,
  };

  if (gap_reasons.length === 0) {
    summary.promotion_eligible++;
    if (summary.examples_eligible.length < 5) {
      summary.examples_eligible.push({ title: fm.title, from: fromState, to: target });
    }
  } else {
    summary.stuck++;
    if (summary.examples_stuck.length < 5) {
      summary.examples_stuck.push({ title: fm.title, from: fromState, to: target, gap_reasons });
    }
    // Attention-queue surface: only for stuck-on-the-edge cases (1-2 gaps
    // is "almost there", more is just early-stage). And only for promotions
    // toward ready (raw→draft stuck records aren't worth notifying about).
    if (target === 'ready' && gap_reasons.length <= 2) {
      stuckEntries.push({
        bucket: 'compounding',
        what: `${fm.title}: ${gap_reasons.length === 1 ? 'one gap' : `${gap_reasons.length} gaps`} away from ready (${gap_reasons.join(', ')})`,
        why: `Mechanical promotion ${fromState} → ready blocked by: ${gap_reasons.join(', ')}. Adding the missing piece auto-promotes on next pipeline run.`,
        where: relPath,
        cost_min: 5,
        leverage: gap_reasons.length === 1 ? 4 : 2,
        source: 'mechanical-readiness-promotion',
        created: new Date().toISOString().slice(0, 10),
        metadata: { from_state: fromState, to_state: target, gap_reasons },
      });
    }
  }

  if (!DRY) {
    cls.store.upsertCandidate(records, candidate);
  }
});

if (!DRY) {
  cls.store.persistAll(records);
  // Surface stuck entries to attention queue (replaces this producer's
  // entries on each run — that's the addEntries contract).
  if (stuckEntries.length > 0) {
    const queue = require('./lib/attention-queue.cjs');
    queue.addEntries('mechanical-readiness-stuck', stuckEntries);
  }
}

// Run Tier 1 sweep so eligible candidates get promoted in the same pass
// (idempotent: re-runs don't double-promote).
let tier1Result = { skipped: 'dry-run' };
if (!DRY) {
  // Awaitable but called sync via IIFE pattern — async has been the existing
  // pipeline contract. Wrap to print result.
  (async () => {
    try {
      tier1Result = await pipeline.runTier1('mechanical-readiness-promotion');
    } catch (err) {
      tier1Result = { error: err.message };
    }
    summary.tier1 = tier1Result;
    summary.attention_queue_entries = stuckEntries.length;
    if (AS_JSON) console.log(JSON.stringify(summary));
    else printHuman(summary);
  })();
} else {
  summary.tier1 = tier1Result;
  summary.attention_queue_entries_would_write = stuckEntries.length;
  if (AS_JSON) console.log(JSON.stringify(summary));
  else printHuman(summary);
}

function printHuman(s) {
  console.log(`mechanical-readiness-producer (${DRY ? 'DRY-RUN' : 'APPLY'})`);
  console.log(`  scanned: ${s.scanned} profile(s)`);
  console.log(`  per-state seen: ${Object.entries(s.per_state_seen).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`  already at-or-past 'ready': ${s.already_at_or_past_ready}`);
  console.log(`  promotion-eligible (Tier 1 will apply): ${s.promotion_eligible}`);
  if (s.examples_eligible?.length) {
    for (const e of s.examples_eligible) console.log(`    ✓ ${e.title}: ${e.from} → ${e.to}`);
  }
  console.log(`  stuck (gap reasons recorded): ${s.stuck}`);
  if (s.examples_stuck?.length) {
    for (const e of s.examples_stuck) console.log(`    ⏸ ${e.title}: ${e.from} → ${e.to} blocked by [${e.gap_reasons.join(', ')}]`);
  }
  console.log(`  attention queue entries: ${s.attention_queue_entries ?? s.attention_queue_entries_would_write ?? 0}`);
  if (s.tier1 && !DRY) {
    console.log(`  tier1 sweep: ${JSON.stringify(s.tier1)}`);
  }
  if (s.errors) console.log(`  errors: ${s.errors}`);
}
