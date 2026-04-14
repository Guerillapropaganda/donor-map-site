#!/usr/bin/env node
/**
 * seed-hot-issues-v1.cjs — Phase 5 Story Score
 *
 * Seeds data/hot-issues.jsonl with 10 current-news-cycle topics that
 * feed the story scorer's news_cycle_relevance multiplier. Topics are
 * drawn from the 5 Phase 2.75 policies plus current high-visibility
 * issues that intersect with the donor map's coverage.
 *
 * David reviews and edits weekly per phase-2/decisions.md.
 *
 * Usage:
 *   node scripts/seed-hot-issues-v1.cjs            # dry-run
 *   node scripts/seed-hot-issues-v1.cjs --write
 */

const store = require("./lib/hot-issues-store.cjs")
const WRITE = process.argv.includes("--write")

const SEEDS = [
  {
    topic: "Housing affordability crisis",
    description:
      "Rent burden at historic highs; federal rent stabilization legislation stalled; state preemption fights in TX/FL/KY/ID/MO.",
    policy_stakes: ["rent-stabilization", "housing-trust-fund", "lihtc"],
    capital_types: ["rentier-capital", "finance-capital"],
    weight: 1.8,
  },
  {
    topic: "Medicare drug price negotiation",
    description:
      "Phase 1 of IRA drug negotiation covers 10 drugs; pharma lobbying intensifying against expansion to more drugs.",
    policy_stakes: ["drug-price-negotiation", "medicare-expansion"],
    capital_types: ["pharma-capital", "finance-capital"],
    weight: 1.7,
  },
  {
    topic: "AIPAC primary spending",
    description:
      "United Democracy Project spent $100M in 2024 cycle targeting progressive primary challengers, largest outside-group spender.",
    policy_stakes: ["military-aid-israel", "anti-bds-laws"],
    capital_types: ["finance-capital", "dark-money-vehicle"],
    weight: 2.0,
  },
  {
    topic: "Minimum wage state-by-state",
    description:
      "Federal stuck at $7.25 since 2009; 30 states + DC above federal; state-level fights driving ballot initiatives.",
    policy_stakes: ["minimum-wage-increase", "right-to-work-laws"],
    capital_types: ["retail-monopoly", "agribusiness-capital"],
    weight: 1.6,
  },
  {
    topic: "Student debt cancellation rollback",
    description:
      "Biden v. Nebraska (2023) killed broad cancellation; SAVE plan implementation ongoing; new legal challenges filed.",
    policy_stakes: ["student-debt-cancellation", "income-driven-repayment"],
    capital_types: ["finance-capital"],
    weight: 1.6,
  },
  {
    topic: "Big Tech antitrust enforcement",
    description:
      "DOJ/FTC cases against Google, Meta, Apple, Amazon active; platform lobbying spend at record levels.",
    policy_stakes: ["antitrust-enforcement-limits", "section-230-preservation"],
    capital_types: ["tech-monopoly"],
    weight: 1.8,
  },
  {
    topic: "Climate legislation after IRA",
    description:
      "Inflation Reduction Act (2022) climate provisions under implementation; rollback efforts in new Congress; methane fee extension contested.",
    policy_stakes: ["epa-rollback", "carbon-accounting-loopholes", "offshore-drilling-leases"],
    capital_types: ["fossil-capital", "extractive-capital"],
    weight: 1.7,
  },
  {
    topic: "Crypto industry political spending",
    description:
      "Crypto super PACs (Fairshake etc) among top 2024 cycle spenders targeting pro-regulation Democrats; FIT21 + GENIUS Act lobbying fight.",
    policy_stakes: ["crypto-regulation", "stablecoin-rules"],
    capital_types: ["tech-monopoly", "finance-capital"],
    weight: 1.9,
  },
  {
    topic: "Private prison / immigration detention",
    description:
      "CoreCivic / GEO Group contracts expanding under new administration; state-level detention bed mandates.",
    policy_stakes: ["ice-detention-contracts", "immigration-enforcement-budget"],
    capital_types: ["carceral-capital"],
    weight: 1.7,
  },
  {
    topic: "Dark money judicial capture",
    description:
      "Leonard Leo network and Judicial Crisis Network funding judicial confirmations + state Supreme Court races; 2022 Forcht $1.6B gift disclosure.",
    policy_stakes: ["citizens-united-defense", "judicial-confirmations"],
    capital_types: ["dark-money-vehicle"],
    weight: 1.9,
  },
]

function main() {
  console.log("")
  console.log("═══ seed-hot-issues-v1 ═══")
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  count:   ${SEEDS.length}`)
  console.log("")

  store.loadHotIssues()
  const starting = store.activeHotIssues().length

  for (const seed of SEEDS) {
    if (WRITE) {
      const rec = store.addHotIssue(seed)
      console.log(`  + ${rec.id}  [w=${rec.weight}]  ${rec.topic}`)
    } else {
      console.log(`  · DRY  [w=${seed.weight}]  ${seed.topic}`)
    }
  }

  const ending = store.activeHotIssues().length
  console.log("")
  console.log(`  active hot issues: ${starting} → ${ending}`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
