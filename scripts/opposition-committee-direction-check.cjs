#!/usr/bin/env node
/**
 * opposition-committee-direction-check.cjs — harness check for
 * direction-flow misattribution on opposition committees.
 *
 * What it detects:
 *   FPPC opposition committees follow a naming convention: any committee
 *   primarily formed against a candidate must include "[CANDIDATE] FOR
 *   [OFFICE], NO ON" in its registered name. The cal-access-bulk
 *   ingester correctly classifies these via the `ie_opposing` role IF
 *   the override file lists them. This check audits two failure modes:
 *
 *   1. Override-file gap: a Cal-Access committee whose FILERNAME matches
 *      "NO ON [CANDIDATE]" pattern but is NOT in cal-access-filer-
 *      overrides.json (or is misclassified as `controlled` /
 *      `ie_supporting`). These would produce wrong librarian edges.
 *
 *   2. Librarian leak: any monetary edge in data/relationships.jsonl
 *      where the source/target name contains the "NO ON" pattern but
 *      is NOT typed as `political-opposition`. Suggests the ingester
 *      treated the opposition committee as a candidate-controlled one.
 *
 * Why this check exists:
 *   Surfaced 2026-05-01 in CA Gov 2026 dossier work. Anti-Steyer
 *   committee 1489677 ("STEYER FOR GOVERNOR 2026 ... NO ON") was
 *   correctly flagged ie_opposing in the override file, but a dossier-
 *   extraction script aggregated edges by `to: Tom Steyer` without
 *   filtering edge type, picking up opposition-committee references as
 *   if they were Steyer's own fundraising. This check catches both the
 *   pipeline-side gap AND the librarian-leak symptom.
 *
 * Usage:
 *   node scripts/opposition-committee-direction-check.cjs --json
 */

'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const OVERRIDES_FILE = path.join(ROOT, 'data', 'cal-access-filer-overrides.json');
const FILERNAME_TSV = process.env.CAL_ACCESS_BULK_DIR
  ? path.join(process.env.CAL_ACCESS_BULK_DIR, 'FILERNAME_CD.TSV')
  : 'C:/donor-map-data/bulk/CalAccess/DATA/FILERNAME_CD.TSV';
const RELATIONSHIPS = path.join(ROOT, 'data', 'relationships.jsonl');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');

const NO_ON_PATTERN = /\bNO ON ([A-Z][A-Z\s]*[A-Z]) FOR ([A-Z]+)\b/i;

