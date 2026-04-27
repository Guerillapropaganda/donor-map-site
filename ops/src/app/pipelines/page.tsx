"use client"

import { useState, useEffect, useCallback } from "react"
import { EnrichmentPanel } from "@/components/EnrichmentPanel"
import { PipelineRunHistory } from "@/components/PipelineRunHistory"
import { ProfileEnrich } from "@/components/ProfileEnrich"
import { EnrichmentHistory } from "@/components/EnrichmentHistory"
import { PageHeader } from "@/components/PageHeader"
import { EnrichmentLog } from "@/components/EnrichmentLog"
import { PIPELINE_REGISTRY, type PipelineStatus } from "@/lib/pipeline-registry"
import HarnessChip from "@/components/HarnessChip"

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
      <PageHeader
        title="Pipeline Control"
        whatThisDoes="Trigger enrichment pipelines (FEC, IRS 990, USASpending, etc.) and monitor recent runs. Shows per-pipeline health derived from git log signals — last successful run, error frequency, drift signals."
        rightNow={lastTrigger ? `Last triggered ${lastTrigger.pipeline} at ${lastTrigger.time.toLocaleTimeString()}.` : "API pipelines are PAUSED in CSV-only phase (per Rule 3). RSS Intelligence + Auto-Connection Engine remain enabled."}
        action="Click a pipeline card to trigger it manually. Enrichment Log shows recent activity. Pipeline Run History expands to per-run detail with error tail."
      />
      <div className="flex items-center justify-end mb-6 gap-2">
        {/* Harness freshness chip — per ops-harness-audit-2026-04-24
            follow-up #3. /pipelines shows health-class signals (pipeline
            grid, enrichment log) so the ambient chip belongs here too. */}
        <HarnessChip />
      </div>

      {/* Paused banner — shown while API pipelines are disabled. */}
      <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-lg">⏸️</span>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-amber-300 mb-1">
              API pipelines paused (2026-04-24)
            </div>
            <div className="text-[11px] text-[var(--color-text-dim)] leading-relaxed">
              Seven GitHub Actions workflows were disabled to stop burning
              private-repo Actions minutes. Only <strong className="text-[var(--color-text)]">RSS Intelligence</strong> (scheduled, viable) and{" "}
              <strong className="text-[var(--color-text)]">Auto-Connection Engine</strong> (manual-trigger, no cost) remain active.
            </div>
            <div className="text-[10px] text-[var(--color-text-dim)] mt-2">
              Enrichment runs via local CSV bulk scripts:{" "}
              <code className="text-[var(--color-steel)]">scripts/ingest-fec-bulk.cjs</code>,{" "}
              <code className="text-[var(--color-steel)]">scripts/ingest-usaspending-bulk.cjs</code>,{" "}
              <code className="text-[var(--color-steel)]">scripts/ingest-irs-990-bulk.cjs</code>.
              Re-enable workflows with{" "}
              <code className="text-[var(--color-steel)]">gh workflow enable</code> when ready.
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Overview Grid — reads from PIPELINE_REGISTRY. Single source
          of truth. Paused/retired/broken pipelines render dimmed with no Run
          button (clicking would just fire a workflow that's disabled or
          failing). */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {PIPELINE_REGISTRY.filter((p) => p.status !== "retired").map((p) => {
          const isRunnable = p.status === "active" || p.status === "experimental"
          const statusLabel: Record<PipelineStatus, string> = {
            active: "",
            paused: "paused",
            retired: "retired",
            experimental: "experimental",
            broken: "broken",
          }
          return (
            <div
              key={p.id}
              className={`bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 transition-all group ${
                isRunnable ? "hover:border-[var(--color-text-dim)]/30" : "opacity-60"
              }`}
              title={p.notes || p.description}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{p.icon}</span>
                <span className="text-[10px] font-bold text-[var(--color-text)]">{p.label}</span>
              </div>
              {statusLabel[p.status] && (
                <div className="text-[8px] uppercase tracking-wider text-amber-400 mb-1">
                  {statusLabel[p.status]}
                </div>
              )}
              <p className="text-[8px] text-[var(--color-text-dim)] mb-3">{p.description}</p>
              {isRunnable ? (
                <button
                  onClick={() => triggerPipeline(p.id, 25)}
                  disabled={triggering}
                  className="w-full text-[8px] py-1.5 rounded border transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  style={{ color: p.color, borderColor: `${p.color}40`, backgroundColor: `${p.color}10` }}
                >
                  {triggering ? "Running..." : "Run"}
                </button>
              ) : (
                <div className="w-full text-[8px] py-1.5 text-center text-[var(--color-text-dim)]">
                  {p.status === "paused" ? "workflow disabled" : p.status}
                </div>
              )}
            </div>
          )
        })}
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
