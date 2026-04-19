#!/usr/bin/env node
/**
 * ask.cjs — natural-ish language CLI for the donor map query engine
 *
 * Pattern-matches a question string to a query spec and renders results.
 *
 * Usage:
 *   node scripts/ask.cjs "who funds marble freedom trust"
 *   node scripts/ask.cjs "where does fidelity charitable's money go"
 *   node scripts/ask.cjs "top donors to kamala harris"
 *   node scripts/ask.cjs "what boards is leonard leo on"
 *   node scripts/ask.cjs "who's on the board of america first policy institute"
 *   node scripts/ask.cjs "biggest grants from fidelity"
 *   node scripts/ask.cjs "cross party donors"
 *   node scripts/ask.cjs "mark kelly voting record"
 */

const { createQueryEngine } = require('./lib/query-engine.cjs');
const fs = require('fs');
const path = require('path');

const q = process.argv.slice(2).join(' ').trim();
if (!q) {
  console.log('Usage: node scripts/ask.cjs "<question>"');
  console.log('');
  console.log('Examples:');
  console.log('  "who funds marble freedom trust"');
  console.log('  "where does fidelity charitable\'s money go"');
  console.log('  "top donors to kamala harris"');
  console.log('  "what boards is leonard leo on"');
  console.log('  "who\'s on the board of america first policy institute"');
  console.log('  "biggest grants from new venture fund in 2020"');
  console.log('  "cross party donors"');
  console.log('  "mark kelly voting record"');
  process.exit(0);
}

function fmtUsd(n) {
  if (!n || typeof n !== 'number') return '—';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

// Title resolver — fuzzy match against vault entity names
let _entities = null;
function loadEntities() {
  if (_entities) return _entities;
  const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'entities.jsonl'), 'utf-8');
  _entities = raw.split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  return _entities;
}
function resolveTitle(fragment) {
  const ents = loadEntities();
  const lc = fragment.toLowerCase().trim();
  const exact = ents.find((e) => e.name && e.name.toLowerCase() === lc);
  if (exact) return exact.name;
  const starts = ents.find((e) => e.name && e.name.toLowerCase().startsWith(lc));
  if (starts) return starts.name;
  const contains = ents.find((e) => e.name && e.name.toLowerCase().includes(lc));
  if (contains) return contains.name;
  return fragment; // fall through, let the query return empty
}

function stripQuestionWords(s) {
  return s.replace(/^(who|what|where|how|show me|tell me|list|find|get)\s+/i, '').trim();
}

