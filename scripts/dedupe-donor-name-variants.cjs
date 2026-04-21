#!/usr/bin/env node
/**
 * dedupe-donor-name-variants.cjs
 *
 * Pattern H extension for donor / non-politician names. Siblings to
 * dedupe-nickname-variants.cjs, which only handles politicians via the
 * legislator-registry's name_nickname field.
 *
 * Target cases (from orphan-entities-queue 2026-04-21):
 *
 *   1. Nickname variant (non-politician):
 *        "Samuel Bankman-fried"  →  "Sam Bankman-Fried"
 *      FEC itemization uses legal names (Samuel, Robert, William),
 *      vault profiles use common-usage names (Sam, Bob, Bill). The
 *      legislator registry doesn't cover non-politicians, so we carry
 *      a small curated first-name-nickname map here.
 *
 *   2. Middle-name / middle-initial stripping:
 *        "Paul Elliott Singer"   →  "Paul Singer"
 *        "Richard E. Uihlein"    →  "Richard Uihlein"  (then →couple)
 *      When the orphan carries an extra middle token (word or single
 *      initial) and dropping it matches a canonical entity's "first
 *      last" form, route the orphan onto the canonical.
 *
 *   3. Couple-entity superset routing:
 *        "Richard Uihlein"       →  "Richard and Elizabeth Uihlein"
 *        "Elizabeth Uihlein"     →  "Richard and Elizabeth Uihlein"
 *      FEC records individual donors by person-name; some vault
 *      canonicals are joint "X and Y Last" entries representing the
 *      household. Match orphan "{first} {last}" to canonical
 *      "{first} and {other} {last}" (or "{other} and {first} {last}").
 *
 * Safety:
 *   - Never collapses two profiled entities onto each other. Orphan-to-
 *     canonical only. (For entity-to-entity merges, use the main
 *     dedupe-entities.cjs with its profile-path safety check.)
 *   - Never applies to politicians (entity_type === 'politician') to
 *     stay out of the nickname-registry's lane.
 *   - Dry-run by default. --apply to write.
 *
 * Pairs with: dedupe-entities.cjs (canonical-to-canonical),
 *             dedupe-nickname-variants.cjs (politician nicknames).
 */
const fs = require('fs');
const path = require('path');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REL_FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');

// Curated first-name nickname map for non-politicians. Legal-form key,
// short/common-form values. Keep lowercase. Extend as orphan-queue
// review surfaces more.
const NICKNAMES = {
  samuel: ['sam', 'sammy'],
  robert: ['bob', 'rob', 'bobby', 'robby'],
  william: ['bill', 'billy', 'will', 'willy'],
  richard: ['rick', 'rich', 'dick'],
  james: ['jim', 'jimmy', 'jamie'],
  john: ['jack', 'johnny'],
  michael: ['mike', 'mick', 'mikey'],
  thomas: ['tom', 'tommy'],
  christopher: ['chris'],
  charles: ['charlie', 'chuck'],
  edward: ['ed', 'eddie', 'ted'],
  anthony: ['tony'],
  daniel: ['dan', 'danny'],
  joseph: ['joe', 'joey'],
  matthew: ['matt'],
  andrew: ['andy', 'drew'],
  kenneth: ['ken', 'kenny'],
  peter: ['pete'],
  nicholas: ['nick'],
  benjamin: ['ben', 'benny'],
  gregory: ['greg'],
  stephen: ['steve'],
  steven: ['steve'],
  theodore: ['ted', 'teddy'],
  lawrence: ['larry'],
  patrick: ['pat'],
  jeffrey: ['jeff'],
  elizabeth: ['liz', 'beth', 'betty', 'lizzie'],
  katherine: ['kate', 'kathy', 'katie'],
  catherine: ['cat', 'cathy', 'katie'],
  margaret: ['meg', 'maggie', 'peggy'],
  jennifer: ['jen', 'jenny'],
  susan: ['sue', 'susie'],
  deborah: ['deb', 'debbie'],
  barbara: ['barb', 'barbie'],
  alexander: ['alex', 'al'],
  donald: ['don'],
  ronald: ['ron', 'ronnie'],
};

