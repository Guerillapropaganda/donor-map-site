/**
 * committee-receipts.cjs — tier 2 checker (thin wrapper).
 *
 * Delegates to the existing scripts/verify-committee-receipts.cjs,
 * which is the authoritative FEC-upstream reconciliation. We shell
 * out rather than duplicate the logic — that script is already
 * used by David directly and baked into the pre-commit gate.
 *
 * Shelling out because the committee-receipts verifier streams
 * ~13M rows of FEC bulk data in a single process and its internals
 * aren't structured for in-process reuse. That's a refactor for
 * another day; the right scope today is to make the orchestrator
 * aware of it and run it on the same panel.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { finding } = require('./_framework.cjs');

async function run(opts = {}) {
  const findings = [];
  const script = path.join(__dirname, '..', 'verify-committee-receipts.cjs');

  // Match any scoped-entity request to --cmte or --cycle where possible.
  // Today we just run the default (all mapped committees, all cycles)
  // and parse the human-readable output back into findings. When the
  // existing script grows a --json emitter, swap to that.
  const args = ['--top', '50'];
  const result = spawnSync('node', [script, ...args], {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.status !== 0 && result.status !== null) {
    findings.push(finding({
      severity: 'error',
      entity: null,
      metric: 'checker-crash',
      internal: null,
      cause: 'subprocess-failed',
      detail: `verify-committee-receipts.cjs exited ${result.status}: ${result.stderr.slice(0, 400)}`,
    }));
    return findings;
  }

  const lines = result.stdout.split('\n');
  // Parse rows like:  "$199.0M   $278.6M   40.0%  ⬆  2020  SLF PAC"
  const ROW_RE = /\s*\$([\d.]+)M\s+\$([\d.]+)M\s+(-?[\d.]+)%\s+(⬆|⬇|✓)\s+(\d{4})\s+(.+)$/;
  for (const line of lines) {
    const m = line.match(ROW_RE);
    if (!m) continue;
    const [, srcM, edgeM, pct, marker, cycle, entity] = m;
    if (opts.entities && !opts.entities.includes(entity)) continue;
    if (marker === '✓') continue;
    const src = parseFloat(srcM) * 1e6;
    const edge = parseFloat(edgeM) * 1e6;
    const severity = Math.abs(parseFloat(pct)) > 25 ? 'error' : 'warn';
    findings.push(finding({
      severity,
      entity,
      metric: `receipts-${cycle}`,
      internal: edge,
      external: src,
      cause: marker === '⬆' ? 'over-count-vs-fec' : 'under-count-vs-fec',
      detail: `${entity} cycle ${cycle}: edge-store ${marker === '⬆' ? 'OVER' : 'UNDER'}-counts vs FEC upstream by ${pct}% (edge $${edgeM}M vs FEC $${srcM}M)`,
    }));
  }

  return findings;
}

module.exports = {
  name: 'committee-receipts',
  tier: 2,
  description: 'Edge-store committee receipts vs FEC bulk (indiv, transfers, pas2, conduit)',
  run,
};
