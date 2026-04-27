"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { PageHeader } from "@/components/PageHeader"
import { SavedViewsBar } from "@/components/SavedViewsBar"

type CryptoTier = 'direct' | 'etf' | 'company' | 'adjacent'

// Filter snapshot stored + restored by SavedViewsBar (deferred audit
// item #10). Includes everything that affects what David is looking at:
// active tab, all search/filter inputs, table sort + active crypto tiers.
// Excludes data state (trades, stats, ...) and ephemeral UI state (loading).
interface CapitolTradesViewSnapshot {
  tab: string
  search: string
  chamber: string
  tradeType: string
  owner: string
  flowTicker: string
  yearFilter: string
  amountFilter: string
  flagFilter: string
  activeTiers: CryptoTier[]
  sortField: string
  sortDir: number
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
  isCrypto?: boolean
  cryptoTier?: CryptoTier
  cryptoCategory?: string
}

interface CryptoStats {
  totalTrades: number
  buys: number
  sells: number
  buyVolume: number
  sellVolume: number
  uniqueTickers: number
  uniqueTraders: number
  topTickers: { ticker: string; buys: number; sells: number; buyAmt: number; sellAmt: number; total: number; volume: number; category: string; tier: CryptoTier }[]
  topTraders: { name: string; buys: number; sells: number; buyAmt: number; sellAmt: number; total: number; tickers: string[]; tiers: CryptoTier[] }[]
  tiers: Record<CryptoTier, { trades: number; buyAmt: number; sellAmt: number }>
}

const TIER_LABELS: Record<CryptoTier, string> = { direct: 'Direct Crypto', etf: 'Crypto ETFs', company: 'Crypto Companies', adjacent: 'Crypto-Adjacent' }
const TIER_COLORS: Record<CryptoTier, string> = { direct: '#f59e0b', etf: '#8b5cf6', company: '#3b82f6', adjacent: '#6b7280' }
const TIER_DESC: Record<CryptoTier, string> = {
  direct: 'Bitcoin, Ethereum, and other direct cryptocurrency holdings',
  etf: 'ETFs and trusts that hold crypto (GBTC, IBIT, BITO)',
  company: 'Companies whose revenue is primarily from crypto (Coinbase, Marathon, Riot)',
  adjacent: 'Companies that touch crypto but it is not their core business (PayPal, Block, Robinhood)',
}

interface Stats {
  totalTrades: number
  totalBuys: number
  totalSells: number
  uniqueTickers: number
  uniquePoliticians: number
  years: number[]
}

interface TopTicker {
  ticker: string
  buys: number
  sells: number
  buyAmt: number
  sellAmt: number
  total: number
  volume: number
}

interface TopTrader {
  name: string
  buys: number
  sells: number
  total: number
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B"
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K"
  return "$" + n
}

