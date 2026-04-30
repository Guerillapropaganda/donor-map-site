#!/usr/bin/env node
/**
 * deprecate-monetary-edges-with-topic-endpoints.cjs
 *
 * Surfaced 2026-04-30 (cc_p3_209 item 8) by audit-unresolved-edges.
 * Some FEC ingest paths (and Cal-Access in two cases) mis-attributed
 * monetary flows to article-shaped names like "Medicare for All - The
 * Policy That Broke the Party." A policy / story / map article can't
 * give or receive money — these edges are categorically wrong.
 *
 * Predicate (deterministic, no judgment):
 *   - edge.type ∈ { monetary, government-contract, federal-grant }
 *   - edge.status === 'active'
 *   - edge.from OR edge.to matches /\s+-\s+(The|A|An)\s+\w+/ (article-
 *     subtitle pattern: "Foo - The Bar" / "Foo - A Bar" / "Foo - An Bar")
 *
 * Action: status → 'deprecated', append `deprecation_reason: monetary-
 * with-topic-endpoint` and `deprecated_at` timestamp. Edges aren't
 * deleted — preserved for forensic audit.
 *
 * Usage:
 *   node scripts/deprecate-monetary-edges-with-topic-endpoints.cjs
 *   node scripts/deprecate-monetary-edges-with-topic-endpoints.cjs --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const TOPIC_RE = /\s+-\s+(The|A|An)\s+\w+/;
const MONETARY_TYPES = new Set(['monetary', 'government-contract', 'federal-grant']);

function shouldDeprecate(e) {
  if (!MONETARY_TYPES.has(e.type)) return false;
  if (e.status !== 'active') return false;
  return TOPIC_RE.test(e.from || '') || TOPIC_RE.test(e.to || '');
}

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return { scanned: 0, deprecated: 0 };
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  let scanned = 0, deprecated = 0;
  const nowIso = new Date().toISOString();
  const out = [];
  for (const line of lines) {
    if (!line.trim()) { out.push(line); continue; }
    let e;
    try { e = JSON.parse(line); } catch { out.push(line); continue; }
    scanned++;
    if (shouldDeprecate(e)) {
      e.status = 'deprecated';
      e.deprecation_reason = 'monetary-with-topic-endpoint';
      e.deprecated_at = nowIso;
      deprecated++;
    }
    out.push(JSON.stringify(e));
  }
  if (APPLY && deprecated > 0) {
    fs.writeFileSync(filePath, out.join('\n'));
  }
  return { scanned, deprecated };
}

function main() {
  console.log(`[deprecate-topic-endpoints] ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const targets = [path.join(ROOT, 'data', 'relationships.jsonl')];
  const dir = path.join(ROOT, 'data', 'derived');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) targets.push(path.join(dir, f));
  }
  let total = 0, totalDep = 0;
  for (const t of targets) {
    const { scanned, deprecated } = processFile(t);
    total += scanned;
    totalDep += deprecated;
    if (deprecated > 0) console.log(`  ${path.relative(ROOT, t).replace(/\\/g, '/')}: ${deprecated} deprecated of ${scanned}`);
  }
  console.log(`\n  scanned ${total} edges across ${targets.length} files`);
  console.log(`  deprecated: ${totalDep}`);
  if (!APPLY) console.log('\n  rerun with --apply to write changes.');
}
main();
