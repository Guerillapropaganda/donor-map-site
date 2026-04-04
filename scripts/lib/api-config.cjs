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

  // Helper: print config status
  printStatus() {
    console.log("\n  API Configuration:")
    console.log(`    FEC:           ${this.fec.isDemoKey ? "DEMO_KEY (40 req/hr)" : "Registered key (1000 req/hr)"}`)
    console.log(`    Congress.gov:  ${this.congress.apiKey === "DEMO_KEY" ? "DEMO_KEY" : "Registered key"} (${this.congress.rateLimit} req/hr)`)
    console.log(`    Senate LDA:    ${this.lda.apiKey ? "Token configured" : "Missing — set LDA_API_KEY"}`)
    console.log(`    USASpending:   No auth required`)
    console.log()
  },
}
