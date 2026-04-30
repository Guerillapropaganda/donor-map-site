/**
 * code-audit-fetcher.cjs — single-entry helper for ADR-0030 code-audit
 * external fetches.
 *
 * EVERY external HTTP fetch issued by Code Claude for the purpose of
 * verifying pipeline output goes through this module. The module
 * enforces:
 *   - Allowlist (§1, §2 of ADR-0030) — refuses disallowed domains
 *   - Rate limit + backoff (§7) — 60/session, 2s min between same domain
 *   - Provenance logging (§4) — every attempt logged to
 *     data/code-audit-fetches.jsonl, even refused ones
 *   - Tamper-evidence — content-hash + status code captured
 *
 * Public API:
 *   fetchForAudit({ url, purpose, script, expected? }) → Promise<Record>
 *     Record shape: see ADR-0030 §4. Always returns; never throws on
 *     network errors (logs as `unreachable`). Throws ONLY on misuse
 *     (missing required arg, disallowed domain).
 *
 *   isDomainAllowed(url) → boolean
 *     Pure check. Used by the sentinel for static analysis.
 *
 *   loadFetchLog() → Array<Record>
 *     Reads data/code-audit-fetches.jsonl. Used by sentinel + harness.
 *
 * Phase 1 allowlist (immediately active):
 *   cal-access.sos.ca.gov
 *   www.sos.ca.gov
 *   campaignfinance.cdn.sos.ca.gov
 *
 * Phase 2 — pending pipeline activation (NOT YET ENABLED). Each domain
 * unlocks via amendment to ADR-0030 OR documentation in the
 * corresponding pipeline's "Phase 0 — Research" entry in Pipeline Guide.
 *
 * USAGE:
 *   const { fetchForAudit } = require('./lib/code-audit-fetcher.cjs');
 *   const result = await fetchForAudit({
 *     url: 'https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1485077',
 *     purpose: 'verify filer 1485077 maps to STEYER FOR GOVERNOR 2026',
 *     script: 'audit-cal-access-overrides.cjs',
 *     expected: { committeeName: 'STEYER FOR GOVERNOR 2026' },
 *   });
 *   if (result.status === 'ok') { ... }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const FETCH_LOG = path.join(ROOT, 'data', 'code-audit-fetches.jsonl');

// ─── Allowlist (ADR-0030 §1 + §2) ────────────────────────────────────

// Phase 1 — active 2026-04-30. Cal-Access only.
const PHASE_1_DOMAINS = new Set([
  'cal-access.sos.ca.gov',
  'www.sos.ca.gov',
  'campaignfinance.cdn.sos.ca.gov',
]);

// Phase 2 — gated by per-pipeline activation. Format: { domain, gating_rationale }.
// To activate one of these, add the domain to PHASE_1_DOMAINS in a future
// commit referencing the relevant pipeline + ADR amendment OR Pipeline Guide
// entry. Don't auto-flip these to active without the audit-trail change.
const PHASE_2_DOMAINS_NOT_YET_ENABLED = new Set([
  // FEC — when fec-bulk pipeline needs structural audit
  'www.fec.gov',
  'api.fec.gov',
  'docquery.fec.gov',
  // IRS — when irs-990-bulk pipeline needs audit
  'apps.irs.gov',
  'www.irs.gov',
  // SEC — when sec-edgar pipeline needs audit
  'www.sec.gov',
  // FPPC — when CA enforcement DB integration ships
  'www.fppc.ca.gov',
  'fppc.ca.gov',
  // Federal legislative — when congress.gov pipeline ships
  'www.congress.gov',
  'www.house.gov',
  'www.senate.gov',
  // ProPublica Nonprofit Explorer — already Tier 1 in source registry
  'projects.propublica.org',
]);

// ─── Rate limit state (per-process) ───────────────────────────────────

const RATE_LIMITS = {
  PER_DOMAIN_MIN_INTERVAL_MS: 2000, // 2s between same-domain hits
  PER_SESSION_PER_DOMAIN_CAP: 60,   // hard cap
  BACKOFF_BASE_MS: 2000,            // 2s, then 4s, 8s, ...
  BACKOFF_MAX_RETRIES: 5,           // 2s, 4s, 8s, 16s, 32s, then give up
  REQUEST_TIMEOUT_MS: 30000,        // 30s per request
};

const _domainLastHit = new Map();   // domain → ms timestamp
const _domainCount = new Map();     // domain → count

// ─── Public API ───────────────────────────────────────────────────────

function isDomainAllowed(urlStr) {
  try {
    const u = new URL(urlStr);
    if (PHASE_1_DOMAINS.has(u.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

function loadFetchLog() {
  if (!fs.existsSync(FETCH_LOG)) return [];
  const out = [];
  for (const line of fs.readFileSync(FETCH_LOG, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return out;
}

function _appendLog(record) {
  fs.mkdirSync(path.dirname(FETCH_LOG), { recursive: true });
  fs.appendFileSync(FETCH_LOG, JSON.stringify(record) + '\n', 'utf-8');
}

function _mintFetchId() {
  return 'caf_' + crypto.randomBytes(6).toString('hex');
}

function _sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf-8').digest('hex');
}

async function _wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function _enforceRateLimit(domain) {
  const last = _domainLastHit.get(domain) || 0;
  const now = Date.now();
  const gap = now - last;
  if (gap < RATE_LIMITS.PER_DOMAIN_MIN_INTERVAL_MS) {
    await _wait(RATE_LIMITS.PER_DOMAIN_MIN_INTERVAL_MS - gap);
  }
  _domainLastHit.set(domain, Date.now());
}

function _enforceSessionCap(domain) {
  const cnt = _domainCount.get(domain) || 0;
  if (cnt >= RATE_LIMITS.PER_SESSION_PER_DOMAIN_CAP) {
    throw new Error(`code-audit-fetcher: session cap reached for ${domain} (${RATE_LIMITS.PER_SESSION_PER_DOMAIN_CAP} fetches). Refusing further requests in this session.`);
  }
  _domainCount.set(domain, cnt + 1);
}

/**
 * Issue an audited fetch.
 *
 * Required args:
 *   url     — full URL to fetch (must be on §1 allowlist)
 *   purpose — one-sentence: what pipeline output is being verified
 *   script  — calling script filename (e.g. 'audit-cal-access-overrides.cjs')
 *
 * Optional args:
 *   expected     — { ...claims } the caller is verifying (free-form;
 *                  recorded in log for context)
 *   sessionId    — defaults to env CC_SESSION_ID or `cc_p3_unknown`
 *   maxRetries   — default 5, backoff per RATE_LIMITS
 *
 * Returns:
 *   { id, timestamp, url, domain, purpose, script, session_id, status,
 *     result, response_status_code, fetched_content_hash, content,
 *     content_length, discrepancy_detail, headers }
 *
 *   `content` is the raw response body (if successful). Caller compares
 *   against `expected` to set discrepancy_detail in a follow-up
 *   recordResult() call.
 *
 *   `status ∈ { 'ok' | 'unreachable' | 'rate-limited' | 'blocked-by-cf' | 'parse-failed' | 'refused-disallowed-domain' | 'session-cap-reached' }`
 *   `result ∈ { 'inconclusive' | 'verified' | 'discrepancy' }` — initial
 *     value `inconclusive`. The caller updates with recordResult() once
 *     it's done comparing the content.
 */
