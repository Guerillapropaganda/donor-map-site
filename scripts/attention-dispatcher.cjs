#!/usr/bin/env node
/**
 * attention-dispatcher.cjs — background scheduler for Attention Queue producers
 *
 * Runs all 5 Attention Queue producer scripts on a schedule so the queue is
 * always fresh without David having to invoke anything manually. Keeps the
 * ops app /attention page current and the dashboard card accurate.
 *
 * Schedule (all local time):
 *   - Every 15 min  → vault-audit                 (17-check harness, powers Ops pages)
 *   - Every 30 min  → voice-drift-detector       (cheap, catches AI slop fast)
 *   - Every  1 hr   → hallucination-catcher      (claim/citation matching)
 *   - Every  1 hr   → promotion-candidate-queue  (what's cheapest to ship today)
 *   - Every  2 hr   → contradiction-miner        (story seed generator)
 *   - Every  2 hr   → missing-profile-detector   (who gets referenced but has no page)
 *
 * Logs to:
 *   content/Admin Notes/.attention-dispatcher.log  (append-only, rotated at 1MB)
 *   content/Admin Notes/.attention-dispatcher.log.1 (previous rotation)
 *
 * Optional external monitoring:
 *   HEALTHCHECKS_PING_URL  — if set, the dispatcher pings this URL on every
 *                            successful producer cycle. Point it at a
 *                            Healthchecks.io check with a 40-min grace period
 *                            to get an email if the dispatcher dies silently.
 *                            No-op when unset, so it's safe to leave off.
 *
 * Usage:
 *   node scripts/attention-dispatcher.cjs
 *   node scripts/attention-dispatcher.cjs --run-now   # fire every producer once, exit
 *   node scripts/attention-dispatcher.cjs --daemon    # run forever, reschedule on cron
 *
 * To install as a background service:
 *   - Windows: add scripts/attention-dispatcher.bat to shell:startup
 *   - macOS/Linux: launchd / systemd unit (see content/Pipeline Guide.md)
 *
 * Design notes:
 *   - Every producer is idempotent. Running it twice is safe.
 *   - Failures are logged but do not kill the dispatcher. Every callback is
 *     wrapped in try/catch and process.on('uncaughtException') catches anything
 *     that slips through.
 *   - 60-second timeout per script. If a producer hangs, we move on.
 *   - Never runs two producers at once. Serialized queue prevents vault contention.
 *   - Log file rotates at 1MB to prevent unbounded growth.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'content', 'Admin Notes', '.attention-dispatcher.log');
const LOG_ROTATE_FILE = LOG_FILE + '.1';
const LOG_MAX_BYTES = 1024 * 1024; // 1 MB
const HEALTHCHECKS_URL = process.env.HEALTHCHECKS_PING_URL || '';

// Producer registry. Each entry supports:
//   name:        display name (used in logs)
//   schedule:    standard 5-field cron expression
//   script:      path to the producer script (from repo root)
//   args:        optional CLI args array passed after the script path
//   timeout_ms:  optional override for the default 60_000ms timeout
const PRODUCERS = [
  // Vault-audit harness — the single source of truth for every ops page.
  // Runs every 15 min so the Dashboard + other ops pages read fresh findings
  // without the user having to hit "Re-run now". Writes its artifact to
  // content/Admin Notes/vault-audit-latest.json (read by /api/vault-audit).
  // The Dashboard also triggers an on-demand re-run if the artifact is
  // > 15 min old, so a dead dispatcher never leaves numbers stale-forever.
  // 2-minute timeout — 14-check harness runs in ~7s on current vault but
  // some checks (reconciliation-framework-tier-1) can spike.
  {
    name: 'vault-audit',
    schedule: '*/15 * * * *',
    script: 'scripts/vault-audit.cjs',
    args: ['--quiet'],
    timeout_ms: 120_000,
  },
  { name: 'voice-drift-detector',       schedule: '*/30 * * * *', script: 'scripts/voice-drift-detector.cjs' },
  { name: 'hallucination-catcher',      schedule: '0 * * * *',    script: 'scripts/hallucination-catcher.cjs' },
  { name: 'promotion-candidate-queue',  schedule: '15 * * * *',   script: 'scripts/promotion-candidate-queue.cjs' },
  { name: 'contradiction-miner',        schedule: '30 */2 * * *', script: 'scripts/contradiction-miner.cjs' },
  { name: 'missing-profile-detector',   schedule: '45 */2 * * *', script: 'scripts/missing-profile-detector.cjs' },
  // Phase 3 Part 2c: relationship-discovery with --write-edges flag.
  // Runs every 4 hours at :17 to stagger against the hourly + 2-hourly
  // producers. 3-minute timeout — the 7-strategy scanner + upsertEdges
  // on a ~20k-edge JSONL store needs more headroom than the 60-sec
  // default. Writes discovery-scanner-sourced edges to data/relationships.jsonl
  // and the existing JSON/markdown reports.
  {
    name: 'relationship-discovery',
    schedule: '17 */4 * * *',
    script: 'scripts/relationship-discovery.cjs',
    args: ['--write-edges'],
    timeout_ms: 180_000,
  },
  // Narrative drift detector — flags verified/ready profiles whose
  // hand-written prose mentions an entity that's been in the news in
  // the last 30 days. Pairs with `contradiction-miner` and the
  // `missing-profile-detector`; fills the gap where structured data
  // stays fresh but prose drifts.
  // Schedule: every 4 hours at :37 (staggered away from other 4-hour
  // producers so the dispatcher doesn't queue 2 heavy jobs at once).
  {
    name: 'narrative-drift-detector',
    schedule: '37 */4 * * *',
    script: 'scripts/narrative-drift-detector.cjs',
    timeout_ms: 120_000,
  },
  // Story-candidate scorer — hunts for investigative-lead patterns
  // (suspicious timing, cross-party big donors, dark-money network
  // opposition) via the query engine, scores them, writes top 20 to
  // the queue. Wired up 2026-04-23 after the /attention audit found
  // it orphaned — script existed + was queue-writing-capable but
  // was never added to the dispatcher, so its entries went stale
  // after a single manual run.
  // Schedule: every 4 hours at :47 (staggered against :17 and :37).
  {
    name: 'story-candidate-scorer',
    schedule: '47 */4 * * *',
    script: 'scripts/story-candidate-scorer.cjs',
    args: ['--write'],
    timeout_ms: 120_000,
  },
  // Rebuild relationship caches — keep frontmatter relationship fields
  // (donors, top-donors, politicians-funded, opposes) in sync with the
  // canonical relationships graph. Per Rule 1, those fields are caches
  // derived from data/relationships.jsonl + data/derived/*.jsonl. Without
  // a scheduled cadence the caches drift; the 2026-04-28 audit found
  // 269 graph-only opposes entries on top of the existing donor gaps
  // because nothing automated was running this script.
  // Schedule: every 6 hours at :53 (staggered away from other writers).
  // Touches profile frontmatter, so the canonical-store-sentinel will
  // permit commits where this script's output and frontmatter changes
  // are staged together.
  {
    name: 'rebuild-relationship-caches',
    schedule: '53 */6 * * *',
    script: 'scripts/rebuild-relationship-caches.cjs',
    args: ['--write'],
    timeout_ms: 180_000,
  },
  // Phase 3 Part 4b: bidirectional normalizer + per-profile artifact rebuild.
  // Runs weekly on Sundays at :23 (low frequency — new asymmetries only
  // appear when Research Claude adds one-way related: links). Chains two
  // scripts: first the normalizer creates mirror edges, then the
  // per-profile artifact is rebuilt so the Quartz build picks up the
  // latest state.
  {
    name: 'bidirectional-normalizer',
    schedule: '23 3 * * 0',
    script: 'scripts/normalize-related-bidirectionality.cjs',
    timeout_ms: 60_000,
  },
  {
    name: 'per-profile-artifact',
    schedule: '25 3 * * 0',
    script: 'scripts/build-relationships-per-profile.cjs',
    timeout_ms: 60_000,
  },
  // Congressional financial disclosures (STOCK Act PTR filings).
  // Daily at 6am — scrapes Senate EFDS + House Clerk for the latest
  // 90 days of periodic transaction reports. Writes parsed JSON to
  // data/financial-disclosures.json (overwrite, no accumulation).
  // 5-minute timeout — needs to download + parse PDFs from the House.
  {
    name: 'financial-disclosures',
    schedule: '0 6 * * *',
    script: 'scripts/financial-disclosures-pipeline.cjs',
    timeout_ms: 300_000,
  },
  // Top-N donors / politicians funded — recompute the ranked lists in
  // entity signals from the canonical edges. Populates both:
  //   signals.top_politicians_funded  (on donor/corp/nonprofit)
  //   signals.top_donors              (on politician)
  // Runs weekly (Sunday 4am) — aggregators upstream typically update
  // 1-3x per week, so no value in running more often. Needs --write
  // and bigger heap because it loads every edge in memory.
  {
    name: 'top-n-recompute',
    schedule: '40 4 * * 0',
    script: 'scripts/populate-top-politicians-2hop.cjs',
    args: ['--write'],
    timeout_ms: 300_000,
    node_opts: ['--max-old-space-size=8192'],
  },
  // ─── Auto-block builders (daily 03:00–03:50) ────────────────────
  // These six scripts write the `<!-- auto:NAME start --> ... end -->`
  // blocks into profile bodies from canonical JSONL stores. Wired into
  // the dispatcher 2026-04-26 after the harness-not-oneoff audit found
  // they were never scheduled — Claudes had been running them by hand
  // sporadically, and bodies drifted out of sync with the canonical
  // store between runs. Each is idempotent (string-equality skip),
  // dry-run-by-default, and read-only on the stores; verified by
  // explicit safety audit before scheduling. Staggered 10 min apart to
  // serialize cleanly behind the runQueue.
  //
  // Note: build-profile-data-panels.cjs is intentionally NOT scheduled
  // here — it lacks a verified-profile carve-out (would overwrite any
  // hand-tuned data-panel content). Add that first, then schedule.
  {
    name: 'build-fec-lifetime-panels',
    schedule: '0 3 * * *',
    script: 'scripts/build-fec-lifetime-panels.cjs',
    args: ['--write'],
    timeout_ms: 300_000,
  },
  {
    name: 'build-voting-record-panels',
    schedule: '10 3 * * *',
    script: 'scripts/build-voting-record-panels.cjs',
    args: ['--write'],
    timeout_ms: 180_000,
  },
  {
    name: 'build-sponsored-bills-panel',
    schedule: '20 3 * * *',
    script: 'scripts/build-sponsored-bills-panel.cjs',
    args: ['--write'],
    timeout_ms: 180_000,
  },
  {
    name: 'build-nonprofit-990-panels',
    schedule: '30 3 * * *',
    script: 'scripts/build-nonprofit-990-panels.cjs',
    args: ['--write'],
    timeout_ms: 180_000,
  },
  {
    name: 'build-executive-actions-panel',
    schedule: '40 3 * * *',
    script: 'scripts/build-executive-actions-panel.cjs',
    args: ['--write'],
    timeout_ms: 180_000,
  },
  {
    name: 'build-offshore-panel',
    schedule: '50 3 * * *',
    script: 'scripts/build-offshore-panel.cjs',
    args: ['--write'],
    timeout_ms: 180_000,
  },
  // Data-panel builder — synthesizing summary block per entity (entity type,
  // sector, NAICS, EIN, class tags if approved, total political spend, top
  // politicians funded). Idempotent + bounded by `<!-- auto:data-panel -->`
  // markers. Honors `checklist-na: data-panel` for opt-out (added 2026-04-26).
  // 5-minute timeout because it iterates ~1.6k entity profiles.
  {
    name: 'build-profile-data-panels',
    schedule: '0 4 * * *',
    script: 'scripts/build-profile-data-panels.cjs',
    args: ['--write'],
    timeout_ms: 300_000,
  },
  // Policy pages builder — regenerates content/Policies/*.md from canonical
  // stores (data/policies.jsonl + polling.jsonl + events.jsonl + relationships
  // librarian-backed query engine). Cheap (~1s for 5 policies; scales linearly
  // to 30+). Runs daily at 04:15 UTC AFTER data-panel and BEFORE janitor so
  // janitor audits the freshest computed support_pct and bill counts. Wired
  // 2026-04-27 with the headline-gap computation rollout.
  {
    name: 'build-policy-pages',
    schedule: '15 4 * * *',
    script: 'scripts/build-policy-pages.cjs',
    args: ['--write'],
    timeout_ms: 60_000,
  },
  // Deferred-items auto-verifier — walks every content/Phases/phase-*\/exit-criteria.md
  // (and handoff/retro docs) and checks each unchecked `- [ ]` criterion against
  // repo reality. If a criterion can be verified deterministically (file exists,
  // script exports expected symbols, API route exists, ops page renders), flips
  // the checkbox and annotates with `(auto-verified YYYY-MM-DD)`. Closes the
  // "manifest says open, source says done" silent-fix gap from the deferred-items
  // backlog. Scheduled 04:20 so it runs BEFORE bug-queue-parser at 04:25.
  // Established 2026-04-27 as part of the /bugs live-truth-board refactor.
  {
    name: 'triage-deferred-items',
    schedule: '20 4 * * *',
    script: 'scripts/triage-deferred-items.cjs',
    args: ['--write'],
    timeout_ms: 60_000,
  },
  // Bug-queue parser — regenerates ops/src/data/bugs-manifest.json from
  // bug-queue.md + content/Phases/phase-6/deferred-items.md. Filters out
  // already-checked `marker` rows and prose `in-section` rows; re-verifies
  // each `unchecked-exit-criterion` against current source state and drops
  // entries where the source line is now `[x]` or has line-drifted. Result:
  // /bugs page is a live truth board, not a stale 2026-04-15 snapshot.
  // Established 2026-04-27 as part of the /bugs live-truth-board refactor.
  // Bugs auto-resolver — Layer A predicate-based auto-resolution.
  // Runs at 04:24 (one minute BEFORE bug-queue-parser at 04:25) so its
  // resolutions land in time for the parser's daily manifest rebuild.
  // Items in phase exit-criteria can declare auto-resolve-when comments
  // pointing at a harness-check, regex-on-file, file-exists, or jsonl-empty
  // predicate; this script evaluates them and flips `[ ]` → `[x]` when
  // satisfied. Closes the /bugs-stays-at-zero loop.
  {
    name: 'bugs-auto-resolver',
    schedule: '24 4 * * *',
    script: 'scripts/bugs-auto-resolver.cjs',
    args: ['--write'],
    timeout_ms: 60_000,
  },
  {
    name: 'bug-queue-parser',
    schedule: '25 4 * * *',
    script: 'scripts/bug-queue-parser.cjs',
    args: ['--write'],
    timeout_ms: 60_000,
  },
  // Pipeline janitor write-mode — runs daily at 04:30 AFTER the auto-block
  // builders so it audits the freshest possible state, then demotes any
  // profiles still showing mechanical issues (missing-block, zombie-block,
  // known-gap-pipeline, etc. per ADR-0025). Advisory a-plus-* findings
  // never auto-demote — they continue to surface to /attention for editorial
  // action via the dry-run pass that vault-audit runs every 15 min.
  // Wired into the dispatcher 2026-04-26 after ADR-0025 carve-out + the
  // harness-not-oneoff audit found this was the missing automation step.
  {
    name: 'pipeline-janitor-write',
    schedule: '30 4 * * *',
    script: 'scripts/pipeline-janitor.cjs',
    args: ['--write', '--tier=a-plus'],
    timeout_ms: 300_000,
  },
  // Self-healing for Admin Notes: any note with `auto-resolve-when:` in
  // its frontmatter has its status auto-flipped to match what its report
  // body actually says. Closes the loop David flagged 2026-04-26: when
  // the harness corrects an issue, the corresponding note disappears
  // from the Notes & Queues page automatically. Read-only check version
  // runs every 15 min via vault-audit.cjs; this producer is the writer.
  // Cheap (sub-second) — every 15 min keeps the page in sync with reality.
  {
    name: 'note-auto-resolver-write',
    schedule: '*/15 * * * *',
    script: 'scripts/note-auto-resolver.cjs',
    args: ['--write'],
    timeout_ms: 30_000,
  },
];

