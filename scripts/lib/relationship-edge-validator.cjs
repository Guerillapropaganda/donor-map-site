/**
 * relationship-edge-validator.cjs — schema + cross-reference validator for
 * data/relationships.jsonl.
 *
 * Part of Phase 3 (Data Model Only) — Central Relationship Edge Store.
 *
 * This is the single source of truth for:
 *   - the edge schema (required / optional fields)
 *   - the TYPE_META registry (relationship type enum + directedness + required extras)
 *   - the SOURCES enum (where an edge came from)
 *   - computeEdgeId() — deterministic dedup key hashing
 *
 * The CJS reader (scripts/lib/relationships-store.cjs), the TS mirror
 * (ops/src/lib/relationships-store.ts), and the migration script
 * (scripts/migrate-frontmatter-to-relationships-jsonl.cjs) all consume
 * this module — never hardcode the enums elsewhere.
 *
 * Public API:
 *   TYPES                                     — string[] of the 10 relationship types
 *   TYPE_META                                 — Record<type, { directed, requires }>
 *   SOURCES                                   — string[] of valid source enum values
 *   STATUSES                                  — string[] of valid status enum values
 *   DIRECTIONS                                — ["directed", "undirected"]
 *   computeEdgeId(edge)                       — string (16-char hex SHA-1 prefix)
 *   validateEdge(edge, ctx)                   — { ok, errors: string[] }
 *   validateFile(jsonlPath, ctx)              — { ok, total, errorCount, errors: [{line, id?, message}] }
 *   buildTitleIndex()                         — Map<title, { type, subcategory, path, slug }> for profile existence checks
 *
 * CLI:
 *   node scripts/lib/relationship-edge-validator.cjs --validate
 *     → validates data/relationships.jsonl against the full schema + profile existence
 *   node scripts/lib/relationship-edge-validator.cjs --file <path>
 *     → validates an arbitrary JSONL file
 *   node scripts/lib/relationship-edge-validator.cjs --types
 *     → prints the TYPE_META registry
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Lazy-loaded to avoid pulling in the vault walker unless we actually do a
// profile-existence check. Some consumers (e.g. the migration script) want
// to validate shape only, without the expensive title index build.
let _sharedLib = null;
function shared() {
  if (!_sharedLib) _sharedLib = require('./shared.cjs');
  return _sharedLib;
}

// Rulebook lookup for resolving flat profile types (e.g. "corporation",
// "investigation", "senator") to their top-level rulebook type (e.g.
// "entity", "story", "politician"). Lazy-loaded so the validator stays
// usable even if the rulebook is missing.
let _rulebook = null;
function rulebook() {
  if (_rulebook === false) return null;
  if (!_rulebook) {
    try {
      _rulebook = require('./profile-type-rulebook.cjs');
    } catch (_) {
      _rulebook = false;
      return null;
    }
  }
  return _rulebook;
}

// ─── Enums ─────────────────────────────────────────────────────────────

const TYPES = [
  'monetary',
  'political-support',
  'political-opposition',
  'staffing',
  'media-appearance',
  'story-link',
  'affiliation',
  'legal',
  'family',
  'related',
  'government-contract',
  'federal-grant',
];

const TYPE_META = {
  monetary: {
    directed: true,
    from_role: 'donor',
    to_role: 'recipient',
    requires: ['amount', 'cycle'],
  },
  'political-support': {
    directed: true,
    from_role: 'supporter',
    to_role: 'supported',
    requires: [],
  },
  'political-opposition': {
    directed: true,
    from_role: 'opponent',
    to_role: 'opposed',
    requires: [],
  },
  staffing: {
    directed: true,
    from_role: 'employee',
    to_role: 'principal',
    requires: ['role'],
  },
  'media-appearance': {
    directed: true,
    from_role: 'guest',
    to_role: 'outlet',
    requires: [],
  },
  'story-link': {
    directed: true,
    from_role: 'profile',
    to_role: 'story',
    requires: ['role'], // subject | source | mentioned
  },
  affiliation: {
    directed: true,
    from_role: 'member',
    to_role: 'organization',
    requires: ['role'],
  },
  legal: {
    directed: true,
    from_role: 'plaintiff',
    to_role: 'defendant',
    requires: ['role'],
  },
  family: {
    directed: false,
    from_role: 'person',
    to_role: 'person',
    requires: ['role'], // spouse | parent | child | sibling | other
  },
  related: {
    directed: true,
    from_role: 'profile',
    to_role: 'profile',
    requires: [], // catch-all; no extras
  },
  'government-contract': {
    directed: true,
    from_role: 'agency',
    to_role: 'contractor',
    requires: ['amount', 'cycle'],
  },
  'federal-grant': {
    directed: true,
    from_role: 'agency',
    to_role: 'grantee',
    requires: ['amount', 'cycle'],
  },
};

const SOURCES = [
  'fec-api',
  'lda-api',
  'propublica-nonprofit',
  'sec-edgar',
  'congress-api',
  'usaspending',
  'doj-press',
  'govtrack',
  'discovery-scanner',
  'connection-suggester',
  'contradiction-scanner',
  'frontmatter-migration',
  'body-migration-april-9',
  'manual-ops',
  'research-claude',
  // Phase 3 Part 4: auto-mirror source for the bidirectional normalizer
  // (scripts/normalize-related-bidirectionality.cjs). Creates reverse
  // edges for one-way `related` edges so the canonical store matches
  // the natural symmetry of the `related` relationship type.
  'bidirectional-normalizer',
  'fec-bulk',
  'epa-frs',
  'usaspending-bulk',
  'usaspending-grants-bulk',
  'fec-individual-bulk',
  'irs-990-bulk',
  // Per-committee indiv aggregation derived from
  // C:\donor-map-data\fec\indiv-by-committee.jsonl — captures
  // natural-person donors contributing $200+ directly to a campaign
  // committee, matched to the committee via fec_committee_id signals
  // on the receiving entity. Fills the gap where ingest-fec-individual-
  // bulk.cjs only emitted employer-aggregated edges.
  'fec-indiv-by-committee',
  'fec-oth-transfers',
  // FEC Operating Expenditures (disbursements) — campaigns/PACs paying
  // vendors, consultants, ad buyers. Emitted by aggregate-oppexp-to-
  // edges.cjs as monetary edges with role=operating-expense.
  'fec-oppexp',
  // FEC PAS2 (contributions from committees to candidates) — the
  // classified split files per ADR-0013. Committee→candidate direct
  // support + independent expenditures.
  'fec-pas2',
  // IRS 8872 political organization contributions — dark-money donor →
  // 527 political org direct gifts from the IRS POFD bulk file.
  'irs-pofd-8872',
];

const STATUSES = ['active', 'historical', 'disputed', 'deprecated'];

const DIRECTIONS = ['directed', 'undirected'];

// Sources that encode "this edge was imported from an unstructured legacy
// vault field." These are allowed to skip type-required-extras checks
// (e.g. a `monetary` edge without amount/cycle is OK if it came from a
// frontmatter migration — the future categorizer will upgrade it with
// real FEC data). All other sources must provide the extras.
// Sources exempt from type-specific required-extras (amount, cycle, etc).
// These sources assert that a relationship exists without necessarily
// carrying the FEC metadata — migrations read legacy frontmatter that
// never encoded it, manual-ops comes from editor clicks in the Ops UI
// where David confirms a relationship without entering dollar amounts.
// The categorizer (Phase 3 Part 2) upgrades these edges once Tier 1
// pipeline data provides the missing extras.
const MIGRATION_SOURCES = new Set([
  'frontmatter-migration',
  'body-migration-april-9',
  'manual-ops',
  // indiv-by-committee surfaces natural-person donors who don't (and
  // shouldn't) have vault profiles — their "from" names are raw FEC
  // contributor records. Allow these edges to skip the vault-profile
  // existence check on the from-side; the committee receiving the
  // contribution is a real vault entity by construction.
  'fec-indiv-by-committee',
  // Committee-to-committee transfers target stub entities created by
  // sync-campaign-committees.cjs that don't have .md profile files
  // yet — profile creation is Research Claude's lane, but the edges
  // are still real money flows we want in the graph now.
  'fec-oth-transfers',
  // IRS 8872 Schedule A/B: the POFD bulk format doesn't co-locate the
  // transaction year with the A/B record; the year lives on the
  // containing 2-record. Aggregated edges are lifetime totals with an
  // empty cycle — valid data, not missing data.
  'irs-pofd-8872',
]);

// ─── Title normalization ──────────────────────────────────────────────

/**
 * Canonical profile title used for edge endpoints.
 *
 * Vault convention (carried over from scripts/lib/shared.cjs):
 *   - Strip leading "_" (legacy marker for "master profile")
 *   - Strip trailing " Master Profile" suffix
 *   - Trim whitespace
 *
 * Examples:
 *   "_Ted Cruz Master Profile" → "Ted Cruz"
 *   "Pete Buttigieg Master Profile" → "Pete Buttigieg"
 *   "Koch Industries" → "Koch Industries"
 *   "" → ""
 *
 * MUST match the normalization logic in:
 *   - scripts/lib/shared.cjs → parseAllWikilinks / extractFrontmatterConnections
 *   - the migration script
 *   - the edge reader's query helpers
 */
