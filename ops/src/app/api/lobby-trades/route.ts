import { NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"
import * as yaml from "js-yaml"

/**
 * /api/lobby-trades — Cross-reference lobbying entities with stock trades
 *
 * Finds: "Entity X spent $53M lobbying Congress. Politician Y trades Entity X's stock."
 * Connects the money flow: lobby spend → politician → stock trade in lobbying entity
 */

const ROOT = path.join(process.cwd(), "..")
const CONTENT = path.join(ROOT, "content")
const CURRENT_FILE = path.join(ROOT, "data", "financial-disclosures.json")
const HISTORICAL_FILE = path.join(ROOT, "data", "financial-disclosures-historical.json")
const SENATE_FILE = path.join(ROOT, "data", "senate-disclosures-historical.json")
const RELATIONSHIPS_FILE = path.join(ROOT, "data", "relationships.jsonl")

// Map entity names to their stock tickers
// This is the bridge between lobbying entities and traded stocks
const ENTITY_TICKERS: Record<string, string[]> = {
  // Tech
  'Amazon': ['AMZN'], 'Apple': ['AAPL'], 'Google - Alphabet': ['GOOGL', 'GOOG'],
  'Meta - Facebook': ['META'], 'Microsoft': ['MSFT'], 'Oracle': ['ORCL'],
  'Nvidia': ['NVDA'], 'Intel': ['INTC'], 'Salesforce': ['CRM'],
  'Palantir': ['PLTR'], 'Palantir Technologies Political Operation': ['PLTR'],

  // Defense
  'Lockheed Martin': ['LMT'], 'Boeing': ['BA'], 'Boeing Defense': ['BA'],
  'Raytheon (RTX)': ['RTX'], 'Northrop Grumman': ['NOC'], 'General Dynamics': ['GD'],
  'L3Harris Technologies': ['LHX'], 'Leidos': ['LDOS'], 'BAE Systems': ['BA'],
  'Booz Allen Hamilton': ['BAH'],

  // Energy
  'ExxonMobil': ['XOM'], 'Chevron': ['CVX'], 'ConocoPhillips': ['COP'],
  'Marathon Petroleum': ['MPC'], 'Valero Energy': ['VLO'], 'Halliburton': ['HAL'],
  'Occidental Petroleum': ['OXY'], 'Devon Energy': ['DVN'],
  'Southern Company': ['SO'], 'NextEra Energy': ['NEE'], 'Duke Energy': ['DUK'],
  'PG&E': ['PCG'], 'PG&E - Pacific Gas and Electric': ['PCG'],

  // Healthcare / Pharma
  'Pfizer Inc.': ['PFE'], 'Pfizer': ['PFE'],
  'Johnson & Johnson': ['JNJ'], 'Merck': ['MRK'], 'AbbVie': ['ABBV'],
  'Eli Lilly': ['LLY'], 'Gilead Sciences': ['GILD'], 'Moderna': ['MRNA'],
  'Novo Nordisk': ['NVO'],
  'UnitedHealth Group - Optum': ['UNH'], 'Cigna Group': ['CI'],
  'CVS Health - Aetna': ['CVS'], 'Humana': ['HUM'],
  'Hospital Corporation of America - HCA': ['HCA'],
  'Anthem - Elevance Health': ['ELV'],
  'Tenet Healthcare': ['THC'], 'Centene Corporation': ['CNC'],

  // Finance
  'Goldman Sachs': ['GS'], 'JPMorgan': ['JPM'],
  'Blackstone Group': ['BX'],

  // Crypto
  'Coinbase': ['COIN'], 'Fairshake PAC': ['COIN', 'MARA', 'RIOT'],

  // Transport
  'General Motors': ['GM'],

  // Telecom
  'Comcast - NBCUniversal': ['CMCSA'],

  // Food
  'Tyson Foods': ['TSN'],

  // Gig
  'Uber': ['UBER'], 'Lyft': ['LYFT'], 'DoorDash': ['DASH'],
  'Airbnb': ['ABNB'], 'Instacart': ['CART'],
}

interface LobbyEntity {
  name: string
  spend: number
  filings: number
  issues: string[]
  tickers: string[]
}

interface LobbyTradeMatch {
  politician: string
  ticker: string
  tradeType: string
  amount: number
  amountText: string
  tradeDate: string
  entity: string
  lobbySpend: number
  lobbyFilings: number
  lobbyIssues: string[]
}

function loadLobbyingEntities(): LobbyEntity[] {
  const entities: LobbyEntity[] = []

  function walk(dir: string) {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith('.md')) {
          try {
            const text = fs.readFileSync(full, 'utf-8')
            const m = text.match(/^---\n([\s\S]*?)\n---/)
            if (!m) return
            const fm = yaml.load(m[1]) as any
            if (fm['lobbying-spend'] || fm['lobbying-filings']) {
              const title = fm.title || ''
              const tickers = ENTITY_TICKERS[title] || []
              entities.push({
                name: title,
                spend: fm['lobbying-spend'] || 0,
                filings: fm['lobbying-filings'] || 0,
                issues: fm.issues || [],
                tickers,
              })
            }
          } catch {}
        }
      }
    } catch {}
  }

  walk(path.join(CONTENT, 'Donors & Power Networks'))
  return entities
}

