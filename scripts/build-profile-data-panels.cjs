#!/usr/bin/env node
/**
 * build-profile-data-panels.cjs — Phase 3 / Profile Data Panels
 *
 * For every entity in data/entities.jsonl that has a profile_path,
 * inject a "Live data panel" auto-block into the top of the profile
 * markdown. The panel shows query-engine-computed data: top
 * recipients/donors, total spend/received, approved class tags, and
 * identity fields from the signals we already gathered in Phase 2.
 *
 * The block is delimited by:
 *   <!-- auto:data-panel start -->
 *   ...
 *   <!-- auto:data-panel end -->
 *
 * Same auto-block pattern the existing FEC/Congress pipelines use
 * (see content/Vault Rules.md § Pipeline Data Protocol). Idempotent
 * on re-runs: the block content is replaced in place, the rest of
 * the profile body stays untouched.
 *
 * For files WITHOUT a pre-existing block, the panel is inserted
 * immediately after the frontmatter closing `---` so the editor sees
 * it the moment they open the profile in Obsidian.
 *
 * PHASE 2.5 NOTE (viewer tier placeholder):
 * The panel is rendered full-depth in v1 (every row shown). When
 * Phase 2.5 ships auth + tier gating, a Quartz transformer will
 * re-render the auto-block contents based on viewer tier:
 *   unauth    → top 3 rows + blurred teaser + upgrade CTA
 *   free-auth → top 10 rows + upgrade CTA
 *   paid      → full panel (current v1 behavior)
 * The current script leaves a "<!-- tier: paid -->" marker inside the
 * block so the transformer can target it later without re-running
 * this script.
 *
 * Usage:
 *   node scripts/build-profile-data-panels.cjs               # dry-run
 *   node scripts/build-profile-data-panels.cjs --write
 *   node scripts/build-profile-data-panels.cjs --write --type donor
 *   node scripts/build-profile-data-panels.cjs --write --entity-id ent_000042
 *   node scripts/build-profile-data-panels.cjs --write --verbose
 */

const fs = require("fs")
const path = require("path")
const entitiesStore = require("./lib/entities-store.cjs")
const { createQueryEngine } = require("./lib/query-engine.cjs")

// Per-profile relationship artifact — canonical-store-derived monetary
// amounts keyed by normalized profile title. Loaded once; used to supply
// real dollar amounts for top-donor rows where entities.jsonl signals
// have zeros or are missing entirely (e.g. Rubio, who has 114 edges
// pointing at him but no entities.jsonl row).
const ARTIFACT_PATH = path.join(__dirname, "..", "data", "relationships-per-profile.json")
let _artifact = null
function loadArtifact() {
  if (_artifact) return _artifact
  if (!fs.existsSync(ARTIFACT_PATH)) { _artifact = {}; return _artifact }
  _artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf-8"))
  return _artifact
}
function normalizeTitle(title) {
  return String(title || "").replace(/^_/, "").replace(/\s+Master Profile.*$/i, "").trim()
}
// Sum monetary-detail entries per donor name and return a sorted list of
// {name, amount}. Phase 5: only entries whose role represents an actual
// donor→recipient contribution count — excludes ie-support (super-PAC
// outside spending the recipient never received), campaign-expenditure
// (vendor payments, politician → vendor outflows that were being mis-
// routed as donor entries), and ie-oppose (already isolated by the
// artifact builder but double-filter here defensively).
const DONOR_ROLES = new Set([
  "direct-contribution",
  "employee-contributions",
  "coordinated-party-expense",
  "party-coordinated",
  "527-contribution",
  "philanthropic-grant",
  "", // legacy entries without role — err on side of including (most are pas2 direct)
])
function topDonorsFromArtifact(profileTitle, limit) {
  const a = loadArtifact()
  const entry = a[normalizeTitle(profileTitle)]
  if (!entry) return []
  const md = entry["monetary-detail"] || []
  const sum = new Map()
  for (const d of md) {
    if (!d || !d.name) continue
    if ((d.confidence || 0) < 0.7) continue
    if (!DONOR_ROLES.has(d.role || "")) continue
    sum.set(d.name, (sum.get(d.name) || 0) + (Number(d.amount) || 0))
  }
  return [...sum.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit || 10)
}

