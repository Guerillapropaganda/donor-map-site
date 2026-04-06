import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  select,
  zoom,
  zoomIdentity,
  drag,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3"
import { removeAllChildren } from "./util"

// Types
interface GraphNode extends SimulationNodeDatum {
  id: string
  name: string
  type: "politician" | "donor" | "corporation" | "pac"
  party?: string
  chamber?: string
  state?: string
  sector?: string
  entityType?: string
  totalRaised?: string
  lobbyingSpend?: string
  slug: string
  degree: number
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: GraphNode | string
  target: GraphNode | string
}

// Colors
const COLORS = {
  bg: "#0c0c0f",
  surface: "#13131a",
  border: "#1e1e28",
  text: "#b4b4bc",
  textDim: "#7a7a86",
  textBright: "#e4e4e7",
  blue: "#3b82f6",
  red: "#ef4444",
  green: "#22c55e",
  amber: "#f59e0b",
  steel: "#5b8dce",
  edgeDefault: "#1e1e28",
  edgeHighlight: "#5b8dce",
}

function getNodeColor(node: GraphNode): string {
  if (node.type === "politician") {
    if (node.party === "Democrat") return COLORS.blue
    if (node.party === "Republican") return COLORS.red
    return COLORS.textDim
  }
  return COLORS.amber
}

function getNodeSize(node: GraphNode): number {
  const base = node.type === "politician" ? 6 : 5
  return base + Math.min(Math.sqrt(node.degree) * 1.5, 8)
}

// Hexagon path for politicians
function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return `M${pts.join("L")}Z`
}

// Rounded rect path for donors
function rectPath(cx: number, cy: number, r: number): string {
  const w = r * 1.6
  const h = r * 1.3
  const rx = 2
  return `M${cx - w + rx},${cy - h} L${cx + w - rx},${cy - h} Q${cx + w},${cy - h} ${cx + w},${cy - h + rx} L${cx + w},${cy + h - rx} Q${cx + w},${cy + h} ${cx + w - rx},${cy + h} L${cx - w + rx},${cy + h} Q${cx - w},${cy + h} ${cx - w},${cy + h - rx} L${cx - w},${cy - h + rx} Q${cx - w},${cy - h} ${cx - w + rx},${cy - h}Z`
}

