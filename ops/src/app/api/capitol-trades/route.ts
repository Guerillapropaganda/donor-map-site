import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

const ROOT = path.join(process.cwd(), "..")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")
const SENATE_FILE = path.join(ROOT, "data", "senate-disclosures-historical.json")

// ─── Crypto Tier System ───────────────────────────────────────
// Tier 1: Direct crypto holdings (Bitcoin, Ethereum, etc.)
// Tier 2: Crypto ETFs (pure crypto exposure vehicles)
// Tier 3: Crypto companies (revenue primarily from crypto)
// Tier 4: Crypto-adjacent (touch crypto but not core business)
//
// Tiers 1-3 are shown by default. Tier 4 is opt-in because
// buying PayPal isn't the same signal as buying Bitcoin.

type CryptoTier = 'direct' | 'etf' | 'company' | 'adjacent'

interface CryptoTickerInfo {
  name: string
  tier: CryptoTier
}

const CRYPTO_TICKER_DB: Record<string, CryptoTickerInfo> = {
  // Tier 1: Direct crypto
  BTC:    { name: 'Bitcoin',              tier: 'direct' },
  ETH:    { name: 'Ethereum',             tier: 'direct' },
  SOL:    { name: 'Solana',               tier: 'direct' },
  ADA:    { name: 'Cardano',              tier: 'direct' },
  DOGE:   { name: 'Dogecoin',             tier: 'direct' },
  XRP:    { name: 'Ripple',               tier: 'direct' },
  LTC:    { name: 'Litecoin',             tier: 'direct' },
  XLM:    { name: 'Stellar',              tier: 'direct' },
  DOT:    { name: 'Polkadot',             tier: 'direct' },
  AVAX:   { name: 'Avalanche',            tier: 'direct' },
  LINK:   { name: 'Chainlink',            tier: 'direct' },
  BNB:    { name: 'BNB',                  tier: 'direct' },
  ALGO:   { name: 'Algorand',             tier: 'direct' },
  CRYPTO: { name: 'Crypto (unspecified)',  tier: 'direct' },

  // Tier 2: Crypto ETFs
  GBTC: { name: 'Grayscale Bitcoin Trust',       tier: 'etf' },
  ETHE: { name: 'Grayscale Ethereum Trust',      tier: 'etf' },
  BITO: { name: 'ProShares Bitcoin ETF',         tier: 'etf' },
  BITX: { name: 'Volatility Shares 2x Bitcoin',  tier: 'etf' },
  ARKB: { name: 'ARK 21Shares Bitcoin ETF',      tier: 'etf' },
  IBIT: { name: 'iShares Bitcoin Trust',         tier: 'etf' },
  FBTC: { name: 'Fidelity Wise Origin Bitcoin',  tier: 'etf' },
  HODL: { name: 'VanEck Bitcoin Trust',          tier: 'etf' },
  BTCO: { name: 'Invesco Galaxy Bitcoin ETF',    tier: 'etf' },
  EZBC: { name: 'Franklin Bitcoin ETF',          tier: 'etf' },
  DEFI: { name: 'Hashdex Bitcoin ETF',           tier: 'etf' },
  BITW: { name: 'Bitwise 10 Crypto Index',       tier: 'etf' },
  BRRR: { name: 'Valkyrie Bitcoin Fund',         tier: 'etf' },
  BTCW: { name: 'WisdomTree Bitcoin Fund',       tier: 'etf' },
  ETHV: { name: 'VanEck Ethereum Trust',         tier: 'etf' },
  CETH: { name: 'Bitwise Ethereum ETF',          tier: 'etf' },

  // Tier 3: Crypto companies (revenue primarily from crypto)
  COIN: { name: 'Coinbase',          tier: 'company' },
  MARA: { name: 'Marathon Digital',   tier: 'company' },
  RIOT: { name: 'Riot Platforms',     tier: 'company' },
  MSTR: { name: 'MicroStrategy',     tier: 'company' },
  HUT:  { name: 'Hut 8 Mining',      tier: 'company' },
  BITF: { name: 'Bitfarms',          tier: 'company' },
  CLSK: { name: 'CleanSpark',        tier: 'company' },
  CIFR: { name: 'Cipher Mining',     tier: 'company' },
  IREN: { name: 'Iris Energy',       tier: 'company' },
  CORZ: { name: 'Core Scientific',   tier: 'company' },
  BTBT: { name: 'Bit Digital',       tier: 'company' },
  ARBK: { name: 'Argo Blockchain',   tier: 'company' },
  WULF: { name: 'TeraWulf',          tier: 'company' },
  DGHI: { name: 'Digihost',          tier: 'company' },

  // Tier 4: Crypto-adjacent (not core business)
  SQ:   { name: 'Block (Square)',      tier: 'adjacent' },
  PYPL: { name: 'PayPal',             tier: 'adjacent' },
  SI:   { name: 'Silvergate Capital',  tier: 'adjacent' },
  HOOD: { name: 'Robinhood',          tier: 'adjacent' },
}

const CRYPTO_TICKERS = new Set(Object.keys(CRYPTO_TICKER_DB))

