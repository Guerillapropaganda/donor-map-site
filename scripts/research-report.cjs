#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — Unified Research Report
// Reads output from url-checker, fec-pipeline, and congress-pipeline
// and generates one actionable intelligence report.
//
// Usage:
//   node scripts/research-report.cjs                 # generate from latest data
//   node scripts/research-report.cjs --since=7       # only changes from last N days
//   node scripts/research-report.cjs --format=md     # markdown only
//   node scripts/research-report.cjs --format=json   # JSON only
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const { parseArgs, ReportWriter, REPORTS_DIR, CONTENT_DIR, loadProfiles,
        ensureDir, today } = require("./lib/shared.cjs")

// ── Config ──
const args = parseArgs()
const SINCE_DAYS = parseInt(args.since) || null
const FORMAT = args.format || "both"

// ── Load Pipeline Reports ─────────────────────────────

function loadReport(name) {
  const filePath = path.join(REPORTS_DIR, `${name}.json`)
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return data
  } catch {
    return null
  }
}

function reportAge(report) {
  if (!report?.timestamp) return Infinity
  const age = Date.now() - new Date(report.timestamp).getTime()
  return Math.round(age / (1000 * 60 * 60)) // hours
}

// ── Main ──────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — Research Report Generator")
  console.log("═══════════════════════════════════════════════════\n")

  ensureDir(REPORTS_DIR)

  // Load all pipeline reports
  const urlReport = loadReport("url-check")
  const fecReport = loadReport("fec-pipeline")
  const congressReport = loadReport("congress-pipeline")

  console.log("  Pipeline reports found:")
  console.log(`    URL Checker:      ${urlReport ? `Yes (${reportAge(urlReport)}h ago)` : "Not found — run url-checker.cjs first"}`)
  console.log(`    FEC Pipeline:     ${fecReport ? `Yes (${reportAge(fecReport)}h ago)` : "Not found — run fec-pipeline.cjs first"}`)
  console.log(`    Congress Pipeline: ${congressReport ? `Yes (${reportAge(congressReport)}h ago)` : "Not found — run congress-pipeline.cjs first"}`)

  if (!urlReport && !fecReport && !congressReport) {
    console.log("\n  No pipeline reports found. Run the pipeline scripts first:")
    console.log("    node scripts/url-checker.cjs")
    console.log("    node scripts/fec-pipeline.cjs")
    console.log("    node scripts/congress-pipeline.cjs")
    console.log()
    return
  }

  // Load vault profiles for cross-referencing
  const { all: profiles, byName } = loadProfiles()
  console.log(`\n  Vault profiles loaded: ${profiles.length}`)

  // Build unified report
  const report = new ReportWriter("research-report")

  // ── Executive Summary ───────────────────────────
  const summaryItems = []

  if (urlReport) {
    const dead = urlReport.dead_urls?.length || 0
    const needed = urlReport.url_needed?.length || 0
    summaryItems.push(`**URLs:** ${dead} dead links, ${needed} (URL NEEDED) tags`)
    report.addStat("Dead URLs", dead)
    report.addStat("URL NEEDED tags", needed)
    report.addStat("URL report age", `${reportAge(urlReport)} hours`)
  }

  if (fecReport) {
    const successful = fecReport.results?.filter(r => r.status === "success").length || 0
    const total = fecReport.results?.length || 0
    summaryItems.push(`**FEC:** ${successful}/${total} profiles with data`)
    report.addStat("FEC profiles with data", successful)
    report.addStat("FEC profiles scanned", total)
    report.addStat("FEC report age", `${reportAge(fecReport)} hours`)
  }

  if (congressReport) {
    const successful = congressReport.results?.filter(r => r.status === "success").length || 0
    const total = congressReport.results?.length || 0
    summaryItems.push(`**Congress:** ${successful}/${total} profiles with data`)
    report.addStat("Congress profiles with data", successful)
    report.addStat("Congress profiles scanned", total)
    report.addStat("Congress report age", `${reportAge(congressReport)} hours`)
  }

  report.addSection("Executive Summary", summaryItems.join("\n"))

  // ── Cross-Referenced Profiles ───────────────────
  // Find profiles that appear in BOTH FEC and Congress results
  if (fecReport?.results && congressReport?.results) {
    const fecProfiles = new Map()
    for (const r of fecReport.results) {
      if (r.status === "success") fecProfiles.set(r.profile?.toLowerCase(), r)
    }

    const crossRef = []
    for (const r of congressReport.results) {
      if (r.status === "success" && fecProfiles.has(r.profile?.toLowerCase())) {
        const fec = fecProfiles.get(r.profile.toLowerCase())
        crossRef.push({
          profile: r.profile,
          totalRaised: fec.totalRaised,
          sponsoredBills: r.sponsoredCount,
          cosponsoredBills: r.cosponsoredCount,
          policyAreas: r.policyAreas,
        })
      }
    }

    if (crossRef.length > 0) {
      const details = crossRef
        .sort((a, b) => (b.totalRaised || 0) - (a.totalRaised || 0))
        .slice(0, 20)
        .map(p => {
          const raised = p.totalRaised ? `$${(p.totalRaised / 1000000).toFixed(1)}M raised` : "FEC data available"
          return `**${p.profile}** — ${raised}, ${p.sponsoredBills} sponsored / ${p.cosponsoredBills} cosponsored bills` +
            (p.policyAreas?.length ? `\n  Policy areas: ${p.policyAreas.slice(0, 5).join(", ")}` : "")
        })
      report.addSection("Cross-Referenced: FEC + Congress Data Available", details.join("\n\n"))
    }
  }

  // ── FEC Highlights ──────────────────────────────
  if (fecReport?.results) {
    const topRaisers = fecReport.results
      .filter(r => r.status === "success" && r.totalRaised)
      .sort((a, b) => (b.totalRaised || 0) - (a.totalRaised || 0))
      .slice(0, 15)

    if (topRaisers.length > 0) {
      const details = topRaisers.map(r =>
        `**${r.profile}** (${r.party || "?"}) — $${((r.totalRaised || 0) / 1000000).toFixed(1)}M` +
        (r.candidateId ? ` [${r.candidateId}]` : "")
      )
      report.addSection("Top Fundraisers (FEC Data)", details)
    }

    const notFound = fecReport.results.filter(r => r.status === "not-found")
    if (notFound.length > 0) {
      report.addSection("FEC: Not Found (may need name override)",
        notFound.map(r => `${r.profile}: ${r.error}`))
    }
  }

  // ── Congress Highlights ─────────────────────────
  if (congressReport?.results) {
    const mostActive = congressReport.results
      .filter(r => r.status === "success")
      .sort((a, b) => (b.sponsoredCount || 0) - (a.sponsoredCount || 0))
      .slice(0, 10)

    if (mostActive.length > 0) {
      const details = mostActive.map(r =>
        `**${r.profile}** — ${r.sponsoredCount} sponsored, ${r.cosponsoredCount} cosponsored` +
        (r.policyAreas?.length ? ` | Areas: ${r.policyAreas.slice(0, 3).join(", ")}` : "")
      )
      report.addSection("Most Legislatively Active (Congress.gov)", details)
    }
  }

  // ── URL Health ──────────────────────────────────
  if (urlReport) {
    if (urlReport.dead_urls?.length > 0) {
      const grouped = {}
      for (const d of urlReport.dead_urls) {
        const domain = new URL(d.url).hostname
        if (!grouped[domain]) grouped[domain] = []
        grouped[domain].push(d)
      }
      const details = Object.entries(grouped)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([domain, urls]) =>
          `**${domain}** — ${urls.length} dead URLs\n${urls.slice(0, 3).map(u => `  - ${u.url.slice(0, 80)} (in: ${u.files?.[0] || "?"})`).join("\n")}` +
          (urls.length > 3 ? `\n  ... and ${urls.length - 3} more` : "")
        )
      report.addSection("Dead URLs by Domain", details.join("\n\n"))
    }

    if (urlReport.url_needed?.length > 0) {
      const byFile = {}
      for (const n of urlReport.url_needed) {
        if (!byFile[n.file]) byFile[n.file] = 0
        byFile[n.file]++
      }
      const top = Object.entries(byFile)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([file, count]) => `${file}: ${count} tags`)
      report.addSection("Files with Most (URL NEEDED) Tags", top)
    }
  }

  // ── Stale Profiles ─────────────────────────────
  if (SINCE_DAYS) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - SINCE_DAYS)
    const cutoffStr = cutoff.toISOString().split("T")[0]

    const stale = profiles.filter(p => {
      if (!p.lastUpdated) return true
      return p.lastUpdated < cutoffStr
    })

    if (stale.length > 0) {
      report.addStat("Stale profiles (not updated in " + SINCE_DAYS + " days)", stale.length)
      const staleList = stale
        .sort((a, b) => (a.lastUpdated || "").localeCompare(b.lastUpdated || ""))
        .slice(0, 20)
        .map(p => `${p.title} — last updated: ${p.lastUpdated || "never"} (${p.contentReadiness || "?"})`)
      report.addSection(`Stale Profiles (>${SINCE_DAYS} days)`, staleList)
    }
  }

  // ── Action Items ────────────────────────────────
  const actions = []

  if (urlReport?.dead_urls?.length > 0) {
    actions.push(`Fix ${urlReport.dead_urls.length} dead URLs — run url-fixer skill or replace manually`)
  }
  if (urlReport?.url_needed?.length > 0) {
    actions.push(`Research ${urlReport.url_needed.length} (URL NEEDED) citations — prioritize ready/developed files`)
  }
  if (fecReport?.results?.some(r => r.status === "not-found")) {
    const count = fecReport.results.filter(r => r.status === "not-found").length
    actions.push(`${count} profiles not found in FEC — check names or add overrides to fec-name-overrides.json`)
  }
  if (fecReport?.stats?.["Rate limited"] === "YES — run again later") {
    actions.push("FEC pipeline was rate-limited — run again to complete remaining profiles")
  }

  if (actions.length > 0) {
    report.addSection("Action Items", actions.map((a, i) => `${i + 1}. ${a}`).join("\n"))
  }

  // ── Store cross-reference data ──────────────────
  report.setData("pipeline_ages", {
    url_check: urlReport ? reportAge(urlReport) : null,
    fec_pipeline: fecReport ? reportAge(fecReport) : null,
    congress_pipeline: congressReport ? reportAge(congressReport) : null,
  })

  // Write report
  let paths
  if (FORMAT === "md") {
    paths = { md: report.writeMarkdown() }
  } else if (FORMAT === "json") {
    paths = { json: report.writeJson() }
  } else {
    paths = report.writeBoth()
  }

  // Print summary
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  RESEARCH REPORT GENERATED")
  console.log("═══════════════════════════════════════════════════")
  for (const [fmt, p] of Object.entries(paths)) {
    console.log(`  ${fmt.toUpperCase()}: ${p}`)
  }
  console.log()

  if (actions.length > 0) {
    console.log("  Action Items:")
    for (const a of actions) {
      console.log(`    → ${a}`)
    }
    console.log()
  }
}

main().catch(err => {
  console.error("\n  FATAL:", err.message)
  process.exit(1)
})
