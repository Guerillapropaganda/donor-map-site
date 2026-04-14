#!/usr/bin/env node
/**
 * sources-fingerprint.cjs — Phase 1 / Source Registry
 *
 * Second pass over data/sources.jsonl: fetch each URL, capture metadata,
 * classify status. Runs independently of the extractor so it's safe to
 * re-run on partial failures.
 *
 * For each source with status='unverified' (default), it:
 *   1. Fetches the URL with a 15s timeout
 *   2. Captures final URL after redirects, final host, HTTP status
 *   3. Extracts <title>
 *   4. Strips nav/header/footer/script/style, normalizes whitespace,
 *      hashes first 5000 chars of main text (SHA-256)
 *   5. Classifies status:
 *        dead            — DNS failure, 4xx, 5xx (except paywall codes)
 *        paywall         — host in PAYWALL_HOSTS
 *        redirected      — final host differs from source host
 *        generic_orphan  — title matches generic blocklist OR path depth ≤ 1
 *        live            — everything else (fetched, specific content)
 *   6. Persists via store.updateSource()
 *
 * Usage:
 *   node scripts/sources-fingerprint.cjs                  # all unverified
 *   node scripts/sources-fingerprint.cjs --limit 50       # first 50 only
 *   node scripts/sources-fingerprint.cjs --host fec.gov   # only this host
 *   node scripts/sources-fingerprint.cjs --status live    # re-fingerprint live sources
 *   node scripts/sources-fingerprint.cjs --concurrency 5  # default 8
 *   node scripts/sources-fingerprint.cjs --verbose
 *
 * Concurrency:
 *   Simple promise-pool. Default 8 concurrent fetches. Be polite — this
 *   script will hit external servers. Use --concurrency 3 for politer runs
 *   or when targeting a single host.
 */

const crypto = require('crypto');
const store = require('./lib/sources-store.cjs');

// ─── CLI args ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const flagValue = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};

const LIMIT = parseInt(flagValue('limit') || '0', 10);
const CONCURRENCY = parseInt(flagValue('concurrency') || '8', 10);
const STATUS_FILTER = flagValue('status') || 'unverified';
const HOST_FILTER = flagValue('host') || null;
const VERBOSE = flag('verbose');
const TIMEOUT_MS = 15000;

// ─── Config ─────────────────────────────────────────────────────────────

const USER_AGENT = 'DonorMapSourceRegistry/1.0 (+https://thedonormap.org)';

const PAYWALL_HOSTS = new Set([
  'nytimes.com',
  'wsj.com',
  'washingtonpost.com',
  'bloomberg.com',
  'ft.com',
  'economist.com',
  'thetimes.co.uk',
  'newyorker.com',
  'theatlantic.com',
]);

const GENERIC_TITLE_RE = /^(home|homepage|404|page not found|not found|error|search|search results?|login|sign in|coming soon|under construction|default|index)$/i;

// Titles/body markers that indicate a bot-wall or anti-scraping block.
// Cloudflare, Akamai, Bloomberg "Are you a robot?", generic 403 Access
// Denied pages, etc. These are NOT dead — a human browser loads them fine.
// They get reclassified as 'needs_review' so David can eyeball manually.
const BOT_BLOCK_TITLE_RE = /^(just a moment\.{0,3}|attention required.*|are you a robot.*|bloomberg\s*-\s*are you a robot.*|access denied|access to this page has been denied|forbidden|simple page|please wait.*|checking your browser.*|one moment.*|cloudflare.*|verify you are human|robot or human)/i;

const BOT_BLOCK_BODY_RE = /(cf-browser-verification|cf-challenge-running|challenge-platform|ray id|__cf_chl|enable javascript and cookies to continue|checking if the site connection is secure)/i;

// ─── Text extraction + hashing ─────────────────────────────────────────

function stripHtmlForHash(html) {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 32);
}

function extractTitle(html) {
  if (!html) return null;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return m[1]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300) || null;
}

