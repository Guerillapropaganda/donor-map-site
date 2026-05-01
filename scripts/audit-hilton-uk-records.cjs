#!/usr/bin/env node
/**
 * audit-hilton-uk-records.cjs
 *
 * Phase 5 of CA Gov 2026 dossier sprint (2026-05-01). Operates under the
 * ADR-0030 §10 amendment dated 2026-05-01 that added UK government
 * primary sources to the §1 active allowlist.
 *
 * Searches three UK gov primary sources for Hilton + Whetstone records:
 *   - search.electoralcommission.org.uk (UK EC donations DB)
 *   - find-and-update.company-information.service.gov.uk (Companies House)
 *   - hansard.parliament.uk (UK Parliament debate record)
 *
 * Writes findings to data/derived/ca-gov-2026/hilton-uk-records.json.
 * NEVER writes to profile content. Research scaffolding only.
 *
 * Bot-block expectations: UK EC + Companies House sometimes serve via
 * Cloudflare. Hansard is well-served. Treat `blocked-by-cf` as a result,
 * not a bug. Re-runs against alt endpoints (JSON API where available).
 */

const fs = require('fs');
const path = require('path');
const { fetchForAudit } = require('./lib/code-audit-fetcher.cjs');

const SCRIPT = 'audit-hilton-uk-records.cjs';
const OUT = path.join('data', 'derived', 'ca-gov-2026', 'hilton-uk-records.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const findings = {
  generated: null,
  fetches: [],
  uk_ec: { donations_search: null, party_finance_search: null },
  companies_house: { hilton_director: null, whetstone_director: null, crowdpac_company: null },
  hansard: { hilton_search: null, big_society_attribution: null },
};

async function tryFetch(url, purpose, expected) {
  const r = await fetchForAudit({
    url, purpose, script: SCRIPT, expected: expected || null,
  });
  findings.fetches.push({
    stage: purpose.slice(0, 50),
    url: r.url,
    status: r.status,
    code: r.response_status_code,
    bytes: r.content_length,
  });
  return r;
}

