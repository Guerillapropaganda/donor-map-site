#!/usr/bin/env node
/**
 * librarian-gap-propose.cjs
 *
 * Editorial review pipeline for librarian-gap-audit findings.
 *
 * The librarian-gap-audit reports 350+ wikilink names that don't resolve
 * to any librarian Node. Many of those are aliases — "ADM" should resolve
 * to "ADM - Archer Daniels Midland", "Hillary Clinton" should resolve to
 * "Hillary Rodham Clinton", etc. The audit already computes Levenshtein-
 * close candidates per gap (the `similar` array). What's missing:
 *
 *   1. A canonical store of editorial DECISIONS so the same names don't
 *      re-surface every audit cycle.
 *   2. A way to apply approved aliases to entities.jsonl in batch.
 *   3. A review-friendly markdown digest David can edit in Obsidian.
 *
 * This script is all three.
 *
 * MODES:
 *   --report                 Read latest audit, upsert candidates into
 *                            data/librarian-gap-decisions.jsonl. New
 *                            findings get state=candidate; existing rows
 *                            preserve their editorial decision fields.
 *
 *   --review-list            Write a markdown digest at
 *                            content/Admin Notes/librarian-gap-review.md
 *                            grouped by gap_class, ranked by appearances.
 *                            David reviews + updates the YAML decisions
 *                            block at the top, then runs --apply-decisions
 *                            to persist his choices into the store.
 *
 *   --apply-decisions        Read content/Admin Notes/librarian-gap-review.md,
 *                            parse the YAML decisions block, persist into
 *                            the canonical store. (Editor's chosen
 *                            approved-alias / rejected / needs-research
 *                            states land here.)
 *
 *   --apply-approved         For every approved-alias record, write the
 *                            alias to entities.jsonl[target].aliases.
 *                            Marks each record state=resolved with
 *                            resolved_at timestamp. Routes through the
 *                            editorial-decision-pipeline so decided_by
 *                            provenance + change_log are recorded.
 *
 *   --tier1                  ADR-0029 Tier 1 auto-apply. Runs the class
 *                            tier1_predicate over candidates and applies
 *                            high-confidence merges with decided_by=
 *                            claude-auto. Tightened predicate as of
 *                            2026-04-28: normalized-string-equality only
 *                            (covers "Amgen Inc" vs "AMGEN INC.", does
 *                            NOT cover edit-distance neighbors that
 *                            could be different people).
 *
 *   --stats                  Print state distribution + top-N pending.
 *
 * Token tier: SMALL ($) — pure data ops, no LLM.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const store = require('./lib/librarian-gap-decisions-store.cjs');
const pipeline = require('./lib/editorial-decision-pipeline.cjs');
require('./classes/index.cjs');  // self-registers librarian-gap-aliases

const ROOT = path.resolve(__dirname, '..');
const ENTITIES_PATH = path.join(ROOT, 'data', 'entities.jsonl');
const REVIEW_LIST_PATH = path.join(ROOT, 'content', 'Admin Notes', 'librarian-gap-review.md');

const args = process.argv.slice(2);
const mode =
  args.find((a) => a.startsWith('--')) || '--stats';

// ─── helpers ─────────────────────────────────────────────────────────

function loadEntities() {
  return fs
    .readFileSync(ENTITIES_PATH, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function persistEntities(entities) {
  const tmp = ENTITIES_PATH + '.tmp';
  const lines = entities.map((e) => JSON.stringify(e));
  fs.writeFileSync(tmp, lines.join('\n') + '\n', 'utf-8');
  fs.renameSync(tmp, ENTITIES_PATH);
}

function runGapAudit() {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/librarian-gap-audit.cjs'), '--json'],
    { cwd: ROOT, maxBuffer: 200 * 1024 * 1024, encoding: 'utf-8' }
  );
  if (result.status !== 0 && !result.stdout) {
    throw new Error(`gap audit failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

// ─── --report ───────────────────────────────────────────────────────

function modeReport() {
  console.log('--- librarian-gap-propose --report ---\n');
  const audit = runGapAudit();
  const records = store.loadAll();

  // The audit groups findings under by_class. We harvest the top entries
  // from each meaningful gap class. alias-candidate is the bulk class but
  // it's mostly low-appearance noise; we filter to ≥2 appearances for
  // signal. unresolvable + node-isolated + fec-committee-suspect we take
  // all of (they're already small).
  const targetClasses = ['unresolvable', 'node-isolated', 'fec-committee-suspect', 'alias-candidate'];

  let surfaced = 0;
  let created = 0;
  let updated = 0;

  for (const cls of targetClasses) {
    const bucket = audit.by_class?.[cls];
    if (!bucket || !bucket.top) continue;
    for (const finding of bucket.top) {
      // alias-candidate: only surface if appearances ≥ 2 (low-appearance
      // candidates are mostly editorial typos; high-leverage = rises).
      if (cls === 'alias-candidate' && finding.appearances < 2) continue;

      surfaced++;
      const { status } = store.upsertCandidate(records, {
        name: finding.name,
        gap_class: cls,
        appearances: finding.appearances,
        by_field: finding.by_field,
        sample_profiles: finding.sample_profiles,
        similar: finding.similar,
      });
      if (status === 'created') created++;
      else updated++;
    }
  }

  store.persistAll(records);
  console.log(`  surfaced from audit: ${surfaced}`);
  console.log(`  store: +${created} new, ${updated} refreshed`);
  console.log(`  total in store: ${records.length}`);
  const byState = {};
  for (const r of records) byState[r.state] = (byState[r.state] || 0) + 1;
  console.log(`  by state:`, byState);
  console.log(`\n  next: node scripts/librarian-gap-propose.cjs --review-list`);
}

// ─── --review-list ──────────────────────────────────────────────────

function modeReviewList() {
  console.log('--- librarian-gap-propose --review-list ---\n');
  const records = store.loadAll();
  const candidates = records.filter((r) => r.state === 'candidate');
  const byClass = {};
  for (const r of candidates) {
    if (!byClass[r.gap_class]) byClass[r.gap_class] = [];
    byClass[r.gap_class].push(r);
  }
  for (const arr of Object.values(byClass)) {
    arr.sort((a, b) => b.appearances - a.appearances);
  }

  const lines = [];
  lines.push('---');
  lines.push('title: Librarian Gap Review');
  lines.push('type: editorial-review');
  lines.push('last-generated: ' + new Date().toISOString());
  lines.push('how-to-use: |');
  lines.push('  Each candidate has a "decision:" line. Set to one of:');
  lines.push('    approved-alias: <canonical entity name>');
  lines.push('    rejected: <one-line reason>');
  lines.push('    needs-research:');
  lines.push('  Save. Then run:');
  lines.push('    node scripts/librarian-gap-propose.cjs --apply-decisions');
  lines.push('    node scripts/librarian-gap-propose.cjs --apply-approved');
  lines.push('---');
  lines.push('');
  lines.push('# Librarian Gap Review');
  lines.push('');
  lines.push(`Total candidates: ${candidates.length}`);
  lines.push('');
  lines.push('Edit the YAML `decisions:` block below, then run --apply-decisions.');
  lines.push('');
  lines.push('```yaml');
  lines.push('decisions:');

  for (const cls of ['unresolvable', 'node-isolated', 'fec-committee-suspect', 'alias-candidate']) {
    const items = byClass[cls] || [];
    if (items.length === 0) continue;
    lines.push(`  # ─── ${cls.toUpperCase()} (${items.length}) ───────────────────────────`);
    for (const r of items.slice(0, 50)) { // top 50 per class
      const fieldHint = Object.keys(r.by_field || {}).join(',');
      const samples = (r.sample_profiles || []).slice(0, 2).map((p) => path.basename(p, '.md')).join(' / ');
      const sims = (r.similar || []).slice(0, 3).map((s) => `"${s.name}" (d=${s.distance})`).join(', ');
      lines.push(`  - id: ${r.id}`);
      lines.push(`    name: ${JSON.stringify(r.name)}`);
      lines.push(`    appearances: ${r.appearances}    # in field(s): ${fieldHint}`);
      if (samples) lines.push(`    sample_profiles: "${samples}"`);
      if (sims) lines.push(`    similar: [ ${sims} ]`);
      lines.push(`    decision:                       # approved-alias: <target> | rejected: <reason> | needs-research:`);
      lines.push('');
    }
  }
  lines.push('```');
  lines.push('');

  fs.writeFileSync(REVIEW_LIST_PATH, lines.join('\n'), 'utf-8');
  console.log(`  wrote: ${path.relative(ROOT, REVIEW_LIST_PATH)}`);
  console.log(`  candidates listed: ${candidates.length}`);
  console.log(`  by class:`);
  for (const cls of Object.keys(byClass)) console.log(`    ${cls}: ${byClass[cls].length}`);
  console.log(`\n  next: edit the file, set decision: lines, then --apply-decisions`);
}

// ─── --apply-decisions ──────────────────────────────────────────────

function modeApplyDecisions() {
  console.log('--- librarian-gap-propose --apply-decisions ---\n');
  if (!fs.existsSync(REVIEW_LIST_PATH)) {
    console.error(`  ✗ review file missing: ${REVIEW_LIST_PATH}`);
    process.exit(1);
  }
  const text = fs.readFileSync(REVIEW_LIST_PATH, 'utf-8');
  // Extract everything between ```yaml and ``` markers; we only care
  // about lines inside that block.
  const m = text.match(/```yaml\s*\n([\s\S]*?)\n```/);
  if (!m) {
    console.error('  ✗ no ```yaml decisions block found');
    process.exit(1);
  }
  const block = m[1];

  // Hand-rolled tiny parser. We don't pull in js-yaml here because the
  // shape is rigid (id + decision pairs); easier to be lenient about
  // trailing comments and indentation.
  const records = store.loadAll();
  const byId = new Map(records.map((r) => [r.id, r]));

  const idLineRe = /^\s+-\s+id:\s+(\S+)/;
  const decisionLineRe = /^\s+decision:\s*(.*?)(?:#.*)?$/;

  const lines = block.split(/\r?\n/);
  let currentId = null;
  let applied = 0;
  let unchanged = 0;

  for (const ln of lines) {
    const idM = ln.match(idLineRe);
    if (idM) { currentId = idM[1]; continue; }
    const decM = ln.match(decisionLineRe);
    if (!decM) continue;
    const raw = decM[1].trim();
    if (!raw) continue;

    const rec = byId.get(currentId);
    if (!rec) {
      console.warn(`  ⚠ unknown id: ${currentId} — skipping`);
      continue;
    }
    if (rec.state !== 'candidate') {
      // Already decided in a previous run; only re-apply if the new
      // decision differs from current state. For now we leave it.
      unchanged++;
      continue;
    }

    if (raw.startsWith('approved-alias:')) {
      const target = raw.slice('approved-alias:'.length).trim();
      if (!target) {
        console.warn(`  ⚠ ${currentId} approved-alias missing target — skipping`);
        continue;
      }
      pipeline.transition('librarian-gap-aliases', records, currentId, 'approved-alias', {
        decided_by: 'claude-batch-approved',  // David batch-approved through the review file
        payload: { approved_alias_target: target },
        note: 'from review-list YAML decisions block',
      });
      applied++;
    } else if (raw.startsWith('rejected:')) {
      const reason = raw.slice('rejected:'.length).trim() || '(no reason)';
      pipeline.transition('librarian-gap-aliases', records, currentId, 'rejected', {
        decided_by: 'claude-batch-approved',
        payload: { rejected_reason: reason },
        note: 'from review-list YAML decisions block',
      });
      applied++;
    } else if (raw.startsWith('needs-research')) {
      pipeline.transition('librarian-gap-aliases', records, currentId, 'needs-research', {
        decided_by: 'claude-batch-approved',
        note: 'from review-list YAML decisions block',
      });
      applied++;
    } else {
      console.warn(`  ⚠ ${currentId} unknown decision: "${raw}" — skipping`);
    }
  }

  store.persistAll(records);
  console.log(`  applied: ${applied} editorial decision(s)`);
  console.log(`  unchanged (already decided): ${unchanged}`);
  const byState = {};
  for (const r of records) byState[r.state] = (byState[r.state] || 0) + 1;
  console.log(`  by state:`, byState);
  console.log(`\n  next: node scripts/librarian-gap-propose.cjs --apply-approved`);
}

// ─── --apply-approved ───────────────────────────────────────────────

async function modeApplyApproved() {
  console.log('--- librarian-gap-propose --apply-approved ---\n');
  // Routes through the editorial-decision-pipeline so the class's writer
  // (scripts/classes/librarian-gap-aliases.cjs) handles the entities.jsonl
  // mutation. The pipeline records provenance + change_log on every
  // record. decided_by stays whatever set the approve state (typically
  // claude-batch-approved from --apply-decisions, or claude-auto from
  // --tier1).
  const result = await pipeline.applyApproved('librarian-gap-aliases');
  console.log(`  applied: ${result.applied} | skipped: ${result.skipped} | errors: ${result.errors.length}`);
  if (result.errors.length > 0) {
    for (const e of result.errors.slice(0, 5)) console.log(`    ✗ ${e.id}: ${e.error}`);
  }
  if (result.applied > 0) {
    console.log('');
    console.log('  Next steps to propagate the new aliases:');
    console.log('    node scripts/build-relationships-per-profile.cjs');
    console.log('    node scripts/build-profile-data-panels.cjs --write');
  }
}

// ─── --tier1 ────────────────────────────────────────────────────────

async function modeTier1() {
  console.log('--- librarian-gap-propose --tier1 ---\n');
  // ADR-0029 Tier 1 auto-apply. Predicate is normalized-string-equality
  // only — covers formatting/case variants, blocks edit-distance neighbors
  // that could be different people.
  const result = await pipeline.runTier1('librarian-gap-aliases');
  if (result.skipped === 'pipeline-frozen') {
    console.log('  ⏸ pipeline frozen — skipping Tier 1 auto-apply');
    console.log(`     frozen_at: ${result.frozen_at}`);
    console.log(`     frozen_by: ${result.frozen_by}`);
    console.log(`     reason: ${result.reason}`);
    console.log('');
    console.log('  Lift via: node scripts/editorial-pipeline-freeze.cjs --clear --reason "<note>"');
    return;
  }
  if (result.skipped) {
    console.log(`  skipped: ${result.skipped}`);
    return;
  }
  console.log(`  candidates seen: ${result.candidates_seen}`);
  console.log(`  matched predicate: ${result.matched}`);
  console.log(`  transitioned to approve-state: ${result.transitioned_to_approve}`);
  console.log(`  writer applied (entities.jsonl): ${result.writer_applied}`);
  console.log(`  errors: ${result.errors}`);
  if (result.writer_applied > 0) {
    console.log('');
    console.log('  Next steps to propagate the new aliases:');
    console.log('    node scripts/build-relationships-per-profile.cjs');
    console.log('    node scripts/build-profile-data-panels.cjs --write');
  }
}

// ─── --stats ────────────────────────────────────────────────────────

function modeStats() {
  const records = store.loadAll();
  const byState = {};
  for (const r of records) byState[r.state] = (byState[r.state] || 0) + 1;
  console.log('Librarian gap decisions store:');
  console.log(`  total: ${records.length}`);
  for (const [s, n] of Object.entries(byState).sort()) {
    console.log(`  ${s}: ${n}`);
  }
  const candidates = records.filter((r) => r.state === 'candidate');
  if (candidates.length > 0) {
    console.log('\nTop 10 by appearances:');
    [...candidates]
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 10)
      .forEach((c) => {
        const sim = c.similar?.[0] ? `→ "${c.similar[0].name}" (d=${c.similar[0].distance})` : '';
        console.log(`  ${c.appearances}x  ${c.name}  ${sim}`);
      });
  }
}

// ─── dispatch ───────────────────────────────────────────────────────

(async () => {
  switch (mode) {
    case '--report':           modeReport(); break;
    case '--review-list':      modeReviewList(); break;
    case '--apply-decisions':  modeApplyDecisions(); break;
    case '--apply-approved':   await modeApplyApproved(); break;
    case '--tier1':            await modeTier1(); break;
    case '--stats':            modeStats(); break;
    default:
      console.error(`Unknown mode: ${mode}`);
      console.error('Usage: --report | --review-list | --apply-decisions | --apply-approved | --tier1 | --stats');
      process.exit(1);
  }
})();