const CRYPTO_ASSET_RE = /\b(bitcoin|ethereum|crypto|cryptocurrency|digital\s*asset|digital\s*currency|virtual\s*currency|blockchain|solana|cardano|dogecoin|ripple|xrp|grayscale.*bitcoin|grayscale.*ethereum|proshares.*bitcoin)\b/i

function isCryptoTrade(ticker: string | null, asset: string): boolean {
  if (ticker && CRYPTO_TICKERS.has(ticker.toUpperCase())) return true
  if (asset && CRYPTO_ASSET_RE.test(asset)) return true
  return false
}

function getCryptoInfo(ticker: string | null, asset: string): { tier: CryptoTier; category: string } | null {
  if (ticker) {
    const info = CRYPTO_TICKER_DB[ticker.toUpperCase()]
    if (info) return { tier: info.tier, category: info.name }
  }
  if (asset && CRYPTO_ASSET_RE.test(asset)) return { tier: 'direct', category: 'Crypto (from description)' }
  return null
}

interface Trade {
  politician: string
  chamber: string
  state: string
  district: string
  ticker: string | null
  asset: string
  assetType: string // Stock, Crypto, Options, Bond, Fund, Real Estate, Commodity
  type: string
  amount: { min: number; max: number; text: string }
  owner: string
  transactionDate: string
  filingDate: string
  year: number
  sourceUrl: string
  isCrypto: boolean
  cryptoTier?: CryptoTier
  cryptoCategory?: string
  isOptions: boolean
  optionType?: string | null // call or put
  isWhaleTrade: boolean
  filingDelayDays?: number
  isLateDisclosure: boolean
}

function enrichTrade(trade: Trade): Trade {
  const crypto = trade.isCrypto || isCryptoTrade(trade.ticker, trade.asset)
  const info = crypto ? getCryptoInfo(trade.ticker, trade.asset) : null
  return {
    ...trade,
    isCrypto: crypto,
    cryptoTier: info?.tier,
    cryptoCategory: info?.category,
    assetType: trade.assetType || (crypto ? 'Crypto' : 'Stock'),
  }
}