// Expand to a map normalized-variant → canonical first name
const NICK_TO_LEGAL = new Map();
for (const [legal, nicks] of Object.entries(NICKNAMES)) {
  for (const n of nicks) NICK_TO_LEGAL.set(n, legal);
  NICK_TO_LEGAL.set(legal, legal); // identity
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,'"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tokens that mark a name as an organization, not a person. If ANY of
// these appear in the token list, the name is rejected from person-
// parsing regardless of shape. Lowercase match against normalized
// tokens.
const ORG_TOKENS = new Set([
  'pac', 'llc', 'inc', 'corp', 'corporation', 'co', 'ltd', 'plc', 'lp', 'llp',
  'committee', 'association', 'fund', 'funds', 'network', 'coalition', 'union',
  'foundation', 'council', 'congress', 'company', 'industry', 'industries',
  'strategies', 'media', 'group', 'partners', 'holdings', 'capital', 'properties',
  'services', 'service', 'center', 'centre', 'institute', 'academy', 'system',
  'trust', 'realty', 'aviation', 'corporation', 'enterprises', 'enterprise',
  'fed', 'federal', 'national', 'american', 'americans', 'democratic', 'republican',
  'alliance', 'united', 'society', 'club', 'party', 'action', 'committee',
  'pipeline', 'map', 'network', 'project', 'initiative', 'campaign', 'fronts',
  'forward', 'majority', 'senate', 'house', 'district', 'state',
  'pipeline',
]);

// Characters that shouldn't appear in a person-name. Parens, em-dash,
// slashes, ampersand, asterisk.
const ORG_PUNCT_RX = /[()\/\\*&—\[\]{}|:;<>?!@#$%^]/;
function looksLikeOrg(full) {
  if (!full) return true;
  if (ORG_PUNCT_RX.test(full)) return true;
  const lower = full.toLowerCase();
  if (/^the\s+/.test(lower)) return true;  // "The X Network"
  const toks = normalize(full).split(/\s+/).filter(Boolean);
  for (const t of toks) if (ORG_TOKENS.has(t)) return true;
  // All-caps with 3+ meaningful tokens is almost always an org.
  // (FEC person names all-caps are usually LAST,FIRST shape, which is
  // already excluded by the comma check.)
  if (full === full.toUpperCase() && toks.length >= 3) return true;
  return false;
}

// Canonicalize a first-name token via the nickname map. Unknown names
// fall through unchanged.
function canonFirst(token) {
  const n = normalize(token);
  return NICK_TO_LEGAL.get(n) || n;
}

// Parse "First [Middle…] Last" shape. Returns null if the name has
// commas (FEC-shape LAST,FIRST — handled elsewhere) or looks like a
// couple ("X and Y Last" — handled separately).
function parsePersonName(full) {
  if (!full || full.includes(',')) return null;
  if (/\band\b/i.test(full)) return null; // couple form
  if (looksLikeOrg(full)) return null;
  const tokens = normalize(full).split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) return null;
  // Single-letter tokens (initials) and "jr"/"sr"/"ii"/"iii" are
  // noise for our purposes.
  const noise = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);
  const clean = tokens.filter((t) => t.length > 1 && !noise.has(t));
  if (clean.length < 2) return null;
  return {
    first: clean[0],
    last: clean[clean.length - 1],
    middle: clean.slice(1, -1), // zero or more middle tokens
    raw: full,
    tokens: clean,
  };
}

// Parse "A and B Last" / "A Last and B Last" into { partners:[a,b], last }.
function parseCoupleName(full) {
  if (!full) return null;
  if (looksLikeOrg(full)) return null;
  const n = normalize(full);
  // "richard and elizabeth uihlein" — single last name at end
  const m1 = n.match(/^([a-z]+(?:\s+[a-z]\.?)*)\s+and\s+([a-z]+(?:\s+[a-z]\.?)*)\s+([a-z][a-z-]+)$/);
  if (m1) {
    return { partners: [m1[1].split(/\s+/)[0], m1[2].split(/\s+/)[0]], last: m1[3] };
  }
  return null;
}

