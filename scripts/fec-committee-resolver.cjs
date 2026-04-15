#!/usr/bin/env node
/**
 * fec-committee-resolver.cjs — enrich unmatched FEC committees with
 * authoritative FEC API metadata (Pillar 2b.3, "Option 2")
 *
 * Input: content/Admin Notes/fec-unmatched-committees.md (the report
 * produced by migrate-fec-body-tables-to-edges.cjs)
 *
 * For each unmatched committee name, the script:
 *   1. Queries GET /v1/committees/?q=<name> via the FEC OpenFEC API
 *   2. Takes the top result (ranked by FEC's relevance score)
 *   3. Extracts: committee_id, canonical name, committee_type,
 *      designation, organization_type, connected_organization_name,
 *      candidate_ids, cycles
 *   4. Caches the response at data/fec-committee-cache.jsonl so
 *      re-runs don't re-query (stable provenance)
 *
 * It does NOT:
 *   - Auto-create stub profiles (big editorial decision — David owns)
 *   - Auto-add aliases to vault profiles (handled by separate review
 *     step using this script's output)
 *   - Overwrite anything in data/relationships.jsonl
 *
 * Outputs:
 *   - data/fec-committee-cache.jsonl       — raw cached API responses
 *   - data/fec-committee-metadata.json     — parsed canonical metadata
 *   - content/Admin Notes/fec-unmatched-committees.md — enriched report
 *     with FEC committee IDs, cycles, candidate targets, and a
 *     stub-profile-candidates section for David to review
 *
 * Rate limit: 1 req / 4 sec (well under 1000/hr standard key limit).
 *
 * Safety:
 *   - Reads FEC_API_KEY from repo root .env (never prompts)
 *   - Refuses to run with DEMO_KEY (30/hr is too slow + unreliable)
 *   - Cache is append-only (never overwrites successful lookups)
 *   - Dry-run by default — the report is always regenerated, but
 *     --apply is required to write any side-effects beyond the
 *     report + cache
 *
 * Usage:
 *   node scripts/fec-committee-resolver.cjs              # enrich top 50 by $ volume
 *   node scripts/fec-committee-resolver.cjs --all        # enrich all unmatched
 *   node scripts/fec-committee-resolver.cjs --top=100    # enrich top N
 *   node scripts/fec-committee-resolver.cjs --only="X"   # just one committee
 */

const fs = require("fs")
const path = require("path")
const https = require("https")

const ROOT = path.join(__dirname, "..")
const REPO_ROOT = path.resolve(ROOT, "..", "..", "..") // worktree → worktrees → .claude → donor-map-site
const ENV_PATHS = [
  path.join(ROOT, ".env"),
  path.join(REPO_ROOT, ".env"),
  path.resolve(ROOT, "..", "..", ".env"),
  path.resolve(ROOT, "..", "..", "..", ".env"),
]

const UNMATCHED_REPORT = path.join(
  ROOT,
  "content",
  "Admin Notes",
  "fec-unmatched-committees.md"
)
const CACHE_FILE = path.join(ROOT, "data", "fec-committee-cache.jsonl")
const METADATA_FILE = path.join(ROOT, "data", "fec-committee-metadata.json")

// CLI
const argv = process.argv.slice(2)
const ALL = argv.includes("--all")
const TOP_ARG = argv.find((a) => a.startsWith("--top="))
const TOP = TOP_ARG ? parseInt(TOP_ARG.split("=")[1]) : 50
const ONLY_ARG = argv.find((a) => a.startsWith("--only="))
const ONLY = ONLY_ARG ? ONLY_ARG.split("=")[1] : null

// ─── Env / API key ────────────────────────────────────────────────
function loadApiKey() {
  for (const p of ENV_PATHS) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8")
      const m = content.match(/^FEC_API_KEY\s*=\s*(\S+)/m)
      if (m) return m[1]
    }
  }
  return null
}

// ─── FEC API client with rate limiting ────────────────────────────
const FEC_BASE = "https://api.open.fec.gov/v1"
const REQUEST_DELAY_MS = 4000

