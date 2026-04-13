#!/usr/bin/env node
/**
 * senate-disclosures-backfill.cjs — Historical backfill of Senate PTR filings
 *
 * Uses efdsearch.senate.gov POST API to fetch filings by date range.
 * Senate reports are HTML tables (not PDFs), so data quality is much
 * higher than House - tickers, dates, amounts all come structured.
 *
 * Results are merged into data/financial-disclosures-historical.json
 * alongside the House data.
 *
 * Usage:
 *   node scripts/senate-disclosures-backfill.cjs                # all years 2012-2026
 *   node scripts/senate-disclosures-backfill.cjs --year 2024    # single year
 *   node scripts/senate-disclosures-backfill.cjs --from 2020    # 2020 onward
 *   node scripts/senate-disclosures-backfill.cjs --force        # re-process all
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { RateLimiter, log, logError } = require('./lib/shared.cjs');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'senate-disclosures-historical.json');

// Also update the combined file
const COMBINED_FILE = path.join(DATA_DIR, 'financial-disclosures-historical.json');

// CLI args
const FORCE = process.argv.includes('--force');
const yearArg = process.argv.indexOf('--year');
const fromArg = process.argv.indexOf('--from');
const SINGLE_YEAR = yearArg >= 0 ? parseInt(process.argv[yearArg + 1]) : null;
const FROM_YEAR = fromArg >= 0 ? parseInt(process.argv[fromArg + 1]) : null;

const START_YEAR = SINGLE_YEAR || FROM_YEAR || 2012;
const END_YEAR = SINGLE_YEAR || new Date().getFullYear();

const rateLimiter = new RateLimiter(1, 1200); // ~1 req/sec, conservative

// Crypto detection (same as backfill script)
const CRYPTO_TICKERS = new Set([
  'GBTC', 'ETHE', 'BITO', 'BITX', 'ARKB', 'IBIT', 'FBTC', 'HODL',
  'BTCO', 'EZBC', 'DEFI', 'BITW', 'BRRR', 'BTCW', 'ETHV', 'CETH',
  'COIN', 'MARA', 'RIOT', 'MSTR', 'HUT', 'BITF', 'CLSK', 'CIFR',
  'IREN', 'CORZ', 'BTBT', 'ARBK', 'SATO', 'WULF', 'DGHI',
  'SQ', 'PYPL', 'SI', 'HOOD',
]);
const CRYPTO_RE = /\b(bitcoin|ethereum|crypto|cryptocurrency|digital\s*asset|digital\s*currency|virtual\s*currency|blockchain)\b/i;

function isCryptoTrade(ticker, desc) {
  if (ticker && CRYPTO_TICKERS.has(ticker.toUpperCase())) return true;
  if (desc && CRYPTO_RE.test(desc)) return true;
  return false;
}

// ─── HTTP ──────────────────────────────────────────────────────

function httpRequest(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: {
        'User-Agent': 'TheDonorMap/1.0 (open-source political research; thedonormap.org)',
        ...opts.headers,
      },
    };
    const req = mod.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) redirectUrl = `${parsed.protocol}//${parsed.hostname}${redirectUrl}`;
        return httpRequest(redirectUrl, opts).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function parseAmountRange(text) {
  if (!text) return { min: 0, max: 0, text: 'Unknown' };
  const cleaned = text.trim();
  const m = cleaned.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
  if (m) {
    return {
      min: parseInt(m[1].replace(/,/g, ''), 10),
      max: parseInt(m[2].replace(/,/g, ''), 10),
      text: cleaned,
    };
  }
  // Handle "Over $50,000,000" style
  const over = cleaned.match(/over\s+\$?([\d,]+)/i);
  if (over) {
    const val = parseInt(over[1].replace(/,/g, ''), 10);
    return { min: val, max: val * 2, text: cleaned };
  }
  return { min: 0, max: 0, text: cleaned };
}

// ─── Senate EFDS API ──────────────────────────────────────────

async function getSenateSession() {
  log('  Fetching CSRF token...');
  let csrfToken = '';
  let cookies = '';

  const homeRes = await httpRequest('https://efdsearch.senate.gov/search/home/');
  const setCookies = homeRes.headers['set-cookie'] || [];
  for (const c of (Array.isArray(setCookies) ? setCookies : [setCookies])) {
    const m = c.match(/csrftoken=([^;]+)/);
    if (m) csrfToken = m[1];
  }
  cookies = (Array.isArray(setCookies) ? setCookies : [setCookies]).map(c => c.split(';')[0]).join('; ');

  const metaMatch = homeRes.data.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
  if (metaMatch) csrfToken = metaMatch[1];

  if (!csrfToken) throw new Error('No CSRF token found');
  log(`  CSRF: ${csrfToken.slice(0, 12)}...`);

  // Accept agreement — returns 302 redirect but sets the session cookie we need.
  // We must NOT follow the redirect (it loops to home). Just capture the cookie.
  await rateLimiter.wait();
  try {
    await new Promise((resolve, reject) => {
      const parsed = new URL('https://efdsearch.senate.gov/search/home/');
      const body = `csrfmiddlewaretoken=${encodeURIComponent(csrfToken)}&prohibition_agreement=1`;
      const req = https.request({
        hostname: parsed.hostname, path: parsed.pathname, method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Cookie': cookies,
          'Referer': 'https://efdsearch.senate.gov/search/home/',
          'X-CSRFToken': csrfToken,
          'User-Agent': 'TheDonorMap/1.0 (open-source political research; thedonormap.org)',
        },
      }, (res) => {
        // Capture any new cookies from the 302 response
        const newCookies = res.headers['set-cookie'] || [];
        for (const c of (Array.isArray(newCookies) ? newCookies : [newCookies])) {
          const part = c.split(';')[0];
          if (!cookies.includes(part.split('=')[0])) cookies += '; ' + part;
        }
        res.resume(); // drain the response
        resolve();
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(body);
      req.end();
    });
    log('  Agreement accepted (session cookie set)');
  } catch (err) {
    log(`  Agreement POST failed (${err.message}) - continuing anyway`);
  }

  log(`  Session cookies: ${cookies.slice(0, 60)}...`);
  return { csrfToken, cookies };
}

async function searchSenateFilings(session, startDate, endDate) {
  const filings = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    await rateLimiter.wait();
    const body = [
      `start=${offset}`,
      `length=${pageSize}`,
      `report_types=%5B11%5D`,
      `filer_types=%5B1%5D`,
      `submitted_start_date=${encodeURIComponent(startDate + ' 00:00:00')}`,
      `submitted_end_date=${encodeURIComponent(endDate + ' 23:59:59')}`,
      `csrfmiddlewaretoken=${encodeURIComponent(session.csrfToken)}`,
    ].join('&');

    try {
      const res = await httpRequest('https://efdsearch.senate.gov/search/report/data/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': session.cookies,
          'Referer': 'https://efdsearch.senate.gov/search/',
          'X-CSRFToken': session.csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body,
      });

      const json = JSON.parse(res.data);
      if (!json.data || json.data.length === 0) break;

      filings.push(...json.data);
      log(`    Page ${Math.floor(offset / pageSize) + 1}: ${json.data.length} filings (total: ${json.recordsTotal})`);

      if (filings.length >= (json.recordsFiltered || json.recordsTotal)) break;
      offset += pageSize;
    } catch (err) {
      logError(`    Search failed at offset ${offset}: ${err.message}`);
      break;
    }
  }

  return filings;
}

function parseSenateReportHtml(html) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const transactions = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 6) return;

    const txDate = $(cells[1]).text().trim();
    const owner = $(cells[2]).text().trim();
    const ticker = $(cells[3]).text().trim();
    const assetName = $(cells[4]).text().trim();
    const assetType = $(cells[5]).text().trim();
    const txType = $(cells[6]).text().trim();
    const amount = $(cells[7]).text().trim();
    const comment = cells.length > 8 ? $(cells[8]).text().trim() : '';

    if (!txDate && !assetName) return;

    const cleanTicker = ticker && ticker !== '--' && ticker !== 'N/A' && ticker !== '' ? ticker : null;
    const crypto = isCryptoTrade(cleanTicker, assetName);
    const parsedAmount = parseAmountRange(amount);

    // Options detection
    const isOptions = /\b(call|put)\s*option/i.test(assetName) || /\boption\b/i.test(assetType);
    const optMatch = assetName.match(/\b(call|put)\b/i);

    // Asset type classification
    let classifiedType = assetType || 'Stock';
    if (crypto) classifiedType = 'Crypto';
    else if (isOptions) classifiedType = 'Options';
    else if (/bond|note|treasury|debt/i.test(assetType) || /bond|note|treasury/i.test(assetName)) classifiedType = 'Bond';
    else if (/fund|etf|index/i.test(assetType) || /mutual fund|index fund/i.test(assetName)) classifiedType = 'Fund';

    transactions.push({
      transactionDate: txDate,
      owner: owner || 'Self',
      ticker: cleanTicker,
      assetDescription: assetName,
      assetType: classifiedType,
      isCrypto: crypto,
      isOptions,
      optionType: optMatch ? optMatch[1].toLowerCase() : null,
      isWhaleTrade: parsedAmount.max >= 500000,
      transactionType: txType === 'Purchase' ? 'Purchase' : txType === 'Sale' ? 'Sale' :
                       txType === 'Sale (Full)' ? 'Sale' : txType === 'Sale (Partial)' ? 'Sale' :
                       txType === 'Exchange' ? 'Exchange' : txType,
      amount: parsedAmount,
      comment,
    });
  });

  // Fallback: try div-based layout
  if (transactions.length === 0) {
    $('div.transaction-one, div.ptr-one, section.transaction').each((_, el) => {
      const text = $(el).text();
      const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
      const amountMatch = text.match(/\$([\d,]+)\s*-\s*\$([\d,]+)/);
      const tickerMatch = text.match(/\(([A-Z]{1,6})\)/);
      if (dateMatch || amountMatch) {
        transactions.push({
          transactionDate: dateMatch ? dateMatch[1] : '',
          owner: 'Self',
          ticker: tickerMatch ? tickerMatch[1] : null,
          assetDescription: text.replace(/\s+/g, ' ').slice(0, 150),
          assetType: 'Stock',
          isCrypto: false,
          isOptions: false,
          optionType: null,
          isWhaleTrade: false,
          transactionType: /purchase/i.test(text) ? 'Purchase' : /sale/i.test(text) ? 'Sale' : 'Unknown',
          amount: amountMatch ? parseAmountRange(amountMatch[0]) : { min: 0, max: 0, text: 'Unknown' },
          comment: '',
        });
      }
    });
  }

  return transactions;
}

// ─── Process one year ──────────────────────────────────────────

async function processYear(year, session) {
  log(`\n${'─'.repeat(50)}`);
  log(`  SENATE YEAR ${year}`);
  log(`${'─'.repeat(50)}`);

  const startDate = `01/01/${year}`;
  const endDate = `12/31/${year}`;

  log(`  Searching ${startDate} to ${endDate}...`);
  const rawFilings = await searchSenateFilings(session, startDate, endDate);
  log(`  Found ${rawFilings.length} PTR filings`);

  if (rawFilings.length === 0) {
    return { year, filings: [], stats: { total: 0, parsed: 0, withTx: 0, txCount: 0 } };
  }

  // Parse each filing
  const filings = [];
  let parsed = 0, failed = 0, withTx = 0, txCount = 0;
  let cryptoCount = 0, optionsCount = 0, whaleCount = 0, lateCount = 0;

  for (const row of rawFilings) {
    const firstName = row.first_name || (row[0] || '');
    const lastName = row.last_name || (row[1] || '');
    const dateStr = row.date || (row[4] || '');
    const reportHtml = row.report_type || (row[3] || '');

    const linkMatch = reportHtml.match(/href="([^"]+)"/);
    if (!linkMatch) {
      failed++;
      continue;
    }
    const reportUrl = `https://efdsearch.senate.gov${linkMatch[1]}`;

    await rateLimiter.wait();
    try {
      const reportRes = await httpRequest(reportUrl, {
        headers: {
          'Cookie': session.cookies,
          'Referer': 'https://efdsearch.senate.gov/search/',
        },
      });

      const transactions = parseSenateReportHtml(reportRes.data);

      // Filing delay calculation
      const filingDateParsed = new Date(dateStr);
      for (const tx of transactions) {
        if (tx.transactionDate) {
          const parts = tx.transactionDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (parts) {
            const txDateParsed = new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const diffDays = Math.round((filingDateParsed - txDateParsed) / 86400000);
            tx.filingDelayDays = diffDays;
            tx.isLateDisclosure = diffDays > 45;
            if (tx.isLateDisclosure) lateCount++;
          }
        }
        if (tx.isCrypto) cryptoCount++;
        if (tx.isOptions) optionsCount++;
        if (tx.isWhaleTrade) whaleCount++;
      }

      filings.push({
        chamber: 'Senate',
        filer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
        },
        filing: {
          date: dateStr.trim(),
          year,
          type: 'PTR',
          sourceUrl: reportUrl,
          sourceSystem: 'efdsearch.senate.gov',
        },
        transactions,
      });

      parsed++;
      if (transactions.length > 0) {
        withTx++;
        txCount += transactions.length;
      }
    } catch (err) {
      failed++;
    }

    if ((parsed + failed) % 10 === 0) {
      log(`    ${parsed + failed}/${rawFilings.length} processed (${txCount} tx so far)`);
    }
  }

  const stats = { total: rawFilings.length, parsed, failed, withTx, txCount, cryptoCount, optionsCount, whaleCount, lateCount };
  log(`  Done: ${parsed} parsed, ${failed} failed, ${txCount} transactions from ${withTx} filings`);
  if (cryptoCount || optionsCount || whaleCount || lateCount) {
    log(`  Flags: ${cryptoCount} crypto, ${optionsCount} options, ${whaleCount} whale, ${lateCount} late`);
  }

  return { year, filings, stats };
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  log(`\n${'='.repeat(60)}`);
  log(`Senate Financial Disclosures Historical Backfill`);
  log(`Years: ${START_YEAR}-${END_YEAR} | ${FORCE ? 'FORCE' : 'resumable'}`);
  log(`${'='.repeat(60)}`);

  // Get session
  const session = await getSenateSession();

  // Load existing data
  let existing = { lastUpdated: null, years: {} };
  if (fs.existsSync(OUTPUT_FILE) && !FORCE) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      log(`\nLoaded existing data: ${Object.keys(existing.years).length} years`);
    } catch {
      log('\nStarting fresh');
    }
  }

  const results = { ...existing };
  if (!results.years) results.years = {};

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    if (results.years[year] && !FORCE) {
      const y = results.years[year];
      log(`\n  Skipping ${year} (already have ${y.stats?.txCount || 0} transactions)`);
      continue;
    }

    const yearData = await processYear(year, session);
    results.years[year] = yearData;

    // Save after each year
    results.lastUpdated = new Date().toISOString();
    const tmp = `${OUTPUT_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(results, null, 2));
    fs.renameSync(tmp, OUTPUT_FILE);
    log(`  Saved checkpoint (${Object.keys(results.years).length} years)`);
  }

  // Compute totals
  let totalFilings = 0, totalTx = 0;
  for (const [, data] of Object.entries(results.years)) {
    totalFilings += data.stats?.total || data.filings?.length || 0;
    totalTx += data.stats?.txCount || 0;
  }

  results.lastUpdated = new Date().toISOString();
  results.totalFilings = totalFilings;
  results.totalTransactions = totalTx;
  results.runtime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

  const tmp = `${OUTPUT_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(results, null, 2));
  fs.renameSync(tmp, OUTPUT_FILE);

  log(`\n${'='.repeat(60)}`);
  log(`  SENATE BACKFILL COMPLETE`);
  log(`  Years: ${START_YEAR}-${END_YEAR}`);
  log(`  Total filings: ${totalFilings}`);
  log(`  Total transactions: ${totalTx}`);
  log(`  Runtime: ${results.runtime}`);
  log(`  Output: ${OUTPUT_FILE}`);
  log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  logError(`Fatal: ${err.message}`);
  process.exit(1);
});
