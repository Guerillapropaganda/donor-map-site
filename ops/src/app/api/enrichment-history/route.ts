import { NextResponse } from "next/server"
import { execSync } from "child_process"
import path from "path"

export interface EnrichmentRun {
  sha: string
  date: string
  totalFiles: number
  pipelines: { name: string; count: number; label: string }[]
  profiles: { name: string; path: string; linesChanged: number }[]
}

const PIPELINE_LABELS: Record<string, string> = {
  fec: "FEC Campaign Finance",
  "fec-summary": "FEC Candidate Summary",
  congress: "Congress.gov Bills & Votes",
  committee: "Committee Assignments",
  govtrack: "GovTrack Legislative Activity",
  lda: "Senate Lobbying Disclosures",
  lobbyview: "LobbyView Lobbying Networks",
  "lobbying-contrib": "Lobbying Cross-Reference",
  usaspending: "USASpending Federal Contracts",
  "usaspending-awards": "USASpending Award Details",
  sam: "SAM.gov Entity Registry",
  "nonprofit-990": "IRS 990 Nonprofit Filings",
  "federal-register": "Federal Register Rules & Orders",
  fara: "Foreign Agent Registrations",
  "ofac-sdn": "OFAC Sanctions List",
  recall: "CPSC Product Recalls",
  "nhtsa-recalls": "NHTSA Vehicle Recalls",
  courtlistener: "Federal Court Cases",
  "sec-edgar": "SEC Corporate Filings",
  "sec-litigation": "SEC Enforcement Actions",
  "doj-press": "DOJ Press Releases",
  propublica: "ProPublica Congressional Data",
  "public-accountability": "Public Accountability Data",
  opensanctions: "OpenSanctions PEP Data",
  wikipedia: "Wikipedia/Wikidata",
  fcc: "FCC Broadcasting Data",
  gleif: "GLEIF Legal Entity Data",
  "fda-enforcement": "FDA Drug/Device/Food Enforcement",
  "fda": "FDA Drug/Device/Food Enforcement",
  "occ-enforcement": "OCC National Bank Enforcement",
  "occ": "OCC National Bank Enforcement",
  "ftc-enforcement": "FTC Enforcement & Mergers",
  "ftc": "FTC Enforcement & Mergers",
}

export async function GET() {
  try {
    const repoRoot = path.resolve(process.cwd(), "..")

    // Get enrichment commits from git log
    const log = execSync(
      'git log --author="API Enrichment Bot" --format="%H|%s|%ai" -20',
      { cwd: repoRoot, encoding: "utf-8", timeout: 10000 }
    )

    const runs: EnrichmentRun[] = []

    for (const line of log.trim().split("\n").filter(Boolean)) {
      const [sha, message, date] = line.split("|")
      if (!sha || !message) continue

      // Parse pipeline counts from commit message
      // Format: "API enrichment: 114 files (courtlistener:10 doj-press:15 ...)"
      const totalMatch = message.match(/(\d+) files/)
      const totalFiles = totalMatch ? parseInt(totalMatch[1]) : 0

      const pipelineSection = message.match(/\((.+)\)/)
      const pipelines: { name: string; count: number; label: string }[] = []

      if (pipelineSection) {
        const pairs = pipelineSection[1].split(" ")
        for (const pair of pairs) {
          const [name, countStr] = pair.split(":")
          if (name && countStr) {
            pipelines.push({
              name,
              count: parseInt(countStr),
              label: PIPELINE_LABELS[name] || name,
            })
          }
        }
        // Sort by count descending
        pipelines.sort((a, b) => b.count - a.count)
      }

      // Get changed files for this commit
      let profiles: { name: string; path: string; linesChanged: number }[] = []
      try {
        const stat = execSync(
          `git show --stat --format="" ${sha}`,
          { cwd: repoRoot, encoding: "utf-8", timeout: 10000 }
        )

        profiles = stat
          .trim()
          .split("\n")
          .filter((l) => l.includes("content/") && l.includes(".md"))
          .map((l) => {
            const parts = l.trim().split("|")
            const filePath = parts[0].trim()
            const changes = parts[1] ? parts[1].trim().replace(/[^0-9]/g, "") : "0"

            // Extract profile name from path
            const name = filePath
              .split("/")
              .pop()
              ?.replace(".md", "")
              .replace(/^_/, "")
              .replace(/ Master Profile$/, "") || filePath

            return { name, path: filePath, linesChanged: parseInt(changes) || 0 }
          })
          .slice(0, 50) // Cap at 50 for display
      } catch { /* skip */ }

      runs.push({ sha: sha.slice(0, 7), date, totalFiles, pipelines, profiles })
    }

    return NextResponse.json({ runs })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
