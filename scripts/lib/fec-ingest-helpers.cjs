/**
 * scripts/lib/fec-ingest-helpers.cjs
 *
 * Shared infrastructure for FEC bulk-ingest scripts (ADR-0014).
 *
 * Responsibilities:
 *   - Unified paths to C:\donor-map-data\fec\ (derived stores) and
 *     C:\donor-map-data\bulk\ (raw zips).
 *   - Checkpoint read/write so per-zip progress survives crashes.
 *   - Two-file write pattern: writes go to {name}.partial.jsonl while
 *     open, rename to {name}.jsonl on successful completion. Crash
 *     mid-zip leaves a .partial file that resume discards.
 *   - Async line-by-line zip extraction via PowerShell Expand-Archive
 *     + readline stream (readFileSync fails on >512MB extracted files).
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const BULK_ROOT = 'C:\\donor-map-data\\bulk';
const DERIVED_ROOT = 'C:\\donor-map-data\\fec';
const CHECKPOINT_DIR = path.join(DERIVED_ROOT, '.checkpoints');

function ensureDerivedDirs() {
  fs.mkdirSync(DERIVED_ROOT, { recursive: true });
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
}

function checkpointPath(pipelineName) {
  return path.join(CHECKPOINT_DIR, `${pipelineName}.json`);
}

function loadCheckpoint(pipelineName) {
  ensureDerivedDirs();
  const p = checkpointPath(pipelineName);
  if (!fs.existsSync(p)) return { completed: [], started: new Date().toISOString() };
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return { completed: [], started: new Date().toISOString() }; }
}

function saveCheckpoint(pipelineName, state) {
  ensureDerivedDirs();
  fs.writeFileSync(checkpointPath(pipelineName), JSON.stringify(state, null, 2));
}

function markComplete(pipelineName, zipName) {
  const state = loadCheckpoint(pipelineName);
  if (!state.completed.includes(zipName)) {
    state.completed.push(zipName);
    state.last_completed = zipName;
    state.last_completed_at = new Date().toISOString();
    saveCheckpoint(pipelineName, state);
  }
}

function isComplete(pipelineName, zipName) {
  const state = loadCheckpoint(pipelineName);
  return state.completed.includes(zipName);
}

/**
 * Extract a zip, stream its text file line-by-line via readline.
 * Returns an async generator yielding lines.
 * Auto-cleans the extracted tmp dir on completion.
 */
async function* streamZip(zipPath) {
  const tmp = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `fec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(tmp, { recursive: true });
  try {
    execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmp}' -Force"`, { stdio: 'pipe' });
    const csv = fs.readdirSync(tmp).find(f => f.endsWith('.txt') || f.endsWith('.csv'));
    if (!csv) return;
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(tmp, csv), { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) yield line;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * PartialWriter — opens `{name}.partial.jsonl` for append, commit() renames
 * to `{name}.jsonl` on successful zip completion. Crash-safe: if the process
 * dies before commit(), the .partial file remains and resume deletes it.
 */
class PartialWriter {
  constructor(outputName) {
    this.final = path.join(DERIVED_ROOT, `${outputName}.jsonl`);
    this.partial = path.join(DERIVED_ROOT, `${outputName}.partial.jsonl`);
    ensureDerivedDirs();
    this.fd = fs.openSync(this.partial, 'a');
    this.written = 0;
  }
  write(obj) {
    fs.writeSync(this.fd, JSON.stringify(obj) + '\n');
    this.written++;
  }
  close() {
    if (this.fd !== null) { fs.closeSync(this.fd); this.fd = null; }
  }
  /**
   * On successful zip completion: append partial into final, remove partial.
   * This way the final file accumulates across all zips.
   */
  commit() {
    this.close();
    if (!fs.existsSync(this.partial)) return;
    const partialContent = fs.readFileSync(this.partial);
    if (partialContent.length > 0) fs.appendFileSync(this.final, partialContent);
    fs.rmSync(this.partial, { force: true });
  }
  abort() {
    this.close();
    // leave .partial in place so resume can clean it up explicitly
  }
}

