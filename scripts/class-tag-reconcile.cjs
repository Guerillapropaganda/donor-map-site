#!/usr/bin/env node
/**
 * class-tag-reconcile.cjs — diff every pending proposal against the
 * current entity record and route it to the right resolution.
 *
 * Background:
 *   The /class-tags review workflow generated 467 heuristic-v1 proposals
 *   plus 42 perplexity-research proposals, then went mostly unused — only
 *   5 of the 509 were reviewed. Meanwhile, ~341 entities got tagged
 *   through other pathways (Research Claude direct edits, the perplexity
 *   research output written straight to entities.jsonl, etc.). The
 *   proposal queue rotted: many entries are stale because the entity is
 *   already tagged.
 *
 * What this script does:
 *   For each pending proposal, compare its tags against the persisted
 *   entity record. Classify the gap and update the proposal's status:
 *
 *     SUPERSEDED — entity already has every field the proposal would
 *       set. No review needed. Mark closed (status="superseded",
 *       reviewed_by="auto-reconcile").
 *
 *     AUGMENTATION — proposal would ADD fields the entity is missing
 *       (entity has some tags, proposal has additional ones). Real
 *       new info. Mark status="augmentation" with a diff payload.
 *       Surfaces in /class-tags as "X new fields proposed for already-
 *       tagged entity — review the additions."
 *
 *     CONFLICT — entity has a single-value field (capital_type or
 *       class_position or worker_relationship) set to one value, but
 *       the proposal disagrees with a different value. Mark
 *       status="conflict" with diff payload. Highest priority for
 *       human review.
 *
 *     PENDING (unchanged) — entity is genuinely untagged. The 160 real
 *       backlog stays as-is.
 *
 * Per Rule 4 (AI translates, never generates), this script does NOT
 * auto-apply augmenting fields to entity records. Class tags are factual
 * claims. The script only updates the proposal queue's metadata so the
 * review surface can show clear next-action prompts.
 *
 * Usage:
 *   node scripts/class-tag-reconcile.cjs --dry-run   # show what would change
 *   node scripts/class-tag-reconcile.cjs             # write the new statuses
 *   node scripts/class-tag-reconcile.cjs --json      # also emit a JSON summary
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const PROPOSALS_FILE = path.join(ROOT, "data", "entity-class-tags-proposed.jsonl")
const ENTITIES_FILE = path.join(ROOT, "data", "entities.jsonl")

const DRY_RUN = process.argv.includes("--dry-run")
const PRINT_JSON = process.argv.includes("--json")

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

function writeJsonl(filePath, records) {
  const tmp = filePath + ".tmp-" + process.pid
  const buf = records.map((r) => JSON.stringify(r)).join("\n") + "\n"
  fs.writeFileSync(tmp, buf, "utf-8")
  fs.renameSync(tmp, filePath)
}

const proposals = readJsonl(PROPOSALS_FILE)
const entities = readJsonl(ENTITIES_FILE)
const entityById = new Map(entities.map((e) => [e.id, e]))

/**
 * Compare proposed tags vs persisted entity tags. Return a verdict:
 *
 *   { verdict: "superseded" | "augmentation" | "conflict" | "missing",
 *     diff: { adds: {field: value}, conflicts: {field: {proposed, persisted}} }
 *   }
 *
 * "missing" means the entity has no class tags at all — proposal stays
 * pending unchanged.
 */
function compareTags(proposed, entity) {
  const pe = {
    capital_type: entity.capital_type ?? null,
    secondary_capital_type: entity.secondary_capital_type ?? null,
    class_position: entity.class_position ?? null,
    ideological_function: Array.isArray(entity.ideological_function) ? entity.ideological_function : [],
    worker_relationship: entity.worker_relationship ?? null,
    policy_stakes: Array.isArray(entity.policy_stakes) ? entity.policy_stakes : [],
  }
  const hasAnyTag =
    pe.capital_type ||
    pe.secondary_capital_type ||
    pe.class_position ||
    pe.worker_relationship ||
    pe.ideological_function.length > 0 ||
    pe.policy_stakes.length > 0
  if (!hasAnyTag) return { verdict: "missing", diff: { adds: {}, conflicts: {} } }

  const adds = {}
  const conflicts = {}

  // Single-value scalar fields: conflict if both set to different values,
  // add if proposed is set and persisted is null.
  for (const f of ["capital_type", "secondary_capital_type", "class_position", "worker_relationship"]) {
    const p = proposed[f] ?? null
    if (p === null || p === undefined) continue
    if (pe[f] === null) adds[f] = p
    else if (pe[f] !== p) conflicts[f] = { proposed: p, persisted: pe[f] }
  }

  // Array fields: ADD any proposed entries not already in the persisted
  // array. Arrays don't conflict — they accumulate. (If the proposer
  // disagrees on direction it'd show as an add of the opposing tag,
  // which is fine — both could legitimately apply.)
  for (const f of ["ideological_function", "policy_stakes"]) {
    const p = Array.isArray(proposed[f]) ? proposed[f] : []
    const missing = p.filter((v) => !pe[f].includes(v))
    if (missing.length > 0) adds[f] = missing
  }

  if (Object.keys(conflicts).length > 0) return { verdict: "conflict", diff: { adds, conflicts } }
  if (Object.keys(adds).length > 0) return { verdict: "augmentation", diff: { adds, conflicts: {} } }
  return { verdict: "superseded", diff: { adds: {}, conflicts: {} } }
}

