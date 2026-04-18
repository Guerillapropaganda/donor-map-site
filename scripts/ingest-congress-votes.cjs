#!/usr/bin/env node
/**
 * ingest-congress-votes.cjs
 *
 * Pulls roll-call vote data for the House (Congress.gov API) and Senate
 * (senate.gov XML feed) and normalizes into:
 *   data/votes.jsonl                         — one row per roll call
 *   data/legislator-votes/{bioguide}.jsonl   — per-member positions
 *
 * Raw responses cached (gitignored) to data/bulk/votes/{chamber}/{congress}-{session}/
 * so --resume runs only fetch what's new.
 *
 * Senate XML uses LIS member IDs; we resolve LIS → bioguide via
 * data/legislator-registry.jsonl (built by ingest-unitedstates-legislators.cjs).
 * Senate votes whose member cannot be resolved to a bioguide are skipped and
 * counted in the `unresolved_senate_members` stat.
 *
 * Flags:
 *   --congress 118,119          comma-separated (default: 118,119)
 *   --chamber house|senate|both default: both
 *   --limit N                   stop after N votes per (chamber,congress,session)
 *   --dry-run                   discover + probe only, no fetch, no writes
 *   --resume                    skip vote IDs already present in votes.jsonl
 *   --throttle-ms N             delay between HTTP calls (default 250)
 *
 * Requires CONGRESS_API_KEY in .env.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const BULK_DIR = path.join(ROOT, 'data', 'bulk', 'votes');
const VOTES_OUT = path.join(ROOT, 'data', 'votes.jsonl');
const POSITIONS_OUT = path.join(ROOT, 'data', 'legislator-positions.jsonl');
const REGISTRY_PATH = path.join(ROOT, 'data', 'legislator-registry.jsonl');

// Load Congress.gov key — walks up looking for .env and ops/.env.local, checks
// both CONGRESS_API_KEY and CONGRESSAPI (historical name drift across env files).
function loadEnv() {
  const found = {};
  let dir = ROOT;
  for (let i = 0; i < 6; i++) {
    for (const rel of ['.env', 'ops/.env.local']) {
      const p = path.join(dir, rel);
      if (fs.existsSync(p)) {
        for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
          const m = line.match(/^([A-Z_]+)=(.*)$/);
          if (m) found[m[1]] = m[2].trim();
        }
      }
    }
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return found;
}
const ENV = loadEnv();
let API_KEY = process.env.CONGRESS_API_KEY || ENV.CONGRESS_API_KEY || ENV.CONGRESSAPI;
if (API_KEY === 'DEMO_KEY') API_KEY = ENV.CONGRESSAPI || null; // prefer real key over placeholder
if (!API_KEY || API_KEY === 'DEMO_KEY') {
  console.error('[fatal] CONGRESS_API_KEY missing or DEMO_KEY in .env');
  process.exit(1);
}

// Parse args
function parseArgs(argv) {
  const flags = new Set();
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { opts[a] = next; i++; }
      else { flags.add(a); }
    }
  }
  return { flags, opts };
}
const args = parseArgs(process.argv.slice(2));
const DRY_RUN = args.flags.has('--dry-run');
const RESUME = args.flags.has('--resume');
const CONGRESSES = (args.opts['--congress'] || '118,119').split(',').map(n => parseInt(n, 10));
const CHAMBER_FILTER = args.opts['--chamber'] || 'both';
const LIMIT = args.opts['--limit'] ? parseInt(args.opts['--limit'], 10) : Infinity;
const THROTTLE_MS = args.opts['--throttle-ms'] ? parseInt(args.opts['--throttle-ms'], 10) : 250;

const SESSION_YEARS = {
  118: { 1: 2023, 2: 2024 },
  119: { 1: 2025, 2: 2026 },
};

// HTTP helpers
let lastReq = 0;
async function throttle() {
  const wait = Math.max(0, THROTTLE_MS - (Date.now() - lastReq));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastReq = Date.now();
}
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TheDonorMap/1.0 (thedonormap.org) votes-ingest' } }, (res) => {
      if (res.statusCode === 404) { res.resume(); return resolve({ status: 404, body: null }); }
      if (res.statusCode === 429) { res.resume(); return reject(new Error(`HTTP 429 rate-limited: ${url}`)); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}: ${url}`)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: 200, body: Buffer.concat(chunks).toString('utf-8') }));
    }).on('error', reject);
  });
}
async function fetchJson(url) {
  await throttle();
  const { body } = await httpGet(url);
  return JSON.parse(body);
}
async function fetchText(url) {
  await throttle();
  const { status, body } = await httpGet(url);
  if (status === 404) return null;
  return body;
}
function cachePath(chamber, congress, session, voteNumber, ext) {
  return path.join(BULK_DIR, chamber, `${congress}-${session}`, `${voteNumber}.${ext}`);
}
function writeCache(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
}
function readCache(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
}

// LIS → bioguide registry for Senate
function loadLisMap() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`[fatal] registry missing at ${REGISTRY_PATH} — run ingest-unitedstates-legislators.cjs first`);
    process.exit(1);
  }
  const map = new Map();
  for (const line of fs.readFileSync(REGISTRY_PATH, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    if (r.ids && r.ids.lis) map.set(String(r.ids.lis), r.bioguide);
  }
  return map;
}

// ─── House ingest ─────────────────────────────────────────

async function listHouseVotes(congress, session) {
  const out = [];
  let offset = 0;
  const limit = 250;
  while (true) {
    const url = `https://api.congress.gov/v3/house-vote/${congress}/${session}?api_key=${API_KEY}&format=json&limit=${limit}&offset=${offset}`;
    const resp = await fetchJson(url);
    const votes = resp.houseRollCallVotes || [];
    out.push(...votes);
    if (!resp.pagination || !resp.pagination.next || votes.length === 0) break;
    offset += limit;
  }
  return out;
}

async function fetchHouseMembers(congress, session, rcNumber) {
  const cp = cachePath('house', congress, session, rcNumber, 'members.json');
  if (RESUME) {
    const cached = readCache(cp);
    if (cached) return JSON.parse(cached);
  }
  const url = `https://api.congress.gov/v3/house-vote/${congress}/${session}/${rcNumber}/members?api_key=${API_KEY}&format=json&limit=500`;
  await throttle();
  const { body } = await httpGet(url);
  if (!DRY_RUN) writeCache(cp, body);
  return JSON.parse(body);
}

function normalizeHouseVote(v) {
  const voteId = `h${v.rollCallNumber}-${v.congress}.${v.sessionNumber}`;
  let bill = null;
  if (v.legislationType && v.legislationNumber) {
    bill = { type: v.legislationType, number: v.legislationNumber, congress: v.congress };
  }
  let amendment = null;
  if (v.amendmentType && v.amendmentNumber) {
    amendment = { type: v.amendmentType, number: v.amendmentNumber, congress: v.congress };
  }
  return {
    vote_id: voteId,
    congress: v.congress,
    session: v.sessionNumber,
    chamber: 'house',
    rc_number: v.rollCallNumber,
    date: v.startDate || null,
    question: v.voteType || null,
    result: v.result || null,
    bill,
    amendment,
    source_url: v.sourceDataURL || null,
    legislation_url: v.legislationUrl || null,
  };
}

function normalizeHousePositions(membersResp, voteId) {
  const results = (membersResp.houseRollCallVoteMemberVotes && membersResp.houseRollCallVoteMemberVotes.results) || [];
  return results
    .filter(m => m.bioguideID)
    .map(m => ({
      vote_id: voteId,
      bioguide: m.bioguideID,
      position: m.voteCast,
      party: m.voteParty || null,
      state: m.voteState || null,
    }));
}

// ─── Senate ingest ─────────────────────────────────────────

async function listSenateVotes(congress, session) {
  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.xml`;
  const xml = await fetchText(url);
  if (!xml) return [];
  const votes = [];
  const voteRe = /<vote>([\s\S]*?)<\/vote>/g;
  let m;
  while ((m = voteRe.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => { const mm = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)); return mm ? mm[1].trim() : null; };
    const vn = get('vote_number');
    if (!vn) continue;
    votes.push({
      vote_number: parseInt(vn, 10),
      vote_date: get('vote_date'),
      issue: get('issue'),
      question: get('question'),
      result: get('result'),
      title: get('title'),
    });
  }
  return votes;
}

async function fetchSenateVote(congress, session, voteNumber) {
  const cp = cachePath('senate', congress, session, voteNumber, 'xml');
  if (RESUME) {
    const cached = readCache(cp);
    if (cached) return cached;
  }
  const padded = String(voteNumber).padStart(5, '0');
  const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`;
  const body = await fetchText(url);
  if (body && !DRY_RUN) writeCache(cp, body);
  return body;
}

function parseSenateVote(xml, congress, session, voteNumber) {
  if (!xml) return null;
  const get = (tag) => { const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)); return m ? m[1].trim() : null; };
  const vote_id = `s${voteNumber}-${congress}.${session}`;
  let bill = null;
  const docType = get('document_type');
  const docNumber = get('document_number');
  if (docType && docNumber) bill = { type: docType, number: docNumber, congress };

  const members = [];
  const re = /<member>([\s\S]*?)<\/member>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const gg = (tag) => { const mm = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)); return mm ? mm[1].trim() : null; };
    members.push({
      lis: gg('lis_member_id'),
      last: gg('last_name'),
      first: gg('first_name'),
      party: gg('party'),
      state: gg('state'),
      position: gg('vote_cast'),
    });
  }
  return {
    vote: {
      vote_id,
      congress,
      session,
      chamber: 'senate',
      rc_number: voteNumber,
      date: get('vote_date'),
      question: get('question') || get('vote_question_text'),
      result: get('vote_result') || get('vote_result_text'),
      bill,
      amendment: null,
      source_url: `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${String(voteNumber).padStart(5, '0')}.htm`,
      legislation_url: null,
    },
    members,
  };
}

// ─── Output helpers ─────────────────────────────────────────

function loadExistingVoteIds() {
  if (!fs.existsSync(VOTES_OUT)) return new Set();
  const s = new Set();
  for (const line of fs.readFileSync(VOTES_OUT, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { s.add(JSON.parse(line).vote_id); } catch { /* skip */ }
  }
  return s;
}

