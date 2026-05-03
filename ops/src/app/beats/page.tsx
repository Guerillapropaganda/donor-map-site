import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { readStore } from "@/lib/beat-verifications"
import { BEATS, type BeatRecord, type BeatStatus } from "@/lib/beats-catalog"
import { runPreflight } from "@/lib/preflight"
import fs from "fs"
import path from "path"

/**
 * Beats catalog · /beats
 *
 * Status board for every editorial beat the project has produced or
 * has scheduled. Distinct from /active-beat (which is the per-beat
 * editorial workspace): /beats is the catalog/reading view including
 * past, present, scheduled, and archived beats. Click any row to
 * jump to /active-beat/[slug] for the workspace.
 *
 * Sections:
 *   - LIVE          beats currently in data/public-routes.json
 *   - ACTIVE        in catalog, prototype exists, not yet public
 *   - UPCOMING      scheduled per the editorial sprint queue, no
 *                   prototype yet
 *   - DRAFT         exploratory drafts, not yet on the schedule
 *   - PUBLISHED     historical record of what shipped (separate from
 *                   LIVE — a beat can be published-then-archived)
 *   - ARCHIVED      retired
 *
 * Adding a new beat = appending a record in
 * ops/src/lib/beats-catalog.ts. This page picks it up automatically.
 */

interface BeatMeta {
  wordCount: number | null
  lastModified: string | null
}

function readBeatMeta(beat: BeatRecord): BeatMeta {
  if (!beat.prototypeFile || beat.prototypeFile.startsWith("(")) {
    return { wordCount: null, lastModified: null }
  }
  // Resolve from repo root: ops is two levels deep at ops/src/app/beats
  // So three "../" hops from this file's compiled CWD won't necessarily
  // work; we use process.cwd() which Next.js sets to the ops/ root.
  const filePath = path.join(process.cwd(), "..", "prototype", beat.prototypeFile)
  try {
    const stat = fs.statSync(filePath)
    const text = fs.readFileSync(filePath, "utf-8")
    // Strip HTML tags and count words; rough but useful at a glance.
    const stripped = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, " ")
    const words = stripped.split(/\s+/).filter(Boolean).length
    return {
      wordCount: words,
      lastModified: stat.mtime.toISOString().slice(0, 10),
    }
  } catch {
    return { wordCount: null, lastModified: null }
  }
}

export default function BeatsCatalogPage() {
  const allEntries = readStore()
  const live: BeatRecord[] = []
  const active: BeatRecord[] = []
  const upcoming: BeatRecord[] = []
  const draft: BeatRecord[] = []
  const published: BeatRecord[] = []
  const archived: BeatRecord[] = []

  for (const b of BEATS) {
    const pf = runPreflight(b)
    if (pf.isLive) {
      live.push(b)
      continue
    }
    switch (b.status as BeatStatus) {
      case "active":
        active.push(b)
        break
      case "upcoming":
        upcoming.push(b)
        break
      case "draft":
        draft.push(b)
        break
      case "published":
        published.push(b)
        break
      case "archived":
        archived.push(b)
        break
    }
  }

  return (
    <div>
      <PageHeader
        title="Beats catalog"
        whatThisDoes="Status board for every editorial beat: live, active, upcoming, draft, archived. The reading view of ops/src/lib/beats-catalog.ts. Click any row to jump to /active-beat/[slug] for the editorial workspace."
        rightNow={
          <span>
            {BEATS.length} total · {live.length} live · {active.length} active · {upcoming.length} upcoming
          </span>
        }
        action="Click any beat row to open its workspace. Adding a new beat = appending a record in ops/src/lib/beats-catalog.ts."
      />

      <Section title="Live" subtitle="Currently in data/public-routes.json" beats={live} allEntries={allEntries} emptyText="No beats currently public. Construction splash is the only live route." />
      <Section title="Active editorial" subtitle="Prototype exists, in editing, not yet public" beats={active} allEntries={allEntries} emptyText="No active beats." />
      <Section title="Upcoming" subtitle="Scheduled per the editorial sprint queue · Perplexity rounds typically queued first" beats={upcoming} allEntries={allEntries} emptyText="No upcoming beats scheduled." />
      <Section title="Draft" subtitle="Exploratory drafts, not yet on the schedule" beats={draft} allEntries={allEntries} emptyText="No drafts." />
      <Section title="Published archive" subtitle="Historical record of beats that shipped (separate from LIVE)" beats={published} allEntries={allEntries} emptyText="No published-then-archived beats yet." />
      <Section title="Archived" subtitle="Retired" beats={archived} allEntries={allEntries} emptyText="No archived beats." />
    </div>
  )
}

