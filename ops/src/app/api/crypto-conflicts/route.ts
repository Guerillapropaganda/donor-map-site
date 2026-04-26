import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import { canonicalPoliticianName } from "@/lib/donor-map-politician-resolver"

const ROOT = path.join(process.cwd(), "..")
const VOTES_FILE = path.join(ROOT, "data", "crypto-votes.json")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")

// Same crypto detection as capitol-trades route
const CRYPTO_TICKERS = new Set([
  'GBTC', 'ETHE', 'BITO', 'BITX', 'ARKB', 'IBIT', 'FBTC', 'HODL',
  'BTCO', 'EZBC', 'DEFI', 'BITW', 'BRRR', 'BTCW', 'ETHV', 'CETH',
  'COIN', 'MARA', 'RIOT', 'MSTR', 'HUT', 'BITF', 'CLSK', 'CIFR',
  'IREN', 'CORZ', 'BTBT', 'ARBK', 'SATO', 'WULF', 'DGHI',
  'SQ', 'PYPL', 'SI', 'HOOD',
  'BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'LTC', 'XLM',
  'DOT', 'AVAX', 'LINK', 'BNB', 'ALGO', 'CRYPTO',
])

const CRYPTO_RE = /\b(bitcoin|ethereum|crypto|cryptocurrency|digital\s*asset|virtual\s*currency|blockchain)\b/i

interface SimpleTrade {
  politician: string
  ticker: string | null
  type: string // Purchase or Sale
  amount: { min: number; max: number; text: string }
  transactionDate: string
  sourceUrl: string
}

interface VoteRecord {
  billName: string
  billDisplay: string
  voteDate: string
  chamber: string
  question: string
  result: string
  memberVote: string // + = yea, - = nay, 0 = not voting
  memberVoteLabel: string
}

interface Conflict {
  politician: string
  trade: SimpleTrade
  vote: VoteRecord
  daysBetween: number // negative = trade before vote, positive = trade after vote
  direction: "before" | "after"
  suspicionLevel: "high" | "medium" | "low"
}

function parseDate(d: string): Date | null {
  if (!d) return null
  // Handle MM/DD/YYYY
  const mdy = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return new Date(parseInt(mdy[3]), parseInt(mdy[1]) - 1, parseInt(mdy[2]))
  // Handle YYYY-MM-DD or ISO
  const ymd = new Date(d)
  return isNaN(ymd.getTime()) ? null : ymd
}

function daysDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function loadAllCryptoTrades(): SimpleTrade[] {
  const trades: SimpleTrade[] = []

  function isCrypto(ticker: string | null, desc: string): boolean {
    if (ticker && CRYPTO_TICKERS.has(ticker.toUpperCase())) return true
    if (CRYPTO_RE.test(desc)) return true
    return false
  }

  // Current
  if (fs.existsSync(CURRENT_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CURRENT_FILE, "utf-8"))
      for (const filing of raw.filings || []) {
        for (const tx of filing.transactions || []) {
          if (isCrypto(tx.ticker, tx.assetDescription || "")) {
            trades.push({
              politician: canonicalPoliticianName(filing.filer?.name || ""),
              ticker: tx.ticker || null,
              type: tx.transactionType || "Unknown",
              amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
              transactionDate: tx.transactionDate || "",
              sourceUrl: filing.filing?.sourceUrl || "",
            })
          }
        }
      }
    } catch {}
  }

  // Historical
  if (fs.existsSync(HISTORICAL_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(HISTORICAL_FILE, "utf-8"))
      for (const [, yearData] of Object.entries(raw.years || {})) {
        const yd = yearData as any
        for (const filing of yd.filings || []) {
          for (const tx of filing.transactions || []) {
            if (isCrypto(tx.ticker, tx.assetDescription || "") || tx.isCrypto) {
              trades.push({
                politician: canonicalPoliticianName(filing.filer?.name || ""),
                ticker: tx.ticker || null,
                type: tx.transactionType || "Unknown",
                amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
                transactionDate: tx.transactionDate || "",
                sourceUrl: filing.filing?.sourceUrl || "",
              })
            }
          }
        }
      }
    } catch {}
  }

  return trades
}

// Window: trades within N days of a vote are flagged
const CONFLICT_WINDOW_DAYS = 60

