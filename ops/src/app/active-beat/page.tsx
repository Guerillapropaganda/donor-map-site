import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { readStore } from "@/lib/beat-verifications"
import { listBeats, type BeatRecord } from "@/lib/beats-catalog"
import { runPreflight } from "@/lib/preflight"

/**
 * Active Beat index · /active-beat
 *
 * Lists every beat in the catalog with at-a-glance status:
 *   - verification counts (verified / open / total)
 *   - LIVE / NOT LIVE flag (is publicSlug in public-routes.json)
 *   - preflight summary (canPublish / failingCount)
 *
 * Click into a beat for the full per-beat workspace at
 * /active-beat/[slug] (with the Publish button at the bottom).
 *
 * Adding a new beat = appending one record in
 * ops/src/lib/beats-catalog.ts. This page picks it up automatically.
 */

export default function ActiveBeatIndexPage() {
  const beats = listBeats()
  // Read the verifications store ONCE for the whole page render. We
  // intentionally do NOT call ensureSeeded here - that's the [slug]
  // page's job, called the first time a beat workspace loads. Calling
  // it on every index render creates a write-amplification race with
  // the API that David hits when he clicks Verify. The store is the
  // source of truth; the catalog is initial state only.
  const allEntries = readStore()
  const liveCount = beats.filter((b) => runPreflight(b).isLive).length
  const activeCount = beats.filter((b) => b.status === "active").length

  return (
    <div>
      <PageHeader
        title="Active Beats"
        whatThisDoes="Editorial workspace index. Every beat in the catalog (ops/src/lib/beats-catalog.ts) appears here with at-a-glance status: verification counts, preflight gate health, LIVE flag. Click into a beat for the full workspace + Publish button."
        rightNow={
          <span>
            {beats.length} beat{beats.length === 1 ? "" : "s"} · {activeCount} active · {liveCount} live in public-routes.json
          </span>
        }
        action="Click any beat tile to open its workspace. New beats are added by appending a record to ops/src/lib/beats-catalog.ts."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "16px" }}>
        {beats.map((b) => {
          const entries = allEntries.filter((e) => e.beat === b.slug)
          // Beats whose seeds haven't been initialized yet show their
          // catalog seed count so the index isn't blank for new beats.
          const totalCount = entries.length || b.verificationSeeds.length
          return <BeatCard key={b.slug} beat={b} totalCount={totalCount} verifiedCount={entries.filter((e) => e.status === "verified").length} openCount={entries.filter((e) => e.status === "open").length} />
        })}
      </div>
    </div>
  )
}

function BeatCard({
  beat,
  totalCount,
  verifiedCount,
  openCount,
}: {
  beat: BeatRecord
  totalCount: number
  verifiedCount: number
  openCount: number
}) {
  const preflight = runPreflight(beat)

  const statusBadge = preflight.isLive
    ? { label: "LIVE", bg: "#16a34a", fg: "#fff" }
    : preflight.canPublish
      ? { label: "READY", bg: "#fbbf24", fg: "#0a0a0a" }
      : { label: `${preflight.failingCount} GATE${preflight.failingCount === 1 ? "" : "S"} OPEN`, bg: "#1f2937", fg: "var(--color-text)" }

  const statusTagBg =
    beat.status === "active"
      ? "#1d4ed8"
      : beat.status === "published"
        ? "#16a34a"
        : beat.status === "draft"
          ? "#fbbf24"
          : beat.status === "upcoming"
            ? "#7c3aed"
            : "#737373"

  return (
    <Link
      href={`/active-beat/${beat.slug}`}
      style={{
        display: "block",
        padding: "20px 24px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "4px",
        textDecoration: "none",
        color: "var(--color-text)",
      }}
    >
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
        <span
          style={{
            background: statusTagBg,
            color: "#fff",
            padding: "3px 8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}
        >
          {beat.status}
        </span>
        <span
          style={{
            background: statusBadge.bg,
            color: statusBadge.fg,
            padding: "3px 8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}
        >
          {statusBadge.label}
        </span>
        <span style={{ fontSize: "11px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.5px" }}>
          /{beat.publicSlug}
        </span>
      </div>

      <h3 style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--color-text)", marginBottom: "8px", lineHeight: 1.2 }}>
        {beat.title}
      </h3>

      <p style={{ fontSize: "13px", color: "var(--color-text-dim)", lineHeight: 1.5, marginBottom: "14px" }}>
        {beat.deck.length > 200 ? beat.deck.slice(0, 200) + "..." : beat.deck}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
          padding: "10px 0",
          borderTop: "1px solid #1f2937",
          borderBottom: "1px solid #1f2937",
          marginBottom: "12px",
        }}
      >
        <Stat label="Verified" value={`${verifiedCount} / ${totalCount}`} color="#16a34a" />
        <Stat label="Open URLs" value={`${openCount}`} color={openCount > 0 ? "#fbbf24" : "#666"} />
        <Stat label="Audits" value={`${beat.auditPasses.length}`} color="#5b8dce" />
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          color: "#fbbf24",
          textTransform: "uppercase",
        }}
      >
        Open workspace →
      </div>
    </Link>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: "10px", letterSpacing: "1.5px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 800, color, fontFamily: "var(--font-mono, monospace)" }}>{value}</div>
    </div>
  )
}
