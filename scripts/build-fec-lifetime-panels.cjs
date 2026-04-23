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

  // Committee name map. Priority (highest → lowest):
  //   1. display_name in data/fec-committee-registry.json (reader-facing
  //      names like "Future Forward USA PAC" for committees whose FEC-
  //      registered name is a cryptic "FF PAC")
  //   2. fec_name in the registry (FEC's official name)
  //   3. name from the raw FEC committee-master.jsonl bulk
  // committee-master.jsonl may be 0-bytes (known state) in which case
  // (1) + (2) carry the load.
  const cmteName = new Map();
  try {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'fec-committee-registry.json'), 'utf-8'));
    for (const [id, v] of Object.entries(reg)) {
      const name = v.display_name || v.fec_name;
      if (name) cmteName.set(id, name);
    }
    console.log(`  committees from registry: ${cmteName.size}`);
  } catch (err) {
    console.log(`  registry unavailable (${err.message}); will rely on committee-master only`);
  }
  // Fall back to the bulk master for anything the registry missed.
  let masterAdded = 0;
  for await (const r of streamJsonl(path.join(FEC, 'committee-master.jsonl'))) {
    if (r.id && r.name && !cmteName.has(r.id)) { cmteName.set(r.id, r.name); masterAdded++; }
  }
  console.log(`  committees total: ${cmteName.size} (+${masterAdded} from master bulk)`);

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

