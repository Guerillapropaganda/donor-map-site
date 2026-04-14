/**
 * sources-schema.cjs — schema + validator for data/sources.jsonl
 *
 * Part of Phase 1 — Source Registry. See content/Build Phases.md and
 * content/Phases/phase-1/handoff.md for context.
 *
 * Every record written to data/sources.jsonl goes through `validate(record)`.
 * This module is the single source of truth for the source-registry schema —
 * any change here cascades to sources-store.cjs, the Ops /sources UI, the
 * Quartz {{src:ID}} plugin, and any pipeline that registers citations.
 *
 * Public API:
 *   validate(record)      → { ok: boolean, errors: string[] }
 *   newRecord(partial)    → fully-populated record with defaults
 *   normalizeUrl(url)     → string (dedupe key — not stored, compared only)
 *   STATUS                → frozen enum of legal statuses
 *   SOURCE_TYPES          → frozen enum of legal source types
 *   TIER                  → frozen enum of legal tiers (1-4 + null)
 */

const STATUS = Object.freeze([
  'unverified',     // just extracted, never fetched
  'live',           // fetched ok, content check passed
  'dead',           // fetch failed (DNS, 404, 5xx)
  'redirected',     // fetched ok but final URL is a different host
  'generic_orphan', // fetched ok but landed on homepage / search / 404-as-200
  'archived',       // intentionally archived (dead-but-preserved)
  'needs_review',   // flagged for editor triage
  'paywall',        // behind paywall, cannot content-check
]);

const SOURCE_TYPES = Object.freeze([
  'government_primary',  // fec.gov, congress.gov, sec.gov, lda.gov, etc.
  'government_secondary',// govtrack, propublica nonprofit explorer
  'court_record',        // pacer, courtlistener, supremecourt.gov
  'news_major',          // nyt, wapo, wsj, reuters, ap
  'news_regional',       // local / regional press
  'investigative',       // propublica articles, icij, crew, opensecrets (tier 2)
  'academic',            // peer-reviewed, working papers
  'trade_press',         // industry pubs
  'advocacy',            // advocacy org reports
  'social',              // tweets, posts
  'company_direct',      // company press release, 10-K, SEC filing
  'aggregator',          // followthemoney, votesmart
  'archive',             // web.archive.org, archive.today
  'other',
]);

const TIER = Object.freeze([null, 1, 2, 3, 4]);

// ─── URL normalization (for dedupe only — original URL is preserved) ───

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'mc_cid', 'mc_eid', '_ga', 'ref', 'ref_src',
]);

function normalizeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  let u;
  try {
    u = new URL(url.trim());
  } catch (_) {
    return url.trim().toLowerCase();
  }
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  u.protocol = 'https:';
  // Strip tracking params
  const params = [];
  for (const [k, v] of u.searchParams.entries()) {
    if (!TRACKING_PARAMS.has(k.toLowerCase())) params.push([k, v]);
  }
  u.search = '';
  for (const [k, v] of params) u.searchParams.append(k, v);
  // Strip trailing slash except for bare host
  let out = u.toString();
  if (out.endsWith('/') && u.pathname !== '/') {
    out = out.slice(0, -1);
  }
  return out.toLowerCase();
}

// ─── Record construction ───

function newRecord(partial = {}) {
  const now = new Date().toISOString();
  return {
    id: partial.id || null, // assigned by store
    url: partial.url || '',
    canonical_url: partial.canonical_url || null,
    final_host: partial.final_host || null,
    title: partial.title || null,
    content_hash: partial.content_hash || null,
    expected_strings: Array.isArray(partial.expected_strings) ? partial.expected_strings : [],
    tier: partial.tier === undefined ? null : partial.tier,
    source_type: partial.source_type || 'other',
    entity_ref: partial.entity_ref || null,
    claim_ref: partial.claim_ref || null,
    status: partial.status || 'unverified',
    first_seen: partial.first_seen || now,
    last_checked: partial.last_checked || null,
    last_verified_live: partial.last_verified_live || null,
    archive_url: partial.archive_url || null,
    editor_notes: partial.editor_notes || '',
  };
}

// ─── Validation ───

function validate(record) {
  const errors = [];
  if (!record || typeof record !== 'object') {
    return { ok: false, errors: ['record is not an object'] };
  }

  // Required: id, url, status, source_type, first_seen
  if (typeof record.id !== 'string' || !/^src_\d{6}$/.test(record.id)) {
    errors.push('id must match /^src_\\d{6}$/');
  }
  if (typeof record.url !== 'string' || !record.url.trim()) {
    errors.push('url must be a non-empty string');
  }
  if (!STATUS.includes(record.status)) {
    errors.push(`status must be one of: ${STATUS.join(', ')}`);
  }
  if (!SOURCE_TYPES.includes(record.source_type)) {
    errors.push(`source_type must be one of: ${SOURCE_TYPES.join(', ')}`);
  }
  if (!TIER.includes(record.tier)) {
    errors.push(`tier must be one of: ${TIER.map(String).join(', ')}`);
  }
  if (typeof record.first_seen !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(record.first_seen)) {
    errors.push('first_seen must be an ISO 8601 timestamp');
  }

  // Optional fields — if present, must be right type
  const nullableStrings = [
    'canonical_url', 'final_host', 'title', 'content_hash',
    'entity_ref', 'claim_ref', 'last_checked', 'last_verified_live',
    'archive_url',
  ];
  for (const key of nullableStrings) {
    if (record[key] !== null && typeof record[key] !== 'string') {
      errors.push(`${key} must be string or null`);
    }
  }
  if (!Array.isArray(record.expected_strings)) {
    errors.push('expected_strings must be an array');
  } else if (record.expected_strings.some((s) => typeof s !== 'string')) {
    errors.push('expected_strings must contain only strings');
  }
  if (typeof record.editor_notes !== 'string') {
    errors.push('editor_notes must be a string');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  STATUS,
  SOURCE_TYPES,
  TIER,
  normalizeUrl,
  newRecord,
  validate,
};
