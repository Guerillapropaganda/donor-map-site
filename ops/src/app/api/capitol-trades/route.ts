import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

const ROOT = path.join(process.cwd(), "..")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")

// Crypto ETFs and crypto-company stocks
const CRYPTO_TICKERS = new Set([
  // Direct crypto ETFs
  'GBTC', 'ETHE', 'BITO', 'BITX', 'ARKB', 'IBIT', 'FBTC', 'HODL',
  'BTCO', 'EZBC', 'DEFI', 'BITW', 'BRRR', 'BTCW', 'ETHV', 'CETH',
  // Crypto companies
  'COIN', 'MARA', 'RIOT', 'MSTR', 'HUT', 'BITF', 'CLSK', 'CIFR',
  'IREN', 'CORZ', 'BTBT', 'ARBK', 'SATO', 'WULF', 'DGHI',
  // Crypto-adjacent
  'SQ', 'PYPL', 'SI', 'HOOD',
  // Direct crypto pseudo-tickers (from parser)
  'BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'LTC', 'XLM',
  'DOT', 'AVAX', 'LINK', 'BNB', 'ALGO', 'CRYPTO',
])

const CRYPTO_ASSET_RE = /\b(bitcoin|ethereum|crypto|cryptocurrency|digital\s*asset|digital\s*currency|virtual\s*currency|blockchain|solana|cardano|dogecoin|ripple|xrp|grayscale.*bitcoin|grayscale.*ethereum|proshares.*bitcoin)\b/i

function isCryptoTrade(ticker: string | null, asset: string): boolean {
  if (ticker && CRYPTO_TICKERS.has(ticker.toUpperCase())) return true
  if (asset && CRYPTO_ASSET_RE.test(asset)) return true
  return false
}

// Crypto ticker categorization for display
const CRYPTO_CATEGORIES: Record<string, string> = {
  // Direct crypto
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', ADA: 'Cardano',
  DOGE: 'Dogecoin', XRP: 'Ripple', LTC: 'Litecoin', XLM: 'Stellar',
  DOT: 'Polkadot', AVAX: 'Avalanche', LINK: 'Chainlink', BNB: 'BNB',
  ALGO: 'Algorand', CRYPTO: 'Crypto (unspecified)',
  // ETFs
  GBTC: 'Grayscale Bitcoin Trust', ETHE: 'Grayscale Ethereum Trust',
  BITO: 'ProShares Bitcoin ETF', BITX: 'Volatility Shares 2x Bitcoin',
  ARKB: 'ARK 21Shares Bitcoin ETF', IBIT: 'iShares Bitcoin Trust',
  FBTC: 'Fidelity Wise Origin Bitcoin', HODL: 'VanEck Bitcoin Trust',
  BTCO: 'Invesco Galaxy Bitcoin ETF', EZBC: 'Franklin Bitcoin ETF',
  DEFI: 'Hashdex Bitcoin ETF', BITW: 'Bitwise 10 Crypto Index',
  BRRR: 'Valkyrie Bitcoin Fund', BTCW: 'WisdomTree Bitcoin Fund',
  ETHV: 'VanEck Ethereum Trust', CETH: 'Bitwise Ethereum ETF',
  // Companies
  COIN: 'Coinbase', MARA: 'Marathon Digital', RIOT: 'Riot Platforms',
  MSTR: 'MicroStrategy', HUT: 'Hut 8 Mining', BITF: 'Bitfarms',
  CLSK: 'CleanSpark', CIFR: 'Cipher Mining', IREN: 'Iris Energy',
  CORZ: 'Core Scientific', BTBT: 'Bit Digital', ARBK: 'Argo Blockchain',
  WULF: 'TeraWulf', DGHI: 'Digihost',
  // Crypto-adjacent
  SQ: 'Block (Square)', PYPL: 'PayPal', SI: 'Silvergate Capital',
  HOOD: 'Robinhood',
}

interface Trade {
  politician: string
  chamber: string
  state: string
  district: string
  ticker: string | null
  asset: string
  type: string
  amount: { min: number; max: number; text: string }
  owner: string
  transactionDate: string
  filingDate: string
  year: number
  sourceUrl: string
  isCrypto: boolean
  cryptoCategory?: string
}

