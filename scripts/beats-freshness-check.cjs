#!/usr/bin/env node
/**
 * beats-freshness-check.cjs — cross-beat data-staleness monitor.
 *
 * WHY THIS EXISTS
 *   The live investigative beats render campaign-finance numbers "as of
 *   <our last data pull>". The underlying sources refresh on their own
 *   cadence; our ingests are manual. Without a continuous check, every
 *   published beat silently drifts from current reality the moment a
 *   fresh filing posts. A journalist (or David) citing a number is
 *   implicitly citing it "as of now" — the gap is the liability.
 *
 *   Two data backings, two refresh realities:
 *     - CA Governor beats  → Cal-Access bulk (SoS CDN, daily dump,
 *                            manual ~1.5GB re-ingest)
 *     - LA Mayoral beats   → LA City Ethics Socrata (live API, but the
 *                            Schedule A/E feed froze at the last
 *                            pre-election 460; Form 497 late-contribution
 *                            reports are PDF-only and never hit Socrata)
 *
 * RACE-END EXPIRATION
 *   This monitor is scoped to the 2026 election cycle. After the cycle's
 *   final campaign-finance filing deadline the beats stop being
 *   time-sensitive and the check goes DORMANT (emits 0 findings + an
 *   "expired" note) instead of nagging forever. To re-arm for the next
 *   cycle, update RACE_WINDOWS below. The expiration is data-driven, not
 *   a code edit — the check reads the dates and self-disables.
 *
 * USAGE
 *   node scripts/beats-freshness-check.cjs           # human-readable
 *   node scripts/beats-freshness-check.cjs --json    # harness-machine-readable
 *
 * EXIT CODES
 *   0 = all monitored sources current, OR monitoring window expired
 *   1 = at least one source stale (actionable: re-ingest / new filing)
 *   2 = unable to verify (CDN / API unreachable)
 *
 * Wired into scripts/vault-audit.cjs as the `beats-freshness` check.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const CAL_SUMMARY = path.join(ROOT, 'data', 'cal-access-bulk-summary.json');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
function out(m) { if (!JSON_MODE) console.log(m); }

// ──────────────────────────────────────────────────────────────────────────
// RACE WINDOWS — the expiration spine. Update this block for the next cycle.
// monitoring_expires = the last campaign-finance data event that matters for
// these beats (post-election semi-annual final filing). After this date the
// check self-disables.
// ──────────────────────────────────────────────────────────────────────────
const RACE_WINDOWS = [
  {
    race: 'CA Governor 2026',
    backing: 'cal-access',
    beats: ['steyer', 'class-traitor', 'mahan', 'donors-mahan-2026', 'hilton',
            'holdings-hilton-2026', 'three-becerras', 'donors-becerra-2026',
            'not-the-bad-guy', 'carace26-map'],
    primary_date: '2026-06-02',
    general_date: '2026-11-03',
    final_filing_date: '2027-01-31',   // post-election semi-annual (covers through Dec 31)
    monitoring_expires: '2027-01-31',
  },
  {
    race: 'LA Mayoral 2026',
    backing: 'la-ethics-socrata',
    beats: ['spencer-pratt', 'spencer-pratt-receipts', 'spencer-pratt-deep-dives'],
    committee_id: '1485940',
    primary_date: '2026-06-02',
    general_date: '2026-11-03',        // non-partisan top-two; runoff if no >50%
    final_filing_date: '2027-01-31',
    monitoring_expires: '2027-01-31',
  },
];

const CAL_CDN = 'https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip';
const SOCRATA_STMTS = 'https://data.lacity.org/resource/br3a-db9a.json';
const SOCRATA_SCHED_A = 'https://data.lacity.org/resource/m6g2-gc6c.csv';
const CAL_STALENESS_HOURS = 36;   // daily dump + ingest-scheduling slop

function nowMs() { return Date.now(); }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

function phaseFor(win, now) {
  const d = (s) => new Date(s + 'T23:59:59Z').getTime();
  if (now > d(win.monitoring_expires)) return 'expired';
  if (now > d(win.general_date)) return 'post-general';
  if (now > d(win.primary_date)) return 'primary-to-general';
  return 'pre-primary';
}

function headLastModified(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 25000 }, (res) => {
      resolve({
        status: res.statusCode,
        lastModified: res.headers['last-modified'] || null,
        contentLength: res.headers['content-length'] || null,
      });
      res.resume();
    });
    req.on('error', () => resolve({ status: 0, lastModified: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, lastModified: null }); });
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 25000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    }).on('error', () => resolve(null)).on('timeout', function () { this.destroy(); resolve(null); });
  });
}

function getText(url) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 25000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    }).on('error', () => resolve('')).on('timeout', function () { this.destroy(); resolve(''); });
  });
}

async function checkCalAccess(win, now) {
  const result = { race: win.race, backing: 'cal-access', stale: false, detail: '' };
  let localRunAt = null;
  try {
    const summary = JSON.parse(fs.readFileSync(CAL_SUMMARY, 'utf-8'));
    localRunAt = summary.run_at ? new Date(summary.run_at).getTime() : null;
  } catch { /* no local summary */ }
  const head = await headLastModified(CAL_CDN);
  if (!head.lastModified) {
    result.detail = 'CDN unreachable (could not verify freshness)';
    result.unverifiable = true;
    return result;
  }
  const cdnMs = new Date(head.lastModified).getTime();
  if (localRunAt == null) {
    result.stale = true;
    result.detail = `no local ingest summary; CDN dump dated ${head.lastModified}`;
    return result;
  }
  const ageHours = (cdnMs - localRunAt) / 3600000;
  if (ageHours > CAL_STALENESS_HOURS) {
    result.stale = true;
    result.detail = `local ingest ${ageHours.toFixed(0)}h behind CDN (CDN dump ${head.lastModified}); re-run scripts/ingest-cal-access-bulk.cjs`;
  } else {
    result.detail = `current (local ingest within ${CAL_STALENESS_HOURS}h of CDN dump ${head.lastModified})`;
  }
  return result;
}

