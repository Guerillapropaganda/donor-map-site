#!/usr/bin/env node
/**
 * seed-aoc-claims.cjs — Phase 4 / Claim-Object AOC Experiment
 *
 * Seeds data/claims/aoc.jsonl with a starter set of load-bearing
 * factual atoms drawn from AOC's public record. The goal is to prove
 * the claim-object RENDERING pattern works, not to fully populate
 * the profile — an editorial pass expands the claim set later.
 *
 * Every claim here MUST have a source_ref or source_fallback_url per
 * the Phase 4 schema rule. Most of these start with source_fallback_url
 * pointing at primary sources (house.gov, FEC.gov, Congress.gov); a
 * follow-up pass registers them in sources.jsonl and swaps to src_ refs.
 *
 * Usage:
 *   node scripts/seed-aoc-claims.cjs            # dry-run
 *   node scripts/seed-aoc-claims.cjs --write
 */

const store = require("./lib/claims-store.cjs")

const WRITE = process.argv.includes("--write")
const SLUG = "aoc"

const CLAIMS = [
  // identity
  {
    text: "AOC was born October 13, 1989 in the Bronx, NY to a working-class family.",
    category: "identity",
    section_key: "identity",
    confidence: "high",
    source_fallback_url: "https://bioguide.congress.gov/search/bio/O000172",
    data: { dob: "1989-10-13", birthplace: "Bronx, NY" },
  },
  {
    text: "AOC worked as a bartender and waitress in New York City before running for Congress in 2018.",
    category: "identity",
    section_key: "identity",
    confidence: "high",
    source_fallback_url: "https://ocasio-cortez.house.gov/about",
  },
  {
    text: "AOC defeated 10-term incumbent Joe Crowley in the Democratic primary for NY-14 on June 26, 2018.",
    category: "identity",
    section_key: "identity",
    confidence: "high",
    source_fallback_url: "https://ballotpedia.org/New_York%27s_14th_Congressional_District_election,_2018",
    data: { election_date: "2018-06-26", district: "NY-14" },
  },

  // funding_pattern
  {
    text: "AOC's 2020 re-election campaign raised $17.3M, the vast majority from small-dollar donors under $200.",
    category: "funding_pattern",
    section_key: "funding",
    confidence: "high",
    source_fallback_url: "https://www.fec.gov/data/candidate/H8NY15148/",
    data: { cycle: "2020", total_raised: 17300000 },
  },
  {
    text: "AOC does not accept corporate PAC money.",
    category: "funding_pattern",
    section_key: "funding",
    confidence: "high",
    source_fallback_url: "https://ocasio-cortez.house.gov/",
  },
  {
    text: "In the 2022 cycle, over 70% of AOC's itemized contributions came from individual donors giving under $200.",
    category: "funding_pattern",
    section_key: "funding",
    confidence: "medium",
    source_fallback_url: "https://www.fec.gov/data/candidate/H8NY15148/",
    data: { cycle: "2022", small_dollar_pct: 70 },
  },

  // stated_position
  {
    text: "AOC has publicly supported Medicare for All as a cosponsor of H.R. 1976 (117th Congress).",
    category: "stated_position",
    section_key: "positions",
    confidence: "high",
    source_fallback_url: "https://www.congress.gov/bill/117th-congress/house-bill/1976",
    data: { bill: "HR 1976", congress: 117, role: "cosponsor" },
  },
  {
    text: "AOC is the lead author of the Green New Deal resolution (H.Res. 109, 116th Congress).",
    category: "stated_position",
    section_key: "positions",
    confidence: "high",
    source_fallback_url: "https://www.congress.gov/bill/116th-congress/house-resolution/109",
    data: { bill: "H.Res. 109", congress: 116, role: "sponsor" },
  },
  {
    text: "AOC has publicly supported a federal $15 minimum wage and cosponsored the Raise the Wage Act.",
    category: "stated_position",
    section_key: "positions",
    confidence: "high",
    source_fallback_url: "https://www.congress.gov/bill/117th-congress/house-bill/603",
  },

  // voting_record
  {
    text: "AOC voted against the 2021 infrastructure package (H.R. 3684) as part of a progressive bloc demanding simultaneous passage of the Build Back Better Act.",
    category: "voting_record",
    section_key: "votes",
    confidence: "high",
    source_fallback_url: "https://clerk.house.gov/Votes/2021369",
    data: { bill: "HR 3684", vote_date: "2021-11-05", position: "no" },
  },
  {
    text: "AOC voted against the 2023 bill preventing a freight rail workers' strike, opposing congressional imposition of a contract without paid sick leave.",
    category: "voting_record",
    section_key: "votes",
    confidence: "high",
    source_fallback_url: "https://clerk.house.gov/Votes/2022436",
    data: { bill: "HJRes 100", vote_date: "2022-12-02", position: "no" },
  },

  // relationship
  {
    text: 'AOC is a founding member of "The Squad" alongside Ilhan Omar, Ayanna Pressley, and Rashida Tlaib.',
    category: "relationship",
    section_key: "alliances",
    confidence: "high",
    source_fallback_url: "https://ocasio-cortez.house.gov/",
  },
  {
    text: "AOC is a member of the Congressional Progressive Caucus.",
    category: "relationship",
    section_key: "alliances",
    confidence: "high",
    source_fallback_url: "https://progressives.house.gov/members",
  },

  // event_participation
  {
    text: "AOC led the 2018 sit-in at then-Speaker-designate Nancy Pelosi's office with Sunrise Movement activists demanding a Green New Deal.",
    category: "event_participation",
    section_key: "moments",
    confidence: "high",
    source_fallback_url: "https://www.nytimes.com/2018/11/13/us/politics/alexandria-ocasio-cortez-pelosi-protest.html",
    data: { event_date: "2018-11-13" },
  },
  {
    text: "AOC questioned Michael Cohen during his February 2019 House Oversight Committee testimony, with her line of questioning later leading to Trump Organization investigations.",
    category: "event_participation",
    section_key: "moments",
    confidence: "high",
    source_fallback_url: "https://oversight.house.gov/hearing/hearing-with-michael-cohen-former-attorney-to-president-donald-trump/",
    data: { event_date: "2019-02-27" },
  },
]

function main() {
  console.log("")
  console.log("═══ seed-aoc-claims ═══")
  console.log(`  slug:    ${SLUG}`)
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  count:   ${CLAIMS.length}`)
  console.log("")

  store.loadClaimsForProfile(SLUG)
  const starting = store.countClaims(SLUG)

  let seeded = 0
  let skipped = 0

  for (const c of CLAIMS) {
    if (WRITE) {
      try {
        const rec = store.addClaim(SLUG, c)
        console.log(`  + ${rec.id}  [${rec.category}]  ${rec.text.slice(0, 80)}`)
        seeded += 1
      } catch (e) {
        console.warn(`  ! ${c.text.slice(0, 60)}: ${e.message}`)
      }
    } else {
      console.log(`  · DRY  [${c.category}]  ${c.text.slice(0, 80)}`)
      seeded += 1
    }
  }

  const ending = store.countClaims(SLUG)
  console.log("")
  console.log(`  seeded:  ${seeded}`)
  console.log(`  store:   ${starting} → ${ending}  (Δ ${ending - starting})`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
