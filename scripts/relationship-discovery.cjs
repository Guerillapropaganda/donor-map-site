/**
 * relationship-discovery.cjs — Relationship Discovery Scanner
 *
 * Scans the vault for connections that should exist but don't.
 * Produces a JSON report of suggestions with confidence levels and reasoning.
 *
 * 7 Strategies:
 *   1. Shared Donors — same donor funds multiple politicians
 *   2. FEC IE Data — independent expenditures opposing/supporting
 *   3. Wikilink Mentions — body mentions [[Profile]] but no frontmatter link
 *   4. Money Trail — donor funds politician on relevant committee
 *   5. Story Attribution — stories mention profiles via wikilinks
 *   6. Organizational — employment/board patterns in body text
 *   7. Leak Data — Panama/Paradise Papers references
 *
 * Usage:
 *   node scripts/relationship-discovery.cjs                        # full scan
 *   node scripts/relationship-discovery.cjs --changed-only         # recent changes only
 *   node scripts/relationship-discovery.cjs --strategy=fec-ie      # single strategy
 *   node scripts/relationship-discovery.cjs --dry-run              # report only
 */

const fs = require("fs")
const path = require("path")
const { walkDir, parseFrontmatter, writeReport, parseAllWikilinks, resolveProfileTitle, extractFrontmatterConnections } = require("./lib/shared.cjs")

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, "..", "content")
const OPS_DATA = path.join(__dirname, "..", "ops", "data")
const REPORTS_DIR = path.join(__dirname, "..", "reports")

const args = process.argv.slice(2)
const STRATEGY_FLAG = args.find(a => a.startsWith("--strategy="))
const STRATEGY = STRATEGY_FLAG ? STRATEGY_FLAG.split("=")[1] : "all"
const CHANGED_ONLY = args.includes("--changed-only")
const DRY_RUN = args.includes("--dry-run")

// ─── Parse Wikilinks (from frontmatter values) ──────────────────

function parseWikilinks(value) {
  if (!value || typeof value !== "string") return []
  const matches = value.match(/\[\[([^\]]+)\]\]/g) || []
  return matches.map(m => {
    const inner = m.replace("[[", "").replace("]]", "")
    const target = inner.split("|")[0].trim()
    const display = (inner.split("|").pop() || target).trim()
    return { target, display }
  })
}

// ─── Load Vault ──────────────────────────────────────────────────

function loadVault() {
  const files = walkDir(CONTENT_DIR)
  const profiles = []
  const titleToProfile = new Map()
  const cleanTitleToProfile = new Map()

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, "utf8")
      if (content.charCodeAt(0) === 0) continue // skip NUL byte files
      const { data, body } = parseFrontmatter(content)
      const title = data.title || path.basename(filePath, ".md")
      const relPath = path.relative(CONTENT_DIR, filePath).replace(/\\/g, "/")

      const profile = {
        filePath, relPath, title, data, body,
        type: data.type || "unknown",
        party: data.party || null,
        chamber: data.chamber || null,
        state: data.state || null,
        sector: data.sector || null,
        issues: Array.isArray(data.issues) ? data.issues : (data.issues ? [data.issues] : []),
        connections: extractFrontmatterConnections(data),
        bodyWikilinks: parseAllWikilinks(body),
      }

      profiles.push(profile)
      titleToProfile.set(title, profile)
      const cleanTitle = title.replace(/^_/, "").replace(/\s+Master\s+Profile$/i, "").trim()
      cleanTitleToProfile.set(cleanTitle.toLowerCase(), profile)
    } catch { /* skip unreadable */ }
  }

  return { profiles, titleToProfile, cleanTitleToProfile }
}

function resolve(name, titleToProfile, cleanTitleToProfile) {
  return resolveProfileTitle(name, titleToProfile, cleanTitleToProfile)
}

function connectionExists(profile, targetName) {
  const clean = targetName.replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
  return profile.connections.has(targetName) || profile.connections.has(clean)
}

// ─── Strategy 1: Shared Donors ──────────────────────────────────

function findSharedDonors(profiles, titleToProfile, cleanTitleToProfile) {
  const results = []
  const donorToPoliticians = new Map()
  const politicians = profiles.filter(p => p.type === "politician")

  for (const pol of politicians) {
    const donors = new Set()
    // From frontmatter donors field
    for (const link of parseWikilinks(pol.data.donors || "")) donors.add(link.target)
    // From top-donors array
    if (Array.isArray(pol.data["top-donors"])) {
      for (const d of pol.data["top-donors"]) donors.add(d)
    }
    for (const donorName of donors) {
      if (!donorToPoliticians.has(donorName)) donorToPoliticians.set(donorName, [])
      donorToPoliticians.get(donorName).push(pol)
    }
  }

  for (const [donorName, pols] of donorToPoliticians) {
    if (pols.length < 2) continue
    // Create related connections between politician pairs
    for (let i = 0; i < pols.length; i++) {
      for (let j = i + 1; j < pols.length; j++) {
        const a = pols[i], b = pols[j]
        if (connectionExists(a, b.title) && connectionExists(b, a.title)) continue
        results.push({
          source: a.title, sourcePath: a.relPath,
          target: b.title, targetPath: b.relPath,
          type: "related", confidence: "medium", strategy: "shared-donors",
          autoCreate: false,
          evidence: `Shared donor: ${donorName} funds both ${a.title} and ${b.title}`,
          reasoning: `Both politicians receive funding from ${donorName}. ${a.party || "Unknown"} (${a.state || "?"}) and ${b.party || "Unknown"} (${b.state || "?"}). Cross-party shared donors are especially notable as they reveal donor-class interests that transcend partisan lines.`,
        })
      }
    }
  }

  return results
}

