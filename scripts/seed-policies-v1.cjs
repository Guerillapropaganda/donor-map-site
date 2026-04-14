#!/usr/bin/env node
/**
 * seed-policies-v1.cjs — Phase 2.75 Policy Battles MVP
 *
 * Creates the 5 v1 policy records per ADR-0004:
 *   pol_housing       — Housing affordability / rent control
 *   pol_healthcare    — Universal healthcare / Medicare expansion
 *   pol_aipac_bds     — AIPAC / BDS laws (high-risk editorial)
 *   pol_minimum_wage  — Minimum wage ($15+)
 *   pol_student_debt  — Student debt cancellation
 *
 * Prose is placeholder — the editor (David / Research Claude) writes
 * real plain_english paragraphs in a follow-up session. Fields that
 * need manual curation (polling refs, legislative summaries) are left
 * for the review flow.
 *
 * Usage:
 *   node scripts/seed-policies-v1.cjs             # dry-run
 *   node scripts/seed-policies-v1.cjs --write
 */

const store = require("./lib/policies-store.cjs")

const WRITE = process.argv.includes("--write")

const POLICIES = [
  {
    slug: "housing",
    title: "Housing affordability and rent control",
    category: "housing",
    plain_english:
      "[placeholder — editor writes: what affordable housing / rent control would do in one short paragraph, no spin]",
    legislative_status: "stalled",
    legislative_summary: "",
    opposition_capital_types: ["rentier-capital", "finance-capital"],
    class_analysis_tags: ["tax-avoidance-lobby", "privatization", "anti-trust-defender"],
    high_risk_editorial: false,
    requires_legal_review: false,
    status: "draft",
  },
  {
    slug: "healthcare",
    title: "Universal healthcare / Medicare expansion",
    category: "healthcare",
    plain_english:
      "[placeholder — editor writes: what universal healthcare or Medicare expansion would do, cost/benefit in plain English, no partisan framing]",
    legislative_status: "partial",
    legislative_summary:
      "Medicare drug price negotiation passed in 2022 for 10 of 400+ drugs. Full negotiation still blocked.",
    opposition_capital_types: ["pharma-capital", "finance-capital"],
    class_analysis_tags: ["tax-avoidance-lobby", "anti-trust-defender", "deregulatory"],
    high_risk_editorial: false,
    requires_legal_review: false,
    status: "draft",
  },
  {
    slug: "aipac_bds",
    title: "AIPAC influence on Israel-Palestine policy (BDS laws)",
    category: "foreign_policy",
    plain_english:
      "[placeholder — editor writes with extra care per ADR-0004 editorial firewall: AIPAC is a US-based 501(c)(4) funded by US donors advocating for US foreign policy aligned with Israeli government interests. BDS is protected speech under the First Amendment but is restricted by state-level laws in 30+ states and pending federal legislation. No defamation-prone prose — facts only; class analysis tags carry the opinion weight.]",
    legislative_status: "passed",
    legislative_summary:
      "30+ state anti-BDS laws on the books. Federal anti-BDS provisions in multiple bills. Speech Protection Amendment dead in Senate.",
    opposition_capital_types: ["finance-capital", "tech-monopoly", "rentier-capital"],
    class_analysis_tags: ["imperialist-aligned", "zionist-aligned", "dark-money-networked"],
    high_risk_editorial: true,
    requires_legal_review: true,
    status: "draft",
  },
  {
    slug: "minimum_wage",
    title: "Federal minimum wage increase to $15+",
    category: "economic",
    plain_english:
      "[placeholder — editor writes: what a $15 (or higher) federal minimum would do, current federal minimum ($7.25 since 2009), state-level alternatives]",
    legislative_status: "stalled",
    legislative_summary:
      "Raise the Wage Act (2021, 2023) never reached a floor vote. Parliamentarian ruled minimum wage out of reconciliation in 2021.",
    opposition_capital_types: ["retail-monopoly", "agribusiness-capital", "tech-monopoly"],
    class_analysis_tags: ["union-busting", "anti-trust-defender", "tax-avoidance-lobby"],
    high_risk_editorial: false,
    requires_legal_review: false,
    status: "draft",
  },
  {
    slug: "student_debt",
    title: "Student debt cancellation",
    category: "education",
    plain_english:
      "[placeholder — editor writes: what student debt cancellation would do, scope of outstanding federal student debt ($1.7T+), income distribution of borrowers]",
    legislative_status: "partial",
    legislative_summary:
      "Biden broad cancellation plan struck down by SCOTUS 2023. Narrower SAVE plan partially implemented. PSLF / targeted relief ongoing.",
    opposition_capital_types: ["finance-capital"],
    class_analysis_tags: ["tax-avoidance-lobby", "austerity"],
    high_risk_editorial: false,
    requires_legal_review: false,
    status: "draft",
  },
]

function main() {
  console.log("")
  console.log("═══ seed-policies-v1 ═══")
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  count:   ${POLICIES.length}`)
  console.log("")

  store.loadPolicies()
  const starting = store.countPolicies()

  let seeded = 0
  let skipped = 0

  for (const p of POLICIES) {
    const existing = store.getPolicyBySlug(p.slug)
    if (existing) {
      console.log(`  · ${existing.id} (exists)  ${p.title}`)
      skipped += 1
      continue
    }
    if (WRITE) {
      try {
        const rec = store.addOrFindPolicy(p)
        console.log(`  + ${rec.id}  ${rec.title}`)
        seeded += 1
      } catch (e) {
        console.warn(`  ! ${p.slug}: ${e.message}`)
      }
    } else {
      console.log(`  · DRY  pol_${p.slug.replace(/-/g, "_")}  ${p.title}`)
      seeded += 1
    }
  }

  const ending = store.countPolicies()
  console.log("")
  console.log(`  seeded:  ${seeded}`)
  console.log(`  skipped: ${skipped}`)
  console.log(`  store:   ${starting} → ${ending}  (Δ ${ending - starting})`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
