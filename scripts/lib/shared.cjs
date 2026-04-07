/**
 * shared.cjs — Shared utilities for Donor Map pipeline scripts
 * File walking, frontmatter parsing, HTTP, rate limiter, cache, report writer
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ─── File Walking ───────────────────────────────────────────────

function walkDir(dir, ext = '.md') {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.obsidian' || entry.name === '.git') continue;
        results = results.concat(walkDir(full, ext));
      } else if (entry.name.endsWith(ext)) {
        results.push(full);
      }
    }
  } catch (e) {
    // Skip unreadable dirs
  }
  return results;
}

// ─── Frontmatter Parsing ────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };
  const raw = match[1];
  const data = {};
  let currentKey = null;
  let currentList = null;

  for (const line of raw.split(/\r?\n/)) {
    // Array item
    const listMatch = line.match(/^\s+-\s+(.+)/);
    if (listMatch && currentKey) {
      if (!currentList) currentList = [];
      currentList.push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    // Flush previous list
    if (currentList && currentKey) {
      data[currentKey] = currentList;
      currentList = null;
    }
    // Key-value pair
    const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1].trim();
      const val = kvMatch[2].trim().replace(/^["']|["']$/g, '');
      if (val === '') {
        // Might be start of array
        data[currentKey] = val;
      } else {
        data[currentKey] = val;
        currentKey = val === '' ? currentKey : null;
        // Keep currentKey for potential array
        if (kvMatch[2].trim() === '') currentKey = kvMatch[1].trim();
      }
    }
  }
  // Flush final list
  if (currentList && currentKey) {
    data[currentKey] = currentList;
  }

  const body = content.slice(match[0].length).trim();
  return { data, body };
}

// ─── HTTP Utilities ─────────────────────────────────────────────

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

async function fetchJSON(url, headers = {}) {
  const res = await httpGet(url, headers);
  return JSON.parse(res.data);
}

// ─── Rate Limiter ───────────────────────────────────────────────

class RateLimiter {
  constructor(requestsPerPeriod, periodMs = 60000) {
    this.max = requestsPerPeriod;
    this.periodMs = periodMs;
    this.timestamps = [];
  }

  async wait() {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.periodMs);
    if (this.timestamps.length >= this.max) {
      const oldest = this.timestamps[0];
      const waitMs = this.periodMs - (now - oldest) + 100;
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
    this.timestamps.push(Date.now());
  }
}

// ─── Cache ──────────────────────────────────────────────────────

class FileCache {
  constructor(cachePath, ttlMs = 24 * 60 * 60 * 1000) {
    this.cachePath = cachePath;
    this.ttlMs = ttlMs;
    this.data = {};
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.cachePath)) {
        this.data = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
      }
    } catch (e) {
      this.data = {};
    }
  }

  get(key) {
    const entry = this.data[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      delete this.data[key];
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    this.data[key] = { value, ts: Date.now() };
  }

  save() {
    fs.writeFileSync(this.cachePath, JSON.stringify(this.data, null, 2));
  }
}

// ─── Report Writer ──────────────────────────────────────────────

function writeReport(name, jsonData, markdownText, reportsDir) {
  const dir = reportsDir || path.join(__dirname, '..', '..', 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = path.join(dir, `${name}.json`);
  const mdPath = path.join(dir, `${name}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  fs.writeFileSync(mdPath, markdownText);

  // Sync to vault pipeline reports
  const vaultReportsDir = path.join(__dirname, '..', '..', 'content', 'Vault Maintenance', 'Pipeline Reports');
  if (fs.existsSync(path.dirname(vaultReportsDir))) {
    if (!fs.existsSync(vaultReportsDir)) fs.mkdirSync(vaultReportsDir, { recursive: true });
    const ts = new Date().toISOString().split('T')[0];
    const vaultMd = `> Pipeline report synced: ${ts}\n\n${markdownText}`;
    fs.writeFileSync(path.join(vaultReportsDir, `${name}.md`), vaultMd);
  }

  return { jsonPath, mdPath };
}

// ─── Logging ────────────────────────────────────────────────────

function log(msg, verbose = true) {
  if (verbose) console.log(msg);
}

function logError(msg) {
  console.error(`[ERROR] ${msg}`);
}

module.exports = {
  walkDir,
  parseFrontmatter,
  httpGet,
  fetchJSON,
  RateLimiter,
  FileCache,
  writeReport,
  log,
  logError,
};
