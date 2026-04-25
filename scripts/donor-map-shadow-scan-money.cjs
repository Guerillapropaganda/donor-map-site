#!/usr/bin/env node
/**
 * donor-map-shadow-scan-money — shadow scan for the money fields.
 *
 * Sibling of donor-map-shadow-scan.cjs. That script compared the
 * `related` field against the librarian. This one compares `donors` and
 * `politicians-funded` — the high-value money fields unblocked by the
 * 2026-04-25 TS port of edge-role-taxonomy.
 *
 * For each profile in data/relationships-per-profile.json:
 *   - donors             : librarian's incoming monetary edges where the
 *                          classifier says they are received money (excludes
 *                          ie-support, ie-oppose, campaign-expenditure).
 *   - politicians-funded : librarian's outgoing monetary edges where the
 *                          classifier says they are given political money
 *                          (same exclusions).
 *
 * Reports agree / disagree distribution + top-N by names different.
 *
 * Usage:
 *   node scripts/donor-map-shadow-scan-money.cjs                      # both fields
 *   node scripts/donor-map-shadow-scan-money.cjs --field=donors
 *   node scripts/donor-map-shadow-scan-money.cjs --field=politicians-funded
 *   node scripts/donor-map-shadow-scan-money.cjs --top=20
 *   node scripts/donor-map-shadow-scan-money.cjs --out=path.jsonl
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
const FIELD = parseArg('field', 'both'); // donors | politicians-funded | both

function runLibrarianScan() {
  const tsScript = `
    import { Graph, classifyEdge, CATEGORIES } from "./lib/donor-map/index"
    import * as fs from "node:fs"

    const cache = JSON.parse(fs.readFileSync(${JSON.stringify(CACHE_PATH.replace(/\\\\/g, '/'))}, "utf-8"))
    const g = Graph.load()

    // Categories that count as "actual money in/out" — mirror the cache
    // builder's filter (excludes ie-support, ie-oppose, campaign-expenditure).
    const MONEY_RECEIVED = new Set([
      CATEGORIES.DIRECT_CONTRIBUTION,
      CATEGORIES.PHILANTHROPIC_GRANT,
      CATEGORIES.CONTRIBUTION_527,
    ])

    function librarianDonors(node) {
      const out = new Set<string>()
      for (const e of g.neighbors(node.id, { edge_types: ["monetary"], direction: "in" })) {
        let cls
        try { cls = classifyEdge(e as unknown as Record<string, unknown>) } catch { continue }
        if (MONEY_RECEIVED.has(cls.category)) out.add(e.from_raw)
      }
      return out
    }
    function librarianPoliticiansFunded(node) {
      const out = new Set<string>()
      for (const e of g.neighbors(node.id, { edge_types: ["monetary"], direction: "out" })) {
        let cls
        try { cls = classifyEdge(e as unknown as Record<string, unknown>) } catch { continue }
        if (MONEY_RECEIVED.has(cls.category)) out.add(e.to_raw)
      }
      return out
    }

    function diff(libSet: Set<string>, cacheArr: string[]) {
      const cacheSet = new Set(cacheArr.map(String))
      const only_in_lib = [...libSet].filter(n => !cacheSet.has(n))
      const only_in_cache = [...cacheSet].filter(n => !libSet.has(n))
      return { lib_n: libSet.size, cache_n: cacheSet.size, only_in_lib, only_in_cache, agree: only_in_lib.length === 0 && only_in_cache.length === 0 }
    }

    const FIELD = ${JSON.stringify(FIELD)}
    const results: any[] = []
    for (const [title, bundle] of Object.entries<any>(cache)) {
      const node = g.resolver.tryResolve({ kind: "name", value: title })
      const row: any = { title, resolved: !!node }

      if (FIELD === "donors" || FIELD === "both") {
        const libSet = node ? librarianDonors(node) : new Set<string>()
        row.donors = diff(libSet, Array.isArray(bundle?.donors) ? bundle.donors : [])
      }
      if (FIELD === "politicians-funded" || FIELD === "both") {
        const libSet = node ? librarianPoliticiansFunded(node) : new Set<string>()
        row["politicians-funded"] = diff(libSet, Array.isArray(bundle?.["politicians-funded"]) ? bundle["politicians-funded"] : [])
      }
      results.push(row)
    }
    process.stdout.write(JSON.stringify(results))
  `;
  const tmpFile = path.join(ROOT, '.tmp-shadow-scan-money.ts');
  fs.writeFileSync(tmpFile, tsScript);
  try {
    const res = spawnSync('npx', ['tsx', tmpFile], { encoding: 'utf-8', maxBuffer: 512 * 1024 * 1024, shell: true });
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

function reportField(results, field) {
  const rows = results.filter((r) => r[field]);
  const agree = rows.filter((r) => r[field].agree).length;
  const disagree = rows.length - agree;

  console.log(`--- ${field} ---`);
  console.log(`  agree:    ${agree.toLocaleString().padStart(7)} (${((agree / rows.length) * 100).toFixed(1)}%)`);
  console.log(`  disagree: ${disagree.toLocaleString().padStart(7)} (${((disagree / rows.length) * 100).toFixed(1)}%)`);

  const buckets = { '0': 0, '1-5': 0, '6-20': 0, '21-100': 0, '100+': 0 };
  for (const r of rows) {
    if (r[field].agree) continue;
    const mag = r[field].only_in_lib.length + r[field].only_in_cache.length;
    if (mag === 0) buckets['0']++;
    else if (mag <= 5) buckets['1-5']++;
    else if (mag <= 20) buckets['6-20']++;
    else if (mag <= 100) buckets['21-100']++;
    else buckets['100+']++;
  }
  console.log('  disagreement magnitude (names different):');
  for (const [k, v] of Object.entries(buckets)) {
    console.log(`    ${k.padEnd(8)} ${v.toLocaleString().padStart(7)}`);
  }

  const top = rows
    .filter((r) => !r[field].agree)
    .sort((a, b) => (b[field].only_in_lib.length + b[field].only_in_cache.length) - (a[field].only_in_lib.length + a[field].only_in_cache.length))
    .slice(0, TOP);
  console.log(`  top ${TOP} disagreements:`);
  for (const r of top) {
    const d = r[field];
    console.log(`    ${r.title}`);
    console.log(`      cache=${d.cache_n}  librarian=${d.lib_n}  +lib=${d.only_in_lib.length}  +cache=${d.only_in_cache.length}  resolved=${r.resolved}`);
  }
  console.log();
}

function main() {
  console.log(`Shadow scan: money fields (field=${FIELD})`);
  const t0 = Date.now();
  const results = runLibrarianScan();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Scanned ${results.length} profiles in ${elapsed}s`);
  console.log();

  const unresolved = results.filter((r) => !r.resolved).length;
  console.log(`unresolved (librarian could not find profile by name): ${unresolved.toLocaleString()}`);
  console.log();

  if (FIELD === 'donors' || FIELD === 'both') reportField(results, 'donors');
  if (FIELD === 'politicians-funded' || FIELD === 'both') reportField(results, 'politicians-funded');

  if (OUT) {
    fs.writeFileSync(OUT, results.map((r) => JSON.stringify(r)).join('\n'));
    console.log(`Wrote full diff log: ${OUT}`);
  }
}

main();
