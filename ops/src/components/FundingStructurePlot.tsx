"use client"

/**
 * FundingStructurePlot — chart D from the visualization plan.
 *
 * Each candidate gets a horizontal stacked bar showing their four money
 * channels:
 *   - Federal $ (FEC + IRS 990)
 *   - CA direct $ (donor → controlled committee)
 *   - IE supporting $ (donor → IE PAC backing them)
 *   - IE opposing $ (donor → IE PAC attacking them)
 *
 * Reveals the structural pattern: who's a self-funded billionaire
 * (Steyer's IE-oppose dominates), who's IE-puppet (Mahan's IE-support
 * dwarfs direct), who's retail (Porter's federal+direct ratio is high
 * relative to IE).
 *
 * No external chart lib — hand-rolled SVG keeps it simple.
 */

interface StructureRow {
  candidate: string
  federal: number
  ca_direct: number
  ie_supporting: number
  ie_opposing: number
}

const COLORS = {
  federal: "#60a5fa",      // blue
  ca_direct: "#fbbf24",    // yellow
  ie_supporting: "#4ade80", // green
  ie_opposing: "#f87171",   // red
}

const LABELS = {
  federal: "Federal $",
  ca_direct: "CA direct $",
  ie_supporting: "IE supporting",
  ie_opposing: "IE opposing",
}

function fmtMoney(n: number): string {
  if (!n) return ""
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtMoneyFull(n: number): string {
  if (!n) return "$0"
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function FundingStructurePlot({ rows }: { rows: StructureRow[] }) {
  if (!rows || rows.length === 0) {
    return <div className="text-zinc-500 text-sm p-6">No funding-structure data.</div>
  }

  // Largest total candidate sets the chart scale
  const totals = rows.map((r) => r.federal + r.ca_direct + r.ie_supporting + r.ie_opposing)
  const maxTotal = Math.max(...totals, 1)

  return (
    <div className="space-y-1.5">
      {/* Legend */}
      <div className="flex gap-4 text-xs text-zinc-400 mb-3 flex-wrap">
        {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3" style={{ background: COLORS[k] }} />
            {LABELS[k]}
          </span>
        ))}
      </div>

      {/* Stacked bars */}
      {rows.map((r) => {
        const total = r.federal + r.ca_direct + r.ie_supporting + r.ie_opposing
        const pctWidth = (total / maxTotal) * 100
        const segs: Array<{ key: keyof typeof COLORS; value: number }> = [
          { key: "federal", value: r.federal },
          { key: "ca_direct", value: r.ca_direct },
          { key: "ie_supporting", value: r.ie_supporting },
          { key: "ie_opposing", value: r.ie_opposing },
        ]
        return (
          <div key={r.candidate} className="grid grid-cols-[160px_1fr_120px] gap-3 items-center text-sm">
            <div className="text-zinc-200 truncate" title={r.candidate}>
              {r.candidate}
            </div>
            <div className="relative">
              <div
                className="flex h-6 bg-zinc-900 border border-zinc-800"
                style={{ width: `${pctWidth}%`, minWidth: total > 0 ? "2px" : "0" }}
              >
                {segs.map((s) => {
                  if (!s.value || total === 0) return null
                  const pct = (s.value / total) * 100
                  return (
                    <div
                      key={s.key}
                      style={{ width: `${pct}%`, background: COLORS[s.key] }}
                      title={`${LABELS[s.key]}: ${fmtMoneyFull(s.value)}`}
                      className="overflow-hidden flex items-center px-1"
                    >
                      {pct > 12 && (
                        <span className="text-[10px] text-zinc-900 font-mono font-semibold whitespace-nowrap">
                          {fmtMoney(s.value)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="text-right font-mono text-zinc-400">
              {fmtMoney(total)}
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div className="text-xs text-zinc-500 mt-4 pt-3 border-t border-zinc-800">
        Bars normalized to the largest candidate&apos;s total (
        {fmtMoneyFull(maxTotal)}). Hover any segment for the full dollar amount.
        IE-opposing money is attack-ad spending against the candidate (Steyer is the only candidate with significant IE-opposition this cycle).
      </div>
    </div>
  )
}
