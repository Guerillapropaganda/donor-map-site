import { PageHeader } from "@/components/PageHeader"

/**
 * Under-construction landing page for editorial surfaces that don't have
 * pages yet but are advertised in the sidebar so the IA shape is visible.
 *
 * Reads ?surface=<slug> from the URL and shows a tailored explanation of
 * what's coming and where it sits in the new editorial workflow.
 *
 * 2026-05-02 IA reorganization context: the ops app is being reorganized
 * around beat-style editorial work instead of vault-profile management.
 * The sidebar's EDITORIAL group surfaces a daily product workflow:
 * Dashboard, Active Beat, Beats, Memes, Charts, Site Preview. Of those,
 * Active Beat / Beats / Memes / Charts don't have implementations yet.
 * This page explains what each will be when built.
 */

interface SurfaceCopy {
  title: string
  what: string
  whatThisIs: string
  whatItReplaces: string
  builds: string
}

const SURFACES: Record<string, SurfaceCopy> = {
  "active-beat": {
    title: "Active Beat",
    what: "The single-page workspace for whichever beat is currently in active editing.",
    whatThisIs:
      "A pinned editorial dashboard showing all artifacts of the active beat: prototype URL, donor list, memes, charts, timeline, sources, audit findings, open verifications. Every item shows its status (draft / verified / pending) and a one-click action (edit / verify / publish). The active beat right now is Three Becerras.",
    whatItReplaces:
      "The old per-profile DAILY surfaces (Profile View / Editor) assumed the daily work was wiki-page editing. The new daily work is one beat at a time. Active Beat is the editorial replacement.",
    builds: "Phase 2 (next commit after the IA reorganization).",
  },
  beats: {
    title: "Beats",
    what: "List of every editorial beat the project has produced or is producing.",
    whatThisIs:
      "Each row: beat title, slug, status (draft / audited / live / archived), last-touched date, current open blockers, prototype URL, public-routes status. Click any beat to open its dedicated workspace. Distinct from Site Preview, which is the URL launcher; this is the editorial-status workspace.",
    whatItReplaces:
      "Nothing direct. New surface for the new product model.",
    builds: "Phase 2.",
  },
  memes: {
    title: "Memes",
    what: "Per-beat meme kits with share-workflow tooling.",
    whatThisIs:
      "Top-level lists every beat that has a meme kit. Sub-pages per beat (e.g., /memes/three-becerras) show the individual 1080×1080 cards with: full-size preview, copy-formatted-post-to-clipboard, open-in-X-compose intent URL, open-in-Bluesky-compose intent URL, send-to-publish-queue button, status badge. A Share Queue sub-page surfaces all queued / scheduled / posted memes across beats.",
    whatItReplaces:
      "Nothing direct. The current meme kit lives at prototype/memes-may-1.html as a single static gallery. That stays as the source HTML; this surface adds the editorial workflow on top.",
    builds: "Phase 2.",
  },
  charts: {
    title: "Charts",
    what: "Per-beat chart libraries.",
    whatThisIs:
      "Reusable visualization components with parameters tuned per beat: donor-sector concentration, six-week timeline strip, four-channel circuit diagram, poll-comparison bar chart. Each chart renders from the structured data in /data and the dossier admin notes; the workflow lets you preview, tune parameters, copy SVG/PNG for distribution, and embed in the beat HTML. Becerra-specific charts ship first.",
    whatItReplaces:
      "Nothing direct. The current charts prototype at prototype/charts.html is a generic component library; this surface is per-beat curated charts with editorial workflow.",
    builds: "Phase 3 (after Memes).",
  },
  "perplexity-drops": {
    title: "Perplexity Drops",
    what: "Inbox of incoming Perplexity research result MDs to review and apply.",
    whatThisIs:
      "Lists files in content/Admin Notes/perplexity-research/ in reverse-chronological order. Each row: title, date, related race, status (open / applied), link to full text. Quick-action: mark applied. Helps the editorial workflow by surfacing what's been researched and what still needs to land in a beat page.",
    whatItReplaces:
      "Nothing direct. Currently you read the MDs by drop-and-paste in chat; this gives them a persistent ops surface.",
    builds: "Phase 2 or 3.",
  },
  "verifications-open": {
    title: "Verifications Open",
    what: "Cross-beat list of open verifications (URL pass, primary-source pulls, F496 watch, etc.).",
    whatThisIs:
      "Each row: claim, source it depends on, lane (David / Code Claude / Perplexity), status, blocking which beat. Becomes the daily editorial backlog of what still needs to close before pages can ship to public-routes.",
    whatItReplaces:
      "The 'What this page does not claim' sections currently live inside each beat HTML; this surface aggregates them across beats so the backlog is visible at a glance.",
    builds: "Phase 2 or 3.",
  },
  "audit-findings": {
    title: "Audit Findings",
    what: "Open critiques from forensic audits to fold into beats.",
    whatThisIs:
      "Audit-pass results that haven't been applied yet. Each row: which beat, which critique class (correlation overreach / silence as positioning / comparative baseline / quote chain / etc.), severity, status (open / applied / wontfix-with-reason).",
    whatItReplaces:
      "Audit findings currently live as one-off chat exchanges and inline page commits; this surface persists them.",
    builds: "Phase 2 or 3.",
  },
  "public-routes": {
    title: "Public Routes",
    what: "Editor for data/public-routes.json plus visual status of what's live.",
    whatThisIs:
      "Read-only view of which slugs are currently public on thedonormap.org plus a flip-toggle UI gated on completion of the pre-publication checklist (URL pass, audit applied, etc.). Currently locked to ['index'] (construction splash) by design.",
    whatItReplaces:
      "Currently you edit data/public-routes.json by hand. This adds a checklist gate so we can't flip a route public until verifications close.",
    builds: "Phase 2 or 3.",
  },
}