async function fetchForAudit({ url, purpose, script, expected, sessionId, maxRetries, method }) {
  if (!url || typeof url !== 'string') throw new Error('fetchForAudit: url is required (string)');
  if (!purpose || typeof purpose !== 'string') throw new Error('fetchForAudit: purpose is required (string)');
  if (!script || typeof script !== 'string') throw new Error('fetchForAudit: script is required (string)');
  const httpMethod = (method || 'GET').toUpperCase();
  if (!['GET', 'HEAD'].includes(httpMethod)) throw new Error('fetchForAudit: method must be GET or HEAD');

  const id = _mintFetchId();
  const timestamp = new Date().toISOString();
  const session_id = sessionId || process.env.CC_SESSION_ID || `cc_p3_${(process.env.USER || 'unknown').replace(/\W/g, '')}`;

  let domain;
  try {
    domain = new URL(url).hostname;
  } catch (err) {
    const rec = {
      id, timestamp, url, domain: null, purpose, script, session_id,
      status: 'parse-failed', result: 'inconclusive',
      response_status_code: null, fetched_content_hash: null,
      content_length: 0,
      discrepancy_detail: `URL parse failed: ${err.message}`,
      expected: expected || null,
    };
    _appendLog(rec);
    return { ...rec, content: null };
  }

  if (!isDomainAllowed(url)) {
    const rec = {
      id, timestamp, url, domain, purpose, script, session_id,
      status: 'refused-disallowed-domain', result: 'inconclusive',
      response_status_code: null, fetched_content_hash: null,
      content_length: 0,
      discrepancy_detail: `Domain "${domain}" not in ADR-0030 §1 allowlist. Phase 2 candidates not yet enabled.`,
      expected: expected || null,
    };
    _appendLog(rec);
    throw new Error(`code-audit-fetcher: refused fetch to disallowed domain "${domain}". See ADR-0030 §1.`);
  }

  // Rate limit + cap check
  try {
    _enforceSessionCap(domain);
  } catch (err) {
    const rec = {
      id, timestamp, url, domain, purpose, script, session_id,
      status: 'session-cap-reached', result: 'inconclusive',
      response_status_code: null, fetched_content_hash: null,
      content_length: 0,
      discrepancy_detail: err.message,
      expected: expected || null,
    };
    _appendLog(rec);
    throw err;
  }

  await _enforceRateLimit(domain);

  // Fetch with retry/backoff
  const retries = typeof maxRetries === 'number' ? maxRetries : RATE_LIMITS.BACKOFF_MAX_RETRIES;
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), RATE_LIMITS.REQUEST_TIMEOUT_MS);
      const res = await fetch(url, {
        method: httpMethod,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Donor Map Pipeline Audit / thedonormap.org / Code Claude ADR-0030',
          'Accept': 'text/html, application/json, application/pdf, */*',
        },
        redirect: 'follow',
      });
      clearTimeout(timeoutHandle);

      const status_code = res.status;
      // 429 / 503 → backoff + retry
      if ((status_code === 429 || status_code === 503) && attempt < retries) {
        const wait = RATE_LIMITS.BACKOFF_BASE_MS * Math.pow(2, attempt);
        await _wait(wait);
        continue;
      }

      // HEAD requests have no body. Capture headers only.
      const content = httpMethod === 'HEAD' ? '' : await res.text();
      const headers = {};
      // Capture a small set of headers useful for audit
      for (const h of ['content-type', 'content-length', 'last-modified', 'etag', 'cf-ray']) {
        if (res.headers.has(h)) headers[h] = res.headers.get(h);
      }

      // Bot-block detection — Cloudflare, Imperva, Akamai, etc. all
      // return 200 OK with a JS-challenge body when they want to block
      // a non-browser client. Heuristic but catches the common cases.
      // 2026-04-30: Cal-Access Detail.aspx pages are Imperva-protected
      // ("Pardon Our Interruption"). Static PDFs at www.sos.ca.gov
      // serve fine. Bulk dumps at campaignfinance.cdn.sos.ca.gov serve
      // fine. Distinguishing these is the entire point of this check.
      const head = content.slice(0, 4000);
      const blockSignals = [
        /<title[^>]*>(Just a moment|Attention Required|Pardon Our Interruption|Access Denied|Bot Verification|Please Wait|Checking your browser)/i,
        /<noscript>\s*<title>Pardon Our Interruption/i,
        /window\.onProtectionInitialized/, // Imperva (full SPA challenge)
        /_Incapsula_Resource/,             // Imperva (legacy Incapsula stub)
        /__cf_chl_jschl_tk__/,             // Cloudflare classic challenge
        /cf-browser-verification/,         // Cloudflare
        /cdn-cgi\/challenge-platform/,     // Cloudflare turnstile
        /This website is using a security service to protect itself/i, // Cloudflare boilerplate
      ];
      const isBotBlocked = blockSignals.some((re) => re.test(head));

      const finalStatus =
        status_code >= 200 && status_code < 300 && !isBotBlocked ? 'ok' :
        isBotBlocked ? 'blocked-by-cf' : // keeping enum string for backwards compat
        status_code === 429 ? 'rate-limited' :
        'unreachable';

      const rec = {
        id, timestamp, url, domain, purpose, script, session_id,
        status: finalStatus, result: 'inconclusive',
        response_status_code: status_code,
        fetched_content_hash: _sha256(content),
        content_length: content.length,
        discrepancy_detail: null,
        expected: expected || null,
        headers,
      };
      _appendLog(rec);
      return { ...rec, content };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const wait = RATE_LIMITS.BACKOFF_BASE_MS * Math.pow(2, attempt);
        await _wait(wait);
        continue;
      }
    }
  }

  // All retries exhausted
  const rec = {
    id, timestamp, url, domain, purpose, script, session_id,
    status: 'unreachable', result: 'inconclusive',
    response_status_code: null, fetched_content_hash: null,
    content_length: 0,
    discrepancy_detail: lastError ? lastError.message : 'unknown error',
    expected: expected || null,
  };
  _appendLog(rec);
  return { ...rec, content: null };
}

