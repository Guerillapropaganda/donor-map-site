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
  color: "green" | "red" | "amber" | "purple"
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
    color: "purple",
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

// ─── Featured investigation ─────────────────────────────────────────
const featuredInvestigation = {
  label: "FEATURED INVESTIGATION",
  title: "The Cuba Fuel Blockade",
  hook: "On March 16, 2026, Cuba's power grid collapsed. Ten million people went dark. The cause: a U.S. fuel blockade managed by Secretary of State Rubio — whose career was funded by the Fanjul sugar dynasty, the family that directly benefits from eliminating Cuban agricultural competition.",
  stat: "$2.9M",
  statLabel: "Fanjul family political spending in 2024",
  search: "operation-southern-spear-and-the-cuba-fuel-blockade",
}

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

      {/* ── Featured investigation ── */}
      <section class="lp-featured">
        <div class="lp-section-label">{featuredInvestigation.label}</div>
        <div class="lp-featured-card">
          <div class="lp-featured-content">
            <h3 class="lp-featured-title">{featuredInvestigation.title}</h3>
            <p class="lp-featured-hook">{featuredInvestigation.hook}</p>
            <a href={getHref(featuredInvestigation.search)} class="lp-featured-link">
              Read the full investigation →
            </a>
          </div>
          <div class="lp-featured-stat">
            <span class="lp-featured-stat-number">{featuredInvestigation.stat}</span>
            <span class="lp-featured-stat-label">{featuredInvestigation.statLabel}</span>
          </div>
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

