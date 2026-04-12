#!/usr/bin/env node
/**
 * financial-disclosures-pipeline.cjs — Congressional stock trade & financial disclosure scraper
 *
 * Tier 1 government sources:
 *   - Senate EFDS (efdsearch.senate.gov) — POST API for filing search + HTML report pages
 *   - House Clerk (disclosures-clerk.house.gov) — ASP.NET search form + PTR PDFs
 *
 * Downloads the latest 90 days of filings, parses them into structured JSON,
 * deletes temp files (PDFs), and writes a single output file that gets overwritten
 * each run. No ZIP accumulation.
 *
 * Usage:
 *   node scripts/financial-disclosures-pipeline.cjs              # full run
 *   node scripts/financial-disclosures-pipeline.cjs --dry-run    # preview, don't write
 *   node scripts/financial-disclosures-pipeline.cjs --senate     # senate only
 *   node scripts/financial-disclosures-pipeline.cjs --house      # house only
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { RateLimiter, log, logError } = require('./lib/shared.cjs');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'financial-disclosures.json');
const TEMP_DIR = path.join(ROOT, '.tmp-disclosures');
const DRY_RUN = process.argv.includes('--dry-run');
const SENATE_ONLY = process.argv.includes('--senate');
const HOUSE_ONLY = process.argv.includes('--house');
const LOOKBACK_DAYS = 90;

// Rate limiters: 1 req/sec for each source
const senateLimiter = new RateLimiter(1, 1200);
const houseLimiter = new RateLimiter(1, 1200);

// ─── HTTP helpers ──────────────────────────────────────────────

/**
 * HTTP request with full control over method, headers, body, and encoding.
 * Returns { status, data, headers, rawBuffer }.
 */
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
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.hostname}${redirectUrl}`;
        }
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

    if (opts.body) {
      req.write(opts.body);
    }
    req.end();
  });
}

// ─── Date helpers ──────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function daysBetween(d1, d2) {
  const ms = Math.abs(new Date(d1) - new Date(d2));
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ─── Amount range parser ───────────────────────────────────────

const AMOUNT_RANGES = {
  '$1,001 - $15,000': { min: 1001, max: 15000 },
  '$15,001 - $50,000': { min: 15001, max: 50000 },
  '$50,001 - $100,000': { min: 50001, max: 100000 },
  '$100,001 - $250,000': { min: 100001, max: 250000 },
  '$250,001 - $500,000': { min: 250001, max: 500000 },
  '$500,001 - $1,000,000': { min: 500001, max: 1000000 },
  '$1,000,001 - $5,000,000': { min: 1000001, max: 5000000 },
  '$5,000,001 - $25,000,000': { min: 5000001, max: 25000000 },
  '$25,000,001 - $50,000,000': { min: 25000001, max: 50000000 },
  'Over $50,000,000': { min: 50000001, max: null },
};

function parseAmountRange(text) {
  if (!text) return { min: 0, max: 0, text: 'Unknown' };
  const cleaned = text.trim();
  if (AMOUNT_RANGES[cleaned]) return { ...AMOUNT_RANGES[cleaned], text: cleaned };
  // Try to parse "$X - $Y" pattern
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

// ═══════════════════════════════════════════════════════════════
// SENATE EFDS SCRAPER
// ═══════════════════════════════════════════════════════════════

async function scrapeSenate() {
  log('── Senate EFDS ──────────────────────────────────');
  const filings = [];

  // Step 1: Get CSRF token
  log('  Fetching CSRF token...');
  let csrfToken = '';
  let cookies = '';
  try {
    const homeRes = await httpRequest('https://efdsearch.senate.gov/search/home/');
    // Extract csrftoken from Set-Cookie
    const setCookies = homeRes.headers['set-cookie'] || [];
    for (const c of (Array.isArray(setCookies) ? setCookies : [setCookies])) {
      const m = c.match(/csrftoken=([^;]+)/);
      if (m) csrfToken = m[1];
    }
    cookies = setCookies.map(c => c.split(';')[0]).join('; ');
    // Also try to extract from HTML (sometimes in a meta tag or hidden input)
    const metaMatch = homeRes.data.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
    if (metaMatch) csrfToken = metaMatch[1];
    log(`  CSRF token: ${csrfToken ? csrfToken.slice(0, 12) + '...' : 'NOT FOUND'}`);
  } catch (err) {
    logError(`Senate CSRF fetch failed: ${err.message}`);
    return filings;
  }

  if (!csrfToken) {
    logError('No CSRF token found - Senate scraping will likely fail');
    return filings;
  }

  // Step 2: Search for PTR filings in the last 90 days
  const startDate = formatDate(daysAgo(LOOKBACK_DAYS));
  const endDate = formatDate(new Date());

  // Agreement check - EFDS requires agreeing to terms first
  try {
    await senateLimiter.wait();
    await httpRequest('https://efdsearch.senate.gov/search/home/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Referer': 'https://efdsearch.senate.gov/search/home/',
        'X-CSRFToken': csrfToken,
      },
      body: `csrfmiddlewaretoken=${encodeURIComponent(csrfToken)}&prohibition_agreement=1`,
    });
    log('  Agreement accepted');
  } catch (err) {
    logError(`Senate agreement POST failed: ${err.message}`);
    // Continue anyway - might work without it
  }

  // Step 3: Fetch PTR report listing
  log(`  Searching PTR filings: ${startDate} to ${endDate}`);
  let reportData = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    await senateLimiter.wait();
    try {
      const body = [
        `start=${offset}`,
        `length=${pageSize}`,
        `report_types=%5B11%5D`,          // 11 = Periodic Transaction Report
        `filer_types=%5B1%5D`,             // 1 = Senator
        `submitted_start_date=${encodeURIComponent(startDate + ' 00:00:00')}`,
        `submitted_end_date=${encodeURIComponent(endDate + ' 23:59:59')}`,
        `csrfmiddlewaretoken=${encodeURIComponent(csrfToken)}`,
      ].join('&');

      const res = await httpRequest('https://efdsearch.senate.gov/search/report/data/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies,
          'Referer': 'https://efdsearch.senate.gov/search/',
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body,
      });

      const json = JSON.parse(res.data);
      if (!json.data || json.data.length === 0) break;

      log(`  Page ${Math.floor(offset / pageSize) + 1}: ${json.data.length} filings (total: ${json.recordsTotal})`);
      reportData = reportData.concat(json.data);

      if (reportData.length >= json.recordsFiltered) break;
      offset += pageSize;
    } catch (err) {
      logError(`Senate search page ${Math.floor(offset / pageSize) + 1} failed: ${err.message}`);
      break;
    }
  }

  log(`  Found ${reportData.length} Senate PTR filings`);

  // Step 4: Parse each filing page for transaction details
  for (const row of reportData) {
    // row.data contains: [first_name, last_name, filer_type, report_type_html, date]
    // The report_type field contains an HTML link with the report URL
    const firstName = row.first_name || (row[0] || '');
    const lastName = row.last_name || (row[1] || '');
    const dateStr = row.date || (row[4] || '');
    const reportHtml = row.report_type || (row[3] || '');

    // Extract report URL from HTML link
    const linkMatch = reportHtml.match(/href="([^"]+)"/);
    if (!linkMatch) {
      log(`  Skipping filing for ${firstName} ${lastName} - no report link`);
      continue;
    }
    const reportUrl = `https://efdsearch.senate.gov${linkMatch[1]}`;

    // Fetch and parse individual report
    await senateLimiter.wait();
    try {
      const reportRes = await httpRequest(reportUrl, {
        headers: {
          'Cookie': cookies,
          'Referer': 'https://efdsearch.senate.gov/search/',
        },
      });

      const transactions = parseSenateReportHtml(reportRes.data);
      const filing = {
        chamber: 'Senate',
        filer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
        },
        filing: {
          date: dateStr.trim(),
          type: 'PTR',
          sourceUrl: reportUrl,
          sourceSystem: 'efdsearch.senate.gov',
        },
        transactions,
      };

      filings.push(filing);
      if (transactions.length > 0) {
        log(`  ${filing.filer.name}: ${transactions.length} transaction(s)`);
      }
    } catch (err) {
      logError(`  Failed to fetch report for ${firstName} ${lastName}: ${err.message}`);
    }
  }

  return filings;
}

