import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { simplifySlug } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"

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
    label: "BOTH SIDES PAY",
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
    label: "THE ROI",
    headline: "They're not donations. They're investments.",
    body: "Koch Network: $2.9M donated to McConnell. Return: $1.9 trillion in tax cuts. That's a 655,172x ROI. PhRMA: $2.1M to kill drug pricing negotiation worth $450 billion. Every dollar has a return.",
    stat: "655,172x",
    statLabel: "Koch Network return on McConnell investment",
    color: "green",
    links: [
      { text: "Drug Pricing Theater", search: "contradiction-03---pharma-kills-drug-negotiation-from-both-sides" },
      { text: "Carried Interest Loophole", search: "the-carried-interest-loophole---30-years-of-survival" },
    ],
  },
  {
    label: "THE MACHINE",
    headline: "Donors. Lobbyists. Think tanks. Media. One pipeline.",
    body: "The same money that buys the politicians funds the think tanks that write the policy, the lobbyists who deliver the ask, and the media personalities who manufacture public consent.",
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
    title: "The Cuba Fuel Blockade",
    hook: "On March 16, 2026, Cuba's power grid collapsed. Ten million people went dark. The cause: a U.S. fuel blockade managed by Secretary of State Rubio — whose career was funded by the Fanjul sugar dynasty, the family that directly benefits from eliminating Cuban agricultural competition.",
    stat: "$2.9M",
    statLabel: "Fanjul family political spending in 2024",
    search: "operation-southern-spear-and-the-cuba-fuel-blockade",
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

  // Dynamic counts
  const totalProfiles = allFiles.length
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

  return (
    <div class={classNames(displayClass, "lp-landing")}>
      {/* ── Hero ── */}
      <section class="lp-hero">
        <div class="lp-hero-badge">OPEN SOURCE INVESTIGATIVE DATABASE</div>
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
            <span class="lp-stat-number">{politicianCount.toLocaleString()}</span>
            <span class="lp-stat-label">Politicians</span>
          </div>
          <div class="lp-stat-divider" />
          <div class="lp-stat">
            <span class="lp-stat-number green">{donorCount.toLocaleString()}</span>
            <span class="lp-stat-label">Donors & Networks</span>
          </div>
          <div class="lp-stat-divider" />
          <div class="lp-stat">
            <span class="lp-stat-number amber">$1.9T</span>
            <span class="lp-stat-label">Largest Policy ROI</span>
          </div>
        </div>
        <div class="lp-hero-cta">
          <a href={absHref("Stories/Published/Contradiction-Deep-Dives")} class="lp-cta-primary">
            See the Contradictions
          </a>
          <a href={absHref("Politicians")} class="lp-cta-secondary">
            Browse Politicians
          </a>
        </div>
      </section>

      {/* ── Hook cards ── */}
      <section class="lp-hooks">
        <div class="lp-section-label">WHY THIS EXISTS</div>
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

      {/* ── Featured investigations ── */}
      <section class="lp-featured">
        <div class="lp-section-label">FEATURED INVESTIGATIONS</div>
        <div class="lp-featured-grid">
          {featuredInvestigations.map((inv) => (
            <div class="lp-featured-card">
              <div class="lp-featured-content">
                <h3 class="lp-featured-title">{inv.title}</h3>
                <p class="lp-featured-hook">{inv.hook}</p>
                <a href={getHref(inv.search)} class="lp-featured-link">
                  Read the full investigation →
                </a>
              </div>
              <div class="lp-featured-stat">
                <span class="lp-featured-stat-number">{inv.stat}</span>
                <span class="lp-featured-stat-label">{inv.statLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Browse the database ── */}
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

      {/* ── Start here ── */}
      <section class="lp-start">
        <div class="lp-section-label">START HERE</div>
        <div class="lp-start-grid">
          <a href={getHref("follow-the-money---guided-tour")} class="lp-start-card lp-start-primary">
            <div class="lp-start-card-title">Guided Tour</div>
            <div class="lp-start-card-desc">
              Nine curated trails — Cuba blockade, Wall Street, defense, pharma, dark money, the Supreme Court, Trump Cabinet, consent machine, Israel Lobby.
            </div>
          </a>
          <a href={getHref("browse-by-pattern")} class="lp-start-card">
            <div class="lp-start-card-title">Browse by Pattern</div>
            <div class="lp-start-card-desc">
              Revolving Door, Two-Audience Problem, Donor-Class Override, Dark Money Symmetry.
            </div>
          </a>
          <a href={getHref("politicians-index")} class="lp-start-card">
            <div class="lp-start-card-title">Politicians Index</div>
            <div class="lp-start-card-desc">
              Every politician, organized by party and chamber.
            </div>
          </a>
          <a href={getHref("donors---power-networks-index")} class="lp-start-card">
            <div class="lp-start-card-title">Donors Index</div>
            <div class="lp-start-card-desc">
              Every donor, PAC, and dark money network by sector.
            </div>
          </a>
          <a href={getHref("about-the-donor-map")} class="lp-start-card">
            <div class="lp-start-card-title">About</div>
            <div class="lp-start-card-desc">
              What this project is, who built it, and why it exists.
            </div>
          </a>
          <a href={getHref("methodology")} class="lp-start-card">
            <div class="lp-start-card-title">Methodology</div>
            <div class="lp-start-card-desc">
              How profiles are built, sourced, and verified.
            </div>
          </a>
        </div>
      </section>

      {/* ── Beta notice ── */}
      <section class="lp-beta">
        <p>
          This database is in active development. The methodology is documented and open.
          Some profiles are deeper than others. If you find a broken link or missing source, report it to <strong>guerillapropaganda@proton.me</strong>.
        </p>
      </section>
    </div>
  )
}

// Styles are in quartz/styles/custom.scss (component CSS doesn't propagate through ConditionalRender)

export default (() => LandingPage) satisfies QuartzComponentConstructor
