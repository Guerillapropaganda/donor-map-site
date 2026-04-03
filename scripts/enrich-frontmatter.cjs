#!/usr/bin/env node
/**
 * enrich-frontmatter.cjs — Phase 0: Structural Frontmatter Enrichment
 *
 * Reads every profile in the vault and adds structured, queryable fields
 * derived from folder paths, hashtags, and content body.
 *
 * Usage:
 *   node scripts/enrich-frontmatter.cjs              # dry-run (shows changes)
 *   node scripts/enrich-frontmatter.cjs --write       # write changes to files
 *   node scripts/enrich-frontmatter.cjs --write --verbose
 */

const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────
const CONTENT_DIR = path.join(__dirname, "..", "content");
const WRITE = process.argv.includes("--write");
const VERBOSE = process.argv.includes("--verbose");

// US state name → abbreviation
const STATE_MAP = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new-hampshire": "NH", "new-jersey": "NJ", "new-mexico": "NM", "new-york": "NY",
  "north-carolina": "NC", "north-dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode-island": "RI", "south-carolina": "SC",
  "south-dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west-virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY", "district-of-columbia": "DC",
  "puerto-rico": "PR", "guam": "GU",
};

// Reverse map: abbreviation → full name (title case)
const ABBREV_TO_NAME = {};
for (const [name, abbr] of Object.entries(STATE_MAP)) {
  ABBREV_TO_NAME[abbr] = name.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// Known committee hashtags → proper names
const COMMITTEE_MAP = {
  "armed-services": "Armed Services",
  "judiciary": "Judiciary",
  "finance": "Finance",
  "appropriations": "Appropriations",
  "intelligence": "Intelligence",
  "foreign-affairs": "Foreign Affairs",
  "foreign-relations": "Foreign Relations",
  "energy-commerce": "Energy & Commerce",
  "energy-natural-resources": "Energy & Natural Resources",
  "agriculture": "Agriculture",
  "banking": "Banking",
  "budget": "Budget",
  "commerce": "Commerce",
  "education": "Education & Labor",
  "environment": "Environment & Public Works",
  "homeland-security": "Homeland Security",
  "oversight": "Oversight & Reform",
  "rules": "Rules",
  "science-space-technology": "Science, Space & Technology",
  "small-business": "Small Business",
  "transportation": "Transportation & Infrastructure",
  "veterans-affairs": "Veterans' Affairs",
  "ways-means": "Ways & Means",
  "ways-and-means": "Ways & Means",
  "antitrust": "Antitrust (Judiciary)",
  "health": "Health",
};

// Donor sector folder names → clean sector labels
const SECTOR_MAP = {
  "agriculture": "Agriculture",
  "carceral state": "Carceral State",
  "corporate": "Corporate",
  "dark money": "Dark Money",
  "defense & intelligence": "Defense & Intelligence",
  "education": "Education",
  "energy & utilities": "Energy & Utilities",
  "foreign": "Foreign Influence",
  "gig economy": "Gig Economy",
  "healthcare": "Healthcare",
  "healthcare industry": "Healthcare",
  "israel lobby": "Israel Lobby",
  "labor unions": "Labor Unions",
  "law enforcement": "Law Enforcement",
  "media & entertainment": "Media & Entertainment",
  "mega-donors": "Mega-Donors",
  "pharma & healthcare": "Pharma & Healthcare",
  "real estate": "Real Estate",
  "real estate & housing": "Real Estate",
  "restaurant & food": "Restaurant & Food",
  "super pacs": "Super PACs",
  "tech & crypto": "Tech & Crypto",
  "wall street": "Wall Street",
};

// ── Helpers ─────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { yaml: null, yamlRaw: "", body: content, startIdx: 0, endIdx: 0 };

  const yamlRaw = match[1];
  const endIdx = match[0].length;
  const body = content.slice(endIdx);

  // Simple YAML parser for flat key-value (handles strings, numbers, null, arrays)
  const yaml = {};
  const lines = yamlRaw.split(/\r?\n/);
  let currentKey = null;
  for (const line of lines) {
    const kvMatch = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.*)/i);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val === "null" || val === "") {
        yaml[currentKey] = null;
      } else if (val === "true") {
        yaml[currentKey] = true;
      } else if (val === "false") {
        yaml[currentKey] = false;
      } else if (/^-?\d+(\.\d+)?$/.test(val)) {
        yaml[currentKey] = parseFloat(val);
      } else {
        // Strip quotes
        yaml[currentKey] = val.replace(/^["']|["']$/g, "");
      }
    } else if (line.match(/^\s+-\s/) && currentKey) {
      // Array item — skip for now, we preserve these as-is
    }
  }

  return { yaml, yamlRaw, body, startIdx: 0, endIdx };
}

