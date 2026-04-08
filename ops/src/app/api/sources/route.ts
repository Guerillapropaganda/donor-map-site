import { NextResponse } from "next/server"

export interface SourceResult {
  source: string
  tier: number
  title: string
  description: string
  url: string
  category: string
}

// Search multiple government APIs for a given name/entity
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const type = searchParams.get("type") || "all" // politician, donor, all

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "query parameter 'q' required (min 2 chars)" }, { status: 400 })
  }

  const results: SourceResult[] = []
  const errors: string[] = []

  // Run all searches in parallel
  const searches = [
    searchFEC(query, type),
    searchCongress(query, type),
    searchUSASpending(query, type),
    searchFederalRegister(query),
    searchGovTrack(query, type),
    searchSECEdgar(query, type),
    searchLDA(query, type),
    searchSAM(query, type),
    searchCourtListener(query),
    searchFARA(query, type),
    searchDOJPress(query),
    searchProPublicaNonprofits(query, type),
    searchOSHA(query, type),
    searchOpenSanctions(query),
    searchLobbyView(query, type),
  ]

  const names = [
    "FEC", "Congress.gov", "USASpending", "Federal Register", "GovTrack", "SEC EDGAR",
    "Senate LDA", "SAM.gov", "CourtListener", "FARA", "DOJ Press", "ProPublica Nonprofits",
    "OSHA", "OpenSanctions", "LobbyView",
  ]

  const outcomes = await Promise.allSettled(searches)

  outcomes.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value)
    } else {
      errors.push(`${names[i]}: ${outcome.reason?.message || "failed"}`)
    }
  })

  // Sort: Tier 1 first, then by source name
  results.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    return a.source.localeCompare(b.source)
  })

  return NextResponse.json({ results, errors, query })
}

