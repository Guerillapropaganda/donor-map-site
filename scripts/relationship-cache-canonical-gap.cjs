#!/usr/bin/env node
/**
 * relationship-cache-canonical-gap.cjs — diagnostic audit
 *
 * Phase A of the librarian-rewrite plan (ADR-0026 follow-up).
 *
 * Compares frontmatter relationship caches (donors:, opposes:,
 * politicians-funded:) against the canonical relationships graph
 * (data/relationships.jsonl + data/derived/*.jsonl). Reports the gap.
 *
 * Categorizes every mismatch into one of four buckets:
 *
 *   1. exact-match       — frontmatter and graph agree (good)
 *   2. alias-drift       — same entity referenced under different
 *                          spellings. Auto-fixable with an alias map.
 *   3. frontmatter-only  — entity in frontmatter but not in graph.
 *                          Either editorial assertion (lift to graph)
 *                          or stale (remove from frontmatter).
 *   4. graph-only        — entity in graph but not in frontmatter.
 *                          Run rebuild-relationship-caches.cjs to
 *                          backfill (already automated).
 *
 * Output:
 *   stdout: human-readable summary
 *   --json: structured output for the harness
 *   --report: writes content/Admin Notes/relationship-cache-canonical-gap.md
 *
 * Usage:
 *   node scripts/relationship-cache-canonical-gap.cjs [--json] [--report]
 *
 * Read-only. Does not modify any files unless --report (which only
 * writes the report file, not the underlying data).
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")
const { loadEdges } = require("./lib/relationships-store.cjs")

const ROOT = path.resolve(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const REPORT_PATH = path.join(ROOT, "content", "Admin Notes", "relationship-cache-canonical-gap.md")

const JSON_OUT = process.argv.includes("--json")
const WRITE_REPORT = process.argv.includes("--report")

// ─── Load profiles ────────────────────────────────────────────────────

function walkMd(dir, results = []) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return results }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      walkMd(full, results)
    } else if (entry.name.endsWith(".md")) {
      results.push(full)
    }
  }
  return results
}

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return null
  try { return yaml.load(m[1]) } catch { return null }
}

function loadProfiles() {
  const files = walkMd(CONTENT_DIR)
  const profiles = []
  for (const file of files) {
    let text
    try { text = fs.readFileSync(file, "utf-8") } catch { continue }
    const data = parseFrontmatter(text)
    if (!data || !data.title) continue
    profiles.push({ file, data })
  }
  return profiles
}

// ─── Extract entity lists (handle YAML array OR delimited string) ────

function extractEntityList(field) {
  if (!field) return []
  if (Array.isArray(field)) {
    return field
      .filter((x) => typeof x === "string")
      .flatMap(splitMaybeListString)  // YAML strings inside arrays sometimes embed delimited lists too
      .map(stripWikilink)
      .filter((s) => s.length > 0)
  }
  if (typeof field === "string") {
    return splitMaybeListString(field)
      .map(stripWikilink)
      .filter((s) => s.length > 0)
  }
  return []
}

/**
 * Split a frontmatter list string on any delimiter the vault uses.
 * The vault has multiple list formats in the wild:
 *   "[[A]] · [[B]] · [[C]]"      (bullet, whitespace-separated)
 *   "[[A]], [[B]], [[C]]"        (comma immediately after `]]`)
 *   "[[A]]; [[B]]; [[C]]"        (semicolon)
 * We split on `·` / `,` / `;` / `|` whether or not whitespace is on
 * both sides of the delimiter.
 */
