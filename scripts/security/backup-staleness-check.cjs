#!/usr/bin/env node
/**
 * backup-staleness-check.cjs — Alert if donor-map-vault backup is stale
 *
 * Queries the GitHub API for the last push date of the private backup
 * repo (donor-map-vault). If > 48 hours old, writes a flag entry to
 * the Attention Queue so David sees it in the /attention surface.
 *
 * Wire into the attention-dispatcher on a 6-hour cadence, or run
 * manually: node scripts/security/backup-staleness-check.cjs
 *
 * Requires: gh CLI authenticated with access to the private repo
 */

const { execSync } = require("child_process")
const path = require("path")

const ROOT = path.resolve(__dirname, "../..")
const STALE_HOURS = 48
const REPO = "Guerillapropaganda/donor-map-vault"

// ── Check backup freshness ──────────────────────────────────────────

function getLastPush() {
  try {
    const raw = execSync(`gh repo view ${REPO} --json pushedAt`, {
      encoding: "utf-8",
      timeout: 30000,
    })
    const data = JSON.parse(raw)
    return new Date(data.pushedAt)
  } catch (e) {
    console.error(`Failed to query ${REPO}:`, e.message)
    console.error("Make sure gh CLI is authenticated with access to the private repo.")
    process.exit(2)
  }
}

function hoursAgo(date) {
  return Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60))
}

// ── Main ────────────────────────────────────────────────────────────

const lastPush = getLastPush()
const hours = hoursAgo(lastPush)

console.log(`Last backup push: ${lastPush.toISOString()} (${hours} hours ago)`)

if (hours <= STALE_HOURS) {
  console.log(`Backup is fresh (within ${STALE_HOURS}h threshold).`)
  process.exit(0)
}

console.log(`WARNING: Backup is ${hours} hours stale (threshold: ${STALE_HOURS}h).`)

// Write to Attention Queue via the shared library
try {
  const { addEntries } = require(path.join(ROOT, "scripts/lib/attention-queue.cjs"))
  addEntries([{
    producer: "backup-staleness-check",
    severity: "warning",
    title: `Vault backup is ${hours} hours stale`,
    detail: `donor-map-vault last pushed ${lastPush.toISOString()}. Run: git push backup v4`,
    profile: null,
    leverage: 8,
    cost_min: 5,
  }])
  console.log("Stale backup alert written to Attention Queue.")
} catch (e) {
  // If attention-queue lib isn't available, just print the warning
  console.error("Could not write to Attention Queue:", e.message)
  console.error("Manual fix: push current state to donor-map-vault.")
}

process.exit(1)
