import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

const ROOT = path.join(process.cwd(), "..")
const COMMITTEES_FILE = path.join(ROOT, "data", "committee-assignments.json")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")

interface SimpleTrade {
  politician: string
  ticker: string | null
  type: string
  amount: { min: number; max: number; text: string }
  transactionDate: string
  year: number
  sourceUrl: string
  sector?: string
}

interface CommitteeConflict {
  politician: string
  trade: SimpleTrade
  committee: string
  committeeCode: string
  role: string // chair, ranking, member
  sector: string // the overlapping sector
  amount: number
}

function loadAllTrades(): SimpleTrade[] {
  const trades: SimpleTrade[] = []

  if (fs.existsSync(CURRENT_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CURRENT_FILE, "utf-8"))
      for (const filing of raw.filings || []) {
        for (const tx of filing.transactions || []) {
          if (!tx.ticker) continue
          trades.push({
            politician: filing.filer?.name?.replace(/^Hon\.\s*/, "") || "Unknown",
            ticker: tx.ticker || null,
            type: tx.transactionType || "Unknown",
            amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
            transactionDate: tx.transactionDate || "",
            year: new Date(tx.transactionDate || filing.filing?.date || "").getFullYear() || 2026,
            sourceUrl: filing.filing?.sourceUrl || "",
          })
        }
      }
    } catch {}
  }

  if (fs.existsSync(HISTORICAL_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(HISTORICAL_FILE, "utf-8"))
      for (const [yearStr, yearData] of Object.entries(raw.years || {})) {
        const yd = yearData as any
        for (const filing of yd.filings || []) {
          for (const tx of filing.transactions || []) {
            if (!tx.ticker) continue
            trades.push({
              politician: filing.filer?.name?.replace(/^Hon\.\s*/, "") || "Unknown",
              ticker: tx.ticker || null,
              type: tx.transactionType || "Unknown",
              amount: tx.amount || { min: 0, max: 0, text: "Unknown" },
              transactionDate: tx.transactionDate || "",
              year: parseInt(yearStr) || 2020,
              sourceUrl: filing.filing?.sourceUrl || "",
            })
          }
        }
      }
    } catch {}
  }

  return trades
}