function splitMaybeListString(s) {
  if (typeof s !== "string") return []
  return s
    .split(/[·,;|]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function stripWikilink(s) {
  // Allow trailing punctuation/whitespace on either side
  const m = s.match(/\[\[(.+?)\]\]/)
  return m ? m[1].trim() : s.trim()
}

function normalize(s) {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ")
}

// Loose match: same entity referenced under variant spellings.
// Returns true if a is a substring of b or vice versa, OR they share
// a common normalized prefix (first 2+ words). Used for alias-drift
// detection.
function looseMatch(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return true
  if (na.length < 4 || nb.length < 4) return false
  // Substring containment with min 6-char overlap (avoids "PAC" matching "PAC for X")
  if (na.length >= 6 && nb.includes(na)) return true
  if (nb.length >= 6 && na.includes(nb)) return true
  // Shared first-two-words prefix
  const wordsA = na.split(/\s+/).slice(0, 2).join(" ")
  const wordsB = nb.split(/\s+/).slice(0, 2).join(" ")
  if (wordsA.length >= 6 && wordsA === wordsB) return true
  return false
}

// ─── Build edge indexes by target ─────────────────────────────────────

function indexEdges(edges) {
  const monetaryByTo = new Map()      // titleLower → Set of source titles
  const opposeByTo = new Map()        // titleLower → Set of source titles (PACs that oppose this politician)
  const opposeByFrom = new Map()      // titleLower → Set of target titles (politicians this PAC opposes)
  const monetaryByFrom = new Map()    // titleLower → Set of target titles
  for (const e of edges) {
    if (!e.from || !e.to) continue
    if (e.status && e.status !== "active") continue
    const fromKey = normalize(e.from)
    const toKey = normalize(e.to)
    if (e.type === "monetary") {
      if (!monetaryByTo.has(toKey)) monetaryByTo.set(toKey, new Set())
      monetaryByTo.get(toKey).add(e.from)
      if (!monetaryByFrom.has(fromKey)) monetaryByFrom.set(fromKey, new Set())
      monetaryByFrom.get(fromKey).add(e.to)
    } else if (e.type === "political-opposition") {
      if (!opposeByTo.has(toKey)) opposeByTo.set(toKey, new Set())
      opposeByTo.get(toKey).add(e.from)
      if (!opposeByFrom.has(fromKey)) opposeByFrom.set(fromKey, new Set())
      opposeByFrom.get(fromKey).add(e.to)
    }
  }
  return { monetaryByTo, opposeByTo, opposeByFrom, monetaryByFrom }
}

// ─── Compare two name lists, categorize each entry ───────────────────

function categorize(fmList, graphList) {
  // Returns { exact, alias, fmOnly, graphOnly }
  const fmNorm = new Map()  // norm → original
  for (const f of fmList) fmNorm.set(normalize(f), f)
  const graphNorm = new Map()
  for (const g of graphList) graphNorm.set(normalize(g), g)

  const exact = []
  const alias = []  // [{ fm, graph }] — same entity, different spelling
  const fmOnly = []
  const graphOnly = []

  // First pass: exact normalized matches
  const matchedFmKeys = new Set()
  const matchedGraphKeys = new Set()
  for (const [k, fm] of fmNorm) {
    if (graphNorm.has(k)) {
      exact.push(fm)
      matchedFmKeys.add(k)
      matchedGraphKeys.add(k)
    }
  }

  // Second pass: loose matches between unmatched on each side
  const unmatchedFm = [...fmNorm].filter(([k]) => !matchedFmKeys.has(k))
  const unmatchedGraph = [...graphNorm].filter(([k]) => !matchedGraphKeys.has(k))

  for (const [fmK, fmName] of unmatchedFm) {
    for (const [gK, gName] of unmatchedGraph) {
      if (matchedGraphKeys.has(gK)) continue
      if (looseMatch(fmName, gName)) {
        alias.push({ fm: fmName, graph: gName })
        matchedFmKeys.add(fmK)
        matchedGraphKeys.add(gK)
        break
      }
    }
  }

  // Whatever's left is unique to one side
  for (const [k, fm] of fmNorm) if (!matchedFmKeys.has(k)) fmOnly.push(fm)
  for (const [k, g] of graphNorm) if (!matchedGraphKeys.has(k)) graphOnly.push(g)

  return { exact, alias, fmOnly, graphOnly }
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  const t0 = Date.now()
  const profiles = loadProfiles()
  const edges = loadEdges()
  const { monetaryByTo, opposeByTo, opposeByFrom, monetaryByFrom } = indexEdges(edges)

  // Per-field aggregates
  const stats = {
    profiles_scanned: profiles.length,
    edges_loaded: edges.length,
    donors: { exact: 0, alias: 0, fmOnly: 0, graphOnly: 0, profilesWithGap: 0, profilesWithField: 0 },
    opposes: { exact: 0, alias: 0, fmOnly: 0, graphOnly: 0, profilesWithGap: 0, profilesWithField: 0 },
    politicians_funded: { exact: 0, alias: 0, fmOnly: 0, graphOnly: 0, profilesWithGap: 0, profilesWithField: 0 },
  }

  // Sample examples for the report
  const samples = {
    alias: [],
    fmOnly_donors: [],
    fmOnly_opposes: [],
    graphOnly_donors: [],
    graphOnly_opposes: [],
  }

  // Top alias clusters: which (fm-spelling, graph-spelling) pairs recur
  const aliasFreq = new Map()  // "fm__GLUE__graph" → count

  for (const p of profiles) {
    const titleKey = normalize(p.data.title)

    // ── donors: ───────────────────────────────────────────────────
    const fmDonors = [
      ...extractEntityList(p.data.donors),
      ...extractEntityList(p.data["top-donors"]),
    ]
    const graphDonors = [...(monetaryByTo.get(titleKey) || new Set())]
    if (fmDonors.length > 0 || graphDonors.length > 0) {
      stats.donors.profilesWithField++
      const cat = categorize(fmDonors, graphDonors)
      stats.donors.exact += cat.exact.length
      stats.donors.alias += cat.alias.length
      stats.donors.fmOnly += cat.fmOnly.length
      stats.donors.graphOnly += cat.graphOnly.length
      if (cat.alias.length || cat.fmOnly.length || cat.graphOnly.length) {
        stats.donors.profilesWithGap++
      }
      for (const a of cat.alias) {
        const key = `${normalize(a.fm)}__GLUE__${normalize(a.graph)}`
        aliasFreq.set(key, (aliasFreq.get(key) || 0) + 1)
      }
      if (samples.fmOnly_donors.length < 12 && cat.fmOnly.length > 0) {
        samples.fmOnly_donors.push({ profile: p.data.title, examples: cat.fmOnly.slice(0, 5) })
      }
      if (samples.graphOnly_donors.length < 12 && cat.graphOnly.length > 0) {
        samples.graphOnly_donors.push({ profile: p.data.title, count: cat.graphOnly.length, examples: cat.graphOnly.slice(0, 5) })
      }
    }

    // ── opposes: ──────────────────────────────────────────────────
    // Schema convention varies by profile type:
    //   politician profile: opposes lists "PACs that oppose me" → graph edges TO me
    //   PAC/donor profile:  opposes lists "politicians I oppose" → graph edges FROM me
    // Rather than guess from profile.type, we union both directions —
    // any active political-opposition edge touching this entity counts.
    const fmOpposes = extractEntityList(p.data.opposes)
    const graphOpposes = [
      ...(opposeByTo.get(titleKey) || new Set()),
      ...(opposeByFrom.get(titleKey) || new Set()),
    ]
    if (fmOpposes.length > 0 || graphOpposes.length > 0) {
      stats.opposes.profilesWithField++
      const cat = categorize(fmOpposes, graphOpposes)
      stats.opposes.exact += cat.exact.length
      stats.opposes.alias += cat.alias.length
      stats.opposes.fmOnly += cat.fmOnly.length
      stats.opposes.graphOnly += cat.graphOnly.length
      if (cat.alias.length || cat.fmOnly.length || cat.graphOnly.length) {
        stats.opposes.profilesWithGap++
      }
      if (samples.fmOnly_opposes.length < 15 && cat.fmOnly.length > 0) {
        samples.fmOnly_opposes.push({ profile: p.data.title, examples: cat.fmOnly })
      }
      if (samples.graphOnly_opposes.length < 12 && cat.graphOnly.length > 0) {
        samples.graphOnly_opposes.push({ profile: p.data.title, examples: cat.graphOnly })
      }
    }

    // ── politicians-funded: ───────────────────────────────────────
    const fmFunded = extractEntityList(p.data["politicians-funded"])
    const graphFunded = [...(monetaryByFrom.get(titleKey) || new Set())]
    if (fmFunded.length > 0 || graphFunded.length > 0) {
      stats.politicians_funded.profilesWithField++
      const cat = categorize(fmFunded, graphFunded)
      stats.politicians_funded.exact += cat.exact.length
      stats.politicians_funded.alias += cat.alias.length
      stats.politicians_funded.fmOnly += cat.fmOnly.length
      stats.politicians_funded.graphOnly += cat.graphOnly.length
      if (cat.alias.length || cat.fmOnly.length || cat.graphOnly.length) {
        stats.politicians_funded.profilesWithGap++
      }
    }
  }

  // Top recurring alias pairs (high-value automation candidates)
  const topAliases = [...aliasFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k, n]) => {
      const [fm, graph] = k.split("__GLUE__")
      return { count: n, fm, graph }
    })
  samples.alias = topAliases

  const elapsed_ms = Date.now() - t0

  if (JSON_OUT) {
    console.log(JSON.stringify({ stats, samples, elapsed_ms }, null, 2))
  } else {
    printHumanReport(stats, samples, elapsed_ms)
  }

  if (WRITE_REPORT) {
    writeMarkdownReport(stats, samples, elapsed_ms)
  }
}

