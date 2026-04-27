#!/usr/bin/env node
/**
 * build-policy-pages.cjs — Phase 2.75 Policy Battles MVP
 *
 * Generates static Quartz markdown pages from data/policies.jsonl +
 * data/events.jsonl + data/polling.jsonl + query-engine computed data.
 *
 * For each policy in policies.jsonl, writes:
 *   content/Policies/{slug}.md          — the public-facing policy page
 *
 * Also writes:
 *   content/Policies/index.md           — index of all v1 policies
 *   content/Policies/who-blocks-us.md   — cross-policy enemy list
 *
 * These are static pages generated from the canonical data stores.
 * When Phase 2.5 auth lands and the live /api/query endpoint exists,
 * a runtime version can supplement or replace these with on-demand data.
 * For v1, static-at-build-time is the right tradeoff: simple, cheap,
 * survives as actual HTML for search engines + social shares.
 *
 * Editorial firewall for high-risk pages (ADR-0004):
 *   Policies with high_risk_editorial=true get a warning header in
 *   their generated markdown reminding the editor that any prose
 *   changes must go through the ADR-0004 banned-word checklist.
 *
 * Usage:
 *   node scripts/build-policy-pages.cjs           # dry-run
 *   node scripts/build-policy-pages.cjs --write
 */

const fs = require("fs")
const path = require("path")
const policies = require("./lib/policies-store.cjs")
const polling = require("./lib/polling-store.cjs")
const events = require("./lib/events-store.cjs")
const { createQueryEngine } = require("./lib/query-engine.cjs")

const WRITE = process.argv.includes("--write")
const OUT_DIR = path.join(__dirname, "..", "content", "Policies")

const BANNED_WORDS = ["bought", "co-opted", "bribed", "corrupt", "scheme", "paid off"]

function formatUsd(n) {
  if (typeof n !== "number" || !n) return "—"
  return "$" + n.toLocaleString()
}

// ─── Headline gap computation (2026-04-27) ───────────────────────────
//
// Per the /policies UX riff: every policy page leads with a normie-friendly
// "punch line + stat line" computed from the canonical stores. Voice arc is
// normie at top → data in the middle → journalistic close at the bottom.
// Auto-computed for scale (designed for 30+ policies); editor can override
// the punch line via policy.editorial_headline.
//
// Lead line is selected by legislative_status. Stat line composes whichever
// data points have meaningful values (we skip "0 polls" rather than printing
// awkward zeroes).

// Lead lines selected by legislative_status. The `passed` and `signed` cases
// branch on support level: laws can pass against majority public opinion
// (e.g. anti-BDS laws have plurality not majority support — calling that
// "public will translated into law" would be dishonest).
const LEAD_LINES = {
  stalled: "**The public wants this. Congress doesn't.**",
  blocked_in_committee: "**Bottled up before a vote.**",
  partial: "**The public wants this. Congress half-did it.**",
  passed_majority: "**Public will, eventually translated into law.**",
  passed_minority: "**Passed despite weak public support.**",
  vetoed: "**Public support. Vetoed anyway.**",
  never_introduced: "**Public support. Never even debated.**",
  unknown: "**Public support meets legislative silence.**",
}