function tagCrypto(trade: Trade): Trade {
  const crypto = trade.isCrypto || isCryptoTrade(trade.ticker, trade.asset)
  return {
    ...trade,
    isCrypto: crypto,
    cryptoCategory: crypto && trade.ticker ? (CRYPTO_CATEGORIES[trade.ticker.toUpperCase()] || trade.ticker) : undefined,
  }
}

function loadCurrentTrades(): Trade[] {
  if (!fs.existsSync(CURRENT_FILE)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(CURRENT_FILE, "utf-8"))
    const trades: Trade[] = []
    for (const filing of raw.filings || []) {
      for (const tx of filing.transactions || []) {
        trades.push(tagCrypto({
          politician: filing.filer?.name?.replace(/^Hon\.\s*/, "") || "Unknown",
          chamber: filing.chamber || "House",
          state: filing.filer?.state || "",
          district: filing.filer?.district || "",
          ticker: tx.ticker || null,
          asset: tx.assetDescription?.slice(0, 120) || "",
          type: tx.transactionType || "Unknown",
          amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
          owner: tx.owner || "Self",
          transactionDate: tx.transactionDate || "",
          filingDate: filing.filing?.date || "",
          year: new Date(tx.transactionDate || filing.filing?.date || "").getFullYear() || 2026,
          sourceUrl: filing.filing?.sourceUrl || "",
          isCrypto: tx.isCrypto || false,
        }))
      }
    }
    return trades
  } catch {
    return []
  }
}

