// ═══════════════════════════════════════════
// THE DONOR MAP DATABASE — API TOOLKIT
// Version 1.0 — 2026-03-26
// ═══════════════════════════════════════════
// Execute these functions in Chrome via javascript_tool.
// Each function stores results in window._api for retrieval.
// Usage: Copy function into Chrome JS, wait 3-5 seconds, then read window._api
//
// IMPORTANT: All API calls must be made from Chrome browser context.
// The VM proxy blocks direct HTTP requests (curl/python).
// ═══════════════════════════════════════════


// ─────────────────────────────────────────
// FEC API — Individual Contributions
// ─────────────────────────────────────────
// Returns all individual contributions for a donor
// name format: "last, first" (e.g., "ball, krystal")
// Returns: total count, total amount, per-recipient summary, raw records

function fecDonorLookup(name, state, startYear, endYear) {
  const params = new URLSearchParams({
    contributor_name: name,
    api_key: 'DEMO_KEY',
    per_page: '100',
    sort: '-contribution_receipt_date'
  });
  if (state) params.set('contributor_state', state);
  if (startYear) params.set('min_date', `01/01/${startYear}`);
  if (endYear) params.set('max_date', `12/31/${endYear}`);

  return fetch(`https://api.open.fec.gov/v1/schedules/schedule_a/?${params}`)
    .then(r => r.json())
    .then(data => {
      const results = data.results || [];
      const totalAmount = results.reduce((s, r) => s + (r.contribution_receipt_amount || 0), 0);

      // Aggregate by recipient
      const byRecipient = {};
      results.forEach(r => {
        const name = r.committee?.name || r.committee_name || 'UNKNOWN';
        if (!byRecipient[name]) byRecipient[name] = { count: 0, total: 0, dates: [] };
        byRecipient[name].count++;
        byRecipient[name].total += r.contribution_receipt_amount || 0;
        byRecipient[name].dates.push(r.contribution_receipt_date);
      });

      // Aggregate by party (using committee party)
      let repTotal = 0, demTotal = 0, otherTotal = 0;
      results.forEach(r => {
        const party = r.committee?.party || '';
        const amt = r.contribution_receipt_amount || 0;
        if (party === 'REP') repTotal += amt;
        else if (party === 'DEM') demTotal += amt;
        else otherTotal += amt;
      });

      return {
        query: { name, state, startYear, endYear },
        total_results: data.pagination?.count,
        page_results: results.length,
        total_amount: totalAmount.toFixed(2),
        party_split: {
          republican: repTotal.toFixed(2),
          democrat: demTotal.toFixed(2),
          other_pac: otherTotal.toFixed(2)
        },
        top_recipients: Object.entries(byRecipient)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 20)
          .map(([name, d]) => ({
            recipient: name,
            count: d.count,
            total: d.total.toFixed(2),
            latest: d.dates.sort().pop()
          })),
        raw_records: results.map(r => ({
          contributor: r.contributor_name,
          recipient: r.committee?.name || r.committee_name,
          amount: r.contribution_receipt_amount,
          date: r.contribution_receipt_date,
          employer: r.contributor_employer,
          occupation: r.contributor_occupation,
          state: r.contributor_state,
          party: r.committee?.party
        }))
      };
    });
}

// USAGE:
// fecDonorLookup('ball, krystal', 'VA').then(d => { window._api = JSON.stringify(d, null, 2); });
// Wait 3-5 seconds, then read: window._api


// ─────────────────────────────────────────
// FEC API — Candidate Fundraising Totals
// ─────────────────────────────────────────
// Returns aggregate fundraising for a candidate

function fecCandidateTotals(candidateName, cycle) {
  const params = new URLSearchParams({
    q: candidateName,
    api_key: 'DEMO_KEY',
    per_page: '5'
  });
  if (cycle) params.set('cycle', cycle);

  return fetch(`https://api.open.fec.gov/v1/candidates/search/?${params}`)
    .then(r => r.json())
    .then(data => {
      const candidates = data.results || [];
      return Promise.all(candidates.map(c =>
        fetch(`https://api.open.fec.gov/v1/candidates/totals/?candidate_id=${c.candidate_id}&api_key=DEMO_KEY&per_page=5`)
          .then(r => r.json())
          .then(totals => ({
            name: c.name,
            candidate_id: c.candidate_id,
            party: c.party_full,
            office: c.office_full,
            state: c.state,
            cycles: (totals.results || []).map(t => ({
              cycle: t.cycle,
              receipts: t.receipts,
              disbursements: t.disbursements,
              individual_contributions: t.individual_contributions,
              pac_contributions: t.other_political_committee_contributions,
              cash_on_hand: t.cash_on_hand_end_period
            }))
          }))
      ));
    });
}

// USAGE:
// fecCandidateTotals('schumer').then(d => { window._api = JSON.stringify(d, null, 2); });