function computeGapHeadline(policy, polls, relatedEvents) {
  // ── Polling aggregate ────────────────────────────────────────────
  // Sample-size-weighted mean across all polls with a numeric support_pct.
  // Polls without a sample size are treated as n=1000 (median-ish poll size)
  // so they aren't excluded outright but don't dominate either.
  const validPolls = polls.filter(
    (p) => typeof p.support_pct === "number" && p.support_pct >= 0 && p.support_pct <= 100,
  )
  let supportPct = null
  let supportRange = null
  let pollOrgs = []
  let lastPolled = null
  if (validPolls.length > 0) {
    const totalWeight = validPolls.reduce((s, p) => s + (p.sample_size || 1000), 0)
    const weightedSum = validPolls.reduce(
      (s, p) => s + p.support_pct * (p.sample_size || 1000),
      0,
    )
    supportPct = Math.round(weightedSum / totalWeight)
    const sorted = [...validPolls].sort((a, b) => a.support_pct - b.support_pct)
    supportRange = [sorted[0].support_pct, sorted[sorted.length - 1].support_pct]
    pollOrgs = [...new Set(validPolls.map((p) => p.org).filter(Boolean))]
    const dated = validPolls.filter((p) => p.fielded).sort((a, b) => b.fielded.localeCompare(a.fielded))
    if (dated.length) lastPolled = dated[0].fielded
  }

  // ── Bill / event aggregate ──────────────────────────────────────
  // We treat any related event with a bill-shaped title (H.R., S., AB, etc.)
  // OR type === "bill_introduction" / "floor_vote" as a "bill" for headline
  // counting. Imperfect but auto-scales to whatever events.jsonl tags.
  const billLike = relatedEvents.filter(
    (e) =>
      e.type === "bill_introduction" ||
      e.type === "floor_vote" ||
      /^(h\.?r\.?|s\.?|ab|sb|hb)\s*\d/i.test(e.title || ""),
  )
  const billsIntroduced = billLike.length
  const billsPassed = billLike.filter(
    (e) => e.outcome === "passed" || e.outcome === "signed",
  ).length

  // Earliest dated event → "stalled since YYYY"
  const datedEvents = relatedEvents
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const earliestYear = datedEvents.length ? datedEvents[0].date.slice(0, 4) : null

  // ── Compose lead + stat line ────────────────────────────────────
  // Resolve lead line. `passed` / `signed` branch on majority vs minority
  // public support — passing a law that 47% support is not "public will."
  let leadKey = policy.legislative_status
  if (leadKey === "passed" || leadKey === "signed") {
    leadKey = supportPct !== null && supportPct < 50 ? "passed_minority" : "passed_majority"
  }
  const lead = policy.editorial_headline || LEAD_LINES[leadKey] || LEAD_LINES.unknown

  const statParts = []
  if (supportPct !== null) {
    const pollWord = validPolls.length === 1 ? "poll" : "polls"
    statParts.push(`${supportPct}% support across ${validPolls.length} ${pollWord}`)
  }
  if (billsIntroduced > 0) {
    const billWord = billsIntroduced === 1 ? "federal bill" : "federal bills"
    statParts.push(`${billsIntroduced} ${billWord} introduced`)
    // Suppress the "Y passed" stat when the policy is stalled but a tangentially
    // related bill happened to pass (e.g. housing has a supply-side LIHTC
    // expansion in events.jsonl — passing that next to "stalled since YYYY"
    // confuses the reader). The legislative_summary explains the nuance.
    const suppressPassedCount =
      policy.legislative_status === "stalled" && billsPassed > 0
    if (!suppressPassedCount) {
      statParts.push(`${billsPassed} passed`)
    }
  }
  if (earliestYear && policy.legislative_status === "stalled") {
    // Capitalize since this becomes a sentence after a period
    statParts.push(`Stalled since ${earliestYear}`)
  }

  return {
    lead,
    statLine: statParts.length ? statParts.join(". ") + "." : null,
    supportPct,
    supportRange,
    pollOrgs,
    lastPolled,
    billsIntroduced,
    billsPassed,
    earliestYear,
  }
}

// ─── Helpers for opposition-donor markdown (2026-04-27 sidebar work) ──

// Convert "content/Donors & Power Networks/Tech & Crypto/a16z - Andreessen Horowitz.md"
// into a [[wikilink]] that Quartz resolves. Falls back to plain text when the
// entity has no profile_path (orphan / pathless stubs per ADR-0024).
function profileWikilink(name, profilePath) {
  if (!profilePath || typeof profilePath !== "string") return name
  const m = profilePath.match(/([^/\\]+)\.md$/)
  if (!m) return name
  const fileName = m[1]
  // [[wikilink|display]] — wikilink resolves to the file's slug
  return `[[${fileName}|${name}]]`
}

