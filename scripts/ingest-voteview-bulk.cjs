#!/usr/bin/env node
/**
 * ingest-voteview-bulk.cjs
 *
 * One-shot backfill of pre-115th congressional roll-call votes from
 * Voteview (https://voteview.com/data), the UCLA canonical political-
 * science dataset. Fills the gap between the current 115th–119th
 * coverage and historical Congresses profiled in the vault (Obama,
 * Kerry, Panetta, Salazar, Solis, LaHood, Rahm, and any other
 * pre-2017 legislators).
 *
 * Input files (already in data/bulk/):
 *   HSall_members.csv    — icpsr → bioguide_id, state, party_code
 *   HSall_parties.csv    — party_code → party_name
 *   HSall_rollcalls.csv  — one row per roll call
 *   HSall_votes.csv      — one row per member-vote pair (~26M rows)
 *
 * Output:
 *   data/votes.jsonl                          (appended)
 *   data/legislator-positions/{108..114}.jsonl (one file per congress)
 *
 * Scope: Congresses 108–114 only (Jan 2003 – Jan 2017). Existing 115-119
 * data from clerk.house.gov / senate.gov has richer `question` text and
 * is NOT touched by this script.
 *
 * Schema matches existing JSONL shape:
 *   votes.jsonl:      {vote_id, congress, session, chamber, rc_number,
 *                      date, question, result, bill, amendment,
 *                      source_url, legislation_url}
 *   positions/*.jsonl: {vote_id, bioguide, position, party, state}
 *
 * Usage:
 *   node scripts/ingest-voteview-bulk.cjs              # dry-run
 *   node scripts/ingest-voteview-bulk.cjs --apply      # actually write
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const BULK = path.join(ROOT, 'data', 'bulk');
const POSITIONS_DIR = path.join(ROOT, 'data', 'legislator-positions');
const VOTES_FILE = path.join(ROOT, 'data', 'votes.jsonl');

const CONGRESS_MIN = 108;
const CONGRESS_MAX = 114;

// cast_code values per Voteview documentation. 0 / blank = not a
// member of the chamber on the date of the roll call; skip those.
const CAST_CODES = {
  1: 'Yea', 2: 'Yea', 3: 'Yea',
  4: 'Nay', 5: 'Nay', 6: 'Nay',
  7: 'Present', 8: 'Present',
  9: 'Not Voting',
};

// Voteview party_code to single-letter code matching existing rows.
// 100 = Democrat, 200 = Republican, 328 = Independent. Everything else
// (Whig, Progressive, Populist, etc) projects to the first letter of
// the party name from HSall_parties.csv, or 'O' as last resort.
const PARTY_CODE = { 100: 'D', 200: 'R', 328: 'I' };

// Voteview writes icpsr as float ("10713.0") in Congresses 114+ and int
// ("10713") in earlier ones — same id, different serialization. Normalize
// by stripping a trailing ".0" so the join keys line up across congresses.
function normalizeIcpsr(s) {
  if (!s) return s;
  return String(s).replace(/\.0+$/, '');
}

// Robust CSV row parser (handles quoted fields with embedded commas).
function parseCSVLine(line) {
  const out = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function* csvRows(file) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  let header = null;
  for await (const raw of rl) {
    if (!raw) continue;
    const cells = parseCSVLine(raw);
    if (!header) { header = cells; continue; }
    const obj = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = cells[i];
    yield obj;
  }
}

// Voteview bill_number is a compact string like "HR2", "S123", "HRES15",
// "HJRES5". Split into {type, number} for our schema.
function parseBill(billStr) {
  if (!billStr) return null;
  const m = billStr.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return null;
  return { type: m[1].toUpperCase(), number: m[2] };
}

function voteIdFor(congress, chamber, rc) {
  const ch = chamber.toLowerCase().startsWith('h') ? 'h' : 's';
  // Voteview doesn't split session; we estimate from date later, but
  // for vote_id we default to session=1; the position rows carry the
  // same vote_id so joins stay consistent.
  return `${ch}${rc}-${congress}.1`;
}

function sessionFromDate(dateStr, congress) {
  // Congress N runs two years: year N*2+1787 (approx). Session 1 = first
  // year, session 2 = second year. Cheap heuristic from ISO date.
  if (!dateStr) return 1;
  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return 1;
  const firstYear = 1789 + (congress - 1) * 2;
  return year <= firstYear ? 1 : 2;
}

async function loadMembers() {
  // icpsr → { bioguide, state_abbrev }. Filter to House/Senate members
  // with a bioguide. Same ICPSR id may appear in multiple congresses;
  // first hit is fine, bioguide is stable across terms.
  const out = new Map();
  for await (const r of csvRows(path.join(BULK, 'HSall_members.csv'))) {
    if (r.chamber !== 'House' && r.chamber !== 'Senate') continue;
    if (!r.bioguide_id) continue;
    const icpsr = normalizeIcpsr(r.icpsr);
    if (!out.has(icpsr)) {
      out.set(icpsr, { bioguide: r.bioguide_id, state: r.state_abbrev });
    }
  }
  return out;
}

async function loadPartyNames() {
  // (congress, chamber, party_code) → short letter. Use preset map for
  // the main three and first-letter fallback otherwise.
  const out = new Map();
  for await (const r of csvRows(path.join(BULK, 'HSall_parties.csv'))) {
    const key = `${r.congress}|${r.chamber}|${r.party_code}`;
    const preset = PARTY_CODE[Number(r.party_code)];
    out.set(key, preset || (r.party_name ? r.party_name.charAt(0).toUpperCase() : 'O'));
  }
  return out;
}

// member-party lookup: icpsr + congress → party_code. Built on the fly
// from the members CSV because the main `members` map dedupes across
// congresses and loses per-congress party info.
async function loadMemberParty() {
  const out = new Map();
  for await (const r of csvRows(path.join(BULK, 'HSall_members.csv'))) {
    if (r.chamber !== 'House' && r.chamber !== 'Senate') continue;
    if (!r.bioguide_id) continue;
    out.set(`${normalizeIcpsr(r.icpsr)}|${r.congress}|${r.chamber}`, r.party_code);
  }
  return out;
}

async function main() {
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} (pass --apply to write)`);
  console.log(`range: Congress ${CONGRESS_MIN}–${CONGRESS_MAX}\n`);

  console.log('loading members + parties...');
  const [members, memberParty, parties] = await Promise.all([
    loadMembers(),
    loadMemberParty(),
    loadPartyNames(),
  ]);
  console.log(`  members with bioguide: ${members.size}`);
  console.log(`  party rows:            ${parties.size}\n`);

  // Stream rollcalls → build vote_id → {chamber, congress, rc, date, session} map
  // Emit votes.jsonl rows for 108-114.
  console.log('streaming rollcalls...');
  const rollcalls = new Map(); // vote_id → metadata (for position rows' join)
  const voteOut = []; // votes.jsonl rows
  let rcTotal = 0, rcInRange = 0;
  for await (const r of csvRows(path.join(BULK, 'HSall_rollcalls.csv'))) {
    rcTotal++;
    const congress = Number(r.congress);
    if (congress < CONGRESS_MIN || congress > CONGRESS_MAX) continue;
    if (r.chamber !== 'House' && r.chamber !== 'Senate') continue;
    rcInRange++;
    const rc = Number(r.rollnumber);
    const session = sessionFromDate(r.date, congress);
    const chamberLower = r.chamber.toLowerCase();
    const vote_id = voteIdFor(congress, r.chamber, rc);
    const bill = parseBill(r.bill_number);
    const meta = {
      vote_id,
      congress,
      session,
      chamber: chamberLower,
      rc_number: rc,
      date: r.date || null,
      question: r.vote_question || r.vote_desc || 'Recorded Vote',
      result: r.vote_result || null,
      bill,
      amendment: null,
      source_url: `https://voteview.com/rollcall/${r.chamber === 'House' ? 'H' : 'S'}${congress}${String(rc).padStart(4, '0')}`,
      legislation_url: null,
    };
    rollcalls.set(`${congress}|${r.chamber}|${rc}`, vote_id);
    voteOut.push(meta);
  }
  console.log(`  total rollcalls scanned: ${rcTotal}`);
  console.log(`  in range (${CONGRESS_MIN}-${CONGRESS_MAX}): ${rcInRange}\n`);

  // Stream votes.csv → filter to in-range congresses → emit per-congress positions.
  console.log('streaming member votes (this is the big file, ~26M rows)...');
  const perCongress = new Map(); // congress → position rows
  for (let c = CONGRESS_MIN; c <= CONGRESS_MAX; c++) perCongress.set(c, []);
  let vTotal = 0, vKept = 0, vSkippedNoBio = 0, vSkippedNoCast = 0;
  const t0 = Date.now();
  for await (const r of csvRows(path.join(BULK, 'HSall_votes.csv'))) {
    vTotal++;
    if (vTotal % 1_000_000 === 0) console.log(`  ... ${vTotal.toLocaleString()} rows scanned (${Math.round((Date.now()-t0)/1000)}s)`);
    const congress = Number(r.congress);
    if (congress < CONGRESS_MIN || congress > CONGRESS_MAX) continue;
    if (r.chamber !== 'House' && r.chamber !== 'Senate') continue;
    const vote_id = rollcalls.get(`${congress}|${r.chamber}|${r.rollnumber}`);
    if (!vote_id) continue; // rollcall filtered out (chamber mismatch edge cases)
    const icpsr = normalizeIcpsr(r.icpsr);
    const member = members.get(icpsr);
    if (!member) { vSkippedNoBio++; continue; }
    const position = CAST_CODES[Number(r.cast_code)];
    if (!position) { vSkippedNoCast++; continue; }
    const partyCode = memberParty.get(`${icpsr}|${congress}|${r.chamber}`);
    const party = parties.get(`${congress}|${r.chamber}|${partyCode}`) || 'O';
    perCongress.get(congress).push({
      vote_id,
      bioguide: member.bioguide,
      position,
      party,
      state: member.state || '',
    });
    vKept++;
  }
  console.log(`  rows scanned: ${vTotal.toLocaleString()}`);
  console.log(`  rows kept:    ${vKept.toLocaleString()}`);
  console.log(`  skipped (no bioguide for icpsr): ${vSkippedNoBio.toLocaleString()}`);
  console.log(`  skipped (cast_code=0/unknown):   ${vSkippedNoCast.toLocaleString()}\n`);

  console.log('per-congress position counts:');
  for (const [c, rows] of perCongress) {
    console.log(`  ${c}: ${rows.length.toLocaleString()}`);
  }

  if (!APPLY) { console.log('\n(dry-run — no files written)'); return; }

  // Write per-congress position files + append to votes.jsonl.
  if (!fs.existsSync(POSITIONS_DIR)) fs.mkdirSync(POSITIONS_DIR, { recursive: true });
  for (const [c, rows] of perCongress) {
    const out = path.join(POSITIONS_DIR, `${c}.jsonl`);
    if (fs.existsSync(out)) {
      console.log(`WARN: ${out} already exists — refusing to overwrite. Delete it first if you want to rewrite.`);
      continue;
    }
    const payload = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(out, payload);
    const size = (fs.statSync(out).size / 1024 / 1024).toFixed(1);
    console.log(`  wrote ${out} (${rows.length.toLocaleString()} rows, ${size} MB)`);
  }

  // Append new vote metadata to votes.jsonl.
  const existing = fs.existsSync(VOTES_FILE) ? fs.readFileSync(VOTES_FILE, 'utf-8') : '';
  const existingIds = new Set();
  for (const line of existing.split('\n')) {
    if (!line.trim()) continue;
    try { const v = JSON.parse(line); if (v.vote_id) existingIds.add(v.vote_id); } catch {}
  }
  const toAppend = voteOut.filter((v) => !existingIds.has(v.vote_id));
  if (toAppend.length) {
    fs.appendFileSync(VOTES_FILE, toAppend.map((v) => JSON.stringify(v)).join('\n') + '\n');
    console.log(`  appended ${toAppend.length.toLocaleString()} vote records to votes.jsonl`);
  } else {
    console.log(`  votes.jsonl: no new vote records (all ${voteOut.length} vote_ids already present)`);
  }

  console.log('\ndone. Restart the ops server to pick up the new positions files.');
}

main().catch((e) => { console.error(e); process.exit(1); });
