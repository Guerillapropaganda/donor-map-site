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

  // ── Foreign Lobbying ─────────────────────────────────
  fara: {
    // FARA — Foreign Agents Registration Act (DOJ)
    // Who lobbies for which foreign government/entity
    // FREE, no key — but aggressive rate limiting (429s)
    // Docs: https://efile.fara.gov/ords/fara/production/f?p=API
    baseUrl: "https://efile.fara.gov/api/v1",
    apiKey: null,
    rateLimit: 30, // very conservative — 429s are common
    // Key endpoints:
    //   /ActiveForeignPrincipals — current foreign clients
    //   /ActiveRegistrants — current registered agents
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

  // ── Federal Contracts ────────────────────────────────
  sam: {
    // SAM.gov — federal contract awards, entity registrations
    // FREE API key: https://sam.gov/content/home
    // Shows which companies get government contracts after donating
    baseUrl: "https://api.sam.gov",
    apiKey: env.SAM_API_KEY || process.env.SAM_API_KEY || null,
    rateLimit: 1000,
    // Key endpoints:
    //   /opportunities/v2/search — contract opportunities
    //   /entity-information/v3/entities — registered entities
  },

  // ── DEPRECATED / DISCONTINUED ────────────────────────
  // OpenSecrets API — discontinued public API access (2025)
  // FollowTheMoney — merged into OpenSecrets, API dead
  // ProPublica Congress API — deprecated, use Congress.gov instead

  // Helper: print config status
  printStatus() {
    console.log("\n  API Configuration:")
    console.log(`    FEC:              ${this.fec.isDemoKey ? "DEMO_KEY (40 req/hr)" : "Registered key (1000 req/hr)"}`)
    console.log(`    Congress.gov:     ${this.congress.apiKey === "DEMO_KEY" ? "DEMO_KEY" : "Registered key"} (${this.congress.rateLimit} req/hr)`)
    console.log(`    Senate LDA:       ${this.lda.apiKey ? "Token configured" : "Missing — set LDA_API_KEY"}`)
    console.log(`    USASpending:      No auth required`)
    console.log(`    ProPublica 990s:  No auth required`)
    console.log(`    GovTrack:         No auth required`)
    console.log(`    FARA:             No auth required (rate limited)`)
    console.log(`    SAM.gov:          ${this.sam.apiKey ? "Key configured" : "Missing — set SAM_API_KEY"}`)
    console.log()
  },
}