// Serialize execution — never run two producers at once
const runQueue = [];
let running = false;

/**
 * Rotate the log file if it's bigger than LOG_MAX_BYTES. Keeps one previous
 * rotation at .log.1. Silent failure if the rotation can't happen — we'd
 * rather keep running than die because of a log issue.
 */
function rotateLogIfNeeded() {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size < LOG_MAX_BYTES) return;
    try { fs.unlinkSync(LOG_ROTATE_FILE); } catch {}
    fs.renameSync(LOG_FILE, LOG_ROTATE_FILE);
  } catch {
    // File doesn't exist yet, or rename failed — no-op
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    rotateLogIfNeeded();
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // Log file unwritable — keep running
  }
}

/**
 * Ping the Healthchecks.io URL (if configured) with a status suffix.
 * Fire-and-forget — any error is swallowed so we never block on network.
 */
function healthcheckPing(suffix) {
  if (!HEALTHCHECKS_URL) return;
  try {
    const url = HEALTHCHECKS_URL + (suffix ? '/' + suffix : '');
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, (res) => {
      res.on('data', () => {});
      res.on('end', () => {});
    });
    req.on('error', () => {});
    req.setTimeout(5000, () => {
      try { req.destroy(); } catch {}
    });
  } catch {
    // Swallow — healthchecks is best-effort monitoring, never blocks work
  }
}

