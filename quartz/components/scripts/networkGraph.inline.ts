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
  type: "politician" | "donor" | "corporation" | "pac" | "think-tank" | "lobbying" | "media"
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

const COLORS_PURPLE = "#a855f7"

function getNodeColor(node: GraphNode): string {
  if (node.type === "politician") {
    if (node.party === "Democrat") return COLORS.blue
    if (node.party === "Republican") return COLORS.red
    return COLORS.textDim
  }
  if (node.type === "think-tank") return COLORS.amber
  if (node.type === "lobbying") return COLORS.steel
  if (node.type === "media") return COLORS_PURPLE
  return COLORS.green // donors, corporations, PACs
}

function getNodeSize(node: GraphNode): number {
  const base = node.type === "politician" ? 7 : 6
  return base + Math.min(Math.sqrt(node.degree) * 2.2, 14)
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

// Diamond path for think tanks
function diamondPath(cx: number, cy: number, r: number): string {
  const w = r * 1.4
  const h = r * 1.4
  return `M${cx},${cy - h} L${cx + w},${cy} L${cx},${cy + h} L${cx - w},${cy}Z`
}

// Circle path for media figures
function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r},${cy} A${r},${r} 0 1,1 ${cx + r},${cy} A${r},${r} 0 1,1 ${cx - r},${cy}Z`
}

// Get shape path based on node type
function getNodePath(type: string, cx: number, cy: number, r: number): string {
  if (type === "politician") return hexPath(cx, cy, r)
  if (type === "think-tank") return diamondPath(cx, cy, r)
  if (type === "media") return circlePath(cx, cy, r)
  if (type === "lobbying") return hexPath(cx, cy, r) // K Street gets hexagons too (institutional)
  return rectPath(cx, cy, r) // donors, corporations, PACs
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

    // SVG defs — glow filters
    const defs = svg.append("defs")

    // Glow filter for highlighted edges
    const edgeGlow = defs.append("filter").attr("id", "dm-edge-glow")
    edgeGlow.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "blur")
    edgeGlow.append("feMerge").html('<feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/>')

    // Glow filter for hovered nodes
    const nodeGlow = defs.append("filter").attr("id", "dm-node-glow")
    nodeGlow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur")
    nodeGlow.append("feMerge").html('<feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/>')

    // Zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
        // Show labels only when zoomed in enough to read them
        const k = event.transform.k
        g.selectAll(".dm-ng-label").attr("display", k > 1.2 ? "block" : "none")
      })

    svg.call(zoomBehavior)

    // Draw edges — curved paths instead of straight lines
    const linkGroup = g.append("g").attr("class", "dm-ng-links")
    const linkEls = linkGroup
      .selectAll("path")
      .data(simLinks)
      .join("path")
      .attr("class", "dm-ng-edge")
      .attr("fill", "none")
      .attr("stroke", "#1e1e2e")
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", 0.7)

    // Draw nodes
    const nodeGroup = g.append("g").attr("class", "dm-ng-nodes")
    const nodeEls = nodeGroup
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("class", "dm-ng-node")
      .attr("cursor", "pointer")

    // Outer glow ring (behind the shape)
    nodeEls
      .append("path")
      .attr("class", "dm-ng-glow-ring")
      .attr("d", (d) => {
        const r = getNodeSize(d) + 3
        return d.type === "politician" ? hexPath(0, 0, r) : rectPath(0, 0, r)
      })
      .attr("fill", "none")
      .attr("stroke", (d) => getNodeColor(d))
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.15)

    // Node shapes
    nodeEls
      .append("path")
      .attr("class", "dm-ng-shape")
      .attr("d", (d) => {
        const r = getNodeSize(d)
        return d.type === "politician" ? hexPath(0, 0, r) : rectPath(0, 0, r)
      })
      .attr("fill", (d) => getNodeColor(d))
      .attr("fill-opacity", 0.8)
      .attr("stroke", (d) => getNodeColor(d))
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.4)

    // Labels — hidden by default, shown on hover or zoom > 1.2
    nodeEls
      .append("text")
      .attr("class", "dm-ng-label")
      .attr("x", 0)
      .attr("y", (d) => getNodeSize(d) + 10)
      .attr("text-anchor", "middle")
      .attr("fill", COLORS.text)
      .attr("font-family", "'Space Mono', monospace")
      .attr("font-size", "10px")
      .attr("display", "none")
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

        // Dim non-connected, show labels for connected nodes
        nodeEls.select(".dm-ng-shape")
          .attr("fill-opacity", (n: any) => (connected.has(n.id) ? 0.95 : 0.06))
          .attr("filter", (n: any) => (n.id === d.id ? "url(#dm-node-glow)" : "none"))
        nodeEls.select(".dm-ng-glow-ring")
          .attr("stroke-opacity", (n: any) => (connected.has(n.id) ? 0.4 : 0))
        nodeEls.select(".dm-ng-label")
          .attr("display", (n: any) => (connected.has(n.id) ? "block" : "none"))
          .attr("fill-opacity", (n: any) => (connected.has(n.id) ? 1 : 0.1))
        linkEls
          .attr("stroke", (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? COLORS.edgeHighlight : "#1e1e2e"
          })
          .attr("stroke-opacity", (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? 0.7 : 0.04
          })
          .attr("stroke-width", (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? 1.8 : 0.5
          })
          .attr("filter", (l: any) => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id ? "url(#dm-edge-glow)" : "none"
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
        nodeEls.select(".dm-ng-shape").attr("fill-opacity", 0.8).attr("filter", "none")
        nodeEls.select(".dm-ng-glow-ring").attr("stroke-opacity", 0.15)
        nodeEls.select(".dm-ng-label").attr("display", "none").attr("fill-opacity", 1)
        linkEls
          .attr("stroke", (l: any) => l.edgeType === "opposition" ? "#ef4444" : "#1e1e2e")
          .attr("stroke-opacity", (l: any) => l.edgeType === "opposition" ? 0.6 : 0.35)
          .attr("stroke-width", (l: any) => l.edgeType === "opposition" ? 1 : 0.7)
          .attr("filter", "none")
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

    // Force simulation — spread nodes apart
    simulation = forceSimulation<GraphNode>(simNodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(simLinks)
          .id((d) => d.id)
          .distance(120),
      )
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collision", forceCollide<GraphNode>().radius((d) => getNodeSize(d) + 12))
      .force("x", forceX(width / 2).strength(0.03))
      .force("y", forceY(height / 2).strength(0.03))

    // Warm up — pre-compute layout
    for (let i = 0; i < 200; i++) simulation.tick()

    // Apply positions
    function ticked() {
      // Curved edges — slight arc via quadratic bezier
      linkEls.attr("d", (d: any) => {
        const sx = (d.source as GraphNode).x!
        const sy = (d.source as GraphNode).y!
        const tx = (d.target as GraphNode).x!
        const ty = (d.target as GraphNode).y!
        const dx = tx - sx
        const dy = ty - sy
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.8
        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`
      })

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

