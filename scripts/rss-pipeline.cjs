#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — RSS Intelligence Pipeline
// Scans political RSS feeds, matches against database profiles,
// generates daily digest + event drafts in Obsidian vault.
//
// Usage:
//   node scripts/rss-pipeline.cjs              # dry run (preview)
//   node scripts/rss-pipeline.cjs --write      # write to vault
//   node scripts/rss-pipeline.cjs --write --verbose
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const https = require("https")
const http = require("http")

// ── Config ──
const CONTENT_DIR = path.join(__dirname, "..", "content")
const EVENTS_DIR = path.join(CONTENT_DIR, "Events")
const DRAFTS_DIR = path.join(EVENTS_DIR, "Drafts")
const DIGEST_DIR = path.join(EVENTS_DIR, "Digests")

const WRITE = process.argv.includes("--write")
const VERBOSE = process.argv.includes("--verbose")

// ── RSS Feeds ──
// Free, no-API-key feeds covering politics, spending, legislation
const RSS_FEEDS = [
  // Congress & Legislation
  {
    name: "Congress.gov — Most Viewed Bills",
    url: "https://www.congress.gov/rss/most-viewed-bills.xml",
    category: "legislation",
  },
  // Political News
  {
    name: "The Hill",
    url: "https://thehill.com/feed/",
    category: "news",
  },
  {
    name: "The Hill — Senate",
    url: "https://thehill.com/senate/feed/",
    category: "news",
  },
  {
    name: "The Hill — House",
    url: "https://thehill.com/house/feed/",
    category: "news",
  },
  {
    name: "The Hill — Lobbying",
    url: "https://thehill.com/lobbying/feed/",
    category: "money",
  },
  // Money & Lobbying
  {
    name: "OpenSecrets Blog",
    url: "https://www.opensecrets.org/news/feed/",
    category: "money",
  },
  // Investigations
  {
    name: "ProPublica",
    url: "https://www.propublica.org/feeds/propublica/main",
    category: "investigation",
  },
  {
    name: "The Intercept",
    url: "https://theintercept.com/feed/?rss",
    category: "investigation",
  },
]

// ── Helpers ──
function log(msg) {
  if (VERBOSE) console.log(msg)
}

function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http
    const req = mod.get(url, { headers: { "User-Agent": "DonorMap-RSS/1.0" } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => resolve(data))
      res.on("error", reject)
    })
    req.on("error", reject)
    req.setTimeout(timeout, () => {
      req.destroy()
      reject(new Error(`Timeout fetching ${url}`))
    })
  })
}

// Simple XML RSS/Atom parser — no dependencies
function parseRSSItems(xml) {
  const items = []

  // Try RSS <item> format
  const rssPattern = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match
  while ((match = rssPattern.exec(xml)) !== null) {
    const block = match[1]
    items.push({
      title: extractTag(block, "title"),
      link: extractTag(block, "link") || extractAttr(block, "link", "href"),
      description: stripHtml(extractTag(block, "description") || extractTag(block, "summary") || ""),
      date: extractTag(block, "pubDate") || extractTag(block, "dc:date") || extractTag(block, "date") || "",
    })
  }

  // Try Atom <entry> format if no RSS items found
  if (items.length === 0) {
    const atomPattern = /<entry[\s>]([\s\S]*?)<\/entry>/gi
    while ((match = atomPattern.exec(xml)) !== null) {
      const block = match[1]
      items.push({
        title: extractTag(block, "title"),
        link: extractAttr(block, "link", "href") || extractTag(block, "link"),
        description: stripHtml(extractTag(block, "summary") || extractTag(block, "content") || ""),
        date: extractTag(block, "published") || extractTag(block, "updated") || "",
      })
    }
  }

  return items
}

function extractTag(xml, tag) {
  // Handle CDATA
  const cdataPattern = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, "i")
  const cdataMatch = xml.match(cdataPattern)
  if (cdataMatch) return cdataMatch[1].trim()

  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  const m = xml.match(pattern)
  return m ? m[1].trim() : ""
}

function extractAttr(xml, tag, attr) {
  const pattern = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i")
  const m = xml.match(pattern)
  return m ? m[1] : ""
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim()
}