const argv = process.argv.slice(2)
const WRITE = argv.includes("--write")
const VERBOSE = argv.includes("--verbose")
const typeFlag = argv.indexOf("--type")
const TYPE_FILTER = typeFlag !== -1 ? argv[typeFlag + 1] : null
const entityFlag = argv.indexOf("--entity-id")
const ENTITY_FILTER = entityFlag !== -1 ? argv[entityFlag + 1] : null

const BLOCK_START = "<!-- auto:data-panel start -->"
const BLOCK_END = "<!-- auto:data-panel end -->"
const TIER_MARKER = "<!-- tier: paid -->"

// ─── Formatters ───────────────────────────────────────────────────────

function formatUsd(n) {
  if (typeof n !== "number" || !n) return "—"
  return "$" + n.toLocaleString()
}

function formatCount(n) {
  if (typeof n !== "number") return "—"
  return n.toLocaleString()
}

function safeCell(v) {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "string") {
    return v.replace(/\|/g, "\\|")
  }
  return String(v)
}

// ─── Panel rendering ──────────────────────────────────────────────────

function renderDonorPanel(entity) {
  const signals = entity.signals || {}
  const lines = []
  lines.push(BLOCK_START)
  lines.push(`<!-- Generated by scripts/build-profile-data-panels.cjs - do not edit by hand -->`)
  lines.push(TIER_MARKER)
  lines.push("")
  lines.push(`**Entity type:** ${entity.entity_type}`)
  if (signals.sector) lines.push(`**Sector:** ${signals.sector}`)
  if (signals.naics) lines.push(`**NAICS code:** \`${signals.naics}\``)
  if (signals.ein) lines.push(`**EIN:** \`${signals.ein}\``)

  // Class tags (only if approved)
  if (entity.tags_approved) {
    const tagLines = []
    if (entity.capital_type) tagLines.push(`**Capital type:** \`${entity.capital_type}\``)
    if (entity.class_position) tagLines.push(`**Class position:** \`${entity.class_position}\``)
    if (entity.worker_relationship)
      tagLines.push(`**Worker relationship:** \`${entity.worker_relationship}\``)
    if (entity.ideological_function && entity.ideological_function.length) {
      tagLines.push(
        `**Ideological function:** ${entity.ideological_function.map((t) => `\`${t}\``).join(", ")}`,
      )
    }
    if (tagLines.length) {
      lines.push("")
      lines.push("#### Class analysis")
      lines.push("")
      for (const l of tagLines) lines.push(l)
    }
  }

  // Financial summary
  const totalSpend =
    typeof signals.total_political_spend === "number" ? signals.total_political_spend : null
  lines.push("")
  lines.push(`**Total political spend:** ${formatUsd(totalSpend)}`)

  // Top politicians funded — only render when at least one row has a
  // real dollar amount. Dark-money donors (Leo, MFT, JCN, etc.) route
  // money through 501(c)(4) vehicles and IE-spending committees;
  // 1-hop donor→politician edges don't exist for them. Rendering a
  // table of names with "—" amounts is misleading — it implies direct
  // giving we haven't quantified, when the truer answer is that money
  // flows through controlled vehicles. Suppress and point to the
  // entity's own "Dark Money Architecture" narrative instead.
  const top = signals.top_politicians_funded || []
  const topWithAmounts = top.filter((p) => typeof p.amount === "number" && p.amount > 0)
  if (topWithAmounts.length) {
    lines.push("")
    lines.push("#### Top politicians funded")
    lines.push("")
    lines.push("| Politician | Amount |")
    lines.push("|---|---:|")
    for (const p of topWithAmounts.slice(0, 10)) {
      lines.push(`| ${safeCell(p.name)} | ${formatUsd(p.amount)} |`)
    }
  } else if (top.length) {
    // Names present but no amounts — explain rather than mislead.
    lines.push("")
    lines.push("*No direct donor→politician dollar flows tracked for this entity. " +
      "Money may route through controlled vehicles or 501(c)(4) shells. " +
      "See narrative sections below for details.*")
  }

  lines.push("")
  lines.push(
    `<!-- Build: data panel generated from data/entities.jsonl + data/relationships.jsonl. Regenerate: node scripts/build-profile-data-panels.cjs --write. Phase 3. -->`,
  )
  lines.push(BLOCK_END)
  return lines.join("\n")
}

function renderPoliticianPanel(entity) {
  const signals = entity.signals || {}
  const lines = []
  lines.push(BLOCK_START)
  lines.push(`<!-- Generated by scripts/build-profile-data-panels.cjs - do not edit by hand -->`)
  lines.push(TIER_MARKER)
  lines.push("")
  const identity = []
  if (signals.party) identity.push(`**Party:** ${signals.party}`)
  if (signals.chamber) identity.push(`**Chamber:** ${signals.chamber}`)
  if (signals.state) identity.push(`**State:** ${signals.state}`)
  if (identity.length) lines.push(identity.join(" · "))

  if (signals.bioguide_id) lines.push(`**Bioguide ID:** \`${signals.bioguide_id}\``)
  if (signals.fec_candidate_id) lines.push(`**FEC candidate ID:** \`${signals.fec_candidate_id}\``)

  // Approved class tags (politician mirror vocab)
  if (entity.tags_approved) {
    const tagLines = []
    if (entity.class_origin) tagLines.push(`**Class origin:** \`${entity.class_origin}\``)
    if (entity.primary_funders_class)
      tagLines.push(`**Primary funders class:** \`${entity.primary_funders_class}\``)
    if (entity.serves_capital_type && entity.serves_capital_type.length) {
      tagLines.push(
        `**Serves capital type:** ${entity.serves_capital_type.map((t) => `\`${t}\``).join(", ")}`,
      )
    }
    if (entity.bloc_membership && entity.bloc_membership.length) {
      tagLines.push(`**Bloc membership:** ${entity.bloc_membership.join(", ")}`)
    }
    if (typeof entity.contradiction_index === "number") {
      tagLines.push(`**Contradiction index:** \`${entity.contradiction_index.toFixed(2)}\``)
    }
    if (tagLines.length) {
      lines.push("")
      lines.push("#### Class analysis")
      lines.push("")
      for (const l of tagLines) lines.push(l)
    }
  }

  // Financial summary
  const totalReceived =
    typeof signals.total_received === "number" ? signals.total_received : null
  lines.push("")
  lines.push(`**Total received:** ${formatUsd(totalReceived)}`)
  if (entity.fm_total_received_note) {
    lines.push(`  <br><small>_${safeCell(entity.fm_total_received_note)}_</small>`)
  }

  // Custom outlier stats (Trump's Truth Social stake, $TRUMP coin, etc.)
  // Pulled from frontmatter custom-stats array (see Profile Template.md).
  if (entity.fm_custom_stats && Array.isArray(entity.fm_custom_stats) && entity.fm_custom_stats.length) {
    lines.push("")
    lines.push("#### Additional tracked financials")
    lines.push("")
    lines.push("| Stat | Value | Source |")
    lines.push("|---|---:|---|")
    for (const s of entity.fm_custom_stats) {
      if (!s || !s.label || !s.value) continue
      lines.push(`| ${safeCell(s.label)} | ${safeCell(s.value)} | ${safeCell(s.source || "")} |`)
    }
  }

  // Committees
  if (signals.committees && signals.committees.length) {
    lines.push("")
    lines.push("#### Committees")
    lines.push("")
    for (const c of signals.committees) lines.push(`- ${c}`)
  }

  // Top donors — prefer the per-profile artifact (canonical-store-derived
  // amounts summed across cycles), fall back to signals.top_donors, then
  // frontmatter. The artifact wins when it has dollar amounts because
  // signals.top_donors frequently has name-only entries with amount=0.
  const profileTitle = (entity.name || entity.title || entity.signals?.name || "").trim()
  const artifactTop = profileTitle ? topDonorsFromArtifact(profileTitle, 10) : []
  const signalsTop = (signals.top_donors || []).filter((d) => d && d.name)
  let topDonors = []
  if (artifactTop.length) {
    topDonors = artifactTop
  } else if (signalsTop.length) {
    topDonors = signalsTop.slice(0, 10)
  }

  // Suppress Top donors table when all rows have no real dollar amount
  // — a table of names with "—" values misleads readers into thinking
  // those are the top-N when really we just couldn't quantify flows.
  // Same policy as the donor-side "Top politicians funded" suppression.
  const topWithAmounts = topDonors.filter((d) => typeof d.amount === "number" && d.amount > 0)
  if (topWithAmounts.length) {
    lines.push("")
    lines.push("#### Top donors")
    lines.push("")
    lines.push("| Donor | Amount |")
    lines.push("|---|---:|")
    for (const d of topWithAmounts) {
      lines.push(`| ${safeCell(d.name)} | ${formatUsd(d.amount)} |`)
    }
  } else if (topDonors.length) {
    lines.push("")
    lines.push("*Top donors list present but amounts not yet quantified. See narrative sections for details.*")
  } else if (signals.fm_top_donors && signals.fm_top_donors.length) {
    // No canonical data and no signals — fall back to frontmatter list
    // (name-only, no amounts).
    lines.push("")
    lines.push("#### Top donors (from frontmatter)")
    lines.push("")
    for (const d of signals.fm_top_donors) lines.push(`- ${d}`)
  }

  lines.push("")
  lines.push(
    `<!-- Build: data panel generated from data/entities.jsonl + data/relationships.jsonl. Regenerate: node scripts/build-profile-data-panels.cjs --write. Phase 3. -->`,
  )
  lines.push(BLOCK_END)
  return lines.join("\n")
}