function pct(part, total) {
  if (!total) return "—"
  return `${((part / total) * 100).toFixed(1)}%`
}

function printHumanReport(stats, samples, elapsed_ms) {
  console.log(`\n=== Relationship cache canonical-gap audit ===`)
  console.log(`Profiles scanned: ${stats.profiles_scanned}`)
  console.log(`Edges loaded:     ${stats.edges_loaded}`)
  console.log(`Elapsed:          ${elapsed_ms}ms\n`)

  for (const field of ["donors", "opposes", "politicians_funded"]) {
    const s = stats[field]
    const total = s.exact + s.alias + s.fmOnly + s.graphOnly
    console.log(`── ${field} ─────────────────────────────────`)
    console.log(`  ${s.profilesWithField} profile(s) have data in either source`)
    console.log(`  ${s.profilesWithGap} profile(s) have a gap (${pct(s.profilesWithGap, s.profilesWithField)} of those)`)
    console.log(`  Total entries across both sources: ${total}`)
    console.log(`     exact-match:      ${s.exact} (${pct(s.exact, total)})`)
    console.log(`     alias-drift:      ${s.alias} (${pct(s.alias, total)}) — auto-fixable`)
    console.log(`     frontmatter-only: ${s.fmOnly} (${pct(s.fmOnly, total)}) — editorial or stale`)
    console.log(`     graph-only:       ${s.graphOnly} (${pct(s.graphOnly, total)}) — backfillable via rebuild-relationship-caches`)
    console.log()
  }

  if (samples.alias.length > 0) {
    console.log(`Top recurring alias pairs (auto-fix candidates):`)
    for (const a of samples.alias.slice(0, 10)) {
      console.log(`  ${String(a.count).padStart(4)}× "${a.fm}" ↔ "${a.graph}"`)
    }
  }
  console.log()
}

