#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — ProPublica Nonprofit Explorer Pipeline
// Pulls 990 tax filing data for think tanks, PACs, dark money
// groups, and donor organizations. NO API KEY NEEDED.
//
// Usage:
//   node scripts/propublica-pipeline.cjs                    # dry run
//   node scripts/propublica-pipeline.cjs --write            # update vault
//   node scripts/propublica-pipeline.cjs --write --verbose
//   node scripts/propublica-pipeline.cjs --profile="Heritage Foundation"
//   node scripts/propublica-pipeline.cjs --write --limit=20
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const https = require("https")

const {
  parseArgs, loadProfiles, extractName, RateLimiter, FileCache,
  ReportWriter,
} = require("./lib/shared.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const PROFILE_FILTER = args.profile || null
const LIMIT = args.limit ? parseInt(args.limit) : null
const CACHE_TTL = parseInt(args["cache-ttl"]) || 168 // 7 days

const BASE_URL = "https://projects.propublica.org/nonprofits/api/v2"
const limiter = new RateLimiter(60) // conservative — no published limit

// ── HTTP Fetch ──────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "DonorMap/1.0" } }, (res) => {
      if (res.statusCode === 404) return resolve(null)
      if (res.statusCode === 429) {
        console.log("    ⚠ Rate limited (429). Waiting 30s...")
        return setTimeout(() => fetchJson(url).then(resolve).catch(reject), 30000)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    })
    req.on("error", reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("Timeout")) })
  })
}

// ── ProPublica API Functions ────────────────────────────

/**
 * Search for a nonprofit by name. Returns array of matches.
 */
async function searchOrg(name) {
  await limiter.wait()
  const url = `${BASE_URL}/search.json?q=${encodeURIComponent(name)}`
  if (VERBOSE) console.log(`    GET ${url}`)
  const data = await fetchJson(url)
  if (!data || !data.organizations) return []
  return data.organizations
}

/**
 * Get full org details + filing list by EIN.
 */
async function getOrg(ein) {
  await limiter.wait()
  const cleanEin = String(ein).replace(/-/g, "")
  const url = `${BASE_URL}/organizations/${cleanEin}.json`
  if (VERBOSE) console.log(`    GET ${url}`)
  return fetchJson(url)
}

/**
 * Best-match an org name to a ProPublica result.
 * Prefers exact name match, then substring, then first result.
 */
function bestMatch(results, targetName) {
  if (!results || results.length === 0) return null
  const lower = targetName.toLowerCase().replace(/[^a-z0-9 ]/g, "")

  // Exact match
  for (const r of results) {
    const rName = (r.name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "")
    if (rName === lower) return r
  }

  // Substring match
  for (const r of results) {
    const rName = (r.name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "")
    if (rName.includes(lower) || lower.includes(rName)) return r
  }

  // Fallback: first result
  return results[0]
}

/**
 * Extract key financial data from the most recent 990 filing.
 */
function extractFinancials(orgData) {
  if (!orgData || !orgData.filings_with_data) return null

  const filings = orgData.filings_with_data
  if (filings.length === 0) return null

  // Get most recent filing
  const latest = filings[0]
  const year = latest.tax_prd_yr || latest.tax_period || "unknown"

  return {
    ein: orgData.organization?.ein || null,
    name: orgData.organization?.name || "",
    city: orgData.organization?.city || "",
    state: orgData.organization?.state || "",
    ntee_code: orgData.organization?.ntee_code || "",
    subsection_code: orgData.organization?.subsection_code || "",
    ruling_date: orgData.organization?.ruling_date || "",
    tax_year: year,
    total_revenue: latest.totrevenue || 0,
    total_expenses: latest.totfuncexpns || 0,
    net_assets: latest.totassetsend || 0,
    total_contributions: latest.totcntrbgfts || 0,
    program_service_revenue: latest.totprgmrevnue || 0,
    investment_income: latest.invstmntinc || 0,
    officer_compensation: latest.compnsatncurrofcr || 0,
    num_employees: latest.totemployee || 0,
    lobbying_expenses: latest.lbbyexpnsact || 0,
    political_expenditures: latest.polactexpnd || 0,
    grants_paid: latest.grntstogovt || 0,
    filing_count: filings.length,
    latest_filing_url: latest.pdf_url || null,
  }
}

/**
 * Format dollar amount for display.
 */
