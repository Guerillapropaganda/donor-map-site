#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — FEC Campaign Finance Pipeline
// Pulls donation data from FEC API for all tracked politicians
// and donors. Native Node.js — no Chrome middleman needed.
//
// Usage:
//   node scripts/fec-pipeline.cjs                       # dry-run, scan all
//   node scripts/fec-pipeline.cjs --write               # update frontmatter
//   node scripts/fec-pipeline.cjs --verbose             # show API calls
//   node scripts/fec-pipeline.cjs --profile="Katie Porter"  # single profile
//   node scripts/fec-pipeline.cjs --type=politician     # only politicians
//   node scripts/fec-pipeline.cjs --type=donor          # only donors
//   node scripts/fec-pipeline.cjs --cycle=2024          # specific election cycle
//   node scripts/fec-pipeline.cjs --cache-ttl=168       # hours (default: 168 = 7 days)
//   node scripts/fec-pipeline.cjs --skip-cached         # skip profiles with fresh cache
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const {
  parseArgs, loadProfiles, fetchJson, RateLimiter, FileCache,
  ReportWriter, sleep, formatDollars, today, extractName,
  nameToFecFormat, CONTENT_DIR, selectTargets, updateFrontmatter,
} = require("./lib/shared.cjs")
const apiConfig = require("./lib/api-config.cjs")
const { logEnrichment, flushLog } = require("./lib/enrichment-log.cjs")
const { applyAutoBlock } = require("./lib/enrichment-markers.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const PROFILE_FILTER = args.profile || null
const TYPE_FILTER = args.type || null
const CYCLE = args.cycle ? parseInt(args.cycle) : null
const CACHE_TTL = parseInt(args["cache-ttl"]) || 168 // hours (7 days)
const SKIP_CACHED = !!args["skip-cached"]
const LIMIT = args.limit ? parseInt(args.limit) : null // max profiles per run

const FEC = apiConfig.fec
const limiter = new RateLimiter(FEC.rateLimit)

// ── FEC API Functions ─────────────────────────────────

/**
 * Search for a candidate by name, return candidate_id and basic info.
 * Caches candidate_id for future runs.
 */
async function fecCandidateSearch(name, idCache) {
  // Check cache first
  const cacheKey = `candidate:${name.toLowerCase()}`
  const cached = idCache.get(cacheKey)
  if (cached) return cached

  await limiter.wait()
  const url = `${FEC.baseUrl}/candidates/search/?q=${encodeURIComponent(name)}&api_key=${FEC.apiKey}&per_page=5`
  if (VERBOSE) console.log(`    [FEC] Candidate search: ${name}`)

  try {
    const data = await fetchJson(url)
    if (!data.results || data.results.length === 0) return null

    // Try to find best match — prefer active candidates
    const results = data.results
    const match = results.find(r =>
      r.name.toLowerCase().includes(name.split(" ").pop().toLowerCase())
    ) || results[0]

    const info = {
      candidateId: match.candidate_id,
      name: match.name,
      party: match.party_full || match.party,
      state: match.state,
      office: match.office_full || match.office,
      district: match.district,
      incumbentChallenge: match.incumbent_challenge_full,
      cycles: match.cycles || [],
      principalCommittees: (match.principal_committees || []).map(c => ({
        committeeId: c.committee_id,
        name: c.name,
      })),
    }

    idCache.set(cacheKey, info, CACHE_TTL * 24) // cache IDs longer
    return info
  } catch (err) {
    if (VERBOSE) console.log(`    [FEC] Search failed: ${err.message}`)
    return null
  }
}

/**
 * Get candidate fundraising totals by cycle.
 */
async function fecCandidateTotals(candidateId, cycle) {
  await limiter.wait()
  let url = `${FEC.baseUrl}/candidates/totals/?candidate_id=${candidateId}&api_key=${FEC.apiKey}&per_page=10`
  if (cycle) url += `&cycle=${cycle}`
  if (VERBOSE) console.log(`    [FEC] Candidate totals: ${candidateId}`)

  try {
    const data = await fetchJson(url)
    if (!data.results || data.results.length === 0) return null

    return data.results.map(r => ({
      cycle: r.cycle,
      receipts: r.receipts,
      disbursements: r.disbursements,
      individualContributions: r.individual_contributions || r.individual_itemized_contributions,
      pacContributions: r.other_political_committee_contributions,
      cashOnHand: r.cash_on_hand_end_period,
      debt: r.debts_owed_by_committee,
      partyFull: r.party_full,
    }))
  } catch (err) {
    if (VERBOSE) console.log(`    [FEC] Totals failed: ${err.message}`)
    return null
  }
}

/**
 * Get independent expenditures (Super PAC spending) for/against a candidate.
 */
async function fecIndependentExpenditures(candidateId, cycle) {
  await limiter.wait()
  let url = `${FEC.baseUrl}/schedules/schedule_e/?candidate_id=${candidateId}&api_key=${FEC.apiKey}&per_page=100&sort=-expenditure_amount`
  if (cycle) url += `&cycle=${cycle}`
  if (VERBOSE) console.log(`    [FEC] Independent expenditures: ${candidateId}`)

  try {
    const data = await fetchJson(url)
    if (!data.results) return null

    const support = data.results.filter(r => r.support_oppose_indicator === "S")
    const oppose = data.results.filter(r => r.support_oppose_indicator === "O")

    const supportTotal = support.reduce((sum, r) => sum + (r.expenditure_amount || 0), 0)
    const opposeTotal = oppose.reduce((sum, r) => sum + (r.expenditure_amount || 0), 0)

    // Top spenders
    const byCommittee = {}
    for (const r of data.results) {
      const name = r.committee?.name || "Unknown"
      if (!byCommittee[name]) byCommittee[name] = { support: 0, oppose: 0 }
      if (r.support_oppose_indicator === "S") {
        byCommittee[name].support += r.expenditure_amount || 0
      } else {
        byCommittee[name].oppose += r.expenditure_amount || 0
      }
    }

    return {
      totalCount: data.pagination?.count || data.results.length,
      supportTotal,
      opposeTotal,
      netSupport: supportTotal - opposeTotal,
      topCommittees: Object.entries(byCommittee)
        .map(([name, totals]) => ({ name, ...totals, total: totals.support + totals.oppose }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
    }
  } catch (err) {
    if (VERBOSE) console.log(`    [FEC] IE failed: ${err.message}`)
    return null
  }
}

/**
 * Search for a PAC/committee by organization name.
 * Used for corporations and PACs — they disburse via committees, not Schedule A.
 * Returns the best-matching committee ID and metadata.
 */
async function fecCommitteeSearch(name, idCache) {
  const cacheKey = `committee:${name.toLowerCase()}`
  const cached = idCache.get(cacheKey)
  if (cached) return cached

  await limiter.wait()
  const url = `${FEC.baseUrl}/committees/?name=${encodeURIComponent(name)}&api_key=${FEC.apiKey}&per_page=10&committee_type=Q,N,W,X,Y,Z`
  if (VERBOSE) console.log(`    [FEC] Committee search: ${name}`)

  try {
    const data = await fetchJson(url)
    if (!data.results || data.results.length === 0) {
      // Try without committee_type filter — some PACs are type P or other
      await limiter.wait()
      const url2 = `${FEC.baseUrl}/committees/?name=${encodeURIComponent(name)}&api_key=${FEC.apiKey}&per_page=10`
      const data2 = await fetchJson(url2)
      if (!data2.results || data2.results.length === 0) return null
      data.results = data2.results
    }

    // Prefer non-leadership, non-party committees; prefer active ones
    const results = data.results
    const match = results.find(r =>
      r.name.toUpperCase().includes(name.split(" ")[0].toUpperCase()) &&
      r.organization_type !== "L"
    ) || results[0]

    const info = {
      committeeId: match.committee_id,
      name: match.name,
      committeeType: match.committee_type_full || match.committee_type,
      party: match.party_full || match.party || null,
      state: match.state || null,
      cycles: match.cycles || [],
    }

    idCache.set(cacheKey, info, CACHE_TTL * 24)
    return info
  } catch (err) {
    if (VERBOSE) console.log(`    [FEC] Committee search failed: ${err.message}`)
    return null
  }
}

/**
 * Pull Schedule B disbursements FROM a committee TO candidates/other committees.
 * This is how PACs and corporate PACs give money — it's the right table for orgs.
 */
async function fecScheduleBDisbursements(committeeId, cycle) {
  await limiter.wait()
  let url = `${FEC.baseUrl}/schedules/schedule_b/?committee_id=${committeeId}&api_key=${FEC.apiKey}&per_page=100&sort=-disbursement_amount`
  if (cycle) url += `&two_year_transaction_period=${cycle}`
  if (VERBOSE) console.log(`    [FEC] Schedule B disbursements: ${committeeId}`)

  try {
    const data = await fetchJson(url)
    if (!data.results || data.results.length === 0) return null

    let totalAmount = 0
    const byRecipient = {}
    const partySplit = { DEM: 0, REP: 0, OTHER: 0 }
    const byCycle = {}

    for (const r of data.results) {
      const recipient = r.recipient_name || "Unknown"
      const amount = r.disbursement_amount || 0
      const party = (r.recipient_committee?.party || "").toUpperCase()
      const txCycle = r.two_year_transaction_period || "Unknown"

      totalAmount += amount

      if (!byRecipient[recipient]) {
        byRecipient[recipient] = { count: 0, total: 0, party: r.recipient_committee?.party || "" }
      }
      byRecipient[recipient].count++
      byRecipient[recipient].total += amount

      if (party === "DEM") partySplit.DEM += amount
      else if (party === "REP") partySplit.REP += amount
      else partySplit.OTHER += amount

      byCycle[txCycle] = (byCycle[txCycle] || 0) + amount
    }

    const demPct = totalAmount > 0 ? Math.round((partySplit.DEM / totalAmount) * 100) : 0
    const repPct = totalAmount > 0 ? Math.round((partySplit.REP / totalAmount) * 100) : 0

    return {
      totalResults: data.results.length,
      totalAmount,
      partySplit,
      demPct,
      repPct,
      topRecipients: Object.entries(byRecipient)
        .map(([name, d]) => ({ name, ...d }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20),
      byCycle: Object.entries(byCycle)
        .sort((a, b) => b[0] - a[0])
        .map(([cycle, total]) => ({ cycle, total })),
      pagination: data.pagination?.count || data.results.length,
    }
  } catch (err) {
    if (VERBOSE) console.log(`    [FEC] Schedule B failed: ${err.message}`)
    return null
  }
}

/**
 * Look up individual contributions for a donor name.
 * Handles pagination to get complete results.
 * Filters out ActBlue/WinRed conduit duplicates.
 */
async function fecDonorLookup(name, opts = {}) {
  const { state, maxPages = 5 } = opts
  const fecName = nameToFecFormat(name)

  let allResults = []
  let page = 1
  let lastIndex = null
  let lastDate = null

  while (page <= maxPages) {
    await limiter.wait()
    let url = `${FEC.baseUrl}/schedules/schedule_a/?contributor_name=${encodeURIComponent(fecName)}&api_key=${FEC.apiKey}&per_page=${FEC.perPage}&sort=-contribution_receipt_date`
    if (state) url += `&contributor_state=${state}`
    if (lastIndex) url += `&last_index=${lastIndex}`
    if (lastDate) url += `&last_contribution_receipt_date=${lastDate}`

    if (VERBOSE) console.log(`    [FEC] Donor lookup: ${fecName} (page ${page})`)

    try {
      const data = await fetchJson(url)
      if (!data.results || data.results.length === 0) break

      allResults.push(...data.results)

      // Pagination
      if (data.pagination?.last_indexes) {
        lastIndex = data.pagination.last_indexes.last_index
        lastDate = data.pagination.last_indexes.last_contribution_receipt_date
      } else {
        break
      }

      page++
    } catch (err) {
      if (VERBOSE) console.log(`    [FEC] Donor lookup failed: ${err.message}`)
      break
    }
  }

  if (allResults.length === 0) return null

  // Filter ActBlue/WinRed conduit duplicates
  // When someone donates through ActBlue, FEC records BOTH the conduit and recipient.
  // Filter out rows where committee_name contains "ACTBLUE" or "WINRED" and
  // memo_text contains "EARMARKED" — these are the conduit entries.
  const filtered = allResults.filter(r => {
    const memo = (r.memo_text || "").toUpperCase()
    const committee = (r.committee?.name || "").toUpperCase()
    // Keep if it's NOT a conduit passthrough
    if (memo.includes("EARMARKED") && (committee.includes("ACTBLUE") || committee.includes("WINRED"))) {
      return false
    }
    return true
  })

  // Aggregate by recipient
  const byRecipient = {}
  let totalAmount = 0
  const partySplit = { DEM: 0, REP: 0, OTHER: 0 }

  for (const r of filtered) {
    const recipient = r.committee?.name || "Unknown"
    if (!byRecipient[recipient]) {
      byRecipient[recipient] = { count: 0, total: 0, party: r.committee?.party || "" }
    }
    byRecipient[recipient].count++
    byRecipient[recipient].total += r.contribution_receipt_amount || 0
    totalAmount += r.contribution_receipt_amount || 0

    const party = (r.committee?.party || "").toUpperCase()
    if (party === "DEM") partySplit.DEM += r.contribution_receipt_amount || 0
    else if (party === "REP") partySplit.REP += r.contribution_receipt_amount || 0
    else partySplit.OTHER += r.contribution_receipt_amount || 0
  }

  return {
    name: fecName,
    totalResults: filtered.length,
    totalAmount,
    partySplit,
    topRecipients: Object.entries(byRecipient)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20),
    rawResultCount: allResults.length,
    filteredCount: allResults.length - filtered.length,
    records: filtered.slice(0, 50).map(r => ({
      date: r.contribution_receipt_date,
      amount: r.contribution_receipt_amount,
      recipient: r.committee?.name,
      party: r.committee?.party,
      employer: r.contributor_employer,
      occupation: r.contributor_occupation,
    })),
  }
}

// ── Politician Name Extraction ────────────────────────

/**
 * Extract politician names from FEC committee/recipient names.
 * "BIDEN FOR PRESIDENT INC." → "Joe Biden"
 * "SCHUMER FOR SENATE" → "Chuck Schumer"
 * Cross-references against vault politician profiles for matches.
 */
function extractPoliticianNames(topRecipients, allPoliticians) {
  // Build lookup: lowercase last name → full title
  const byLastName = new Map()
  for (const p of allPoliticians) {
    const name = extractName(p.title)
    const parts = name.split(/\s+/)
    const last = parts[parts.length - 1].toLowerCase()
    if (!byLastName.has(last)) byLastName.set(last, [])
    byLastName.get(last).push(name)
  }

  const matched = new Set()
  const STRIP_RE = /\b(FOR PRESIDENT|FOR SENATE|FOR CONGRESS|FOR AMERICA|FOR GOVERNOR|VICTORY FUND|LEADERSHIP PAC|PAC|INC\.?|LLC|COMMITTEE|CMTE|CAMPAIGN|JOINT FUNDRAISING)\b/gi

  for (const r of topRecipients) {
    const cleaned = r.name.replace(STRIP_RE, "").trim()
    // Try matching last names from the cleaned committee name
    const words = cleaned.split(/[\s,]+/).filter(w => w.length > 2)
    for (const word of words) {
      const candidates = byLastName.get(word.toLowerCase())
      if (candidates) {
        for (const c of candidates) matched.add(c)
      }
    }
  }

  return [...matched].slice(0, 20)
}

// ── Section Generators ───────────────────────────────

/**
 * Generate a markdown body section for a politician's FEC data.
 */
function generatePoliticianFecSection(name, result) {
  const lines = []
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)

  if (result.totals && result.totals.length > 0) {
    const latest = result.totals[0]
    lines.push(`| Election Cycle | ${latest.cycle} |`)
    if (latest.totalRaised) lines.push(`| Total Raised | ${formatDollars(latest.totalRaised)} |`)
    if (latest.individualContributions) lines.push(`| Individual Contributions | ${formatDollars(latest.individualContributions)} |`)
    if (latest.pacContributions) lines.push(`| PAC Contributions | ${formatDollars(latest.pacContributions)} |`)
    if (latest.cashOnHand) lines.push(`| Cash on Hand | ${formatDollars(latest.cashOnHand)} |`)
  }

  if (result.independentExpenditures) {
    const ie = result.independentExpenditures
    if (ie.supportTotal > 0) lines.push(`| IE Support (Super PAC) | ${formatDollars(ie.supportTotal)} |`)
    if (ie.opposeTotal > 0) lines.push(`| IE Opposition (Super PAC) | ${formatDollars(ie.opposeTotal)} |`)
  }

  lines.push(``)

  // Multi-cycle history if available
  if (result.totals && result.totals.length > 1) {
    lines.push(`**Fundraising by cycle:**`)
    lines.push(``)
    lines.push(`| Cycle | Total Raised | Individual | PAC |`)
    lines.push(`|-------|-------------|------------|-----|`)
    for (const t of result.totals.slice(0, 5)) {
      lines.push(`| ${t.cycle} | ${formatDollars(t.totalRaised || 0)} | ${formatDollars(t.individualContributions || 0)} | ${formatDollars(t.pacContributions || 0)} |`)
    }
    lines.push(``)
  }

  // Top IE spenders
  if (result.independentExpenditures?.topCommittees?.length > 0) {
    lines.push(`**Top outside spenders:**`)
    lines.push(``)
    lines.push(`| Committee | Support | Oppose |`)
    lines.push(`|-----------|---------|--------|`)
    for (const c of result.independentExpenditures.topCommittees.slice(0, 5)) {
      lines.push(`| ${c.name} | ${formatDollars(c.support)} | ${formatDollars(c.oppose)} |`)
    }
    lines.push(``)
  }

  lines.push(`- [Source: FEC.gov](https://www.fec.gov/data/candidate/${result.candidateId}/) (Tier 1)`)
  return lines.join("\n")
}

/**
 * Generate a markdown body section for a donor's FEC data.
 */
function generateDonorFecSection(name, result) {
  const lines = []
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total Political Spend | ${formatDollars(result.totalAmount || 0)} |`)
  lines.push(`| Contributions | ${result.totalResults || 0} |`)

  if (result.demPct != null && result.repPct != null) {
    lines.push(`| Party Split | ${result.demPct}% Dem / ${result.repPct}% Rep |`)
  }

  if (result.committeeId) {
    lines.push(`| Committee | ${result.committeeName || result.committeeId} |`)
    lines.push(`| Committee Type | ${result.committeeType || "Unknown"} |`)
  }
  lines.push(``)

  // Top recipients
  if (result.topRecipients?.length > 0) {
    lines.push(`**Top recipients:**`)
    lines.push(``)
    lines.push(`| Recipient | Amount | Party |`)
    lines.push(`|-----------|--------|-------|`)
    for (const r of result.topRecipients.slice(0, 10)) {
      lines.push(`| ${r.name} | ${formatDollars(r.total)} | ${r.party || "—"} |`)
    }
    lines.push(``)
  }

  const sourceUrl = result.committeeId
    ? `https://www.fec.gov/data/committee/${result.committeeId}/`
    : `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(name)}`
  lines.push(`- [Source: FEC.gov](${sourceUrl}) (Tier 1)`)
  return lines.join("\n")
}

/**
 * Insert or update an auto-managed FEC section in a profile file.
 */
function insertOrUpdateFecSection(filePath, innerContent, blockType) {
  const fileContent = fs.readFileSync(filePath, "utf-8")
  const result = applyAutoBlock({
    filePath,
    blockType,
    fileContent,
    newInner: innerContent,
    sectionHeader: "### Campaign Finance (FEC)",
  })
  if (result.status !== "unchanged") {
    fs.writeFileSync(filePath, result.updatedContent, "utf-8")
  }
  return result
}

// ── Profile Processing ────────────────────────────────

async function processPolitician(profile, idCache, dataCache) {
  const name = extractName(profile.title)
  const cacheKey = `politician:${name.toLowerCase()}`

  if (SKIP_CACHED && dataCache.has(cacheKey)) {
    return { profile: name, status: "cached", data: dataCache.get(cacheKey) }
  }

  if (VERBOSE) console.log(`\n  Processing politician: ${name}`)

  // Step 1: Find candidate — use frontmatter FEC ID if available, otherwise name search
  const existingFecId = profile.yaml?.["fec-candidate-id"] || null
  let candidate
  if (existingFecId) {
    if (VERBOSE) console.log(`    Using frontmatter FEC ID: ${existingFecId}`)
    candidate = {
      candidateId: existingFecId,
      name: name,
      party: profile.yaml?.party || "",
      state: profile.yaml?.["state-abbr"] || profile.yaml?.state || "",
      office: profile.yaml?.chamber || "",
      principalCommittees: [],
    }
    idCache.set(`candidate:${name.toLowerCase()}`, candidate)
  } else {
    candidate = await fecCandidateSearch(name, idCache)
  }
  if (!candidate) {
    return { profile: name, status: "not-found", error: "No FEC candidate match" }
  }

  if (VERBOSE) console.log(`    Found: ${candidate.name} (${candidate.candidateId})`)

  // Step 2: Get totals
  const totals = await fecCandidateTotals(candidate.candidateId, CYCLE)

  // Step 3: Get independent expenditures
  const ie = await fecIndependentExpenditures(candidate.candidateId, CYCLE)

  // Check rate limit
  if (limiter.remaining < 3) {
    console.log(`\n  ⚠ Rate limit nearly exhausted (${limiter.remaining} remaining). Stopping.`)
    return { profile: name, status: "rate-limited" }
  }

  const result = {
    profile: name,
    status: "success",
    candidateId: candidate.candidateId,
    fecName: candidate.name,
    party: candidate.party,
    state: candidate.state,
    office: candidate.office,
    totals: totals ? totals.map(t => ({
      cycle: t.cycle,
      totalRaised: t.receipts,
      individualContributions: t.individualContributions,
      pacContributions: t.pacContributions,
      cashOnHand: t.cashOnHand,
    })) : null,
    independentExpenditures: ie,
    principalCommittees: candidate.principalCommittees,
  }

  dataCache.set(cacheKey, result, CACHE_TTL)
  return result
}

async function processDonor(profile, idCache, dataCache) {
  const name = extractName(profile.title)
  const entityType = (profile.yaml["entity-type"] || "").toLowerCase()
  const isOrg = entityType.includes("corporation") || entityType.includes("pac")
  const cacheKey = `donor:${name.toLowerCase()}`

  if (SKIP_CACHED && dataCache.has(cacheKey)) {
    return { profile: name, status: "cached", data: dataCache.get(cacheKey) }
  }

  if (VERBOSE) console.log(`\n  Processing donor: ${name} [${entityType || "unknown type"}]`)

  // Check rate limit before starting
  if (limiter.remaining < 3) {
    console.log(`\n  ⚠ Rate limit nearly exhausted (${limiter.remaining} remaining). Stopping.`)
    return { profile: name, status: "rate-limited" }
  }

  let result

  if (isOrg) {
    // Corporations and PACs give via committees — use committee search + Schedule B
    const committee = await fecCommitteeSearch(name, idCache)

    if (!committee) {
      return { profile: name, status: "not-found", error: "No FEC committee match", entityType }
    }

    if (VERBOSE) console.log(`    Found committee: ${committee.name} (${committee.committeeId})`)

    const disbursements = await fecScheduleBDisbursements(committee.committeeId, CYCLE)

    if (!disbursements) {
      return { profile: name, status: "not-found", error: "Committee found but no disbursement records", entityType, committeeId: committee.committeeId }
    }

    result = {
      profile: name,
      status: "success",
      entityType,
      committeeId: committee.committeeId,
      committeeName: committee.name,
      committeeType: committee.committeeType,
      ...disbursements,
    }
  } else {
    // Individual donors — Schedule A contributor_name search
    const lookup = await fecDonorLookup(name)

    if (!lookup) {
      return { profile: name, status: "not-found", error: "No FEC contribution records", entityType }
    }

    result = {
      profile: name,
      status: "success",
      entityType,
      ...lookup,
    }
  }

  dataCache.set(cacheKey, result, CACHE_TTL)
  return result
}

// ── Main ──────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — FEC Campaign Finance Pipeline")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update frontmatter)" : "DRY RUN (preview only)"}`)
  apiConfig.printStatus()
  if (FEC.isDemoKey) {
    console.log("  ⚠ Using DEMO_KEY — 40 requests/hour limit.")
    console.log("    Add FEC_API_KEY to .env for 1000 req/hr.\n")
  }
  if (PROFILE_FILTER) console.log(`  Filter: "${PROFILE_FILTER}"`)
  if (TYPE_FILTER) console.log(`  Type: ${TYPE_FILTER}`)
  if (CYCLE) console.log(`  Cycle: ${CYCLE}`)
  if (LIMIT) console.log(`  Limit: ${LIMIT} profiles per run`)

  // Load caches
  const idCache = new FileCache("fec-id")
  const dataCache = new FileCache("fec-data")
  const notFoundCache = new FileCache("fec-not-found")

  // Load profiles
  console.log("  Loading vault profiles...")
  const types = TYPE_FILTER === "politician" ? ["politician"]
    : TYPE_FILTER === "donor" ? ["donor", "pac", "corporation"]
    : ["politician", "donor", "pac", "corporation"]
  const { politicians, donors } = loadProfiles({ types })

  // Apply type filter
  const politicianPool = TYPE_FILTER === "donor" ? [] : politicians
  const donorPool = TYPE_FILTER === "politician" ? [] : donors

  // Split budget ~50/50 between politicians and donors so both get coverage
  const polLimit = LIMIT ? Math.ceil(LIMIT / 2) : null

  // Select politicians (enriched = has fec-candidate-id)
  const polSel = selectTargets(politicianPool, {
    enrichedKey: "fec-candidate-id",
    notFoundCache,
    limit: polLimit,
    profileFilter: PROFILE_FILTER,
    extractName,
  })
  let targetPoliticians = polSel.targets

  // Donors get whatever politicians didn't use
  const donorLimit = LIMIT != null ? Math.max(0, LIMIT - targetPoliticians.length) : null
  const donorSel = selectTargets(donorPool, {
    enrichedKey: "fec-committee-id",
    notFoundCache,
    limit: donorLimit,
    profileFilter: PROFILE_FILTER,
    extractName,
  })
  let targetDonors = donorSel.targets

  const totalSkippedEnriched = polSel.skippedEnriched + donorSel.skippedEnriched
  const totalSkippedMissed = polSel.skippedMissed + donorSel.skippedMissed
  if (totalSkippedEnriched || totalSkippedMissed) {
    console.log(`  Skipping ${totalSkippedEnriched} already enriched, ${totalSkippedMissed} recent misses`)
  }

  console.log(`  Politicians to scan: ${targetPoliticians.length}`)
  console.log(`  Donors to scan: ${targetDonors.length}`)
  console.log(`  Rate limit: ${FEC.rateLimit} req/hr`)
  console.log()

  const results = []
  let rateLimited = false

  // Process politicians
  for (const profile of targetPoliticians) {
    if (rateLimited) break
    const result = await processPolitician(profile, idCache, dataCache)
    results.push(result)
    if (result.status === "rate-limited") {
      rateLimited = true
    }
    if (result.status === "not-found") {
      notFoundCache.set(extractName(profile.title), true, 720)
    }

    // Write mode: update frontmatter + body section
    if (WRITE && result.status === "success" && result.totals) {
      const latestCycle = result.totals[0]
      const updates = {
        "last-updated": today(),
        "last-enriched": today(),
      }
      if (latestCycle?.totalRaised) {
        updates["total-received"] = formatDollars(latestCycle.totalRaised)
      }
      if (result.candidateId) {
        updates["fec-candidate-id"] = result.candidateId
      }
      updateFrontmatter(profile.filePath, updates)

      // Write body section with campaign finance data
      const inner = generatePoliticianFecSection(extractName(profile.title), result)
      const writeResult = insertOrUpdateFecSection(profile.filePath, inner, "fec-politician")
      const marker = writeResult.conflict ? " ⚠️ parked (human edit detected)" : ""
      if (VERBOSE) console.log(`    Updated: ${path.relative(CONTENT_DIR, profile.filePath)} — ${writeResult.status}${marker}`)

      const latestCycleEntry = result.totals[0]
      logEnrichment({
        pipeline: "fec",
        profile: extractName(profile.title),
        summary: `${latestCycleEntry?.cycle || ""} raised ${formatDollars(latestCycleEntry?.totalRaised || 0)}`,
        file: profile.filePath,
      })
    }
  }

  // Process donors
  for (const profile of targetDonors) {
    if (rateLimited) break
    const result = await processDonor(profile, idCache, dataCache)
    results.push(result)
    if (result.status === "rate-limited") {
      rateLimited = true
    }
    if (result.status === "not-found") {
      notFoundCache.set(extractName(profile.title), true, 720)
    }

    // Write mode: update frontmatter + body section
    if (WRITE && result.status === "success") {
      const updates = {
        "last-updated": today(),
        "last-enriched": today(),
      }
      if (result.totalAmount) {
        updates["total-political-spend"] = formatDollars(result.totalAmount)
      }
      if (result.committeeId) {
        updates["fec-committee-id"] = result.committeeId
      }
      if (result.demPct != null && result.repPct != null) {
        updates["fec-party-split"] = `${result.demPct}% Dem / ${result.repPct}% Rep`
      }
      // Extract politician names from FEC recipients and write politicians-funded
      if (result.topRecipients?.length > 0) {
        const funded = extractPoliticianNames(result.topRecipients, politicianPool)
        if (funded.length > 0) {
          updates["politicians-funded"] = funded
        }
      }
      updateFrontmatter(profile.filePath, updates)

      // Write body section with donor FEC data
      const inner = generateDonorFecSection(extractName(profile.title), result)
      const writeResult = insertOrUpdateFecSection(profile.filePath, inner, "fec-donor")
      const marker = writeResult.conflict ? " ⚠️ parked (human edit detected)" : ""
      if (VERBOSE) console.log(`    Updated: ${path.relative(CONTENT_DIR, profile.filePath)} — ${writeResult.status}${marker}`)

      logEnrichment({
        pipeline: "fec",
        profile: extractName(profile.title),
        summary: `total political spend ${formatDollars(result.totalAmount || 0)}${result.demPct != null ? ` (${result.demPct}% D / ${result.repPct}% R)` : ""}`,
        file: profile.filePath,
      })
    }
  }

  // Save caches
  idCache.save()
  dataCache.save()
  notFoundCache.save()
  if (WRITE) flushLog({ startedAt: new Date() })

  // Build report
  const report = new ReportWriter("fec-pipeline")

  const successful = results.filter(r => r.status === "success")
  const notFound = results.filter(r => r.status === "not-found")
  const cached = results.filter(r => r.status === "cached")

  report.addStat("API Key", FEC.isDemoKey ? "DEMO_KEY (40/hr)" : "Registered (1000/hr)")
  report.addStat("Profiles scanned", results.length)
  report.addStat("Successful", successful.length)
  report.addStat("Not found in FEC", notFound.length)
  report.addStat("Cached (skipped)", cached.length)
  report.addStat("API calls made", limiter.requestCount)
  report.addStat("API calls remaining", limiter.remaining)
  report.addStat("Rate limited", rateLimited ? "YES — run again later" : "No")

  // Successful results detail
  if (successful.length > 0) {
    const details = successful.map(r => {
      if (r.totals) {
        const latest = r.totals[0]
        return `**${r.profile}** (${r.candidateId}) — ${r.party}, ${r.state}\n` +
          `  Latest cycle (${latest.cycle}): Raised ${formatDollars(latest.totalRaised)}, ` +
          `Individual: ${formatDollars(latest.individualContributions)}, ` +
          `PAC: ${formatDollars(latest.pacContributions)}` +
          (r.independentExpenditures ? `\n  IE Support: ${formatDollars(r.independentExpenditures.supportTotal)}, Oppose: ${formatDollars(r.independentExpenditures.opposeTotal)}` : "")
      }
      if (r.totalAmount !== undefined) {
        const isOrg = r.committeeId != null
        if (isOrg) {
          const split = r.demPct != null ? ` — ${r.demPct}% Dem / ${r.repPct}% Rep` : ""
          return `**${r.profile}** (${r.committeeName || r.committeeId})${split}\n` +
            `  Total disbursed: ${formatDollars(r.totalAmount)} across ${r.totalResults} transactions\n` +
            `  Top recipients: ${r.topRecipients?.slice(0, 3).map(t => `${t.name} (${formatDollars(t.total)})`).join(", ")}`
        }
        return `**${r.profile}** — ${r.totalResults} contributions, ${formatDollars(r.totalAmount)} total\n` +
          `  Top recipients: ${r.topRecipients?.slice(0, 3).map(t => `${t.name} (${formatDollars(t.total)})`).join(", ")}` +
          (r.filteredCount > 0 ? `\n  ActBlue/WinRed duplicates filtered: ${r.filteredCount}` : "")
      }
      return `**${r.profile}** — data retrieved`
    })
    report.addSection("Successful Lookups", details.join("\n\n"))
  }

  if (notFound.length > 0) {
    report.addSection("Not Found in FEC", notFound.map(r => `${r.profile}: ${r.error}`))
  }

  report.setData("results", results.map(r => ({
    profile: r.profile,
    status: r.status,
    candidateId: r.candidateId || null,
    totalRaised: r.totals?.[0]?.totalRaised || r.totalAmount || null,
    party: r.party || null,
    error: r.error || null,
  })))

  const paths = report.writeBoth()

  // Print summary
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Scanned:       ${results.length} profiles`)
  console.log(`  Successful:    ${successful.length}`)
  console.log(`  Not found:     ${notFound.length}`)
  console.log(`  Cached:        ${cached.length}`)
  console.log(`  API calls:     ${limiter.requestCount} / ${FEC.rateLimit} per hour`)
  if (rateLimited) console.log(`  ⚠ RATE LIMITED — run again later to continue`)
  console.log()
  console.log(`  Reports: ${paths.json}`)
  console.log(`           ${paths.md}`)
  console.log("═══════════════════════════════════════════════════\n")

  if (successful.length > 0) {
    console.log("  Top results:")
    for (const r of successful.slice(0, 5)) {
      const amount = r.totals?.[0]?.totalRaised || r.totalAmount
      console.log(`    ${r.profile}: ${amount ? formatDollars(amount) : "data retrieved"}`)
    }
    if (successful.length > 5) console.log(`    ... and ${successful.length - 5} more`)
    console.log()
  }
}

main().catch(err => {
  console.error("\n  FATAL:", err.message)
  process.exit(1)
})
