#!/usr/bin/env node
/**
 * verify-all.cjs — reconciliation orchestrator.
 *
 * Two tiers:
 *   tier 1 (internal)  — local-only, fast, runs on every commit.
 *   tier 2 (external)  — reads raw FEC/IRS bulk, slow, runs on demand.
 *
 * Usage:
 *   node scripts/verify-all.cjs                          # tier 1 only, all entities
 *   node scripts/verify-all.cjs --tier 2                 # tier 2 only
 *   node scripts/verify-all.cjs --tier all               # both
 *   node scripts/verify-all.cjs --entities "Trump,Leo"   # scope to specific entities
 *   node scripts/verify-all.cjs --panel path/to/panel.json
 *   node scripts/verify-all.cjs --strict                 # exit 1 on any error finding
 *   node scripts/verify-all.cjs --json out.json          # write full report to JSON
 *   node scripts/verify-all.cjs --checker amount-sanity  # run one checker
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const TIER = argVal('--tier', '1');
const STRICT = args.includes('--strict');
const JSON_OUT = argVal('--json', null);
const PANEL = argVal('--panel', null);
const CHECKER_FILTER = argVal('--checker', null);
let entityFilter = null;
if (argVal('--entities', null)) {
  entityFilter = argVal('--entities', '').split(',').map((s) => s.trim()).filter(Boolean);
}
if (PANEL) {
  const panel = JSON.parse(fs.readFileSync(PANEL, 'utf-8'));
  entityFilter = panel.entities || panel;
}

const VERIFIERS_DIR = path.join(__dirname, 'verifiers');

async function main() {
  const files = fs.readdirSync(VERIFIERS_DIR).filter((f) => f.endsWith('.cjs') && !f.startsWith('_'));
  const checkers = [];
  for (const f of files) {
    const mod = require(path.join(VERIFIERS_DIR, f));
    if (CHECKER_FILTER && mod.name !== CHECKER_FILTER) continue;
    checkers.push(mod);
  }
  const runTier1 = TIER === '1' || TIER === 'all';
  const runTier2 = TIER === '2' || TIER === 'all';
  const selected = checkers.filter((c) =>
    (runTier1 && c.tier === 1) || (runTier2 && c.tier === 2)
  );

  const banner = `[verify-all] tier=${TIER} checkers=[${selected.map((c) => c.name).join(', ')}]${entityFilter ? ` scope=${entityFilter.length} entities` : ''}`;
  console.log(banner);
  console.log('─'.repeat(95));

  const allFindings = [];
  for (const c of selected) {
    const t0 = Date.now();
    let findings;
    try {
      findings = await c.run({ entities: entityFilter });
    } catch (err) {
      console.error(`\n  ✗ ${c.name} THREW: ${err.message}\n`);
      findings = [{
        severity: 'error',
        entity: null,
        metric: 'checker-crash',
        internal: null,
        external: null,
        delta_pct: null,
        cause: 'checker-crash',
        detail: `checker ${c.name} threw: ${err.message}`,
      }];
    }
    const dt = Date.now() - t0;
    for (const f of findings) f.checker = c.name;
    allFindings.push(...findings);
    const errs = findings.filter((f) => f.severity === 'error').length;
    const warns = findings.filter((f) => f.severity === 'warn').length;
    const mark = errs > 0 ? '✗' : warns > 0 ? '!' : '✓';
    console.log(`  ${mark} [${c.tier}] ${c.name.padEnd(26)}  ${String(errs).padStart(4)} err  ${String(warns).padStart(4)} warn  ${(dt / 1000).toFixed(2)}s  ${c.description}`);
  }

  console.log('─'.repeat(95));
  const totalErr = allFindings.filter((f) => f.severity === 'error').length;
  const totalWarn = allFindings.filter((f) => f.severity === 'warn').length;
  console.log(`  TOTAL: ${totalErr} error, ${totalWarn} warn (${allFindings.length} findings)\n`);

  // Per-checker top 5 findings by severity
  for (const c of selected) {
    const mine = allFindings.filter((f) => f.checker === c.name);
    if (mine.length === 0) continue;
    mine.sort((a, b) => (a.severity === 'error' ? 0 : 1) - (b.severity === 'error' ? 0 : 1));
    console.log(`\n--- ${c.name} (${mine.length}) ---`);
    for (const f of mine.slice(0, 10)) {
      const sev = f.severity === 'error' ? '✗' : f.severity === 'warn' ? '!' : '·';
      const ent = f.entity ? `[${f.entity}] ` : '';
      console.log(`  ${sev} ${ent}${f.detail}`);
    }
    if (mine.length > 10) console.log(`  … and ${mine.length - 10} more`);
  }

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify({
      generated: new Date().toISOString(),
      tier: TIER,
      entityFilter,
      summary: { error: totalErr, warn: totalWarn, total: allFindings.length },
      findings: allFindings,
    }, null, 2));
    console.log(`\nreport written → ${JSON_OUT}`);
  }

  if (STRICT && totalErr > 0) {
    console.log('\nSTRICT mode: errors detected, exit 1');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
