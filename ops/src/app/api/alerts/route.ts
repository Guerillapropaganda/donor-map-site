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

      // === STALE PROFILE DETECTION ===
      const STALE_DAYS = 30
      const staleThreshold = STALE_DAYS * 24 * 60 * 60 * 1000
      const staleProfiles: string[] = []
      const neverEnrichedProfiles: string[] = []
      const rawProfiles: string[] = []

      for (const p of profiles) {
        if (p.lastEnriched) {
          const enrichedDate = new Date(p.lastEnriched).getTime()
          if (now.getTime() - enrichedDate > staleThreshold) {
            staleProfiles.push(p.title)
          }
        } else if (p.type !== "event" && p.type !== "story") {
          neverEnrichedProfiles.push(p.title)
        }
        if (p.contentReadiness === "raw") {
          rawProfiles.push(p.title)
        }
      }

      if (staleProfiles.length > 0) {
        alerts.push({
          id: "stale-enrichment",
          severity: staleProfiles.length > 50 ? "critical" : "warning",
          category: "stale",
          title: `${staleProfiles.length} profiles stale (30+ days since enrichment)`,
          description: "These profiles haven't been enriched by the pipeline in over 30 days. Run enrichment or check pipeline health.",
          profiles: staleProfiles.slice(0, 20),
          count: staleProfiles.length,
          timestamp: today,
        })
      }

      if (neverEnrichedProfiles.length > 0) {
        alerts.push({
          id: "never-enriched",
          severity: neverEnrichedProfiles.length > 100 ? "critical" : "warning",
          category: "stale",
          title: `${neverEnrichedProfiles.length} profiles never enriched`,
          description: "These profiles have never been processed by any pipeline. They may be missing government source data.",
          profiles: neverEnrichedProfiles.slice(0, 20),
          count: neverEnrichedProfiles.length,
          timestamp: today,
        })
      }

      if (rawProfiles.length > 0) {
        alerts.push({
          id: "raw-profiles",
          severity: "info",
          category: "readiness",
          title: `${rawProfiles.length} profiles still at "raw" readiness`,
          description: "These profiles need basic metadata and content before they can be developed further.",
          profiles: rawProfiles.slice(0, 20),
          count: rawProfiles.length,
          timestamp: today,
        })
      }

      // === STALENESS DECAY CANDIDATES ===
      const VERIFIED_DECAY_DAYS = 90
      const READY_DECAY_DAYS = 180
      const verifiedDecayCandidates: string[] = []
      const readyDecayCandidates: string[] = []
      const nearVerifiedProfiles: string[] = []

      for (const p of profiles) {
        const daysSinceEnriched = p.lastEnriched
          ? (now.getTime() - new Date(p.lastEnriched).getTime()) / 86400000
          : Infinity

        if (p.contentReadiness === "verified" && daysSinceEnriched > VERIFIED_DECAY_DAYS) {
          verifiedDecayCandidates.push(p.title)
        }
        if (p.contentReadiness === "ready" && daysSinceEnriched > READY_DECAY_DAYS) {
          readyDecayCandidates.push(p.title)
        }
        // Near-verified: ready profiles with 2+ source types, just missing sign-off
        if (p.contentReadiness === "ready" && (p.sourceTypes || []).length >= 2 && !p.lastVerifiedBy) {
          nearVerifiedProfiles.push(p.title)
        }
      }

      if (verifiedDecayCandidates.length > 0) {
        alerts.push({
          id: "verified-decay",
          severity: "warning",
          category: "stale",
          title: `${verifiedDecayCandidates.length} verified profiles need re-enrichment (90+ days)`,
          description: "These A+ profiles will decay to ready (B) if not re-enriched soon.",
          profiles: verifiedDecayCandidates.slice(0, 20),
          count: verifiedDecayCandidates.length,
          timestamp: today,
        })
      }

      if (readyDecayCandidates.length > 0) {
        alerts.push({
          id: "ready-decay",
          severity: "info",
          category: "stale",
          title: `${readyDecayCandidates.length} ready profiles may decay to draft (180+ days)`,
          description: "These B-grade profiles haven't been updated in 180+ days. Run staleness-decay.cjs to apply demotions.",
          profiles: readyDecayCandidates.slice(0, 20),
          count: readyDecayCandidates.length,
          timestamp: today,
        })
      }

      if (nearVerifiedProfiles.length > 0) {
        alerts.push({
          id: "near-verified",
          severity: "info",
          category: "readiness",
          title: `${nearVerifiedProfiles.length} profiles close to A+ (need editorial sign-off)`,
          description: "These profiles have 2+ Tier 1 source types and just need editorial sign-off to be promoted to verified (A+).",
          profiles: nearVerifiedProfiles.slice(0, 20),
          count: nearVerifiedProfiles.length,
          timestamp: today,
        })
      }

      // === VAULT INTEGRITY (from last scan) ===
      try {
        const fs = await import("fs")
        const path = await import("path")
        const repoRoot = path.default.resolve(process.cwd(), "..")
        const reportPath = path.default.join(repoRoot, "reports", "vault-integrity.json")
        if (fs.default.existsSync(reportPath)) {
          const report = JSON.parse(fs.default.readFileSync(reportPath, "utf-8"))
          if (report.wikilinks && report.wikilinks.brokenCount > 0) {
            alerts.push({
              id: "broken-wikilinks",
              severity: report.wikilinks.brokenCount > 100 ? "warning" : "info",
              category: "data",
              title: `${report.wikilinks.brokenCount} broken wikilinks (${report.wikilinks.totalRefs} references)`,
              description: "Wikilinks pointing to profiles that don't exist. Run vault-integrity.cjs for details.",
              profiles: report.wikilinks.items.slice(0, 10).map((i: { target: string }) => i.target),
              count: report.wikilinks.brokenCount,
              timestamp: today,
            })
          }
          if (report.orphans && report.orphans.orphanCount > 0) {
            alerts.push({
              id: "orphan-profiles",
              severity: "info",
              category: "data",
              title: `${report.orphans.orphanCount} orphan profiles (no incoming links)`,
              description: "These profiles are never referenced by any other profile. They may be miscategorized or need connections.",
              profiles: report.orphans.items.slice(0, 10).map((i: { title: string }) => i.title),
              count: report.orphans.orphanCount,
              timestamp: today,
            })
          }
          if (report.crossref && report.crossref.mismatchCount > 0) {
            alerts.push({
              id: "crossref-mismatches",
              severity: "warning",
              category: "data",
              title: `${report.crossref.mismatchCount} cross-reference mismatches`,
              description: "Profiles that list donors/connections that don't link back. Data inconsistency.",
              profiles: report.crossref.items.slice(0, 10).map((i: { from: string }) => i.from),
              count: report.crossref.mismatchCount,
              timestamp: today,
            })
          }
        }
      } catch {
        // No integrity report available
      }

      // === CONTRADICTION SCANNER (from last scan) ===
      try {
        const fs2 = await import("fs")
        const path2 = await import("path")
        const repoRoot2 = path2.default.resolve(process.cwd(), "..")
        const contradictionPath = path2.default.join(repoRoot2, "reports", "contradiction-scanner.json")
        if (fs2.default.existsSync(contradictionPath)) {
          const report = JSON.parse(fs2.default.readFileSync(contradictionPath, "utf-8"))
          if (report.bothSides && report.bothSides.length > 0) {
            const high = report.bothSides.filter((d: { storyPotential: string }) => d.storyPotential === "high")
            alerts.push({
              id: "both-sides-donors",
              severity: high.length > 5 ? "warning" : "info",
              category: "data",
              title: `${report.bothSides.length} both-sides donors found (${high.length} high-priority stories)`,
              description: `Donors funding politicians across party lines. Top: ${report.bothSides.slice(0, 5).map((d: { donor: string; totalFunded: number }) => `${d.donor} (${d.totalFunded})`).join(", ")}`,
              profiles: report.bothSides.slice(0, 10).map((d: { donor: string }) => d.donor),
              count: report.bothSides.length,
              timestamp: today,
            })
          }
          if (report.contradictions && report.contradictions.length > 0) {
            alerts.push({
              id: "opposition-funded",
              severity: "warning",
              category: "data",
              title: `${report.contradictions.length} opposition-funded contradiction(s)`,
              description: `Same donor funds politicians who directly oppose each other. ${report.contradictions.map((c: { donor: string }) => c.donor).join(", ")}`,
              profiles: report.contradictions.map((c: { donor: string }) => c.donor),
              count: report.contradictions.length,
              timestamp: today,
            })
          }
          if (report.mismatches && report.mismatches.length > 0) {
            alerts.push({
              id: "donor-crossref-mismatch",
              severity: "info",
              category: "data",
              title: `${report.mismatches.length} donor cross-reference mismatches`,
              description: "Profiles list donors that don't reference them back.",
              profiles: report.mismatches.slice(0, 10).map((m: { donor: { title: string } }) => m.donor.title),
              count: report.mismatches.length,
              timestamp: today,
            })
          }
          if (report.gaps && report.gaps.length > 0) {
            const definite = report.gaps.filter((g: { type: string }) => g.type === "should-be-opposes")
            if (definite.length > 0) {
              alerts.push({
                id: "opposition-miscategorized",
                severity: "warning",
                category: "data",
                title: `${definite.length} connections miscategorized (should be opposes:)`,
                description: "These profiles have adversarial connections in related: that should be in opposes:",
                profiles: definite.slice(0, 10).map((g: { profile: { title: string } }) => g.profile.title),
                count: definite.length,
                timestamp: today,
              })
            }
          }
        }
      } catch {
        // No contradiction report available
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
