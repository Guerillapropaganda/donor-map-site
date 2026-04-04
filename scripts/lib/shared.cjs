#!/usr/bin/env node
/**
 * shared.cjs — Shared utilities for Donor Map research pipeline
 *
 * Extracted from enrich-frontmatter.cjs, rss-pipeline.cjs, fix-links.cjs
 * to eliminate duplication across pipeline scripts.
 */

const fs = require("fs")
const path = require("path")

// ── Config ────────────────────────────────────────────
const CONTENT_DIR = path.resolve(__dirname, "..", "..", "content")
const REPORTS_DIR = path.resolve(__dirname, "..", "..", "reports")
const SKIP_DIRS = [".obsidian", "_templates", "Assets", "Excalidraw"]

// ── CLI Argument Parsing ──────────────────────────────
function parseArgs(argv = process.argv.slice(2)) {
  const flags = {
    write: false,
    verbose: false,
  }
  const named = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--write") flags.write = true
    else if (arg === "--verbose") flags.verbose = true
    else if (arg.startsWith("--") && arg.includes("=")) {
      const [key, ...rest] = arg.slice(2).split("=")
      named[key] = rest.join("=")
    } else if (arg.startsWith("--") && i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      named[arg.slice(2)] = argv[++i]
    } else if (arg.startsWith("--")) {
      named[arg.slice(2)] = true
    }
  }

  return { ...flags, ...named }
}

// ── Filesystem ────────────────────────────────────────
function walkMarkdown(dir, skip = SKIP_DIRS) {
  let results = []
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (skip.includes(entry.name)) continue
      results = results.concat(walkMarkdown(full, skip))
    } else if (entry.name.endsWith(".md")) {
      results.push(full)
    }
  }
  return results
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// ── Frontmatter Parsing (matches enrich-frontmatter.cjs pattern) ──
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return { yaml: null, yamlRaw: "", body: content, startIdx: 0, endIdx: 0 }

  const yamlRaw = match[1]
  const endIdx = match[0].length
  const body = content.slice(endIdx)

  const yaml = {}
  const lines = yamlRaw.split(/\r?\n/)
  let currentKey = null
  let currentArray = null

  for (const line of lines) {
    const kvMatch = line.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.*)/i)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const val = kvMatch[2].trim()
      if (val === "null" || val === "") {
        yaml[currentKey] = null
        currentArray = null
      } else if (val === "true") {
        yaml[currentKey] = true
        currentArray = null
      } else if (val === "false") {
        yaml[currentKey] = false
        currentArray = null
      } else if (/^-?\d+(\.\d+)?$/.test(val)) {
        yaml[currentKey] = parseFloat(val)
        currentArray = null
      } else {
        yaml[currentKey] = val.replace(/^["']|["']$/g, "")
        currentArray = null
      }
    } else if (line.match(/^\s+-\s+(.*)/) && currentKey) {
      // Array item
      if (!currentArray) {
        currentArray = []
        yaml[currentKey] = currentArray
      }
      const itemVal = line.match(/^\s+-\s+(.*)/)[1].trim().replace(/^["']|["']$/g, "")
      currentArray.push(itemVal)
    }
  }

  return { yaml, yamlRaw, body, startIdx: 0, endIdx }
}

// ── Profile Loading ───────────────────────────────────
function loadProfiles(opts = {}) {
  const { types, dir } = { types: null, dir: CONTENT_DIR, ...opts }
  const files = walkMarkdown(dir)
  const politicians = []
  const donors = []
  const all = []
  const byName = new Map()

  for (const filePath of files) {
    let content
    try {
      content = fs.readFileSync(filePath, "utf-8")
    } catch {
      continue
    }

    const { yaml, body } = parseFrontmatter(content)
    if (!yaml || !yaml.title) continue

    const type = yaml.type || ""
    if (types && !types.includes(type)) continue

    const profile = {
      filePath,
      relativePath: path.relative(dir, filePath),
      title: yaml.title,
      type,
      yaml,
      body,
      contentReadiness: yaml["content-readiness"] || null,
      lastUpdated: yaml["last-updated"] || null,
      sourceTier: yaml["source-tier"] || null,
    }

    all.push(profile)
    byName.set(yaml.title.toLowerCase(), profile)

    if (["politician"].includes(type)) {
      politicians.push(profile)
    } else if (["donor", "pac", "corporation"].includes(type)) {
      donors.push(profile)
    }
  }

  return { politicians, donors, all, byName }
}

// ── HTTP Utilities ────────────────────────────────────
async function fetchJson(url, opts = {}) {
  const { timeout = 15000, headers = {}, retries = 2 } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "DonorMap-ResearchPipeline/1.0",
          Accept: "application/json",
          ...headers,
        },
      })
      clearTimeout(timer)
      if (!res.ok) {
        const error = new Error(`HTTP ${res.status}: ${res.statusText}`)
        error.status = res.status
        throw error
      }
      return await res.json()
    } catch (err) {
      if (attempt === retries) {
        clearTimeout(timer)
        throw err
      }
      // Wait before retry (exponential backoff)
      await sleep(1000 * (attempt + 1))
    }
  }
}

async function fetchHead(url, opts = {}) {
  const { timeout = 10000 } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "DonorMap-LinkChecker/1.0",
        Accept: "*/*",
      },
    })
    clearTimeout(timer)
    return {
      status: res.status,
      ok: res.ok,
      redirected: res.redirected,
      finalUrl: res.url,
    }
  } catch (err) {
    clearTimeout(timer)
    return {
      status: 0,
      ok: false,
      redirected: false,
      error: err.name === "AbortError" ? "timeout" : err.message,
    }
  }
}

