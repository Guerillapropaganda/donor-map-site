#!/usr/bin/env node
/**
 * split-relationships-by-source.cjs
 *
 * One-shot migration: partition the monolithic data/relationships.jsonl
 * into a canonical file (hand-curated editorial edges) plus per-source
 * derived files under data/derived/.
 *
 * Rationale: relationships.jsonl hit 92 MB with no path to shrink. FEC
 * ingest + IRS 990 ingest + committee-transfer ingest all appended to
 * one file. GitHub warns at 50 MB, hard-blocks at 100 MB. Splitting by
 * source keeps each file well under the cap while preserving the
 * canonical/derived distinction: canonical is source truth (hand
 * editorial + ops app), derived is reproducible from bulk government
 * data.
 *
 * Canonical sources stay in data/relationships.jsonl:
 *   manual-ops, research-claude, frontmatter-migration,
 *   bidirectional-normalizer, discovery-scanner
 *
 * Derived sources route to data/derived/{source}.jsonl:
 *   fec-indiv-by-committee, fec-bulk, fec-individual-bulk,
 *   fec-oth-transfers, fec-api, irs-990-bulk, usaspending-bulk,
 *   usaspending-grants-bulk, epa-frs (any future bulk-derived source)
 *
 * The split is one-way: the store loader (relationships-store.cjs) is
 * updated to read from the canonical file PLUS every file under
 * data/derived/. Consumers see the same unified edge list.
 *
 * Usage:
 *   node scripts/split-relationships-by-source.cjs           # dry-run
 *   node scripts/split-relationships-by-source.cjs --write   # apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAIN_FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');
const WRITE = process.argv.includes('--write');

// Sources that represent editorial work or hand-confirmed relationships.
// These stay in the canonical file and are the source of truth.
const CANONICAL_SOURCES = new Set([
  'manual-ops',
  'research-claude',
  'frontmatter-migration',
  'body-migration-april-9',
  'bidirectional-normalizer',
  'discovery-scanner',
  'connection-suggester',
  'contradiction-scanner',
  // Not yet seen in store but reserved for future editorial work
]);

// Every other source is treated as derived. This includes FEC, IRS,
// USASpending, EPA — any pipeline that aggregates authoritative
// upstream data into edges.

(function main() {
  console.log(`[split-relationships-by-source] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  const lines = fs.readFileSync(MAIN_FILE, 'utf-8').split('\n').filter(Boolean);
  console.log(`  input: ${lines.length.toLocaleString()} edges in relationships.jsonl`);

  const canonical = [];
  const bySource = {};
  let unsourced = 0;
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { canonical.push(line); continue; }
    const src = e.source || '';
    if (!src) { unsourced++; canonical.push(line); continue; }
    if (CANONICAL_SOURCES.has(src)) {
      canonical.push(line);
    } else {
      if (!bySource[src]) bySource[src] = [];
      bySource[src].push(line);
    }
  }

  console.log(`\n  canonical (stays in relationships.jsonl): ${canonical.length.toLocaleString()} edges`);
  if (unsourced > 0) console.log(`    (including ${unsourced} with no source)`);
  console.log(`\n  derived (moving to data/derived/):`);
  const sortedDerived = Object.entries(bySource).sort((a, b) => b[1].length - a[1].length);
  for (const [src, edges] of sortedDerived) {
    const bytes = edges.reduce((acc, l) => acc + l.length + 1, 0);
    console.log(`    ${src.padEnd(32)} ${edges.length.toString().padStart(7)} edges  ${(bytes / 1024 / 1024).toFixed(1).padStart(5)} MB`);
  }

  if (!WRITE) {
    console.log(`\n[dry-run] no writes. Use --write to apply.`);
    return;
  }

  // Create derived directory
  fs.mkdirSync(DERIVED_DIR, { recursive: true });

  // Write per-source derived files
  for (const [src, edges] of sortedDerived) {
    const file = path.join(DERIVED_DIR, `${src}.jsonl`);
    fs.writeFileSync(file, edges.join('\n') + '\n');
    console.log(`  wrote ${path.relative(ROOT, file)} (${edges.length.toLocaleString()} edges)`);
  }

  // Rewrite canonical file
  fs.writeFileSync(MAIN_FILE, canonical.join('\n') + '\n');
  console.log(`\n  rewrote ${path.relative(ROOT, MAIN_FILE)} (${canonical.length.toLocaleString()} edges)`);

  // Print final sizes
  console.log(`\nFinal file sizes:`);
  const s = fs.statSync(MAIN_FILE);
  console.log(`  ${path.relative(ROOT, MAIN_FILE)}: ${(s.size / 1024 / 1024).toFixed(1)} MB`);
  for (const f of fs.readdirSync(DERIVED_DIR).sort()) {
    const fp = path.join(DERIVED_DIR, f);
    const st = fs.statSync(fp);
    console.log(`  ${path.relative(ROOT, fp)}: ${(st.size / 1024 / 1024).toFixed(1)} MB`);
  }
})();
