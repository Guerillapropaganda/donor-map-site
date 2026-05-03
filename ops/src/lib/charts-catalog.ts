/**
 * Charts catalog — central registry of every editorial chart the
 * project uses, both the generic component library at prototype/charts.html
 * and the inline SVG charts shipped in production beat HTML files.
 *
 * Used by the /charts ops page to surface previewable, embeddable
 * chart components per beat. Adding a new chart = appending a record
 * here; the /charts page picks it up automatically.
 *
 * Status meanings:
 *   library     - generic reusable component in prototype/charts.html
 *   inline      - shipped inline in a specific beat's HTML
 *   draft       - exists in source but not yet placed in a beat
 *   archived    - retired, kept for reference
 */

export type ChartStatus = "library" | "inline" | "draft" | "archived"

export type ChartType =
  | "pie"
  | "bar"
  | "stacked-bar"
  | "step-line"
  | "sankey"
  | "sparkline"
  | "stripe"
  | "daisy-chain"

export interface ChartRecord {
  /** Stable id, kebab-case */
  id: string
  /** Display name */
  name: string
  /** Brief description: what does it visualize */
  description: string
  /** Type of chart */
  type: ChartType
  /** Beat slug it lives in (or "library" for generic components) */
  beat: string | "library"
  /** Source file path relative to repo root */
  sourceFile: string
  /** Approx line range or anchor (for navigation aid) */
  sourceAnchor?: string
  /** Live preview URL where the chart renders */
  previewUrl?: string
  /** What data sources feed it */
  dataSources: string[]
  /** Current status */
  status: ChartStatus
  /** Editorial notes / what makes this chart load-bearing */
  editorialNotes?: string
}

