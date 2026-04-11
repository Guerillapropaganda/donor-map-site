/**
 * attention-queue.cjs — shared helper for the self-training Attention Queue
 *
 * Every "intelligence" script (contradiction-miner, hallucination-catcher,
 * voice-drift-detector, promotion-candidate-queue, missing-profile-detector,
 * story-seed generator) contributes entries to ONE ranked list instead of
 * each producing its own report.
 *
 * The queue file is the backing store:
 *   content/Admin Notes/Attention Queue.md
 *
 * The primary surface is the /attention page in the ops app, which reads
 * this file via /api/attention-queue.
 *
 * Each entry has:
 *   - bucket    : "blocking" | "deciding" | "compounding"
 *   - what      : plain-English label (max ~80 chars)
 *   - why       : plain-English reason (max ~200 chars)
 *   - where     : file path OR /ops app URL
 *   - cost_min  : estimated minutes of David's time
 *   - leverage  : 1-5 stars — impact per minute
 *   - source    : script name that surfaced it
 *   - created   : ISO date
 *   - metadata? : optional structured data specific to the source
 *
 * SCRIPTS CALL `addEntries(sourceName, entries)` — this REPLACES all
 * entries previously contributed by that source (so reruns don't
 * duplicate). Other scripts' entries are preserved.
 *
 * On write, the queue is re-ranked by (leverage / cost_min) and the
 * file is regenerated with plain-English headers.
 */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', '..', 'content');
const QUEUE_FILE = path.join(CONTENT_DIR, 'Admin Notes', 'Attention Queue.md');
const STORE_FILE = path.join(CONTENT_DIR, 'Admin Notes', '.attention-queue-store.json');

/**
 * Load the persisted store (JSON keyed by source name → entries[]).
 * Returns an empty object if the store doesn't exist yet.
 */
function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Save the persisted store.
 */
function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Validate a single entry and fill in defaults. Throws if an entry
 * is missing required fields — helps catch scripts that forgot to
 * provide leverage/cost scores.
 */
function normalizeEntry(entry, sourceName) {
  const required = ['bucket', 'what', 'why', 'where', 'cost_min', 'leverage'];
  for (const key of required) {
    if (entry[key] === undefined || entry[key] === null) {
      throw new Error(`[attention-queue] entry from ${sourceName} missing required field: ${key}`);
    }
  }
  if (!['blocking', 'deciding', 'compounding'].includes(entry.bucket)) {
    throw new Error(`[attention-queue] invalid bucket ${entry.bucket} from ${sourceName}`);
  }
  if (entry.leverage < 1 || entry.leverage > 5) {
    throw new Error(`[attention-queue] leverage must be 1-5, got ${entry.leverage} from ${sourceName}`);
  }
  return {
    bucket: entry.bucket,
    what: String(entry.what).slice(0, 200),
    why: String(entry.why).slice(0, 400),
    where: String(entry.where),
    cost_min: Math.max(1, Math.round(entry.cost_min)),
    leverage: Math.round(entry.leverage),
    source: sourceName,
    created: entry.created || new Date().toISOString().slice(0, 10),
    metadata: entry.metadata || undefined,
  };
}

/**
 * REPLACE all entries from a given source with the new entries.
 * Other sources' entries are untouched. Regenerates the queue file.
 *
 * @param {string} sourceName — the script that's contributing (e.g., "contradiction-miner")
 * @param {object[]} entries — array of entry objects
 */
function addEntries(sourceName, entries) {
  const store = loadStore();
  store[sourceName] = entries.map(e => normalizeEntry(e, sourceName));
  saveStore(store);
  regenerateQueueFile(store);
  return store[sourceName].length;
}

/**
 * Flatten the store into a single ranked list.
 * Ranking: blocking first, then by (leverage / cost_min) descending.
 */
function flattenAndRank(store) {
  const all = [];
  for (const [source, entries] of Object.entries(store)) {
    for (const e of entries) all.push(e);
  }
  // Blocking always on top. Within each bucket, rank by (leverage / cost_min).
  const bucketRank = { blocking: 0, deciding: 1, compounding: 2 };
  all.sort((a, b) => {
    const bRank = bucketRank[a.bucket] - bucketRank[b.bucket];
    if (bRank !== 0) return bRank;
    const aRatio = a.leverage / a.cost_min;
    const bRatio = b.leverage / b.cost_min;
    return bRatio - aRatio;
  });
  return all;
}

