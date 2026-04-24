#!/usr/bin/env node
/**
 * enrichment-freshness-check.cjs — P-034 follow-up.
 *
 * Flags when enrichment pipelines have stopped producing commits.
 *
 * Why this exists: the 2026-04-24 /pipelines audit found 6 days of
 * silent enrichment drought (last commit 2026-04-18) with zero
 * ops-app alert surface. Root cause was a GitHub billing failure on
 * the donor-map-engine repo — Actions couldn't run. Pipelines
 * triggered on schedule but died before producing commits. From the
 * main repo's perspective, the stream of "API Enrichment Bot"
 * commits just silently stopped.
 *
 * How it works: reads the most recent commit by `API Enrichment Bot`
 * from git log, compares its date to a staleness threshold, and
 * reports if enrichment has stopped.
 *
 * Thresholds:
 *   <1 day  = healthy (normal cadence)
 *   1-3 days = stale (possible hiccup, watch)
 *   >3 days = blocking (something is wrong — billing, workflow
 *             broken, API outage)
 *
 * This check is cheap: one git log invocation, no vault scan.
 *
 * Usage:
 *   node scripts/enrichment-freshness-check.cjs          # text
 *   node scripts/enrichment-freshness-check.cjs --json   # for harness
 */

const { execSync } = require('child_process');

const JSON_OUT = process.argv.includes('--json');
const STALE_DAYS = 1;
const BLOCKING_DAYS = 3;

function report(obj) {
  if (JSON_OUT) process.stdout.write(JSON.stringify(obj) + '\n');
  else console.log(JSON.stringify(obj, null, 2));
}

let lastDate = null;
let lastMessage = null;
try {
  // %ai = ISO date, %s = subject. Just the most recent one.
  const out = execSync(
    `git log --author="API Enrichment Bot" -1 --format="%ai|%s"`,
    { encoding: 'utf-8', timeout: 10000 }
  ).trim();
  if (out) {
    const sep = out.indexOf('|');
    if (sep > 0) {
      lastDate = new Date(out.slice(0, sep).trim());
      lastMessage = out.slice(sep + 1).trim();
    }
  }
} catch (e) {
  report({
    status: 'error',
    findings_count: 1,
    message: 'git log failed: ' + e.message,
  });
  process.exit(0);
}

if (!lastDate || isNaN(lastDate.getTime())) {
  report({
    status: 'never',
    findings_count: 1,
    last_enrichment: null,
    age_days: null,
    message: 'No "API Enrichment Bot" commits found in git history. Either pipelines have never run, or the bot identity changed.',
  });
  process.exit(0);
}

const ageMs = Date.now() - lastDate.getTime();
const ageDays = ageMs / (24 * 60 * 60 * 1000);
const ageDaysRounded = Math.floor(ageDays * 10) / 10;

let status;
let findings = 0;
let message;
if (ageDays < STALE_DAYS) {
  status = 'healthy';
  message = `Last enrichment ${ageDaysRounded}d ago (${lastMessage}). Healthy.`;
} else if (ageDays < BLOCKING_DAYS) {
  status = 'stale';
  findings = 1;
  message = `Last enrichment ${ageDaysRounded}d ago (${lastMessage}). Past ${STALE_DAYS}d threshold — watch. If this hits ${BLOCKING_DAYS}d, escalate to blocking.`;
} else {
  status = 'blocking';
  findings = 1;
  message = `Last enrichment ${ageDaysRounded}d ago (${lastMessage}). Past ${BLOCKING_DAYS}d blocking threshold. Common causes: (1) donor-map-engine repo billing/Actions-minutes hit, (2) workflow YAML broken, (3) API key rotated, (4) upstream rate-limit. Check donor-map-engine workflow runs: gh run list --repo Guerillapropaganda/donor-map-engine --limit 10`;
}

report({
  status,
  findings_count: findings,
  last_enrichment: lastDate.toISOString(),
  last_message: lastMessage,
  age_days: ageDaysRounded,
  thresholds: { stale_days: STALE_DAYS, blocking_days: BLOCKING_DAYS },
  message,
});
process.exit(0);
