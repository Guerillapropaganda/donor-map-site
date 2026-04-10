// Pipeline definitions — maps to donor-map-engine's api-enrichment.yml
//
// ACTION TYPES:
// - "auto-fill": Pure data. Press Enrich → goes live. No editorial needed.
// - "source-discovery": Finds government sources, adds citations. Quick review recommended.
// - "investigative": Pulls data that may need editorial review before publishing.
// - "relationship": Connects profiles to each other automatically.

export interface Pipeline {
  id: string
  name: string
  description: string
  source: string
  tier: number
  requiresAuth: boolean
  category: "financial" | "legislative" | "regulatory" | "judicial" | "investigative" | "reference"
  action: "auto-fill" | "source-discovery" | "investigative" | "relationship"
}

export const PIPELINES: Pipeline[] = [
  // ═══ AUTO-FILL — pure data, no editorial needed ═══
  { id: "fec", name: "FEC Filings", description: "How much they raised, spent, and who donated", source: "fec.gov", tier: 1, requiresAuth: true, category: "financial", action: "auto-fill" },
  { id: "fec-summary", name: "FEC Summary", description: "Total raised, total spent, cash on hand per cycle", source: "fec.gov", tier: 1, requiresAuth: true, category: "financial", action: "auto-fill" },
  { id: "voting-record", name: "Voting Record", description: "Party loyalty %, ideology score, key votes table", source: "congress.gov + govtrack.us", tier: 1, requiresAuth: true, category: "legislative", action: "auto-fill" },
  { id: "congress", name: "Congress.gov", description: "Bills sponsored, cosponsored, policy areas", source: "congress.gov", tier: 1, requiresAuth: true, category: "legislative", action: "auto-fill" },
  { id: "committee", name: "Committee Assignments", description: "Which committees and subcommittees they sit on", source: "congress.gov", tier: 1, requiresAuth: true, category: "legislative", action: "auto-fill" },
  { id: "govtrack", name: "GovTrack", description: "Legislative activity, bill tracking, vote analysis", source: "govtrack.us", tier: 1, requiresAuth: false, category: "legislative", action: "auto-fill" },
  { id: "usaspending", name: "USASpending", description: "Federal contracts and grants they received", source: "usaspending.gov", tier: 1, requiresAuth: false, category: "financial", action: "auto-fill" },
  { id: "usaspending-awards", name: "USASpending Awards", description: "Individual federal award details", source: "usaspending.gov", tier: 1, requiresAuth: false, category: "financial", action: "auto-fill" },
  { id: "sam", name: "SAM.gov", description: "Government contractor registration status", source: "sam.gov", tier: 1, requiresAuth: true, category: "financial", action: "auto-fill" },
  { id: "nonprofit-990", name: "Nonprofit 990s", description: "IRS tax filings — revenue, expenses, executive pay", source: "projects.propublica.org", tier: 1, requiresAuth: false, category: "financial", action: "auto-fill" },
  { id: "ofac-sdn", name: "OFAC SDN", description: "Are they on the sanctions list?", source: "treasury.gov", tier: 1, requiresAuth: false, category: "regulatory", action: "auto-fill" },
  { id: "recall", name: "CPSC Recalls", description: "Product safety recalls linked to this entity", source: "cpsc.gov", tier: 1, requiresAuth: false, category: "regulatory", action: "auto-fill" },
  { id: "nhtsa-recalls", name: "NHTSA Recalls", description: "Vehicle safety recalls", source: "nhtsa.gov", tier: 1, requiresAuth: false, category: "regulatory", action: "auto-fill" },
  { id: "sec-edgar", name: "SEC EDGAR", description: "Corporate filings — 10-K, proxy statements", source: "sec.gov", tier: 1, requiresAuth: false, category: "judicial", action: "auto-fill" },
  { id: "wikipedia", name: "Wikipedia/Wikidata", description: "Bio data, positions held, key facts", source: "wikipedia.org", tier: 3, requiresAuth: false, category: "reference", action: "auto-fill" },
  { id: "fcc", name: "FCC", description: "Broadcasting licenses and media ownership", source: "fcc.gov", tier: 1, requiresAuth: false, category: "regulatory", action: "auto-fill" },
  { id: "fda", name: "FDA Enforcement", description: "Drug/device/food recalls — Class I life-threatening highlighted", source: "api.fda.gov", tier: 1, requiresAuth: false, category: "regulatory", action: "auto-fill" },
  { id: "occ", name: "OCC Enforcement", description: "National-bank enforcement actions — consent orders, CMPs, cease-and-desist", source: "api.occ.gov", tier: 1, requiresAuth: true, category: "regulatory", action: "auto-fill" },
  { id: "ftc", name: "FTC Enforcement", description: "Historical enforcement actions + HSR merger filings", source: "api.ftc.gov + ftc.gov CSVs", tier: 1, requiresAuth: true, category: "regulatory", action: "auto-fill" },

  // ═══ SOURCE DISCOVERY — adds citations, quick review recommended ═══
  { id: "lda", name: "Senate LDA", description: "Lobbying disclosure filings — who lobbied for what", source: "lda.gov", tier: 1, requiresAuth: true, category: "legislative", action: "source-discovery" },
  { id: "lobbyview", name: "LobbyView", description: "Lobbying networks — which bills they lobbied on", source: "lobbyview.org", tier: 1, requiresAuth: true, category: "legislative", action: "source-discovery" },
  { id: "fara", name: "FARA", description: "Foreign agent registrations — who represents foreign governments", source: "fara.us", tier: 1, requiresAuth: false, category: "regulatory", action: "source-discovery" },
  { id: "federal-register", name: "Federal Register", description: "Federal rules, notices, and executive orders mentioning them", source: "federalregister.gov", tier: 1, requiresAuth: false, category: "regulatory", action: "source-discovery" },
  { id: "courtlistener", name: "CourtListener", description: "Federal court cases they're involved in", source: "courtlistener.com", tier: 1, requiresAuth: true, category: "judicial", action: "source-discovery" },
  { id: "sec-litigation", name: "SEC Litigation", description: "SEC enforcement actions against them", source: "sec.gov", tier: 1, requiresAuth: false, category: "judicial", action: "source-discovery" },
  { id: "doj-press", name: "DOJ Press", description: "Department of Justice mentions and press releases", source: "justice.gov", tier: 1, requiresAuth: false, category: "judicial", action: "source-discovery" },
  { id: "osha", name: "OSHA", description: "Workplace safety violations and inspections", source: "dol.gov", tier: 1, requiresAuth: true, category: "regulatory", action: "source-discovery" },

  // ═══ INVESTIGATIVE — needs editorial review before publishing ═══
  { id: "propublica", name: "ProPublica", description: "Congressional member data and committee info", source: "propublica.org", tier: 2, requiresAuth: false, category: "investigative", action: "investigative" },
  { id: "public-accountability", name: "Public Accountability", description: "Corporate accountability and transparency records", source: "publicaccountability.org", tier: 2, requiresAuth: false, category: "investigative", action: "investigative" },
  { id: "opensanctions", name: "OpenSanctions", description: "Global sanctions and politically exposed persons", source: "opensanctions.org", tier: 2, requiresAuth: true, category: "investigative", action: "investigative" },
  { id: "lobbying-contrib", name: "Lobbying Cross-Ref", description: "Maps lobbying spend to campaign donations to committee seats", source: "local vault", tier: 1, requiresAuth: false, category: "investigative", action: "investigative" },

  // ═══ RELATIONSHIP — connects profiles automatically ═══
  { id: "auto-connect", name: "Auto-Connect", description: "Maps donor↔politician links, shared donors, opposition", source: "local vault", tier: 1, requiresAuth: false, category: "reference", action: "relationship" },
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

export const ACTION_LABELS: Record<string, string> = {
  "auto-fill": "Auto-Fill",
  "source-discovery": "Source Discovery",
  investigative: "Needs Review",
  relationship: "Relationship",
}

export const ACTION_COLORS: Record<string, string> = {
  "auto-fill": "#22c55e",
  "source-discovery": "#5b8dce",
  investigative: "#f59e0b",
  relationship: "#a855f7",
}

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  "auto-fill": "Pure data — press Enrich and it goes live. No editing needed.",
  "source-discovery": "Finds government sources and adds citations. Quick review recommended.",
  investigative: "Pulls data that should be reviewed before publishing.",
  relationship: "Connects profiles to each other automatically.",
}