function extractHashtags(body) {
  // Find hashtag line(s) — typically right after the second --- or after frontmatter
  // Hashtags look like: #tag-name #another-tag
  const tags = [];
  const tagLine = body.match(/(?:^|\n)(#[a-z0-9-]+(?:\s+#[a-z0-9-]+)*)/i);
  if (tagLine) {
    const matches = tagLine[1].matchAll(/#([a-z0-9-]+)/gi);
    for (const m of matches) {
      tags.push(m[1].toLowerCase());
    }
  }
  return tags;
}

function detectState(tags, folderParts) {
  // Check hashtags first
  for (const tag of tags) {
    if (STATE_MAP[tag]) return { abbr: STATE_MAP[tag], name: ABBREV_TO_NAME[STATE_MAP[tag]] };
  }
  // Check folder parts (e.g., "CA Governor 2026" → CA)
  for (const part of folderParts) {
    const abbr = part.match(/^([A-Z]{2})\s/);
    if (abbr && ABBREV_TO_NAME[abbr[1]]) {
      return { abbr: abbr[1], name: ABBREV_TO_NAME[abbr[1]] };
    }
  }
  return null;
}

function detectDistrict(tags, body) {
  // Look for district patterns in hashtags: #texas-36, #ca-12
  for (const tag of tags) {
    const distMatch = tag.match(/^(?:[a-z-]+)-(\d{1,2})$/);
    if (distMatch) {
      const num = parseInt(distMatch[1]);
      if (num >= 1 && num <= 53) return num.toString();
    }
  }
  // Look in body text: "9th District", "District 9", "TX-36"
  const bodyMatch = body.match(/(\d{1,2})(?:st|nd|rd|th)\s+(?:Congressional\s+)?District/i)
    || body.match(/(?:District|CD|CD-)\s*(\d{1,2})/i)
    || body.match(/[A-Z]{2}-(\d{1,2})/);
  if (bodyMatch) return bodyMatch[1];
  return null;
}

function detectChamber(folderParts, tags) {
  const folderStr = folderParts.join("/").toLowerCase();
  if (folderStr.includes("/house")) return "House";
  if (folderStr.includes("/senate")) return "Senate";
  if (folderStr.includes("/governors") || folderStr.includes("governor")) return "Governor";
  if (folderStr.includes("/presidential")) return "Presidential";
  if (folderStr.includes("/scotus")) return "SCOTUS";
  if (folderStr.includes("/trump cabinet") || folderStr.includes("/cabinet")) return "Cabinet";
  if (folderStr.includes("/international")) return "International";
  // Fallback to hashtags
  if (tags.includes("house")) return "House";
  if (tags.includes("senate")) return "Senate";
  if (tags.includes("governor")) return "Governor";
  if (tags.includes("scotus")) return "SCOTUS";
  return null;
}

function detectParty(folderParts, tags) {
  const folderStr = folderParts.join("/").toLowerCase();
  if (folderStr.includes("/democrats")) return "Democrat";
  if (folderStr.includes("/republicans")) return "Republican";
  if (folderStr.includes("/independent")) return "Independent";
  if (tags.includes("democrat")) return "Democrat";
  if (tags.includes("republican")) return "Republican";
  if (tags.includes("independent")) return "Independent";
  return null;
}

function detectCommittees(tags) {
  const committees = [];
  for (const tag of tags) {
    if (COMMITTEE_MAP[tag]) {
      committees.push(COMMITTEE_MAP[tag]);
    }
  }
  return committees;
}

function detectLeadershipRole(tags) {
  const roles = [];
  if (tags.includes("chairman") || tags.includes("chair")) roles.push("Chair");
  if (tags.includes("ranking-member")) roles.push("Ranking Member");
  if (tags.includes("speaker")) roles.push("Speaker");
  if (tags.includes("majority-leader")) roles.push("Majority Leader");
  if (tags.includes("minority-leader")) roles.push("Minority Leader");
  if (tags.includes("whip") || tags.includes("majority-whip") || tags.includes("minority-whip")) roles.push("Whip");
  if (tags.includes("president-pro-tempore")) roles.push("President Pro Tempore");
  return roles;
}

function detectIssues(tags) {
  // Map hashtags to issue categories
  const ISSUE_MAP = {
    "defense": "Defense & Military",
    "military-industrial-complex": "Defense & Military",
    "petrochemical": "Energy & Climate",
    "fossil-fuel": "Energy & Climate",
    "oil-gas": "Energy & Climate",
    "climate-denial": "Energy & Climate",
    "climate": "Energy & Climate",
    "healthcare": "Healthcare",
    "pharma": "Healthcare",
    "drug-pricing": "Healthcare",
    "guns": "Gun Policy",
    "nra": "Gun Policy",
    "gun-reform": "Gun Policy",
    "tech": "Technology",
    "crypto": "Technology",
    "silicon-valley": "Technology",
    "antitrust": "Antitrust & Monopoly",
    "wall-street": "Wall Street & Finance",
    "dark-money": "Dark Money & Campaign Finance",
    "immigration": "Immigration",
    "education": "Education",
    "labor": "Labor & Workers",
    "housing": "Housing",
    "real-estate": "Housing",
    "agriculture": "Agriculture",
    "israel": "Israel & Foreign Policy",
    "aipac": "Israel & Foreign Policy",
    "foreign-policy": "Israel & Foreign Policy",
    "abortion": "Reproductive Rights",
    "dobbs": "Reproductive Rights",
    "voting-rights": "Voting Rights",
    "criminal-justice": "Criminal Justice",
    "environment": "Environment",
    "epa": "Environment",
    "infrastructure": "Infrastructure",
    "trade": "Trade",
    "tax": "Tax Policy",
    "tax-cuts": "Tax Policy",
    "social-security": "Social Safety Net",
    "medicare": "Social Safety Net",
    "medicaid": "Social Safety Net",
  };
  const issues = new Set();
  for (const tag of tags) {
    if (ISSUE_MAP[tag]) issues.add(ISSUE_MAP[tag]);
  }
  return [...issues];
}

function detectDonorSector(relPath) {
  // Path: Donors & Power Networks/Healthcare/Boeing/Boeing.md
  const parts = relPath.split(/[/\\]/);
  const dnIdx = parts.findIndex(p => p.toLowerCase().startsWith("donors"));
  if (dnIdx === -1) return null;
  const sectorFolder = parts[dnIdx + 1];
  if (!sectorFolder) return null;
  return SECTOR_MAP[sectorFolder.toLowerCase()] || sectorFolder;
}

function detectDonorType(yaml, tags, body) {
  const type = (yaml?.type || "").toLowerCase();
  if (type === "corporation") return "Corporation";
  if (type === "pac") return "PAC";
  if (type === "donor") return "Individual Donor";
  if (type === "lobbying-firm") return "Lobbying Firm";
  if (type === "think-tank") return "Think Tank";
  if (type === "story") return "Story";
  return null;
}

function extractPoliticiansFunded(body) {
  // Look for wikilinks in the body that reference politician profiles
  const links = [];
  const wikiRe = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
  let m;
  while ((m = wikiRe.exec(body)) !== null) {
    const target = m[1].trim();
    if (target.includes("Master Profile")) {
      // Extract name from "_Nancy Pelosi Master Profile"
      const name = target.replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim();
      if (name && !links.includes(name)) links.push(name);
    }
  }
  return links;
}

function extractDonorLinks(body) {
  // Look for the "donors:" metadata line with wikilinks
  const donorLine = body.match(/^donors:\s*(.+)/m);
  if (!donorLine) return [];
  const links = [];
  const wikiRe = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
  let m;
  while ((m = wikiRe.exec(donorLine[1])) !== null) {
    const display = m[2] || m[1];
    if (!links.includes(display.trim())) links.push(display.trim());
  }
  return links;
}

function countDonorMentions(body) {
  // Count $ amounts mentioned — rough proxy for financial data richness
  const amounts = body.match(/\$[\d,.]+[MBKmillion|billion|thousand]*/g);
  return amounts ? amounts.length : 0;
}

// ── New YAML block builder ──────────────────────────

function buildNewFields(fields) {
  // Build YAML lines for new fields, inserting after existing frontmatter
  const lines = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - "${item}"`);
      }
    } else if (typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else {
      // Escape quotes in strings
      const escaped = String(value).replace(/"/g, '\\"');
      lines.push(`${key}: "${escaped}"`);
    }
  }
  return lines.join("\n");
}

function insertFields(content, newFieldsYaml) {
  // Insert new fields before the closing --- of frontmatter
  const match = content.match(/^(---\r?\n[\s\S]*?)\r?\n(---)/);
  if (!match) return content;
  return match[1] + "\n" + newFieldsYaml + "\n" + match[2] + content.slice(match[0].length);
}

// ── Main ────────────────────────────────────────────

function walkDir(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden dirs and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      walkDir(fullPath, results);
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  console.log(`\n🔧 Frontmatter Enrichment — ${WRITE ? "WRITE MODE" : "DRY RUN"}\n`);

  const allFiles = walkDir(CONTENT_DIR);
  console.log(`Found ${allFiles.length} markdown files\n`);

  const stats = {
    politicians: { total: 0, enriched: 0 },
    donors: { total: 0, enriched: 0 },
    lobbying: { total: 0, enriched: 0 },
    thinkTanks: { total: 0, enriched: 0 },
    stories: { total: 0, enriched: 0 },
    skipped: 0,
    fieldsAdded: {},
  };

  for (const filePath of allFiles) {
    const relPath = path.relative(CONTENT_DIR, filePath).replace(/\\/g, "/");
    const content = fs.readFileSync(filePath, "utf8");
    const { yaml, yamlRaw, body } = parseFrontmatter(content);

    if (!yaml) {
      stats.skipped++;
      continue;
    }

    const folderParts = relPath.split("/");
    const tags = extractHashtags(body);
    const newFields = {};
    let category = null;

    // ── POLITICIAN PROFILES ──
    if (relPath.toLowerCase().startsWith("politicians/") && relPath.toLowerCase().includes("master profile")) {
      category = "politicians";
      stats.politicians.total++;

      const party = detectParty(folderParts, tags);
      const chamber = detectChamber(folderParts, tags);
      const stateInfo = detectState(tags, folderParts);
      const district = chamber === "House" ? detectDistrict(tags, body) : null;
      const committees = detectCommittees(tags);
      const leadership = detectLeadershipRole(tags);
      const issues = detectIssues(tags);
      const topDonors = extractDonorLinks(body);

      // Structural fields
      if (party && !yaml.party) newFields.party = party;
      if (chamber && !yaml.chamber) newFields.chamber = chamber;
      if (stateInfo && !yaml.state) newFields.state = stateInfo.name;
      if (stateInfo && !yaml["state-abbr"]) newFields["state-abbr"] = stateInfo.abbr;
      if (district && !yaml.district) newFields.district = district;

      // Enrichment fields
      if (committees.length > 0 && !yaml.committees) newFields.committees = committees;
      if (leadership.length > 0 && !yaml["leadership-roles"]) newFields["leadership-roles"] = leadership;
      if (issues.length > 0 && !yaml.issues) newFields.issues = issues;
      if (topDonors.length > 0 && !yaml["top-donors"]) newFields["top-donors"] = topDonors;

      // Ranking metric placeholders (to be filled by data scripts later)
      if (!yaml["donor-dependency"]) newFields["donor-dependency"] = null;
      if (!yaml["out-of-state-money-pct"]) newFields["out-of-state-money-pct"] = null;
      if (!yaml["say-vs-pay-gap"]) newFields["say-vs-pay-gap"] = null;
      if (!yaml["sector-capture"]) newFields["sector-capture"] = null;
      if (!yaml["total-received"]) newFields["total-received"] = null;

    // ── DONOR PROFILES ──
    } else if (relPath.toLowerCase().startsWith("donors")) {
      category = "donors";
      stats.donors.total++;

      const sector = detectDonorSector(relPath);
      const donorType = detectDonorType(yaml, tags, body);
      const politiciansFunded = extractPoliticiansFunded(body);
      const issues = detectIssues(tags);

      if (sector && !yaml.sector) newFields.sector = sector;
      if (donorType && !yaml["entity-type"]) newFields["entity-type"] = donorType;
      if (politiciansFunded.length > 0 && !yaml["politicians-funded"]) newFields["politicians-funded"] = politiciansFunded;
      if (issues.length > 0 && !yaml.issues) newFields.issues = issues;

      // Ranking metric placeholders
      if (!yaml["total-political-spend"]) newFields["total-political-spend"] = null;
      if (!yaml["party-split"]) newFields["party-split"] = null;
      if (!yaml["roi-score"]) newFields["roi-score"] = null;
      if (!yaml["bipartisan-buyer-score"]) newFields["bipartisan-buyer-score"] = null;
      if (!yaml["policy-kill-count"]) newFields["policy-kill-count"] = null;
      if (!yaml["reach-score"]) newFields["reach-score"] = null;
      if (!yaml["dark-money-ratio"]) newFields["dark-money-ratio"] = null;
      if (!yaml["spend-trend"]) newFields["spend-trend"] = null;

    // ── LOBBYING FIRMS ──
    } else if (relPath.toLowerCase().startsWith("lobbying")) {
      category = "lobbying";
      stats.lobbying.total++;

      if (!yaml["revolving-door-score"]) newFields["revolving-door-score"] = null;

    // ── THINK TANKS ──
    } else if (relPath.toLowerCase().startsWith("think tank")) {
      category = "thinkTanks";
      stats.thinkTanks.total++;

      // Already have category and tax-status — no new fields needed yet

    // ── STORIES ──
    } else if (relPath.toLowerCase().startsWith("stories/")) {
      category = "stories";
      stats.stories.total++;

      const issues = detectIssues(tags);
      if (issues.length > 0 && !yaml.issues) newFields.issues = issues;

      // Spotlight/editorial fields
      if (!yaml["featured-date"]) newFields["featured-date"] = null;
      if (!yaml["shareable-stat"]) newFields["shareable-stat"] = null;
      if (!yaml["news-keywords"]) newFields["news-keywords"] = null;
    }

    // ── Apply changes ──
    // Remove null fields (placeholders) from the output for now
    // Only write fields that have actual values
    const writeFields = {};
    let hasValues = false;
    for (const [k, v] of Object.entries(newFields)) {
      if (v !== null && v !== undefined) {
        writeFields[k] = v;
        hasValues = true;
        stats.fieldsAdded[k] = (stats.fieldsAdded[k] || 0) + 1;
      }
    }

    if (!hasValues) continue;

    if (category === "politicians") stats.politicians.enriched++;
    if (category === "donors") stats.donors.enriched++;
    if (category === "lobbying") stats.lobbying.enriched++;
    if (category === "thinkTanks") stats.thinkTanks.enriched++;
    if (category === "stories") stats.stories.enriched++;

    const newYaml = buildNewFields(writeFields);

    if (VERBOSE) {
      console.log(`  ${relPath}`);
      for (const [k, v] of Object.entries(writeFields)) {
        const display = Array.isArray(v) ? `[${v.join(", ")}]` : v;
        console.log(`    + ${k}: ${display}`);
      }
      console.log();
    }

    if (WRITE) {
      const updated = insertFields(content, newYaml);
      fs.writeFileSync(filePath, updated, "utf8");
    }
  }

  // ── Summary ──
  console.log("═══════════════════════════════════════════");
  console.log("  ENRICHMENT SUMMARY");
  console.log("═══════════════════════════════════════════");
  console.log(`  Politicians:  ${stats.politicians.enriched}/${stats.politicians.total} enriched`);
  console.log(`  Donors:       ${stats.donors.enriched}/${stats.donors.total} enriched`);
  console.log(`  Lobbying:     ${stats.lobbying.enriched}/${stats.lobbying.total} enriched`);
  console.log(`  Think Tanks:  ${stats.thinkTanks.enriched}/${stats.thinkTanks.total} enriched`);
  console.log(`  Stories:      ${stats.stories.enriched}/${stats.stories.total} enriched`);
  console.log(`  Skipped:      ${stats.skipped} (no frontmatter)`);
  console.log();
  console.log("  Fields added:");
  const sorted = Object.entries(stats.fieldsAdded).sort((a, b) => b[1] - a[1]);
  for (const [field, count] of sorted) {
    console.log(`    ${field}: ${count}`);
  }
  console.log();
  console.log(WRITE ? "  ✅ Changes written to files." : "  ⚠️  DRY RUN — no files changed. Use --write to apply.");
  console.log();
}

main();