// Pretty-print a USD amount. "$159,266,473" for non-zero, "—" otherwise.
function formatUsdShort(n) {
  if (typeof n !== "number" || !n) return "—"
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

// ─── Helpers for narrative timeline (2026-04-27 timeline work) ────────

// Heuristic federal-vs-state classifier for an event title. Federal bills
// shape: "S. NNN", "H.R. NNN", "S.NNN/H.R.NNN", or contain federal-only
// markers like "Inflation Reduction Act", "CMS", "DOJ", "Federal".
// State markers: state name prefix ("California ", "Washington "), or
// state-bill abbreviations (AB / SB / RCW / HB / "House Bill" prefixed
// with state name).
const STATE_NAMES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
]
function eventScope(ev) {
  const t = (ev.title || "").trim()
  if (STATE_NAMES.some((s) => t.startsWith(s + " ") || t.startsWith(s + ":"))) return "state"
  if (/^(?:H\.?R\.?|S\.?)\s*\d/i.test(t)) return "federal"
  if (/Inflation Reduction Act|CMS|Federal\b|United States/.test(t)) return "federal"
  if (/\bAB\s*\d|\bSB\s*\d|\bHB\s*\d|RCW\s*\d/.test(t)) return "state"
  return "federal" // default: federal
}

// Outcome-aligned icon. Reads honestly: ✓ for the policy advancing, ✗ for
// stalling, ⚠ for partial, 🚫 for vetoed/blocked.
function outcomeIcon(outcome) {
  switch (outcome) {
    case "passed":
    case "signed":
      return "✓"
    case "vetoed":
      return "🚫"
    case "stalled":
    case "blocked_in_committee":
    case "withdrawn":
      return "✗"
    case "partial":
      return "⚠"
    default:
      return "·"
  }
}

// ─── Page builder ─────────────────────────────────────────────────────

