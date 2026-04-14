#!/usr/bin/env node
/**
 * create-pac-stubs.cjs
 *
 * Creates minimal frontmatter-only stub profiles in
 * content/Donors & Power Networks/Super PACs/ for FEC PAC/committee names
 * referenced by /api/suggestions approvals that don't have a canonical
 * vault profile yet.
 *
 * Stub design:
 *   - content-readiness: raw (visible to the "needs work" queue)
 *   - source-tier: 1 (FEC data is Tier 1)
 *   - editorial-status: stub (pre-commit sentinels can skip style checks)
 *   - aliases: [FEC_NAME] so future FEC edges resolve here
 *   - Body: single "Auto-created stub" line with TODO for Research Claude
 *
 * Safe to re-run: skips existing files.
 */
const fs = require("fs")
const path = require("path")

const REPO_ROOT = path.resolve(__dirname, "..")
const SUPER_PACS = path.join(REPO_ROOT, "content", "Donors & Power Networks", "Super PACs")

// [canonicalTitle, aliases[], folder (relative to Donors & Power Networks)]
const STUBS = [
  ["A Great America PAC", ["A GREAT AMERICA PAC"], "Super PACs"],
  ["American Crossroads", ["AMERICAN CROSSROADS"], "Super PACs"],
  ["American Future Fund", ["AMERICAN FUTURE FUND"], "Super PACs"],
  ["American Jobs and Growth PAC", ["AMERICAN JOBS AND GROWTH PAC"], "Super PACs"],
  ["American Patriots PAC", ["AMERICAN PATRIOTS PAC"], "Super PACs"],
  ["Campaign for Community Change", ["CAMPAIGN FOR COMMUNITY CHANGE"], "Super PACs"],
  ["Conservative Leadership PAC", ["CONSERVATIVE LEADERSHIP POLITICAL ACTION COMMITTEE"], "Super PACs"],
  ["Courage to Change PAC", ["COURAGE TO CHANGE"], "Super PACs"],
  ["Crypto Innovation PAC", ["CRYPTO INNOVATION"], "Tech & Crypto"],
  ["DCCC - Democratic Congressional Campaign Committee", ["DCCC", "DEMOCRATIC CONGRESSIONAL CAMPAIGN COMMITTEE"], "Super PACs"],
  ["Defend US PAC", ["DEFEND US PAC"], "Super PACs"],
  ["DefendArizona", ["DEFENDARIZONA"], "Super PACs"],
  ["DNC - Democratic National Committee", ["DNC SERVICES CORPORATION/DEMOCRATIC NATIONAL COMMITTEE"], "Super PACs"],
  ["Fair Share Action", ["FAIR SHARE ACTION"], "Super PACs"],
  ["Georgians for Strong Families", ["GEORGIANS FOR STRONG FAMILIES, INC."], "Super PACs"],
  ["Good Fight PAC", ["GOOD FIGHT"], "Super PACs"],
  ["Justice Democrats PAC", ["JUSTICE DEMOCRATS PAC"], "Super PACs"],
  ["Kentuckians for Strong Leadership", ["KENTUCKIANS FOR STRONG LEADERSHIP"], "Super PACs"],
  ["MoveOn.org Political Action", ["MOVEON.ORG POLITICAL ACTION"], "Super PACs"],
  ["NRCC - National Republican Congressional Committee", ["NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE"], "Super PACs"],
  ["National Right to Life PAC", ["NATIONAL RIGHT TO LIFE POLITICAL ACTION COMMITTEE"], "Super PACs"],
  ["NEA Advocacy Fund", ["NEA ADVOCACY FUND"], "Super PACs"],
  ["Never Back Down", ["NEVER BACK DOWN INC."], "Super PACs"],
  ["NRA Political Victory Fund", ["NRA POLITICAL VICTORY FUND"], "Super PACs"],
  ["NRSC - National Republican Senatorial Committee", ["NRSC"], "Super PACs"],
  ["Opportunity Matters Fund", ["OPPORTUNITY MATTERS FUND, INC."], "Super PACs"],
  ["Patriots Prevail PAC", ["PATRIOTS PREVAIL PAC"], "Super PACs"],
  ["Peachtree PAC", ["PEACHTREE PAC"], "Super PACs"],
  ["Ready to Win", ["READY TO WIN"], "Super PACs"],
  ["RNC - Republican National Committee", ["REPUBLICAN NATIONAL COMMITTEE"], "Super PACs"],
  ["Republican Party of Florida", ["REPUBLICAN PARTY OF FLORIDA"], "Super PACs"],
  ["Special Operations for America", ["SPECIAL OPERATIONS FOR AMERICA"], "Super PACs"],
  ["Stop Union Political Abuse", ["STOP UNION POLITICAL ABUSE (SUPA)"], "Super PACs"],
  ["Take Me Home WV Action", ["TAKE ME HOME WV ACTION"], "Super PACs"],
  ["The Lincoln Project", ["THE LINCOLN PROJECT"], "Super PACs"],
  [
    "UA Political Action Committee",
    [
      "UA UNION PLUMBERS & PIPEFITTERS VOTE! PAC (UNITED ASSOCIATION OF JOURNEYMEN AND APPRENTICES OF THE PLUMBING & PIPEFITTING INDUSTRY OF THE UNITED STATES AND CANADA)",
      "UNITED ASSOCIATION POLITICAL EDUCATION COMMITTEE (UNITED ASSOCIATION OF JOURNEYMEN AND APPRENTICES OF THE PLUMBING & PIPEFITTING INDUSTRY OF THE UNITED STATES AND CANADA)",
    ],
    "Labor Unions",
  ],
  ["VIEW PAC - Value in Electing Women", ["VALUE IN ELECTING WOMEN POLITICAL ACTION COMMITTEE"], "Super PACs"],
  ["With Honor Fund", ["WITH HONOR FUND, INC."], "Super PACs"],
  ["Worker Power PAC for Georgia", ["WORKER POWER PAC FOR GEORGIA"], "Super PACs"],
]

