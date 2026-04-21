#!/usr/bin/env node
/**
 * corp-federal-id-backfill.cjs
 *
 * Closes the "no-federal-identifier" gap for corporation entities by:
 *
 *   1. Fuzzy-matching the corp name against committee-master.jsonl's
 *      connected_org AND committee name fields — a corp with a federal
 *      PAC shows up under one or both. Populates signals.fec_committee_id.
 *
 *   2. Classifying unmatchable corps by name pattern:
 *      - industry-bloc aggregations (Crypto Industry, Real Estate
 *        Development Industry Bloc) → ein_coverage_expected=false
 *      - family-owned entities (Trump Organization) → explain as
 *        private-holding
 *      - tech/crypto/finance companies that need SEC EDGAR CIK —
 *        flag needs_sec_edgar_cik so the next download step knows
 *        what's missing
 *
 * Dry-run by default. --write applies.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const FEC_ROOT = 'C:/donor-map-data/fec';
const SEC_TICKERS_FILE = 'C:/donor-map-data/bulk/company_tickers.json';
const USASPENDING_DIR = 'C:/donor-map-data/bulk/USAspending award data';
const { spawn } = require('child_process');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// Normalize corp names for fuzzy matching. Strip corporate-form words
// (Inc, LLC, Corp, Company) and common filler (The, Of, Inc.'s various
// forms) so "Meta Platforms" matches "META PLATFORMS, INC." etc.
function normalize(s) {
  return (s || '').toUpperCase()
    // Drop apostrophes and quotes entirely (no space), so McDonald's
    // normalizes to MCDONALDS (matching the vault "McDonalds Corporation").
    .replace(/['’‘`]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|THE|OF|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split a corp name on "-" and take parts (e.g. "Google - Alphabet" →
// ["Google", "Alphabet"]), and also emit individual words for broader
// match. Used to match against committee-master.
function corpSearchTerms(name) {
  const terms = new Set();
  terms.add(normalize(name));
  // Split on " - " or "/" to handle multi-brand vault names.
  for (const part of name.split(/\s+[-/]\s+/)) {
    const p = normalize(part);
    if (p.length >= 3) terms.add(p);
  }
  return [...terms].filter((t) => t.length >= 3);
}

// Stream a USAspending contract ZIP, extract recipient_name +
// recipient_uei pairs, populate `out` map for any normalized name in
// the `targets` set. Uses `unzip -p` streamed to readline so we never
// decompress the full archive to disk.
async function scanUsaspendingZip(zipPath, targets, out) {
  const readline = require('readline');
  // Find CSVs inside zip first (names from central directory listing).
  const list = require('child_process').spawnSync('unzip', ['-l', zipPath], { maxBuffer: 10 * 1024 * 1024 });
  const csvNames = list.stdout.toString().split(/\r?\n/).map((l) => l.trim().split(/\s+/).pop()).filter((n) => n.endsWith('.csv'));
  for (const csv of csvNames) {
    await new Promise((resolve, reject) => {
      const proc = spawn('unzip', ['-p', zipPath, csv]);
      const rl = readline.createInterface({ input: proc.stdout });
      let header = null;
      let nameCol = -1, ueiCol = -1;
      rl.on('line', (line) => {
        if (!header) {
          header = line.split(',').map((h) => h.trim());
          nameCol = header.indexOf('recipient_name');
          ueiCol = header.indexOf('recipient_uei');
          if (nameCol < 0 || ueiCol < 0) { proc.kill(); resolve(); return; }
          return;
        }
        // Fast path: skip rows that can't contain any target. Cheap
        // substring test on raw line using the longest target ensures
        // we don't bother CSV-parsing most rows.
        // For correctness, we still need to parse CSV properly when we
        // think there's a hit. Use a simple quoted-field-aware split.
        // Parse only name + uei columns.
        const cols = parseCsvRow(line);
        if (cols.length <= Math.max(nameCol, ueiCol)) return;
        const rawName = cols[nameCol];
        const uei = cols[ueiCol];
        if (!rawName || !uei) return;
        const n = normalize(rawName);
        if (targets.has(n) && !out.has(n)) out.set(n, { uei, name: rawName });
        // Also index under first-2 normalized tokens.
        const words = n.split(' ').filter(Boolean);
        if (words.length >= 2) {
          const k2 = words.slice(0, 2).join(' ');
          if (targets.has(k2) && !out.has(k2)) out.set(k2, { uei, name: rawName });
        }
      });
      rl.on('close', resolve);
      proc.on('error', reject);
    });
  }
}

// Minimal RFC-4180 CSV row parser — handles quoted fields with embedded
// commas + escaped quotes. USAspending rows are well-formed.
function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function classifyCorp(name) {
  if (/\b(industry|bloc|sector|network|alliance)\b/i.test(name)
      && !/\bfund|foundation\b/i.test(name)) return 'aggregation';
  if (/\btrump (organization|media)\b/i.test(name)) return 'private-holding';
  if (/\bfamily\b/i.test(name) && !/\bfamily of \b/i.test(name)) return 'family-holding';
  // Tech, crypto, finance corps that have no federal PAC but exist in
  // SEC EDGAR. Flag so the next download step knows what to fetch.
  return 'needs-sec-edgar';
}

(async function main() {
  console.log(`[corp-federal-id-backfill] ${WRITE ? 'WRITE' : 'dry-run'}\n`);

  // Build committee-master indexes by connected_org and committee name,
  // each stored as a list of {id, ...} under multiple normalized key
  // forms (full + first-2-words + first-word).
  console.log('  loading committee-master.jsonl...');
  const cmteByKey = new Map(); // normalized key → array of {id, connected_org, name}
  function indexUnder(key, rec) {
    if (!key || key.length < 4) return;
    if (!cmteByKey.has(key)) cmteByKey.set(key, []);
    const bucket = cmteByKey.get(key);
    if (!bucket.some((x) => x.id === rec.id)) bucket.push(rec);
  }
  {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'committee-master.jsonl')) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (!r.id) continue;
        const rec = { id: r.id, connected_org: r.connected_org || '', name: r.name || '' };
        // Index each candidate source-name: connected_org and committee name.
        for (const src of [r.connected_org, r.name]) {
          if (!src) continue;
          const full = normalize(src);
          indexUnder(full, rec);
          // Also index under first 2 normalized words so "META PLATFORMS"
          // matches vault name "Meta - Facebook" → search term "META".
          const words = full.split(' ').filter(Boolean);
          if (words.length >= 2) indexUnder(words.slice(0, 2).join(' '), rec);
          if (words.length >= 1 && words[0].length >= 4) indexUnder(words[0], rec);
        }
      } catch {}
    }
  }
  console.log(`  committee-master unique keys: ${cmteByKey.size}`);

  // Load SEC EDGAR ticker file: JSON map of {"0": {cik_str, ticker, title}, ...}
  // Every SEC-registered public company. Used to populate signals.sec_cik
  // + signals.ticker for corps lacking FEC identifiers.
  console.log('  loading SEC EDGAR company_tickers.json...');
  const secByName = new Map();   // normalized title → {cik, ticker, title}
  const secByTicker = new Map(); // ticker → same
  try {
    const raw = JSON.parse(fs.readFileSync(SEC_TICKERS_FILE, 'utf-8'));
    for (const k of Object.keys(raw)) {
      const r = raw[k];
      if (!r.cik_str || !r.title) continue;
      const cik = String(r.cik_str).padStart(10, '0');
      const rec = { cik, ticker: r.ticker, title: r.title };
      const n = normalize(r.title);
      if (n.length >= 3 && !secByName.has(n)) secByName.set(n, rec);
      // Also first-2-words form so "META PLATFORMS" can match "Meta - Facebook".
      const words = n.split(' ').filter(Boolean);
      if (words.length >= 2) {
        const k2 = words.slice(0, 2).join(' ');
        if (!secByName.has(k2)) secByName.set(k2, rec);
      }
      if (r.ticker) secByTicker.set(r.ticker.toUpperCase(), rec);
    }
  } catch (e) {
    console.log(`  WARN: could not load SEC tickers (${e.message}) — skipping SEC step`);
  }
  console.log(`  SEC registered companies indexed: ${secByName.size}`);

  // USAspending UEI index — stream all contract CSVs (FY2025 + FY2026)
  // and extract recipient_name → recipient_uei pairs for every corp we
  // still need to identify. Corps with public SEC records already got
  // CIKs in step 1b; this step closes federal-contractor corps like
  // Blackstone, Palantir, etc. that aren't publicly traded but receive
  // federal contracts.
  const ents = loadEntities();
  const corps = ents.filter((e) => e.entity_type === 'corporation');

  // TICKER ENRICHMENT PASS: every corp (even ones with FEC IDs already)
  // gets ticker/CIK if a clean SEC match exists. This populates the
  // Ask lookup index so users can type "$AAPL" and get Apple even
  // though Apple already has an FEC committee ID. Additive only —
  // never overwrites.
  const tickerUpdates = new Map();
  for (const e of corps) {
    if (e.signals?.sec_cik) continue; // already has one, skip
    for (const t of corpSearchTerms(e.name)) {
      const hit = secByName.get(t);
      if (hit) {
        const hitFirstWord = normalize(hit.title).split(' ')[0];
        const termFirstWord = t.split(' ')[0];
        if (hitFirstWord === termFirstWord) {
          tickerUpdates.set(e.name, { sec_cik: hit.cik, ticker: hit.ticker, sec_cik_source: `sec-edgar:${hit.title}` });
          break;
        }
      }
    }
  }
  console.log(`  ticker enrichment (additive): ${tickerUpdates.size} corps get ticker/CIK`);

  const needsWork = corps.filter((e) => {
    const s = e.signals || {};
    return !s.fec_committee_id && !(s.fec_committee_ids || []).length && !s.uei && !s.ein && !s.sec_cik;
  });
  console.log(`\n  corporations: ${corps.length} (no-federal-id: ${needsWork.length})\n`);

  // Scan USAspending for UEIs of corps still needing identifiers.
  // Stream each ZIPped contract CSV via `unzip -p`; parse only
  // recipient_name + recipient_uei columns; match against target set.
  const ueiByNormName = new Map();
  const targetNormNames = new Set();
  for (const e of needsWork) {
    for (const t of corpSearchTerms(e.name)) targetNormNames.add(t);
  }
  if (fs.existsSync(USASPENDING_DIR) && targetNormNames.size > 0) {
    console.log(`  scanning USAspending contracts for ${targetNormNames.size} target name terms...`);
    const zipFiles = fs.readdirSync(USASPENDING_DIR).filter((f) => f.endsWith('.zip'));
    for (const zf of zipFiles) {
      await scanUsaspendingZip(path.join(USASPENDING_DIR, zf), targetNormNames, ueiByNormName);
      console.log(`    ${zf}: cumulative UEI matches so far = ${ueiByNormName.size}`);
    }
  }

  const updates = new Map();
  const counts = { fec_matched: 0, sec_matched: 0, uei_matched: 0, aggregation: 0, private_holding: 0, family_holding: 0, needs_sec_edgar: 0 };

  for (const e of needsWork) {
    const terms = corpSearchTerms(e.name);
    // Look for a committee-master match. To avoid false positives
    // (e.g. "Ripple" (crypto) matching "RIPPLE OF HOPE PAC INC"), we
    // REQUIRE the connected_org field to start with the search term —
    // connected_org is FEC's authoritative "this PAC belongs to this
    // organization" field. We will NOT rely on committee name alone
    // (committee names often contain the company name incidentally).
    let bestMatch = null;
    for (const t of terms) {
      const hits = cmteByKey.get(t) || [];
      for (const h of hits) {
        const connNorm = normalize(h.connected_org);
        if (connNorm && (connNorm === t || connNorm.startsWith(t + ' '))) {
          bestMatch = h;
          break;
        }
      }
      if (bestMatch) break;
    }

    if (bestMatch) {
      updates.set(e.name, {
        fec_committee_id: bestMatch.id,
        fec_committee_id_source: `cmte-master:${bestMatch.connected_org || bestMatch.name}`,
      });
      counts.fec_matched++;
      continue;
    }

    // 1b. SEC EDGAR CIK lookup. Try each normalized search term; require
    // a match — secByName keys were built from first-2-words + full so
    // "META PLATFORMS" lands Meta. Reject obvious false positives where
    // the vault name is much shorter than the SEC title prefix would
    // imply (e.g. single-word vault name "APPLE" matching some SEC
    // record "APPLE HOSPITALITY REIT INC" — we require at least the
    // first SEC title word to equal the vault term).
    let secHit = null;
    for (const t of terms) {
      const hit = secByName.get(t);
      if (hit) {
        const hitFirstWord = normalize(hit.title).split(' ')[0];
        const termFirstWord = t.split(' ')[0];
        if (hitFirstWord === termFirstWord) { secHit = hit; break; }
      }
    }
    if (secHit) {
      updates.set(e.name, {
        sec_cik: secHit.cik,
        ticker: secHit.ticker,
        sec_cik_source: `sec-edgar:${secHit.title}`,
      });
      counts.sec_matched++;
      continue;
    }

    // 1c. USAspending UEI lookup — federal contract recipient registry.
    // Covers private LLCs (Blackstone, Palantir, private-equity contractors)
    // that don't have SEC CIKs but do have federal contracts.
    let ueiHit = null;
    for (const t of terms) {
      const hit = ueiByNormName.get(t);
      if (hit) {
        const hitFirstWord = normalize(hit.name).split(' ')[0];
        const termFirstWord = t.split(' ')[0];
        if (hitFirstWord === termFirstWord) { ueiHit = hit; break; }
      }
    }
    if (ueiHit) {
      updates.set(e.name, {
        uei: ueiHit.uei,
        uei_source: `usaspending:${ueiHit.name}`,
      });
      counts.uei_matched++;
      continue;
    }

    // Classify unmatchable.
    const cat = classifyCorp(e.name);
    if (cat === 'aggregation') {
      updates.set(e.name, { federal_id_expected: false, federal_id_reason: 'industry-bloc-aggregation' });
      counts.aggregation++;
    } else if (cat === 'private-holding') {
      updates.set(e.name, { federal_id_expected: false, federal_id_reason: 'private-holding-no-federal-filings' });
      counts.private_holding++;
    } else if (cat === 'family-holding') {
      updates.set(e.name, { federal_id_expected: false, federal_id_reason: 'family-owned-entity' });
      counts.family_holding++;
    } else {
      // Don't mark these as "expected false" — they SHOULD have SEC or
      // FEC coverage, we just don't have local data to supply it. Mark
      // so the download-next step knows what to fetch.
      updates.set(e.name, { needs_sec_edgar_cik: true });
      counts.needs_sec_edgar++;
    }
  }

  console.log('  results:');
  console.log(`    FEC committee-id matched:              ${counts.fec_matched}`);
  console.log(`    SEC CIK matched:                       ${counts.sec_matched}`);
  console.log(`    USAspending UEI matched:               ${counts.uei_matched}`);
  console.log(`    industry-bloc aggregation:             ${counts.aggregation}`);
  console.log(`    private holding / family:              ${counts.private_holding + counts.family_holding}`);
  console.log(`    needs SEC EDGAR CIK (next download):   ${counts.needs_sec_edgar}`);
  console.log(`    total updates:                         ${updates.size}`);

  if (VERBOSE) {
    console.log('\n  sample 20 updates:');
    let i = 0;
    for (const [name, u] of updates) {
      if (i++ >= 20) break;
      const what = u.fec_committee_id ? `fec=${u.fec_committee_id} [${u.fec_committee_id_source}]` :
                   u.sec_cik ? `cik=${u.sec_cik} ticker=${u.ticker || '-'} [${u.sec_cik_source}]` :
                   u.uei ? `uei=${u.uei} [${u.uei_source}]` :
                   u.federal_id_expected === false ? `expected=false (${u.federal_id_reason})` :
                   `needs-sec-edgar`;
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
    const t = tickerUpdates.get(rec.name);
    if (!u && !t) { out.push(line); continue; }
    rec.signals = rec.signals || {};
    // Ticker enrichment is additive and runs for every corp that has
    // a clean SEC match, including corps with FEC committee IDs.
    if (t && !rec.signals.sec_cik) {
      rec.signals.sec_cik = t.sec_cik;
      rec.signals.ticker = t.ticker;
      rec.signals.sec_cik_sourced_from = t.sec_cik_source;
    }
    if (!u) { out.push(JSON.stringify(rec)); touched++; continue; }
    if (u.fec_committee_id) {
      if (!rec.signals.fec_committee_ids) rec.signals.fec_committee_ids = [];
      if (!rec.signals.fec_committee_ids.includes(u.fec_committee_id)) {
        rec.signals.fec_committee_ids.push(u.fec_committee_id);
      }
      if (!rec.signals.fec_committee_id) rec.signals.fec_committee_id = u.fec_committee_id;
      rec.signals.fec_committee_id_sourced_from = u.fec_committee_id_source;
    }
    if (u.sec_cik) {
      rec.signals.sec_cik = u.sec_cik;
      if (u.ticker) rec.signals.ticker = u.ticker;
      rec.signals.sec_cik_sourced_from = u.sec_cik_source;
      delete rec.signals.needs_sec_edgar_cik;
    }
    if (u.uei) {
      rec.signals.uei = u.uei;
      rec.signals.uei_sourced_from = u.uei_source;
      delete rec.signals.needs_sec_edgar_cik;
    }
    if (u.federal_id_expected === false) {
      rec.signals.federal_id_expected = false;
      rec.signals.federal_id_reason = u.federal_id_reason;
    }
    if (u.needs_sec_edgar_cik) rec.signals.needs_sec_edgar_cik = true;
    rec.signals.federal_id_backfilled_at = new Date().toISOString();
    out.push(JSON.stringify(rec));
    touched++;
  }
  fs.writeFileSync(ENT_FILE, out.join('\n'));
  console.log(`\n  wrote: ${touched} entities updated in entities.jsonl`);
})();
