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

// ─── Crypto detection ─────────────────────────────────────────

// Crypto ETFs and crypto-company stocks — these have normal tickers
// but represent crypto exposure
const CRYPTO_TICKERS = new Set([
  // Direct crypto ETFs
  'GBTC', 'ETHE', 'BITO', 'BITX', 'ARKB', 'IBIT', 'FBTC', 'HODL',
  'BTCO', 'EZBC', 'DEFI', 'BITW', 'BRRR', 'BTCW', 'ETHV', 'CETH',
  // Crypto companies
  'COIN', 'MARA', 'RIOT', 'MSTR', 'HUT', 'BITF', 'CLSK', 'CIFR',
  'IREN', 'CORZ', 'BTBT', 'ARBK', 'SATO', 'WULF', 'DGHI',
  // Crypto-adjacent / blockchain
  'SQ', 'PYPL', 'SI', 'HOOD',
]);

// Keywords that indicate a crypto asset in PDF text (no ticker)
const CRYPTO_ASSET_KEYWORDS = /\b(bitcoin|ethereum|crypto|cryptocurrency|digital\s*asset|digital\s*currency|virtual\s*currency|blockchain|solana|cardano|dogecoin|ripple|xrp|bnb|polkadot|avalanche|chainlink|litecoin|stellar|algorand)\b/i;