/**
 * Parse a Senate EFDS PTR report HTML page into transaction objects.
 */
function parseSenateReportHtml(html) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  const transactions = [];

  // Senate PTR pages have a table with transaction rows
  // Look for the transactions table
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

    transactions.push({
      transactionDate: txDate,
      owner: owner || 'Self',
      ticker: ticker && ticker !== '--' && ticker !== 'N/A' ? ticker : null,
      assetDescription: assetName,
      assetType: assetType || 'Stock',
      transactionType: txType,
      amount: parseAmountRange(amount),
      comment,
    });
  });

  // Fallback: try parsing div-based layout (Senate sometimes uses this)
  if (transactions.length === 0) {
    // Look for transaction sections with labeled fields
    $('.transaction, .ptr-transaction, [class*="transaction"]').each((_, el) => {
      const text = $(el).text();
      const dateMatch = text.match(/Transaction Date[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
      const ownerMatch = text.match(/Owner[:\s]*(Senator|Spouse|Joint|Dependent|Child)/i);
      const tickerMatch = text.match(/Ticker[:\s]*([A-Z]{1,5})/i);
      const assetMatch = text.match(/Asset(?:\s+Name)?[:\s]*([^\n]+)/i);
      const typeMatch = text.match(/Type[:\s]*(Purchase|Sale|Exchange)/i);
      const amountMatch = text.match(/Amount[:\s]*(\$[\d,]+\s*-\s*\$[\d,]+)/i);

      if (dateMatch || assetMatch) {
        transactions.push({
          transactionDate: dateMatch ? dateMatch[1] : '',
          owner: ownerMatch ? ownerMatch[1] : 'Self',
          ticker: tickerMatch ? tickerMatch[1] : null,
          assetDescription: assetMatch ? assetMatch[1].trim() : '',
          assetType: 'Stock',
          transactionType: typeMatch ? typeMatch[1] : 'Unknown',
          amount: parseAmountRange(amountMatch ? amountMatch[1] : ''),
          comment: '',
        });
      }
    });
  }

  return transactions;
}

// ═══════════════════════════════════════════════════════════════
// HOUSE CLERK SCRAPER (XML ZIP approach)
// ═══════════════════════════════════════════════════════════════

/**
 * House Clerk publishes annual XML ZIP files at:
 *   https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YEAR}FD.ZIP
 *
 * Each ZIP contains XML with <Member> elements listing all filings for that year.
 * We download the ZIP, extract the XML, parse PTR filings, filter to last 90 days,
 * then fetch individual PTR PDFs for transaction details.
 */
async function scrapeHouse() {
  log('\n── House Clerk ─────────────────────────────────');
  const filings = [];
  const currentYear = new Date().getFullYear();
  const cutoffDate = daysAgo(LOOKBACK_DAYS);

  // Step 1: Download the annual XML ZIP
  const zipUrl = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${currentYear}FD.ZIP`;
  log(`  Downloading ${currentYear} XML ZIP...`);

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const zipPath = path.join(TEMP_DIR, `${currentYear}FD.ZIP`);
  let xmlContent = '';

  try {
    const zipRes = await httpRequest(zipUrl, { encoding: 'binary' });
    fs.writeFileSync(zipPath, zipRes.rawBuffer);
    log(`  ZIP downloaded: ${(zipRes.rawBuffer.length / 1024).toFixed(0)} KB`);

    // Extract XML from ZIP
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    const xmlEntry = entries.find(e => e.entryName.endsWith('.xml'));

    if (!xmlEntry) {
      logError('  No XML file found in ZIP');
      fs.unlinkSync(zipPath);
      return filings;
    }

    xmlContent = xmlEntry.getData().toString('utf-8');
    log(`  XML extracted: ${xmlEntry.entryName} (${(xmlContent.length / 1024).toFixed(0)} KB)`);

    // Delete ZIP immediately
    fs.unlinkSync(zipPath);
    log('  ZIP deleted');
  } catch (err) {
    logError(`House ZIP download failed: ${err.message}`);
    try { fs.unlinkSync(zipPath); } catch {}
    return filings;
  }

  // Step 2: Parse XML for PTR filings
  const cheerio = require('cheerio');
  const $ = cheerio.load(xmlContent, { xmlMode: true });
  const members = $('Member');
  let ptrCount = 0;
  let recentCount = 0;

  log(`  Total filings in XML: ${members.length}`);

  members.each((_, member) => {
    const $m = $(member);
    const prefix = $m.find('Prefix').text().trim();
    const lastName = $m.find('Last').text().trim();
    const firstName = $m.find('First').text().trim();
    const suffix = $m.find('Suffix').text().trim();
    const filingType = $m.find('FilingType').text().trim();
    const stateDst = $m.find('StateDst').text().trim();
    const filingDate = $m.find('FilingDate').text().trim();
    const docId = $m.find('DocID').text().trim();
    const year = $m.find('Year').text().trim();

    // Only PTR filings
    if (filingType !== 'P') return;
    ptrCount++;

    // Filter to last 90 days
    const fd = new Date(filingDate);
    if (isNaN(fd.getTime()) || fd < cutoffDate) return;
    recentCount++;

    // Parse state/district from StateDst (e.g., "CA27", "TX10")
    const sdMatch = stateDst.match(/([A-Z]{2})(\d+)?/);
    const state = sdMatch ? sdMatch[1] : '';
    const district = sdMatch ? sdMatch[2] || '' : '';

    const name = [prefix, firstName, lastName, suffix].filter(Boolean).join(' ');
    const pdfUrl = `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year || currentYear}/${docId}.pdf`;

    filings.push({
      chamber: 'House',
      filer: {
        firstName,
        lastName,
        name,
        state,
        district,
      },
      filing: {
        date: filingDate,
        type: 'PTR',
        docId,
        sourceUrl: pdfUrl,
        sourceSystem: 'disclosures-clerk.house.gov',
      },
      transactions: [],
    });
  });

  log(`  PTR filings total: ${ptrCount}, last ${LOOKBACK_DAYS} days: ${recentCount}`);

  // Step 3: Fetch and parse individual PTR PDFs for transaction details
  if (!DRY_RUN && filings.length > 0) {
    log(`  Parsing ${filings.length} PTR PDFs for transaction details...`);
    let parsed = 0;
    let failed = 0;

    for (const filing of filings) {
      await houseLimiter.wait();
      try {
        const pdfRes = await httpRequest(filing.filing.sourceUrl, { encoding: 'binary' });
        const pdfPath = path.join(TEMP_DIR, `house-${filing.filing.docId}.pdf`);
        fs.writeFileSync(pdfPath, pdfRes.rawBuffer);

        const transactions = await parseHousePdf(pdfPath);
        filing.transactions = transactions;

        // Delete PDF immediately
        try { fs.unlinkSync(pdfPath); } catch {}

        parsed++;
        if (transactions.length > 0) {
          log(`  ${filing.filer.name}: ${transactions.length} transaction(s)`);
        }
      } catch (err) {
        failed++;
        filing.parseError = err.message;
        // Don't log every failure — summarize at end
      }
    }

    log(`  PDFs parsed: ${parsed}, failed: ${failed}`);
  } else if (DRY_RUN) {
    log(`  [DRY RUN] Would fetch ${filings.length} PTR PDFs`);
  }

  return filings;
}

/**
 * Parse a House PTR PDF into transaction objects using pdf-parse.
 *
 * Actual PDF text layout (from examining real PTR PDFs):
 *
 *   Amazon.com, Inc. - Common Stock
 *   (AMZN) [ST]
 *   S (partial)03/16/202603/16/2026$1,001 - $15,000
 *
 * Pattern per transaction:
 *   1. Asset description (company name, may span multiple lines)
 *   2. Ticker in parentheses "(AMZN)", asset type in brackets "[ST]"
 *   3. Transaction line: type + dates + amount, concatenated
 *
 * Owner prefix appears as "SP" (Spouse), "JT" (Joint), "DC" (Dependent Child)
 * before or near the transaction block.
 */
async function parseHousePdf(pdfPath) {
  const pdfParse = require('pdf-parse');
  const transactions = [];

  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    // Strategy: find all amount ranges, then look backwards for ticker and transaction type.
    // The PDF text is a continuous blob where each transaction contains:
    //   - Asset name with ticker in parens: "(AAPL)" or "(BRK.B)"
    //   - Transaction type: "P" or "P (partial)" or "S" or "S (partial)" or "Purchase" or "Sale"
    //   - Two dates: MM/DD/YYYY format (transaction date + notification date)
    //   - Amount range: "$X,XXX - $XX,XXX"

    // Split into chunks around amount ranges
    const amountRegex = /\$[\d,]+\s*-\s*\$[\d,]+/g;
    let match;
    const amountPositions = [];
    while ((match = amountRegex.exec(text)) !== null) {
      amountPositions.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
    }

    for (let i = 0; i < amountPositions.length; i++) {
      const amt = amountPositions[i];
      // Look at the text chunk BEFORE this amount (back to previous amount or max 500 chars)
      const prevEnd = i > 0 ? amountPositions[i - 1].end : 0;
      const chunkStart = Math.max(prevEnd, amt.start - 600);
      const chunk = text.slice(chunkStart, amt.end);

      // Extract ticker from parentheses: "(AAPL)", "(BRK.B)", "(MSFT)"
      const tickerMatch = chunk.match(/\(([A-Z][A-Z0-9.]{0,5})\)\s*\[/);
      const ticker = tickerMatch ? tickerMatch[1] : null;

      // Extract asset description (text before the ticker parens)
      let assetDesc = '';
      if (tickerMatch) {
        // Get text before the ticker, clean it up
        const beforeTicker = chunk.slice(0, chunk.lastIndexOf('(' + ticker + ')'));
        // Take the last meaningful line(s) before ticker
        const descLines = beforeTicker.split(/\n/).map(l => l.trim()).filter(l => l.length > 3);
        assetDesc = descLines.slice(-2).join(' ').replace(/^.*?([\w])/,'$1').slice(0, 150);
      }

      // Extract dates: MM/DD/YYYY
      const dates = [];
      const dateRegex = /(\d{2}\/\d{2}\/\d{4})/g;
      let dm;
      while ((dm = dateRegex.exec(chunk)) !== null) dates.push(dm[1]);
      // First date is transaction date, second is notification/filing date
      const txDate = dates.length > 0 ? dates[dates.length >= 2 ? dates.length - 2 : 0] : '';
      const notifDate = dates.length >= 2 ? dates[dates.length - 1] : '';

      // Extract transaction type: "S" or "P" (with optional "(partial)")
      // Appears just before the dates, after the [ST]/[OT] bracket
      const typeMatch = chunk.match(/\]\s*(S|P)\s*(?:\(partial\))?\s*\d{2}\//i) ||
                        chunk.match(/(Purchase|Sale|Exchange)\s/i) ||
                        chunk.match(/\b(S|P)\s*\(partial\)/i) ||
                        chunk.match(/\b(S|P)\s+\d{2}\/\d{2}/i);
      let txType = 'Unknown';
      if (typeMatch) {
        const t = typeMatch[1].toUpperCase();
        txType = t === 'P' || t === 'PURCHASE' ? 'Purchase' : t === 'S' || t === 'SALE' ? 'Sale' : typeMatch[1];
      }

      // Extract owner
      let owner = 'Self';
      const ownerMatch = chunk.match(/\b(SP|JT|DC)\b/);
      if (ownerMatch) {
        const o = ownerMatch[1];
        owner = o === 'SP' ? 'Spouse' : o === 'JT' ? 'Joint' : o === 'DC' ? 'Dependent Child' : 'Self';
      }

      // Skip header rows and non-transaction matches
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
    logError(`PDF parse error: ${err.message}`);
  }

  return transactions;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();
  log(`\n${'='.repeat(60)}`);
  log(`Financial Disclosures Pipeline`);
  log(`${new Date().toISOString()} | Lookback: ${LOOKBACK_DAYS} days${DRY_RUN ? ' | DRY RUN' : ''}`);
  log(`${'='.repeat(60)}\n`);

  let senateFilings = [];
  let houseFilings = [];

  if (!HOUSE_ONLY) {
    try {
      senateFilings = await scrapeSenate();
    } catch (err) {
      logError(`Senate scraping failed entirely: ${err.message}`);
    }
  }

  if (!SENATE_ONLY) {
    try {
      houseFilings = await scrapeHouse();
    } catch (err) {
      logError(`House scraping failed entirely: ${err.message}`);
    }
  }

  const allFilings = [...senateFilings, ...houseFilings];

  // Compute stats
  const totalTransactions = allFilings.reduce((n, f) => n + f.transactions.length, 0);
  const stats = {
    lastUpdated: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    senateFilings: senateFilings.length,
    houseFilings: houseFilings.length,
    totalFilings: allFilings.length,
    totalTransactions,
    runtime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
  };

  log(`\n── Summary ─────────────────────────────────────`);
  log(`  Senate filings:     ${stats.senateFilings}`);
  log(`  House filings:      ${stats.houseFilings}`);
  log(`  Total transactions: ${stats.totalTransactions}`);
  log(`  Runtime:            ${stats.runtime}`);

  // Write output
  if (!DRY_RUN) {
    const output = { stats, filings: allFilings };
    const tmp = `${OUTPUT_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(output, null, 2));
    fs.renameSync(tmp, OUTPUT_FILE);
    log(`  Written to: ${OUTPUT_FILE}`);

    // Clean up temp dir
    if (fs.existsSync(TEMP_DIR)) {
      try {
        const remaining = fs.readdirSync(TEMP_DIR);
        for (const f of remaining) {
          fs.unlinkSync(path.join(TEMP_DIR, f));
        }
        fs.rmdirSync(TEMP_DIR);
        log('  Temp directory cleaned up');
      } catch (err) {
        logError(`Temp cleanup failed: ${err.message}`);
      }
    }
  } else {
    log(`  [DRY RUN] Would write ${allFilings.length} filings to ${OUTPUT_FILE}`);
  }

  log(`\n${'='.repeat(60)}\n`);
}

main().catch(err => {
  logError(`Fatal: ${err.message}`);
  process.exit(1);
});
