import { NextResponse } from "next/server"
import { getVaultTree, getFilesContent, getWorkflowRuns } from "@/lib/github"
import { parseProfile } from "@/lib/vault"
import type { Profile } from "@/lib/vault"

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

export async function GET() {
  try {
    const alerts: Alert[] = []
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    // Get vault data
    const tree = await getVaultTree()
    const profilePaths = tree
      .filter((f) => {
        const p = f.path
        if (p.includes("/Assets/")) return false
        if (p.endsWith("index.md")) return false
        if (p === "content/Vault Rules.md") return false
        if (p === "content/Pipeline Guide.md") return false
        if (p === "content/Session State.md") return false
        if (p === "content/Changelog.md") return false
        return true
      })
      .map((f) => f.path)

    const contents = await getFilesContent(profilePaths.slice(0, 200)) // Sample first 200
    const profiles: Profile[] = Array.from(contents.entries()).map(([path, content]) => parseProfile(path, content))

    // === STALE PROFILES ===
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0]
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString().split("T")[0]
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0]

    const stale90 = profiles.filter((p) => p.lastUpdated && p.lastUpdated < ninetyDaysAgo)
    const stale60 = profiles.filter((p) => p.lastUpdated && p.lastUpdated >= ninetyDaysAgo && p.lastUpdated < sixtyDaysAgo)
    const stale30 = profiles.filter((p) => p.lastUpdated && p.lastUpdated >= sixtyDaysAgo && p.lastUpdated < thirtyDaysAgo)
    const noDate = profiles.filter((p) => !p.lastUpdated)

    if (stale90.length > 0) {
      alerts.push({
        id: "stale-90",
        severity: "critical",
        category: "stale",
        title: `${stale90.length} profiles not updated in 90+ days`,
        description: "These profiles may have outdated data and should be reviewed or enriched.",
        profiles: stale90.slice(0, 10).map((p) => p.title),
        count: stale90.length,
        timestamp: today,
      })
    }

    if (stale60.length > 0) {
      alerts.push({
        id: "stale-60",
        severity: "warning",
        category: "stale",
        title: `${stale60.length} profiles not updated in 60-90 days`,
        description: "Consider scheduling enrichment for these profiles.",
        profiles: stale60.slice(0, 10).map((p) => p.title),
        count: stale60.length,
        timestamp: today,
      })
    }

    if (noDate.length > 0) {
      alerts.push({
        id: "no-date",
        severity: "warning",
        category: "data",
        title: `${noDate.length} profiles missing last-updated date`,
        description: "These profiles have no update timestamp in their frontmatter.",
        profiles: noDate.slice(0, 10).map((p) => p.title),
        count: noDate.length,
        timestamp: today,
      })
    }

    // === READINESS GAPS ===
    const rawProfiles = profiles.filter((p) => p.contentReadiness === "raw")
    const draftProfiles = profiles.filter((p) => p.contentReadiness === "draft")
    const noReadiness = profiles.filter((p) => !p.contentReadiness || p.contentReadiness === "unknown")

    if (rawProfiles.length > 0) {
      alerts.push({
        id: "raw-profiles",
        severity: "info",
        category: "readiness",
        title: `${rawProfiles.length} profiles at raw status`,
        description: "Stub profiles with no real content. Need editorial work.",
        profiles: rawProfiles.slice(0, 10).map((p) => p.title),
        count: rawProfiles.length,
        timestamp: today,
      })
    }

    if (noReadiness.length > 0) {
      alerts.push({
        id: "no-readiness",
        severity: "warning",
        category: "data",
        title: `${noReadiness.length} profiles missing content-readiness field`,
        description: "These profiles don't have a readiness status in frontmatter.",
        profiles: noReadiness.slice(0, 10).map((p) => p.title),
        count: noReadiness.length,
        timestamp: today,
      })
    }

    // === ENRICHMENT GAPS ===
    const notEnriched = profiles.filter((p) => !p.lastEnriched)
    const enrichedOld = profiles.filter((p) => p.lastEnriched && p.lastEnriched < thirtyDaysAgo)

    if (notEnriched.length > 0) {
      alerts.push({
        id: "not-enriched",
        severity: "info",
        category: "pipeline",
        title: `${notEnriched.length} profiles never enriched by pipeline`,
        description: "These profiles haven't been touched by any enrichment pipeline.",
        count: notEnriched.length,
        profiles: notEnriched.slice(0, 10).map((p) => p.title),
        timestamp: today,
      })
    }

    if (enrichedOld.length > 0) {
      alerts.push({
        id: "enriched-stale",
        severity: "warning",
        category: "pipeline",
        title: `${enrichedOld.length} profiles with stale enrichment (30+ days)`,
        description: "Pipeline data may be outdated. Consider re-running enrichment.",
        count: enrichedOld.length,
        profiles: enrichedOld.slice(0, 10).map((p) => p.title),
        timestamp: today,
      })
    }

    // === PIPELINE HEALTH ===
    try {
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
      // Can't reach engine repo — skip pipeline alerts
    }

    // === DATA QUALITY ===
    const noType = profiles.filter((p) => !p.type || p.type === "unknown")
    if (noType.length > 0) {
      alerts.push({
        id: "no-type",
        severity: "warning",
        category: "data",
        title: `${noType.length} profiles missing type field`,
        description: "These profiles don't have a type (politician, donor, etc.) in frontmatter.",
        profiles: noType.slice(0, 10).map((p) => p.title),
        count: noType.length,
        timestamp: today,
      })
    }

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => order[a.severity] - order[b.severity])

    return NextResponse.json({
      alerts,
      summary: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        totalProfiles: profiles.length,
        scannedAt: now.toISOString(),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
