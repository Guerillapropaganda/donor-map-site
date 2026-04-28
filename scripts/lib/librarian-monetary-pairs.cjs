/**
 * librarian-monetary-pairs.cjs — shared librarian-backed monetary-edge
 * index used by detectors that need to gate frontmatter-derived
 * findings through "is there real money behind this pair?"
 *
 * Per ADR-0024 and Rule 4 (stories never assert new facts), any detector
 * that surfaces a story candidate from frontmatter MUST verify the
 * implied claim against the canonical relationship graph. This module is
 * the canonical helper for that gate.
 *
 * Reads:
 *   data/relationships.jsonl
 *   data/derived/*.jsonl
 *
 * Edges canonicalized through the resolver (alias / FEC-committee /
 * legislator-name variants collapse). Recorded symmetrically so callers
 * can probe either direction.
 *
 * "Monetary" = type === 'monetary' OR a positive finite amount field
 * (covers ie-oppose, philanthropic-grant, contribution, etc.).
 *
 * Public API:
 *   const { loadMonetaryPairs, hasMonetaryEdge, normalize } = require(...)
 *   const resolver = createCanonicalNameResolver()
 *   const pairs = loadMonetaryPairs(resolver)
 *   hasMonetaryEdge(pairs, a, b, resolver)  → boolean
 *   countCounterpartiesWithEdge(pairs, subject, names, resolver) → number
 */

const fs = require("fs")
const path = require("path")

const REPO_ROOT = path.resolve(__dirname, "..", "..")
const RELATIONSHIPS_FILE = path.join(REPO_ROOT, "data", "relationships.jsonl")
const DERIVED_DIR = path.join(REPO_ROOT, "data", "derived")

function normalize(name) {
  return String(name || "").toLowerCase().trim().replace(/\s+/g, " ")
}

function loadMonetaryPairs(resolver) {
  const pairs = new Map()

  function record(from, to) {
    const fromCanon = resolver ? resolver.resolve(from) : from
    const toCanon = resolver ? resolver.resolve(to) : to
    const fk = normalize(fromCanon || from)
    const tk = normalize(toCanon || to)
    if (!fk || !tk) return
    if (!pairs.has(fk)) pairs.set(fk, new Set())
    pairs.get(fk).add(tk)
  }

  function processLine(line) {
    if (!line.trim()) return
    let r
    try { r = JSON.parse(line) } catch { return }
    if (r.status && r.status !== "active") return
    const isMoney =
      r.type === "monetary" ||
      (typeof r.amount === "number" && Number.isFinite(r.amount) && r.amount > 0)
    if (!isMoney) return
    record(r.from, r.to)
    record(r.to, r.from)
  }

  function readJsonl(file) {
    if (!fs.existsSync(file)) return
    const fd = fs.openSync(file, "r")
    try {
      const size = fs.fstatSync(fd).size
      const READ_CHUNK = 64 * 1024 * 1024
      let offset = 0
      let carry = ""
      while (offset < size) {
        const len = Math.min(READ_CHUNK, size - offset)
        const buf = Buffer.alloc(len)
        fs.readSync(fd, buf, 0, len, offset)
        offset += len
        const chunk = carry + buf.toString("utf-8")
        const lines = chunk.split(/\r?\n/)
        carry = lines.pop() ?? ""
        for (const line of lines) processLine(line)
      }
      if (carry.trim()) processLine(carry)
    } finally {
      fs.closeSync(fd)
    }
  }

  readJsonl(RELATIONSHIPS_FILE)
  if (fs.existsSync(DERIVED_DIR)) {
    for (const f of fs.readdirSync(DERIVED_DIR)) {
      if (f.endsWith(".jsonl")) readJsonl(path.join(DERIVED_DIR, f))
    }
  }
  return pairs
}

function hasMonetaryEdge(pairs, a, b, resolver) {
  const ak = normalize((resolver && resolver.resolve(a)) || a)
  const bk = normalize((resolver && resolver.resolve(b)) || b)
  if (!ak || !bk) return false
  return pairs.get(ak)?.has(bk) || pairs.get(bk)?.has(ak) || false
}

/**
 * For a subject, count how many of the supplied counterparty names have
 * a librarian-backed monetary edge with that subject.
 */
function countCounterpartiesWithEdge(pairs, subject, names, resolver) {
  let n = 0
  for (const c of names) {
    if (hasMonetaryEdge(pairs, subject, c, resolver)) n++
  }
  return n
}

/**
 * True if `name` participates in any monetary edge in the librarian.
 * Used to detect "political footprint" without trusting frontmatter.
 */
function hasAnyMonetaryEdge(pairs, name, resolver) {
  const k = normalize((resolver && resolver.resolve(name)) || name)
  if (!k) return false
  const set = pairs.get(k)
  return !!set && set.size > 0
}

module.exports = {
  loadMonetaryPairs,
  hasMonetaryEdge,
  hasAnyMonetaryEdge,
  countCounterpartiesWithEdge,
  normalize,
}
