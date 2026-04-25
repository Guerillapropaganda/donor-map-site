#!/usr/bin/env node
/**
 * librarian-validation-check.cjs
 *
 * Harness check: runs the donor-map graph engine load against the
 * canonical stores and reports its verdict on the data.
 *
 * Per ADR-0024 §"Canonical entity resolution": the engine refuses to
 * start on duplicate-bioguide / FEC-registry-conflict failures (the
 * defamation-adjacent class). Soft signals — ambiguous_aliases and
 * unresolved_edges — are tracked as warnings rather than load failures.
 *
 * Per content/Admin Notes/adr-0024-prevention-checklist.md, this is the
 * "Layer 3" meta-check — doesn't enumerate specific bug patterns; makes
 * the librarian's verdict on the data part of vault health. Hard fail
 * means SOMETHING is wrong; engine output points at what.
 *
 * Usage:
 *   node scripts/librarian-validation-check.cjs           # human output
 *   node scripts/librarian-validation-check.cjs --json    # JSON for harness
 *
 * Output JSON shape (when --json):
 *   {
 *     ok: boolean,                   // true iff Graph.load() didn't throw
 *     error?: { name, message },     // present only when ok=false
 *     nodes, edges,                  // engine totals
 *     ambiguous_aliases: number,     // soft warning — alias collisions
 *     unresolved_edges: number,      // soft warning — endpoint dropouts
 *     edges_by_status: {...},        // active/deprecated breakdown
 *     load_ms: number,
 *   }
 *
 * Exit codes:
 *   0  — engine loaded; ambiguous_aliases <= ALERT_THRESHOLD
 *   2  — engine loaded but ambiguous_aliases > ALERT_THRESHOLD (yellow)
 *   3  — engine FAILED to load (DuplicateBioguideError etc.) (red)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');

// Threshold: above this many ambiguous aliases, raise yellow. Set
// generously vs the 2026-04-25 baseline (210) so day-to-day churn
// doesn't false-alarm; tighten after the duplicate-profile editorial
// pass per the prevention checklist. Override with env if needed.
const ALERT_THRESHOLD = parseInt(process.env.LIBRARIAN_AMBIGUOUS_ALERT || '300', 10);

function runLibrarianProbe() {
  // The engine is TS; we spawn tsx with a relative-path import script.
  const probeScript = `
    import { Graph } from "./lib/donor-map/index"
    const t0 = Date.now()
    let result: Record<string, unknown> = {}
    try {
      const g = Graph.load()
      const s = g.stats()
      result = {
        ok: true,
        nodes: s.nodes,
        edges: s.edges,
        edges_by_status: s.edges_by_status,
        ambiguous_aliases: g.resolver.ambiguous_aliases.size,
        unresolved_edges: g.unresolved_edges.length,
        load_ms: Date.now() - t0,
      }
    } catch (err) {
      const e = err as Error
      result = {
        ok: false,
        error: { name: e.name, message: e.message },
        load_ms: Date.now() - t0,
      }
    }
    process.stdout.write(JSON.stringify(result))
  `;
  const tmpFile = path.join(ROOT, '.tmp-librarian-validation.ts');
  fs.writeFileSync(tmpFile, probeScript);
  try {
    const res = spawnSync('npx', ['tsx', tmpFile], {
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
      shell: true,
      cwd: ROOT,
    });
    if (res.status !== 0 && !res.stdout) {
      // tsx itself failed (engine didn't even get to throw cleanly)
      return {
        ok: false,
        error: { name: 'EngineLoadFailure', message: (res.stderr || '').slice(0, 500) },
        load_ms: 0,
      };
    }
    return JSON.parse(res.stdout);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

function main() {
  const probe = runLibrarianProbe();

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(probe));
    process.stdout.write('\n');
  } else {
    if (!probe.ok) {
      console.log('Librarian: FAILED TO LOAD');
      console.log(`  error: ${probe.error?.name}: ${probe.error?.message}`);
      console.log(`  load_ms: ${probe.load_ms}`);
    } else {
      console.log('Librarian: loaded OK');
      console.log(`  nodes: ${probe.nodes.toLocaleString()}`);
      console.log(`  edges: ${probe.edges.toLocaleString()}`);
      console.log(`    by_status: ${JSON.stringify(probe.edges_by_status)}`);
      console.log(`  ambiguous_aliases: ${probe.ambiguous_aliases}  (threshold ${ALERT_THRESHOLD})`);
      console.log(`  unresolved_edges:  ${probe.unresolved_edges.toLocaleString()}`);
      console.log(`  load_ms: ${probe.load_ms}`);
    }
  }

  if (!probe.ok) process.exit(3);
  if ((probe.ambiguous_aliases || 0) > ALERT_THRESHOLD) process.exit(2);
  process.exit(0);
}

main();