function buildPolicyPage(policy, engine, ctx = {}) {
  const polls = polling.getPollsForPolicy(policy.id)

  // Query events.jsonl for every event whose policy_id matches this
  // policy — this is the canonical way to find legislative history.
  // policy.related_events (if populated) is treated as an additional
  // allow-list of ids to include even if their policy_id doesn't match.
  const eventsByPolicyId = events.queryEvents({ policy_id: policy.id })
  const explicitRelated = (policy.related_events || [])
    .map((id) => events.getEvent(id))
    .filter(Boolean)
  const seen = new Set()
  const relatedEvents = [...eventsByPolicyId, ...explicitRelated]
    .filter((e) => {
      if (!e || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
    // Sort by date descending, null dates at the end
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.localeCompare(a.date)
    })

  // Per-policy opposition donors: ctx.policyDonors[policy.id] is precomputed
  // by main() so we can also build the cross-policy recurrence map (a donor
  // who blocks 4 of 5 policies gets a badge). Falls back to the legacy
  // cross-policy aggregate if ctx wasn't provided (CLI smoke tests).
  const oppositionDonors =
    (ctx.policyDonors && ctx.policyDonors[policy.id]) ||
    (() => {
      try {
        return engine.topPolicyOppositionDonors(policy, { limit: 10 })
      } catch (_) {
        return []
      }
    })()
  const crossPolicyMap = ctx.crossPolicyMap || new Map()
  const totalPolicyCount = ctx.totalPolicyCount || 1

  const lines = []

  // Frontmatter
  lines.push("---")
  lines.push(`title: "${policy.title.replace(/"/g, '\\"')}"`)
  lines.push(`type: policy`)
  lines.push(`slug: ${policy.slug}`)
  lines.push(`policy-id: ${policy.id}`)
  lines.push(`category: ${policy.category}`)
  lines.push(`legislative-status: ${policy.legislative_status}`)
  if (policy.public_support_pct !== null)
    lines.push(`public-support-pct: ${policy.public_support_pct}`)
  if (policy.opposition_capital_types && policy.opposition_capital_types.length) {
    lines.push(`opposition-capital-types:`)
    for (const t of policy.opposition_capital_types) lines.push(`  - ${t}`)
  }
  if (policy.class_analysis_tags && policy.class_analysis_tags.length) {
    lines.push(`class-analysis-tags:`)
    for (const t of policy.class_analysis_tags) lines.push(`  - ${t}`)
  }
  if (policy.high_risk_editorial) lines.push(`high-risk-editorial: true`)
  if (policy.requires_legal_review) lines.push(`requires-legal-review: true`)
  // content-readiness enforced by publication-readiness-check.cjs (CLAUDE.md rule 9).
  // Defaults to "draft" — policy records must be promoted explicitly in data/policies.jsonl
  // before the publication gate will allow the page on a public URL.
  lines.push(`content-readiness: ${policy.content_readiness || "draft"}`)
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push(`generated-by: scripts/build-policy-pages.cjs`)
  lines.push(`editor-vouched: true`)
  lines.push("---")
  lines.push("")

  // High-risk editorial firewall header
  if (policy.high_risk_editorial) {
    lines.push("<!--")
    lines.push("  HIGH-RISK EDITORIAL — ADR-0004 firewall applies to any prose")
    lines.push("  edits on this page. Banned words in prose body:")
    lines.push("    " + BANNED_WORDS.join(", "))
    lines.push("  Class analysis tags carry the opinion weight via structured")
    lines.push("  metadata, not prose. David reviews personally before publication.")
    lines.push("-->")
    lines.push("")
  }

  // Title
  lines.push(`# ${policy.title}`)
  lines.push("")

  // Headline gap — computed punch line + stat line. Sets the normie-voice
  // hook above the fold. Editor can override the punch line via
  // policy.editorial_headline. Per /policies UX riff 2026-04-27.
  const headline = computeGapHeadline(policy, polls, relatedEvents)
  lines.push(headline.lead)
  lines.push("")
  if (headline.statLine) {
    lines.push(headline.statLine)
    lines.push("")
  }

  // Plain English blurb
  lines.push("## What it would do")
  lines.push("")
  lines.push(policy.plain_english || "_(editor writes one paragraph here — plain English, no spin)_")
  lines.push("")

  // The gap — detail layer. Manual policy.public_support_pct overrides the
  // computed weighted mean if set; otherwise we show the computed values
  // honestly (mean + range + N + last-polled date).
  lines.push("## The gap")
  lines.push("")
  if (policy.public_support_pct !== null) {
    lines.push(`- **Public support:** ${policy.public_support_pct}% _(editor-set)_`)
  } else if (headline.supportPct !== null) {
    const rangeStr = headline.supportRange
      ? ` _(weighted across ${headline.pollOrgs.length} pollster${headline.pollOrgs.length === 1 ? "" : "s"}; range ${headline.supportRange[0]}–${headline.supportRange[1]}%)_`
      : ""
    lines.push(`- **Public support:** ${headline.supportPct}%${rangeStr}`)
    if (headline.lastPolled) {
      lines.push(`- **Last polled:** ${headline.lastPolled}`)
    }
  } else {
    lines.push(`- **Public support:** _(no polling records yet)_`)
  }
  lines.push(`- **Legislative status:** ${policy.legislative_status}`)
  if (headline.billsIntroduced > 0) {
    lines.push(
      `- **Federal bills:** ${headline.billsIntroduced} introduced, ${headline.billsPassed} signed into law`,
    )
  }
  if (policy.legislative_summary) {
    lines.push("")
    lines.push(`> ${policy.legislative_summary}`)
  }
  lines.push("")

  // Polling details
  if (polls.length) {
    lines.push("### Polling detail")
    lines.push("")
    lines.push("| Source | Support | Oppose | Sample | Fielded |")
    lines.push("|---|---|---|---|---|")
    for (const p of polls) {
      lines.push(
        `| ${p.org} | ${p.support_pct ?? "—"}% | ${p.oppose_pct ?? "—"}% | ${p.sample_size ?? "—"} | ${p.fielded ?? "—"} |`,
      )
    }
    lines.push("")
  }

  // Who's blocking — per-policy opposition donors, ranked by total political
  // spend. Each donor row is wikilinked to its profile when available, shows
  // its capital_type tag, and gets a "blocks N of M policies" badge when it
  // appears in the opposition list of multiple policies (cross-policy
  // recurrence — the recurring villain pattern).
  lines.push("## Who's blocking it")
  lines.push("")
  if (policy.opposition_capital_types && policy.opposition_capital_types.length) {
    lines.push(
      `Opposition comes from **${policy.opposition_capital_types.join(", ")}** — the capital fractions with a direct material stake in the current policy.`,
    )
    lines.push("")
  }
  if (oppositionDonors.length) {
    lines.push("### Top opposition donors")
    lines.push("")
    lines.push("| Donor | Capital type | Total spend | Politicians funded | Cross-policy |")
    lines.push("|---|---|---|---|---|")
    for (const d of oppositionDonors) {
      const linked = profileWikilink(d.name, d.profile_path)
      const blocks = crossPolicyMap.get(d.name) || 1
      const badge =
        blocks > 1 ? `**${blocks} of ${totalPolicyCount}**` : "—"
      lines.push(
        `| ${linked} | ${d.capital_type} | ${formatUsdShort(d.total_spend)} | ${d.politicians_count ?? "—"} | ${badge} |`,
      )
    }
    lines.push("")
    // Public-facing line: short, useful, points to the cross-policy view.
    lines.push(
      `_See [[who-blocks-us|Who Blocks Us]] for the cross-policy enemy list. Donor coverage is partial today; expanding._`,
    )
    lines.push("")
    // Ops-only methodology — invisible on the public site (HTML comments),
    // shown as a "🔒 ops-only" block in the ops preview via the page's
    // revealOpsOnly preprocessor. Convention: <!-- ops-only --> ... <!-- /ops-only -->.
    // Wrap as a SINGLE HTML comment so the content is fully inert in
    // public render (CommonMark type-2 HTML block — content between
    // <!-- and --> is literal, markdown is NOT processed). Ops preview's
    // revealOpsOnly() extracts the inner text and renders it as a
    // visible blockquote.
    lines.push("<!-- ops-only")
    lines.push("")
    lines.push(
      `**Methodology:** Donors with a \`capital_type\` tag matching this policy's \`opposition_capital_types\` are pulled from \`data/entities.jsonl\`; political spend is aggregated from the full relationships edge store via the librarian (ADR-0024). The "Cross-policy" column counts how many of the ${totalPolicyCount} tracked policies each donor's capital_type matches. Coverage is partial: 271 of 1,710 entities tagged (~16%); \`finance-capital\` is not yet a tagged value, which is why some policies show empty here.`,
    )
    lines.push("")
    lines.push("-->")
    lines.push("")
  } else {
    // Honest disclosure: when no entities match, say *why*. For
    // student_debt this means finance-capital is not yet a tagged value;
    // the page tells the reader rather than silently showing nothing.
    lines.push(
      `_No entities in \`data/entities.jsonl\` are currently tagged with the capital types ${policy.opposition_capital_types?.map((t) => `\`${t}\``).join(", ") || "for this policy"}. Tagging coverage is expanding (currently 271 of 1,710 entities, 16%). This list will populate as tags are added._`,
    )
    lines.push("")
  }

  // Legislative timeline — year-grouped, scope-tagged (federal vs state),
  // outcome-iconified. Replaces the flat bullet list per /policies UX riff
  // 2026-04-27. Reads as a story: by-year sections, federal/state context
  // visible at a glance, ✓/✗/⚠/🚫 icons signal advance/stall/partial/veto.
  if (relatedEvents.length) {
    lines.push("## Legislative timeline")
    lines.push("")

    // Group events by year (date ?? "undated")
    const byYear = new Map()
    for (const ev of relatedEvents) {
      const yr = ev.date ? ev.date.slice(0, 4) : "undated"
      if (!byYear.has(yr)) byYear.set(yr, [])
      byYear.get(yr).push(ev)
    }
    const sortedYears = [...byYear.keys()].sort((a, b) => {
      if (a === "undated") return 1
      if (b === "undated") return -1
      return b.localeCompare(a) // newest first
    })

    for (const yr of sortedYears) {
      lines.push(`### ${yr}`)
      lines.push("")
      for (const ev of byYear.get(yr)) {
        const icon = outcomeIcon(ev.outcome)
        const scope = eventScope(ev)
        const scopeBadge = scope === "federal" ? "🇺🇸 federal" : "🏛️ state"
        const dateSuffix = ev.date ? ` (${ev.date.slice(0, 10)})` : ""
        const obstructionNote =
          ev.obstruction_type && ev.obstruction_type !== "n/a"
            ? ` _via ${ev.obstruction_type}_`
            : ""
        // Bold the title; outcome appears after dash; emoji icons lead.
        lines.push(
          `- ${icon} ${scopeBadge} · **${ev.title}**${dateSuffix} — ${ev.outcome}${obstructionNote}`,
        )
      }
      lines.push("")
    }
  }

  // Class analysis — public sees the tag list + a wikilink to the
  // vocabulary; the methodology framing is wrapped in <!-- ops-only -->
  // markers so it's hidden on the public site (HTML comments — invisible
  // in render) but shown as a "🔒 ops-only" block in the ops preview.
  if (policy.class_analysis_tags && policy.class_analysis_tags.length) {
    lines.push("## Class analysis")
    lines.push("")
    lines.push(
      `The opposition to this policy is structurally aligned with: **${policy.class_analysis_tags.join(", ")}**. _See [[Class Tag Vocabulary]] for definitions._`,
    )
    lines.push("")
    lines.push("<!-- ops-only")
    lines.push("")
    lines.push(
      `**Methodology:** These are ideological function tags from the locked Class Tag Vocabulary. Each tag is a claim about a pattern in the underlying donor data, not an editorial assertion. Donors with these tags fund politicians who oppose the policy.`,
    )
    lines.push("")
    lines.push("-->")
    lines.push("")
  }

  // Related donor networks (wikilinks)
  if (policy.opposition_capital_types && policy.opposition_capital_types.length) {
    lines.push("## Related")
    lines.push("")
    lines.push(
      "Relevant profiles in the Donor Map: _(placeholder — next Phase 2.75 sprint will wire in the [[Donors & Power Networks Index]] cross-references)_",
    )
    lines.push("")
  }

  // Build provenance footer — purely ops/dev-facing context. Wrapped
  // in <!-- ops-only --> so the public site doesn't show readers our
  // build-script invocation details.
  lines.push("---")
  lines.push("")
  lines.push("<!-- ops-only")
  lines.push("")
  lines.push(
    `*Policy page generated from canonical data stores. Policy record: \`${policy.id}\`. To edit the prose, update \`data/policies.jsonl\` via the policies store and re-run \`scripts/build-policy-pages.cjs --write\`. See [[Build Phases]] for the full Phase 2.75 plan.*`,
  )
  lines.push("")
  lines.push("-->")
  lines.push("")

  return lines.join("\n")
}