(async function main() {
  const engine = createQueryEngine();
  const lower = q.toLowerCase();
  console.log(`\n> ${q}\n`);

  // Cross-party donors composer
  if (/cross[- ]party/.test(lower)) {
    const r = await engine.query({ subject: 'cross_party_donors', filters: { days: 365 }, limit: 10 });
    console.log(`Cross-party donors (${r.total || r.rows.length} surfaced):`);
    (r.rows || []).slice(0, 10).forEach((row) => {
      console.log(`  ${fmtUsd(row.total_spend).padStart(10)}  ${row.name}  (${row.politicians_count || '?'} politicians)`);
    });
    return;
  }

  // Voting record: "<name> voting record" or "how did <name> vote"
  let m = lower.match(/^(.+?)\s+voting record$/) || lower.match(/^how did (.+?) vote/);
  if (m) {
    const name = resolveTitle(m[1]);
    const bio = findBioguide(name);
    if (!bio) {
      console.log(`No bioguide found for "${name}". Voting record query requires a politician profile with bioguide-id.`);
      return;
    }
    showVotingRecord(bio, name);
    return;
  }

  // Affiliation — "what boards is X on" / "X on the board"
  m = lower.match(/what boards?.+is\s+(.+?)\s+on$/) || lower.match(/^(.+?)'?s?\s+boards?$/);
  if (m) {
    const name = resolveTitle(m[1]);
    const r = await engine.query({ subject: 'edges', filters: { from: name, type: 'affiliation' }, limit: 20 });
    console.log(`Boards ${name} sits on (${r.total} found):`);
    if (r.total === 0) console.log(`  (no affiliation edges for ${name})`);
    r.rows.forEach((e) => console.log(`  ${e.to}${e.role ? ' — ' + e.role : ''}${e.date_range ? ' (' + e.date_range.replace(/T.*$/g, '') + ')' : ''}`));
    return;
  }

  // "who's on the board of X" / "board of X"
  m = lower.match(/who.*board of\s+(.+?)$/) || lower.match(/^board of\s+(.+?)$/);
  if (m) {
    const name = resolveTitle(m[1]);
    const r = await engine.query({ subject: 'edges', filters: { to: name, type: 'affiliation' }, limit: 20 });
    console.log(`Officers on ${name}'s board (${r.total} found):`);
    if (r.total === 0) console.log(`  (no officer affiliation edges recorded for ${name})`);
    r.rows.forEach((e) => console.log(`  ${e.from}${e.role ? ' — ' + e.role : ''}`));
    return;
  }

  // Biggest grants from X — "biggest grants from X" / "grants from X"
  m = lower.match(/(?:biggest|top)?\s*grants? from\s+(.+?)(?:\s+in\s+(\d{4}))?$/);
  if (m) {
    const name = resolveTitle(m[1]);
    const year = m[2];
    const filters = { from: name, type: 'monetary', source: 'irs-990-bulk' };
    if (year) filters.cycle = year;
    const r = await engine.query({ subject: 'edges', filters, limit: 100 });
    r.rows.sort((a, b) => b.amount - a.amount);
    console.log(`Top ${name} grants${year ? ' in ' + year : ''} (${r.total} total):`);
    r.rows.slice(0, 15).forEach((e) => console.log(`  ${e.cycle}  ${fmtUsd(e.amount).padStart(10)}  ${e.to}`));
    return;
  }

  // "top donors to X" / "who funds X" / "funders of X"
  m = lower.match(/top donors? (?:to|for)\s+(.+?)$/) || lower.match(/(?:who funds|funders of|who funded)\s+(.+?)$/);
  if (m) {
    const name = resolveTitle(m[1]);
    const r = await engine.query({ subject: 'edges', filters: { to: name, type: 'monetary' }, limit: 200 });
    r.rows.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    const withAmount = r.rows.filter((e) => e.amount);
    console.log(`Top donors to ${name} (${r.total} edges, ${withAmount.length} with dollar amounts):`);
    withAmount.slice(0, 15).forEach((e) => {
      console.log(`  ${e.cycle || '—'}  ${fmtUsd(e.amount).padStart(10)}  ${e.from}  [${e.source}]`);
    });
    if (withAmount.length === 0 && r.rows.length > 0) {
      console.log('  (edges without dollar amounts:)');
      r.rows.slice(0, 10).forEach((e) => console.log(`  ${e.cycle || '—'}  ${e.from}  [${e.source}]`));
    }
    return;
  }

  // "where does X's money go" / "what does X fund" / "X top recipients"
  m = lower.match(/where does\s+(.+?)(?:'s)?\s+money go/) ||
      lower.match(/(?:what does|where does)\s+(.+?)\s+fund/) ||
      lower.match(/(?:top recipients (?:of|from))\s+(.+?)$/);
  if (m) {
    const name = resolveTitle(m[1]);
    const r = await engine.query({ subject: 'edges', filters: { from: name, type: 'monetary' }, limit: 500 });
    r.rows.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    console.log(`Where ${name}'s money goes (${r.total} edges):`);
    r.rows.slice(0, 15).forEach((e) => {
      console.log(`  ${e.cycle || '—'}  ${fmtUsd(e.amount).padStart(10)}  ${e.to}  [${e.source}]`);
    });
    return;
  }

  // Fallback: try as both sides with a plain name
  const name = resolveTitle(stripQuestionWords(q));
  console.log(`Couldn't match a specific question pattern. Trying generic lookup on "${name}":`);
  const out = await engine.query({ subject: 'edges', filters: { from: name }, limit: 10 });
  const inc = await engine.query({ subject: 'edges', filters: { to: name }, limit: 10 });
  console.log(`  ${out.total} outgoing edges, ${inc.total} incoming edges`);
  if (out.total > 0) {
    console.log(`  sample outgoing:`);
    out.rows.slice(0, 5).forEach((e) => console.log(`    ${e.type.padEnd(13)} -> ${e.to}${e.amount ? ' ' + fmtUsd(e.amount) : ''}  [${e.source}]`));
  }
  if (inc.total > 0) {
    console.log(`  sample incoming:`);
    inc.rows.slice(0, 5).forEach((e) => console.log(`    ${e.from} ${e.type.padEnd(13)}->${e.amount ? ' ' + fmtUsd(e.amount) : ''}  [${e.source}]`));
  }
})().catch((err) => { console.error(err); process.exit(1); });

// ─── Helpers for voting record (pull from votes + positions JSONL) ─────

function findBioguide(title) {
  // Walk politician profiles, read frontmatter, find bioguide-id for this title
  const yaml = require('js-yaml');
  const root = path.join(__dirname, '..', 'content', 'Politicians');
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name.endsWith('.md')) {
        const text = fs.readFileSync(full, 'utf-8');
        const m = text.match(/^---\n([\s\S]*?)\n---/);
        if (!m) continue;
        try {
          const fm = yaml.load(m[1]) || {};
          if (!fm.title) continue;
          if (fm.title === title || fm.title.replace(' Master Profile', '') === title) {
            return fm['bioguide-id'] || fm['bioguide'];
          }
        } catch {}
      }
    }
  }
  return null;
}

function showVotingRecord(bioguide, title) {
  const votesFile = path.join(__dirname, '..', 'data', 'votes.jsonl');
  const posFile = path.join(__dirname, '..', 'data', 'legislator-positions.jsonl');
  const voteMeta = new Map();
  for (const line of fs.readFileSync(votesFile, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { const v = JSON.parse(line); voteMeta.set(v.vote_id, v); } catch {}
  }
  const myPositions = [];
  for (const line of fs.readFileSync(posFile, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const p = JSON.parse(line);
      if (p.bioguide === bioguide) myPositions.push(p);
    } catch {}
  }
  let y = 0, n = 0;
  for (const p of myPositions) { if (p.position === 'Aye' || p.position === 'Yea') y++; else if (p.position === 'No' || p.position === 'Nay') n++; }
  console.log(`${title} (bioguide ${bioguide}):`);
  console.log(`  ${myPositions.length.toLocaleString()} roll-call positions across tracked Congress sessions`);
  console.log(`  Yes: ${y.toLocaleString()}  No: ${n.toLocaleString()}  Other (present/absent): ${(myPositions.length - y - n).toLocaleString()}`);
  const byCong = {};
  for (const p of myPositions) {
    const v = voteMeta.get(p.vote_id);
    if (!v) continue;
    const k = `${v.chamber} ${v.congress}/${v.session}`;
    byCong[k] = (byCong[k] || 0) + 1;
  }
  console.log('  Coverage:');
  Object.entries(byCong).sort().forEach(([k, c]) => console.log(`    ${k}: ${c}`));
}
