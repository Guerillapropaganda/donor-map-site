import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { simplifySlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { isConstructionMode } from "../constructionMode"

// ─── Helpers ────────────────────────────────────────────────────────
function findPage(allFiles: QuartzPluginData[], searchTerm: string): QuartzPluginData | undefined {
  const lower = searchTerm.toLowerCase()
  return allFiles.find((f) => {
    const slug = (f.slug ?? "").toLowerCase()
    return slug.endsWith(lower) || slug === lower
  })
}

function fmtMoney(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(1) + "T"
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B"
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K"
  return "$" + n.toString()
}

// ─── Types ──────────────────────────────────────────────────────────
interface HookCard {
  label: string
  headline: string
  body: string
  stat: string
  statLabel: string
  color: "green" | "red" | "amber" | "steel"
  links: { text: string; search: string }[]
}

interface EntryPoint {
  icon: string
  title: string
  count?: number
  desc: string
  slugPrefix: string
}

// ─── Curated hook cards ─────────────────────────────────────────────
const hookCards: HookCard[] = [
  {
    label: "IT TRACKS",
    headline: "Same donors. Both parties. Same outcomes.",
    body: "AIPAC funds Pelosi ($3.2M) AND Cruz ($1.9M). Goldman Sachs funds Schumer AND McConnell. PhRMA funds both sides of drug pricing. Different jerseys, identical policy outcomes.",
    stat: "97-3",
    statLabel: "Senate vote on Israel aid — bought bipartisan",
    color: "steel",
    links: [
      { text: "The Both-Sides Illusion", search: "cross-politician-contradiction-map---the-both-sides-illusion-with-receipts" },
      { text: "Goldman Sachs Funds Both Sides", search: "contradiction-01---goldman-sachs-funds-both-sides-of-financial-regulation" },
    ],
  },
  {
    label: "IT STORES",
    headline: "Every dollar traced. Every policy outcome logged.",
    body: "Koch Network: $2.9M donated to McConnell. Return: $1.9 trillion in tax cuts. That is a 655,172x ROI. PhRMA: $2.1M to kill drug pricing negotiation worth $450 billion. Every dollar has a return.",
    stat: "655,172x",
    statLabel: "Koch Network return on McConnell investment",
    color: "green",
    links: [
      { text: "Drug Pricing Theater", search: "contradiction-03---phrma-kills-drug-negotiation-from-both-sides" },
      { text: "Manchin-Sinema Donor Veto", search: "the-manchin-sinema-donor-class-veto---how-two-senators-killed-a-majority" },
    ],
  },
  {
    label: "IT INVESTIGATES",
    headline: "Donors. Lobbyists. Think tanks. Media. One pipeline.",
    body: "The same money that funds the politicians funds the think tanks that write the policy, the lobbyists who deliver the ask, and the media personalities who manufacture public consent.",
    stat: "1,400+",
    statLabel: "profiles mapping every node in the pipeline",
    color: "amber",
    links: [
      { text: "The Federalist Society", search: "federalist-society" },
      { text: "Leonard Leo", search: "leonard-leo" },
    ],
  },
]

// ─── Featured investigations ────────────────────────────────────────
interface FeaturedInvestigation {
  title: string
  hook: string
  stat: string
  statLabel: string
  search: string
}

const featuredInvestigations: FeaturedInvestigation[] = [
  {
    title: "Defense Contractor 450,000% ROI",
    hook: "Lockheed Martin, Raytheon, and Boeing spend millions funding both parties. In return, they receive hundreds of billions in contracts — a return on investment that makes Wall Street look like a savings account. The defense budget passes with bipartisan supermajorities every single year.",
    stat: "450,000%",
    statLabel: "defense contractor return on political investment",
    search: "defense-contractor-450000-percent-roi",
  },
  {
    title: "The Nuestra America Convoy",
    hook: "650 people from 33 nations delivered 20+ tons of humanitarian aid to Cuba. Within 72 hours, the donor class that profits from the embargo launched a coordinated media-political attack to punish them. The same politicians who receive anti-Cuba lobby money led the charge.",
    stat: "650+",
    statLabel: "participants from 33 nations",
    search: "the-nuestra-america-convoy---how-the-donor-class-attacked-a-humanitarian-mission",
  },
]

// ─── Component ──────────────────────────────────────────────────────
const LandingPage: QuartzComponent = ({
  cfg,
  allFiles,
  displayClass,
}: QuartzComponentProps) => {
  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  function absHref(targetSlug: string): string {
    return `${basePath}/${targetSlug}`
  }

  function getHref(search: string): string {
    const page = findPage(allFiles, search)
    if (page?.slug) return absHref(simplifySlug(page.slug))
    return "#"
  }

  // Dynamic counts — only count actual entity profiles, not sub-notes/stories/events
  const ENTITY_TYPES = [
    "politician",
    "donor",
    "corporation",
    "pac",
    "think-tank",
    "lobbying-firm",
    "media-profile",
  ]
  const isEntityProfile = (f: typeof allFiles[0]) =>
    ENTITY_TYPES.includes(String(f.frontmatter?.type ?? ""))

  const totalProfiles = allFiles.filter(isEntityProfile).length
  const politicianCount = allFiles.filter((f) =>
    (f.slug ?? "").toLowerCase().startsWith("politicians/"),
  ).length
  const donorCount = allFiles.filter((f) =>
    (f.slug ?? "").toLowerCase().startsWith("donors--and--power-networks/"),
  ).length
  const storyCount = allFiles.filter((f) =>
    (f.slug ?? "").toLowerCase().startsWith("stories/"),
  ).length

  // Entry points with dynamic counts
  const entryPoints: EntryPoint[] = [
    {
      icon: "POLITICIANS",
      title: "Politicians",
      count: politicianCount,
      desc: "Every profile analyzed through one lens: who funds them, what the funders want, and what they got.",
      slugPrefix: "Politicians",
    },
    {
      icon: "DONORS",
      title: "Donors & Power Networks",
      count: donorCount,
      desc: "Mega-donors, PACs, dark money networks, and the corporations that fund both parties.",
      slugPrefix: "Donors--and--Power-Networks",
    },
    {
      icon: "STORIES",
      title: "Investigations",
      count: storyCount,
      desc: "Analytical deep dives tracing money across party lines. The patterns the database reveals.",
      slugPrefix: "Stories",
    },
    {
      icon: "K STREET",
      title: "Lobbyists & Think Tanks",
      desc: "The intermediaries who deliver the ask and the organizations that manufacture the talking points.",
      slugPrefix: "Lobbying-Firms--and--K-Street",
    },
  ]

  // Count verified entity profiles (same filter as totalProfiles)
  const verifiedCount = allFiles.filter((f) => {
    if (!isEntityProfile(f)) return false
    const r = String(f.frontmatter?.["content-readiness"] ?? "")
    return r === "ready" || r === "publication-ready"
  }).length

  // ─── Construction mode ──────────────────────────────────────────────
  if (isConstructionMode) {
    return (
      <div class={classNames(displayClass, "lp-landing lp-construction")}>
        <div class="construct">
          {/* Top bar */}
          <div class="construct-topbar">
            <span class="construct-logo">The Donor Map<span class="construct-dollar">$</span></span>
            <span class="construct-status-pill">Building</span>
          </div>

          {/* Hero */}
          <div class="construct-hero">
            <div class="construct-meta">OPEN-SOURCE DONOR INTELLIGENCE / {totalProfiles.toLocaleString()} NODES AND COUNTING</div>
            <h1 class="construct-title">
              Follow the<br />
              <span class="construct-highlight">Money.</span>
            </h1>
            <p class="construct-desc">
              A sourced, navigable database tracking how money controls American politics.
              Every profile starts with one question:{" "}
              <strong>who funds this person, and what did the funders get in return?</strong>
            </p>
          </div>

          {/* Stats */}
          <div class="construct-stats">
            <div class="construct-stat">
              <span class="construct-stat-num">{totalProfiles.toLocaleString()}</span>
              <span class="construct-stat-label">Profiles</span>
            </div>
            <div class="construct-stat-divider" />
            <div class="construct-stat">
              <span class="construct-stat-num">{politicianCount.toLocaleString()}</span>
              <span class="construct-stat-label">Politicians</span>
            </div>
            <div class="construct-stat-divider" />
            <div class="construct-stat">
              <span class="construct-stat-num construct-stat-accent">{donorCount.toLocaleString()}</span>
              <span class="construct-stat-label">Donors Tracked</span>
            </div>
            <div class="construct-stat-divider" />
            <div class="construct-stat">
              <span class="construct-stat-num construct-stat-accent">{verifiedCount.toLocaleString()}</span>
              <span class="construct-stat-label">Verified</span>
            </div>
          </div>

          {/* Teaser */}
          <div class="construct-teaser">
            <div class="construct-teaser-tag">PREVIEW</div>
            <div class="construct-teaser-content">
              <div class="construct-teaser-stat">655,172x</div>
              <div class="construct-teaser-context">
                Koch Network donated <strong>$2.9M</strong> to McConnell.
                Return: <strong>$1.9 trillion</strong> in tax cuts.
                That's the highest ROI we've found. There are hundreds more.
              </div>
            </div>
          </div>

          {/* Launch */}
          <div class="construct-launch">
            <div class="construct-launch-text">Launching Soon</div>
            <div class="construct-contact">
              guerillapropaganda@proton.me
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div class={classNames(displayClass, "lp-landing")}>
      {/* Mobile-only desktop preference notice */}
      <div class="lp-mobile-notice" aria-label="Viewing tip">
        <span class="lp-mobile-notice-icon" aria-hidden="true">⌨</span>
        <span class="lp-mobile-notice-text">
          <strong>Desktop is preferred.</strong> Mobile layout is still being polished —
          you'll see the full data tables, sidebars, and interactive views best on a larger screen.
        </span>
      </div>

      {/* ═══ LAYER 1: ORIENTATION — What is this, can I trust it? ═══ */}
      <section class="lp-hero">
        <div class="lp-hero-badge">DONOR INFLUENCE TRACKING SYSTEM</div>
        <h1 class="lp-hero-title">Follow the Money.</h1>
        <p class="lp-hero-sub">
          A sourced, navigable database tracking how money controls American politics.
          Every profile starts with one question: <strong>who funds this person, and what
          did the funders get in return?</strong>
        </p>
        <div class="lp-hero-stats">
          <div class="lp-stat">
            <span class="lp-stat-number">{totalProfiles.toLocaleString()}</span>
            <span class="lp-stat-label">Profiles</span>
          </div>
          <div class="lp-stat-divider" />
          <div class="lp-stat">
            <span class="lp-stat-number">{verifiedCount.toLocaleString()}</span>
            <span class="lp-stat-label">Verified</span>
          </div>
          <div class="lp-stat-divider" />
          <div class="lp-stat">
            <span class="lp-stat-number green">{donorCount.toLocaleString()}</span>
            <span class="lp-stat-label">Donors Tracked</span>
          </div>
          <div class="lp-stat-divider" />
          <div class="lp-stat">
            <span class="lp-stat-number amber">655,172x</span>
            <span class="lp-stat-label">Highest ROI Exposed</span>
          </div>
        </div>
        <div class="lp-hero-cta">
          <a href={getHref("cross-politician-contradiction-map---the-both-sides-illusion-with-receipts")} class="lp-cta-primary">
            Start Here
          </a>
          <a href={absHref("Politicians")} class="lp-cta-secondary">
            Explore the Database
          </a>
        </div>
      </section>

      {/* ═══ LAYER 2: PROOF — Show the system works ═══ */}

      {/* How the system works: It tracks → It stores → It investigates */}
      <section class="lp-hooks">
        <div class="lp-section-label">HOW THE SYSTEM WORKS</div>
        <div class="lp-hooks-grid">
          {hookCards.map((card) => (
            <div class={`lp-hook-card lp-hook-${card.color}`}>
              <div class="lp-hook-label">{card.label}</div>
              <h3 class="lp-hook-headline">{card.headline}</h3>
              <p class="lp-hook-body">{card.body}</p>
              <div class="lp-hook-stat-row">
                <span class="lp-hook-stat">{card.stat}</span>
                <span class="lp-hook-stat-label">{card.statLabel}</span>
              </div>
              <div class="lp-hook-links">
                {card.links.map((link) => (
                  <a href={getHref(link.search)} class="lp-hook-link">
                    {link.text} →
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* One featured investigation as proof of capability */}
      <section class="lp-featured">
        <div class="lp-section-label">FEATURED INVESTIGATION</div>
        <div class="lp-featured-grid">
          <div class="lp-featured-card">
            <div class="lp-featured-content">
              <h3 class="lp-featured-title">{featuredInvestigations[0].title}</h3>
              <p class="lp-featured-hook">{featuredInvestigations[0].hook}</p>
              <a href={getHref(featuredInvestigations[0].search)} class="lp-featured-link">
                Read the full investigation →
              </a>
            </div>
            <div class="lp-featured-stat">
              <span class="lp-featured-stat-number">{featuredInvestigations[0].stat}</span>
              <span class="lp-featured-stat-label">{featuredInvestigations[0].statLabel}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LAYER 3: EXPLORATION — Browse the database ═══ */}
      <section class="lp-explore">
        <div class="lp-section-label">EXPLORE THE DATABASE</div>
        <div class="lp-explore-grid">
          {entryPoints.map((ep) => (
            <a href={absHref(ep.slugPrefix)} class="lp-explore-card">
              <div class="lp-explore-icon">{ep.icon}</div>
              <div class="lp-explore-info">
                <div class="lp-explore-title">
                  {ep.title}
                  {ep.count !== undefined && ep.count > 0 && (
                    <span class="lp-explore-count">{ep.count.toLocaleString()}</span>
                  )}
                </div>
                <div class="lp-explore-desc">{ep.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Quick paths for different user types */}
      <section class="lp-start">
        <div class="lp-section-label">QUICK PATHS</div>
        <div class="lp-start-grid">
          <a href={getHref("cross-politician-contradiction-map---the-both-sides-illusion-with-receipts")} class="lp-start-card lp-start-primary">
            <div class="lp-start-card-title">The Biggest Findings</div>
            <div class="lp-start-card-desc">
              The most damning contradictions. Same donors, both parties, same outcomes.
            </div>
          </a>
          <a href={absHref("Stories/Published/Contradiction-Deep-Dives")} class="lp-start-card">
            <div class="lp-start-card-title">Browse Contradictions</div>
            <div class="lp-start-card-desc">
              21 deep dives into how the same money controls both parties.
            </div>
          </a>
          <a href={absHref("Interactive")} class="lp-start-card">
            <div class="lp-start-card-title">Interactive Tools</div>
            <div class="lp-start-card-desc">
              Power Rankings, Who Funds Your Rep, Issue Explorer, and more.
            </div>
          </a>
        </div>
      </section>

      {/* ── Transparency notice ── */}
      <section class="lp-beta">
        <p>
          <strong>Transparent by design.</strong> Every profile displays its evidence status, source count,
          and verification date. This database is in active development — some profiles are deeper than others.
          That incompleteness is visible, not hidden.
          Report issues to <strong>guerillapropaganda@proton.me</strong>.
        </p>
      </section>
    </div>
  )
}

// Styles are in quartz/styles/custom.scss (component CSS doesn't propagate through ConditionalRender)

export default (() => LandingPage) satisfies QuartzComponentConstructor