// ─────────────────────────────────────────
// FEC API — Independent Expenditures
// ─────────────────────────────────────────
// Track Super PAC spending for/against candidates

function fecIndependentExpenditures(candidateName, cycle) {
  const params = new URLSearchParams({
    api_key: 'DEMO_KEY',
    per_page: '20',
    sort: '-expenditure_amount'
  });
  if (cycle) params.set('cycle', cycle);

  // First find the candidate ID
  return fetch(`https://api.open.fec.gov/v1/candidates/search/?q=${encodeURIComponent(candidateName)}&api_key=DEMO_KEY&per_page=1`)
    .then(r => r.json())
    .then(data => {
      const cand = data.results?.[0];
      if (!cand) return { error: 'Candidate not found' };
      params.set('candidate_id', cand.candidate_id);
      return fetch(`https://api.open.fec.gov/v1/schedules/schedule_e/?${params}`)
        .then(r => r.json())
        .then(ie => ({
          candidate: cand.name,
          candidate_id: cand.candidate_id,
          total_ie_results: ie.pagination?.count,
          expenditures: (ie.results || []).map(e => ({
            committee: e.committee?.name,
            amount: e.expenditure_amount,
            support_oppose: e.support_oppose_indicator === 'S' ? 'SUPPORT' : 'OPPOSE',
            date: e.expenditure_date,
            description: e.expenditure_description?.substring(0, 100)
          }))
        }));
    });
}

// USAGE:
// fecIndependentExpenditures('schumer', 2024).then(d => { window._api = JSON.stringify(d, null, 2); });


// ─────────────────────────────────────────
// USASpending API — Federal Contracts
// ─────────────────────────────────────────
// Look up federal contracts awarded to a company

function usaSpendingContracts(companyName, startDate, endDate) {
  return fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: {
        keywords: [companyName],
        time_period: [{ start_date: startDate || '2020-01-01', end_date: endDate || '2026-12-31' }],
        award_type_codes: ['A', 'B', 'C', 'D']
      },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Start Date',
               'Awarding Agency', 'Description', 'naics_description'],
      limit: 20,
      page: 1,
      sort: 'Award Amount',
      order: 'desc'
    })
  })
  .then(r => r.json())
  .then(data => ({
    query: companyName,
    total_results: data.page_metadata?.total,
    total_pages: data.page_metadata?.num_pages,
    contracts: (data.results || []).map(r => ({
      recipient: r['Recipient Name'],
      amount: r['Award Amount'],
      agency: r['Awarding Agency'],
      start_date: r['Start Date'],
      description: (r['Description'] || '').substring(0, 150),
      industry: r['naics_description']
    }))
  }));
}

// USAGE (must run from api.usaspending.gov domain for CORS):
// usaSpendingContracts('Boeing', '2020-01-01', '2026-01-01').then(d => { window._api = JSON.stringify(d, null, 2); });


// ─────────────────────────────────────────
// Senate LDA — Lobbying Filings
// ─────────────────────────────────────────
// Look up lobbying filings by client name
// Auth: Token header required. Key stored in API Pipeline.md.
// Fields: income = what hired firms earned from client
//         expenses = what client spent directly on lobbying
// Total lobbying spend = hired firm income + client direct expenses
// TESTED: 2026-03-31 — ASA query returned 40 filings, $6.835M total

function ldaLobbyingLookup(clientName, year, apiKey) {
  const key = apiKey || 'b3e00f77b9db54cd753ca43bb8773f9e8b0ec5c4';
  const params = new URLSearchParams({
    client_name: clientName
  });
  if (year) params.set('filing_year', year);

  return fetch(`https://lda.senate.gov/api/v1/filings/?${params}`, {
    headers: {
      'Authorization': `Token ${key}`,
      'Accept': 'application/json'
    }
  })
  .then(r => r.json())
  .then(data => {
    const results = data.results || [];
    // Separate hired-firm income from client direct expenses
    const quarterlyReports = results.filter(r =>
      r.filing_type_display && r.filing_type_display.includes('Quarter')
    );
    const hiredFirmIncome = quarterlyReports
      .filter(r => (r.registrant?.name || '').toUpperCase() !== clientName.toUpperCase())
      .reduce((s, r) => s + (parseFloat(r.income) || 0), 0);
    const clientDirectExpenses = quarterlyReports
      .filter(r => (r.registrant?.name || '').toUpperCase() === clientName.toUpperCase())
      .reduce((s, r) => s + (parseFloat(r.expenses) || 0), 0);
    const firms = [...new Set(quarterlyReports
      .filter(r => (r.registrant?.name || '').toUpperCase() !== clientName.toUpperCase())
      .map(r => r.registrant?.name))];

    return {
      query: clientName,
      year: year || 'all',
      total_filings: data.count,
      quarterly_reports: quarterlyReports.length,
      hired_firm_income: hiredFirmIncome.toFixed(2),
      client_direct_expenses: clientDirectExpenses.toFixed(2),
      total_lobbying_spend: (hiredFirmIncome + clientDirectExpenses).toFixed(2),
      hired_firms: firms,
      filings: results.map(r => ({
        registrant: r.registrant?.name,
        client: r.client?.name,
        income: r.income,
        expenses: r.expenses,
        year: r.filing_year,
        period: r.filing_period_display,
        type: r.filing_type_display,
        lobbyists: r.lobbying_activities?.flatMap(
          a => a.lobbyists?.map(l => l.lobbyist?.name) || []
        ),
        issues: r.lobbying_activities?.map(
          a => a.general_issue_code_display
        )
      }))
    };
  });
}