interface PageProps {
  searchParams: Promise<{ surface?: string }>
}

export default async function UnderConstructionPage({ searchParams }: PageProps) {
  const params = await searchParams
  const surfaceKey = params.surface || ""
  const surface = SURFACES[surfaceKey]

  return (
    <div>
      <PageHeader
        title={surface ? `${surface.title} (under construction)` : "Editorial surface (under construction)"}
        whatThisDoes={
          surface
            ? surface.what
            : "This editorial surface is part of the 2026-05-02 IA reorganization. The sidebar shows where it'll live; the implementation is queued."
        }
        rightNow={surface ? `Builds: ${surface.builds}` : "Click an editorial sidebar entry to see what's coming."}
        action="The page itself is not implemented yet. Use the sidebar to navigate to surfaces that are built."
      />

      {surface && (
        <div style={{ display: "grid", gap: "16px", maxWidth: "880px" }}>
          <Card title="What this surface is">{surface.whatThisIs}</Card>
          <Card title="What it replaces">{surface.whatItReplaces}</Card>
          <Card title="Build phase">{surface.builds}</Card>
        </div>
      )}

      {!surface && (
        <div
          style={{
            padding: "32px",
            background: "rgba(31, 41, 55, 0.4)",
            border: "1px solid #1f2937",
            borderRadius: "8px",
            maxWidth: "720px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-text)", marginBottom: "12px" }}>
            The new editorial workflow
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-dim)", lineHeight: 1.6, marginBottom: "16px" }}>
            The product is now beats, not profiles. The vault is the backend, not the front door. The daily editorial
            workflow is: open the active beat, see all its artifacts (page, donor list, memes, charts, timeline, sources,
            audit findings, open verifications), edit / verify / publish each.
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-dim)", lineHeight: 1.6, marginBottom: "16px" }}>
            The sidebar reflects this in five groups. EDITORIAL is the daily product surface. RESEARCH is the cross-beat
            research backlog. PUBLISH is the distribution layer. VAULT is the old DAILY/ANALYZE/CONTENT vault tools (now
            backend research tools rather than the daily surface). SYSTEM is pipelines, audits, reference, rulebook.
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-dim)", lineHeight: 1.6 }}>
            The principle: a daily beat-pass should not require touching anything in VAULT or SYSTEM. If you find yourself
            opening Profile View or Money Trail to edit a beat, that's a sign the editorial layer is missing a tool.
          </p>
        </div>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "20px 24px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "8px",
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
          marginBottom: "8px",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "14px", color: "var(--color-text)", lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}