function stubBody(title, aliases) {
  const today = new Date().toISOString().split("T")[0]
  // YAML list emit — avoid template-literal array stringification (Sheldon Whitehouse rule).
  const aliasYaml = aliases.map((a) => `  - ${JSON.stringify(a)}`).join("\n")
  return `---
title: ${JSON.stringify(title)}
type: donor
content-readiness: raw
editorial-status: stub
sector: "Political Committees"
entity-type: "PAC"
last-updated: ${today}
source-tier: 1
aliases:
${aliasYaml}
known-gaps:
  - "Auto-created stub for relationship edge resolution. Full editorial content pending — needs Research Claude to fill in donors, politicians funded, ideology, and class analysis."
---

## Auto-Created Stub

This profile was auto-created by \`scripts/create-pac-stubs.cjs\` on ${today}
so that /api/suggestions approval edges referencing FEC committee
"${aliases[0]}" could resolve to a canonical profile.

It is a **data placeholder only**. Full editorial content — class analysis,
donor network, politicians funded, ideology, transparency score — is
pending from Research Claude.

### FEC aliases

This profile absorbs the following FEC-format committee name(s):

${aliases.map((a) => `- \`${a}\``).join("\n")}
`
}

function main() {
  let created = 0
  let skipped = 0
  for (const [title, aliases, folder] of STUBS) {
    const dir = path.join(REPO_ROOT, "content", "Donors & Power Networks", folder)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const safeTitle = title.replace(/[\\/:*?"<>|]/g, "-")
    const filePath = path.join(dir, `${safeTitle}.md`)
    if (fs.existsSync(filePath)) {
      skipped++
      console.log(`SKIP (exists): ${filePath}`)
      continue
    }
    fs.writeFileSync(filePath, stubBody(title, aliases), "utf-8")
    created++
    console.log(`+ ${path.relative(REPO_ROOT, filePath)}`)
  }
  console.log(`\n${created} stubs created, ${skipped} already existed`)
}

main()