/**
 * Regenerate the markdown file at content/Admin Notes/Attention Queue.md
 * so Obsidian users (and git history) have a plain-English view.
 */
function regenerateQueueFile(store) {
  const ranked = flattenAndRank(store);
  const blocking = ranked.filter(e => e.bucket === 'blocking');
  const deciding = ranked.filter(e => e.bucket === 'deciding');
  const compounding = ranked.filter(e => e.bucket === 'compounding');

  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push('---');
  lines.push('title: "Attention Queue"');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: urgent');
  lines.push('status: open');
  lines.push(`last-updated: '${today}'`);
  lines.push('generated-by: scripts/lib/attention-queue.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# 🎯 Attention Queue');
  lines.push('');
  lines.push(`*Auto-generated. Every script that finds something worth your time writes to this file.*`);
  lines.push('');
  lines.push(`**${blocking.length}** blocking · **${deciding.length}** editorial decisions · **${compounding.length}** background cleanup`);
  lines.push('');
  lines.push('---');
  lines.push('');

  function renderBucket(title, emoji, description, entries) {
    lines.push(`## ${emoji} ${title}`);
    lines.push('');
    lines.push(`*${description}*`);
    lines.push('');
    if (entries.length === 0) {
      lines.push('_Nothing here right now. ✓_');
      lines.push('');
      return;
    }
    for (const e of entries) {
      const stars = '★'.repeat(e.leverage) + '☆'.repeat(5 - e.leverage);
      lines.push(`### ${e.what}`);
      lines.push('');
      lines.push(`${e.why}`);
      lines.push('');
      lines.push(`- **Where:** \`${e.where}\``);
      lines.push(`- **Cost:** ~${e.cost_min} min`);
      lines.push(`- **Leverage:** ${stars}`);
      lines.push(`- **Surfaced by:** \`${e.source}\``);
      lines.push('');
    }
  }

  renderBucket(
    'Blocking',
    '🔴',
    'Something is broken or will break soon. These block other work — handle first.',
    blocking
  );
  renderBucket(
    'Editorial Decisions',
    '🟡',
    'Needs your editorial judgment. This is the quality work only you can do.',
    deciding
  );
  renderBucket(
    'Background Cleanup',
    '🟢',
    'Cleanup that makes everything else easier. Batch these when you have a slow moment.',
    compounding
  );

  lines.push('---');
  lines.push('');
  lines.push('## How this works');
  lines.push('');
  lines.push('- Every entry was surfaced by an automation script.');
  lines.push('- Scripts rank their findings by leverage (how much it matters) and cost (how long it takes).');
  lines.push('- Items sort top-to-bottom by leverage ÷ cost — the biggest wins per minute first.');
  lines.push('- **Blocking** items are breakages you must fix.');
  lines.push('- **Editorial Decisions** are the quality work you want to do — story angles, sign-offs, drift reviews.');
  lines.push('- **Background Cleanup** is busy work that scripts can mostly handle; review when you have time.');
  lines.push('- Every morning, start at the top and work down. Once a day is enough.');

  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
  fs.writeFileSync(QUEUE_FILE, lines.join('\n'), 'utf-8');
}

/**
 * Load the full queue for API / ops-app consumption.
 * Returns ranked array of entries with bucket breakdown.
 */
function loadQueue() {
  const store = loadStore();
  const ranked = flattenAndRank(store);
  return {
    total: ranked.length,
    buckets: {
      blocking: ranked.filter(e => e.bucket === 'blocking'),
      deciding: ranked.filter(e => e.bucket === 'deciding'),
      compounding: ranked.filter(e => e.bucket === 'compounding'),
    },
    ranked,
    sources: Object.keys(store),
    lastUpdated: (() => {
      try { return fs.statSync(STORE_FILE).mtime.toISOString(); } catch { return null; }
    })(),
  };
}

/**
 * Clear entries from a specific source. Used when a script has no findings
 * so it can still remove stale entries from previous runs.
 */
function clearSource(sourceName) {
  const store = loadStore();
  delete store[sourceName];
  saveStore(store);
  regenerateQueueFile(store);
}

module.exports = {
  addEntries,
  clearSource,
  loadQueue,
  QUEUE_FILE,
  STORE_FILE,
};
