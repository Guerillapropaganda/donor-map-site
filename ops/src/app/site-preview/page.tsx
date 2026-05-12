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
    title: "Bianco · The sheriff seized 650,000 ballots (DRAFT)",
    url: "http://localhost:8096/bianco-ballots",
    description: "Riverside County Sheriff Chad Bianco (Republican gubernatorial candidate, polling 12-14%, qualified for May 5 CNN debate) seized 650,000 ballots from the 2025 Proposition 50 referendum on a warrant signed by a judge he had publicly endorsed in 2022 (CalMatters Mar 26 + Apr 21 2026). 2014 Oath Keepers membership confirmed via the 2021 Anonymous Epik leak (LAist + NPR Oct 2021, double-source verified). FPPC single-source aggregation question: $78,400 from M&D Development + $78,400 from Downs Energy on the same Dec 30 2025 day — entities share addresses and management per SF Chronicle Mar 31 2026, corroborated by City of Corona staff reports. Donor-jurisdiction conflicts: Highland Fairview $39,200 (also gave Villaraigosa $72,800 + Sheriffs PEF $49K + Moving CA Forward $69K — Iddo Benzeevi cross-party signal), RJ Noble $35K (county road contractor), Mediwaste $20K (medical waste contractor), plus ~$143,720 deduplicated law-enforcement PAC stack operating inside the jurisdiction his department polices. CSPOA affiliation per CalMatters Apr 21 2026 internal-emails investigation. Built 2026-05-02. Mirrored to content/ tree 2026-05-07. 9 verification seeds populated for URL-pass.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Villaraigosa · The Pledge He Broke (DRAFT)",
    url: "http://localhost:8096/villaraigosa-pledge",
    description: "Signed a 2018 pledge not to take fossil-fuel money. In 2026 he is the principal Democrat beneficiary of oil-and-gas donations: $464,800 combined ($72,800 California Resources Corp + $78,400 each from Chevron, Marathon, Berry + $156,800 Clean Energy natural-gas vehicle fueling). Single-payer opposition while taking $78,400 AltaMed + $78,400 COPE Healthcare + $15K Fresenius (currently litigating against CA regulation per April 7 2026 Ninth Circuit case 24-3655). Post-mayor income trail: Mercury Public Affairs (Hungary, Qatar, Turkey clients), Actum LLC (Hungary's government), $381,820 California Forward 'infrastructure czar' funded by Port of San Diego, SoCalGas, Doordash, Disney, SoCalEdison, AT&T. Reed Hastings $7M to 2018 IE → 2026 money went to Mahan instead. Hero SVG: 2018 pledge box ↔ 2026 ledger box, same companies. Built 2026-05-02. Structurally cleaned + mirrored to content/ tree 2026-05-07 (was prototype-only). 9 verification seeds populated for URL-pass.",
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
    title: "Hilton · Form 700 AI-conflict spine (LIVE / FEATURED)",
    url: "http://localhost:8096/hilton",
    description: "Steve Hilton's March 6, 2026 candidate Form 700 puts him personally on Schedule A-1 holding equity in Sierra Technologies, Inc. (FMV Over $1,000,000), a private AI company at $10B valuation. Spouse Rachel Whetstone on Schedule C, Sierra income Over $100,000, head of communications. Hilton also discloses ongoing Fox News Network commentator income while campaigning. Verified against the actual filing 2026-05-04 (caf_e3937fe26f4b in code-audit-fetches.jsonl). Now the homepage Latest Investigation hero AND the /investigations featured tile.",
    status: "live",
    category: "beat",
  },
  {
    title: "Holdings Hilton 2026 · companion data (LIVE)",
    url: "http://localhost:8096/holdings-hilton-2026",
    description: "Companion data page off /hilton. Full Schedule A-1 + A-2 disclosure portrait of Hilton's stock portfolio: about 130 named companies, sector by sector (fossil fuel, pharmaceutical, defense, technology, financial). Five oil majors (Chevron, BP, Exxon, Shell, Total) + 13 pharma + Sierra at the Over $1M bracket. Built 2026-05-04 from the actual filing.",
    status: "live",
    category: "beat",
  },
  {
    title: "Steyer · Brother runs the AI lobby (DRAFT)",
    url: "http://localhost:8096/steyer",
    description: "Tom Steyer is running on tighter California AI rules. His brother Jim Steyer founded and runs Common Sense Media, the named advocate behind AB-1064 (LEAD for Kids Act, vetoed by Newsom), AB-1709 (social media age limit at 16, pending), and AB-2023 (companion chatbot safety + audits, pending). Tom and his wife Kat have donated at least $5M to Common Sense Media per CalMatters May 4 2026 reporting (Jeanne Kuang). The Republican-side mirror (Hilton + Sierra) is at /hilton; this story is the Democratic-side parallel. Built 2026-05-04. Bills verified directly against leginfo.legislature.ca.gov. URL-pass pending in /active-beat/steyer.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Clean Cash · Porter's whiteboard rule vs. her donor list (DRAFT · v2)",
    url: "http://localhost:8096/clean-cash",
    description: "Katie Porter's anti-corporate brand defines the rejected donor class narrowly. Her donor list (committee 1479597) has Joe Kiani (Masimo founder/CEO, $39,200), Karla Jurvetson (Bay Area progressive megadonor, $40,100), First Foundation Bank ($57,200), plus Seth Klarman (Baupost hedge fund, ~$13,900 lifetime) and Donald Mullen (former Goldman subprime trading head, $8,000+ lifetime). LIVE SPINE: Christian Larsen, Ripple co-founder, gave Porter the $39,200 max in 2025 — then revoked his support in March 2026 after she endorsed SF Proposition D (CEO-pay tax, on June 2 2026 ballot). Larsen gave $700K against Prop D (incl $200K for mailers) and switched to Hilton (also maxed at $39,200). Per CalMatters May 2026. The Larsen story is the live enforcement case study — donor class enforces with money when the candidate touches their wealth. Cross-links to /the-hedge ($35M anti-wealth-tax vehicle, same coalition). Rewritten 2026-05-07 after CalMatters surfaced the revocation; original framing (cross-party hedge) was stale. URL-pass pending in /active-beat/clean-cash.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Spencer Pratt · He's the new Caruso (DRAFT)",
    url: "http://localhost:8096/spencer-pratt",
    description: "Spencer Pratt's LA mayoral campaign (Pratt for Mayor 2026, FPPC committee 1485940) has raised $539,617 from 1,634 donors through April 18, 2026. Two structural findings: (1) Two corporate-named in-kind contributions in February. KOMOS TEQUILA $1,800 in beverages on Feb 1 (the brand is operated by Delaware corporation Komos, Inc. + Delaware LLC Casa Komos Beverage Group LLC). DELTA SPECIAL OPERATIONS CORP $1,800 in event security on Feb 9 (CA BSIS PPO #122040, a private-patrol firm whose own website markets itself as off-duty law enforcement officers including presidential dignitary-protection officers; no matching CA SOS entity registration). LA Municipal Code §49.7.13 bans both corporate and business-entity contributions to LA city candidates. (2) Five donors who maxed out to Rick Caruso against Karen Bass in 2022 are now writing max-out checks to Pratt against Bass in 2026: Roy Disney (Shamrock Enterprises), Michael Schwab (Big Sky Partners), Loren Booth (Booth Ranches), Michael Meldman (Discovery Land Company; contribution publicly disputed by Discovery Land per Real Deal Apr 28 2026), Ted & Michele Waitt (Gateway Computers founder). Pratt is also a plaintiff in Grigsby v. City of Los Angeles (25STCV00832), the consolidated Palisades-fire litigation against LA + LADWP, while running for mayor of LA. Campaign paid Newport Bleach (Tyler Nichols / Tyler Treats, five-year Pratt family vendor) $24,050 in three transactions; same Shopify storefront sells PRATT2026 campaign merch alongside 28 Heidi Montag-branded products. Largest single payee Highland Political LLC ($63,893) is not registered in TN, domain doesn't resolve, no other clients in FEC. Drafted 2026-05-09; receipts pass + entity profile + corporate-contribution sharpening 2026-05-11. URL-pass pending in /active-beat/spencer-pratt.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "The Wesson Pipeline · Bass/Airbnb budget deal (DRAFT)",
    url: "http://localhost:8096/airbnb-bass",
    description: "LA Mayor Karen Bass's 2026-27 budget includes two Airbnb-suggested provisions: a vacation rental program loosening short-term rental caps through the 2028 Olympics, and a transient occupancy tax pre-payment authority Airbnb intends to use for ~$50M. Justin Wesson is Airbnb's Senior Public Policy Manager for California and the son of former 8-year LA Council President Herb Wesson, now California co-chair of Mercury Public Affairs. Nine Mercury Public Affairs employees made nine contributions totaling $3,500 to Re-Elect Karen Bass for Mayor 2026 between Sept 30 and Oct 30 2025, two months after Justin Wesson registered as Airbnb's LA City lobbyist. UNITE HERE Local 11 + 3 LA Councilmembers (Rodriguez, Blumenfield, Raman) on record opposed. Save Our Services coalition is Airbnb-funded astroturf per LA Times. PLUM Committee scheduled to consider May 12 2026; Council budget vote May 21 2026. Drafted skeleton 2026-05-11 — URL-pass + expansion pending.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "The Coachella Data Center · felony-mayor + Bailey family + Stronghold $2.5M DOJ (DRAFT)",
    url: "http://localhost:8096/coachella-data-center",
    description: "Stronghold Power Systems gave Mayor Steven Hernandez $4,900. He presided over the Feb 11 2026 Coachella City Council vote approving the Municipal Utility Development Agreement (public-private partnership for 270MW data center on 240 acres). Three weeks later he pleaded guilty to a felony Government Code §1090 conflict-of-interest charge (Riverside DA indictment Oct 30 2025: 9 counts incl 4 felony perjury on Form 700). Stronghold Engineering (parent, Scott + Beverly Bailey) paid $2.5M DOJ Non-Prosecution Agreement April 2021 for SDVOSB program fraud (used KPI shell entity with nominal vet owner Neff for 14 sham VA contracts 2007-2013). DMK Project Solutions (Dulles VA) is project rep. New Mayor Figueroa publicly opposes; calls for moratorium. May 11 2026 community town hall held. Bailey family also donates federally to Calvert + Lincoln Club of Riverside County. Cross-links to /second-floor. Drafted skeleton 2026-05-11.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "The $320 Million · IEHP Medi-Cal fraud + supervisor fiduciary duty (DRAFT)",
    url: "http://localhost:8096/iehp-320m",
    description: "U.S. DOJ filed False Claims Act lawsuit Sept 2025 alleging Inland Empire Health Plan (IEHP, second-largest CA public health plan, serves 1.6M residents 35% of Riverside+SB combined population) held back $320M in federal Medi-Cal expansion funds that should have been returned. Smoking-gun email from then-CEO Bradley Gilbert quoted in complaint: 'The funds have to flow through the two county hospitals from IEHP so I can get credit for them as medical costs or the dollars go back to the state.' IEHP routed money through county hospitals to providers + Huron Consulting Group + IEHP-controlled accounts. Returned $30M out of $320M short. Gilbert was IEHP CEO 2008-2019, then appointed by Newsom as Director of CA Department of Health Care Services (the agency overseeing Medi-Cal). IEHP Governing Board includes Riverside Supervisors Spiegel (board chair 2021-Feb 2025) + Gutierrez (joined Jan 2023), SB Supervisor Hagman (current chair from Feb 2025, prior chair 2018-2020, also CUSM Board of Trustees). IEHP commits $1.2M annually to CUSM medical-school debt relief. Spiegel + Gutierrez also receive money from Moving California Forward developer PAC (cross-link to /second-floor). Drafted skeleton 2026-05-11.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Pechanga Money · #2 political donor in America (DRAFT)",
    url: "http://localhost:8096/pechanga-money",
    description: "Pechanga Band of Luiseño Mission Indians, headquartered in Temecula in Riverside County, is the #2 political donor in the United States behind only the NEA (~$44M most recent cycle). 2024 cycle: $822,989 federal contributions + $220K federal lobbying. $46M spent on 2008 Props 94-97 (tribal slot expansion). Leading coalition member on SB 549 (Tribal Nations Access to Justice Act, signed Newsom Sept 2024) — enables tribal suits against CA cardrooms. Filed cardroom litigation Jan 2025 with 6 other tribes. Pending federal legislation: HR 5682 + S 4053 (Pechanga land-into-trust). California state-level max-out pattern: $39,200 to Xavier Becerra for Governor 2026 (corporate max). $17,700 to Natasha Johnson Assembly D63 (who also receives $4K from Moving California Forward, cross-fund pattern). ~$11,800 max to ~17 Assembly + Senate candidates. Drafted skeleton 2026-05-11.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Calvert Earmarks · $100M+ in federal money near the congressman's properties (DRAFT)",
    url: "http://localhost:8096/calvert-earmarks",
    description: "Rep. Ken Calvert (R-CA41, chair House Defense Appropriations Subcommittee, 17-yr Riverside Co restaurant + real estate business owner) secured $100M+ in Community Project Funding since 2021. ECU OCE complaint Aug 2024 identifies $2M Magnolia Ave bridge widening + $9M I-15 improvements both within 3 miles of his 1210 + 1212 East 6th St Corona rental properties he failed to disclose. 2007 precedent: he submitted Corona transportation hub earmark with 7 properties in vicinity; House Ethics Committee approved with 'other local businesses must benefit' caveat. That's the playbook. Q1 2026 defense PAC totals $200K+ incl AM General ($1K + $1K right after Iran war started Mar 2-3), Lockheed Martin PAC ($5K Mar 4), RTX PAC ($5K Mar 9). Will Rollins requested formal Ethics Panel investigation. Bailey family (Stronghold Engineering, $2.5M DOJ NPA) cross-funds Calvert federally — Beverly Bailey, Charles Gossage donations 2009 + 2015. Scott Bailey at Lincoln Club of Riverside County. Cross-links to /second-floor and /coachella-data-center. Drafted skeleton 2026-05-11.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "The Second Floor · Mission Inn / Inland Empire developer pool (DRAFT)",
    url: "http://localhost:8096/second-floor",
    description: "One office on the 2nd floor of the historic Mission Inn Hotel & Spa in downtown Riverside houses Moving California Forward (FPPC #1455936, the developer-funded PAC), Pacheco MCF Ballot Measure Committee (#1461025), and three candidate committees (Perez Sup 2026 #1396909, Gutierrez Sup 2026 #1439760, DeJohnette Council 2024 #1473823). MCF raised $220,950 in 2026 from Stronghold Power ($25K), Highland Fairview / Iddo Benzeevi ($20K), Lewis Management ($22.5K), Palm Communities ($19.5K), Howard Industrial ($10K), Intersect Power ($8K), Jeffrey Burum ($5K, Colonies scandal), Gregory Devereaux ($1K, former SB County CAO), Athens Services ($25K), Charles B Wood ($50.8K individual). MCF paid out to Bianco Gov ($10K), Gutierrez ($9.5K, IEHP board), Spiegel ($1K, IEHP former chair during alleged $320M fraud), Troast & Associates LLC (consulting, same floor, $60.6K). Charles Wood + Highland Fairview double-channel to Bianco direct ($39.4K + $39.2K). Hotel itself was sold to San Manuel Investment Authority May 4 2026 (Roberts family → tribal gaming). Drafted 2026-05-11 from TUSA primary-extraction + Gemini Deep Research (Theodore Pacheco treasurer, Jennifer Mitchell treasurer, suite tenant directory). 3 unverified-flagged claims for David's URL pass: Mitchell as treasurer of 3 candidate committees, full suite tenant directory, San Manuel as Perez top contributor. Verification needed before public-routes flip.",
    status: "draft-isolated",
    category: "beat",
  },
  {
    title: "Race Map · cross-cutting donor overlay (DRAFT)",
    url: "http://localhost:8096/carace26-map",
    description: "Eight candidates. 55 named donors. 8 multi-candidate hedge bets. 17 industry tags. Interactive D3 force-directed graph at the top of the page lets you hover any candidate to see their donors, hover any donor to see which candidates they fund. Filters: Hedge bets (the 8 cross-cutters), Attacks only (the 2 anti-Steyer edges from PG&E + IBEW). Sections §1 hedge-bet table, §2 industry wars, §3 aggregation/cluster patterns, §4 candidate-by-candidate shape comparison. Sourced from per-candidate dossiers in content/Admin Notes/ca-gov-2026-dossiers/. Built 2026-05-04. URL-pass pending in /active-beat/carace26-map. Two sourcing flags from extraction agent: Chris Larsen identity (same person funding Hilton + Porter?), and M&D/Downs Energy industry-tag confidence.",
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
    title: "Homepage (root /)",
    url: "http://localhost:8096/",
    description: "Live homepage served from prototype/home.html. Old landing-v2.html and landing-v3.html were deleted 2026-05-07; unknown URLs now return a proper 404 instead of silently serving the old homepage.",
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