// ─── Styles ─────────────────────────────────────────────────────────
LandingPage.css = `
/* ═══════════════════════════════════════════════
   LANDING PAGE — The Donor Map Homepage
   ═══════════════════════════════════════════════ */

.lp-landing {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 0 48px 0;
}

/* ── Section labels ── */
.lp-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.5px;
  color: #63636e;
  margin-bottom: 16px;
}

/* ═══ HERO ═══ */
.lp-hero {
  text-align: center;
  padding: 48px 24px 40px;
  margin: -8px -16px 0 -16px;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.06) 0%, transparent 100%);
  border-bottom: 1px solid #1e1e28;
}

.lp-hero-badge {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #818cf8;
  margin-bottom: 20px;
  padding: 6px 16px;
  display: inline-block;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.06);
}

.lp-hero-title {
  font-size: 56px !important;
  font-weight: 800 !important;
  letter-spacing: -2.5px;
  color: #e4e4e7 !important;
  margin: 0 0 20px 0 !important;
  line-height: 1.05 !important;
}

.lp-hero-sub {
  font-size: 17px !important;
  color: #a1a1aa !important;
  line-height: 1.75 !important;
  max-width: 620px;
  margin: 0 auto 32px auto !important;
}

.lp-hero-sub strong {
  color: #e4e4e7 !important;
}

/* ── Stats row ── */
.lp-hero-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.lp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.lp-stat-number {
  font-family: 'Space Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #818cf8;
}

.lp-stat-number.green {
  color: #22c55e;
}

.lp-stat-number.amber {
  color: #f59e0b;
}

.lp-stat-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #63636e;
  text-transform: uppercase;
}

.lp-stat-divider {
  width: 1px;
  height: 32px;
  background: #1e1e28;
}

/* ── CTAs ── */
.lp-hero-cta {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.lp-cta-primary {
  display: inline-block;
  padding: 12px 28px;
  background: #818cf8 !important;
  color: #0c0c0f !important;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 700;
  border-radius: 6px;
  text-decoration: none !important;
  border: none !important;
  transition: all 0.15s;
}

.lp-cta-primary:hover {
  background: #a5b4fc !important;
  transform: translateY(-1px);
}

.lp-cta-secondary {
  display: inline-block;
  padding: 12px 28px;
  background: transparent !important;
  color: #818cf8 !important;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 700;
  border-radius: 6px;
  text-decoration: none !important;
  border: 1px solid rgba(99, 102, 241, 0.3) !important;
  transition: all 0.15s;
}

.lp-cta-secondary:hover {
  border-color: #818cf8 !important;
  background: rgba(99, 102, 241, 0.06) !important;
}

/* ═══ HOOK CARDS ═══ */
.lp-hooks {
  padding: 40px 0;
}

.lp-hooks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.lp-hook-card {
  background: #111118;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s;
}

.lp-hook-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
}

.lp-hook-purple { border-top: 3px solid #818cf8; }
.lp-hook-green  { border-top: 3px solid #22c55e; }
.lp-hook-red    { border-top: 3px solid #ef4444; }
.lp-hook-amber  { border-top: 3px solid #f59e0b; }

.lp-hook-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.lp-hook-purple .lp-hook-label { color: #818cf8; }
.lp-hook-green  .lp-hook-label { color: #22c55e; }
.lp-hook-red    .lp-hook-label { color: #ef4444; }
.lp-hook-amber  .lp-hook-label { color: #f59e0b; }

.lp-hook-headline {
  font-size: 16px !important;
  font-weight: 700 !important;
  color: #e4e4e7 !important;
  margin: 0 0 10px 0 !important;
  line-height: 1.35 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  font-family: 'Space Grotesk', sans-serif !important;
  border: none !important;
  padding: 0 !important;
}

.lp-hook-body {
  font-size: 13px !important;
  color: #a1a1aa !important;
  line-height: 1.7 !important;
  flex: 1;
  margin-bottom: 16px !important;
}

.lp-hook-stat-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  border: 1px solid #1e1e28;
}

.lp-hook-stat {
  font-family: 'Space Mono', monospace;
  font-size: 18px;
  font-weight: 700;
}

.lp-hook-purple .lp-hook-stat { color: #818cf8; }
.lp-hook-green  .lp-hook-stat { color: #22c55e; }
.lp-hook-red    .lp-hook-stat { color: #ef4444; }
.lp-hook-amber  .lp-hook-stat { color: #f59e0b; }

.lp-hook-stat-label {
  font-size: 11px;
  color: #8a8a96;
  line-height: 1.4;
}

.lp-hook-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lp-hook-link {
  font-size: 13px;
  font-weight: 600;
  color: #818cf8 !important;
  text-decoration: none !important;
  border: none !important;
  background: none !important;
  padding: 0 !important;
  transition: color 0.15s;
}

.lp-hook-link:hover {
  color: #a5b4fc !important;
}

/* ═══ FEATURED INVESTIGATION ═══ */
.lp-featured {
  padding: 0 0 40px 0;
}

.lp-featured-card {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(245, 158, 11, 0.03) 100%);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-left: 3px solid #ef4444;
  border-radius: 0 8px 8px 0;
  padding: 28px;
  display: flex;
  gap: 28px;
  align-items: flex-start;
  transition: border-color 0.15s;
}

.lp-featured-card:hover {
  border-color: rgba(239, 68, 68, 0.3);
}

.lp-featured-content {
  flex: 1;
}

.lp-featured-title {
  font-size: 20px !important;
  font-weight: 700 !important;
  color: #e4e4e7 !important;
  margin: 0 0 12px 0 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  font-family: 'Space Grotesk', sans-serif !important;
  border: none !important;
  padding: 0 !important;
}

.lp-featured-hook {
  font-size: 14px !important;
  color: #b4b4bc !important;
  line-height: 1.75 !important;
  margin-bottom: 16px !important;
}

.lp-featured-link {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444 !important;
  text-decoration: none !important;
  border: none !important;
  background: none !important;
  padding: 0 !important;
  transition: color 0.15s;
}

.lp-featured-link:hover {
  color: #f87171 !important;
}

.lp-featured-stat {
  flex-shrink: 0;
  text-align: center;
  padding: 16px 20px;
  background: rgba(239, 68, 68, 0.06);
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.12);
}

.lp-featured-stat-number {
  display: block;
  font-family: 'Space Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #22c55e;
  margin-bottom: 4px;
}

.lp-featured-stat-label {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.5px;
  color: #a1a1aa;
  line-height: 1.4;
}

/* ═══ EXPLORE GRID ═══ */
.lp-explore {
  padding: 0 0 40px 0;
}

.lp-explore-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.lp-explore-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  background: #111118;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  text-decoration: none !important;
  color: inherit !important;
  transition: all 0.15s;
}

.lp-explore-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: #141419;
}

.lp-explore-icon {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.1);
  padding: 6px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  white-space: nowrap;
}

.lp-explore-info {
  min-width: 0;
}

.lp-explore-title {
  font-size: 15px;
  font-weight: 700;
  color: #e4e4e7;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lp-explore-count {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
}

.lp-explore-desc {
  font-size: 13px;
  color: #8a8a96;
  line-height: 1.6;
}

/* ═══ START HERE ═══ */
.lp-start {
  padding: 0 0 40px 0;
}

.lp-start-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.lp-start-card {
  display: block;
  padding: 20px;
  background: #111118;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  text-decoration: none !important;
  color: inherit !important;
  transition: all 0.15s;
}

.lp-start-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  background: #141419;
}

.lp-start-primary {
  grid-column: 1 / -1;
  border-left: 3px solid #818cf8;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, transparent 100%);
}

.lp-start-card-title {
  font-size: 15px;
  font-weight: 700;
  color: #e4e4e7;
  margin-bottom: 6px;
}

.lp-start-primary .lp-start-card-title {
  font-size: 17px;
  color: #818cf8;
}

.lp-start-card-desc {
  font-size: 13px;
  color: #8a8a96;
  line-height: 1.6;
}

/* ═══ BETA NOTICE ═══ */
.lp-beta {
  padding: 20px 24px;
  background: #0e0e14;
  border: 1px solid #1e1e28;
  border-radius: 6px;
  margin-top: 8px;
}

.lp-beta p {
  font-size: 12px !important;
  color: #63636e !important;
  line-height: 1.6 !important;
  margin: 0 !important;
}

.lp-beta strong {
  color: #818cf8 !important;
}

/* ═══ MOBILE ═══ */
@media (max-width: 800px) {
  .lp-hero {
    padding: 32px 16px;
    margin: -8px -8px 0 -8px;
  }

  .lp-hero-title {
    font-size: 36px !important;
    letter-spacing: -1.5px;
  }

  .lp-hero-sub {
    font-size: 15px !important;
  }

  .lp-hero-stats {
    gap: 16px;
  }

  .lp-stat-number {
    font-size: 20px;
  }

  .lp-stat-divider {
    height: 24px;
  }

  .lp-hooks-grid {
    grid-template-columns: 1fr;
  }

  .lp-featured-card {
    flex-direction: column;
  }

  .lp-featured-stat {
    align-self: flex-start;
  }

  .lp-explore-grid {
    grid-template-columns: 1fr;
  }

  .lp-start-grid {
    grid-template-columns: 1fr;
  }

  .lp-start-primary {
    grid-column: 1;
  }
}

/* ═══ Hide default elements on landing page ═══ */
body:has(.lp-landing) .article-title,
body:has(.lp-landing) .content-meta,
body:has(.lp-landing) .breadcrumb-container {
  display: none !important;
}

/* Hide markdown article body on homepage — component handles everything */
body:has(.lp-landing) article > :not(.lp-landing) {
  display: none !important;
}
`

export default (() => LandingPage) satisfies QuartzComponentConstructor
