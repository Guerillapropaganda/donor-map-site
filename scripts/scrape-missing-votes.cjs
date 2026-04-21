#!/usr/bin/env node
/**
 * scrape-missing-votes.cjs
 *
 * Backfills the chamber-asymmetric voting-record gaps:
 *   - 115th House (2017-2018) — 0 votes currently
 *   - 116th House (2019-2020) — 0 votes currently
 *   - 117th House (2021-2022) — 31 votes currently (thin)
 *   - 117th Senate (2021-2022) — 0 votes currently
 *
 * Source endpoints (no API key, no login, no bulk download):
 *   House:  https://clerk.house.gov/evs/{year}/roll{NNN}.xml
 *   Senate: https://www.senate.gov/legislative/LIS/roll_call_votes/
 *           vote{cong}{sess}/vote_{cong}_{sess}_{NNNNN}.xml
 *
 * Safety: APPEND-ONLY. Reads existing vote_ids from data/votes.jsonl,
 * skips any we already have, appends new records as one JSON-per-line.
 * Never truncates the existing file. A mid-run crash loses nothing;
 * rerun picks up where it left off.
 *
 * Usage:
 *   node scripts/scrape-missing-votes.cjs                # dry run
 *   node scripts/scrape-missing-votes.cjs --write        # append
 *   node scripts/scrape-missing-votes.cjs --congress 117 --chamber senate --write
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const VOTES_FILE = path.join(ROOT, 'data', 'votes.jsonl');
const POSITIONS_FILE = path.join(ROOT, 'data', 'legislator-positions.jsonl');
const WRITE = process.argv.includes('--write');
const THROTTLE_MS = 400;

function argVal(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

// Default backfill targets: the known gaps from the 2026-04-20 audit.
// Each target is {congress, session, chamber, year(s)}.
function defaultTargets() {
  const t = [];
  // House: years map to congress-session pairs (1st session = odd year, 2nd = even).
  t.push({ congress: 115, session: 1, chamber: 'house', year: 2017 });
  t.push({ congress: 115, session: 2, chamber: 'house', year: 2018 });
  t.push({ congress: 116, session: 1, chamber: 'house', year: 2019 });
  t.push({ congress: 116, session: 2, chamber: 'house', year: 2020 });
  t.push({ congress: 117, session: 1, chamber: 'house', year: 2021 });
  t.push({ congress: 117, session: 2, chamber: 'house', year: 2022 });
  // Senate: 117 is the gap.
  t.push({ congress: 117, session: 1, chamber: 'senate' });
  t.push({ congress: 117, session: 2, chamber: 'senate' });
  return t;
}

// Optional narrow mode via CLI.
const FILTER_CONG = argVal('--congress') ? Number(argVal('--congress')) : null;
const FILTER_CHAMBER = argVal('--chamber');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function httpsGet(url, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs, headers: { 'User-Agent': 'thedonormap-vote-backfill/1.0' } }, (res) => {
      if (res.statusCode === 404) { res.resume(); resolve({ status: 404, body: null }); return; }
      if (res.statusCode >= 400) { res.resume(); resolve({ status: res.statusCode, body: null }); return; }
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: 200, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`timeout ${url}`)); });
  });
}

function extract(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

// ─── House ────────────────────────────────────────────────────────────
// Parse clerk.house.gov roll-call XML into { vote, positions[] }.
function parseHouseXml(xml, year, congress, session, rollNum) {
  const vm = extract(xml, 'vote-metadata');
  if (!vm) return null;
  const rollcallNum = extract(vm, 'rollcall-num');
  if (!rollcallNum) return null;
  const legisNum = extract(vm, 'legis-num');
  const question = extract(vm, 'vote-question');
  const result = extract(vm, 'vote-result');
  const actionDate = extract(vm, 'action-date');
  const actionTime = extract(vm, 'action-time') || '';
  // Build vote_id in existing format: h{N}-{cong}.{sess} — N is the roll number
  // Existing sample: "h296-118.1" → h + num + - + cong + . + sess
  const voteId = `h${rollcallNum}-${congress}.${session}`;

  // Build bill ref parse (e.g. "H.R. 5376" or "H RES 100" → {type:'HR',number:'5376'})
  let bill = null;
  if (legisNum) {
    const m = legisNum.match(/([HS][.\s]*[JC]?[.\s]*(?:RES|Res|R|J\.\s*Res)?)\s*\.?\s*(\d+)/i);
    if (m) {
      const typeRaw = m[1].toUpperCase().replace(/[^A-Z]/g, '');
      const typeMap = { HR: 'HR', HRES: 'HRES', HJRES: 'HJRES', HCONRES: 'HCONRES', S: 'S', SRES: 'SRES', SJRES: 'SJRES', SCONRES: 'SCONRES' };
      bill = typeMap[typeRaw] ? { type: typeMap[typeRaw], number: m[2], congress: Number(congress) } : null;
    }
  }

  // Date: clerk uses "3-Jan-2017". Parse to ISO.
  let isoDate = null;
  if (actionDate) {
    const d = new Date(`${actionDate} ${actionTime}`);
    if (!isNaN(d)) isoDate = d.toISOString();
  }

  const vote = {
    vote_id: voteId,
    congress: Number(congress),
    session: Number(session),
    chamber: 'house',
    rc_number: Number(rollcallNum),
    date: isoDate,
    question,
    result,
    bill,
    amendment: null,
    source_url: `https://clerk.house.gov/evs/${year}/roll${String(rollNum).padStart(3, '0')}.xml`,
    legislation_url: null,
  };

  // Positions: <recorded-vote><legislator name-id="X">Name</legislator><vote>Aye</vote></recorded-vote>
  const positions = [];
  const re = /<recorded-vote>([\s\S]*?)<\/recorded-vote>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const rec = m[1];
    const bg = (rec.match(/name-id="([^"]+)"/) || [])[1];
    const party = (rec.match(/party="([^"]+)"/) || [])[1];
    const pos = extract(rec, 'vote');
    if (!bg || !pos) continue;
    positions.push({ vote_id: voteId, bioguide: bg, position: pos, party: party || null });
  }
  return { vote, positions };
}

// ─── Senate ───────────────────────────────────────────────────────────
// senate.gov uses LIS IDs (S354). We need LIS → bioguide map.
// The existing ingest-congress-votes.cjs builds this from
// bulk legislators YAML. Reuse the same map.
function buildLisToBioguide() {
  const yaml = require('js-yaml');
  const map = new Map();
  for (const f of ['C:/donor-map-data/bulk/legislators-current.yaml', 'C:/donor-map-data/bulk/legislators-historical.yaml']) {
    if (!fs.existsSync(f)) continue;
    try {
      const docs = yaml.load(fs.readFileSync(f, 'utf-8'));
      for (const leg of docs) {
        const lis = leg?.id?.lis;
        const bg = leg?.id?.bioguide;
        if (lis && bg) map.set(lis, bg);
      }
    } catch {}
  }
  return map;
}

function parseSenateXml(xml, congress, session, voteNum, lisToBg) {
  const congressXml = extract(xml, 'congress');
  const sessionXml = extract(xml, 'session');
  const num = extract(xml, 'vote_number') || String(voteNum);
  const date = extract(xml, 'vote_date');
  const question = extract(xml, 'vote_question_text') || extract(xml, 'question');
  const result = extract(xml, 'vote_result') || extract(xml, 'vote_result_text');
  const voteId = `s${Number(num)}-${congress}.${session}`;

  const vote = {
    vote_id: voteId,
    congress: Number(congressXml || congress),
    session: Number(sessionXml || session),
    chamber: 'senate',
    rc_number: Number(num),
    date,
    question,
    result,
    bill: null, // senate XML doesn't cleanly surface a bill ref
    amendment: null,
    source_url: `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${String(voteNum).padStart(5, '0')}.xml`,
  };

  const positions = [];
  const re = /<member>([\s\S]*?)<\/member>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const mx = m[1];
    const lis = extract(mx, 'lis_member_id');
    const pos = extract(mx, 'vote_cast');
    const party = extract(mx, 'party');
    if (!lis || !pos) continue;
    const bg = lisToBg.get(lis);
    if (!bg) continue; // skip if we can't map — rare
    positions.push({ vote_id: voteId, bioguide: bg, position: pos, party: party || null });
  }
  return { vote, positions };
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`[scrape-missing-votes] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);

  // Load existing vote_ids to skip.
  const haveVotes = new Set();
  if (fs.existsSync(VOTES_FILE)) {
    const rl = readline.createInterface({ input: fs.createReadStream(VOTES_FILE) });
    for await (const l of rl) {
      if (!l.trim()) continue;
      try { const v = JSON.parse(l); if (v.vote_id) haveVotes.add(v.vote_id); } catch {}
    }
  }
  console.log(`  have ${haveVotes.size} existing votes`);

  const lisToBg = buildLisToBioguide();
  console.log(`  LIS→bioguide map: ${lisToBg.size} senators`);

  // Open append streams (only in WRITE mode).
  let voteStream = null, posStream = null;
  if (WRITE) {
    voteStream = fs.createWriteStream(VOTES_FILE, { flags: 'a' });
    posStream = fs.createWriteStream(POSITIONS_FILE, { flags: 'a' });
  }

  const targets = defaultTargets().filter((t) => {
    if (FILTER_CONG && t.congress !== FILTER_CONG) return false;
    if (FILTER_CHAMBER && t.chamber !== FILTER_CHAMBER) return false;
    return true;
  });

  let totalNewVotes = 0, totalNewPositions = 0, totalSkipped = 0, totalHttpErrors = 0;

  for (const target of targets) {
    console.log(`\n=== ${target.chamber} ${target.congress}/${target.session} ${target.year ? '(' + target.year + ')' : ''} ===`);
    let newThisTarget = 0, consecutive404 = 0;
    // Probe up to 1000 rolls. Stop after 10 consecutive 404s (past end).
    for (let n = 1; n <= 1000; n++) {
      if (consecutive404 >= 10) break;
      const url = target.chamber === 'house'
        ? `https://clerk.house.gov/evs/${target.year}/roll${String(n).padStart(3, '0')}.xml`
        : `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${target.congress}${target.session}/vote_${target.congress}_${target.session}_${String(n).padStart(5, '0')}.xml`;

      const voteIdGuess = target.chamber === 'house'
        ? `h${n}-${target.congress}.${target.session}`
        : `s${n}-${target.congress}.${target.session}`;
      if (haveVotes.has(voteIdGuess)) { totalSkipped++; continue; }

      let res;
      try { res = await httpsGet(url); }
      catch (e) { console.log(`    ${voteIdGuess} fetch error: ${e.message}`); totalHttpErrors++; await sleep(THROTTLE_MS); continue; }

      if (res.status === 404) { consecutive404++; await sleep(100); continue; }
      if (res.status !== 200) { console.log(`    ${voteIdGuess} http ${res.status}`); totalHttpErrors++; await sleep(THROTTLE_MS); continue; }

      consecutive404 = 0;
      const parsed = target.chamber === 'house'
        ? parseHouseXml(res.body, target.year, target.congress, target.session, n)
        : parseSenateXml(res.body, target.congress, target.session, n, lisToBg);
      if (!parsed || !parsed.vote) { await sleep(THROTTLE_MS); continue; }
      if (haveVotes.has(parsed.vote.vote_id)) { totalSkipped++; await sleep(THROTTLE_MS); continue; }

      if (WRITE) {
        voteStream.write(JSON.stringify(parsed.vote) + '\n');
        for (const p of parsed.positions) posStream.write(JSON.stringify(p) + '\n');
      }
      haveVotes.add(parsed.vote.vote_id);
      totalNewVotes++;
      newThisTarget++;
      totalNewPositions += parsed.positions.length;
      if (newThisTarget % 25 === 0) console.log(`    progress: +${newThisTarget} new (${parsed.vote.vote_id}, ${parsed.positions.length} positions)`);
      await sleep(THROTTLE_MS);
    }
    console.log(`  total new: ${newThisTarget}`);
  }

  if (WRITE) { voteStream.end(); posStream.end(); }

  console.log(`\n=== summary ===`);
  console.log(`  new votes:     ${totalNewVotes.toLocaleString()}`);
  console.log(`  new positions: ${totalNewPositions.toLocaleString()}`);
  console.log(`  skipped (already had): ${totalSkipped}`);
  console.log(`  http errors:   ${totalHttpErrors}`);
  if (!WRITE) console.log('\n  rerun with --write to append.');
}

main().catch((e) => { console.error(e); process.exit(1); });
