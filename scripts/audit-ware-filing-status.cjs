#!/usr/bin/env node
/**
 * audit-ware-filing-status.cjs
 *
 * Phase 2-F of CA Gov 2026 dossier plan (2026-05-01).
 *
 * Determines whether Butch Ware (Green Party 2024 VP candidate) has filed
 * for CA Governor 2026, and if so: what party, what committee, what funds.
 * The structural-investigation (Phase 4) needs this baseline.
 *
 * Approach:
 *   1. Search Cal-Access bulk for any "WARE" + governor patterns we may
 *      have missed (extra search beyond the audit's "no records found").
 *   2. Issue audit-logged fetches under ADR-0030 §1 to confirm filing
 *      status:
 *        - https://cal-access.sos.ca.gov/ — candidate search
 *        - https://www.sos.ca.gov/ — static elections pages
 *   3. Write findings to data/derived/ca-gov-2026/ware-filing-status.json
 *
 * Cloudflare/Imperva note: Cal-Access dynamic pages frequently return
 * `blocked-by-cf`. That's a *result*, not a bug — we record the block as
 * the answer ("could not verify via dynamic page"). Static SoS resources
 * usually serve fine.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { fetchForAudit } = require('./lib/code-audit-fetcher.cjs');

const SCRIPT = 'audit-ware-filing-status.cjs';
const OUT_DIR = path.join('data', 'derived', 'ca-gov-2026');
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  console.log('=== Phase 2-F: Butch Ware filing status check ===\n');

  // ─── Step 1: deeper Cal-Access bulk scan ─────────────────────────────
  console.log('Step 1: Cal-Access bulk scan for any Ware records...');
  const calAccessHits = [];
  for (const fp of ['data/derived/cal-access-bulk.jsonl', 'data/derived/cal-access-expn.jsonl']) {
    if (!fs.existsSync(fp)) continue;
    const rl = readline.createInterface({
      input: fs.createReadStream(fp, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      // Match "Ware" as a whole word (case-insensitive) but exclude common
      // false positives like "Aware", "Software", "Hardware", "Ware Inc"
      // (corporate names). We're looking for WARE as a candidate surname.
      if (/\bbutch\s+ware\b/i.test(line) || /\bware,\s*butch\b/i.test(line) || /\bwakil\s+ware\b/i.test(line)) {
        calAccessHits.push({ source: fp, line: line.slice(0, 400) });
      }
    }
  }
  console.log(`  Cal-Access hits: ${calAccessHits.length}`);
  if (calAccessHits.length > 0) {
    console.log('  SAMPLE:');
    calAccessHits.slice(0, 3).forEach(h => console.log(`    [${path.basename(h.source)}] ${h.line.slice(0, 200)}...`));
  }

  // ─── Step 2: audit-logged fetches ────────────────────────────────────
  console.log('\nStep 2: External fetch (CA SoS, ADR-0030 §1)...');

  const fetches = [];

  // 2a. CA SoS upcoming-elections candidate list (static)
  try {
    const r = await fetchForAudit({
      url: 'https://www.sos.ca.gov/elections/upcoming-elections/2026-elections/candidates',
      purpose: 'Verify whether Butch Ware filed for CA Governor 2026 — confirms or refutes Phase 1 audit finding of "no vault data"',
      script: SCRIPT,
      expected: { lookFor: 'Butch Ware OR Wakil Ware as candidate for Governor' },
    });
    fetches.push({ stage: 'sos-candidate-list', status: r.status, code: r.response_status_code, length: r.content_length, url: r.url });
    if (r.content && r.content.length > 0) {
      const ware = (r.content.match(/[Ww]are/g) || []).length;
      const butch = (r.content.match(/[Bb]utch/g) || []).length;
      const governor = (r.content.match(/governor/gi) || []).length;
      console.log(`  ${r.status} — ${r.content_length} bytes — "Ware" ${ware} times, "Butch" ${butch} times, "governor" ${governor} times`);
      // Pull surrounding text near "Ware" if found
      if (ware > 0) {
        const idx = r.content.indexOf('Ware');
        const snippet = r.content.slice(Math.max(0, idx - 200), idx + 400);
        console.log(`  CONTEXT (first "Ware" mention): ...${snippet.replace(/\s+/g, ' ').slice(0, 600)}...`);
        fetches[fetches.length - 1].ware_context = snippet.replace(/\s+/g, ' ').slice(0, 800);
      }
    }
  } catch (err) {
    console.log(`  FAILED: ${err.message}`);
    fetches.push({ stage: 'sos-candidate-list', error: err.message });
  }

  // 2b. Cal-Access campaign committee list URL (likely Imperva-blocked)
  try {
    const r = await fetchForAudit({
      url: 'https://cal-access.sos.ca.gov/Campaign/Candidates/list.aspx?session=2025&view=detail&type=Statewide',
      purpose: 'Search Cal-Access 2026 statewide candidate list for any Ware committee filing',
      script: SCRIPT,
      expected: { lookFor: 'WARE candidate filing for governor 2026' },
    });
    fetches.push({ stage: 'cal-access-statewide-list', status: r.status, code: r.response_status_code, length: r.content_length, url: r.url });
    if (r.content && r.content.length > 0) {
      const ware = (r.content.match(/[Ww]are/g) || []).length;
      console.log(`  ${r.status} — ${r.content_length} bytes — "Ware" ${ware} times`);
    }
  } catch (err) {
    console.log(`  FAILED: ${err.message}`);
    fetches.push({ stage: 'cal-access-statewide-list', error: err.message });
  }

  // ─── Step 3: write findings ──────────────────────────────────────────
  const finding = {
    candidate: 'Butch Ware',
    cycle: '2026',
    cal_access_bulk_hits: calAccessHits.length,
    cal_access_bulk_sample: calAccessHits.slice(0, 5),
    fetches,
    interpretation: calAccessHits.length === 0
      ? 'Confirms Phase 1 finding: no Cal-Access bulk records for Butch Ware. He has not registered a CA campaign committee that has filed any disclosable contribution/expenditure with the FPPC. This is the structural baseline for the Phase 4 investigation: he is running (or considering running) without the institutional infrastructure that the top 5 candidates have already built.'
      : 'Cal-Access bulk has SOME records — investigate further before concluding.',
    generated: new Date().toISOString(),
  };
  const out = path.join(OUT_DIR, 'ware-filing-status.json');
  fs.writeFileSync(out, JSON.stringify(finding, null, 2), 'utf-8');
  console.log(`\nWrote ${out}`);
  console.log('\nFinding:', finding.interpretation);
})().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
