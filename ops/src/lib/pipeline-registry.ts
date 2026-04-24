/**
 * pipeline-registry.ts — single source of truth for which enrichment
 * pipelines exist and how to describe them to users.
 *
 * Before this file existed (pre-2026-04-24), the /pipelines page had
 * TWO hardcoded lists that disagreed:
 *   - 8 cards on the Pipeline Overview grid (page.tsx)
 *   - 29 entries in PIPELINE_LABELS (pipeline-health/route.ts)
 * Mismatches led to pipelines that were "visible to run" but "invisible
 * to health tracking," and vice versa. P-031 in the 2026-04-24 audit.
 *
 * Every pipeline-aware surface in ops now imports from here.
 *
 * Fields:
 *   id:            stable identifier used in git commit messages
 *                  (`API enrichment: 193 files (gleif:4 ofac-sdn:22 ...)`)
 *                  and in the workflow's `inputs.pipeline` arg.
 *   label:         human-friendly display name
 *   description:   one-line plain-English what-it-does
 *   category:      grouping for the UI
 *   status:        lifecycle state — see below
 *   cadence:       expected run frequency (for freshness calculations)
 *   icon, color:   display metadata
 *
 * Status values:
 *   active      — runs on schedule, producing commits
 *   retired     — intentionally stopped; commits may still appear in
 *                 older git history but no new ones expected
 *   experimental — running but not a primary data source
 *   broken      — supposed to be active but currently failing (e.g.
 *                 LDA domain migration incomplete)
 *
 * Assignment rationale: based on last 30 days of `API Enrichment Bot`
 * commits (git log, 2026-04-24). Pipelines that produced commits
 * recently are `active`; ones that haven't produced commits in months
 * or were explicitly retired per CLAUDE.md Rule 3 are `retired`.
 */

export type PipelineStatus = "active" | "paused" | "retired" | "experimental" | "broken"
//  active      — runs on schedule, producing commits
//  paused      — workflow disabled intentionally; re-enable with `gh workflow enable`
//  retired     — intentionally stopped permanently
//  experimental — running but not a primary data source
//  broken      — supposed to be active but currently failing

// Paused 2026-04-24: David's call to stop the billing bleed. 7 engine
// workflows disabled (API Enrichment + Batch 1–5 + OpenSecrets URL
// Replacement). Kept: RSS Intelligence (scheduled, cheap) +
// Auto-Connection Engine (manual-trigger, no cost). Local CSV bulk
// ingest scripts remain the enrichment path until David re-enables.

export type PipelineCategory =
  | "campaign-finance"
  | "legislative"
  | "regulatory"
  | "corporate"
  | "intelligence"
  | "content"

export interface PipelineEntry {
  id: string
  label: string
  description: string
  category: PipelineCategory
  status: PipelineStatus
  cadence?: string // e.g. "daily", "hourly", "on-demand"
  icon: string
  color: string
  notes?: string
}

