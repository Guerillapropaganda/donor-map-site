"use client"

/**
 * /thesis — ADR-0024 Phase 3 thesis-query surface.
 *
 * Three queries on one page:
 *   1. Influence Map — politician + donor-class profile + sponsorship/
 *      vote-alignment data-gap report (Graph.influenceMap)
 *   2. Class Profile — donor base grouped by capital_type and
 *      ideological_function tags (Graph.classProfile)
 *   3. Both-Sides Donors — corpus-wide scan of donors funding both
 *      sides of a political-opposition pair (Graph.bothSidesDonors)
 *
 * All numbers come from the librarian — no frontmatter cache reads.
 * Each tab fetches its own API route; results aren't shared. Data is
 * authoritative per ADR-0024 §4 (one librarian for every read path).
 */

import { useCallback, useState } from "react"
import { PageHeader } from "@/components/PageHeader"

type Tab = "influence" | "class" | "bothsides" | "pipelines" | "divergence"

export default function ThesisPage() {
  const [tab, setTab] = useState<Tab>("influence")

  return (
    <div style={{ padding: "1rem 1.5rem", maxWidth: 1100 }}>
      <PageHeader title="Thesis Queries" subtitle="ADR-0024 Phase 3 — donor-class influence patterns from the librarian" />

      <div role="tablist" style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "1px solid var(--color-border)", flexWrap: "wrap" }}>
        <TabButton active={tab === "influence"} onClick={() => setTab("influence")}>Influence Map</TabButton>
        <TabButton active={tab === "class"} onClick={() => setTab("class")}>Class Profile</TabButton>
        <TabButton active={tab === "bothsides"} onClick={() => setTab("bothsides")}>Both-Sides Donors</TabButton>
        <TabButton active={tab === "pipelines"} onClick={() => setTab("pipelines")}>Influence Pipelines</TabButton>
        <TabButton active={tab === "divergence"} onClick={() => setTab("divergence")}>Voting Divergence</TabButton>
      </div>

      <div style={{ marginTop: 24 }}>
        {tab === "influence" && <InfluenceMapPanel />}
        {tab === "class" && <ClassProfilePanel />}
        {tab === "bothsides" && <BothSidesPanel />}
        {tab === "pipelines" && <PipelinesPanel />}
        {tab === "divergence" && <DivergencePanel />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: active ? "var(--color-bg-elevated)" : "transparent",
        color: active ? "var(--color-text)" : "var(--color-text-dim)",
        border: "1px solid var(--color-border)",
        borderBottom: active ? "1px solid var(--color-bg-elevated)" : "1px solid var(--color-border)",
        marginBottom: -1,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )
}

// ─── shapes (mirror lib/donor-map types) ─────────────────────────────────

interface Node {
  id: string
  name: string
  type: string
  profile_path: string | null
}
interface Cluster {
  cluster_key: string
  dimension: string
  total_amount: number
  donor_count: number
  top_donors: Array<{ node: Node; amount: number }>
}
interface ClassProfileResult {
  politician: Node
  total_in: number
  edge_count: number
  capital_clusters: Cluster[]
  ideological_clusters: Cluster[]
  unclassified: { total_amount: number; donor_count: number }
}
interface InfluenceMapResult {
  politician: Node
  donor_class_profile: ClassProfileResult
  policy_signal: { available: boolean; alignments?: unknown[]; data_gaps: string[] }
  dominant_capital_cluster: Cluster | null
}
interface BothSidesPair {
  donor: Node
  pol_a: Node
  pol_b: Node
  total_to_a: number
  total_to_b: number
}
interface BothSidesResult {
  pairs: BothSidesPair[]
  truncated: boolean
}

// ─── Influence Map ───────────────────────────────────────────────────────

