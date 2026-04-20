#!/usr/bin/env node
/**
 * politician-historical-coverage-backfill.cjs
 *
 * Closes the Bernie-class gap: politicians whose entities.jsonl record
 * has at most ONE fec_candidate_id (their current cycle) while FEC's
 * candidate-master has multiple records spanning their full career —
 * House → Senate → President, 2006 → 2012 → 2018 → 2020 etc.
 *
 * The previous sync-campaign-committees.cjs required an exact chamber
 * match, which silently drops prior-office cycles for anyone who
 * changed chambers or ran for president. This script relaxes chamber
 * matching to name+nickname only, and pools every historical FEC
 * candidate record under the politician's entity.
 *
 * What it updates per politician:
 *   - signals.fec_candidate_ids        (new field, array of ALL matching ids)
 *   - signals.fec_committee_ids        (pooled principal committees)
 *   - signals.fec_candidate_history    (array of {id, office, cycle, pc})
 *
 * And adds to data/fec-committee-registry.json:
 *   - one entry per principal committee id mapping to the politician's
 *     profile_path (so the FEC ingest aggregator can route inflows
 *     to the politician instead of a bare committee name)
 *
 * Safe:
 *   - Won't overwrite existing non-empty fec_candidate_id (just appends
 *     to fec_candidate_ids array if different)
 *   - Won't clobber existing registry entries — only adds missing ones
 *   - Excludes SCOTUS justices and other no-campaign types via name
 *     match (they won't have FEC records anyway, but extra guard)
 *
 * After this runs, the FEC ingest aggregators should be re-run so they
 * emit edges targeting the newly-mapped committees. That's a separate
 * step, documented in the summary.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REG_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');
const FEC_ROOT = 'C:/donor-map-data/fec';
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// Nickname expansion pairs. FEC uses legal first names; vault uses
// common. Match in both directions: vault="Deb" may need FEC's "debra",
// vault="Thomas" may need FEC's "tom". Single pairs; the builder below
// flips them into a bidirectional lookup.
const NICK_PAIRS = [
  ['bernie', 'bernard'], ['bob', 'robert'], ['rob', 'robert'],
  ['bill', 'william'], ['will', 'william'], ['willy', 'william'],
  ['mitch', 'mitchell'], ['dick', 'richard'], ['rick', 'richard'],
  ['ricky', 'richard'], ['jim', 'james'], ['jimmy', 'james'],
  ['tom', 'thomas'], ['tommy', 'thomas'], ['joe', 'joseph'],
  ['joey', 'joseph'], ['mike', 'michael'], ['nick', 'nicholas'],
  ['dave', 'david'], ['chris', 'christopher'], ['chuck', 'charles'],
  ['charlie', 'charles'], ['teddy', 'theodore'], ['ted', 'theodore'],
  ['alex', 'alexander'], ['andy', 'andrew'], ['dan', 'daniel'],
  ['danny', 'daniel'], ['tony', 'anthony'], ['sam', 'samuel'],
  ['ben', 'benjamin'], ['benny', 'benjamin'], ['kate', 'katherine'],
  ['katie', 'katherine'], ['kim', 'kimberly'], ['steve', 'steven'],
  ['steve', 'stephen'], ['stevie', 'steven'], ['jeff', 'jeffrey'],
  ['matt', 'matthew'], ['eric', 'erick'], ['greg', 'gregory'],
  ['doug', 'douglas'], ['frank', 'francis'], ['tim', 'timothy'],
  ['cathy', 'catherine'], ['kathy', 'catherine'],
  ['abby', 'abigail'], ['becky', 'rebecca'], ['ron', 'ronald'],
  ['liz', 'elizabeth'], ['beth', 'elizabeth'], ['betsy', 'elizabeth'],
  ['pam', 'pamela'], ['patty', 'patricia'], ['pat', 'patrick'],
  ['pat', 'patricia'], ['debbie', 'debra'], ['deb', 'debra'],
  ['josh', 'joshua'], ['zach', 'zachary'], ['zack', 'zachary'],
  ['nate', 'nathan'], ['nat', 'nathaniel'], ['sandy', 'sandra'],
  ['cindy', 'cynthia'], ['peggy', 'margaret'], ['maggie', 'margaret'],
  ['meg', 'margaret'], ['pete', 'peter'], ['randy', 'randall'],
  ['russ', 'russell'], ['sonny', 'george'], ['rudy', 'rudolph'],
  ['kit', 'christopher'], ['hal', 'harold'], ['vern', 'vernon'],
  ['vinnie', 'vincent'], ['vince', 'vincent'], ['jay', 'jason'],
  ['tricia', 'patricia'], ['nikki', 'nicole'], ['nikki', 'nicholas'],
  ['terri', 'theresa'], ['terry', 'terrence'], ['barb', 'barbara'],
  ['barney', 'bernard'], ['fred', 'frederick'], ['freddie', 'frederick'],
  ['jenny', 'jennifer'], ['jen', 'jennifer'], ['jess', 'jessica'],
  ['ed', 'edward'], ['eddie', 'edward'], ['tom', 'tommy'],
  ['chuck', 'charlie'], ['al', 'albert'], ['al', 'alfred'],
  ['gabe', 'gabriel'], ['gus', 'august'], ['hank', 'henry'],
  ['harry', 'henry'], ['harry', 'harold'], ['isa', 'isabella'],
  ['jack', 'john'], ['jake', 'jacob'], ['joanie', 'joni'],
  ['joni', 'joan'], ['judy', 'judith'], ['ken', 'kenneth'],
  ['larry', 'lawrence'], ['leo', 'leonard'], ['lou', 'louis'],
  ['maury', 'maurice'], ['mo', 'maurice'], ['morty', 'mortimer'],
  ['ollie', 'oliver'], ['phil', 'philip'], ['rafi', 'rafael'],
  ['sue', 'susan'], ['suzy', 'susan'], ['vicky', 'victoria'],
  ['walt', 'walter'], ['wes', 'wesley'],
  ['don', 'donald'], ['donnie', 'donald'], ['jon', 'jonathan'],
  ['jonny', 'jonathan'], ['jeff', 'jefferson'], ['eli', 'elijah'],
  ['lon', 'alonzo'], ['monty', 'montgomery'],
  ['val', 'valerie'], ['val', 'valentine'], ['jerry', 'jerrold'],
  ['jerry', 'gerald'], ['gerry', 'gerald'], ['lizzie', 'elizabeth'],
  ['ro', 'rohit'], ['lucy', 'lucia'], ['johnny', 'john'],
  ['nellie', 'nelida'], ['billy', 'william'], ['vinny', 'vincent'],
  ['bobby', 'robert'], ['timmy', 'timothy'], ['tommy', 'thomas'],
  ['ricky', 'richard'], ['kathleen', 'kate'], ['kenny', 'kenneth'],
  ['gus', 'gustavo'], ['lynn', 'lynnette'], ['lynne', 'lynnette'],
  ['al', 'alexander'], ['herb', 'herbert'], ['ami', 'amerish'],
  ['lou', 'luis'],
];
// Bidirectional nickname map: for any key A, NICKNAMES[A] = Set of all
// aliases (other short-forms, legal names) you might also find A written
// as in FEC. Built from NICK_PAIRS.
const NICKNAMES = {};
for (const [a, b] of NICK_PAIRS) {
  (NICKNAMES[a] = NICKNAMES[a] || new Set()).add(b);
  (NICKNAMES[b] = NICKNAMES[b] || new Set()).add(a);
}
// Second pass: chain through (A↔B, B↔C ⇒ A↔C) so Chuck→Charlie works.
for (let pass = 0; pass < 2; pass++) {
  for (const a of Object.keys(NICKNAMES)) {
    for (const b of [...NICKNAMES[a]]) {
      if (NICKNAMES[b]) for (const c of NICKNAMES[b]) if (c !== a) NICKNAMES[a].add(c);
    }
  }
}

// Multi-word surname prefixes — these attach to the following token to
// form the canonical FEC last-name (e.g. "Jefferson Van Drew" → last =
// "van drew", not "drew").
const SURNAME_PREFIXES = new Set(['van', 'von', 'de', 'del', 'della', 'di', 'la', 'le', 'mc', 'mac', 'san', 'santa', 'st', 'saint', 'o', 'al']);

// Judicial / SCOTUS names that shouldn't match FEC candidates.
const JUDICIAL_PATTERNS = /(Sonia Sotomayor|Samuel Alito|Neil Gorsuch|Ketanji Brown Jackson|John Roberts|Elena Kagan|Clarence Thomas|Brett Kavanaugh|Amy Coney Barrett|Justice )/;

// Appointees (Cabinet, SCOTUS, agency heads) and international figures
// legitimately have no federal campaign-committee record. Detected from
// signals.chamber so the audit can distinguish these from genuine EMPTY.
const APPOINTEE_CHAMBER = /^(Cabinet|SCOTUS|International|Secretary|Attorney General|CIA Director|SEC Chair|UN Ambassador|U\.S\. Trade Representative|Director of National Intelligence)/i;

// Strip diacritics: José → Jose, Ángel → Angel. FEC candidate master
// uses ASCII exclusively so Unicode names silently miss without this.
function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildNameVariants(name) {
  // Generate all plausible FEC index keys ("last first") for a vault
  // politician name.
  const cleaned = stripAccents(name).toLowerCase().replace(/[^a-z\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const raw = cleaned.split(/\s+/).filter(Boolean);
  if (raw.length < 2) return [];

  // Drop middle initials. A middle initial is a single letter (or letter
  // followed by nothing; dots were stripped above).
  const tokens = raw.filter((t) => t.length > 1);
  if (tokens.length < 2) return [];

  // Detect surname prefix (van, de, la, mc...) — attach to the final
  // token to form a compound last name. Walks backward to handle chains
  // like "Monica de la Cruz" (2 consecutive prefixes).
  let lastStart = tokens.length - 1;
  while (lastStart > 1 && SURNAME_PREFIXES.has(tokens[lastStart - 1])) {
    lastStart--;
  }
  const firstToken = tokens[0];
  const middles = tokens.slice(1, lastStart);
  const lastTokens = tokens.slice(lastStart);
  const lastCompound = lastTokens.join(' ');
  const lastLast = lastTokens[lastTokens.length - 1];
  const lastHyphenParts = lastLast.includes('-') ? lastLast.split('-').filter(Boolean) : [];

  // First-name variants: the literal first token, plus any nickname
  // aliases (bidirectional). If the original first is 2 letters, also
  // emit it as space-separated initials ("jd" → "j d") so we can match
  // FEC records that store initials separately.
  const firstVariants = new Set([firstToken]);
  if (firstToken.length === 2) firstVariants.add(firstToken.split('').join(' '));
  if (NICKNAMES[firstToken]) for (const v of NICKNAMES[firstToken]) firstVariants.add(v);
  // A middle name sometimes appears as the "first" in FEC (e.g. "William
  // Troy Balderson" is filed as "BALDERSON, WILLIAM TROY" but vault lists
  // him as "Troy Balderson"). So also try each middle token as first.
  for (const m of middles) firstVariants.add(m);

  // Last-name variants: compound, plain-last, each hyphen piece, each
  // middle token (for "first middle last" vault names where FEC files
  // under the middle).
  const lastVariants = new Set([lastCompound, lastLast]);
  for (const p of lastHyphenParts) lastVariants.add(p);
  // Hyphen → space form: "hyde-smith" → "hyde smith".
  if (lastLast.includes('-')) lastVariants.add(lastLast.replace('-', ' '));
  for (const m of middles) lastVariants.add(m);
  // Compound middle+last surname (e.g. "Lisa Blunt Rochester" filed in
  // FEC as "BLUNT ROCHESTER, LISA").
  if (middles.length > 0) {
    lastVariants.add(`${middles[middles.length - 1]} ${lastLast}`);
    lastVariants.add(`${middles.join(' ')} ${lastLast}`);
  }
  // Compound with prefix attached via hyphen (some FEC records use
  // "WASSERMAN-SCHULTZ" rather than "WASSERMAN SCHULTZ").
  if (lastTokens.length > 1) lastVariants.add(lastTokens.join('-'));

  const keys = new Set();
  for (const l of lastVariants) {
    for (const f of firstVariants) {
      if (!l || !f) continue;
      keys.add(`${l} ${f}`);
    }
  }
  return [...keys];
}

// Backwards-compat alias (script historically called nameKeys).
const nameKeys = buildNameVariants;

(async function main() {
  console.log(`[politician-historical-coverage-backfill] ${WRITE ? 'WRITE' : 'dry-run'}\n`);

  console.log('  building candidate-master index...');
  const candByKey = new Map();
  function indexUnder(key, rec) {
    if (!key || key.length < 3) return;
    if (!candByKey.has(key)) candByKey.set(key, []);
    const bucket = candByKey.get(key);
    if (!bucket.some((x) => x.id === rec.id)) bucket.push(rec);
  }
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'candidate-master.jsonl')) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!r.name || !r.id) continue;
      // FEC name is "LAST_PART, FIRST_PART". Split on the FIRST comma to
      // preserve multi-word last names like "VAN DREW, JEFF".
      const rec = {
        id: r.id,
        office: r.office,
        state: r.state,
        cycle: r.cycle || r.election_year,
        principal_cmte_id: r.principal_cmte_id,
        fec_name: r.name,
      };
      const commaIdx = r.name.indexOf(',');
      const lastRaw = commaIdx === -1 ? r.name : r.name.slice(0, commaIdx);
      const firstRaw = commaIdx === -1 ? '' : r.name.slice(commaIdx + 1);
      // Normalize: accent-strip → lowercase → punct (incl. hyphens) → space.
      const normalize = (s) => stripAccents(s).toLowerCase().replace(/[^a-z \-]+/g, ' ').replace(/\s+/g, ' ').trim();
      const lastNorm = normalize(lastRaw);
      const firstNorm = normalize(firstRaw);
      if (!lastNorm) continue;
      const firstTokens = firstNorm.split(' ').filter((t) => t.length > 0);
      // Also produce a hyphen-collapsed last form ("hyde-smith" → "hyde smith").
      const lastForms = new Set([lastNorm]);
      if (lastNorm.includes('-')) {
        lastForms.add(lastNorm.replace(/-/g, ' '));
        for (const p of lastNorm.split('-').filter(Boolean)) lastForms.add(p);
      }
      for (const L of lastForms) {
        // Primary index: last + each first-name token (catches nicknames
        // embedded later like "CRUZ, RAFAEL EDWARD TED" → under "cruz ted").
        for (const t of firstTokens) {
          if (t.length >= 1) indexUnder(`${L} ${t}`, rec);
        }
        // Also under the full first-name string, and under concatenated
        // first-two-initials for records like "VANCE, J D".
        if (firstTokens.length >= 2 && firstTokens[0].length === 1 && firstTokens[1].length === 1) {
          indexUnder(`${L} ${firstTokens[0]}${firstTokens[1]}`, rec);
        }
        if (firstNorm) indexUnder(`${L} ${firstNorm}`, rec);
      }
    } catch {}
  }
  console.log(`  candidate-master unique name keys: ${candByKey.size}`);

  const ents = loadEntities();
  const allPols = ents.filter((e) => e.entity_type === 'politician');
  const politicians = allPols.filter((e) => !JUDICIAL_PATTERNS.test(e.name));
  console.log(`  politicians (excluding judicial): ${politicians.length}`);

  const reg = JSON.parse(fs.readFileSync(REG_FILE, 'utf-8'));

  // Per-politician updates
  const entityUpdates = new Map(); // name → { candidate_ids, committee_ids, history }
  const registryAdditions = new Map(); // cmte_id → { vault_profile, fec_name, reason }
  const appointeeFlags = new Map(); // name → reason (chamber string)
  let unmatched = 0;
  const unmatchedNames = [];

  for (const p of politicians) {
    const keys = nameKeys(p.name);
    let records = [];
    for (const k of keys) if (candByKey.has(k)) records = records.concat(candByKey.get(k));

    // Dedup by FEC id
    const byId = new Map();
    for (const r of records) byId.set(r.id, r);
    records = [...byId.values()];

    if (records.length === 0) {
      unmatched++;
      unmatchedNames.push(p.name);
      // Appointee classifier: if the vault chamber indicates Cabinet /
      // Secretary / SCOTUS / agency head, these legitimately have no
      // FEC candidate record. Stamp signals.federal_coverage_expected
      // so coverage-gap-audit can distinguish them from real EMPTY.
      const chamber = p.signals?.chamber || '';
      if (APPOINTEE_CHAMBER.test(chamber)) {
        appointeeFlags.set(p.name, chamber);
      }
      continue;
    }

    // Risk control: skip any politician where the name-match produced
    // >15 records — that usually means a generic name (e.g. "John Smith")
    // is matching unrelated candidates. Better to leave those for manual
    // disambiguation than to pollute the registry.
    if (records.length > 15) {
      if (VERBOSE) console.log(`  ⚠ ${p.name}: ${records.length} FEC records matched — skipping, ambiguous`);
      continue;
    }

    const currentSignals = p.signals || {};
    const existingCandId = currentSignals.fec_candidate_id;
    const existingCandIds = currentSignals.fec_candidate_ids || (existingCandId ? [existingCandId] : []);
    const existingCmteIds = currentSignals.fec_committee_ids || (currentSignals.fec_committee_id ? [currentSignals.fec_committee_id] : []);

    const newCandIds = new Set([...existingCandIds, ...records.map((r) => r.id)].filter(Boolean));
    const newCmteIds = new Set([...existingCmteIds, ...records.map((r) => r.principal_cmte_id)].filter(Boolean));
    const history = records
      .filter((r) => r.principal_cmte_id)
      .map((r) => ({ id: r.id, office: r.office, state: r.state, cycle: r.cycle, pc: r.principal_cmte_id }))
      .sort((a, b) => String(a.cycle || 0).localeCompare(String(b.cycle || 0)));

    // Only record as an update if we'd actually add something new
    const addedCands = [...newCandIds].filter((id) => !existingCandIds.includes(id));
    const addedCmtes = [...newCmteIds].filter((id) => !existingCmteIds.includes(id));
    if (addedCands.length === 0 && addedCmtes.length === 0 && !currentSignals.fec_candidate_history) continue;

    entityUpdates.set(p.name, {
      candidate_ids: [...newCandIds],
      committee_ids: [...newCmteIds],
      history,
    });

    // Queue registry additions for each new committee
    for (const r of records) {
      if (!r.principal_cmte_id) continue;
      if (reg[r.principal_cmte_id]) continue;
      if (registryAdditions.has(r.principal_cmte_id)) continue;
      registryAdditions.set(r.principal_cmte_id, {
        vault_profile: p.profile_path,
        fec_name: r.fec_name,
        reason: `politician campaign committee — ${r.office}/${r.state} cycle ${r.cycle}`,
      });
    }
  }

  console.log(`\n  politicians unmatched (name no match in FEC): ${unmatched}`);
  console.log(`    of which appointees (no-federal-expected):  ${appointeeFlags.size}`);
  console.log(`    residual unmatched (real gap):              ${unmatched - appointeeFlags.size}`);
  console.log(`  politicians with new coverage to add:          ${entityUpdates.size}`);
  console.log(`  new registry entries to add (committees):      ${registryAdditions.size}`);

  if (VERBOSE) {
    console.log('\n  Sample 10 updates:');
    let i = 0;
    for (const [name, u] of entityUpdates) {
      if (i++ >= 10) break;
      console.log(`    ${name}: +${u.candidate_ids.length} cand ids, +${u.committee_ids.length} cmte ids, ${u.history.length} history rows`);
    }
    console.log('\n  Sample 20 residual unmatched (not appointee):');
    const realUnmatched = unmatchedNames.filter((n) => !appointeeFlags.has(n));
    for (const n of realUnmatched.slice(0, 20)) console.log('    ' + n);
  }

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  // Apply: rewrite entities.jsonl with updated signals
  const text = fs.readFileSync(ENT_FILE, 'utf-8');
  const out = [];
  let entitiesTouched = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(line); } catch { out.push(line); continue; }
    const u = entityUpdates.get(rec.name);
    const appointeeReason = appointeeFlags.get(rec.name);
    if (!u && !appointeeReason) { out.push(line); continue; }
    rec.signals = rec.signals || {};
    if (appointeeReason && !u) {
      // Appointee with no FEC record — stamp coverage-expected flag so
      // the audit can exclude from EMPTY. Preserve existing fields.
      rec.signals.federal_coverage_expected = false;
      rec.signals.federal_coverage_reason = `appointee — ${appointeeReason}`;
      rec.signals.historical_coverage_backfilled_at = new Date().toISOString();
      out.push(JSON.stringify(rec));
      entitiesTouched++;
      continue;
    }
    rec.signals.fec_candidate_ids = u.candidate_ids;
    rec.signals.fec_committee_ids = u.committee_ids;
    rec.signals.fec_candidate_history = u.history;
    // Preserve existing fec_candidate_id so other readers that look
    // for the scalar still work; pick the most-recent if we need to set it.
    if (!rec.signals.fec_candidate_id && u.candidate_ids.length > 0) {
      rec.signals.fec_candidate_id = u.candidate_ids[0];
    }
    if (!rec.signals.fec_committee_id && u.committee_ids.length > 0) {
      rec.signals.fec_committee_id = u.committee_ids[0];
    }
    rec.signals.historical_coverage_backfilled_at = new Date().toISOString();
    out.push(JSON.stringify(rec));
    entitiesTouched++;
  }
  fs.writeFileSync(ENT_FILE, out.join('\n'));

  // Apply: add registry entries
  for (const [cid, meta] of registryAdditions) {
    reg[cid] = {
      committee_id: cid,
      fec_name: meta.fec_name,
      committee_type: null,
      committee_type_full: null,
      designation: null,
      designation_full: null,
      organization_type: null,
      connected_organization_name: null,
      candidate_ids: [],
      cycles: [],
      vault_profile: meta.vault_profile,
      mapping_reason: meta.reason,
      mapped_at: new Date().toISOString(),
    };
  }
  fs.writeFileSync(REG_FILE, JSON.stringify(reg, null, 2));

  console.log(`\n  wrote:`);
  console.log(`    ${entitiesTouched} entities updated in entities.jsonl`);
  console.log(`    ${registryAdditions.size} committee entries added to fec-committee-registry.json`);
  console.log(`\n  NEXT: re-run aggregators so newly-mapped committees produce edges:`);
  console.log(`    node scripts/aggregate-indiv-to-edges.cjs --write`);
  console.log(`    node scripts/aggregate-committee-transfers-to-edges.cjs --write`);
  console.log(`    node scripts/coverage-gap-audit.cjs   # to measure improvement`);
})();
