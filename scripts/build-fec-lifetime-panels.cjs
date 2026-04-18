#!/usr/bin/env node
/**
 * build-fec-lifetime-panels.cjs
 *
 * Injects a "Lifetime FEC Data" auto-block into every profile whose
 * frontmatter has `fec-candidate-id` (politicians) or whose entity type
 * is donor/pac/corporation with a resolvable CMTE_ID.
 *
 * Pulls from the derived FEC stores at C:\donor-map-data\fec\ (built by
 * ingest-fec-pas2-bulk + ingest-fec-masters-bulk + ingest-fec-indiv-
 * aggregate). Reads from bucketed files so the anomaly rows never appear
 * (ADR-0013 isolation guarantee).
 *
 * Auto-block markers: <!-- auto:fec-lifetime start --> ... end -->
 * Idempotent: re-running only rewrites content that changed. No edits
 * outside the markers.
 *
 * Usage:
 *   node scripts/build-fec-lifetime-panels.cjs            # dry-run (report)
 *   node scripts/build-fec-lifetime-panels.cjs --write    # apply edits
 *   node scripts/build-fec-lifetime-panels.cjs --write --profile "Donald Trump"
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const FEC = 'C:\\donor-map-data\\fec';
const PROFILES_ROOT = path.join(ROOT, 'content');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');
const profileFlag = args.indexOf('--profile');
const PROFILE_FILTER = profileFlag !== -1 ? args[profileFlag + 1] : null;

const BLOCK_START = '<!-- auto:fec-lifetime start -->';
const BLOCK_END = '<!-- auto:fec-lifetime end -->';

function fmtUsd(n) {
  if (!n || typeof n !== 'number') return '—';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

// ─── Build indexes from derived stores ─────────────────────────────
async function* streamJsonl(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    try { yield JSON.parse(line); } catch {}
  }
}

async function buildIndexes() {
  console.log('Building indexes from FEC derived stores...');

  // committee name map
  const cmteName = new Map();
  for await (const r of streamJsonl(path.join(FEC, 'committee-master.jsonl'))) {
    if (r.id && r.name) cmteName.set(r.id, r.name);
  }
  console.log(`  committees: ${cmteName.size}`);

  // candId → [{cmte_id, total, count}] from direct donors (lifetime)
  const candDirect = new Map();
  let rowsDir = 0;
  for await (const r of streamJsonl(path.join(FEC, 'pas2-direct-donors.jsonl'))) {
    rowsDir++;
    if (!r.cand_id) continue;
    if (!candDirect.has(r.cand_id)) candDirect.set(r.cand_id, new Map());
    const inner = candDirect.get(r.cand_id);
    const prev = inner.get(r.src_cmte_id) || { total: 0, count: 0 };
    prev.total += Math.abs(r.amount);
    prev.count++;
    inner.set(r.src_cmte_id, prev);
  }
  console.log(`  direct-donor rows: ${rowsDir}, candidates indexed: ${candDirect.size}`);

  // candId → [{cmte_id, total}] from IE support + oppose
  const candIeSupport = new Map();
  const candIeOppose = new Map();
  for (const [file, target] of [
    ['pas2-ie-support.jsonl', candIeSupport],
    ['pas2-ie-oppose.jsonl', candIeOppose],
  ]) {
    for await (const r of streamJsonl(path.join(FEC, file))) {
      if (!r.cand_id) continue;
      if (!target.has(r.cand_id)) target.set(r.cand_id, new Map());
      const inner = target.get(r.cand_id);
      const prev = inner.get(r.src_cmte_id) || 0;
      inner.set(r.src_cmte_id, prev + Math.abs(r.amount));
    }
  }
  console.log(`  ie-support candidates: ${candIeSupport.size}, ie-oppose candidates: ${candIeOppose.size}`);

  // candId → party committee support
  const candParty = new Map();
  for await (const r of streamJsonl(path.join(FEC, 'pas2-party.jsonl'))) {
    if (!r.cand_id) continue;
    const prev = candParty.get(r.cand_id) || 0;
    candParty.set(r.cand_id, prev + Math.abs(r.amount));
  }

  // cmteId → [individual donors ≥$10K]
  const cmteFunders = new Map();
  let rowsInd = 0;
  for await (const r of streamJsonl(path.join(FEC, 'indiv-by-committee.jsonl'))) {
    rowsInd++;
    if (!cmteFunders.has(r.cmte_id)) cmteFunders.set(r.cmte_id, []);
    cmteFunders.get(r.cmte_id).push(r);
  }
  console.log(`  indiv aggregated rows: ${rowsInd}, committees with funders: ${cmteFunders.size}`);

  return { cmteName, candDirect, candIeSupport, candIeOppose, candParty, cmteFunders };
}

// ─── Panel rendering ─────────────────────────────

function renderPoliticianPanel(candId, idx) {
  const lines = [];
  const direct = idx.candDirect.get(candId);
  const ieS = idx.candIeSupport.get(candId);
  const ieO = idx.candIeOppose.get(candId);
  const party = idx.candParty.get(candId);
  if (!direct && !ieS && !ieO && !party) return null; // no FEC data

  lines.push('');
  lines.push(`*Lifetime federal FEC data, 1982–2026. Classified per ADR-0013 (anomalies excluded).*`);
  lines.push('');

  // Summary totals
  const directTotal = direct ? [...direct.values()].reduce((a, b) => a + b.total, 0) : 0;
  const ieSupportTotal = ieS ? [...ieS.values()].reduce((a, b) => a + b, 0) : 0;
  const ieOpposeTotal = ieO ? [...ieO.values()].reduce((a, b) => a + b, 0) : 0;
  const partyTotal = party || 0;

  lines.push('| Channel | Lifetime $ |');
  lines.push('|---|---:|');
  lines.push(`| Direct PAC donors | ${fmtUsd(directTotal)} |`);
  if (partyTotal) lines.push(`| Party committee support | ${fmtUsd(partyTotal)} |`);
  if (ieSupportTotal) lines.push(`| Super-PAC IE support (FOR) | ${fmtUsd(ieSupportTotal)} |`);
  if (ieOpposeTotal) lines.push(`| Super-PAC IE opposition (AGAINST) | ${fmtUsd(ieOpposeTotal)} |`);

  // Top 10 direct donors
  if (direct && direct.size) {
    const sorted = [...direct.entries()]
      .map(([id, v]) => ({ id, name: idx.cmteName.get(id) || '(unknown)', ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    lines.push('');
    lines.push('**Top 10 direct PAC donors (lifetime):**');
    lines.push('');
    lines.push('| Committee | Total | Txns |');
    lines.push('|---|---:|---:|');
    for (const d of sorted) lines.push(`| ${d.name} | ${fmtUsd(d.total)} | ${d.count} |`);
  }

  // Top IE supporters
  if (ieS && ieS.size > 0) {
    const sorted = [...ieS.entries()]
      .map(([id, amount]) => ({ id, name: idx.cmteName.get(id) || '(unknown)', amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    lines.push('');
    lines.push('**Top 5 super-PAC IE support (FOR this candidate):**');
    lines.push('');
    lines.push('| Committee | Total |');
    lines.push('|---|---:|');
    for (const d of sorted) lines.push(`| ${d.name} | ${fmtUsd(d.amount)} |`);
  }

  // Top IE opposers
  if (ieO && ieO.size > 0) {
    const sorted = [...ieO.entries()]
      .map(([id, amount]) => ({ id, name: idx.cmteName.get(id) || '(unknown)', amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    lines.push('');
    lines.push('**Top 5 super-PAC IE opposition (AGAINST this candidate):**');
    lines.push('');
    lines.push('| Committee | Total |');
    lines.push('|---|---:|');
    for (const d of sorted) lines.push(`| ${d.name} | ${fmtUsd(d.amount)} |`);
  }

  lines.push('');
  lines.push('*Source: FEC bulk pas2 (1982–2026). Generated by `scripts/build-fec-lifetime-panels.cjs` per ADR-0014.*');
  return lines.join('\n');
}

// ─── Main walk over profiles ─────────────────────────────

function walkProfiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip drafts, decisions, events, admin notes, etc.
      if (['Drafts', 'Decisions', 'Events', 'Admin Notes', 'Checklists', 'Story Seeds', 'Vault Maintenance', 'Archive', 'Phases', 'Assets', '_templates', 'templates', 'Daily Updates'].includes(e.name)) continue;
      out.push(...walkProfiles(full));
    } else if (e.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function injectPanel(filePath, panelMd) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const blockRe = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
  const newBlock = `${BLOCK_START}\n${panelMd}\n${BLOCK_END}`;

  let newText;
  if (blockRe.test(text)) {
    newText = text.replace(blockRe, newBlock);
  } else {
    // Append after existing auto:data-panel block if present, else at end
    const dataPanelEnd = '<!-- auto:data-panel end -->';
    if (text.includes(dataPanelEnd)) {
      newText = text.replace(dataPanelEnd, dataPanelEnd + '\n\n' + newBlock);
    } else {
      newText = text + '\n\n' + newBlock + '\n';
    }
  }
  if (newText === text) return false;
  fs.writeFileSync(filePath, newText);
  return true;
}

(async function main() {
  const idx = await buildIndexes();

  console.log('\nScanning profiles...');
  const files = walkProfiles(PROFILES_ROOT);
  let scanned = 0, injected = 0, skipped = 0, nodata = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    const m = text.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    let fm;
    try { fm = yaml.load(m[1]) || {}; } catch { continue; }

    const type = fm.type;
    const title = fm.title || path.basename(file);
    if (PROFILE_FILTER && !title.includes(PROFILE_FILTER)) continue;

    let panel = null;
    if (type === 'politician' || type === 'state-politician') {
      const candIds = [fm['fec-candidate-id'], fm['fec-senate-id'], fm['fec-presidential-id']].filter(Boolean);
      for (const id of candIds) {
        const p = renderPoliticianPanel(id, idx);
        if (p) { panel = p; break; }
      }
    }
    // TODO: donor / pac / corporation rendering — next iteration
    scanned++;

    if (!panel) { nodata++; continue; }

    if (!WRITE) {
      if (VERBOSE) console.log(`  [would inject] ${path.relative(ROOT, file)}`);
      injected++;
      continue;
    }

    const changed = injectPanel(file, panel);
    if (changed) { injected++; if (VERBOSE) console.log(`  [injected] ${path.relative(ROOT, file)}`); }
    else skipped++;
  }

  console.log(`\nResults: scanned=${scanned}, ${WRITE ? 'injected' : 'would-inject'}=${injected}, unchanged=${skipped}, no-fec-data=${nodata}`);
  if (!WRITE) console.log('Dry-run. Use --write to apply.');
})().catch(err => { console.error(err); process.exit(1); });