// ===== FEC Search =====
async function searchFEC(query: string, type: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  const apiKey = process.env.FECAPI || process.env.FEC_API_KEY || "DEMO_KEY"

  if (type === "all" || type === "politician") {
    try {
      const res = await fetch(
        `https://api.open.fec.gov/v1/candidates/search/?q=${encodeURIComponent(query)}&api_key=${apiKey}&per_page=5`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (res.ok) {
        const data = await res.json()
        for (const c of data.results || []) {
          results.push({
            source: "FEC", tier: 1,
            title: `${c.name} — ${c.office_full || c.office || ""} ${c.state || ""}`,
            description: `Party: ${c.party_full || c.party || "N/A"} | Cycles: ${(c.cycles || []).slice(-3).join(", ")} | ID: ${c.candidate_id}`,
            url: `https://www.fec.gov/data/candidate/${c.candidate_id}/`,
            category: "Campaign Finance",
          })
        }
      }
    } catch { /* skip */ }
  }

  if (type === "all" || type === "donor") {
    try {
      const res = await fetch(
        `https://api.open.fec.gov/v1/committees/?q=${encodeURIComponent(query)}&api_key=${apiKey}&per_page=5`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (res.ok) {
        const data = await res.json()
        for (const c of data.results || []) {
          results.push({
            source: "FEC", tier: 1,
            title: `${c.name} — ${c.committee_type_full || ""}`,
            description: `Designation: ${c.designation_full || "N/A"} | Treasurer: ${c.treasurer_name || "N/A"} | ID: ${c.committee_id}`,
            url: `https://www.fec.gov/data/committee/${c.committee_id}/`,
            category: "Campaign Finance",
          })
        }
      }
    } catch { /* skip */ }
  }

  return results
}

// ===== Congress.gov Search =====
async function searchCongress(query: string, type: string): Promise<SourceResult[]> {
  if (type === "donor") return []
  const results: SourceResult[] = []
  const apiKey = process.env.CONGRESSAPI || process.env.CONGRESS_API_KEY
  if (!apiKey) return results

  try {
    const res = await fetch(
      `https://api.congress.gov/v3/member?query=${encodeURIComponent(query)}&limit=5&api_key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const m of data.members || []) {
        const name = m.name || `${m.firstName} ${m.lastName}`
        results.push({
          source: "Congress.gov", tier: 1,
          title: `${name} — ${m.state || ""} ${m.district ? `District ${m.district}` : ""}`,
          description: `Party: ${m.partyName || "N/A"} | Chamber: ${m.terms?.item?.[0]?.chamber || "N/A"} | BioguideID: ${m.bioguideId || "N/A"}`,
          url: m.url || `https://www.congress.gov/member/${(m.bioguideId || "").toLowerCase()}`,
          category: "Legislative",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== USASpending Search =====
async function searchUSASpending(query: string, type: string): Promise<SourceResult[]> {
  if (type === "politician") return []
  const results: SourceResult[] = []

  try {
    const res = await fetch("https://api.usaspending.gov/api/v2/autocomplete/awarding_agency/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search_text: query, limit: 5 }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      for (const r of data.results || []) {
        results.push({
          source: "USASpending", tier: 1,
          title: `${r.awarding_agency?.agency_name || r.subtier_agency?.subtier_agency_name || query}`,
          description: "Federal spending data for agency/recipient",
          url: `https://www.usaspending.gov/search/?hash=&filters=${encodeURIComponent(JSON.stringify({ keyword: query }))}`,
          category: "Federal Spending",
        })
      }
    }
  } catch { /* skip */ }

  try {
    const res = await fetch("https://api.usaspending.gov/api/v2/autocomplete/recipient/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search_text: query, limit: 5 }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      for (const r of data.results || []) {
        results.push({
          source: "USASpending", tier: 1,
          title: `${r.recipient_name || query} — Federal Award Recipient`,
          description: `DUNS: ${r.recipient_unique_id || "N/A"}`,
          url: `https://www.usaspending.gov/recipient/${r.recipient_id || ""}/latest`,
          category: "Federal Spending",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== Federal Register Search =====
async function searchFederalRegister(query: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  try {
    const res = await fetch(
      `https://www.federalregister.gov/api/v1/documents.json?conditions[term]=${encodeURIComponent(query)}&per_page=5&order=relevance`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const doc of data.results || []) {
        results.push({
          source: "Federal Register", tier: 1,
          title: doc.title || query,
          description: `Type: ${doc.type || "N/A"} | Published: ${doc.publication_date || "N/A"} | Agency: ${(doc.agencies || []).map((a: { name: string }) => a.name).join(", ") || "N/A"}`,
          url: doc.html_url || doc.url || "",
          category: "Regulatory",
        })
      }
    }
  } catch { /* skip */ }
  return results
}

// ===== GovTrack Search =====
async function searchGovTrack(query: string, type: string): Promise<SourceResult[]> {
  if (type === "donor") return []
  const results: SourceResult[] = []
  try {
    const res = await fetch(
      `https://www.govtrack.us/api/v2/person?q=${encodeURIComponent(query)}&limit=5`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const p of data.objects || []) {
        const role = p.roles?.[0]
        results.push({
          source: "GovTrack", tier: 1,
          title: `${p.name || p.firstname + " " + p.lastname} — ${role?.role_type_label || ""} ${role?.state || ""}`,
          description: `Party: ${role?.party || "N/A"} | Since: ${role?.startdate || "N/A"} | GovTrack ID: ${p.id}`,
          url: `https://www.govtrack.us/congress/members/${p.id}`,
          category: "Legislative",
        })
      }
    }
  } catch { /* skip */ }
  return results
}

// ===== SEC EDGAR Search =====
async function searchSECEdgar(query: string, type: string): Promise<SourceResult[]> {
  if (type === "politician") return []
  const results: SourceResult[] = []
  try {
    const res = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2020-01-01&enddt=2026-12-31&forms=10-K,10-Q,DEF+14A&from=0&size=5`,
      { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "DonorMapOps/1.0 (research)" } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const hit of data.hits?.hits || []) {
        const s = hit._source || {}
        results.push({
          source: "SEC EDGAR", tier: 1,
          title: `${s.display_names?.[0] || s.entity_name || query} — ${s.form_type || "Filing"}`,
          description: `Filed: ${s.file_date || "N/A"} | CIK: ${s.entity_id || "N/A"}`,
          url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(query)}&type=&dateb=&owner=include&count=10&search_text=&action=getcompany`,
          category: "Corporate Filings",
        })
      }
    }
  } catch { /* skip */ }

  if (results.length === 0) {
    results.push({
      source: "SEC EDGAR", tier: 1,
      title: `Search SEC EDGAR for "${query}"`,
      description: "Direct search link — corporate filings, proxy statements, 10-K reports",
      url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(query)}&CIK=&type=&dateb=&owner=include&count=10&search_text=&action=getcompany`,
      category: "Corporate Filings",
    })
  }
  return results
}

// ===== Senate LDA (Lobbying Disclosures) =====
async function searchLDA(query: string, type: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  const apiKey = process.env.LDAAPI || process.env.LDA_API_KEY
  if (!apiKey) return results

  // Search registrants
  try {
    const res = await fetch(
      `https://lda.senate.gov/api/v1/registrants/?search=${encodeURIComponent(query)}&page_size=5`,
      { signal: AbortSignal.timeout(8000), headers: { Authorization: `Token ${apiKey}` } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const r of data.results || []) {
        results.push({
          source: "Senate LDA", tier: 1,
          title: `${r.name || query} — Lobbying Registrant`,
          description: `Address: ${r.address || "N/A"} | ID: ${r.id || "N/A"}`,
          url: `https://lda.senate.gov/filings/search/?registrant=${encodeURIComponent(r.name || query)}`,
          category: "Lobbying",
        })
      }
    }
  } catch { /* skip */ }

  // Search filings
  try {
    const res = await fetch(
      `https://lda.senate.gov/api/v1/filings/?search=${encodeURIComponent(query)}&page_size=5`,
      { signal: AbortSignal.timeout(8000), headers: { Authorization: `Token ${apiKey}` } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const f of data.results || []) {
        results.push({
          source: "Senate LDA", tier: 1,
          title: `${f.registrant?.name || ""} — ${f.client?.name || query}`,
          description: `Filing: ${f.filing_type_display || "N/A"} | Period: ${f.filing_period_display || "N/A"} ${f.filing_year || ""} | Income: ${f.income || "N/A"}`,
          url: f.filing_url || `https://lda.senate.gov/filings/search/?search=${encodeURIComponent(query)}`,
          category: "Lobbying",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== SAM.gov (Federal Contracts) =====
async function searchSAM(query: string, type: string): Promise<SourceResult[]> {
  if (type === "politician") return []
  const results: SourceResult[] = []
  const apiKey = process.env.SAMAPI || process.env.SAM_API_KEY
  if (!apiKey) return results

  try {
    const res = await fetch(
      `https://api.sam.gov/entity-information/v3/entities?api_key=${apiKey}&registrationName=${encodeURIComponent(query)}&includeSections=entityRegistration&page=0&size=5`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const e of data.entityData || []) {
        const reg = e.entityRegistration || {}
        results.push({
          source: "SAM.gov", tier: 1,
          title: `${reg.legalBusinessName || query} — ${reg.registrationStatus || ""}`,
          description: `UEI: ${reg.ueiSAM || "N/A"} | CAGE: ${reg.cageCode || "N/A"} | Expiration: ${reg.registrationExpirationDate || "N/A"}`,
          url: `https://sam.gov/entity/${reg.ueiSAM || ""}/coreData`,
          category: "Federal Contracts",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== CourtListener (Federal Courts) =====
async function searchCourtListener(query: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  const apiKey = process.env.COURTLISTENERAPI || process.env.COURTLISTENER_API_KEY
  if (!apiKey) return results

  try {
    const res = await fetch(
      `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(query)}&type=o&page_size=5`,
      { signal: AbortSignal.timeout(8000), headers: { Authorization: `Token ${apiKey}` } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const r of data.results || []) {
        results.push({
          source: "CourtListener", tier: 1,
          title: r.caseName || r.case_name || query,
          description: `Court: ${r.court || "N/A"} | Date: ${r.dateFiled || r.date_filed || "N/A"} | Docket: ${r.docketNumber || r.docket_number || "N/A"}`,
          url: r.absolute_url ? `https://www.courtlistener.com${r.absolute_url}` : `https://www.courtlistener.com/?q=${encodeURIComponent(query)}`,
          category: "Judicial",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== FARA (Foreign Agent Registration) =====
async function searchFARA(query: string, type: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []

  // Search active foreign principals
  try {
    const res = await fetch(
      `https://efile.fara.gov/api/v1/ActiveForeignPrincipals/json?search=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const r of (data.data || data.results || data || []).slice(0, 5)) {
        const name = r.ForeignPrincipal || r.foreign_principal || r.name || query
        const registrant = r.Registrant || r.registrant_name || ""
        results.push({
          source: "FARA", tier: 1,
          title: `${name} — Foreign Principal`,
          description: `Registrant: ${registrant} | Country: ${r.Country || r.country || "N/A"}`,
          url: `https://efile.fara.gov/ords/fara/q/foreignprincipal?search=${encodeURIComponent(query)}`,
          category: "Foreign Lobbying",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== DOJ Press Releases =====
async function searchDOJPress(query: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []

  try {
    const res = await fetch(
      `https://www.justice.gov/api/v1/press_releases.json?keyword=${encodeURIComponent(query)}&pagesize=5&sort=date&direction=DESC`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const r of data.results || []) {
        results.push({
          source: "DOJ Press", tier: 1,
          title: r.title || query,
          description: `Date: ${r.date || "N/A"} | Component: ${r.component?.name || "N/A"}`,
          url: r.url ? `https://www.justice.gov${r.url}` : `https://www.justice.gov/search?query=${encodeURIComponent(query)}`,
          category: "Judicial",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== ProPublica Nonprofits (990 filings) =====
async function searchProPublicaNonprofits(query: string, type: string): Promise<SourceResult[]> {
  if (type === "politician") return []
  const results: SourceResult[] = []

  try {
    const res = await fetch(
      `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      for (const org of (data.organizations || []).slice(0, 5)) {
        results.push({
          source: "ProPublica Nonprofits", tier: 2,
          title: `${org.name || query} — ${org.city || ""}, ${org.state || ""}`,
          description: `EIN: ${org.ein || "N/A"} | NTEE: ${org.ntee_code || "N/A"} | Total Revenue: ${org.total_revenue ? `$${Number(org.total_revenue).toLocaleString()}` : "N/A"}`,
          url: `https://projects.propublica.org/nonprofits/organizations/${org.ein}`,
          category: "Nonprofit Filings",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== OSHA (Workplace Safety) =====
async function searchOSHA(query: string, type: string): Promise<SourceResult[]> {
  if (type === "politician") return []
  const results: SourceResult[] = []
  const apiKey = process.env.DOLAPI || process.env.DOL_API_KEY
  if (!apiKey) return results

  try {
    const res = await fetch(
      `https://apiprod.dol.gov/v4/get/osha/inspection/json?filters=estab_name eq '${query}'&page=1&per_page=5`,
      { signal: AbortSignal.timeout(8000), headers: { "X-API-KEY": apiKey } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const r of data.data || data.results || []) {
        results.push({
          source: "OSHA", tier: 1,
          title: `${r.estab_name || query} — OSHA Inspection`,
          description: `Date: ${r.open_date || "N/A"} | Type: ${r.insp_type || "N/A"} | State: ${r.site_state || "N/A"} | Violations: ${r.total_current_penalty || "N/A"}`,
          url: `https://www.osha.gov/ords/imis/establishment.search_establishment?p_logger=1&establishment=${encodeURIComponent(query)}`,
          category: "Workplace Safety",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== OpenSanctions (Sanctions/PEP) =====
async function searchOpenSanctions(query: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  const apiKey = process.env.OPENSANCTIONSAPI || process.env.OPENSANCTIONS_API_KEY
  if (!apiKey) return results

  try {
    const res = await fetch(
      `https://api.opensanctions.org/search/default?q=${encodeURIComponent(query)}&limit=5`,
      { signal: AbortSignal.timeout(8000), headers: { Authorization: `ApiKey ${apiKey}` } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const r of data.results || []) {
        const props = r.properties || {}
        results.push({
          source: "OpenSanctions", tier: 1,
          title: `${props.name?.[0] || r.caption || query}`,
          description: `Type: ${r.schema || "N/A"} | Datasets: ${(r.datasets || []).join(", ") || "N/A"} | Countries: ${(props.country || []).join(", ") || "N/A"}`,
          url: `https://www.opensanctions.org/entities/${r.id}/`,
          category: "Sanctions/PEP",
        })
      }
    }
  } catch { /* skip */ }

  return results
}

// ===== LobbyView (Lobbying Networks) =====
async function searchLobbyView(query: string, type: string): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  const apiKey = process.env.LOBBYVIEWAPI || process.env.LOBBYVIEW_API_KEY
  if (!apiKey) return results

  try {
    const res = await fetch(
      `https://rest-api.lobbyview.org/api/clients?client_name=${encodeURIComponent(query)}&page_size=5`,
      { signal: AbortSignal.timeout(8000), headers: { Authorization: `Token ${apiKey}` } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const r of data.data || data.results || []) {
        results.push({
          source: "LobbyView", tier: 1,
          title: `${r.client_name || query} — Lobbying Client`,
          description: `NAICS: ${r.primary_naics || "N/A"} | Client ID: ${r.client_uuid || "N/A"}`,
          url: `https://www.lobbyview.org/client/${r.client_uuid || ""}`,
          category: "Lobbying",
        })
      }
    }
  } catch { /* skip */ }

  return results
}
