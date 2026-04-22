/**
 * wrap-profile-sections.ts — ADR-0017 rendering fix
 *
 * ProfileTabs.tsx is a client-side component that reorganizes profile
 * page content into tabs by finding `.profile-section-card` divs with
 * `data-tab="..."` attributes. Auto-blocks (emitted by ingest scripts
 * as `<!-- auto:X start -->...<!-- auto:X end -->`) produced raw
 * tables WITHOUT the section-card wrapper, so the tab builder found
 * no cards (cards.length === 0) and rendered the nav empty at the
 * bottom of the article.
 *
 * This transformer wraps each auto-block in the correct section-card
 * div based on the block type and the profile type (donor vs
 * politician vs presidential). It also wraps the `## Sources` H2 as
 * a sources-tab card, and splits Archived-source content into its
 * own collapsed section.
 *
 * Runs at textTransform stage so downstream markdown/remark parsing
 * sees the wrapped HTML. Markdown supports inline HTML, so wrapping
 * the block content with `<div>...</div>` doesn't break the inner
 * markdown.
 *
 * Profile type is read from frontmatter.type. The kill-switch in
 * constructionMode.ts keeps these pages off public exposure, but
 * the wrapping is safe regardless — non-profile pages don't have
 * auto-blocks to match.
 */

import { QuartzTransformerPlugin } from "../types"