function fmtDate(d: string): string {
  if (!d) return ""
  const parts = d.split("/")
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`
  return d
}

function Explainer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 font-mono text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors">
        <span className="text-[14px]">{open ? '▾' : '▸'}</span>
        <span className="uppercase tracking-wider font-bold">What am I looking at?</span>
      </button>
      {open && (
        <div className="mt-2 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[12px] text-[var(--color-text-dim)] leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default function CapitolTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [topTickers, setTopTickers] = useState<TopTicker[]>([])
  const [topTraders, setTopTraders] = useState<TopTrader[]>([])
  const [cryptoStats, setCryptoStats] = useState<CryptoStats | null>(null)
  const [cryptoConflicts, setCryptoConflicts] = useState<any>(null)
  const [committeeConflicts, setCommitteeConflicts] = useState<any>(null)
  const [unusualActivity, setUnusualActivity] = useState<any>(null)
  const [enhancedStats, setEnhancedStats] = useState<any>(null)
  const [tradeStories, setTradeStories] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"table" | "flow" | "trail" | "tickers" | "traders" | "stories" | "scoreboard" | "timeline" | "unusual" | "conflicts" | "lobby" | "crypto">("table")
  const [lobbyData, setLobbyData] = useState<any>(null)
  // Donor cross-reference: politician name → Set of donor company names (for flagging conflicts)
  const [donorMap, setDonorMap] = useState<Map<string, Set<string>>>(new Map())
  // Crypto tier filters — tiers 1-3 on by default, adjacent (tier 4) opt-in
  const [activeTiers, setActiveTiers] = useState<Set<CryptoTier>>(new Set(['direct', 'etf', 'company']))
  const trailRef = useRef<SVGSVGElement>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [chamber, setChamber] = useState("")
  const [tradeType, setTradeType] = useState("")
  const [owner, setOwner] = useState("")
  const [flowTicker, setFlowTicker] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [amountFilter, setAmountFilter] = useState("")
  const [flagFilter, setFlagFilter] = useState("")

  // Table state
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<string>("date")
  const [sortDir, setSortDir] = useState(-1)
  const PAGE_SIZE = 50

  useEffect(() => {
    fetch("/api/capitol-trades")
      .then(r => r.json())
      .then(data => {
        setTrades(data.trades || [])
        setStats(data.stats || null)
        setTopTickers(data.topTickers || [])
        setTopTraders(data.topTraders || [])
        setCryptoStats(data.crypto || null)
        setEnhancedStats(data.enhanced || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // Load conflict data
    fetch("/api/crypto-conflicts")
      .then(r => r.json())
      .then(data => setCryptoConflicts(data))
      .catch(() => {})
    fetch("/api/committee-conflicts")
      .then(r => r.json())
      .then(data => setCommitteeConflicts(data))
      .catch(() => {})
    fetch("/api/unusual-activity")
      .then(r => r.json())
      .then(data => setUnusualActivity(data))
      .catch(() => {})
    fetch("/api/trade-stories")
      .then(r => r.json())
      .then(data => setTradeStories(data))
      .catch(() => {})
    fetch("/api/lobby-trades")
      .then(r => r.json())
      .then(data => setLobbyData(data))
      .catch(() => {})
    // Load per-profile edge data for donor cross-referencing
    fetch("/api/connections")
      .then(r => r.json())
      .then(data => {
        const map = new Map<string, Set<string>>()
        for (const conn of (data.topConnected || [])) {
          if (conn.donors && conn.donors.length > 0) {
            map.set(conn.title, new Set(conn.donors))
          }
        }
        setDonorMap(map)
      })
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    let result = trades as any[]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(t =>
        t.politician.toLowerCase().includes(s) ||
        (t.ticker || "").toLowerCase().includes(s) ||
        t.asset.toLowerCase().includes(s) ||
        t.state.toLowerCase().includes(s)
      )
    }
    if (chamber) result = result.filter(t => t.chamber === chamber)
    if (tradeType) result = result.filter(t => t.type === tradeType)
    if (owner) result = result.filter(t => t.owner === owner)
    if (yearFilter) result = result.filter(t => String(t.year) === yearFilter)
    if (amountFilter) {
      if (amountFilter === '500k+') result = result.filter(t => (t.amount?.max || 0) >= 500000)
      else if (amountFilter === '100k+') result = result.filter(t => (t.amount?.max || 0) >= 100000)
      else if (amountFilter === '50k+') result = result.filter(t => (t.amount?.max || 0) >= 50000)
    }
    if (flagFilter) {
      if (flagFilter === 'whale') result = result.filter(t => t.isWhaleTrade || (t.amount?.max || 0) >= 500000)
      else if (flagFilter === 'late') result = result.filter(t => t.isLateDisclosure)
      else if (flagFilter === 'options') result = result.filter(t => t.isOptions)
      else if (flagFilter === 'crypto') result = result.filter(t => t.isCrypto)
      else if (flagFilter === 'no-ticker') result = result.filter(t => !t.ticker)
    }

    result.sort((a, b) => {
      let va: any, vb: any
      switch (sortField) {
        case "politician": va = a.politician; vb = b.politician; break
        case "ticker": va = a.ticker || "zzz"; vb = b.ticker || "zzz"; break
        case "type": va = a.type; vb = b.type; break
        case "date": va = new Date(a.transactionDate).getTime() || 0; vb = new Date(b.transactionDate).getTime() || 0; break
        case "amount": va = a.amount?.max || 0; vb = b.amount?.max || 0; break
        default: va = 0; vb = 0
      }
      if (typeof va === "string") return sortDir * va.localeCompare(vb)
      return sortDir * (va - vb)
    })
    return result
  }, [trades, search, chamber, tradeType, owner, yearFilter, amountFilter, flagFilter, sortField, sortDir])

  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page])
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const handleSort = useCallback((field: string) => {
    if (sortField === field) setSortDir(d => d * -1)
    else { setSortField(field); setSortDir(-1) }
    setPage(0)
  }, [sortField])

  // Stock flow data
  const flowData = useMemo(() => {
    if (!flowTicker) return null
    const ticker = flowTicker.toUpperCase()
    const tickerTrades = trades.filter(t => t.ticker?.toUpperCase() === ticker)
    if (tickerTrades.length === 0) return null

    const byPol: Record<string, { buys: number; sells: number; buyAmt: number; sellAmt: number }> = {}
    for (const t of tickerTrades) {
      if (!byPol[t.politician]) byPol[t.politician] = { buys: 0, sells: 0, buyAmt: 0, sellAmt: 0 }
      const p = byPol[t.politician]
      if (t.type === "Purchase") { p.buys++; p.buyAmt += t.amount.max || t.amount.min || 0 }
      else if (t.type === "Sale") { p.sells++; p.sellAmt += t.amount.max || t.amount.min || 0 }
    }

    const pols = Object.entries(byPol)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (b.buyAmt + b.sellAmt) - (a.buyAmt + a.sellAmt))

    const totalBuyAmt = pols.reduce((s, p) => s + p.buyAmt, 0)
    const totalSellAmt = pols.reduce((s, p) => s + p.sellAmt, 0)
    const maxAmt = Math.max(...pols.map(p => Math.max(p.buyAmt, p.sellAmt)), 1)

    return { ticker, trades: tickerTrades.length, members: pols.length, pols, totalBuyAmt, totalSellAmt, maxAmt }
  }, [flowTicker, trades])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-dim)] font-mono text-sm">Loading trades...</div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px]">
      <PageHeader
        title="Capitol Trades"
        whatThisDoes="Politicians' stock-trade disclosures from STOCK Act PTRs (Periodic Transaction Reports). Cross-references trades with committee jurisdiction (committee-conflicts), crypto holdings (crypto-conflicts), unusual activity, and lobby spend (lobby-trades). Politician names normalized via the librarian's canonical resolver."
        rightNow={stats ? (
          <>
            <strong>{stats.totalTrades.toLocaleString()}</strong> trades indexed
            {" · "}
            <strong>{stats.uniquePoliticians.toLocaleString()}</strong> politicians
            {" · "}
            <strong>${(stats.totalVolume / 1_000_000).toFixed(1)}M</strong> total volume
          </>
        ) : "loading…"}
        action="Filter chips below pivot the table by chamber / party / late-disclosure / whale trade. Click a politician name to drill into their trade history; click a ticker to see all politicians who traded it."
        freshness={{
          paths: [
            "data/financial-disclosures.json",
            "data/financial-disclosures-historical.json",
            "data/senate-disclosures-historical.json",
          ],
          label: "STOCK Act PTRs",
          freshWithinDays: 1,
          warnWithinDays: 3,
        }}
      />

      {/* Saved-views bar (deferred audit item #10). Snapshot covers tab,
          all filters, table sort, and active crypto tiers. */}
      <div className="mb-4">
        <SavedViewsBar<CapitolTradesViewSnapshot>
          pageKey="capitol-trades"
          currentView={{
            tab,
            search,
            chamber,
            tradeType,
            owner,
            flowTicker,
            yearFilter,
            amountFilter,
            flagFilter,
            activeTiers: Array.from(activeTiers),
            sortField,
            sortDir,
          }}
          onLoadView={(v) => {
            setTab(v.tab as typeof tab)
            setSearch(v.search)
            setChamber(v.chamber)
            setTradeType(v.tradeType)
            setOwner(v.owner)
            setFlowTicker(v.flowTicker)
            setYearFilter(v.yearFilter)
            setAmountFilter(v.amountFilter)
            setFlagFilter(v.flagFilter)
            setActiveTiers(new Set(v.activeTiers))
            setSortField(v.sortField)
            setSortDir(v.sortDir)
            setPage(0) // any filter change resets pagination
          }}
        />
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Total Trades</div>
            <div className="text-xl font-bold text-[var(--color-text)] font-mono">{stats.totalTrades.toLocaleString()}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Buys</div>
            <div className="text-xl font-bold text-[#22c55e] font-mono">{stats.totalBuys.toLocaleString()}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Sells</div>
            <div className="text-xl font-bold text-[#ef4444] font-mono">{stats.totalSells.toLocaleString()}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Tickers</div>
            <div className="text-xl font-bold text-[var(--color-steel)] font-mono">{stats.uniqueTickers}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Politicians</div>
            <div className="text-xl font-bold text-[var(--color-text)] font-mono">{stats.uniquePoliticians}</div>
          </div>
        </div>
      )}

      {/* Enhanced stats row */}
      {enhancedStats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-[var(--color-bg-card)] border border-[#8b5cf633] p-3 cursor-pointer hover:bg-[var(--color-bg-hover)]"
            onClick={() => setTab("unusual")}>
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Options</div>
            <div className="text-xl font-bold text-[#8b5cf6] font-mono">{enhancedStats.optionsCount || 0}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Whale ($500K+)</div>
            <div className="text-xl font-bold text-[#f59e0b] font-mono">{enhancedStats.whaleCount || 0}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[#ef444433] p-3">
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Late Disclosures</div>
            <div className="text-xl font-bold text-[#ef4444] font-mono">{enhancedStats.lateDisclosureCount || 0}</div>
            <div className="text-[9px] text-[var(--color-text-dim)] font-mono">{">"} 45 day STOCK Act</div>
          </div>
          {enhancedStats.assetTypes && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 col-span-2">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider mb-1">Asset Types</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(enhancedStats.assetTypes as Record<string, number>).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: [string, any]) => (
                  <span key={type} className="font-mono text-[10px]">
                    <span className="text-[var(--color-text)]">{type}</span>
                    <span className="text-[var(--color-text-dim)] ml-1">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters — Row 1 */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search politician, ticker, or state..."
          className="flex-1 px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs focus:border-[var(--color-steel)] focus:outline-none"
        />
        <select value={chamber} onChange={e => { setChamber(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs">
          <option value="">All Chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
        </select>
        <select value={tradeType} onChange={e => { setTradeType(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs">
          <option value="">All Types</option>
          <option value="Purchase">Buys</option>
          <option value="Sale">Sells</option>
        </select>
        <select value={owner} onChange={e => { setOwner(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs">
          <option value="">All Filers</option>
          <option value="Self">Self</option>
          <option value="Spouse">Spouse</option>
          <option value="Joint">Joint</option>
          <option value="Dependent Child">Child</option>
        </select>
      </div>
      {/* Filters — Row 2 */}
      <div className="flex gap-2 mb-4">
        <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs">
          <option value="">All Years</option>
          {stats?.years?.map((y: number) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={amountFilter} onChange={e => { setAmountFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs">
          <option value="">All Amounts</option>
          <option value="500k+">$500K+ (Whale)</option>
          <option value="100k+">$100K+</option>
          <option value="50k+">$50K+</option>
        </select>
        <select value={flagFilter} onChange={e => { setFlagFilter(e.target.value); setPage(0) }}
          className="px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs">
          <option value="">All Flags</option>
          <option value="whale">Whale ($500K+)</option>
          <option value="late">Late Disclosure</option>
          <option value="options">Options</option>
          <option value="crypto">Crypto</option>
          <option value="no-ticker">Missing Ticker</option>
        </select>
        {(yearFilter || amountFilter || flagFilter || chamber || tradeType || owner || search) && (
          <button onClick={() => { setSearch(''); setChamber(''); setTradeType(''); setOwner(''); setYearFilter(''); setAmountFilter(''); setFlagFilter(''); setPage(0) }}
            className="px-3 py-2 border border-[var(--color-border)] text-[var(--color-text-dim)] font-mono text-xs hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]">
            Clear All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] mb-4">
        {(["table", "flow", "trail", "tickers", "traders", "stories", "scoreboard", "timeline", "unusual", "conflicts", "lobby", "crypto"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider border-b-2 -mb-px ${
              tab === t ? "text-[var(--color-text)] border-[var(--color-steel)]" : "text-[var(--color-text-dim)] border-transparent hover:text-[var(--color-text)]"
            } ${t === "crypto" ? "ml-2 !text-[#f59e0b] " + (tab === t ? "!border-[#f59e0b]" : "") : ""} ${t === "conflicts" ? "!text-[#ef4444] " + (tab === t ? "!border-[#ef4444]" : "") : ""} ${t === "unusual" ? "!text-[#8b5cf6] " + (tab === t ? "!border-[#8b5cf6]" : "") : ""} ${t === "stories" ? "!text-[#22c55e] " + (tab === t ? "!border-[#22c55e]" : "") : ""} ${t === "lobby" ? "!text-[#06b6d4] " + (tab === t ? "!border-[#06b6d4]" : "") : ""} ${t === "scoreboard" ? "!text-[#e63946] " + (tab === t ? "!border-[#e63946]" : "") : ""} ${t === "timeline" ? "!text-[#d97706] " + (tab === t ? "!border-[#d97706]" : "") : ""}`}>
            {({table:"TRADES",flow:"STOCK FLOW",trail:"MONEY TRAIL",tickers:"TOP TICKERS",traders:"TOP TRADERS",stories:"STORIES",scoreboard:"SCOREBOARD",timeline:"TIMELINE",unusual:"UNUSUAL",conflicts:"CONFLICTS",lobby:"LOBBY",crypto:"CRYPTO"} as any)[t]}
          </button>
        ))}
        <div className="ml-auto text-[10px] text-[var(--color-text-dim)] font-mono self-center">
          {filtered.length.toLocaleString()} results
        </div>
      </div>

      {/* ── Trades Table ── */}
      {tab === "table" && (
        <div>
          <Explainer>
            <p><strong>Every stock trade made by a sitting member of the U.S. House of Representatives.</strong></p>
            <p>Under the STOCK Act (2012), members of Congress must publicly disclose every stock trade within 45 days. This is the raw feed. They are required to report what they bought or sold, how much, and when. They are not required to explain why.</p>
            <p>The question this data answers: <strong>Are the people writing the laws also betting on the outcome?</strong></p>
            <p>Look for the colored flags on each row. <span style={{color:'#f59e0b'}}>WHALE</span> means $500K+ trade. <span style={{color:'#ef4444'}}>LATE</span> means they broke the 45-day disclosure deadline. <span style={{color:'#8b5cf6'}}>CALL/PUT</span> means options (leveraged bets with expiration dates). <span style={{color:'#f59e0b'}}>CRYPTO</span> means cryptocurrency or crypto-related stocks.</p>
          </Explainer>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {[
                  { key: "politician", label: "Politician" },
                  { key: "ticker", label: "Ticker" },
                  { key: "type", label: "Type" },
                  { key: "", label: "Owner" },
                  { key: "date", label: "Date" },
                  { key: "amount", label: "Amount" },
                  { key: "", label: "Source" },
                ].map((col, i) => (
                  <th key={i} onClick={col.key ? () => handleSort(col.key) : undefined}
                    className={`py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)] ${col.key ? "cursor-pointer hover:text-[var(--color-text)]" : ""}`}>
                    {col.label}
                    {sortField === col.key && <span className="ml-1">{sortDir === 1 ? "▲" : "▼"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((t: any, i) => {
                const isWhale = t.isWhaleTrade || (t.amount?.max >= 500000)
                const isLate = t.isLateDisclosure
                const isOpt = t.isOptions
                const isCryp = t.isCrypto
                return (
                <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
                  style={isWhale ? { borderLeftWidth: 3, borderLeftColor: '#f59e0b' } : isLate ? { borderLeftWidth: 3, borderLeftColor: '#ef4444' } : {}}>
                  <td className="py-2 px-2">
                    <div className="text-[var(--color-text)] font-medium">{t.politician}</div>
                    <div className="text-[9px] text-[var(--color-text-dim)]">
                      <span className={`inline-block px-1 font-bold text-[8px] mr-1 ${t.chamber === "Senate" ? "bg-[var(--color-text)] text-[var(--color-bg)]" : "bg-[#3b82f6] text-white"}`}>
                        {t.chamber === "Senate" ? "SEN" : "HSE"}
                      </span>
                      {t.state}{t.district ? `-${t.district}` : ""}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`font-mono font-bold ${isCryp ? 'text-[#f59e0b]' : 'text-[var(--color-text)]'}`}>
                      {t.ticker || <span className="text-[var(--color-text-dim)]">N/A</span>}
                    </span>
                    {/* Flags */}
                    <div className="flex gap-1 mt-0.5">
                      {isOpt && <span className="px-1 py-0 text-[7px] font-bold font-mono bg-[#8b5cf622] text-[#8b5cf6]">{t.optionType === 'call' ? 'CALL' : t.optionType === 'put' ? 'PUT' : 'OPT'}</span>}
                      {isCryp && <span className="px-1 py-0 text-[7px] font-bold font-mono bg-[#f59e0b22] text-[#f59e0b]">CRYPTO</span>}
                      {isWhale && <span className="px-1 py-0 text-[7px] font-bold font-mono bg-[#f59e0b22] text-[#f59e0b]">WHALE</span>}
                      {isLate && <span className="px-1 py-0 text-[7px] font-bold font-mono bg-[#ef444422] text-[#ef4444]">LATE {(t as any).filingDelayDays}d</span>}
                      {(() => {
                        const donors = donorMap.get(t.politician)
                        if (!donors) return null
                        const assetLower = t.asset.toLowerCase()
                        const isDonorMatch = [...donors].some(d => assetLower.includes(d.toLowerCase().split(' ')[0]) || d.toLowerCase().includes(assetLower.split(' ')[0]))
                        return isDonorMatch ? <span className="px-1 py-0 text-[7px] font-bold font-mono bg-[#22c55e22] text-[#22c55e]" title="This politician also receives donations from this company">DONOR</span> : null
                      })()}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 font-mono text-[9px] font-bold ${
                      t.type === "Purchase" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" :
                      t.type === "Sale" ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444]" :
                      "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-dim)]"
                    }`}>
                      {t.type === "Purchase" ? "BUY" : t.type === "Sale" ? "SELL" : t.type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-[var(--color-text-dim)] font-mono">{t.owner}</td>
                  <td className="py-2 px-2 text-[var(--color-text-dim)] font-mono whitespace-nowrap">{fmtDate(t.transactionDate)}</td>
                  <td className="py-2 px-2 font-mono font-bold text-[var(--color-text)]">{fmtK(t.amount.max || t.amount.min || 0)}</td>
                  <td className="py-2 px-2">
                    {t.sourceUrl && (
                      <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[var(--color-steel)] text-[9px] font-mono hover:underline">PDF</a>
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-text)] disabled:opacity-30 hover:bg-[var(--color-bg-hover)]">
                Prev
              </button>
              <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-text)] disabled:opacity-30 hover:bg-[var(--color-bg-hover)]">
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Stock Flow ── */}
      {tab === "flow" && (
        <div>
          <Explainer>
            <p><strong>Type any stock ticker to see which politicians are buying and selling it.</strong></p>
            <p>Green bars = buying. Red bars = selling. Longer bar = more money. This view answers a simple question: <strong>who in Congress is betting on this company?</strong></p>
            <p>Try typing NVDA (Nvidia), LMT (Lockheed Martin), or PFE (Pfizer). Then ask yourself: do any of these politicians sit on committees that regulate the industry this company operates in?</p>
          </Explainer>
          <input
            type="text"
            value={flowTicker}
            onChange={e => setFlowTicker(e.target.value)}
            placeholder="Enter ticker (e.g. AAPL, NVDA, MSFT)..."
            className="w-full px-3 py-2 mb-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-sm focus:border-[var(--color-steel)] focus:outline-none"
          />

          {!flowTicker && (
            <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">
              Enter a ticker symbol to see who is buying and selling
            </div>
          )}

          {flowTicker && !flowData && (
            <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">
              No trades found for {flowTicker.toUpperCase()}
            </div>
          )}

          {flowData && (
            <div>
              {/* Header */}
              <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-[var(--color-border)]">
                <span className="font-mono text-2xl font-bold text-[var(--color-text)]">{flowData.ticker}</span>
                <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                  {flowData.trades} trades by {flowData.members} members
                </span>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mb-3 font-mono text-[10px] font-bold">
                <span className="text-[#22c55e]">■ BUY</span>
                <span className="text-[#ef4444]">■ SELL</span>
              </div>

              {/* Flow bars */}
              {flowData.pols.map((pol, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <div className="w-44 min-w-[176px] text-right text-xs font-medium text-[var(--color-text)] truncate">
                    {pol.name}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    {pol.buyAmt > 0 && (
                      <div className="bg-[#22c55e] h-5 flex items-center px-2 font-mono text-[9px] font-bold text-white"
                        style={{ width: `${Math.max(pol.buyAmt / flowData.maxAmt * 100, 4)}%` }}>
                        {fmtK(pol.buyAmt)}
                      </div>
                    )}
                    {pol.sellAmt > 0 && (
                      <div className="bg-[#ef4444] h-5 flex items-center px-2 font-mono text-[9px] font-bold text-white"
                        style={{ width: `${Math.max(pol.sellAmt / flowData.maxAmt * 100, 4)}%` }}>
                        {fmtK(pol.sellAmt)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="flex gap-6 mt-6 pt-4 border-t border-[var(--color-border)]">
                <div>
                  <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Total Bought</div>
                  <div className="font-mono text-lg font-bold text-[#22c55e]">{fmtK(flowData.totalBuyAmt)}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Total Sold</div>
                  <div className="font-mono text-lg font-bold text-[#ef4444]">{fmtK(flowData.totalSellAmt)}</div>
                </div>
                <div>
                  <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Net Flow</div>
                  <div className={`font-mono text-lg font-bold ${flowData.totalBuyAmt > flowData.totalSellAmt ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {flowData.totalBuyAmt > flowData.totalSellAmt ? "+" : ""}{fmtK(flowData.totalBuyAmt - flowData.totalSellAmt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Money Trail ── */}
      {tab === "trail" && (
        <>
          <Explainer>
            <p><strong>The flow of money from politicians to stocks, visualized.</strong></p>
            <p>Politicians on the left. Stocks on the right. Green lines = buying. Red lines = selling. Thicker line = more money. Hover over any name to highlight their connections.</p>
            <p>This is not a chart of the stock market. This is a chart of <strong>where lawmakers are putting their personal money</strong> while they write the rules for the rest of us. Select specific tickers below to focus the view.</p>
          </Explainer>
          <MoneyTrailGraph trades={trades} svgRef={trailRef} />
        </>
      )}

      {/* ── Top Tickers ── */}
      {tab === "tickers" && (
        <div>
        <Explainer>
          <p><strong>The stocks Congress trades the most, ranked by total dollar volume.</strong></p>
          <p>Green = total bought. Red = total sold. Click any ticker to see which politicians are buying and selling it. The stocks at the top of this list are where Congress has the most skin in the game. These are the companies whose stock prices Congress has a personal financial interest in.</p>
        </Explainer>
        <div className="grid grid-cols-1 gap-2">
          {topTickers.map((tk, i) => (
            <div key={i} className="flex items-center gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
              onClick={() => { setFlowTicker(tk.ticker); setTab("flow") }}>
              <div className="font-mono text-sm font-bold text-[var(--color-text)] w-16">{tk.ticker}</div>
              <div className="flex-1">
                <div className="flex gap-1 h-4">
                  {tk.buyAmt > 0 && (
                    <div className="bg-[#22c55e] h-full" style={{ width: `${tk.buyAmt / (tk.buyAmt + tk.sellAmt) * 100}%` }} />
                  )}
                  {tk.sellAmt > 0 && (
                    <div className="bg-[#ef4444] h-full" style={{ width: `${tk.sellAmt / (tk.buyAmt + tk.sellAmt) * 100}%` }} />
                  )}
                </div>
              </div>
              <div className="text-right font-mono text-[10px] w-20">
                <span className="text-[#22c55e]">{tk.buys}B</span>
                <span className="text-[var(--color-text-dim)] mx-1">/</span>
                <span className="text-[#ef4444]">{tk.sells}S</span>
              </div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)] w-20 text-right">{fmtK(tk.volume)}</div>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* ── Top Traders ── */}
      {tab === "traders" && (
        <div>
        <Explainer>
          <p><strong>The most active stock traders in Congress, ranked by number of trades.</strong></p>
          <p>Green = buys. Red = sells. Click any name to see their full trade history. The politicians at the top of this list treat the stock market like a second job. Some file hundreds of trades per year. For context, the average American investor makes about 5-10 trades per year.</p>
        </Explainer>
        <div className="grid grid-cols-1 gap-2">
          {topTraders.map((tr, i) => (
            <div key={i} className="flex items-center gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
              onClick={() => { setSearch(tr.name); setTab("table"); setPage(0) }}>
              <div className="text-sm font-medium text-[var(--color-text)] w-48 truncate">{tr.name}</div>
              <div className="flex-1">
                <div className="flex gap-1 h-4">
                  {tr.buys > 0 && (
                    <div className="bg-[#22c55e] h-full" style={{ width: `${tr.buys / tr.total * 100}%` }} />
                  )}
                  {tr.sells > 0 && (
                    <div className="bg-[#ef4444] h-full" style={{ width: `${tr.sells / tr.total * 100}%` }} />
                  )}
                </div>
              </div>
              <div className="text-right font-mono text-[10px] w-24">
                <span className="text-[#22c55e]">{tr.buys} buys</span>
                <span className="text-[var(--color-text-dim)] mx-1">/</span>
                <span className="text-[#ef4444]">{tr.sells} sells</span>
              </div>
              <div className="font-mono text-xs font-bold text-[var(--color-text)] w-12 text-right">{tr.total}</div>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* ── Stories ── */}
      {tab === "stories" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div>
              <div className="font-mono text-sm font-bold text-[#22c55e]">Trade Stories</div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)]">
                The data, translated into English.
              </div>
            </div>
          </div>
          <Explainer>
            <p><strong>These are auto-generated stories from real financial disclosure data.</strong></p>
            <p>Every story below was written by an algorithm, not a journalist. The algorithm reads the same government filings you saw in the Trades tab, and flags the ones that should make you uncomfortable. It looks for four patterns:</p>
            <p><strong style={{color:'#f59e0b'}}>Whale trades:</strong> When a lawmaker moves $500,000+ in a single trade. That is not a retirement account rebalance.</p>
            <p><strong style={{color:'#ef4444'}}>Late disclosures:</strong> The STOCK Act says 45 days. Some wait months. By the time you find out about the trade, the information advantage is already captured.</p>
            <p><strong style={{color:'#8b5cf6'}}>Options trading:</strong> Options are leveraged bets with expiration dates. A politician buying call options is not just betting a stock goes up. They are betting it goes up <em>by a specific date</em>. That requires confidence about timing that normal investors do not have.</p>
            <p><strong style={{color:'#f59e0b'}}>Crypto trades:</strong> Congress is actively writing the rules for cryptocurrency. Trading crypto while writing crypto law is a textbook conflict of interest.</p>
            <p>Red border = critical severity. Amber = high. Click any story to dig into the raw data.</p>
          </Explainer>

          {!tradeStories && (
            <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">Loading stories...</div>
          )}

          {tradeStories && tradeStories.stats && (
            <>
              <div className="flex gap-4 mb-6 font-mono text-[10px]">
                <span className="text-[#ef4444] font-bold">{tradeStories.stats.critical} CRITICAL</span>
                <span className="text-[#f59e0b] font-bold">{tradeStories.stats.high} HIGH</span>
                <span className="text-[var(--color-text-dim)]">{tradeStories.stats.medium} MEDIUM</span>
                <span className="text-[var(--color-text-dim)]">·</span>
                {Object.entries(tradeStories.stats.byCategory as Record<string, number>).filter(([,v]: any) => v > 0).map(([k, v]: [string, any]) => (
                  <span key={k} className="text-[var(--color-text-dim)]">{k}: {v}</span>
                ))}
              </div>

              <div className="space-y-4">
                {(tradeStories.stories || []).map((s: any, i: number) => {
                  const borderColor = s.severity === 'critical' ? '#ef4444' : s.severity === 'high' ? '#f59e0b' : '#6b7280'
                  const categoryColors: Record<string, string> = {
                    whale: '#f59e0b', late: '#ef4444', options: '#8b5cf6', 'crypto-vote': '#f59e0b', committee: '#ef4444', cluster: '#8b5cf6'
                  }
                  const catColor = categoryColors[s.category] || '#6b7280'

                  return (
                    <div key={i} className="border p-4" style={{ borderColor, borderLeftWidth: 4, backgroundColor: borderColor + '08' }}>
                      {/* Category + Severity badges */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider"
                          style={{ color: catColor, backgroundColor: catColor + '22' }}>
                          {s.category}
                        </span>
                        <span className="px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider"
                          style={{ color: borderColor, backgroundColor: borderColor + '22' }}>
                          {s.severity}
                        </span>
                        {s.date && <span className="font-mono text-[9px] text-[var(--color-text-dim)] ml-auto">{s.date}</span>}
                      </div>

                      {/* Headline */}
                      <div className="text-base font-bold text-[var(--color-text)] mb-2 leading-tight">
                        {s.headline}
                      </div>

                      {/* Body */}
                      <div className="text-[12px] text-[var(--color-text-dim)] leading-relaxed">
                        {s.body}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[var(--color-border)]">
                        <button className="font-mono text-[9px] text-[var(--color-steel)] hover:underline"
                          onClick={() => { setSearch(s.politician); setTab("table"); setPage(0) }}>
                          View all trades by {s.politician}
                        </button>
                        {s.ticker && (
                          <button className="font-mono text-[9px] text-[var(--color-steel)] hover:underline"
                            onClick={() => { setFlowTicker(s.ticker); setTab("flow") }}>
                            View {s.ticker} flow
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Scoreboard ── */}
      {tab === "scoreboard" && (() => {
        // Compute composite suspicion score per politician from trade data
        const polScores: Record<string, { name: string; chamber: string; state: string; trades: number; volume: number; whales: number; lates: number; options: number; crypto: number; maxTrade: number; score: number }> = {}
        for (const t of trades as any[]) {
          const key = t.politician
          if (!polScores[key]) polScores[key] = { name: t.politician, chamber: t.chamber, state: t.state, trades: 0, volume: 0, whales: 0, lates: 0, options: 0, crypto: 0, maxTrade: 0, score: 0 }
          const p = polScores[key]
          p.trades++
          const amt = t.amount?.max || t.amount?.min || 0
          p.volume += amt
          if (amt > p.maxTrade) p.maxTrade = amt
          if (t.isWhaleTrade || amt >= 500000) p.whales++
          if (t.isLateDisclosure) p.lates++
          if (t.isOptions) p.options++
          if (t.isCrypto) p.crypto++
        }
        // Score: weighted composite
        for (const p of Object.values(polScores)) {
          p.score = (p.whales * 25) + (p.lates * 10) + (p.options * 20) + (p.crypto * 5) + Math.log10(Math.max(p.volume, 1)) * 3 + (p.trades > 100 ? 15 : 0)
        }
        const ranked = Object.values(polScores).sort((a, b) => b.score - a.score)
        const maxScore = ranked[0]?.score || 1

        return (
        <div>
          <Explainer>
            <p><strong>Every member of Congress, ranked by how suspicious their trading activity looks.</strong></p>
            <p>The score is a composite of five factors: whale trades ($500K+) weighted heaviest, then options trades (leveraged bets), late disclosures (STOCK Act violations), crypto trades (conflict with pending legislation), total volume, and trade frequency. Higher score = more red flags. This is not proof of wrongdoing. It is a ranked list of who warrants the most scrutiny.</p>
          </Explainer>

          <div className="font-mono text-[10px] text-[var(--color-text-dim)] mb-4">
            {ranked.length} politicians ranked · Score = (whales x25) + (options x20) + (lates x10) + (crypto x5) + volume + frequency
          </div>

          <div className="space-y-1">
            {ranked.slice(0, 50).map((p, i) => {
              const barWidth = (p.score / maxScore) * 100
              const isTop10 = i < 10
              return (
                <div key={i} className="flex items-center gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                  style={isTop10 ? { borderLeftWidth: 4, borderLeftColor: '#e63946' } : {}}
                  onClick={() => { setSearch(p.name); setTab("table"); setPage(0) }}>
                  <div className="font-mono text-sm font-bold text-[var(--color-text-dim)] w-8 text-right">#{i + 1}</div>
                  <div className="w-48 min-w-[192px]">
                    <div className="text-sm font-bold text-[var(--color-text)]">{p.name}</div>
                    <div className="text-[9px] text-[var(--color-text-dim)] font-mono">
                      <span className={`inline-block px-1 font-bold text-[8px] mr-1 ${p.chamber === "Senate" ? "bg-[var(--color-text)] text-[var(--color-bg)]" : "bg-[#3b82f6] text-white"}`}>
                        {p.chamber === "Senate" ? "SEN" : "HSE"}
                      </span>
                      {p.state}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-[var(--color-border)]">
                      <div className="h-full" style={{ width: `${barWidth}%`, backgroundColor: isTop10 ? '#e63946' : i < 25 ? '#f59e0b' : '#6b7280' }} />
                    </div>
                  </div>
                  <div className="flex gap-3 font-mono text-[9px] min-w-[280px]">
                    <span className="text-[var(--color-text)]">{p.trades} trades</span>
                    {p.whales > 0 && <span className="text-[#f59e0b]">{p.whales} whale</span>}
                    {p.options > 0 && <span className="text-[#8b5cf6]">{p.options} opts</span>}
                    {p.lates > 0 && <span className="text-[#ef4444]">{p.lates} late</span>}
                    {p.crypto > 0 && <span className="text-[#f59e0b]">{p.crypto} crypto</span>}
                  </div>
                  <div className="font-mono text-sm font-bold text-right w-16" style={{ color: isTop10 ? '#e63946' : i < 25 ? '#f59e0b' : 'var(--color-text-dim)' }}>
                    {Math.round(p.score)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )
      })()}

      {/* ── Timeline ── */}
      {tab === "timeline" && (() => {
        // Build monthly trade volume
        const monthly: Record<string, { month: string; trades: number; buys: number; sells: number; buyVol: number; sellVol: number; whales: number; lates: number; options: number; crypto: number }> = {}
        for (const t of trades as any[]) {
          const d = t.transactionDate
          if (!d) continue
          const parts = d.match(/(\d{1,2})\/\d{1,2}\/(\d{4})/)
          if (!parts) continue
          const key = `${parts[2]}-${parts[1].padStart(2, '0')}`
          if (!monthly[key]) monthly[key] = { month: key, trades: 0, buys: 0, sells: 0, buyVol: 0, sellVol: 0, whales: 0, lates: 0, options: 0, crypto: 0 }
          const m = monthly[key]
          m.trades++
          const amt = t.amount?.max || t.amount?.min || 0
          if (t.type === 'Purchase') { m.buys++; m.buyVol += amt }
          else if (t.type === 'Sale') { m.sells++; m.sellVol += amt }
          if (t.isWhaleTrade || amt >= 500000) m.whales++
          if (t.isLateDisclosure) m.lates++
          if (t.isOptions) m.options++
          if (t.isCrypto) m.crypto++
        }
        const months = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month))
        const maxTrades = Math.max(...months.map(m => m.trades), 1)

        // Key events
        const events: Record<string, string> = {
          '2020-01': 'COVID first cases',
          '2020-03': 'COVID crash + insider trading scandal',
          '2020-06': 'Market recovery rally',
          '2021-01': 'GameStop / meme stocks',
          '2021-06': 'Crypto summer peak',
          '2021-11': 'Infrastructure bill signed',
          '2022-01': 'Fed rate hike signals',
          '2022-06': 'Crypto crash (Luna/FTX)',
          '2022-11': 'FTX collapse',
          '2023-03': 'SVB bank crisis',
          '2024-01': 'Bitcoin ETFs approved',
          '2024-05': 'FIT21 passes House',
          '2025-02': 'GENIUS Act introduced',
          '2025-07': 'GENIUS Act signed',
        }

        return (
        <div>
          <Explainer>
            <p><strong>Congressional trading volume over time, month by month.</strong></p>
            <p>The height of each bar shows how many trades Congress made that month. Green = buys, red = sells. The orange dots mark months with notable events. Look for spikes around market crashes, major legislation, and crises. When trading volume surges right before or after a major event, it raises the question: did they know something?</p>
            <p>March 2020 is the most famous case. Multiple senators sold millions in stock weeks before the COVID crash, after receiving classified briefings. This chart shows you every month like that.</p>
          </Explainer>

          {/* Chart */}
          <div className="overflow-x-auto border border-[var(--color-border)] bg-[var(--color-bg)] p-4 mb-4">
            <div style={{ minWidth: months.length * 14 + 100 }} className="flex items-end gap-[2px] h-64">
              {months.map((m, i) => {
                const h = (m.trades / maxTrades) * 100
                const buyPct = m.buys / Math.max(m.trades, 1)
                const hasEvent = !!events[m.month]
                const [yr, mo] = m.month.split('-')
                const showLabel = mo === '01' || mo === '07'

                return (
                  <div key={i} className="flex flex-col items-center relative group" style={{ flex: '0 0 12px' }}>
                    {/* Event dot */}
                    {hasEvent && (
                      <div className="absolute -top-6 w-3 h-3 rounded-full bg-[#d97706] z-10" title={events[m.month]} />
                    )}
                    {/* Bar */}
                    <div className="w-full flex flex-col justify-end" style={{ height: `${h}%`, minHeight: m.trades > 0 ? 2 : 0 }}>
                      <div className="w-full bg-[#22c55e]" style={{ height: `${buyPct * 100}%` }} />
                      <div className="w-full bg-[#ef4444]" style={{ height: `${(1 - buyPct) * 100}%` }} />
                    </div>
                    {/* Label */}
                    {showLabel && (
                      <div className="absolute -bottom-5 font-mono text-[8px] text-[var(--color-text-dim)] whitespace-nowrap">
                        {mo === '01' ? yr : ''}
                      </div>
                    )}
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-[var(--color-bg-card)] border border-[var(--color-border)] p-2 z-20 whitespace-nowrap text-[9px] font-mono">
                      <div className="font-bold text-[var(--color-text)]">{m.month}</div>
                      <div>{m.trades} trades ({m.buys}B / {m.sells}S)</div>
                      {m.whales > 0 && <div className="text-[#f59e0b]">{m.whales} whale</div>}
                      {m.options > 0 && <div className="text-[#8b5cf6]">{m.options} options</div>}
                      {m.crypto > 0 && <div className="text-[#f59e0b]">{m.crypto} crypto</div>}
                      {events[m.month] && <div className="text-[#d97706] font-bold mt-1">{events[m.month]}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Event legend */}
          <div className="mb-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d97706] mb-2">Key Events</div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(events).filter(([k]) => months.some(m => m.month === k)).map(([date, label]) => {
                const m = monthly[date]
                return (
                  <div key={date} className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-[#d97706] flex-shrink-0" />
                    <span className="text-[var(--color-text-dim)]">{date}</span>
                    <span className="text-[var(--color-text)]">{label}</span>
                    {m && <span className="text-[var(--color-text-dim)] ml-auto">{m.trades} trades</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Yearly summary table */}
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#d97706] mb-2">Yearly Breakdown</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-2 px-2 text-left font-mono text-[9px] font-bold text-[var(--color-text-dim)]">Year</th>
                  <th className="py-2 px-2 text-right font-mono text-[9px] font-bold text-[var(--color-text-dim)]">Trades</th>
                  <th className="py-2 px-2 text-right font-mono text-[9px] font-bold text-[#22c55e]">Buys</th>
                  <th className="py-2 px-2 text-right font-mono text-[9px] font-bold text-[#ef4444]">Sells</th>
                  <th className="py-2 px-2 text-right font-mono text-[9px] font-bold text-[#f59e0b]">Whales</th>
                  <th className="py-2 px-2 text-right font-mono text-[9px] font-bold text-[#8b5cf6]">Options</th>
                  <th className="py-2 px-2 text-right font-mono text-[9px] font-bold text-[#ef4444]">Late</th>
                  <th className="py-2 px-2 text-right font-mono text-[9px] font-bold text-[#f59e0b]">Crypto</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const yearly: Record<string, any> = {}
                  for (const m of months) {
                    const yr = m.month.split('-')[0]
                    if (!yearly[yr]) yearly[yr] = { trades: 0, buys: 0, sells: 0, whales: 0, options: 0, lates: 0, crypto: 0 }
                    yearly[yr].trades += m.trades; yearly[yr].buys += m.buys; yearly[yr].sells += m.sells
                    yearly[yr].whales += m.whales; yearly[yr].options += m.options; yearly[yr].lates += m.lates; yearly[yr].crypto += m.crypto
                  }
                  return Object.entries(yearly).sort((a, b) => a[0].localeCompare(b[0])).map(([yr, d]: [string, any]) => (
                    <tr key={yr} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
                      onClick={() => { setYearFilter(yr); setTab('table'); setPage(0) }}>
                      <td className="py-2 px-2 font-mono font-bold text-[var(--color-text)]">{yr}</td>
                      <td className="py-2 px-2 text-right font-mono text-[var(--color-text)]">{d.trades.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#22c55e]">{d.buys.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#ef4444]">{d.sells.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#f59e0b]">{d.whales}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#8b5cf6]">{d.options}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#ef4444]">{d.lates}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#f59e0b]">{d.crypto}</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>
        )
      })()}

      {/* ── Unusual Activity ── */}
      {tab === "unusual" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-mono text-sm font-bold text-[#8b5cf6]">Unusual Activity Detection</div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)]">
                Coordinated trades: 3+ politicians buying or selling the same stock within 7 days
              </div>
            </div>
          </div>
          <Explainer>
            <p><strong>If one politician buys a stock, that could be anything. If three politicians buy the same stock in the same week, that is a pattern.</strong></p>
            <p>This algorithm scans every trade in the database and finds <strong>clusters</strong>: moments when 3 or more members of Congress traded the same stock within a 7-day window. It scores each cluster by how many politicians were involved, how much money moved, and whether they were all moving in the same direction (all buying or all selling).</p>
            <p>A cluster where 5 politicians all <em>buy</em> the same stock in the same week scores higher than a mixed bag. Coordinated direction suggests shared information.</p>
            <p><strong>Volume surges</strong> (below the clusters) flag individual politicians who suddenly started trading a specific stock at 3x or more their historical average. A senator who traded NVDA once a year for five years and then made 10 trades in one quarter is worth a closer look.</p>
            <p>None of this proves wrongdoing. All of it warrants scrutiny.</p>
          </Explainer>

          {!unusualActivity && (
            <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">Loading...</div>
          )}

          {unusualActivity && unusualActivity.stats && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-[var(--color-bg-card)] border border-[#8b5cf633] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Clusters Found</div>
                  <div className="text-xl font-bold text-[#8b5cf6] font-mono">{unusualActivity.stats.totalClusters}</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#8b5cf633] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Volume Surges</div>
                  <div className="text-xl font-bold text-[#8b5cf6] font-mono">{unusualActivity.stats.totalSurges}</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#8b5cf633] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Window</div>
                  <div className="text-xl font-bold text-[var(--color-text)] font-mono">{unusualActivity.stats.clusterWindow} days</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#8b5cf633] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Total Trades</div>
                  <div className="text-xl font-bold text-[var(--color-text)] font-mono">{unusualActivity.stats.totalTrades.toLocaleString()}</div>
                </div>
              </div>

              {/* Two columns: Most Clustered Tickers + Most Frequent Participants */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6] mb-3">
                    Most Clustered Tickers
                  </div>
                  <div className="space-y-1">
                    {(unusualActivity.stats.topClusteredTickers || []).map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-[var(--color-bg-card)] border border-[var(--color-border)] p-2 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                        onClick={() => { setFlowTicker(t.ticker); setTab("flow") }}>
                        <span className="font-mono text-sm font-bold text-[var(--color-text)]">{t.ticker}</span>
                        <span className="font-mono text-[10px] text-[#8b5cf6]">{t.clusters} clusters</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6] mb-3">
                    Most Frequent Participants
                  </div>
                  <div className="space-y-1">
                    {(unusualActivity.stats.topClusterPols || []).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-[var(--color-bg-card)] border border-[var(--color-border)] p-2 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                        onClick={() => { setSearch(p.name); setTab("table"); setPage(0) }}>
                        <span className="text-sm font-medium text-[var(--color-text)]">{p.name}</span>
                        <span className="font-mono text-[10px] text-[#8b5cf6]">in {p.clusters} clusters</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cluster Cards */}
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6] mb-3">
                Coordinated Trading Clusters
              </div>
              <div className="space-y-3">
                {(unusualActivity.clusters || []).slice(0, 30).map((c: any, i: number) => {
                  const dirColor = c.direction === "BUY" ? "#22c55e" : c.direction === "SELL" ? "#ef4444" : "#8b5cf6"
                  return (
                    <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4"
                      style={{ borderLeftWidth: 4, borderLeftColor: dirColor }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg font-bold text-[var(--color-text)]">{c.ticker}</span>
                          <span className="px-2 py-0.5 font-mono text-[9px] font-bold" style={{ color: dirColor, backgroundColor: dirColor + '22' }}>
                            {c.direction}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
                            {c.politicians.length} politicians · {c.trades.length} trades · {c.windowDays} day{c.windowDays !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm font-bold text-[var(--color-text)]">{fmtK(c.totalVolume)}</div>
                          <div className="font-mono text-[9px] text-[var(--color-text-dim)]">
                            {c.startDate} — {c.endDate}
                          </div>
                        </div>
                      </div>

                      {/* Politicians involved */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {c.politicians.map((p: string, pi: number) => (
                          <span key={pi} className="px-2 py-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-[9px] text-[var(--color-text)] cursor-pointer hover:border-[var(--color-steel)]"
                            onClick={() => { setSearch(p); setTab("table"); setPage(0) }}>
                            {p}
                          </span>
                        ))}
                      </div>

                      {/* Individual trades */}
                      <div className="space-y-1">
                        {c.trades.map((t: any, ti: number) => (
                          <div key={ti} className="flex items-center gap-3 text-[10px] font-mono">
                            <span className="text-[var(--color-text-dim)] w-20">{fmtDate(t.transactionDate)}</span>
                            <span className={`px-1.5 py-0.5 text-[8px] font-bold ${
                              t.type === "Purchase" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                            }`}>
                              {t.type === "Purchase" ? "BUY" : "SELL"}
                            </span>
                            <span className="text-[var(--color-text)] flex-1 truncate">{t.politician}</span>
                            <span className="text-[var(--color-text)] font-bold">{fmtK(t.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Volume Surges */}
              {(unusualActivity.surges || []).length > 0 && (
                <div className="mt-6">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6] mb-3">
                    Volume Surges — Politicians Trading 3x+ Their Historical Average
                  </div>
                  <div className="space-y-2">
                    {(unusualActivity.surges || []).slice(0, 20).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                        onClick={() => { setSearch(s.politician); setTab("table"); setPage(0) }}>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[var(--color-text)]">{s.politician}</div>
                          <div className="font-mono text-[10px] text-[var(--color-text-dim)]">{s.ticker} · {s.period}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-lg font-bold text-[#8b5cf6]">{s.surgeMultiple}x</div>
                          <div className="font-mono text-[9px] text-[var(--color-text-dim)]">
                            {fmtK(s.recentVolume)} vs avg {fmtK(s.historicalAvgVolume)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Committee Conflicts ── */}
      {tab === "conflicts" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠</span>
            <div>
              <div className="font-mono text-sm font-bold text-[#ef4444]">Committee-Trade Conflicts</div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)]">
                Politicians trading stocks in sectors their committees oversee
              </div>
            </div>
          </div>
          <Explainer>
            <p><strong>Congress works through committees. Each committee oversees a specific part of the economy.</strong></p>
            <p>The Armed Services Committee oversees defense. The Finance Committee oversees banking and insurance. The Energy Committee oversees oil and utilities. These committees write the regulations, approve the budgets, and conduct the oversight that directly affects the stock prices of companies in their sectors.</p>
            <p>This tab flags every trade where <strong>a politician trades stocks in a sector their own committee regulates.</strong> A member of the Armed Services Committee buying Lockheed Martin stock. A Finance Committee member trading Goldman Sachs. These are not illegal under current law. But they represent a structural conflict of interest: the regulator is betting on the companies they regulate.</p>
            <p>The "Top Offenders" list ranks politicians by the total dollar volume of their conflicting trades. The red left-border on table rows marks committee chairs and ranking members, who have the most direct influence over their sector.</p>
          </Explainer>

          {!committeeConflicts && (
            <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">Loading conflict data...</div>
          )}

          {committeeConflicts && committeeConflicts.error && (
            <div className="text-center py-16 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="font-mono text-sm text-[var(--color-text-dim)]">{committeeConflicts.error}</div>
            </div>
          )}

          {committeeConflicts && committeeConflicts.stats && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-[var(--color-bg-card)] border border-[#ef444433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Conflicting Trades</div>
                  <div className="text-xl font-bold text-[#ef4444] font-mono">{committeeConflicts.stats.totalConflicts.toLocaleString()}</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#ef444433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Total Volume</div>
                  <div className="text-xl font-bold text-[var(--color-text)] font-mono">{fmtK(committeeConflicts.stats.totalVolume)}</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#ef444433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Politicians</div>
                  <div className="text-xl font-bold text-[var(--color-text)] font-mono">{committeeConflicts.stats.uniquePoliticians}</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#ef444433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Sector Coverage</div>
                  <div className="text-xl font-bold text-[var(--color-text)] font-mono">{committeeConflicts.stats.sectorCoverage}</div>
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono">{committeeConflicts.stats.tradesWithSector} of {committeeConflicts.stats.tradesTotal} trades mapped</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Sector Breakdown */}
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#ef4444] mb-3">
                    Conflicts by Sector
                  </div>
                  <div className="space-y-2">
                    {(committeeConflicts.sectorBreakdown || []).map((s: any, i: number) => {
                      const maxVol = committeeConflicts.sectorBreakdown[0]?.totalVol || 1
                      return (
                        <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm font-bold text-[var(--color-text)] capitalize">{s.sector}</span>
                            <span className="font-mono text-[10px] text-[var(--color-text-dim)]">{s.trades} trades · {s.politicians} members</span>
                          </div>
                          <div className="flex gap-1 h-3 mb-1">
                            {s.buyVol > 0 && (
                              <div className="bg-[#22c55e] h-full" style={{ width: `${s.buyVol / maxVol * 100}%` }} />
                            )}
                            {s.sellVol > 0 && (
                              <div className="bg-[#ef4444] h-full" style={{ width: `${s.sellVol / maxVol * 100}%` }} />
                            )}
                          </div>
                          <div className="flex justify-between font-mono text-[9px]">
                            <span className="text-[#22c55e]">{fmtK(s.buyVol)} bought</span>
                            <span className="text-[#ef4444]">{fmtK(s.sellVol)} sold</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top Offenders */}
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#ef4444] mb-3">
                    Top Offenders
                  </div>
                  <div className="space-y-2">
                    {(committeeConflicts.topOffenders || []).slice(0, 20).map((o: any, i: number) => {
                      const maxVol = committeeConflicts.topOffenders[0]?.volume || 1
                      return (
                        <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                          onClick={() => { setSearch(o.name); setTab("table"); setPage(0) }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[var(--color-text)]">{o.name}</span>
                            <span className="font-mono text-[10px] text-[var(--color-text-dim)]">{o.total} trades · {fmtK(o.volume)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {o.committees.map((c: string, ci: number) => (
                              <span key={ci} className="px-1.5 py-0.5 bg-[#ef444422] text-[#ef4444] font-mono text-[8px] font-bold">
                                {c}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {o.tickers.slice(0, 10).map((tk: string, ti: number) => (
                              <span key={ti} className="px-1 py-0.5 bg-[var(--color-bg)] text-[var(--color-text-dim)] font-mono text-[8px]">
                                {tk}
                              </span>
                            ))}
                            {o.tickers.length > 10 && (
                              <span className="font-mono text-[8px] text-[var(--color-text-dim)]">+{o.tickers.length - 10} more</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Conflict table */}
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#ef4444] mb-3">
                  All Conflicts ({(committeeConflicts.conflicts || []).length})
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Politician</th>
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Ticker</th>
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Sector</th>
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Committee</th>
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Role</th>
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Type</th>
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Amount</th>
                      <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(committeeConflicts.conflicts || []).slice(0, 100).map((c: any, i: number) => (
                      <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
                        style={{ borderLeftWidth: 3, borderLeftColor: c.role?.includes('chair') || c.role?.includes('ranking') ? '#ef4444' : 'transparent' }}>
                        <td className="py-2 px-2 text-[var(--color-text)] font-medium">{c.politician}</td>
                        <td className="py-2 px-2 font-mono font-bold text-[var(--color-text)]">{c.trade?.ticker}</td>
                        <td className="py-2 px-2">
                          <span className="px-1.5 py-0.5 bg-[#ef444422] text-[#ef4444] font-mono text-[8px] font-bold capitalize">{c.sector}</span>
                        </td>
                        <td className="py-2 px-2 text-[var(--color-text-dim)] font-mono text-[10px]">{c.committee}</td>
                        <td className="py-2 px-2">
                          <span className={`font-mono text-[9px] font-bold ${c.role?.includes('chair') || c.role?.includes('ranking') ? 'text-[#ef4444]' : 'text-[var(--color-text-dim)]'}`}>
                            {c.role}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 font-mono text-[9px] font-bold ${
                            c.trade?.type === "Purchase" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                          }`}>
                            {c.trade?.type === "Purchase" ? "BUY" : "SELL"}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-[var(--color-text)]">{fmtK(c.amount || 0)}</td>
                        <td className="py-2 px-2 text-[var(--color-text-dim)] font-mono whitespace-nowrap">{fmtDate(c.trade?.transactionDate || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Lobby-Trade Cross-Reference ── */}
      {tab === "lobby" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💰</span>
            <div>
              <div className="font-mono text-sm font-bold text-[#06b6d4]">Lobby-Trade Cross-Reference</div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)]">
                Companies that spend millions lobbying Congress whose stock is traded by sitting members
              </div>
            </div>
          </div>

          <Explainer>
            <p><strong>Corporations spend billions lobbying Congress every year. Some of the same politicians being lobbied also trade those corporations' stocks.</strong></p>
            <p>Here is how the money flows in three steps:</p>
            <p>1. <strong>Company lobbies Congress</strong> (disclosed in Senate LDA filings). Pfizer spent $53M. Amazon spent $42M. General Motors spent $61M.</p>
            <p>2. <strong>Company (or its PAC) donates to specific politicians</strong> (disclosed in FEC filings). This buys access and influence.</p>
            <p>3. <strong>Those same politicians trade the company's stock</strong> (disclosed in STOCK Act filings). The politician now has a personal financial interest in the company's success.</p>
            <p>The <span style={{color:'#ef4444'}}>Triple Conflict</span> section at the top shows the worst cases: politicians who are <em>funded by</em> a lobbying entity AND trade that entity's stock. The company is paying for access, the politician is taking the money, and then betting on the company's stock price. All legal. All disclosed. All corrupt.</p>
            <p><strong>"Lobby Exposure"</strong> measures how much total lobbying spend is represented by the stocks a politician trades. A politician trading $50K of Pfizer stock has $53M of lobby exposure, because Pfizer spends $53M/year influencing the laws that politician writes.</p>
          </Explainer>

          {!lobbyData && <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">Loading...</div>}

          {lobbyData && lobbyData.stats && (
            <>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-[var(--color-bg-card)] border border-[#06b6d433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Lobby-Trade Matches</div>
                  <div className="text-xl font-bold text-[#06b6d4] font-mono">{lobbyData.stats.totalMatches.toLocaleString()}</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#06b6d433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Lobbying Entities</div>
                  <div className="text-xl font-bold text-[var(--color-text)] font-mono">{lobbyData.stats.entitiesWithTickers}</div>
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono">of {lobbyData.stats.entitiesTotal} mapped</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#06b6d433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Politicians Trading</div>
                  <div className="text-xl font-bold text-[var(--color-text)] font-mono">{lobbyData.stats.uniquePoliticians}</div>
                </div>
                <div className="bg-[var(--color-bg-card)] border border-[#06b6d433] p-3">
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Funded AND Traded</div>
                  <div className="text-xl font-bold text-[#ef4444] font-mono">{lobbyData.stats.fundedAndTradedCount}</div>
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono">Triple conflict</div>
                </div>
              </div>

              {/* Funded AND Traded - the triple conflicts */}
              {(lobbyData.fundedAndTraded || []).length > 0 && (
                <div className="mb-6">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#ef4444] mb-2">
                    Triple Conflict: Funded by Lobby Entity + Trades Their Stock
                  </div>
                  <div className="text-[10px] text-[var(--color-text-dim)] font-mono mb-3">
                    These politicians receive money from an entity that lobbies Congress, and also trade that entity's stock.
                  </div>
                  <div className="space-y-2">
                    {(lobbyData.fundedAndTraded || []).map((f: any, i: number) => (
                      <div key={i} className="bg-[var(--color-bg-card)] border border-[#ef4444] p-3" style={{ borderLeftWidth: 4 }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-[var(--color-text)]">{f.politician}</span>
                            <span className="font-mono text-[10px] text-[#06b6d4] ml-2">← funded by →</span>
                            <span className="text-sm font-bold text-[var(--color-text)] ml-2">{f.entity}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-[10px] text-[var(--color-text-dim)]">{f.ticker} · {f.tradeCount} trades · {fmtK(f.tradeVolume)}</div>
                            <div className="font-mono text-[10px] text-[#06b6d4]">Entity lobby spend: {fmtK(f.lobbySpend)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Top Lobbying Entities Traded */}
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#06b6d4] mb-3">
                    Top Lobbying Entities Whose Stock Is Traded
                  </div>
                  <div className="space-y-2">
                    {(lobbyData.topEntities || []).map((e: any, i: number) => {
                      const maxSpend = lobbyData.topEntities[0]?.spend || 1
                      return (
                        <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-sm font-medium text-[var(--color-text)]">{e.entity}</span>
                              <span className="font-mono text-[10px] text-[var(--color-text-dim)] ml-2">{e.tickers.join(', ')}</span>
                            </div>
                            <span className="font-mono text-[10px] text-[#06b6d4]">{fmtK(e.spend)} lobbying</span>
                          </div>
                          <div className="h-2 bg-[var(--color-border)] mb-1">
                            <div className="h-full bg-[#06b6d4]" style={{ width: `${(e.spend / maxSpend) * 100}%` }} />
                          </div>
                          <div className="flex justify-between font-mono text-[9px] text-[var(--color-text-dim)]">
                            <span>{e.politicianCount} politicians trading</span>
                            <span>{e.trades} trades · {fmtK(e.tradeVolume)} volume</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Politicians Most Exposed to Lobbying Entities */}
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#06b6d4] mb-3">
                    Politicians Most Exposed to Lobbying Entities
                  </div>
                  <div className="space-y-2">
                    {(lobbyData.topPoliticians || []).map((p: any, i: number) => (
                      <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 cursor-pointer hover:bg-[var(--color-bg-hover)]"
                        onClick={() => { setSearch(p.politician); setTab("table"); setPage(0) }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--color-text)]">{p.politician}</span>
                          <span className="font-mono text-[10px] text-[#06b6d4]">{fmtK(p.totalLobbyExposure)} exposure</span>
                        </div>
                        <div className="font-mono text-[9px] text-[var(--color-text-dim)]">
                          {p.trades} trades in {p.entityCount} lobbying entities · {fmtK(p.tradeVolume)} volume
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.entities.slice(0, 5).map((e: string, ei: number) => (
                            <span key={ei} className="px-1.5 py-0.5 bg-[#06b6d422] text-[#06b6d4] font-mono text-[8px] font-bold">{e}</span>
                          ))}
                          {p.entities.length > 5 && <span className="font-mono text-[8px] text-[var(--color-text-dim)]">+{p.entities.length - 5}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Crypto ── */}
      {tab === "crypto" && cryptoStats && (() => {
        const toggleTier = (tier: CryptoTier) => {
          setActiveTiers(prev => {
            const next = new Set(prev)
            if (next.has(tier)) next.delete(tier)
            else next.add(tier)
            return next
          })
        }
        const filteredCryptoTickers = cryptoStats.topTickers.filter(tk => activeTiers.has(tk.tier))
        const filteredCryptoTraders = cryptoStats.topTraders.filter(tr => tr.tiers.some(t => activeTiers.has(t)))
        const filteredCryptoTrades = trades.filter(t => t.isCrypto && t.cryptoTier && activeTiers.has(t.cryptoTier))
        const filteredBuyVol = filteredCryptoTrades.reduce((s, t) => s + (t.type === "Purchase" ? (t.amount.max || t.amount.min || 0) : 0), 0)
        const filteredSellVol = filteredCryptoTrades.reduce((s, t) => s + (t.type === "Sale" ? (t.amount.max || t.amount.min || 0) : 0), 0)

        return (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">₿</span>
              <div>
                <div className="font-mono text-sm font-bold text-[#f59e0b]">Congressional Crypto Trades</div>
                <div className="font-mono text-[10px] text-[var(--color-text-dim)]">
                  Who in Congress is trading crypto while writing crypto law?
                </div>
              </div>
            </div>
          </div>

          <Explainer>
            <p><strong>Congress is writing the rules for cryptocurrency. Some of the people writing those rules are also trading crypto.</strong></p>
            <p>The GENIUS Act, FIT21, stablecoin legislation, CBDC bans. These bills will determine whether crypto is regulated like securities, commodities, or something new entirely. The outcome will move billions of dollars in crypto market value. And some of the lawmakers deciding that outcome have personal crypto positions.</p>
            <p>We track four tiers of crypto exposure:</p>
            <p><strong style={{color:'#f59e0b'}}>Direct Crypto:</strong> Bitcoin, Ethereum, and other cryptocurrencies held directly. The clearest conflict.</p>
            <p><strong style={{color:'#8b5cf6'}}>Crypto ETFs:</strong> Grayscale Bitcoin Trust, iShares Bitcoin, ProShares Bitcoin ETF. Pure crypto exposure through traditional brokerage accounts.</p>
            <p><strong style={{color:'#3b82f6'}}>Crypto Companies:</strong> Coinbase, Marathon Digital, Riot Platforms, MicroStrategy. Companies whose revenue comes primarily from crypto.</p>
            <p><strong style={{color:'#6b7280'}}>Crypto-Adjacent:</strong> PayPal, Block (Square), Robinhood. Companies that touch crypto but it is not their core business. These are off by default because buying PayPal is not the same signal as buying Bitcoin.</p>
            <p>The <span style={{color:'#ef4444'}}>Trade-Vote Conflicts</span> section (when available) shows politicians who traded crypto within 60 days of voting on crypto legislation. A trade 1-7 days before a vote is flagged <span style={{color:'#ef4444'}}>HIGH</span> suspicion.</p>
          </Explainer>

          {/* Tier filter toggles */}
          <div className="flex gap-2 mb-4">
            {(['direct', 'etf', 'company', 'adjacent'] as CryptoTier[]).map(tier => {
              const isActive = activeTiers.has(tier)
              const tierData = cryptoStats.tiers[tier]
              return (
                <button key={tier} onClick={() => toggleTier(tier)}
                  className={`flex-1 p-3 border font-mono text-left transition-all ${
                    isActive
                      ? `border-[${TIER_COLORS[tier]}] bg-[${TIER_COLORS[tier]}11]`
                      : 'border-[var(--color-border)] opacity-40 hover:opacity-70'
                  }`}
                  style={isActive ? { borderColor: TIER_COLORS[tier], backgroundColor: TIER_COLORS[tier] + '11' } : {}}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isActive ? TIER_COLORS[tier] : 'var(--color-text-dim)' }}>
                      {TIER_LABELS[tier]}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: isActive ? TIER_COLORS[tier] : 'var(--color-text-dim)' }}>
                      {tierData.trades}
                    </span>
                  </div>
                  <div className="text-[9px] text-[var(--color-text-dim)] leading-tight">{TIER_DESC[tier]}</div>
                  {tierData.trades > 0 && (
                    <div className="flex gap-3 mt-2 text-[9px]">
                      <span className="text-[#22c55e]">{fmtK(tierData.buyAmt)} bought</span>
                      <span className="text-[#ef4444]">{fmtK(tierData.sellAmt)} sold</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Filtered stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Filtered Trades</div>
              <div className="text-xl font-bold text-[#f59e0b] font-mono">{filteredCryptoTrades.length.toLocaleString()}</div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Buy Volume</div>
              <div className="text-xl font-bold text-[#22c55e] font-mono">{fmtK(filteredBuyVol)}</div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Sell Volume</div>
              <div className="text-xl font-bold text-[#ef4444] font-mono">{fmtK(filteredSellVol)}</div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Politicians</div>
              <div className="text-xl font-bold text-[var(--color-text)] font-mono">{filteredCryptoTraders.length}</div>
            </div>
          </div>

          {/* ── Conflict Timeline ── */}
          {cryptoConflicts && cryptoConflicts.conflicts && cryptoConflicts.conflicts.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠</span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#ef4444]">
                    Trade-Vote Conflicts
                  </span>
                </div>
                <div className="font-mono text-[9px] text-[var(--color-text-dim)]">
                  {cryptoConflicts.stats.highSuspicion} high · {cryptoConflicts.stats.mediumSuspicion} medium · {cryptoConflicts.stats.totalConflicts} total
                </div>
              </div>
              <div className="text-[10px] text-[var(--color-text-dim)] font-mono mb-3">
                Politicians who traded crypto within 60 days of voting on crypto legislation.
                <span className="text-[#ef4444] font-bold ml-1">RED</span> = traded 1-7 days before vote (highest suspicion).
                <span className="text-[#f59e0b] font-bold ml-1">AMBER</span> = 8-30 days before or 1-14 days after.
              </div>

              {/* Conflict cards — show top 20 highest suspicion */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {cryptoConflicts.conflicts.slice(0, 30).map((c: any, i: number) => {
                  const borderColor = c.suspicionLevel === "high" ? "#ef4444" : c.suspicionLevel === "medium" ? "#f59e0b" : "#6b7280"
                  const bgColor = c.suspicionLevel === "high" ? "#ef444408" : c.suspicionLevel === "medium" ? "#f59e0b08" : "transparent"
                  const daysText = c.direction === "before"
                    ? `${Math.abs(c.daysBetween)} days BEFORE vote`
                    : `${Math.abs(c.daysBetween)} days AFTER vote`

                  return (
                    <div key={i} className="border p-3 font-mono"
                      style={{ borderColor, backgroundColor: bgColor, borderLeftWidth: 4 }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-sm font-bold text-[var(--color-text)]">{c.politician}</span>
                          <span className="ml-2 px-1.5 py-0.5 text-[8px] font-bold uppercase"
                            style={{ color: borderColor, backgroundColor: borderColor + '22' }}>
                            {c.suspicionLevel}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: borderColor }}>
                          {daysText}
                        </span>
                      </div>

                      {/* Two-column: trade vs vote */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Trade side */}
                        <div className="border-r border-[var(--color-border)] pr-4">
                          <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] mb-1">Trade</div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold ${
                              c.trade.type === "Purchase" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" : "bg-[rgba(239,68,68,0.15)] text-[#ef4444]"
                            }`}>
                              {c.trade.type === "Purchase" ? "BUY" : "SELL"}
                            </span>
                            <span className="text-[11px] font-bold text-[#f59e0b]">{c.trade.ticker}</span>
                            <span className="text-[10px] text-[var(--color-text)]">{fmtK(c.trade.amount?.max || c.trade.amount?.min || 0)}</span>
                          </div>
                          <div className="text-[9px] text-[var(--color-text-dim)] mt-1">{c.trade.transactionDate}</div>
                        </div>

                        {/* Vote side */}
                        <div>
                          <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] mb-1">Vote</div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold ${
                              c.vote.memberVote === "+" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" :
                              c.vote.memberVote === "-" ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444]" :
                              "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-dim)]"
                            }`}>
                              {c.vote.memberVoteLabel}
                            </span>
                            <span className="text-[10px] text-[var(--color-text)]">{c.vote.billDisplay}</span>
                          </div>
                          <div className="text-[9px] text-[var(--color-text-dim)] mt-1 truncate" title={c.vote.billName}>
                            {c.vote.billName}
                          </div>
                          <div className="text-[9px] text-[var(--color-text-dim)]">{c.vote.voteDate?.split("T")[0]}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {cryptoConflicts.conflicts.length > 30 && (
                <div className="text-center mt-2 font-mono text-[9px] text-[var(--color-text-dim)]">
                  Showing top 30 of {cryptoConflicts.conflicts.length} conflicts
                </div>
              )}
            </div>
          )}

          {filteredCryptoTrades.length === 0 && (
            <div className="text-center py-16 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="text-4xl mb-3">₿</div>
              <div className="font-mono text-sm text-[var(--color-text-dim)]">No trades match selected tiers</div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)] mt-1">
                Toggle tier filters above to see trades
              </div>
            </div>
          )}

          {filteredCryptoTrades.length > 0 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Top Crypto Assets */}
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] mb-3">
                  Top Crypto Assets
                </div>
                <div className="space-y-2">
                  {filteredCryptoTickers.map((tk, i) => {
                    const maxVol = filteredCryptoTickers[0]?.volume || 1
                    const tierColor = TIER_COLORS[tk.tier]
                    return (
                      <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                        onClick={() => { setFlowTicker(tk.ticker); setTab("flow") }}
                        style={{ borderLeftWidth: 3, borderLeftColor: tierColor }}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold" style={{ color: tierColor }}>{tk.ticker}</span>
                            <span className="font-mono text-[10px] text-[var(--color-text-dim)]">{tk.category}</span>
                            <span className="px-1 py-0.5 font-mono text-[7px] font-bold uppercase tracking-wider"
                              style={{ color: tierColor, backgroundColor: tierColor + '22' }}>
                              {TIER_LABELS[tk.tier]}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-[var(--color-text-dim)]">{fmtK(tk.volume)}</span>
                        </div>
                        <div className="flex gap-1 h-3">
                          {tk.buyAmt > 0 && (
                            <div className="bg-[#22c55e] h-full" style={{ width: `${tk.buyAmt / maxVol * 100}%` }} />
                          )}
                          {tk.sellAmt > 0 && (
                            <div className="bg-[#ef4444] h-full" style={{ width: `${tk.sellAmt / maxVol * 100}%` }} />
                          )}
                        </div>
                        <div className="flex justify-between mt-1 font-mono text-[9px]">
                          <span className="text-[#22c55e]">{tk.buys} buys ({fmtK(tk.buyAmt)})</span>
                          <span className="text-[#ef4444]">{tk.sells} sells ({fmtK(tk.sellAmt)})</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top Crypto Politicians */}
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] mb-3">
                  Top Crypto Politicians
                </div>
                <div className="space-y-2">
                  {filteredCryptoTraders.map((tr, i) => {
                    const maxVol = filteredCryptoTraders[0] ? (filteredCryptoTraders[0].buyAmt + filteredCryptoTraders[0].sellAmt) : 1
                    const vol = tr.buyAmt + tr.sellAmt
                    return (
                      <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                        onClick={() => { setSearch(tr.name); setTab("table"); setPage(0) }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--color-text)]">{tr.name}</span>
                          <span className="font-mono text-[10px] text-[var(--color-text-dim)]">{fmtK(vol)}</span>
                        </div>
                        <div className="flex gap-1 h-3">
                          {tr.buyAmt > 0 && (
                            <div className="bg-[#22c55e] h-full" style={{ width: `${tr.buyAmt / maxVol * 100}%` }} />
                          )}
                          {tr.sellAmt > 0 && (
                            <div className="bg-[#ef4444] h-full" style={{ width: `${tr.sellAmt / maxVol * 100}%` }} />
                          )}
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="font-mono text-[9px] text-[#22c55e]">{tr.buys} buys</span>
                          <span className="font-mono text-[9px] text-[#ef4444]">{tr.sells} sells</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tr.tickers.map(tk => {
                            const info = TIER_COLORS as Record<string, string>
                            const tkTier = filteredCryptoTickers.find(ct => ct.ticker === tk)?.tier || 'direct'
                            return (
                              <span key={tk} className="px-1.5 py-0.5 font-mono text-[8px] font-bold"
                                style={{ backgroundColor: TIER_COLORS[tkTier] + '22', color: TIER_COLORS[tkTier] }}>
                                {tk}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Crypto trades table */}
          {filteredCryptoTrades.length > 0 && (
            <div className="mt-6">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] mb-3">
                All Crypto Trades ({filteredCryptoTrades.length})
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Politician</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Asset</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Tier</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Type</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Date</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Amount</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCryptoTrades.sort((a, b) => {
                    const da = new Date(a.transactionDate).getTime() || 0
                    const db = new Date(b.transactionDate).getTime() || 0
                    return db - da
                  }).map((t, i) => {
                    const tierColor = t.cryptoTier ? TIER_COLORS[t.cryptoTier] : '#f59e0b'
                    return (
                    <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">
                      <td className="py-2 px-2">
                        <div className="text-[var(--color-text)] font-medium">{t.politician}</div>
                        <div className="text-[9px] text-[var(--color-text-dim)]">
                          <span className={`inline-block px-1 font-bold text-[8px] mr-1 ${t.chamber === "Senate" ? "bg-[var(--color-text)] text-[var(--color-bg)]" : "bg-[#3b82f6] text-white"}`}>
                            {t.chamber === "Senate" ? "SEN" : "HSE"}
                          </span>
                          {t.state}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <span className="font-mono font-bold" style={{ color: tierColor }}>{t.ticker}</span>
                        {t.cryptoCategory && <div className="font-mono text-[9px] text-[var(--color-text-dim)]">{t.cryptoCategory}</div>}
                      </td>
                      <td className="py-2 px-2">
                        {t.cryptoTier && (
                          <span className="px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase"
                            style={{ color: tierColor, backgroundColor: tierColor + '22' }}>
                            {TIER_LABELS[t.cryptoTier]}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 font-mono text-[9px] font-bold ${
                          t.type === "Purchase" ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" :
                          t.type === "Sale" ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444]" :
                          "bg-[rgba(255,255,255,0.05)] text-[var(--color-text-dim)]"
                        }`}>
                          {t.type === "Purchase" ? "BUY" : t.type === "Sale" ? "SELL" : t.type}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[var(--color-text-dim)] font-mono whitespace-nowrap">{fmtDate(t.transactionDate)}</td>
                      <td className="py-2 px-2 font-mono font-bold text-[var(--color-text)]">{fmtK(t.amount.max || t.amount.min || 0)}</td>
                      <td className="py-2 px-2">
                        {t.sourceUrl && (
                          <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[var(--color-steel)] text-[9px] font-mono hover:underline">PDF</a>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )
      })()}

      {tab === "crypto" && !cryptoStats && (
        <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">
          No crypto data available
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Money Trail Graph — D3 Sankey-style flow visualization
// Politicians (left) → Stocks (right), green=buy, red=sell
// ═══════════════════════════════════════════════════════════════

function MoneyTrailGraph({ trades, svgRef }: { trades: Trade[]; svgRef: React.RefObject<SVGSVGElement | null> }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [tickerSearch, setTickerSearch] = useState("")
  const [selectedTickers, setSelectedTickers] = useState<string[]>([])

  // All available tickers sorted by volume
  const allTickers = useMemo(() => {
    const vol: Record<string, number> = {}
    for (const t of trades) {
      if (!t.ticker) continue
      vol[t.ticker] = (vol[t.ticker] || 0) + (t.amount.max || t.amount.min || 0)
    }
    return Object.entries(vol).sort((a, b) => b[1] - a[1]).map(([tk]) => tk)
  }, [trades])

  // Filtered ticker suggestions
  const suggestions = useMemo(() => {
    if (!tickerSearch) return allTickers.slice(0, 20)
    const s = tickerSearch.toUpperCase()
    return allTickers.filter(tk => tk.includes(s)).slice(0, 20)
  }, [tickerSearch, allTickers])

  // Default to top 10 if nothing selected
  const activeTickers = useMemo(() => {
    return selectedTickers.length > 0 ? selectedTickers : allTickers.slice(0, 10)
  }, [selectedTickers, allTickers])

  const toggleTicker = useCallback((tk: string) => {
    setSelectedTickers(prev => {
      if (prev.includes(tk)) return prev.filter(t => t !== tk)
      if (prev.length >= 20) return prev
      return [...prev, tk]
    })
  }, [])

  // Build graph data from active tickers only
  const graphData = useMemo(() => {
    const activeSet = new Set(activeTickers)
    const flows: Record<string, { pol: string; ticker: string; buyAmt: number; sellAmt: number; buys: number; sells: number }> = {}

    for (const t of trades) {
      if (!t.ticker || !activeSet.has(t.ticker)) continue
      const key = `${t.politician}|${t.ticker}`
      if (!flows[key]) flows[key] = { pol: t.politician, ticker: t.ticker, buyAmt: 0, sellAmt: 0, buys: 0, sells: 0 }
      const f = flows[key]
      if (t.type === "Purchase") { f.buyAmt += t.amount.max || t.amount.min || 0; f.buys++ }
      else if (t.type === "Sale") { f.sellAmt += t.amount.max || t.amount.min || 0; f.sells++ }
    }

    const allFlows = Object.values(flows).filter(f => (f.buys + f.sells) >= 1)
    const polSet = new Set(allFlows.map(f => f.pol))

    const polVolume: Record<string, number> = {}
    const tickerVolume: Record<string, number> = {}
    for (const f of allFlows) {
      polVolume[f.pol] = (polVolume[f.pol] || 0) + f.buyAmt + f.sellAmt
      tickerVolume[f.ticker] = (tickerVolume[f.ticker] || 0) + f.buyAmt + f.sellAmt
    }

    const pols = [...polSet].sort((a, b) => (polVolume[b] || 0) - (polVolume[a] || 0))
    const tickers = activeTickers.filter(tk => tickerVolume[tk])

    return { flows: allFlows, pols, tickers, polVolume, tickerVolume }
  }, [trades, activeTickers])

  // SVG dimensions
  const W = 900
  const polH = Math.max(400, graphData.pols.length * 28 + 40)
  const tickerH = Math.max(400, graphData.tickers.length * 22 + 40)
  const H = Math.max(polH, tickerH)
  const LEFT_X = 180
  const RIGHT_X = W - 100
  const NODE_W = 8

  // Y positions for politician nodes
  const polY = useMemo(() => {
    const positions: Record<string, number> = {}
    const spacing = H / (graphData.pols.length + 1)
    graphData.pols.forEach((p, i) => { positions[p] = spacing * (i + 1) })
    return positions
  }, [graphData.pols, H])

  // Y positions for ticker nodes
  const tickerY = useMemo(() => {
    const positions: Record<string, number> = {}
    const spacing = H / (graphData.tickers.length + 1)
    graphData.tickers.forEach((t, i) => { positions[t] = spacing * (i + 1) })
    return positions
  }, [graphData.tickers, H])

  // Max volume for scaling line thickness
  const maxVol = useMemo(() => {
    let m = 1
    for (const f of graphData.flows) m = Math.max(m, f.buyAmt + f.sellAmt)
    return m
  }, [graphData.flows])

  return (
    <div ref={containerRef}>
      {/* Ticker picker */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={tickerSearch}
            onChange={e => setTickerSearch(e.target.value)}
            placeholder="Search tickers to add..."
            className="flex-1 px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs focus:border-[var(--color-steel)] focus:outline-none"
          />
          <span className="font-mono text-[9px] text-[var(--color-text-dim)] whitespace-nowrap">
            {selectedTickers.length > 0 ? `${selectedTickers.length}/20 selected` : "Top 10 by volume"}
          </span>
          {selectedTickers.length > 0 && (
            <button onClick={() => setSelectedTickers([])}
              className="px-2 py-1 border border-[var(--color-border)] font-mono text-[9px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]">
              Reset
            </button>
          )}
        </div>

        {/* Ticker suggestion chips */}
        <div className="flex flex-wrap gap-1 mb-2">
          {suggestions.map(tk => {
            const isActive = activeTickers.includes(tk)
            return (
              <button key={tk} onClick={() => toggleTicker(tk)}
                className={`px-2 py-1 font-mono text-[10px] font-bold border transition-colors ${
                  isActive
                    ? "bg-[var(--color-steel)] border-[var(--color-steel)] text-white"
                    : "bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-steel)] hover:text-[var(--color-text)]"
                }`}>
                {tk}
              </button>
            )
          })}
        </div>

        {/* Selected tickers */}
        {selectedTickers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTickers.map(tk => (
              <span key={tk} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-steel)] text-white font-mono text-[9px] font-bold">
                {tk}
                <button onClick={() => toggleTicker(tk)} className="ml-1 opacity-60 hover:opacity-100">x</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info + Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex gap-4 font-mono text-[10px] font-bold">
          <span className="text-[#22c55e]">— BUY FLOW</span>
          <span className="text-[#ef4444]">— SELL FLOW</span>
          <span className="text-[var(--color-text-dim)]">Thickness = volume</span>
        </div>
        <div className="ml-auto font-mono text-[10px] text-[var(--color-text-dim)]">
          {graphData.pols.length} politicians → {graphData.tickers.length} stocks · {graphData.flows.length} flows
        </div>
      </div>

      {graphData.flows.length === 0 && (
        <div className="text-center py-16 text-[var(--color-text-dim)] font-mono text-sm">
          No trades found for selected tickers
        </div>
      )}

      {/* SVG Graph */}
      {graphData.flows.length > 0 && <div className="overflow-x-auto border border-[var(--color-border)] bg-[var(--color-bg)]">
        <svg ref={svgRef} width={W} height={H + 20} className="block">
          {/* Flow lines */}
          {graphData.flows.map((f, i) => {
            const y1 = polY[f.pol] || 0
            const y2 = tickerY[f.ticker] || 0
            const vol = f.buyAmt + f.sellAmt
            const thickness = Math.max(1, (vol / maxVol) * 12)
            const isHighlighted = hovered === f.pol || hovered === f.ticker
            const isDimmed = hovered !== null && !isHighlighted

            // Split into buy and sell lines
            return (
              <g key={i}>
                {f.buyAmt > 0 && (
                  <path
                    d={`M${LEFT_X + NODE_W},${y1} C${(LEFT_X + RIGHT_X) / 2},${y1} ${(LEFT_X + RIGHT_X) / 2},${y2 - 2} ${RIGHT_X},${y2 - 2}`}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={Math.max(0.5, (f.buyAmt / maxVol) * 12)}
                    opacity={isDimmed ? 0.1 : isHighlighted ? 0.9 : 0.3}
                    className="transition-opacity duration-150"
                  />
                )}
                {f.sellAmt > 0 && (
                  <path
                    d={`M${LEFT_X + NODE_W},${y1} C${(LEFT_X + RIGHT_X) / 2},${y1} ${(LEFT_X + RIGHT_X) / 2},${y2 + 2} ${RIGHT_X},${y2 + 2}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={Math.max(0.5, (f.sellAmt / maxVol) * 12)}
                    opacity={isDimmed ? 0.1 : isHighlighted ? 0.9 : 0.3}
                    className="transition-opacity duration-150"
                  />
                )}
              </g>
            )
          })}

          {/* Politician nodes (left) */}
          {graphData.pols.map((pol, i) => {
            const y = polY[pol] || 0
            const isHi = hovered === pol
            return (
              <g key={`pol-${i}`}
                onMouseEnter={() => setHovered(pol)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer">
                <rect x={LEFT_X} y={y - 8} width={NODE_W} height={16} fill={isHi ? "#5b8dce" : "#555"} />
                <text x={LEFT_X - 6} y={y + 4} textAnchor="end"
                  className="font-mono" fontSize={10} fill={isHi ? "#e4e4e7" : "#7a7a86"}>
                  {pol.length > 22 ? pol.slice(0, 20) + "..." : pol}
                </text>
                {isHi && (
                  <text x={LEFT_X + NODE_W + 6} y={y + 4} fontSize={9} fill="#5b8dce" className="font-mono">
                    {fmtK(graphData.polVolume[pol] || 0)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Ticker nodes (right) */}
          {graphData.tickers.map((ticker, i) => {
            const y = tickerY[ticker] || 0
            const isHi = hovered === ticker
            return (
              <g key={`tk-${i}`}
                onMouseEnter={() => setHovered(ticker)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer">
                <rect x={RIGHT_X} y={y - 8} width={NODE_W} height={16} fill={isHi ? "#5b8dce" : "#555"} />
                <text x={RIGHT_X + NODE_W + 6} y={y + 4} textAnchor="start"
                  className="font-mono font-bold" fontSize={11} fill={isHi ? "#e4e4e7" : "#9a9aa6"}>
                  {ticker}
                </text>
                {isHi && (
                  <text x={RIGHT_X - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#5b8dce" className="font-mono">
                    {fmtK(graphData.tickerVolume[ticker] || 0)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>}
    </div>
  )
}