export const PIPELINE_REGISTRY: PipelineEntry[] = [
  // ─── Campaign finance ──────────────────────────────────────────────
  {
    id: "fec",
    label: "FEC Campaign Finance",
    description: "Donor → politician contributions from FEC bulk downloads",
    category: "campaign-finance",
    status: "paused",
    cadence: "on-demand",
    icon: "\uD83C\uDFDB",
    color: "#22c55e",
    notes: "Paused 2026-04-24 (Batch 2 workflow disabled). Local CSV bulk ingest via scripts/ingest-fec-bulk.cjs is the current path.",
  },
  {
    id: "fec-summary",
    label: "FEC Candidate Summary",
    description: "Lifetime FEC totals per politician (weball{cycle}.zip)",
    category: "campaign-finance",
    status: "paused",
    cadence: "on-demand",
    icon: "\uD83C\uDFDB",
    color: "#22c55e",
    notes: "Paused 2026-04-24. Current weball24.zip is Aug 2024 snapshot — needs fresh download when re-activating.",
  },
  {
    id: "usaspending",
    label: "USASpending",
    description: "Federal contracts awarded to donors/companies",
    category: "campaign-finance",
    status: "paused",
    cadence: "on-demand",
    icon: "\uD83D\uDCB0",
    color: "#22c55e",
    notes: "Paused 2026-04-24 (Batch 1 workflow disabled). Local via scripts/ingest-usaspending-bulk.cjs.",
  },

  // ─── Legislative ───────────────────────────────────────────────────
  {
    id: "congress",
    label: "Congress.gov",
    description: "Bills sponsored, committees, legislative activity",
    category: "legislative",
    status: "paused",
    cadence: "daily",
    icon: "\uD83D\uDCDC",
    color: "#5b8dce",
    notes: "Paused 2026-04-24 (Batch 3 workflow disabled).",
  },
  {
    id: "govtrack",
    label: "GovTrack",
    description: "Voting records per politician",
    category: "legislative",
    status: "paused",
    cadence: "daily",
    icon: "\uD83D\uDDF3",
    color: "#a855f7",
    notes: "Paused 2026-04-24 (Batch 3 workflow disabled).",
  },
  {
    id: "committee",
    label: "Committee Assignments",
    description: "Politician → committee membership mapping",
    category: "legislative",
    status: "paused",
    cadence: "on-demand",
    icon: "\uD83D\uDC65",
    color: "#ec4899",
    notes: "Paused 2026-04-24 (Batch 3 workflow disabled).",
  },

  // ─── Regulatory ────────────────────────────────────────────────────
  {
    id: "federal-register",
    label: "Federal Register",
    description: "Executive orders + agency rulemaking",
    category: "regulatory",
    status: "paused",
    cadence: "daily",
    icon: "\uD83D\uDCF0",
    color: "#7a7a86",
    notes: "Paused 2026-04-24 (Batch 4 workflow disabled).",
  },
  {
    id: "ofac-sdn",
    label: "OFAC Sanctions",
    description: "Treasury sanctions list — entities barred from US finance",
    category: "regulatory",
    status: "paused",
    cadence: "daily",
    icon: "\u26A0",
    color: "#ef4444",
    notes: "Paused 2026-04-24 (Batch 4 workflow disabled).",
  },
  {
    id: "recall",
    label: "CPSC Recalls",
    description: "Consumer product recalls",
    category: "regulatory",
    status: "paused",
    cadence: "weekly",
    icon: "\uD83D\uDEA8",
    color: "#ef4444",
    notes: "Paused 2026-04-24 (Batch 4 workflow disabled).",
  },
  {
    id: "nhtsa-recalls",
    label: "NHTSA Recalls",
    description: "Vehicle recalls",
    category: "regulatory",
    status: "paused",
    cadence: "weekly",
    icon: "\uD83D\uDE97",
    color: "#ef4444",
    notes: "Paused 2026-04-24 (Batch 4 workflow disabled).",
  },
  {
    id: "sec-edgar",
    label: "SEC Filings",
    description: "Corporate financial filings (10-K, 10-Q, proxy statements)",
    category: "regulatory",
    status: "retired",
    icon: "\uD83D\uDCCA",
    color: "#7a7a86",
    notes: "Retired; replaced by targeted bulk ingest",
  },
  {
    id: "sec-litigation",
    label: "SEC Enforcement",
    description: "SEC enforcement actions",
    category: "regulatory",
    status: "retired",
    icon: "\u2696",
    color: "#7a7a86",
  },
  {
    id: "fda-enforcement",
    label: "FDA Enforcement",
    description: "FDA enforcement actions + warning letters",
    category: "regulatory",
    status: "retired",
    icon: "\uD83D\uDC8A",
    color: "#7a7a86",
  },
  {
    id: "occ-enforcement",
    label: "OCC Enforcement",
    description: "Bank regulator enforcement actions",
    category: "regulatory",
    status: "retired",
    icon: "\uD83C\uDFE6",
    color: "#7a7a86",
  },
  {
    id: "ftc-enforcement",
    label: "FTC Enforcement",
    description: "Consumer protection enforcement",
    category: "regulatory",
    status: "retired",
    icon: "\uD83D\uDEE1",
    color: "#7a7a86",
  },
  {
    id: "fara",
    label: "FARA",
    description: "Foreign Agents Registration Act — lobbying for foreign govts",
    category: "regulatory",
    status: "retired",
    icon: "\uD83C\uDF0D",
    color: "#7a7a86",
  },

  // ─── Corporate ─────────────────────────────────────────────────────
  {
    id: "gleif",
    label: "GLEIF Entities",
    description: "Legal Entity Identifier registry — corporate structure",
    category: "corporate",
    status: "paused",
    cadence: "weekly",
    icon: "\uD83C\uDFE2",
    color: "#5b8dce",
    notes: "Paused 2026-04-24 (Batch 5 workflow disabled).",
  },
  {
    id: "nonprofit-990",
    label: "IRS 990",
    description: "Nonprofit financial disclosures (PF + 990)",
    category: "corporate",
    status: "paused",
    cadence: "on-demand",
    icon: "\uD83D\uDCD1",
    color: "#5b8dce",
    notes: "Paused 2026-04-24. Local via scripts/ingest-irs-990-bulk.cjs (25GB refresh available per Session State handoff).",
  },
  {
    id: "sam",
    label: "SAM.gov",
    description: "Federal contractor registration",
    category: "corporate",
    status: "broken",
    icon: "\uD83D\uDCE6",
    color: "#ef4444",
    notes: "Known bugs in ingest — needs fuzzy-match rewrite",
  },
  {
    id: "stock-watcher",
    label: "Congressional Stock Trades",
    description: "STOCK Act PTR filings (Senate EFDS + House Clerk)",
    category: "corporate",
    status: "active",
    cadence: "daily",
    icon: "\uD83D\uDCC8",
    color: "#a855f7",
    notes: "Runs locally via scripts/financial-disclosures-pipeline.cjs (dispatcher-scheduled, not GitHub Actions). Not affected by 2026-04-24 pause.",
  },

  // ─── Lobbying ──────────────────────────────────────────────────────
  {
    id: "lda",
    label: "Senate Lobbying (LDA)",
    description: "Lobbying disclosures from lda.gov",
    category: "corporate",
    status: "broken",
    icon: "\uD83D\uDD0D",
    color: "#f59e0b",
    notes: "Broken until domain migration lda.senate.gov → lda.gov + auth is completed (~June 2026)",
  },
  {
    id: "lobbyview",
    label: "LobbyView",
    description: "Academic lobbying data aggregator (JWT auth)",
    category: "corporate",
    status: "experimental",
    icon: "\uD83D\uDD0D",
    color: "#f59e0b",
  },
  {
    id: "lobbying-contrib",
    label: "Lobbying Cross-Ref",
    description: "Cross-reference lobbying firm ↔ politician contributions",
    category: "corporate",
    status: "retired",
    icon: "\uD83D\uDD17",
    color: "#7a7a86",
  },

  // ─── Intelligence / third-party ────────────────────────────────────
  {
    id: "courtlistener",
    label: "Court Cases",
    description: "Federal court filings + litigation history",
    category: "intelligence",
    status: "retired",
    icon: "\u2696",
    color: "#7a7a86",
  },
  {
    id: "doj-press",
    label: "DOJ Press",
    description: "DOJ press releases — prosecutions + settlements",
    category: "intelligence",
    status: "retired",
    icon: "\uD83D\uDDDE",
    color: "#7a7a86",
  },
  {
    id: "propublica",
    label: "ProPublica",
    description: "ProPublica Nonprofit Explorer + investigations",
    category: "intelligence",
    status: "retired",
    icon: "\uD83D\uDCF0",
    color: "#7a7a86",
  },
  {
    id: "opensanctions",
    label: "OpenSanctions",
    description: "Global PEP + sanctions screening",
    category: "intelligence",
    status: "retired",
    icon: "\uD83D\uDEAB",
    color: "#7a7a86",
  },
  {
    id: "fcc",
    label: "FCC Broadcasting",
    description: "Broadcast license ownership",
    category: "intelligence",
    status: "retired",
    icon: "\uD83D\uDCE1",
    color: "#7a7a86",
  },

  // ─── Content ───────────────────────────────────────────────────────
  {
    id: "wikipedia",
    label: "Wikipedia",
    description: "Biographical extracts for politicians",
    category: "content",
    status: "retired",
    icon: "\uD83D\uDCDA",
    color: "#7a7a86",
    notes: "Retired after 2026-04-11 updateFrontmatter quote-escape incident",
  },
  {
    id: "auto-connect",
    label: "Auto-Connect",
    description: "Relationship discovery — maps new edges automatically",
    category: "intelligence",
    status: "active",
    cadence: "on-demand",
    icon: "\uD83D\uDD17",
    color: "#ef4444",
    notes: "Workflow kept active 2026-04-24 — manual-trigger only (workflow_dispatch), no scheduled cost. Trigger via GitHub Actions UI when relationship discovery needed.",
  },
]

// ─── Convenience selectors ───────────────────────────────────────────

export function getActivePipelines(): PipelineEntry[] {
  return PIPELINE_REGISTRY.filter((p) => p.status === "active")
}

export function getPipelineById(id: string): PipelineEntry | undefined {
  return PIPELINE_REGISTRY.find((p) => p.id === id)
}

export function getPipelineLabel(id: string): string {
  return getPipelineById(id)?.label || id
}

// Legacy PIPELINE_LABELS export for backwards-compat with old consumers.
// New code should import PIPELINE_REGISTRY directly.
export const PIPELINE_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_REGISTRY.map((p) => [p.id, p.label])
)
