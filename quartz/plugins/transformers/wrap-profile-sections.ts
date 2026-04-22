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
  // data-panel holds "Total political spend", "Class position" etc.
  // Moved out of overview (was too prominent at the top on donor pages);
  // routed to Financials for donors so financial headline numbers
  // live with the other money tables.
  "data-panel":            { politician: "donors",        presidential: "donors",        donor: "recipients" },
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
// Heading → tab mapping. Each entry's `keywords` array is the list of
// word-boundary keyword patterns that identify the heading. Order
// matters: earlier entries win when multiple match. Trailing text
// (e.g. "Class Analysis. The Structural Impossibility") is allowed.
type BucketMap = { politician: string; presidential: string; donor: string }
const HEADING_TAB_MAP: Array<{ test: RegExp; bucket: BucketMap }> = [
  // Overview / bio-ish
  { test: /\bWho\s+(They|He|She|We)\s+(Are|Is)\b/i,                               bucket: { politician: "overview", presidential: "overview", donor: "overview" } },
  { test: /\b(Biography|Background|About|Summary)\b/i,                            bucket: { politician: "overview", presidential: "overview", donor: "overview" } },
  { test: /\b(What|How|Why)\s+They\s+(Want|Believe|Think|Do)\b/i,                 bucket: { politician: "overview", presidential: "overview", donor: "overview" } },

  // Analysis
  { test: /\bClass\s+Analysis\b/i,                                                bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bAnalytical?\s+Patterns?\b/i,                                         bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bDonor\s+Class\s+Map\b/i,                                             bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bCentral\s+Thesis\b/i,                                                bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bInfluence\s+Network\b/i,                                             bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bRelated\s+Figures?\b/i,                                              bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },

  // Contradictions
  { test: /\b(The\s+)?Core\s+Contradiction\b/i,                                   bucket: { politician: "contradiction", presidential: "contradiction", donor: "contradiction" } },
  { test: /\b(The\s+)?Contradictions?\b/i,                                        bucket: { politician: "contradiction", presidential: "contradiction", donor: "contradiction" } },

  // Money / recipients / spending
  { test: /\b(The\s+)?Money\b/i,                                                  bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bCampaign\s+Finance\b/i,                                              bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\b(Political\s+)?Spending\b/i,                                         bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bDonation/i,                                                          bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bContribution/i,                                                      bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\b(The\s+)?Donors\b/i,                                                 bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bFunding\b/i,                                                         bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bWho\s+They\s+Fund\b/i,                                               bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bPoliticians?\s+Funded\b/i,                                           bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },

  // Legislative / executive
  { test: /\bKey\s+Votes\b/i,                                                     bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bVoting\s+Record\b/i,                                                 bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bExecutive\s+(Actions?|Orders?)\b/i,                                  bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bPolicy\s+Executed\b/i,                                               bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bDepartment\s+Actions?\b/i,                                           bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bDiplomatic\s+Record\b/i,                                             bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bLegislative\s+Record\b/i,                                            bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bSB\s*\d|HB\s*\d|HR\s*\d|SR\s*\d|AB\s*\d/,                            bucket: { politician: "voting", presidential: "executive", donor: "voting" } }, // state/federal bill identifiers

  // Policy / wins (donor-side outputs)
  { test: /\bWhat\s+They('s|'ve)?\s+Gotten\b/i,                                   bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { test: /\bContracts?\s*(\+|and)?\s*Lobbying\b/i,                               bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { test: /\bFederal\s+Contracts?\b/i,                                            bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { test: /\bPolicy\s+Positions?\b/i,                                             bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { test: /\bInfluence\b/i,                                                       bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { test: /\bClients?\s*(\+|and)?\s*Issues?\b/i,                                  bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { test: /\bLobbying\s+Activity\b/i,                                             bucket: { politician: "donors", presidential: "donors", donor: "wins" } },
  { test: /\bSenate\s+Investigation\b/i,                                          bucket: { politician: "analysis", presidential: "analysis", donor: "wins" } },

  // Timeline
  { test: /\bTimeline\b/i,                                                        bucket: { politician: "timeline", presidential: "timeline", donor: "timeline" } },
  { test: /\bDonation-to-Policy\b/i,                                              bucket: { politician: "timeline", presidential: "timeline", donor: "timeline" } },

  // Network / infrastructure / architecture (money + influence hybrid — analysis tab)
  { test: /\bNetwork\s+Spending\b/i,                                              bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bElectoral\s+Cycle\s+Spending\b/i,                                    bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bKey\s+Network\s+Donors\b/i,                                          bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bFinancial\s+(Scale|Overview|Summary)\b/i,                            bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bRevenue\s+(History|Breakdown)\b/i,                                   bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bTax\s+Filings?\b/i,                                                  bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bTop\s+Recipients?\b/i,                                               bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },
  { test: /\bMega-Donors?\b/i,                                                    bucket: { politician: "donors", presidential: "donors", donor: "recipients" } },

  // Infrastructure + network + pipelines (analysis territory)
  { test: /\b(Think\s+Tank|Dark\s+Money|Legal|Media|Academic)\s+Pipeline/i,       bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bInfrastructure\b/i,                                                  bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bDonor\s+Summit\b/i,                                                  bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bAnti-Labor\s+War\b/i,                                                bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\bEnemies\s*\/?\s*Opposition\b/i,                                      bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },
  { test: /\b(Cross-Reference|Cross\s+Vault)\b/i,                                 bucket: { politician: "analysis", presidential: "analysis", donor: "analysis" } },

  // Case / graveyard / bill-kill stories (voting/contradiction)
  { test: /\bGraveyard\b/i,                                                       bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bKilled\s+by\b/i,                                                     bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
  { test: /\bDied\s+in\b/i,                                                       bucket: { politician: "voting", presidential: "executive", donor: "voting" } },
]

function matchHeadingTab(headingText: string, bucket: "politician" | "presidential" | "donor"): string | null {
  for (const entry of HEADING_TAB_MAP) {
    if (entry.test.test(headingText)) return entry.bucket[bucket]
  }
  return null // no keyword match — caller uses positional inheritance
}

function wrapEditorialH2Sections(src: string, bucket: "politician" | "presidential" | "donor"): string {
  // Linear scan: find every H2/H3 heading in the body. For each one:
  //   - If the heading is inside an auto-block or already inside a
  //     section-card wrapper → skip
  //   - If the section's body contains an <!-- auto:X --> marker →
  //     skip (wrapBlocks handles that case, and double-wrapping would
  //     create nested .profile-section-card divs that ProfileTabs
  //     would count twice)
  //   - Otherwise → wrap the heading + its body (until the next H2/H3
  //     or end of doc) in a section-card. Tab is chosen by heading
  //     keyword match; catch-all default is "overview" so no editorial
  //     prose renders outside a tab.
  //
  // Processing order: walk headings in reverse so earlier insertions
  // don't shift later heading positions.

  // Collect all H2/H3 heading positions
  const headings: Array<{ start: number; end: number; text: string; level: number }> = []
  const headingRe = /^(#{2,3})\s+([^\n]+?)\s*$/gm
  let m: RegExpExecArray | null
  while ((m = headingRe.exec(src)) !== null) {
    headings.push({
      start: m.index,
      end: m.index + m[0].length,
      text: m[2],
      level: m[1].length,
    })
  }

  if (headings.length === 0) return src

  // Compute DIRECT content range for each heading: from its start to
  // the NEXT heading regardless of level, or end of doc. This keeps
  // wraps disjoint (never nested) — a parent H2 doesn't contain its
  // H3 children's wraps because each heading owns only the prose
  // immediately following it until the next heading line of any level.
  //
  // Previous version used "next heading of same or higher level" which
  // made H2 sections include all H3 sub-sections. When both got wrapped
  // in reverse order, the result was `<div>H2 wrap containing <div>H3
  // wrap</div> ...</div>` — nested section-cards. The HTML parser
  // choked on Koch Network (1,164 lines, many H2+H3 combos).
  type Section = { headingStart: number; headingEnd: number; contentEnd: number; text: string; level: number }
  const sections: Section[] = []
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]
    const next = headings[i + 1]
    sections.push({
      headingStart: h.start,
      headingEnd: h.end,
      contentEnd: next ? next.start : src.length,
      text: h.text,
      level: h.level,
    })
  }

  // Skip Sources-tab-bound sections — wrapSourcesSection handles them
  // after this pass runs. Also skip headings whose body begins with
  // an auto-block start marker (that's an auto-block heading —
  // wrapBlocks handles it).
  const isSourcesHeading = (s: string) => /^Sources\b/i.test(s)
  const bodyContainsAutoBlock = (body: string) =>
    /<!--\s*auto:[a-z0-9-]+\s+start/i.test(body)
  const bodyIsAutoBlockOnly = (body: string) => {
    // Section body starts with auto-block marker (ignoring whitespace)
    const trimmed = body.trimStart()
    return /^<!--\s*auto:[a-z0-9-]+\s+start/i.test(trimmed)
  }

  // Two-pass: forward pass computes tab for each section with
  // positional inheritance (unmatched headings inherit the last
  // matched tab from a preceding section). Then wrap in reverse so
  // insertions don't shift earlier positions.
  //
  // Why inheritance: profiles often have sub-sections that continue
  // their parent's topic. E.g. "Estimated costs:" after "SB 562
  // (2017)" semantically belongs in the voting tab like SB 562.
  // Keyword matching can't catch sub-section headings without topic
  // vocabulary. Inheritance routes them correctly by context.
  const tabAssignments: Array<string> = new Array(sections.length).fill("overview")
  let lastMatched = "overview"
  for (let i = 0; i < sections.length; i++) {
    const matched = matchHeadingTab(sections[i].text, bucket)
    if (matched) {
      tabAssignments[i] = matched
      lastMatched = matched
    } else {
      tabAssignments[i] = lastMatched
    }
  }

  // Process in reverse so inserts don't invalidate earlier positions.
  let out = src
  for (let i = sections.length - 1; i >= 0; i--) {
    const s = sections[i]
    const headingStart = s.headingStart
    const headingEnd = s.headingEnd
    const contentEnd = s.contentEnd
    const body = out.slice(headingEnd, contentEnd)

    if (isSourcesHeading(s.text)) continue
    if (bodyIsAutoBlockOnly(body)) continue
    if (bodyContainsAutoBlock(body)) continue  // mixed — skip to avoid nested wraps

    // Already inside a profile-section-card wrapper?
    const preceding = out.slice(Math.max(0, headingStart - 600), headingStart)
    const openCount = (preceding.match(/<div class="profile-section-card"/g) || []).length
    const closeCount = (preceding.match(/<\/div>/g) || []).length
    if (openCount > closeCount) continue

    const tab = tabAssignments[i]
    const sectionContent = out.slice(headingStart, contentEnd).trimEnd()
    const wrapped = [
      "",
      `<div class="profile-section-card" data-tab="${tab}" data-h2-wrapped="true">`,
      "",
      sectionContent,
      "",
      "</div>",
      "",
    ].join("\n")
    out = out.slice(0, headingStart) + wrapped + out.slice(contentEnd)
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
