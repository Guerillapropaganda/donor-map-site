#!/usr/bin/env node
/**
 * class-tag-staleness-check — harness check for the class-tag proposal queue.
 *
 * Counts proposals by status. The findings_count exposed to the
 * harness is augmentation + conflict combined — those are proposals
 * that the auto-reconciler classified as "needs human eye." pending +
 * superseded are not findings (pending is real backlog the reviewer
 * will see anyway; superseded is auto-closed).
 *
 * Per the harness contract:
 *   --json → emit a single JSON object on stdout for vault-audit.cjs to parse
 *   exit 0 → no findings (no augmentation/conflict)
 *   exit 1 → findings present (advisory; non-blocking)
 *
 * Run via attention-dispatcher.cjs every 15 min once registered in
 * scripts/vault-audit.cjs CHECKS.
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const PROPOSALS_FILE = path.join(ROOT, "data", "entity-class-tags-proposed.jsonl")
const OUT_JSON = process.argv.includes("--json")

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return []
  const out = []
  for (const line of fs.readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    try { out.push(JSON.parse(t)) } catch { /* skip */ }
  }
  return out
}

const props = readJsonl(PROPOSALS_FILE)
const counts = {}
for (const p of props) counts[p.status || "unknown"] = (counts[p.status || "unknown"] || 0) + 1

const augmentation = counts.augmentation || 0
const conflict = counts.conflict || 0
const findings = augmentation + conflict
const pending = counts.pending || 0
const superseded = counts.superseded || 0

// Ages: oldest unreviewed augmentation/conflict, in days
let oldestNeedsReviewDays = 0
const now = Date.now()
for (const p of props) {
  if (p.status !== "augmentation" && p.status !== "conflict") continue
  // proposed_at, not reviewed_at — "needs review" age is from the original
  // proposal timestamp.
  if (!p.proposed_at) continue
  const ageDays = Math.floor((now - new Date(p.proposed_at).getTime()) / 86400000)
  if (ageDays > oldestNeedsReviewDays) oldestNeedsReviewDays = ageDays
}

const result = {
  findings_count: findings,
  by_status: counts,
  augmentation_count: augmentation,
  conflict_count: conflict,
  pending_count: pending,
  superseded_count: superseded,
  oldest_needs_review_days: oldestNeedsReviewDays,
  notes:
    findings === 0
      ? "queue clean — no augmentation/conflict awaiting review"
      : `${findings} reconciled proposals need human eye (${conflict} conflict + ${augmentation} augmentation), oldest ${oldestNeedsReviewDays}d. See ops /class-tags page filtered to status=conflict or status=augmentation.`,
}

if (OUT_JSON) {
  console.log(JSON.stringify(result))
} else {
  console.log(`class-tag-staleness: pending=${pending} augmentation=${augmentation} conflict=${conflict} superseded=${superseded}`)
  console.log(`  ${result.notes}`)
}

// Exit 1 if there are findings (advisory; harness records as "active" findings)
process.exit(findings > 0 ? 1 : 0)
