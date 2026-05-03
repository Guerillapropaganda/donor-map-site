import fs from "node:fs"
import path from "node:path"
import { PageHeader } from "@/components/PageHeader"

/**
 * Site Preview — the launcher.
 *
 * Lists every URL the project has, grouped by where it lives, so David
 * can click any of them to open in a new tab. Fixes the accessibility
 * problem of "I built a thing but it's at localhost:8096/three-becerras
 * which doesn't appear in the live nav and I can't remember the URL."
 *
 * Three layers:
 *   1. LIVE   — what's actually routed publicly via data/public-routes.json
 *   2. QUARTZ — built by Quartz dev server at :8080, accessible if running
 *               (includes all draft beat content rendered through Quartz)
 *   3. PROTO  — handcrafted prototype HTML at :8096 via prototype/server.cjs
 *               (homepage prototype, beat pages, meme kit, charts)
 *
 * Each row has a status badge ("LIVE", "DRAFT", "PROTOTYPE"), a one-line
 * description of what's on the page, and an Open button that opens the
 * URL in a new tab. If the relevant local server isn't running the
 * browser shows connection-refused — there's a hint banner at the top
 * reminding David which servers to start.
 *
 * This page is a server component: it reads public-routes.json at
 * request time so the LIVE list updates without a code change. The
 * Quartz and prototype lists are hand-curated because those files don't
 * carry frontmatter we can scan.
 */

interface PageEntry {
  title: string
  url: string
  description: string
  status: "live" | "draft" | "prototype" | "draft-isolated"
  category: "homepage" | "beat" | "meme" | "chart" | "profile" | "system"
}

// ─── LIVE ROUTES (read from data/public-routes.json) ────────────────────
//
// public-routes.json holds the slugs Quartz allows on the public site.
// Anything in this list renders at https://thedonormap.org/<slug>.
// Currently locked to ["index"] (the construction splash) by design.

function readPublicRoutes(): string[] {
  try {
    const p = path.join(process.cwd(), "..", "data", "public-routes.json")
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  } catch {
    return []
  }
}

// ─── PROTOTYPE PAGES (hand-curated, served at localhost:8096) ────────────
//
// These map 1:1 to the routes in prototype/server.cjs. When you ship a
// new prototype HTML file, add it both to that server's switch and to
// this list.

