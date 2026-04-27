/**
 * mutation-stamp.cjs — central "canonical store last mutated at" signal.
 *
 * Problem: route handlers + the librarian singleton + per-route caches
 * all snapshot canonical data. When a pipeline writes data/relationships.jsonl
 * (or anything else), nothing tells consumers their snapshot is stale.
 * Best case the cache TTL eventually clears; worst case the librarian
 * stays loaded for the dev server's lifetime serving 30-day-old graphs.
 *
 * Solution: a single ~70-byte file at `data/.last-mutation` that records
 * "the most recent canonical mutation, regardless of which pipeline ran."
 * Writers call markMutated(); readers call readMutationTs() and compare
 * to their own load_started_at. If the file's newer, refresh.
 *
 *   markMutated(reason)        — touch the file with `now` + reason
 *   readMutationTs()           — return last-mutated epoch ms (or 0 if missing)
 *   isStaleSince(loadStartMs)  — convenience: true if stamp newer than load
 *
 * Every script that writes to data/*.jsonl, data/*.json, data/derived/*
 * etc. should call markMutated() on success. The TS twin in
 * ops/src/lib/mutation-stamp.ts mirrors readMutationTs for the Next.js
 * runtime (route handlers + the librarian singleton).
 *
 * NOT a write lock. Concurrent writes can race; both will end up with
 * the latest stamp, which is the right outcome (consumers will refresh
 * once regardless of how many writes happened).
 */
const fs = require("fs")
const path = require("path")

const STAMP_FILE = path.resolve(__dirname, "..", "..", "data", ".last-mutation")

function markMutated(reason) {
  const ts = Date.now()
  const payload = {
    ts,
    iso: new Date(ts).toISOString(),
    reason: reason || "(unspecified)",
    pid: process.pid,
  }
  try {
    fs.writeFileSync(STAMP_FILE, JSON.stringify(payload) + "\n", "utf-8")
  } catch (err) {
    // Best-effort. If the data dir is read-only or doesn't exist we just
    // skip — consumers fall back to their own cache TTL behavior.
    if (process.env.MUTATION_STAMP_DEBUG) {
      console.error("[mutation-stamp] write failed:", err.message)
    }
  }
  return ts
}

function readMutationTs() {
  try {
    const raw = fs.readFileSync(STAMP_FILE, "utf-8")
    const parsed = JSON.parse(raw.trim())
    return typeof parsed.ts === "number" ? parsed.ts : 0
  } catch {
    return 0
  }
}

function isStaleSince(loadStartMs) {
  if (typeof loadStartMs !== "number" || loadStartMs <= 0) return false
  const stamp = readMutationTs()
  return stamp > loadStartMs
}

module.exports = {
  markMutated,
  readMutationTs,
  isStaleSince,
  STAMP_FILE,
}
