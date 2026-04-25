#!/usr/bin/env node
/**
 * donor-map-shadow-scan — one-shot offline preview of the shadow harness.
 *
 * Iterates every profile in data/relationships-per-profile.json, computes
 * the librarian's answer for the `related` field, and reports the
 * diff distribution. Same comparison the live ops shadow hook does, but
 * batch-mode so we can size the divergence before flipping shadow on.
 *
 * Per ADR-0024 §"Migration strategy" — the goal is to walk diffs with
 * David before any cutover. This script gives the at-a-glance summary
 * (agree vs disagree count, biggest disagreements) so we know where to
 * focus the review.
 *
 * Usage:
 *   node scripts/donor-map-shadow-scan.cjs                  # summary only
 *   node scripts/donor-map-shadow-scan.cjs --top=20         # top 20 disagreements
 *   node scripts/donor-map-shadow-scan.cjs --out=path.jsonl # write all diffs
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CACHE_PATH = path.join(ROOT, 'data', 'relationships-per-profile.json');

function parseArg(name, def) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : def;
}

const TOP = parseInt(parseArg('top', '10'), 10);
const OUT = parseArg('out', null);

// Defer to tsx to run the TS librarian. We could write a CJS bridge but
// the librarian is the source of truth and tsx is already in the dev deps.
function runLibrarianScan() {
  const probeScript = `
    const { Graph } = require('${path.join(ROOT, 'lib/donor-map').replace(/\\\\/g, '/')}');
  `;
  // Easier path: spawn tsx with a here-script.
  const tsScript = `
    import { Graph } from "./lib/donor-map/index"
    import * as fs from "node:fs"
    const cache = JSON.parse(fs.readFileSync(${JSON.stringify(CACHE_PATH.replace(/\\\\/g, '/'))}, "utf-8"))
    const g = Graph.load()
    const results = []
    for (const [title, bundle] of Object.entries(cache)) {
      const cacheRelated = Array.isArray(bundle?.related) ? bundle.related.map(String) : []
      const node = g.resolver.tryResolve({ kind: "name", value: title })
      let librarianNames = new Set()
      if (node) {
        for (const e of g.neighbors(node.id, { edge_types: ["related"], direction: "out" })) {
          librarianNames.add(e.to_raw)
        }
      }
      const cacheSet = new Set(cacheRelated)
      const only_in_lib = [...librarianNames].filter(n => !cacheSet.has(n))
      const only_in_cache = [...cacheSet].filter(n => !librarianNames.has(n))
      const agree = only_in_lib.length === 0 && only_in_cache.length === 0
      results.push({ title, librarian: librarianNames.size, cache: cacheSet.size, only_in_lib_n: only_in_lib.length, only_in_cache_n: only_in_cache.length, agree, only_in_lib, only_in_cache, resolved: !!node })
    }
    process.stdout.write(JSON.stringify(results))
  `;
  const tmpFile = path.join(ROOT, '.tmp-shadow-scan.ts');
  fs.writeFileSync(tmpFile, tsScript);
  try {
    const res = spawnSync('npx', ['tsx', tmpFile], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024, shell: true });
    if (res.status !== 0) {
      console.error('tsx scan failed:');
      console.error(res.stderr);
      process.exit(1);
    }
    return JSON.parse(res.stdout);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

function main() {
  console.log('Loading cache + running librarian scan...');
  const t0 = Date.now();
  const results = runLibrarianScan();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Scanned ${results.length} profiles in ${elapsed}s`);
  console.log();

  const agree = results.filter((r) => r.agree).length;
  const disagree = results.length - agree;
  const unresolved = results.filter((r) => !r.resolved).length;

  console.log('Summary');
  console.log(`  agree:       ${agree.toLocaleString().padStart(7)} (${((agree / results.length) * 100).toFixed(1)}%)`);
  console.log(`  disagree:    ${disagree.toLocaleString().padStart(7)} (${((disagree / results.length) * 100).toFixed(1)}%)`);
  console.log(`  unresolved:  ${unresolved.toLocaleString().padStart(7)} (librarian could not find profile by name)`);
  console.log();

  // Histogram of diff magnitudes
  const buckets = { '0': 0, '1-5': 0, '6-20': 0, '21-100': 0, '100+': 0 };
  for (const r of results) {
    if (r.agree) continue;
    const mag = r.only_in_lib_n + r.only_in_cache_n;
    if (mag === 0) buckets['0']++;
    else if (mag <= 5) buckets['1-5']++;
    else if (mag <= 20) buckets['6-20']++;
    else if (mag <= 100) buckets['21-100']++;
    else buckets['100+']++;
  }
  console.log('Disagreement magnitude (names different):');
  for (const [k, v] of Object.entries(buckets)) {
    console.log(`  ${k.padEnd(8)} ${v.toLocaleString().padStart(7)}`);
  }
  console.log();

  // Top disagreements by total names different
  const topDiffs = results
    .filter((r) => !r.agree)
    .sort((a, b) => (b.only_in_lib_n + b.only_in_cache_n) - (a.only_in_lib_n + a.only_in_cache_n))
    .slice(0, TOP);

  console.log(`Top ${TOP} disagreements (most names different):`);
  for (const r of topDiffs) {
    console.log(`  ${r.title}`);
    console.log(`    cache=${r.cache}  librarian=${r.librarian}  +lib=${r.only_in_lib_n}  +cache=${r.only_in_cache_n}  resolved=${r.resolved}`);
  }

  if (OUT) {
    fs.writeFileSync(OUT, results.map((r) => JSON.stringify(r)).join('\n'));
    console.log();
    console.log(`Wrote full diff log: ${OUT}`);
  }
}

main();
