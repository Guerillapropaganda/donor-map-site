#!/usr/bin/env node
/**
 * donor-ein-backfill.cjs
 *
 * Closes the "no-fec-and-no-ein" / "dark-money-no-ein" coverage gaps
 * flagged by coverage-gap-audit by:
 *
 *   1. Fuzzy-matching donor entity names against IRS 990 filer names
 *      (C:/donor-map-data/fec/nonprofit-990.jsonl) to populate
 *      signals.ein where the entity is a real nonprofit filer we
 *      have data for but haven't linked yet.
 *
 *   2. Fuzzy-matching against committee-master.jsonl to populate
 *      signals.fec_committee_id for PAC-shaped donor entities.
 *
 *   3. Classifying unmatchable entities by name pattern — individuals,
 *      industry-bloc aggregations, for-profit corporations — and
 *      stamping signals.ein_coverage_expected=false so the audit can
 *      stop false-flagging entities that legitimately won't ever have
 *      an EIN (same pattern ADR-shape as appointee federal-coverage
 *      flagging for politicians).
 *
 * Dry-run by default. --write applies.
 *
 * After apply, re-run node scripts/coverage-gap-audit.cjs --type donor
 * to measure.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const FEC_ROOT = 'C:/donor-map-data/fec';
const EOBMF_ROOT = 'C:/donor-map-data/bulk/EOBMSFE'; // IRS EO BMF extract (eo1-4.csv, eo_pr, eo_xx)
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

function normalize(s) {
  // Keep nonprofit-identity words (FOUNDATION/FUND/INSTITUTE/ASSOCIATION/
  // TRUST) because they distinguish otherwise-identical names in the IRS
  // EO BMF (the "John Adams Institute" is a distinct entity from "John
  // Adams"). Strip only corporate-form suffixes + filler.
  return (s || '').toUpperCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|INCORPORATED|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|THE|OF|FOR|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyNoEinCategory(name, sector) {
  const s = name.toLowerCase();
  // For-profit first — LLCs, hedge funds, and VC shops have English-looking
  // names that otherwise match the "person" pattern (Elliott Management,
  // Andreessen Horowitz). Catch them before the individual-donor test.
  if (/\b(inc|llc|lp|llp|corp|corporation|capital|partners|holdings|management|bank|ventures|labs|technologies|systems|solutions|advisors|securities|associates|consulting)\b/i.test(name)) return 'for-profit';
  // Party committees (expected to have FEC id, not EIN).
  if (/\b(dnc|rnc|dccc|dscc|nrcc|nrsc|dsc)\b/i.test(name)
      || /\bnational committee\b/i.test(name)) return 'party-committee';
  // PAC-shaped (expected to have FEC id, not EIN).
  if (/\b(pac|super pac|victory fund|leadership pac)\b/i.test(s)) return 'pac';
  // Industry aggregations / blocs / synthetic groupings. "Hedge Fund
  // Industry Bloc" is a bloc-of-funds, not a fund itself — match on the
  // grouping keyword regardless of whether the name also contains "Fund".
  if (/\b(industry|industries|bloc|sector|networks?|class|donors?|money)\b/i.test(name)) return 'aggregation';
  // Family offices — "Smith Family", "Adelson Family Office" etc.
  if (/\bfamily( office)?$/i.test(name)) return 'family-office';
  // Individual-donor detection: 2-4 capitalized words, no keywords.
  const looksLikePerson = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z'-]+)?\s+[A-Z][a-z'-]+(?:\s+(?:Jr\.?|Sr\.?|III|II|IV))?$/.test(name)
    && !/\b(fund|foundation|institute|pac|committee|group|inc|llc|corp|bank|capital|trust|partners|holdings|industry|bloc|network|class|donor|management|ventures|labs|enterprises|media|securities|associates|consulting|global|international)s?\b/i.test(name);
  if (looksLikePerson) return 'individual';
  // Nothing obvious — this is a candidate for EIN lookup.
  return 'nonprofit-candidate';
}

(async function main() {
  console.log(`[donor-ein-backfill] ${WRITE ? 'WRITE' : 'dry-run'}\n`);

  // Load IRS EO BMF (exempt orgs master file): every US nonprofit with
  // its EIN. ~2M rows across 6 regional CSVs. Indexed by normalized
  // name so a vault donor name can fuzzy-match to any registered
  // nonprofit. Ambiguous names (multiple EINs under same normalized
  // form) are dropped — we'd rather leave unmatched than assign wrong.
  console.log('  loading IRS EO BMF (EOBMSFE)...');
  const eoByName = new Map();  // normalized name → {ein, name} OR null if ambiguous
  let eoRowCount = 0;
  {
    const files = fs.existsSync(EOBMF_ROOT) ? fs.readdirSync(EOBMF_ROOT).filter((f) => f.endsWith('.csv')) : [];
    for (const fname of files) {
      const rl = readline.createInterface({ input: fs.createReadStream(path.join(EOBMF_ROOT, fname)) });
      let header = null;
      for await (const line of rl) {
        if (!line.trim()) continue;
        if (!header) { header = line.split(',').map((h) => h.trim().toUpperCase()); continue; }
        // Quick CSV split — EOBMFE has no embedded commas in the name
        // column for 99%+ of rows; for the rest we tolerate truncation.
        const cols = line.split(',');
        const ein = cols[0];
        const name = cols[1];
        if (!ein || !name) continue;
        eoRowCount++;
        const k = normalize(name);
        if (k.length < 4) continue;
        if (eoByName.has(k)) {
          // Already have an entry — check if it's the same EIN.
          const existing = eoByName.get(k);
          if (existing && existing.ein !== ein) eoByName.set(k, null); // ambiguous
        } else {
          eoByName.set(k, { ein, name });
        }
      }
    }
  }
  const eoUnambig = [...eoByName.values()].filter(Boolean).length;
  console.log(`  EO BMF rows scanned: ${eoRowCount}, unique unambiguous normalized names: ${eoUnambig}`);

  // Load 990 filer index.
  console.log('  loading nonprofit-990.jsonl...');
  const einByFilerNorm = new Map();   // normalized filer name → ein
  const einByFilerExact = new Map();  // raw uppercased filer name → ein
  let filer990Count = 0;
  {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'nonprofit-990.jsonl')) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (!r.ein) continue;
        if (r.filer_name_normalized) {
          const k = normalize(r.filer_name_normalized);
          if (k.length >= 3 && !einByFilerNorm.has(k)) {
            einByFilerNorm.set(k, { ein: r.ein, filer_name: r.filer_name || r.filer_name_normalized });
            filer990Count++;
          }
        }
        if (r.filer_name) {
          const u = r.filer_name.toUpperCase().trim();
          if (!einByFilerExact.has(u)) einByFilerExact.set(u, { ein: r.ein, filer_name: r.filer_name });
        }
      } catch {}
    }
  }
  console.log(`  990 unique normalized filers: ${einByFilerNorm.size}`);

  // Load committee-master index.
  console.log('  loading committee-master.jsonl...');
  const cmteByNorm = new Map();
  {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'committee-master.jsonl')) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (!r.id || !r.name) continue;
        const k = normalize(r.name);
        if (k.length >= 3 && !cmteByNorm.has(k)) {
          cmteByNorm.set(k, { id: r.id, name: r.name, connected_org: r.connected_org });
        }
      } catch {}
    }
  }
  console.log(`  committee-master unique normalized names: ${cmteByNorm.size}`);

  // Scan donors.
  const ents = loadEntities();
  const donors = ents.filter((e) => (e.entity_type === 'donor' || e.entity_type === 'nonprofit'));
  const needsWork = donors.filter((e) => !e.signals?.ein);
  console.log(`\n  donors + nonprofits: ${donors.length} (no-ein: ${needsWork.length})\n`);

  const updates = new Map(); // name → {ein?, fec_committee_id?, classification?, ein_source?}
  const counts = { ein_direct: 0, ein_fuzzy: 0, ein_eobmf: 0, fec_id_match: 0, classified_individual: 0, classified_aggregation: 0, classified_forprofit: 0, classified_party: 0, classified_pac_needs_fec: 0, unresolved: 0 };

  for (const e of needsWork) {
    const signals = e.signals || {};
    const name = e.name;
    const nameUp = name.toUpperCase().trim();
    const nameNorm = normalize(name);

    // 1. Direct EIN lookup by exact or normalized filer name.
    if (einByFilerExact.has(nameUp)) {
      const hit = einByFilerExact.get(nameUp);
      updates.set(name, { ein: hit.ein, ein_source: `990-filer-exact:${hit.filer_name}` });
      counts.ein_direct++;
      continue;
    }
    if (nameNorm.length >= 4 && einByFilerNorm.has(nameNorm)) {
      const hit = einByFilerNorm.get(nameNorm);
      updates.set(name, { ein: hit.ein, ein_source: `990-filer-normalized:${hit.filer_name}` });
      counts.ein_fuzzy++;
      continue;
    }
    // 1b. IRS EO BMF lookup — massive nonprofit name→EIN index.
    if (nameNorm.length >= 4 && eoByName.has(nameNorm)) {
      const hit = eoByName.get(nameNorm);
      if (hit) { // non-null = unambiguous
        updates.set(name, { ein: hit.ein, ein_source: `eo-bmf:${hit.name}` });
        counts.ein_eobmf++;
        continue;
      }
    }

    // 2. FEC committee-id lookup (skip if already have one).
    const hasFecId = signals.fec_committee_id || (signals.fec_committee_ids || []).length > 0;
    if (!hasFecId && nameNorm.length >= 4 && cmteByNorm.has(nameNorm)) {
      const hit = cmteByNorm.get(nameNorm);
      updates.set(name, { fec_committee_id: hit.id, fec_committee_id_source: `cmte-master:${hit.name}` });
      counts.fec_id_match++;
      continue;
    }

    // 3. Classify — explain the legitimate absence of EIN so audit stops flagging.
    const cat = classifyNoEinCategory(name, signals.sector);
    if (cat === 'individual') {
      updates.set(name, { ein_coverage_expected: false, ein_coverage_reason: 'individual-donor' });
      counts.classified_individual++;
    } else if (cat === 'aggregation') {
      updates.set(name, { ein_coverage_expected: false, ein_coverage_reason: 'industry-bloc-aggregation' });
      counts.classified_aggregation++;
    } else if (cat === 'for-profit') {
      updates.set(name, { ein_coverage_expected: false, ein_coverage_reason: 'for-profit-entity' });
      counts.classified_forprofit++;
    } else if (cat === 'party-committee') {
      updates.set(name, { ein_coverage_expected: false, ein_coverage_reason: 'party-committee-uses-fec-id' });
      counts.classified_party++;
    } else if (cat === 'family-office') {
      updates.set(name, { ein_coverage_expected: false, ein_coverage_reason: 'family-office' });
      counts.classified_individual++;
    } else if (cat === 'pac') {
      // PACs are FEC-registered 527s; they don't have EINs in the
      // IRS 501(c) sense. Flag ein_coverage_expected=false so audit
      // stops nagging. If the FEC committee-id is also missing, the
      // `unresolved PAC (needs FEC id)` counter still surfaces it
      // separately via `unresolvable committees` in aggregator logs.
      updates.set(name, { ein_coverage_expected: false, ein_coverage_reason: 'pac-uses-fec-id' });
      counts.classified_pac_needs_fec++;
    } else {
      counts.unresolved++;
    }
  }

  console.log('  results:');
  console.log(`    EIN found (exact filer-name match):    ${counts.ein_direct}`);
  console.log(`    EIN found (normalized fuzzy match):    ${counts.ein_fuzzy}`);
  console.log(`    EIN found (IRS EO BMF):                ${counts.ein_eobmf}`);
  console.log(`    FEC committee id matched:              ${counts.fec_id_match}`);
  console.log(`    classified individual:                 ${counts.classified_individual}`);
  console.log(`    classified industry-bloc/aggregation:  ${counts.classified_aggregation}`);
  console.log(`    classified for-profit:                 ${counts.classified_forprofit}`);
  console.log(`    classified party-committee:            ${counts.classified_party}`);
  console.log(`    unresolved PAC (needs FEC id):         ${counts.classified_pac_needs_fec}`);
  console.log(`    unresolved nonprofit-candidate:        ${counts.unresolved}`);
  console.log(`    total updates to apply:                ${updates.size}`);

  if (VERBOSE) {
    console.log('\n  sample 20 updates:');
    let i = 0;
    for (const [name, u] of updates) {
      if (i++ >= 20) break;
      const what = u.ein ? `ein=${u.ein} [${u.ein_source}]` :
                   u.fec_committee_id ? `fec_cmte=${u.fec_committee_id} [${u.fec_committee_id_source}]` :
                   `expected=false (${u.ein_coverage_reason})`;
      console.log(`    ${name} → ${what}`);
    }
  }

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  const text = fs.readFileSync(ENT_FILE, 'utf-8');
  const out = [];
  let touched = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(line); } catch { out.push(line); continue; }
    const u = updates.get(rec.name);
    if (!u) { out.push(line); continue; }
    rec.signals = rec.signals || {};
    if (u.ein) {
      rec.signals.ein = u.ein;
      rec.signals.ein_sourced_from = u.ein_source;
    }
    if (u.fec_committee_id) {
      if (!rec.signals.fec_committee_ids) rec.signals.fec_committee_ids = [];
      if (!rec.signals.fec_committee_ids.includes(u.fec_committee_id)) {
        rec.signals.fec_committee_ids.push(u.fec_committee_id);
      }
      if (!rec.signals.fec_committee_id) rec.signals.fec_committee_id = u.fec_committee_id;
      rec.signals.fec_committee_id_sourced_from = u.fec_committee_id_source;
    }
    if (u.ein_coverage_expected === false) {
      rec.signals.ein_coverage_expected = false;
      rec.signals.ein_coverage_reason = u.ein_coverage_reason;
    }
    rec.signals.ein_backfilled_at = new Date().toISOString();
    out.push(JSON.stringify(rec));
    touched++;
  }
  fs.writeFileSync(ENT_FILE, out.join('\n'));
  console.log(`\n  wrote: ${touched} entities updated in entities.jsonl`);
})();
