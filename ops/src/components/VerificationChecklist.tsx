"use client"

import { useState } from "react"
import type { Profile } from "@/lib/vault"
import { readinessColor } from "@/lib/vault"
import {
  hasAutoBlock,
  countTier1InBody,
  isEnrichedWithin,
  countMarkdownUrls,
  countWikilinks,
  hasDonationPolicyTimeline,
  hasDarkMoneyTrace,
  hasRevolvingDoor,
  hasCallout,
  hasHeading,
  runLegalReviewCheck,
  detectBothSidesEntities,
} from "@/lib/checklist-helpers"
import { getRequiredPipelinesForCommittees } from "@/lib/committee-pipeline-map"

/**
 * Checklist tier groups (plan Step 4). See content/Vault Rules.md § 2a.
 *
 * - "tier-a" — Data Breadth. 3+ Tier 1 sources, committee-relevant cross-ref,
 *              financial disclosure, nonprofit ties, foreign/legal angle.
 * - "tier-b" — Investigation Depth. Donation-to-Policy Timeline, contradictions
 *              with numbers, 4-hop chain, revolving door, dark money traced.
 * - "tier-c" — Narrative Quality. central-thesis, core contradiction, class
 *              analysis, sub-notes, story-grade, legal-review, lawyer-dispute.
 * - "tier-d" — Uniqueness (automated). Cross-vault triangulation, anomaly flags.
 * - "s-tier" — Original findings. angle, exclusive-connections, original-finding.
 * - "core"   — Pre-tier legacy items (enriched-90d, connections, sign-off).
 *              These still render but aren't grouped under any Tier.
 */
export type ChecklistGroup = "core" | "tier-a" | "tier-b" | "tier-c" | "tier-d" | "s-tier"

/** Which tier this item blocks promotion to. "ready" = blocks B→A+. */
export type ChecklistBlockingFor = "ready" | "verified" | "s-tier"

interface ChecklistItem {
  id: string
  label: string
  check: (profile: Profile, raw: string) => boolean
  naAllowed?: boolean  // Can be marked N/A
  pipeline?: string    // Pipeline script name (e.g., "fec", "congress", "govtrack")
  group?: ChecklistGroup        // NEW (plan Step 4) — defaults to "core" if unset
  blockingFor?: ChecklistBlockingFor  // NEW — defaults to "verified" for unset core items
}

