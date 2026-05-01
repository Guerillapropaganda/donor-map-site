#!/usr/bin/env node
/**
 * verify-hilton-uk-followups.cjs
 *
 * Phase 5 verification follow-up. Resolves what's resolvable from the
 * open-questions list against ADR-0030 §1 allowlisted sources.
 *
 * Resolves:
 *   #3 Crowdpac UK dissolution reason — Companies House filing history
 *   #7 Crowdpac UK financial scale — Companies House filed accounts
 *   #2 Kordestani relationship — Companies House officer cross-search
 *   #8 Hansard — alt-path attempt (member-page / specific URL pattern)
 *
 * Cannot resolve (David's lane per Rule 13):
 *   #1 US naturalization records (USCIS not on allowlist)
 *   #4 Whetstone employment dates (corporate press / LinkedIn out of scope)
 *   #5 Crowdpac US lawsuit (PACER + news out of scope)
 *   #6 US naturalization year (USCIS + news out of scope)
 */

const fs = require('fs');
const path = require('path');
const { fetchForAudit } = require('./lib/code-audit-fetcher.cjs');

const SCRIPT = 'verify-hilton-uk-followups.cjs';
const OUT = path.join('data', 'derived', 'ca-gov-2026', 'hilton-uk-verifications.json');

const findings = {
  generated: null,
  fetches: [],
  q3_crowdpac_dissolution_reason: null,
  q7_crowdpac_financials: null,
  q2_kordestani_relationship: null,
  q8_hansard_alt_path: null,
};

async function tryFetch(url, purpose) {
  const r = await fetchForAudit({ url, purpose, script: SCRIPT });
  findings.fetches.push({ url: r.url, status: r.status, code: r.response_status_code, bytes: r.content_length });
  return r;
}

function snippetAround(text, regex, range = 600) {
  const m = text.match(regex);
  if (!m) return null;
  const idx = text.indexOf(m[0]);
  return text.slice(Math.max(0, idx - range/2), idx + range/2)
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, range * 2);
}

