import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { CardsTabNav } from "@/components/CardsTabNav"
import { BEATS, MEMES, memesByBeat } from "@/lib/memes-catalog"

/**
 * Memes top-level · /memes
 *
 * Lists every beat that has a meme kit, with a count of memes per beat
 * and a link to the per-beat sub-page. Plus a Share Queue link for the
 * cross-beat queue view.
 *
 * Per the 2026-05-02 IA reorganization, this lives under EDITORIAL in
 * the sidebar.
 */

export default function MemesPage() {
  const totalMemes = MEMES.length

  return (
    <div>
      <PageHeader
        title="Cards · By Beat"
        whatThisDoes="Curated per-beat meme kits with share-workflow tooling. Click into a beat to see its memes with copy-caption, X/Bluesky compose intents, and send-to-publish-queue actions. The share queue surfaces drafted, approved, and posted memes across all beats. For ad-hoc cards from any profile in the vault, switch to By Profile above."
        rightNow={`${totalMemes} memes across ${BEATS.length} beats. Source HTML: prototype/memes-may-1.html.`}
        action="Click a beat to open its meme grid. Or click Share Queue to review queued / approved / posted items across all beats."
      />

      <CardsTabNav active="beat" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {BEATS.map((beat) => {
          const memes = memesByBeat(beat.slug)
          if (memes.length === 0) return null
          return (
            <Link
              key={beat.slug}
              href={`/memes/${beat.slug}`}
              style={{
                display: "block",
                padding: "20px 24px",
                background: "rgba(31, 41, 55, 0.4)",
                border: "1px solid #1f2937",
                borderRadius: "8px",
                textDecoration: "none",
                color: "var(--color-text)",
                transition: "border-color 0.15s ease",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  color: beat.status === "published" ? "#16a34a" : "#fbbf24",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                {beat.status === "published" ? "Live" : "Unpublished"} · {memes.length} memes
              </div>
              <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "8px" }}>{beat.title}</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>{beat.description}</div>
            </Link>
          )
        })}

        <Link
          href="/memes/share-queue"
          style={{
            display: "block",
            padding: "20px 24px",
            background: "rgba(251, 191, 36, 0.08)",
            border: "1px solid rgba(251, 191, 36, 0.4)",
            borderRadius: "8px",
            textDecoration: "none",
            color: "var(--color-text)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "2px",
              color: "#fbbf24",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            Cross-beat queue
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "8px" }}>Share Queue ↗</div>
          <div style={{ fontSize: "12px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>
            Drafted / approved / posted memes across all beats. The approval queue is the editorial review surface before
            anything goes to social. Backing store: data/meme-publish-queue.jsonl.
          </div>
        </Link>
      </div>

      <div
        style={{
          padding: "16px",
          background: "rgba(31, 41, 55, 0.3)",
          border: "1px solid #1f2937",
          fontSize: "11px",
          color: "var(--color-text-dim)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--color-text)" }}>Share workflow.</strong> Each meme card has copy-caption-to-
        clipboard, open-in-X-compose, and open-in-Bluesky-compose intent links plus a send-to-publish-queue button. The
        compose intents pre-fill the caption; image attachment is manual (X and Bluesky intent URLs do not support image
        upload). Recommended flow: send to queue → review on Share Queue → click Approve → click Open in X compose →
        upload the meme image (screenshot from the prototype URL anchor) → hit Send → mark posted with the resulting
        post URL.
      </div>
    </div>
  )
}
