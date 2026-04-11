/**
 * relationships-store.cjs — in-process reader for data/relationships.jsonl
 *
 * Part of Phase 3 (Data Model Only) — Central Relationship Edge Store.
 *
 * Every consumer of the canonical edge file — pipeline scripts, future
 * Ops API routes (via the TS mirror at ops/src/lib/relationships-store.ts),
 * the categorizer, the contradiction scanner, etc. — reads through this
 * module. Never parse data/relationships.jsonl yourself; use these helpers
 * so the schema stays consistent across the codebase.
 *
 * The store is lazy: the file is read + parsed on first use and cached in
 * memory for the life of the process. Subsequent calls are near-free.
 *
 * Public API:
 *   loadEdges()                                         — Edge[] (cached)
 *   clearEdgesCache()                                   — force reload next call
 *   getEdgesFrom(title, opts)                           — Edge[]
 *   getEdgesTo(title, opts)                             — Edge[]
 *   getEdgesByType(type, opts)                          — Edge[]
 *   findEdge(id)                                        — Edge | null
 *   queryEdges({ from, to, from_type, to_type, type,
 *                min_confidence, status })              — Edge[]
 *   countEdges(opts?)                                   — number
 *
 * opts uniformly supports:
 *   { status: 'active' | 'all' | 'deprecated' | ..., min_confidence: 0 }
 * Default: status = 'active', min_confidence = 0.
 */
const fs = require('fs');
const path = require('path');
const { TYPE_META } = require('./relationship-edge-validator.cjs');

const EDGE_FILE = path.join(__dirname, '..', '..', 'data', 'relationships.jsonl');

let _cache = null;

// ─── Loading ───────────────────────────────────────────────────────────

function loadEdges() {
  if (_cache) return _cache;
  if (!fs.existsSync(EDGE_FILE)) {
    _cache = [];
    return _cache;
  }
  const raw = fs.readFileSync(EDGE_FILE, 'utf-8');
  const edges = [];
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      edges.push(JSON.parse(trimmed));
    } catch (_) {
      // Skip malformed lines silently. The pre-commit sentinel should have
      // blocked this before it landed; if it didn't, we don't want query
      // consumers to crash mid-request.
    }
  }
  _cache = edges;
  return _cache;
}

function clearEdgesCache() {
  _cache = null;
}

// ─── Filtering ─────────────────────────────────────────────────────────

function _applyOpts(edges, opts = {}) {
  const status = opts.status || 'active';
  const minConf = typeof opts.min_confidence === 'number' ? opts.min_confidence : 0;
  return edges.filter((e) => {
    if (status !== 'all' && e.status !== status) return false;
    if (typeof e.confidence === 'number' && e.confidence < minConf) return false;
    return true;
  });
}

// ─── Query API ─────────────────────────────────────────────────────────

/**
 * Edges where the given profile title is the `from` side — OR, for
 * undirected types (family), either side. Lets you ask "what edges touch
 * this profile going outward?" without caring about storage direction.
 */
function getEdgesFrom(title, opts) {
  const edges = loadEdges();
  return _applyOpts(
    edges.filter((e) => {
      if (e.from === title) return true;
      if (e.to === title) {
        const meta = TYPE_META[e.type];
        if (meta && meta.directed === false) return true;
      }
      return false;
    }),
    opts
  );
}

/**
 * Edges where the given profile title is the `to` side — OR, for
 * undirected types, either side.
 */
function getEdgesTo(title, opts) {
  const edges = loadEdges();
  return _applyOpts(
    edges.filter((e) => {
      if (e.to === title) return true;
      if (e.from === title) {
        const meta = TYPE_META[e.type];
        if (meta && meta.directed === false) return true;
      }
      return false;
    }),
    opts
  );
}

function getEdgesByType(type, opts) {
  const edges = loadEdges();
  return _applyOpts(
    edges.filter((e) => e.type === type),
    opts
  );
}

function findEdge(id) {
  const edges = loadEdges();
  return edges.find((e) => e.id === id) || null;
}

/**
 * General filter. All fields optional; AND semantics.
 *
 * Fields:
 *   from, to                   — exact title match
 *   from_type, to_type         — top-level rulebook type
 *   from_subcategory,          — sub-category (flat value from profile frontmatter)
 *     to_subcategory
 *   type                       — relationship type enum
 *   source                     — source enum
 *   min_confidence             — >= this value (default 0)
 *   status                     — exact status, or 'all' to not filter (default 'active')
 *   cycle                      — monetary cycle exact match
 */
function queryEdges(filter = {}) {
  const {
    from,
    to,
    from_type,
    to_type,
    from_subcategory,
    to_subcategory,
    type,
    source,
    cycle,
  } = filter;
  const status = filter.status || 'active';
  const minConf = typeof filter.min_confidence === 'number' ? filter.min_confidence : 0;
  const edges = loadEdges();
  return edges.filter((e) => {
    if (from !== undefined && e.from !== from) return false;
    if (to !== undefined && e.to !== to) return false;
    if (from_type !== undefined && e.from_type !== from_type) return false;
    if (to_type !== undefined && e.to_type !== to_type) return false;
    if (from_subcategory !== undefined && e.from_subcategory !== from_subcategory) return false;
    if (to_subcategory !== undefined && e.to_subcategory !== to_subcategory) return false;
    if (type !== undefined && e.type !== type) return false;
    if (source !== undefined && e.source !== source) return false;
    if (cycle !== undefined && e.cycle !== cycle) return false;
    if (status !== 'all' && e.status !== status) return false;
    if (typeof e.confidence === 'number' && e.confidence < minConf) return false;
    return true;
  });
}

