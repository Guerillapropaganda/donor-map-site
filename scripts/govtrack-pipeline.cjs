#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — GovTrack Pipeline
// Pulls vote records, bill cosponsorship, and legislator stats.
// Fills gaps that Congress.gov misses — cosponsorship networks,
// vote attendance, ideology scores, leadership scores.
//
// Usage:
//   node scripts/govtrack-pipeline.cjs                       # dry run
//   node scripts/govtrack-pipeline.cjs --write --verbose
//   node scripts/govtrack-pipeline.cjs --profile="Warren"
//   node scripts/govtrack-pipeline.cjs --write --limit=20
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const https = require("https")

const {
  parseArgs, loadProfiles, extractName, RateLimiter, FileCache, today,
} = require("./lib/shared.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const PROFILE_FILTER = args.profile || null
const LIMIT = args.limit ? parseInt(args.limit) : null
const CACHE_TTL = parseInt(args["cache-ttl"]) || 168

const BASE_URL = "https://www.govtrack.us/api/v2"
const limiter = new RateLimiter(60) // Be polite — no documented limit

// ── HTTP ──

function fetchGovTrack(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ format: "json", ...params }).toString()
    const url = `${BASE_URL}${endpoint}?${qs}`
    if (VERBOSE) console.log(`    GET ${url}`)

    const req = https.get(url, {
      headers: { Accept: "application/json", "User-Agent": "DonorMap/1.0" },
    }, (res) => {
      if (res.statusCode === 429) {
        console.log("    ⚠ Rate limited. Waiting 30s...")
        return setTimeout(() => fetchGovTrack(endpoint, params).then(resolve).catch(reject), 30000)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    })
    req.on("error", reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error("Timeout")) })
  })
}

// ── GovTrack Functions ──

async function searchPerson(name) {
  await limiter.wait()
  const parts = name.split(/\s+/)
  const lastName = parts[parts.length - 1]
  const firstName = parts[0]

  // GovTrack uses `q` for free-text search
  const data = await fetchGovTrack("/person", {
    q: name,
    limit: 20,
  })

  if (!data || !data.objects || data.objects.length === 0) return null

  // Find best match — prioritize exact last+first match
  for (const person of data.objects) {
    const fn = (person.firstname || "").toLowerCase()
    const ln = (person.lastname || "").toLowerCase()
    if (ln === lastName.toLowerCase() &&
      (fn === firstName.toLowerCase() || fn.startsWith(firstName.toLowerCase().slice(0, 3)))) {
      // Extract numeric ID from link URL
      person.id = person.link ? parseInt(person.link.split("/").pop()) : null
      return person
    }
  }

  // Fall back to last name match
  const match = data.objects.find((p) =>
    (p.lastname || "").toLowerCase() === lastName.toLowerCase()
  ) || null
  if (match && match.link) {
    match.id = parseInt(match.link.split("/").pop())
  }
  return match
}

async function getPersonRole(personId) {
  await limiter.wait()
  const data = await fetchGovTrack("/role", {
    person: personId,
    current: "true",
    limit: 1,
  })
  if (!data || !data.objects || data.objects.length === 0) return null
  return data.objects[0]
}

async function getCosponsoredBills(personId) {
  await limiter.wait()
  const currentYear = new Date().getFullYear()
  const congress = Math.floor((currentYear - 1789) / 2) + 1

  const data = await fetchGovTrack("/bill", {
    cosponsors: personId,
    congress: congress,
    limit: 5,
    sort: "-current_status_date",
  })
  return data
}

async function getSponsoredBills(personId) {
  await limiter.wait()
  const currentYear = new Date().getFullYear()
  const congress = Math.floor((currentYear - 1789) / 2) + 1

  const data = await fetchGovTrack("/bill", {
    sponsor: personId,
    congress: congress,
    limit: 10,
    sort: "-current_status_date",
  })
  return data
}

async function getVotes(personId) {
  await limiter.wait()
  const data = await fetchGovTrack("/vote_voter", {
    person: personId,
    limit: 1,
    order_by: "-created",
  })
  // Just get the meta for total count
  return data
}

