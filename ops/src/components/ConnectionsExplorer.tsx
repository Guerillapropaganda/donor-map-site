"use client"

import { useState, useMemo } from "react"

interface MonetaryDetail {
  name: string
  amount: number
  cycle: string
  confidence: number
}

interface ProfileEdges {
  related: string[]
  donors: string[]
  "politicians-funded": string[]
  opposes: string[]
  stories: string[]
  "government-contracts": string[]
  "monetary-detail": MonetaryDetail[]
  "contract-detail": MonetaryDetail[]
}

interface Props {
  profileTitle: string
  profileType: string
  edges: ProfileEdges | null
}

type FilterMode = "money" | "contracts" | "opposition" | "network" | "all"
type SortMode = "amount" | "name" | "cycle"

const FILTER_CONFIG: Record<FilterMode, { label: string; color: string; explainer: string }> = {
  money: {
    label: "Money Trail",
    color: "var(--color-green)",
    explainer: "Who funds this profile and how much. Dollar amounts from FEC filings (committee-to-candidate contributions). Sorted by total across all election cycles.",
  },
  contracts: {
    label: "Contracts",
    color: "var(--color-steel)",
    explainer: "Federal contracts awarded to this entity by government agencies. Dollar amounts from USASpending.gov (Tier 1 government source). Shows total obligation by awarding agency across fiscal years.",
  },
  opposition: {
    label: "Opposition",
    color: "var(--color-red)",
    explainer: "Organizations actively spending against this profile. Includes independent expenditures opposing a candidate and documented political opposition from the vault.",
  },
  network: {
    label: "Network",
    color: "#a855f7",
    explainer: "Related profiles in the vault. These are editorial connections documented by Research Claude: shared donors, policy intersections, organizational ties. Not all have dollar amounts.",
  },
  all: {
    label: "All",
    color: "var(--color-text)",
    explainer: "Every connection tracked for this profile across all categories. Internal view — the public site filters to high-confidence monetary and contract edges only.",
  },
}

const AMOUNT_THRESHOLDS = [
  { label: "All", value: 0 },
  { label: "$1K+", value: 1000 },
  { label: "$10K+", value: 10000 },
  { label: "$100K+", value: 100000 },
  { label: "$1M+", value: 1000000 },
]

function formatDollars(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B"
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K"
  return "$" + n.toLocaleString()
}