function writeMarkdownReport(stats, samples, elapsed_ms) {
  const lines = []
  lines.push("---")
  lines.push("title: Relationship cache canonical-gap audit")
  lines.push("type: report")
  lines.push("status: open")
  lines.push("kind: report")
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`)
  lines.push("auto-generated: true")
  lines.push("harness-check: relationship-cache-canonical-gap")
  lines.push("auto-resolve-when: '/relationship cache canonical-gap audit/i'")
  lines.push("---")
  lines.push("")
  lines.push("# Relationship cache canonical-gap audit")
  lines.push("")
  lines.push(`Phase A of the librarian-rewrite plan (ADR-0026 follow-up).`)
  lines.push(``)
  lines.push(`This report compares frontmatter relationship caches (\`donors:\`, \`opposes:\`, \`politicians-funded:\`) against the canonical relationships graph. Generated automatically; re-run \`node scripts/relationship-cache-canonical-gap.cjs --report\` to refresh.`)
  lines.push("")
  lines.push(`**Audit scope:** ${stats.profiles_scanned} profiles, ${stats.edges_loaded} graph edges, ${elapsed_ms}ms.`)
  lines.push("")

  lines.push("## Headline numbers")
  lines.push("")
  lines.push("| Field | Profiles with data | Profiles with gap | Total entries | Exact match | Alias drift | Frontmatter-only | Graph-only |")
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|")
  for (const field of ["donors", "opposes", "politicians_funded"]) {
    const s = stats[field]
    const total = s.exact + s.alias + s.fmOnly + s.graphOnly
    lines.push(
      `| **${field}** | ${s.profilesWithField} | ${s.profilesWithGap} (${pct(s.profilesWithGap, s.profilesWithField)}) | ${total} | ${s.exact} (${pct(s.exact, total)}) | ${s.alias} (${pct(s.alias, total)}) | ${s.fmOnly} (${pct(s.fmOnly, total)}) | ${s.graphOnly} (${pct(s.graphOnly, total)}) |`,
    )
  }
  lines.push("")

  lines.push("## Categories explained")
  lines.push("")
  lines.push("- **Exact match** — frontmatter and graph agree on this entity, after lowercase + whitespace normalization. No action needed.")
  lines.push("- **Alias drift** — the same entity is referenced under two different spellings (e.g. `United Democracy Project` vs `United Democracy Project - UDP`). Fixable with an alias map; recurring pairs are auto-fix candidates.")
  lines.push("- **Frontmatter-only** — entity in frontmatter but not in the graph. Two sub-cases: (1) editorial assertion that should be lifted into the graph (e.g. indirect opposition: \"Mainstream Democrats PAC opposes Cori Bush because it funded her primary opponent Wesley Bell\"), or (2) stale entry that should be removed from frontmatter.")
  lines.push("- **Graph-only** — entity in graph but not in frontmatter. The `rebuild-relationship-caches.cjs` script already handles backfilling these into frontmatter caches; if the count is non-zero, that script may not have been run recently.")
  lines.push("")

  if (samples.alias.length > 0) {
    lines.push("## Top recurring alias pairs (auto-fix candidates)")
    lines.push("")
    lines.push("These pairs appear repeatedly across profiles. Each one represents the same entity under two spellings. Adding the pair to a canonical alias map would fix all instances at once.")
    lines.push("")
    lines.push("| Count | Frontmatter spelling | Graph spelling |")
    lines.push("|---:|---|---|")
    for (const a of samples.alias.slice(0, 30)) {
      lines.push(`| ${a.count} | \`${a.fm}\` | \`${a.graph}\` |`)
    }
    lines.push("")
  }

  if (samples.fmOnly_opposes.length > 0) {
    lines.push("## Frontmatter-only `opposes` examples")
    lines.push("")
    lines.push("These are entries the editor put in frontmatter that have no corresponding `political-opposition` edge in the graph. The Wesley-Bell pattern (donor of primary opponent → opposer of original) is the most common case — frontmatter captures editorial intent the graph can't infer today.")
    lines.push("")
    for (const s of samples.fmOnly_opposes.slice(0, 12)) {
      lines.push(`- **${s.profile}** — ${s.examples.map(e => `\`${e}\``).join(", ")}`)
    }
    lines.push("")
  }

  if (samples.graphOnly_opposes.length > 0) {
    lines.push("## Graph-only `opposes` examples (backfill candidates)")
    lines.push("")
    lines.push("These are `political-opposition` edges in the graph that aren't reflected in the profile's frontmatter `opposes:` field. Running `node scripts/rebuild-relationship-caches.cjs --write` should pick these up if the script is configured to handle the opposes field (currently it handles only monetary edges).")
    lines.push("")
    for (const s of samples.graphOnly_opposes.slice(0, 10)) {
      lines.push(`- **${s.profile}** — ${s.examples.map(e => `\`${e}\``).join(", ")}`)
    }
    lines.push("")
  }

  if (samples.graphOnly_donors.length > 0) {
    lines.push("## Graph-only `donors` examples (most extreme cases)")
    lines.push("")
    lines.push("These profiles have many graph monetary edges that aren't in their frontmatter `donors:` field — a sign that `rebuild-relationship-caches.cjs` hasn't run recently against these profiles.")
    lines.push("")
    for (const s of samples.graphOnly_donors.sort((a, b) => b.count - a.count).slice(0, 8)) {
      lines.push(`- **${s.profile}** — ${s.count} edges in graph; sample: ${s.examples.map(e => `\`${e}\``).join(", ")}`)
    }
    lines.push("")
  }

  lines.push("## What's automatable vs editorial")
  lines.push("")
  lines.push("Based on the gap distribution, here's what we can automate:")
  lines.push("")
  lines.push("**Definitely automatable:**")
  lines.push("- **Alias drift** — recurring alias pairs become a canonical alias map. One-time setup, fixes all instances forever.")
  lines.push("- **Graph-only entries** — `rebuild-relationship-caches.cjs` already does this for monetary edges; extending it to `political-opposition` is a small edit.")
  lines.push("")
  lines.push("**Partially automatable (editorial review needed):**")
  lines.push("- **Frontmatter-only opposes** — the indirect-opposition pattern (donor of primary opponent → opposer of original) can be derived from FEC data + same-cycle same-office matching. Confidence: ~0.6. Needs human sign-off before lifting into the graph.")
  lines.push("")
  lines.push("**Not automatable (purely editorial):**")
  lines.push("- Entries where the frontmatter assertion is genuinely editorial (e.g. \"AIPAC opposes Cori Bush\" based on policy positions, not direct funding). These should stay in frontmatter and we should amend Rule 1 to recognize that some editorial fields aren't pure graph caches.")
  lines.push("")
  lines.push("## Next steps")
  lines.push("")
  lines.push("After David reviews this report, decide:")
  lines.push("")
  lines.push("- **Phase B**: Build the alias map + extend `rebuild-relationship-caches.cjs` to cover `political-opposition`. Estimated 2-3 hours.")
  lines.push("- **Phase C**: Build `derive-indirect-opposition-edges.cjs` (FEC-driven). Estimated 3-4 hours.")
  lines.push("- **Phase D**: Rewrite contradiction-miner against the librarian. Estimated 2-3 hours.")
  lines.push("- **Phase E**: Cleanup, harness wiring, Rule 1 amendment if needed. Estimated 1 hour.")

  fs.writeFileSync(REPORT_PATH, lines.join("\n") + "\n", "utf-8")
  console.log(`\nReport written to: ${path.relative(ROOT, REPORT_PATH)}`)
}

main()