// ── Load Database Profiles ──
function loadProfiles() {
  const politicians = []
  const donors = []
  const nameSet = new Set()

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath)
      } else if (entry.name.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf-8")
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
        if (!fmMatch) continue

        const fm = fmMatch[1]
        const title = (fm.match(/^title:\s*"?([^"\n]+)"?/m) || [])[1] || ""
        const cleanTitle = title.replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
        if (!cleanTitle) continue

        const type = (fm.match(/^type:\s*(\S+)/m) || [])[1] || ""
        const party = (fm.match(/^party:\s*"?([^"\n]+)"?/m) || [])[1] || ""
        const chamber = (fm.match(/^chamber:\s*"?([^"\n]+)"?/m) || [])[1] || ""
        const state = (fm.match(/^state:\s*"?([^"\n]+)"?/m) || [])[1] || ""
        const sector = (fm.match(/^sector:\s*"?([^"\n]+)"?/m) || [])[1] || ""

        // Extract array fields
        const issues = extractYamlArray(fm, "issues")
        const topDonors = extractYamlArray(fm, "top-donors")
        const polsFunded = extractYamlArray(fm, "politicians-funded")

        const relPath = path.relative(CONTENT_DIR, fullPath)
        const isMaster = entry.name.includes("Master Profile")

        const profile = {
          name: cleanTitle,
          title,
          type,
          party,
          chamber,
          state,
          sector,
          issues,
          topDonors,
          polsFunded,
          path: relPath,
          isMaster,
        }

        if (relPath.startsWith("Politicians")) {
          politicians.push(profile)
        } else if (relPath.startsWith("Donors")) {
          donors.push(profile)
        }

        nameSet.add(cleanTitle)
      }
    }
  }

  function extractYamlArray(fm, field) {
    const items = []
    const pattern = new RegExp(`^${field}:\\s*\\n((?:\\s+-\\s+.+\\n?)*)`, "m")
    const m = fm.match(pattern)
    if (m) {
      const lines = m[1].split("\n")
      for (const line of lines) {
        const itemMatch = line.match(/^\s+-\s+"?([^"\n]+)"?/)
        if (itemMatch) items.push(itemMatch[1].trim())
      }
    }
    return items
  }

  scanDir(path.join(CONTENT_DIR, "Politicians"))
  scanDir(path.join(CONTENT_DIR, "Donors & Power Networks"))

  return { politicians, donors, nameSet }
}

// ── Match RSS Items Against Profiles ──
function matchItems(items, profiles) {
  const { politicians, donors, nameSet } = profiles
  const allProfiles = [...politicians, ...donors]
  const matches = []

  // Build search-friendly name variants
  // "Chuck Schumer" → also match "Schumer", "Sen. Schumer", "Senator Schumer"
  const nameIndex = new Map() // searchTerm → profile
  for (const p of allProfiles) {
    const name = p.name
    nameIndex.set(name.toLowerCase(), p)

    // Last name matching disabled — too many false positives
    // ("Warren" matching Kelcy Warren on Elizabeth Warren articles, etc.)

    // Handle "AIPAC - American Israel..." → also match "AIPAC"
    const dashIdx = name.indexOf(" - ")
    if (dashIdx > 0) {
      const shortName = name.substring(0, dashIdx).trim()
      if (shortName.length >= 4) {
        nameIndex.set(shortName.toLowerCase(), p)
      }
    }
  }

  for (const item of items) {
    const searchText = `${item.title} ${item.description}`.toLowerCase()
    const matched = new Map() // profileName → profile (dedupe)

    for (const [term, profile] of nameIndex) {
      // Word-boundary-ish check to avoid partial matches
      const idx = searchText.indexOf(term)
      if (idx === -1) continue

      // Check it's not part of a larger word
      const before = idx > 0 ? searchText[idx - 1] : " "
      const after = idx + term.length < searchText.length ? searchText[idx + term.length] : " "
      if (/[a-z]/.test(before) || /[a-z]/.test(after)) continue

      matched.set(profile.name, profile)
    }

    if (matched.size > 0) {
      matches.push({
        item,
        profiles: Array.from(matched.values()),
      })
    }
  }

  return matches
}

