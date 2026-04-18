#!/usr/bin/env node
/**
 * fec-cross-check.cjs
 *
 * Query-time validation of the FEC derived stores against known public
 * reporting. Prints our numbers for well-documented donor relationships
 * so they can be compared against OpenSecrets / Brennan Center / AIPAC
 * Tracker / etc.
 *
 * Use: node scripts/fec-cross-check.cjs
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const ROOT = 'C:\\donor-map-data\\fec';

async function streamJsonl(file, filter) {
  const rows = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(ROOT, file), { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    try { const r = JSON.parse(line); if (filter(r)) rows.push(r); } catch {}
  }
  return rows;
}

// Load committee name map
async function loadCmteNames() {
  const map = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(ROOT, 'committee-master.jsonl'), { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    try { const r = JSON.parse(line); if (r.id && r.name) map.set(r.id, r.name); } catch {}
  }
  return map;
}

async function main() {
  console.log('Loading committee names...');
  const cmteName = await loadCmteNames();
  console.log(`  ${cmteName.size} committees\n`);

  // ─── Test 1: Musk → every candidate (via indiv → super-PACs he funded) ──
  console.log('═════════════════════════════════════════════════');
  console.log('TEST 1: Elon Musk total contributions (ever)');
  console.log('Public baseline: ~$292M 2024 political spending per OpenSecrets');
  console.log('═════════════════════════════════════════════════');
  const muskRows = await streamJsonl('indiv-by-committee.jsonl',
    (r) => /^MUSK, ELON/.test(r.donor_name) && r.donor_state === 'TX');
  let muskTotal = 0;
  for (const r of muskRows) muskTotal += r.total;
  console.log(`  Our total: $${muskTotal.toLocaleString()} across ${muskRows.length} committees`);
  console.log('  Top 5 committees he funded:');
  muskRows.sort((a, b) => b.total - a.total);
  for (const r of muskRows.slice(0, 5)) {
    console.log(`    $${r.total.toLocaleString().padStart(14)}  ${cmteName.get(r.cmte_id) || r.cmte_id}`);
  }

  // ─── Test 2: Paul Singer (Elliott) ──
  console.log('\n═════════════════════════════════════════════════');
  console.log('TEST 2: Paul Singer (Elliott Management) total');
  console.log('Public baseline: ~$50-100M lifetime Republican giving');
  console.log('═════════════════════════════════════════════════');
  const singerRows = await streamJsonl('indiv-by-committee.jsonl',
    (r) => /^SINGER, PAUL/.test(r.donor_name));
  let singerTotal = 0;
  for (const r of singerRows) singerTotal += r.total;
  console.log(`  Our total: $${singerTotal.toLocaleString()} across ${singerRows.length} committees`);
  for (const r of singerRows.sort((a,b)=>b.total-a.total).slice(0, 5)) {
    console.log(`    $${r.total.toLocaleString().padStart(14)}  ${cmteName.get(r.cmte_id) || r.cmte_id}`);
  }

  // ─── Test 3: Miriam Adelson ──
  console.log('\n═════════════════════════════════════════════════');
  console.log('TEST 3: Miriam Adelson total');
  console.log('Public baseline: ~$100-148M in 2024 alone (Brennan Center)');
  console.log('═════════════════════════════════════════════════');
  const adelsonRows = await streamJsonl('indiv-by-committee.jsonl',
    (r) => /^ADELSON, (MIRIAM|SHELDON)/.test(r.donor_name));
  let adelsonTotal = 0;
  for (const r of adelsonRows) adelsonTotal += r.total;
  console.log(`  Our total (Miriam + Sheldon): $${adelsonTotal.toLocaleString()}`);
  for (const r of adelsonRows.sort((a,b)=>b.total-a.total).slice(0, 7)) {
    console.log(`    $${r.total.toLocaleString().padStart(14)}  ${cmteName.get(r.cmte_id) || r.cmte_id}`);
  }

  // ─── Test 4: UDP (AIPAC's super-PAC) funders ──
  // UDP = United Democracy Project, C00799031
  console.log('\n═════════════════════════════════════════════════');
  console.log('TEST 4: United Democracy Project (AIPAC super-PAC) — top funders');
  console.log('Public baseline: AIPAC directs money to UDP for D-primary IE ops');
  console.log('═════════════════════════════════════════════════');
  const udpRows = await streamJsonl('indiv-by-committee.jsonl',
    (r) => r.cmte_id === 'C00799031');
  udpRows.sort((a, b) => b.total - a.total);
  console.log(`  ${udpRows.length} individuals funded UDP (≥$10K each)`);
  for (const r of udpRows.slice(0, 10)) {
    console.log(`    $${r.total.toLocaleString().padStart(12)}  ${r.donor_name} (${r.donor_state}) — ${r.donor_employer || '?'}`);
  }

  // ─── Test 5: UDP IE spending by target candidate ──
  console.log('\n═════════════════════════════════════════════════');
  console.log('TEST 5: UDP IE spending BY target candidate');
  console.log('═════════════════════════════════════════════════');
  const targets = new Map();
  for (const f of ['pas2-ie-support.jsonl', 'pas2-ie-oppose.jsonl']) {
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(ROOT, f), { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (!line) continue;
      const r = JSON.parse(line);
      if (r.src_cmte_id !== 'C00799031') continue;
      const key = `${r.cand_id}|${f.includes('oppose') ? 'OPPOSE' : 'SUPPORT'}`;
      targets.set(key, (targets.get(key) || 0) + Math.abs(r.amount));
    }
  }
  const udpSorted = [...targets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [key, amt] of udpSorted) {
    const [candId, dir] = key.split('|');
    console.log(`  $${amt.toLocaleString().padStart(12)}  ${dir}  cand=${candId}`);
  }

  // ─── Test 6: Koch network — Freedom Partners / AFP ──
  console.log('\n═════════════════════════════════════════════════');
  console.log('TEST 6: Koch network direct donor (David + Charles Koch)');
  console.log('═════════════════════════════════════════════════');
  const kochRows = await streamJsonl('indiv-by-committee.jsonl',
    (r) => /^KOCH, (CHARLES|DAVID|JULIA)/.test(r.donor_name));
  let kochTotal = 0;
  for (const r of kochRows) kochTotal += r.total;
  console.log(`  Total (Charles + David + Julia Koch): $${kochTotal.toLocaleString()}`);
  for (const r of kochRows.sort((a,b)=>b.total-a.total).slice(0, 5)) {
    console.log(`    $${r.total.toLocaleString().padStart(12)}  ${cmteName.get(r.cmte_id) || r.cmte_id}`);
  }

  console.log('\n═════════════════════════════════════════════════');
  console.log('Now compare these against:');
  console.log('  - OpenSecrets.org top-donor pages');
  console.log('  - Brennan Center for Justice megadonor reports');
  console.log('  - AIPAC Tracker (aipactracker.org) for UDP spending');
  console.log('  - Citizens for Responsibility and Ethics (CREW)');
  console.log('  - ProPublica Election DataBot');
  console.log('═════════════════════════════════════════════════');
}

main().catch(err => { console.error(err); process.exit(1); });
