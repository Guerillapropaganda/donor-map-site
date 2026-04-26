import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import { canonicalPoliticianName } from "@/lib/donor-map-politician-resolver"

const ROOT = path.join(process.cwd(), "..")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")

interface Trade {
  politician: string
  ticker: string
  type: string // Purchase or Sale
  amount: number // max amount
  amountText: string
  transactionDate: string
  parsedDate: number // epoch ms
  year: number
  sourceUrl: string
}

interface Cluster {
  ticker: string
  direction: "BUY" | "SELL" | "MIXED"
  startDate: string
  endDate: string
  windowDays: number
  trades: Trade[]
  politicians: string[]
  totalVolume: number
  avgAmount: number
  score: number // suspicion score
}

function parseDate(d: string): number {
  if (!d) return 0
  const mdy = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return new Date(parseInt(mdy[3]), parseInt(mdy[1]) - 1, parseInt(mdy[2])).getTime()
  const t = new Date(d).getTime()
  return isNaN(t) ? 0 : t
}

function fmtDate(epoch: number): string {
  if (!epoch) return ""
  const d = new Date(epoch)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function loadAllTrades(): Trade[] {
  const trades: Trade[] = []

  function addFilings(filings: any[], defaultYear: number) {
    for (const filing of filings) {
      for (const tx of filing.transactions || []) {
        if (!tx.ticker) continue
        const amt = tx.amount?.max || tx.amount?.min || 0
        const parsed = parseDate(tx.transactionDate || "")
        if (!parsed) continue
        trades.push({
          politician: canonicalPoliticianName(filing.filer?.name || ""),
          ticker: tx.ticker,
          type: tx.transactionType || "Unknown",
          amount: amt,
          amountText: tx.amount?.text || "",
          transactionDate: tx.transactionDate || "",
          parsedDate: parsed,
          year: new Date(parsed).getFullYear() || defaultYear,
          sourceUrl: filing.filing?.sourceUrl || "",
        })
      }
    }
  }

  if (fs.existsSync(CURRENT_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CURRENT_FILE, "utf-8"))
      addFilings(raw.filings || [], 2026)
    } catch {}
  }

  if (fs.existsSync(HISTORICAL_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(HISTORICAL_FILE, "utf-8"))
      for (const [yearStr, yearData] of Object.entries(raw.years || {})) {
        addFilings((yearData as any).filings || [], parseInt(yearStr))
      }
    } catch {}
  }

  return trades
}

// ─── Clustering algorithm ────────────────────────────────────
// Find groups of 3+ politicians trading the same stock within 7 days

const CLUSTER_WINDOW_DAYS = 7
const MIN_POLITICIANS = 3

function findClusters(trades: Trade[]): Cluster[] {
  // Group trades by ticker
  const byTicker: Record<string, Trade[]> = {}
  for (const t of trades) {
    if (!byTicker[t.ticker]) byTicker[t.ticker] = []
    byTicker[t.ticker].push(t)
  }

  const clusters: Cluster[] = []
  const MS_PER_DAY = 86400000

  for (const [ticker, tickerTrades] of Object.entries(byTicker)) {
    if (tickerTrades.length < MIN_POLITICIANS) continue

    // Sort by date
    const sorted = tickerTrades.sort((a, b) => a.parsedDate - b.parsedDate)

    // Sliding window: for each trade, find all trades within CLUSTER_WINDOW_DAYS
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = sorted[i].parsedDate
      const windowEnd = windowStart + CLUSTER_WINDOW_DAYS * MS_PER_DAY

      const windowTrades: Trade[] = []
      for (let j = i; j < sorted.length && sorted[j].parsedDate <= windowEnd; j++) {
        windowTrades.push(sorted[j])
      }

      // Count unique politicians in this window
      const uniquePols = new Set(windowTrades.map(t => t.politician))
      if (uniquePols.size < MIN_POLITICIANS) continue

      // Deduplicate: only keep this cluster if it's the "best" window starting here
      // (avoid overlapping clusters for the same group)
      const buys = windowTrades.filter(t => t.type === "Purchase").length
      const sells = windowTrades.filter(t => t.type === "Sale").length
      const direction: "BUY" | "SELL" | "MIXED" = buys > sells * 2 ? "BUY" : sells > buys * 2 ? "SELL" : "MIXED"

      const totalVol = windowTrades.reduce((s, t) => s + t.amount, 0)
      const actualDays = Math.max(1, Math.ceil((windowTrades[windowTrades.length - 1].parsedDate - windowTrades[0].parsedDate) / MS_PER_DAY))

      // Score: more politicians + higher volume + tighter window = more suspicious
      const polScore = uniquePols.size * 10
      const volScore = Math.log10(Math.max(totalVol, 1)) * 5
      const tightScore = Math.max(0, (CLUSTER_WINDOW_DAYS - actualDays)) * 3
      const directionBonus = direction !== "MIXED" ? 15 : 0 // coordinated direction is more suspicious
      const score = polScore + volScore + tightScore + directionBonus

      clusters.push({
        ticker,
        direction,
        startDate: fmtDate(windowTrades[0].parsedDate),
        endDate: fmtDate(windowTrades[windowTrades.length - 1].parsedDate),
        windowDays: actualDays,
        trades: windowTrades,
        politicians: [...uniquePols],
        totalVolume: totalVol,
        avgAmount: totalVol / windowTrades.length,
        score,
      })

      // Skip ahead past this cluster to avoid duplicates
      i = Math.max(i, windowTrades.length > 1 ? i + Math.floor(windowTrades.length / 2) : i)
    }
  }

  // Deduplicate overlapping clusters for the same ticker
  // Keep the highest-scoring cluster when there's >50% politician overlap
  const deduplicated: Cluster[] = []
  const sorted = clusters.sort((a, b) => b.score - a.score)

  for (const cluster of sorted) {
    const polSet = new Set(cluster.politicians)
    const isDuplicate = deduplicated.some(existing => {
      if (existing.ticker !== cluster.ticker) return false
      const existingPols = new Set(existing.politicians)
      const overlap = [...polSet].filter(p => existingPols.has(p)).length
      return overlap > Math.min(polSet.size, existingPols.size) * 0.5
    })
    if (!isDuplicate) deduplicated.push(cluster)
  }

  return deduplicated.sort((a, b) => b.score - a.score)
}

