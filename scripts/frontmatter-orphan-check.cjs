#!/usr/bin/env node
/**
 * frontmatter-orphan-check.cjs
 *
 * Harness check (ADR-0027 P1). Reads the canonical orphan store and reports
 * how many candidates are in state="candidate" — i.e. surfaced but not yet
 * triaged. These are the actionable items for the editor.
 *
 * Findings count = candidate-state records.
 *
 * State distribution + top-N by editorial signal (in_opposes=true,
 * has-opposition-edges) are surfaced in the notes string for the
 * /attention queue and dashboard chips.
 *
 * USAGE:
 *   node scripts/frontmatter-orphan-check.cjs --json
 *   node scripts/frontmatter-orphan-check.cjs           # human output
 */

const path = require('path');
const store = require('./lib/frontmatter-orphan-candidates-store.cjs');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');

function main() {
  const all = store.loadAll();
  const byState = {};
  for (const r of all) byState[r.state] = (byState[r.state] || 0) + 1;
  const candidates = all.filter((r) => r.state === 'candidate');

  // Editor signal ranking: in_opposes=true is the editorial-typo pattern.
  // Has-opposition-edges = librarian knows they're linked, just not $.
  // Both true together = the strongest candidate for review.
  const ranked = [...candidates].sort((a, b) => {
    const aw = (a.in_opposes ? 2 : 0) + (a.librarian_opposition_edges > 0 ? 1 : 0);
    const bw = (b.in_opposes ? 2 : 0) + (b.librarian_opposition_edges > 0 ? 1 : 0);
    return bw - aw;
  });

  const top = ranked.slice(0, 10).map((r) => ({
    subject: r.subject,
    field: r.field,
    name: r.name,
    in_opposes: r.in_opposes,
    librarian_opposition_edges: r.librarian_opposition_edges,
    profile_path: r.profile_path,
  }));

  // Strong-signal candidates: name in opposes AND librarian has opposition
  // edges. These are the most actionable — likely editorial typos (Crypto
  // Industry Bloc / Warren shape). The remaining bulk includes alias
  // mismatches and librarian gaps that need infrastructure fixes, not
  // editorial pruning. We surface ONLY strong-signal as findings_count so
  // the attention queue stays usable; the broader population is stored
  // and visible in the P2 ops UI but doesn't drive harness severity.
  const strongSignal = candidates.filter(
    (r) => r.in_opposes && r.librarian_opposition_edges > 0,
  );

  const result = {
    findings_count: strongSignal.length,
    candidate_total: candidates.length,
    strong_signal_count: strongSignal.length,
    by_state: byState,
    top_candidates: top,
    summary:
      `${strongSignal.length} strong-signal candidate(s) (in-opposes + opposition edges); ` +
      `${candidates.length} total candidate(s) in store; ` +
      `pruned: ${(byState['approved-prune'] || 0)}; ` +
      `kept: ${(byState['kept'] || 0)}; ` +
      `librarian-gap: ${(byState['blocked-by-librarian-gap'] || 0)}; ` +
      `resolved: ${(byState['resolved'] || 0)}.`,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  console.log('═══ frontmatter-orphan-check ═══');
  console.log(result.summary);
  console.log();
  if (top.length > 0) {
    console.log('Top candidates by editorial signal:');
    for (const r of top) {
      const flags = [
        r.in_opposes ? 'in-opposes' : '',
        r.librarian_opposition_edges > 0 ? `${r.librarian_opposition_edges} opp-edge(s)` : '',
      ].filter(Boolean).join(', ');
      console.log(`  ${r.subject} [${r.field}] ↛ ${r.name}` + (flags ? `   (${flags})` : ''));
      console.log(`    ${r.profile_path}`);
    }
  }
}

main();