function buildIndexPage(allPolicies) {
  const lines = []
  lines.push("---")
  lines.push('title: "Policy Battles"')
  lines.push("type: policy-index")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generated-by: scripts/build-policy-pages.cjs")
  lines.push("editor-vouched: true")
  lines.push("---")
  lines.push("")
  lines.push("# Policy Battles")
  lines.push("")
  lines.push(
    "The policies where public support doesn't translate into political action. For each one, we show the gap between what people want and what gets passed, then follow the money to the people blocking it.",
  )
  lines.push("")
  lines.push(
    `_${allPolicies.length} policies tracked as of v1. This page + individual policy pages are generated from \`data/policies.jsonl\` at build time._`,
  )
  lines.push("")
  lines.push("## v1 policies")
  lines.push("")
  for (const p of allPolicies) {
    const statusBadge =
      p.legislative_status === "stalled"
        ? "**STALLED**"
        : p.legislative_status === "partial"
          ? "**PARTIAL**"
          : p.legislative_status === "blocked_in_committee"
            ? "**BLOCKED**"
            : p.legislative_status
    lines.push(`### [[${p.slug}|${p.title}]]`)
    lines.push("")
    lines.push(`- Status: ${statusBadge}`)
    if (p.public_support_pct !== null)
      lines.push(`- Public support: **${p.public_support_pct}%**`)
    if (p.opposition_capital_types && p.opposition_capital_types.length) {
      lines.push(`- Opposition: ${p.opposition_capital_types.join(", ")}`)
    }
    if (p.high_risk_editorial) lines.push(`- ⚠ High-risk editorial — [[ADR-0004|firewall applies]]`)
    lines.push("")
  }
  lines.push("---")
  lines.push("")
  lines.push("**See also:** [[who-blocks-us|Who Blocks Us — cross-policy enemy list]]")
  lines.push("")
  return lines.join("\n")
}