function main() {
  const entities = fs.readFileSync(ENT_FILE, 'utf-8')
    .split(/\n/).filter(Boolean).map(JSON.parse);
  const entByName = new Map(entities.map((e) => [e.name, e]));

  // Build indexes over profiled, non-politician canonicals.
  // personIndex keyed by `${canonFirst(first)}|${last}` → canonical name
  // coupleIndex keyed by `${canonFirst(partner)}|${last}` → canonical name (for each partner)
  const personIndex = new Map();
  const coupleIndex = new Map();

  // Path-based allowlist for person canonicals. Entities with profiles
  // in these folders are treated as person records for indexing. Org
  // folders (Super PACs, Dark Money, Labor Unions, Corporate, etc.) are
  // excluded so we don't index "Change Now" (PAC) or "Californians for
  // Sacred Sites Protection" (PAC) as if they were persons.
  const PERSON_FOLDER_RX = /content[\\/]Donors & Power Networks[\\/](Mega-Donors|Tech & Crypto|Wall Street|Real Estate|Real Estate & Housing|Media & Entertainment|Media & Influence|Energy & Utilities|Gig Economy|Foreign|Israel Lobby)[\\/]/i;
  // Top-level flat-file persons (Jeff Yass, Leonard Leo).
  const PERSON_TOP_RX = /content[\\/]Donors & Power Networks[\\/][^\\/]+\.md$/i;

  for (const e of entities) {
    if (!e.profile_path) continue; // orphan entity — shouldn't be target
    if (e.entity_type === 'politician' || e.entity_type === 'state-politician') continue;
    // Only consider entities in person folders (or top-level flat files).
    if (!PERSON_FOLDER_RX.test(e.profile_path) && !PERSON_TOP_RX.test(e.profile_path)) continue;

    // Try couple parse first
    const couple = parseCoupleName(e.name);
    if (couple) {
      for (const p of couple.partners) {
        const key = `${canonFirst(p)}|${couple.last}`;
        if (!coupleIndex.has(key)) coupleIndex.set(key, e.name);
      }
      continue;
    }

    const person = parsePersonName(e.name);
    if (!person) continue;
    const key = `${canonFirst(person.first)}|${person.last}`;
    if (!personIndex.has(key)) personIndex.set(key, e.name);
  }

  // Walk all edge files, collect unique from/to names not already
  // matched as entities.
  const edgeFiles = [REL_FILE];
  if (fs.existsSync(DERIVED_DIR)) {
    for (const f of fs.readdirSync(DERIVED_DIR).sort()) {
      if (f.endsWith('.jsonl')) edgeFiles.push(path.join(DERIVED_DIR, f));
    }
  }

  const orphanNames = new Set();
  for (const f of edgeFiles) {
    if (!fs.existsSync(f)) continue;
    const txt = fs.readFileSync(f, 'utf-8');
    for (const line of txt.split('\n')) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line);
        if (e.from && !entByName.has(e.from)) orphanNames.add(e.from);
        if (e.to && !entByName.has(e.to)) orphanNames.add(e.to);
      } catch {}
    }
  }

  // Try to route each orphan to a canonical via nickname / middle-strip /
  // couple-superset. Never route to an entity that has a different
  // entity_type (e.g. don't route a person orphan to a corporation).
  const rename = new Map();
  for (const orphan of orphanNames) {
    const person = parsePersonName(orphan);
    if (!person) continue;
    const key = `${canonFirst(person.first)}|${person.last}`;
    // 1. personIndex hit — middle-strip or nickname match to a non-couple canonical
    if (personIndex.has(key)) {
      const canonical = personIndex.get(key);
      if (canonical === orphan) continue;
      rename.set(orphan, canonical);
      continue;
    }
    // 2. coupleIndex hit — orphan "{first} {last}" routes to couple entity
    if (coupleIndex.has(key)) {
      const canonical = coupleIndex.get(key);
      if (canonical === orphan) continue;
      rename.set(orphan, canonical);
    }
  }

  console.log(`scanned entity store: ${entities.length} rows`);
  console.log(`  person canonicals indexed: ${personIndex.size}`);
  console.log(`  couple-partner canonicals indexed: ${coupleIndex.size}`);
  console.log(`scanned edge files: ${edgeFiles.length}`);
  console.log(`orphan names found: ${orphanNames.size}`);
  console.log(`routed to canonicals: ${rename.size}\n`);

  const LIMIT = process.argv.includes('--all') ? Infinity : 20;
  const samples = [...rename.entries()].slice(0, LIMIT);
  for (const [from, to] of samples) console.log(`  ${from} → ${to}`);
  if (rename.size > LIMIT) console.log(`  ... and ${rename.size - LIMIT} more (pass --all to list every routing)`);

  if (!APPLY) { console.log('\n(dry-run — pass --apply to write)'); return; }
  if (rename.size === 0) { console.log('\nNothing to do.'); return; }

  // Rewrite edges (streaming).
  function streamRewrite(file) {
    fs.copyFileSync(file, file + '.pre-donor-dedup.bak');
    const CHUNK = 64 * 1024 * 1024;
    const inFd = fs.openSync(file, 'r');
    const size = fs.fstatSync(inFd).size;
    const outFd = fs.openSync(file + '.tmp', 'w');
    let offset = 0, carry = '', hits = 0;
    try {
      while (offset < size) {
        const len = Math.min(CHUNK, size - offset);
        const buf = Buffer.alloc(len);
        fs.readSync(inFd, buf, 0, len, offset);
        offset += len;
        const chunk = carry + buf.toString('utf-8');
        const lines = chunk.split('\n');
        carry = lines.pop();
        for (const line of lines) {
          if (!line.trim()) { fs.writeSync(outFd, '\n'); continue; }
          let e;
          try { e = JSON.parse(line); }
          catch { fs.writeSync(outFd, line + '\n'); continue; }
          let changed = false;
          if (rename.has(e.from)) { e.from = rename.get(e.from); changed = true; }
          if (rename.has(e.to)) { e.to = rename.get(e.to); changed = true; }
          if (changed) { e.id = computeEdgeId(e); hits++; }
          fs.writeSync(outFd, JSON.stringify(e) + '\n');
        }
      }
      if (carry) fs.writeSync(outFd, carry + '\n');
    } finally {
      fs.closeSync(inFd);
      fs.closeSync(outFd);
    }
    fs.renameSync(file + '.tmp', file);
    return hits;
  }

  let totalEdges = 0;
  for (const f of edgeFiles) {
    if (!fs.existsSync(f)) continue;
    const n = streamRewrite(f);
    if (n > 0) console.log(`  ${path.basename(f)}: ${n} edges rewritten`);
    totalEdges += n;
  }
  console.log(`\ntotal: ${totalEdges} edges rewritten across ${edgeFiles.length} files`);
}

main();