async function checkLaEthics(win, now) {
  const result = { race: win.race, backing: 'la-ethics-socrata', stale: false, detail: '' };
  // Latest Schedule A contribution date for the committee.
  const csv = await getText(
    `${SOCRATA_SCHED_A}?cmt_id=${win.committee_id}&$select=con_date&$order=con_date%20DESC&$limit=1`
  );
  let latestContrib = null;
  if (csv) {
    const m = csv.match(/(\d{4}-\d{2}-\d{2})T/);
    if (m) latestContrib = m[1];
  }
  // Filings index — how many statements + the newest filing type.
  const stmts = await getJson(
    `${SOCRATA_STMTS}?$where=cmt_id='${win.committee_id}'&$order=period_to_date DESC&$limit=5`
  );
  const filingCount = Array.isArray(stmts) ? stmts.length : 0;
  const newestFiling = Array.isArray(stmts) && stmts[0]
    ? `${stmts[0].filing_type_desc} (through ${(stmts[0].period_to_date || '').slice(0, 10)})`
    : 'none indexed';
  if (!latestContrib && filingCount === 0) {
    result.unverifiable = true;
    result.detail = 'LA Ethics Socrata unreachable';
    return result;
  }
  // "Stale" here = a NEW pre-election 460 has posted that we haven't folded.
  // We snapshot the known-good newest filing date in the summary file so a
  // change is detectable. Absent a snapshot, just report current state.
  result.latestContribution = latestContrib;
  result.newestFiling = newestFiling;
  result.detail =
    `Schedule A latest contribution ${latestContrib || 'n/a'}; newest indexed filing: ${newestFiling}. ` +
    `Form 497 late-contribution reports are PDF-only (never hit Socrata) — manual portal check still required for those.`;
  // Watermark: the beat is grounded on the 1st Pre-Election 460
  // (period through 2026-04-18). Flag actionable ONLY when a filing whose
  // coverage period ends STRICTLY AFTER that watermark appears — i.e. the
  // 2nd Pre-Election / Semi-Annual that finally makes the May money
  // machine-readable. Date-only slice avoids the ISO-timestamp lexical trap
  // ('2026-04-18T00:00:00.000' > '2026-04-18' is spuriously true).
  const WATERMARK = '2026-04-18';
  if (Array.isArray(stmts) && stmts.some(s =>
    (s.period_to_date || '').slice(0, 10) > WATERMARK
  )) {
    result.stale = true;
    result.detail = `NEW machine-readable filing posted past ${WATERMARK} (${newestFiling}) — ` +
      `re-pull m6g2-gc6c + br3a-db9a and regenerate the Pratt donor tables. ` + result.detail;
  }
  return result;
}

(async () => {
  const now = nowMs();
  const sources = [];
  let staleCount = 0;
  let unverifiable = 0;
  let allExpired = true;

  for (const win of RACE_WINDOWS) {
    const phase = phaseFor(win, now);
    const expiresInDays = daysBetween(now, new Date(win.monitoring_expires + 'T23:59:59Z').getTime());
    if (phase === 'expired') {
      sources.push({
        race: win.race, backing: win.backing, phase,
        detail: `monitoring window closed ${win.monitoring_expires} — 2026 cycle concluded. ` +
                `Re-arm by updating RACE_WINDOWS in scripts/beats-freshness-check.cjs for the next cycle.`,
      });
      continue;
    }
    allExpired = false;
    let r;
    if (win.backing === 'cal-access') r = await checkCalAccess(win, now);
    else r = await checkLaEthics(win, now);
    r.phase = phase;
    r.expires_in_days = expiresInDays;
    r.beats = win.beats;
    if (r.unverifiable) unverifiable++;
    else if (r.stale) staleCount++;
    sources.push(r);
  }

  if (allExpired) {
    out('[beats-freshness] all race windows expired — monitor dormant. Re-arm RACE_WINDOWS for next cycle.');
    if (JSON_MODE) console.log(JSON.stringify({ findings_count: 0, expired: true, sources }));
    process.exit(0);
  }

  // Human output
  for (const s of sources) {
    if (s.phase === 'expired') { out(`  [EXPIRED] ${s.race}: ${s.detail}`); continue; }
    const tag = s.unverifiable ? '?' : (s.stale ? '✗ STALE' : '✓ current');
    out(`  [${tag}] ${s.race} (${s.backing}, phase=${s.phase}, expires in ${s.expires_in_days}d)`);
    out(`      ${s.detail}`);
  }
  out(`\n  ${staleCount} stale source(s), ${unverifiable} unverifiable, across ${RACE_WINDOWS.length} race windows.`);

  if (JSON_MODE) {
    console.log(JSON.stringify({
      findings_count: staleCount,
      unverifiable,
      sources,
      artifact_ref: 'scripts/beats-freshness-check.cjs',
    }));
  }
  process.exit(unverifiable && !staleCount ? 2 : (staleCount ? 1 : 0));
})();