// ── Rate Limiter ──────────────────────────────────────
class RateLimiter {
  constructor(requestsPerHour) {
    this.interval = (3600 * 1000) / requestsPerHour // ms between requests
    this.lastRequest = 0
    this.requestCount = 0
    this.limit = requestsPerHour
  }

  async wait() {
    const now = Date.now()
    const elapsed = now - this.lastRequest
    if (elapsed < this.interval) {
      await sleep(this.interval - elapsed)
    }
    this.lastRequest = Date.now()
    this.requestCount++
  }

  get remaining() {
    return this.limit - this.requestCount
  }
}

// ── File Cache ────────────────────────────────────────
class FileCache {
  constructor(name) {
    ensureDir(REPORTS_DIR)
    this.path = path.join(REPORTS_DIR, `${name}-cache.json`)
    this.data = {}
    this.load()
  }

  load() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.path, "utf-8"))
    } catch {
      this.data = {}
    }
  }

  save() {
    fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), "utf-8")
  }

  get(key) {
    const entry = this.data[key]
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete this.data[key]
      return null
    }
    return entry.value
  }

  set(key, value, ttlHours = 168) {
    this.data[key] = {
      value,
      cachedAt: new Date().toISOString(),
      expiresAt: Date.now() + ttlHours * 3600 * 1000,
    }
  }

  has(key) {
    return this.get(key) !== null
  }

  get size() {
    return Object.keys(this.data).length
  }
}

// ── Report Writer ─────────────────────────────────────
class ReportWriter {
  constructor(name) {
    this.name = name
    this.timestamp = new Date().toISOString()
    this.sections = []
    this.stats = {}
    this.data = {}
  }

  addSection(title, content) {
    this.sections.push({ title, content })
  }

  addStat(key, value) {
    this.stats[key] = value
  }

  setData(key, value) {
    this.data[key] = value
  }

  writeJson() {
    ensureDir(REPORTS_DIR)
    const out = {
      name: this.name,
      timestamp: this.timestamp,
      stats: this.stats,
      ...this.data,
    }
    const outPath = path.join(REPORTS_DIR, `${this.name}.json`)
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8")
    return outPath
  }

  writeMarkdown() {
    ensureDir(REPORTS_DIR)
    let md = `# ${this.name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())} Report\n\n`
    md += `**Generated:** ${this.timestamp}\n\n`

    // Stats summary
    if (Object.keys(this.stats).length > 0) {
      md += `## Summary\n\n`
      md += `| Metric | Value |\n|--------|-------|\n`
      for (const [k, v] of Object.entries(this.stats)) {
        md += `| ${k} | ${v} |\n`
      }
      md += `\n`
    }

    // Sections
    for (const { title, content } of this.sections) {
      md += `## ${title}\n\n`
      if (Array.isArray(content)) {
        for (const item of content) {
          if (typeof item === "string") {
            md += `- ${item}\n`
          } else {
            md += `- ${JSON.stringify(item)}\n`
          }
        }
      } else if (typeof content === "string") {
        md += content + "\n"
      }
      md += `\n`
    }

    const outPath = path.join(REPORTS_DIR, `${this.name}.md`)
    fs.writeFileSync(outPath, md, "utf-8")
    return outPath
  }

  writeBoth() {
    return {
      json: this.writeJson(),
      md: this.writeMarkdown(),
    }
  }
}

// ── Utilities ─────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatDollars(cents) {
  if (typeof cents !== "number") return cents
  return "$" + cents.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function today() {
  return new Date().toISOString().split("T")[0]
}

/**
 * Extract politician name from vault title
 * Handles: "_Elizabeth Warren Master Profile" → "Elizabeth Warren"
 *          "Koch Network - Charles Koch" → "Koch Network - Charles Koch"
 */
function extractName(title) {
  return title
    .replace(/^_/, "")
    .replace(/\s*Master Profile\s*$/i, "")
    .replace(/\s*Placeholder\s*$/i, "")
    .trim()
}

/**
 * Convert name to FEC search format
 * "Elizabeth Warren" → "warren, elizabeth"
 * "Chuck Schumer" → "schumer, chuck"
 */
function nameToFecFormat(name) {
  const parts = name.split(/\s+/)
  if (parts.length < 2) return name.toLowerCase()
  const last = parts[parts.length - 1]
  const first = parts.slice(0, -1).join(" ")
  // Skip suffixes
  const suffixes = ["jr", "jr.", "sr", "sr.", "ii", "iii", "iv"]
  if (suffixes.includes(last.toLowerCase()) && parts.length > 2) {
    const realLast = parts[parts.length - 2]
    const realFirst = parts.slice(0, -2).join(" ")
    return `${realLast}, ${realFirst}`.toLowerCase()
  }
  return `${last}, ${first}`.toLowerCase()
}

// ── Exports ───────────────────────────────────────────
module.exports = {
  // Config
  CONTENT_DIR,
  REPORTS_DIR,
  SKIP_DIRS,

  // CLI
  parseArgs,

  // Filesystem
  walkMarkdown,
  ensureDir,

  // Frontmatter
  parseFrontmatter,

  // Profiles
  loadProfiles,

  // HTTP
  fetchJson,
  fetchHead,

  // Rate limiting
  RateLimiter,

  // Cache
  FileCache,

  // Reporting
  ReportWriter,

  // Utilities
  sleep,
  formatDollars,
  today,
  extractName,
  nameToFecFormat,
}
