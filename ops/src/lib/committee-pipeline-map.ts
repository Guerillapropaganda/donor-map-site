/**
 * committee-pipeline-map.ts — Committee → required pipelines mapping (TS mirror)
 *
 * Parallel to scripts/lib/committee-pipeline-map.cjs. KEEP IN SYNC by hand.
 * A lint check in plan Step 4 will enforce the mirror via normalized
 * string comparison.
 *
 * Used by the ops VerificationChecklist component to render committee-
 * relevant regulatory cross-ref checks in A+ Tier A — the same mapping
 * the janitor uses for automated audits.
 */

export interface CommitteePipelineEntry {
  match: RegExp
  require: string[]
  reason: string
}

export const COMMITTEE_PIPELINE_MAP: CommitteePipelineEntry[] = [
  {
    match: /\b(banking|financial services)\b/i,
    require: ["occ", "sec-edgar"],
    reason: "Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC).",
  },
  {
    match: /\bhelp\b|health.+education.+labor|\bagriculture\b/i,
    require: ["fda"],
    reason: "HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food).",
  },
  {
    match: /\bjudiciary\b/i,
    require: ["courtlistener", "doj-press"],
    reason: "Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement.",
  },
  {
    match: /\b(intelligence|foreign relations|foreign affairs)\b/i,
    require: ["fara", "opensanctions"],
    reason: "Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions).",
  },
  {
    match: /\barmed services\b/i,
    require: ["usaspending"],
    reason: "Armed Services oversees defense contracts — must cross-ref USASpending awardees.",
  },
  {
    match: /\bcommerce\b/i,
    require: ["ftc"],
    reason: "Commerce committee oversees FTC jurisdiction (antitrust, consumer protection).",
  },
  {
    match: /\benergy\b/i,
    require: ["federal-register"],
    reason: "Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices.",
  },
  {
    match: /\bways and means\b|\bfinance committee\b/i,
    require: ["usaspending"],
    reason: "Ways and Means / Finance committees touch tax expenditures and federal spending programs.",
  },
  {
    match: /\bappropriations\b/i,
    require: ["usaspending"],
    reason: "Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed.",
  },
  {
    match: /\b(transportation|infrastructure)\b/i,
    require: ["usaspending"],
    reason: "Transportation & Infrastructure oversees DOT contracts.",
  },
]

export function getRequiredPipelinesForCommittees(committees: string | string[] | undefined): string[] {
  if (!committees) return []
  const text = Array.isArray(committees) ? committees.join(" ") : String(committees)
  const out = new Set<string>()
  for (const row of COMMITTEE_PIPELINE_MAP) {
    if (row.match.test(text)) {
      for (const r of row.require) out.add(r)
    }
  }
  return [...out]
}

export function getRequirementReasons(committees: string | string[] | undefined): Array<{ pipelines: string[]; reason: string }> {
  if (!committees) return []
  const text = Array.isArray(committees) ? committees.join(" ") : String(committees)
  const out: Array<{ pipelines: string[]; reason: string }> = []
  for (const row of COMMITTEE_PIPELINE_MAP) {
    if (row.match.test(text)) {
      out.push({ pipelines: row.require, reason: row.reason })
    }
  }
  return out
}