// ─── Strategy 2: FEC IE Data ─────────────────────────────────────

function findFecIE(profiles) {
  const results = []

  for (const profile of profiles) {
    // Look for IE spending patterns in FEC auto-blocks
    const ieBlockMatch = profile.body.match(/<!-- auto:fec-politician start -->([\s\S]*?)<!-- auto:fec-politician end -->/)
    if (!ieBlockMatch) continue

    const ieBlock = ieBlockMatch[1]
    // Parse top outside spenders table: | COMMITTEE | $support | $oppose |
    const tableRows = ieBlock.match(/\|[^|]+\|[^|]+\|[^|]+\|/g) || []
    for (const row of tableRows) {
      const cols = row.split("|").map(c => c.trim()).filter(Boolean)
      if (cols.length < 3 || cols[0] === "Committee" || cols[0] === "--------" || cols[0] === "---") continue

      const committee = cols[0]
      // Skip rows where "committee" is a dollar amount, number, table border, or metric label
      if (/^\$|^\d+$|^-+$/.test(committee)) continue
      if (!/[a-zA-Z]{3,}/.test(committee)) continue
      // Skip summary metric rows (these are table headers not committee names)
      if (/^(IE|Total|Election|Cash|Individual|Other|PAC|Fundraising|Cycle|Metric)/i.test(committee)) continue
      const support = parseFloat((cols[1] || "0").replace(/[$,]/g, "")) || 0
      const oppose = parseFloat((cols[2] || "0").replace(/[$,]/g, "")) || 0

      // Detect contradiction: same committee both supports AND opposes same candidate
      const isBothSides = support > 100000 && oppose > 100000

      if (oppose > 100000) {
        const committeeProfile = resolve(committee, new Map(), new Map())
        results.push({
          source: committee, sourcePath: committeeProfile?.relPath || "",
          target: profile.title, targetPath: profile.relPath,
          type: "opposes", confidence: "high", strategy: "fec-ie",
          autoCreate: true,
          evidence: `FEC IE: $${(oppose / 1e6).toFixed(2)}M opposing ${profile.title}`,
          reasoning: isBothSides
            ? `CONTRADICTION: ${committee} spent $${oppose.toLocaleString()} opposing ${profile.title} while ALSO spending $${support.toLocaleString()} supporting them. This entity is playing both sides, hedging influence regardless of outcome. Both entries are factual FEC IE filings.`
            : `${committee} spent $${oppose.toLocaleString()} in independent expenditures opposing ${profile.title}. This is factual FEC data from the candidate's IE filings. IE opposition spending is one of the clearest indicators of adversarial relationships in American politics.`,
          // Contradiction metadata
          contradiction: isBothSides ? {
            counterpartType: "donors",
            counterpartAmount: support,
            counterpartDisplay: `$${(support / 1e6).toFixed(2)}M supporting`,
            totalInfluence: support + oppose,
            ratio: Math.round((oppose / (support + oppose)) * 100),
          } : null,
        })
      }
      if (support > 100000) {
        const committeeProfile = resolve(committee, new Map(), new Map())
        results.push({
          source: committee, sourcePath: committeeProfile?.relPath || "",
          target: profile.title, targetPath: profile.relPath,
          type: "donors", confidence: "high", strategy: "fec-ie",
          autoCreate: true,
          evidence: `FEC IE: $${(support / 1e6).toFixed(2)}M supporting ${profile.title}`,
          reasoning: isBothSides
            ? `CONTRADICTION: ${committee} spent $${support.toLocaleString()} supporting ${profile.title} while ALSO spending $${oppose.toLocaleString()} opposing them. This entity is playing both sides, hedging influence regardless of outcome. Both entries are factual FEC IE filings.`
            : `${committee} spent $${support.toLocaleString()} in independent expenditures supporting ${profile.title}. Super PAC support at this level indicates a significant financial relationship between the committee's funders and this politician's agenda.`,
          // Contradiction metadata
          contradiction: isBothSides ? {
            counterpartType: "opposes",
            counterpartAmount: oppose,
            counterpartDisplay: `$${(oppose / 1e6).toFixed(2)}M opposing`,
            totalInfluence: support + oppose,
            ratio: Math.round((support / (support + oppose)) * 100),
          } : null,
        })
      }
    }
  }

  return results
}

// ─── Strategy 3: Wikilink Mentions ───────────────────────────────

function findUnlinkedMentions(profiles, titleToProfile, cleanTitleToProfile) {
  const results = []

  for (const profile of profiles) {
    for (const link of profile.bodyWikilinks) {
      const targetProfile = resolve(link.target, titleToProfile, cleanTitleToProfile)
      if (!targetProfile) continue // unresolved = unnamed entity, handled separately
      if (connectionExists(profile, link.target) || connectionExists(profile, targetProfile.title)) continue

      results.push({
        source: profile.title, sourcePath: profile.relPath,
        target: targetProfile.title, targetPath: targetProfile.relPath,
        type: "related", confidence: "low", strategy: "wikilink-mention",
        autoCreate: false,
        evidence: `Body text mention: "${link.context}"`,
        reasoning: `${profile.title} mentions [[${link.target}]] in body text but has no frontmatter connection. Context: "${link.context}". This may be a casual reference or an important relationship that was never formalized.`,
      })
    }
  }

  return results
}