function normalizeTitle(raw) {
  if (raw == null) return '';
  return String(raw)
    .replace(/^_/, '')
    .replace(/\s*Master Profile\s*$/i, '')
    .trim();
}

// ─── Edge ID hashing ───────────────────────────────────────────────────

/**
 * Compute a deterministic 16-char hex dedup key for an edge.
 *
 * Key composition per type (see plan):
 *   monetary:                      from|to|type|cycle
 *   story-link:                    from|to|type
 *   staffing / affiliation / legal: from|to|type|role|date_range_start
 *   family:                        min(from,to)|max(from,to)|type|role
 *   other:                         from|to|type
 */
function computeEdgeId(edge) {
  if (!edge || typeof edge !== 'object') return '';
  const type = edge.type || '';
  const meta = TYPE_META[type];
  let parts;

  if (type === 'monetary' || type === 'government-contract' || type === 'federal-grant') {
    // Monetary edges include role in the hash ONLY when a role is set, so
    // null-role donation edges keep their pre-ADR-0013 IDs (backwards-
    // compatible with the 75K+ existing edges). IE-support and IE-oppose
    // edges hash to distinct IDs so a committee that both donates to AND
    // runs IE ads for/against the same candidate in the same cycle
    // produces separate edges instead of colliding.
    parts = edge.role
      ? [edge.from, edge.to, type, edge.cycle || '', edge.role]
      : [edge.from, edge.to, type, edge.cycle || ''];
  } else if (type === 'staffing' || type === 'affiliation' || type === 'legal') {
    const dr = edge.date_range || '';
    const start = typeof dr === 'string' && dr.includes('/') ? dr.split('/')[0] : dr;
    parts = [edge.from, edge.to, type, edge.role || '', start];
  } else if (type === 'family' && meta && meta.directed === false) {
    const a = edge.from || '';
    const b = edge.to || '';
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    parts = [lo, hi, type, edge.role || ''];
  } else {
    parts = [edge.from, edge.to, type];
  }

  const key = parts.map((p) => (p == null ? '' : String(p))).join('|');
  return crypto.createHash('sha1').update(key, 'utf8').digest('hex').slice(0, 16);
}

