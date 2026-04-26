import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import { canonicalPoliticianName } from "@/lib/donor-map-politician-resolver"

/**
 * /api/trade-stories — Generate plain-English narratives from trade data
 *
 * Turns raw data points into readable stories:
 * "Rep. X bought $500K of Lockheed Martin. She sits on Armed Services.
 *  12 days later she voted to increase the defense budget."
 *
 * Stories are auto-generated from the conflict data, ranked by impact.
 */

const ROOT = path.join(process.cwd(), "..")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")
const SENATE_FILE = path.join(ROOT, "data", "senate-disclosures-historical.json")
const VOTES_FILE = path.join(ROOT, "data", "crypto-votes.json")
const COMMITTEES_FILE = path.join(ROOT, "data", "committee-assignments.json")

// Same crypto detection
const CRYPTO_TICKERS = new Set([
  'GBTC', 'ETHE', 'BITO', 'BITX', 'ARKB', 'IBIT', 'FBTC', 'HODL',
  'BTCO', 'EZBC', 'DEFI', 'BITW', 'BRRR', 'BTCW', 'ETHV', 'CETH',
  'COIN', 'MARA', 'RIOT', 'MSTR', 'HUT', 'BITF', 'CLSK', 'CIFR',
  'IREN', 'CORZ', 'BTBT', 'ARBK', 'SATO', 'WULF', 'DGHI',
  'SQ', 'PYPL', 'SI', 'HOOD',
])

// Ticker to human-readable company name
const TICKER_NAMES: Record<string, string> = {
  AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Google (Alphabet)', META: 'Meta (Facebook)',
  AMZN: 'Amazon', NVDA: 'Nvidia', TSLA: 'Tesla', AMD: 'AMD',
  JPM: 'JPMorgan Chase', BAC: 'Bank of America', GS: 'Goldman Sachs', MS: 'Morgan Stanley',
  LMT: 'Lockheed Martin', RTX: 'Raytheon', NOC: 'Northrop Grumman', GD: 'General Dynamics', BA: 'Boeing',
  XOM: 'ExxonMobil', CVX: 'Chevron', COP: 'ConocoPhillips', OXY: 'Occidental Petroleum',
  UNH: 'UnitedHealth', JNJ: 'Johnson & Johnson', PFE: 'Pfizer', MRK: 'Merck', ABBV: 'AbbVie', LLY: 'Eli Lilly',
  COIN: 'Coinbase', MARA: 'Marathon Digital', RIOT: 'Riot Platforms', MSTR: 'MicroStrategy',
  GBTC: 'Grayscale Bitcoin Trust', IBIT: 'iShares Bitcoin Trust', BITO: 'ProShares Bitcoin ETF',
  DIS: 'Disney', NFLX: 'Netflix', PYPL: 'PayPal', SQ: 'Block (Square)',
  V: 'Visa', MA: 'Mastercard', BRK: 'Berkshire Hathaway',
  NEE: 'NextEra Energy', DUK: 'Duke Energy', SO: 'Southern Company',
  PANW: 'Palo Alto Networks', CRWD: 'CrowdStrike', PLTR: 'Palantir',
  HCA: 'HCA Healthcare', CVS: 'CVS Health', CI: 'Cigna',
}

function fmtK(n: number): string {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K"
  return "$" + n
}

function tickerName(ticker: string | null): string {
  if (!ticker) return "an unknown asset"
  return TICKER_NAMES[ticker] || ticker
}

interface Story {
  headline: string
  body: string
  category: 'whale' | 'late' | 'committee' | 'crypto-vote' | 'cluster' | 'options'
  severity: 'critical' | 'high' | 'medium'
  politician: string
  ticker: string | null
  amount: number
  date: string
}

function loadTrades(): any[] {
  const trades: any[] = []

  for (const file of [CURRENT_FILE, HISTORICAL_FILE, SENATE_FILE]) {
    if (!fs.existsSync(file)) continue
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf-8"))
      if (raw.filings) {
        for (const f of raw.filings) {
          for (const tx of f.transactions || []) {
            trades.push({ ...tx, politician: canonicalPoliticianName(f.filer?.name || ''), chamber: f.chamber || 'House', filingDate: f.filing?.date })
          }
        }
      }
      if (raw.years) {
        for (const [, yd] of Object.entries(raw.years as Record<string, any>)) {
          for (const f of yd.filings || []) {
            for (const tx of f.transactions || []) {
              trades.push({ ...tx, politician: canonicalPoliticianName(f.filer?.name || ''), chamber: f.chamber || 'House', filingDate: f.filing?.date })
            }
          }
        }
      }
    } catch {}
  }

  return trades
}

