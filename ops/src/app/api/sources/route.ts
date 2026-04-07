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
  ]

  const outcomes = await Promise.allSettled(searches)

  outcomes.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value)
    } else {
      const names = ["FEC", "Congress", "USASpending", "Federal Register", "GovTrack", "SEC EDGAR"]
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
  const apiKey = process.env.FEC_API_KEY || "DEMO_KEY"

  // Search candidates
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
            source: "FEC",
            tier: 1,
            title: `${c.name} — ${c.office_full || c.office || ""} ${c.state || ""}`,
            description: `Party: ${c.party_full || c.party || "N/A"} | Cycles: ${(c.cycles || []).slice(-3).join(", ")} | ID: ${c.candidate_id}`,
            url: `https://www.fec.gov/data/candidate/${c.candidate_id}/`,
            category: "Campaign Finance",
          })
        }
      }
    } catch { /* timeout or error, skip */ }
  }

  // Search committees (donors, PACs)
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
            source: "FEC",
            tier: 1,
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
  if (type === "donor") return [] // Congress only has members

  const results: SourceResult[] = []
  const apiKey = process.env.CONGRESS_API_KEY

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
          source: "Congress.gov",
          tier: 1,
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
          source: "USASpending",
          tier: 1,
          title: `${r.awarding_agency?.agency_name || r.subtier_agency?.subtier_agency_name || query}`,
          description: `Federal spending data for agency/recipient`,
          url: `https://www.usaspending.gov/search/?hash=&filters=${encodeURIComponent(JSON.stringify({ keyword: query }))}`,
          category: "Federal Spending",
        })
      }
    }
  } catch { /* skip */ }

  // Also search recipients
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
          source: "USASpending",
          tier: 1,
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
          source: "Federal Register",
          tier: 1,
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
          source: "GovTrack",
          tier: 1,
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
      {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "DonorMapOps/1.0 (research)" },
      }
    )
    if (res.ok) {
      const data = await res.json()
      for (const hit of data.hits?.hits || []) {
        const s = hit._source || {}
        results.push({
          source: "SEC EDGAR",
          tier: 1,
          title: `${s.display_names?.[0] || s.entity_name || query} — ${s.form_type || "Filing"}`,
          description: `Filed: ${s.file_date || "N/A"} | CIK: ${s.entity_id || "N/A"}`,
          url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(query)}&type=&dateb=&owner=include&count=10&search_text=&action=getcompany`,
          category: "Corporate Filings",
        })
      }
    }
  } catch { /* skip */ }

  // Fallback: always include a direct EDGAR search link
  if (results.length === 0) {
    results.push({
      source: "SEC EDGAR",
      tier: 1,
      title: `Search SEC EDGAR for "${query}"`,
      description: "Direct search link — corporate filings, proxy statements, 10-K reports",
      url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(query)}&CIK=&type=&dateb=&owner=include&count=10&search_text=&action=getcompany`,
      category: "Corporate Filings",
    })
  }

  return results
}
