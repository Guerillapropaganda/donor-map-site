"use client"

/**
 * DonorFlowSankey — donor → IE PAC → candidate flow visualization for the
 * CA Governor 2026 race. Three-column Sankey using d3-sankey.
 *
 * Data shape (from /api/races/ca-gov-2026/visuals):
 *   nodes: { id, name, layer: 'donor' | 'pac' | 'candidate' }
 *   links: { source, target, value, ie_role: 'supporting' | 'opposing' }
 *
 * Layers map to x-coordinates: donor (left), pac (middle), candidate (right).
 * Link color = ie_role (green for support, red for oppose). Hover on a node
 * highlights its full upstream + downstream chain.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey"

interface NodeData {
  id: string
  name: string
  layer: "donor" | "pac" | "candidate"
}
interface LinkData {
  source: string
  target: string
  value: number
  ie_role?: "supporting" | "opposing"
}

interface SankeyDatum {
  nodes: NodeData[]
  links: LinkData[]
}

interface SankeyNode extends NodeData {
  x0?: number
  x1?: number
  y0?: number
  y1?: number
  index?: number
}
interface SankeyLink extends LinkData {
  width?: number
  source: SankeyNode | string
  target: SankeyNode | string
}

const WIDTH = 1280
const HEIGHT = 1100
const NODE_WIDTH = 16
const NODE_PADDING = 8

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function nodeColor(layer: string): string {
  switch (layer) {
    case "donor": return "#60a5fa" // blue
    case "pac": return "#fbbf24" // yellow
    case "candidate": return "#f3f4f6" // off-white
    default: return "#9ca3af"
  }
}

function linkColor(role: string | undefined): string {
  if (role === "opposing") return "rgba(248, 113, 113, 0.55)" // red w/ alpha
  return "rgba(74, 222, 128, 0.55)" // green-ish for support
}

export function DonorFlowSankey({ data }: { data: SankeyDatum }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  // Build the sankey layout. Node ids → indices for d3-sankey's
  // expectation, then back-resolve so we can render names.
  const layout = useMemo(() => {
    if (!data || data.nodes.length === 0) return null
    const nodeIndex = new Map<string, number>()
    const nodes: SankeyNode[] = data.nodes.map((n, i) => {
      nodeIndex.set(n.id, i)
      return { ...n }
    })
    // Constrain x position by layer so the columns line up clean
    const layerX: Record<string, number> = { donor: 0, pac: 1, candidate: 2 }
    const links = data.links
      .map((l) => ({
        ...l,
        source: nodeIndex.get(l.source) ?? -1,
        target: nodeIndex.get(l.target) ?? -1,
      }))
      .filter((l) => l.source >= 0 && l.target >= 0)

    const generator = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [10, 10],
        [WIDTH - 10, HEIGHT - 10],
      ])
      .nodeAlign((node) => layerX[(node as SankeyNode).layer] ?? 0)

    return generator({
      nodes,
      links: links as unknown as SankeyLink[],
    } as SankeyGraph<SankeyNode, SankeyLink>)
  }, [data])

  // Compute the connected-set for the hovered node so we can dim everything else
  const highlighted = useMemo(() => {
    if (!hovered || !layout) return null
    const set = new Set<string>([hovered])
    let changed = true
    while (changed) {
      changed = false
      for (const link of layout.links) {
        const s = (link.source as SankeyNode).id
        const t = (link.target as SankeyNode).id
        if (set.has(s) && !set.has(t)) {
          set.add(t)
          changed = true
        }
        if (set.has(t) && !set.has(s)) {
          set.add(s)
          changed = true
        }
      }
    }
    return set
  }, [hovered, layout])

  if (!layout || layout.nodes.length === 0) {
    return <div className="text-zinc-500 text-sm p-6">No flow data — Cal-Access ingest hasn't surfaced any IE-PAC channels above the $100K display threshold.</div>
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto bg-zinc-950">
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(248, 113, 113, 0.6)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Column headers */}
        <text x={20} y={20} fill="#71717a" fontSize="11" fontFamily="monospace">DONORS →</text>
        <text x={WIDTH / 2 - 40} y={20} fill="#71717a" fontSize="11" fontFamily="monospace">→ IE PACs →</text>
        <text x={WIDTH - 130} y={20} fill="#71717a" fontSize="11" fontFamily="monospace">→ CANDIDATES</text>

        {/* Links */}
        <g fill="none">
          {layout.links.map((link, i) => {
            const s = link.source as SankeyNode
            const t = link.target as SankeyNode
            const dim = highlighted && !(highlighted.has(s.id) && highlighted.has(t.id))
            return (
              <path
                key={i}
                d={sankeyLinkHorizontal()(link as never) ?? ""}
                stroke={linkColor(link.ie_role)}
                strokeWidth={Math.max(1, link.width ?? 1)}
                opacity={dim ? 0.08 : 0.85}
              >
                <title>
                  {`${s.name} → ${t.name}\n${fmtMoney(link.value)}\n${link.ie_role === "opposing" ? "IE attack ad money" : "IE support money"}`}
                </title>
              </path>
            )
          })}
        </g>

        {/* Nodes */}
        <g>
          {layout.nodes.map((node) => {
            const dim = highlighted && !highlighted.has(node.id)
            const labelLeft = node.layer === "candidate"
            const x = node.x0 ?? 0
            const y = node.y0 ?? 0
            const w = (node.x1 ?? 0) - x
            const h = Math.max(2, (node.y1 ?? 0) - y)
            const totalIn = layout.links
              .filter((l) => (l.target as SankeyNode).id === node.id)
              .reduce((s, l) => s + (l as SankeyLink).value, 0)
            const totalOut = layout.links
              .filter((l) => (l.source as SankeyNode).id === node.id)
              .reduce((s, l) => s + (l as SankeyLink).value, 0)
            const total = totalIn || totalOut
            return (
              <g
                key={node.id}
                opacity={dim ? 0.25 : 1}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={nodeColor(node.layer)}
                  stroke="#27272a"
                />
                <text
                  x={labelLeft ? x - 6 : x + w + 6}
                  y={y + h / 2 + 3}
                  textAnchor={labelLeft ? "end" : "start"}
                  fill={node.layer === "candidate" ? "#fbbf24" : "#d4d4d8"}
                  fontSize={node.layer === "candidate" ? 12 : 10}
                  fontFamily={node.layer === "candidate" ? "Inter, sans-serif" : "monospace"}
                  fontWeight={node.layer === "candidate" ? 600 : 400}
                >
                  {node.name.length > 50 ? node.name.slice(0, 47) + "…" : node.name}
                  {h > 14 && (
                    <tspan fill="#71717a" dx="6" fontSize="9">
                      {fmtMoney(total)}
                    </tspan>
                  )}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="text-xs text-zinc-500 mt-2 px-2 flex gap-4 flex-wrap">
        <span><span className="inline-block w-3 h-3 mr-1" style={{ background: "rgba(74, 222, 128, 0.55)" }}></span>IE supporting</span>
        <span><span className="inline-block w-3 h-3 mr-1" style={{ background: "rgba(248, 113, 113, 0.55)" }}></span>IE opposing</span>
        <span>Hover node to highlight chain. Top {data.nodes.filter((n) => n.layer === "donor").length} donors visible (filtered to ≥$100K).</span>
      </div>
    </div>
  )
}
