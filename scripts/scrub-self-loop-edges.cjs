#!/usr/bin/env node
/**
 * scrub-self-loop-edges.cjs
 *
 * One-time cleanup: removes all edges where from === to from
 * data/relationships.jsonl and every per-source file in data/derived/.
 *
 * Why these exist: prior to the 2026-04-25 self-loop guard added to
 * scripts/lib/relationship-edge-validator.cjs, only the PAS2 aggregator
 * had an inline guard against from===to. The indiv-bulk and oppexp
 * aggregators didn't, so they wrote ~520 self-loop edges:
 *   - fec-individual-bulk: ~400 (employer's employees attributed back
 *     to the employer entity, e.g. Raytheon → Raytheon $2.14M)
 *   - fec-oppexp: ~124 (campaign paid a vendor whose name resolves
 *     back to the campaign itself, e.g. Obama → Obama, J Street →
 *     J Street)
 *   - relationships.jsonl: ~4 stragglers from migrations
 *
 * Self-loops inflate leaderboards and contradict the aggregation
 * model — money doesn't actually flow from an entity to itself.
 *
 * Future regressions are blocked by the validator. This script is the
 * one-time cleanup of accumulated history. Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/scrub-self-loop-edges.cjs           # dry-run
 *   node scripts/scrub-self-loop-edges.cjs --write   # apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');
const WRITE = process.argv.includes('--write');

console.log(`[scrub-self-loop-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

const targets = [CANONICAL];
for (const f of fs.readdirSync(DERIVED_DIR)) {
  if (!f.endsWith('.jsonl')) continue;
  if (f.includes('.bak')) continue;
  targets.push(path.join(DERIVED_DIR, f));
}

let grandStripped = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) continue;

  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const kept = [];
  let total = 0;
  let stripped = 0;
  const sampleStripped = [];

  for (const line of lines) {
    if (!line.trim()) {
      kept.push(line);
      continue;
    }
    let edge;
    try { edge = JSON.parse(line); } catch {
      kept.push(line);
      continue;
    }
    total++;
    if (edge.from && edge.to && edge.from === edge.to) {
      stripped++;
      if (sampleStripped.length < 3) {
        sampleStripped.push({
          from: edge.from,
          source: edge.source,
          amount: edge.amount,
          cycle: edge.cycle,
          role: edge.role,
        });
      }
      continue;
    }
    kept.push(line);
  }

  if (stripped === 0) {
    console.log(`  ${path.relative(ROOT, file)}: 0 self-loops (clean)`);
    continue;
  }

  console.log(`  ${path.relative(ROOT, file)}: stripping ${stripped} of ${total} edge(s)`);
  for (const s of sampleStripped) console.log(`     ${s.from} (source=${s.source}, $${s.amount}, cycle=${s.cycle})`);
  grandStripped += stripped;

  if (WRITE) {
    // Write atomically: temp file + rename
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, kept.join('\n'));
    fs.renameSync(tmp, file);
  }
}

console.log(`\nTotal self-loops ${WRITE ? 'stripped' : 'would-be-stripped'}: ${grandStripped}`);
if (!WRITE) console.log(`\n[dry-run] no writes. Re-run with --write to apply.`);
