"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"

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
  topTickers: { ticker: string; buys: number; sells: number; buyAmt: number; sellAmt: number; total: number; volume: number; category: string }[]
  topTraders: { name: string; buys: number; sells: number; buyAmt: number; sellAmt: number; total: number; tickers: string[] }[]
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

export default function CapitolTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [topTickers, setTopTickers] = useState<TopTicker[]>([])
  const [topTraders, setTopTraders] = useState<TopTrader[]>([])
  const [cryptoStats, setCryptoStats] = useState<CryptoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"table" | "flow" | "trail" | "tickers" | "traders" | "crypto">("table")
  const trailRef = useRef<SVGSVGElement>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [chamber, setChamber] = useState("")
  const [tradeType, setTradeType] = useState("")
  const [owner, setOwner] = useState("")
  const [flowTicker, setFlowTicker] = useState("")

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
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = trades
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
  }, [trades, search, chamber, tradeType, owner, sortField, sortDir])

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] font-mono">Capitol Trades</h1>
          <p className="text-[10px] text-[var(--color-text-dim)] font-mono mt-1">
            Congressional stock trades from STOCK Act disclosures
          </p>
        </div>
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

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search politician or ticker..."
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

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] mb-4">
        {(["table", "flow", "trail", "tickers", "traders", "crypto"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider border-b-2 -mb-px ${
              tab === t ? "text-[var(--color-text)] border-[var(--color-steel)]" : "text-[var(--color-text-dim)] border-transparent hover:text-[var(--color-text)]"
            } ${t === "crypto" ? "ml-2 !text-[#f59e0b] " + (tab === t ? "!border-[#f59e0b]" : "") : ""}`}>
            {t === "table" ? "TRADES" : t === "flow" ? "STOCK FLOW" : t === "trail" ? "MONEY TRAIL" : t === "tickers" ? "TOP TICKERS" : t === "traders" ? "TOP TRADERS" : "CRYPTO"}
          </button>
        ))}
        <div className="ml-auto text-[10px] text-[var(--color-text-dim)] font-mono self-center">
          {filtered.length.toLocaleString()} results
        </div>
      </div>

      {/* ── Trades Table ── */}
      {tab === "table" && (
        <div>
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
              {paged.map((t, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">
                  <td className="py-2 px-2">
                    <div className="text-[var(--color-text)] font-medium">{t.politician}</div>
                    <div className="text-[9px] text-[var(--color-text-dim)]">
                      <span className={`inline-block px-1 font-bold text-[8px] mr-1 ${t.chamber === "Senate" ? "bg-[var(--color-text)] text-[var(--color-bg)]" : "bg-[#3b82f6] text-white"}`}>
                        {t.chamber === "Senate" ? "SEN" : "HSE"}
                      </span>
                      {t.state}{t.district ? `-${t.district}` : ""}
                    </div>
                  </td>
                  <td className="py-2 px-2 font-mono font-bold text-[var(--color-text)]">
                    {t.ticker || <span className="text-[var(--color-text-dim)]">N/A</span>}
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
              ))}
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
      {tab === "trail" && <MoneyTrailGraph trades={trades} svgRef={trailRef} />}

      {/* ── Top Tickers ── */}
      {tab === "tickers" && (
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
      )}

      {/* ── Top Traders ── */}
      {tab === "traders" && (
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
      )}

      {/* ── Crypto ── */}
      {tab === "crypto" && cryptoStats && (
        <div>
          {/* Crypto header */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">₿</span>
            <div>
              <div className="font-mono text-sm font-bold text-[#f59e0b]">Congressional Crypto Trades</div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)]">
                STOCK Act disclosures involving cryptocurrency, crypto ETFs, and crypto-related companies
              </div>
            </div>
          </div>

          {/* Crypto stats cards */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Crypto Trades</div>
              <div className="text-xl font-bold text-[#f59e0b] font-mono">{cryptoStats.totalTrades.toLocaleString()}</div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Buy Volume</div>
              <div className="text-xl font-bold text-[#22c55e] font-mono">{fmtK(cryptoStats.buyVolume)}</div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Sell Volume</div>
              <div className="text-xl font-bold text-[#ef4444] font-mono">{fmtK(cryptoStats.sellVolume)}</div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Crypto Assets</div>
              <div className="text-xl font-bold text-[#f59e0b] font-mono">{cryptoStats.uniqueTickers}</div>
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[#f59e0b33] p-3">
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono uppercase tracking-wider">Politicians</div>
              <div className="text-xl font-bold text-[var(--color-text)] font-mono">{cryptoStats.uniqueTraders}</div>
            </div>
          </div>

          {cryptoStats.totalTrades === 0 && (
            <div className="text-center py-16 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="text-4xl mb-3">₿</div>
              <div className="font-mono text-sm text-[var(--color-text-dim)]">No crypto trades found in current data</div>
              <div className="font-mono text-[10px] text-[var(--color-text-dim)] mt-1">
                Run the backfill with crypto detection to populate this tab
              </div>
            </div>
          )}

          {cryptoStats.totalTrades > 0 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Top Crypto Assets */}
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] mb-3">
                  Top Crypto Assets
                </div>
                <div className="space-y-2">
                  {cryptoStats.topTickers.map((tk, i) => {
                    const maxVol = cryptoStats.topTickers[0]?.volume || 1
                    return (
                      <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:border-[#f59e0b55] cursor-pointer"
                        onClick={() => { setFlowTicker(tk.ticker); setTab("flow") }}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-mono text-sm font-bold text-[#f59e0b]">{tk.ticker}</span>
                            <span className="font-mono text-[10px] text-[var(--color-text-dim)] ml-2">{tk.category}</span>
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
                  {cryptoStats.topTraders.map((tr, i) => {
                    const maxVol = cryptoStats.topTraders[0] ? (cryptoStats.topTraders[0].buyAmt + cryptoStats.topTraders[0].sellAmt) : 1
                    const vol = tr.buyAmt + tr.sellAmt
                    return (
                      <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 hover:border-[#f59e0b55] cursor-pointer"
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
                          {tr.tickers.map(tk => (
                            <span key={tk} className="px-1.5 py-0.5 bg-[#f59e0b22] text-[#f59e0b] font-mono text-[8px] font-bold">
                              {tk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Crypto trades table */}
          {cryptoStats.totalTrades > 0 && (
            <div className="mt-6">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] mb-3">
                All Crypto Trades
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Politician</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Asset</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Type</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Date</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Amount</th>
                    <th className="py-2 px-2 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.filter(t => t.isCrypto).sort((a, b) => {
                    const da = new Date(a.transactionDate).getTime() || 0
                    const db = new Date(b.transactionDate).getTime() || 0
                    return db - da
                  }).map((t, i) => (
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
                        <span className="font-mono font-bold text-[#f59e0b]">{t.ticker}</span>
                        {t.cryptoCategory && <span className="font-mono text-[9px] text-[var(--color-text-dim)] ml-1">{t.cryptoCategory}</span>}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                    opacity={isDimmed ? 0.05 : isHighlighted ? 0.9 : 0.25}
                    className="transition-opacity duration-150"
                  />
                )}
                {f.sellAmt > 0 && (
                  <path
                    d={`M${LEFT_X + NODE_W},${y1} C${(LEFT_X + RIGHT_X) / 2},${y1} ${(LEFT_X + RIGHT_X) / 2},${y2 + 2} ${RIGHT_X},${y2 + 2}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={Math.max(0.5, (f.sellAmt / maxVol) * 12)}
                    opacity={isDimmed ? 0.05 : isHighlighted ? 0.9 : 0.25}
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