export async function GET() {
  if (!fs.existsSync(COMMITTEES_FILE)) {
    return NextResponse.json({
      error: "No committee data. Run: node scripts/committee-assignments-fetch.cjs",
      conflicts: [],
      stats: null,
    })
  }

  const committeesData = JSON.parse(fs.readFileSync(COMMITTEES_FILE, "utf-8"))
  const tickerSectors: Record<string, string> = committeesData.tickerSectors || {}
  const polCommittees: Record<string, any> = committeesData.politicianCommittees || {}
  const trades = loadAllTrades()

  // Tag trades with sectors
  for (const t of trades) {
    if (t.ticker) {
      t.sector = tickerSectors[t.ticker.toUpperCase()] || tickerSectors[t.ticker] || undefined
    }
  }

  // Build name normalization: "Hon. Nancy Pelosi" -> multiple keys
  // polCommittees keys are lowercase full names from GovTrack like "rep. nancy pelosi [d-ca12]"
  // Our trades have names like "Nancy Pelosi"
  // We need fuzzy matching

  // Build a lookup from last name -> polCommittee entries
  const lastNameLookup: Record<string, { key: string; data: any }[]> = {}
  for (const [key, data] of Object.entries(polCommittees)) {
    // Extract last name from GovTrack format "Rep. Nancy Pelosi [D-CA12]" or "Sen. John Doe"
    const cleaned = key.replace(/^(rep\.|sen\.)\s*/i, "").replace(/\s*\[.*\]$/, "").trim()
    const parts = cleaned.split(/\s+/)
    const lastName = parts[parts.length - 1]
    if (!lastNameLookup[lastName]) lastNameLookup[lastName] = []
    lastNameLookup[lastName].push({ key, data })
  }

  // Match each trade to committee assignments
  const conflicts: CommitteeConflict[] = []
  const conflictsByPol: Record<string, { total: number; volume: number; committees: Set<string>; tickers: Set<string> }> = {}

  for (const trade of trades) {
    if (!trade.ticker || !trade.sector) continue

    // Find politician's committees by matching name
    const polName = trade.politician.toLowerCase()
    const polParts = polName.split(/\s+/)
    const polLast = polParts[polParts.length - 1]

    const candidates = lastNameLookup[polLast] || []

    for (const candidate of candidates) {
      const polData = candidate.data

      // Check if any of their committee sectors overlap with the trade sector
      const polSectors: string[] = polData.sectors || []
      if (!polSectors.includes(trade.sector)) continue

      // Find which specific committee(s) create the conflict
      for (const comm of polData.committees || []) {
        if ((comm.sectors || []).includes(trade.sector)) {
          const amt = trade.amount.max || trade.amount.min || 0
          conflicts.push({
            politician: polData.name || trade.politician,
            trade,
            committee: comm.name,
            committeeCode: comm.code,
            role: comm.role || 'member',
            sector: trade.sector,
            amount: amt,
          })

          const polKey = (polData.name || trade.politician).toLowerCase()
          if (!conflictsByPol[polKey]) conflictsByPol[polKey] = { total: 0, volume: 0, committees: new Set(), tickers: new Set() }
          conflictsByPol[polKey].total++
          conflictsByPol[polKey].volume += amt
          conflictsByPol[polKey].committees.add(comm.name)
          if (trade.ticker) conflictsByPol[polKey].tickers.add(trade.ticker)
        }
      }
    }
  }

  // Sort by amount descending
  conflicts.sort((a, b) => b.amount - a.amount)

  // Top offenders
  const topOffenders = Object.entries(conflictsByPol)
    .map(([name, data]) => ({
      name: name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      total: data.total,
      volume: data.volume,
      committees: [...data.committees],
      tickers: [...data.tickers],
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 50)

  // Sector breakdown
  const bySector: Record<string, { trades: number; buyVol: number; sellVol: number; politicians: Set<string> }> = {}
  for (const c of conflicts) {
    if (!bySector[c.sector]) bySector[c.sector] = { trades: 0, buyVol: 0, sellVol: 0, politicians: new Set() }
    bySector[c.sector].trades++
    const amt = c.amount
    if (c.trade.type === "Purchase") bySector[c.sector].buyVol += amt
    else if (c.trade.type === "Sale") bySector[c.sector].sellVol += amt
    bySector[c.sector].politicians.add(c.politician)
  }

  const sectorBreakdown = Object.entries(bySector)
    .map(([sector, data]) => ({
      sector,
      trades: data.trades,
      buyVol: data.buyVol,
      sellVol: data.sellVol,
      totalVol: data.buyVol + data.sellVol,
      politicians: data.politicians.size,
    }))
    .sort((a, b) => b.totalVol - a.totalVol)

  // Role breakdown (chairs vs regular members)
  const chairConflicts = conflicts.filter(c => c.role === 'chairman' || c.role === 'chair' || c.role === 'ranking_member')
  const totalVolume = conflicts.reduce((s, c) => s + c.amount, 0)

  return NextResponse.json({
    conflicts: conflicts.slice(0, 500), // Cap at 500 for response size
    stats: {
      totalConflicts: conflicts.length,
      totalVolume,
      uniquePoliticians: Object.keys(conflictsByPol).length,
      chairConflicts: chairConflicts.length,
      tradesWithSector: trades.filter(t => t.sector).length,
      tradesTotal: trades.length,
      sectorCoverage: `${((trades.filter(t => t.sector).length / trades.length) * 100).toFixed(0)}%`,
    },
    topOffenders,
    sectorBreakdown,
    committeeData: {
      lastUpdated: committeesData.lastUpdated,
      totalMembers: committeesData.stats?.uniqueMembers || 0,
      mappedCommittees: committeesData.stats?.mappedCommittees || 0,
    },
  })
}