// ─── Sudden volume spikes ────────────────────────────────────
// Politician who suddenly trades way more than usual

interface VolumeSurge {
  politician: string
  ticker: string
  recentTrades: number
  recentVolume: number
  historicalAvgVolume: number
  surgeMultiple: number
  period: string
  trades: Trade[]
}

function findVolumeSurges(trades: Trade[]): VolumeSurge[] {
  // Group by politician + ticker
  const byPolTicker: Record<string, Trade[]> = {}
  for (const t of trades) {
    const key = `${t.politician}|${t.ticker}`
    if (!byPolTicker[key]) byPolTicker[key] = []
    byPolTicker[key].push(t)
  }

  const surges: VolumeSurge[] = []
  const MS_90_DAYS = 90 * 86400000

  for (const [key, polTrades] of Object.entries(byPolTicker)) {
    if (polTrades.length < 3) continue
    const [politician, ticker] = key.split("|")

    const sorted = polTrades.sort((a, b) => a.parsedDate - b.parsedDate)
    const latest = sorted[sorted.length - 1].parsedDate
    const cutoff = latest - MS_90_DAYS

    const recent = sorted.filter(t => t.parsedDate >= cutoff)
    const historical = sorted.filter(t => t.parsedDate < cutoff)

    if (recent.length < 2 || historical.length < 1) continue

    const recentVol = recent.reduce((s, t) => s + t.amount, 0)
    const histVol = historical.reduce((s, t) => s + t.amount, 0)
    const histAvg = histVol / Math.max(1, Math.ceil((cutoff - historical[0].parsedDate) / MS_90_DAYS))

    if (histAvg === 0) continue
    const multiple = recentVol / histAvg

    if (multiple >= 3) { // 3x or more surge
      surges.push({
        politician,
        ticker,
        recentTrades: recent.length,
        recentVolume: recentVol,
        historicalAvgVolume: Math.round(histAvg),
        surgeMultiple: Math.round(multiple * 10) / 10,
        period: `${fmtDate(recent[0].parsedDate)} - ${fmtDate(recent[recent.length - 1].parsedDate)}`,
        trades: recent,
      })
    }
  }

  return surges.sort((a, b) => b.surgeMultiple - a.surgeMultiple).slice(0, 50)
}

export async function GET() {
  const trades = loadAllTrades()

  if (trades.length === 0) {
    return NextResponse.json({ error: "No trade data available", clusters: [], surges: [], stats: null })
  }

  const clusters = findClusters(trades)
  const surges = findVolumeSurges(trades)

  // Top coordinated tickers
  const tickerClusters: Record<string, number> = {}
  for (const c of clusters) {
    tickerClusters[c.ticker] = (tickerClusters[c.ticker] || 0) + 1
  }
  const topClusteredTickers = Object.entries(tickerClusters)
    .map(([ticker, count]) => ({ ticker, clusters: count }))
    .sort((a, b) => b.clusters - a.clusters)
    .slice(0, 20)

  // Most frequent cluster participants
  const polClusters: Record<string, number> = {}
  for (const c of clusters) {
    for (const p of c.politicians) {
      polClusters[p] = (polClusters[p] || 0) + 1
    }
  }
  const topClusterPols = Object.entries(polClusters)
    .map(([name, count]) => ({ name, clusters: count }))
    .sort((a, b) => b.clusters - a.clusters)
    .slice(0, 20)

  return NextResponse.json({
    clusters: clusters.slice(0, 100),
    surges,
    stats: {
      totalTrades: trades.length,
      totalClusters: clusters.length,
      totalSurges: surges.length,
      clusterWindow: CLUSTER_WINDOW_DAYS,
      minPoliticians: MIN_POLITICIANS,
      topClusteredTickers,
      topClusterPols,
    },
  })
}
