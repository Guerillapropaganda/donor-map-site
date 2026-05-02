import { notFound } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { BEATS, getBeat, memesByBeat, type BeatSlug } from "@/lib/memes-catalog"
import { MemeCard } from "./MemeCard"

/**
 * Per-beat meme grid · /memes/[beat]
 *
 * Renders all memes tagged with the given beat slug. Each card has the
 * share-workflow actions wired up: copy caption, open in X compose,
 * open in Bluesky compose, send to publish queue.
 */

export function generateStaticParams() {
  return BEATS.map((b) => ({ beat: b.slug }))
}

interface PageProps {
  params: Promise<{ beat: string }>
}

export default async function PerBeatMemesPage({ params }: PageProps) {
  const { beat: beatSlug } = await params
  const beat = getBeat(beatSlug)
  if (!beat) notFound()

  const memes = memesByBeat(beatSlug as BeatSlug)

  return (
    <div>
      <PageHeader
        title={`Memes · ${beat.title}`}
        whatThisDoes={`${memes.length} meme${memes.length === 1 ? "" : "s"} for this beat. Each card has caption copy, X/Bluesky compose intents, and a send-to-queue action.`}
        rightNow={
          <span>
            <Link href="/memes" style={{ color: "var(--color-steel)", textDecoration: "underline" }}>
              ← All beats
            </Link>
            {" · "}
            <Link href="/memes/share-queue" style={{ color: "var(--color-steel)", textDecoration: "underline" }}>
              Share Queue
            </Link>
            {" · "}
            <a
              href={beat.prototypeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-steel)", textDecoration: "underline" }}
            >
              Beat page ↗
            </a>
          </span>
        }
        action="Send to queue, approve, then click Open in X / Open in Bluesky compose. Image attachment is manual (intent URLs do not support image upload)."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
        {memes.map((meme) => (
          <MemeCard key={meme.id} meme={meme} beatSlug={beatSlug as BeatSlug} />
        ))}
        {memes.length === 0 && (
          <div style={{ padding: "32px", color: "var(--color-text-dim)", textAlign: "center", fontStyle: "italic" }}>
            No memes tagged for this beat yet.
          </div>
        )}
      </div>
    </div>
  )
}
