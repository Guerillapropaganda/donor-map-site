#!/usr/bin/env node
/**
 * change-log-record.cjs
 *
 * Post-commit hook: appends one record per commit to
 * data/change-log.jsonl. Captures every code/data/content change Claude
 * (or anyone) lands, even when the commit message is terse.
 *
 * Per the 2026-04-29 logging-gap discussion: "When changes are made
 * (even with bugs) are these going to be logged? I don't want things
 * being just unrecorded." This is the chronological "what happened
 * across the vault" log that complements:
 *
 *   - git log itself          (always there, but no aggregated UI)
 *   - editorial-decision      (only for ADR-0029 pipeline records)
 *     change_log[]
 *   - bug-queue.md            (only when something breaks)
 *   - Session State.md        (per-session, narrative)
 *
 * Each record is one commit. Shape:
 *
 *   {
 *     sha:              "abc1234",
 *     short_sha:        "abc1234",
 *     at:               "2026-04-29T15:32:01Z",
 *     author:           "Guerillapropaganda",
 *     subject:          "first line of commit message",
 *     body:             "rest of commit message",
 *     files_changed:    ["scripts/foo.cjs", "ops/src/...", ...],
 *     stat: { files: 3, insertions: 47, deletions: 12 },
 *     branch:           "claude/...",
 *     session_id:       null|string,        // CLAUDE_SESSION_ID env if set
 *     produced_by:      "post-commit-hook",
 *   }
 *
 * Idempotent: if the sha already has a record, skip.
 *
 * Failure mode: this hook MUST NOT block the commit (the commit already
 * happened by the time post-commit runs anyway). Errors are logged to
 * stderr and ignored.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STORE_FILE = path.join(ROOT, 'data', 'change-log.jsonl');

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return null;
  }
}

(function main() {
  const sha = git('rev-parse HEAD');
  if (!sha) {
    process.stderr.write('change-log-record: no HEAD — bailing\n');
    process.exit(0);
  }
  const shortSha = sha.slice(0, 7);

  // Idempotency: skip if this sha already in the log. Cheap tail scan.
  if (fs.existsSync(STORE_FILE)) {
    // Only scan the last ~50 records — duplicate sha would be very recent.
    try {
      const tail = fs.readFileSync(STORE_FILE, 'utf-8').split(/\r?\n/).slice(-60);
      for (const line of tail) {
        if (line.includes(`"sha":"${sha}"`)) {
          process.exit(0);
        }
      }
    } catch { /* fall through to write */ }
  }

  const author = git('log -1 --format=%an HEAD') || '?';
  const at = git('log -1 --format=%aI HEAD') || new Date().toISOString();
  const subject = git('log -1 --format=%s HEAD') || '';
  const body = git('log -1 --format=%b HEAD') || '';
  const branch = git('rev-parse --abbrev-ref HEAD') || '';

  // Files changed: name-only, excluding renames-as-2 entries.
  const filesRaw = git('show --name-only --pretty=format: HEAD') || '';
  const filesChanged = filesRaw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Stats: shortstat output looks like " 3 files changed, 47 insertions(+), 12 deletions(-)"
  const shortstat = git('show --shortstat --pretty=format: HEAD') || '';
  const filesM = /(\d+) files? changed/.exec(shortstat);
  const insM = /(\d+) insertions?\(\+\)/.exec(shortstat);
  const delM = /(\d+) deletions?\(-\)/.exec(shortstat);
  const stat = {
    files: filesM ? parseInt(filesM[1], 10) : filesChanged.length,
    insertions: insM ? parseInt(insM[1], 10) : 0,
    deletions: delM ? parseInt(delM[1], 10) : 0,
  };

  const record = {
    sha,
    short_sha: shortSha,
    at,
    author,
    subject: subject.slice(0, 240),
    body: body.slice(0, 2000),
    files_changed: filesChanged.slice(0, 200),
    stat,
    branch,
    session_id: process.env.CLAUDE_SESSION_ID || null,
    produced_by: 'post-commit-hook',
  };

  try {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.appendFileSync(STORE_FILE, JSON.stringify(record) + '\n', 'utf-8');
  } catch (err) {
    process.stderr.write(`change-log-record: write failed (${err.message}) — commit not blocked\n`);
  }

  process.exit(0);
})();