function fmtMoney(n) {
  if (!n || n === 0) return "$0"
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

// ── Profile Processing ──────────────────────────────────

async function processOrg(profile, einCache) {
  const name = extractName(profile.title)
  const result = {
    name,
    file: profile.filePath,
    status: "skipped",
    ein: null,
    financials: null,
  }

  console.log(`  → ${name}`)

  // Check cache for EIN
  const cachedEin = einCache.get(name)
  let ein = cachedEin
  let orgData = null

  if (!ein) {
    // Search for org
    try {
      const matches = await searchOrg(name)
      if (matches.length === 0) {
        console.log(`    ✗ Not found in ProPublica`)
        result.status = "not-found"
        return result
      }

      const match = bestMatch(matches, name)
      if (!match) {
        result.status = "not-found"
        return result
      }

      ein = String(match.ein).replace(/-/g, "")
      einCache.set(name, ein, CACHE_TTL * 24) // cache EIN for a long time
      console.log(`    Found: ${match.name} (EIN: ${ein})`)
    } catch (err) {
      console.log(`    ✗ Search error: ${err.message}`)
      result.status = "error"
      return result
    }
  } else {
    console.log(`    Cached EIN: ${ein}`)
  }

  result.ein = ein

  // Get full org data
  try {
    orgData = await getOrg(ein)
    if (!orgData) {
      console.log(`    ✗ No data for EIN ${ein}`)
      result.status = "no-data"
      return result
    }
  } catch (err) {
    console.log(`    ✗ Fetch error: ${err.message}`)
    result.status = "error"
    return result
  }

  // Extract financials
  const fin = extractFinancials(orgData)
  if (!fin) {
    console.log(`    ✗ No 990 filings found`)
    result.status = "no-filings"
    return result
  }

  result.financials = fin
  result.status = "success"

  console.log(`    Revenue:      ${fmtMoney(fin.total_revenue)} (${fin.tax_year})`)
  console.log(`    Expenses:     ${fmtMoney(fin.total_expenses)}`)
  console.log(`    Net Assets:   ${fmtMoney(fin.net_assets)}`)
  console.log(`    Contributions:${fmtMoney(fin.total_contributions)}`)
  if (fin.officer_compensation > 0) {
    console.log(`    Officer Comp: ${fmtMoney(fin.officer_compensation)}`)
  }
  if (fin.lobbying_expenses > 0) {
    console.log(`    Lobbying:     ${fmtMoney(fin.lobbying_expenses)}`)
  }
  if (fin.political_expenditures > 0) {
    console.log(`    Political:    ${fmtMoney(fin.political_expenditures)}`)
  }

  return result
}

// ── Frontmatter Update ──────────────────────────────────

function updateFrontmatter(filePath, updates) {
  let content = fs.readFileSync(filePath, "utf-8")
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return

  let fm = fmMatch[1]
  const today = new Date().toISOString().split("T")[0]

  for (const [key, val] of Object.entries(updates)) {
    if (val === null || val === undefined) continue
    const regex = new RegExp(`^${key}:.*$`, "m")
    const line = typeof val === "number" ? `${key}: ${val}` : `${key}: "${val}"`
    if (regex.test(fm)) {
      fm = fm.replace(regex, line)
    } else {
      fm += `\n${line}`
    }
  }

  // Update last-updated
  if (/^last-updated:/.test(fm)) {
    fm = fm.replace(/^last-updated:.*$/m, `last-updated: ${today}`)
  } else {
    fm += `\nlast-updated: ${today}`
  }

  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${fm}\n---`)
  fs.writeFileSync(filePath, content, "utf-8")
}

// ── Markdown Section Generator ──────────────────────────

function generateFinancialSection(fin) {
  const lines = []
  lines.push(`### Financial Overview (990 Filing — ${fin.tax_year})`)
  lines.push(`<!-- auto:propublica-990 start -->`)
  lines.push(``)
  lines.push(`| Metric | Amount |`)
  lines.push(`|--------|--------|`)
  lines.push(`| Total Revenue | ${fmtMoney(fin.total_revenue)} |`)
  lines.push(`| Total Contributions | ${fmtMoney(fin.total_contributions)} |`)
  if (fin.program_service_revenue > 0) {
    lines.push(`| Program Service Revenue | ${fmtMoney(fin.program_service_revenue)} |`)
  }
  if (fin.investment_income > 0) {
    lines.push(`| Investment Income | ${fmtMoney(fin.investment_income)} |`)
  }
  lines.push(`| Total Expenses | ${fmtMoney(fin.total_expenses)} |`)
  lines.push(`| Net Assets | ${fmtMoney(fin.net_assets)} |`)
  if (fin.officer_compensation > 0) {
    lines.push(`| Officer Compensation | ${fmtMoney(fin.officer_compensation)} |`)
  }
  if (fin.num_employees > 0) {
    lines.push(`| Employees | ${fin.num_employees} |`)
  }
  if (fin.lobbying_expenses > 0) {
    lines.push(`| Lobbying Expenses | ${fmtMoney(fin.lobbying_expenses)} |`)
  }
  if (fin.political_expenditures > 0) {
    lines.push(`| Political Expenditures | ${fmtMoney(fin.political_expenditures)} |`)
  }
  lines.push(``)
  lines.push(`- [Source: ProPublica Nonprofit Explorer — EIN ${fin.ein}](https://projects.propublica.org/nonprofits/organizations/${fin.ein}) (Tier 1)`)
  if (fin.latest_filing_url) {
    lines.push(`- [Full 990 Filing (PDF)](${fin.latest_filing_url}) (Tier 1)`)
  }
  lines.push(``)
  lines.push(`<!-- auto:propublica-990 end -->`)
  return lines.join("\n")
}

function insertOrUpdateSection(filePath, sectionContent) {
  let content = fs.readFileSync(filePath, "utf-8")

  // Check for existing auto-generated section
  const autoStart = content.indexOf("<!-- auto:propublica-990 start -->")
  const autoEnd = content.indexOf("<!-- auto:propublica-990 end -->")

  if (autoStart !== -1 && autoEnd !== -1) {
    // Replace existing section (find the h3 before auto start)
    const beforeAuto = content.lastIndexOf("\n###", autoStart)
    const start = beforeAuto !== -1 ? beforeAuto + 1 : autoStart
    const end = autoEnd + "<!-- auto:propublica-990 end -->".length
    content = content.slice(0, start) + sectionContent + content.slice(end)
  } else {
    // Insert before Sources section if it exists
    const sourcesIdx = content.indexOf("\n### Sources")
    if (sourcesIdx !== -1) {
      content = content.slice(0, sourcesIdx) + "\n" + sectionContent + "\n" + content.slice(sourcesIdx)
    } else {
      // Append before footer status tag
      const statusIdx = content.indexOf("\ncontent-readiness::")
      if (statusIdx !== -1) {
        content = content.slice(0, statusIdx) + "\n" + sectionContent + "\n" + content.slice(statusIdx)
      } else {
        content += "\n\n" + sectionContent + "\n"
      }
    }
  }

  fs.writeFileSync(filePath, content, "utf-8")
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — ProPublica Nonprofit Pipeline")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update vault)" : "DRY RUN (preview only)"}`)
  console.log(`  API: ProPublica Nonprofit Explorer (no key needed)`)
  if (PROFILE_FILTER) console.log(`  Filter: "${PROFILE_FILTER}"`)
  if (LIMIT) console.log(`  Limit: ${LIMIT} profiles per run`)
  console.log()

  const einCache = new FileCache("propublica-ein")

  // Load profiles — target donors, PACs, corporations, think tanks
  console.log("  Loading vault profiles...")
  const { donors } = loadProfiles({
    types: ["donor", "pac", "corporation", "think-tank"],
  })

  let targets = donors
  if (PROFILE_FILTER) {
    const filter = PROFILE_FILTER.toLowerCase()
    targets = donors.filter((d) =>
      extractName(d.title).toLowerCase().includes(filter)
    )
  }
  if (LIMIT) {
    targets = targets.slice(0, LIMIT)
  }

  console.log(`  Organizations to scan: ${targets.length}`)
  console.log()

  const results = []
  let successCount = 0
  let errorCount = 0

  for (const profile of targets) {
    try {
      const result = await processOrg(profile, einCache)
      results.push(result)

      if (result.status === "success" && result.financials) {
        successCount++

        if (WRITE) {
          // Update frontmatter with financial data
          const fin = result.financials
          const updates = {
            ein: fin.ein,
            "annual-revenue": fmtMoney(fin.total_revenue),
            "net-assets": fmtMoney(fin.net_assets),
            "tax-year": String(fin.tax_year),
          }
          if (fin.num_employees > 0) {
            updates["employee-count"] = fin.num_employees
          }

          updateFrontmatter(profile.filePath, updates)

          // Insert/update financial section in markdown
          const section = generateFinancialSection(fin)
          insertOrUpdateSection(profile.filePath, section)

          console.log(`    ✓ Written to vault`)
        }
      } else {
        errorCount++
      }
    } catch (err) {
      console.log(`    ✗ Error: ${err.message}`)
      errorCount++
    }

    console.log()
  }

  // Summary
  console.log("═══════════════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Scanned:    ${results.length}`)
  console.log(`  Found:      ${successCount}`)
  console.log(`  Not found:  ${results.filter((r) => r.status === "not-found").length}`)
  console.log(`  No filings: ${results.filter((r) => r.status === "no-filings").length}`)
  console.log(`  Errors:     ${errorCount}`)
  console.log(`  API calls:  ${limiter.requestCount}`)
  console.log()

  if (successCount > 0 && !WRITE) {
    console.log("  Run with --write to update the vault.")
  }

  // Save cache
  einCache.save()
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