/**
 * Cleanup any orphaned .partial files at the start of a resume run.
 * An orphan means a previous run crashed mid-zip; that zip is NOT in the
 * checkpoint, so we drop its partial output and redo it.
 */
function cleanupPartials() {
  ensureDerivedDirs();
  for (const f of fs.readdirSync(DERIVED_ROOT)) {
    if (f.endsWith('.partial.jsonl')) {
      fs.rmSync(path.join(DERIVED_ROOT, f), { force: true });
    }
  }
}

// Find a bulk subdirectory with tolerance for case + alias. FEC folder
// names have shifted over the years; local archives vary. Aliases let
// ingest scripts declare a canonical name and still resolve to the
// variant on disk.
const SUBDIR_ALIASES = {
  'Contributions by Individuals': [
    'Contributions by individuals',
  ],
  'Committee to committee transactions': [
    'Any transaction from one committee to another',
  ],
  'Contributions from committees to candidates & independent expenditures': [
    'Contributions from comitt. to candidates & independent expenditures',
  ],
  'Operating Expenditures': [
    'Operating expenditures',
  ],
  'IRS 990': [
    'Form 990 IRS',
  ],
};

function resolveBulkSubdir(subdir) {
  const direct = path.join(BULK_ROOT, subdir);
  if (fs.existsSync(direct)) return direct;
  for (const a of (SUBDIR_ALIASES[subdir] || [])) {
    const p = path.join(BULK_ROOT, a);
    if (fs.existsSync(p)) return p;
  }
  // Case-insensitive fallback
  if (fs.existsSync(BULK_ROOT)) {
    const target = subdir.toLowerCase();
    for (const entry of fs.readdirSync(BULK_ROOT, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.toLowerCase() === target) return path.join(BULK_ROOT, entry.name);
    }
  }
  return null;
}

function listZips(subdir) {
  const full = resolveBulkSubdir(subdir);
  if (!full) return [];
  return fs.readdirSync(full).filter(f => f.endsWith('.zip')).sort();
}

/**
 * Protection against silent-delete of C:\donor-map-data\bulk\ — a past
 * session wiped the entire bulk directory without telling anyone, which
 * cost hours and required re-downloading multi-GB zips. Drop a sentinel
 * (.keepzips) at the bulk root and have ingest scripts loudly fail if
 * it's missing. Fail-closed beats silent-empty-output.
 *
 * If there's a legitimate reason to clean bulk/: delete the sentinel
 * AND leave a note in content/Admin Notes/ documenting the reason.
 */
const BULK_SENTINEL = path.join(BULK_ROOT, '.keepzips');

function assertBulkSentinel() {
  if (!fs.existsSync(BULK_ROOT)) {
    throw new Error(
      `[fec-ingest] bulk root missing: ${BULK_ROOT}\n` +
      `  Re-download FEC/IRS bulk zips before retrying.`,
    );
  }
  if (!fs.existsSync(BULK_SENTINEL)) {
    throw new Error(
      `[fec-ingest] bulk sentinel missing: ${BULK_SENTINEL}\n` +
      `  Expected marker file .keepzips at bulk root. Either the bulk\n` +
      `  dir was silently wiped (restore zips + recreate sentinel), or\n` +
      `  this is a fresh machine (create it: echo keep > "${BULK_SENTINEL}").\n` +
      `  Refusing to ingest to avoid emitting empty output.`,
    );
  }
}

function fmtBytes(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}KB`;
  return `${n}B`;
}

module.exports = {
  BULK_ROOT,
  DERIVED_ROOT,
  CHECKPOINT_DIR,
  ensureDerivedDirs,
  loadCheckpoint,
  saveCheckpoint,
  markComplete,
  isComplete,
  streamZip,
  PartialWriter,
  cleanupPartials,
  listZips,
  resolveBulkSubdir,
  assertBulkSentinel,
  BULK_SENTINEL,
  fmtBytes,
};