function Section({
  title,
  subtitle,
  beats,
  allEntries,
  emptyText,
}: {
  title: string
  subtitle: string
  beats: BeatRecord[]
  allEntries: ReturnType<typeof readStore>
  emptyText: string
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ borderBottom: "2px solid var(--color-border)", paddingBottom: 8, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
          {title} <span style={{ color: "var(--color-text-muted)", fontWeight: 400, fontSize: 14 }}>· {beats.length}</span>
        </h2>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{subtitle}</div>
      </div>

      {beats.length === 0 ? (
        <div style={{ padding: "16px 12px", color: "var(--color-text-muted)", fontStyle: "italic", fontSize: 13 }}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {beats.map((b) => (
            <BeatRow key={b.slug} beat={b} allEntries={allEntries} />
          ))}
        </div>
      )}
    </section>
  )
}

function BeatRow({ beat, allEntries }: { beat: BeatRecord; allEntries: ReturnType<typeof readStore> }) {
  const entries = allEntries.filter((e) => e.beat === beat.slug)
  const totalCount = entries.length || beat.verificationSeeds.length
  const verifiedCount = entries.filter((e) => e.status === "verified").length
  const openCount = entries.filter((e) => e.status === "open").length
  const meta = readBeatMeta(beat)
  const preflight = runPreflight(beat)

  const statusBadge =
    beat.status === "active"
      ? { label: "ACTIVE", bg: "#1d4ed8", fg: "#fff" }
      : beat.status === "upcoming"
        ? { label: "UPCOMING", bg: "#7c3aed", fg: "#fff" }
        : beat.status === "draft"
          ? { label: "DRAFT", bg: "#fbbf24", fg: "#0a0a0a" }
          : beat.status === "published"
            ? { label: "PUBLISHED", bg: "#16a34a", fg: "#fff" }
            : { label: "ARCHIVED", bg: "#737373", fg: "#fff" }

  const liveBadge = preflight.isLive ? { label: "LIVE", bg: "#16a34a", fg: "#fff" } : null

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
          {liveBadge && (
            <span
              style={{
                background: liveBadge.bg,
                color: liveBadge.fg,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                padding: "2px 6px",
              }}
            >
              {liveBadge.label}
            </span>
          )}
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
          <code style={{ fontSize: 11, color: "var(--color-text-muted)" }}>/{beat.publicSlug}</code>
        </div>

        <Link
          href={`/active-beat/${beat.slug}`}
          style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", textDecoration: "none", display: "block", marginBottom: 4 }}
        >
          {beat.title}
        </Link>

        <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4, marginBottom: 8 }}>{beat.deck}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "var(--color-text-muted)" }}>
          {totalCount > 0 && (
            <span>
              <strong style={{ color: "var(--color-text)" }}>{verifiedCount}/{totalCount}</strong> verified
              {openCount > 0 && <span style={{ color: "#fbbf24" }}> · {openCount} open</span>}
            </span>
          )}
          {meta.wordCount !== null && (
            <span>
              <strong style={{ color: "var(--color-text)" }}>{meta.wordCount.toLocaleString()}</strong> words
            </span>
          )}
          {meta.lastModified && (
            <span>
              edited <strong style={{ color: "var(--color-text)" }}>{meta.lastModified}</strong>
            </span>
          )}
          {beat.perplexityRounds.length > 0 && (
            <span>
              <strong style={{ color: "var(--color-text)" }}>{beat.perplexityRounds.length}</strong> Perplexity round{beat.perplexityRounds.length === 1 ? "" : "s"}
            </span>
          )}
          {beat.auditPasses.length > 0 && (
            <span>
              <strong style={{ color: "var(--color-text)" }}>{beat.auditPasses.length}</strong> audit pass{beat.auditPasses.length === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", fontSize: 11 }}>
        <Link
          href={`/active-beat/${beat.slug}`}
          style={{ color: "#1d4ed8", textDecoration: "none", fontWeight: 700, padding: "4px 10px", border: "1px solid #1d4ed8" }}
        >
          Workspace →
        </Link>
        {beat.prototypeUrl && (
          <a
            href={beat.prototypeUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            Preview ↗
          </a>
        )}
        {beat.dossierPath && (
          <span style={{ color: "var(--color-text-muted)", fontFamily: "monospace", fontSize: 9 }}>
            {beat.dossierPath.split("/").slice(-1)[0]}
          </span>
        )}
      </div>
    </div>
  )
}
