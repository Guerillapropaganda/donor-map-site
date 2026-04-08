import { NextResponse } from "next/server"
import { getLocalProfiles } from "@/lib/local-vault"

interface FlowNode {
  id: string
  label: string
  type: "donor" | "politician" | "committee" | "bill" | "lobbying-firm" | "pac"
  party?: string
  amount?: string
  meta?: Record<string, string>
}

interface FlowEdge {
  source: string
  target: string
  label?: string
  amount?: string
  type: "funds" | "serves-on" | "sponsors" | "lobbies" | "contracts"
}

function parseWikilinks(value: string): string[] {
  if (!value) return []
  const matches = value.match(/\[\[([^\]]+)\]\]/g) || []
  return matches.map((m) => {
    const inner = m.replace("[[", "").replace("]]", "")
    return inner.split("|").pop() || inner
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const profileName = searchParams.get("profile")

  try {
    const profiles = getLocalProfiles()
    const nodes: FlowNode[] = []
    const edges: FlowEdge[] = []
    const nodeIds = new Set<string>()

    const addNode = (node: FlowNode) => {
      if (!nodeIds.has(node.id)) {
        nodeIds.add(node.id)
        nodes.push(node)
      }
    }

    if (profileName) {
      // Single-profile money trail
      const target = profiles.find(
        (p) => p.title === profileName || p.title.replace(/^_/, "").replace(/ Master Profile$/, "") === profileName
      )
      if (!target) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

      const cleanTitle = target.title.replace(/^_/, "").replace(/ Master Profile$/, "")

      if (target.type === "politician") {
        // Politician: show donors → politician → committees → bills
        const polId = `pol:${cleanTitle}`
        addNode({
          id: polId,
          label: cleanTitle,
          type: "politician",
          party: target.party,
          amount: target.totalReceived || target.careerTotal,
          meta: { chamber: target.chamber || "", state: target.state || "" },
        })

        // Donors
        const donorNames = new Set<string>()
        const topDonors = Array.isArray(target.topDonors) ? target.topDonors : []
        for (const d of topDonors) donorNames.add(typeof d === "string" ? d : String(d))
        if (target.donors) for (const d of parseWikilinks(target.donors)) donorNames.add(d)

        for (const donorName of donorNames) {
          const donorId = `donor:${donorName}`
          const donorProfile = profiles.find(
            (p) => p.title === donorName || p.title.replace(/^_/, "").replace(/ Master Profile$/, "") === donorName
          )
          addNode({
            id: donorId,
            label: donorName,
            type: donorProfile?.type === "corporation" ? "pac" : "donor",
            amount: donorProfile?.totalPoliticalSpend || donorProfile?.lobbyingSpend || undefined,
          })
          edges.push({ source: donorId, target: polId, type: "funds", label: "funds" })
        }

        // Committees
        const committees = Array.isArray(target.committees) ? target.committees : []
        for (const c of committees) {
          const cName = typeof c === "string" ? c : String(c)
          const cId = `committee:${cName}`
          addNode({ id: cId, label: cName, type: "committee" })
          edges.push({
            source: polId,
            target: cId,
            type: "serves-on",
            label: target.leadershipRoles ? "chairs/serves" : "serves on",
          })
        }

        // Bills
        if (target.billsSponsored && parseInt(String(target.billsSponsored)) > 0) {
          const billId = `bills:${cleanTitle}`
          addNode({
            id: billId,
            label: `${target.billsSponsored} Bills Sponsored`,
            type: "bill",
            meta: { cosponsored: String(target.billsCosponsored || 0) },
          })
          edges.push({ source: polId, target: billId, type: "sponsors", label: "sponsors" })
        }
      } else if (target.type === "donor" || target.type === "corporation") {
        // Donor/Corp: show donor → politicians funded + lobbying
        const donorId = `donor:${cleanTitle}`
        addNode({
          id: donorId,
          label: cleanTitle,
          type: target.type === "corporation" ? "pac" : "donor",
          amount: target.totalPoliticalSpend || target.lobbyingSpend || undefined,
          meta: { sector: target.sector || "" },
        })

        // Politicians funded
        const funded = Array.isArray(target.politiciansFunded) ? target.politiciansFunded : []
        if (target.related) {
          for (const r of parseWikilinks(target.related)) {
            const rProfile = profiles.find(
              (p) => p.title === r || p.title.replace(/^_/, "").replace(/ Master Profile$/, "") === r
            )
            if (rProfile?.type === "politician") funded.push(r)
          }
        }

        for (const polName of [...new Set(funded)]) {
          const pn = typeof polName === "string" ? polName : String(polName)
          const polProfile = profiles.find(
            (p) => p.title === pn || p.title.replace(/^_/, "").replace(/ Master Profile$/, "") === pn
          )
          const polId = `pol:${pn}`
          addNode({
            id: polId,
            label: pn,
            type: "politician",
            party: polProfile?.party,
          })
          edges.push({ source: donorId, target: polId, type: "funds", label: "funds" })

          // Add committees for each politician
          const comms = Array.isArray(polProfile?.committees) ? polProfile.committees : []
          for (const c of comms.slice(0, 3)) {
            const cName = typeof c === "string" ? c : String(c)
            const cId = `committee:${cName}`
            addNode({ id: cId, label: cName, type: "committee" })
            edges.push({ source: polId, target: cId, type: "serves-on", label: "serves on" })
          }
        }

        // Lobbying spend
        if (target.lobbyingSpend || target.lobbyingFilings) {
          const lobbyId = `lobby:${cleanTitle}`
          addNode({
            id: lobbyId,
            label: `Lobbying: ${target.lobbyingFilings || "?"} filings`,
            type: "lobbying-firm",
            amount: target.lobbyingSpend ? `$${Number(target.lobbyingSpend).toLocaleString()}` : undefined,
          })
          edges.push({ source: donorId, target: lobbyId, type: "lobbies", label: "spends on lobbying" })
        }

        // Federal contracts
        if (target.federalContracts || target.federalAwardsTotal) {
          const contractId = `contracts:${cleanTitle}`
          addNode({
            id: contractId,
            label: `${target.federalContracts || "?"} Federal Contracts`,
            type: "bill",
            amount: target.federalAwardsTotal ? `$${Number(target.federalAwardsTotal).toLocaleString()}` : undefined,
          })
          edges.push({ source: donorId, target: contractId, type: "contracts", label: "receives contracts" })
        }
      }
    } else {
      // Overview: top both-sides donors
      const donorToPols = new Map<string, { dems: string[]; reps: string[] }>()
      for (const p of profiles) {
        if (p.type !== "politician" || !p.party) continue
        const donorNames = new Set<string>()
        const topDonors = Array.isArray(p.topDonors) ? p.topDonors : []
        for (const d of topDonors) donorNames.add(typeof d === "string" ? d : String(d))
        if (p.donors) for (const d of parseWikilinks(p.donors)) donorNames.add(d)

        for (const dn of donorNames) {
          if (!donorToPols.has(dn)) donorToPols.set(dn, { dems: [], reps: [] })
          const bucket = donorToPols.get(dn)!
          const cleanName = p.title.replace(/^_/, "").replace(/ Master Profile$/, "")
          if (p.party === "Democrat") bucket.dems.push(cleanName)
          else if (p.party === "Republican") bucket.reps.push(cleanName)
        }
      }

      // Top 15 both-sides donors
      const bothSides = [...donorToPols.entries()]
        .filter(([, v]) => v.dems.length > 0 && v.reps.length > 0)
        .sort((a, b) => (b[1].dems.length + b[1].reps.length) - (a[1].dems.length + a[1].reps.length))
        .slice(0, 15)

      for (const [donorName, { dems, reps }] of bothSides) {
        const donorId = `donor:${donorName}`
        addNode({ id: donorId, label: donorName, type: "donor" })
        for (const d of dems.slice(0, 5)) {
          const polId = `pol:${d}`
          addNode({ id: polId, label: d, type: "politician", party: "Democrat" })
          edges.push({ source: donorId, target: polId, type: "funds" })
        }
        for (const r of reps.slice(0, 5)) {
          const polId = `pol:${r}`
          addNode({ id: polId, label: r, type: "politician", party: "Republican" })
          edges.push({ source: donorId, target: polId, type: "funds" })
        }
      }
    }

    return NextResponse.json({ nodes, edges, profileCount: profiles.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