const PROTOTYPE_PAGES: PageEntry[] = [
  {
    title: "Homepage",
    url: "http://localhost:8096/home",
    description: "The beat-style homepage prototype. Brand, tagline, featured beat card, more-investigations grid. Click here to start a normal user session through the site.",
    status: "prototype",
    category: "homepage",
  },
  {
    title: "Class Traitor (Steyer)",
    url: "http://localhost:8096/class-traitor",
    description: "First beat. $31M to bury Tom Steyer. Includes the polling layer (DBR three-contract conflict, Gudelunas IE-funded outliers). Updated 2026-05-02.",
    status: "prototype",
    category: "beat",
  },
  {
    title: "Three Becerras (DRAFT)",
    url: "http://localhost:8096/three-becerras",
    description: "Second beat. 24 years of single-payer cosponsorships, three different 2026 messages, the donor list whose interests the softest message serves. Revised 2026-05-02 after forensic audit. Pending URL pass before public exposure.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Becerra 2026 donor list (DRAFT)",
    url: "http://localhost:8096/donors-becerra-2026",
    description: "Companion to Three Becerras. Top fifteen donors plus the six healthcare-industry max donors with class tags and HHS-policy hooks. Lets the reader audit whether the healthcare-industry concentration on the main beat is selected or representative.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Share cards · CA Gov 2026 beats (2026-05-03)",
    url: "http://localhost:8096/share-cards-2026-05-03",
    description: "Three 1080×1080 social-share cards, one per live beat (Three Becerras / Not the Bad Guy / Class Traitor). Each card has a Copy as PNG button — click, paste into Facebook. For Sunday-evening soft-launch FB-group posting.",
    status: "live",
    category: "meme",
  },
  {
    title: "Bianco · The Sheriff Who Seized the Ballots (DRAFT)",
    url: "http://localhost:8096/bianco-ballots",
    description: "Riverside County Sheriff Chad Bianco took 650,000 ballots from the 2025 Prop 50 referendum on a warrant from a judge he had endorsed. Donor-jurisdiction conflicts (Highland Fairview, Mediwaste, RJ Noble) plus $132K law-enforcement PAC stack plus 2014 Oath Keepers prior. Built 2026-05-02. Pending URL pass before public exposure.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Villaraigosa · The Pledge He Broke (DRAFT)",
    url: "http://localhost:8096/villaraigosa-pledge",
    description: "Signed a 2018 pledge not to take fossil-fuel money. In 2026 he is the principal Democrat beneficiary of oil-and-gas donations: $307K combined from CRC, Chevron, Marathon, Berry. Plus Mercury Public Affairs (Hungary, Qatar, Turkey clients) and the Reed-Hastings-dropped-him-for-Mahan thread. Built 2026-05-02. Pending URL pass before public exposure.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Bearstar Octopus (DRAFT)",
    url: "http://localhost:8096/bearstar-octopus",
    description: "One shop. Three IEs in one primary. Pro-Swalwell, anti-Steyer, pro-Becerra. Polaris Campaigns took $13.78M from the anti-Steyer side across 5 verified Cal-Access EXPN_CD payments. Williamson federal indictment context. The protagonist is the consulting firm. Built 2026-05-02. Pending URL pass before public exposure.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Mahan · $0 from voters, $5.49M from Silicon Valley (DRAFT)",
    url: "http://localhost:8096/mahan",
    description: "Mahan's direct candidate committee shows zero 2026-cycle voter contributions. The supporting IE PAC is funded by Moritz ($2M), Hastings ($1M), Seibel ($1M), Collison ($990K), Larsen ($500K). The donor base is the candidate. Built 2026-05-02. Pending Perplexity round on San Jose mayoralty record + URL pass before public exposure.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Cop-Coddler · Becerra's First Amendment record (DRAFT)",
    url: "http://localhost:8096/cop-coddler",
    description: "As California AG, Xavier Becerra refused SB 1421 misconduct records on his own DOJ officers. Sued by First Amendment Coalition + KQED. Threatened two Berkeley journalists with criminal prosecution over a 12,000-name convicted-cop list. SJ Mercury News editorial board called him 'the state's top coddler of bad cops.' Built 2026-05-02. Pending Perplexity round on 2026 police-union categorical totals + URL pass before public exposure.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "About",
    url: "http://localhost:8096/about",
    description: "About page curated from the original 'Behind the Map' content into beat format. Why this exists, the class-analysis lens, how the site works, the standards it holds itself to. Linked from the homepage nav and the beat-page nav.",
    status: "prototype",
    category: "homepage",
  },
  {
    title: "Meme Kit · May 1",
    url: "http://localhost:8096/memes-may-1",
    description: "10 memes across 5 stories. 1080×1080 cards built for Bluesky / X / Instagram. Story 5 added 2026-05-02 with the Becerra bait-and-switch reveal.",
    status: "prototype",
    category: "meme",
  },
  {
    title: "Charts Prototype",
    url: "http://localhost:8096/charts",
    description: "4 reusable visualization components: DonorClassPie, DonorStripe, VotingDivergenceSparkline, MoneyFlowSankey. HTML/SVG prototype shape; needs porting to Quartz components.",
    status: "prototype",
    category: "chart",
  },
  {
    title: "Landing v3 (default fallback)",
    url: "http://localhost:8096/",
    description: "Whatever the prototype server falls back to when no route matches. Currently landing-v3.html.",
    status: "prototype",
    category: "homepage",
  },
]

// ─── QUARTZ-BUILT PAGES (served at localhost:8080 when dev server runs) ──
//
// Quartz builds every markdown file in content/ into a static page at a
// matching slug. These pages are accessible directly via URL when Quartz
// dev server is up, even when public-routes.json doesn't include them on
// the live site. Use this section to preview Quartz-built content (the
// existing LandingPage component, individual profiles, the thesis pages
// from ADR-0024 Phase 3, etc.) without flipping public-routes.

const QUARTZ_PAGES: PageEntry[] = [
  {
    title: "Quartz Homepage (LandingPage component)",
    url: "http://localhost:8080/",
    description: "The current Quartz-rendered homepage. This is what's live on thedonormap.org when public-routes.json includes 'index'.",
    status: "live",
    category: "homepage",
  },
  {
    title: "Thesis · Index",
    url: "http://localhost:8080/thesis/",
    description: "Thesis-query landing page. ADR-0024 Phase 3 deliverable. Both-sides funders, influence maps, donor contradictions across the corpus.",
    status: "draft",
    category: "system",
  },
  {
    title: "Thesis · Both-Sides Funders",
    url: "http://localhost:8080/thesis/both-sides",
    description: "Donors who fund opposing sides of the same race. Computed by influenceMap query.",
    status: "draft",
    category: "system",
  },
  {
    title: "Thesis · Influence Map · AOC",
    url: "http://localhost:8080/thesis/influence/aoc",
    description: "Capital-cluster breakdown of who funds AOC. Reference implementation of the per-politician influence-map page.",
    status: "draft",
    category: "system",
  },
  {
    title: "Thesis · Influence Map · McConnell",
    url: "http://localhost:8080/thesis/influence/mitch-mcconnell",
    description: "13 capital clusters; dominant is dark-money-vehicle ($19.92M from 44 donors). A useful contrast page to AOC.",
    status: "draft",
    category: "system",
  },
  {
    title: "Sample Profile · McConnell",
    url: "http://localhost:8080/Politicians/Republicans/Senate/Mitch-McConnell/_Mitch-McConnell-Master-Profile",
    description: "Individual master profile rendered through Quartz. 12 Money sections + 5 Key Votes sections in sidebar. Title-duplicate cosmetic issue fixed 2026-04-30.",
    status: "draft",
    category: "profile",
  },
]