// ── Detect Profile Update Suggestions ──
function detectUpdates(matches, profiles) {
  const suggestions = []
  const { politicians, donors } = profiles

  // Build quick lookups
  const polByName = new Map(politicians.filter(p => p.isMaster).map(p => [p.name, p]))
  const donorByName = new Map(donors.filter(d => d.isMaster).map(d => [d.name, d]))

  for (const match of matches) {
    const text = `${match.item.title} ${match.item.description}`.toLowerCase()
    const matchedNames = match.profiles.map(p => p.name)

    // Check for donor-politician co-mentions that aren't in frontmatter
    for (const profile of match.profiles) {
      if (profile.type === "politician" && profile.isMaster) {
        // Check if any co-mentioned donors are NOT in this politician's top-donors
        for (const other of match.profiles) {
          if (other.name !== profile.name && (other.type === "donor" || other.type === "corporation")) {
            if (!profile.topDonors.includes(other.name)) {
              suggestions.push({
                type: "new-relationship",
                profile: profile.name,
                related: other.name,
                source: match.item.title,
                suggestion: `${other.name} mentioned alongside ${profile.name} but not in top-donors`,
              })
            }
          }
        }
      }
    }

    // Check for issue keywords not yet in profile
    const ISSUE_KEYWORDS = {
      "climate": "Climate & Energy",
      "green energy": "Climate & Energy",
      "fossil fuel": "Climate & Energy",
      "healthcare": "Healthcare",
      "medicare": "Healthcare",
      "medicaid": "Healthcare",
      "gun": "Gun Policy",
      "firearm": "Gun Policy",
      "immigration": "Immigration",
      "border": "Immigration",
      "crypto": "Crypto & Digital Finance",
      "bitcoin": "Crypto & Digital Finance",
      "stablecoin": "Crypto & Digital Finance",
      "defense": "Defense & Military",
      "military": "Defense & Military",
      "pentagon": "Defense & Military",
      "housing": "Housing",
      "rent": "Housing",
      "antitrust": "Tech & Monopoly Power",
      "monopoly": "Tech & Monopoly Power",
      "dark money": "Dark Money & Campaign Finance",
      "campaign finance": "Dark Money & Campaign Finance",
      "super pac": "Dark Money & Campaign Finance",
      "wall street": "Wall Street & Finance",
      "bank": "Wall Street & Finance",
      "pharma": "Pharma & Drug Pricing",
      "drug pric": "Pharma & Drug Pricing",
      "insulin": "Pharma & Drug Pricing",
      "israel": "Israel & Foreign Policy",
      "aipac": "Israel & Foreign Policy",
      "student loan": "Student Loans & Education",
      "education": "Student Loans & Education",
      "prison": "Private Prisons & Criminal Justice",
      "criminal justice": "Private Prisons & Criminal Justice",
      "oil": "Oil & Gas",
      "natural gas": "Oil & Gas",
      "pipeline": "Oil & Gas",
      "telecom": "Telecom & Net Neutrality",
      "net neutrality": "Telecom & Net Neutrality",
      "insurance": "Insurance",
      "water": "Water & Infrastructure",
      "infrastructure": "Water & Infrastructure",
      "tobacco": "Tobacco",
      "trade": "Trade & Tariffs",
      "tariff": "Trade & Tariffs",
    }

    for (const profile of match.profiles) {
      if (!profile.isMaster) continue
      for (const [keyword, issue] of Object.entries(ISSUE_KEYWORDS)) {
        if (text.includes(keyword) && !profile.issues.includes(issue)) {
          suggestions.push({
            type: "new-issue",
            profile: profile.name,
            issue,
            source: match.item.title,
            suggestion: `"${keyword}" found in article — ${issue} not in ${profile.name}'s issues`,
          })
          break // one suggestion per profile per article
        }
      }
    }
  }

  // Dedupe suggestions
  const seen = new Set()
  return suggestions.filter(s => {
    const key = `${s.type}:${s.profile}:${s.related || s.issue}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Detect New Names (not in database) ──
function detectNewNames(items, profiles) {
  const { nameSet } = profiles
  const nameLower = new Set(Array.from(nameSet).map(n => n.toLowerCase()))

  // Common political title patterns
  const titlePatterns = [
    /(?:Sen(?:ator)?|Rep(?:resentative)?|Gov(?:ernor)?|Secretary|President)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
  ]

  const mentions = new Map() // name → count

  for (const item of items) {
    const text = `${item.title} ${item.description}`
    for (const pattern of titlePatterns) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim()
        if (name.length < 5) continue
        if (nameLower.has(name.toLowerCase())) continue
        // Skip common false positives
        if (/^(The |A |An |New |United |American )/i.test(name)) continue
        mentions.set(name, (mentions.get(name) || 0) + 1)
      }
    }
  }

  // Only return names mentioned 2+ times
  return Array.from(mentions.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, mentions: count }))
}

// ── Generate Output ──
function generateDraftNote(match, feedName) {
  const item = match.item
  const profiles = match.profiles
  const date = item.date ? new Date(item.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]

  const profileNames = profiles.map(p => p.name)
  const profileLinks = profiles.map(p => `[[${p.title}|${p.name}]]`).join(" · ")

  const safeName = item.title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80)

  const content = `---
title: "${safeName}"
type: event
date: ${date}
status: draft
source: "${feedName}"
source-url: "${item.link || ""}"
profiles:
${profileNames.map(n => `  - "${n}"`).join("\n")}
---

#event #draft

## ${item.title}

**Source:** [${feedName}](${item.link || "#"})
**Date:** ${date}

${item.description}

---

**Linked Profiles:** ${profileLinks}
`

  return { filename: `${date} ${safeName}.md`, content }
}

function generateDigest(date, matches, suggestions, newNames, feedResults) {
  let md = `---
title: "Daily Digest ${date}"
type: digest
date: ${date}
---

# Intelligence Digest — ${date}

`

  // Feed status
  md += `## Feed Status\n\n`
  for (const fr of feedResults) {
    const icon = fr.success ? "\u2705" : "\u274c"
    md += `- ${icon} **${fr.name}** — ${fr.success ? `${fr.itemCount} items` : fr.error}\n`
  }
  md += `\n`

  // Matches
  if (matches.length > 0) {
    md += `## Matched Stories (${matches.length})\n\n`
    md += `Stories mentioning profiles in your database.\n\n`
    for (const match of matches) {
      const profiles = match.profiles.map(p => `[[${p.title}|${p.name}]]`).join(", ")
      md += `### ${match.item.title}\n`
      md += `- **Profiles:** ${profiles}\n`
      md += `- **Source:** [Link](${match.item.link || "#"})\n`
      md += `- ${match.item.description.substring(0, 200)}${match.item.description.length > 200 ? "..." : ""}\n\n`
    }
  } else {
    md += `## Matched Stories\n\nNo matches found today.\n\n`
  }

  // Profile update suggestions
  if (suggestions.length > 0) {
    md += `## Profile Update Suggestions (${suggestions.length})\n\n`
    md += `Potential updates to existing profiles based on today's news.\n\n`

    const byType = {}
    for (const s of suggestions) {
      if (!byType[s.type]) byType[s.type] = []
      byType[s.type].push(s)
    }

    if (byType["new-relationship"]) {
      md += `### New Relationships Detected\n`
      md += `Donor-politician connections mentioned in news but not in your frontmatter.\n\n`
      for (const s of byType["new-relationship"]) {
        md += `- [ ] **${s.profile}** \u2190 ${s.related} _(${s.source})_\n`
      }
      md += `\n`
    }

    if (byType["new-issue"]) {
      md += `### Issue Tagging Suggestions\n`
      md += `Policy areas mentioned alongside profiles that aren't in their issues field.\n\n`
      for (const s of byType["new-issue"]) {
        md += `- [ ] **${s.profile}** + "${s.issue}" _(${s.source})_\n`
      }
      md += `\n`
    }
  }

  // New names
  if (newNames.length > 0) {
    md += `## New Names Detected (${newNames.length})\n\n`
    md += `Politicians/figures appearing in today's news who aren't in your database yet.\n\n`
    for (const n of newNames) {
      md += `- [ ] **${n.name}** (${n.mentions} mentions)\n`
    }
    md += `\n`
  }

  md += `---\n\n_Generated automatically by the Donor Map RSS Pipeline._\n`

  return md
}

// ── Main ──
async function main() {
  console.log("=== THE DONOR MAP — RSS Intelligence Pipeline ===")
  console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN (use --write to save)"}`)
  console.log("")

  // Load profiles
  console.log("Loading database profiles...")
  const profiles = loadProfiles()
  console.log(`  ${profiles.politicians.length} politician files`)
  console.log(`  ${profiles.donors.length} donor files`)
  console.log(`  ${profiles.nameSet.size} unique names`)
  console.log("")

  // Fetch RSS feeds
  console.log("Fetching RSS feeds...")
  const allItems = []
  const feedResults = []

  for (const feed of RSS_FEEDS) {
    try {
      log(`  Fetching ${feed.name}...`)
      const xml = await fetchUrl(feed.url)
      const items = parseRSSItems(xml)
      for (const item of items) {
        item._feed = feed.name
        item._category = feed.category
      }
      allItems.push(...items)
      feedResults.push({ name: feed.name, success: true, itemCount: items.length })
      console.log(`  \u2705 ${feed.name}: ${items.length} items`)
    } catch (err) {
      feedResults.push({ name: feed.name, success: false, error: err.message })
      console.log(`  \u274c ${feed.name}: ${err.message}`)
    }
  }

  console.log(`\nTotal items fetched: ${allItems.length}`)
  console.log("")

  if (allItems.length === 0) {
    console.log("No items to process. Check feed URLs or network connectivity.")
    return
  }

  // Match against profiles
  console.log("Matching against database...")
  const matches = matchItems(allItems, profiles)
  console.log(`  ${matches.length} stories matched to profiles`)

  // Detect update suggestions
  const suggestions = detectUpdates(matches, profiles)
  console.log(`  ${suggestions.length} profile update suggestions`)

  // Detect new names
  const newNames = detectNewNames(allItems, profiles)
  console.log(`  ${newNames.length} new names detected`)
  console.log("")

  // Show preview
  if (matches.length > 0) {
    console.log("─── MATCHED STORIES ───")
    for (const match of matches.slice(0, 10)) {
      const names = match.profiles.map(p => p.name).join(", ")
      console.log(`  "${match.item.title}"`)
      console.log(`    → ${names}`)
      console.log("")
    }
    if (matches.length > 10) {
      console.log(`  ... and ${matches.length - 10} more`)
    }
  }

  if (suggestions.length > 0) {
    console.log("─── UPDATE SUGGESTIONS ───")
    for (const s of suggestions.slice(0, 10)) {
      console.log(`  [${s.type}] ${s.suggestion}`)
    }
    if (suggestions.length > 10) {
      console.log(`  ... and ${suggestions.length - 10} more`)
    }
    console.log("")
  }

  if (newNames.length > 0) {
    console.log("─── NEW NAMES ───")
    for (const n of newNames.slice(0, 10)) {
      console.log(`  ${n.name} (${n.mentions} mentions)`)
    }
    console.log("")
  }

  // Write output
  if (WRITE) {
    const today = new Date().toISOString().split("T")[0]

    // Create directories
    if (!fs.existsSync(EVENTS_DIR)) fs.mkdirSync(EVENTS_DIR, { recursive: true })
    if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true })
    if (!fs.existsSync(DIGEST_DIR)) fs.mkdirSync(DIGEST_DIR, { recursive: true })

    // Write draft event notes
    let draftsWritten = 0
    for (const match of matches) {
      const draft = generateDraftNote(match, match.item._feed)
      const filePath = path.join(DRAFTS_DIR, draft.filename)
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, draft.content, "utf-8")
        draftsWritten++
        log(`  Wrote: ${draft.filename}`)
      }
    }

    // Write daily digest
    const digest = generateDigest(today, matches, suggestions, newNames, feedResults)
    const digestPath = path.join(DIGEST_DIR, `${today} Digest.md`)
    fs.writeFileSync(digestPath, digest, "utf-8")

    console.log(`\n=== WRITTEN ===`)
    console.log(`  ${draftsWritten} draft event notes → content/Events/Drafts/`)
    console.log(`  1 daily digest → content/Events/Digests/${today} Digest.md`)
    console.log(`\nOpen Obsidian to review. Approve drafts by changing status: draft → published.`)
  } else {
    console.log(`\n=== DRY RUN — use --write to save files ===`)
    console.log(`Would write:`)
    console.log(`  ${matches.length} draft event notes to content/Events/Drafts/`)
    console.log(`  1 daily digest to content/Events/Digests/`)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
