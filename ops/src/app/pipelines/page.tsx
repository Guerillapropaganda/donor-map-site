"use client"

import { useState, useEffect, useCallback } from "react"
import { EnrichmentPanel } from "@/components/EnrichmentPanel"
import { PipelineRunHistory } from "@/components/PipelineRunHistory"
import { ProfileEnrich } from "@/components/ProfileEnrich"
import { EnrichmentHistory } from "@/components/EnrichmentHistory"

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

      {/* Enrichment Results — what came in */}
      <div className="mt-8">
        <EnrichmentHistory />
      </div>
    </div>
  )
}