function isCryptoTrade(ticker, assetDescription) {
  if (ticker && CRYPTO_TICKERS.has(ticker.toUpperCase())) return true;
  if (assetDescription && CRYPTO_ASSET_KEYWORDS.test(assetDescription)) return true;
  return false;
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

      // ─── Ticker extraction (multi-strategy) ───
      let ticker = null;
      let assetDesc = '';

      // Strategy 1: Standard format (AAPL)[ — original regex
      const tickerMatch1 = chunk.match(/\(([A-Z][A-Z0-9.]{0,5})\)\s*\[/);
      if (tickerMatch1) ticker = tickerMatch1[1];

      // Strategy 2: Ticker followed by ) then S/P/E (buy/sell/exchange) — covers OCR garbling
      if (!ticker) {
        const tickerMatch2 = chunk.match(/\(([A-Z][A-Z0-9.]{0,5})\)\s*[SPE]\s*\d{2}\//i);
        if (tickerMatch2) ticker = tickerMatch2[1];
      }

      // Strategy 3: Ticker in parens anywhere — broadest match
      if (!ticker) {
        const tickerMatch3 = chunk.match(/\(([A-Z][A-Z0-9.]{0,5})\)/);
        // Validate it looks like a real ticker (not SP, JT, DC which are owner codes)
        if (tickerMatch3 && !['SP', 'JT', 'DC', 'II', 'IV', 'VI', 'ID', 'OF', 'OR', 'AN', 'IN', 'TO', 'AT', 'NO'].includes(tickerMatch3[1])) {
          ticker = tickerMatch3[1];
        }
      }

      // Strategy 4: Subholding extraction — "SUBHOLDING OF: [trust] SP[Company (TICKER)]"
      if (!ticker) {
        const subMatch = chunk.match(/(?:SUB\s*H[Oo]LDING|SubHOlDINg|SUBHOLDING)\s+(?:OF|oF):\s*(.{10,200})/i);
        if (subMatch) {
          const subText = subMatch[1];
          // Look for ticker in the subholding text
          const subTicker = subText.match(/\(([A-Z][A-Z0-9.]{0,5})\)/);
          if (subTicker && !['SP', 'JT', 'DC', 'II', 'IV'].includes(subTicker[1])) {
            ticker = subTicker[1];
          }
          // Extract company name for description
          const companyMatch = subText.match(/(?:SP|JT|DC)\s*(.{5,80}?)(?:\(|$|\d{2}\/)/);
          if (companyMatch) assetDesc = companyMatch[1].trim().slice(0, 150);
        }
      }

      // Strategy 5: Company name to ticker mapping for common names without parens
      if (!ticker) {
        const COMPANY_TICKERS = {
          'apple': 'AAPL', 'microsoft': 'MSFT', 'amazon': 'AMZN', 'google': 'GOOGL',
          'alphabet': 'GOOGL', 'facebook': 'META', 'meta platforms': 'META',
          'tesla': 'TSLA', 'nvidia': 'NVDA', 'netflix': 'NFLX',
          'berkshire hathaway': 'BRK.B', 'jpmorgan': 'JPM', 'johnson & johnson': 'JNJ',
          'exxonmobil': 'XOM', 'exxon': 'XOM', 'chevron': 'CVX',
          'lockheed martin': 'LMT', 'boeing': 'BA', 'raytheon': 'RTX',
          'pfizer': 'PFE', 'unitedhealth': 'UNH', 'walmart': 'WMT',
          'home depot': 'HD', 'procter & gamble': 'PG', 'coca-cola': 'KO',
          'disney': 'DIS', 'verizon': 'VZ', 'at&t': 'T', 'comcast': 'CMCSA',
          'general electric': 'GE', 'general motors': 'GM', 'ford motor': 'F',
          'caterpillar': 'CAT', 'dow chemical': 'DOW', 'dupont': 'DD',
          'conocophillips': 'COP', 'marathon petroleum': 'MPC', 'halliburton': 'HAL',
          'bank of america': 'BAC', 'wells fargo': 'WFC', 'goldman sachs': 'GS',
          'morgan stanley': 'MS', 'citigroup': 'C', 'charles schwab': 'SCHW',
          'paypal': 'PYPL', 'visa': 'V', 'mastercard': 'MA', 'american express': 'AXP',
          'abbvie': 'ABBV', 'eli lilly': 'LLY', 'merck': 'MRK', 'gilead': 'GILD',
          'costco': 'COST', 'target': 'TGT', 'lowes': 'LOW',
          'union pacific': 'UNP', 'norfolk southern': 'NSC',
          'nextEra energy': 'NEE', 'duke energy': 'DUK', 'southern company': 'SO',
          'palo alto networks': 'PANW', 'crowdstrike': 'CRWD', 'palantir': 'PLTR',
          'salesforce': 'CRM', 'oracle': 'ORCL', 'adobe': 'ADBE',
          'coinbase': 'COIN', 'riot platforms': 'RIOT', 'marathon digital': 'MARA',
          'philip morris': 'PM', 'altria': 'MO',
        };
        const chunkLower = chunk.toLowerCase();
        for (const [name, tk] of Object.entries(COMPANY_TICKERS)) {
          if (chunkLower.includes(name)) { ticker = tk; break; }
        }
      }

      // Build description from chunk text near the ticker
      if (ticker && !assetDesc) {
        // Try to find the ticker in the chunk and get text before it
        const tickerIdx = chunk.indexOf('(' + ticker + ')');
        if (tickerIdx > 0) {
          const beforeTicker = chunk.slice(Math.max(0, tickerIdx - 200), tickerIdx);
          const descLines = beforeTicker.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
          assetDesc = descLines.slice(-2).join(' ').replace(/^.*?([\w])/, '$1').slice(0, 150);
        }
      }

      // Strategy 6: Crypto keywords (unchanged)
      if (!ticker && CRYPTO_ASSET_KEYWORDS.test(chunk)) {
        const cryptoMatch = chunk.match(CRYPTO_ASSET_KEYWORDS);
        const keyword = cryptoMatch ? cryptoMatch[1].toLowerCase() : 'crypto';
        const cryptoMap = {
          'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL',
          'cardano': 'ADA', 'dogecoin': 'DOGE', 'ripple': 'XRP',
          'xrp': 'XRP', 'litecoin': 'LTC', 'stellar': 'XLM',
          'polkadot': 'DOT', 'avalanche': 'AVAX', 'chainlink': 'LINK',
          'bnb': 'BNB', 'algorand': 'ALGO',
        };
        ticker = cryptoMap[keyword] || 'CRYPTO';
      }

      // Fallback description
      if (!assetDesc) {
        const descLines = chunk.split(/\n/).map(l => l.trim()).filter(l => l.length > 3 && !l.match(/^\d{2}\/\d{2}/) && !l.match(/^\$/));
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

      const crypto = isCryptoTrade(ticker, assetDesc || chunk);
      const parsedAmount = parseAmountRange(amt.text);

      // ─── Options detection ───
      const optionsMatch = chunk.match(/\b(call|put)\s*option/i) ||
                           chunk.match(/\boption\b.*\b(call|put)\b/i) ||
                           chunk.match(/\b(calls|puts)\b/i);
      const isOptions = !!optionsMatch;
      const optionType = optionsMatch ? (optionsMatch[1].toLowerCase().startsWith('c') ? 'call' : 'put') : null;

      // ─── Asset type classification ───
      let assetType = 'Stock';
      if (crypto) assetType = 'Crypto';
      else if (isOptions) assetType = 'Options';
      else if (/\b(municipal|treasury|bond|note|debt|fixed.income)\b/i.test(chunk)) assetType = 'Bond';
      else if (/\b(mutual fund|index fund|ETF|exchange.traded)\b/i.test(chunk)) assetType = 'Fund';
      else if (/\b(real estate|REIT|property|mortgage)\b/i.test(chunk) && !ticker) assetType = 'Real Estate';
      else if (/\b(commodity|gold|silver|oil|futures)\b/i.test(chunk) && !ticker) assetType = 'Commodity';

      // ─── Large trade flag ───
      const isWhaleTrade = parsedAmount.max >= 500000;

      // ─── Build description if still empty ───
      if (!assetDesc) {
        const descLines = chunk.split(/\n/).map(l => l.trim()).filter(l => l.length > 3 && !l.match(/^\d{2}\/\d{2}/) && !l.match(/^\$/));
        assetDesc = descLines.slice(-2).join(' ').replace(/^.*?([\w])/, '$1').slice(0, 150);
      }

      transactions.push({
        transactionDate: txDate,
        owner,
        ticker,
        assetDescription: assetDesc || (ticker ? ticker : 'Unknown Asset'),
        assetType,
        isCrypto: crypto,
        isOptions,
        optionType,
        isWhaleTrade,
        transactionType: txType,
        amount: parsedAmount,
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
  let cryptoCount = 0, optionsCount = 0, whaleCount = 0, lateCount = 0;

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

      // ─── Filing delay calculation ───
      // STOCK Act requires disclosure within 45 days of transaction
      const filingDateParsed = new Date(filing.filing.date);
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
    } catch (err) {
      failed++;
      filing.parseError = err.message;
    }

    // Progress every 25 PDFs
    if ((parsed + failed) % 25 === 0) {
      log(`    ${parsed + failed}/${filings.length} processed (${txCount} tx so far)`);
    }
  }

  const stats = { total: filings.length, parsed, failed, withTx, txCount, cryptoCount, optionsCount, whaleCount, lateCount };
  log(`  Done: ${parsed} parsed, ${failed} failed, ${txCount} transactions from ${withTx} filings`);
  if (cryptoCount || optionsCount || whaleCount || lateCount) {
    log(`  Flags: ${cryptoCount} crypto, ${optionsCount} options, ${whaleCount} whale ($500K+), ${lateCount} late disclosure`);
  }

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