// ─── Strategy 4: Money Trail ─────────────────────────────────────

const SECTOR_COMMITTEE_MAP = {
  "healthcare": ["health", "energy and commerce", "finance"],
  "health": ["health", "energy and commerce", "finance"],
  "defense": ["armed services", "intelligence", "appropriations"],
  "defense & intelligence": ["armed services", "intelligence", "appropriations"],
  "finance": ["financial services", "banking", "budget"],
  "wall street": ["financial services", "banking", "budget"],
  "energy": ["energy", "natural resources", "environment"],
  "tech": ["commerce", "judiciary", "science"],
  "agriculture": ["agriculture", "appropriations"],
  "real estate": ["financial services", "banking"],
  "pharma": ["health", "energy and commerce"],
  "telecom": ["commerce", "energy and commerce"],
}

function findMoneyTrail(profiles, titleToProfile, cleanTitleToProfile) {
  const results = []
  const donors = profiles.filter(p => ["donor", "corporation", "lobbying-firm", "pac"].includes(p.type))

  for (const donor of donors) {
    const sector = (donor.sector || "").toLowerCase()
    const relevantCommittees = SECTOR_COMMITTEE_MAP[sector] || []
    if (relevantCommittees.length === 0) continue

    // Check politicians-funded
    const fundedNames = Array.isArray(donor.data["politicians-funded"]) ? donor.data["politicians-funded"] : []
    for (const polName of fundedNames) {
      const pol = resolve(polName, titleToProfile, cleanTitleToProfile)
      if (!pol) continue

      // Check if politician has relevant committee
      const rawCommittees = pol.data.committees
      const committees = Array.isArray(rawCommittees) ? rawCommittees.join(" ").toLowerCase() : (rawCommittees || "").toString().toLowerCase()
      const overlap = relevantCommittees.some(c => committees.includes(c))
      if (!overlap) continue

      if (connectionExists(donor, pol.title)) continue

      results.push({
        source: donor.title, sourcePath: donor.relPath,
        target: pol.title, targetPath: pol.relPath,
        type: "related", confidence: "medium", strategy: "money-trail",
        autoCreate: false,
        evidence: `${donor.title} (${donor.sector}) funds ${pol.title} who sits on relevant committee`,
        reasoning: `${donor.title} operates in the ${donor.sector} sector and funds ${pol.title}. ${pol.title} sits on a committee with jurisdiction over ${donor.sector}-related policy (${relevantCommittees.join(", ")}). This donor-to-committee pipeline is a core mechanism of donor-class influence: fund the politicians who regulate your industry.`,
      })
    }
  }

  return results
}

// ─── Strategy 5: Story Attribution ───────────────────────────────

function findStoryConnections(profiles, titleToProfile, cleanTitleToProfile) {
  const results = []
  const storyTypes = new Set(["story", "sub-note", "event", "daily-update"])

  for (const profile of profiles) {
    if (!storyTypes.has(profile.type)) continue

    for (const link of profile.bodyWikilinks) {
      const targetProfile = resolve(link.target, titleToProfile, cleanTitleToProfile)
      if (!targetProfile) continue

      // Check if story is in target's stories: field
      const targetStories = parseWikilinks(targetProfile.data.stories || "")
      const alreadyLinked = targetStories.some(s =>
        s.target === profile.title || s.target.includes(profile.title)
      )
      if (alreadyLinked) continue
      if (connectionExists(targetProfile, profile.title)) continue

      results.push({
        source: profile.title, sourcePath: profile.relPath,
        target: targetProfile.title, targetPath: targetProfile.relPath,
        type: "stories", confidence: "medium", strategy: "story-attribution",
        autoCreate: false,
        evidence: `Story "${profile.title}" mentions ${targetProfile.title}`,
        reasoning: `The story/event "${profile.title}" references [[${link.target}]] in its body text. Stories should be linked to the profiles they discuss so readers can follow the connections. Context: "${link.context}"`,
      })
    }
  }

  return results
}

// ─── Strategy 6: Organizational ──────────────────────────────────