function runProducer(producer) {
  return new Promise((resolve) => {
    log(`→ running ${producer.name}`);
    const started = Date.now();
    const producerArgs = Array.isArray(producer.args) ? producer.args : [];
    const nodeOpts = Array.isArray(producer.node_opts) ? producer.node_opts : [];
    const timeoutMs = typeof producer.timeout_ms === 'number' ? producer.timeout_ms : 60_000;
    let child;
    try {
      child = spawn('node', [...nodeOpts, producer.script, ...producerArgs], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      log(`✗ ${producer.name} spawn threw: ${e.message}`);
      resolve({ ok: false });
      return;
    }
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });

    const timeout = setTimeout(() => {
      log(`✗ ${producer.name} timed out after ${Math.round(timeoutMs / 1000)}s, killing`);
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timeout);
      const ms = Date.now() - started;
      const tail = out.trim().split('\n').slice(-3).join(' | ');
      if (code === 0) {
        log(`✓ ${producer.name} (${ms}ms) — ${tail || 'ok'}`);
        resolve({ ok: true });
      } else {
        log(`✗ ${producer.name} exit=${code} (${ms}ms) — ${(err || out).trim().split('\n').slice(-2).join(' | ')}`);
        resolve({ ok: false });
      }
    });
    child.on('error', (e) => {
      clearTimeout(timeout);
      log(`✗ ${producer.name} spawn error: ${e.message}`);
      resolve({ ok: false });
    });
  });
}

