#!/usr/bin/env node
/**
 * pathless-stub-entities-check.cjs
 *
 * Harness check: scans data/entities.jsonl for records with no
 * profile_path that look like ghost stubs from the discovery-scanner —
 * created from a wikilink before any real profile existed, then never
 * cleaned up.
 *
 * The Bob Casey / Dan Goldman class of bug, caught by the shadow-diff
 * walk on 2026-04-25. These ghosts shadowed the real profiles stored
 * under formal names, marking common-name aliases ambiguous in the
 * librarian and blocking 195+ connections from rendering.
 *
 * Per content/Admin Notes/adr-0024-prevention-checklist.md (Layer 3
 * Check 2). Companion to librarian-validation-check.cjs.
 *
 * Classification:
 *   - politician + no profile_path           → ghost (every politician
 *                                               should have a profile)
 *   - donor + no profile_path + no
 *     signals.ein_coverage_reason            → ghost (the reason field
 *                                               marks legitimate
 *                                               aggregation / external-
 *                                               reference stubs;
 *                                               absence = orphan)
 *   - any + no profile_path +
 *     signals.ein_coverage_reason set        → legitimate (industry
 *                                               bloc, individual donor,
 *                                               PAC-only, etc.)
 *
 * Usage:
 *   node scripts/pathless-stub-entities-check.cjs        # human
 *   node scripts/pathless-stub-entities-check.cjs --json # harness
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const JSON_MODE = process.argv.includes('--json');

function main() {
  const lines = fs.readFileSync(ENTITIES, 'utf-8').split('\n').filter(Boolean);
  const ghost_politicians = [];
  const ghost_donors = [];
  let legitimate_pathless = 0;
  let total = 0;

  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    total++;
    if (e.profile_path) continue;
    const reason = e.signals?.ein_coverage_reason;
    if (reason) { legitimate_pathless++; continue; }
    if (e.entity_type === 'politician') ghost_politicians.push({ id: e.id, name: e.name });
    else if (e.entity_type === 'donor') ghost_donors.push({ id: e.id, name: e.name });
    // Other types treated as legitimate by default (corporation/think-tank
    // pathless cases didn't appear in 2026-04-25 prod sample).
  }

  const findings_count = ghost_politicians.length + ghost_donors.length;

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({
      findings_count,
      total_entities: total,
      ghost_politicians_count: ghost_politicians.length,
      ghost_donors_count: ghost_donors.length,
      legitimate_pathless,
      ghost_politicians_sample: ghost_politicians.slice(0, 20),
      ghost_donors_sample: ghost_donors.slice(0, 20),
      message: `${findings_count} ghost stub(s): ${ghost_politicians.length} politician(s), ${ghost_donors.length} donor(s). ${legitimate_pathless} legitimate pathless (industry blocs, PAC-only, etc.).`,
    }));
    process.stdout.write('\n');
  } else {
    console.log(`Scanned ${total} entities`);
    console.log(`  ${findings_count} ghost stub(s) flagged`);
    console.log(`    ${ghost_politicians.length} politician ghost(s)`);
    console.log(`    ${ghost_donors.length} donor ghost(s)`);
    console.log(`  ${legitimate_pathless} legitimate pathless (ein_coverage_reason set)`);
    console.log();
    if (ghost_politicians.length) {
      console.log('Sample politician ghosts (first 10):');
      for (const g of ghost_politicians.slice(0, 10)) {
        console.log(`  ${g.id}  "${g.name}"`);
      }
    }
    if (ghost_donors.length) {
      console.log();
      console.log('Sample donor ghosts (first 10):');
      for (const g of ghost_donors.slice(0, 10)) {
        console.log(`  ${g.id}  "${g.name}"`);
      }
    }
  }

  process.exit(findings_count > 0 ? 1 : 0);
}

main();
