#!/usr/bin/env node
/**
 * build-voting-record-panels.cjs
 *
 * Injects an "auto:voting-record" auto-block into every politician profile
 * whose frontmatter has a bioguide-id. Panel contents:
 *
 *   - Total roll-call votes cast in current tracked sessions
 *   - Participation rate
 *   - Party-line loyalty % (how often voted with party majority)
 *   - Top deviations from party (most recent N votes where this member
 *     voted opposite their party's majority)
 *
 * Inputs:
 *   data/votes.jsonl            — one row per roll call
 *   data/legislator-positions.jsonl — one row per (vote, legislator, position)
 *
 * Auto-block markers: <!-- auto:voting-record start --> ... end -->
 * Idempotent.
 *
 * Usage:
 *   node scripts/build-voting-record-panels.cjs             # dry-run
 *   node scripts/build-voting-record-panels.cjs --write     # apply
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const VOTES = path.join(ROOT, 'data', 'votes.jsonl');
const POSITIONS = path.join(ROOT, 'data', 'legislator-positions.jsonl');
const PROFILES = path.join(ROOT, 'content', 'Politicians');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');

const BLOCK_START = '<!-- auto:voting-record start -->';
const BLOCK_END = '<!-- auto:voting-record end -->';

function walkMd(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

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

// legislator-positions.jsonl grew past GitHub's 100MB limit after the
// 115-117 vote backfill, so we split it to data/legislator-positions/
// {115,116,117,118,119}.jsonl. This helper prefers the merged file if
// it exists (local / scraper runtime) and falls back to the split
// directory (committed state for fresh clones).
async function* streamPositions() {
  const merged = POSITIONS;
  if (fs.existsSync(merged) && fs.statSync(merged).size > 0) {
    yield* streamJsonl(merged);
    return;
  }
  const splitDir = merged.replace(/\.jsonl$/, '');
  if (!fs.existsSync(splitDir)) return;
  for (const f of fs.readdirSync(splitDir).filter((n) => n.endsWith('.jsonl')).sort()) {
    yield* streamJsonl(path.join(splitDir, f));
  }
}

function isSubstantive(position) {
  return position === 'Aye' || position === 'Yea' || position === 'No' || position === 'Nay';
}

function normalizeVote(p) {
  // Collapse Aye/Yea -> Y, No/Nay -> N
  if (p === 'Aye' || p === 'Yea') return 'Y';
  if (p === 'No' || p === 'Nay') return 'N';
  return null;
}

(async function main() {
  console.log(`[build-voting-record-panels] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // Build index: vote_id -> vote metadata + per-party majority position
  const voteMeta = new Map();
  for await (const v of streamJsonl(VOTES)) {
    voteMeta.set(v.vote_id, { date: v.date, chamber: v.chamber, congress: v.congress, session: v.session, result: v.result, bill: v.bill });
  }
  console.log(`  votes: ${voteMeta.size.toLocaleString()}`);

  // Independents who caucus with one of the major parties. These should
  // be compared against their caucus's majority for party-line loyalty,
  // NOT against a 2-member Independent "caucus" that always contains
  // themselves (which makes every vote count as "with party" by
  // definition). Bernie Sanders and Angus King caucus with Democrats.
  const CAUCUS_MAP = {
    S000033: 'D', // Sanders (I-VT) — caucuses with Democrats
    K000383: 'D', // King (I-ME) — caucuses with Democrats
  };

  // Tally each vote's position by party, plus bioguide -> positions list.
  // We record the LEGAL party from the source (p.party) for display but
  // use a CAUCUS party for majority computation.
  const positionsByVote = new Map(); // vote_id -> { R: {Y, N}, D: {Y, N}, I: {Y, N} }
  const positionsByBio = new Map(); // bioguide -> [{vote_id, position, party, caucus}]
  let posRows = 0;
  for await (const p of streamPositions()) {
    posRows++;
    const norm = normalizeVote(p.position);
    const caucus = CAUCUS_MAP[p.bioguide] || p.party;
    if (!positionsByBio.has(p.bioguide)) positionsByBio.set(p.bioguide, []);
    positionsByBio.get(p.bioguide).push({ vote_id: p.vote_id, position: p.position, norm, party: p.party, caucus });
    if (!norm) continue;
    if (!positionsByVote.has(p.vote_id)) positionsByVote.set(p.vote_id, {});
    const byParty = positionsByVote.get(p.vote_id);
    // Tally under caucus (so Bernie's Nay counts as a Dem-caucus Nay for
    // majority computation). This matches how the DC press treats these
    // independents.
    if (!byParty[caucus]) byParty[caucus] = { Y: 0, N: 0 };
    byParty[caucus][norm]++;
  }
  console.log(`  positions: ${posRows.toLocaleString()}, bioguides: ${positionsByBio.size}`);

  // Party majority per vote
  const partyMajority = new Map(); // vote_id -> { R: 'Y'|'N'|null, D: ..., I: ... }
  for (const [vid, counts] of positionsByVote) {
    const maj = {};
    for (const party of Object.keys(counts)) {
      const { Y = 0, N = 0 } = counts[party];
      if (Y === 0 && N === 0) maj[party] = null;
      else if (Y >= N) maj[party] = Y > N ? 'Y' : null;
      else maj[party] = 'N';
    }
    partyMajority.set(vid, maj);
  }

  // Walk politician profiles
  const files = walkMd(PROFILES);
  let scanned = 0, injected = 0, nodata = 0, nobio = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    let fm;
    try { fm = yaml.load(fmMatch[1]) || {}; } catch { continue; }
    if (fm.type !== 'politician') continue;
    scanned++;

    const bio = fm['bioguide-id'] || fm['bioguide'];
    if (!bio) { nobio++; continue; }

    const positions = positionsByBio.get(bio);
    if (!positions || positions.length === 0) { nodata++; continue; }

    // Parse date from either ISO ("2023-07-13T...") or Senate natural format ("December 19, 2023,  04:47 PM")
    function parseVoteDate(raw) {
      if (!raw) return '';
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10); // ISO
      const m = raw.match(/(\w+ \d+,\s*\d{4})/);
      if (m) { const d = new Date(m[1]); if (!isNaN(d)) return d.toISOString().slice(0, 10); }
      return raw.slice(0, 10);
    }

    // Compute loyalty + deviations (exclude PN = Presidential Nomination votes)
    let substantive = 0, withParty = 0;
    const deviations = [];
    for (const p of positions) {
      if (!p.norm) continue;
      substantive++;
      const maj = partyMajority.get(p.vote_id);
      // Compare against caucus majority, not legal party — so independents
      // who caucus with a major party are measured against that caucus.
      const compareKey = p.caucus || p.party;
      if (!maj || !maj[compareKey]) continue;
      if (p.norm === maj[compareKey]) withParty++;
      else {
        const meta = voteMeta.get(p.vote_id);
        if (meta?.bill?.type === 'PN') continue;
        deviations.push({ vote_id: p.vote_id, position: p.position, party_majority: maj[compareKey], meta, parsedDate: parseVoteDate(meta?.date) });
      }
    }

    const loyalty = substantive > 0 ? ((withParty / substantive) * 100).toFixed(1) : '—';
    const devCount = deviations.length;

    // Sort deviations by parsed date desc
    deviations.sort((a, b) => (b.parsedDate || '').localeCompare(a.parsedDate || ''));

    // Group votes by congress/chamber for summary
    const byChamber = {};
    for (const p of positions) {
      const m = voteMeta.get(p.vote_id);
      if (!m) continue;
      const k = `${m.chamber} ${m.congress}/${m.session}`;
      byChamber[k] = (byChamber[k] || 0) + 1;
    }

    // Derive actual congress range from this legislator's coverage.
    const congressesPresent = new Set();
    for (const p of positions) {
      const m = voteMeta.get(p.vote_id);
      if (m?.congress) congressesPresent.add(Number(m.congress));
    }
    const congressList = [...congressesPresent].sort((a, b) => a - b);
    const congressRange = congressList.length === 0 ? '—' :
      congressList.length === 1 ? `${congressList[0]}th Congress` :
      `${congressList[0]}th–${congressList[congressList.length - 1]}th Congress`;

    // Show caucus note if this legislator's caucus differs from legal party.
    const firstPos = positions.find((p) => p.caucus && p.caucus !== p.party);
    const caucusNote = firstPos
      ? ` Party-line loyalty computed against **${firstPos.caucus === 'D' ? 'Democratic' : firstPos.caucus === 'R' ? 'Republican' : firstPos.caucus} caucus** majority (legislator is Independent but caucuses with that party).`
      : '';

    // Render panel
    const lines = [''];
    lines.push(`*Roll-call vote positions from Congress.gov (House) and senate.gov (Senate), ${congressRange}. Position normalization: Aye/Yea → Y, No/Nay → N. Non-substantive positions (Present / Not Voting) excluded from loyalty math.${caucusNote}*`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|---|---:|');
    lines.push(`| Roll-call votes tracked | ${positions.length.toLocaleString()} |`);
    lines.push(`| Substantive votes (Y/N) | ${substantive.toLocaleString()} |`);
    lines.push(`| Votes with party majority | ${withParty.toLocaleString()} |`);
    lines.push(`| Party-line loyalty | ${loyalty}% |`);
    lines.push(`| Deviations from party | ${devCount.toLocaleString()} |`);
    lines.push('');
    lines.push('**Coverage:**');
    lines.push('');
    for (const [k, v] of Object.entries(byChamber).sort()) {
      lines.push(`- ${k}: ${v} votes`);
    }

    // Editor-pinned votes (frontmatter key_votes: [vote_id, ...]).
    // Show these FIRST in a dedicated section, regardless of deviation
    // status. Journalism-first: the editor's judgment about which votes
    // matter overrides algorithmic top-N.
    const pinnedVotes = [];
    if (Array.isArray(fm.key_votes)) {
      for (const vid of fm.key_votes) {
        const p = positions.find((x) => x.vote_id === vid);
        if (!p) continue;
        const meta = voteMeta.get(vid);
        if (!meta) continue;
        const maj = partyMajority.get(vid);
        const compareKey = p.caucus || p.party;
        const partyMaj = maj?.[compareKey] || '—';
        pinnedVotes.push({ vote_id: vid, position: p.position, party_majority: partyMaj, meta, parsedDate: parseVoteDate(meta?.date) });
      }
    }
    if (pinnedVotes.length > 0) {
      lines.push('');
      lines.push(`**Signature votes (${pinnedVotes.length} editorially pinned):**`);
      lines.push('');
      lines.push('| Date | Vote | Position | Party majority | Bill |');
      lines.push('|---|---|---|---|---|');
      for (const d of pinnedVotes) {
        const date = d.parsedDate || '—';
        const bill = d.meta?.bill;
        const billRef = bill ? `${bill.type} ${bill.number}` : '—';
        lines.push(`| ${date} | ${d.vote_id} | ${d.position} | ${d.party_majority} | ${billRef} |`);
      }
    }

    if (deviations.length > 0) {
      // Exclude pinned votes from the deviation list so we don't show them twice.
      const pinnedIds = new Set(pinnedVotes.map((p) => p.vote_id));
      const devToShow = deviations.filter((d) => !pinnedIds.has(d.vote_id)).slice(0, 10);
      if (devToShow.length > 0) {
        lines.push('');
        lines.push(`**Most recent party-line deviations (top ${devToShow.length} of ${deviations.length}):**`);
        lines.push('');
        lines.push('| Date | Vote | Position | Party majority | Bill |');
        lines.push('|---|---|---|---|---|');
        for (const d of devToShow) {
          const date = d.parsedDate || '—';
          const bill = d.meta?.bill;
          const billRef = bill ? `${bill.type} ${bill.number}` : '—';
          lines.push(`| ${date} | ${d.vote_id} | ${d.position} | ${d.party_majority} | ${billRef} |`);
        }
      }
    }

    lines.push('');
    lines.push('*Source: Congress.gov roll-call API (House) + senate.gov XML feeds (Senate).*');

    const panelMd = lines.join('\n');
    const blockRe = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
    const newBlock = `${BLOCK_START}\n${panelMd}\n${BLOCK_END}`;
    let newText;
    if (blockRe.test(text)) newText = text.replace(blockRe, newBlock);
    else {
      // Place after auto:fec-lifetime or at EOF
      const fecEnd = '<!-- auto:fec-lifetime end -->';
      if (text.includes(fecEnd)) newText = text.replace(fecEnd, fecEnd + '\n\n' + newBlock);
      else newText = text + '\n\n' + newBlock + '\n';
    }
    if (newText === text) continue;

    if (!WRITE) { if (VERBOSE) console.log(`  [would inject] ${fm.title || path.basename(file)}`); injected++; continue; }
    fs.writeFileSync(file, newText);
    injected++;
  }

  console.log(`\nResults: scanned=${scanned}, ${WRITE ? 'injected' : 'would-inject'}=${injected}, no-bioguide=${nobio}, no-votes=${nodata}`);
  if (!WRITE) console.log('Dry-run. Use --write to apply.');
})().catch(err => { console.error(err); process.exit(1); });
