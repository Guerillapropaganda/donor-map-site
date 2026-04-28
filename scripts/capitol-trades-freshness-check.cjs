#!/usr/bin/env node
/**
 * capitol-trades-freshness-check.cjs
 *
 * Harness check (ADR-0021) for the STOCK Act PTR pipeline output.
 * Reads data/financial-disclosures.json's stats.lastUpdated and flags
 * if older than 36 hours (the pipeline runs daily at 06:00 UTC).
 *
 * Without this check, a silent pipeline failure (auth issue, scraper
 * regression, network outage) would leave the /capitol-trades surface
 * showing increasingly stale data with no operational signal.
 *
 * Usage:
 *   node scripts/capitol-trades-freshness-check.cjs        # human-readable
 *   node scripts/capitol-trades-freshness-check.cjs --json # for harness
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const SOURCE_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const STALE_HOURS = 36

const JSON_OUT = process.argv.includes("--json")

function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    const out = {
      findings_count: 1,
      notes: "data/financial-disclosures.json missing — pipeline never ran or output was deleted",
    }
    if (JSON_OUT) console.log(JSON.stringify(out))
    else console.log(out.notes)
    return
  }

  let raw
  try { raw = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf-8")) }
  catch (e) {
    const out = {
      findings_count: 1,
      notes: `data/financial-disclosures.json is unparseable: ${e.message}`,
    }
    if (JSON_OUT) console.log(JSON.stringify(out))
    else console.log(out.notes)
    return
  }

  const lastUpdated = raw?.stats?.lastUpdated
  if (typeof lastUpdated !== "string") {
    const out = {
      findings_count: 1,
      notes: "stats.lastUpdated missing from financial-disclosures.json — pipeline output schema regressed",
    }
    if (JSON_OUT) console.log(JSON.stringify(out))
    else console.log(out.notes)
    return
  }

  const ts = new Date(lastUpdated).getTime()
  if (!Number.isFinite(ts)) {
    const out = {
      findings_count: 1,
      notes: `stats.lastUpdated unparseable: ${lastUpdated}`,
    }
    if (JSON_OUT) console.log(JSON.stringify(out))
    else console.log(out.notes)
    return
  }

  const ageMs = Date.now() - ts
  const ageHours = ageMs / (60 * 60 * 1000)
  const stale = ageHours > STALE_HOURS

  const out = {
    findings_count: stale ? 1 : 0,
    last_updated: lastUpdated,
    age_hours: Math.round(ageHours * 10) / 10,
    stale_threshold_hours: STALE_HOURS,
    stats: raw.stats,
    notes: stale
      ? `STOCK Act pipeline output is ${Math.round(ageHours)}h old (threshold ${STALE_HOURS}h). Pipeline runs daily at 06:00 UTC. Check scripts/financial-disclosures-pipeline.cjs and recent logs.`
      : `STOCK Act pipeline last ran ${Math.round(ageHours)}h ago — within ${STALE_HOURS}h freshness window`,
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(out))
  } else {
    console.log(`Capitol Trades freshness check`)
    console.log(`  Last updated: ${lastUpdated} (${out.age_hours}h ago)`)
    console.log(`  Threshold:    ${STALE_HOURS}h`)
    console.log(`  Status:       ${stale ? "⚠ STALE" : "✓ fresh"}`)
    console.log(`  Notes: ${out.notes}`)
  }
}

main()
