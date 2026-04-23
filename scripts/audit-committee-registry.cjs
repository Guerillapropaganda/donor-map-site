#!/usr/bin/env node
/**
 * audit-committee-registry.cjs — read-only scan of data/fec-committee-
 * registry.json against the vault. Surfaces:
 *
 *   A. CRITICAL — vault_profile path doesn't exist on disk (dead link)
 *   B. HIGH     — fec_name has near-zero token overlap with the vault
 *                 profile's title/aliases (Fairshake/FF PAC pattern —
 *                 committee ID wrongly linked to an unrelated profile)
 *   C. MEDIUM   — two committees with very different names share the
 *                 same vault_profile (could be legitimate aliasing of
 *                 a parent entity's PACs, could be a merge bug)
 *   D. INFO     — vault profile's frontmatter doesn't list its own
 *                 committee_id (one-way link from registry only)
 *
 * Output: prints a categorized report, writes JSON to
 * /tmp/enrichment/registry-audit-report.json.
 *
 * READ-ONLY. No writes. David reviews the report before any fixes.
 *
 * Usage:
 *   node scripts/audit-committee-registry.cjs
 */

const fs = require("node:fs")
const path = require("node:path")
const yaml = require("js-yaml")

const ROOT = path.resolve(__dirname, "..")
const REGISTRY = path.join(ROOT, "data", "fec-committee-registry.json")
const CONTENT = path.join(ROOT, "content")

// ─── Name normalization + similarity ────────────────────────────────

const STOPWORDS = new Set([
  "pac", "inc", "llc", "the", "and", "of", "a", "for", "in",
  "committee", "political", "action", "corp", "corporation",
  "ltd", "co", "group", "holdings", "holding",
])

function tokenize(s) {
  if (!s) return new Set()
  return new Set(
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  )
}

function jaccard(aSet, bSet) {
  if (aSet.size === 0 && bSet.size === 0) return 1
  if (aSet.size === 0 || bSet.size === 0) return 0
  let intersect = 0
  for (const t of aSet) if (bSet.has(t)) intersect++
  return intersect / (aSet.size + bSet.size - intersect)
}

// ─── Vault profile index ────────────────────────────────────────────

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return null
  try {
    return yaml.load(m[1])
  } catch {
    return null
  }
}