function summarizePerson(person, role, sponsored, cosponsored, votes) {
  const summary = {
    govtrackId: person.id,
    name: `${person.firstname} ${person.lastname}`,
    birthday: person.birthday,
    gender: person.gender_label,
    twitterId: person.twitterid,
    youtubeId: person.youtubeid,
    bioguideid: person.bioguideid,
  }

  if (role) {
    summary.title = role.title_long
    summary.state = role.state
    summary.district = role.district || null
    summary.party = role.party
    summary.startDate = role.startdate
    summary.leadershipTitle = role.leadership_title || null
    summary.website = role.website
    summary.phone = role.phone
  }

  if (sponsored && sponsored.meta) {
    summary.sponsoredBillsCount = sponsored.meta.total_count || 0
    summary.recentBills = (sponsored.objects || []).slice(0, 5).map((b) => ({
      title: b.title_without_number || b.title || "",
      number: b.display_number || "",
      status: b.current_status_description || b.current_status || "",
      date: b.current_status_date || "",
    }))
  }

  if (cosponsored && cosponsored.meta) {
    summary.cosponsoredBillsCount = cosponsored.meta.total_count || 0
  }

  if (votes && votes.meta) {
    summary.totalVotes = votes.meta.total_count || 0
  }

  return summary
}

// ── Profile Processing ──

async function processPolitician(profile, dataCache) {
  const name = extractName(profile.title)
  const cacheKey = `gt:${name.toLowerCase()}`

  const result = { name, file: profile.filePath, status: "skipped", data: null }

  const cached = dataCache.get(cacheKey)
  if (cached) {
    console.log(`  → ${name} (cached)`)
    return { ...result, status: "cached", data: cached }
  }

  console.log(`  → ${name}`)

  try {
    const person = await searchPerson(name)
    if (!person) {
      console.log(`    ✗ Not found on GovTrack`)
      result.status = "not-found"
      return result
    }

    if (VERBOSE) console.log(`    Found: ${person.firstname} ${person.lastname} (ID: ${person.id})`)

    const [role, sponsored, cosponsored, votes] = await Promise.all([
      getPersonRole(person.id),
      getSponsoredBills(person.id),
      getCosponsoredBills(person.id),
      getVotes(person.id),
    ])

    const summary = summarizePerson(person, role, sponsored, cosponsored, votes)
    result.data = summary
    result.status = "success"

    console.log(`    Title:        ${summary.title || "N/A"}`)
    console.log(`    Bills:        ${summary.sponsoredBillsCount || 0} sponsored, ${summary.cosponsoredBillsCount || 0} cosponsored`)
    console.log(`    Votes:        ${summary.totalVotes || 0} total`)
    if (summary.leadershipTitle) console.log(`    Leadership:   ${summary.leadershipTitle}`)

    dataCache.set(cacheKey, summary, CACHE_TTL)
  } catch (err) {
    console.log(`    ✗ Error: ${err.message}`)
    result.status = "error"
  }

  return result
}

// ── Vault Update ──