// Buffered writers — Windows appendFileSync-per-legislator is I/O-bound
// (Defender scans each open/close). Write positions to a single JSONL;
// post-ingest splitter script can fan out to per-legislator files.
let _votesFd = null, _posFd = null;
function openStreams() {
  if (_votesFd === null) _votesFd = fs.openSync(VOTES_OUT, 'a');
  if (_posFd === null) _posFd = fs.openSync(POSITIONS_OUT, 'a');
}
function appendVote(vote) {
  openStreams();
  fs.writeSync(_votesFd, JSON.stringify(vote) + '\n');
}
function appendPositions(positions) {
  if (positions.length === 0) return;
  openStreams();
  const chunk = positions.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeSync(_posFd, chunk);
}
process.on('exit', () => {
  if (_votesFd !== null) fs.closeSync(_votesFd);
  if (_posFd !== null) fs.closeSync(_posFd);
});

// ─── Main ─────────────────────────────────────────

(async function main() {
  console.log(`[ingest-congress-votes] ${DRY_RUN ? 'DRY RUN — ' : ''}congresses=${CONGRESSES.join(',')} chamber=${CHAMBER_FILTER} limit=${LIMIT} throttle=${THROTTLE_MS}ms`);

  const lisMap = loadLisMap();
  console.log(`  LIS→bioguide map: ${lisMap.size} senators`);

  const existing = RESUME ? loadExistingVoteIds() : new Set();
  if (RESUME) console.log(`  resume: ${existing.size} vote(s) already in votes.jsonl — will skip`);

  if (!RESUME && !DRY_RUN) {
    if (fs.existsSync(VOTES_OUT)) fs.unlinkSync(VOTES_OUT);
    if (fs.existsSync(POSITIONS_OUT)) fs.unlinkSync(POSITIONS_OUT);
    // also clear old per-legislator dir if it exists from prior runs
    const oldDir = path.join(ROOT, 'data', 'legislator-votes');
    if (fs.existsSync(oldDir)) fs.rmSync(oldDir, { recursive: true, force: true });
  }

  const stats = { house_fetched: 0, senate_fetched: 0, house_skipped: 0, senate_skipped: 0, unresolved_senate_members: 0, errors: 0 };

  for (const congress of CONGRESSES) {
    for (const session of [1, 2]) {
      // House
      if (CHAMBER_FILTER !== 'senate') {
        console.log(`\n=== House ${congress}/${session} ===`);
        try {
          const list = await listHouseVotes(congress, session);
          console.log(`  discovered ${list.length} roll calls`);
          const pending = list.filter(v => !existing.has(`h${v.rollCallNumber}-${congress}.${session}`)).slice(0, LIMIT);
          if (DRY_RUN) { console.log(`  would fetch: ${pending.length}`); continue; }
          for (const v of pending) {
            try {
              const members = await fetchHouseMembers(congress, session, v.rollCallNumber);
              const vote = normalizeHouseVote(v);
              const positions = normalizeHousePositions(members, vote.vote_id);
              appendVote(vote);
              appendPositions(positions);
              stats.house_fetched++;
              if (stats.house_fetched % 25 === 0) process.stdout.write(`  house progress: ${stats.house_fetched}/${pending.length}\r`);
            } catch (e) {
              stats.errors++;
              console.warn(`\n  [err] h${v.rollCallNumber}-${congress}.${session}: ${e.message}`);
            }
          }
          stats.house_skipped += list.length - pending.length;
        } catch (e) {
          console.error(`  house ${congress}/${session} list failed: ${e.message}`);
          stats.errors++;
        }
      }

      // Senate
      if (CHAMBER_FILTER !== 'house') {
        console.log(`\n=== Senate ${congress}/${session} ===`);
        try {
          const list = await listSenateVotes(congress, session);
          console.log(`  discovered ${list.length} roll calls`);
          const pending = list.filter(v => !existing.has(`s${v.vote_number}-${congress}.${session}`)).slice(0, LIMIT);
          if (DRY_RUN) { console.log(`  would fetch: ${pending.length}`); continue; }
          for (const v of pending) {
            try {
              const xml = await fetchSenateVote(congress, session, v.vote_number);
              const parsed = parseSenateVote(xml, congress, session, v.vote_number);
              if (!parsed) { stats.errors++; continue; }
              const positions = [];
              for (const m of parsed.members) {
                const bg = lisMap.get(String(m.lis));
                if (!bg) { stats.unresolved_senate_members++; continue; }
                positions.push({
                  vote_id: parsed.vote.vote_id,
                  bioguide: bg,
                  position: m.position,
                  party: m.party,
                  state: m.state,
                });
              }
              appendVote(parsed.vote);
              appendPositions(positions);
              stats.senate_fetched++;
              if (stats.senate_fetched % 25 === 0) process.stdout.write(`  senate progress: ${stats.senate_fetched}/${pending.length}\r`);
            } catch (e) {
              stats.errors++;
              console.warn(`\n  [err] s${v.vote_number}-${congress}.${session}: ${e.message}`);
            }
          }
          stats.senate_skipped += list.length - pending.length;
        } catch (e) {
          console.error(`  senate ${congress}/${session} list failed: ${e.message}`);
          stats.errors++;
        }
      }
    }
  }

  console.log('\n\n=== DONE ===');
  console.log(`House: fetched ${stats.house_fetched}, skipped ${stats.house_skipped}`);
  console.log(`Senate: fetched ${stats.senate_fetched}, skipped ${stats.senate_skipped}`);
  console.log(`Unresolved Senate members (LIS not in registry): ${stats.unresolved_senate_members}`);
  console.log(`Errors: ${stats.errors}`);
  if (!DRY_RUN) {
    console.log(`\n[out] ${VOTES_OUT}`);
    console.log(`[out] ${POSITIONS_OUT}`);
  }
})().catch(err => {
  console.error(`[fatal] ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
