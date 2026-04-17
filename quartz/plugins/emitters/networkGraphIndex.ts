import { FullSlug, simplifySlug, joinSegments } from "../../util/path"
// isConstructionMode removed — this emitter must run regardless
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"

export interface NetworkNode {
  id: string
  name: string
  type: "politician" | "donor" | "corporation" | "pac" | "think-tank" | "lobbying" | "media"
  party?: string
  chamber?: string
  state?: string
  sector?: string
  entityType?: string
  totalRaised?: string
  lobbyingSpend?: string
  slug: string
}

export interface NetworkEdge {
  source: string
  target: string
}

export interface NetworkGraphData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

function cleanTitle(title: string): string {
  return title.replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
}

export const NetworkGraphIndex: QuartzEmitterPlugin = () => {
  return {
    name: "NetworkGraphIndex",
    async *emit(ctx, content) {
      // Emit even in construction mode — same rationale as ContentIndex
      // if (isConstructionMode) return
      const nodes: NetworkNode[] = []
      const edges: NetworkEdge[] = []
      const titleToSlug = new Map<string, string>()
      const titleToId = new Map<string, string>()

      // First pass: collect all profile nodes
      for (const [_tree, file] of content) {
        const fm = file.data.frontmatter
        if (!fm) continue
        const slug = (file.data.slug ?? "").toLowerCase()
        const fmType = String(fm.type ?? "").toLowerCase()

        // Only include profiles
        const isProfile =
          fmType === "politician" ||
          fmType === "donor" ||
          fmType === "corporation" ||
          fmType === "pac" ||
          fmType === "think-tank" ||
          fmType === "lobbying-firm" ||
          fmType === "media-profile" ||
          slug.includes("master-profile")

        if (!isProfile) continue

        const title = String(fm.title ?? "")
        const cleanName = cleanTitle(title)
        const nodeId = simplifySlug(file.data.slug!)

        // Skip duplicates (prefer master profiles)
        if (titleToId.has(cleanName) && !slug.includes("master-profile")) continue

        titleToSlug.set(cleanName, slug)
        titleToId.set(cleanName, nodeId)

        const type: NetworkNode["type"] =
          fmType === "corporation" ? "corporation" :
          fmType === "pac" ? "pac" :
          fmType === "donor" ? "donor" :
          fmType === "think-tank" ? "think-tank" :
          fmType === "lobbying-firm" ? "lobbying" :
          fmType === "media-profile" ? "media" :
          "politician"

        nodes.push({
          id: nodeId,
          name: cleanName,
          type,
          party: fm.party ? String(fm.party) : undefined,
          chamber: fm.chamber ? String(fm.chamber) : undefined,
          state: fm["state-abbr"] ? String(fm["state-abbr"]) : fm.state ? String(fm.state) : undefined,
          sector: fm.sector ? String(fm.sector) : undefined,
          entityType: fm["entity-type"] ? String(fm["entity-type"]) : undefined,
          totalRaised: fm["total-raised"] ? String(fm["total-raised"]) : undefined,
          lobbyingSpend: fm["lobbying-spend"] ? String(fm["lobbying-spend"]) : undefined,
          slug: nodeId,
        })
      }

      // Second pass: build edges from top-donors and politicians-funded
      const edgeSet = new Set<string>()

      for (const [_tree, file] of content) {
        const fm = file.data.frontmatter
        if (!fm) continue
        const title = cleanTitle(String(fm.title ?? ""))
        const sourceId = titleToId.get(title)
        if (!sourceId) continue

        // Politician → Donor edges (from top-donors)
        const topDonors = Array.isArray(fm["top-donors"]) ? (fm["top-donors"] as string[]) : []
        for (const donorName of topDonors) {
          const targetId = titleToId.get(donorName)
          if (!targetId || targetId === sourceId) continue
          const edgeKey = [sourceId, targetId].sort().join("|")
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey)
            edges.push({ source: sourceId, target: targetId })
          }
        }

        // Donor → Politician edges (from politicians-funded)
        const polsFunded = Array.isArray(fm["politicians-funded"]) ? (fm["politicians-funded"] as string[]) : []
        for (const polName of polsFunded) {
          const targetId = titleToId.get(polName)
          if (!targetId || targetId === sourceId) continue
          const edgeKey = [sourceId, targetId].sort().join("|")
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey)
            edges.push({ source: sourceId, target: targetId })
          }
        }
      }

      const graphData: NetworkGraphData = { nodes, edges }

      const fp = joinSegments("static", "networkGraph") as FullSlug
      yield write({
        ctx,
        content: JSON.stringify(graphData),
        slug: fp,
        ext: ".json",
      })
    },
  }
}
