import fs from "node:fs"
import path from "node:path"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/PageHeader"
import { memesByBeat } from "@/lib/memes-catalog"
import { ensureSeeded } from "@/lib/beat-verifications"
import { getBeat, listBeats, type BeatRecord } from "@/lib/beats-catalog"
import { getRebuttals } from "@/lib/rebuttals-catalog"
import { runPreflight } from "@/lib/preflight"
import { VerificationRow } from "../VerificationRow"
import { PublishButton } from "./PublishButton"

/**
 * Active Beat workspace · /active-beat/[slug]
 *
 * Per-beat editorial dashboard. Reads beat metadata from the catalog
 * (ops/src/lib/beats-catalog.ts), runs preflight gates, and renders
 * the same five-section workspace that the v1 single-beat page had,
 * plus the Publish button gated on preflight.
 *
 * Adding a new beat = adding one record to the catalog. No changes
 * needed here.
 */

interface PageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return listBeats().map((b) => ({ slug: b.slug }))
}

export default function BeatWorkspacePage({ params }: PageProps) {
  const found = getBeat(params.slug)
  if (!found) notFound()
  const beat: BeatRecord = found as BeatRecord

  // Seed-merge verifications: beat-specific seeds, status persists in jsonl
  const allVerifications = ensureSeeded(beat.verificationSeeds).filter((v) => v.beat === beat.slug)
  const openCount = allVerifications.filter((v) => v.status === "open").length
  const verifiedCount = allVerifications.filter((v) => v.status === "verified").length
  const otherCount = allVerifications.length - openCount - verifiedCount
  const verifiedRatio = `${verifiedCount} / ${allVerifications.length}`

  const dossier = readDossierFrontmatter(beat)
  const memes = memesByBeat(beat.slug)
  const preflight = runPreflight(beat)
  const allBeats = listBeats()
  const rebuttals = getRebuttals(beat.slug)

  return (
    <div>
      <PageHeader
        title={`Active Beat: ${beat.title}`}
        whatThisDoes="The pinned editorial workspace for this beat. All artifacts in one place: prototype URL, dossier, donor list page, memes, audit findings, open verifications, preflight gates, and the Publish button."
        rightNow={
          <span>
            {verifiedRatio} verified · {openCount} open · {otherCount} other · dossier{" "}
            {dossier.status || "(unknown status)"}
            {dossier.lastUpdated ? ` · updated ${dossier.lastUpdated}` : ""} ·{" "}
            <strong style={{ color: preflight.isLive ? "#16a34a" : "#fbbf24" }}>
              {preflight.isLive ? "LIVE" : "NOT LIVE"}
            </strong>
          </span>
        }
        action="Click ✓ Verify on each open URL after the editor URL pass. When all blocking preflight gates are green, the Publish button at the bottom of the page activates."
      />

      {/* ─── Beat switcher ─────────────────────────────────────────── */}
      <BeatSwitcher beats={allBeats} currentSlug={beat.slug} />

      {/* ─── Section 1: Artifacts ─────────────────────────────────── */}
      <Section title="Artifacts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          <ArtifactCard label="Beat page" sub={`prototype/${beat.prototypeFile}`} href={beat.prototypeUrl} external />
          <ArtifactCard label="Edit source ✎" sub={`live + local editor for prototype/${beat.prototypeFile}`} href={`/active-beat/${beat.slug}/edit`} />
          {beat.donorListUrl && beat.donorListFile && (
            <ArtifactCard label="Donor list (companion)" sub={`prototype/${beat.donorListFile}`} href={beat.donorListUrl} external />
          )}
          <ArtifactCard
            label="Dossier"
            sub={`${beat.dossierPath} · ${(dossier.bytes / 1024).toFixed(1)} KB`}
            href={`/profile?slug=${encodeURIComponent(beat.dossierPath.replace(/^content\//, "").replace(/\.md$/, ""))}`}
          />
          <ArtifactCard label={`Memes (${memes.length})`} sub={`tagged for ${beat.slug} in /distribution/cards/by-beat catalog`} href={`/distribution/cards/by-beat/${beat.slug}`} />
          <ArtifactCard label="Site Preview" sub="all routes for this beat at a glance" href="/site-preview" />
        </div>
      </Section>

      {/* ─── Section 2: Verifications ─────────────────────────────── */}
      <Section title={`Verifications (${allVerifications.length})`}>
        <div style={{ display: "grid", gap: "8px" }}>
          {allVerifications.map((v) => (
            <VerificationRow key={v.id} entry={v} />
          ))}
          {allVerifications.length === 0 && (
            <div style={{ padding: "16px", color: "var(--color-text-dim)", fontStyle: "italic", textAlign: "center" }}>
              No verification seeds declared for this beat yet. Add them in ops/src/lib/beats-catalog.ts.
            </div>
          )}
        </div>
      </Section>

      {/* ─── Section 3: Perplexity rounds ─────────────────────────── */}
      {beat.perplexityRounds.length > 0 && (
        <Section title={`Perplexity rounds (${beat.perplexityRounds.length})`}>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  <th style={th}>Round</th>
                  <th style={{ ...th, width: "240px" }}>Status</th>
                  <th style={{ ...th, width: "100px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {beat.perplexityRounds.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1f2937" }}>
                    <td style={td}>{r.name}</td>
                    <td style={td}>
                      <span
                        style={{
                          background: r.status.startsWith("applied") ? "#16a34a" : "#fbbf24",
                          color: r.status.startsWith("applied") ? "#fff" : "#0a0a0a",
                          padding: "2px 8px",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ ...td, fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim)" }}>
                      {r.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ─── Section 4: Audit findings ────────────────────────────── */}
      {beat.auditPasses.length > 0 && (
        <Section title="Audit findings applied">
          <div style={{ display: "grid", gap: "8px" }}>
            {beat.auditPasses.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 16px",
                  background: "rgba(22, 163, 74, 0.08)",
                  border: "1px solid rgba(22, 163, 74, 0.3)",
                  borderRadius: "4px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "10px",
                    letterSpacing: "1.5px",
                    color: "#16a34a",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  {a.date} · APPLIED
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>{a.name}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>{a.status}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─── Section 5: Editorial milestones ──────────────────────── */}
      {beat.editorialChecklist.length > 0 && (
        <Section title="Editorial milestones">
          <div style={{ display: "grid", gap: "8px" }}>
            {beat.editorialChecklist.map((c, i) => (
              <ChecklistRow key={i} status={c.status} label={c.label} detail={c.detail} />
            ))}
          </div>
        </Section>
      )}

      {/* ─── Section 6: Counter-arguments + responses ─────────────── */}
      {rebuttals && (
        <Section title={`Counter-arguments + responses (${rebuttals.rebuttals.length})`}>
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              border: "1px solid #374151",
              borderLeft: "3px solid #fbbf24",
              background: "rgba(251, 191, 36, 0.05)",
              fontSize: "13px",
              fontStyle: "italic",
              color: "var(--color-text)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ fontStyle: "normal", display: "block", marginBottom: "4px", letterSpacing: "0.5px" }}>
              GUIDING PRINCIPLE
            </strong>
            {rebuttals.guiding_principle}
          </div>
          <div style={{ display: "grid", gap: "16px" }}>
            {rebuttals.rebuttals.map((r, i) => (
              <RebuttalCard key={i} index={i + 1} rebuttal={r} />
            ))}
          </div>
          <div
            style={{
              marginTop: "12px",
              fontSize: "11px",
              color: "var(--color-text-dim)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Source: {rebuttals.source} · Last updated {rebuttals.last_updated}
          </div>
        </Section>
      )}

      {/* ─── Section 7: Preflight + Publish ───────────────────────── */}
      <Section title="Preflight + Publish">
        <div style={{ display: "grid", gap: "8px", marginBottom: "20px" }}>
          {preflight.gates.map((g) => (
            <ChecklistRow
              key={g.id}
              status={g.status === "pass" ? "done" : g.status === "fail" ? (g.blocking ? "blocked" : "pending") : "pending"}
              label={`${g.label}${g.blocking ? "" : " (info)"}`}
              detail={g.detail}
            />
          ))}
        </div>
        <PublishButton slug={beat.slug} publicSlug={beat.publicSlug} title={beat.title} preflight={preflight} />
      </Section>
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────

function BeatSwitcher({ beats, currentSlug }: { beats: BeatRecord[]; currentSlug: string }) {
  return (
    <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #1f2937", paddingBottom: "12px" }}>
      <Link
        href="/active-beat"
        style={{
          padding: "8px 14px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "var(--color-text-dim)",
          textDecoration: "none",
          border: "1px solid #374151",
          background: "transparent",
        }}
      >
        ← All beats
      </Link>
      {beats.map((b) => (
        <Link
          key={b.slug}
          href={`/active-beat/${b.slug}`}
          style={{
            padding: "8px 14px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: b.slug === currentSlug ? "#fbbf24" : "var(--color-text)",
            textDecoration: "none",
            border: `1px solid ${b.slug === currentSlug ? "#fbbf24" : "#374151"}`,
            background: b.slug === currentSlug ? "rgba(251, 191, 36, 0.1)" : "transparent",
          }}
        >
          {b.title.length > 28 ? b.title.slice(0, 28) + "..." : b.title}
        </Link>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div style={{ borderBottom: "2px solid var(--color-text)", paddingBottom: "8px", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--color-text)", margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function ArtifactCard({
  label,
  sub,
  href,
  external,
}: {
  label: string
  sub: string
  href: string
  external?: boolean
}) {
  const Comp = external ? "a" : (Link as React.ElementType)
  const props = external ? { href, target: "_blank", rel: "noopener noreferrer" } : { href }
  return (
    <Comp
      {...props}
      style={{
        display: "block",
        padding: "12px 16px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "4px",
        textDecoration: "none",
        color: "var(--color-text)",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
        {label} {external ? "↗" : "→"}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--color-text-dim)",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.5px",
          wordBreak: "break-all",
        }}
      >
        {sub}
      </div>
    </Comp>
  )
}

function RebuttalCard({ index, rebuttal }: { index: number; rebuttal: { counter_argument: string; why_it_lands: string; response: string } }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #374151",
        borderLeft: "3px solid #e63946",
        display: "grid",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "11px",
            fontWeight: 700,
            color: "#e63946",
            letterSpacing: "1.5px",
            flexShrink: 0,
            paddingTop: "2px",
          }}
        >
          #{index} COUNTER
        </span>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", lineHeight: 1.4 }}>
          {rebuttal.counter_argument}
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "start", paddingLeft: "12px" }}>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--color-text-dim)",
            letterSpacing: "1.5px",
            flexShrink: 0,
            paddingTop: "2px",
            minWidth: "80px",
          }}
        >
          WHY IT LANDS
        </span>
        <div style={{ fontSize: "12px", color: "var(--color-text-dim)", lineHeight: 1.5, fontStyle: "italic" }}>
          {rebuttal.why_it_lands}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "start",
          padding: "12px",
          background: "rgba(22, 163, 74, 0.08)",
          borderLeft: "2px solid #16a34a",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "10px",
            fontWeight: 700,
            color: "#16a34a",
            letterSpacing: "1.5px",
            flexShrink: 0,
            paddingTop: "2px",
            minWidth: "80px",
          }}
        >
          RESPONSE
        </span>
        <div style={{ fontSize: "13px", color: "var(--color-text)", lineHeight: 1.55 }}>
          {rebuttal.response}
        </div>
      </div>
    </div>
  )
}

function ChecklistRow({
  status,
  label,
  detail,
}: {
  status: "done" | "pending" | "blocked"
  label: string
  detail: string
}) {
  const checkbox = status === "done" ? "☑" : status === "blocked" ? "▣" : "☐"
  const color = status === "done" ? "#16a34a" : status === "blocked" ? "#e63946" : "#fbbf24"
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "4px",
        display: "flex",
        gap: "12px",
        alignItems: "start",
      }}
    >
      <span style={{ fontSize: "16px", color, flexShrink: 0, fontFamily: "var(--font-mono, monospace)" }}>{checkbox}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>{detail}</div>
      </div>
    </div>
  )
}

function readDossierFrontmatter(beat: BeatRecord): { lastUpdated: string | null; status: string | null; bytes: number } {
  try {
    const p = path.join(process.cwd(), "..", beat.dossierPath)
    const text = fs.readFileSync(p, "utf-8")
    const fm = text.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) return { lastUpdated: null, status: null, bytes: text.length }
    const lastUpdated = fm[1].match(/last-updated:\s*(\S+)/)?.[1] || null
    const status = fm[1].match(/^status:\s*(\S+)/m)?.[1] || null
    return { lastUpdated, status, bytes: text.length }
  } catch {
    return { lastUpdated: null, status: null, bytes: 0 }
  }
}

const th: React.CSSProperties = {
  padding: "8px 0",
  textAlign: "left",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: "var(--color-text-dim)",
  textTransform: "uppercase",
}

const td: React.CSSProperties = {
  padding: "8px 12px 8px 0",
  fontSize: "12px",
  color: "var(--color-text)",
  verticalAlign: "top",
}