async function processQueue() {
  if (running) return;
  running = true;
  let allOk = true;
  while (runQueue.length > 0) {
    const producer = runQueue.shift();
    try {
      const result = await runProducer(producer);
      if (!result.ok) allOk = false;
    } catch (e) {
      log(`✗ processQueue caught error on ${producer.name}: ${e.message}`);
      allOk = false;
    }
  }
  running = false;
  // Ping after a full cycle clears the queue — marks dispatcher as alive
  healthcheckPing(allOk ? '' : 'fail');
}

function enqueue(producer) {
  // Skip if already queued
  if (runQueue.find((p) => p.name === producer.name)) {
    log(`  (${producer.name} already queued, skipping)`);
    return;
  }
  runQueue.push(producer);
  // Wrap processQueue invocation so cron callback crashes can't kill the daemon
  processQueue().catch((e) => {
    log(`✗ processQueue rejected: ${e.message}`);
    running = false;
  });
}

// --- Entry points ---

async function runNow() {
  log('--- attention-dispatcher: --run-now mode ---');
  let allOk = true;
  for (const producer of PRODUCERS) {
    try {
      const result = await runProducer(producer);
      if (!result.ok) allOk = false;
    } catch (e) {
      log(`✗ runNow caught error on ${producer.name}: ${e.message}`);
      allOk = false;
    }
  }
  log('--- all producers done ---');
  healthcheckPing(allOk ? '' : 'fail');
}