// USAGE (runs from any domain — auth via Token header, no CORS restriction):
// ldaLobbyingLookup('American Sugar Alliance', 2024).then(d => { window._api = JSON.stringify(d, null, 2); });


// ─────────────────────────────────────────
// Congress.gov API — Member Votes
// ─────────────────────────────────────────
// Look up a member's voting record

function congressMemberVotes(bioguideId, congress) {
  const c = congress || 119;
  return fetch(`https://api.congress.gov/v3/member/${bioguideId}?api_key=DEMO_KEY&format=json`)
    .then(r => r.json())
    .then(data => {
      const member = data.member;
      return {
        name: member?.directOrderName,
        party: member?.partyHistory?.[0]?.partyName,
        state: member?.state,
        terms: member?.terms?.map(t => ({
          chamber: t.chamber,
          start: t.startYear,
          end: t.endYear
        })),
        sponsored_legislation_url: `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=DEMO_KEY&format=json&limit=10`
      };
    });
}

// USAGE:
// congressMemberVotes('S000148').then(d => { window._api = JSON.stringify(d, null, 2); }); // Schumer


// ─────────────────────────────────────────
// COMBINED: Donor-to-Policy Pipeline Query
// ─────────────────────────────────────────
// The holy grail: given a donor and a politician,
// show donations + contracts + lobbying in one view

function donorPolicyPipeline(donorName, donorCompany, politicianName) {
  return Promise.all([
    // 1. FEC: What did the donor give?
    fecDonorLookup(donorName),
    // 2. USASpending: What contracts did their company get?
    // Note: must be called from usaspending.gov domain
    // usaSpendingContracts(donorCompany),
    // 3. Senate LDA: What lobbying did the company do?
    ldaLobbyingLookup(donorCompany, null)
  ]).then(([fecData, ldaData]) => ({
    donor: donorName,
    company: donorCompany,
    politician: politicianName,
    fec_contributions: {
      total: fecData.total_results,
      amount: fecData.total_amount,
      party_split: fecData.party_split,
      top_recipients: fecData.top_recipients?.slice(0, 10)
    },
    lda_lobbying: ldaData ? {
      total_filings: ldaData.total_filings,
      total_spend: ldaData.total_lobbying_spend,
      hired_firms: ldaData.hired_firms
    } : null,
    // USASpending contracts require separate domain call due to CORS
    note: 'USASpending query must be run from api.usaspending.gov domain due to CORS. Run usaSpendingContracts() separately.'
  }));
}

// ═══════════════════════════════════════════
// VAULT FORMAT HELPERS
// ═══════════════════════════════════════════

// Format FEC data as vault-ready citation — direct API endpoint with DEMO_KEY
// The FEC API endpoint IS the browsable citation URL — returns JSON readers can verify directly.
// Uses DEMO_KEY (public, 40 requests/hour per IP) so readers can click and see the data.
// FEC.gov web interface does NOT aggregate across name variations — only the API does fuzzy matching.
// OpenSecrets also fails (free tier rate-limited, OS Pro has $200 minimum threshold).
function formatFecCitation(data) {
  const name = data.query?.name || 'Unknown';
  const total = data.total_results || 0;
  const amount = data.total_amount || '0.00';
  const encodedName = encodeURIComponent(name);
  return `- [FEC API: ${name} individual contributions (${total} results, $${amount})](https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=${encodedName}&api_key=DEMO_KEY&per_page=100&sort=-contribution_receipt_date) (Tier 1)`;
}

// Format FEC data as vault-ready party split summary
function formatPartySplit(data) {
  const ps = data.party_split || {};
  const parts = [];
  if (parseFloat(ps.republican) > 0) parts.push(`$${ps.republican} Republican`);
  if (parseFloat(ps.democrat) > 0) parts.push(`$${ps.democrat} Democrat`);
  if (parseFloat(ps.other_pac) > 0) parts.push(`$${ps.other_pac} PAC/Other`);
  return parts.join(', ') || 'No contributions found';
}

// Format as donation-to-policy timeline row
function formatTimelineRow(record) {
  return `| ${record.date} | ${record.contributor} | $${record.amount?.toLocaleString()} | ${record.recipient} | — |`;
}
