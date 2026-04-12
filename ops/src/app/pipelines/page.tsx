"use client"

import { useState, useEffect, useCallback } from "react"
import { EnrichmentPanel } from "@/components/EnrichmentPanel"
import { PipelineRunHistory } from "@/components/PipelineRunHistory"
import { ProfileEnrich } from "@/components/ProfileEnrich"
import { EnrichmentHistory } from "@/components/EnrichmentHistory"
import { EnrichmentLog } from "@/components/EnrichmentLog"

export default function PipelinesPage() {
  const [triggering, setTriggering] = useState(false)
  const [lastTrigger, setLastTrigger] = useState<{ pipeline: string; time: Date } | null>(null)
  const [tab, setTab] = useState<"bulk" | "single">("bulk")

  const triggerPipeline = useCallback(async (pipeline: string, limit: number) => {
    setTriggering(true)
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline, limit }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLastTrigger({ pipeline, time: new Date() })
    } catch (err) {
      console.error("Failed to trigger pipeline:", err)
    } finally {
      setTriggering(false)
    }
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">Pipeline Control</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">
            Trigger enrichment pipelines and monitor runs
          </p>
        </div>
        {lastTrigger && (
          <div className="text-[10px] text-[var(--color-green)] bg-[var(--color-green)]/10 border border-[var(--color-green)]/20 rounded-lg px-3 py-1.5">
            Triggered <strong>{lastTrigger.pipeline}</strong> at {lastTrigger.time.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Pipeline Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { name: "FEC", desc: "Campaign finance data", icon: "\uD83C\uDFDB", color: "#22c55e", pipeline: "fec-pipeline" },
          { name: "Congress", desc: "Bills, votes, committees", icon: "\uD83D\uDCDC", color: "#5b8dce", pipeline: "congress-pipeline" },
          { name: "GovTrack", desc: "Voting records", icon: "\uD83D\uDDF3", color: "#a855f7", pipeline: "govtrack-pipeline" },
          { name: "LobbyView", desc: "Lobbying disclosures", icon: "\uD83D\uDD0D", color: "#f59e0b", pipeline: "lobbyview-pipeline" },
          { name: "Committee", desc: "Committee assignments", icon: "\uD83D\uDC65", color: "#ec4899", pipeline: "committee-pipeline" },
          { name: "Relationships", desc: "Connection scanner", icon: "\uD83D\uDD17", color: "#ef4444", pipeline: "relationship-discovery" },
          { name: "Federal Register", desc: "Executive orders", icon: "\uD83D\uDCF0", color: "#7a7a86", pipeline: "exec-orders-pipeline" },
          { name: "USASpending", desc: "Federal contracts", icon: "\uD83D\uDCB0", color: "#22c55e", pipeline: "usaspending-pipeline" },
        ].map(p => (
          <div key={p.name} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-text-dim)]/30 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{p.icon}</span>
              <span className="text-[10px] font-bold text-[var(--color-text)]">{p.name}</span>
            </div>
            <p className="text-[8px] text-[var(--color-text-dim)] mb-3">{p.desc}</p>
            <button
              onClick={() => triggerPipeline(p.pipeline, 25)}
              disabled={triggering}
              className="w-full text-[8px] py-1.5 rounded border transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
              style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}10` }}
            >
              {triggering ? "Running..." : "Run"}
            </button>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("bulk")}
          className={`px-4 py-2 rounded text-xs transition-all ${
            tab === "bulk"
              ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]"
              : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          }`}
        >
          Bulk Enrichment
        </button>
        <button
          onClick={() => setTab("single")}
          className={`px-4 py-2 rounded text-xs transition-all ${
            tab === "single"
              ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]"
              : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          }`}
        >
          Single Profile
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main panel */}
        <div className="xl:col-span-2">
          {tab === "bulk" ? (
            <EnrichmentPanel onTrigger={triggerPipeline} triggering={triggering} />
          ) : (
            <ProfileEnrich onTrigger={triggerPipeline} triggering={triggering} />
          )}
        </div>

        {/* Sidebar — Run History */}
        <div>
          <PipelineRunHistory />
        </div>
      </div>

      {/* Enrichment Log — detailed per-profile results */}
      <div className="mt-8">
        <EnrichmentLog />
      </div>

      {/* Enrichment Git History — what files changed */}
      <div className="mt-8">
        <EnrichmentHistory />
      </div>
    </div>
  )
}
