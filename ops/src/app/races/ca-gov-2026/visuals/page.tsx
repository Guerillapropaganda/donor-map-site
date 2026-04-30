"use client"

/**
 * /races/ca-gov-2026/visuals — Cal-Access charts for the 2026 race.
 *
 * Two charts:
 *   - DonorFlowSankey  — donor → IE PAC → candidate
 *   - FundingStructurePlot — federal + CA direct + IE supporting + IE opposing per candidate
 *
 * Data from /api/races/ca-gov-2026/visuals. The API is admin-gated.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { DonorFlowSankey } from "@/components/DonorFlowSankey"
import { FundingStructurePlot } from "@/components/FundingStructurePlot"

interface VisualsResponse {
  race: string
  sankey: {
    nodes: Array<{ id: string; name: string; layer: "donor" | "pac" | "candidate" }>
    links: Array<{ source: string; target: string; value: number; ie_role?: "supporting" | "opposing" }>
    caps: { top_donors_per_pac: number; top_pacs_per_candidate: number; min_link_usd: number }
  }
  structure: Array<{
    candidate: string
    federal: number
    ca_direct: number
    ie_supporting: number
    ie_opposing: number
  }>
}

export default function VisualsPage() {
  const [data, setData] = useState<VisualsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/races/ca-gov-2026/visuals")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: VisualsResponse) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e))
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-6 text-zinc-300">Loading CA Governor 2026 visuals…</div>
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>
  if (!data) return null

  const totalDonors = data.sankey.nodes.filter((n) => n.layer === "donor").length
  const totalPACs = data.sankey.nodes.filter((n) => n.layer === "pac").length

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="California Governor 2026 — Visuals"
        whatThisDoes="Cal-Access donor-flow visualizations. Sankey shows donor → IE PAC → candidate channels (top 6 donors per PAC, top 4 PACs per candidate, min $100K link). Funding-structure plot stacks federal + CA direct + IE supporting + IE opposing per candidate."
        rightNow={`${totalDonors} top donors flowing to ${totalPACs} IE PACs across ${data.structure.length} candidates`}
        action={
          <span>
            Hover Sankey nodes to highlight their full chain. Bigger picture lives at{" "}
            <Link href="/races/ca-gov-2026" className="text-yellow-300 underline">
              /races/ca-gov-2026
            </Link>
            . Refresh requires re-running scripts/ingest-cal-access-bulk.cjs.
          </span>
        }
      />

      {/* B — Sankey */}
      <section className="space-y-3">
        <header>
          <h2 className="text-lg font-semibold text-zinc-100">
            Donor → IE PAC → Candidate (Cal-Access only)
          </h2>
          <p className="text-sm text-zinc-400">
            Width = $ amount. Green flows = IE supporting (donor money backing the candidate
            through an outside group). Red flows = IE opposing (donor money attacking the
            candidate via an attack-ad PAC). Direct contributions to a candidate&apos;s own
            controlled committee are NOT shown here — see the funding-structure plot below.
          </p>
        </header>
        <div className="border border-zinc-800 bg-zinc-950 p-2">
          <DonorFlowSankey data={data.sankey} />
        </div>
      </section>

      {/* D — Funding structure */}
      <section className="space-y-3">
        <header>
          <h2 className="text-lg font-semibold text-zinc-100">
            Funding structure — by candidate
          </h2>
          <p className="text-sm text-zinc-400">
            How each candidate&apos;s money lands across the four channels. Reveals
            structural type: <strong>self-funded</strong> candidates show a small direct +
            big federal stack (Steyer); <strong>IE-driven</strong> candidates show their
            outside-money dwarfing controlled-committee money (Mahan); <strong>retail</strong>{" "}
            candidates have most weight in direct + low IE (Porter, Hilton). Steyer is the
            only candidate this cycle with significant IE attack money against him.
          </p>
        </header>
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <FundingStructurePlot rows={data.structure} />
        </div>
      </section>

      {/* Footer notes */}
      <section className="text-xs text-zinc-500 border-t border-zinc-800 pt-4 space-y-1">
        <div>
          <strong>Caps:</strong> Sankey shows top {data.sankey.caps.top_donors_per_pac} donors
          per PAC × top {data.sankey.caps.top_pacs_per_candidate} PACs per candidate, with a
          ${(data.sankey.caps.min_link_usd / 1000).toFixed(0)}K minimum link value to keep
          the diagram readable. Smaller donors roll up into the rest-of-PAC bucket invisibly.
        </div>
        <div>
          <strong>Source:</strong> data/derived/cal-access-bulk.jsonl (89,669 edges from CA SoS
          RCPT_CD bulk). Federal totals come from the librarian (FEC + IRS 990). Frontmatter
          is intentionally NOT consulted — see content/Pipeline Guide.md § 5 for why.
        </div>
        <div>
          <strong>Phase 3 gap:</strong> EXPN_CD (where the money goes), LOAN_CD (self-loans),
          F495P2 (late contributions) and F501/F502 (committee org metadata) not yet ingested.
        </div>
      </section>
    </div>
  )
}
