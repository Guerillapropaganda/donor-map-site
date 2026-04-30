#!/usr/bin/env node
/**
 * cal-access-discover-committees.cjs — find Cal-Access filer IDs for a
 * roster of candidates by name-matching against FILERNAME_CD, then
 * cross-referencing with FILER_TO_FILER_TYPE_CD to classify each
 * committee as candidate-controlled (CTL) vs independent expenditure
 * (IND) vs other.
 *
 * Output: writes (or merges into) data/cal-access-filer-overrides.json
 * with shape:
 *
 *   {
 *     "candidates": {
 *       "Antonio Villaraigosa": {
 *         "vault_title": "Antonio Villaraigosa",
 *         "controlled": [
 *           { "filer_id": "1471635", "name": "...", "category": "CTL", ... }
 *         ],
 *         "ie_supporting": [...],
 *         "ie_opposing": [...],
 *         "discovery_notes": [...]
 *       },
 *       ...
 *     },
 *     "discovered_at": "2026-04-29T...",
 *     "candidates_searched": 10
 *   }
 *
 * The matcher uses:
 *   - last name + GOVERNOR keyword
 *   - last name + FOR keyword (looser)
 *   - explicit hint patterns (e.g. "FRIENDS OF X")
 *
 * Hits are collected, classified, and written. David reviews before the
 * ingester runs against this map.
 *
 * Usage:
 *   node scripts/cal-access-discover-committees.cjs                  # all 10
 *   node scripts/cal-access-discover-committees.cjs --only "Tom Steyer"
 *   node scripts/cal-access-discover-committees.cjs --verbose
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  assertBulkDir,
  streamTSV,
  buildFilerCategories,
  tablePath,
} = require('./lib/cal-access-helpers.cjs');

const ROOT = path.join(__dirname, '..');
const OVERRIDES_FILE = path.join(ROOT, 'data', 'cal-access-filer-overrides.json');

const VERBOSE = process.argv.includes('--verbose');
const ONLY_IDX = process.argv.indexOf('--only');
const ONLY = ONLY_IDX >= 0 ? process.argv[ONLY_IDX + 1] : null;

// Roster — vault title (canonical) + last name + extra hints. Hints are
// optional uppercase tokens that, if present in the committee name,
// strengthen the match. Used to filter out same-last-name false
// positives (e.g. "Becerra" appears in many unrelated CA committees).
// `strict: true` means require first-name match (otherwise too many
// false positives from unrelated CA politicians sharing the surname).
// `strict: false` means trust the last-name match alone (uncommon names).
const ROSTER = [
  { name: 'Antonio Villaraigosa', last: 'VILLARAIGOSA', hints: ['ANTONIO'],          strict: false },
  { name: 'Betty Yee',            last: 'YEE',          hints: ['BETTY'],             strict: true  },
  { name: 'Chad Bianco',          last: 'BIANCO',       hints: ['CHAD'],              strict: false },
  { name: 'Eric Swalwell',        last: 'SWALWELL',     hints: ['ERIC'],              strict: false },
  { name: 'Katie Porter',         last: 'PORTER',       hints: ['KATIE', 'KATHRYN'],  strict: true  },
  { name: 'Matt Mahan',           last: 'MAHAN',        hints: ['MATT', 'MATTHEW'],   strict: true  },
  { name: 'Steve Hilton',         last: 'HILTON',       hints: ['STEVE', 'STEVEN', 'STEPHEN'], strict: true },
  { name: 'Tom Steyer',           last: 'STEYER',       hints: ['TOM', 'THOMAS'],     strict: false },
  { name: 'Tony Thurmond',        last: 'THURMOND',     hints: ['TONY', 'ANTHONY'],   strict: false },
  { name: 'Xavier Becerra',       last: 'BECERRA',      hints: ['XAVIER'],            strict: false },
];

const SUPPORT_TOKENS = ['SUPPORT', 'SUPPORTING', 'FRIENDS OF', 'COMMITTEE FOR', 'CITIZENS FOR'];
const OPPOSE_TOKENS = ['OPPOSE', 'OPPOSING', 'AGAINST', 'STOP', 'NO ON'];

// Empirically observed Cal-Access taxonomy codes (FILER_TO_FILER_TYPE_CD):
//   CATEGORY=40002       = candidate-controlled committee (CTL)
//   SUB_CATEGORY=40102   = independent expenditure / supporting committee
//   SUB_CATEGORY=40101   = ballot measure committee
//   SUB_CATEGORY=40103   = general-purpose PAC / sponsored committee
//   CATEGORY=0 + SUB=0   = individual donor / non-committee filer
function classifyCommittee(committeeName, cat) {
  const upper = committeeName.toUpperCase();
  const c = String(cat.category || '');
  const sc = String(cat.sub_category || '');

  // Drop non-committee filers entirely (individual donors, lobbyists,
  // etc. — these aren't recipient committees and shouldn't show up in
  // a candidate's donor map).
  if (c === '0' && sc === '0') return 'rejected_individual';

  if (c === '40002') return 'controlled';
  if (sc === '40102') {
    if (OPPOSE_TOKENS.some((t) => upper.includes(t))) return 'ie_opposing';
    return 'ie_supporting';
  }
  // Anything else (PAC, ballot, unknown) — surface but flag for review.
  return 'other';
}

(async function main() {
  assertBulkDir();
  console.log(`[cal-access-discover] scanning FILERNAME_CD for ${ROSTER.length} candidates...`);

  const roster = ONLY ? ROSTER.filter((c) => c.name === ONLY) : ROSTER;
  if (ONLY && roster.length === 0) {
    console.error(`--only "${ONLY}" not in roster. Names: ${ROSTER.map((c) => c.name).join(', ')}`);
    process.exit(1);
  }

  console.log('[cal-access-discover] loading FILER_TO_FILER_TYPE_CD...');
  const categories = await buildFilerCategories();
  console.log(`  ${categories.size} filer categories loaded`);

  const matches = new Map(); // candidate.name → Set<filer_id>
  for (const c of roster) matches.set(c.name, new Map()); // filer_id → record

  let scanned = 0;
  console.log('[cal-access-discover] streaming FILERNAME_CD...');
  for await (const row of streamTSV(tablePath('FILERNAME_CD'))) {
    scanned++;
    if (scanned % 200000 === 0) process.stdout.write(`  ${scanned} rows scanned\r`);

    const naml = (row.NAML || '').toUpperCase();
    if (!naml) continue;
    const fid = row.FILER_ID;
    if (!fid) continue;

    for (const c of roster) {
      // Word-boundary last-name match. Avoids "YEE" matching inside
      // "EMPLOYEES" or "PORTER" matching "TRANSPORTER".
      const lastRe = new RegExp(`\\b${c.last}\\b`);
      if (!lastRe.test(naml)) continue;

      // Hint = first name match (PORTER → KATIE/KATHRYN somewhere in name)
      const hintHit = c.hints.length === 0 || c.hints.some((h) => new RegExp(`\\b${h}\\b`).test(naml));
      // Or accept if the committee name signals our candidate's office track.
      const contextHit = /\b(GOVERNOR|GOVERNOR 2026|FOR GOVERNOR|MAYOR|SUPERINTENDENT|ATTORNEY GENERAL|FOR CONGRESS|FOR SENATE|FOR ASSEMBLY|OFFICEHOLDER)\b/.test(naml);

      // Strict mode (common surnames): require first-name match.
      // Lenient mode (uncommon surnames): hint OR context.
      if (c.strict) {
        if (!hintHit) continue;
      } else {
        if (!hintHit && !contextHit) continue;
      }

      const cat = categories.get(fid) || {};
      const role = classifyCommittee(naml, cat);
      if (role === 'rejected_individual') continue;

      // Drop dupes — same fid can appear under multiple xref rows.
      const m = matches.get(c.name);
      if (m.has(fid)) continue;
      m.set(fid, {
        filer_id: fid,
        name: row.NAML.trim(),
        category: cat.category || '',
        sub_category: cat.sub_category || '',
        active: cat.active || row.STATUS || '',
        role,
        city: (row.CITY || '').trim(),
        st: (row.ST || '').trim(),
        match_strength: hintHit ? 'hint' : 'context',
      });
    }
  }
  console.log(`\n[cal-access-discover] scanned ${scanned} FILERNAME_CD rows`);

  // Build output
  const out = {
    discovered_at: new Date().toISOString(),
    candidates_searched: roster.length,
    bulk_dir: process.env.CAL_ACCESS_BULK_DIR || 'C:\\donor-map-data\\bulk\\CalAccess\\DATA',
    candidates: {},
  };

  for (const c of roster) {
    const recs = Array.from(matches.get(c.name).values());
    out.candidates[c.name] = {
      vault_title: c.name,
      controlled: recs.filter((r) => r.role === 'controlled'),
      ie_supporting: recs.filter((r) => r.role === 'ie_supporting'),
      ie_opposing: recs.filter((r) => r.role === 'ie_opposing'),
      other: recs.filter((r) => r.role === 'other'),
      _all_matches: recs.length,
    };

    const o = out.candidates[c.name];
    console.log(`  ${c.name.padEnd(22)} controlled=${o.controlled.length} ie_sup=${o.ie_supporting.length} ie_opp=${o.ie_opposing.length} other=${o.other.length}`);

    if (VERBOSE) {
      for (const r of recs) {
        console.log(`    [${r.role}] ${r.filer_id} ${r.name} (cat=${r.category || '?'}, sub=${r.sub_category || '?'})`);
      }
    }
  }

  // Merge with existing overrides if present (preserve manual edits)
  if (fs.existsSync(OVERRIDES_FILE)) {
    const prev = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    if (prev.candidates) {
      for (const [name, candData] of Object.entries(out.candidates)) {
        if (prev.candidates[name] && prev.candidates[name].manual_overrides) {
          candData.manual_overrides = prev.candidates[name].manual_overrides;
        }
      }
    }
  }

  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(out, null, 2));
  console.log(`\n[cal-access-discover] wrote ${OVERRIDES_FILE}`);
  console.log('Review the file. Move false positives out of controlled/ie_* lists into a "rejected" array, or delete them.');
})().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