// ── Mini-graph for ProfileWidget ──
function renderMiniGraphInContainer(container: HTMLElement, graphData: string, expanded: boolean) {
  // Clear existing
  container.innerHTML = ""

  let data: { nodes: any[]; edges: any[] }
  try {
    data = JSON.parse(graphData)
  } catch {
    return
  }
  if (data.nodes.length === 0) return

  const width = expanded ? Math.min(window.innerWidth - 80, 900) : 280
  const height = expanded ? Math.min(window.innerHeight - 120, 650) : 240

  const svgNs = "http://www.w3.org/2000/svg"
  const svgEl = document.createElementNS(svgNs, "svg")
  svgEl.setAttribute("width", String(width))
  svgEl.setAttribute("height", String(height))
  svgEl.style.display = "block"
  svgEl.style.margin = "0 auto"
  container.appendChild(svgEl)

  const svg = select(svgEl)

  // Add glow filter
  const defs = svg.append("defs")
  const glow = defs.append("filter").attr("id", "dm-mini-glow")
  glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur")
  glow.append("feMerge").html('<feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/>')

  const g = svg.append("g")

  const simNodes: GraphNode[] = data.nodes.map((n: any, i: number) => ({
    ...n,
    degree: i === 0 ? data.edges.length : 1,
  }))
  const nodeMap = new Map(simNodes.map((n) => [n.id, n]))

  const simLinks: (GraphLink & { edgeType?: string })[] = data.edges
    .map((e: any) => ({
      source: nodeMap.get(e.source)!,
      target: nodeMap.get(e.target)!,
      edgeType: e.edgeType || "allied",
    }))
    .filter((l: any) => l.source && l.target)

  // Zoom/pan (both modes)
  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform)
      // Show labels when zoomed in
      const k = event.transform.k
      if (expanded) {
        g.selectAll(".mini-label").attr("display", k > 0.8 ? "block" : "none")
      }
    })
  svg.call(zoomBehavior)

  // Edges — curved arcs (opposition = red dashed)
  const linkEls = g
    .append("g")
    .selectAll("path")
    .data(simLinks)
    .join("path")
    .attr("fill", "none")
    .attr("stroke", (l: any) => l.edgeType === "opposition" ? "#ef4444" : "#1e1e2e")
    .attr("stroke-opacity", (l: any) => l.edgeType === "opposition" ? 0.6 : 0.4)
    .attr("stroke-width", (l: any) => l.edgeType === "opposition" ? 1 : 0.6)
    .attr("stroke-dasharray", (l: any) => l.edgeType === "opposition" ? "4,3" : "none")

  // Nodes
  const nodeSize = expanded ? 8 : 5
  const centerSize = expanded ? 14 : 8

  const nodeEls = g
    .selectAll("g.mini-node")
    .data(simNodes)
    .join("g")
    .attr("class", "mini-node")
    .attr("cursor", "pointer")

  // Glow ring
  nodeEls
    .append("path")
    .attr("d", (d) => {
      const r = (d.degree > 1 ? centerSize : nodeSize) + 2
      return getNodePath(d.type, 0, 0, r)
    })
    .attr("fill", "none")
    .attr("stroke", (d) => getNodeColor(d))
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.15)

  nodeEls
    .append("path")
    .attr("class", "mini-shape")
    .attr("d", (d) => {
      const r = d.degree > 1 ? centerSize : nodeSize
      return getNodePath(d.type, 0, 0, r)
    })
    .attr("fill", (d) => getNodeColor(d))
    .attr("fill-opacity", 0.8)
    .attr("stroke", (d) => getNodeColor(d))
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.3)

  // Labels — always show in expanded, hidden in compact
  nodeEls
    .append("text")
    .attr("class", "mini-label")
    .attr("y", (d) => (d.degree > 1 ? centerSize + 12 : nodeSize + 10))
    .attr("text-anchor", "middle")
    .attr("fill", COLORS.text)
    .attr("font-family", "'Space Mono', monospace")
    .attr("font-size", expanded ? "10px" : "8px")
    .attr("display", expanded ? "block" : "none")
    .text((d) => {
      const max = expanded ? 22 : 14
      return d.name.length > max ? d.name.slice(0, max - 2) + ".." : d.name
    })

  // Drag (both modes)
  const dragBehavior = drag<SVGGElement, GraphNode>()
    .on("start", (event, d) => {
      if (!event.active) sim.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    })
    .on("drag", (event, d) => {
      d.fx = event.x
      d.fy = event.y
    })
    .on("end", (event, d) => {
      if (!event.active) sim.alphaTarget(0)
      d.fx = null
      d.fy = null
    })
  nodeEls.call(dragBehavior)

  // Hover — show label + highlight connections
  nodeEls
    .on("mouseenter", (_event, d) => {
      const connected = new Set<string>([d.id])
      simLinks.forEach((l) => {
        const s = (l.source as GraphNode).id
        const t = (l.target as GraphNode).id
        if (s === d.id) connected.add(t)
        if (t === d.id) connected.add(s)
      })

      nodeEls.select(".mini-shape")
        .attr("fill-opacity", (n: any) => (connected.has(n.id) ? 0.95 : 0.1))
        .attr("filter", (n: any) => (n.id === d.id ? "url(#dm-mini-glow)" : "none"))
      nodeEls.select(".mini-label")
        .attr("display", (n: any) => (connected.has(n.id) ? "block" : "none"))
      linkEls
        .attr("stroke", (l: any) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return s === d.id || t === d.id ? COLORS.edgeHighlight : "#1e1e2e"
        })
        .attr("stroke-opacity", (l: any) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return s === d.id || t === d.id ? 0.7 : 0.05
        })
        .attr("stroke-width", (l: any) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return s === d.id || t === d.id ? 1.5 : 0.5
        })
    })
    .on("mouseleave", () => {
      nodeEls.select(".mini-shape").attr("fill-opacity", 0.8).attr("filter", "none")
      nodeEls.select(".mini-label").attr("display", expanded ? "block" : "none")
      linkEls
        .attr("stroke", (l: any) => l.edgeType === "opposition" ? "#ef4444" : "#1e1e2e")
        .attr("stroke-opacity", (l: any) => l.edgeType === "opposition" ? 0.6 : 0.4)
        .attr("stroke-width", (l: any) => l.edgeType === "opposition" ? 1 : 0.6)
    })

  // Click to navigate
  nodeEls.on("click", (_event, d) => {
    if (d.slug) window.location.href = d.slug
  })

  // Force
  const spread = expanded ? 2.5 : 1
  const sim = forceSimulation<GraphNode>(simNodes)
    .force(
      "link",
      forceLink<GraphNode, GraphLink>(simLinks)
        .id((d) => d.id)
        .distance(50 * spread),
    )
    .force("charge", forceManyBody().strength(-100 * spread))
    .force("center", forceCenter(width / 2, height / 2))
    .force("collision", forceCollide<GraphNode>().radius((d) => (d.degree > 1 ? centerSize : nodeSize) + 6))

  for (let i = 0; i < 150; i++) sim.tick()

  function ticked() {
    linkEls.attr("d", (d: any) => {
      const sx = (d.source as GraphNode).x!
      const sy = (d.source as GraphNode).y!
      const tx = (d.target as GraphNode).x!
      const ty = (d.target as GraphNode).y!
      const dx = tx - sx
      const dy = ty - sy
      const dr = Math.sqrt(dx * dx + dy * dy) * 0.9
      return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`
    })
    nodeEls.attr("transform", (d: any) => `translate(${d.x},${d.y})`)
  }

  ticked()
  sim.on("tick", ticked)
  sim.alphaDecay(0.08).restart()

  // Auto-fit
  setTimeout(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of simNodes) {
      if (n.x! < minX) minX = n.x!
      if (n.y! < minY) minY = n.y!
      if (n.x! > maxX) maxX = n.x!
      if (n.y! > maxY) maxY = n.y!
    }
    const pad = expanded ? 60 : 30
    const dx = maxX - minX + pad * 2
    const dy = maxY - minY + pad * 2
    const scale = Math.min(width / dx, height / dy, expanded ? 1.5 : 1.2)
    const tx = width / 2 - ((minX + maxX) / 2) * scale
    const ty = height / 2 - ((minY + maxY) / 2) * scale
    svg.call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(scale))
  }, 100)
}

function initMiniGraph() {
  const miniEls = document.querySelectorAll(".pw-mini-graph")
  miniEls.forEach((el) => {
    const container = el as HTMLElement

    // Determine which graph data to use (compact vs full)
    const activeGraph = container.getAttribute("data-active-graph") || "compact"
    const compactData = container.dataset.graph
    const fullData = container.dataset.fullGraph
    const raw = activeGraph === "full" && fullData ? fullData : compactData
    if (!raw) return

    // Clear and re-render (supports toggling between compact/full)
    container.innerHTML = ""

    // Render in the sidebar panel
    renderMiniGraphInContainer(container, raw, false)

    // The "Expand Network" button is now in the JSX template (ProfileWidget)
    // The "Expand" overlay button for full-screen view:
    // Check if the expand overlay button already exists (from a previous init)
    const panel = container.parentElement
    let overlayBtn = panel?.querySelector(".pw-graph-fullscreen") as HTMLButtonElement | null
    if (!overlayBtn && panel) {
      overlayBtn = document.createElement("button")
      overlayBtn.className = "pw-mini-expand pw-graph-fullscreen"
      overlayBtn.textContent = "Full Screen"
      overlayBtn.title = "Open full-size interactive graph"
      panel.appendChild(overlayBtn)
    }

    if (overlayBtn) {
      // Remove old listener by cloning
      const newBtn = overlayBtn.cloneNode(true) as HTMLButtonElement
      overlayBtn.parentNode?.replaceChild(newBtn, overlayBtn)

      newBtn.addEventListener("click", () => {
        // Use full graph data for the overlay (always show everything)
        const overlayData = fullData || compactData
        if (!overlayData) return

        // Parse graph data to find what node types exist
        let parsedData: { nodes: any[]; edges: any[] }
        try { parsedData = JSON.parse(overlayData) } catch { return }

        // Map of type → display label
        const typeLabels: Record<string, string> = {
          "donor": "Donors",
          "politician": "Politicians",
          "think-tank": "Think Tanks",
          "lobbying": "K Street",
          "media": "Media",
          "corporation": "Corporations",
        }
        // Find which node types and edge types exist
        const typesPresent = new Set<string>()
        let hasOpposition = false
        parsedData.nodes.forEach((n: any, i: number) => {
          if (i > 0 && n.type) typesPresent.add(n.type)
        })
        parsedData.edges.forEach((e: any) => {
          if (e.edgeType === "opposition") hasOpposition = true
        })

        // Track filters
        const hiddenTypes = new Set<string>()
        let hideOpposition = false

        // Shared re-render function
        function reRenderFiltered() {
          // Filter nodes: hide by type, and if opposition hidden, remove nodes only connected via opposition
          const oppositionNodeIds = new Set<string>()
          if (hideOpposition) {
            parsedData.edges.forEach((e: any) => {
              if (e.edgeType === "opposition") {
                oppositionNodeIds.add(e.source)
                oppositionNodeIds.add(e.target)
              }
            })
            // Don't remove center node or nodes that also have allied edges
            const alliedNodeIds = new Set<string>()
            parsedData.edges.forEach((e: any) => {
              if (e.edgeType !== "opposition") {
                alliedNodeIds.add(e.source)
                alliedNodeIds.add(e.target)
              }
            })
            // Only remove nodes that are ONLY connected via opposition
            for (const id of oppositionNodeIds) {
              if (alliedNodeIds.has(id)) oppositionNodeIds.delete(id)
            }
          }
          const filteredNodes = parsedData.nodes.filter((n: any, i: number) =>
            i === 0 || (!hiddenTypes.has(n.type) && !oppositionNodeIds.has(n.id))
          )
          const nodeIds = new Set(filteredNodes.map((n: any) => n.id))
          const filteredEdges = parsedData.edges.filter((e: any) =>
            nodeIds.has(e.source) && nodeIds.has(e.target) &&
            !(hideOpposition && e.edgeType === "opposition")
          )
          graphBox.innerHTML = ""
          renderMiniGraphInContainer(graphBox, JSON.stringify({ nodes: filteredNodes, edges: filteredEdges }), true)
        }

        const overlay = document.createElement("div")
        overlay.className = "pw-graph-overlay"

        const closeBtn = document.createElement("button")
        closeBtn.className = "pw-graph-overlay-close"
        closeBtn.textContent = "Close"

        const overlayBox = document.createElement("div")
        overlayBox.className = "pw-graph-overlay-box"

        // Build filter bar
        const showFilterBar = typesPresent.size > 1 || hasOpposition
        if (showFilterBar) {
          const filterBar = document.createElement("div")
          filterBar.className = "pw-overlay-filters"

          typesPresent.forEach((nodeType) => {
            const btn = document.createElement("button")
            btn.className = "pw-overlay-filter-btn pw-filter-active"
            btn.textContent = typeLabels[nodeType] || nodeType
            btn.dataset.nodeType = nodeType
            btn.addEventListener("click", () => {
              if (hiddenTypes.has(nodeType)) {
                hiddenTypes.delete(nodeType)
                btn.classList.remove("pw-filter-off")
                btn.classList.add("pw-filter-active")
              } else {
                hiddenTypes.add(nodeType)
                btn.classList.remove("pw-filter-active")
                btn.classList.add("pw-filter-off")
              }
              reRenderFiltered()
            })
            filterBar.appendChild(btn)
          })

          // Opposition toggle (red-styled)
          if (hasOpposition) {
            const oppBtn = document.createElement("button")
            oppBtn.className = "pw-overlay-filter-btn pw-filter-active pw-filter-opposition"
            oppBtn.textContent = "Opposition"
            oppBtn.addEventListener("click", () => {
              hideOpposition = !hideOpposition
              if (hideOpposition) {
                oppBtn.classList.remove("pw-filter-active")
                oppBtn.classList.add("pw-filter-off")
              } else {
                oppBtn.classList.remove("pw-filter-off")
                oppBtn.classList.add("pw-filter-active")
              }
              reRenderFiltered()
            })
            filterBar.appendChild(oppBtn)
          }

          overlayBox.appendChild(filterBar)
        }

        const graphBox = document.createElement("div")
        overlayBox.appendChild(graphBox)

        overlay.appendChild(closeBtn)
        overlay.appendChild(overlayBox)
        document.body.appendChild(overlay)

        // Full screen shows everything initially
        renderMiniGraphInContainer(graphBox, overlayData, true)

        closeBtn.addEventListener("click", () => overlay.remove())
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) overlay.remove()
        })
        document.addEventListener("keydown", function esc(e) {
          if (e.key === "Escape") {
            overlay.remove()
            document.removeEventListener("keydown", esc)
          }
        })
      })
    }
  })
}

// Expose for ProfileWidget tab activation
;(window as any).initMiniGraph = initMiniGraph

// Init
initNetworkGraph()
initMiniGraph()
document.addEventListener("nav", () => {
  setTimeout(() => {
    initNetworkGraph()
    initMiniGraph()
  }, 150)
})
