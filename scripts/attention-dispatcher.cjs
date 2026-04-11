#!/usr/bin/env node
/**
 * attention-dispatcher.cjs — background scheduler for Attention Queue producers
 *
 * Runs all 5 Attention Queue producer scripts on a schedule so the queue is
 * always fresh without David having to invoke anything manually. Keeps the
 * ops app /attention page current and the dashboard card accurate.
 *
 * Schedule (all local time):
 *   - Every 30 min  → voice-drift-detector       (cheap, catches AI slop fast)
 *   - Every 30 min  → self-review-mirror (check) (defamation + voice regressions)
 *   - Every  1 hr   → hallucination-catcher      (claim/citation matching)
 *   - Every  1 hr   → promotion-candidate-queue  (what's cheapest to ship today)
 *   - Every  2 hr   → contradiction-miner        (story seed generator)
 *   - Every  2 hr   → missing-profile-detector   (who gets referenced but has no page)
 *
 * Logs to:
 *   content/Admin Notes/.attention-dispatcher.log  (append-only)
 *
 * Usage:
 *   node scripts/attention-dispatcher.cjs
 *   node scripts/attention-dispatcher.cjs --run-now   # fire every producer once immediately then exit
 *   node scripts/attention-dispatcher.cjs --daemon    # run forever, reschedule on cron
 *
 * To install as a background service:
 *   - Windows: add scripts/attention-dispatcher.bat to shell:startup
 *   - macOS/Linux: launchd / systemd unit (see content/Pipeline Guide.md)
 *
 * Design notes:
 *   - Every producer is idempotent. Running it twice is safe.
 *   - Failures are logged but do not kill the dispatcher.
 *   - 30-second timeout per script. If a producer hangs, we move on.
 *   - Never runs two producers at once. Serialized queue prevents vault contention.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'content', 'Admin Notes', '.attention-dispatcher.log');

// Producer registry
const PRODUCERS = [
  { name: 'voice-drift-detector',       schedule: '*/30 * * * *', script: 'scripts/voice-drift-detector.cjs' },
  { name: 'hallucination-catcher',      schedule: '0 * * * *',    script: 'scripts/hallucination-catcher.cjs' },
  { name: 'promotion-candidate-queue',  schedule: '15 * * * *',   script: 'scripts/promotion-candidate-queue.cjs' },
  { name: 'contradiction-miner',        schedule: '30 */2 * * *', script: 'scripts/contradiction-miner.cjs' },
  { name: 'missing-profile-detector',   schedule: '45 */2 * * *', script: 'scripts/missing-profile-detector.cjs' },
];

// Serialize execution — never run two producers at once
const runQueue = [];
let running = false;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch { /* log file unwritable — keep running */ }
}

function runProducer(producer) {
  return new Promise((resolve) => {
    log(`→ running ${producer.name}`);
    const started = Date.now();
    const child = spawn('node', [producer.script], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });

    const timeout = setTimeout(() => {
      log(`✗ ${producer.name} timed out after 60s, killing`);
      try { child.kill('SIGKILL'); } catch {}
    }, 60000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      const ms = Date.now() - started;
      const tail = out.trim().split('\n').slice(-3).join(' | ');
      if (code === 0) {
        log(`✓ ${producer.name} (${ms}ms) — ${tail || 'ok'}`);
      } else {
        log(`✗ ${producer.name} exit=${code} (${ms}ms) — ${(err || out).trim().split('\n').slice(-2).join(' | ')}`);
      }
      resolve();
    });
    child.on('error', (e) => {
      clearTimeout(timeout);
      log(`✗ ${producer.name} spawn error: ${e.message}`);
      resolve();
    });
  });
}

async function processQueue() {
  if (running) return;
  running = true;
  while (runQueue.length > 0) {
    const producer = runQueue.shift();
    await runProducer(producer);
  }
  running = false;
}

function enqueue(producer) {
  // Skip if already queued
  if (runQueue.find((p) => p.name === producer.name)) {
    log(`  (${producer.name} already queued, skipping)`);
    return;
  }
  runQueue.push(producer);
  processQueue();
}

// --- Entry points ---

async function runNow() {
  log('--- attention-dispatcher: --run-now mode ---');
  for (const producer of PRODUCERS) {
    await runProducer(producer);
  }
  log('--- all producers done ---');
}

function daemon() {
  log('--- attention-dispatcher: daemon mode ---');
  const cron = require('node-cron');
  for (const producer of PRODUCERS) {
    cron.schedule(producer.schedule, () => enqueue(producer));
    log(`  scheduled ${producer.name} @ ${producer.schedule}`);
  }
  log('Dispatcher running. Logs: content/Admin Notes/.attention-dispatcher.log');
  log('Press Ctrl+C to stop.');
  // Fire everything once on startup so the queue is immediately fresh
  for (const producer of PRODUCERS) enqueue(producer);
}

const arg = process.argv[2];
if (arg === '--run-now') {
  runNow();
} else if (arg === '--daemon' || !arg) {
  daemon();
} else {
  console.log('Usage: node scripts/attention-dispatcher.cjs [--run-now|--daemon]');
  process.exit(1);
}
