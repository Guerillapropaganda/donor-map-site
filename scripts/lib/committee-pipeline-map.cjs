/**
 * committee-pipeline-map.cjs — Committee → required pipelines mapping
 *
 * Single source of truth for "which regulatory pipelines must fire on
 * a politician based on their committee assignments." Used by the
 * pipeline-janitor.cjs A+ audit (plan Step 3) and mirrored by the
 * TypeScript version at `ops/src/lib/committee-pipeline-map.ts` for
 * the VerificationChecklist component.
 *
 * Rationale: a Banking Committee senator who has FEC + Congress data
 * but no OCC enforcement data is missing the most obvious story angle.
 * The janitor should flag this; the checklist should render it as a
 * red X on the politician's A+ checklist. Both surfaces need the same
 * mapping.
 *
 * Rule: committees are matched case-insensitively against the
 * `committees:` frontmatter field (which is a free-form string
 * concatenation in most profiles). Each entry is:
 *   { match: RegExp, require: ["auto:occ", "auto:sec-edgar"] }
 *
 * Matching is OR — a politician on multiple committees picks up ALL
 * the required pipelines from ALL matching entries. Missing any of
 * them is a failure.
 *
 * Adding a new committee: copy one of the existing entries, write
 * the regex to match the committee name loosely (handle plural/
 * abbreviation variations), list the required auto-block prefixes.
 * Then update ops/src/lib/committee-pipeline-map.ts to match.
 */

const COMMITTEE_PIPELINE_MAP = [
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

/**
 * Given a committees frontmatter field (free-form string), return the
 * deduplicated list of required auto-block prefixes.
 *
 * Example:
 *   getRequiredPipelinesForCommittees("Senate Banking Committee; HELP")
 *   → ["occ", "sec-edgar", "fda"]
 */
function getRequiredPipelinesForCommittees(committees) {
  if (!committees) return []
  const text = Array.isArray(committees) ? committees.join(" ") : String(committees)
  const out = new Set()
  for (const row of COMMITTEE_PIPELINE_MAP) {
    if (row.match.test(text)) {
      for (const r of row.require) out.add(r)
    }
  }
  return [...out]
}

/**
 * Given a committees field, return the reasons the pipelines are required.
 * Used for building human-readable failure messages in the janitor report.
 */
function getRequirementReasons(committees) {
  if (!committees) return []
  const text = Array.isArray(committees) ? committees.join(" ") : String(committees)
  const out = []
  for (const row of COMMITTEE_PIPELINE_MAP) {
    if (row.match.test(text)) {
      out.push({ pipelines: row.require, reason: row.reason })
    }
  }
  return out
}

module.exports = {
  COMMITTEE_PIPELINE_MAP,
  getRequiredPipelinesForCommittees,
  getRequirementReasons,
}
