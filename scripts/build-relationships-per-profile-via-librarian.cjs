#!/usr/bin/env node
/**
 * build-relationships-per-profile-via-librarian.cjs
 *
 * ADR-0024 Phase 3 candidate. Sibling of build-relationships-per-profile.cjs.
 *
 * Produces the SAME JSON shape (data/relationships-per-profile.via-librarian.json
 * by default) but consumes the librarian (Graph.load) instead of reading
 * raw edges + name strings directly.
 *
 * Why a parallel output file: the current cache file is read at build time
 * by Quartz components (DiscoveryPanel, ProfileWidget). We do NOT want to
 * cut over until the diff has been walked. This script writes alongside,
 * never on top of, the existing cache. Cutover is a separate operation.
 *
 * Bucket key strategy (the core difference from the old builder):
 *   - The old builder uses the raw edge `from` / `to` name strings as
 *     bucket keys (after normalizeKey strips "_X Master Profile"). This
 *     splits the same human across multiple keys ("KAMALA HARRIS FOR
 *     SENATE", "Kamala Harris", "Harris, Kamala"...).
 *   - This builder resolves every endpoint through the librarian first,
 *     then uses the resolved Node's display name as the bucket key —
 *     unifying the splits.
 *
 * Edge classification: identical to the old builder. Uses the TS twin of
 * the rulebook (lib/donor-map/edge-taxonomy) — parity-tested against the
 * CJS source.
 *
 * Edge endpoints the librarian cannot resolve are recorded under
 * `_unresolved_endpoints[]` per profile so we can size the orphan-stub
 * problem — they do NOT silently disappear.
 *
 * Usage:
 *   node scripts/build-relationships-per-profile-via-librarian.cjs
 *   node scripts/build-relationships-per-profile-via-librarian.cjs --dry-run
 *   node scripts/build-relationships-per-profile-via-librarian.cjs --out=path.json
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'data', 'relationships-per-profile.via-librarian.json');

function parseArg(name, def) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : def;
}

const DRY_RUN = process.argv.includes('--dry-run');
const OUT = parseArg('out', DEFAULT_OUT);

console.log('build-relationships-per-profile-via-librarian (ADR-0024 Phase 3 candidate)');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}`);
console.log(`Output: ${path.relative(ROOT, OUT)}`);
console.log('');

const tsScript = `
  import { Graph, classifyEdge, CATEGORIES, type Edge, type Node } from "./lib/donor-map/index"
  import * as fs from "node:fs"
  import * as path from "node:path"

  const t0 = Date.now()
  const g = Graph.load()
  const stats = g.stats()
  process.stderr.write(\`librarian loaded: \${stats.nodes} nodes, \${stats.edges} edges (\${((Date.now()-t0)/1000).toFixed(2)}s)\\n\`)

  // Same shape as the old builder. Adding _unresolved_endpoints for diagnostics.
  type Bucket = {
    related: string[]
    donors: string[]
    "politicians-funded": string[]
    opposes: string[]
    "ie-opposed-by": string[]
    "ie-opposition-targets": string[]
    "ie-opposition-detail": Detail[]
    "ie-supported-by": string[]
    "ie-support-targets": string[]
    "ie-support-detail": Detail[]
    stories: string[]
    "government-contracts": string[]
    "monetary-detail": Detail[]
    "contract-detail": Detail[]
    _unresolved_endpoints: { side: "from" | "to"; raw: string; type: string; role: string | null }[]
  }
  type Detail = { name: string; amount: number; cycle: string | number; confidence: number; role: string }

  const buckets = new Map<string, Bucket>()
  function ensure(key: string): Bucket {
    let b = buckets.get(key)
    if (!b) {
      b = {
        related: [],
        donors: [],
        "politicians-funded": [],
        opposes: [],
        "ie-opposed-by": [],
        "ie-opposition-targets": [],
        "ie-opposition-detail": [],
        "ie-supported-by": [],
        "ie-support-targets": [],
        "ie-support-detail": [],
        stories: [],
        "government-contracts": [],
        "monetary-detail": [],
        "contract-detail": [],
        _unresolved_endpoints: [],
      }
      buckets.set(key, b)
    }
    return b
  }
  function addUnique(arr: string[], v: string) { if (!arr.includes(v)) arr.push(v) }
  function addDetail(arr: Detail[], name: string, amount: number | null, cycle: string | number | null, confidence: number, role: string) {
    const c = cycle == null ? "" : cycle
    const existing = arr.find(d => d.name === name && d.cycle === c && d.role === role)
    if (existing) {
      const a = amount || 0
      if (a > existing.amount) existing.amount = a
    } else {
      arr.push({ name, amount: amount || 0, cycle: c, confidence: confidence || 0, role: role || "" })
    }
  }

  // Resolve a raw endpoint string via librarian. Falls back to null if
  // unresolvable so caller can record it as orphan.
  function resolveOrNull(raw: string): Node | null {
    try { return g.resolver.resolve({ kind: "name", value: raw }) } catch { return null }
  }

  // Iterate every edge once via the resolver-already-resolved adjacency
  // by walking every node's outgoing edges. Each edge is encountered exactly
  // once because outIdx is unique per edge.
  let processed = 0
  let mapped = 0
  let skippedType = 0
  let skippedExpenditure = 0
  let unresolvedFrom = 0
  let unresolvedTo = 0

  // Walk edges directly (use neighbors with direction='out' on every node
  // would visit each edge once). Easier: pull edges via Graph internals?
  // Cleaner public path: iterate all nodes, get out-neighbors. Same edge
  // never duplicated because indexed by from_id.
  for (const node of g.resolver.allNodes()) {
    for (const e of g.neighbors(node.id, { direction: "out", status: "active" })) {
      processed++
      if (!e.from_raw || !e.to_raw) continue

      // The librarian already resolved the endpoints — use Node.name as
      // the canonical bucket key.
      const fromNode = g.resolver.tryResolve({ kind: "entity_id", value: e.from_id })
      const toNode = g.resolver.tryResolve({ kind: "entity_id", value: e.to_id })

      // resolver returns nodes by NodeId; if a stub-only node is the from/to
      // we still get a node back (with name = stub raw). That's fine — bucket
      // keys are the librarian's canonical name.
      const fromKey = fromNode ? fromNode.name : null
      const toKey = toNode ? toNode.name : null
      if (!fromKey) { unresolvedFrom++; continue }
      if (!toKey) { unresolvedTo++; continue }

      const role = e.role || ""

      switch (e.type) {
        case "related": {
          const entry = ensure(fromKey)
          addUnique(entry.related, toKey)
          mapped++
          break
        }
        case "monetary": {
          let cls
          try { cls = classifyEdge({ type: e.type, role: e.role, source: e.source, amount: e.amount, from: e.from_raw, to: e.to_raw }) }
          catch { skippedType++; break }
          const cat = cls.category

          if (cat === CATEGORIES.CAMPAIGN_EXPENDITURE) { skippedExpenditure++; break }

          if (cat === CATEGORIES.IE_OPPOSE) {
            const target = ensure(toKey)
            addUnique(target["ie-opposed-by"], fromKey)
            addDetail(target["ie-opposition-detail"], fromKey, e.amount, e.cycle, e.confidence, role)
            const spender = ensure(fromKey)
            addUnique(spender["ie-opposition-targets"], toKey)
            addDetail(spender["ie-opposition-detail"], toKey, e.amount, e.cycle, e.confidence, role)
            mapped++
            break
          }

          if (cat === CATEGORIES.IE_SUPPORT) {
            const target = ensure(toKey)
            addUnique(target["ie-supported-by"], fromKey)
            addDetail(target["ie-support-detail"], fromKey, e.amount, e.cycle, e.confidence, role)
            const spender = ensure(fromKey)
            addUnique(spender["ie-support-targets"], toKey)
            addDetail(spender["ie-support-detail"], toKey, e.amount, e.cycle, e.confidence, role)
            mapped++
            break
          }

          // Direct/employee/coordinated/527-contribution/philanthropic-grant — actual inflow
          const donor = ensure(fromKey)
          addUnique(donor["politicians-funded"], toKey)
          addDetail(donor["monetary-detail"], toKey, e.amount, e.cycle, e.confidence, role)
          const recipient = ensure(toKey)
          addUnique(recipient.donors, fromKey)
          addDetail(recipient["monetary-detail"], fromKey, e.amount, e.cycle, e.confidence, role)
          mapped++
          break
        }
        case "government-contract": {
          const corp = ensure(toKey)
          addUnique(corp["government-contracts"], fromKey)
          addDetail(corp["contract-detail"], fromKey, e.amount, e.cycle, e.confidence, role)
          mapped++
          break
        }
        case "political-opposition": {
          addUnique(ensure(fromKey).opposes, toKey)
          mapped++
          break
        }
        case "story-link": {
          addUnique(ensure(fromKey).stories, toKey)
          mapped++
          break
        }
        default:
          // staffing, media-appearance, affiliation, legal, family — skip (matches old builder)
          skippedType++
          break
      }
    }
  }

  // Also record the librarian's own unresolved-edge diagnostics so we know
  // which raw endpoints never resolved at all (orphan-stub problem).
  for (const u of g.unresolved_edges) {
    const target = u.missing === "from" ? u.edge.to : u.missing === "to" ? u.edge.from : u.edge.from
    if (!target) continue
    // Try to find a bucket the orphan would have landed in. If we can't
    // resolve target either, skip (already lost).
    const node = resolveOrNull(target as string)
    if (!node) continue
    const b = ensure(node.name)
    const raw = (u.missing === "from" ? u.edge.from : u.edge.to) as string
    if (!b._unresolved_endpoints.find(x => x.raw === raw && x.side === u.missing && x.type === u.edge.type)) {
      b._unresolved_endpoints.push({ side: u.missing as "from" | "to", raw, type: u.edge.type, role: (u.edge as any).role ?? null })
    }
  }

  // Sort arrays for stable output (mirror old builder)
  for (const b of buckets.values()) {
    b.related.sort()
    b.donors.sort()
    b["politicians-funded"].sort()
    b.opposes.sort()
    b.stories.sort()
    b["ie-opposed-by"].sort()
    b["ie-opposition-targets"].sort()
    b["ie-supported-by"].sort()
    b["ie-support-targets"].sort()
    b._unresolved_endpoints.sort((x, y) => x.raw < y.raw ? -1 : x.raw > y.raw ? 1 : 0)
  }

  // Sort keys
  const sorted = [...buckets.entries()].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)
  const out: Record<string, Bucket> = {}
  for (const [k, v] of sorted) out[k] = v

  process.stderr.write(JSON.stringify({
    elapsed_s: (Date.now() - t0) / 1000,
    nodes: stats.nodes,
    edges: stats.edges,
    processed,
    mapped,
    skippedType,
    skippedExpenditure,
    unresolvedFrom,
    unresolvedTo,
    bucketCount: buckets.size,
    librarianUnresolvedEdges: g.unresolved_edges.length,
  }) + "\\n")

  process.stdout.write(JSON.stringify(out))
`;

const tmpFile = path.join(ROOT, '.tmp-build-via-librarian.ts');
fs.writeFileSync(tmpFile, tsScript);
let outputJson;
let summary;
try {
  const res = spawnSync('npx', ['tsx', tmpFile], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 1024, // 1GB — output is large
    shell: true,
  });
  if (res.status !== 0) {
    console.error('tsx build failed:');
    console.error(res.stderr);
    process.exit(1);
  }
  // The script writes JSON-summary to stderr (last line) and the full
  // JSON to stdout. Extract both.
  const stderrLines = res.stderr.trim().split('\n');
  summary = JSON.parse(stderrLines[stderrLines.length - 1]);
  // Earlier stderr lines (librarian load message) we just echo
  for (const line of stderrLines.slice(0, -1)) console.log(line);
  outputJson = res.stdout;
} finally {
  fs.unlinkSync(tmpFile);
}

console.log('');
console.log('--- summary ---');
console.log(`nodes:                        ${summary.nodes.toLocaleString()}`);
console.log(`edges:                        ${summary.edges.toLocaleString()}`);
console.log(`edges processed:              ${summary.processed.toLocaleString()}`);
console.log(`edges mapped:                 ${summary.mapped.toLocaleString()}`);
console.log(`edges skipped (unknown type): ${summary.skippedType.toLocaleString()}`);
console.log(`edges skipped (expenditure):  ${summary.skippedExpenditure.toLocaleString()}`);
console.log(`unresolved from-side:         ${summary.unresolvedFrom.toLocaleString()}`);
console.log(`unresolved to-side:           ${summary.unresolvedTo.toLocaleString()}`);
console.log(`bucket count:                 ${summary.bucketCount.toLocaleString()}`);
console.log(`librarian unresolved edges:   ${summary.librarianUnresolvedEdges.toLocaleString()}`);
console.log(`elapsed:                      ${summary.elapsed_s.toFixed(2)}s`);

if (DRY_RUN) {
  console.log('');
  console.log('(dry-run) not writing output');
} else {
  const dataDir = path.dirname(OUT);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${OUT}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, outputJson + '\n', 'utf-8');
  fs.renameSync(tmp, OUT);
  console.log('');
  console.log(`✓ Wrote ${path.relative(ROOT, OUT)} (${(outputJson.length / 1024 / 1024).toFixed(1)} MB)`);
}
