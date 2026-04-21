#!/usr/bin/env node
/**
 * add-pac-aliases.cjs
 *
 * One-shot: add `aliases:` frontmatter to existing vault profiles so the
 * FEC ALL-CAPS committee names from /api/suggestions approvals resolve to
 * the canonical profile. Driven by manual curation — no heuristics.
 *
 * Safe to re-run: skips profiles that already contain the alias.
 */
const fs = require("fs")
const path = require("path")
const matter = require("gray-matter")

const REPO_ROOT = path.resolve(__dirname, "..")

// Canonical title → list of alias strings to add.
// Alias strings are the raw ids David approved (ALL-CAPS FEC format).
const ALIAS_MAP = {
  "Club for Growth": ["CLUB FOR GROWTH ACTION"],
  "Congressional Leadership Fund": ["CONGRESSIONAL LEADERSHIP FUND"],
  "House Majority PAC": ["HOUSE MAJORITY PAC"],
  "Senate Majority PAC": ["SENATE MAJORITY PAC", "SMP", "MAJORITY PAC"],
  "Senate Leadership Fund": ["SENATE LEADERSHIP FUND", "SLF PAC", "SFA FUND, INC"],
  "Majority Forward": ["MAJORITY FORWARD"],
  "Priorities USA Action": ["PRIORITIES USA ACTION"],
  "Sentinel Action Fund": ["THE SENTINEL ACTION FUND"],
  "United Democracy Project - UDP": ["UNITED DEMOCRACY PROJECT ('UDP')"],
  "US Chamber of Commerce": ["US CHAMBER OF COMMERCE"],
  "Americans for Prosperity": [
    "AMERICANS FOR PROSPERITY ACTION, INC.(AFP ACTION)",
    "AMERICANS FOR PROSPERITY ACTION, INC. (AFP ACTION) DBA CVA ACTION AND DBA LIBRE ACTION",
  ],
  "Americans for Tax Reform - Grover Norquist": ["AMERICANS FOR TAX REFORM"],
  "AFSCME - American Federation of State County and Municipal Employees": [
    "AMERICAN FEDERATION OF STATE COUNTY & MUNICIPAL EMPLOYEES  P E O P L E",
  ],
  "DMFI - Democratic Majority for Israel": ["DMFI PAC"],
  "DSCC - Democratic Senatorial Campaign Committee": [
    "DSCC",
    "DEMOCRATIC SENATORIAL CAMPAIGN COMMITTEE",
  ],
  "League of Conservation Voters": ["LEAGUE OF CONSERVATION VOTERS ACTION FUND"],
  "Fairshake PAC": ["FAIRSHAKE"],
  "National Association of Realtors": ["NATIONAL ASSOCIATION OF REALTORS CONGRESSIONAL FUND"],
  "SEIU - Service Employees International Union": [
    "SERVICE EMPLOYEES INTERNATIONAL UNION (SEIU)",
  ],
  "MAGA Inc": ["MAKE AMERICA GREAT AGAIN INC."],
  "Freedom Partners Chamber of Commerce": ["FREEDOM PARTNERS ACTION FUND, INC."],
  "Emilys List": ["WOMEN VOTE!"],
}

function findFileByTitle(title) {
  const contentRoot = path.join(REPO_ROOT, "content")
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const hit = walk(full)
        if (hit) return hit
      } else if (entry.name.endsWith(".md")) {
        try {
          const text = fs.readFileSync(full, "utf-8")
          const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
          if (!m) continue
          const titleMatch = m[1].match(/^title:\s*["']?(.+?)["']?\s*$/m)
          if (titleMatch && titleMatch[1].trim() === title) return full
        } catch (_) { /* skip */ }
      }
    }
    return null
  }
  return walk(contentRoot)
}

function addAliasesToFile(filePath, newAliases) {
  const text = fs.readFileSync(filePath, "utf-8")
  const parsed = matter(text)
  const existing = parsed.data.aliases
  const existingList = Array.isArray(existing)
    ? existing.map((s) => String(s))
    : typeof existing === "string"
      ? [existing]
      : []
  const merged = [...new Set([...existingList, ...newAliases])]
  if (merged.length === existingList.length) {
    return { changed: false, reason: "already has all aliases" }
  }
  parsed.data.aliases = merged
  parsed.data["last-updated"] = new Date().toISOString().split("T")[0]
  const output = matter.stringify(parsed.content, parsed.data)
  fs.writeFileSync(filePath, output, "utf-8")
  return { changed: true, added: merged.length - existingList.length }
}

function main() {
  let changed = 0
  let unchanged = 0
  let missing = 0
  for (const [title, aliases] of Object.entries(ALIAS_MAP)) {
    const file = findFileByTitle(title)
    if (!file) {
      console.log(`MISSING: ${title}`)
      missing++
      continue
    }
    const result = addAliasesToFile(file, aliases)
    if (result.changed) {
      console.log(`+${result.added} aliases: ${title}`)
      changed++
    } else {
      unchanged++
    }
  }
  console.log(`\n${changed} profiles updated, ${unchanged} already current, ${missing} missing`)
}

main()