function countEdges(opts) {
  return _applyOpts(loadEdges(), opts).length;
}

/**
 * Upsert a list of edges into the store.
 *
 * Semantics:
 *   - Each incoming edge is validated against the schema.
 *   - If an edge with the same id already exists, it is UPDATED:
 *       * last_verified is set to the new edge's last_verified (or now())
 *       * if the new edge's confidence is higher, confidence is upgraded
 *         and source is overwritten with the new source — higher-confidence
 *         producers (e.g. FEC data) win over lower-confidence producers
 *         (e.g. frontmatter-migration)
 *       * non-null fields on the new edge overwrite existing fields
 *         (amount, cycle, source_url, evidence, role, date_range)
 *       * first_seen is preserved from the existing edge
 *   - If no existing edge matches, the new edge is appended.
 *   - The resulting full store is sorted by id and written atomically
 *     via tmp+rename to data/relationships.jsonl.
 *
 * Validation is delegated to relationship-edge-validator.cjs — any edge
 * that fails validation is SKIPPED (not thrown). The return value
 * reports skipped counts so the caller can log them.
 *
 * Returns { added, updated, skipped, invalid, total, errors }.
 */
function upsertEdges(newEdges) {
  const { validateEdge } = require('./relationship-edge-validator.cjs');

  const existing = loadEdges();
  const byId = new Map();
  for (const e of existing) byId.set(e.id, e);

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  const errors = [];

  for (const incoming of newEdges) {
    const result = validateEdge(incoming);
    if (!result.ok) {
      invalid++;
      if (errors.length < 20) {
        errors.push({
          id: incoming.id,
          from: incoming.from,
          to: incoming.to,
          type: incoming.type,
          error: result.errors[0],
        });
      }
      continue;
    }

    const cur = byId.get(incoming.id);
    if (!cur) {
      byId.set(incoming.id, incoming);
      added++;
      continue;
    }

    // Upsert — higher confidence wins on source + confidence fields;
    // non-null fields on incoming overwrite existing.
    const merged = { ...cur };
    merged.last_verified = incoming.last_verified || new Date().toISOString();

    if (typeof incoming.confidence === 'number' && incoming.confidence > (cur.confidence || 0)) {
      merged.confidence = incoming.confidence;
      if (incoming.source) merged.source = incoming.source;
    }

    for (const field of ['amount', 'cycle', 'source_url', 'role', 'date_range']) {
      if (incoming[field] != null && incoming[field] !== '') {
        merged[field] = incoming[field];
      }
    }

    if (Array.isArray(incoming.evidence) && incoming.evidence.length > 0) {
      const existingEv = Array.isArray(cur.evidence) ? cur.evidence : [];
      const seen = new Set(existingEv);
      const mergedEv = existingEv.slice();
      for (const ev of incoming.evidence) {
        if (!seen.has(ev)) {
          mergedEv.push(ev);
          seen.add(ev);
        }
      }
      merged.evidence = mergedEv;
    }

    // Status: if incoming deprecates, respect it; otherwise keep current.
    if (incoming.status === 'deprecated' || incoming.status === 'disputed') {
      merged.status = incoming.status;
    }

    const changed = JSON.stringify(cur) !== JSON.stringify(merged);
    if (changed) {
      byId.set(incoming.id, merged);
      updated++;
    } else {
      skipped++;
    }
  }

  // Sort by id for stable git diffs
  const sorted = Array.from(byId.values()).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );

  // Atomic write
  if (!fs.existsSync(path.dirname(EDGE_FILE))) {
    fs.mkdirSync(path.dirname(EDGE_FILE), { recursive: true });
  }
  const tmp = `${EDGE_FILE}.tmp-${process.pid}-${Date.now()}`;
  const body = sorted.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(tmp, body, 'utf-8');
  fs.renameSync(tmp, EDGE_FILE);
  clearEdgesCache();

  return {
    added,
    updated,
    skipped,
    invalid,
    total: sorted.length,
    errors,
  };
}

module.exports = {
  loadEdges,
  clearEdgesCache,
  getEdgesFrom,
  getEdgesTo,
  getEdgesByType,
  findEdge,
  queryEdges,
  countEdges,
  upsertEdges,
  EDGE_FILE,
};

// CLI for quick inspection
if (require.main === module) {
  const args = process.argv.slice(2);
  const edges = loadEdges();
  if (args.includes('--count')) {
    console.log(`${edges.length} edges loaded from ${path.relative(process.cwd(), EDGE_FILE)}`);
    const byType = {};
    const bySrc = {};
    for (const e of edges) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      bySrc[e.source] = (bySrc[e.source] || 0) + 1;
    }
    console.log('\nBy type:');
    for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${t.padEnd(24)} ${n}`);
    }
    console.log('\nBy source:');
    for (const [s, n] of Object.entries(bySrc).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${s.padEnd(28)} ${n}`);
    }
  } else if (args.includes('--from') && args[args.indexOf('--from') + 1]) {
    const title = args[args.indexOf('--from') + 1];
    const results = getEdgesFrom(title);
    console.log(`${results.length} edges from "${title}":`);
    for (const r of results.slice(0, 20)) {
      console.log(`  ${r.type.padEnd(22)} → ${r.to.padEnd(40)} conf=${r.confidence} src=${r.source}`);
    }
    if (results.length > 20) console.log(`  ... and ${results.length - 20} more.`);
  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/relationships-store.cjs --count');
    console.log('  node scripts/lib/relationships-store.cjs --from "<profile title>"');
  }
}