function initNetworkGraph() {
  const container = document.getElementById("dm-network-graph")
  if (!container) return

  const svgEl = container.querySelector(".dm-ng-svg") as SVGSVGElement
  if (!svgEl) return

  const viewport = container.querySelector(".dm-ng-viewport") as HTMLElement
  const tooltip = container.querySelector(".dm-ng-tooltip") as HTMLElement
  const searchInput = container.querySelector(".dm-ng-search") as HTMLInputElement
  const slider = container.querySelector(".dm-ng-count-slider") as HTMLInputElement
  const countDisplay = container.querySelector(".dm-ng-count-value") as HTMLElement
  const filterBtns = container.querySelectorAll(".dm-ng-filter")

  let simulation: Simulation<GraphNode, GraphLink> | null = null
  let allNodes: GraphNode[] = []
  let allEdges: { source: string; target: string }[] = []
  let activeFilter = "all"
  let maxNodes = 150
  let highlightedNode: GraphNode | null = null

  // Fetch graph data
  // @ts-ignore — fetchGraphData is a global promise defined in renderPage.tsx
  ;(fetchGraphData as Promise<{ nodes: any[]; edges: any[] }>).then((data) => {
    // Compute degree for each node
    const degreeMap = new Map<string, number>()
    for (const e of data.edges) {
      degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1)
      degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1)
    }

    allNodes = data.nodes.map((n) => ({
      ...n,
      degree: degreeMap.get(n.id) ?? 0,
    }))

    allEdges = data.edges

    render()
  })

  function getFilteredData() {
    // Filter nodes
    let filtered = allNodes.filter((n) => n.degree > 0)

    if (activeFilter === "Democrat" || activeFilter === "Republican") {
      // Show politicians of that party + their donors
      const partyPols = new Set(
        filtered.filter((n) => n.type === "politician" && n.party === activeFilter).map((n) => n.id),
      )
      const connectedDonors = new Set<string>()
      for (const e of allEdges) {
        if (partyPols.has(e.source)) connectedDonors.add(e.target)
        if (partyPols.has(e.target)) connectedDonors.add(e.source)
      }
      filtered = filtered.filter((n) => partyPols.has(n.id) || connectedDonors.has(n.id))
    } else if (activeFilter === "donor") {
      // Show donors + their politicians
      const donors = new Set(
        filtered.filter((n) => n.type !== "politician").map((n) => n.id),
      )
      const connectedPols = new Set<string>()
      for (const e of allEdges) {
        if (donors.has(e.source)) connectedPols.add(e.target)
        if (donors.has(e.target)) connectedPols.add(e.source)
      }
      filtered = filtered.filter((n) => donors.has(n.id) || connectedPols.has(n.id))
    }

    // Sort by degree and take top N
    filtered.sort((a, b) => b.degree - a.degree)
    filtered = filtered.slice(0, maxNodes)

    // Build edge list for visible nodes
    const nodeIds = new Set(filtered.map((n) => n.id))
    const edges = allEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

    return { nodes: filtered, edges }
  }

  function render() {
    if (simulation) {
      simulation.stop()
      simulation = null
    }

    const width = viewport.clientWidth || 900
    const height = viewport.clientHeight || 600

    svgEl.setAttribute("width", String(width))
    svgEl.setAttribute("height", String(height))
    svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`)

    const svg = select(svgEl)
    removeAllChildren(svgEl)

    const { nodes, edges } = getFilteredData()

    if (nodes.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", COLORS.textDim)
        .attr("font-family", "'Space Mono', monospace")
        .attr("font-size", "12px")
        .text("No connections found for this filter.")
      return
    }

    // Deep copy nodes so D3 can mutate x/y
    const simNodes: GraphNode[] = nodes.map((n) => ({ ...n }))
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]))

    const simLinks: GraphLink[] = edges
      .map((e) => ({
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
      }))
      .filter((l) => l.source && l.target)

    // Create groups
    const g = svg.append("g").attr("class", "dm-ng-graph-group")

    // Zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
        // Show/hide labels based on zoom
        const k = event.transform.k
        g.selectAll(".dm-ng-label").attr("display", k > 0.6 ? "block" : "none")
      })

    svg.call(zoomBehavior)

    // Draw edges
    const linkGroup = g.append("g").attr("class", "dm-ng-links")
    const linkEls = linkGroup
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#2a2a3a")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 0.6)

    // Draw nodes
    const nodeGroup = g.append("g").attr("class", "dm-ng-nodes")
    const nodeEls = nodeGroup
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("class", "dm-ng-node")
      .attr("cursor", "pointer")

    // Node shapes
    nodeEls
      .append("path")
      .attr("class", "dm-ng-shape")
      .attr("d", (d) => {
        const r = getNodeSize(d)
        return d.type === "politician" ? hexPath(0, 0, r) : rectPath(0, 0, r)
      })
      .attr("fill", (d) => getNodeColor(d))
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => getNodeColor(d))
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5)

    // Labels
    nodeEls
      .append("text")
      .attr("class", "dm-ng-label")
      .attr("x", 0)
      .attr("y", (d) => getNodeSize(d) + 10)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.text)
      .attr("font-family", "'Space Mono', monospace")
      .attr("font-size", "10px")
      .text((d) => {
        const name = d.name
        return name.length > 20 ? name.slice(0, 18) + ".." : name
      })

    // Drag behavior
    const dragBehavior = drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation?.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation?.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    nodeEls.call(dragBehavior)

    // Hover
    nodeEls
      .on("mouseenter", (event, d) => {
        highlightedNode = d

        // Find connected nodes
        const connected = new Set<string>()
        connected.add(d.id)
        simLinks.forEach((l) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          if (s === d.id) connected.add(t)
          if (t === d.id) connected.add(s)
        })

        // Dim non-connected
        nodeEls.select(".dm-ng-shape").attr("fill-opacity", (n: any) => (connected.has(n.id) ? 0.95 : 0.1))
        nodeEls.select(".dm-ng-label").attr("fill-opacity", (n: any) => (connected.has(n.id) ? 1 : 0.1))
        linkEls
          .attr("stroke", (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? COLORS.edgeHighlight : COLORS.edgeDefault
          })
          .attr("stroke-opacity", (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? 0.8 : 0.05
          })
          .attr("stroke-width", (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? 1.5 : 0.5
          })

        // Tooltip
        const info = [d.name]
        if (d.type === "politician") {
          info.push(`${d.party ?? ""} ${d.chamber ?? ""}`.trim())
          if (d.state) info.push(d.state)
          if (d.totalRaised) info.push(`Raised: ${d.totalRaised}`)
        } else {
          if (d.sector) info.push(d.sector)
          if (d.lobbyingSpend) info.push(`Lobbying: ${d.lobbyingSpend}`)
        }
        info.push(`${d.degree} connections`)

        tooltip.innerHTML = info
          .map((line, i) =>
            i === 0
              ? `<div style="font-weight:700;color:${COLORS.textBright};margin-bottom:4px">${line}</div>`
              : `<div style="color:${COLORS.textDim};font-size:10px">${line}</div>`,
          )
          .join("")
        tooltip.style.display = "block"
        tooltip.style.left = event.pageX + 12 + "px"
        tooltip.style.top = event.pageY - 10 + "px"
      })
      .on("mousemove", (event) => {
        tooltip.style.left = event.pageX + 12 + "px"
        tooltip.style.top = event.pageY - 10 + "px"
      })
      .on("mouseleave", () => {
        highlightedNode = null
        nodeEls.select(".dm-ng-shape").attr("fill-opacity", 0.85)
        nodeEls.select(".dm-ng-label").attr("fill-opacity", 1)
        linkEls.attr("stroke", COLORS.edgeDefault).attr("stroke-opacity", 0.4).attr("stroke-width", 0.5)
        tooltip.style.display = "none"
      })

    // Click to navigate
    nodeEls.on("click", (_event, d) => {
      const href = `/${d.slug}`
      // Use Quartz SPA navigation if available
      const navEvent = new CustomEvent("navigate", { detail: { url: href } })
      window.dispatchEvent(navEvent)
      window.location.href = href
    })

    // Force simulation
    simulation = forceSimulation<GraphNode>(simNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(simLinks)
          .id((d) => d.id)
          .distance(60),
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collision", forceCollide<GraphNode>().radius((d) => getNodeSize(d) + 4))
      .force("x", forceX(width / 2).strength(0.05))
      .force("y", forceY(height / 2).strength(0.05))

    // Warm up — pre-compute layout
    for (let i = 0; i < 200; i++) simulation.tick()

    // Apply positions
    function ticked() {
      linkEls
        .attr("x1", (d: any) => (d.source as GraphNode).x!)
        .attr("y1", (d: any) => (d.source as GraphNode).y!)
        .attr("x2", (d: any) => (d.target as GraphNode).x!)
        .attr("y2", (d: any) => (d.target as GraphNode).y!)

      nodeEls.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
    }

    ticked()
    simulation.on("tick", ticked)
    simulation.alphaDecay(0.05).alphaTarget(0).restart()

    // Auto-zoom to fit
    const padding = 40
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const n of simNodes) {
      if (n.x! < minX) minX = n.x!
      if (n.y! < minY) minY = n.y!
      if (n.x! > maxX) maxX = n.x!
      if (n.y! > maxY) maxY = n.y!
    }
    const dx = maxX - minX + padding * 2
    const dy = maxY - minY + padding * 2
    const scale = Math.min(width / dx, height / dy, 1.5)
    const tx = width / 2 - ((minX + maxX) / 2) * scale
    const ty = height / 2 - ((minY + maxY) / 2) * scale
    svg.call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(scale))
  }

  // Search
  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase().trim()
    if (!q) {
      select(svgEl).selectAll(".dm-ng-shape").attr("fill-opacity", 0.85)
      select(svgEl).selectAll(".dm-ng-label").attr("fill-opacity", 1)
      return
    }

    select(svgEl)
      .selectAll(".dm-ng-node")
      .each(function (this: SVGGElement, d: any) {
        const match = d.name.toLowerCase().includes(q)
        select(this).select(".dm-ng-shape").attr("fill-opacity", match ? 1 : 0.08)
        select(this).select(".dm-ng-label").attr("fill-opacity", match ? 1 : 0.08)
      })
  })

  // Filter buttons
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = (btn as HTMLElement).dataset.filter ?? "all"
      filterBtns.forEach((b) => b.classList.remove("dm-ng-filter-active"))
      btn.classList.add("dm-ng-filter-active")
      render()
    })
  })

  // Slider
  slider?.addEventListener("input", () => {
    maxNodes = parseInt(slider.value)
    countDisplay.textContent = String(maxNodes)
    render()
  })
}

// Init
initNetworkGraph()
document.addEventListener("nav", () => {
  setTimeout(initNetworkGraph, 150)
})
