#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — Congress.gov Pipeline
// Pulls committee assignments, sponsored legislation, and voting
// record highlights for all tracked politicians.
//
// Usage:
//   node scripts/congress-pipeline.cjs                       # dry-run
//   node scripts/congress-pipeline.cjs --write               # update frontmatter
//   node scripts/congress-pipeline.cjs --verbose             # show API calls
//   node scripts/congress-pipeline.cjs --profile="Chuck Schumer"
//   node scripts/congress-pipeline.cjs --cache-ttl=168       # hours (default: 168)
//   node scripts/congress-pipeline.cjs --congress=119        # specific congress (default: current)
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const {
  parseArgs, loadProfiles, fetchJson, RateLimiter, FileCache,
  ReportWriter, today, extractName, CONTENT_DIR,
} = require("./lib/shared.cjs")
const apiConfig = require("./lib/api-config.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const PROFILE_FILTER = args.profile || null
const CACHE_TTL = parseInt(args["cache-ttl"]) || 168
const CONGRESS_NUM = parseInt(args.congress) || 119 // 119th Congress (2025-2027)

const CGV = apiConfig.congress
const limiter = new RateLimiter(CGV.rateLimit)

// ── Congress.gov API Functions ─────────────────────────

/**
 * Search for a member by name. Returns bioguideId and basic info.
 */
async function congressMemberSearch(name, state, party, idCache) {
  const cacheKey = `member:${name.toLowerCase()}`
  const cached = idCache.get(cacheKey)
  if (cached) return cached

  await limiter.wait()
  const url = `${CGV.baseUrl}/member?api_key=${CGV.apiKey}&format=json&limit=20&query=${encodeURIComponent(name)}`
  if (VERBOSE) console.log(`    [Congress] Member search: ${name}`)

  try {
    const data = await fetchJson(url)
    if (!data.members || data.members.length === 0) return null

    // Disambiguate: match by state and/or party if provided
    let match = data.members[0]
    if (state || party) {
      const better = data.members.find(m => {
        const mState = m.state?.toUpperCase()
        const mParty = (m.partyName || "").toLowerCase()
        const stateMatch = !state || mState === state.toUpperCase()
        const partyMatch = !party || mParty.includes(party.toLowerCase())
        return stateMatch && partyMatch
      })
      if (better) match = better
    }

    const info = {
      bioguideId: match.bioguideId,
      name: match.name || `${match.firstName} ${match.lastName}`,
      party: match.partyName,
      state: match.state,
      chamber: match.terms?.[0]?.chamber || null,
      url: match.url,
    }

    idCache.set(cacheKey, info, CACHE_TTL * 24)
    return info
  } catch (err) {
    if (VERBOSE) console.log(`    [Congress] Search failed: ${err.message}`)
    return null
  }
}

/**
 * Get sponsored legislation for a member.
 */
async function congressSponsoredBills(bioguideId, congress) {
  await limiter.wait()
  const url = `${CGV.baseUrl}/member/${bioguideId}/sponsored-legislation?api_key=${CGV.apiKey}&format=json&limit=20&congress=${congress}`
  if (VERBOSE) console.log(`    [Congress] Sponsored bills: ${bioguideId}`)

  try {
    const data = await fetchJson(url)
    if (!data.sponsoredLegislation) return null

    return {
      count: data.pagination?.count || data.sponsoredLegislation.length,
      bills: data.sponsoredLegislation.slice(0, 20).map(b => ({
        number: b.number,
        title: b.title,
        type: b.type,
        introducedDate: b.introducedDate,
        latestAction: b.latestAction?.text,
        latestActionDate: b.latestAction?.actionDate,
        policyArea: b.policyArea?.name,
        url: b.url,
      })),
    }
  } catch (err) {
    if (VERBOSE) console.log(`    [Congress] Bills failed: ${err.message}`)
    return null
  }
}

/**
 * Get cosponsored legislation for a member.
 */
async function congressCosponsoredBills(bioguideId, congress) {
  await limiter.wait()
  const url = `${CGV.baseUrl}/member/${bioguideId}/cosponsored-legislation?api_key=${CGV.apiKey}&format=json&limit=20&congress=${congress}`
  if (VERBOSE) console.log(`    [Congress] Cosponsored bills: ${bioguideId}`)

  try {
    const data = await fetchJson(url)
    if (!data.cosponsoredLegislation) return null

    return {
      count: data.pagination?.count || data.cosponsoredLegislation.length,
      bills: data.cosponsoredLegislation.slice(0, 20).map(b => ({
        number: b.number,
        title: b.title,
        type: b.type,
        introducedDate: b.introducedDate,
        policyArea: b.policyArea?.name,
      })),
    }
  } catch (err) {
    if (VERBOSE) console.log(`    [Congress] Cosponsor failed: ${err.message}`)
    return null
  }
}

// ── Profile Processing ────────────────────────────────

async function processPolitician(profile, idCache, dataCache) {
  const name = extractName(profile.title)
  const cacheKey = `congress:${name.toLowerCase()}`

  const cachedData = dataCache.get(cacheKey)
  if (cachedData) {
    return { profile: name, status: "cached", data: cachedData }
  }

  if (VERBOSE) console.log(`\n  Processing: ${name}`)

  // Extract state/party from frontmatter for disambiguation
  const state = profile.yaml?.["state-abbr"] || profile.yaml?.state || null
  const party = profile.yaml?.party || null

  // Step 1: Find member
  const member = await congressMemberSearch(name, state, party, idCache)
  if (!member) {
    return { profile: name, status: "not-found", error: "No Congress.gov member match" }
  }

  if (VERBOSE) console.log(`    Found: ${member.name} (${member.bioguideId}) — ${member.party}, ${member.state}`)

  // Step 2: Get sponsored bills
  const sponsored = await congressSponsoredBills(member.bioguideId, CONGRESS_NUM)

  // Step 3: Get cosponsored bills
  const cosponsored = await congressCosponsoredBills(member.bioguideId, CONGRESS_NUM)

  // Extract policy areas from bills
  const policyAreas = new Set()
  if (sponsored?.bills) {
    for (const b of sponsored.bills) {
      if (b.policyArea) policyAreas.add(b.policyArea)
    }
  }
  if (cosponsored?.bills) {
    for (const b of cosponsored.bills) {
      if (b.policyArea) policyAreas.add(b.policyArea)
    }
  }

  const result = {
    profile: name,
    status: "success",
    bioguideId: member.bioguideId,
    congressName: member.name,
    party: member.party,
    state: member.state,
    chamber: member.chamber,
    sponsored: sponsored ? {
      count: sponsored.count,
      topBills: sponsored.bills.slice(0, 10),
    } : null,
    cosponsored: cosponsored ? {
      count: cosponsored.count,
      topBills: cosponsored.bills.slice(0, 10),
    } : null,
    policyAreas: [...policyAreas].sort(),
    congressUrl: member.url,
  }

  dataCache.set(cacheKey, result, CACHE_TTL)
  return result
}

// ── Frontmatter Update ────────────────────────────────

function updateFrontmatter(filePath, updates) {
  let content = fs.readFileSync(filePath, "utf-8")
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return false

  let yamlBlock = fmMatch[1]
  let changed = false

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) continue
    const lineRe = new RegExp(`^(${key})\\s*:.*$`, "m")

    if (Array.isArray(value)) {
      // Replace or add array field
      const arrayYaml = `${key}:\n${value.map(v => `  - "${v}"`).join("\n")}`
      // Check if key already exists — replace entire block
      const arrayBlockRe = new RegExp(`^${key}:\\s*\\n(\\s+-\\s+.*\\n?)*`, "m")
      if (arrayBlockRe.test(yamlBlock)) {
        yamlBlock = yamlBlock.replace(arrayBlockRe, arrayYaml + "\n")
        changed = true
      } else if (lineRe.test(yamlBlock)) {
        yamlBlock = yamlBlock.replace(lineRe, arrayYaml)
        changed = true
      } else {
        yamlBlock += `\n${arrayYaml}`
        changed = true
      }
    } else {
      const formatted = typeof value === "string" ? `"${value}"` : value
      if (lineRe.test(yamlBlock)) {
        yamlBlock = yamlBlock.replace(lineRe, `${key}: ${formatted}`)
        changed = true
      } else {
        yamlBlock += `\n${key}: ${formatted}`
        changed = true
      }
    }
  }

  if (changed) {
    content = content.replace(fmMatch[1], yamlBlock)
    fs.writeFileSync(filePath, content, "utf-8")
  }
  return changed
}