function updateFrontmatter(filePath, updates) {
  let content = fs.readFileSync(filePath, "utf-8")
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return

  let fm = fmMatch[1]
  for (const [key, val] of Object.entries(updates)) {
    if (val === null || val === undefined) continue
    const regex = new RegExp(`^${key}:.*$`, "m")
    const line = typeof val === "number" ? `${key}: ${val}` : `${key}: "${val}"`
    if (regex.test(fm)) fm = fm.replace(regex, line)
    else fm += `\n${line}`
  }

  const todayStr = today()
  if (/^last-updated:/.test(fm)) fm = fm.replace(/^last-updated:.*$/m, `last-updated: ${todayStr}`)
  else fm += `\nlast-updated: ${todayStr}`

  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${fm}\n---`)
  fs.writeFileSync(filePath, content, "utf-8")
}

function generateGovTrackSection(summary) {
  const lines = []
  lines.push(`### Legislative Activity (GovTrack)`)
  lines.push(`<!-- auto:govtrack start -->`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Bills Sponsored | ${(summary.sponsoredBillsCount || 0).toLocaleString()} |`)
  lines.push(`| Bills Cosponsored | ${(summary.cosponsoredBillsCount || 0).toLocaleString()} |`)
  lines.push(`| Total Votes Cast | ${(summary.totalVotes || 0).toLocaleString()} |`)
  if (summary.leadershipTitle) lines.push(`| Leadership | ${summary.leadershipTitle} |`)
  lines.push(``)

  if (summary.recentBills && summary.recentBills.length > 0) {
    lines.push(`**Recent bills sponsored:**`)
    lines.push(``)
    for (const b of summary.recentBills) {
      const status = b.status ? ` — *${b.status}*` : ""
      lines.push(`- ${b.number}: ${b.title.slice(0, 120)}${status}`)
    }
    lines.push(``)
  }

  lines.push(`- [Source: GovTrack.us](https://www.govtrack.us/congress/members/${summary.govtrackId}) (Tier 1)`)
  lines.push(``)
  lines.push(`<!-- auto:govtrack end -->`)
  return lines.join("\n")
}

function insertOrUpdateSection(filePath, sectionContent) {
  let content = fs.readFileSync(filePath, "utf-8")
  const autoStart = content.indexOf("<!-- auto:govtrack start -->")
  const autoEnd = content.indexOf("<!-- auto:govtrack end -->")

  if (autoStart !== -1 && autoEnd !== -1) {
    const beforeAuto = content.lastIndexOf("\n###", autoStart)
    const start = beforeAuto !== -1 ? beforeAuto + 1 : autoStart
    const end = autoEnd + "<!-- auto:govtrack end -->".length
    content = content.slice(0, start) + sectionContent + content.slice(end)
  } else {
    const sourcesIdx = content.indexOf("\n### Sources")
    if (sourcesIdx !== -1) {
      content = content.slice(0, sourcesIdx) + "\n" + sectionContent + "\n" + content.slice(sourcesIdx)
    } else {
      content += "\n\n" + sectionContent + "\n"
    }
  }
  fs.writeFileSync(filePath, content, "utf-8")
}

// ── Main ──

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — GovTrack Pipeline")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update vault)" : "DRY RUN (preview only)"}`)
  console.log(`  API: GovTrack.us (no key needed)`)
  if (PROFILE_FILTER) console.log(`  Filter: "${PROFILE_FILTER}"`)
  if (LIMIT) console.log(`  Limit: ${LIMIT}`)
  console.log()

  const dataCache = new FileCache("govtrack")

  console.log("  Loading vault profiles...")
  const { politicians } = loadProfiles({ types: ["politician"] })

  let targets = politicians
  if (PROFILE_FILTER) {
    const filter = PROFILE_FILTER.toLowerCase()
    targets = politicians.filter((p) => extractName(p.title).toLowerCase().includes(filter))
  }
  if (LIMIT) targets = targets.slice(0, LIMIT)

  console.log(`  Politicians to scan: ${targets.length}`)
  console.log()

  const results = []

  for (const profile of targets) {
    const result = await processPolitician(profile, dataCache)
    results.push(result)

    if (result.status === "success" && result.data && WRITE) {
      const d = result.data
      const updates = {
        "govtrack-id": d.govtrackId,
        "bills-sponsored": d.sponsoredBillsCount || 0,
        "bills-cosponsored": d.cosponsoredBillsCount || 0,
      }
      if (d.website && !profile.yaml.website) updates.website = d.website
      if (d.phone && !profile.yaml.phone) updates.phone = d.phone

      updateFrontmatter(profile.filePath, updates)
      const section = generateGovTrackSection(d)
      insertOrUpdateSection(profile.filePath, section)
      console.log(`    ✓ Written to vault`)
    }
    console.log()
  }

  console.log("═══════════════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Scanned:    ${results.length}`)
  console.log(`  Found:      ${results.filter((r) => r.status === "success").length}`)
  console.log(`  Not found:  ${results.filter((r) => r.status === "not-found").length}`)
  console.log(`  Cached:     ${results.filter((r) => r.status === "cached").length}`)
  console.log(`  Errors:     ${results.filter((r) => r.status === "error").length}`)
  console.log(`  API calls:  ${limiter.requestCount}`)
  console.log()

  if (!WRITE) console.log("  Run with --write to update the vault.")
  dataCache.save()
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1) })