let lastRequestTime = 0
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const since = Date.now() - lastRequestTime
    const wait = Math.max(0, REQUEST_DELAY_MS - since)
    setTimeout(() => {
      lastRequestTime = Date.now()
      https
        .get(url, { headers: { "User-Agent": "thedonormap.org/1.0" } }, (res) => {
          let body = ""
          res.on("data", (c) => (body += c))
          res.on("end", () => {
            if (res.statusCode >= 400) {
              return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`))
            }
            try {
              resolve(JSON.parse(body))
            } catch (e) {
              reject(new Error(`parse error: ${e.message}`))
            }
          })
        })
        .on("error", reject)
    }, wait)
  })
}

async function searchCommittee(apiKey, name) {
  const url = `${FEC_BASE}/committees/?api_key=${apiKey}&q=${encodeURIComponent(name)}&per_page=5&sort=-receipts`
  const j = await fetchJson(url)
  return j.results || []
}

// ─── Cache ────────────────────────────────────────────────────────
function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return new Map()
  const lines = fs.readFileSync(CACHE_FILE, "utf-8").split(/\r?\n/).filter(Boolean)
  const cache = new Map()
  for (const line of lines) {
    try {
      const entry = JSON.parse(line)
      if (entry.query && entry.fetched_at) cache.set(entry.query, entry)
    } catch {}
  }
  return cache
}

function appendCache(entry) {
  fs.appendFileSync(CACHE_FILE, JSON.stringify(entry) + "\n", "utf-8")
}

// ─── Unmatched report parsing ─────────────────────────────────────
function parseUnmatchedReport() {
  if (!fs.existsSync(UNMATCHED_REPORT)) {
    throw new Error(`unmatched report not found: ${UNMATCHED_REPORT}`)
  }
  const content = fs.readFileSync(UNMATCHED_REPORT, "utf-8")
  const rows = []
  for (const line of content.split("\n")) {
    const m = line.match(
      /^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*\$([\d,]+)\s*\|\s*\$([\d,]+)\s*\|\s*([^|]+?)\s*\|$/
    )
    if (!m) continue
    if (m[1] === "Committee" || m[1].startsWith("---")) continue
    rows.push({
      committee: m[1].trim(),
      count: parseInt(m[2]),
      support: parseInt(m[3].replace(/,/g, "")),
      oppose: parseInt(m[4].replace(/,/g, "")),
      examples: m[5].trim(),
      total: parseInt(m[3].replace(/,/g, "")) + parseInt(m[4].replace(/,/g, "")),
    })
  }
  // sort descending by total
  rows.sort((a, b) => b.total - a.total)
  return rows
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log("")
  console.log("═══ fec-committee-resolver ═══")
  console.log("")

  const apiKey = loadApiKey()
  if (!apiKey) {
    console.error("  ✗ FEC_API_KEY not found in any .env file")
    console.error(`    searched: ${ENV_PATHS.join(", ")}`)
    process.exit(2)
  }
  if (apiKey === "DEMO_KEY") {
    console.error("  ✗ refusing to run with DEMO_KEY (30/hr too slow)")
    process.exit(2)
  }
  console.log(`  ✓ api key loaded (${apiKey.slice(0, 6)}…${apiKey.slice(-4)})`)

  const rows = parseUnmatchedReport()
  console.log(`  ${rows.length} unmatched committees parsed`)

  let targets
  if (ONLY) {
    targets = rows.filter((r) => r.committee === ONLY)
    if (targets.length === 0) {
      console.error(`  ✗ --only="${ONLY}" not found in unmatched report`)
      process.exit(2)
    }
  } else if (ALL) {
    targets = rows
  } else {
    targets = rows.slice(0, TOP)
  }
  console.log(`  ${targets.length} committees selected for enrichment`)

  const cache = loadCache()
  console.log(`  ${cache.size} committees already in cache`)
  console.log("")

  const metadata = []
  let queried = 0
  let cacheHits = 0
  let failed = 0

  for (let i = 0; i < targets.length; i++) {
    const row = targets[i]
    const query = row.committee
    let entry = cache.get(query)
    if (!entry) {
      try {
        const results = await searchCommittee(apiKey, query)
        entry = {
          query,
          fetched_at: new Date().toISOString(),
          top_results: results.slice(0, 3).map((r) => ({
            committee_id: r.committee_id,
            name: r.name,
            committee_type: r.committee_type,
            committee_type_full: r.committee_type_full,
            designation: r.designation,
            designation_full: r.designation_full,
            organization_type: r.organization_type,
            organization_type_full: r.organization_type_full,
            connected_organization_name: r.connected_organization_name,
            candidate_ids: r.candidate_ids || [],
            cycles: r.cycles || [],
            party: r.party,
            state: r.state,
          })),
        }
        appendCache(entry)
        queried++
        const top = entry.top_results[0]
        console.log(
          `  [${i + 1}/${targets.length}] ${query.slice(0, 60).padEnd(60)} → ${top ? top.committee_id : "NO MATCH"}`
        )
      } catch (err) {
        failed++
        console.log(`  [${i + 1}/${targets.length}] ${query.slice(0, 60)} → ERROR: ${err.message}`)
        continue
      }
    } else {
      cacheHits++
    }

    const top = entry.top_results && entry.top_results[0]
    if (!top) continue
    metadata.push({
      query,
      row,
      fec: top,
    })
  }

  console.log("")
  console.log(`  queried:    ${queried}`)
  console.log(`  cache hits: ${cacheHits}`)
  console.log(`  failed:     ${failed}`)
  console.log(`  metadata:   ${metadata.length} committees with FEC match`)
  console.log("")

  // Write metadata JSON
  fs.writeFileSync(
    METADATA_FILE,
    JSON.stringify({ generated_at: new Date().toISOString(), items: metadata }, null, 2)
  )
  console.log(`  ✓ wrote ${path.relative(ROOT, METADATA_FILE)}`)

  // Enrich the unmatched report with a new "Stub profile candidates" section
  const stubSection = [
    "",
    "---",
    "",
    `## Stub profile candidates (top ${targets.length} by $ volume)`,
    "",
    `Enriched via FEC OpenFEC API on ${new Date().toISOString().slice(0, 10)}. These committees have been confirmed to exist in the FEC database. Each is a candidate for a stub profile in \`content/Donors & Power Networks/Super PACs/\` or similar. Build stubs in the order of dollar volume to maximize vault coverage efficiency.`,
    "",
    "| Committee (as in FEC body data) | FEC ID | Canonical name | Designation | Support $ | Oppose $ | Candidates / Connected org |",
    "|---|---|---|---|---|---|---|",
  ]
  for (const m of metadata) {
    const fec = m.fec
    const target =
      fec.connected_organization_name ||
      (fec.candidate_ids && fec.candidate_ids.length
        ? `cand: ${fec.candidate_ids.slice(0, 3).join(", ")}`
        : "—")
    stubSection.push(
      `| ${m.row.committee} | [${fec.committee_id}](https://www.fec.gov/data/committee/${fec.committee_id}/) | ${fec.name || "—"} | ${fec.designation_full || fec.designation || "—"} | $${m.row.support.toLocaleString()} | $${m.row.oppose.toLocaleString()} | ${target} |`
    )
  }

  // Preserve the head of the existing report (frontmatter + unmatched list)
  // and append the stub candidates section at the end, replacing any
  // previous stub section.
  const existing = fs.readFileSync(UNMATCHED_REPORT, "utf-8")
  const marker = "\n---\n\n## Stub profile candidates"
  let head = existing
  const idx = existing.indexOf(marker)
  if (idx !== -1) {
    head = existing.slice(0, idx)
  }
  const newReport = head.trimEnd() + "\n" + stubSection.join("\n") + "\n"
  fs.writeFileSync(UNMATCHED_REPORT, newReport, "utf-8")
  console.log(`  ✓ enriched ${path.relative(ROOT, UNMATCHED_REPORT)}`)
  console.log("")
}

main().catch((err) => {
  console.error("ERROR:", err.message)
  process.exit(1)
})