// Role-specific politician checklists
function getPoliticianChecklist(chamber?: string): ChecklistItem[] {
  const common: ChecklistItem[] = [
    { id: "fec-data", label: "FEC fundraising data", pipeline: "fec", check: (p, raw) => !!p.totalRaised || raw.includes("<!-- auto:fec-fundraising") || raw.includes("<!-- auto:fec-politician") },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p, raw) => (p.sourceTypes || []).length >= 2 || countTier1InBody(raw) >= 2 },
    { id: "connections", label: "Connections mapped (donors + related)", check: (p) => !!(p.related || p.donors) },
    { id: "enriched", label: "Enriched within 90 days", pipeline: "all", check: (p) => isEnrichedWithin(p, 90) },
    { id: "contradiction-review", label: "Contradiction investigation complete (Research Claude)", check: (_, raw) => raw.includes("[!contradiction-cleared]") || !raw.includes("[!contradiction]") },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ]

  const ch = (chamber || "").toLowerCase()

  if (ch === "presidential" || ch === "president") {
    return [
      { id: "executive-orders", label: "Executive orders documented", pipeline: "executive-orders", check: (_, raw) => raw.includes("<!-- auto:executive-orders") || raw.includes("<!-- auto:federal-register") },
      { id: "cabinet-appointments", label: "Cabinet appointments documented", check: (_, raw) => raw.toLowerCase().includes("cabinet") || raw.toLowerCase().includes("appointed") },
      { id: "voting-records", label: "Prior voting record (if applicable)", pipeline: "govtrack", check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record"), naAllowed: true },
      { id: "fec-data", label: "FEC fundraising data", pipeline: "fec", check: (p, raw) => !!p.totalRaised || raw.includes("<!-- auto:fec") },
      ...common,
    ]
  }

  if (ch === "governor" || ch === "governors") {
    return [
      { id: "executive-actions", label: "Executive actions / state orders documented", check: (_, raw) => raw.toLowerCase().includes("executive order") || raw.toLowerCase().includes("signed into law") },
      { id: "state-legislation", label: "Key state legislation", check: (_, raw) => raw.toLowerCase().includes("signed") || raw.toLowerCase().includes("vetoed"), naAllowed: true },
      { id: "voting-records", label: "Prior voting record (if applicable)", pipeline: "govtrack", check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record"), naAllowed: true },
      ...common,
    ]
  }

  if (ch === "cabinet") {
    return [
      { id: "appointment", label: "Appointment & confirmation documented", check: (_, raw) => raw.toLowerCase().includes("confirmed") || raw.toLowerCase().includes("appointed") || raw.toLowerCase().includes("nominated") },
      { id: "prior-role", label: "Prior role / revolving door documented", check: (_, raw) => raw.toLowerCase().includes("previously") || raw.toLowerCase().includes("former") },
      { id: "voting-records", label: "Prior voting record (if applicable)", pipeline: "govtrack", check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record"), naAllowed: true },
      ...common,
    ]
  }

  // Default: Congress (Senate/House) — grouped by A+ tier (plan Step 4)
  return [
    // ─── Tier A: Data Breadth ────────────────────────────────────────
    { id: "voting-records", label: "Voting records exist", pipeline: "govtrack", group: "tier-a", blockingFor: "verified",
      check: (_, raw) => raw.includes("<!-- auto:govtrack") || raw.includes("<!-- auto:voting-record") },
    { id: "committee-assignments", label: "Committee assignments", pipeline: "committee", group: "tier-a", blockingFor: "verified",
      check: (p, raw) => !!p.committees || raw.includes("<!-- auto:committee-assignments") || raw.includes("<!-- auto:committee start") || raw.includes("<!-- auto:committee-") },
    { id: "bills", label: "Bills sponsored/cosponsored", pipeline: "congress", group: "tier-a", blockingFor: "verified", naAllowed: true,
      check: (p, raw) => (p.billsSponsored || 0) > 0 || (p.billsCosponsored || 0) > 0 || raw.includes("<!-- auto:congress") },
    { id: "fec-data", label: "FEC fundraising data", pipeline: "fec", group: "tier-a", blockingFor: "verified",
      check: (p, raw) => !!p.totalRaised || raw.includes("<!-- auto:fec-fundraising") || raw.includes("<!-- auto:fec-politician") },
    { id: "source-diversity-3", label: "3+ Tier 1 source types (A+ floor)", group: "tier-a", blockingFor: "verified",
      check: (p) => (p.sourceTypes || []).length >= 3 },
    { id: "committee-cross-ref", label: "Committee-relevant regulatory cross-ref",  group: "tier-a", blockingFor: "verified", naAllowed: true,
      check: (p, raw) => {
        const required = getRequiredPipelinesForCommittees(p.committees)
        if (required.length === 0) return true  // no requirement = pass
        return required.every(r => hasAutoBlock(raw, r))
      }
    },
    { id: "financial-disclosure", label: "Financial disclosure (stock trades / board seats)", group: "tier-a", blockingFor: "verified", naAllowed: true,
      check: (p, raw) => !!p.stockTrades || (p.boardSeats || []).length > 0 || raw.toLowerCase().includes("stock trade") },

    // ─── Tier B: Investigation Depth ─────────────────────────────────
    { id: "donation-policy-timeline", label: "Donation-to-Policy Timeline present", group: "tier-b", blockingFor: "verified",
      check: (_, raw) => hasDonationPolicyTimeline(raw) },
    { id: "contradiction-with-numbers", label: "1+ contradiction callout with dollar figures", group: "tier-b", blockingFor: "verified",
      check: (_, raw) => (hasCallout(raw, "contradiction") || hasCallout(raw, "money")) && /\$[\d,.]+[KMBkmb]?/.test(raw) },
    { id: "revolving-door", label: "Revolving door / family network documented", group: "tier-b", blockingFor: "verified", naAllowed: true,
      check: (_, raw) => hasRevolvingDoor(raw) },
    { id: "dark-money-trace", label: "Dark money chain traced", group: "tier-b", blockingFor: "verified", naAllowed: true,
      check: (_, raw) => hasDarkMoneyTrace(raw) },

    // ─── Tier C: Narrative Quality ───────────────────────────────────
    { id: "central-thesis", label: "central-thesis field populated", group: "tier-c", blockingFor: "verified",
      check: (p) => !!p.centralThesis },
    { id: "class-analysis", label: "## Class Analysis section present", group: "tier-c", blockingFor: "verified",
      check: (_, raw) => hasHeading(raw, "Class Analysis") },
    { id: "story-grade", label: "story-grade field assigned", group: "tier-c", blockingFor: "verified",
      check: (p) => !!p.storyGrade },
    { id: "legal-review", label: "Legal-review pass (no defamation-prone words outside quotes)", group: "tier-c", blockingFor: "verified",
      check: (p, raw) => runLegalReviewCheck(p, raw).passed },
    { id: "lawyer-dispute", label: "Lawyer-dispute paragraph present", group: "tier-c", blockingFor: "verified", naAllowed: true,
      check: (p, raw) => !!p.lawyerDispute || hasHeading(raw, "Legal Exposure") || hasHeading(raw, "What Their Lawyer") },

    // ─── Tier D: Uniqueness (automated) ──────────────────────────────
    { id: "both-sides-clean", label: "No both-sides conflict (donors ∩ opposes = ∅)", group: "tier-d", blockingFor: "verified", naAllowed: true,
      check: (p) => detectBothSidesEntities(p).length === 0 },

    // ─── S-tier (gated above A+) ─────────────────────────────────────
    { id: "angle", label: "angle: field populated (what OpenSecrets does NOT show)", group: "s-tier", blockingFor: "s-tier",
      check: (p) => !!p.angle && p.angle.trim().length > 10 },
    { id: "exclusive-connections", label: "3+ damning exclusive-connections", group: "s-tier", blockingFor: "s-tier",
      check: (p) => (p.exclusiveConnections || []).length >= 3 },
    { id: "original-finding", label: "original-finding field populated", group: "s-tier", blockingFor: "s-tier",
      check: (p) => !!p.originalFinding && p.originalFinding.trim().length > 10 },
    { id: "audit-s-tier-passed", label: "Janitor S-tier audit passed", group: "s-tier", blockingFor: "s-tier",
      check: (p) => !!p.auditSTierPassed },
    { id: "editorial-signoff-narrative", label: "David's narrative sign-off", group: "s-tier", blockingFor: "s-tier",
      check: (p) => !!p.editorialSignoffNarrative },

    // ─── Core tail (legacy items that don't fit a specific tier) ─────
    { id: "source-diversity", label: "2+ Tier 1 source types (ready floor)", group: "core", blockingFor: "ready",
      check: (p, raw) => (p.sourceTypes || []).length >= 2 || countTier1InBody(raw) >= 2 },
    { id: "connections", label: "Connections mapped (donors + related)", group: "core", blockingFor: "ready",
      check: (p) => !!(p.related || p.donors) },
    { id: "enriched", label: "Enriched within 90 days", pipeline: "all", group: "core", blockingFor: "verified",
      check: (p) => isEnrichedWithin(p, 90) },
    { id: "contradiction-review", label: "Contradiction investigation complete (Research Claude)", group: "core", blockingFor: "verified", naAllowed: true,
      check: (_, raw) => {
        const hasContradiction = raw.includes("[!contradiction]")
        const hasCleared = raw.includes("[!contradiction-cleared]")
        if (!hasContradiction) return true  // no contradiction callout = N/A (passes)
        return hasCleared  // has contradiction = needs cleared marker
      }
    },
    { id: "sign-off", label: "Editorial sign-off", group: "core", blockingFor: "verified",
      check: (p) => p.lastVerifiedBy === "editorial" },
  ]
}

const CHECKLISTS: Record<string, ChecklistItem[]> = {
  // politician is handled by getPoliticianChecklist() — see getChecklist() below
  donor: [
    { id: "politicians-funded", label: "Politicians funded documented", pipeline: "fec", check: (p) => !!p.politiciansFunded },
    { id: "contribution-amounts", label: "Total contribution amounts", pipeline: "fec", check: (p) => !!p.totalPoliticalSpend || !!p.totalRaised },
    { id: "lobbying", label: "Lobbying spend", pipeline: "lda", check: (p) => !!p.lobbyingSpend, naAllowed: true },
    { id: "sector", label: "Sector classified", check: (p) => !!p.sector },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p, raw) => (p.sourceTypes || []).length >= 2 || countTier1InBody(raw) >= 2 },
    { id: "connections", label: "Connections mapped", check: (p) => !!(p.related || p.donors) },
    { id: "enriched", label: "Enriched within 90 days", pipeline: "all", check: (p) => isEnrichedWithin(p, 90) },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  corporation: [
    { id: "pac-contributions", label: "PAC contributions / politicians funded", pipeline: "fec", check: (p, raw) => !!p.politiciansFunded || raw.includes("<!-- auto:fec-donor") },
    { id: "lobbying", label: "Lobbying filings", pipeline: "lda", check: (p, raw) => !!p.lobbyingSpend || raw.includes("<!-- auto:lda-lobbying") },
    { id: "contracts", label: "Federal contracts", pipeline: "usaspending", check: (_, raw) => raw.includes("<!-- auto:usaspending") || raw.includes("<!-- auto:sam-contracts") },
    { id: "sec-filings", label: "SEC filings", pipeline: "sec-edgar", check: (_, raw) => raw.includes("<!-- auto:sec-edgar"), naAllowed: true },
    { id: "regulatory", label: "Regulatory record (EPA/OSHA)", pipeline: "epa-echo", check: (_, raw) => raw.includes("<!-- auto:epa-echo") || raw.includes("<!-- auto:osha"), naAllowed: true },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p, raw) => (p.sourceTypes || []).length >= 2 || countTier1InBody(raw) >= 2 },
    { id: "connections", label: "Connections mapped", check: (p) => !!(p.related || p.donors) },
    { id: "enriched", label: "Enriched within 90 days", pipeline: "all", check: (p) => isEnrichedWithin(p, 90) },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  "media-profile": [
    { id: "ownership", label: "Ownership/funding documented", check: (p) => !!(p.related || p.donors) },
    { id: "political-lean", label: "Political lean sourced", check: (p) => !!p.category },
    { id: "connected", label: "Connected donors/politicians", check: (p) => !!p.related },
    { id: "platform", label: "Platform documented", check: (p) => !!p.platform },
    { id: "source-type", label: "1+ Tier 1 source type", pipeline: "fec", check: (p, raw) => (p.sourceTypes || []).length >= 1 || countTier1InBody(raw) >= 1, naAllowed: true },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  "think-tank": [
    { id: "funders", label: "Top funders documented", check: (p) => !!(p.donors || p.related) },
    { id: "990-data", label: "990 data (revenue, tax status)", pipeline: "nonprofit-990", check: (p, raw) => !!(p.ein || p.totalRevenue) || raw.includes("<!-- auto:nonprofit-990") },
    { id: "policy-mapped", label: "Policy positions mapped", check: (p) => !!p.related },
    { id: "tax-status", label: "Tax status documented", check: (p) => !!(p.taxStatus || p.nonprofitStatus) },
    { id: "source-type", label: "1+ Tier 1 source type", check: (p, raw) => (p.sourceTypes || []).length >= 1 || countTier1InBody(raw) >= 1 },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  "lobbying-firm": [
    { id: "client-list", label: "Client list documented", pipeline: "lda", check: (_, raw) => raw.includes("<!-- auto:lda-lobbying") || raw.includes("client") },
    { id: "lobbying-spend", label: "Lobbying spend totals", pipeline: "lda", check: (p) => !!p.lobbyingSpend },
    { id: "fara", label: "FARA registrations", pipeline: "fara", check: (p, raw) => !!p.faraClients || raw.includes("<!-- auto:fara"), naAllowed: true },
    { id: "revolving-door", label: "Revolving door documented", check: (p) => !!p.revolvingDoorPct, naAllowed: true },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p, raw) => (p.sourceTypes || []).length >= 2 || countTier1InBody(raw) >= 2 },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  pac: [
    { id: "fec-data", label: "FEC fundraising data", pipeline: "fec", check: (_, raw) => raw.includes("<!-- auto:fec") },
    { id: "donors-mapped", label: "Donors mapped", check: (p) => !!p.donors },
    { id: "politicians-funded", label: "Politicians funded", pipeline: "fec", check: (p) => !!p.politiciansFunded || !!p.related },
    { id: "source-diversity", label: "2+ Tier 1 source types", check: (p, raw) => (p.sourceTypes || []).length >= 2 || countTier1InBody(raw) >= 2 },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  // Editorial content types — no pipeline enrichment required
  story: [
    { id: "sourced-urls", label: "Sources cited with URLs", check: (_, raw) => countMarkdownUrls(raw) >= 1 },
    { id: "url-threshold", label: "5+ sourced URLs (Report level)", check: (_, raw) => countMarkdownUrls(raw) >= 5 },
    { id: "profiles-linked", label: "Profiles linked via wikilinks", check: (_, raw) => countWikilinks(raw) >= 1 },
    { id: "investigation-level", label: "10+ URLs + 3 Tier 1 (Investigation)", check: (_, raw) => countMarkdownUrls(raw) >= 10 && countTier1InBody(raw) >= 3, naAllowed: true },
    { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
  ],
  event: [
    { id: "source-url", label: "Source URL provided", check: (_, raw) => countMarkdownUrls(raw) >= 1 },
    { id: "profiles-linked", label: "Profiles linked", check: (_, raw) => countWikilinks(raw) >= 1 },
    { id: "date-accurate", label: "Date documented", check: (p) => !!p.lastUpdated },
  ],
  "sub-note": [
    { id: "sourced", label: "Has sources", check: (_, raw) => countMarkdownUrls(raw) >= 1 },
    { id: "profiles-linked", label: "Profiles linked", check: (_, raw) => countWikilinks(raw) >= 1 },
  ],
  "daily-update": [
    { id: "sourced", label: "Has sources", check: (_, raw) => countMarkdownUrls(raw) >= 1 },
    { id: "date", label: "Date documented", check: (p) => !!p.lastUpdated },
  ],
}

// Fallback for types not in the map
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "source-type", label: "1+ Tier 1 source type", check: (p) => (p.sourceTypes || []).length >= 1 },
  { id: "connections", label: "Connections mapped", check: (p) => !!(p.related || p.donors) },
  { id: "enriched", label: "Enriched within 90 days", check: (p) => isEnrichedWithin(p, 90) },
  { id: "sign-off", label: "Editorial sign-off", check: (p) => p.lastVerifiedBy === "editorial" },
]

interface Props {
  profile: Profile
  raw: string
  onSaveNa: (naItems: string[]) => void
  onRunPipeline?: (pipeline: string, profileTitle: string) => void
}

export function VerificationChecklist({ profile, raw, onSaveNa, onRunPipeline }: Props) {
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

  // Group items by tier for the new grouped rendering (plan Step 4).
  // Items without a group default to "core" (legacy flat items).
  const groupOrder: ChecklistGroup[] = ["core", "tier-a", "tier-b", "tier-c", "tier-d", "s-tier"]
  const groupLabels: Record<ChecklistGroup, string> = {
    "core": "CORE",
    "tier-a": "TIER A — Data Breadth",
    "tier-b": "TIER B — Investigation Depth",
    "tier-c": "TIER C — Narrative Quality",
    "tier-d": "TIER D — Uniqueness (automated)",
    "s-tier": "S-TIER (above A+ — original findings)",
  }
  const itemsByGroup: Record<ChecklistGroup, ChecklistItem[]> = {
    "core": [], "tier-a": [], "tier-b": [], "tier-c": [], "tier-d": [], "s-tier": [],
  }
  for (const item of items) {
    itemsByGroup[item.group || "core"].push(item)
  }
  // Only show groups that have items (non-Congress chambers won't have tier-a/b/c/d yet)
  const visibleGroups = groupOrder.filter(g => itemsByGroup[g].length > 0)

  // Is the profile eligible for S-tier yet? (all non-s-tier groups fully passed)
  const aPlusPassed = visibleGroups
    .filter(g => g !== "s-tier")
    .every(g => itemsByGroup[g].every(item => isNa(item.id) || item.check(profile, raw)))

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
          A+ / S-Tier Verification Checklist
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

      {/* ─── ANGLE BANNER — the forcing function for S-tier ─── */}
      {/* Plan step: "move angle: to the top as a leading prompt, not a trailing gate" */}
      {profile.angle && profile.angle.trim().length > 10 ? (
        <div className="mb-3 p-3 rounded border" style={{ borderColor: "var(--color-purple)", backgroundColor: "rgba(168, 85, 247, 0.08)" }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--color-purple)" }}>
            ★ The Angle
          </div>
          <div className="text-[11px] italic text-[var(--color-text)] leading-snug">
            "{profile.angle}"
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 rounded border border-dashed" style={{ borderColor: "var(--color-amber)", backgroundColor: "rgba(245, 158, 11, 0.08)" }}>
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--color-amber)" }}>
            ★ The Angle — NOT SET
          </div>
          <div className="text-[10px] text-[var(--color-text-dim)] leading-snug">
            What does this profile show that OpenSecrets / Ballotpedia / GovTrack does NOT?
            One sentence. This is the forcing function for S-tier. If you can&apos;t write it, the profile is A+ at best.
            Add <code className="text-[var(--color-steel)]">angle:</code> to frontmatter.
          </div>
        </div>
      )}

      {/* Grouped checklist: renders core + tier-a + tier-b + tier-c + tier-d + s-tier */}
      {visibleGroups.map((group) => {
        const groupItems = itemsByGroup[group]
        const groupPassed = groupItems.filter(item => !isNa(item.id) && item.check(profile, raw)).length
        const groupTotal = groupItems.filter(item => !isNa(item.id)).length
        const groupPct = groupTotal > 0 ? Math.round((groupPassed / groupTotal) * 100) : 0
        const groupColor = groupPct === 100 ? "#10b981" : groupPct >= 50 ? "#f59e0b" : "#ef4444"
        const isSTier = group === "s-tier"
        const locked = isSTier && !aPlusPassed
        return (
          <details key={group} open={!locked} className="mb-2">
            <summary className={`text-[9px] uppercase tracking-wider mb-1 cursor-pointer flex items-center justify-between ${locked ? "opacity-40" : ""}`}>
              <span className="text-[var(--color-text-dim)]">
                {groupLabels[group]} {locked && "🔒"}
              </span>
              <span className="text-[9px] font-bold" style={{ color: groupColor }}>
                {groupPassed}/{groupTotal} ({groupPct}%)
              </span>
            </summary>
            {!locked && (
              <div className="space-y-1 pl-2 mt-1">
                {groupItems.map((item) => {
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

              {/* Label + pipeline button inline */}
              <span className={`text-[10px] ${na ? "line-through text-[var(--color-text-dim)]" : passed ? "text-[var(--color-text)]" : "text-[var(--color-red)]"}`}>
                {item.label}
              </span>
              {item.pipeline && !na && onRunPipeline && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRunPipeline(item.pipeline!, profile.title) }}
                  className={`text-[8px] px-1 py-0.5 rounded border transition-colors ml-1 ${
                    passed
                      ? "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-steel)] hover:border-[var(--color-steel)]/30"
                      : "border-[var(--color-steel)]/30 text-[var(--color-steel)] hover:bg-[var(--color-steel)]/10"
                  }`}
                  title={`Run ${item.pipeline} pipeline on ${profile.title}`}
                >
                  ▶ {item.pipeline}
                </button>
              )}
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
            )}
            {locked && (
              <div className="text-[9px] text-[var(--color-text-dim)] italic pl-2 mt-1">
                S-tier checks are locked until all A+ tiers pass.
              </div>
            )}
          </details>
        )
      })}

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

// Exported utility: evaluate what tier a profile is eligible for based on checklist.
// Returns the max auto-eligible tier (promotion still gated by manual sign-off for
// verified/s-tier) plus a per-group breakdown used by the grouped UI in Step 4+.
export function evaluateReadinessEligibility(profile: Profile, raw: string): {
  maxTier: "raw" | "draft" | "ready" | "verified" | "s-tier"
  pct: number
  failingItems: string[]
  tierBreakdown: Record<ChecklistGroup, { passed: number; total: number; pct: number }>
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

  // Per-group breakdown (plan Step 4)
  const groupKeys: ChecklistGroup[] = ["core", "tier-a", "tier-b", "tier-c", "tier-d", "s-tier"]
  const tierBreakdown: Record<ChecklistGroup, { passed: number; total: number; pct: number }> = {
    "core":   { passed: 0, total: 0, pct: 0 },
    "tier-a": { passed: 0, total: 0, pct: 0 },
    "tier-b": { passed: 0, total: 0, pct: 0 },
    "tier-c": { passed: 0, total: 0, pct: 0 },
    "tier-d": { passed: 0, total: 0, pct: 0 },
    "s-tier": { passed: 0, total: 0, pct: 0 },
  }
  for (const item of items) {
    if (isNa(item.id)) continue
    const g = item.group || "core"
    tierBreakdown[g].total++
    if (item.check(profile, raw)) tierBreakdown[g].passed++
  }
  for (const g of groupKeys) {
    const t = tierBreakdown[g]
    t.pct = t.total > 0 ? Math.round((t.passed / t.total) * 100) : 0
  }

  // Determine max eligible tier.
  // - verified (A+) requires all non-s-tier groups at 100%
  // - s-tier requires ALL groups including s-tier at 100%
  // - ready at ≥50% overall pct (legacy behavior)
  // - draft at >0% overall pct
  const aPlusPassed = groupKeys
    .filter(g => g !== "s-tier")
    .every(g => tierBreakdown[g].total === 0 || tierBreakdown[g].pct === 100)
  const sTierPassed = aPlusPassed && (tierBreakdown["s-tier"].total === 0 || tierBreakdown["s-tier"].pct === 100)

  let maxTier: "raw" | "draft" | "ready" | "verified" | "s-tier" = "raw"
  if (sTierPassed && tierBreakdown["s-tier"].total > 0) maxTier = "s-tier"
  else if (aPlusPassed) maxTier = "verified"
  else if (pct >= 50) maxTier = "ready"
  else if (pct > 0) maxTier = "draft"

  return { maxTier, pct, failingItems: failing, tierBreakdown }
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