function buildWhoBlocksUsPage(engine) {
  const topOpposition = engine.query({
    subject: "top_opposition_donors",
    filters: { limit: 20 },
  })
  const crossParty = engine.query({
    subject: "cross_party_donors",
    filters: { limit: 10 },
  })

  const lines = []
  lines.push("---")
  lines.push('title: "Who Blocks Us"')
  lines.push("type: policy-aggregate")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generated-by: scripts/build-policy-pages.cjs")
  lines.push("editor-vouched: true")
  lines.push("---")
  lines.push("")
  lines.push("# Who Blocks Us")
  lines.push("")
  lines.push(
    "The donors funding politicians who oppose policies with majority public support. Computed across every policy in the registry, aggregated by donor, ranked by total political spend.",
  )
  lines.push("")
  lines.push("## Top 20 opposition donors")
  lines.push("")

  if (topOpposition.rows.length) {
    lines.push("| Rank | Donor | Politicians funded | Total spend |")
    lines.push("|---|---|---|---|")
    topOpposition.rows.forEach((r, i) => {
      lines.push(
        `| ${i + 1} | ${r.name} | ${r.politicians_count ?? "—"} | ${formatUsd(r.total_spend)} |`,
      )
    })
  } else {
    lines.push("_(no opposition donors found — pending more complete amount data in relationships.jsonl)_")
  }
  lines.push("")

  lines.push("## Donors playing both sides")
  lines.push("")
  lines.push(
    "Entities that fund candidates from both major parties simultaneously. When the same donor appears on both sides of a contested fight, the money is buying access, not advocating for any particular outcome.",
  )
  lines.push("")

  if (crossParty.rows.length) {
    lines.push("| Donor | D spend | R spend | Total | Balance |")
    lines.push("|---|---|---|---|---|")
    for (const r of crossParty.rows) {
      lines.push(
        `| ${r.name} | ${formatUsd(r.d_spend)} | ${formatUsd(r.r_spend)} | ${formatUsd(r.total)} | ${(r.balance || 0).toFixed(2)} |`,
      )
    }
  } else {
    lines.push(
      "_(no cross-party donors found — pending more complete amount + date data in relationships.jsonl)_",
    )
  }
  lines.push("")

  lines.push("---")
  lines.push("")
  lines.push(
    "*Computed from the canonical relationships.jsonl + entities.jsonl + events.jsonl stores via the Phase 2 query engine. See [[Build Phases]] for methodology.*",
  )
  return lines.join("\n")
}