// ─── Per-edge validation ───────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'id',
  'from',
  'to',
  'from_type',
  'to_type',
  'type',
  'direction',
  'confidence',
  'source',
  'first_seen',
  'last_verified',
  'status',
];

/**
 * Validate a single edge object against the schema.
 *
 * ctx can optionally provide:
 *   titleIndex: Map<title, { type, subcategory, path, slug }>
 *     — enables profile-existence + type-denormalization-consistency checks.
 *       Omit to skip those checks (useful during migration where the index
 *       is built incrementally).
 *
 * Returns { ok, errors: string[] }.
 */
function validateEdge(edge, ctx = {}) {
  const errors = [];

  if (!edge || typeof edge !== 'object' || Array.isArray(edge)) {
    return { ok: false, errors: ['edge must be an object'] };
  }

  // 2. Required fields present
  for (const f of REQUIRED_FIELDS) {
    if (edge[f] === undefined || edge[f] === null || edge[f] === '') {
      errors.push(`missing required field: ${f}`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  // 3. Type enum
  if (!TYPES.includes(edge.type)) {
    errors.push(`type: "${edge.type}" not in ${TYPES.join('|')}`);
  }
  const meta = TYPE_META[edge.type];

  // 4. Source enum
  if (!SOURCES.includes(edge.source)) {
    errors.push(`source: "${edge.source}" not in enum (${SOURCES.length} valid values)`);
  }

  // 5. Status enum
  if (!STATUSES.includes(edge.status)) {
    errors.push(`status: "${edge.status}" not in ${STATUSES.join('|')}`);
  }

  // 6. Direction enum AND matches type-meta
  if (!DIRECTIONS.includes(edge.direction)) {
    errors.push(`direction: "${edge.direction}" not in ${DIRECTIONS.join('|')}`);
  } else if (meta) {
    const expected = meta.directed ? 'directed' : 'undirected';
    if (edge.direction !== expected) {
      errors.push(`direction: type "${edge.type}" is ${expected}, got "${edge.direction}"`);
    }
  }

  // 7. Undirected canonical order
  if (meta && meta.directed === false) {
    if (typeof edge.from === 'string' && typeof edge.to === 'string' && edge.from > edge.to) {
      errors.push(
        `undirected edge must have from<to alphabetically; got from="${edge.from}", to="${edge.to}"`
      );
    }
  }

  // 8. Confidence range
  if (typeof edge.confidence !== 'number' || Number.isNaN(edge.confidence)) {
    errors.push(`confidence: must be a number, got ${typeof edge.confidence}`);
  } else if (edge.confidence < 0 || edge.confidence > 1) {
    errors.push(`confidence: must be in [0.0, 1.0], got ${edge.confidence}`);
  }

  // 9. Type-specific required fields
  // Migration-sourced edges are exempted from type-required-extras checks.
  // They carry typed relationships (e.g. "Koch Industries → Ted Cruz monetary")
  // without the amount/cycle metadata, because the legacy frontmatter never
  // encoded it. The categorizer (Phase 3 Part 2) upgrades these edges once
  // Tier 1 pipeline data provides the missing extras.
  const exemptFromRequires = MIGRATION_SOURCES.has(edge.source);
  if (meta && Array.isArray(meta.requires) && !exemptFromRequires) {
    for (const extra of meta.requires) {
      const val = edge[extra];
      if (val === undefined || val === null || val === '') {
        errors.push(`type "${edge.type}" requires field: ${extra}`);
      }
      if (extra === 'amount') {
        if (typeof val !== 'number' || val < 0) {
          errors.push(`amount: must be a non-negative number, got ${JSON.stringify(val)}`);
        }
      }
    }
  } else if (meta && meta.requires && meta.requires.includes('amount') && edge.amount !== undefined && edge.amount !== null) {
    // Even exempt edges must validate amount shape if the field is present.
    if (typeof edge.amount !== 'number' || edge.amount < 0) {
      errors.push(`amount: must be a non-negative number, got ${JSON.stringify(edge.amount)}`);
    }
  }

  // 10. Profile existence (only if ctx.titleIndex provided)
  if (ctx.titleIndex) {
    for (const side of ['from', 'to']) {
      const title = edge[side];
      const slug = edge[`${side}_slug`];
      if (typeof title !== 'string') {
        errors.push(`${side}: must be a string title`);
        continue;
      }
      const matches = ctx.titleIndex.get(title);
      if (!matches) {
        // Government agencies in government-contract edges are not profiled in the vault
        const subcatField = `${side}_subcategory`;
        if ((edge.type === 'government-contract' || edge.type === 'federal-grant') && edge[subcatField] === 'government-agency') {
          continue; // skip profile existence check for agencies
        }
        // Natural-person donors in fec-indiv-by-committee edges are raw
        // FEC contributor names — they legitimately don't have vault
        // profiles. The to-side can also lack a profile when the edge
        // targets a freshly-stub'd campaign committee (sync-campaign-
        // committees creates entity records without corresponding .md
        // files — profile creation is Research Claude's lane). Allow
        // this source to skip BOTH side profile checks; the committee
        // identity is anchored by fec_committee_id signals on the
        // entity record, not by a profile file.
        if (edge.source === 'fec-indiv-by-committee') {
          continue;
        }
        // fec-oth-transfers edges target stubbed campaign committees
        // (e.g. DONALD J TRUMP REPUBLICAN NOMINEE FUND 2024) that exist
        // as entity records but don't have profile .md files yet.
        if (edge.source === 'fec-oth-transfers') {
          continue;
        }
        errors.push(`${side}: no profile with title "${title}" in vault`);
        continue;
      }
      if (Array.isArray(matches) && matches.length > 1) {
        // Title collision — slug disambiguation required
        if (!slug) {
          errors.push(
            `${side}: title "${title}" has ${matches.length} matches; ${side}_slug required`
          );
          continue;
        }
        const chosen = matches.find((m) => m.slug === slug);
        if (!chosen) {
          errors.push(
            `${side}: slug "${slug}" does not match any profile with title "${title}"`
          );
          continue;
        }
        // 11. Denormalization consistency
        if (edge[`${side}_type`] && edge[`${side}_type`] !== chosen.type) {
          errors.push(
            `${side}_type: stale denormalization; profile has "${chosen.type}", edge has "${edge[`${side}_type`]}"`
          );
        }
        if (
          edge[`${side}_subcategory`] &&
          chosen.subcategory &&
          edge[`${side}_subcategory`] !== chosen.subcategory
        ) {
          errors.push(
            `${side}_subcategory: stale denormalization; profile has "${chosen.subcategory}", edge has "${edge[`${side}_subcategory`]}"`
          );
        }
      } else {
        const profile = Array.isArray(matches) ? matches[0] : matches;
        if (edge[`${side}_type`] && edge[`${side}_type`] !== profile.type) {
          errors.push(
            `${side}_type: stale denormalization; profile has "${profile.type}", edge has "${edge[`${side}_type`]}"`
          );
        }
        if (
          edge[`${side}_subcategory`] &&
          profile.subcategory &&
          edge[`${side}_subcategory`] !== profile.subcategory
        ) {
          errors.push(
            `${side}_subcategory: stale denormalization; profile has "${profile.subcategory}", edge has "${edge[`${side}_subcategory`]}"`
          );
        }
      }
    }
  }

  // 12. ID determinism
  const expectedId = computeEdgeId(edge);
  if (expectedId && edge.id !== expectedId) {
    errors.push(`id: hand-edited or stale; expected "${expectedId}", got "${edge.id}"`);
  }

  return { ok: errors.length === 0, errors };
}

// ─── File validation ───────────────────────────────────────────────────

/**
 * Validate every line of a JSONL file.
 *
 * Checks include all per-edge checks plus:
 *   13. Dedup — no two edges share the same id.
 *
 * Returns { ok, total, errorCount, errors: [{line, id?, message}] }.
 */
function validateFile(jsonlPath, ctx = {}) {
  if (!fs.existsSync(jsonlPath)) {
    return {
      ok: false,
      total: 0,
      errorCount: 1,
      errors: [{ line: 0, message: `file not found: ${jsonlPath}` }],
    };
  }

  const raw = fs.readFileSync(jsonlPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const errors = [];
  const idSeen = new Set();
  let total = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // skip blank lines, but the validator still reports them below
    if (line.trim().startsWith('#') || line.trim().startsWith('//')) {
      errors.push({ line: i + 1, message: `comments not allowed in JSONL` });
      continue;
    }
    total++;
    let edge;
    try {
      edge = JSON.parse(line);
    } catch (e) {
      errors.push({ line: i + 1, message: `invalid JSON: ${e.message}` });
      continue;
    }

    const result = validateEdge(edge, ctx);
    if (!result.ok) {
      for (const msg of result.errors) {
        errors.push({ line: i + 1, id: edge.id, message: msg });
      }
    }

    if (edge.id) {
      if (idSeen.has(edge.id)) {
        errors.push({ line: i + 1, id: edge.id, message: `duplicate id "${edge.id}"` });
      } else {
        idSeen.add(edge.id);
      }
    }
  }

  return { ok: errors.length === 0, total, errorCount: errors.length, errors };
}

// ─── Title index (for profile existence checks) ───────────────────────

/**
 * Walk the vault, parse every profile's frontmatter, and return a title
 * index:
 *   Map<title, entry | entry[]>
 * where entry = { type, subcategory, path, slug }.
 *
 * A Map value is an Array only when multiple profiles share the same title.
 * That's the case where the edge needs from_slug/to_slug to disambiguate.
 *
 * This is the expensive check — only call once per validation run. The
 * migration script reuses the same index for all its emits.
 */
function buildTitleIndex(contentRoot) {
  const { walkDir, parseFrontmatter } = shared();
  const root = contentRoot || path.join(__dirname, '..', '..', 'content');
  const files = walkDir(root, '.md');
  const index = new Map();

  // Lazy-load js-yaml for the heavyweight parse — shared.cjs's parseFrontmatter
  // is permissive but misses some edge cases (multi-line strings, nested objects).
  // The validator needs to be strict, so we use js-yaml here.
  let yaml;
  try {
    yaml = require('js-yaml');
  } catch (_) {
    yaml = null;
  }

  for (const filePath of files) {
    let data = {};
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) continue;
      if (yaml) {
        try {
          data = yaml.load(match[1]) || {};
        } catch (_) {
          // Fallback: shared.cjs's permissive parser
          data = parseFrontmatter(content).data;
        }
      } else {
        data = parseFrontmatter(content).data;
      }
    } catch (_) {
      continue;
    }

    const rawTitle = data.title;
    if (!rawTitle || typeof rawTitle !== 'string') continue;
    const title = normalizeTitle(rawTitle);
    if (!title) continue;

    // Derive slug from the file path relative to content/
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    const slug = rel
      .replace(/\/index\.md$/i, '')
      .replace(/\.md$/i, '')
      .toLowerCase();

    // Type + subcategory. The rulebook models flat vault type values
    // ("corporation", "senator", "investigation") as sub-categories under
    // top-level types ("entity", "politician", "story"). We store the
    // TOP-LEVEL type in `type` (so queries can filter by rulebook type
    // without needing a rulebook lookup per query) and the raw flat value
    // in `subcategory`. This matches how the Phase 2a rulebook is used
    // elsewhere in the codebase.
    const rawType = data.type || null;
    const rb = rulebook();
    let topLevel = rawType;
    let subcategory = data.category || data['sub-category'] || null;
    if (rb && rawType) {
      const resolved = rb.resolveTopLevelType(rawType);
      if (resolved && resolved !== rawType) {
        // Flat value is a sub-category of a top-level type
        topLevel = resolved;
        subcategory = subcategory || rawType;
      } else if (resolved === rawType) {
        // rawType is already a top-level type — subcategory stays as-is
        // (usually null unless the profile declared an explicit category)
      } else {
        // Unknown type — leave as raw, mark no subcategory
        topLevel = rawType;
      }
    }

    const entry = {
      type: topLevel,
      subcategory: subcategory || null,
      path: filePath,
      slug,
    };

    if (index.has(title)) {
      const existing = index.get(title);
      if (Array.isArray(existing)) {
        existing.push(entry);
      } else {
        index.set(title, [existing, entry]);
      }
    } else {
      index.set(title, entry);
    }

    // ─── Aliases: profile can claim alt names via `aliases:` frontmatter ──
    //
    // Example: Americans for Prosperity profile can list its FEC-format
    // names as aliases so suggestion edges citing "AMERICANS FOR PROSPERITY
    // ACTION, INC. (AFP ACTION)" resolve to the same canonical profile.
    //
    // Aliases are added as weaker index entries (they lose to real titles
    // in a collision). Entry.aliasOf points back to the canonical title
    // so callers can report the resolution.
    // Implicit filename alias: if the file basename (after stripping "_"
    // prefix and " Master Profile" suffix) differs from the title, register
    // it as a weaker alias. Rationale: profiles like Pfizer.md have
    // title: "Pfizer Inc." but the vault wikilinks use [[Pfizer]]. Without
    // this, every such wikilink resolves as dangling even though the file
    // exists. Part of the 2026-04-15 dangling-wikilink fix.
    const baseName = normalizeTitle(path.basename(filePath, '.md'));
    if (baseName && baseName !== title) {
      const aliasEntry = { ...entry, aliasOf: title };
      if (index.has(baseName)) {
        const existing = index.get(baseName);
        if (!Array.isArray(existing) && !existing.aliasOf) {
          // real title wins — skip
        } else if (Array.isArray(existing)) {
          if (!existing.some((e) => !e.aliasOf)) existing.push(aliasEntry);
        } else {
          index.set(baseName, [existing, aliasEntry]);
        }
      } else {
        index.set(baseName, aliasEntry);
      }
    }

    const aliases = Array.isArray(data.aliases)
      ? data.aliases
      : typeof data.aliases === 'string'
        ? [data.aliases]
        : [];
    for (const rawAlias of aliases) {
      if (typeof rawAlias !== 'string') continue;
      const aliasKey = normalizeTitle(rawAlias);
      if (!aliasKey || aliasKey === title) continue;
      const aliasEntry = { ...entry, aliasOf: title };
      if (index.has(aliasKey)) {
        const existing = index.get(aliasKey);
        // Never let an alias overwrite a real title
        if (!Array.isArray(existing) && !existing.aliasOf) continue;
        if (Array.isArray(existing)) {
          const hasReal = existing.some((e) => !e.aliasOf);
          if (hasReal) continue;
          existing.push(aliasEntry);
        } else {
          index.set(aliasKey, [existing, aliasEntry]);
        }
      } else {
        index.set(aliasKey, aliasEntry);
      }
    }
  }

  // ─── Disambiguate multi-entry titles by canonicality priority ─────────
  //
  // When multiple profiles share a title (e.g. "Heritage Foundation" as
  // both a donor-taxonomy entry and a think-tank entity, or "JB Pritzker"
  // as both a mega-donor and a governor politician profile), the index
  // would return an Array and downstream callers would treat it as
  // "unresolvable" and skip the edge.
  //
  // In practice there's always a canonical choice: the politician profile
  // for a person who's also a donor, the think-tank entity for an org
  // that's also a donor, the non-archived file over the archived one,
  // and the larger file over a stub. We compute a score per entry and
  // pick the highest; ties are kept as arrays so the validator can still
  // flag them for manual review.
  //
  // This does NOT merge content. The losing files are still on disk and
  // searchable through the vault; they just don't win the title-index
  // lookup that buildEdge uses for endpoint resolution.

  // Priority by top-level type. Higher = more canonical.
  const TYPE_PRIORITY = {
    politician: 100,
    'state-politician': 95,
    entity: 90,
    story: 80,
    donor: 70,
    event: 50,
    meta: 10,
  };

  function priorityScore(e) {
    const typeScore = TYPE_PRIORITY[e.type] || 30;
    // Penalize archived paths
    const archivePenalty = e.path && e.path.includes('Vault Maintenance') ? -200 : 0;
    // Bonus for file size (larger = more content, tiebreaker only)
    let sizeBonus = 0;
    try {
      const bytes = fs.statSync(e.path).size;
      sizeBonus = Math.min(20, Math.floor(bytes / 5000)); // max +20 at 100KB+
    } catch (_) { /* ignore */ }
    return typeScore + archivePenalty + sizeBonus;
  }

  for (const [title, entries] of index.entries()) {
    if (!Array.isArray(entries)) continue;
    let winner = entries[0];
    let winnerScore = priorityScore(winner);
    let tied = false;
    for (let i = 1; i < entries.length; i++) {
      const s = priorityScore(entries[i]);
      if (s > winnerScore) {
        winner = entries[i];
        winnerScore = s;
        tied = false;
      } else if (s === winnerScore) {
        tied = true;
      }
    }
    if (!tied) {
      index.set(title, winner);
    }
    // Tied cases stay as arrays — let the caller flag the ambiguity.
  }

  return index;
}

// ─── Module exports + CLI ──────────────────────────────────────────────

module.exports = {
  TYPES,
  TYPE_META,
  SOURCES,
  STATUSES,
  DIRECTIONS,
  REQUIRED_FIELDS,
  MIGRATION_SOURCES,
  normalizeTitle,
  computeEdgeId,
  validateEdge,
  validateFile,
  buildTitleIndex,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--types')) {
    console.log(JSON.stringify({ TYPES, TYPE_META, SOURCES, STATUSES }, null, 2));
    process.exit(0);
  }

  const fileArg = args.indexOf('--file');
  let target;
  if (fileArg >= 0 && args[fileArg + 1]) {
    target = args[fileArg + 1];
  } else if (args.includes('--validate')) {
    target = path.join(__dirname, '..', '..', 'data', 'relationships.jsonl');
  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/relationship-edge-validator.cjs --validate');
    console.log('  node scripts/lib/relationship-edge-validator.cjs --file <path>');
    console.log('  node scripts/lib/relationship-edge-validator.cjs --types');
    process.exit(0);
  }

  console.log(`Validating ${path.relative(process.cwd(), target)}...`);
  // Build title index for profile-existence checks
  const idx = buildTitleIndex();
  console.log(`  Title index: ${idx.size} profiles`);

  const result = validateFile(target, { titleIndex: idx });
  if (result.ok) {
    console.log(`✓ ${result.total} edges valid.`);
    process.exit(0);
  }
  console.error(`✗ ${result.errorCount} error(s) across ${result.total} edges:`);
  for (const err of result.errors.slice(0, 20)) {
    const idStr = err.id ? ` [id=${err.id}]` : '';
    console.error(`  line ${err.line}${idStr}: ${err.message}`);
  }
  if (result.errors.length > 20) {
    console.error(`  ... and ${result.errors.length - 20} more.`);
  }
  process.exit(1);
}