export async function GET() {
  if (!fs.existsSync(VOTES_FILE)) {
    return NextResponse.json({
      error: "No crypto votes data. Run: node scripts/crypto-votes-fetch.cjs",
      conflicts: [],
      bills: [],
      stats: null,
    })
  }

  const votesData = JSON.parse(fs.readFileSync(VOTES_FILE, "utf-8"))
  const trades = loadAllCryptoTrades()

  // Build a lookup: politician name -> their trades (with parsed dates)
  const tradesByPol: Record<string, (SimpleTrade & { parsedDate: Date })[]> = {}
  for (const t of trades) {
    const d = parseDate(t.transactionDate)
    if (!d) continue
    const name = t.politician.toLowerCase()
    if (!tradesByPol[name]) tradesByPol[name] = []
    tradesByPol[name].push({ ...t, parsedDate: d })
  }

  // Build a lookup: politician name variations -> canonical name
  // GovTrack uses "Rep. Nancy Pelosi [D-CA12]" style, our trades use "Nancy Pelosi"
  // We normalize both to lowercase for matching

  const conflicts: Conflict[] = []
  const billSummaries: any[] = []

  for (const bill of votesData.billsWithVotes || []) {
    const billInfo = {
      name: bill.knownName || bill.title || bill.displayNumber,
      display: bill.displayNumber || '',
      status: bill.status || '',
      introduced: bill.introduced || '',
      sponsor: bill.sponsor?.name || '',
      votesCount: bill.votes?.length || 0,
    }
    billSummaries.push(billInfo)

    for (const vote of bill.votes || []) {
      const voteDate = parseDate(vote.date)
      if (!voteDate) continue

      for (const voter of vote.voters || []) {
        // Try to match voter to our trade data
        // Normalize: "Rep. Josh Gottheimer" -> "josh gottheimer"
        const voterName = (voter.name || "")
          .replace(/^(Rep\.|Sen\.|Hon\.)\s*/i, "")
          .replace(/\s*\[.*\]$/, "")
          .trim()
          .toLowerCase()

        // Also try last name match for robustness
        const lastName = voterName.split(/\s+/).pop() || ""

        // Find matching trades
        const matchingTrades = tradesByPol[voterName] || []

        // If no exact match, try partial match on last name
        let additionalTrades: typeof matchingTrades = []
        if (matchingTrades.length === 0 && lastName.length > 2) {
          for (const [polName, polTrades] of Object.entries(tradesByPol)) {
            if (polName.includes(lastName) && polName !== voterName) {
              additionalTrades = additionalTrades.concat(polTrades)
            }
          }
        }

        const allMatches = [...matchingTrades, ...additionalTrades]

        for (const trade of allMatches) {
          const diff = daysDiff(trade.parsedDate, voteDate)

          if (Math.abs(diff) <= CONFLICT_WINDOW_DAYS) {
            // Determine suspicion level
            // High: trade 1-7 days BEFORE the vote (insider knowledge)
            // Medium: trade 8-30 days before OR 1-14 days after
            // Low: wider window
            let suspicionLevel: "high" | "medium" | "low" = "low"
            if (diff >= -7 && diff < 0) suspicionLevel = "high"
            else if (diff >= -30 && diff < 0) suspicionLevel = "medium"
            else if (diff > 0 && diff <= 14) suspicionLevel = "medium"

            conflicts.push({
              politician: trade.politician,
              trade: {
                politician: trade.politician,
                ticker: trade.ticker,
                type: trade.type,
                amount: trade.amount,
                transactionDate: trade.transactionDate,
                sourceUrl: trade.sourceUrl,
              },
              vote: {
                billName: bill.knownName || bill.title || '',
                billDisplay: bill.displayNumber || '',
                voteDate: vote.date,
                chamber: vote.chamber,
                question: vote.question || '',
                result: vote.result || '',
                memberVote: voter.vote,
                memberVoteLabel: voter.voteLabel,
              },
              daysBetween: diff,
              direction: diff <= 0 ? "before" : "after",
              suspicionLevel,
            })
          }
        }
      }
    }
  }

  // Sort by suspicion level then by days proximity
  const levelOrder = { high: 0, medium: 1, low: 2 }
  conflicts.sort((a, b) => {
    if (levelOrder[a.suspicionLevel] !== levelOrder[b.suspicionLevel]) {
      return levelOrder[a.suspicionLevel] - levelOrder[b.suspicionLevel]
    }
    return Math.abs(a.daysBetween) - Math.abs(b.daysBetween)
  })

  // Stats
  const uniquePols = new Set(conflicts.map(c => c.politician))
  const highConflicts = conflicts.filter(c => c.suspicionLevel === "high")
  const medConflicts = conflicts.filter(c => c.suspicionLevel === "medium")

  return NextResponse.json({
    conflicts,
    bills: billSummaries,
    stats: {
      totalConflicts: conflicts.length,
      highSuspicion: highConflicts.length,
      mediumSuspicion: medConflicts.length,
      lowSuspicion: conflicts.length - highConflicts.length - medConflicts.length,
      uniquePoliticians: uniquePols.size,
      cryptoTradesTotal: trades.length,
      billsWithVotes: (votesData.billsWithVotes || []).length,
      windowDays: CONFLICT_WINDOW_DAYS,
    },
    votesLastUpdated: votesData.lastUpdated || null,
  })
}