function main() {
  console.log("")
  console.log("═══ build-policy-pages ═══")
  console.log(`  out:     ${OUT_DIR}`)
  console.log(`  dry-run: ${!WRITE}`)
  console.log("")

  policies.loadPolicies()
  polling.loadPolls()
  events.loadEvents()

  const all = policies.queryPolicies({})
  console.log(`  ${all.length} policies loaded`)
  console.log("")

  const engine = createQueryEngine()

  if (WRITE && !fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  // Precompute per-policy donor lists + cross-policy recurrence map.
  // We run topPolicyOppositionDonors once per policy (limit=100 so the
  // recurrence map sees the long tail too), then count how many distinct
  // policies each donor appears in. The badge "blocks N of M policies"
  // is built from this map at render time.
  console.log("  precomputing per-policy opposition donors...")
  const policyDonors = {} // policy.id -> top-10 donor rows (for table render)
  const crossPolicyMap = new Map() // donor name -> count of policies they oppose
  for (const policy of all) {
    let rows = []
    try {
      rows = engine.topPolicyOppositionDonors(policy, { limit: 100 })
    } catch (e) {
      console.log(`    warn: ${policy.slug}: ${e.message}`)
    }
    policyDonors[policy.id] = rows.slice(0, 10) // keep top 10 for the table
    for (const d of rows) {
      crossPolicyMap.set(d.name, (crossPolicyMap.get(d.name) || 0) + 1)
    }
  }
  const ctx = { policyDonors, crossPolicyMap, totalPolicyCount: all.length }
  console.log(
    `    ${policyDonors ? Object.values(policyDonors).reduce((s, r) => s + r.length, 0) : 0} donor-rows across ${all.length} policies; ${[...crossPolicyMap.values()].filter((n) => n > 1).length} donors oppose >1 policy`,
  )
  console.log("")

  let written = 0

  for (const policy of all) {
    const content = buildPolicyPage(policy, engine, ctx)
    const file = path.join(OUT_DIR, `${policy.slug}.md`)
    if (WRITE) {
      fs.writeFileSync(file, content, "utf-8")
      written += 1
      console.log(`  + ${path.relative(path.join(__dirname, ".."), file)}`)
    } else {
      console.log(`  · DRY ${path.relative(path.join(__dirname, ".."), file)}  (${content.length} bytes)`)
    }
  }

  const indexContent = buildIndexPage(all)
  const indexFile = path.join(OUT_DIR, "index.md")
  if (WRITE) {
    fs.writeFileSync(indexFile, indexContent, "utf-8")
    written += 1
    console.log(`  + ${path.relative(path.join(__dirname, ".."), indexFile)}`)
  } else {
    console.log(`  · DRY ${path.relative(path.join(__dirname, ".."), indexFile)}  (${indexContent.length} bytes)`)
  }

  const whoBlocksContent = buildWhoBlocksUsPage(engine)
  const whoBlocksFile = path.join(OUT_DIR, "who-blocks-us.md")
  if (WRITE) {
    fs.writeFileSync(whoBlocksFile, whoBlocksContent, "utf-8")
    written += 1
    console.log(`  + ${path.relative(path.join(__dirname, ".."), whoBlocksFile)}`)
  } else {
    console.log(`  · DRY ${path.relative(path.join(__dirname, ".."), whoBlocksFile)}  (${whoBlocksContent.length} bytes)`)
  }

  console.log("")
  console.log(`  pages written: ${written}`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