function findOrganizational(profiles, titleToProfile, cleanTitleToProfile) {
  const results = []
  const orgPatterns = [
    /(?:co-?host|executive\s+producer|host|anchor|reporter|editor|journalist|correspondent)\s+(?:at|of|for)\s+\[\[([^\]|]+)/gi,
    /(?:CEO|CFO|COO|CTO|president|chairman|chairwoman|founder|co-?founder|director|managing\s+director|partner|principal)\s+(?:of|at)\s+\[\[([^\]|]+)/gi,
    /(?:works?\s+for|employed\s+by|joined|left|resigned\s+from|fired\s+from)\s+\[\[([^\]|]+)/gi,
    /(?:board\s+member|board\s+of\s+directors|advisory\s+board)\s+(?:of|at|for)\s+\[\[([^\]|]+)/gi,
    /(?:lobbyist|lobbying)\s+(?:for|at|with)\s+\[\[([^\]|]+)/gi,
  ]

  for (const profile of profiles) {
    const seen = new Set()
    for (const pattern of orgPatterns) {
      let match
      pattern.lastIndex = 0
      while ((match = pattern.exec(profile.body)) !== null) {
        const orgName = match[1].split("|")[0].trim()
        if (seen.has(orgName.toLowerCase())) continue
        seen.add(orgName.toLowerCase())

        const orgProfile = resolve(orgName, titleToProfile, cleanTitleToProfile)
        if (!orgProfile) continue
        if (connectionExists(profile, orgProfile.title)) continue

        // Get surrounding context
        const start = Math.max(0, match.index - 20)
        const end = Math.min(profile.body.length, match.index + match[0].length + 20)
        const context = profile.body.slice(start, end).replace(/\n/g, " ").trim()

        results.push({
          source: profile.title, sourcePath: profile.relPath,
          target: orgProfile.title, targetPath: orgProfile.relPath,
          type: "related", confidence: "medium", strategy: "organizational",
          autoCreate: false,
          evidence: `Body text: "${context}"`,
          reasoning: `${profile.title} has an organizational relationship with ${orgProfile.title}. The body text states: "${context}". This is an employment, leadership, or formal affiliation relationship that should be reflected in the connection graph.`,
        })
      }
    }
  }

  return results
}

// ─── Strategy 7: Leak Data ───────────────────────────────────────

function findLeakData(profiles) {
  const results = []
  const leakPatterns = [
    /panama\s+papers/i,
    /paradise\s+papers/i,
    /pandora\s+papers/i,
    /icij/i,
    /offshore\s+(?:account|entity|company|shell|trust|holding)/i,
    /tax\s+haven/i,
  ]

  for (const profile of profiles) {
    for (const pattern of leakPatterns) {
      const match = profile.body.match(pattern)
      if (!match) continue

      // Find wikilinks near the leak mention
      const idx = profile.body.indexOf(match[0])
      const nearbyText = profile.body.slice(Math.max(0, idx - 200), Math.min(profile.body.length, idx + 200))
      const nearbyLinks = parseAllWikilinks(nearbyText)

      for (const link of nearbyLinks) {
        const targetProfile = resolve(link.target, new Map(), new Map())
        if (connectionExists(profile, link.target)) continue

        results.push({
          source: profile.title, sourcePath: profile.relPath,
          target: link.target, targetPath: targetProfile?.relPath || "",
          type: "related", confidence: "high", strategy: "leak-data",
          autoCreate: false, // Always review — sensitive
          evidence: `Leak reference: "${match[0]}" near mention of ${link.target}`,
          reasoning: `${profile.title} references "${match[0]}" in proximity to [[${link.target}]]. Leak data connections are always high-confidence but require editorial review before creation due to legal and factual sensitivity. These offshore/financial disclosure connections often reveal hidden donor-class infrastructure.`,
        })
      }
      break // one leak match per profile is enough
    }
  }

  return results
}

// ─── Unnamed Entity Detection ────────────────────────────────────

function findUnnamedEntities(profiles, titleToProfile, cleanTitleToProfile) {
  const entityMentions = new Map() // name → { count, files: Set, contexts: [] }

  for (const profile of profiles) {
    for (const link of profile.bodyWikilinks) {
      const resolved = resolve(link.target, titleToProfile, cleanTitleToProfile)
      if (resolved) continue // already has a profile

      const name = link.target
      // Noise filters
      if (name.length < 3) continue
      if (/^(the|a|an)\s/i.test(name)) continue
      if (/^(chairman|spokesperson|president|senator|representative|member|official|secretary|director)$/i.test(name)) continue
      // Must have a capital letter (proper noun)
      if (!/[A-Z]/.test(name)) continue

      if (!entityMentions.has(name)) {
        entityMentions.set(name, { count: 0, files: new Set(), contexts: [], mentionedBy: [] })
      }
      const entry = entityMentions.get(name)
      if (!entry.files.has(profile.relPath)) {
        entry.count++
        entry.files.add(profile.relPath)
        entry.mentionedBy.push(profile.title)
      }
      if (entry.contexts.length < 5) entry.contexts.push(link.context)
    }
  }

  // Filter: 3+ distinct files, or dollar amount context
  const newProfiles = []
  for (const [name, data] of entityMentions) {
    const hasDollarContext = data.contexts.some(c => /\$[\d,.]+[MmBbKk]?/.test(c))
    const hasLeakContext = data.contexts.some(c => /panama|paradise|pandora|icij|offshore/i.test(c))

    if (data.count < 3 && !hasDollarContext && !hasLeakContext) continue

    // Infer type from context
    let suggestedType = "donor" // default
    if (data.contexts.some(c => /senator|representative|congress|governor|mayor/i.test(c))) suggestedType = "politician"
    if (data.contexts.some(c => /journalist|anchor|host|reporter|media|podcast/i.test(c))) suggestedType = "media-profile"
    if (data.contexts.some(c => /corporation|company|inc\.|corp\.|llc/i.test(c))) suggestedType = "corporation"
    if (data.contexts.some(c => /think\s*tank|institute|foundation|center\s+for/i.test(c))) suggestedType = "think-tank"

    // Suggest path
    let suggestedPath
    if (suggestedType === "politician") suggestedPath = `Politicians/Uncategorized/${name}.md`
    else if (suggestedType === "media-profile") suggestedPath = `Media & Influence Pipeline/Uncategorized/${name}.md`
    else if (suggestedType === "corporation") suggestedPath = `Donors & Power Networks/Uncategorized/${name}.md`
    else suggestedPath = `Donors & Power Networks/Uncategorized/${name}.md`

    newProfiles.push({
      name,
      mentions: data.count,
      contexts: data.contexts.slice(0, 3),
      mentionedBy: data.mentionedBy.slice(0, 10),
      suggestedType,
      suggestedPath: `content/${suggestedPath}`,
      hasDollarContext,
      hasLeakContext,
    })
  }

  // Sort by mentions descending
  newProfiles.sort((a, b) => b.mentions - a.mentions)
  return newProfiles
}

// ─── Deduplication & Scoring ─────────────────────────────────────

function deduplicateAndScore(results) {
  const seen = new Map() // "source::target::type" → best result

  for (const r of results) {
    const key = `${r.source}::${r.target}::${r.type}`
    const reverseKey = `${r.target}::${r.source}::${r.type}`

    const existing = seen.get(key) || seen.get(reverseKey)
    if (!existing) {
      r.strategies = [r.strategy]
      r.strategyCount = 1
      seen.set(key, r)
    } else {
      // Merge: keep highest confidence, combine evidence
      if (!existing.strategies.includes(r.strategy)) {
        existing.strategies.push(r.strategy)
        existing.strategyCount = existing.strategies.length
        existing.reasoning += `\n\nAdditional evidence (${r.strategy}): ${r.evidence}`
      }
      // Confidence escalation: 2+ strategies = bump
      const confidenceOrder = { low: 0, medium: 1, high: 2 }
      if (confidenceOrder[r.confidence] > confidenceOrder[existing.confidence]) {
        existing.confidence = r.confidence
      }
      if (existing.strategyCount >= 2 && existing.confidence === "low") existing.confidence = "medium"
      if (existing.strategyCount >= 3 && existing.confidence === "medium") existing.confidence = "high"
      // Preserve contradiction data if present on either entry
      if (r.contradiction && !existing.contradiction) existing.contradiction = r.contradiction
    }
  }

  const deduped = [...seen.values()]
  // Sort: high first, then by strategy count
  const order = { high: 0, medium: 1, low: 2 }
  deduped.sort((a, b) => (order[a.confidence] - order[b.confidence]) || (b.strategyCount - a.strategyCount))
  return deduped
}

// ─── Transparency Score ──────────────────────────────────────────

// Patterns that indicate structural opacity
const DARK_MONEY_PATTERNS = [
  /501\s*\(\s*c\s*\)\s*\(\s*4\s*\)/i,
  /dark\s*money/i,
  /undisclosed/i,
  /anonymous\s+(donor|contribution|funding)/i,
  /shell\s+(company|entity|corporation)/i,
  /pass.through/i,
  /bundl(ed|ing|er)/i,
]

const REVOLVING_DOOR_PATTERNS = [
  /former\s+(staffer|aide|chief of staff|counsel|advisor|lobbyist)/i,
  /revolving\s*door/i,
  /went\s+on\s+to\s+(lobby|work\s+for|join)/i,
  /hired\s+by.*after\s+(leaving|serving)/i,
  /previously\s+(served|worked)\s+(at|for|in)/i,
]

const INVESTIGATION_PATTERNS = [
  /DOJ\s+(investigation|probe|inquiry|indictment|charged)/i,
  /FEC\s+(complaint|violation|fine|enforcement)/i,
  /federal\s+(investigation|probe|indictment|charges)/i,
  /grand\s+jury/i,
  /under\s+investigation/i,
  /securities\s+fraud/i,
  /campaign\s+finance\s+violation/i,
]

function computeTransparencyScore(suggestion, profiles, titleToProfile, cleanTitleToProfile) {
  let score = 70 // base score

  const sourceProfile = resolve(suggestion.source, titleToProfile, cleanTitleToProfile)
  const targetProfile = resolve(suggestion.target, titleToProfile, cleanTitleToProfile)
  const sourceBody = sourceProfile?.body || ""
  const targetBody = targetProfile?.body || ""
  const combinedBody = sourceBody + "\n" + targetBody

  const factors = []

  // 1. Dark money indicators (-15 each)
  let darkMoneyCount = 0
  for (const pattern of DARK_MONEY_PATTERNS) {
    if (pattern.test(combinedBody)) {
      darkMoneyCount++
    }
  }
  if (darkMoneyCount > 0) {
    const penalty = Math.min(darkMoneyCount * 15, 30) // cap at -30
    score -= penalty
    factors.push({ factor: "Dark money indicators", impact: -penalty, detail: `${darkMoneyCount} opacity pattern(s) detected in body text` })
  }

  // 2. Dollar magnitude
  const dollarMatch = suggestion.evidence.match(/\$[\d,.]+\s*[MmBb]?/)
  if (dollarMatch) {
    const rawAmount = dollarMatch[0].replace(/[$,]/g, "")
    let amount = parseFloat(rawAmount)
    if (/[Mm]/.test(dollarMatch[0])) amount *= 1e6
    if (/[Bb]/.test(dollarMatch[0])) amount *= 1e9

    if (amount > 1000000) { score -= 10; factors.push({ factor: "Dollar magnitude", impact: -10, detail: `>${dollarMatch[0]} — large-scale financial relationship` }) }
    else if (amount > 100000) { score -= 5; factors.push({ factor: "Dollar magnitude", impact: -5, detail: `${dollarMatch[0]} — significant amount` }) }
    else if (amount < 10000) { score += 5; factors.push({ factor: "Small contribution", impact: 5, detail: `${dollarMatch[0]} — small-dollar, routine` }) }
  }

  // 3. Revolving door (-10)
  for (const pattern of REVOLVING_DOOR_PATTERNS) {
    if (pattern.test(combinedBody)) {
      score -= 10
      factors.push({ factor: "Revolving door", impact: -10, detail: "Personnel movement between donor org and political office detected" })
      break
    }
  }

  // 4. Sector-committee alignment (-10)
  if (suggestion.strategy === "money-trail" || suggestion.strategies?.includes("money-trail")) {
    score -= 10
    factors.push({ factor: "Sector-committee alignment", impact: -10, detail: "Donor's industry matches politician's committee jurisdiction" })
  }

  // 5. Legal scrutiny (-20)
  for (const pattern of INVESTIGATION_PATTERNS) {
    if (pattern.test(combinedBody)) {
      score -= 20
      factors.push({ factor: "Legal scrutiny", impact: -20, detail: "Investigation, enforcement action, or legal proceeding referenced" })
      break
    }
  }

  // 6. Leak exposure (-25)
  if (suggestion.strategies?.includes("leak-data") || /panama|paradise|pandora|icij/i.test(combinedBody)) {
    score -= 25
    factors.push({ factor: "Leak exposure", impact: -25, detail: "Connected to financial leak data (Panama/Paradise/Pandora Papers or ICIJ)" })
  }

  // 7. Direct FEC disclosure (+10)
  if (suggestion.strategies?.includes("fec-ie")) {
    score += 10
    factors.push({ factor: "Direct FEC disclosure", impact: 10, detail: "Relationship documented in official FEC filings" })
  }

  // 8. Small donor funded (+10)
  if (/small.dollar|small\s+donor|grassroots/i.test(combinedBody) && suggestion.type === "donors") {
    score += 10
    factors.push({ factor: "Small donor funded", impact: 10, detail: "Small-dollar/grassroots funding pattern" })
  }

  // 9. Intermediary layers — count PAC-to-PAC or pass-through references
  const intermediaryMatches = combinedBody.match(/pass.through|routed\s+through|funneled|channeled\s+through|transferred\s+to/gi) || []
  if (intermediaryMatches.length > 0) {
    const penalty = Math.min(intermediaryMatches.length * 10, 20)
    score -= penalty
    factors.push({ factor: "Intermediary layers", impact: -penalty, detail: `${intermediaryMatches.length} pass-through/routing reference(s)` })
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  // Determine tier
  let tier, tierColor
  if (score >= 90) { tier = "TRANSPARENT"; tierColor = "#22c55e" }
  else if (score >= 60) { tier = "DISCLOSED"; tierColor = "#5b8dce" }
  else if (score >= 30) { tier = "OPAQUE"; tierColor = "#f59e0b" }
  else { tier = "OBSCURED"; tierColor = "#ef4444" }

  return { score, tier, tierColor, factors }
}

// ─── Partisan Flow Analysis ──────────────────────────────────────

function computePartisanFlow(suggestion, profiles, titleToProfile, cleanTitleToProfile) {
  const sourceProfile = resolve(suggestion.source, titleToProfile, cleanTitleToProfile)
  const targetProfile = resolve(suggestion.target, titleToProfile, cleanTitleToProfile)

  const sourceParty = sourceProfile?.data?.party || null
  const targetParty = targetProfile?.data?.party || null

  // Determine flow direction: -100 = pure D, 0 = bipartisan/neutral, +100 = pure R
  let flow = 0
  let label = "Neutral"
  let sourceLabel = "Unknown"
  let targetLabel = "Unknown"

  const partyScore = (party) => {
    if (!party) return 0
    const p = party.toLowerCase()
    if (p.includes("democrat")) return -50
    if (p.includes("republican")) return 50
    if (p.includes("independent")) return 0
    return 0
  }

  const sScore = partyScore(sourceParty)
  const tScore = partyScore(targetParty)

  // For donor→politician connections, the flow direction matters
  if (suggestion.type === "donors") {
    flow = tScore // support money flows toward the politician's party
  } else if (suggestion.type === "opposes") {
    flow = tScore !== 0 ? -tScore : sScore // opposition money flows AGAINST the target's party
  } else {
    flow = Math.round((sScore + tScore) / 2) // average for related/stories
  }

  // Detect cross-party (bipartisan donor)
  const isCrossParty = sScore !== 0 && tScore !== 0 && Math.sign(sScore) !== Math.sign(tScore)

  if (isCrossParty) { label = "Cross-Party" }
  else if (flow < -25) { label = "Dem-Aligned" }
  else if (flow > 25) { label = "GOP-Aligned" }
  else { label = "Bipartisan/Neutral" }

  sourceLabel = sourceParty || (sourceProfile?.type === "corporation" ? "Corporate" : sourceProfile?.type === "media-profile" ? "Media" : "Non-partisan")
  targetLabel = targetParty || (targetProfile?.type === "corporation" ? "Corporate" : targetProfile?.type === "media-profile" ? "Media" : "Non-partisan")

  return { flow, label, isCrossParty, sourceLabel, targetLabel }
}

// ─── Dollar Magnitude ────────────────────────────────────────────

function extractDollarMagnitude(suggestion) {
  const matches = (suggestion.evidence + " " + (suggestion.reasoning || "")).match(/\$[\d,.]+\s*[MmBbKk]?/g) || []
  if (matches.length === 0) return { amount: 0, display: null, tier: "unknown" }

  let maxAmount = 0
  let maxDisplay = ""
  for (const m of matches) {
    const raw = m.replace(/[$,\s]/g, "")
    let amount = parseFloat(raw)
    if (/[Mm]/.test(m)) amount *= 1e6
    if (/[Bb]/.test(m)) amount *= 1e9
    if (/[Kk]/.test(m)) amount *= 1e3
    if (amount > maxAmount) { maxAmount = amount; maxDisplay = m.trim() }
  }

  let tier
  if (maxAmount >= 10000000) tier = "massive"       // $10M+
  else if (maxAmount >= 1000000) tier = "major"      // $1M+
  else if (maxAmount >= 100000) tier = "significant"  // $100K+
  else if (maxAmount >= 10000) tier = "moderate"      // $10K+
  else tier = "minor"                                 // <$10K

  return { amount: maxAmount, display: maxDisplay, tier }
}

// ─── Load Previous Actions (rejections/approvals) ────────────────

function loadActions() {
  const actionsPath = path.join(OPS_DATA, "suggestion-actions.json")
  try {
    return JSON.parse(fs.readFileSync(actionsPath, "utf-8"))
  } catch {
    return {}
  }
}

function filterRejected(results, actions) {
  return results.filter(r => {
    const key = `${r.source}::${r.target}::${r.type}`
    const action = actions[key]
    if (!action || action.action !== "rejected") return true
    // Allow re-suggestion if a NEW strategy found it
    const rejectedStrategies = action.strategies || []
    const hasNewEvidence = r.strategies.some(s => !rejectedStrategies.includes(s))
    return hasNewEvidence
  })
}

// ─── Main ────────────────────────────────────────────────────────

function main() {
  console.log("\n===============================================")
  console.log("  THE DONOR MAP — Relationship Discovery")
  console.log("===============================================")
  console.log(`  Strategy: ${STRATEGY}`)
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN" : "FULL"}`)
  console.log(`  Scope: ${CHANGED_ONLY ? "Changed files only" : "Full vault scan"}`)
  console.log()

  console.log("  Loading vault...")
  const { profiles, titleToProfile, cleanTitleToProfile } = loadVault()
  console.log(`  Loaded ${profiles.length} profiles`)

  // Run strategies
  let allResults = []
  const strategyFns = {
    "shared-donors": () => findSharedDonors(profiles, titleToProfile, cleanTitleToProfile),
    "fec-ie": () => findFecIE(profiles),
    "wikilink-mention": () => findUnlinkedMentions(profiles, titleToProfile, cleanTitleToProfile),
    "money-trail": () => findMoneyTrail(profiles, titleToProfile, cleanTitleToProfile),
    "story-attribution": () => findStoryConnections(profiles, titleToProfile, cleanTitleToProfile),
    "organizational": () => findOrganizational(profiles, titleToProfile, cleanTitleToProfile),
    "leak-data": () => findLeakData(profiles),
  }

  for (const [name, fn] of Object.entries(strategyFns)) {
    if (STRATEGY !== "all" && STRATEGY !== name) continue
    console.log(`  Running strategy: ${name}...`)
    const results = fn()
    console.log(`    Found ${results.length} suggestions`)
    allResults = allResults.concat(results)
  }

  // Deduplicate and score
  console.log(`\n  Deduplicating ${allResults.length} raw results...`)
  let suggestions = deduplicateAndScore(allResults)
  console.log(`  ${suggestions.length} unique suggestions after dedup`)

  // Filter out previously rejected (unless new evidence)
  const actions = loadActions()
  suggestions = filterRejected(suggestions, actions)
  console.log(`  ${suggestions.length} after filtering rejections`)

  // Unnamed entities
  console.log("\n  Scanning for unnamed entities...")
  const newProfiles = findUnnamedEntities(profiles, titleToProfile, cleanTitleToProfile)
  console.log(`  Found ${newProfiles.length} unnamed entities meeting threshold`)

  // Stats
  const stats = {
    total: suggestions.length,
    high: suggestions.filter(s => s.confidence === "high").length,
    medium: suggestions.filter(s => s.confidence === "medium").length,
    low: suggestions.filter(s => s.confidence === "low").length,
    autoCreate: suggestions.filter(s => s.autoCreate).length,
    contradictions: suggestions.filter(s => s.contradiction).length,
    byStrategy: {},
    newProfiles: newProfiles.length,
  }
  for (const s of suggestions) {
    for (const st of s.strategies) {
      stats.byStrategy[st] = (stats.byStrategy[st] || 0) + 1
    }
  }

  // Build output
  const output = {
    scannedAt: new Date().toISOString(),
    profileCount: profiles.length,
    strategy: STRATEGY,
    stats,
    discovered: suggestions.map(s => {
      const transparency = computeTransparencyScore(s, profiles, titleToProfile, cleanTitleToProfile)
      const partisan = computePartisanFlow(s, profiles, titleToProfile, cleanTitleToProfile)
      const dollars = extractDollarMagnitude(s)
      return {
        id: `${s.source}::${s.target}::${s.type}`,
        source: s.source,
        sourcePath: s.sourcePath,
        target: s.target,
        targetPath: s.targetPath || "",
        type: s.type,
        confidence: s.confidence,
        strategies: s.strategies,
        strategyCount: s.strategyCount,
        evidence: s.evidence,
        reasoning: s.reasoning,
        autoCreate: s.autoCreate,
        discoveredAt: new Date().toISOString(),
        transparency,
        partisan,
        dollars,
        contradiction: s.contradiction || null,
      }
    }),
    newProfiles,
  }

  // Write output
  if (!DRY_RUN) {
    // Write to ops/data for the API
    if (!fs.existsSync(OPS_DATA)) fs.mkdirSync(OPS_DATA, { recursive: true })
    fs.writeFileSync(path.join(OPS_DATA, "discovery-suggestions.json"), JSON.stringify(output, null, 2))
    console.log(`\n  Saved to ops/data/discovery-suggestions.json`)
  }

  // Always write reports
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true })
  fs.writeFileSync(path.join(REPORTS_DIR, "relationship-discovery.json"), JSON.stringify(output, null, 2))

  // Write markdown report
  const mdLines = [
    "# Relationship Discovery Report",
    "",
    `Scanned: ${new Date().toLocaleString()}`,
    `Profiles: ${profiles.length}`,
    `Strategy: ${STRATEGY}`,
    "",
    "## Stats",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total suggestions | ${stats.total} |`,
    `| HIGH confidence | ${stats.high} |`,
    `| MEDIUM confidence | ${stats.medium} |`,
    `| LOW confidence | ${stats.low} |`,
    `| Auto-create eligible | ${stats.autoCreate} |`,
    `| New profiles needed | ${stats.newProfiles} |`,
    "",
  ]

  // Strategy breakdown
  mdLines.push("## By Strategy", "")
  for (const [strat, count] of Object.entries(stats.byStrategy)) {
    mdLines.push(`- **${strat}**: ${count}`)
  }
  mdLines.push("")

  // High confidence
  const highConf = suggestions.filter(s => s.confidence === "high")
  if (highConf.length > 0) {
    mdLines.push("## HIGH Confidence", "")
    for (const s of highConf.slice(0, 20)) {
      mdLines.push(`### ${s.source} → ${s.target} (${s.type})`)
      mdLines.push(`- Strategies: ${s.strategies.join(", ")}`)
      mdLines.push(`- Evidence: ${s.evidence}`)
      mdLines.push(`- Auto-create: ${s.autoCreate ? "YES" : "No (review)"}`)
      mdLines.push("")
    }
  }

  // Medium confidence (top 20)
  const medConf = suggestions.filter(s => s.confidence === "medium")
  if (medConf.length > 0) {
    mdLines.push("## MEDIUM Confidence (top 20)", "")
    for (const s of medConf.slice(0, 20)) {
      mdLines.push(`### ${s.source} → ${s.target} (${s.type})`)
      mdLines.push(`- Strategies: ${s.strategies.join(", ")}`)
      mdLines.push(`- Evidence: ${s.evidence}`)
      mdLines.push("")
    }
  }

  // New profiles
  if (newProfiles.length > 0) {
    mdLines.push("## Unnamed Entities (need profiles)", "")
    for (const e of newProfiles.slice(0, 20)) {
      mdLines.push(`- **${e.name}** (${e.mentions} mentions, type: ${e.suggestedType})`)
      mdLines.push(`  Contexts: ${e.contexts.join("; ")}`)
      mdLines.push(`  Mentioned by: ${e.mentionedBy.slice(0, 5).join(", ")}`)
      mdLines.push("")
    }
  }

  fs.writeFileSync(path.join(REPORTS_DIR, "relationship-discovery.md"), mdLines.join("\n"))

  // Print summary
  console.log("\n===============================================")
  console.log("  RESULTS")
  console.log("===============================================")
  console.log(`  Suggestions:     ${stats.total}`)
  console.log(`    HIGH:          ${stats.high}`)
  console.log(`    MEDIUM:        ${stats.medium}`)
  console.log(`    LOW:           ${stats.low}`)
  console.log(`    Auto-create:   ${stats.autoCreate}`)
  console.log(`  New profiles:    ${stats.newProfiles}`)
  console.log()

  if (highConf.length > 0) {
    console.log("  Top HIGH confidence:")
    for (const s of highConf.slice(0, 5)) {
      console.log(`    ${s.source} → ${s.target} (${s.type}) [${s.strategies.join("+")}]`)
    }
    console.log()
  }

  if (newProfiles.length > 0) {
    console.log("  Top unnamed entities:")
    for (const e of newProfiles.slice(0, 5)) {
      console.log(`    ${e.name} (${e.mentions} mentions, ${e.suggestedType})`)
    }
    console.log()
  }

  console.log(`  Reports: ${REPORTS_DIR}/relationship-discovery.json`)
  console.log(`           ${REPORTS_DIR}/relationship-discovery.md`)
  if (!DRY_RUN) console.log(`  Ops API: ${OPS_DATA}/discovery-suggestions.json`)
  console.log("===============================================\n")
}

main()
