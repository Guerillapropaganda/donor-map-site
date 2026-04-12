import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

const ROOT = path.join(process.cwd(), "..")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")

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
}

function loadCurrentTrades(): Trade[] {
  if (!fs.existsSync(CURRENT_FILE)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(CURRENT_FILE, "utf-8"))
    const trades: Trade[] = []
    for (const filing of raw.filings || []) {
      for (const tx of filing.transactions || []) {
        trades.push({
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
        })
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
          trades.push({
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
          })
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
    sources: {
      current: currentExists,
      historical: historicalExists,
      historicalYears,
    },
  })
}