export async function GET() {
  const trades = loadTrades()
  const stories: Story[] = []

  // ─── Whale trade stories ───
  const whales = trades
    .filter(t => (t.amount?.max || 0) >= 500000 && t.ticker)
    .sort((a, b) => (b.amount?.max || 0) - (a.amount?.max || 0))

  for (const t of whales.slice(0, 20)) {
    const amt = t.amount?.max || t.amount?.min || 0
    const action = t.transactionType === 'Purchase' ? 'bought' : t.transactionType === 'Sale' ? 'sold' : 'traded'
    const name = tickerName(t.ticker)
    stories.push({
      headline: `${t.politician} ${action} ${fmtK(amt)} of ${name}`,
      body: `${t.chamber} member ${t.politician} ${action} between ${t.amount?.text || fmtK(amt)} worth of ${name} (${t.ticker}) on ${t.transactionDate || 'unknown date'}. Trades of this size by sitting members of Congress raise questions about whether they are acting on non-public information.`,
      category: 'whale',
      severity: amt >= 1000000 ? 'critical' : 'high',
      politician: t.politician,
      ticker: t.ticker,
      amount: amt,
      date: t.transactionDate || '',
    })
  }

  // ─── Late disclosure stories ───
  const lates = trades
    .filter(t => t.isLateDisclosure && t.filingDelayDays && t.filingDelayDays > 45)
    .sort((a, b) => (b.filingDelayDays || 0) - (a.filingDelayDays || 0))

  for (const t of lates.slice(0, 20)) {
    const delay = t.filingDelayDays || 0
    const action = t.transactionType === 'Purchase' ? 'purchase' : t.transactionType === 'Sale' ? 'sale' : 'trade'
    const name = tickerName(t.ticker)
    const daysOver = delay - 45
    stories.push({
      headline: `${t.politician} disclosed ${name} ${action} ${delay} days late`,
      body: `The STOCK Act requires disclosure within 45 days. ${t.politician} waited ${delay} days to disclose a ${t.amount?.text || ''} ${action} of ${name}${t.ticker ? ' (' + t.ticker + ')' : ''} on ${t.transactionDate || 'unknown date'}. That is ${daysOver} days past the legal deadline. Late disclosure defeats the purpose of transparency - by the time the public learns about the trade, the information advantage has already been captured.`,
      category: 'late',
      severity: delay > 90 ? 'critical' : delay > 60 ? 'high' : 'medium',
      politician: t.politician,
      ticker: t.ticker,
      amount: t.amount?.max || 0,
      date: t.transactionDate || '',
    })
  }

  // ─── Options stories ───
  const options = trades
    .filter(t => t.isOptions && t.ticker)
    .sort((a, b) => (b.amount?.max || 0) - (a.amount?.max || 0))

  for (const t of options.slice(0, 10)) {
    const amt = t.amount?.max || t.amount?.min || 0
    const optType = t.optionType === 'call' ? 'call options on' : t.optionType === 'put' ? 'put options on' : 'options on'
    const name = tickerName(t.ticker)
    const betDirection = t.optionType === 'call' ? 'betting the stock will rise' : t.optionType === 'put' ? 'betting the stock will fall' : 'making a leveraged bet on'
    stories.push({
      headline: `${t.politician} traded ${optType} ${name}`,
      body: `${t.politician} ${t.transactionType === 'Purchase' ? 'bought' : 'sold'} ${optType} ${name} (${t.ticker}) worth ${t.amount?.text || fmtK(amt)} on ${t.transactionDate || 'unknown date'}. Options are leveraged instruments - ${betDirection}. When a lawmaker with access to non-public policy information trades options, it is a far stronger signal than buying shares. Options have expiration dates, meaning the trader is not just betting on direction but on timing.`,
      category: 'options',
      severity: amt >= 100000 ? 'critical' : 'high',
      politician: t.politician,
      ticker: t.ticker,
      amount: amt,
      date: t.transactionDate || '',
    })
  }

  // ─── Crypto trade stories (without vote cross-reference) ───
  const cryptoTrades = trades
    .filter(t => t.ticker && CRYPTO_TICKERS.has(t.ticker))
    .sort((a, b) => (b.amount?.max || 0) - (a.amount?.max || 0))

  for (const t of cryptoTrades.slice(0, 10)) {
    const amt = t.amount?.max || t.amount?.min || 0
    const action = t.transactionType === 'Purchase' ? 'bought' : 'sold'
    const name = tickerName(t.ticker)
    stories.push({
      headline: `${t.politician} ${action} ${name} while Congress debates crypto regulation`,
      body: `${t.politician} ${action} ${t.amount?.text || fmtK(amt)} of ${name} (${t.ticker}) on ${t.transactionDate || 'unknown date'}. Members of Congress are actively writing cryptocurrency regulation - the GENIUS Act, FIT21, and other bills that will determine the legal framework for digital assets. Trading crypto or crypto-related stocks while having a direct hand in that regulatory outcome is a textbook conflict of interest.`,
      category: 'crypto-vote',
      severity: amt >= 100000 ? 'critical' : amt >= 50000 ? 'high' : 'medium',
      politician: t.politician,
      ticker: t.ticker,
      amount: amt,
      date: t.transactionDate || '',
    })
  }

  // Sort all stories by severity then amount
  const severityOrder = { critical: 0, high: 1, medium: 2 }
  stories.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) return severityOrder[a.severity] - severityOrder[b.severity]
    return b.amount - a.amount
  })

  // Deduplicate by politician + ticker (keep highest severity)
  const seen = new Set<string>()
  const deduplicated = stories.filter(s => {
    const key = `${s.politician}|${s.ticker}|${s.category}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({
    stories: deduplicated.slice(0, 50),
    stats: {
      totalStories: deduplicated.length,
      critical: deduplicated.filter(s => s.severity === 'critical').length,
      high: deduplicated.filter(s => s.severity === 'high').length,
      medium: deduplicated.filter(s => s.severity === 'medium').length,
      byCategory: {
        whale: deduplicated.filter(s => s.category === 'whale').length,
        late: deduplicated.filter(s => s.category === 'late').length,
        options: deduplicated.filter(s => s.category === 'options').length,
        'crypto-vote': deduplicated.filter(s => s.category === 'crypto-vote').length,
        committee: deduplicated.filter(s => s.category === 'committee').length,
        cluster: deduplicated.filter(s => s.category === 'cluster').length,
      },
    },
  })
}