function daemon() {
  log('--- attention-dispatcher: daemon mode ---');
  if (HEALTHCHECKS_URL) {
    log(`  healthchecks: ${HEALTHCHECKS_URL.slice(0, 40)}...`);
  } else {
    log('  healthchecks: not configured (set HEALTHCHECKS_PING_URL to enable)');
  }
  healthcheckPing('start');
  let cron;
  try {
    cron = require('node-cron');
  } catch (e) {
    log(`✗ failed to load node-cron: ${e.message}`);
    log('  Install it: npm install node-cron');
    process.exit(1);
  }
  for (const producer of PRODUCERS) {
    cron.schedule(producer.schedule, () => {
      try {
        enqueue(producer);
      } catch (e) {
        log(`✗ cron callback threw for ${producer.name}: ${e.message}`);
      }
    });
    log(`  scheduled ${producer.name} @ ${producer.schedule}`);
  }
  log('Dispatcher running. Logs: content/Admin Notes/.attention-dispatcher.log');
  log('Press Ctrl+C to stop.');
  // Fire everything once on startup so the queue is immediately fresh
  for (const producer of PRODUCERS) enqueue(producer);
}

// Top-level crash guards — never let the daemon die silently
process.on('uncaughtException', (err) => {
  log(`✗ UNCAUGHT EXCEPTION: ${err.message}`);
  log(`  stack: ${(err.stack || '').split('\n').slice(0, 3).join(' | ')}`);
  healthcheckPing('fail');
  // Keep running — don't exit. Next cron tick will retry whatever failed.
});
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  log(`✗ UNHANDLED REJECTION: ${msg}`);
  healthcheckPing('fail');
});

const arg = process.argv[2];
if (arg === '--run-now') {
  runNow();
} else if (arg === '--daemon' || !arg) {
  daemon();
} else {
  console.log('Usage: node scripts/attention-dispatcher.cjs [--run-now|--daemon]');
  process.exit(1);
}
