#!/usr/bin/env node
/**
 * classify-ie-edges.cjs
 *
 * One-shot cleanup for monetary edges that came out of the FEC ingest
 * with role=null. Many of them are independent-expenditure (IE) edges
 * where a partisan super-PAC spent money either FOR (ie-support) or
 * AGAINST (ie-oppose) a politician, but the role classification never
 * made it onto the edge.
 *
 * Effect downstream: queries like "who funds Raphael Warnock" surface
 * the Senate Leadership Fund's $45M opposition spending as a top
 * "donor." That's materially wrong.
 *
 * Strategy:
 *   1. Build a party lookup for every politician profile (from the
 *      `party` frontmatter field).
 *   2. Maintain a hand-curated map of partisan super-PACs to their
 *      partisan alignment. New PACs discovered during enrichment get
 *      appended here as we surface them.
 *   3. Walk every monetary edge with role=null that goes FROM a known
 *      partisan PAC TO a politician with a known party. If parties
 *      differ → role='ie-oppose'. If parties match → 'ie-support'.
 *   4. Write edges back via the canonical store with upsertEdges().
 *
 * Usage:
 *   node scripts/classify-ie-edges.cjs             # dry-run report
 *   node scripts/classify-ie-edges.cjs --write     # apply
 *   node scripts/classify-ie-edges.cjs --verbose   # log every reclassification
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { loadEdges, upsertEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const POLITICIANS_DIR = path.join(ROOT, 'content', 'Politicians');
const AUTO_MAP_FILE = path.join(__dirname, 'derived', 'partisan-committees.auto.json');

// Load the auto-derived partisan map (from derive-partisan-committees.cjs).
// Used as a fallback after the hand-curated PARTISAN_COMMITTEES below.
// The hand map takes precedence — it captures editorial judgment about
// ambiguous cases (e.g. intra-party IE spenders like Justice Democrats,
// which are D-aligned but empirically look NEUTRAL because they primary
// other Ds).
let AUTO_MAP = {};
try {
  if (fs.existsSync(AUTO_MAP_FILE)) {
    AUTO_MAP = JSON.parse(fs.readFileSync(AUTO_MAP_FILE, 'utf-8')).alignment || {};
  }
} catch (err) {
  console.warn(`[classify-ie-edges] auto-map load failed: ${err.message}`);
}

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');

// Hand-curated partisan super-PAC / c4 registry. NOT auto-derived —
// these are the well-known partisan spenders whose alignment is
// unambiguous. Lowercase-compared.
//
// R = Republican-aligned (attacks Ds, supports Rs)
// D = Democratic-aligned (attacks Rs, supports Ds)
//
// Anything not in this map gets skipped (role stays null).
const PARTISAN_COMMITTEES = {
  // ── R-aligned ────────────────────────────────────────────
  'senate leadership fund': 'R',
  'slf pac': 'R',
  'slf': 'R',
  'one nation': 'R',
  'congressional leadership fund': 'R',
  'clf': 'R',
  'maga inc': 'R',
  'make america great again inc.': 'R',
  'make america great again inc': 'R',
  'american crossroads': 'R',
  'club for growth': 'R',
  'club for growth action': 'R',
  'americans for prosperity': 'R',
  'americans for prosperity action, inc. (afp action) dba cva action and dba libre action': 'R',
  'restoration pac': 'R',
  'restoration of america pac': 'R',
  'the sentinel action fund': 'R',
  'sentinel action fund': 'R',
  'defendarizona': 'R',
  'preserve america': 'R',
  'preserve america pac': 'R',
  'senate conservatives fund': 'R',
  'nrsc': 'R',
  'nrcc': 'R',
  'nrsc - national republican senatorial committee': 'R',
  'nrcc - national republican congressional committee': 'R',
  'rnc - republican national committee': 'R',
  'republican national committee': 'R',
  'defend american jobs': 'R',  // crypto industry, R-aligned in practice
  'defense of democracy pac': 'R',
  'national victory action fund': 'R',
  'ready to win': 'R',
  "save america pac": 'R',
  'trump victory': 'R',
  'winred': 'R',
  'right for america': 'R',
  'american principles project pac': 'R',
  'susan b anthony pro-life america': 'R',
  'national right to life victory fund': 'R',
  'women speak out pac': 'R',
  'honoring american law enforcement pac': 'R',
  'law enforcement for a safer america pac': 'R',
  'fraternal order of police': 'R',
  'family friendly action fund': 'R',
  'family friendly action pac': 'R',
  'family research council action political action committee': 'R',
  'republican jewish coalition': 'R',
  // Anti-D variants
  'bluegrass pac': 'R',
  'drain the dc swamp pac': 'R',
  'buckeye values pac': 'R',
  'buckeye values pac, inc.': 'R',
  'pennsylvania pro-life federation pac': 'R',
  'common sense for america pac': 'R',
  'freedom\'s defense fund': 'R',
  'freedoms defense fund': 'R',
  'protect freedom political action committee': 'R',
  'reclaim america pac': 'R',
  'american future fund': 'R',
  'put utah first pac': 'R',
  'tell it like it is pac': 'R',

  // ── D-aligned ────────────────────────────────────────────
  'priorities usa action': 'D',
  'priorities usa': 'D',
  'future forward usa action': 'D',
  'ff pac': 'D',
  'senate majority pac': 'D',
  'smp': 'D',
  'house majority pac': 'D',
  'hmp': 'D',
  'majority pac': 'D',
  'majority forward': 'D',
  'american bridge': 'D',
  'american bridge 21st century': 'D',
  'pacronym': 'D',
  "emily's list": 'D',
  'emilys list': 'D',
  "emily's list action": 'D',
  'emilys list action': 'D',
  'winsenate': 'D',
  'dccc': 'D',
  'dscc': 'D',
  'dccc - democratic congressional campaign committee': 'D',
  'dscc - democratic senatorial campaign committee': 'D',
  'dnc - democratic national committee': 'D',
  'democratic national committee': 'D',
  'working families party pac': 'D',
  'working families party': 'D',
  'people for the american way': 'D',
  'progressive turnout project': 'D',
  '314 action fund': 'D',
  '314 action': 'D',
  'votevets': 'D',
  'giffords pac': 'D',
  'everytown for gun safety': 'D',
  'everytown for gun safety action fund': 'D',
  'everytown for gun safety victory fund': 'D',
  'naral': 'D',
  "planned parenthood action fund inc": 'D',
  "planned parenthood action fund": 'D',
  "planned parenthood votes": 'D',
  'league of conservation voters': 'D',
  'lcv victory fund': 'D',
  'sierra club political committee': 'D',
  'sierra club independent action': 'D',
  'moveon.org political action': 'D',
  'indivisible action': 'D',
  'black pac': 'D',
  'blackpac': 'D',
  'cbd action fund': 'D',
  'chc bold pac': 'D',
  'latino vote for america pac': 'D',
  'somos votantes': 'D',
  'somos pac': 'D',
  'for our future action fund': 'D',
  'for our future': 'D',
  'let america vote pac': 'D',
  'courage california super pac': 'D',
  'new georgia project action fund': 'D',
  'change now': 'D',
  'worker power pac for georgia': 'D',
  'worker power pac': 'D',
  'leadership now': 'D',
  'protect the vote': 'D',
  'americas pac': 'D',
  'really american pac': 'D',
  'campaign for working families': 'D',
  'mad dog pac': 'D',
  'fight corporate monopolies': 'D',
  'clean slate initiative inc': 'D',
  'activate america': 'D',
  'united we can': 'D',
  'take back 2020': 'D',
  'takeaction mn federal fund': 'D',
  'minnesota democratic-farmer-labor party': 'D',
  'pennsylvania democratic party': 'D',
  'powerpacplus': 'D',
  'black progressive action coalition': 'D',
  'edf action votes': 'D',
  'america votes': 'D',
  'voter registration project': 'D',
  'ruralvote.org': 'D',
  'lauren underwood': 'D',
  'human rights campaign equality votes': 'D',
  'nnu for patient protection': 'D',
  'national nurses united for patient protection': 'D',
  'sierra club political committee (epic)': 'D',
  'climate reality action fund': 'D',
  'national wildlife federation action fund': 'D',
  'hunter action fund (haf)': 'D',
  'hunter action fund': 'D',
  'good fight pac': 'D',
  'j street': 'D',
  'jstreetpac': 'D',
  'sfa fund, inc': 'D',
  'sfa fund inc': 'D',
  'dmfi - democratic majority for israel': 'D',
  'buckeye leadership fund, inc.': 'R',
  'national republican trust pac': 'R',
  'the national republican trust pac': 'R',
  'american online giving foundation inc': 'NEUTRAL',
  'americans for tax reform': 'R',
  'americans for tax reform - grover norquist': 'R',
  'mi sembre pac': 'D',
  'republican campaign committee of new mexico': 'R',
  'republican party of florida': 'R',
  'michigan republican party': 'R',
  'democratic party of virginia': 'D',
  'los angeles county democratic central committee': 'D',
  'ohio democratic party': 'D',
  'minnesota democratic-farmer-labor party pac': 'D',
  'oregon democratic party': 'D',
  'california democratic party': 'D',
  'texas democratic party': 'D',
  'iowa democratic party': 'D',
  'georgia democratic party': 'D',
  'ohio republican party': 'R',

  // ── Added 2026-04-19 (partisan-map expansion pass) ──────
  // R-aligned super PACs / IE spenders
  'rbg pac': 'R',
  'retire career politicians': 'R',
  'esafund': 'R',
  'school freedom fund': 'R',
  'opportunity matters fund': 'R',
  'opportunity matters fund action': 'R',
  'alabama conservatives fund': 'R',
  'south carolina patriots pac': 'R',
  'alabama christian conservatives': 'R',
  'connecticut patriots pac': 'R',
  'heartland resurgence': 'R',
  'texans for a conservative majority': 'R',
  'evergreen principles pac': 'R',
  'defending main street superpac inc': 'R',
  'defending main street superpac': 'R',
  'defending main street': 'R',
  'truth and courage pac': 'R',
  'liberty champions': 'R',
  'conservative outsider pac inc': 'R',
  'conservative outsider pac': 'R',
  'save our country': 'R',
  'america pac - elon musk': 'R',
  'america pac': 'R',

  // D-aligned super PACs / IE spenders
  'the lincoln project': 'D',
  'lincoln project': 'D',
  'illinois future pac': 'D',
  'justice democrats pac': 'D',
  'justice democrats': 'D',
  'mainstream democrats pac': 'D',
  'mainstream democrats': 'D',
  'protect our future pac': 'D',
  'protect our future': 'D',
  'patriot majority pac': 'D',
  'patriot majority usa': 'D',
  'congressional progressive caucus pac': 'D',
  'united democracy project - udp': 'D',
  'united democracy project': 'D',
  'udp': 'D',

  // NEUTRAL — genuinely bipartisan / cross-party spenders. Explicitly
  // mapped so they short-circuit instead of being considered for
  // classification.
  'fairshake pac': 'NEUTRAL',
  'fairshake': 'NEUTRAL',
  'protect progress': 'NEUTRAL',
  'american dream federal action': 'NEUTRAL',
  'crypto innovation pac': 'NEUTRAL',
  'clearpath action fund, inc.': 'NEUTRAL',
  'clearpath action fund': 'NEUTRAL',
  'clearpath action': 'NEUTRAL',
  'center forward committee': 'NEUTRAL',
  'center forward': 'NEUTRAL',
};

function loadPoliticianParties() {
  const parties = new Map();
  const stack = [POLITICIANS_DIR];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name.endsWith('.md')) {
        try {
          const text = fs.readFileSync(full, 'utf-8');
          const m = text.match(/^---\n([\s\S]*?)\n---/);
          if (!m) continue;
          const fm = yaml.load(m[1]) || {};
          if (!fm.title) continue;
          const partyRaw = (fm.party || '').toString().toLowerCase();
          const party = partyRaw.startsWith('r') ? 'R' : partyRaw.startsWith('d') ? 'D' : partyRaw.startsWith('i') ? 'I' : null;
          if (party) parties.set(fm.title, party);
        } catch {}
      }
    }
  }
  return parties;
}

function committeeParty(name) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (PARTISAN_COMMITTEES[key]) return PARTISAN_COMMITTEES[key];
  const stripped = key
    .replace(/[\-,]\s*inc\.?$/, '')
    .replace(/[\-,]\s*pac$/, '')
    .replace(/ pac$/, '')
    .replace(/ committee$/, '')
    .replace(/ super pac$/, '')
    .trim();
  if (PARTISAN_COMMITTEES[stripped]) return PARTISAN_COMMITTEES[stripped];
  // Auto-map is intentionally NOT consulted for role tagging — the
  // empirical data captures direction of ALL spending (including direct
  // donations from industry PACs), which would incorrectly tag direct
  // donations as ie-support. Use `derive-partisan-committees.cjs` as a
  // diagnostic report to discover candidates for the hand map.
  return null;
}

(function main() {
  console.log(`[classify-ie-edges] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  const parties = loadPoliticianParties();
  console.log(`  politician parties loaded: ${parties.size}`);
  console.log(`  partisan committee entries: ${Object.keys(PARTISAN_COMMITTEES).length}\n`);

  const edges = loadEdges();
  console.log(`  total edges in store: ${edges.length.toLocaleString()}`);

  let candidates = 0;
  let classifiedOppose = 0;
  let classifiedSupport = 0;
  let skippedNoFromParty = 0;
  let skippedNoToParty = 0;
  let skippedUnknownFrom = 0;
  let alreadyHadRole = 0;

  const updates = [];
  const opposeByCommittee = new Map();
  const supportByCommittee = new Map();

  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (e.role === 'ie-oppose' || e.role === 'ie-support') { alreadyHadRole++; continue; }
    // Only fec-* sourced edges are candidates for IE classification
    if (!e.source || !e.source.startsWith('fec-')) continue;
    // Only where target is a known politician
    const toParty = parties.get(e.to);
    if (!toParty) { skippedNoToParty++; continue; }
    const fromParty = committeeParty(e.from);
    if (!fromParty) { skippedUnknownFrom++; continue; }
    if (fromParty === 'NEUTRAL') continue;

    candidates++;
    const role = fromParty !== toParty ? 'ie-oppose' : 'ie-support';
    if (role === 'ie-oppose') {
      classifiedOppose++;
      const agg = opposeByCommittee.get(e.from) || { amount: 0, count: 0 };
      agg.amount += Number(e.amount) || 0;
      agg.count++;
      opposeByCommittee.set(e.from, agg);
    } else {
      classifiedSupport++;
      const agg = supportByCommittee.get(e.from) || { amount: 0, count: 0 };
      agg.amount += Number(e.amount) || 0;
      agg.count++;
      supportByCommittee.set(e.from, agg);
    }
    // Stamp a why-tagged explanation onto the edge so downstream
    // consumers (/ask, /query, evidence panel) can show the reasoning.
    // Evidence array is additive: append without clobbering existing.
    const existingEvidence = Array.isArray(e.evidence) ? e.evidence : [];
    const reason = `classify-ie-edges: ${e.from} mapped as ${fromParty}-aligned; ${e.to} is party ${toParty} → role=${role}`;
    updates.push({
      ...e,
      role,
      classified_by: 'classify-ie-edges',
      classification_reason: reason,
      evidence: existingEvidence.includes(reason) ? existingEvidence : [...existingEvidence, reason],
    });
    if (VERBOSE) {
      console.log(`  [${role}] ${e.from} → ${e.to}: $${((e.amount || 0) / 1e6).toFixed(2)}M`);
    }
  }

  console.log(`\nClassification results:`);
  console.log(`  candidates (fec-* monetary, politician target, known PAC): ${candidates.toLocaleString()}`);
  console.log(`  → ie-oppose: ${classifiedOppose.toLocaleString()}`);
  console.log(`  → ie-support: ${classifiedSupport.toLocaleString()}`);
  console.log(`  skipped (unknown PAC): ${skippedUnknownFrom.toLocaleString()}`);
  console.log(`  skipped (target not a known politician): ${skippedNoToParty.toLocaleString()}`);
  console.log(`  already had role: ${alreadyHadRole.toLocaleString()}`);

  console.log(`\nTop 10 opposition committees now flagged (by dollars):`);
  [...opposeByCommittee.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 10)
    .forEach(([name, agg]) => {
      console.log(`  $${(agg.amount / 1e6).toFixed(1).padStart(8)}M  ${agg.count} edges  ${name}`);
    });

  console.log(`\nTop 10 support committees now flagged (by dollars):`);
  [...supportByCommittee.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 10)
    .forEach(([name, agg]) => {
      console.log(`  $${(agg.amount / 1e6).toFixed(1).padStart(8)}M  ${agg.count} edges  ${name}`);
    });

  if (!WRITE) {
    console.log(`\n[dry-run] no writes. Use --write to apply.`);
    return;
  }

  if (updates.length === 0) {
    console.log(`\nNothing to update.`);
    return;
  }

  console.log(`\nUpserting ${updates.length.toLocaleString()} edges with new role field...`);
  const result = upsertEdges(updates);
  console.log(`  added: ${result.added}`);
  console.log(`  updated: ${result.updated}`);
  console.log(`  skipped: ${result.skipped}`);
  console.log(`  invalid: ${result.invalid}`);
  if (result.errors?.length) {
    console.log(`  first errors:`);
    result.errors.slice(0, 5).forEach((e) => console.log('   ', e));
  }
})();