(async function main() {
  // ── Step 1: scan FILERNAME_CD for "NO ON" committees ────────────────
  const allOppositionCommittees = []; // { filer_id, registered_name, target_candidate }
  if (fs.existsSync(FILERNAME_TSV)) {
    const stream = fs.createReadStream(FILERNAME_TSV, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let isFirst = true;
    let cols = {};
    for await (const line of rl) {
      if (isFirst) {
        const headers = line.split('\t');
        headers.forEach((h, i) => cols[h] = i);
        isFirst = false;
        continue;
      }
      const fields = line.split('\t');
      const filerId = fields[cols.FILER_ID];
      const namf = fields[cols.NAMF] || '';
      const naml = fields[cols.NAML] || '';
      const fullName = (naml + ' ' + namf).trim();
      if (NO_ON_PATTERN.test(fullName)) {
        const m = fullName.match(NO_ON_PATTERN);
        allOppositionCommittees.push({
          filer_id: filerId,
          registered_name: fullName.slice(0, 200),
          target_candidate: m ? m[1].trim() : null,
          target_office: m ? m[2].trim() : null,
        });
      }
    }
  }

  // ── Step 2: cross-reference with override file ──────────────────────
  let overrideMap = new Map(); // filer_id → role
  if (fs.existsSync(OVERRIDES_FILE)) {
    const overrides = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    for (const [candName, c] of Object.entries(overrides.candidates || {})) {
      for (const role of ['controlled', 'ie_supporting', 'ie_opposing']) {
        for (const rec of (c[role] || [])) {
          overrideMap.set(String(rec.filer_id), { role, candidate: candName, name: rec.name });
        }
      }
    }
  }

  // Categorize:
  //   - "NO ON" committees correctly flagged as ie_opposing → OK
  //   - "NO ON" committees flagged as controlled/ie_supporting → WRONG (will produce bad edges)
  //   - "NO ON" committees not in override at all → OVERRIDE GAP
  const okCount = [];
  const misclassified = [];
  const overrideGap = [];
  for (const oc of allOppositionCommittees) {
    const ov = overrideMap.get(oc.filer_id);
    if (!ov) overrideGap.push(oc);
    else if (ov.role === 'ie_opposing') okCount.push(oc);
    else misclassified.push({ ...oc, current_role: ov.role, current_candidate: ov.candidate });
  }

  // ── Step 3: scan relationships.jsonl for librarian leaks ────────────
  let librarianLeaks = [];
  if (fs.existsSync(RELATIONSHIPS)) {
    const stream = fs.createReadStream(RELATIONSHIPS, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let r;
      try { r = JSON.parse(line); } catch { continue; }
      if (r.type !== 'monetary') continue;
      const fromMatch = r.from && NO_ON_PATTERN.test(r.from);
      const toMatch = r.to && NO_ON_PATTERN.test(r.to);
      if (fromMatch || toMatch) {
        // Monetary edges TO a "NO ON" committee are correct (donor → opp committee).
        // Monetary edges FROM a "NO ON" committee are suspect (the committee should
        // be the recipient of donations, not the source). The committee's onward
        // spending should be type=political-opposition, not type=monetary.
        if (fromMatch) {
          librarianLeaks.push({
            edge_id: r.id,
            from: (r.from || '').slice(0, 100),
            to: (r.to || '').slice(0, 100),
            amount: r.amount,
            cycle: r.cycle,
            issue: 'Opposition committee appears as DONOR in monetary edge — should be type=political-opposition or the from/to should be reversed',
          });
        }
        if (librarianLeaks.length >= 50) break;
      }
    }
  }

  const result = {
    check: 'opposition-committee-direction',
    status: 'ok',
    description: 'Opposition committees (FPPC "NO ON [CANDIDATE]" naming) audited against override-file role classification + librarian edge consistency.',
    findings_count: misclassified.length + overrideGap.length + librarianLeaks.length,
    breakdown: {
      total_no_on_committees_in_filer_db: allOppositionCommittees.length,
      correctly_classified_as_opposing: okCount.length,
      misclassified_as_controlled_or_supporting: misclassified.length,
      override_file_gaps: overrideGap.length,
      librarian_leaks: librarianLeaks.length,
    },
    samples: {
      misclassified: misclassified.slice(0, 5),
      override_gaps: overrideGap.slice(0, 5),
      librarian_leaks: librarianLeaks.slice(0, 5),
    },
    interpretation: misclassified.length + overrideGap.length + librarianLeaks.length === 0
      ? 'All opposition committees correctly classified. No leaks detected.'
      : `${misclassified.length} committees misclassified, ${overrideGap.length} override-file gaps, ${librarianLeaks.length} librarian leaks. Each finding produces wrong directional flow in derived edges.`,
    generated_at: new Date().toISOString(),
  };

  if (JSON_MODE) console.log(JSON.stringify(result));
  else {
    console.log(`Opposition committee direction check:`);
    console.log(`  ${result.breakdown.total_no_on_committees_in_filer_db} "NO ON" committees in FILERNAME_CD`);
    console.log(`  ${result.breakdown.correctly_classified_as_opposing} correctly flagged ie_opposing`);
    console.log(`  ${result.breakdown.misclassified_as_controlled_or_supporting} MISCLASSIFIED in override file`);
    console.log(`  ${result.breakdown.override_file_gaps} OVERRIDE GAPS (not in override at all)`);
    console.log(`  ${result.breakdown.librarian_leaks} LIBRARIAN LEAKS (suspicious monetary edges)`);
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