function loadDonorPoliticianEdges(): Record<string, string[]> {
  // Map: donor name (lowercase) -> politicians they fund.
  // Reads canonical relationships.jsonl + every data/derived/*.jsonl
  // (2026-04 split — FEC/IRS/USASpending edges moved to per-source files
  // to keep each under GitHub's 100 MB cap).
  const edges: Record<string, string[]> = {}
  const files: string[] = []
  if (fs.existsSync(RELATIONSHIPS_FILE)) files.push(RELATIONSHIPS_FILE)
  const derivedDir = path.join(ROOT, 'data', 'derived')
  if (fs.existsSync(derivedDir)) {
    for (const f of fs.readdirSync(derivedDir).sort()) {
      if (f.endsWith('.jsonl')) files.push(path.join(derivedDir, f))
    }
  }

  for (const file of files) {
    try {
      const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const e = JSON.parse(line)
          if (e.type === 'monetary' || e.type === 'related') {
            const from = (e.from || '').toLowerCase()
            if (!edges[from]) edges[from] = []
            edges[from].push(e.to || '')
          }
        } catch {}
      }
    } catch {}
  }

  return edges
}

function loadAllTrades(): any[] {
  const trades: any[] = []

  function addFilings(filings: any[], defaultYear: number) {
    for (const filing of filings) {
      for (const tx of filing.transactions || []) {
        if (!tx.ticker) continue
        trades.push({
          politician: filing.filer?.name?.replace(/^Hon\.\s*/, '') || 'Unknown',
          ticker: tx.ticker,
          type: tx.transactionType || 'Unknown',
          amount: tx.amount?.max || tx.amount?.min || 0,
          amountText: tx.amount?.text || '',
          date: tx.transactionDate || '',
          chamber: filing.chamber || 'House',
        })
      }
    }
  }

  for (const file of [CURRENT_FILE, HISTORICAL_FILE, SENATE_FILE]) {
    if (!fs.existsSync(file)) continue
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))
      if (raw.filings) addFilings(raw.filings, 2026)
      if (raw.years) {
        for (const yd of Object.values(raw.years as Record<string, any>)) {
          addFilings(yd.filings || [], 2020)
        }
      }
    } catch {}
  }

  return trades
}