(async () => {
  console.log('=== Phase 5: Hilton UK records audit ===\n');

  // ─── UK Electoral Commission ────────────────────────────────────────
  console.log('[1/3] UK Electoral Commission donations search...');

  // The UK EC site has a public search at /search-the-registers/donations.
  // Donor-name search interface returns paginated results. Try the
  // search URL for "Hilton, Steve" first.
  // Per UK EC, the donations DB contains contributions over £500 disclosed
  // by registered parties + regulated entities. It does NOT include
  // payments by parties to staff (Hilton's salary as Director of Strategy
  // would not appear here — that's a Cabinet Office record under FOI).
  try {
    // Try the JSON endpoint first if it exists; fall back to HTML search.
    const r1 = await tryFetch(
      'https://search.electoralcommission.org.uk/Search/Donations?currentPage=1&rows=50&sort=AcceptedDate&order=desc&tab=1&open=filter&et=pp&et=ppm&et=tp&et=perpar&et=rd&date=Reported&from=&to=&rptPd=&prePoll=true&postPoll=true&donorAcct=&donorAcctRecpt=&donorJson=null&include=null&accountingUnitsAccepted=true&donorName=hilton&donorTypeIndividual=true',
      'UK EC donations search: donor surname Hilton (any role, any party)',
      { lookFor: 'Steve Hilton or Steven Hilton donations to UK political parties' }
    );
    if (r1.status === 'ok' && r1.content) {
      findings.uk_ec.donations_search = {
        status: 'fetched',
        bytes: r1.content_length,
        steve_hilton_hits: (r1.content.match(/Steve\s+Hilton|Steven\s+Hilton/gi) || []).length,
        rachel_whetstone_hits: (r1.content.match(/Rachel\s+Whetstone/gi) || []).length,
        total_hilton_mentions: (r1.content.match(/Hilton/g) || []).length,
        // Try to extract a small sample of result rows around any Hilton match
        sample_context: extractSampleContext(r1.content, /Steve\s+Hilton|Steven\s+Hilton/i, 400),
      };
      console.log(`  ${r1.status} — ${r1.content_length} bytes — Steve/Steven Hilton ${findings.uk_ec.donations_search.steve_hilton_hits} hits`);
    } else {
      findings.uk_ec.donations_search = { status: r1.status, code: r1.response_status_code, bytes: r1.content_length };
      console.log(`  ${r1.status} (${r1.response_status_code}) — ${r1.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); findings.uk_ec.donations_search = { error: e.message }; }

  // Whetstone donor search
  try {
    const r2 = await tryFetch(
      'https://search.electoralcommission.org.uk/Search/Donations?currentPage=1&rows=50&sort=AcceptedDate&order=desc&tab=1&open=filter&et=pp&et=ppm&et=tp&et=perpar&et=rd&date=Reported&from=&to=&rptPd=&prePoll=true&postPoll=true&donorAcct=&donorAcctRecpt=&donorJson=null&include=null&accountingUnitsAccepted=true&donorName=whetstone&donorTypeIndividual=true',
      'UK EC donations search: donor surname Whetstone',
      { lookFor: 'Rachel Whetstone donations to UK political parties' }
    );
    if (r2.status === 'ok' && r2.content) {
      findings.uk_ec.party_finance_search = {
        status: 'fetched',
        bytes: r2.content_length,
        rachel_whetstone_hits: (r2.content.match(/Rachel\s+Whetstone/gi) || []).length,
        total_whetstone_mentions: (r2.content.match(/Whetstone/g) || []).length,
        sample_context: extractSampleContext(r2.content, /Rachel\s+Whetstone/i, 400),
      };
      console.log(`  ${r2.status} — ${r2.content_length} bytes — Whetstone ${findings.uk_ec.party_finance_search.total_whetstone_mentions} mentions`);
    } else {
      findings.uk_ec.party_finance_search = { status: r2.status, code: r2.response_status_code, bytes: r2.content_length };
      console.log(`  ${r2.status} (${r2.response_status_code}) — ${r2.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); findings.uk_ec.party_finance_search = { error: e.message }; }

  // ─── Companies House ────────────────────────────────────────────────
  console.log('\n[2/3] Companies House director + company searches...');

  // Officer search: looks for individuals registered as officers (directors).
  try {
    const r3 = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/officers?q=steven+hilton',
      'Companies House officer search: "Steven Hilton" directorships in UK companies',
      { lookFor: 'Steve Hilton directorships' }
    );
    if (r3.status === 'ok' && r3.content) {
      findings.companies_house.hilton_director = {
        status: 'fetched',
        bytes: r3.content_length,
        steve_hilton_results: (r3.content.match(/Steven\s+Hilton|Steve\s+Hilton/gi) || []).length,
        sample_context: extractSampleContext(r3.content, /Steven\s+Hilton|Steve\s+Hilton/i, 400),
      };
      console.log(`  ${r3.status} — ${r3.content_length} bytes — Hilton director hits ${findings.companies_house.hilton_director.steve_hilton_results}`);
    } else {
      findings.companies_house.hilton_director = { status: r3.status, code: r3.response_status_code, bytes: r3.content_length };
      console.log(`  ${r3.status} (${r3.response_status_code}) — ${r3.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); findings.companies_house.hilton_director = { error: e.message }; }

  // Whetstone officer search
  try {
    const r4 = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/officers?q=rachel+whetstone',
      'Companies House officer search: "Rachel Whetstone" directorships',
      { lookFor: 'Rachel Whetstone directorships' }
    );
    if (r4.status === 'ok' && r4.content) {
      findings.companies_house.whetstone_director = {
        status: 'fetched',
        bytes: r4.content_length,
        rachel_whetstone_results: (r4.content.match(/Rachel\s+Whetstone/gi) || []).length,
        sample_context: extractSampleContext(r4.content, /Rachel\s+Whetstone/i, 400),
      };
      console.log(`  ${r4.status} — ${r4.content_length} bytes — Whetstone director hits ${findings.companies_house.whetstone_director.rachel_whetstone_results}`);
    } else {
      findings.companies_house.whetstone_director = { status: r4.status, code: r4.response_status_code, bytes: r4.content_length };
      console.log(`  ${r4.status} (${r4.response_status_code}) — ${r4.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); findings.companies_house.whetstone_director = { error: e.message }; }

  // Crowdpac company search
  try {
    const r5 = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/search/companies?q=crowdpac',
      'Companies House company search: "Crowdpac" UK entity registration',
      { lookFor: 'Crowdpac UK Ltd or related entity' }
    );
    if (r5.status === 'ok' && r5.content) {
      findings.companies_house.crowdpac_company = {
        status: 'fetched',
        bytes: r5.content_length,
        crowdpac_results: (r5.content.match(/Crowdpac/gi) || []).length,
        sample_context: extractSampleContext(r5.content, /Crowdpac/i, 600),
      };
      console.log(`  ${r5.status} — ${r5.content_length} bytes — Crowdpac mentions ${findings.companies_house.crowdpac_company.crowdpac_results}`);
    } else {
      findings.companies_house.crowdpac_company = { status: r5.status, code: r5.response_status_code, bytes: r5.content_length };
      console.log(`  ${r5.status} (${r5.response_status_code}) — ${r5.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); findings.companies_house.crowdpac_company = { error: e.message }; }

  // ─── Hansard ────────────────────────────────────────────────────────
  console.log('\n[3/3] Hansard parliamentary record search...');

  try {
    const r6 = await tryFetch(
      'https://hansard.parliament.uk/search?searchTerm=%22Steve+Hilton%22&house=All',
      'Hansard search: "Steve Hilton" mentions in UK parliamentary debates',
      { lookFor: 'Cameron-era references to Steve Hilton as Director of Strategy' }
    );
    if (r6.status === 'ok' && r6.content) {
      findings.hansard.hilton_search = {
        status: 'fetched',
        bytes: r6.content_length,
        steve_hilton_results: (r6.content.match(/Steve\s+Hilton/g) || []).length,
        sample_context: extractSampleContext(r6.content, /Steve\s+Hilton/, 600),
      };
      console.log(`  ${r6.status} — ${r6.content_length} bytes — Hansard "Steve Hilton" hits ${findings.hansard.hilton_search.steve_hilton_results}`);
    } else {
      findings.hansard.hilton_search = { status: r6.status, code: r6.response_status_code, bytes: r6.content_length };
      console.log(`  ${r6.status} (${r6.response_status_code}) — ${r6.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); findings.hansard.hilton_search = { error: e.message }; }

  // Big Society policy attribution
  try {
    const r7 = await tryFetch(
      'https://hansard.parliament.uk/search?searchTerm=%22Big+Society%22&house=All',
      'Hansard search: "Big Society" debates — Cameron-era policy attribution',
      { lookFor: 'parliamentary debate about Big Society naming Hilton' }
    );
    if (r7.status === 'ok' && r7.content) {
      findings.hansard.big_society_attribution = {
        status: 'fetched',
        bytes: r7.content_length,
        big_society_results: (r7.content.match(/Big\s+Society/g) || []).length,
        sample_context: extractSampleContext(r7.content, /Big\s+Society/, 400),
      };
      console.log(`  ${r7.status} — ${r7.content_length} bytes — "Big Society" hits ${findings.hansard.big_society_attribution.big_society_results}`);
    } else {
      findings.hansard.big_society_attribution = { status: r7.status, code: r7.response_status_code, bytes: r7.content_length };
      console.log(`  ${r7.status} (${r7.response_status_code}) — ${r7.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); findings.hansard.big_society_attribution = { error: e.message }; }

  // ─── Write findings ─────────────────────────────────────────────────
  findings.generated = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(findings, null, 2), 'utf-8');
  console.log(`\nWrote ${OUT}`);
  console.log(`Total fetches: ${findings.fetches.length}`);
  console.log(`Status breakdown: ${countBy(findings.fetches.map(f => f.status))}`);
})().catch(err => { console.error('FATAL:', err.message); process.exit(1); });

function extractSampleContext(text, regex, range) {
  const m = text.match(regex);
  if (!m) return null;
  const idx = text.indexOf(m[0]);
  const snippet = text.slice(Math.max(0, idx - range/2), idx + range/2);
  return snippet.replace(/\s+/g, ' ').slice(0, range * 2);
}

function countBy(arr) {
  const m = {};
  for (const x of arr) m[x] = (m[x] || 0) + 1;
  return Object.entries(m).map(([k, v]) => `${k}=${v}`).join(', ');
}
