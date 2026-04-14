#!/usr/bin/env node
/**
 * seed-events-from-crypto-votes.cjs — Phase 2 / Query Engine MVP
 *
 * Seeds data/events.jsonl with the crypto legislation vote records from
 * data/crypto-votes.json (produced by the Capitol Trades pipeline in a
 * prior session). This gives the query engine real events to filter on
 * and validates the schema end-to-end before we build more comprehensive
 * event pipelines.
 *
 * Each bill → one event record (type=floor_vote if it had a recorded
 * vote, type=bill_introduction if not). Sponsors → stakeholders.
 * Vote breakdown captured in vote_breakdown field.
 *
 * Usage:
 *   node scripts/seed-events-from-crypto-votes.cjs                 # dry-run
 *   node scripts/seed-events-from-crypto-votes.cjs --write
 *
 * Idempotent: uses external_id (govtrack bill id) to detect already-
 * seeded events and skip.
 */

const fs = require("fs")
const path = require("path")
const store = require("./lib/events-store.cjs")

const WRITE = process.argv.includes("--write")
const DATA_FILE = path.join(__dirname, "..", "data", "crypto-votes.json")

// Normalize a GovTrack-style sponsor name ("Sen. Elizabeth Warren [D-MA]")
// to the bare politician name the vault uses ("Elizabeth Warren"). Without
// this, event stakeholders don't join with politician entity records or
// the monetary edges that use the canonical vault name.
function normalizeSponsorName(raw) {
  if (!raw || typeof raw !== "string") return raw
  let s = raw.trim()
  // Strip leading honorific
  s = s.replace(/^(Sen\.|Senator|Rep\.|Representative|Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, "")
  // Strip trailing "[D-MA]" or "(D-MA)" party/state tag
  s = s.replace(/\s*[\[\(][^\]\)]+[\]\)]\s*$/, "")
  return s.trim()
}

function main() {
  console.log("")
  console.log("═══ seed-events-from-crypto-votes ═══")
  console.log(`  source:   ${DATA_FILE}`)
  console.log(`  dry-run:  ${!WRITE}`)
  console.log("")

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`ERROR: ${DATA_FILE} not found`)
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))

  store.loadEvents()
  const startingCount = store.countEvents()
  const existingExternal = new Set(
    store.queryEvents({}).map((e) => e.external_id).filter(Boolean),
  )

  const stats = { considered: 0, seeded: 0, skipped: 0, errors: 0 }

  const allBills = [...(data.billsWithVotes || []), ...(data.billsWithoutVotes || [])]

  for (const bill of allBills) {
    stats.considered += 1

    const externalKey = `govtrack-bill-${bill.id}`
    if (existingExternal.has(externalKey)) {
      stats.skipped += 1
      continue
    }

    // Choose the most recent / most relevant vote for the event date
    let eventType = "bill_introduction"
    let date = bill.introduced || null
    let outcome = "unknown"
    let obstructionType = "voice_vote" // default for crypto bills — many die in voice votes
    let voteBreakdown = null
    let chamber = null

    if (bill.votes && bill.votes.length) {
      eventType = "floor_vote"
      obstructionType = "floor_vote"
      // Pick the latest vote
      const latest = [...bill.votes].sort((a, b) =>
        (a.date || "").localeCompare(b.date || ""),
      )[bill.votes.length - 1]
      if (latest) {
        date = latest.date || date
        outcome = latest.passed ? "passed" : "failed"
        chamber = latest.chamber ? latest.chamber.toLowerCase() : null
        voteBreakdown = {
          yes: latest.yeas ?? null,
          no: latest.nays ?? null,
          present: null,
          not_voting: latest.not_voting ?? null,
        }
      }
    }

    const sponsors = bill.sponsor ? [normalizeSponsorName(bill.sponsor.name)] : []

    try {
      const eventRec = {
        type: eventType,
        title: `${bill.displayNumber || bill.type + " " + bill.number}: ${bill.title}`,
        date,
        chamber,
        source_url: bill.link || null,
        outcome,
        policy_id: null, // unassigned until Phase 2.75 policies.jsonl exists
        obstruction_type: obstructionType,
        stakeholders: sponsors,
        sector_affected: ["tech-monopoly", "finance-capital"], // crypto ≈ finance + tech
        sponsors,
        vote_breakdown: voteBreakdown,
        external_id: externalKey,
        raw_source: "govtrack",
        editor_notes: `seeded from data/crypto-votes.json`,
      }

      if (WRITE) {
        const rec = store.addEvent(eventRec)
        console.log(`  + ${rec.id}  ${eventType.padEnd(20)} ${bill.displayNumber}: ${bill.title.slice(0, 60)}`)
      } else {
        console.log(`  · DRY  ${eventType.padEnd(20)} ${bill.displayNumber}: ${bill.title.slice(0, 60)}`)
      }
      stats.seeded += 1
    } catch (e) {
      stats.errors += 1
      console.warn(`  ! ${bill.displayNumber}: ${e.message}`)
    }
  }

  const endingCount = store.countEvents()

  console.log("")
  console.log("═══ results ═══")
  console.log(`  bills considered:  ${stats.considered}`)
  console.log(`  seeded:            ${stats.seeded}`)
  console.log(`  skipped (existed): ${stats.skipped}`)
  console.log(`  errors:            ${stats.errors}`)
  console.log(`  store:             ${startingCount} → ${endingCount}  (Δ ${endingCount - startingCount})`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
