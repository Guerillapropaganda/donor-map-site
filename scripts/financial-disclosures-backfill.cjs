#!/usr/bin/env node
/**
 * financial-disclosures-backfill.cjs — Historical backfill of House PTR filings
 *
 * Downloads XML ZIPs for years 2008-2026 from the House Clerk, extracts PTR
 * filings, downloads and parses individual PDFs for transaction details.
 * Results are merged into data/financial-disclosures-historical.json.
 *
 * This is a one-time (or occasional) script. It's resumable: years that
 * already exist in the output file are skipped unless --force is passed.
 *
 * Usage:
 *   node scripts/financial-disclosures-backfill.cjs                # all years
 *   node scripts/financial-disclosures-backfill.cjs --year 2020    # single year
 *   node scripts/financial-disclosures-backfill.cjs --from 2018    # 2018 onward
 *   node scripts/financial-disclosures-backfill.cjs --force        # re-process all
 *   node scripts/financial-disclosures-backfill.cjs --xml-only     # skip PDFs, just index
 *
 * Rate limiting: 1 req/sec to House Clerk. A full backfill (2012-2026) with
 * ~2000 PDFs takes roughly 40 minutes.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { RateLimiter, log, logError } = require('./lib/shared.cjs');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'financial-disclosures-historical.json');
const TEMP_DIR = path.join(ROOT, '.tmp-disclosures-backfill');

// CLI args
const FORCE = process.argv.includes('--force');
const XML_ONLY = process.argv.includes('--xml-only');
const yearArg = process.argv.indexOf('--year');
const fromArg = process.argv.indexOf('--from');
const SINGLE_YEAR = yearArg >= 0 ? parseInt(process.argv[yearArg + 1]) : null;
const FROM_YEAR = fromArg >= 0 ? parseInt(process.argv[fromArg + 1]) : null;

// Year range: STOCK Act started 2012, but House has data from ~2008
const START_YEAR = SINGLE_YEAR || FROM_YEAR || 2012;
const END_YEAR = SINGLE_YEAR || new Date().getFullYear();

const rateLimiter = new RateLimiter(1, 1100); // ~1 req/sec

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
        const rawBuffer = Buffer.concat(chunks);
        const data = opts.encoding === 'binary' ? rawBuffer : rawBuffer.toString('utf-8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data, headers: res.headers, rawBuffer });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ─── Amount parser ─────────────────────────────────────────────

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
  return { min: 0, max: 0, text: cleaned };
}

// ─── PDF parser (same logic as main pipeline) ──────────────────

async function parseHousePdf(pdfBuffer) {
  const pdfParse = require('pdf-parse');
  const transactions = [];

  try {
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    const amountRegex = /\$[\d,]+\s*-\s*\$[\d,]+/g;
    let match;
    const amountPositions = [];
    while ((match = amountRegex.exec(text)) !== null) {
      amountPositions.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }

    for (let i = 0; i < amountPositions.length; i++) {
      const amt = amountPositions[i];
      const prevEnd = i > 0 ? amountPositions[i - 1].end : 0;
      const chunkStart = Math.max(prevEnd, amt.start - 600);
      const chunk = text.slice(chunkStart, amt.end);

      const tickerMatch = chunk.match(/\(([A-Z][A-Z0-9.]{0,5})\)\s*\[/);
      const ticker = tickerMatch ? tickerMatch[1] : null;

      let assetDesc = '';
      if (tickerMatch) {
        const beforeTicker = chunk.slice(0, chunk.lastIndexOf('(' + ticker + ')'));
        const descLines = beforeTicker.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
        assetDesc = descLines.slice(-2).join(' ').replace(/^.*?([\w])/, '$1').slice(0, 150);
      }

      const dates = [];
      const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
      let dm;
      while ((dm = dateRegex.exec(chunk)) !== null) dates.push(dm[1]);
      const txDate = dates.length > 0 ? dates[dates.length >= 2 ? dates.length - 2 : 0] : '';

      const typeMatch = chunk.match(/\]\s*(S|P)\s*(?:\(partial\))?\s*\d{2}\//i) ||
                        chunk.match(/(Purchase|Sale|Exchange)\s/i) ||
                        chunk.match(/\b(S|P)\s*\(partial\)/i) ||
                        chunk.match(/\b(S|P)\s+\d{2}\/\d{2}/i);
      let txType = 'Unknown';
      if (typeMatch) {
        const t = typeMatch[1].toUpperCase();
        txType = t === 'P' || t === 'PURCHASE' ? 'Purchase' : t === 'S' || t === 'SALE' ? 'Sale' : typeMatch[1];
      }

      let owner = 'Self';
      const ownerMatch = chunk.match(/\b(SP|JT|DC)\b/);
      if (ownerMatch) {
        const o = ownerMatch[1];
        owner = o === 'SP' ? 'Spouse' : o === 'JT' ? 'Joint' : o === 'DC' ? 'Dependent Child' : 'Self';
      }

      if (chunk.includes('IDOwnerAsset') || chunk.includes('Clerk of the House')) continue;

      transactions.push({
        transactionDate: txDate,
        owner,
        ticker,
        assetDescription: assetDesc || (ticker ? ticker : 'Unknown Asset'),
        assetType: 'Stock',
        transactionType: txType,
        amount: parseAmountRange(amt.text),
        comment: '',
      });
    }
  } catch (err) {
    // Silent — caller handles failures
  }

  return transactions;
}

// ─── Process one year ──────────────────────────────────────────

async function processYear(year) {
  log(`\n${'─'.repeat(50)}`);
  log(`  YEAR ${year}`);
  log(`${'─'.repeat(50)}`);

  const zipUrl = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.ZIP`;

  // Download XML ZIP
  log(`  Downloading ${year}FD.ZIP...`);
  let xmlContent = '';
  try {
    await rateLimiter.wait();
    const zipRes = await httpRequest(zipUrl, { encoding: 'binary' });
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipRes.rawBuffer);
    const entries = zip.getEntries();
    const xmlEntry = entries.find(e => e.entryName.endsWith('.xml'));
    if (!xmlEntry) {
      logError(`  No XML in ${year}FD.ZIP`);
      return { year, filings: [], error: 'No XML in ZIP' };
    }
    xmlContent = xmlEntry.getData().toString('utf-8');
    log(`  XML: ${xmlEntry.entryName} (${(xmlContent.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    logError(`  ${year} ZIP failed: ${err.message}`);
    return { year, filings: [], error: err.message };
  }

  // Parse XML for PTR filings
  const cheerio = require('cheerio');
  const $ = cheerio.load(xmlContent, { xmlMode: true });
  const members = $('Member');
  const filings = [];

  members.each((_, member) => {
    const $m = $(member);
    const firstName = $m.find('First').text().trim();
    const lastName = $m.find('Last').text().trim();
    const prefix = $m.find('Prefix').text().trim();
    const suffix = $m.find('Suffix').text().trim();
    const filingType = $m.find('FilingType').text().trim();
    const stateDst = $m.find('StateDst').text().trim();
    const filingDate = $m.find('FilingDate').text().trim();
    const docId = $m.find('DocID').text().trim();

    if (filingType !== 'P') return; // PTR only

    const sdMatch = stateDst.match(/([A-Z]{2})(\d+)?/);
    const name = [prefix, firstName, lastName, suffix].filter(Boolean).join(' ');

    filings.push({
      chamber: 'House',
      filer: {
        firstName,
        lastName,
        name,
        state: sdMatch ? sdMatch[1] : '',
        district: sdMatch ? sdMatch[2] || '' : '',
      },
      filing: {
        date: filingDate,
        year,
        type: 'PTR',
        docId,
        sourceUrl: `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${docId}.pdf`,
        sourceSystem: 'disclosures-clerk.house.gov',
      },
      transactions: [],
    });
  });

  log(`  PTR filings: ${filings.length}`);

  if (XML_ONLY || filings.length === 0) {
    return { year, filings, stats: { total: filings.length, parsed: 0, withTx: 0, txCount: 0 } };
  }

  // Download and parse PDFs
  log(`  Parsing ${filings.length} PDFs...`);
  let parsed = 0, failed = 0, withTx = 0, txCount = 0;

  for (const filing of filings) {
    await rateLimiter.wait();
    try {
      const pdfRes = await httpRequest(filing.filing.sourceUrl, { encoding: 'binary' });
      const transactions = await parseHousePdf(pdfRes.rawBuffer);
      filing.transactions = transactions;
      parsed++;
      if (transactions.length > 0) {
        withTx++;
        txCount += transactions.length;
      }
    } catch (err) {
      failed++;
      filing.parseError = err.message;
    }

    // Progress every 25 PDFs
    if ((parsed + failed) % 25 === 0) {
      log(`    ${parsed + failed}/${filings.length} processed (${txCount} tx so far)`);
    }
  }

  const stats = { total: filings.length, parsed, failed, withTx, txCount };
  log(`  Done: ${parsed} parsed, ${failed} failed, ${txCount} transactions from ${withTx} filings`);

  return { year, filings, stats };
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  log(`\n${'='.repeat(60)}`);
  log(`Financial Disclosures Historical Backfill`);
  log(`Years: ${START_YEAR}-${END_YEAR} | ${FORCE ? 'FORCE' : 'resumable'} | ${XML_ONLY ? 'XML only' : 'full parse'}`);
  log(`${'='.repeat(60)}`);

  // Load existing data for resumability
  let existing = { lastUpdated: null, years: {} };
  if (fs.existsSync(OUTPUT_FILE) && !FORCE) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      log(`\nLoaded existing data: ${Object.keys(existing.years).length} years already processed`);
    } catch (e) {
      log('\nNo valid existing data, starting fresh');
    }
  }

  // Ensure temp dir
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const results = { ...existing };
  if (!results.years) results.years = {};

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    // Skip if already processed (unless --force)
    if (results.years[year] && !FORCE) {
      const y = results.years[year];
      log(`\n  Skipping ${year} (already have ${y.stats?.txCount || 0} transactions from ${y.stats?.total || 0} filings)`);
      continue;
    }

    const yearData = await processYear(year);
    results.years[year] = yearData;

    // Save after each year for crash resilience
    results.lastUpdated = new Date().toISOString();
    const tmp = `${OUTPUT_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(results, null, 2));
    fs.renameSync(tmp, OUTPUT_FILE);
    log(`  Saved checkpoint (${Object.keys(results.years).length} years)`);
  }

  // Compute totals
  let totalFilings = 0, totalTx = 0;
  for (const [yr, data] of Object.entries(results.years)) {
    totalFilings += data.stats?.total || data.filings?.length || 0;
    totalTx += data.stats?.txCount || 0;
  }

  results.lastUpdated = new Date().toISOString();
  results.totalFilings = totalFilings;
  results.totalTransactions = totalTx;
  results.runtime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

  // Final save
  const tmp = `${OUTPUT_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(results, null, 2));
  fs.renameSync(tmp, OUTPUT_FILE);

  // Cleanup
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const remaining = fs.readdirSync(TEMP_DIR);
      for (const f of remaining) fs.unlinkSync(path.join(TEMP_DIR, f));
      fs.rmdirSync(TEMP_DIR);
    }
  } catch {}

  log(`\n${'='.repeat(60)}`);
  log(`  BACKFILL COMPLETE`);
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
