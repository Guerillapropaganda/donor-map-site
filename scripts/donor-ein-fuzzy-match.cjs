#!/usr/bin/env node
/**
 * donor-ein-fuzzy-match.cjs
 *
 * Closes the long tail of unresolved donor EINs via two passes:
 *
 *   Pass 1 — classifier enhancement (fast):
 *     Many remaining "no EIN" donors are individuals, aggregations, or
 *     for-profit vehicles that legitimately won't have an IRS 501(c) EIN.
 *     Extend the regex classification to catch edge cases the original
 *     donor-ein-backfill missed (person-name with "and", dash-compound
 *     like "FTX - Sam Bankman-Fried", etc.).
 *
 *   Pass 2 — fuzzy EOBMSFE match (targeted):
 *     For donors that still look like nonprofit names, do a Jaccard
 *     token-intersection match against the IRS EO BMF extract. First-
 *     word bucket index keeps this cheap: avg bucket ~50 records, so
 *     100 remaining donors × 50 = 5K comparisons total.
 *
 * Dry-run by default. --write applies.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const EOBMF_ROOT = 'C:/donor-map-data/bulk/EOBMSFE';
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

function normalize(s) {
  return (s || '').toUpperCase()
    .replace(/['\u2019\u2018\x60]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|INCORPORATED|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|THE|OF|FOR|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyExpanded(name) {
  const lower = name.toLowerCase();
  // Aggregation keywords (strongest signal).
  if (/\b(industry|industries|bloc|sector|networks?|class|donors?|money|base|pipeline|coalition|ecosystem|complex|wing|movement)\b/i.test(name)) return 'aggregation';
  // Dash-compound that ends in a person name (e.g. "FTX - Sam Bankman-Fried")
  if (/-\s*([A-Z][a-z]+\s+)+[A-Z][a-z'-]+$/.test(name)) return 'individual-compound';
  // "X and Y" person-couple pattern (e.g. "Richard and Elizabeth Uihlein")
  if (/^[A-Z][a-z]+\s+and\s+[A-Z][a-z]+\s+[A-Z][a-z'-]+$/.test(name)) return 'individual-couple';
  // Explicit PAC/committee forms
  if (/\b(dnc|rnc|dccc|dscc|nrcc|nrsc)\b/i.test(name)
      || /\bnational (committee|republican|democratic)\b/i.test(name)
      || /\bcampaign committee$/i.test(lower)) return 'party-committee';
  if (/\b(super pac|pac|victory fund|leadership pac)\b/i.test(lower)) return 'pac';
  // For-profit (expanded — was too narrow originally)
  if (/\b(inc|llc|lp|llp|corp|corporation|capital|partners|holdings|management|bank|ventures|labs|technologies|systems|solutions|advisors|securities|associates|consulting|enterprises|horowitz|andreessen)\b/i.test(name)) return 'for-profit';
  // Individual names (looser pattern)
  const looksLikePerson = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z'-]+(?:\s+(?:Jr\.?|Sr\.?|III|II|IV))?$/.test(name);
  const hasKeyword = /\b(fund|foundation|institute|pac|committee|trust|partners|industry|bloc|network)\b/i.test(name);
  if (looksLikePerson && !hasKeyword) return 'individual';
  // Essay / story-style entity (e.g. "Cambridge Analytica and the Data Weaponization of Elections")
  if (name.length > 50 && / of | for | and /i.test(name) && /\w+tion\b/i.test(name)) return 'narrative-entity';
  return 'nonprofit-candidate';
}

async function main() {
  console.log(`[donor-ein-fuzzy-match] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);

  const ents = loadEntities();
  const unresolved = ents.filter((e) =>
    (e.entity_type === 'donor' || e.entity_type === 'nonprofit') &&
    !e.signals?.ein &&
    e.signals?.ein_coverage_expected !== false
  );
  console.log(`  unresolved donors/nonprofits: ${unresolved.length}`);

  // Pass 1: classifier enhancement.
  const updates = new Map();
  const counts = {
    aggregation: 0, individual: 0, 'individual-compound': 0, 'individual-couple': 0,
    'party-committee': 0, pac: 0, 'for-profit': 0, 'narrative-entity': 0, 'nonprofit-candidate': 0,
  };
  const fuzzyCandidates = [];
  for (const e of unresolved) {
    const cat = classifyExpanded(e.name);
    counts[cat]++;
    if (cat === 'nonprofit-candidate') { fuzzyCandidates.push(e); continue; }
    const reason = cat === 'individual' || cat === 'individual-compound' || cat === 'individual-couple' ? 'individual-donor'
      : cat === 'for-profit' ? 'for-profit-entity'
      : cat === 'aggregation' ? 'industry-bloc-aggregation'
      : cat === 'pac' ? 'pac-uses-fec-id'
      : cat === 'party-committee' ? 'party-committee-uses-fec-id'
      : cat === 'narrative-entity' ? 'narrative-concept-entity'
      : 'other';
    updates.set(e.name, { ein_coverage_expected: false, ein_coverage_reason: reason });
  }
  console.log('\n  pass 1 classification:');
  for (const [k, v] of Object.entries(counts)) console.log(`    ${String(v).padStart(4)} ${k}`);
  console.log(`  flagged via classifier: ${updates.size}`);
  console.log(`  still nonprofit-candidate (→ fuzzy match): ${fuzzyCandidates.length}`);

  // Pass 2: fuzzy EOBMSFE match for remaining nonprofit candidates.
  if (fuzzyCandidates.length === 0) {
    console.log('\n  no fuzzy-match candidates.');
  } else {
    console.log('\n  building EOBMSFE first-word bucket index...');
    const bucket = new Map(); // first-word → [{ein, name, normTokens}, ...]
    let rowCount = 0;
    const files = fs.existsSync(EOBMF_ROOT) ? fs.readdirSync(EOBMF_ROOT).filter((f) => f.endsWith('.csv')) : [];
    for (const fname of files) {
      const rl = readline.createInterface({ input: fs.createReadStream(path.join(EOBMF_ROOT, fname)) });
      let header = null;
      for await (const line of rl) {
        if (!line.trim()) continue;
        if (!header) { header = true; continue; }
        const c = line.split(',');
        const ein = c[0];
        const name = c[1];
        if (!ein || !name) continue;
        rowCount++;
        const tokens = normalize(name).split(' ').filter(Boolean);
        if (!tokens.length) continue;
        const firstWord = tokens[0];
        if (firstWord.length < 3) continue;
        if (!bucket.has(firstWord)) bucket.set(firstWord, []);
        bucket.get(firstWord).push({ ein, name, tokens: new Set(tokens) });
      }
    }
    console.log(`  EOBMSFE rows: ${rowCount.toLocaleString()}, buckets: ${bucket.size.toLocaleString()}`);

    // Score: token Jaccard similarity. Accept if ≥0.7 AND no ambiguous tie.
    let matched = 0, noCandidate = 0, ambiguous = 0;
    for (const ent of fuzzyCandidates) {
      const tokens = new Set(normalize(ent.name).split(' ').filter(Boolean));
      if (!tokens.size) { noCandidate++; continue; }
      const firstWord = [...tokens][0]; // first token in normalized form
      const candidates = bucket.get(firstWord) || [];
      let best = null, secondBest = null;
      for (const c of candidates) {
        const inter = [...tokens].filter((t) => c.tokens.has(t)).length;
        const union = new Set([...tokens, ...c.tokens]).size;
        const jaccard = union === 0 ? 0 : inter / union;
        if (!best || jaccard > best.jaccard) { secondBest = best; best = { jaccard, rec: c }; }
        else if (!secondBest || jaccard > secondBest.jaccard) secondBest = { jaccard, rec: c };
      }
      if (!best || best.jaccard < 0.7) { noCandidate++; continue; }
      // Reject if secondBest is within 0.1 (ambiguous).
      if (secondBest && secondBest.jaccard >= best.jaccard - 0.1 && secondBest.rec.ein !== best.rec.ein) {
        ambiguous++;
        continue;
      }
      matched++;
      updates.set(ent.name, { ein: best.rec.ein, ein_source: `eo-bmf-fuzzy:${best.rec.name}(jaccard=${best.jaccard.toFixed(2)})` });
      if (VERBOSE && matched <= 15) console.log(`    ${ent.name} → ${best.rec.name} (EIN ${best.rec.ein}, ${best.jaccard.toFixed(2)})`);
    }
    console.log(`\n  fuzzy matched: ${matched}`);
    console.log(`  no candidate: ${noCandidate}`);
    console.log(`  ambiguous (rejected): ${ambiguous}`);
  }

  console.log(`\n  total updates: ${updates.size}`);
  if (!WRITE) { console.log('\n  rerun with --write to apply.'); return; }

  // Rewrite entities.jsonl
  const text = fs.readFileSync(ENT_FILE, 'utf-8');
  const out = [];
  const now = new Date().toISOString();
  let touched = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(line); } catch { out.push(line); continue; }
    const u = updates.get(rec.name);
    if (!u) { out.push(line); continue; }
    rec.signals = rec.signals || {};
    if (u.ein) { rec.signals.ein = u.ein; rec.signals.ein_sourced_from = u.ein_source; }
    if (u.ein_coverage_expected === false) {
      rec.signals.ein_coverage_expected = false;
      rec.signals.ein_coverage_reason = u.ein_coverage_reason;
    }
    rec.signals.ein_fuzzy_pass_at = now;
    out.push(JSON.stringify(rec));
    touched++;
  }
  fs.writeFileSync(ENT_FILE, out.join('\n'));
  console.log(`  wrote ${touched} entity updates.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
