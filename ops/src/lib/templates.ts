export interface TemplateField {
  key: string
  label: string
  type: "text" | "select" | "number" | "date" | "textarea"
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  default?: string
}

export interface ProfileTemplate {
  id: string
  label: string
  description: string
  color: string
  type: string // frontmatter type value
  folderBase: string
  subfolders?: { key: string; label: string }[]
  nameFormat: "master" | "simple" // _Name Master Profile.md vs Name.md
  fields: TemplateField[]
}

const PARTY_OPTIONS = [
  { value: "Democrat", label: "Democrat" },
  { value: "Republican", label: "Republican" },
  { value: "Independent", label: "Independent" },
]

const CHAMBER_OPTIONS = [
  { value: "House", label: "House" },
  { value: "Senate", label: "Senate" },
  { value: "Governor", label: "Governor" },
  { value: "President", label: "President" },
]

const READINESS_OPTIONS = [
  { value: "raw", label: "Raw" },
  { value: "draft", label: "Draft" },
]

const SECTOR_OPTIONS = [
  { value: "Agriculture", label: "Agriculture" },
  { value: "Carceral State", label: "Carceral State" },
  { value: "Dark Money", label: "Dark Money" },
  { value: "Defense & Intelligence", label: "Defense & Intelligence" },
  { value: "Education", label: "Education" },
  { value: "Energy & Utilities", label: "Energy & Utilities" },
  { value: "Gig Economy", label: "Gig Economy" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Israel Lobby", label: "Israel Lobby" },
  { value: "Labor Unions", label: "Labor Unions" },
  { value: "Media & Entertainment", label: "Media & Entertainment" },
  { value: "Mega-Donors", label: "Mega-Donors" },
  { value: "Pharma & Healthcare", label: "Pharma & Healthcare" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Super PACs", label: "Super PACs" },
  { value: "Tech & Crypto", label: "Tech & Crypto" },
  { value: "Wall Street", label: "Wall Street" },
]

export const TEMPLATES: ProfileTemplate[] = [
  {
    id: "politician",
    label: "Politician",
    description: "Elected official, candidate, or appointee",
    color: "#5b8dce",
    type: "politician",
    folderBase: "content/Politicians",
    subfolders: [
      { key: "Democrats/House", label: "Democrat — House" },
      { key: "Democrats/Senate", label: "Democrat — Senate" },
      { key: "Democrats/Governors", label: "Democrat — Governor" },
      { key: "Republicans/House", label: "Republican — House" },
      { key: "Republicans/Senate", label: "Republican — Senate" },
      { key: "Republicans/Governors", label: "Republican — Governor" },
      { key: "Independents", label: "Independent" },
    ],
    nameFormat: "master",
    fields: [
      { key: "title", label: "Full Name", type: "text", required: true, placeholder: "Elizabeth Warren" },
      { key: "party", label: "Party", type: "select", required: true, options: PARTY_OPTIONS },
      { key: "chamber", label: "Chamber", type: "select", required: true, options: CHAMBER_OPTIONS },
      { key: "state", label: "State", type: "text", required: true, placeholder: "Massachusetts" },
      { key: "state-abbr", label: "State Abbreviation", type: "text", placeholder: "MA" },
      { key: "district", label: "District", type: "text", placeholder: "7 (House only)" },
      { key: "content-readiness", label: "Readiness", type: "select", options: READINESS_OPTIONS, default: "raw" },
      { key: "source-tier", label: "Source Tier", type: "number", default: "1" },
    ],
  },
  {
    id: "donor",
    label: "Donor / Corporation",
    description: "Individual donor, corporation, or PAC",
    color: "#22c55e",
    type: "donor",
    folderBase: "content/Donors & Power Networks",
    subfolders: SECTOR_OPTIONS.map((s) => ({ key: s.value, label: s.value })),
    nameFormat: "simple",
    fields: [
      { key: "title", label: "Name", type: "text", required: true, placeholder: "Koch Industries" },
      { key: "entity-type", label: "Entity Type", type: "select", options: [
        { value: "individual", label: "Individual" },
        { value: "corporation", label: "Corporation" },
        { value: "pac", label: "PAC" },
        { value: "trade-association", label: "Trade Association" },
        { value: "nonprofit", label: "Nonprofit" },
      ]},
      { key: "sector", label: "Sector", type: "select", required: true, options: SECTOR_OPTIONS },
      { key: "content-readiness", label: "Readiness", type: "select", options: READINESS_OPTIONS, default: "raw" },
      { key: "source-tier", label: "Source Tier", type: "number", default: "1" },
    ],
  },
  {
    id: "think-tank",
    label: "Think Tank",
    description: "Policy research organization",
    color: "#a855f7",
    type: "think-tank",
    folderBase: "content/Think Tanks & Policy Groups",
    subfolders: [
      { key: "Conservative", label: "Conservative" },
      { key: "Liberal", label: "Liberal" },
      { key: "Nonpartisan", label: "Nonpartisan" },
    ],
    nameFormat: "simple",
    fields: [
      { key: "title", label: "Name", type: "text", required: true, placeholder: "Brookings Institution" },
      { key: "content-readiness", label: "Readiness", type: "select", options: READINESS_OPTIONS, default: "raw" },
      { key: "source-tier", label: "Source Tier", type: "number", default: "1" },
    ],
  },
  {
    id: "lobbying-firm",
    label: "Lobbying Firm",
    description: "K Street lobbying and government affairs firm",
    color: "#f59e0b",
    type: "lobbying-firm",
    folderBase: "content/Lobbying Firms & K Street",
    nameFormat: "simple",
    fields: [
      { key: "title", label: "Firm Name", type: "text", required: true, placeholder: "Akin Gump" },
      { key: "content-readiness", label: "Readiness", type: "select", options: READINESS_OPTIONS, default: "raw" },
      { key: "source-tier", label: "Source Tier", type: "number", default: "1" },
    ],
  },
  {
    id: "media-profile",
    label: "Media Profile",
    description: "Journalist, commentator, outlet, or media figure",
    color: "#ef4444",
    type: "media-profile",
    folderBase: "content/Media & Public Figures",
    subfolders: [
      { key: "Conservative Media", label: "Conservative Media" },
      { key: "Liberal Media", label: "Liberal Media" },
      { key: "Podcasts & Independent", label: "Podcasts & Independent" },
    ],
    nameFormat: "simple",
    fields: [
      { key: "title", label: "Name", type: "text", required: true, placeholder: "Tucker Carlson" },
      { key: "content-readiness", label: "Readiness", type: "select", options: READINESS_OPTIONS, default: "raw" },
      { key: "source-tier", label: "Source Tier", type: "number", default: "1" },
    ],
  },
  {
    id: "story",
    label: "Story",
    description: "Investigation, analysis, or editorial piece",
    color: "#ec4899",
    type: "story",
    folderBase: "content/Stories",
    subfolders: [
      { key: "Contradiction Deep-Dives", label: "Contradiction Deep-Dive" },
      { key: "Donor Profiles", label: "Donor Profile" },
      { key: "Follow The Money", label: "Follow The Money" },
      { key: "System Stories", label: "System Story" },
    ],
    nameFormat: "simple",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, placeholder: "How Big Pharma Bought Both Parties" },
      { key: "content-readiness", label: "Readiness", type: "select", options: READINESS_OPTIONS, default: "draft" },
    ],
  },
]

// Generate the file path for a new profile
export function generateFilePath(template: ProfileTemplate, title: string, subfolder?: string): string {
  const clean = title.replace(/[<>:"/\\|?*]/g, "").trim()

  if (template.nameFormat === "master") {
    const folder = subfolder ? `${template.folderBase}/${subfolder}/${clean}` : `${template.folderBase}/${clean}`
    return `${folder}/_${clean} Master Profile.md`
  }

  const folder = subfolder ? `${template.folderBase}/${subfolder}` : template.folderBase
  return `${folder}/${clean}.md`
}

// Generate markdown content for a new profile
export function generateContent(template: ProfileTemplate, values: Record<string, string>): string {
  const fm: Record<string, string | number> = {
    title: values.title || "Untitled",
    type: template.type,
  }

  for (const field of template.fields) {
    if (field.key === "title") continue
    const val = values[field.key] || field.default
    if (val) {
      fm[field.key] = field.type === "number" ? Number(val) : val
    }
  }

  fm["last-updated"] = new Date().toISOString().split("T")[0]

  // Build frontmatter
  const fmLines = Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === "string" && v.includes(":") ? `"${v}"` : v}`)
  const body = values._body || ""

  return `---\n${fmLines.join("\n")}\n---\n\n${body}\n`
}