// ─── LIVE INTERNET (https://thedonormap.org/<slug>) ──────────────────────
//
// Built dynamically from public-routes.json so this list updates the
// instant David flips a route public.

function buildLiveEntries(routes: string[]): PageEntry[] {
  return routes.map((slug) => {
    if (slug === "index") {
      return {
        title: "thedonormap.org (construction splash)",
        url: "https://thedonormap.org/",
        description:
          "The currently-public site. Locked to the construction splash by design. public-routes.json gates everything else.",
        status: "live",
        category: "homepage",
      }
    }
    return {
      title: `thedonormap.org/${slug}`,
      url: `https://thedonormap.org/${slug}`,
      description: `Live on the public site. Slug "${slug}" present in data/public-routes.json.`,
      status: "live",
      category: "system",
    }
  })
}

// ─── STATUS BADGE STYLING ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: PageEntry["status"] }) {
  const map: Record<PageEntry["status"], { bg: string; fg: string; label: string }> = {
    live: { bg: "#16a34a", fg: "#ffffff", label: "LIVE" },
    draft: { bg: "#737373", fg: "#ffffff", label: "DRAFT" },
    prototype: { bg: "#fbbf24", fg: "#0a0a0a", label: "PROTOTYPE" },
    "draft-isolated": { bg: "#e63946", fg: "#ffffff", label: "DRAFT · UNLINKED" },
  }
  const s = map[status]
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "1.5px",
        padding: "3px 8px",
        borderRadius: "0",
        display: "inline-block",
      }}
    >
      {s.label}
    </span>
  )
}

function PageRow({ entry }: { entry: PageEntry }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "16px",
        alignItems: "start",
        padding: "16px 0",
        borderBottom: "1px solid #1f2937",
      }}
    >
      <div style={{ paddingTop: "2px", minWidth: "120px" }}>
        <StatusBadge status={entry.status} />
      </div>
      <div>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--color-text)",
            fontWeight: 700,
            fontSize: "14px",
            marginBottom: "4px",
            display: "block",
            textDecoration: "none",
            borderBottom: "1px solid transparent",
            transition: "border-color 0.15s ease",
          }}
          className="hover:underline"
        >
          {entry.title}
        </a>
        <div style={{ color: "var(--color-text-dim)", fontSize: "12px", lineHeight: 1.5, marginBottom: "6px" }}>
          {entry.description}
        </div>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--color-steel)",
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
            wordBreak: "break-all",
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            textUnderlineOffset: "2px",
          }}
        >
          {entry.url}
        </a>
      </div>
      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: "#1f2937",
          color: "var(--color-text)",
          padding: "8px 16px",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "1px",
          textDecoration: "none",
          border: "1px solid #374151",
          height: "fit-content",
          whiteSpace: "nowrap",
        }}
      >
        Open ↗
      </a>
    </div>
  )
}

function Section({ title, subtitle, hint, entries }: { title: string; subtitle: string; hint?: string; entries: PageEntry[] }) {
  return (
    <section style={{ marginBottom: "40px" }}>
      <div style={{ borderBottom: "2px solid var(--color-text)", paddingBottom: "8px", marginBottom: "12px" }}>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        <div style={{ fontSize: "12px", color: "var(--color-text-dim)", marginTop: "4px" }}>{subtitle}</div>
      </div>
      {hint && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-text-dim)",
            background: "rgba(31, 41, 55, 0.4)",
            border: "1px solid #1f2937",
            padding: "8px 12px",
            marginBottom: "8px",
          }}
        >
          {hint}
        </div>
      )}
      {entries.length === 0 ? (
        <div style={{ fontSize: "13px", color: "var(--color-text-dim)", padding: "16px 0", fontStyle: "italic" }}>
          No entries.
        </div>
      ) : (
        entries.map((e) => <PageRow key={e.url} entry={e} />)
      )}
    </section>
  )
}

