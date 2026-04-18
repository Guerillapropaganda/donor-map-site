#!/usr/bin/env node
/**
 * fec-anomaly-sentinel.cjs
 *
 * Pre-commit sentinel (ADR-0013 opens / ADR-0014). Blocks verified-tier
 * profile commits that reference a committee currently in the open
 * anomaly queue (pas2-anomalies.jsonl). The sentinel is permissive at
 * draft/ready tier so the work-in-progress flow stays unblocked.
 *
 * Check logic:
 *   1. Collect CMTE_IDs with >$10K anomalous activity from
 *      C:\donor-map-data\fec\pas2-anomalies.jsonl (sum by src_cmte_id).
 *   2. For each staged profile file at `content-readiness: verified`:
 *      - Look in the auto:fec-lifetime panel (injected by
 *        build-fec-lifetime-panels.cjs)
 *      - If any anomaly-committee ID appears in that block → BLOCK.
 *   3. If pas2-anomalies.jsonl doesn't exist → permit (fresh worktree).
 *
 * Install: add to .husky/pre-commit after profile-template-validator.
 *
 * Exit codes:
 *   0 = clean
 *   1 = blocked (unreviewed anomaly committee appears in verified profile)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ANOMALIES = 'C:\\donor-map-data\\fec\\pas2-anomalies.jsonl';
const MIN_AMOUNT_TO_FLAG = 10000;

async function loadAnomalyCommittees() {
  if (!fs.existsSync(ANOMALIES)) return new Set();
  const sumByCmte = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(ANOMALIES, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      sumByCmte.set(r.src_cmte_id, (sumByCmte.get(r.src_cmte_id) || 0) + Math.abs(r.amount));
    } catch {}
  }
  const flagged = new Set();
  for (const [id, total] of sumByCmte) {
    if (total >= MIN_AMOUNT_TO_FLAG) flagged.add(id);
  }
  return flagged;
}

function stagedProfileFiles() {
  try {
    const raw = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8', cwd: ROOT });
    return raw.split('\n')
      .filter(f => f.startsWith('content/Politicians/') && f.endsWith('.md'))
      .filter(f => !f.includes('/Drafts/'));
  } catch { return []; }
}

(async function main() {
  const args = process.argv.slice(2);
  const staged = args.includes('--staged');

  const flagged = await loadAnomalyCommittees();
  if (flagged.size === 0) {
    console.log('[fec-anomaly-sentinel] no anomaly data available — permitting commit');
    process.exit(0);
  }

  const files = staged ? stagedProfileFiles() : [];
  if (staged && files.length === 0) process.exit(0);

  const violations = [];
  for (const rel of files) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf-8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    let fm;
    try { fm = yaml.load(m[1]) || {}; } catch { continue; }
    if (fm['content-readiness'] !== 'verified') continue;

    // Extract the auto:fec-lifetime block
    const block = text.match(/<!-- auto:fec-lifetime start -->[\s\S]*?<!-- auto:fec-lifetime end -->/);
    if (!block) continue;

    // Look for any flagged CMTE_ID in the block
    const hits = [];
    for (const id of flagged) {
      if (block[0].includes(id)) hits.push(id);
    }
    if (hits.length) violations.push({ file: rel, hits });
  }

  if (violations.length === 0) {
    console.log(`[fec-anomaly-sentinel] ${flagged.size} anomaly committees tracked; 0 in staged verified profiles`);
    process.exit(0);
  }

  console.log('\n🚨 FEC ANOMALY SENTINEL — verified profile references an unreviewed anomaly committee');
  console.log('');
  console.log('Anomalies are filing errors flagged by scripts/lib/fec-txn-types.cjs (ADR-0013).');
  console.log('They must be reviewed manually before appearing in a verified profile.');
  console.log('');
  for (const v of violations) {
    console.log(`  ${v.file}`);
    for (const id of v.hits) console.log(`    ↳ references anomaly committee ${id}`);
  }
  console.log('');
  console.log('To resolve:');
  console.log('  1. Inspect C:\\donor-map-data\\fec\\pas2-anomalies.jsonl for the flagged IDs');
  console.log('  2. Either (a) whitelist the committee in scripts/lib/fec-txn-types.cjs if legitimate');
  console.log('     (e.g., legacy party committee ID not yet in PARTY_COMMITTEE_IDS),');
  console.log('     (b) add to scripts/lib/fec-committee-succession.cjs if a predecessor→current case,');
  console.log('     or (c) confirm it\'s a real filing error and remove the reference from the profile.');
  console.log('  3. Re-run scripts/ingest-fec-pas2-bulk.cjs to refresh the anomaly file.');
  console.log('  4. Re-run scripts/build-fec-lifetime-panels.cjs --write to update profiles.');
  console.log('');
  console.log('Emergency bypass: SKIP_HOOKS=1 git commit ...');
  process.exit(1);
})().catch(err => { console.error(err); process.exit(2); });