(async () => {
  console.log('=== Phase 5 verification follow-ups ===\n');

  // ─── Q3 + Q7: Crowdpac UK filing history (deeper parse) ──────────────
  console.log('[Q3+Q7] Crowdpac UK filing history — deeper parse...');
  try {
    const r = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/company/10133929/filing-history',
      'Crowdpac Ltd #10133929 filing history — dissolution reason + accounts'
    );
    if (r.status === 'ok' && r.content) {
      const c = r.content;
      // Strip HTML, scan for filing types + dates
      const stripped = c.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');

      // Extract filing rows. Companies House lists filings with structure:
      // <td>DATE</td> <td>DESCRIPTION</td> <td>FORM TYPE</td>
      const filingRows = [];
      // Look for filing-history-list-line patterns (their actual class name)
      const rowMatches = stripped.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
      rowMatches.forEach(row => {
        const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text && (text.match(/\d{1,2}\s+\w+\s+\d{4}/) || /[A-Z]{2,4}\d/.test(text))) {
          filingRows.push(text.slice(0, 250));
        }
      });

      // Look for dissolution-related forms specifically. Common UK forms:
      // GAZ1 (gazette first notice), GAZ2 (gazette dissolved), DISS (dissolution),
      // DS01 (voluntary strike-off application), AD01 (change of address),
      // AA (annual accounts), CS01 (confirmation statement / former AR01)
      const dissFormSearch = (stripped.match(/\b(GAZ[12]|DISS\d*|DS01|DS02|MR\d+|VOL\d+|LIQ\d+|RM\d+|WUR\d+)\b[^<]*/g) || []).slice(0, 20);
      const accountsSearch = (stripped.match(/\b(AA|AAFNES|AAMD|DORM)\b[^<]*/g) || []).slice(0, 20);

      // Look for explicit dissolution-cause language
      const causeSnippets = [];
      const causePatterns = [
        /strike[- ]off/i,
        /winding[- ]up/i,
        /voluntary\s+(?:dissolution|liquidation)/i,
        /compulsory\s+(?:dissolution|liquidation)/i,
        /first\s+gazette\s+notice/i,
        /final\s+gazette\s+notice/i,
        /dissolved\s+on/i,
        /Members'\s+voluntary/i,
      ];
      causePatterns.forEach(p => {
        const s = snippetAround(stripped, p, 300);
        if (s) causeSnippets.push({ pattern: p.toString(), snippet: s });
      });

      // Accounts type indicates company size + activity
      // "DORM" or "Dormant" = no significant activity
      // "Total exemption" / "Micro-entity" = very small company
      // Anything else = real operating company
      const dormantHits = (c.match(/dormant/gi) || []).length;

      findings.q3_crowdpac_dissolution_reason = {
        status: 'fetched',
        bytes: r.content_length,
        filing_form_codes_found: [...new Set(dissFormSearch)].slice(0, 15),
        accounts_form_codes: [...new Set(accountsSearch)].slice(0, 15),
        dissolution_cause_snippets: causeSnippets,
        filing_row_samples: filingRows.slice(0, 25),
        dormant_mentions: dormantHits,
        // Verdict logic
        verdict: dormantHits > 0
          ? 'Dormant company indicators present — UK entity likely never had material operations; functional shell of US Crowdpac Inc.'
          : (causeSnippets.some(s => /strike[- ]off/i.test(s.snippet))
             ? 'Voluntary strike-off pattern in filings — typical for non-trading dormant companies'
             : 'Reason unclear from initial parse — needs human review of filing history'),
      };
      console.log(`  ${r.status} — ${r.content_length} bytes`);
      console.log(`  Filing form codes: ${findings.q3_crowdpac_dissolution_reason.filing_form_codes_found.join(', ')}`);
      console.log(`  Dormant mentions: ${dormantHits}`);
      console.log(`  Verdict: ${findings.q3_crowdpac_dissolution_reason.verdict}`);
    } else {
      findings.q3_crowdpac_dissolution_reason = { status: r.status, code: r.response_status_code };
      console.log(`  ${r.status} (${r.response_status_code})`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); }

  // ─── Q2: Kordestani officer search (cross-officer to find shared entities) ───
  console.log('\n[Q2] Companies House officer search for "Omid Kordestani"...');
  try {
    const r = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/search/officers?q=omid+kordestani',
      'Companies House officer search for Omid Kordestani — to test Gisel-to-Omid family link'
    );
    if (r.status === 'ok' && r.content) {
      const c = r.content;
      findings.q2_kordestani_relationship = {
        status: 'fetched',
        bytes: r.content_length,
        omid_present: /omid\s+kordestani|kordestani[,\s]+omid/i.test(c),
        kordestani_results: (c.match(/Kordestani/gi) || []).length,
        sample_context: snippetAround(c, /Kordestani/i, 800),
        verdict: /omid\s+kordestani|kordestani[,\s]+omid/i.test(c)
          ? 'Omid Kordestani DOES have UK director records — Gisel-to-Omid linkage strengthened (still need direct family-relationship source)'
          : 'No "Omid Kordestani" UK director records found — Gisel may be unrelated, OR Omid never held UK directorships. Inconclusive from Companies House alone.',
      };
      console.log(`  ${r.status} — ${r.content_length} bytes`);
      console.log(`  Omid present: ${findings.q2_kordestani_relationship.omid_present}`);
      console.log(`  Verdict: ${findings.q2_kordestani_relationship.verdict}`);
    } else {
      findings.q2_kordestani_relationship = { status: r.status, code: r.response_status_code };
      console.log(`  ${r.status} (${r.response_status_code})`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); }

  // Also try a direct search for the Gisel Kordestani officer record to see her other entities
  console.log('\n[Q2b] Companies House officer detail for Gisel Lynn Kordestani...');
  try {
    const r = await tryFetch(
      'https://find-and-update.company-information.service.gov.uk/search/officers?q=gisel+kordestani',
      'Companies House officer search for Gisel Lynn Kordestani — full appointment list'
    );
    if (r.status === 'ok' && r.content) {
      const c = r.content;
      findings.q2_kordestani_relationship = findings.q2_kordestani_relationship || {};
      findings.q2_kordestani_relationship.gisel_search = {
        status: 'fetched',
        bytes: r.content_length,
        results_text: snippetAround(c, /Gisel|Kordestani/i, 1200),
      };
      console.log(`  ${r.status} — ${r.content_length} bytes`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); }

  // ─── Q8: Hansard alt-path ──────────────────────────────────────────
  console.log('\n[Q8] Hansard alt-path — try direct member-page URL pattern...');
  // Hansard search was CF-blocked. Try direct member-bio URL or specific
  // commons-debates archive endpoint (URL pattern: /commons/2010-XX-XX/...).
  // If member-pages serve, we can search "Steve Hilton" by URL.
  try {
    // Hansard member-bio for Cameron (a known PM) — test if member-bio URLs serve
    const r = await tryFetch(
      'https://hansard.parliament.uk/Commons/2010-07-19/debates',
      'Hansard direct debate-archive URL test (Big Society policy era)'
    );
    if (r.status === 'ok' && r.content) {
      const c = r.content;
      findings.q8_hansard_alt_path = {
        status: 'fetched',
        bytes: r.content_length,
        cf_unblocked_for_archive_pages: true,
        steve_hilton_mentions: (c.match(/Steve\s+Hilton|Steven\s+Hilton/g) || []).length,
        big_society_mentions: (c.match(/Big\s+Society/g) || []).length,
        verdict: 'Hansard archive pages may serve where search endpoint is blocked. Manual URL navigation possible for specific debates. Search-by-keyword still requires alternate path.',
      };
      console.log(`  ${r.status} — ${r.content_length} bytes`);
      console.log(`  Big Society mentions: ${findings.q8_hansard_alt_path.big_society_mentions}`);
    } else {
      findings.q8_hansard_alt_path = {
        status: r.status,
        code: r.response_status_code,
        verdict: r.status === 'blocked-by-cf'
          ? 'Hansard archive pages also CF-protected. Defer to David browser-based research per ADR-0030 prior pattern.'
          : `Status ${r.status}, code ${r.response_status_code}`,
      };
      console.log(`  ${r.status} (${r.response_status_code}) — ${findings.q8_hansard_alt_path.verdict}`);
    }
  } catch (e) { console.log(`  FAILED: ${e.message}`); }

  findings.generated = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(findings, null, 2), 'utf-8');
  console.log(`\nWrote ${OUT}`);
  console.log(`Total fetches: ${findings.fetches.length}`);
})().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