export const CHARTS: ChartRecord[] = [
  // ─── Generic component library ────────────────────────────────────
  {
    id: "donor-class-pie",
    name: "Donor Class Pie",
    description:
      "Donut + legend showing the capital-cluster breakdown of a politician's donor base (e.g., dark-money-vehicle, fossil-capital, finance, military-industrial). Sized by dollar share.",
    type: "pie",
    beat: "library",
    sourceFile: "prototype/charts.html",
    previewUrl: "http://localhost:8096/charts",
    dataSources: ["data/relationships.jsonl", "ADR-0001 class-tag fields on donor entities"],
    status: "library",
    editorialNotes: "First implemented for the McConnell flagship (13 capital clusters). Reusable for any politician with class-tagged donors.",
  },
  {
    id: "donor-stripe",
    name: "Donor Stripe",
    description: "Horizontal 4-segment percentage bar showing money composition: Mega-Donors / Dark Money / Small-Dollar / Self-Funded.",
    type: "stripe",
    beat: "library",
    sourceFile: "prototype/charts.html",
    previewUrl: "http://localhost:8096/charts",
    dataSources: ["data/relationships.jsonl", "data/entities.jsonl"],
    status: "library",
    editorialNotes: "Already shipping on profile pages in production Quartz site. The cleanest one-glance fingerprint of a politician's funding base.",
  },
  {
    id: "voting-divergence-sparkline",
    name: "Voting Divergence Sparkline",
    description: "Line chart of vote-by-vote position vs party median, encoded by divergence distance. Manchin's 20% party divergence is the reference case.",
    type: "sparkline",
    beat: "library",
    sourceFile: "prototype/charts.html",
    previewUrl: "http://localhost:8096/charts",
    dataSources: ["data/votes.jsonl", "Voteview bulk roll-call data"],
    status: "library",
    editorialNotes: "Built for Joe Manchin profile flagship. Best for cross-party candidates and Senate moderates.",
  },
  {
    id: "money-flow-sankey",
    name: "Money Flow Sankey",
    description: "Sankey diagram tracing donor → committee → recipient ribbons. Shows the funding pipeline as flow-weighted bands.",
    type: "sankey",
    beat: "library",
    sourceFile: "prototype/charts.html",
    previewUrl: "http://localhost:8096/charts",
    dataSources: ["data/relationships.jsonl", "Cal-Access committee transfer data"],
    status: "library",
    editorialNotes: "Best for Fairshake-PAC-style stories where the funding pipeline IS the story. Requires full upstream/downstream committee mapping.",
  },

  // ─── Class Traitor beat (4 inline charts) ──────────────────────
  {
    id: "anti-steyer-daisy-chain",
    name: "Anti-Steyer money-flow daisy-chain",
    description:
      "Hero diagram: 5 industries (PG&E, CAR, JOBSPAC, CBIA, CCPOA) → anti-Steyer committee 1489677 → target. Shows the funnel structure at a glance.",
    type: "daisy-chain",
    beat: "class-traitor",
    sourceFile: "prototype/beat-class-traitor.html",
    sourceAnchor: "Hero visualization (~line 579)",
    previewUrl: "http://localhost:8096/class-traitor#top",
    dataSources: ["FPPC committee 1489677", "FPPC committee 1490270", "Cal-Access RCPT_CD"],
    status: "inline",
    editorialNotes: "Load-bearing hero. The visual punchline of the entire beat — five industries, one committee, one target.",
  },
  {
    id: "class-traitor-symmetry",
    name: "Class Traitor symmetry chart",
    description:
      "Side-by-side stacked bars: Farallon documented exposure 1986-2012 (left, red shades) vs anti-Steyer coalition 2026 (right, yellow shades). Same wealth machine, two roles, fourteen years apart.",
    type: "stacked-bar",
    beat: "class-traitor",
    sourceFile: "prototype/beat-class-traitor.html",
    sourceAnchor: "#record section",
    previewUrl: "http://localhost:8096/class-traitor#record",
    dataSources: ["SEC 13F filings (Farallon)", "Reuters/NYT/Politico/SacBee reporting", "FPPC 1489677 + 1490270"],
    status: "inline",
    editorialNotes: "Built specifically for the Option C reframe — does the visual editorial work that the wealth-origin counter-attack would otherwise undermine. Tobacco + CBIA + CCPOA labels in callouts.",
  },
  {
    id: "anti-steyer-spend-timeline",
    name: "Spending dam-break timeline",
    description:
      "Step chart of cumulative anti-Steyer IE spend April 2 → April 28. Inflection points: $30K opposition poll, $13.89M Form 460 base, $19.97M after April 24's +$5.13M one-day jump (highlighted yellow), $20.04M April 28.",
    type: "step-line",
    beat: "class-traitor",
    sourceFile: "prototype/beat-class-traitor.html",
    sourceAnchor: "#buying section",
    previewUrl: "http://localhost:8096/class-traitor#buying",
    dataSources: ["FPPC filings 3138008 + 3137881 + 3139142 + 3141747"],
    status: "inline",
    editorialNotes: "Visualizes the spend-numbers refresh from the Gudelunas/1489677 Perplexity update. The April 24 dam-break is the moment the late-stage spend becomes visible.",
  },
  {
    id: "polling-firms-comparison",
    name: "Polling firms comparison bar",
    description:
      "5-bar comparison of Becerra polling, same field window (April 14-27): Gudelunas 24% / IVP 23% / EMC 21% (red, IE-funded) vs CBS 13% / Emerson 10% (blue, media-funded). 11-point gap visible.",
    type: "bar",
    beat: "class-traitor",
    sourceFile: "prototype/beat-class-traitor.html",
    sourceAnchor: "#polling section",
    previewUrl: "http://localhost:8096/class-traitor#polling",
    dataSources: ["Gudelunas Strategies memos", "IVP / EMC / CBS-YouGov / Emerson-ICP releases"],
    status: "inline",
    editorialNotes: "The visual support for the 'polls are part of the race' thesis. Color-coded by funding source.",
  },
]

export function listCharts(): ChartRecord[] {
  return CHARTS
}

export function getChart(id: string): ChartRecord | null {
  return CHARTS.find((c) => c.id === id) || null
}

export function listChartsByBeat(beat: string): ChartRecord[] {
  return CHARTS.filter((c) => c.beat === beat)
}

export function listChartsByStatus(status: ChartStatus): ChartRecord[] {
  return CHARTS.filter((c) => c.status === status)
}