function loadHistoricalTrades(): Trade[] {
  if (!fs.existsSync(HISTORICAL_FILE)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(HISTORICAL_FILE, "utf-8"))
    const trades: Trade[] = []
    for (const [yearStr, yearData] of Object.entries(raw.years || {})) {
      const yd = yearData as any
      for (const filing of yd.filings || []) {
        for (const tx of filing.transactions || []) {
          trades.push(tagCrypto({
            politician: filing.filer?.name?.replace(/^Hon\.\s*/, "") || "Unknown",
            chamber: filing.chamber || "House",
            state: filing.filer?.state || "",
            district: filing.filer?.district || "",
            ticker: tx.ticker || null,
            asset: tx.assetDescription?.slice(0, 120) || "",
            type: tx.transactionType || "Unknown",
            amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
            owner: tx.owner || "Self",
            transactionDate: tx.transactionDate || "",
            filingDate: filing.filing?.date || "",
            year: parseInt(yearStr) || 2020,
            sourceUrl: filing.filing?.sourceUrl || "",
            isCrypto: tx.isCrypto || false,
          }))
        }
      }
    }
    return trades
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get("source") || "all" // "current", "historical", "all"

  let trades: Trade[] = []

  if (source === "current" || source === "all") {
    trades = trades.concat(loadCurrentTrades())
  }
  if (source === "historical" || source === "all") {
    trades = trades.concat(loadHistoricalTrades())
  }

  // Deduplicate by politician + ticker + date + type
  const seen = new Set<string>()
  trades = trades.filter(t => {
    const key = `${t.politician}|${t.ticker}|${t.transactionDate}|${t.type}|${t.amount.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by date descending
  trades.sort((a, b) => {
    const da = new Date(a.transactionDate).getTime() || 0
    const db = new Date(b.transactionDate).getTime() || 0
    return db - da
  })

  // Compute stats
  const tickers: Record<string, { buys: number; sells: number; buyAmt: number; sellAmt: number }> = {}
  const politicians: Record<string, { buys: number; sells: number; total: number }> = {}
  let totalBuys = 0, totalSells = 0

  // Crypto stats
  const cryptoTickers: Record<string, { buys: number; sells: number; buyAmt: number; sellAmt: number; category: string }> = {}
  const cryptoTraders: Record<string, { buys: number; sells: number; buyAmt: number; sellAmt: number; total: number; tickers: Set<string> }> = {}
  let cryptoBuys = 0, cryptoSells = 0, cryptoBuyAmt = 0, cryptoSellAmt = 0

  for (const t of trades) {
    if (t.type === "Purchase") totalBuys++
    else if (t.type === "Sale") totalSells++

    if (t.ticker) {
      if (!tickers[t.ticker]) tickers[t.ticker] = { buys: 0, sells: 0, buyAmt: 0, sellAmt: 0 }
      const tk = tickers[t.ticker]
      if (t.type === "Purchase") { tk.buys++; tk.buyAmt += t.amount.max || t.amount.min || 0 }
      else if (t.type === "Sale") { tk.sells++; tk.sellAmt += t.amount.max || t.amount.min || 0 }
    }

    if (!politicians[t.politician]) politicians[t.politician] = { buys: 0, sells: 0, total: 0 }
    const pol = politicians[t.politician]
    pol.total++
    if (t.type === "Purchase") pol.buys++
    else if (t.type === "Sale") pol.sells++

    // Crypto tracking
    if (t.isCrypto && t.ticker) {
      if (!cryptoTickers[t.ticker]) cryptoTickers[t.ticker] = { buys: 0, sells: 0, buyAmt: 0, sellAmt: 0, category: t.cryptoCategory || t.ticker }
      const ct = cryptoTickers[t.ticker]
      const amt = t.amount.max || t.amount.min || 0
      if (t.type === "Purchase") { ct.buys++; ct.buyAmt += amt; cryptoBuys++; cryptoBuyAmt += amt }
      else if (t.type === "Sale") { ct.sells++; ct.sellAmt += amt; cryptoSells++; cryptoSellAmt += amt }

      if (!cryptoTraders[t.politician]) cryptoTraders[t.politician] = { buys: 0, sells: 0, buyAmt: 0, sellAmt: 0, total: 0, tickers: new Set() }
      const cp = cryptoTraders[t.politician]
      cp.total++
      cp.tickers.add(t.ticker)
      if (t.type === "Purchase") { cp.buys++; cp.buyAmt += amt }
      else if (t.type === "Sale") { cp.sells++; cp.sellAmt += amt }
    }
  }

  // Top tickers by volume
  const topTickers = Object.entries(tickers)
    .map(([ticker, data]) => ({ ticker, ...data, total: data.buys + data.sells, volume: data.buyAmt + data.sellAmt }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 50)

  // Top traders
  const topTraders = Object.entries(politicians)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 50)

  // Available years
  const years = [...new Set(trades.map(t => t.year).filter(y => y > 2000))].sort()

  // File status
  const currentExists = fs.existsSync(CURRENT_FILE)
  const historicalExists = fs.existsSync(HISTORICAL_FILE)
  let historicalYears: number[] = []
  if (historicalExists) {
    try {
      const raw = JSON.parse(fs.readFileSync(HISTORICAL_FILE, "utf-8"))
      historicalYears = Object.keys(raw.years || {}).map(Number).sort()
    } catch {}
  }

  // Crypto top tickers
  const topCryptoTickers = Object.entries(cryptoTickers)
    .map(([ticker, data]) => ({ ticker, ...data, total: data.buys + data.sells, volume: data.buyAmt + data.sellAmt }))
    .sort((a, b) => b.volume - a.volume)

  // Crypto top traders (serialize Sets)
  const topCryptoTraders = Object.entries(cryptoTraders)
    .map(([name, data]) => ({ name, buys: data.buys, sells: data.sells, buyAmt: data.buyAmt, sellAmt: data.sellAmt, total: data.total, tickers: [...data.tickers] }))
    .sort((a, b) => (b.buyAmt + b.sellAmt) - (a.buyAmt + a.sellAmt))

  return NextResponse.json({
    trades,
    stats: {
      totalTrades: trades.length,
      totalBuys,
      totalSells,
      uniqueTickers: Object.keys(tickers).length,
      uniquePoliticians: Object.keys(politicians).length,
      years,
    },
    topTickers,
    topTraders,
    crypto: {
      totalTrades: cryptoBuys + cryptoSells,
      buys: cryptoBuys,
      sells: cryptoSells,
      buyVolume: cryptoBuyAmt,
      sellVolume: cryptoSellAmt,
      uniqueTickers: Object.keys(cryptoTickers).length,
      uniqueTraders: Object.keys(cryptoTraders).length,
      topTickers: topCryptoTickers,
      topTraders: topCryptoTraders,
    },
    sources: {
      current: currentExists,
      historical: historicalExists,
      historicalYears,
    },
  })
}