function loadCurrentTrades(): Trade[] {
  if (!fs.existsSync(CURRENT_FILE)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(CURRENT_FILE, "utf-8"))
    const trades: Trade[] = []
    for (const filing of raw.filings || []) {
      for (const tx of filing.transactions || []) {
        trades.push(enrichTrade({
          politician: filing.filer?.name?.replace(/^Hon\.\s*/, "") || "Unknown",
          chamber: filing.chamber || "House",
          state: filing.filer?.state || "",
          district: filing.filer?.district || "",
          ticker: tx.ticker || null,
          asset: tx.assetDescription?.slice(0, 120) || "",
          assetType: tx.assetType || "Stock",
          type: tx.transactionType || "Unknown",
          amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
          owner: tx.owner || "Self",
          transactionDate: tx.transactionDate || "",
          filingDate: filing.filing?.date || "",
          year: new Date(tx.transactionDate || filing.filing?.date || "").getFullYear() || 2026,
          sourceUrl: filing.filing?.sourceUrl || "",
          isCrypto: tx.isCrypto || false,
          isOptions: tx.isOptions || false,
          optionType: tx.optionType || null,
          isWhaleTrade: tx.isWhaleTrade || (tx.amount?.max >= 500000) || false,
          filingDelayDays: tx.filingDelayDays,
          isLateDisclosure: tx.isLateDisclosure || false,
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
          trades.push(enrichTrade({
            politician: filing.filer?.name?.replace(/^Hon\.\s*/, "") || "Unknown",
            chamber: filing.chamber || "House",
            state: filing.filer?.state || "",
            district: filing.filer?.district || "",
            ticker: tx.ticker || null,
            asset: tx.assetDescription?.slice(0, 120) || "",
            assetType: tx.assetType || "Stock",
            type: tx.transactionType || "Unknown",
            amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
            owner: tx.owner || "Self",
            transactionDate: tx.transactionDate || "",
            filingDate: filing.filing?.date || "",
            year: parseInt(yearStr) || 2020,
            sourceUrl: filing.filing?.sourceUrl || "",
            isCrypto: tx.isCrypto || false,
            isOptions: tx.isOptions || false,
            optionType: tx.optionType || null,
            isWhaleTrade: tx.isWhaleTrade || (tx.amount?.max >= 500000) || false,
            filingDelayDays: tx.filingDelayDays,
            isLateDisclosure: tx.isLateDisclosure || false,
          }))
        }
      }
    }
    return trades
  } catch {
    return []
  }
}

function loadSenateTrades(): Trade[] {
  if (!fs.existsSync(SENATE_FILE)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(SENATE_FILE, "utf-8"))
    const trades: Trade[] = []
    for (const [yearStr, yearData] of Object.entries(raw.years || {})) {
      const yd = yearData as any
      for (const filing of yd.filings || []) {
        for (const tx of filing.transactions || []) {
          trades.push(enrichTrade({
            politician: `${filing.filer?.firstName || ''} ${filing.filer?.lastName || ''}`.trim() || "Unknown",
            chamber: "Senate",
            state: filing.filer?.state || "",
            district: "",
            ticker: tx.ticker || null,
            asset: tx.assetDescription?.slice(0, 120) || "",
            assetType: tx.assetType || "Stock",
            type: tx.transactionType || "Unknown",
            amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
            owner: tx.owner || "Self",
            transactionDate: tx.transactionDate || "",
            filingDate: filing.filing?.date || "",
            year: parseInt(yearStr) || 2020,
            sourceUrl: filing.filing?.sourceUrl || "",
            isCrypto: tx.isCrypto || false,
            isOptions: tx.isOptions || false,
            optionType: tx.optionType || null,
            isWhaleTrade: tx.isWhaleTrade || (tx.amount?.max >= 500000) || false,
            filingDelayDays: tx.filingDelayDays,
            isLateDisclosure: tx.isLateDisclosure || false,
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
    trades = trades.concat(loadSenateTrades())
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
  const cryptoTickers: Record<string, { buys: number; sells: number; buyAmt: number; sellAmt: number; category: string; tier: CryptoTier }> = {}
  const cryptoTraders: Record<string, { buys: number; sells: number; buyAmt: number; sellAmt: number; total: number; tickers: Set<string>; tiers: Set<CryptoTier> }> = {}
  const tierStats: Record<CryptoTier, { trades: number; buyAmt: number; sellAmt: number }> = {
    direct: { trades: 0, buyAmt: 0, sellAmt: 0 },
    etf: { trades: 0, buyAmt: 0, sellAmt: 0 },
    company: { trades: 0, buyAmt: 0, sellAmt: 0 },
    adjacent: { trades: 0, buyAmt: 0, sellAmt: 0 },
  }
  let cryptoBuys = 0, cryptoSells = 0, cryptoBuyAmt = 0, cryptoSellAmt = 0

  // New enhanced stats
  let optionsCount = 0, whaleCount = 0, lateCount = 0
  const assetTypes: Record<string, number> = {}
  const lateDisclosures: { politician: string; ticker: string | null; type: string; amount: number; delay: number; date: string }[] = []
  const whaleTrades: { politician: string; ticker: string | null; type: string; amount: number; date: string }[] = []

  for (const t of trades) {
    if (t.type === "Purchase") totalBuys++
    else if (t.type === "Sale") totalSells++

    // Track asset types
    const at = t.assetType || 'Stock'
    assetTypes[at] = (assetTypes[at] || 0) + 1

    // Options
    if (t.isOptions) optionsCount++

    // Whale trades
    if (t.isWhaleTrade) {
      whaleCount++
      whaleTrades.push({ politician: t.politician, ticker: t.ticker, type: t.type, amount: t.amount.max || t.amount.min || 0, date: t.transactionDate })
    }

    // Late disclosures
    if (t.isLateDisclosure && t.filingDelayDays) {
      lateCount++
      lateDisclosures.push({ politician: t.politician, ticker: t.ticker, type: t.type, amount: t.amount.max || t.amount.min || 0, delay: t.filingDelayDays, date: t.transactionDate })
    }

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
      const tier = t.cryptoTier || 'direct'
      if (!cryptoTickers[t.ticker]) cryptoTickers[t.ticker] = { buys: 0, sells: 0, buyAmt: 0, sellAmt: 0, category: t.cryptoCategory || t.ticker, tier }
      const ct = cryptoTickers[t.ticker]
      const amt = t.amount.max || t.amount.min || 0
      if (t.type === "Purchase") { ct.buys++; ct.buyAmt += amt; cryptoBuys++; cryptoBuyAmt += amt }
      else if (t.type === "Sale") { ct.sells++; ct.sellAmt += amt; cryptoSells++; cryptoSellAmt += amt }

      // Tier stats
      tierStats[tier].trades++
      if (t.type === "Purchase") tierStats[tier].buyAmt += amt
      else if (t.type === "Sale") tierStats[tier].sellAmt += amt

      if (!cryptoTraders[t.politician]) cryptoTraders[t.politician] = { buys: 0, sells: 0, buyAmt: 0, sellAmt: 0, total: 0, tickers: new Set(), tiers: new Set() }
      const cp = cryptoTraders[t.politician]
      cp.total++
      cp.tickers.add(t.ticker)
      cp.tiers.add(tier)
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
    .map(([name, data]) => ({ name, buys: data.buys, sells: data.sells, buyAmt: data.buyAmt, sellAmt: data.sellAmt, total: data.total, tickers: [...data.tickers], tiers: [...data.tiers] }))
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
      tiers: tierStats,
    },
    enhanced: {
      optionsCount,
      whaleCount,
      lateDisclosureCount: lateCount,
      assetTypes,
      whaleTrades: whaleTrades.sort((a, b) => b.amount - a.amount).slice(0, 50),
      lateDisclosures: lateDisclosures.sort((a, b) => b.delay - a.delay).slice(0, 50),
    },
    sources: {
      current: currentExists,
      historical: historicalExists,
      historicalYears,
    },
  })
}