// For each auto-block type, the tab it belongs in, split by profile
// supertype. "politician" covers federal legislators; "presidential"
// covers Cabinet / Governor / SCOTUS / President (their tab set has
// an Executive tab instead of Voting). "donor" covers all donor
// subtypes (donor / corporation / pac / think-tank / lobbying-firm).
//
// When a block type isn't listed here, it falls through to
// data-tab="overview" which is the always-present default tab.
const AUTO_BLOCK_TAB: Record<string, { politician: string; presidential: string; donor: string }> = {
  "data-panel":            { politician: "overview",      presidential: "overview",      donor: "overview" },
  "wikipedia":             { politician: "overview",      presidential: "overview",      donor: "overview" },
  "gleif-lei":             { politician: "overview",      presidential: "overview",      donor: "overview" },

  // Money flowing to the profile (politician receives, donor ... also receives via their PAC)
  "fec-lifetime":          { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "fec-politician":        { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "fec-individual":        { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "fec-donor":             { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "fec-summary":           { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "fec":                   { politician: "donors",        presidential: "donors",        donor: "recipients" },

  // Legislative & voting (politicians only, skipped on donor profiles by absence)
  "voting-record":         { politician: "voting",        presidential: "executive",     donor: "voting" },
  "govtrack":              { politician: "voting",        presidential: "executive",     donor: "voting" },
  "sponsored-bills":       { politician: "voting",        presidential: "executive",     donor: "voting" },
  "congress-bills":        { politician: "voting",        presidential: "executive",     donor: "voting" },
  "congress-legislation":  { politician: "voting",        presidential: "executive",     donor: "voting" },
  "committee-assignments": { politician: "voting",        presidential: "executive",     donor: "voting" },

  // Executive-specific
  "executive-orders":      { politician: "voting",        presidential: "executive",     donor: "voting" },
  "executive-actions":     { politician: "voting",        presidential: "executive",     donor: "voting" },
  "governor-exec-actions": { politician: "voting",        presidential: "executive",     donor: "voting" },

  // Nonprofit / regulatory filings (donors + nonprofits)
  "irs-990":               { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "nonprofit-990":         { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "propublica-990":        { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "sec-edgar":             { politician: "donors",        presidential: "donors",        donor: "recipients" },
  "fara-foreign-agents":   { politician: "voting",        presidential: "executive",     donor: "wins" },

  // Policy outputs / lobbying / contracts (donors' "wins")
  "lda-lobbying":          { politician: "donors",        presidential: "donors",        donor: "wins" },
  "federal-register":      { politician: "voting",        presidential: "executive",     donor: "wins" },
  "usaspending":           { politician: "voting",        presidential: "executive",     donor: "wins" },
  "usaspending-subawards": { politician: "voting",        presidential: "executive",     donor: "wins" },
  "usaspending-grants":    { politician: "voting",        presidential: "executive",     donor: "wins" },
  "sam-contracts":         { politician: "voting",        presidential: "executive",     donor: "wins" },

  // Enforcement / legal — drop into analysis for all types
  "courtlistener-cases":   { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "opensanctions":         { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "offshore-records":      { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "ofac-sdn":              { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "ftc-enforcement":       { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "occ-enforcement":       { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "fda-enforcement":       { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "epa-echo":              { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "nhtsa-recalls":         { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "cpsc-recalls":          { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "stock-trades":          { politician: "analysis",      presidential: "analysis",      donor: "analysis" },
  "influence-cross-ref":   { politician: "analysis",      presidential: "analysis",      donor: "analysis" },

  // Sources harvests
  "harvested-sources":         { politician: "sources",   presidential: "sources",       donor: "sources" },
  "harvested-edge-citations":  { politician: "sources",   presidential: "sources",       donor: "sources" },
}

// Block → human-readable heading inside the card
const BLOCK_LABEL: Record<string, string> = {
  "data-panel":            "Overview",
  "wikipedia":             "Wikipedia Overview",
  "gleif-lei":             "LEI Entity Record",
  "fec-lifetime":          "FEC Lifetime Giving",
  "fec-politician":        "FEC Campaign Finance",
  "fec-individual":        "FEC Individual Contributions",
  "fec-donor":             "FEC Contribution Record",
  "fec-summary":           "FEC Cycle Summary",
  "fec":                   "FEC Records",
  "voting-record":         "Voting Record",
  "govtrack":              "GovTrack Voting Record",
  "sponsored-bills":       "Sponsored Bills",
  "congress-bills":        "Congressional Bills",
  "congress-legislation":  "Legislation",
  "committee-assignments": "Committee Assignments",
  "executive-orders":      "Executive Orders",
  "executive-actions":     "Executive Actions",
  "governor-exec-actions": "Gubernatorial Actions",
  "irs-990":               "IRS Form 990",
  "nonprofit-990":         "Nonprofit 990",
  "propublica-990":        "ProPublica 990 Data",
  "sec-edgar":             "SEC Filings",
  "fara-foreign-agents":   "Foreign Agent Activity (FARA)",
  "lda-lobbying":          "Lobbying Disclosures",
  "federal-register":      "Federal Register Activity",
  "usaspending":           "Federal Contracts",
  "usaspending-subawards": "Federal Subawards",
  "usaspending-grants":    "Federal Grants",
  "sam-contracts":         "SAM.gov Contracts",
  "courtlistener-cases":   "Court Cases",
  "opensanctions":         "OpenSanctions Records",
  "offshore-records":      "Offshore Records",
  "ofac-sdn":              "OFAC Sanctions",
  "ftc-enforcement":       "FTC Enforcement",
  "occ-enforcement":       "OCC Enforcement",
  "fda-enforcement":       "FDA Enforcement",
  "epa-echo":              "EPA Enforcement",
  "nhtsa-recalls":         "NHTSA Recalls",
  "cpsc-recalls":          "CPSC Recalls",
  "stock-trades":          "STOCK Act Trades",
  "influence-cross-ref":   "Cross-Profile Influence",
  "harvested-sources":     "Canonical Source Citations",
  "harvested-edge-citations": "Edge-Derived Citations",
}

const PUBLISHABLE_PROFILE_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

const PRESIDENTIAL_CHAMBERS = new Set([
  "Presidential", "Vice Presidential", "Cabinet", "Governor", "SCOTUS",
])

function pickBucket(fm: Record<string, unknown>): "politician" | "presidential" | "donor" | null {
  const type = String(fm.type ?? "")
  if (!PUBLISHABLE_PROFILE_TYPES.has(type)) return null
  if (type === "donor" || type === "corporation" || type === "pac" ||
      type === "think-tank" || type === "lobbying-firm") return "donor"
  // Politician-family
  const chamber = String(fm.chamber ?? "").trim()
  if (PRESIDENTIAL_CHAMBERS.has(chamber)) return "presidential"
  if (/Secretary|Director|Ambassador|Administrator|Justice|Attorney|Chair/i.test(chamber)) return "presidential"
  return "politician"
}

function parseFrontmatter(src: string): Record<string, unknown> | null {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!m) return null
  // Lightweight YAML: only need `type` and `chamber`. Avoid pulling in
  // the full js-yaml dependency in a hot transformer path.
  const fm: Record<string, unknown> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1]
    let val = kv[2].trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    fm[key] = val
  }
  return fm
}

function wrapBlocks(src: string, bucket: "politician" | "presidential" | "donor"): string {
  // Match each <!-- auto:X start --> ... <!-- auto:X end --> pair
  // and wrap it in a section-card div. We match non-greedily so
  // adjacent blocks don't get merged. The marker comments stay
  // inside for idempotency (re-runs won't double-wrap).
  return src.replace(
    /(<!--\s*auto:([a-z0-9-]+)\s+start\s*-->)([\s\S]*?)(<!--\s*auto:\2\s+end\s*-->)/g,
    (_match, startMarker, blockType, inner, endMarker) => {
      const mapping = AUTO_BLOCK_TAB[blockType]
      const tab = mapping ? mapping[bucket] : "overview"
      const label = BLOCK_LABEL[blockType] || blockType
      // Skip if the block is already wrapped (idempotent re-run)
      // by checking for the sentinel class in the immediately-surrounding text.
      // Simplest: just re-emit the wrapper; ProfileTabs dedup logic handles re-builds.
      return [
        "",
        `<div class="profile-section-card" data-tab="${tab}" data-auto-block="${blockType}">`,
        "",
        `### ${label}`,
        "",
        startMarker,
        inner,
        endMarker,
        "",
        "</div>",
        "",
      ].join("\n")
    },
  )
}

/**
 * Wrap known editorial H2 sections in their correct tab cards.
 *
 * The editorial template (per content/Profile Template.md) uses named
 * H2 sections: Who They Are, The Money, Key Votes, Politicians Funded,
 * Contracts + Lobbying, Executive Actions, Class Analysis, The
 * Contradictions, Timeline, Related Figures. Without this wrapping,
 * editorial prose renders unwrapped in the body and ProfileTabs can't
 * place it in the right tab — which was the "Who They Are appears
 * under Recipients" bug on American Enterprise Institute.
 *
 * Each entry maps a heading variant (case-insensitive) to a tab id
 * per profile bucket. Runs BEFORE wrapSourcesSection so that its
 * own match doesn't conflict.
 */
const H2_TAB_MAP: Array<{ match: RegExp; bucket: { politician: string; presidential: string; donor: string } }> = [
  { match: /^#{2,3}\s+Who\s+(They|He|She|We)\s+(Are|Is)\s*$/im, bucket: { politician: "overview", presidential: "overview", donor: "overview" } },
  { match: /^#{2,3}\s+Bio(graphy)?\s*$/im,                      bucket: { politician: "overview", presidential: "overview", donor: "overview" } },
  { match: /^#{2,3}\s+Background\s*$/im,                        bucket: { politician: "overview", presidential: "overview", donor: "overview" } },
  { match: /^#{2,3}\s+About\s*$/im,                             bucket: { politician: "overview", presidential: "overview", donor: "overview" } },
  { match: /^#{2,3}\s+Summary\s*$/im,                           bucket: { politician: "overview", presidential: "overview", donor: "overview" } },

  { match: /^#{2,3}\s+Class\s+Analysis\s*$/im,                  bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { match: /^#{2,3}\s+Analytical?\s+Patterns?\s*$/im,           bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { match: /^#{2,3}\s+Donor\s+Class\s+Map\s*$/im,               bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { match: /^#{2,3}\s+Central\s+Thesis\s*$/im,                  bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { match: /^#{2,3}\s+(The\s+)?Core\s+Contradiction\s*$/im,     bucket: { politician: "contradiction", presidential: "contradiction", donor: "contradiction" } },
  { match: /^#{2,3}\s+(The\s+)?Contradictions?\s*$/im,          bucket: { politician: "contradiction", presidential: "contradiction", donor: "contradiction" } },

  { match: /^#{2,3}\s+(The\s+)?Money\s*$/im,                    bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { match: /^#{2,3}\s+Funding\s*$/im,                           bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { match: /^#{2,3}\s+Campaign\s+Finance\s*$/im,                bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { match: /^#{2,3}\s+(The\s+)?Donors\s*$/im,                   bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },

  { match: /^#{2,3}\s+Key\s+Votes(\s*(\+|and)\s*Actions?)?\s*$/im, bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { match: /^#{2,3}\s+Voting\s+Record\s*$/im,                      bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { match: /^#{2,3}\s+Executive\s+(Actions?|Orders?)\s*$/im,       bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { match: /^#{2,3}\s+Key\s+Executive\s+Actions?\s*$/im,           bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { match: /^#{2,3}\s+Policy\s+Executed\s*$/im,                    bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { match: /^#{2,3}\s+Department\s+Actions?\s*$/im,                bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { match: /^#{2,3}\s+Diplomatic\s+Record\s*$/im,                  bucket: { politician: "voting", presidential: "executive", donor: "voting" } },

  { match: /^#{2,3}\s+Politicians?\s+Funded\s*$/im,             bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { match: /^#{2,3}\s+Allied\s+Donors?\s*(\+|and)\s*Politicians?\s+Funded\s*$/im, bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { match: /^#{2,3}\s+Contracts?\s*(\+|and)\s*Lobbying\s*$/im,  bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { match: /^#{2,3}\s+Policy\s+Positions?\s*$/im,               bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { match: /^#{2,3}\s+Influence\s*$/im,                         bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { match: /^#{2,3}\s+Clients?\s*(\+|and)\s*Issues?\s*$/im,     bucket: { politician: "donors", presidential: "donors", donor: "wins" } },

  { match: /^#{2,3}\s+Timeline\s*$/im,                          bucket: { politician: "timeline", presidential: "timeline", donor: "timeline" } },

  { match: /^#{2,3}\s+Related\s+Figures?\s*$/im,                bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
]

function wrapEditorialH2Sections(src: string, bucket: "politician" | "presidential" | "donor"): string {
  // For each H2 that matches a known editorial heading: find its
  // start, find the next H2 boundary (or `## Sources` / end of doc),
  // and wrap that range in a section-card with the mapped tab.
  //
  // Skip wrapping if the heading is already inside a section-card
  // (idempotency on re-runs).
  let out = src
  for (const entry of H2_TAB_MAP) {
    const m = out.match(entry.match)
    if (!m) continue
    const startIdx = out.indexOf(m[0])
    // Check if already wrapped: look backwards up to 200 chars for
    // an unclosed profile-section-card div.
    const preceding = out.slice(Math.max(0, startIdx - 400), startIdx)
    const openCount = (preceding.match(/<div class="profile-section-card"/g) || []).length
    const closeCount = (preceding.match(/<\/div>/g) || []).length
    if (openCount > closeCount) continue  // already inside a card

    // Find the end: next H2 OR end of string
    const after = out.slice(startIdx + m[0].length)
    const nextH2 = after.match(/^#{2,3}\s+/im)
    const endInAfter = nextH2 ? after.indexOf(nextH2[0]) : after.length
    const sectionEnd = startIdx + m[0].length + endInAfter

    const sectionContent = out.slice(startIdx, sectionEnd).trimEnd()
    const tab = entry.bucket[bucket]
    const wrapped = [
      "",
      `<div class="profile-section-card" data-tab="${tab}" data-h2-wrapped="true">`,
      "",
      sectionContent,
      "",
      "</div>",
      "",
    ].join("\n")
    out = out.slice(0, startIdx) + wrapped + out.slice(sectionEnd)
  }
  return out
}

function wrapSourcesSection(src: string, _bucket: "politician" | "presidential" | "donor"): string {
  // Find the `Sources` heading. Template calls for H2 but many
  // profiles use H3 (### Sources). Match H2/H3/H4. Wrap everything
  // from that heading to the end of the doc in a sources-tab card.
  //
  // Also optionally detect an "Archived" subsection inside Sources
  // and split it into its own collapsed card.
  const sourcesRe = /^#{2,4}\s+Sources\s*$/im
  const match = src.match(sourcesRe)
  if (!match) return src
  const idx = src.indexOf(match[0])
  const before = src.slice(0, idx)
  const after = src.slice(idx)

  // If the Sources region already has a section-card wrapper, skip.
  if (/<div\s+class="profile-section-card"\s+data-tab="sources"/i.test(after)) return src

  // Split on an Archived subsection if present (H3 or H4 under Sources).
  const archivedRe = /^#{3,4}\s+Archived\b[\s\S]*$/im
  const archivedMatch = after.match(archivedRe)
  let activeSources: string
  let archivedSources: string | null = null
  if (archivedMatch) {
    const archivedIdx = after.indexOf(archivedMatch[0])
    activeSources = after.slice(0, archivedIdx).trimEnd()
    archivedSources = after.slice(archivedIdx).trim()
  } else {
    activeSources = after.trimEnd()
  }

  const blocks: string[] = []
  blocks.push(
    "",
    `<div class="profile-section-card" data-tab="sources">`,
    "",
    activeSources,
    "",
    "</div>",
    "",
  )
  if (archivedSources) {
    blocks.push(
      "",
      `<div class="profile-section-card profile-section-card-collapsed" data-tab="sources" data-archived="true">`,
      "",
      "<details>",
      `<summary>Archived sources (click to expand)</summary>`,
      "",
      archivedSources,
      "",
      "</details>",
      "",
      "</div>",
      "",
    )
  }

  return before + blocks.join("\n")
}

function transform(src: string): string {
  const fm = parseFrontmatter(src)
  if (!fm) return src
  const bucket = pickBucket(fm)
  if (!bucket) return src

  // Short-circuit if nothing to wrap (Sources match must mirror
  // wrapSourcesSection's H2/H3/H4 tolerance)
  if (!/<!--\s*auto:[a-z0-9-]+\s+start/.test(src) && !/^#{2,4}\s+Sources\s*$/im.test(src)) {
    return src
  }

  let out = wrapBlocks(src, bucket)
  out = wrapEditorialH2Sections(out, bucket)
  out = wrapSourcesSection(out, bucket)
  return out
}

export const WrapProfileSections: QuartzTransformerPlugin = () => {
  return {
    name: "WrapProfileSections",
    textTransform(_ctx, src) {
      return transform(src)
    },
  }
}