// ── Main ──────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — Congress.gov Pipeline")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update frontmatter)" : "DRY RUN (preview only)"}`)
  console.log(`  Congress: ${CONGRESS_NUM}th`)
  console.log(`  API Key: ${CGV.apiKey === "DEMO_KEY" ? "DEMO_KEY" : "Registered"}`)
  console.log(`  Rate limit: ${CGV.rateLimit} req/hr`)
  if (PROFILE_FILTER) console.log(`  Filter: "${PROFILE_FILTER}"`)
  console.log()

  // Load caches
  const idCache = new FileCache("congress-id")
  const dataCache = new FileCache("congress-data")

  // Load profiles
  console.log("  Loading vault profiles...")
  const { politicians } = loadProfiles({ types: ["politician"] })

  let targets = politicians
  if (PROFILE_FILTER) {
    const filter = PROFILE_FILTER.toLowerCase()
    targets = politicians.filter(p =>
      extractName(p.title).toLowerCase().includes(filter))
  }

  console.log(`  Politicians to scan: ${targets.length}`)
  console.log()

  const results = []

  for (const profile of targets) {
    const result = await processPolitician(profile, idCache, dataCache)
    results.push(result)

    // Write mode: update frontmatter
    if (WRITE && result.status === "success") {
      const updates = { "last-updated": today() }
      if (result.bioguideId) updates["bioguide-id"] = result.bioguideId
      if (result.policyAreas.length > 0) {
        // Map Congress.gov policy areas to vault issue format
        updates.issues = result.policyAreas.slice(0, 10)
      }
      updateFrontmatter(profile.filePath, updates)
      if (VERBOSE) console.log(`    Updated: ${path.relative(CONTENT_DIR, profile.filePath)}`)
    }
  }

  // Save caches
  idCache.save()
  dataCache.save()

  // Build report
  const report = new ReportWriter("congress-pipeline")

  const successful = results.filter(r => r.status === "success")
  const notFound = results.filter(r => r.status === "not-found")
  const cached = results.filter(r => r.status === "cached")

  report.addStat("Congress", `${CONGRESS_NUM}th`)
  report.addStat("Profiles scanned", results.length)
  report.addStat("Successful", successful.length)
  report.addStat("Not found", notFound.length)
  report.addStat("Cached (skipped)", cached.length)
  report.addStat("API calls made", limiter.requestCount)

  if (successful.length > 0) {
    const details = successful.map(r => {
      let detail = `**${r.profile}** (${r.bioguideId}) — ${r.party}, ${r.state}`
      if (r.sponsored) detail += `\n  Sponsored: ${r.sponsored.count} bills`
      if (r.cosponsored) detail += `\n  Cosponsored: ${r.cosponsored.count} bills`
      if (r.policyAreas.length > 0) detail += `\n  Policy areas: ${r.policyAreas.join(", ")}`
      if (r.sponsored?.topBills?.length > 0) {
        detail += `\n  Notable bills:`
        for (const b of r.sponsored.topBills.slice(0, 3)) {
          detail += `\n    - ${b.number}: ${b.title?.slice(0, 80)}`
        }
      }
      return detail
    })
    report.addSection("Successful Lookups", details.join("\n\n"))
  }

  if (notFound.length > 0) {
    report.addSection("Not Found", notFound.map(r => `${r.profile}: ${r.error}`))
  }

  report.setData("results", results.map(r => ({
    profile: r.profile,
    status: r.status,
    bioguideId: r.bioguideId || null,
    party: r.party || null,
    sponsoredCount: r.sponsored?.count || 0,
    cosponsoredCount: r.cosponsored?.count || 0,
    policyAreas: r.policyAreas || [],
    error: r.error || null,
  })))

  const paths = report.writeBoth()

  // Print summary
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Scanned:       ${results.length} politicians`)
  console.log(`  Successful:    ${successful.length}`)
  console.log(`  Not found:     ${notFound.length}`)
  console.log(`  Cached:        ${cached.length}`)
  console.log(`  API calls:     ${limiter.requestCount}`)
  console.log()
  console.log(`  Reports: ${paths.json}`)
  console.log(`           ${paths.md}`)
  console.log("═══════════════════════════════════════════════════\n")

  if (successful.length > 0) {
    console.log("  Top results:")
    for (const r of successful.slice(0, 5)) {
      console.log(`    ${r.profile}: ${r.sponsored?.count || 0} sponsored, ${r.cosponsored?.count || 0} cosponsored`)
    }
    if (successful.length > 5) console.log(`    ... and ${successful.length - 5} more`)
    console.log()
  }
}

main().catch(err => {
  console.error("\n  FATAL:", err.message)
  process.exit(1)
})