export function ConnectionsExplorer({ profileTitle, profileType, edges }: Props) {
  const [filter, setFilter] = useState<FilterMode>("money")
  const [sort, setSort] = useState<SortMode>("amount")
  const [minAmount, setMinAmount] = useState(0)

  const isPolitician = profileType === "politician" || profileType === "state-politician"
  const isCorporation = profileType === "corporation"

  // Aggregate monetary-detail by name (sum across cycles)
  const monetaryByName = useMemo(() => {
    const map = new Map<string, { total: number; cycles: string[]; maxConf: number }>()
    for (const d of edges?.["monetary-detail"] ?? []) {
      const existing = map.get(d.name)
      if (existing) {
        existing.total += d.amount
        if (!existing.cycles.includes(d.cycle)) existing.cycles.push(d.cycle)
        existing.maxConf = Math.max(existing.maxConf, d.confidence)
      } else {
        map.set(d.name, { total: d.amount, cycles: [d.cycle], maxConf: d.confidence })
      }
    }
    return map
  }, [edges])

  // Aggregate contract-detail by name
  const contractByName = useMemo(() => {
    const map = new Map<string, { total: number; cycles: string[]; maxConf: number }>()
    for (const d of edges?.["contract-detail"] ?? []) {
      const existing = map.get(d.name)
      if (existing) {
        existing.total += d.amount
        if (!existing.cycles.includes(d.cycle)) existing.cycles.push(d.cycle)
        existing.maxConf = Math.max(existing.maxConf, d.confidence)
      } else {
        map.set(d.name, { total: d.amount, cycles: [d.cycle], maxConf: d.confidence })
      }
    }
    return map
  }, [edges])

  // Build filtered + sorted connection list
  type ConnectionRow = { name: string; type: "money" | "contract" | "opposition" | "related" | "story"; amount: number; cycles: string[]; confidence: number }

  const rows = useMemo(() => {
    const result: ConnectionRow[] = []

    if (filter === "money" || filter === "all") {
      // For politicians: donors are the money trail
      // For donors/corps: politicians-funded are the money trail
      const moneyNames = isPolitician ? (edges?.donors ?? []) : (edges?.["politicians-funded"] ?? [])
      for (const name of moneyNames) {
        const detail = monetaryByName.get(name)
        result.push({
          name,
          type: "money",
          amount: detail?.total ?? 0,
          cycles: detail?.cycles ?? [],
          confidence: detail?.maxConf ?? 0.5,
        })
      }
    }

    if (filter === "contracts" || filter === "all") {
      for (const name of edges?.["government-contracts"] ?? []) {
        const detail = contractByName.get(name)
        result.push({
          name,
          type: "contract",
          amount: detail?.total ?? 0,
          cycles: detail?.cycles ?? [],
          confidence: detail?.maxConf ?? 0.95,
        })
      }
    }

    if (filter === "opposition" || filter === "all") {
      for (const name of edges?.opposes ?? []) {
        result.push({ name, type: "opposition", amount: 0, cycles: [], confidence: 0.7 })
      }
    }

    if (filter === "network" || filter === "all") {
      const networkNames = edges?.related ?? []
      for (const name of networkNames) {
        // Skip if already shown as money/contract/opposition
        if (result.some(r => r.name === name)) continue
        result.push({ name, type: "related", amount: 0, cycles: [], confidence: 0.5 })
      }
    }

    // Apply amount filter
    const filtered = minAmount > 0 ? result.filter(r => r.amount >= minAmount) : result

    // Sort
    if (sort === "amount") filtered.sort((a, b) => b.amount - a.amount)
    else if (sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === "cycle") filtered.sort((a, b) => (b.cycles[0] ?? "").localeCompare(a.cycles[0] ?? ""))

    return filtered
  }, [edges, filter, sort, minAmount, isPolitician, monetaryByName, contractByName])

  const totalAmount = rows.reduce((sum: number, r: ConnectionRow) => sum + r.amount, 0)
  const config = FILTER_CONFIG[filter]

  const TYPE_COLORS: Record<string, string> = {
    money: "var(--color-green)",
    contract: "var(--color-steel)",
    opposition: "var(--color-red)",
    related: "#a855f7",
    story: "var(--color-amber)",
  }

  const TYPE_LABELS: Record<string, string> = {
    money: "FUNDED",
    contract: "CONTRACT",
    opposition: "OPPOSES",
    related: "RELATED",
    story: "STORY",
  }

  if (!edges) {
    return <div className="text-[10px] text-[var(--color-text-dim)] text-center py-8">No edge data available for this profile.</div>
  }

  return (
    <div className="space-y-3">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(FILTER_CONFIG) as [FilterMode, { label: string; color: string; explainer: string }][]).map(([key, cfg]) => {
          // Hide contracts chip for non-corporations
          if (key === "contracts" && !isCorporation && (edges?.["government-contracts"]?.length ?? 0) === 0) return null
          // Hide opposition if empty
          if (key === "opposition" && (edges?.opposes?.length ?? 0) === 0) return null

          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                filter === key
                  ? "border-current"
                  : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              }`}
              style={filter === key ? { color: cfg.color, backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}40` } : {}}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Explainer */}
      <div className="text-[9px] text-[var(--color-text-dim)] leading-relaxed bg-[var(--color-bg)] rounded-lg p-3 border border-[var(--color-border)]">
        {config.explainer}
      </div>

      {/* Controls: sort + amount threshold */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">Sort</span>
          {(["amount", "name", "cycle"] as SortMode[]).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={`px-2 py-1 text-[9px] rounded border transition-colors ${
                sort === s ? "border-[var(--color-steel)]/40 text-[var(--color-steel)] bg-[var(--color-steel)]/10" : "border-[var(--color-border)] text-[var(--color-text-dim)]"
              }`}>
              {s === "amount" ? "$ Amount" : s === "name" ? "A-Z" : "Cycle"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">Min</span>
          {AMOUNT_THRESHOLDS.map(t => (
            <button key={t.value} onClick={() => setMinAmount(t.value)}
              className={`px-2 py-1 text-[9px] rounded border transition-colors ${
                minAmount === t.value ? "border-[var(--color-green)]/40 text-[var(--color-green)] bg-[var(--color-green)]/10" : "border-[var(--color-border)] text-[var(--color-text-dim)]"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-[9px] text-[var(--color-text-dim)]">
        <span>{rows.length} connection{rows.length !== 1 ? "s" : ""}{minAmount > 0 ? ` above ${formatDollars(minAmount)}` : ""}</span>
        {totalAmount > 0 && <span className="font-bold text-[var(--color-green)]">{formatDollars(totalAmount)} total</span>}
      </div>

      {/* Connection rows */}
      <div className="space-y-1">
        {rows.map((row: ConnectionRow, i: number) => (
          <div key={`${row.name}-${row.type}-${i}`} className="flex items-center gap-2 p-2 bg-[var(--color-bg)] rounded hover:bg-[var(--color-bg-hover)] transition-colors">
            {/* Type indicator */}
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[row.type] }} />

            {/* Name + type badge */}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-[var(--color-text)]">{row.name}</span>
              {filter === "all" && (
                <span className="ml-1.5 text-[7px] uppercase px-1 py-0.5 rounded border"
                  style={{ color: TYPE_COLORS[row.type], borderColor: `${TYPE_COLORS[row.type]}30` }}>
                  {TYPE_LABELS[row.type]}
                </span>
              )}
            </div>

            {/* Cycles */}
            {row.cycles.length > 0 && (
              <span className="text-[8px] text-[var(--color-text-dim)] font-mono">
                {row.cycles.join(", ")}
              </span>
            )}

            {/* Confidence dot */}
            {row.confidence < 0.7 && (
              <span className="w-2 h-2 rounded-full bg-[var(--color-amber)]" title={`Low confidence: ${(row.confidence * 100).toFixed(0)}%`} />
            )}

            {/* Amount */}
            {row.amount > 0 && (
              <span className="text-[11px] font-mono font-bold text-[var(--color-green)] whitespace-nowrap">
                {formatDollars(row.amount)}
              </span>
            )}
          </div>
        ))}

        {rows.length === 0 && (
          <div className="text-[10px] text-[var(--color-text-dim)] text-center py-6">
            {minAmount > 0 ? `No connections above ${formatDollars(minAmount)}.` : "No connections in this category."}
          </div>
        )}
      </div>
    </div>
  )
}
