import { PageHeader } from "@/components/PageHeader"
import { CHARTS, type ChartRecord, type ChartStatus, type ChartType } from "@/lib/charts-catalog"
import { getBeat } from "@/lib/beats-catalog"

/**
 * Charts catalog · /charts
 *
 * Per-beat curated chart library + the generic component prototype
 * library. Two main sections:
 *
 *   1. GENERIC LIBRARY — reusable visualization components from
 *      prototype/charts.html (DonorClassPie, DonorStripe,
 *      VotingDivergenceSparkline, MoneyFlowSankey).
 *
 *   2. INLINE CHARTS BY BEAT — every inline SVG chart shipped in a
 *      production beat HTML file, grouped by beat.
 *
 * Each chart row links to its preview URL on the prototype dev
 * server (port 8096) and shows source location for navigating to
 * the SVG code.
 *
 * Adding a new chart = appending a record in
 * ops/src/lib/charts-catalog.ts. This page picks it up automatically.
 */

export default function ChartsCatalogPage() {
  const library = CHARTS.filter((c) => c.beat === "library")
  const inlineCharts = CHARTS.filter((c) => c.beat !== "library")

  // Group inline charts by beat slug.
  const byBeat: Record<string, ChartRecord[]> = {}
  for (const c of inlineCharts) {
    const beat = c.beat
    if (!byBeat[beat]) byBeat[beat] = []
    byBeat[beat].push(c)
  }
  const beatSlugs = Object.keys(byBeat).sort()

  return (
    <div>
      <PageHeader
        title="Charts catalog"
        whatThisDoes="Per-beat curated chart library plus the generic component prototype set. Reading view of ops/src/lib/charts-catalog.ts. Click any chart to open its preview at the source URL on the prototype dev server."
        rightNow={
          <span>
            {CHARTS.length} total · {library.length} library · {inlineCharts.length} inline across {beatSlugs.length} beat{beatSlugs.length === 1 ? "" : "s"}
          </span>
        }
        action="Adding a new chart = appending a record in ops/src/lib/charts-catalog.ts. The prototype dev server must be running on port 8096 for previews to render."
        href={{ label: "prototype/charts.html ↗", url: "http://localhost:8096/charts" }}
      />

      <Section
        title="Generic component library"
        subtitle="Reusable visualization patterns from prototype/charts.html — port to Quartz components when ready"
        charts={library}
        emptyText="No library components registered."
      />

      {beatSlugs.length === 0 && (
        <div style={{ padding: "16px 12px", color: "var(--color-text-muted)", fontStyle: "italic", fontSize: 13 }}>
          No inline charts registered yet.
        </div>
      )}

      {beatSlugs.map((slug) => {
        const beat = getBeat(slug)
        const charts = byBeat[slug]
        return (
          <Section
            key={slug}
            title={beat ? beat.title : slug}
            subtitle={`/${slug} · ${charts.length} inline chart${charts.length === 1 ? "" : "s"}`}
            charts={charts}
            emptyText="No charts in this beat."
          />
        )
      })}
    </div>
  )
}

function Section({ title, subtitle, charts, emptyText }: { title: string; subtitle: string; charts: ChartRecord[]; emptyText: string }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ borderBottom: "2px solid var(--color-border)", paddingBottom: 8, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
          {title} <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: 14 }}>· {charts.length}</span>
        </h2>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{subtitle}</div>
      </div>

      {charts.length === 0 ? (
        <div style={{ padding: "16px 12px", color: "var(--color-text-muted)", fontStyle: "italic", fontSize: 13 }}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {charts.map((c) => (
            <ChartRow key={c.id} chart={c} />
          ))}
        </div>
      )}
    </section>
  )
}

const TYPE_BADGES: Record<ChartType, { label: string; bg: string; fg: string }> = {
  pie: { label: "PIE", bg: "#7c3aed", fg: "#fff" },
  bar: { label: "BAR", bg: "#1d4ed8", fg: "#fff" },
  "stacked-bar": { label: "STACKED-BAR", bg: "#1538a8", fg: "#fff" },
  "step-line": { label: "STEP-LINE", bg: "#16a34a", fg: "#fff" },
  sankey: { label: "SANKEY", bg: "#e63946", fg: "#fff" },
  sparkline: { label: "SPARKLINE", bg: "#0891b2", fg: "#fff" },
  stripe: { label: "STRIPE", bg: "#fbbf24", fg: "#0a0a0a" },
  "daisy-chain": { label: "DAISY-CHAIN", bg: "#a31e2a", fg: "#fff" },
}

const STATUS_BADGES: Record<ChartStatus, { label: string; bg: string; fg: string }> = {
  library: { label: "LIBRARY", bg: "#6b7280", fg: "#fff" },
  inline: { label: "INLINE", bg: "#16a34a", fg: "#fff" },
  draft: { label: "DRAFT", bg: "#fbbf24", fg: "#0a0a0a" },
  archived: { label: "ARCHIVED", bg: "#737373", fg: "#fff" },
}

function ChartRow({ chart }: { chart: ChartRecord }) {
  const typeBadge = TYPE_BADGES[chart.type]
  const statusBadge = STATUS_BADGES[chart.status]

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        padding: 16,
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span
            style={{
              background: typeBadge.bg,
              color: typeBadge.fg,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "2px 6px",
            }}
          >
            {typeBadge.label}
          </span>
          <span
            style={{
              background: statusBadge.bg,
              color: statusBadge.fg,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              padding: "2px 6px",
            }}
          >
            {statusBadge.label}
          </span>
          <code style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{chart.id}</code>
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{chart.name}</div>

        <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.4, marginBottom: 8 }}>{chart.description}</div>

        {chart.editorialNotes && (
          <div
            style={{
              fontSize: 12,
              fontStyle: "italic",
              color: "var(--color-text-muted)",
              borderLeft: "2px solid var(--color-border)",
              paddingLeft: 8,
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            {chart.editorialNotes}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "var(--color-text-muted)" }}>
          <span style={{ fontFamily: "monospace" }}>{chart.sourceFile}</span>
          {chart.sourceAnchor && (
            <span style={{ fontFamily: "monospace", color: "var(--color-text-muted)" }}>
              {chart.sourceAnchor}
            </span>
          )}
          {chart.dataSources.length > 0 && (
            <span>
              <strong style={{ color: "var(--color-text)" }}>data:</strong> {chart.dataSources.join(" · ")}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", fontSize: 11 }}>
        {chart.previewUrl && (
          <a
            href={chart.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 700, padding: "4px 10px", border: "1px solid #1d4ed8" }}
          >
            Preview ↗
          </a>
        )}
      </div>
    </div>
  )
}
