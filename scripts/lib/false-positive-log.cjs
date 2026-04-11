/**
 * false-positive-log.cjs — structured rejection tracker
 *
 * When David rejects a script's suggestion ("this contradiction is
 * noise", "this missing profile isn't worth building", "this auto-block
 * is wrong"), the rejection is logged here so future runs of the same
 * script skip the same pattern.
 *
 * This is the feedback loop that turns "dumb dashboards" into
 * "self-training systems." Over time, the log encodes your editorial
 * judgment and the scripts converge on your standards.
 *
 * Storage: content/Admin Notes/.false-positive-log.json
 *   Format: { [sourceName]: [{ pattern, context, reason, rejectedAt }] }
 *
 * Companion file: content/Admin Notes/False Positive Log.md
 *   Human-readable view for browsing in Obsidian. Auto-regenerated.
 *
 * API:
 *   recordRejection(source, pattern, context, reason) — log a new rejection
 *   isRejected(source, pattern) — check before surfacing (returns bool)
 *   loadLog() — for the ops app to display
 *
 * "pattern" is a string key that uniquely identifies the kind of
 * rejection. For contradictions it might be "Koch|Biden|2022".
 * For missing profiles it might be a normalized name.
 * For hallucinations it might be the first 60 chars of the claim.
 *
 * "context" is the surrounding info — which profile, which file, etc.
 * "reason" is David's plain-English explanation.
 */
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', '..', 'content');
const LOG_FILE = path.join(CONTENT_DIR, 'Admin Notes', '.false-positive-log.json');
const READABLE_FILE = path.join(CONTENT_DIR, 'Admin Notes', 'False Positive Log.md');

function loadLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveLog(log) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
  regenerateReadable(log);
}

function recordRejection(source, pattern, context, reason) {
  const log = loadLog();
  if (!log[source]) log[source] = [];
  // Dedupe — if we already have this pattern from this source, update it
  const existing = log[source].find(e => e.pattern === pattern);
  if (existing) {
    existing.rejectedAt = new Date().toISOString();
    existing.reason = reason || existing.reason;
    existing.context = context || existing.context;
  } else {
    log[source].push({
      pattern,
      context: context || '',
      reason: reason || '',
      rejectedAt: new Date().toISOString(),
    });
  }
  saveLog(log);
}

function isRejected(source, pattern) {
  const log = loadLog();
  if (!log[source]) return false;
  return log[source].some(e => e.pattern === pattern);
}

function getRejectedPatterns(source) {
  const log = loadLog();
  if (!log[source]) return new Set();
  return new Set(log[source].map(e => e.pattern));
}

function regenerateReadable(log) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push('---');
  lines.push('title: "False Positive Log"');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${today}'`);
  lines.push('generated-by: scripts/lib/false-positive-log.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# False Positive Log');
  lines.push('');
  lines.push('Every time a script surfaces something and you reject it, the rejection is recorded here so future runs of the same script know to skip it. Over time, this log teaches the scripts your editorial standards.');
  lines.push('');

  const total = Object.values(log).reduce((n, arr) => n + arr.length, 0);
  lines.push(`**${total}** rejections recorded across **${Object.keys(log).length}** scripts.`);
  lines.push('');

  for (const [source, entries] of Object.entries(log)) {
    lines.push(`## ${source}`);
    lines.push('');
    lines.push(`${entries.length} rejection${entries.length === 1 ? '' : 's'} recorded.`);
    lines.push('');
    const recent = [...entries].sort((a, b) => (b.rejectedAt || '').localeCompare(a.rejectedAt || '')).slice(0, 20);
    for (const e of recent) {
      const date = (e.rejectedAt || '').slice(0, 10);
      lines.push(`- **${e.pattern}** _(${date})_`);
      if (e.reason) lines.push(`  - Reason: ${e.reason}`);
      if (e.context) lines.push(`  - Context: ${e.context.slice(0, 150)}`);
    }
    if (entries.length > 20) {
      lines.push(`- _... and ${entries.length - 20} more_`);
    }
    lines.push('');
  }

  if (total === 0) {
    lines.push('_No rejections recorded yet._');
  }

  fs.mkdirSync(path.dirname(READABLE_FILE), { recursive: true });
  fs.writeFileSync(READABLE_FILE, lines.join('\n'), 'utf-8');
}

module.exports = {
  recordRejection,
  isRejected,
  getRejectedPatterns,
  loadLog,
  LOG_FILE,
  READABLE_FILE,
};