export default function SitePreviewPage() {
  const routes = readPublicRoutes()
  const liveEntries = buildLiveEntries(routes)

  return (
    <div>
      <PageHeader
        title="Site Preview"
        whatThisDoes="Launcher for every URL in the project. Live site, Quartz dev build, prototype layer, and isolated drafts that aren't linked from anywhere. Click Open ↗ to open any page in a new tab."
        rightNow={`${liveEntries.length} route(s) live · ${PROTOTYPE_PAGES.length} prototype page(s) · ${QUARTZ_PAGES.length} Quartz-built page(s) listed`}
        action="Click any Open ↗ button to launch the page in a new tab. If the local server isn't running you'll get connection-refused; start the matching server first."
      />

      {/* ─── Server-running hint banner ───────────────────────────────── */}
      <div
        style={{
          background: "rgba(251, 191, 36, 0.08)",
          border: "1px solid rgba(251, 191, 36, 0.4)",
          padding: "12px 16px",
          marginBottom: "32px",
          fontSize: "12px",
          lineHeight: 1.6,
          color: "var(--color-text-dim)",
        }}
      >
        <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: "6px" }}>Server cheat sheet</div>
        <div>
          <strong style={{ color: "var(--color-text)" }}>Prototype layer (8096):</strong>{" "}
          <code style={{ color: "var(--color-steel)" }}>node prototype/server.cjs 8096</code>
        </div>
        <div>
          <strong style={{ color: "var(--color-text)" }}>Quartz dev (8080):</strong>{" "}
          <code style={{ color: "var(--color-steel)" }}>npx quartz build --serve --port 8080</code>
        </div>
        <div>
          <strong style={{ color: "var(--color-text)" }}>Live site:</strong>{" "}
          <code style={{ color: "var(--color-steel)" }}>https://thedonormap.org</code> (no local server needed; gated by data/public-routes.json)
        </div>
      </div>

      {/* ─── Section 1: Live ──────────────────────────────────────────── */}
      <Section
        title="Live website"
        subtitle="Public on thedonormap.org · gated by data/public-routes.json"
        hint={
          routes.length === 1 && routes[0] === "index"
            ? "Public-routes is locked to ['index'] (construction splash) by design. Other Quartz content is built but not linked. Flip individual slugs by editing data/public-routes.json."
            : `Currently ${routes.length} route(s) public.`
        }
        entries={liveEntries}
      />

      {/* ─── Section 2: Prototype ─────────────────────────────────────── */}
      <Section
        title="Prototype layer (localhost:8096)"
        subtitle="Beat-style site under construction · handcrafted HTML"
        hint="Start with Homepage to navigate organically through the site. The DRAFT · UNLINKED entries are not reachable by clicking through nav. Those are what this page surfaces."
        entries={PROTOTYPE_PAGES}
      />

      {/* ─── Section 3: Quartz dev ────────────────────────────────────── */}
      <Section
        title="Quartz dev build (localhost:8080)"
        subtitle="Full vault rendered through Quartz · all profiles + thesis pages + draft beat content"
        hint="Quartz builds every markdown file in content/ into a static page. These URLs work whenever the Quartz dev server is running, regardless of public-routes.json. Useful for previewing draft content as it'll appear when public-routes flips it live."
        entries={QUARTZ_PAGES}
      />

      <div
        style={{
          marginTop: "48px",
          padding: "16px",
          background: "rgba(31, 41, 55, 0.4)",
          border: "1px solid #1f2937",
          fontSize: "11px",
          color: "var(--color-text-dim)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--color-text)" }}>How to add a page to this list.</strong>{" "}
        Prototype HTML files live in <code style={{ color: "var(--color-steel)" }}>prototype/</code> and route through{" "}
        <code style={{ color: "var(--color-steel)" }}>prototype/server.cjs</code>. When you ship a new beat or meme set,
        add it to that server's switch statement and to the <code style={{ color: "var(--color-steel)" }}>PROTOTYPE_PAGES</code>{" "}
        array in this file (
        <code style={{ color: "var(--color-steel)" }}>ops/src/app/site-preview/page.tsx</code>). Quartz pages and live
        pages auto-detect: Quartz pages are listed by hand because their build paths don't carry frontmatter we can scan,
        and live pages are read at request time from <code style={{ color: "var(--color-steel)" }}>data/public-routes.json</code>.
      </div>
    </div>
  )
}
