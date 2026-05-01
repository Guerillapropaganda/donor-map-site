#!/usr/bin/env node
/**
 * audit-hilton-uk-records-followup.cjs
 *
 * Follow-up to the initial UK records audit. Initial findings:
 *   - UK EC: 0 hits for Hilton/Whetstone (legit — they were party employees,
 *     not donors >£500). Recorded as substantive negative finding.
 *   - Companies House search returned Crowdpac Limited #10133929 (UK,
 *     dissolved). This script pulls company detail + officer records.
 *   - Hansard CF-blocked (search endpoint).
 *
 * Operates under ADR-0030 §10 amendment 2026-05-01 (UK gov sources).
 */

const fs = require('fs');
const path = require('path');
const { fetchForAudit } = require('./lib/code-audit-fetcher.cjs');

const SCRIPT = 'audit-hilton-uk-records-followup.cjs';
const OUT = path.join('data', 'derived', 'ca-gov-2026', 'hilton-uk-crowdpac-detail.json');

const findings = { generated: null, fetches: [], crowdpac_detail: null, crowdpac_officers: null, crowdpac_filings: null };

async function tryFetch(url, purpose) {
  const r = await fetchForAudit({ url, purpose, script: SCRIPT });
  findings.fetches.push({ url: r.url, status: r.status, code: r.response_status_code, bytes: r.content_length });
  return r;
}

(async () => {
  console.log('=== Crowdpac UK detail + officers ===\n');

  // Crowdpac Limited - company profile (HTML view)
  try {
    const r = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/company/10133929',
      'Crowdpac Limited #10133929 — full company profile'
    );
    if (r.status === 'ok' && r.content) {
      const c = r.content;
      // Pull key fields from the HTML
      findings.crowdpac_detail = {
        status: 'fetched',
        bytes: r.content_length,
        company_name: extractBetween(c, 'class="heading-xlarge">', '</h1>'),
        company_status: extractBetween(c, 'id="company-status">', '</dd>'),
        date_of_dissolution: extractBetween(c, 'id="cessation-date">', '</dd>'),
        date_of_incorporation: extractBetween(c, 'id="company-creation-date">', '</dd>'),
        company_type: extractBetween(c, 'id="company-type">', '</dd>'),
        nature_of_business: extractAllBetween(c, 'id="nature-of-business-', '</dd>'),
        registered_office: extractBetween(c, 'id="company-registered-office">', '</dd>'),
        sample_html_around_status: snippetAround(c, /Dissolved|status/i, 600),
      };
      console.log(`  ${r.status} — ${r.content_length} bytes`);
      console.log(`  Status: ${findings.crowdpac_detail.company_status}`);
      console.log(`  Dissolved: ${findings.crowdpac_detail.date_of_dissolution}`);
      console.log(`  Incorporated: ${findings.crowdpac_detail.date_of_incorporation}`);
    } else {
      console.log(`  ${r.status} (${r.response_status_code})`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); }

  // Crowdpac Limited - officers (directors)
  try {
    const r = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/company/10133929/officers',
      'Crowdpac Limited #10133929 — officer (director) list'
    );
    if (r.status === 'ok' && r.content) {
      const c = r.content;
      findings.crowdpac_officers = {
        status: 'fetched',
        bytes: r.content_length,
        steve_hilton_present: /steven?\s+hilton|hilton[,\s]+steve|HILTON, Steve/i.test(c),
        rachel_whetstone_present: /rachel\s+whetstone|whetstone[,\s]+rachel|WHETSTONE/i.test(c),
        // Extract officer name elements (Companies House uses specific HTML)
        officer_names: extractOfficerNames(c),
        appointed_dates: extractAllBetween(c, 'id="officer-appointed-on-', '</dd>'),
        sample: snippetAround(c, /Director|appointed|resigned/, 800),
      };
      console.log(`  ${r.status} — ${r.content_length} bytes`);
      console.log(`  Officers found: ${findings.crowdpac_officers.officer_names.length}`);
      console.log(`  Steve Hilton present: ${findings.crowdpac_officers.steve_hilton_present}`);
      console.log(`  Rachel Whetstone present: ${findings.crowdpac_officers.rachel_whetstone_present}`);
      if (findings.crowdpac_officers.officer_names.length > 0) {
        console.log(`  Names: ${findings.crowdpac_officers.officer_names.slice(0, 10).join(', ')}`);
      }
    } else {
      console.log(`  ${r.status} (${r.response_status_code})`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); }

  // Crowdpac Limited - filings (last accounts, dissolution paperwork)
  try {
    const r = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/company/10133929/filing-history',
      'Crowdpac Limited #10133929 — filing history (accounts, returns, dissolution paperwork)'
    );
    if (r.status === 'ok' && r.content) {
      const c = r.content;
      findings.crowdpac_filings = {
        status: 'fetched',
        bytes: r.content_length,
        filing_count: (c.match(/id="filing-/g) || []).length,
        filing_types: [...new Set((c.match(/AA \(([^)]+)\)|CS01|TM01|AP01|GAZ\d|MR\d+/g) || []).slice(0, 30))],
        sample: snippetAround(c, /accounts|dissolved|annual|appointment|resignation/i, 800),
      };
      console.log(`  ${r.status} — ${r.content_length} bytes`);
      console.log(`  Filings tracked: ${findings.crowdpac_filings.filing_count}`);
    } else {
      console.log(`  ${r.status} (${r.response_status_code})`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); }

  findings.generated = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(findings, null, 2), 'utf-8');
  console.log(`\nWrote ${OUT}`);
})().catch(err => { console.error('FATAL:', err.message); process.exit(1); });

function extractBetween(text, start, end) {
  const i = text.indexOf(start);
  if (i < 0) return null;
  const j = text.indexOf(end, i + start.length);
  if (j < 0) return null;
  return text.slice(i + start.length, j).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extractAllBetween(text, startPattern, end) {
  const out = [];
  let pos = 0;
  while (pos < text.length) {
    const startRe = new RegExp(startPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"]*"', 'g');
    startRe.lastIndex = pos;
    const m = startRe.exec(text);
    if (!m) break;
    const i = m.index + m[0].length;
    const j = text.indexOf(end, i);
    if (j < 0) break;
    out.push(text.slice(i, j).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    pos = j;
  }
  return out;
}

function extractOfficerNames(html) {
  const names = [];
  // Companies House officer HTML: <h2 ... class="govuk-heading-m"><a href="/officers/...">NAME</a></h2>
  // Or simpler: <a class="link" href="/officers/...">NAME</a>
  const nameRe = /href="\/officers\/[^"]+"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = nameRe.exec(html)) !== null) {
    const n = m[1].trim();
    if (n.length > 2 && /^[A-Z]/.test(n)) names.push(n);
  }
  return [...new Set(names)];
}

function snippetAround(text, regex, range) {
  const m = text.match(regex);
  if (!m) return null;
  const idx = text.indexOf(m[0]);
  return text.slice(Math.max(0, idx - range/2), idx + range/2).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, range * 2);
}
