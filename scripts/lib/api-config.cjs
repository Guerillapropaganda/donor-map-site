/**
 * api-config.cjs — Centralized API configuration for Donor Map research pipeline
 *
 * Reads API keys from .env file in project root.
 * Falls back to DEMO_KEY / public defaults when .env is missing.
 *
 * Setup:
 *   Create .env in project root:
 *     FEC_API_KEY=your_key_here
 *     CONGRESS_API_KEY=your_key_here
 *     LDA_API_KEY=your_key_here
 *     OPENSECRETS_API_KEY=your_key_here
 *     PROPUBLICA_API_KEY=your_key_here
 *     FOLLOWTHEMONEY_API_KEY=your_key_here
 */

const fs = require("fs")
const path = require("path")

// ── Load .env file ────────────────────────────────────
const envPath = path.resolve(__dirname, "..", "..", ".env")
const env = {}

try {
  const envContent = fs.readFileSync(envPath, "utf-8")
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
    env[key] = val
  }
} catch {
  // No .env file — will use defaults
}

// ── API Configurations ────────────────────────────────
const fecKey = env.FEC_API_KEY || process.env.FEC_API_KEY || "DEMO_KEY"

module.exports = {
  fec: {
    baseUrl: "https://api.open.fec.gov/v1",
    apiKey: fecKey,
    rateLimit: fecKey !== "DEMO_KEY" ? 1000 : 40, // requests per hour
    perPage: 100, // max allowed by FEC
    isDemoKey: fecKey === "DEMO_KEY",
  },

  congress: {
    baseUrl: "https://api.congress.gov/v3",
    apiKey: env.CONGRESS_API_KEY || process.env.CONGRESS_API_KEY || "DEMO_KEY",
    rateLimit: 5000, // per hour
    perPage: 25,
  },

  lda: {
    baseUrl: "https://lda.senate.gov/api/v1",
    apiKey: env.LDA_API_KEY || process.env.LDA_API_KEY || "b3e00f77b9db54cd753ca43bb8773f9e8b0ec5c4",
    rateLimit: 600, // conservative estimate
  },

  usaspending: {
    baseUrl: "https://api.usaspending.gov/api/v2",
    apiKey: null, // no auth needed
    rateLimit: 2000, // conservative
  },

  // ── Think Tank / Nonprofit APIs ──────────────────────
  propublicaNonprofit: {
    // ProPublica Nonprofit Explorer — 990 tax filings for all nonprofits
    // Revenue, top donors, exec compensation, grants given/received
    // FREE, no key needed
    // Docs: https://projects.propublica.org/nonprofits/api
    baseUrl: "https://projects.propublica.org/nonprofits/api/v2",
    apiKey: null, // no auth needed
    rateLimit: 1000, // conservative — no published limit
    // Key endpoints:
    //   /search.json?q={name} — find org by name
    //   /organizations/{ein}.json — org details + filing list
    //   /organizations/{ein}/{year}.json — specific year 990 data
  },

  // ── Donor Intelligence APIs ──────────────────────────
  opensecrets: {
    // OpenSecrets / Center for Responsive Politics
    // Donor summaries, industry totals, PAC data, revolving door
    // FREE API key: https://www.opensecrets.org/api/admin/index.php?function=signup
    baseUrl: "https://www.opensecrets.org/api",
    apiKey: env.OPENSECRETS_API_KEY || process.env.OPENSECRETS_API_KEY || null,
    rateLimit: 200, // per day (not per hour)
    // Key endpoints:
    //   ?method=candContrib&cid={opensecrets_id} — top contributors to candidate
    //   ?method=candIndustry&cid={opensecrets_id} — top industries funding candidate
    //   ?method=candSummary&cid={opensecrets_id} — candidate financial summary
  },

  // ── Foreign Lobbying ─────────────────────────────────
  fara: {
    // FARA — Foreign Agents Registration Act (DOJ)
    // Who lobbies for which foreign government/entity
    // FREE, no key needed
    // Docs: https://efile.fara.gov/ords/fara/production/f?p=API
    baseUrl: "https://efile.fara.gov/api/v1",
    apiKey: null,
    rateLimit: 300, // conservative
    // Key endpoints:
    //   /ActiveForeignPrincipals — current foreign clients
    //   /ActiveRegistrants — current registered agents
    //   /ShortFormRegistrants — lobbying activity reports
  },

  // ── State-Level Campaign Finance ─────────────────────
  followTheMoney: {
    // FollowTheMoney (National Institute on Money in Politics)
    // State-level campaign finance for all 50 states
    // FREE API key: https://www.followthemoney.org/our-data/api
    baseUrl: "https://api.followthemoney.org",
    apiKey: env.FOLLOWTHEMONEY_API_KEY || process.env.FOLLOWTHEMONEY_API_KEY || null,
    rateLimit: 500,
    // Key endpoints:
    //   /candidates?key={key}&s={state} — state candidates
    //   /contributions?key={key}&c-t-id={candidate_id} — contributions to candidate
    //   Especially useful for: CA Governor 2026, state races
  },

  // ── Bill Tracking & Vote Analysis ────────────────────
  govtrack: {
    // GovTrack — enhanced bill tracking, vote analysis
    // FREE, no key needed
    // Docs: https://www.govtrack.us/developers/api
    baseUrl: "https://www.govtrack.us/api/v2",
    apiKey: null,
    rateLimit: 1000,
    // Key endpoints:
    //   /person?lastname={name} — find legislator
    //   /vote_voter?person={id} — voting record
    //   /bill?sponsor={id} — sponsored bills
  },

  // Helper: print config status
  printStatus() {
    console.log("\n  API Configuration:")
    console.log(`    FEC:              ${this.fec.isDemoKey ? "DEMO_KEY (40 req/hr)" : "Registered key (1000 req/hr)"}`)
    console.log(`    Congress.gov:     ${this.congress.apiKey === "DEMO_KEY" ? "DEMO_KEY" : "Registered key"} (${this.congress.rateLimit} req/hr)`)
    console.log(`    Senate LDA:       ${this.lda.apiKey ? "Token configured" : "Missing — set LDA_API_KEY"}`)
    console.log(`    USASpending:      No auth required`)
    console.log(`    ProPublica 990s:  No auth required`)
    console.log(`    OpenSecrets:      ${this.opensecrets.apiKey ? "Key configured" : "Missing — set OPENSECRETS_API_KEY"}`)
    console.log(`    FARA:             No auth required`)
    console.log(`    FollowTheMoney:   ${this.followTheMoney.apiKey ? "Key configured" : "Missing — set FOLLOWTHEMONEY_API_KEY"}`)
    console.log(`    GovTrack:         No auth required`)
    console.log()
  },
}