export async function GET() {
  const entities = loadLobbyingEntities()
  const donorEdges = loadDonorPoliticianEdges()
  const trades = loadAllTrades()

  // Build ticker -> entity lookup
  const tickerToEntity: Record<string, LobbyEntity[]> = {}
  for (const entity of entities) {
    for (const ticker of entity.tickers) {
      if (!tickerToEntity[ticker]) tickerToEntity[ticker] = []
      tickerToEntity[ticker].push(entity)
    }
  }

  // Find matches: politician traded a stock whose company lobbies Congress
  const matches: LobbyTradeMatch[] = []
  for (const trade of trades) {
    const lobbyEntities = tickerToEntity[trade.ticker]
    if (!lobbyEntities) continue

    for (const entity of lobbyEntities) {
      matches.push({
        politician: trade.politician,
        ticker: trade.ticker,
        tradeType: trade.type,
        amount: trade.amount,
        amountText: trade.amountText,
        tradeDate: trade.date,
        entity: entity.name,
        lobbySpend: entity.spend,
        lobbyFilings: entity.filings,
        lobbyIssues: entity.issues,
      })
    }
  }

  // Sort by lobby spend (highest lobbying entities first)
  matches.sort((a, b) => b.lobbySpend - a.lobbySpend)

  // Aggregate: entity -> { politicians who traded their stock, total trade volume }
  const entitySummary: Record<string, { entity: string; spend: number; filings: number; issues: string[]; tickers: string[]; politicians: Set<string>; trades: number; tradeVolume: number }> = {}
  for (const m of matches) {
    if (!entitySummary[m.entity]) {
      const ent = entities.find(e => e.name === m.entity)!
      entitySummary[m.entity] = { entity: m.entity, spend: m.lobbySpend, filings: m.lobbyFilings, issues: m.lobbyIssues, tickers: ent.tickers, politicians: new Set(), trades: 0, tradeVolume: 0 }
    }
    entitySummary[m.entity].politicians.add(m.politician)
    entitySummary[m.entity].trades++
    entitySummary[m.entity].tradeVolume += m.amount
  }

  const topEntities = Object.values(entitySummary)
    .map(e => ({ ...e, politicians: [...e.politicians], politicianCount: e.politicians.size }))
    .sort((a, b) => b.spend - a.spend)

  // Aggregate: politician -> { entities whose stock they trade, total lobby exposure }
  const polSummary: Record<string, { politician: string; entities: Set<string>; totalLobbyExposure: number; trades: number; tradeVolume: number }> = {}
  for (const m of matches) {
    if (!polSummary[m.politician]) polSummary[m.politician] = { politician: m.politician, entities: new Set(), totalLobbyExposure: 0, trades: 0, tradeVolume: 0 }
    if (!polSummary[m.politician].entities.has(m.entity)) {
      polSummary[m.politician].entities.add(m.entity)
      polSummary[m.politician].totalLobbyExposure += m.lobbySpend
    }
    polSummary[m.politician].trades++
    polSummary[m.politician].tradeVolume += m.amount
  }

  const topPoliticians = Object.values(polSummary)
    .map(p => ({ ...p, entities: [...p.entities], entityCount: p.entities.size }))
    .sort((a, b) => b.totalLobbyExposure - a.totalLobbyExposure)
    .slice(0, 30)

  // Also check: politicians who are FUNDED by an entity AND trade that entity's stock
  const fundedAndTraded: { politician: string; entity: string; ticker: string; lobbySpend: number; tradeCount: number; tradeVolume: number }[] = []
  for (const m of matches) {
    const entityKey = m.entity.toLowerCase()
    const fundedPols = donorEdges[entityKey] || []
    // Check if this politician is funded by this entity
    const isFunded = fundedPols.some(p => p.toLowerCase().includes(m.politician.split(' ').pop()?.toLowerCase() || ''))
    if (isFunded) {
      const existing = fundedAndTraded.find(f => f.politician === m.politician && f.entity === m.entity)
      if (existing) {
        existing.tradeCount++
        existing.tradeVolume += m.amount
      } else {
        fundedAndTraded.push({
          politician: m.politician,
          entity: m.entity,
          ticker: m.ticker,
          lobbySpend: m.lobbySpend,
          tradeCount: 1,
          tradeVolume: m.amount,
        })
      }
    }
  }
  fundedAndTraded.sort((a, b) => b.lobbySpend - a.lobbySpend)

  return NextResponse.json({
    matches: matches.slice(0, 200),
    stats: {
      totalMatches: matches.length,
      entitiesWithTickers: entities.filter(e => e.tickers.length > 0).length,
      entitiesTotal: entities.length,
      tickersCovered: Object.keys(tickerToEntity).length,
      uniquePoliticians: new Set(matches.map(m => m.politician)).size,
      fundedAndTradedCount: fundedAndTraded.length,
    },
    topEntities: topEntities.slice(0, 20),
    topPoliticians,
    fundedAndTraded: fundedAndTraded.slice(0, 20),
  })
}