function loadProfileFrontmatter(relPath) {
  const full = path.join(ROOT, relPath)
  if (!fs.existsSync(full)) return { exists: false }
  try {
    const text = fs.readFileSync(full, "utf-8")
    const fm = parseFrontmatter(text)
    return { exists: true, frontmatter: fm || {} }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

// ─── Audit ─────────────────────────────────────────────────────────

function auditRegistry() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf-8"))
  const entries = Object.entries(registry)
  console.log(`Audit starting — ${entries.length} committee entries`)

  const findings = {
    A_critical_file_missing: [],
    B_high_name_mismatch: [],
    C_medium_shared_profile: [],
    D_info_frontmatter_missing_committee_id: [],
  }

  // Cache: profile path → frontmatter + tokenized title/aliases
  const profileCache = new Map()
  function getProfile(relPath) {
    if (profileCache.has(relPath)) return profileCache.get(relPath)
    const p = loadProfileFrontmatter(relPath)
    if (p.exists && p.frontmatter) {
      const title = p.frontmatter.title || ""
      const aliases = Array.isArray(p.frontmatter.aliases) ? p.frontmatter.aliases : []
      const nameSource = [title, ...aliases].join(" ")
      p.tokens = tokenize(nameSource)
      // Also collect committee_id(s) from frontmatter
      const fmIds = []
      const raw = p.frontmatter["committee-id"]
      if (raw) fmIds.push(String(raw))
      const rawList = p.frontmatter["committee-ids"]
      if (Array.isArray(rawList)) for (const x of rawList) fmIds.push(String(x))
      p.committee_ids_in_fm = new Set(fmIds)
    }
    profileCache.set(relPath, p)
    return p
  }

  // ─── Single-entry checks (A, B, D) ──
  const byProfile = new Map()  // for category C
  for (const [id, entry] of entries) {
    const vp = entry.vault_profile
    if (!vp) continue // unmapped — out of scope

    const profile = getProfile(vp)

    // A. Does the file exist?
    if (!profile.exists) {
      findings.A_critical_file_missing.push({
        committee_id: id,
        fec_name: entry.fec_name,
        vault_profile: vp,
        error: profile.error || "file not found",
      })
      continue // can't check B or D if file doesn't exist
    }

    // Collect for category C
    if (!byProfile.has(vp)) byProfile.set(vp, [])
    byProfile.get(vp).push({ id, fec_name: entry.fec_name, display_name: entry.display_name })

    // B. Name similarity
    // Compare (fec_name + display_name + aliases[]) tokens vs (title + profile aliases)
    const fecBits = [entry.fec_name, entry.display_name, ...(entry.aliases || [])].filter(Boolean).join(" ")
    const fecTokens = tokenize(fecBits)
    const score = jaccard(fecTokens, profile.tokens)
    if (score < 0.2 && fecTokens.size > 0 && profile.tokens.size > 0) {
      findings.B_high_name_mismatch.push({
        committee_id: id,
        fec_name: entry.fec_name,
        display_name: entry.display_name || null,
        vault_profile: vp,
        profile_title: profile.frontmatter.title,
        profile_aliases: profile.frontmatter.aliases || [],
        jaccard: Number(score.toFixed(3)),
      })
    }

    // D. Frontmatter awareness
    if (profile.committee_ids_in_fm && profile.committee_ids_in_fm.size > 0 &&
        !profile.committee_ids_in_fm.has(id)) {
      findings.D_info_frontmatter_missing_committee_id.push({
        committee_id: id,
        fec_name: entry.fec_name,
        vault_profile: vp,
        frontmatter_committee_ids: [...profile.committee_ids_in_fm],
      })
    }
  }

  // ─── Category C: shared profile, dissimilar names ──
  for (const [vp, committees] of byProfile) {
    if (committees.length < 2) continue
    // For each pair, compute name similarity
    for (let i = 0; i < committees.length; i++) {
      for (let j = i + 1; j < committees.length; j++) {
        const a = committees[i]
        const b = committees[j]
        const score = jaccard(tokenize(a.fec_name), tokenize(b.fec_name))
        if (score < 0.2) {
          findings.C_medium_shared_profile.push({
            vault_profile: vp,
            committee_a: { id: a.id, fec_name: a.fec_name },
            committee_b: { id: b.id, fec_name: b.fec_name },
            jaccard: Number(score.toFixed(3)),
          })
        }
      }
    }
  }

  return findings
}

// ─── Output ────────────────────────────────────────────────────────

function report(findings) {
  console.log()
  console.log("═══ REGISTRY AUDIT REPORT ═══")
  console.log()
  console.log("A. CRITICAL — vault_profile file missing:", findings.A_critical_file_missing.length)
  for (const f of findings.A_critical_file_missing.slice(0, 10)) {
    console.log(`  ${f.committee_id}  [${f.fec_name}]  →  ${f.vault_profile}  (${f.error})`)
  }
  if (findings.A_critical_file_missing.length > 10) console.log("  ... (truncated)")

  console.log()
  console.log("B. HIGH — fec_name vs vault profile name mismatch:", findings.B_high_name_mismatch.length)
  for (const f of findings.B_high_name_mismatch.slice(0, 20)) {
    console.log(`  ${f.committee_id}  jaccard=${f.jaccard}`)
    console.log(`    FEC:     ${f.fec_name}`)
    if (f.display_name) console.log(`    display: ${f.display_name}`)
    console.log(`    vault:   ${f.profile_title}  (${f.vault_profile})`)
    if (f.profile_aliases && f.profile_aliases.length) {
      console.log(`    aliases: ${f.profile_aliases.slice(0, 3).join(" / ")}`)
    }
  }
  if (findings.B_high_name_mismatch.length > 20) console.log(`  ... and ${findings.B_high_name_mismatch.length - 20} more`)

  console.log()
  console.log("C. MEDIUM — shared vault_profile, dissimilar fec_names:", findings.C_medium_shared_profile.length)
  for (const f of findings.C_medium_shared_profile.slice(0, 15)) {
    console.log(`  ${f.vault_profile}`)
    console.log(`    ${f.committee_a.id} "${f.committee_a.fec_name}"`)
    console.log(`    ${f.committee_b.id} "${f.committee_b.fec_name}"`)
    console.log(`    jaccard=${f.jaccard}`)
  }
  if (findings.C_medium_shared_profile.length > 15) console.log(`  ... and ${findings.C_medium_shared_profile.length - 15} more`)

  console.log()
  console.log("D. INFO — frontmatter doesn't list this committee_id:", findings.D_info_frontmatter_missing_committee_id.length)
  console.log("    (low signal — vault may track only the principal committee and registry catches affiliates)")

  console.log()
  console.log("Full report written to /tmp/enrichment/registry-audit-report.json")
}

// ─── Main ──────────────────────────────────────────────────────────

const findings = auditRegistry()

const outDir = "/tmp/enrichment"
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, "registry-audit-report.json")
fs.writeFileSync(outPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  counts: {
    A_critical: findings.A_critical_file_missing.length,
    B_high: findings.B_high_name_mismatch.length,
    C_medium: findings.C_medium_shared_profile.length,
    D_info: findings.D_info_frontmatter_missing_committee_id.length,
  },
  findings,
}, null, 2))

report(findings)
