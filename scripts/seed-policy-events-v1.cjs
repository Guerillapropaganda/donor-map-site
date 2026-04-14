#!/usr/bin/env node
/**
 * seed-policy-events-v1.cjs — Phase 2.75 + Phase 5 data densification
 *
 * Hand-curated legislative events for each of the 5 v1 Policy Battles
 * pages, pulled from the Perplexity research package (03-legislative-
 * history.json) and standard public record. Every event has:
 *   - policy_id (links to data/policies.jsonl)
 *   - date (ISO 8601)
 *   - obstruction_type (floor_vote / chair_bottled_up / filibustered / ...)
 *   - title (bill number + name)
 *   - sponsors (politician names matching vault entities)
 *   - outcome
 *   - source_url (primary source)
 *
 * This gives Phase 2.75 pages a real "Legislative history" section
 * instead of the placeholder, and gives Phase 5 story-candidate-
 * scorer timing_proximity strategy a richer event horizon to match
 * donations against.
 *
 * Usage:
 *   node scripts/seed-policy-events-v1.cjs            # dry-run
 *   node scripts/seed-policy-events-v1.cjs --write
 */

const store = require("./lib/events-store.cjs")
const WRITE = process.argv.includes("--write")

// Each event: event_type, title, date, policy_id, obstruction_type,
// outcome, stakeholders, sponsors, sector_affected, external_id (for
// idempotency), raw_source ("manual-curation")