function pathDepth(url) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    return segments.length;
  } catch (_) {
    return 0;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

// ─── Fetch ──────────────────────────────────────────────────────────────

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await res.text();
    return {
      ok: true,
      status: res.status,
      finalUrl: res.url || url,
      body: text,
    };
  } catch (e) {
    return { ok: false, error: e.message || String(e), status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Classifier ─────────────────────────────────────────────────────────

function classify({ record, fetchResult }) {
  const originalHost = hostOf(record.url);
  if (PAYWALL_HOSTS.has(originalHost)) {
    return { status: 'paywall', reason: 'paywall-host' };
  }

  if (!fetchResult.ok) {
    return { status: 'dead', reason: fetchResult.error };
  }
  const http = fetchResult.status;

  // Detect bot-wall / Cloudflare challenge first, regardless of HTTP status.
  // These are NOT dead pages — a human browser would load them. Reclassify
  // as needs_review so David can eyeball manually in Ops /sources.
  const rawTitle = extractTitle(fetchResult.body);
  const titleIsBotBlock = rawTitle && BOT_BLOCK_TITLE_RE.test(rawTitle.trim());
  const bodyIsBotBlock = fetchResult.body && BOT_BLOCK_BODY_RE.test(fetchResult.body.slice(0, 8000));
  if (titleIsBotBlock || bodyIsBotBlock) {
    return {
      status: 'needs_review',
      reason: `bot-block: ${titleIsBotBlock ? 'title' : 'body'} ("${(rawTitle || '').slice(0, 60)}")`,
      title: rawTitle,
    };
  }

  // HTTP 403 specifically often means anti-scraping, not genuinely dead
  if (http === 403) {
    return {
      status: 'needs_review',
      reason: 'HTTP 403 (likely anti-scraping)',
      title: rawTitle,
    };
  }

  if (http >= 400 && http < 600) {
    return { status: 'dead', reason: `HTTP ${http}` };
  }

  const finalHost = hostOf(fetchResult.finalUrl);

  if (PAYWALL_HOSTS.has(finalHost)) {
    return { status: 'paywall', reason: 'paywall-host' };
  }

  const hostChanged = originalHost && finalHost && originalHost !== finalHost;

  const title = rawTitle;
  const depth = pathDepth(fetchResult.finalUrl);

  // Generic orphan check — strip site branding after | - – — for matching
  const titleNaked = title ? title.replace(/\s*[|\-–—].*$/, '').trim() : '';
  const titleLooksGeneric = titleNaked && GENERIC_TITLE_RE.test(titleNaked);
  const pathLooksGeneric = depth <= 1;

  if (titleLooksGeneric && pathLooksGeneric) {
    return {
      status: 'generic_orphan',
      reason: `generic title "${title}" + path depth ${depth}`,
      title,
    };
  }
  if (titleLooksGeneric) {
    return {
      status: 'needs_review',
      reason: `generic title "${title}" but path depth ${depth}`,
      title,
    };
  }

  if (hostChanged) {
    return {
      status: 'redirected',
      reason: `${originalHost} → ${finalHost}`,
      title,
    };
  }

  return { status: 'live', title };
}

// ─── Promise pool ───────────────────────────────────────────────────────

async function runPool(items, worker, concurrency) {
  const results = [];
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const myIdx = idx++;
      try {
        results[myIdx] = await worker(items[myIdx], myIdx);
      } catch (e) {
        results[myIdx] = { error: e.message || String(e) };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('═══ sources-fingerprint ═══');
  console.log(`  status filter:  ${STATUS_FILTER}`);
  console.log(`  host filter:    ${HOST_FILTER || '(any)'}`);
  console.log(`  limit:          ${LIMIT || 'all'}`);
  console.log(`  concurrency:    ${CONCURRENCY}`);
  console.log('');

  store.loadSources();
  let targets = store.querySources({ status: STATUS_FILTER });
  if (HOST_FILTER) {
    targets = targets.filter((r) => hostOf(r.url).includes(HOST_FILTER));
  }
  if (LIMIT > 0) {
    targets = targets.slice(0, LIMIT);
  }

  console.log(`  ${targets.length} source(s) to fingerprint`);
  console.log('');

  if (!targets.length) {
    console.log('  nothing to do.');
    return;
  }

  const stats = {
    total: targets.length,
    done: 0,
    live: 0,
    dead: 0,
    redirected: 0,
    generic_orphan: 0,
    needs_review: 0,
    paywall: 0,
    errors: 0,
  };

  const startTime = Date.now();

  await runPool(
    targets,
    async (record, idx) => {
      const fetchResult = await fetchWithTimeout(record.url);

      let update = { last_checked: new Date().toISOString() };
      try {
        const cls = classify({ record, fetchResult });
        update.status = cls.status;
        stats[cls.status] = (stats[cls.status] || 0) + 1;

        if (fetchResult.ok) {
          update.canonical_url = fetchResult.finalUrl;
          update.final_host = hostOf(fetchResult.finalUrl);
          update.title = cls.title || extractTitle(fetchResult.body);

          const mainText = stripHtmlForHash(fetchResult.body);
          if (mainText) update.content_hash = hashText(mainText);

          if (cls.status === 'live') {
            update.last_verified_live = new Date().toISOString();
          }
        }

        store.updateSource(record.id, update);

        if (VERBOSE) {
          console.log(
            `  [${String(idx + 1).padStart(4)}/${stats.total}] ${cls.status.padEnd(14)} ${record.url.slice(0, 80)}`
          );
        }
      } catch (e) {
        stats.errors += 1;
        console.warn(`  ! ${record.id} ${record.url}: ${e.message}`);
      }
      stats.done += 1;

      // Progress pulse every 50 items in non-verbose mode
      if (!VERBOSE && stats.done % 50 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (stats.done / ((Date.now() - startTime) / 1000)).toFixed(1);
        console.log(`  ${stats.done}/${stats.total} done, ${elapsed}s elapsed, ${rate}/s`);
      }
    },
    CONCURRENCY
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log('');
  console.log('═══ results ═══');
  console.log(`  processed:      ${stats.done}/${stats.total} in ${elapsed}s`);
  console.log(`  live:           ${stats.live || 0}`);
  console.log(`  dead:           ${stats.dead || 0}`);
  console.log(`  redirected:     ${stats.redirected || 0}`);
  console.log(`  generic_orphan: ${stats.generic_orphan || 0}`);
  console.log(`  needs_review:   ${stats.needs_review || 0}`);
  console.log(`  paywall:        ${stats.paywall || 0}`);
  console.log(`  errors:         ${stats.errors || 0}`);
  console.log('');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
