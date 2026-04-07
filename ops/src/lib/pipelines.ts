// Pipeline definitions — maps to donor-map-engine's api-enrichment.yml
export interface Pipeline {
  id: string
  name: string
  description: string
  source: string
  tier: number
  requiresAuth: boolean
  category: "financial" | "legislative" | "regulatory" | "judicial" | "investigative" | "reference"
}

export const PIPELINES: Pipeline[] = [
  // Financial
  { id: "fec", name: "FEC Filings", description: "Campaign finance data — contributions, expenditures, committee filings", source: "fec.gov", tier: 1, requiresAuth: true, category: "financial" },
  { id: "fec-summary", name: "FEC Summary", description: "Candidate financial summaries — total raised, spent, cash on hand", source: "fec.gov", tier: 1, requiresAuth: true, category: "financial" },
  { id: "usaspending", name: "USASpending", description: "Federal contract awards and grant data", source: "usaspending.gov", tier: 1, requiresAuth: false, category: "financial" },
  { id: "usaspending-awards", name: "USASpending Awards", description: "Individual award details and recipient info", source: "usaspending.gov", tier: 1, requiresAuth: false, category: "financial" },
  { id: "nonprofit-990", name: "Nonprofit 990s", description: "IRS 990 filings — revenue, expenses, executive compensation", source: "projects.propublica.org", tier: 1, requiresAuth: false, category: "financial" },
  { id: "sam", name: "SAM.gov", description: "Federal entity registrations and exclusions", source: "sam.gov", tier: 1, requiresAuth: true, category: "financial" },

  // Legislative
  { id: "congress", name: "Congress.gov", description: "Bills sponsored, cosponsored, votes cast", source: "congress.gov", tier: 1, requiresAuth: true, category: "legislative" },
  { id: "committee", name: "Committee Assignments", description: "Congressional committee and subcommittee memberships", source: "congress.gov", tier: 1, requiresAuth: true, category: "legislative" },
  { id: "govtrack", name: "GovTrack", description: "Legislative activity, vote records, bill tracking", source: "govtrack.us", tier: 1, requiresAuth: false, category: "legislative" },
  { id: "lda", name: "Senate LDA", description: "Lobbying disclosure filings — registrations and activities", source: "lda.senate.gov", tier: 1, requiresAuth: true, category: "legislative" },
  { id: "lobbyview", name: "LobbyView", description: "Client-bill lobbying networks — who lobbied on what", source: "lobbyview.org", tier: 1, requiresAuth: true, category: "legislative" },
  { id: "lobbying-contrib", name: "Lobbying Cross-Ref", description: "Cross-references lobbyist contributions with filings", source: "lda.senate.gov", tier: 1, requiresAuth: false, category: "legislative" },

  // Regulatory
  { id: "federal-register", name: "Federal Register", description: "Rules, proposed rules, notices, executive orders", source: "federalregister.gov", tier: 1, requiresAuth: false, category: "regulatory" },
  { id: "fara", name: "FARA", description: "Foreign agent registrations and activities", source: "fara.us", tier: 1, requiresAuth: false, category: "regulatory" },
  { id: "ofac-sdn", name: "OFAC SDN", description: "Sanctions list — specially designated nationals", source: "treasury.gov", tier: 1, requiresAuth: false, category: "regulatory" },
  { id: "recall", name: "CPSC Recalls", description: "Consumer product safety recalls", source: "cpsc.gov", tier: 1, requiresAuth: false, category: "regulatory" },
  { id: "nhtsa-recalls", name: "NHTSA Recalls", description: "Vehicle and equipment safety recalls", source: "nhtsa.gov", tier: 1, requiresAuth: false, category: "regulatory" },

  // Judicial
  { id: "courtlistener", name: "CourtListener", description: "Federal court cases and docket entries", source: "courtlistener.com", tier: 1, requiresAuth: true, category: "judicial" },
  { id: "sec-edgar", name: "SEC EDGAR", description: "Corporate filings — 10-K, 10-Q, proxy statements", source: "sec.gov", tier: 1, requiresAuth: false, category: "judicial" },
  { id: "sec-litigation", name: "SEC Litigation", description: "SEC enforcement actions and litigation releases", source: "sec.gov", tier: 1, requiresAuth: false, category: "judicial" },
  { id: "doj-press", name: "DOJ Press", description: "Department of Justice press releases and announcements", source: "justice.gov", tier: 1, requiresAuth: false, category: "judicial" },

  // Investigative
  { id: "propublica", name: "ProPublica", description: "Congressional member data, committee info", source: "propublica.org", tier: 2, requiresAuth: false, category: "investigative" },
  { id: "public-accountability", name: "Public Accountability", description: "Corporate accountability and transparency data", source: "publicaccountability.org", tier: 2, requiresAuth: false, category: "investigative" },
  { id: "opensanctions", name: "OpenSanctions", description: "Global sanctions and PEP data", source: "opensanctions.org", tier: 2, requiresAuth: true, category: "investigative" },

  // Reference
  { id: "wikipedia", name: "Wikipedia/Wikidata", description: "Biographical data, positions held, affiliations", source: "wikipedia.org", tier: 3, requiresAuth: false, category: "reference" },
  { id: "fcc", name: "FCC", description: "Broadcasting licenses and ownership data", source: "fcc.gov", tier: 1, requiresAuth: false, category: "regulatory" },
]

export const CATEGORY_LABELS: Record<string, string> = {
  financial: "Financial",
  legislative: "Legislative",
  regulatory: "Regulatory",
  judicial: "Judicial",
  investigative: "Investigative",
  reference: "Reference",
}

export const CATEGORY_COLORS: Record<string, string> = {
  financial: "#22c55e",
  legislative: "#5b8dce",
  regulatory: "#f59e0b",
  judicial: "#ef4444",
  investigative: "#a855f7",
  reference: "#06b6d4",
}
