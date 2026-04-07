import { NextResponse } from "next/server"

interface Alert {
  id: string
  severity: "critical" | "warning" | "info"
  category: "pipeline" | "stale" | "readiness" | "data" | "source"
  title: string
  description: string
  profiles?: string[]
  count?: number
  timestamp: string
}

// Cache alerts for 10 minutes
let cache: { alerts: Alert[]; summary: Record<string, unknown>; timestamp: number } | null = null
const CACHE_TTL = 600_000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const refresh = searchParams.get("refresh") === "true"

  if (cache && !refresh && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache)
  }

  try {
    const alerts: Alert[] = []
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    // Get vault profile data from our own cached API (1 internal call, no GitHub API)
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3333"
      const vaultRes = await fetch(`${baseUrl}/api/vault`, { cache: "no-store" })
      const vaultData = await vaultRes.json()
      const profiles = vaultData.profiles || []

      // Profile-level alerts from path-derived data
      const unknownType = profiles.filter((p: { type: string }) => p.type === "unknown")
      if (unknownType.length > 0) {
        alerts.push({
          id: "unknown-type",
          severity: "warning",
          category: "data",
          title: `${unknownType.length} profiles with unknown type`,
          description: "These files are in unrecognized folders. May need to be moved or categorized.",
          profiles: unknownType.slice(0, 10).map((p: { title: string }) => p.title),
          count: unknownType.length,
          timestamp: today,
        })
      }

      // Stats from vault
      const stats = vaultData.stats || {}
      if (stats.totalProfiles) {
        alerts.push({
          id: "vault-size",
          severity: "info",
          category: "data",
          title: `Vault contains ${stats.totalProfiles} profiles`,
          description: `By type: ${Object.entries(stats.byType || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
          timestamp: today,
        })
      }
    } catch {
      // Vault API not available — skip profile alerts
    }

    // === PIPELINE HEALTH (1-2 API calls) ===
    try {
      const { getWorkflowRuns } = await import("@/lib/github")
      const runs = await getWorkflowRuns("api-enrichment.yml", 5)
      const recentFailures = runs.filter((r) => r.conclusion === "failure")
      const lastRun = runs[0]

      if (recentFailures.length >= 3) {
        alerts.push({
          id: "pipeline-failing",
          severity: "critical",
          category: "pipeline",
          title: `Pipeline failing: ${recentFailures.length} of last 5 runs failed`,
          description: "The enrichment pipeline has multiple recent failures. Check GitHub Actions.",
          timestamp: today,
        })
      } else if (recentFailures.length > 0) {
        alerts.push({
          id: "pipeline-flaky",
          severity: "warning",
          category: "pipeline",
          title: `Pipeline flaky: ${recentFailures.length} failure in last 5 runs`,
          description: "Some pipeline runs are failing. May need investigation.",
          timestamp: today,
        })
      } else {
        alerts.push({
          id: "pipeline-healthy",
          severity: "info",
          category: "pipeline",
          title: "Pipeline healthy: last 5 runs all succeeded",
          description: "The enrichment pipeline is running without errors.",
          timestamp: today,
        })
      }

      if (lastRun) {
        const lastRunDate = new Date(lastRun.created_at)
        const hoursSince = (now.getTime() - lastRunDate.getTime()) / 3600000
        if (hoursSince > 24) {
          alerts.push({
            id: "pipeline-stale",
            severity: "warning",
            category: "pipeline",
            title: `No pipeline run in ${Math.round(hoursSince)} hours`,
            description: "The enrichment pipeline hasn't run recently. Check if scheduled runs are working.",
            timestamp: today,
          })
        }
      }
    } catch {
      alerts.push({
        id: "pipeline-unreachable",
        severity: "warning",
        category: "pipeline",
        title: "Cannot reach pipeline repository",
        description: "Could not check pipeline health. The donor-map-engine repo may be inaccessible.",
        timestamp: today,
      })
    }

    // Sort: critical first
    const order = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => order[a.severity] - order[b.severity])

    const result = {
      alerts,
      summary: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        scannedAt: now.toISOString(),
      },
      timestamp: Date.now(),
    }

    cache = result

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