function InfluenceMapPanel() {
  const [name, setName] = useState("")
  const [data, setData] = useState<InfluenceMapResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    if (!name.trim()) return
    setLoading(true); setErr(null); setData(null)
    try {
      const r = await fetch(`/api/thesis/influence-map?politician=${encodeURIComponent(name.trim())}`)
      const j = await r.json()
      if (!r.ok || j.error) { setErr(j.error || `HTTP ${r.status}`); return }
      setData(j.result)
    } catch (e) { setErr(String(e)) } finally { setLoading(false) }
  }, [name])

  return (
    <div>
      <PoliticianInput value={name} onChange={setName} onSubmit={run} loading={loading} />
      {err && <ErrorBox msg={err} />}
      {data && (
        <div>
          <h3 style={{ fontSize: 18, marginTop: 24 }}>{data.politician.name}</h3>
          <div style={{ fontSize: 13, color: "var(--color-text-dim)", marginBottom: 16 }}>
            Total incoming: {fmtMoney(data.donor_class_profile.total_in)} · {data.donor_class_profile.edge_count.toLocaleString()} edges
          </div>

          {data.dominant_capital_cluster && (
            <div style={{ padding: 12, background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-dim)", letterSpacing: 0.5, textTransform: "uppercase" }}>Dominant capital cluster</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
                {data.dominant_capital_cluster.cluster_key} — {fmtMoney(data.dominant_capital_cluster.total_amount)}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-dim)" }}>
                {data.dominant_capital_cluster.donor_count} donors
              </div>
            </div>
          )}

          <PolicySignalBox signal={data.policy_signal} />

          <ClusterList title="Capital clusters" clusters={data.donor_class_profile.capital_clusters} />
          <ClusterList title="Ideological clusters" clusters={data.donor_class_profile.ideological_clusters} />
          {data.donor_class_profile.unclassified.donor_count > 0 && (
            <div style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 16 }}>
              Unclassified: {data.donor_class_profile.unclassified.donor_count} donors, {fmtMoney(data.donor_class_profile.unclassified.total_amount)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PolicySignalBox({ signal }: { signal: InfluenceMapResult["policy_signal"] }) {
  if (signal.available) {
    return (
      <div style={{ padding: 12, background: "var(--color-bg-elevated)", border: "1px solid #16a34a", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#16a34a", letterSpacing: 0.5, textTransform: "uppercase" }}>Policy alignment available</div>
        <div style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 4 }}>
          Per-policy alignment scores would render here. Currently empty pending alignment scorer ingest.
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: 12, background: "var(--color-bg-elevated)", border: "1px solid #f59e0b", marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 0.5, textTransform: "uppercase" }}>Policy signal unavailable — data gaps</div>
      <ul style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 6, paddingLeft: 18 }}>
        {signal.data_gaps.map((g, i) => <li key={i}>{g}</li>)}
      </ul>
    </div>
  )
}

// ─── Class Profile ───────────────────────────────────────────────────────

function ClassProfilePanel() {
  const [name, setName] = useState("")
  const [data, setData] = useState<ClassProfileResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    if (!name.trim()) return
    setLoading(true); setErr(null); setData(null)
    try {
      const r = await fetch(`/api/thesis/class-profile?politician=${encodeURIComponent(name.trim())}&top_donors_per_cluster=10`)
      const j = await r.json()
      if (!r.ok || j.error) { setErr(j.error || `HTTP ${r.status}`); return }
      setData(j.result)
    } catch (e) { setErr(String(e)) } finally { setLoading(false) }
  }, [name])

  return (
    <div>
      <PoliticianInput value={name} onChange={setName} onSubmit={run} loading={loading} />
      {err && <ErrorBox msg={err} />}
      {data && (
        <div>
          <h3 style={{ fontSize: 18, marginTop: 24 }}>{data.politician.name}</h3>
          <div style={{ fontSize: 13, color: "var(--color-text-dim)", marginBottom: 16 }}>
            Total incoming: {fmtMoney(data.total_in)} · {data.edge_count.toLocaleString()} edges
          </div>
          <ClusterList title="Capital clusters" clusters={data.capital_clusters} />
          <ClusterList title="Ideological clusters" clusters={data.ideological_clusters} />
          {data.unclassified.donor_count > 0 && (
            <div style={{ fontSize: 12, color: "var(--color-text-dim)", marginTop: 16 }}>
              Unclassified: {data.unclassified.donor_count} donors, {fmtMoney(data.unclassified.total_amount)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ClusterList({ title, clusters }: { title: string; clusters: Cluster[] }) {
  if (clusters.length === 0) return null
  return (
    <div style={{ marginTop: 20 }}>
      <h4 style={{ fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--color-text-dim)", marginBottom: 8 }}>{title}</h4>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-dim)", fontSize: 11 }}>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Cluster</th>
            <th style={{ textAlign: "right", padding: "6px 8px" }}>Total</th>
            <th style={{ textAlign: "right", padding: "6px 8px" }}>Donors</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Top donors</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((c) => (
            <tr key={c.cluster_key} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td style={{ padding: "8px", fontWeight: 500 }}>{c.cluster_key}</td>
              <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>{fmtMoney(c.total_amount)}</td>
              <td style={{ padding: "8px", textAlign: "right", color: "var(--color-text-dim)" }}>{c.donor_count}</td>
              <td style={{ padding: "8px", color: "var(--color-text-dim)", fontSize: 12 }}>
                {c.top_donors.slice(0, 5).map((d) => `${d.node.name} (${fmtMoney(d.amount)})`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Both Sides ──────────────────────────────────────────────────────────

function BothSidesPanel() {
  const [minEach, setMinEach] = useState(1000)
  const [limit, setLimit] = useState(50)
  const [data, setData] = useState<BothSidesResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    setLoading(true); setErr(null); setData(null)
    try {
      const r = await fetch(`/api/thesis/both-sides?min_total_each=${minEach}&limit=${limit}`)
      const j = await r.json()
      if (!r.ok || j.error) { setErr(j.error || `HTTP ${r.status}`); return }
      setData(j.result)
    } catch (e) { setErr(String(e)) } finally { setLoading(false) }
  }, [minEach, limit])

  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12 }}>
        <NumberInput label="Min total to EACH side ($)" value={minEach} onChange={setMinEach} />
        <NumberInput label="Limit" value={limit} onChange={setLimit} />
        <button onClick={run} disabled={loading} style={btnStyle}>
          {loading ? "Running..." : "Run"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-dim)", marginBottom: 16 }}>
        Corpus-wide scan: donors funding both sides of any political-opposition pair, ≥${minEach.toLocaleString()} to each.
      </div>
      {err && <ErrorBox msg={err} />}
      {data && (
        <div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            {data.pairs.length} pair(s) {data.truncated && <span style={{ color: "#f59e0b" }}>(truncated — raise limit)</span>}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-dim)", fontSize: 11 }}>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Donor</th>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Side A</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>$ to A</th>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Side B</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>$ to B</th>
              </tr>
            </thead>
            <tbody>
              {data.pairs.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>{p.donor.name}</td>
                  <td style={{ padding: "8px" }}>{p.pol_a.name}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>{fmtMoney(p.total_to_a)}</td>
                  <td style={{ padding: "8px" }}>{p.pol_b.name}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>{fmtMoney(p.total_to_b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Influence Pipelines ─────────────────────────────────────────────────

interface PipelineEdge {
  id: string
  type: string
  amount: number | null
  source: string
}
interface Pipeline {
  from_id: string
  to_id: string
  hops: number
  weight: number
  edges: PipelineEdge[]
  nodes: string[]
}
interface PipelinesResult {
  seed: Node
  pipelines: Pipeline[]
  truncated: boolean
}

function PipelinesPanel() {
  const [seed, setSeed] = useState("")
  const [maxHops, setMaxHops] = useState(2)
  const [terminalTypes, setTerminalTypes] = useState("")
  const [data, setData] = useState<PipelinesResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    if (!seed.trim()) return
    setLoading(true); setErr(null); setData(null)
    try {
      const params = new URLSearchParams({ seed: seed.trim(), max_hops: String(maxHops), limit: "25" })
      if (terminalTypes.trim()) params.set("terminal_types", terminalTypes.trim())
      const r = await fetch(`/api/thesis/influence-pipelines?${params}`)
      const j = await r.json()
      if (!r.ok || j.error) { setErr(j.error || `HTTP ${r.status}`); return }
      setData(j.result)
    } catch (e) { setErr(String(e)) } finally { setLoading(false) }
  }, [seed, maxHops, terminalTypes])

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "var(--color-text-dim)", letterSpacing: 0.5, textTransform: "uppercase", flex: 1, minWidth: 240 }}>
          Seed (donor / PAC / politician)
          <input
            type="text"
            placeholder="e.g. Fairshake PAC"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            style={{ marginTop: 4, padding: "8px 12px", fontSize: 14, background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
          />
        </label>
        <NumberInput label="Max hops (1–4)" value={maxHops} onChange={(n) => setMaxHops(Math.min(4, Math.max(1, n)))} />
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "var(--color-text-dim)", letterSpacing: 0.5, textTransform: "uppercase", minWidth: 180 }}>
          Terminal types (csv, optional)
          <input
            type="text"
            placeholder="politician,bill"
            value={terminalTypes}
            onChange={(e) => setTerminalTypes(e.target.value)}
            style={{ marginTop: 4, padding: "8px 12px", fontSize: 14, background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
          />
        </label>
        <button onClick={run} disabled={loading || !seed.trim()} style={btnStyle}>
          {loading ? "Running..." : "Run"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-dim)", marginTop: 12 }}>
        Per-terminal dedup keeps the highest-weight path to each reachable node. Capped at 25 results, ranked by weight (sum of $ + confidence along the chain).
      </div>
      {err && <ErrorBox msg={err} />}
      {data && (
        <div>
          <h3 style={{ fontSize: 18, marginTop: 24 }}>{data.seed.name}</h3>
          <div style={{ fontSize: 13, color: "var(--color-text-dim)", marginBottom: 16 }}>
            {data.pipelines.length} pipeline(s) {data.truncated && <span style={{ color: "#f59e0b" }}>(truncated)</span>}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-dim)", fontSize: 11 }}>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Terminal</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Hops</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Weight</th>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Edge types</th>
              </tr>
            </thead>
            <tbody>
              {data.pipelines.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px", fontWeight: 500, fontFamily: "monospace", fontSize: 12 }}>{p.to_id}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>{p.hops}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace" }}>{fmtMoney(p.weight)}</td>
                  <td style={{ padding: "8px", color: "var(--color-text-dim)", fontSize: 12 }}>
                    {p.edges.map((e) => e.type).join(" → ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Voting Divergence ───────────────────────────────────────────────────

interface DivergentVote {
  vote_id: string
  position: string
  party_majority: string
  party_yea: number
  party_nay: number
}
interface VotingDivergenceResult {
  bioguide: string
  votes_participated: number
  votes_diverged: number
  divergence_rate: number
  top_divergent: DivergentVote[]
  congresses: number[]
  missing_congresses: number[]
}

function DivergencePanel() {
  const [name, setName] = useState("")
  const [congresses, setCongresses] = useState("113,114")
  const [data, setData] = useState<{ politician: { name: string; bioguide: string }; result: VotingDivergenceResult } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async () => {
    if (!name.trim()) return
    setLoading(true); setErr(null); setData(null)
    try {
      const params = new URLSearchParams({ politician: name.trim() })
      if (congresses.trim()) params.set("congresses", congresses.trim())
      const r = await fetch(`/api/thesis/voting-divergence?${params}`)
      const j = await r.json()
      if (!r.ok || j.error) { setErr(j.error || `HTTP ${r.status}`); return }
      setData({ politician: j.politician, result: j.result })
    } catch (e) { setErr(String(e)) } finally { setLoading(false) }
  }, [name, congresses])

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "var(--color-text-dim)", letterSpacing: 0.5, textTransform: "uppercase", flex: 1, minWidth: 240 }}>
          Politician
          <input
            type="text"
            placeholder="e.g. Joe Manchin"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            style={{ marginTop: 4, padding: "8px 12px", fontSize: 14, background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "var(--color-text-dim)", letterSpacing: 0.5, textTransform: "uppercase", minWidth: 160 }}>
          Congresses (csv)
          <input
            type="text"
            placeholder="113,114"
            value={congresses}
            onChange={(e) => setCongresses(e.target.value)}
            style={{ marginTop: 4, padding: "8px 12px", fontSize: 14, background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
          />
        </label>
        <button onClick={run} disabled={loading || !name.trim()} style={btnStyle}>
          {loading ? "Running..." : "Run"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-dim)", marginTop: 12 }}>
        Compares legislator's votes vs same-party majority on every roll call. Voteview data covers congresses 108-114 currently. Independents return 0% divergence by construction (party of one).
      </div>
      {err && <ErrorBox msg={err} />}
      {data && (
        <div>
          <h3 style={{ fontSize: 18, marginTop: 24 }}>{data.politician.name} <span style={{ fontSize: 12, color: "var(--color-text-dim)", fontFamily: "monospace" }}>{data.politician.bioguide}</span></h3>
          {data.result.missing_congresses.length > 0 && (
            <div style={{ fontSize: 12, color: "#f59e0b", marginBottom: 8 }}>
              Missing position files for congress(es): {data.result.missing_congresses.join(", ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
            <Stat label="Votes participated" value={data.result.votes_participated.toLocaleString()} />
            <Stat label="Diverged from party" value={data.result.votes_diverged.toLocaleString()} />
            <Stat label="Divergence rate" value={`${(data.result.divergence_rate * 100).toFixed(1)}%`} highlight={data.result.divergence_rate > 0.15 ? "#f59e0b" : undefined} />
          </div>
          <h4 style={{ fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--color-text-dim)", marginBottom: 8 }}>Top divergent votes (most lopsided party-line)</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-dim)", fontSize: 11 }}>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Vote</th>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Position</th>
                <th style={{ textAlign: "left", padding: "6px 8px" }}>Party majority</th>
                <th style={{ textAlign: "right", padding: "6px 8px" }}>Same-party tally</th>
              </tr>
            </thead>
            <tbody>
              {data.result.top_divergent.map((v) => (
                <tr key={v.vote_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 12 }}>{v.vote_id}</td>
                  <td style={{ padding: "8px" }}>{v.position}</td>
                  <td style={{ padding: "8px" }}>{v.party_majority}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontFamily: "monospace", color: "var(--color-text-dim)" }}>
                    {v.party_yea} Yea / {v.party_nay} Nay
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div style={{ padding: 12, background: "var(--color-bg-elevated)", border: `1px solid ${highlight ?? "var(--color-border)"}`, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: "var(--color-text-dim)", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: highlight ?? "var(--color-text)", fontFamily: "monospace" }}>{value}</div>
    </div>
  )
}

// ─── shared widgets ──────────────────────────────────────────────────────

function PoliticianInput({ value, onChange, onSubmit, loading }: { value: string; onChange: (s: string) => void; onSubmit: () => void; loading: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        placeholder="Politician name (e.g. Mitch McConnell)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        style={{
          flex: 1, maxWidth: 360, padding: "8px 12px", fontSize: 14,
          background: "var(--color-bg)", color: "var(--color-text)",
          border: "1px solid var(--color-border)",
        }}
      />
      <button onClick={onSubmit} disabled={loading || !value.trim()} style={btnStyle}>
        {loading ? "Loading..." : "Run"}
      </button>
    </div>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "var(--color-text-dim)", letterSpacing: 0.5, textTransform: "uppercase" }}>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
        style={{
          marginTop: 4, padding: "6px 10px", fontSize: 14,
          background: "var(--color-bg)", color: "var(--color-text)",
          border: "1px solid var(--color-border)",
          width: 140,
        }}
      />
    </label>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: 12, marginTop: 16, border: "1px solid #ef4444", color: "#ef4444", fontSize: 13 }}>
      Error: {msg}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "var(--color-accent)",
  color: "#000",
  border: "none",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

function fmtMoney(n: number): string {
  if (!n) return "$0"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString()}`
}