/**
 * Update the result field on a previously-logged fetch. Caller uses this
 * AFTER comparing the fetched content against `expected`.
 *
 * Args:
 *   id              — fetch id from fetchForAudit() return value
 *   result          — 'verified' | 'discrepancy' | 'inconclusive'
 *   discrepancyDetail — required when result='discrepancy'
 *
 * Appends a new log line linking back to the original fetch id with
 * shape: { kind: 'result-update', original_id, result, discrepancy_detail, timestamp }
 *
 * Append-only — never edits prior entries (audit-trail integrity).
 */
function recordResult({ id, result, discrepancyDetail }) {
  if (!id) throw new Error('recordResult: id is required');
  const validResults = new Set(['verified', 'discrepancy', 'inconclusive']);
  if (!validResults.has(result)) throw new Error(`recordResult: result must be one of ${[...validResults].join(', ')}`);
  if (result === 'discrepancy' && !discrepancyDetail) {
    throw new Error('recordResult: discrepancyDetail required when result=discrepancy');
  }
  const rec = {
    kind: 'result-update',
    original_id: id,
    result,
    discrepancy_detail: discrepancyDetail || null,
    timestamp: new Date().toISOString(),
  };
  _appendLog(rec);
  return rec;
}

module.exports = {
  fetchForAudit,
  recordResult,
  isDomainAllowed,
  loadFetchLog,
  PHASE_1_DOMAINS,
  PHASE_2_DOMAINS_NOT_YET_ENABLED,
  RATE_LIMITS,
  FETCH_LOG,
};