const EVENTS = [
  // ─── Housing ──────────────────────────────────────────────────
  {
    external_id: "manual-s1368-2021",
    type: "bill_introduction",
    title: "S.1368 / H.R.2768: American Housing and Economic Mobility Act",
    date: "2021-04-23",
    chamber: "both",
    policy_id: "pol_housing",
    obstruction_type: "chair_bottled_up",
    outcome: "stalled",
    stakeholders: ["Elizabeth Warren"],
    sponsors: ["Elizabeth Warren"],
    sector_affected: ["rentier-capital", "finance-capital"],
    source_url: "https://www.congress.gov/bill/117th-congress/senate-bill/1368",
    editor_notes:
      "Proposed $445B Housing Trust Fund investment over 10 years. Died in committee without floor vote.",
  },
  {
    external_id: "manual-ca-ab1482-2019",
    type: "regulation_finalized",
    title: "California AB 1482: Statewide rent increase cap",
    date: "2019-10-08",
    chamber: null,
    policy_id: "pol_housing",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: [],
    sector_affected: ["rentier-capital"],
    source_url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201920200AB1482",
    editor_notes: "State-level rent stabilization — 5% + CPI cap through 2030.",
  },
  {
    external_id: "manual-wa-rcw-59-18-2024",
    type: "regulation_finalized",
    title: "Washington RCW 59.18.700: Statewide rent stabilization",
    date: "2025-05-01",
    chamber: null,
    policy_id: "pol_housing",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: [],
    sector_affected: ["rentier-capital"],
    source_url: "https://app.leg.wa.gov/RCW/default.aspx?cite=59.18.700",
  },
  {
    external_id: "manual-hr2725-ahcia-2025",
    type: "signing",
    title: "H.R.2725 / S.1515: Affordable Housing Credit Improvement Act (LIHTC)",
    date: "2025-07-04",
    chamber: "both",
    policy_id: "pol_housing",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: ["Darin LaHood", "Todd Young"],
    sponsors: ["Darin LaHood", "Todd Young"],
    sector_affected: ["finance-capital"],
    source_url: "https://www.congress.gov/bill/118th-congress/house-bill/2725",
    editor_notes:
      "Signed as part of Trump budget reconciliation bill — 12% LIHTC allocation increase and bond financing threshold reduction 50%→25%.",
  },

  // ─── Healthcare ───────────────────────────────────────────────
  {
    external_id: "manual-s1129-sanders-mfa-2019",
    type: "bill_introduction",
    title: "S.1129: Medicare for All Act (Sanders)",
    date: "2019-04-10",
    chamber: "senate",
    policy_id: "pol_healthcare",
    obstruction_type: "chair_bottled_up",
    outcome: "stalled",
    stakeholders: ["Bernie Sanders"],
    sponsors: ["Bernie Sanders"],
    sector_affected: ["pharma-capital", "finance-capital"],
    source_url: "https://www.congress.gov/bill/116th-congress/senate-bill/1129",
  },
  {
    external_id: "manual-hr1976-jayapal-mfa-2021",
    type: "bill_introduction",
    title: "H.R.1976: Medicare for All Act (Jayapal)",
    date: "2021-03-17",
    chamber: "house",
    policy_id: "pol_healthcare",
    obstruction_type: "chair_bottled_up",
    outcome: "stalled",
    stakeholders: ["Pramila Jayapal", "Alexandria Ocasio-Cortez"],
    sponsors: ["Pramila Jayapal"],
    sector_affected: ["pharma-capital"],
    source_url: "https://www.congress.gov/bill/117th-congress/house-bill/1976",
  },
  {
    external_id: "manual-ira-2022-signing",
    type: "signing",
    title: "Inflation Reduction Act: Medicare drug negotiation provisions",
    date: "2022-08-16",
    chamber: "both",
    policy_id: "pol_healthcare",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: ["Joe Biden", "Chuck Schumer", "Joe Manchin"],
    sponsors: ["Chuck Schumer"],
    sector_affected: ["pharma-capital"],
    source_url: "https://www.congress.gov/bill/117th-congress/house-bill/5376",
    editor_notes:
      "First-ever Medicare price negotiation authority, limited to 10 drugs initially, expanding to 15 in 2027 and 20 annually thereafter.",
  },
  {
    external_id: "manual-ira-drug-negotiation-round1-2024",
    type: "regulation_finalized",
    title: "CMS Medicare drug negotiation round 1: 10 drugs (Eliquis, Jardiance, Xarelto, etc.)",
    date: "2024-08-15",
    chamber: null,
    policy_id: "pol_healthcare",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: [],
    sector_affected: ["pharma-capital"],
    source_url: "https://www.cms.gov/inflation-reduction-act-and-medicare/medicare-drug-price-negotiation",
  },

  // ─── AIPAC / BDS ──────────────────────────────────────────────
  {
    external_id: "manual-arkansas-times-waldrip-2022",
    type: "court_ruling",
    title: "Arkansas Times LP v. Waldrip (8th Circuit): anti-BDS law upheld",
    date: "2022-06-22",
    chamber: null,
    policy_id: "pol_aipac_bds",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: [],
    sector_affected: [],
    source_url: "https://law.justia.com/cases/federal/appellate-courts/ca8/19-1378/19-1378-2022-06-22.html",
    editor_notes:
      "8th Circuit en banc ruled Arkansas's anti-BDS contractor certification law does not violate the First Amendment. Circuit split with other rulings striking down similar laws.",
  },
  {
    external_id: "manual-aipac-udp-2024-cycle",
    type: "other",
    title: "United Democracy Project (AIPAC super PAC): $100M 2024 cycle spending",
    date: "2024-11-05",
    chamber: null,
    policy_id: "pol_aipac_bds",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: [],
    sector_affected: ["dark-money-vehicle", "finance-capital"],
    source_url: "https://www.opensecrets.org/political-action-committees-pacs/united-democracy-project/C00764364/summary/2024",
    editor_notes:
      "UDP spent \u2248$100M in the 2024 cycle — highest-spending outside group in several Democratic primaries. Targeted Bowman, Bush, and other progressive incumbents.",
  },
  {
    external_id: "manual-bowman-primary-2024",
    type: "other",
    title: "NY-16 Democratic primary: Jamaal Bowman defeat (UDP $14.9M)",
    date: "2024-06-25",
    chamber: null,
    policy_id: "pol_aipac_bds",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: ["Jamaal Bowman"],
    sector_affected: ["dark-money-vehicle"],
    source_url: "https://ballotpedia.org/New_York%27s_16th_Congressional_District_election,_2024",
  },

  // ─── Minimum wage ─────────────────────────────────────────────
  {
    external_id: "manual-hr603-rtw-2021",
    type: "bill_introduction",
    title: "H.R.603: Raise the Wage Act of 2021",
    date: "2021-01-26",
    chamber: "house",
    policy_id: "pol_minimum_wage",
    obstruction_type: "chair_bottled_up",
    outcome: "stalled",
    stakeholders: ["Bobby Scott"],
    sponsors: ["Bobby Scott"],
    sector_affected: ["retail-monopoly", "agribusiness-capital"],
    source_url: "https://www.congress.gov/bill/117th-congress/house-bill/603",
  },
  {
    external_id: "manual-parliamentarian-ruling-2021",
    type: "other",
    title: "Parliamentarian ruling: $15 minimum wage ineligible for reconciliation",
    date: "2021-02-25",
    chamber: "senate",
    policy_id: "pol_minimum_wage",
    obstruction_type: "procedural_kill",
    outcome: "failed",
    stakeholders: ["Elizabeth MacDonough"],
    sector_affected: ["retail-monopoly"],
    source_url: "https://www.nytimes.com/2021/02/25/us/politics/minimum-wage-senate-parliamentarian.html",
    editor_notes:
      "Senate Parliamentarian ruled the minimum wage increase provision did not meet reconciliation rules. Biden administration chose not to overrule.",
  },
  {
    external_id: "manual-hr4889-rtw-2023",
    type: "bill_introduction",
    title: "H.R.4889: Raise the Wage Act of 2023",
    date: "2023-07-25",
    chamber: "house",
    policy_id: "pol_minimum_wage",
    obstruction_type: "chair_bottled_up",
    outcome: "stalled",
    stakeholders: ["Bobby Scott"],
    sponsors: ["Bobby Scott"],
    sector_affected: ["retail-monopoly"],
    source_url: "https://www.congress.gov/bill/118th-congress/house-bill/4889",
  },

  // ─── Student debt ─────────────────────────────────────────────
  {
    external_id: "manual-biden-forgiveness-plan-2022",
    type: "executive_action",
    title: "Biden one-time student debt forgiveness plan (\u2264$20k Pell, \u2264$10k non-Pell)",
    date: "2022-08-24",
    chamber: null,
    policy_id: "pol_student_debt",
    obstruction_type: "n/a",
    outcome: "failed",
    stakeholders: ["Joe Biden"],
    sector_affected: ["finance-capital"],
    source_url: "https://www.whitehouse.gov/briefing-room/statements-releases/2022/08/24/fact-sheet-president-biden-announces-student-loan-relief-for-borrowers-who-need-it-most/",
    editor_notes:
      "Executive plan would have cancelled up to $20k per borrower. Struck down by SCOTUS in Biden v. Nebraska (2023).",
  },
  {
    external_id: "manual-scotus-biden-v-nebraska-2023",
    type: "court_ruling",
    title: "Biden v. Nebraska: SCOTUS strikes down broad student debt forgiveness",
    date: "2023-06-30",
    chamber: null,
    policy_id: "pol_student_debt",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: [],
    sector_affected: [],
    source_url: "https://www.supremecourt.gov/opinions/22pdf/22-506_nmip.pdf",
    editor_notes:
      "6-3 ruling. Majority held HEROES Act did not authorize the broad forgiveness plan. Major questions doctrine applied.",
  },
  {
    external_id: "manual-save-plan-2023",
    type: "regulation_finalized",
    title: "SAVE income-driven repayment plan",
    date: "2023-08-22",
    chamber: null,
    policy_id: "pol_student_debt",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: ["Joe Biden"],
    sector_affected: ["finance-capital"],
    source_url: "https://www.whitehouse.gov/briefing-room/statements-releases/2023/08/22/fact-sheet-biden-harris-administration-launches-save-the-most-affordable-repayment-plan-ever/",
    editor_notes:
      "Replaced REPAYE. More generous income-driven repayment formula. Subject to ongoing legal challenges.",
  },
  {
    external_id: "manual-pslf-overhaul-2022",
    type: "regulation_finalized",
    title: "PSLF waiver + overhaul: 715,000+ borrowers discharged",
    date: "2022-10-31",
    chamber: null,
    policy_id: "pol_student_debt",
    obstruction_type: "n/a",
    outcome: "passed",
    stakeholders: ["Joe Biden"],
    sector_affected: ["finance-capital"],
    source_url: "https://studentaid.gov/announcements-events/pslf-limited-waiver",
  },
]