function renderPacPanel(cmteId, idx) {
  const lines = [];

  // Money OUT: this committee's contributions + IE spending, grouped by recipient + bucket
  const out = { direct: new Map(), ieSupport: new Map(), ieOppose: new Map() };
  for (const [candId, donorMap] of idx.candDirect) {
    const hit = donorMap.get(cmteId);
    if (hit) out.direct.set(candId, hit.total);
  }
  for (const [candId, srcMap] of idx.candIeSupport) {
    const hit = srcMap.get(cmteId);
    if (hit) out.ieSupport.set(candId, hit);
  }
  for (const [candId, srcMap] of idx.candIeOppose) {
    const hit = srcMap.get(cmteId);
    if (hit) out.ieOppose.set(candId, hit);
  }

  // Money IN: individual donors funding this committee
  const funders = idx.cmteFunders.get(cmteId) || [];
  funders.sort((a, b) => b.total - a.total);

  const directTotal = [...out.direct.values()].reduce((a, b) => a + b, 0);
  const ieSupportTotal = [...out.ieSupport.values()].reduce((a, b) => a + b, 0);
  const ieOpposeTotal = [...out.ieOppose.values()].reduce((a, b) => a + b, 0);
  const funderTotal = funders.reduce((a, b) => a + b.total, 0);
  if (directTotal + ieSupportTotal + ieOpposeTotal + funderTotal === 0) return null;

  lines.push('');
  lines.push(`*Lifetime federal FEC data, 1982–2026. Anomalous filings excluded.*`);
  lines.push('');

  lines.push('| Channel | Lifetime $ |');
  lines.push('|---|---:|');
  if (funderTotal) lines.push(`| Money in (individual donors ≥$10K) | ${fmtUsd(funderTotal)} |`);
  if (directTotal) lines.push(`| Money out: direct contributions to candidates | ${fmtUsd(directTotal)} |`);
  if (ieSupportTotal) lines.push(`| Money out: IE spending FOR candidates | ${fmtUsd(ieSupportTotal)} |`);
  if (ieOpposeTotal) lines.push(`| Money out: IE spending AGAINST candidates | ${fmtUsd(ieOpposeTotal)} |`);

  // Top individual funders
  if (funders.length) {
    lines.push('');
    lines.push('**Top 10 individual funders (lifetime, ≥$10K each):**');
    lines.push('');
    lines.push('| Donor | Total | Employer |');
    lines.push('|---|---:|---|');
    for (const f of funders.slice(0, 10)) {
      const emp = f.donor_employer || '—';
      lines.push(`| ${f.donor_name} (${f.donor_state}) | ${fmtUsd(f.total)} | ${emp} |`);
    }
  }

  // Top candidate recipients
  if (out.direct.size) {
    const sorted = [...out.direct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    lines.push('');
    lines.push('**Top 10 candidates funded (direct contributions, lifetime):**');
    lines.push('');
    lines.push('| Candidate ID | Total |');
    lines.push('|---|---:|');
    for (const [cid, amt] of sorted) lines.push(`| ${cid} | ${fmtUsd(amt)} |`);
  }

  // Top IE targets
  if (out.ieSupport.size) {
    const sorted = [...out.ieSupport.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    lines.push('');
    lines.push('**Top 5 IE-support targets (candidates this committee spent FOR):**');
    lines.push('');
    lines.push('| Candidate ID | Total |');
    lines.push('|---|---:|');
    for (const [cid, amt] of sorted) lines.push(`| ${cid} | ${fmtUsd(amt)} |`);
  }
  if (out.ieOppose.size) {
    const sorted = [...out.ieOppose.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    lines.push('');
    lines.push('**Top 5 IE-oppose targets (candidates this committee spent AGAINST):**');
    lines.push('');
    lines.push('| Candidate ID | Total |');
    lines.push('|---|---:|');
    for (const [cid, amt] of sorted) lines.push(`| ${cid} | ${fmtUsd(amt)} |`);
  }

  lines.push('');
  lines.push('*Source: FEC bulk filings (pas2 + independent expenditures), 1982–2026.*');
  return lines.join('\n');
}

function renderIndividualDonorPanel(donorNameNorm, donorState, idx) {
  // Find all rows in indiv-by-committee where donor_name matches
  const matches = [];
  for (const [cmteId, funders] of idx.cmteFunders) {
    for (const f of funders) {
      if (f.donor_name === donorNameNorm && (!donorState || f.donor_state === donorState)) {
        matches.push({ ...f, cmte_name: idx.cmteName.get(cmteId) || '(unknown)' });
      }
    }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.total - a.total);

  const total = matches.reduce((a, b) => a + b.total, 0);
  const lines = [''];
  lines.push('*Lifetime federal FEC-tracked political giving, 1982–2026. Individual contributions ≥$10K to committees.*');
  lines.push('');
  lines.push(`**Total tracked: ${fmtUsd(total)} across ${matches.length} committee${matches.length === 1 ? '' : 's'}.**`);
  lines.push('');
  lines.push('**Top 15 committees funded:**');
  lines.push('');
  lines.push('| Committee | Total | First→Last cycle |');
  lines.push('|---|---:|---:|');
  for (const m of matches.slice(0, 15)) {
    lines.push(`| ${m.cmte_name} | ${fmtUsd(m.total)} | ${m.first_cycle}→${m.last_cycle} |`);
  }
  lines.push('');
  lines.push('*Note: dark-money 501(c)(4) contributions and sub-$10K donations are not in FEC bulk data and therefore not in this total.*');
  lines.push('');
  lines.push('*Source: FEC individual contribution filings (indiv), 1982–2026.*');
  return lines.join('\n');
}

function renderPoliticianPanel(candId, idx) {
  const lines = [];
  const direct = idx.candDirect.get(candId);
  const ieS = idx.candIeSupport.get(candId);
  const ieO = idx.candIeOppose.get(candId);
  const party = idx.candParty.get(candId);
  if (!direct && !ieS && !ieO && !party) return null; // no FEC data

  lines.push('');
  lines.push(`*Lifetime federal FEC data, 1982–2026. Anomalous filings excluded.*`);
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
  lines.push('*Source: FEC bulk filings (pas2 + independent expenditures), 1982–2026.*');
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
    } else if (type === 'donor' || type === 'pac' || type === 'corporation') {
      // PAC / committee-based entity — needs fec-committee-id
      const cmteId = fm['fec-committee-id'] || fm['fec-cmte-id'] || fm['cmte-id'];
      if (cmteId) {
        panel = renderPacPanel(cmteId, idx);
      } else if (type === 'donor') {
        // Individual donor — try name match in indiv-by-committee
        // Name format: "LAST, FIRST" uppercase
        const nm = String(fm.title || '').trim();
        if (nm) {
          // Try "LAST, FIRST" (from "First Last" OR "Last, First")
          let candidateNames = [];
          if (nm.includes(',')) {
            candidateNames.push(nm.toUpperCase());
          } else {
            const parts = nm.trim().split(/\s+/);
            if (parts.length >= 2) {
              const last = parts[parts.length - 1].toUpperCase();
              const first = parts[0].toUpperCase();
              candidateNames.push(`${last}, ${first}`);
              // middle initials
              if (parts.length > 2) {
                const mid = parts.slice(1, -1).join(' ').toUpperCase();
                candidateNames.push(`${last}, ${first} ${mid}`);
              }
            }
          }
          for (const n of candidateNames) {
            const p = renderIndividualDonorPanel(n, null, idx);
            if (p) { panel = p; break; }
          }
        }
      }
    }
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
