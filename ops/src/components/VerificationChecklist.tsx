"use client"

import { useState } from "react"
import type { Profile } from "@/lib/vault"
import { readinessColor } from "@/lib/vault"

interface ChecklistItem {
  id: string
  label: string
  check: (profile: Profile, raw: string) => boolean
  naAllowed?: boolean  // Can be marked N/A
}

// Role-specific politician checklists
function getPoliticianChecklist(chamber?: string): ChecklistItem[] {
  const common: ChecklistItem[] = [
    { id: "fec-data", label: "FEC fundraising data", check: (p, raw) => !!p.totalRaised || raw.includes("<!-- auto:fec-fundraising") || raw.includes("<!-- auto:fec-politician") },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p) => (p.sourceTypes || []).length >= 2 },
    { id: "connections", label: "Connections mapped (donors + related)", check: (p) => !!(p.related || p.donors) },
    { id: "enriched", label: "Enriched within 90 days", check: (p) => { if (!p.lastEnriched) return false; return (Date.now() - new Date(p.lastEnriched).getTime()) / 86400000 <= 90 } },
    { id: "contradiction-review", label: "Contradiction investigation complete (Research Claude)", check: (_, raw) => raw.includes("[!contradiction-cleared]") || !raw.includes("[!contradiction]") },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ]

  const ch = (chamber || "").toLowerCase()

  if (ch === "presidential" || ch === "president") {
    return [
      { id: "executive-orders", label: "Executive orders documented", check: (_, raw) => raw.includes("<!-- auto:executive-orders") || raw.includes("<!-- auto:federal-register") },
      { id: "cabinet-appointments", label: "Cabinet appointments documented", check: (_, raw) => raw.toLowerCase().includes("cabinet") || raw.toLowerCase().includes("appointed") },
      { id: "voting-records", label: "Prior voting record (if applicable)", check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record"), naAllowed: true },
      { id: "fec-data", label: "FEC fundraising data", check: (p, raw) => !!p.totalRaised || raw.includes("<!-- auto:fec") },
      ...common,
    ]
  }

  if (ch === "governor" || ch === "governors") {
    return [
      { id: "executive-actions", label: "Executive actions / state orders documented", check: (_, raw) => raw.toLowerCase().includes("executive order") || raw.toLowerCase().includes("signed into law") },
      { id: "state-legislation", label: "Key state legislation", check: (_, raw) => raw.toLowerCase().includes("signed") || raw.toLowerCase().includes("vetoed"), naAllowed: true },
      { id: "voting-records", label: "Prior voting record (if applicable)", check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record"), naAllowed: true },
      ...common,
    ]
  }

  if (ch === "cabinet") {
    return [
      { id: "appointment", label: "Appointment & confirmation documented", check: (_, raw) => raw.toLowerCase().includes("confirmed") || raw.toLowerCase().includes("appointed") || raw.toLowerCase().includes("nominated") },
      { id: "prior-role", label: "Prior role / revolving door documented", check: (_, raw) => raw.toLowerCase().includes("previously") || raw.toLowerCase().includes("former") },
      { id: "voting-records", label: "Prior voting record (if applicable)", check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record"), naAllowed: true },
      ...common,
    ]
  }

  // Default: Congress (Senate/House)
  return [
    { id: "voting-records", label: "Voting records exist", check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record") },
    { id: "committee-assignments", label: "Committee assignments", check: (p, raw) => !!p.committees || raw.includes("<!-- auto:committee-assignments") },
    { id: "bills", label: "Bills sponsored/cosponsored", check: (p) => (p.billsSponsored || 0) > 0 || (p.billsCosponsored || 0) > 0, naAllowed: true },
    ...common,
  ]
}

const CHECKLISTS: Record<string, ChecklistItem[]> = {
  // politician is handled by getPoliticianChecklist() — see getChecklist() below
  donor: [
    { id: "politicians-funded", label: "Politicians funded documented", check: (p) => !!p.politiciansFunded },
    { id: "contribution-amounts", label: "Total contribution amounts", check: (p) => !!p.totalPoliticalSpend || !!p.totalRaised },
    { id: "lobbying", label: "Lobbying spend", check: (p) => !!p.lobbyingSpend, naAllowed: true },
    { id: "sector", label: "Sector classified", check: (p) => !!p.sector },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p) => (p.sourceTypes || []).length >= 2 },
    { id: "connections", label: "Connections mapped", check: (p) => !!(p.related || p.donors) },
    { id: "enriched", label: "Enriched within 90 days", check: (p) => { if (!p.lastEnriched) return false; return (Date.now() - new Date(p.lastEnriched).getTime()) / 86400000 <= 90 } },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  corporation: [
    { id: "pac-contributions", label: "PAC contributions / politicians funded", check: (p, raw) => !!p.politiciansFunded || raw.includes("<!-- auto:fec-donor") },
    { id: "lobbying", label: "Lobbying filings", check: (p, raw) => !!p.lobbyingSpend || raw.includes("<!-- auto:lda-lobbying") },
    { id: "contracts", label: "Federal contracts", check: (_, raw) => raw.includes("<!-- auto:usaspending") || raw.includes("<!-- auto:sam-contracts") },
    { id: "sec-filings", label: "SEC filings", check: (_, raw) => raw.includes("<!-- auto:sec-edgar"), naAllowed: true },
    { id: "regulatory", label: "Regulatory record (EPA/OSHA)", check: (_, raw) => raw.includes("<!-- auto:epa-echo") || raw.includes("<!-- auto:osha"), naAllowed: true },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p) => (p.sourceTypes || []).length >= 2 },
    { id: "connections", label: "Connections mapped", check: (p) => !!(p.related || p.donors) },
    { id: "enriched", label: "Enriched within 90 days", check: (p) => { if (!p.lastEnriched) return false; return (Date.now() - new Date(p.lastEnriched).getTime()) / 86400000 <= 90 } },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  "media-profile": [
    { id: "ownership", label: "Ownership/funding documented", check: (p) => !!(p.related || p.donors) },
    { id: "political-lean", label: "Political lean sourced", check: (p) => !!p.category },
    { id: "connected", label: "Connected donors/politicians", check: (p) => !!p.related },
    { id: "platform", label: "Platform documented", check: (p) => !!p.platform },
    { id: "source-type", label: "1+ Tier 1 source type", check: (p) => (p.sourceTypes || []).length >= 1, naAllowed: true },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  "think-tank": [
    { id: "funders", label: "Top funders documented", check: (p) => !!(p.donors || p.related) },
    { id: "990-data", label: "990 data (revenue, tax status)", check: (p, raw) => !!(p.ein || p.totalRevenue) || raw.includes("<!-- auto:nonprofit-990") },
    { id: "policy-mapped", label: "Policy positions mapped", check: (p) => !!p.related },
    { id: "tax-status", label: "Tax status documented", check: (p) => !!(p.taxStatus || p.nonprofitStatus) },
    { id: "source-type", label: "1+ Tier 1 source type", check: (p) => (p.sourceTypes || []).length >= 1 },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  "lobbying-firm": [
    { id: "client-list", label: "Client list documented", check: (_, raw) => raw.includes("<!-- auto:lda-lobbying") || raw.includes("client") },
    { id: "lobbying-spend", label: "Lobbying spend totals", check: (p) => !!p.lobbyingSpend },
    { id: "fara", label: "FARA registrations", check: (p, raw) => !!p.faraClients || raw.includes("<!-- auto:fara"), naAllowed: true },
    { id: "revolving-door", label: "Revolving door documented", check: (p) => !!p.revolvingDoorPct, naAllowed: true },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p) => (p.sourceTypes || []).length >= 2 },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  pac: [
    { id: "fec-data", label: "FEC fundraising data", check: (_, raw) => raw.includes("<!-- auto:fec") },
    { id: "donors-mapped", label: "Donors mapped", check: (p) => !!p.donors },
    { id: "politicians-funded", label: "Politicians funded", check: (p) => !!p.politiciansFunded || !!p.related },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p) => (p.sourceTypes || []).length >= 2 },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  // Editorial content types — no pipeline enrichment required
  story: [
    { id: "sourced-urls", label: "Sources cited with URLs", check: (_, raw) => (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length >= 1 },
    { id: "url-threshold", label: "5+ sourced URLs (Report level)", check: (_, raw) => (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length >= 5 },
    { id: "profiles-linked", label: "Profiles linked via wikilinks", check: (_, raw) => (raw.match(/\[\[[^\]]+\]\]/g) || []).length >= 1 },
    { id: "investigation-level", label: "10+ URLs + 3 Tier 1 (Investigation)", check: (_, raw) => (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length >= 10 && (raw.match(/\(Tier 1\)/g) || []).length >= 3, naAllowed: true },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  event: [
    { id: "source-url", label: "Source URL provided", check: (_, raw) => (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length >= 1 },
    { id: "profiles-linked", label: "Profiles linked", check: (_, raw) => (raw.match(/\[\[[^\]]+\]\]/g) || []).length >= 1 },
    { id: "date-accurate", label: "Date documented", check: (p) => !!p.lastUpdated },
  ],
  "sub-note": [
    { id: "sourced", label: "Has sources", check: (_, raw) => (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length >= 1 },
    { id: "profiles-linked", label: "Profiles linked", check: (_, raw) => (raw.match(/\[\[[^\]]+\]\]/g) || []).length >= 1 },
  ],
  "daily-update": [
    { id: "sourced", label: "Has sources", check: (_, raw) => (raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length >= 1 },
    { id: "date", label: "Date documented", check: (p) => !!p.lastUpdated },
  ],
}

// Fallback for types not in the map
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "source-type", label: "1+ Tier 1 source type", check: (p) => (p.sourceTypes || []).length >= 1 },
  { id: "connections", label: "Connections mapped", check: (p) => !!(p.related || p.donors) },
  { id: "enriched", label: "Enriched within 90 days", check: (p) => { if (!p.lastEnriched) return false; return (Date.now() - new Date(p.lastEnriched).getTime()) / 86400000 <= 90 } },
  { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
]

interface Props {
  profile: Profile
  raw: string
  onSaveNa: (naItems: string[]) => void
}

export function VerificationChecklist({ profile, raw, onSaveNa }: Props) {
  const items = profile.type === "politician"
    ? getPoliticianChecklist(profile.chamber)
    : (CHECKLISTS[profile.type] || DEFAULT_CHECKLIST)
  const naItems = profile.checklistNa || []
  const [naInput, setNaInput] = useState<string | null>(null) // id being edited
  const [naReason, setNaReason] = useState("")

  const getNaReason = (id: string): string | undefined => {
    const entry = naItems.find((n) => n.startsWith(`${id}:`))
    return entry ? entry.split(":").slice(1).join(":").trim() : undefined
  }

  const isNa = (id: string) => naItems.some((n) => n.startsWith(`${id}:`))

  const checked = items.filter((item) => !isNa(item.id) && item.check(profile, raw)).length
  const naCount = items.filter((item) => isNa(item.id)).length
  const total = items.length - naCount
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  const gradeColor = pct === 100 ? "#fbbf24" : pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444"

  function addNa(id: string, reason: string) {
    const updated = naItems.filter((n) => !n.startsWith(`${id}:`))
    updated.push(`${id}: ${reason}`)
    onSaveNa(updated)
    setNaInput(null)
    setNaReason("")
  }

  function removeNa(id: string) {
    onSaveNa(naItems.filter((n) => !n.startsWith(`${id}:`)))
  }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
          A+ Verification Checklist
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold" style={{ color: gradeColor }}>
            {checked}/{total} {naCount > 0 && `(${naCount} N/A)`}
          </span>
          <div className="w-20 h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: gradeColor }} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: gradeColor }}>{pct}%</span>
        </div>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const na = isNa(item.id)
          const passed = !na && item.check(profile, raw)
          const naReasonText = getNaReason(item.id)

          return (
            <div key={item.id} className={`flex items-center gap-2 p-1.5 rounded ${na ? "opacity-50" : ""}`}>
              {/* Status icon */}
              {na ? (
                <span className="w-4 h-4 flex items-center justify-center text-[9px] text-[var(--color-text-dim)] bg-[var(--color-bg)] rounded" title="N/A">—</span>
              ) : passed ? (
                <span className="w-4 h-4 flex items-center justify-center text-[10px] text-[var(--color-green)]">&#10003;</span>
              ) : (
                <span className="w-4 h-4 flex items-center justify-center text-[10px] text-[var(--color-red)]">&#10007;</span>
              )}

              {/* Label */}
              <span className={`text-[10px] flex-1 ${na ? "line-through text-[var(--color-text-dim)]" : passed ? "text-[var(--color-text)]" : "text-[var(--color-red)]"}`}>
                {item.label}
              </span>

              {/* N/A reason */}
              {na && naReasonText && (
                <span className="text-[8px] text-[var(--color-text-dim)] italic max-w-[200px] truncate" title={naReasonText}>{naReasonText}</span>
              )}

              {/* N/A toggle */}
              {na ? (
                <button onClick={() => removeNa(item.id)}
                  className="text-[8px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] px-1">
                  restore
                </button>
              ) : !passed && item.naAllowed !== false && naInput !== item.id ? (
                <button onClick={() => { setNaInput(item.id); setNaReason("") }}
                  className="text-[8px] text-[var(--color-text-dim)] hover:text-[var(--color-amber)] px-1 opacity-0 group-hover:opacity-100"
                  style={{ opacity: 1 }}>
                  N/A
                </button>
              ) : null}

              {/* N/A reason input */}
              {naInput === item.id && (
                <div className="flex items-center gap-1">
                  <input type="text" value={naReason} onChange={(e) => setNaReason(e.target.value)}
                    placeholder="Reason..."
                    className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[9px] text-[var(--color-text)] w-32 focus:outline-none focus:border-[var(--color-steel)]"
                    onKeyDown={(e) => { if (e.key === "Enter" && naReason) addNa(item.id, naReason) }} />
                  <button onClick={() => naReason && addNa(item.id, naReason)}
                    className="text-[8px] text-[var(--color-green)] hover:underline">save</button>
                  <button onClick={() => setNaInput(null)}
                    className="text-[8px] text-[var(--color-text-dim)] hover:underline">cancel</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pipeline data blocks found */}
      {(() => {
        const blockTypes = [...raw.matchAll(/<!-- auto:(\S+) start/g)].map(m => m[1])
        if (blockTypes.length === 0) return null
        const verified = profile.verifiedBlocks || []
        return (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <h4 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Pipeline Data Blocks ({blockTypes.length})</h4>
            <div className="flex flex-wrap gap-1">
              {blockTypes.map((bt) => (
                <span key={bt} className={`text-[8px] px-1.5 py-0.5 rounded border ${
                  verified.includes(bt)
                    ? "border-[var(--color-green)]/30 text-[var(--color-green)] bg-[var(--color-green)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)]"
                }`}>
                  {verified.includes(bt) ? "&#10003; " : ""}{bt.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// Exported utility: evaluate what tier a profile is eligible for based on checklist
export function evaluateReadinessEligibility(profile: Profile, raw: string): {
  maxTier: "raw" | "draft" | "ready" | "verified"
  pct: number
  failingItems: string[]
} {
  const items = profile.type === "politician"
    ? getPoliticianChecklist(profile.chamber)
    : (CHECKLISTS[profile.type] || DEFAULT_CHECKLIST)
  const naItems = profile.checklistNa || []
  const isNa = (id: string) => naItems.some((n: string) => n.startsWith(`${id}:`))

  const failing: string[] = []
  for (const item of items) {
    if (!isNa(item.id) && !item.check(profile, raw)) {
      failing.push(item.label)
    }
  }

  const checked = items.filter((item) => !isNa(item.id) && item.check(profile, raw)).length
  const naCount = items.filter((item) => isNa(item.id)).length
  const total = items.length - naCount
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  // Determine max eligible tier
  let maxTier: "raw" | "draft" | "ready" | "verified" = "raw"
  if (pct === 100) maxTier = "verified"
  else if (pct >= 50) maxTier = "ready"
  else if (pct > 0) maxTier = "draft"

  return { maxTier, pct, failingItems: failing }
}

// Story-specific grading based on URL count
export function evaluateStoryGrading(raw: string): {
  level: "story" | "report" | "investigation"
  tier: "draft" | "ready" | "verified"
  urlCount: number
  tier1Count: number
} {
  const urlMatches = raw.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []
  const urlCount = urlMatches.length
  const tier1Count = (raw.match(/\(Tier 1\)/g) || []).length

  if (urlCount >= 10 && tier1Count >= 3) {
    return { level: "investigation", tier: "verified", urlCount, tier1Count }
  }
  if (urlCount >= 5) {
    return { level: "report", tier: "ready", urlCount, tier1Count }
  }
  return { level: "story", tier: "draft", urlCount, tier1Count }
}