function main() {
  console.log("")
  console.log("═══ seed-policy-events-v1 ═══")
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  count:   ${EVENTS.length}`)
  console.log("")

  store.loadEvents()
  const starting = store.countEvents()

  // Build an external_id index for idempotency
  const existingExt = new Set(
    store.queryEvents({}).map((e) => e.external_id).filter(Boolean),
  )

  let seeded = 0
  let skipped = 0

  for (const payload of EVENTS) {
    if (existingExt.has(payload.external_id)) {
      skipped += 1
      console.log(`  · ${payload.external_id} (exists)`)
      continue
    }
    if (WRITE) {
      try {
        const rec = store.addEvent({ ...payload, raw_source: "manual-curation" })
        console.log(`  + ${rec.id}  ${payload.policy_id}  ${rec.title.slice(0, 60)}`)
        seeded += 1
      } catch (e) {
        console.warn(`  ! ${payload.external_id}: ${e.message}`)
      }
    } else {
      console.log(`  · DRY  ${payload.policy_id}  ${payload.title.slice(0, 60)}`)
      seeded += 1
    }
  }

  const ending = store.countEvents()
  console.log("")
  console.log(`  seeded:  ${seeded}`)
  console.log(`  skipped: ${skipped}`)
  console.log(`  store:   ${starting} → ${ending}  (Δ ${ending - starting})`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