const summary = {
  total: proposals.length,
  pending_before: 0,
  superseded_now: 0,
  augmentation_now: 0,
  conflict_now: 0,
  still_pending: 0,
  unchanged: 0,
  missing_entity: 0,
}

const updated = []
const examples = { superseded: [], augmentation: [], conflict: [], still_pending: [] }
const NOW = new Date().toISOString()

for (const p of proposals) {
  if (p.status !== "pending") {
    updated.push(p)
    summary.unchanged += 1
    continue
  }
  summary.pending_before += 1

  const entity = entityById.get(p.entity_id)
  if (!entity) {
    // Entity record missing — proposal can't be reconciled. Leave pending.
    updated.push(p)
    summary.still_pending += 1
    summary.missing_entity += 1
    continue
  }

  const cmp = compareTags(p.tags, entity)

  if (cmp.verdict === "missing") {
    // Real backlog — entity is genuinely untagged. Leave pending.
    updated.push(p)
    summary.still_pending += 1
    if (examples.still_pending.length < 5) examples.still_pending.push(p.entity_name)
    continue
  }

  const newP = {
    ...p,
    status: cmp.verdict, // "superseded" | "augmentation" | "conflict"
    reviewed_at: NOW,
    reviewed_by: "auto-reconcile",
    reconciliation_diff: cmp.diff,
  }
  updated.push(newP)

  if (cmp.verdict === "superseded") {
    summary.superseded_now += 1
    if (examples.superseded.length < 5) examples.superseded.push(p.entity_name)
  } else if (cmp.verdict === "augmentation") {
    summary.augmentation_now += 1
    if (examples.augmentation.length < 5) {
      examples.augmentation.push({ name: p.entity_name, adds: cmp.diff.adds })
    }
  } else if (cmp.verdict === "conflict") {
    summary.conflict_now += 1
    if (examples.conflict.length < 5) {
      examples.conflict.push({ name: p.entity_name, conflicts: cmp.diff.conflicts })
    }
  }
}

console.log("class-tag-reconcile" + (DRY_RUN ? " (DRY RUN)" : ""))
console.log("─────────────────────────────────────────")
console.log("total proposals scanned:        " + summary.total.toLocaleString())
console.log("pending before reconcile:       " + summary.pending_before.toLocaleString())
console.log("  → superseded (auto-closed):   " + summary.superseded_now.toLocaleString())
console.log("  → augmentation (review):      " + summary.augmentation_now.toLocaleString())
console.log("  → conflict (priority review): " + summary.conflict_now.toLocaleString())
console.log("  → still pending (real bklog): " + summary.still_pending.toLocaleString() + (summary.missing_entity ? " (incl. " + summary.missing_entity + " w/ missing entity)" : ""))
console.log("untouched (already reviewed):   " + summary.unchanged.toLocaleString())
console.log("")
console.log("--- sample superseded ---")
for (const n of examples.superseded) console.log("  " + n)
console.log("--- sample augmentation (need David's eye for ADDITIONS) ---")
for (const e of examples.augmentation) console.log("  " + e.name + "  adds=" + JSON.stringify(e.adds))
console.log("--- sample conflict (need David's eye for DISAGREEMENTS) ---")
for (const e of examples.conflict) console.log("  " + e.name + "  conflicts=" + JSON.stringify(e.conflicts))
console.log("--- sample still-pending (real backlog) ---")
for (const n of examples.still_pending) console.log("  " + n)

if (!DRY_RUN) {
  writeJsonl(PROPOSALS_FILE, updated)
  console.log("")
  console.log("✓ Wrote " + path.relative(ROOT, PROPOSALS_FILE))
}

if (PRINT_JSON) {
  console.log("")
  console.log("--- JSON summary ---")
  console.log(JSON.stringify(summary, null, 2))
}