function renderPanel(entity) {
  if (entity.entity_type === "politician") return renderPoliticianPanel(entity)
  return renderDonorPanel(entity)
}

// ─── Block insertion ──────────────────────────────────────────────────

// Insert the data panel block INSIDE the "## The Money" section (or its
// variants: "## The Donor Class Map", "## Money", "## Funding") so it
// renders inside the Money tab. If no such section exists, fall back to
// inserting right after the frontmatter (old behavior — reader sees it at top).
const MONEY_SECTION_RE = /^##\s+(The Money|Money|Funding|The Donor Class Map|The Donors|Campaign Finance)(?:,?\s+\d{4})?\s*$/mi

function applyBlock(fileContent, block) {
  const startIdx = fileContent.indexOf(BLOCK_START)
  const endIdx = fileContent.indexOf(BLOCK_END)

  // If a block already exists, check whether it's in the right location
  // (inside the Money H2). If not, strip it and re-insert in the correct
  // spot. Prior behavior was "replace in place" which left legacy panels
  // stranded above every H2, breaking the ProfileTabs wrapper (the panel
  // content rendered in the preamble above the tab nav instead of inside
  // the Money tab).
  let withoutExistingBlock = fileContent
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const endEndIdx = endIdx + BLOCK_END.length
    // Also eat a trailing blank line if present so we don't accumulate them
    let trailingCut = endEndIdx
    while (withoutExistingBlock[trailingCut] === "\n") trailingCut++
    withoutExistingBlock = fileContent.slice(0, startIdx) + fileContent.slice(trailingCut)
  }

  // Find the Money section and insert inside it
  const moneyMatch = withoutExistingBlock.match(MONEY_SECTION_RE)
  if (moneyMatch) {
    const headingIdx = withoutExistingBlock.indexOf(moneyMatch[0])
    const afterHeading = headingIdx + moneyMatch[0].length
    let insertAt = afterHeading
    if (withoutExistingBlock[insertAt] === "\n") insertAt++
    return withoutExistingBlock.slice(0, insertAt) + "\n" + block + "\n\n" + withoutExistingBlock.slice(insertAt)
  }

  // No Money section — fall back to just-after-frontmatter (old behavior)
  const fmMatch = withoutExistingBlock.match(/^---\s*\n[\s\S]*?\n---\s*\n/)
  if (fmMatch) {
    const after = fmMatch[0]
    return withoutExistingBlock.slice(0, after.length) + "\n" + block + "\n\n" + withoutExistingBlock.slice(after.length)
  }

  // No frontmatter — prepend
  return block + "\n\n" + withoutExistingBlock
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ build-profile-data-panels ═══")
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  type filter: ${TYPE_FILTER || "all"}`)
  if (ENTITY_FILTER) console.log(`  entity filter: ${ENTITY_FILTER}`)
  console.log("")

  entitiesStore.loadEntities()
  const all = entitiesStore.queryEntities({})

  // Preload query engine (not used in v1 panel content yet — reserved for
  // Phase 3 sprint 2 enhancements like timing-proximity mentions)
  createQueryEngine()

  let targets = all.filter((e) => e.profile_path)
  if (ENTITY_FILTER) {
    targets = targets.filter((e) => e.id === ENTITY_FILTER)
  }
  if (TYPE_FILTER) {
    targets = targets.filter((e) => e.entity_type === TYPE_FILTER)
  }

  console.log(`  ${targets.length} entity profile(s) to process`)
  console.log("")

  const repoRoot = path.join(__dirname, "..")
  const stats = {
    scanned: 0,
    updated: 0,
    inserted: 0,
    unchanged: 0,
    missing_file: 0,
    errors: 0,
  }

  for (const entity of targets) {
    stats.scanned += 1
    const abs = path.join(repoRoot, entity.profile_path)
    if (!fs.existsSync(abs)) {
      stats.missing_file += 1
      if (VERBOSE) console.warn(`  ! missing: ${entity.profile_path}`)
      continue
    }

    let text
    try {
      text = fs.readFileSync(abs, "utf-8")
    } catch (e) {
      stats.errors += 1
      if (VERBOSE) console.warn(`  ! read error ${entity.profile_path}: ${e.message}`)
      continue
    }

    // Parse frontmatter to pick up profile-specific overrides
    // (total-received-note and custom-stats for outlier profiles like Trump)
    // and to honor the `checklist-na` opt-out convention (same as
    // pipeline-janitor.cjs + reclassify-readiness.cjs).
    let skipReason = null
    try {
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n/)
      if (fmMatch) {
        const yaml = require("js-yaml")
        const fm = yaml.load(fmMatch[1]) || {}
        entity.fm_total_received_note = fm["total-received-note"] || fm["career-total-note"] || null
        entity.fm_custom_stats = Array.isArray(fm["custom-stats"]) ? fm["custom-stats"] : null
        // Opt-out: editor flagged this profile's data-panel as N/A. Common
        // reasons: hand-tuned panel, profile is a story/essay rather than an
        // entity profile, or the canonical store data is known to be wrong
        // and shouldn't render until upstream fixes land.
        const checklistNa = Array.isArray(fm["checklist-na"]) ? fm["checklist-na"] : []
        const naSet = new Set(checklistNa.map(s => String(s).split(":")[0].trim()))
        if (naSet.has("data-panel") || naSet.has("auto-data-panel")) {
          skipReason = "checklist-na: data-panel"
        }
      }
    } catch {
      // Silent fallback — panel still renders, just without frontmatter overrides
    }

    if (skipReason) {
      stats.unchanged += 1
      if (VERBOSE) console.log(`  · skip ${entity.id}  (${skipReason})`)
      continue
    }

    const hadBlock = text.includes(BLOCK_START)
    const panel = renderPanel(entity)
    const updated = applyBlock(text, panel)

    if (updated === text) {
      stats.unchanged += 1
      continue
    }

    if (WRITE) {
      try {
        fs.writeFileSync(abs, updated, "utf-8")
        if (hadBlock) stats.updated += 1
        else stats.inserted += 1
        if (VERBOSE)
          console.log(
            `  ${hadBlock ? "↻" : "+"} ${entity.id}  ${entity.name.slice(0, 50).padEnd(50)}  [${entity.entity_type}]`,
          )
      } catch (e) {
        stats.errors += 1
        if (VERBOSE) console.warn(`  ! write error ${entity.profile_path}: ${e.message}`)
      }
    } else {
      if (hadBlock) stats.updated += 1
      else stats.inserted += 1
      if (VERBOSE)
        console.log(
          `  · ${hadBlock ? "would-update" : "would-insert"}  ${entity.id}  ${entity.name.slice(0, 50)}`,
        )
    }
  }

  // ─── Secondary pass: politician profiles not in entities.jsonl ───
  //
  // Some politicians (e.g. Cabinet members like Rubio) have profile files
  // but no row in entities.jsonl, so the main loop above skips them and
  // their auto:data-panel never updates. Walk the Politicians content
  // directory, find profiles with no matching entity, and run the same
  // panel rendering against a synthetic entity built from frontmatter +
  // the per-profile artifact.
  console.log("")
  console.log("  Secondary pass: politician profiles not in entities.jsonl...")
  const politiciansDir = path.join(repoRoot, "content", "Politicians")
  const yaml = require("js-yaml")
  const profilePathsInEntities = new Set(
    all.filter((e) => e.profile_path).map((e) => path.join(repoRoot, e.profile_path).toLowerCase())
  )
  const extraStats = { scanned: 0, inserted: 0, updated: 0, unchanged: 0, errors: 0 }

  function walkMd(dir) {
    if (!fs.existsSync(dir)) return []
    const out = []
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name)
      let st
      try { st = fs.statSync(full) } catch { continue }
      if (st.isDirectory()) out.push(...walkMd(full))
      else if (name.endsWith(".md")) out.push(full)
    }
    return out
  }

  for (const abs of walkMd(politiciansDir)) {
    if (profilePathsInEntities.has(abs.toLowerCase())) continue
    let text
    try { text = fs.readFileSync(abs, "utf-8") } catch { continue }
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n/)
    if (!fmMatch) continue
    let fm
    try { fm = yaml.load(fmMatch[1]) || {} } catch { continue }
    if (fm.type !== "politician") continue
    if (!fm.title) continue

    extraStats.scanned += 1
    const virtualEntity = {
      id: `virtual-${fm.title.toLowerCase().replace(/\s+/g, "-")}`,
      title: fm.title,
      entity_type: "politician",
      profile_path: path.relative(repoRoot, abs).replace(/\\/g, "/"),
      signals: {
        name: fm.title,
        party: fm.party || null,
        chamber: fm.chamber || null,
        state: fm.state || null,
        bioguide_id: fm["bioguide-id"] || null,
        fec_candidate_id: fm["fec-candidate-id"] || null,
        total_received: typeof fm["total-received"] === "number"
          ? fm["total-received"]
          : (typeof fm["total-received"] === "string"
             ? Number(fm["total-received"].replace(/[^0-9.-]/g, "")) || null
             : null),
        committees: Array.isArray(fm.committees) ? fm.committees : [],
        top_donors: [],
      },
      tags_approved: false,
      fm_total_received_note: fm["total-received-note"] || fm["career-total-note"] || null,
      fm_custom_stats: Array.isArray(fm["custom-stats"]) ? fm["custom-stats"] : null,
      fm_top_donors: Array.isArray(fm["top-donors"]) ? fm["top-donors"] : null,
    }

    const hadBlock = text.includes(BLOCK_START)
    const panel = renderPanel(virtualEntity)
    const updated = applyBlock(text, panel)
    if (updated === text) { extraStats.unchanged += 1; continue }

    if (WRITE) {
      try {
        fs.writeFileSync(abs, updated, "utf-8")
        if (hadBlock) extraStats.updated += 1; else extraStats.inserted += 1
        if (VERBOSE) console.log(`  ${hadBlock ? "↻" : "+"} (virtual) ${fm.title}`)
      } catch (e) {
        extraStats.errors += 1
        if (VERBOSE) console.warn(`  ! write error ${abs}: ${e.message}`)
      }
    } else {
      if (hadBlock) extraStats.updated += 1; else extraStats.inserted += 1
      if (VERBOSE) console.log(`  · would-${hadBlock ? "update" : "insert"} (virtual) ${fm.title}`)
    }
  }

  console.log("")
  console.log("═══ results ═══")
  console.log(`  entity-backed:`)
  console.log(`    scanned:      ${stats.scanned}`)
  console.log(`    inserted:     ${stats.inserted}`)
  console.log(`    updated:      ${stats.updated}`)
  console.log(`    unchanged:    ${stats.unchanged}`)
  console.log(`    missing file: ${stats.missing_file}`)
  console.log(`    errors:       ${stats.errors}`)
  console.log(`  politician-only (virtual entity from frontmatter):`)
  console.log(`    scanned:      ${extraStats.scanned}`)
  console.log(`    inserted:     ${extraStats.inserted}`)
  console.log(`    updated:      ${extraStats.updated}`)
  console.log(`    unchanged:    ${extraStats.unchanged}`)
  console.log(`    errors:       ${extraStats.errors}`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
