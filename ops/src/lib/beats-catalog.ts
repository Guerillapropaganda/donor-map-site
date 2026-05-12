import type { VerificationSeed } from "./beat-verifications"

/**
 * Beats catalog - central registry of every editorial beat.
 *
 * One record per beat. Used by the Active Beat index, the per-beat
 * workspace at /active-beat/[slug], the publish API, and the preflight
 * checklist. Adding a new beat means adding one record here; no other
 * surface needs to change.
 *
 * Status meanings:
 *   active     - in editorial work, not public yet
 *   draft      - rough page exists but not ready for an editorial pass
 *   published  - flipped live in data/public-routes.json
 *   archived   - retired
 */

export type BeatStatus = "active" | "draft" | "published" | "archived" | "upcoming"

export interface BeatChecklistItem {
  label: string
  detail: string
  /**
   * "done" / "pending" / "blocked" are static editorial states.
   * Preflight gates are evaluated separately at request time and not
   * stored here.
   */
  status: "done" | "pending" | "blocked"
}

export interface BeatRecord {
  /** URL slug under /active-beat/[slug] and the key used everywhere */
  slug: string
  /** Slug used in data/public-routes.json (usually same) */
  publicSlug: string
  title: string
  deck: string
  /** e.g. "beat-three-becerras.html" - relative to prototype/ */
  prototypeFile: string
  /** localhost dev URL for preview */
  prototypeUrl: string
  /** companion donor list, if any */
  donorListFile?: string
  donorListUrl?: string
  /** path from repo root to the dossier file */
  dossierPath: string
  status: BeatStatus
  verificationSeeds: VerificationSeed[]
  perplexityRounds: { name: string; status: string; date: string }[]
  auditPasses: { name: string; date: string; status: string }[]
  /** Beat-specific editorial milestones (NOT preflight gates) */
  editorialChecklist: BeatChecklistItem[]
}

const MAHAN_SEEDS: VerificationSeed[] = [
  {
    id: "mahan-cal-access-1487425",
    beat: "mahan",
    label: "URL pass: Cal-Access · Back to Basics IE PAC",
    detail:
      "FPPC committee 1487425. Anchors $22.8M / 44 donors total + Brian Armstrong $500K Feb 9 2026 + most of the §1 IE-donor table (Moritz $3M, Caruso $1.5M, Collison $1.49M, Khosla $1.1M, Merrill $1.02M, Seibel/Hastings/Doerr/Huffman/Mehta $1M each). Also referenced in Singerman 4-committee table at $750K.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1487425",
  },
  {
    id: "mahan-cal-access-1488176",
    beat: "mahan",
    label: "URL pass: Cal-Access · Deliver for California IE PAC",
    detail:
      "FPPC committee 1488176. Anchors $3.27M / 17 donors total + Brin $1M + Buchheit $1M + Singerman $250K row in funnel table.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1488176",
  },
  {
    id: "mahan-cal-access-1450483",
    beat: "mahan",
    label: "URL pass: Cal-Access · Govern for California Action Committee",
    detail:
      "FPPC committee 1450483 (the funnel). Anchors the April 13 2026 $1.5M transfer to Back to Basics + the named GfC funders (Pritzker $300K, Kelly $250K, Baszucki $200K, Singerman $50K) + Singerman row in funnel table.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1450483",
  },
  {
    id: "mahan-cal-access-1486858",
    beat: "mahan",
    label: "URL pass: Cal-Access · Mahan for Governor 2026 (candidate cmte)",
    detail:
      "FPPC committee 1486858. Anchors $14.11M / 1,519 donors + 100 donors at FPPC max $78,400 + 165 donors at $39,200+ + Elena Nadolinski $78,400 Feb 4 2026 + Singerman $78,400 row + the candidate-cmte top-tier table (Houston, Field, Spiegel, Marcus, Tan, Friedman, Lonsdale, Hoffman, etc.).",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1486858",
  },
  {
    id: "mahan-cal-access-1480025",
    beat: "mahan",
    label: "URL pass: Cal-Access · Becerra for Governor 2026 (cross-hedge anchor)",
    detail:
      "FPPC committee 1480025. Anchors the Caruso cross-bet claim ($15,600 from Caruso + $15,600 from Tina Caruso to Becerra in Dec 2025). Cross-reference for the donor-class-isn't-betting-on-a-candidate framing.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480025",
  },
  {
    id: "mahan-cal-access-1480425",
    beat: "mahan",
    label: "URL pass: Cal-Access · Hilton for Governor 2026 (cross-hedge anchor)",
    detail:
      "FPPC committee 1480425. Anchors TWO cross-bet claims: Brin $39,200 to Hilton + Lonsdale $25,000 to Hilton. Two cross-party hedge donors (both also gave Mahan).",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480425",
  },
  {
    id: "mahan-cal-access-1264590",
    beat: "mahan",
    label: "URL pass: Cal-Access · California Business Roundtable Issues PAC (Thiel anchor)",
    detail:
      "FPPC committee 1264590. Anchors the Thiel negative finding: Thiel's only located 2024-2026 California state-level contribution is $3,000,000 to this PAC on Dec 29 2025 — NOT to Mahan or any pro-Mahan vehicle. Critical for the 'Thiel-orbit support, not Thiel personal support' framing.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1264590",
  },
  {
    id: "mahan-dfpi-dfal",
    beat: "mahan",
    label: "URL pass: DFPI Digital Financial Assets Law page",
    detail:
      "Anchors the regulatory-context claim: 'California's Digital Financial Assets Law licensing deadline is July 1, 2026 — the same month as the Democratic primary.' Pairs with Brian Armstrong's $500K Coinbase contribution to make the regulatory-exposure point.",
    lane: "Editor",
    url: "https://dfpi.ca.gov/regulated-industries/digital-financial-assets/",
  },
  {
    id: "mahan-calmatters-anti-labor",
    beat: "mahan",
    label: "URL pass: CalMatters Apr 24 2026 (anti-labor framing)",
    detail:
      "Tier 2 anchor for the labor-section opening: 'Silicon Valley executives, billionaires, and groups known to clash with Sacramento labor unions.' Direct quote attribution.",
    lane: "Editor",
    url: "https://calmatters.org/politics/2026/04/california-governor-race-financials/",
  },
  {
    id: "mahan-sjs-strike-aug2023",
    beat: "mahan",
    label: "URL pass: San José Spotlight Aug 7 2023 (4,500 workers / 99% strike vote)",
    detail:
      "Tier 2 anchor for the strike-authorization claim: 'about 4,500 city employees authorized a three-day strike by a 99 percent vote.' IFPTE Local 21 + AFSCME Local 101.",
    lane: "Editor",
    url: "https://sanjosespotlight.com/thousands-of-san-jose-workers-will-strike/",
  },
  {
    id: "mahan-kqed-strike-averted",
    beat: "mahan",
    label: "URL pass: KQED Aug 15 2023 (14.5% deal averted strike)",
    detail:
      "Tier 2 anchor for the strike-resolution claim: '14.5 percent over three years' deal that averted the Aug 15 2023 strike. Plus Mahan's quote 'Our unions did their job. But our council did not do its job.'",
    lane: "Editor",
    url: "https://www.kqed.org/news/11958290/san-jose-city-council-approves-agreements-with-unions-to-avoid-strike",
  },
  {
    id: "mahan-sjs-lone-vote",
    beat: "mahan",
    label: "URL pass: San José Spotlight Sep 15 2023 (Mahan lone vote against ratifying)",
    detail:
      "Tier 2 anchor for the centerpiece labor claim: 'Mahan was the only official to vote against ratifying the contracts.' This is the single sharpest point in the labor-record section.",
    lane: "Editor",
    url: "https://sanjosespotlight.com/san-jose-mayor-matt-mahan-criticizes-union-worker-pay-raises-amid-parks-program-cuts/",
  },
  {
    id: "mahan-kqed-jean-cohen",
    beat: "mahan",
    label: "URL pass: KQED Nov 15 2023 (Jean Cohen labor-challenger expectation)",
    detail:
      "Tier 2 anchor for the South Bay Labor Council quote: Cohen 'expected Mahan would face a labor-backed challenger because of dissatisfaction with his first year.'",
    lane: "Editor",
    url: "https://www.kqed.org/news/11967395/san-jose-labor-groups-dont-like-mayor-matt-mahan-so-why-does-his-re-election-seem-assured",
  },
  {
    id: "mahan-sjs-ab5-misclassification",
    beat: "mahan",
    label: "URL pass: San José Spotlight Oct 4 2022 (Mahan campaign AB5 misclassification)",
    detail:
      "Tier 2 anchor for the recursive irony claim: Mahan's 2022 mayoral campaign reclassified 18 workers under AB5 after a state labor commissioner complaint. Pairs with the Coinbase/AI/gig-economy donor list to make the structural-alignment point.",
    lane: "Editor",
    url: "https://sanjosespotlight.com/san-jose-mayoral-candidate-matt-mahan-admits-employee-classification-error-ab5-ab-5-california-labor-law-election-2022/",
  },
  {
    id: "mahan-politico-solana",
    beat: "mahan",
    label: "URL pass: Politico Jan 30 2026 (Mike Solana quote)",
    detail:
      "Tier 2 anchor for the Founders-Fund-affiliate quote in the Thiel-orbit section: Mike Solana told Politico that Mahan is 'the state's sole opportunity for a rational Democrat.'",
    lane: "Editor",
    url: "https://www.politico.com/news/2026/01/29/can-silicon-valley-make-a-governor-matt-mahan-is-betting-yes-00756444",
  },
  {
    id: "mahan-sfchronicle-thiel-orbit",
    beat: "mahan",
    label: "URL pass: SF Chronicle Mar 19 2026 (Thiel-orbit + Moritz dual-role)",
    detail:
      "Tier 2 anchor for TWO claims: (1) cross-hedge section's Moritz / SF Standard dual-role observation; (2) Thiel-orbit section's 'donors in the Palantir / Thiel-linked Silicon Valley network' framing. Most editorially load-bearing single press source on the page.",
    lane: "Editor",
    url: "https://www.sfchronicle.com/politics/article/matt-mahan-governor-california-billionaire-22080461.php",
  },
]

const CARACE26_MAP_SEEDS: VerificationSeed[] = [
  {
    id: "carace26-cal-access-portal",
    beat: "carace26-map",
    label: "URL pass: Cal-Access primary records (root anchor for the entire map)",
    detail:
      "ROOT SPINE. Every dollar amount on the page traces to Cal-Access RCPT_CD or EXPN_CD line-level disclosure. The whole-field count (60 named donors, 78 edges, 15 hedges, 6 cross-party) depends on the bulk export still being live and parseable. Verify the portal is up and that the bulk export at campaignfinance.cdn.sos.ca.gov/dbwebexport.zip is the freshest available. Re-check immediately before public exposure since later filings can shift any of the dollar figures cited in §1, §3, §4, and §5.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/",
  },
  {
    id: "carace26-sfchron-md-downs",
    beat: "carace26-map",
    label: "URL pass: SF Chronicle Mar 31 2026 — M&D Development + Downs Energy aggregation reporting",
    detail:
      "Anchors §3 cluster card on the M&D + Downs Energy $156,800 contribution to Bianco. SF Chronicle floated the FPPC common-control question; the per-Perplexity-verification update softened the 'sibling-managed' framing to 'linked Downs-family Corona entities' since primary records support officer overlap (Michael J. Downs CEO + Sharon Messner secretary/CFO via SOS Bizfile) but not independently the family relationship. Verify the article URL still resolves and that the body text supports the aggregation question we cite.",
    lane: "Editor",
    url: "https://www.sfchronicle.com/politics/article/contributions-bianco-violate-state-campaign-rules-22160676.php",
  },
  {
    id: "carace26-cdp-tracker-iii-poll",
    beat: "carace26-map",
    label: "URL pass: CDP Voter Index Tracking Survey III topline PDF (Apr 30-May 2 2026)",
    detail:
      "Anchors the candidate-percentage values displayed on each candidate node in the D3 graph (Hilton 18%, Bianco 14%, Becerra 18%, Steyer 12%, Porter 8%, Mahan 7%, Villaraigosa 2%). Evitarus, fielded April 30 to May 2 2026, 1,200 likely voters, ±2.83% MOE, commissioned by California Democratic Party. Verify the PDF still resolves at this URL and that the topline percentages match what the graph displays.",
    lane: "Editor",
    url: "https://cadem.org/wp-content/uploads/2026/05/FINAL-CA-Voter-Index-Tracking-Survey-III-Topline-05.03.26.pdf",
  },
  {
    id: "carace26-cal-access-anti-steyer-ie-1490270",
    beat: "carace26-map",
    label: "URL pass: Cal-Access · Anti-Steyer IE PAC (FPPC 1490270)",
    detail:
      "Anchors §2 War 1 (Energy + utilities vs. Steyer, $10,050,000 verified). The two anti-edges in the D3 graph (PG&E $9.975M + IBEW Local 1245 $75K) point to this committee. Same committee surfaces in /class-traitor and the related share cards. Verify the committee detail page still shows the anti-Steyer name structure and the F496/F497 contribution records match the cited amounts.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1490270",
  },
  {
    id: "carace26-cal-access-becerra-working-families-ie-1490885",
    beat: "carace26-map",
    label: "URL pass: Cal-Access · Working Families for Healthy Communities Supporting Becerra IE PAC (FPPC 1490885)",
    detail:
      "Anchors the NEW $2M IE-PAC node on the graph (LIUNA Pacific Southwest Regional Organizing Coalition PAC $2,000,000 + CPCA Advocates $115,200), surfaced by the 2026-05-04 Perplexity verification round filed at content/Admin Notes/perplexity-research/2026-05-04-race-map-verification.md. F496 filed 2026-05-01. Comparable in scale to the $9.975M anti-Steyer attack. Verify the committee filer ID, the funder names, and the IE-spending total before public exposure.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1490885",
  },
  {
    id: "carace26-cal-access-pro-mahan-ie-back-to-basics",
    beat: "carace26-map",
    label: "URL pass: Cal-Access · Back to Basics California IE PAC (Mahan)",
    detail:
      "Anchors the Mahan $0-candidate / $43M-IE callout below §4 and the entire Mahan donor row in the D3 graph (Moritz $2M, Seibel $1M, Merrill $1M, Collison $990K, Armstrong $500K, Pritzker $500K, Mehta $500K, Singerman $250K, Caruso $250K). Confirm committee ID, that the top funders match, and that the cumulative total supports the '$43M from 61 people' framing on the Mahan share card.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/?session=2025",
  },
  {
    id: "carace26-fppc-form700-portal-pechanga-tribal-fairness",
    beat: "carace26-map",
    label: "URL pass: Cal-Access · Pechanga Band cross-party hedge transactions (Bianco + Becerra + Porter)",
    detail:
      "Anchors the editorially load-bearing 'first cross-party tribal hedge in the field' claim in §1 and the §5 closing argument. Pechanga gave $25K Bianco + $44.6K Becerra + $25K Porter per the 2026-05-04 verification round. Verify each of the three transactions in the donor-name search before this is exposed publicly. The 'first cross-party tribal hedge' framing is a strong factual claim that depends on no other tribe having previously cross-cut R+D in this race.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Contributors/",
  },
  {
    id: "carace26-larsen-identity-dedup",
    beat: "carace26-map",
    label: "URL pass: Cal-Access · Larsen identity verification (Hilton + Porter same-person same-Ripple-title check)",
    detail:
      "Anchors the cross-party Larsen hedge claim in §1 and the share card. Per 2026-05-04 verification (perplexity-research/2026-05-04-race-map-verification.md): Hilton filer 1480425 reports Chris Larsen $39,200 SF 94109 Ripple 'Exec chair'; Porter filer 1479597 reports Christian Larsen $39,200 SF 94109 Ripple 'Executive Chairman'. High-confidence same-person match. The prior $117,600 Porter total was duplicate/amended display rows for one transaction (INC592). Verify by viewing both filer pages and confirming the address/employer fields match before publishing the cross-party Larsen claim.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480425",
  },
];

const HILTON_SEEDS: VerificationSeed[] = [
  {
    id: "hilton-form700-portal",
    beat: "hilton",
    label: "URL pass: FPPC Form 700 search portal — Hilton candidate filing March 6, 2026",
    detail:
      "THE SPINE OF THE BEAT. The Form 700 candidate Statement of Economic Interests is the primary source for all three disclosure cards: (1) Schedule A-1 — Stephen G. Hilton holding equity in Sierra Technology Inc., (2) Schedule C — spouse Rachel Whetstone $100,000+ income from Sierra Technology Inc. as Communications lead, (3) Schedule C — Stephen G. Hilton $10,001-$100,000 commentator income from Fox News Network LLC. Verify all three line items against the actual filing before public exposure. The conflict-of-interest claim rests on this filing.",
    lane: "Editor",
    url: "https://form700search.fppc.ca.gov/",
  },
  {
    id: "hilton-cal-access-1480425",
    beat: "hilton",
    label: "URL pass: Cal-Access · Hilton for Governor 2026 (FPPC 1480425)",
    detail:
      "Anchors the donor-base section: $7.73M from 14,989 donors at avg $515. Top 15 donors table including Tim Draper $78.4K, Rupert Murdoch $39.2K, Chris Larsen $39.2K, John McEntee $39.2K. Also anchors the Brin and Lonsdale cross-hedge claims (both gave Hilton AND Mahan).",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480425",
  },
  {
    id: "hilton-cal-access-mahan-cmte-cross-hedge",
    beat: "hilton",
    label: "URL pass: Cal-Access · Mahan for Governor 2026 (cross-hedge anchor)",
    detail:
      "FPPC committee 1486858. Cross-references the Lonsdale $78,400 to Mahan candidate cmte (paired with $25K to Hilton). Joe Lonsdale is the cleanest single illustration of the donor-class hedging Republican-as-backup.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1486858",
  },
  {
    id: "hilton-cal-access-mahan-ie-cross-hedge",
    beat: "hilton",
    label: "URL pass: Cal-Access · Deliver for California IE PAC (Brin cross-hedge)",
    detail:
      "FPPC committee 1488176. Anchors the Brin $1M-to-Mahan-IE side of the Brin-also-gave-Hilton-$39.2K cross-hedge claim. The Google co-founder writing both directions is the screenshot-bait fact for the donor-class section.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1488176",
  },
  {
    id: "hilton-fortune-sierra-launch",
    beat: "hilton",
    label: "URL pass: Fortune Feb 13 2024 — Sierra launch ($110M, Sequoia + Benchmark)",
    detail:
      "Tier 2 anchor for Sierra company facts: Bret Taylor + Clay Bavor as co-founders, $110M launch round led by Sequoia Capital and Benchmark, Taylor's prior role as Salesforce co-CEO and Facebook CTO. The Bret-Taylor-also-chairs-OpenAI claim depends on this verification.",
    lane: "Editor",
    url: "https://fortune.com/2024/02/13/bret-taylor-clay-bavor-ai-startup-sierra-110-million-funding-sequoia-benchmark/",
  },
  {
    id: "hilton-axios-sierra-175m",
    beat: "hilton",
    label: "URL pass: Axios Oct 29 2024 — Sierra $175M at $4.5B valuation",
    detail:
      "Tier 2 anchor for Sierra's October 2024 raise of $175M led by Greenoaks Capital, with Iconiq and Thrive participating. Mid-point of the valuation trajectory between $110M launch and $10B 2025.",
    lane: "Editor",
    url: "https://www.axios.com/2024/10/29/sierra-bret-taylor-175-million",
  },
  {
    id: "hilton-techcrunch-sierra-10b",
    beat: "hilton",
    label: "URL pass: TechCrunch Sep 4 2025 — Sierra $350M at $10B valuation",
    detail:
      "Tier 2 anchor for the headline valuation number. $350M raise at $10 billion valuation, total raised $635M. The $10B-valuation claim is what makes the Hilton equity holding consequential.",
    lane: "Editor",
    url: "https://techcrunch.com/2025/09/04/bret-taylors-sierra-raises-350m-at-a-10b-valuation/",
  },
  {
    id: "hilton-latimes-2026-04-22",
    beat: "hilton",
    label: "URL pass: LA Times Apr 22 2026 — Hilton California-inspired profile",
    detail:
      "Tier 2 anchor for: (1) Hilton's UK/American naturalization status confirmation in 2026 framing, (2) the 'former Fox News host who left in 2023' framing that sets up the Fox-News-commentator-income-while-running tension on Form 700.",
    lane: "Editor",
    url: "https://www.latimes.com/politics/story/2026-04-22/in-uk-california-governor-candidate-steve-hilton-was-inspired-by-california",
  },
  {
    id: "hilton-kqed-2026-02-05",
    beat: "hilton",
    label: "URL pass: KQED Feb 5 2026 — gubernatorial vision interview",
    detail:
      "Tier 2 anchor for the second 'former Fox News host' framing that sets up the Form 700 commentator-income tension.",
    lane: "Editor",
    url: "https://www.kqed.org/news/12071133/former-fox-news-host-steve-hilton-lays-out-vision-for-california-governorship",
  },
  {
    id: "hilton-foxnews-trump-endorse",
    beat: "hilton",
    label: "URL pass: Fox News Apr 6 2026 — Trump endorsement coverage",
    detail:
      "Tier 2 / employer-publication anchor. Fox News' own April 2026 framing of Hilton as a former Fox host. The third corroboration of the 'former Fox host' framing that the Form 700 commentator-income disclosure complicates.",
    lane: "Editor",
    url: "https://www.foxnews.com/politics/president-trump-makes-endorsement-california-gubernatorial-race-he-great-governor",
  },
  {
    id: "hilton-lighthouse-about",
    beat: "hilton",
    label: "URL pass: Lighthouse Worldwide Solutions — company About page",
    detail:
      "Tier 1 company primary source. Anchors the Lighthouse-Oregon-cluster section's company-identification claim: 1982-founded contamination-monitoring instrument company, semiconductor / pharmaceutical / biotechnology / aerospace / defense customers.",
    lane: "Editor",
    url: "https://www.golighthouse.com/en/about-lighthouse/",
  },
  {
    id: "hilton-lighthouse-contact",
    beat: "hilton",
    label: "URL pass: Lighthouse Worldwide Solutions — Contact page (Fremont CA + White City OR offices)",
    detail:
      "Tier 1 company primary source. Anchors the geographic claim that Lighthouse maintains Fremont CA + White City OR offices. The OR office sits between Medford and Grants Pass, the two towns the donor cluster is from.",
    lane: "Editor",
    url: "https://www.golighthouse.com/en/contact-us/",
  },
  {
    id: "hilton-leginfo-sb1047",
    beat: "hilton",
    label: "URL pass: leginfo — SB 1047 (Frontier AI safety, vetoed Sep 2024)",
    detail:
      "Anchors the Sacramento-AI-policy section's first concrete example. Verify URL resolves to the bill text and reflects Newsom's veto status. The point of citing a vetoed bill is to anchor that California IS the AI-policy jurisdiction, not to imply it's currently law.",
    lane: "Editor",
    url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB1047",
  },
  {
    id: "hilton-leginfo-ab2013",
    beat: "hilton",
    label: "URL pass: leginfo — AB 2013 (Generative AI Training Data Transparency, in effect Jan 1 2026)",
    detail:
      "Anchors the Sacramento-AI-policy section's second concrete example. Verify URL resolves to the bill text and effective-date claim. AB 2013's January 1, 2026 effective date is what makes the disclosure-conflict claim time-sensitive.",
    lane: "Editor",
    url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB2013",
  },
  {
    id: "hilton-sos-qualifications",
    beat: "hilton",
    label: "URL pass: CA Secretary of State — June 2 2026 primary qualifications",
    detail:
      "Anchors the supporting fact that California gubernatorial qualifications require US citizenship per California Constitution article V sections 2 and 9, and Elections Code section 201. Used to set up the open question on Hilton's UK-citizenship-renunciation status (open, not asserted).",
    lane: "Editor",
    url: "https://www.sos.ca.gov/elections/upcoming-elections/primary-election-june-2-2026/qualifications",
  },
]

const STEYER_SEEDS: VerificationSeed[] = [
  {
    id: "steyer-calmatters-may-4",
    beat: "steyer",
    label: "URL pass: CalMatters May 4 2026 — the family-financial-tie article",
    detail:
      "THE FOUNDATIONAL EXTERNAL SOURCE. Jeanne Kuang's May 4, 2026 piece is the primary citation for: (1) Tom + Kat Steyer have donated AT LEAST $5 MILLION to Common Sense Media, (2) Jim Steyer is founder/CEO since 2003, (3) Common Sense Media is the named advocate behind AB-1064, AB-1709, AB-2023, (4) Newsom vetoed AB-1064, (5) Bay Area Council quote (Peter Leroe-Munoz), (6) Consumer Watchdog quote (Jamie Court), (7) Tom Steyer's response. Verify the article still resolves at this URL and the $5M figure + the three bill numbers + the two named-figure quotes are reproduced in the article text.",
    lane: "Editor",
    url: "https://calmatters.org/politics/2026/05/tom-steyer-brother-common-sense/",
  },
  {
    id: "steyer-leginfo-ab1064",
    beat: "steyer",
    label: "URL pass: California Legislative Information · AB-1064 (2025-2026)",
    detail:
      "The 'Leading Ethical AI Development (LEAD) for Kids Act'. Bauer-Kahan principal author, Pellerin coauthor. Enrolled September 15, 2025. CalMatters reports it was vetoed by Newsom. Verify the bill exists at this URL, that the Legislative Counsel's Digest matches what the beat describes (chatbot age-gate for minors, prohibits encouragement of self-harm/suicide/violence/eating disorders, requires actual knowledge then reasonable determination of user age). Also verify the veto status if possible — leginfo's status field should show veto if it occurred.",
    lane: "Editor",
    url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1064",
  },
  {
    id: "steyer-leginfo-ab1709",
    beat: "steyer",
    label: "URL pass: California Legislative Information · AB-1709 (2025-2026)",
    detail:
      "'Covered platforms: age restriction: e-Safety Advisory Commission'. Authors: Lowenthal, Alvarez, Bauer-Kahan, Bonta, Hoover, Muratsuchi, Patterson, Wicks; Senator Allen. Last amended April 23 2026. The bill prohibits social media platforms from allowing users under 16 to create accounts. Verify the bill exists at this URL and the Counsel's Digest matches the beat text. The 8-author bipartisan-ish lineup is referenced in the beat; verify both major parties are represented (Patterson is Republican).",
    lane: "Editor",
    url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1709",
  },
  {
    id: "steyer-leginfo-ab2023",
    beat: "steyer",
    label: "URL pass: California Legislative Information · AB-2023 (2025-2026)",
    detail:
      "'Companion chatbots: children's safety'. Wicks principal author + Bauer-Kahan; Sen. Padilla principal coauthor; Lowenthal coauthor. Last amended April 27 2026. Annual chatbot risk assessments, crisis protocols, parental controls; independent audits begin 180 days after AG regs (expected 2028); civil enforcement by AG and injured children. Verify the bill exists at this URL and the Counsel's Digest matches the beat text.",
    lane: "Editor",
    url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB2023",
  },
  {
    id: "steyer-commonsense-org",
    beat: "steyer",
    label: "URL pass: Common Sense Media organization homepage",
    detail:
      "The organizational homepage. Used as a Common Sense Media identity confirmation citation in the beat. Not the foundational source for any factual claim — those go through CalMatters and leginfo. But verify the URL still resolves and Jim Steyer is identifiable on the About / Leadership pages.",
    lane: "Editor",
    url: "https://www.commonsensemedia.org/",
  },
  {
    id: "steyer-propublica-990",
    beat: "steyer",
    label: "URL pass: ProPublica Nonprofit Explorer · Common Sense Media Form 990 search",
    detail:
      "ProPublica Nonprofit Explorer search landing. Used in the beat as a 'where readers can find Form 990 filings' citation, not as a primary-source-of-financial-claims citation. Verify the URL still resolves and the search-by-name interface still works for 'Common Sense Media'.",
    lane: "Editor",
    url: "https://projects.propublica.org/nonprofits/",
  },
  {
    id: "steyer-scotus-brown-emar",
    beat: "steyer",
    label: "URL pass: Brown v. Entertainment Merchants Association · 2011 SCOTUS opinion PDF",
    detail:
      "U.S. Supreme Court opinion striking down California's 2005 violent-video-game-restriction law on First Amendment grounds. Cited in the beat as the historical context that Common Sense's 2005 first major California legislative push was struck down. Verify the URL resolves to the actual opinion PDF on supremecourt.gov.",
    lane: "Editor",
    url: "https://www.supremecourt.gov/opinions/10pdf/08-1448.pdf",
  },
  {
    id: "steyer-evitarus-may2-tweet",
    beat: "steyer",
    label: "URL pass: Evitarus / Ashley Zavala May 2 polling tweet",
    detail:
      "The Evitarus tracker polling number (Tom Steyer at 12 percent statewide, May 2 2026) is referenced in the lede. Verify the polling figure is sourced cleanly. Ashley Zavala's @ZavalaA Twitter/X account broke the topline. Optionally substitute a more durable URL (Evitarus's own report PDF if available, or the KCRA write-up). The X profile URL is a placeholder anchor; the polling claim itself should land on a non-social URL if you have one.",
    lane: "Editor",
    url: "https://x.com/ZavalaA",
  },
  {
    id: "steyer-calmatters-funders-nextgen-policy",
    beat: "steyer",
    label: "URL pass: CalMatters funders page · NextGen Policy listed as $10K-$49,999 donor",
    detail:
      "LOAD-BEARING DISCLOSURE SEED. CalMatters' published supporters page lists NextGen Policy in the $10,000 to $49,999 donor tier. NextGen Policy is the Tom-Steyer-founded, Kat-Taylor-chaired 501(c) nonprofit (verified in seed `steyer-nextgenpolicy-board-kat-taylor`). The funder relationship between the publication that broke our anchor source and the candidate's own family political vehicle is the basis for the methodology disclosure section of the beat. Verify: NextGen Policy still appears on this page in the $10K-$49,999 tier. Note: CalMatters may rotate funder lists periodically; if NextGen Policy has been moved to a different tier or removed since 2026-05-04, the disclosure paragraph needs an update.",
    lane: "Editor",
    url: "https://calmatters.org/about/funding/",
  },
  {
    id: "steyer-nextgenpolicy-board-kat-taylor",
    beat: "steyer",
    label: "URL pass: NextGen Policy board · Kat Taylor (Tom Steyer's wife) is Board Chair",
    detail:
      "LOAD-BEARING DISCLOSURE SEED. NextGen Policy's board of directors page identifies Kat Taylor as Board Chair (with the further identifying details: 'Co-Founder and Board Chair of Beneficial State Bank; Chair of TomKat Ranch Educational Foundation'). The Chris Fadeff biography on the same page identifies Tom Steyer as the founder of NextGen Policy ('NextGen Policy Founder Tom Steyer or entities he founded'). Verify both identity claims still appear on the page. The cross-reference page at https://nextgenpolicy.org/our-team/ corroborates: multiple senior staff have prior or continuing Steyer-organization roles (Chris Fadeff at Fahr LLC + Steyer presidential campaign COO + NextGen America senior roles, Kimi Meyer Budget Manager for the Tom Steyer PAC + Operations Manager for NextGen America, Amy Hamblin policy advisor on Tom Steyer's presidential campaign, Chris Lehman Need-to-Impeach lead). The board-chair identity claim AND the founder identity claim together establish that the funder relationship surfaced in the prior seed runs through the candidate's own household.",
    lane: "Editor",
    url: "https://nextgenpolicy.org/nextgen-policy-bod/",
  },
]

const THREE_BECERRAS_SEEDS: VerificationSeed[] = [
  {
    id: "becerra-kqed-url",
    beat: "three-becerras",
    label: "URL pass: KQED article",
    detail:
      "The editorially load-bearing third-audience source. Per Rule 13 every cited URL passes editor verification before public exposure.",
    lane: "Editor",
    url: "https://www.kqed.org/news/12082059/xavier-becerra-backpedals-on-single-payer-as-he-woos-powerful-doctors-lobby",
  },
  {
    id: "becerra-laist-url",
    beat: "three-becerras",
    label: "URL pass: LAist transcript",
    detail:
      "LAist 2026 transcript citing the federal-feasibility hedge quote. Code Claude can fetch via ADR-0030 §11; URL acceptance for the published page is Editor lane.",
    lane: "Editor",
    url: "https://laist.com/news/politics/2026-election-california-primary-xavier-becerra-california-governor-transcript",
  },
  {
    id: "becerra-senate-finance-url",
    beat: "three-becerras",
    label: "URL pass: Senate Finance transcript PDF",
    detail: "Senate Finance 473022.pdf for the 2021 confirmation hearing testimony.",
    lane: "Editor",
    url: "https://www.finance.senate.gov/imo/media/doc/473022.pdf",
  },
  {
    id: "becerra-campaign-healthcare-url",
    beat: "three-becerras",
    label: "URL pass: Becerra campaign healthcare page",
    detail: "xavierbecerra2026.com/priorities/health-care/ for the 'building toward CalCare' direct quote.",
    lane: "Editor",
    url: "https://www.xavierbecerra2026.com/priorities/health-care/",
  },
  {
    id: "becerra-govtrack-103-hr1200",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 1200 (American Health Security Act 1993)",
    detail: "Becerra cosponsorship 1993-03-03.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/103/hr1200",
  },
  {
    id: "becerra-govtrack-103-hr3960",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 3960 (American Health Security Act 1994)",
    detail: "Becerra cosponsorship 1994-03-03.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/103/hr3960",
  },
  {
    id: "becerra-govtrack-104-hr1200",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 1200 (American Health Security Act 1995)",
    detail: "Becerra cosponsorship 1995-03-09.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/104/hr1200",
  },
  {
    id: "becerra-govtrack-109-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (109th Congress)",
    detail: "Becerra cosponsorship 2005-11-17.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/109/hr676",
  },
  {
    id: "becerra-govtrack-110-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (110th Congress)",
    detail: "Becerra cosponsorship 2007-06-13.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/110/hr676",
  },
  {
    id: "becerra-govtrack-111-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (111th Congress)",
    detail: "Becerra cosponsorship 2009-03-17.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/111/hr676",
  },
  {
    id: "becerra-govtrack-112-hr676",
    beat: "three-becerras",
    label: "URL pass: GovTrack HR 676 (112th Congress)",
    detail: "Becerra cosponsorship 2011-05-13.",
    lane: "Editor",
    url: "https://www.govtrack.us/congress/bills/112/hr676",
  },
  {
    id: "becerra-cal-access-1480025",
    beat: "three-becerras",
    label: "URL pass: Cal-Access committee 1480025 (Becerra for Governor 2026)",
    detail: "Primary-source committee page for all donor amounts cited on the page.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480025",
  },
  {
    id: "becerra-march23-x-post",
    beat: "three-becerras",
    label: "URL pass: March 23 X post (verified primary)",
    detail: "Status 2036208139507298516 at 6:27 PM. The verified March 23 wording.",
    lane: "Editor",
    url: "https://x.com/XavierBecerra/status/2036208139507298516",
  },
  {
    id: "becerra-cpca-endorsement",
    beat: "three-becerras",
    label: "URL pass: CPCA Advocates endorsement of Becerra (2025-11-10)",
    detail: "Org's own endorsement page; the first gubernatorial endorsement in the org's history.",
    lane: "Editor",
    url: "https://cpcaadvocates.org/CPCAAdvocates/ABOUT/MEDIA/CPCAAdvocates/MEDIA/News_Articles.aspx",
  },
  {
    id: "becerra-fed-register-dhr-2022",
    beat: "three-becerras",
    label: "URL pass: Federal Register DHR Brownsville expansion approval (2022-12-20)",
    detail:
      "Sources the central direct-influence finding on the page: the December 20, 2022 CMS approval of DHR Health Edinburg LP's hospital expansion exception under ACA Section 6001, decided during Becerra's HHS tenure. Approved over explicit opposition from FAH and AHA. DHR Health co-founder Alonzo Cantu is a current $39,200 max donor to Becerra for Governor 2026.",
    lane: "Editor",
    url: "https://www.federalregister.gov/documents/2022/12/20/2022-27566/medicare-program-approval-of-request-for-an-exception-to-the-prohibition-on-expansion-of-facility",
  },
  {
    id: "becerra-fah-dhr-reaction",
    beat: "three-becerras",
    label: "URL pass: FAH reaction to DHR approval",
    detail: "FAH characterization of approval as 'unfortunate precedent' weakening the law banning new physician-owned hospitals.",
    lane: "Editor",
    url: "https://fah.org/sets-an-unfortunate-precedent-fah-reacts-to-cms-decision-allowing-a-physician-owned-hospital-to-expand/",
  },
  {
    id: "becerra-iepac-watch",
    beat: "three-becerras",
    label: "Cal-Access F496 watch: Working Families for Healthy Communities IE PAC",
    detail:
      "FPPC 1490885 formed April 30. Politico CA Playbook 4/29 named CPCA Advocates + Laborers as seed funders. Filings will appear over the next 30 days.",
    lane: "Time-based",
  },
  {
    id: "becerra-govinfo-1994",
    beat: "three-becerras",
    label: "GovInfo 1994 hearing primary transcript",
    detail:
      "The 1994 hearing quote ('I do, as I said before, join my colleagues who support the single-payer plan') is currently sourced via KFF Health News and PolitiFact. GovInfo search interface is JS-locked; wssearch backend requires POST which our audit fetcher does not yet support. Quote remains attributed at Tier 2.",
    lane: "Code Claude",
  },
  {
    id: "becerra-martinian",
    beat: "three-becerras",
    label: "Tigran Martinian industry classification",
    detail:
      "$45,600 to Becerra committee across 5 receipts. Identified as plaintiff bar via State Bar #247638 ZIP+4 match.",
    lane: "Perplexity",
  },
]

const CHEVRON_SEEDS: VerificationSeed[] = [
  {
    id: "chevron-cal-access-receipt",
    beat: "chevron",
    label: "URL pass: Cal-Access bulk receipt for Chevron USA Inc. donation",
    detail:
      "The single donation that anchors the entire beat. $39,200 dated June 16, 2025, transaction 5869881 in filing 3071361. Verifies Chevron USA Inc. corporate donation to Becerra for Governor 2026.",
    lane: "Editor",
    url: "https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip",
  },
  {
    id: "chevron-politico-defense-quote",
    beat: "chevron",
    label: "URL pass: Politico California Climate (the defense quote)",
    detail:
      "The single most editorially load-bearing source on the page. Politico transcribed Becerra's 'they're not the bad guy' answer at the League of California Cities forum on April 29, 2026. Without this URL the page does not stand.",
    lane: "Editor",
    url: "https://www.politico.com/newsletters/california-climate/2026/04/29/big-oil-california-governor-race-becerra-00899309",
  },
  {
    id: "chevron-envirovoters-statement",
    beat: "chevron",
    label: "URL pass: California Environmental Voters statement",
    detail: "EnviroVoters 'Becerra is wrong about Big Oil' response, April 30, 2026.",
    lane: "Editor",
    url: "https://envirovoters.org/becerra-is-wrong-about-big-oil/",
  },
  {
    id: "chevron-sacbee-political-spend",
    beat: "chevron",
    label: "URL pass: Sacramento Bee Chevron CA political spend analysis",
    detail: "May 1, 2026 Capitol Alert column with the $10.8M three-year and $12.9M lobbying figures.",
    lane: "Editor",
    url: "https://www.sacbee.com/news/politics-government/capitol-alert/article315586981.html",
  },
  {
    id: "chevron-bonta-suit-filing",
    beat: "chevron",
    label: "URL pass: Bonta climate-deception suit press release",
    detail: "California DOJ press release announcing the September 16, 2023 lawsuit naming Chevron and the other oil majors.",
    lane: "Editor",
    url: "https://oag.ca.gov/news/press-releases/attorney-general-bonta-announces-lawsuit-against-oil-and-gas-companies",
  },
  {
    id: "chevron-bonta-amended-complaint",
    beat: "chevron",
    label: "URL pass: Bonta amended complaint (June 2024)",
    detail: "California DOJ press release on the June 10, 2024 amended complaint adding defendants.",
    lane: "Editor",
    url: "https://oag.ca.gov/news/press-releases/attorney-general-bonta-files-amended-complaint-lawsuit-against-five-largest",
  },
  {
    id: "chevron-eenews-suit-pause",
    beat: "chevron",
    label: "URL pass: E&E News on the suit pause",
    detail: "April 16, 2026 reporting that the climate-deception lawsuits are paused pending Supreme Court review.",
    lane: "Editor",
    url: "https://www.eenews.net/articles/california-judge-pauses-climate-lawsuits-against-oil-and-gas-industry-pending-supreme-court-review/",
  },
  {
    id: "chevron-latimes-2016-exxon-investigation",
    beat: "chevron",
    label: "URL pass: LA Times 2016 Exxon investigation announcement",
    detail: "January 20, 2016 reporting that California AG (Harris) opened the ExxonMobil climate-fraud investigation.",
    lane: "Editor",
    url: "https://www.latimes.com/business/la-fi-exxon-global-warming-20160120-story.html",
  },
  {
    id: "chevron-latimes-2017-becerra-silence",
    beat: "chevron",
    label: "URL pass: LA Times 2017 editorial on Becerra silence",
    detail: "May 30, 2017 LA Times editorial noting Becerra had not 'uttered a peep' about the Exxon probe.",
    lane: "Editor",
    url: "https://www.latimes.com/opinion/editorials/la-ed-becerra-exxonmobil-climate-change-schneiderman-20170530-story.html",
  },
  {
    id: "chevron-icn-2017",
    beat: "chevron",
    label: "URL pass: Inside Climate News 2017 reporting",
    detail: "February 7, 2017 reporting on 18 California Democrats urging Becerra to continue the Exxon probe.",
    lane: "Editor",
    url: "https://insideclimatenews.org/news/07022017/exxon-climate-investigation-california-ag-xavier-becerra/",
  },
  {
    id: "chevron-becerra-fracking-suit",
    beat: "chevron",
    label: "URL pass: Becerra AG January 2020 fracking suit",
    detail: "California DOJ joint suit with Newsom challenging BLM Central California fracking decision.",
    lane: "Editor",
    url: "https://oag.ca.gov/news/press-releases/attorney-general-becerra-governor-newsom-and-state-departments-file-lawsuit",
  },
  {
    id: "chevron-becerra-methane-suit",
    beat: "chevron",
    label: "URL pass: Becerra AG September 2020 methane multistate",
    detail: "California DOJ leading 24-state EPA methane rollback challenge.",
    lane: "Editor",
    url: "https://oag.ca.gov/news/press-releases/attorney-general-becerra-leads-multistate-lawsuit-challenging-trump",
  },
  {
    id: "chevron-becerra-baltimore-amicus",
    beat: "chevron",
    label: "URL pass: Becerra AG December 2020 Baltimore amicus",
    detail: "California DOJ amicus brief supporting Baltimore's climate-damages lawsuit.",
    lane: "Editor",
    url: "https://oag.ca.gov/news/press-releases/attorney-general-becerra-files-friend-court-brief-support-baltimore%E2%80%99s-effort",
  },
  {
    id: "chevron-gibson-dunn-end-of-term",
    beat: "chevron",
    label: "URL pass: Gibson Dunn AG end-of-term review",
    detail: "January 25, 2021 review establishing Becerra's AG focus on federal litigation versus state oil-gas enforcement.",
    lane: "Editor",
    url: "https://www.gibsondunn.com/wp-content/uploads/2021/01/california-attorney-general-end-of-term-update.pdf",
  },
  {
    id: "chevron-latimes-el-segundo-fire",
    beat: "chevron",
    label: "URL pass: LA Times El Segundo fire history",
    detail: "October 4, 2025 reporting on the 46 violations and 17 OSHA citations at El Segundo.",
    lane: "Editor",
    url: "https://www.latimes.com/environment/story/2025-10-04/chevrons-el-segundo-refinery-had-a-history-of-safety-environmental-violations",
  },
  {
    id: "chevron-latimes-el-segundo-cause",
    beat: "chevron",
    label: "URL pass: LA Times December 2025 El Segundo cause status",
    detail: "December 18, 2025 update that neither Chevron nor regulators released the fire cause.",
    lane: "Editor",
    url: "https://www.latimes.com/environment/newsletter/2025-12-18/chevron-fire-air-quality-monitoring",
  },
  {
    id: "chevron-calmatters-csb-defunding",
    beat: "chevron",
    label: "URL pass: CalMatters on CSB defunding",
    detail: "October 9, 2025 reporting on the U.S. Chemical Safety Board defunding context.",
    lane: "Editor",
    url: "https://calmatters.org/environment/2025/10/refinery-explosion-federal-state-oversight/",
  },
  {
    id: "chevron-calmatters-cap-invest",
    beat: "chevron",
    label: "URL pass: CalMatters Cap-and-Invest reauthorization",
    detail: "September 13, 2025 CalMatters on SB 840 / AB 1207 reauthorization.",
    lane: "Editor",
    url: "https://calmatters.org/environment/2025/09/climate-change-package-legislature/",
  },
  {
    id: "chevron-aqmd-petition",
    beat: "chevron",
    label: "URL pass: South Coast AQMD Case 831-408 petition",
    detail: "October 24, 2025 AQMD variance petition on Chevron El Segundo.",
    lane: "Editor",
    url: "https://www.aqmd.gov/docs/default-source/agendas/hearing-board/case-documents/chevron--0831/408/chevron-831-408---petition---10-24-25.pdf",
  },
  {
    id: "chevron-baaqmd-richmond-settlement",
    beat: "chevron",
    label: "URL pass: BAAQMD Richmond Rule 6-5 settlement",
    detail: "February 12, 2024 Bay Area Air Quality Management District settlement with Chevron Richmond.",
    lane: "Editor",
    url: "https://www.baaqmd.gov/~/media/files/communications-and-outreach/news-and-events/penalties-and-assessments/2024/rule-6-5-chevron-baaqmd-settlement-agreement-final-fully-executed-with-attachments-pdf.pdf",
  },
  {
    id: "chevron-fppc-contribution-limits",
    beat: "chevron",
    label: "URL pass: FPPC state contribution limits",
    detail: "California Fair Political Practices Commission state contribution limits page (the $39,200 maximum).",
    lane: "Editor",
    url: "https://www.fppc.ca.gov/learn/campaign-rules/state-contribution-limits.html",
  },
  {
    id: "chevron-wspa-cap-invest-opposition",
    beat: "chevron",
    label: "URL pass: WSPA Cap-and-Invest opposition press release",
    detail: "September 8, 2025 WSPA press release calling reauthorization rushed.",
    lane: "Editor",
    url: "https://www.wspa.org/resource/wspa-urges-legislators-to-reject-rushed-cap-and-trade-reauthorization/",
  },
  {
    id: "chevron-cbd-permit-acceleration",
    beat: "chevron",
    label: "URL pass: Center for Biological Diversity permit acceleration data",
    detail: "March 6, 2026 release on CalGEM permit acceleration after SB 237.",
    lane: "Editor",
    url: "https://biologicaldiversity.org/w/news/press-releases/california-approves-128-oil-wells-in-two-months-more-than-last-three-years-combined-2026-03-06/",
  },
  {
    id: "chevron-carb-lcfs-overview",
    beat: "chevron",
    label: "URL pass: CARB LCFS overview page",
    detail: "California Air Resources Board Low Carbon Fuel Standard overview cited for the 30%/2030 and 90%/2045 benchmarks.",
    lane: "Editor",
    url: "https://ww2.arb.ca.gov/our-work/programs/low-carbon-fuel-standard",
  },
]

const CLEAN_CASH_SEEDS: VerificationSeed[] = [
  {
    id: "clean-cash-cal-access-1479597",
    beat: "clean-cash",
    label: "URL pass: Cal-Access · Porter for Governor 2026 (FPPC 1479597)",
    detail:
      "THE SPINE OF THE BEAT. Anchors the receipt cards: Christian Larsen $39,200 (2025 receipt, support revoked March 2026 — see separate Larsen seeds), Joe Kiani $39,200 (Masimo founder/CEO), Karla Jurvetson $40,100 (Bay Area progressive megadonor), First Foundation Bank $57,200 (largest single organizational direct contribution in 2026 cycle). Verify each name + amount on the Cal-Access committee detail page before public exposure. Also verify the Larsen contribution date is 2025, not 2026 — the timing is load-bearing for the 'revoked in March 2026' framing.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1479597",
  },
  {
    id: "clean-cash-larsen-revocation-calmatters",
    beat: "clean-cash",
    label: "URL pass: CalMatters May 2026 — Larsen revoked Porter support after Prop D endorsement",
    detail:
      "LOAD-BEARING. The CalMatters May 2026 article on Porter's struggling campaign reports: (1) Larsen donated to Porter in 2025, (2) revoked his support in March 2026 when she endorsed SF Proposition D, (3) gave $700,000 to defeat Prop D including $200,000 specifically for campaign mailers, (4) switched his support to Republican Steve Hilton. All four facts must verify against the published article before this beat goes public. The original framing of Larsen as 'cross-party hedge' was wrong (he picked a side, not hedged); the rewrite frames him as the live enforcement case study. The §11 ADR-0030 carve-out covers a fetch of CalMatters for quote verification.",
    lane: "Editor",
    url: "https://calmatters.org/politics/2026/05/california-governor-race-katie-porter/",
  },
  {
    id: "clean-cash-prop-d-sf-ballot",
    beat: "clean-cash",
    label: "URL pass: SF Proposition D — June 2, 2026 ballot (CEO pay tax)",
    detail:
      "Verify Proposition D is on the June 2, 2026 San Francisco ballot. Submitted to the city attorney by labor coalition Stand Up for SF in November 2025. The measure adjusts an existing executive-pay tax on corporations whose top executive earns more than 100x the median worker. Verify the November 2025 submission date, the existing-tax-modification framing (not a new tax), and the same-day-as-CA-primary status. Ballotpedia and SF Public Press both have detailed pages.",
    lane: "Editor",
    url: "https://ballotpedia.org/San_Francisco,_California,_Measure_D,_Changes_to_Top_Executive_Pay_Tax_Initiative_(June_2026)",
  },
  {
    id: "clean-cash-larsen-700k-prop-d-opposition",
    beat: "clean-cash",
    label: "URL pass: Larsen $700K opposition to Prop D — SF Ethics Commission filings",
    detail:
      "Verify the $700,000 figure (and the $200,000-for-mailers sub-figure) from independent expenditure / committee filings against Prop D, not just from secondary CalMatters reporting. SF Ethics Commission campaign-finance database is the primary source. SF Public Press, Mission Local, and Inequality.org have all done coverage with primary-source links. Bloomberg April 22 2026 also covered Larsen's role in the opposition.",
    lane: "Editor",
    url: "https://www.sfpublicpress.org/billionaire-money-ballot-power-and-the-fight-over-san-franciscos-ceo-tax/",
  },
  {
    id: "clean-cash-cal-access-hilton-larsen-cross",
    beat: "clean-cash",
    label: "URL pass: Cal-Access · Hilton for Governor 2026 (Larsen Hilton contribution after revocation)",
    detail:
      "FPPC committee 1480425. The Christian Larsen / Chris Larsen $39,200 to Hilton matters as the destination of his support after the Porter revocation. Same person verification per 2026-05-04 race-map round: Hilton filer reports 'Chris Larsen' SF 94109 Ripple Exec Chair; Porter filer reports 'Christian Larsen' SF 94109 Ripple Executive Chairman. High-confidence same-person match. Verify the Hilton contribution date is post-March 2026 if possible (supports the timeline framing).",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480425",
  },
  {
    id: "clean-cash-fec-klarman-mullen-lifetime",
    beat: "clean-cash",
    label: "URL pass: FEC bulk · Seth Klarman + Donald Mullen lifetime contributions to Porter campaigns",
    detail:
      "Lifetime federal cumulative contributions across Porter's 2018, 2020, 2022 House campaigns + 2024 Senate primary. Klarman ~$13,900 (Baupost Group hedge fund founder). Mullen $8,000+ (former Goldman Sachs partner who ran the trading desk that profited from the 2008 subprime mortgage collapse). Both already documented in Porter's master profile (_Katie Porter Master Profile.md) as part of the existing 'clean cash' Core Contradiction. Verify FEC individual-contribution records for both donors against Porter committees C00636571 and C00831107 before publishing the lifetime totals.",
    lane: "Editor",
    url: "https://www.fec.gov/data/receipts/individual-contributions/",
  },
  {
    id: "clean-cash-masimo-corporate-disclosure",
    beat: "clean-cash",
    label: "URL pass: Joe Kiani · Masimo Corporation founder/CEO confirmation",
    detail:
      "Confirm Joe Kiani as founder and CEO of Masimo Corporation (publicly traded medical-device manufacturer). Source can be Masimo's own corporate disclosures (10-K, proxy statement) or SEC EDGAR filings. The 'medical-device CEO' framing depends on this verification.",
    lane: "Editor",
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=Masimo",
  },
  {
    id: "clean-cash-baupost-klarman-disclosure",
    beat: "clean-cash",
    label: "URL pass: Seth Klarman · Baupost Group founder confirmation",
    detail:
      "Confirm Seth Klarman as founder of Baupost Group (Boston-based hedge fund). Source: Baupost's SEC ADV filing, Forbes billionaire list, or other Tier 1 corporate disclosure. The 'hedge fund founder, billions estimated net worth' framing depends on this verification.",
    lane: "Editor",
    url: "https://adviserinfo.sec.gov/firm/summary/107994",
  },
  {
    id: "clean-cash-mullen-goldman-history",
    beat: "clean-cash",
    label: "URL pass: Donald Mullen · former Goldman Sachs subprime trading head verification",
    detail:
      "Confirm Donald Mullen led the Goldman Sachs trading operation that profited from betting against subprime mortgages during the 2008 financial crisis. Multiple Tier 1 sources: Senate Permanent Subcommittee on Investigations 2011 report on Wall Street and the Financial Crisis (the Levin report), the SEC's 2010 Goldman Sachs Abacus settlement, or the McLean / Nocera book All the Devils Are Here. Verify Mullen left Goldman in 2012 and founded a private investment firm before publishing.",
    lane: "Editor",
    url: "https://www.hsgac.senate.gov/imo/media/doc/Financial_Crisis/FinancialCrisisReport.pdf",
  },
  {
    id: "clean-cash-first-foundation-bank-business",
    beat: "clean-cash",
    label: "URL pass: First Foundation Bank · wealth-management business confirmation",
    detail:
      "Confirm First Foundation Bank's primary business line is wealth management for high-net-worth individuals. Source: First Foundation Inc.'s 10-K or annual report on SEC EDGAR (ticker FFWM). The 'wealth-management bank for high-net-worth clients' framing depends on this verification.",
    lane: "Editor",
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=FFWM&type=10-K",
  },
  {
    id: "clean-cash-porter-master-profile-corroboration",
    beat: "clean-cash",
    label: "Cross-reference: Porter master profile Core Contradiction section",
    detail:
      "The Klarman ($13,900) and Mullen ($8,000+) lifetime federal entries are already documented in content/Politicians/Races/CA Governor 2026/Katie Porter/_Katie Porter Master Profile.md under 'Core Contradiction' and 'Class Analysis' sections. The beat is consistent with the existing in-vault analysis; no new factual claim about Porter's record. Verify the master profile sections still match the beat's framing before publishing.",
    lane: "Editor",
    url: "internal://content/Politicians/Races/CA Governor 2026/Katie Porter/_Katie Porter Master Profile.md",
  },
]

export const BEATS: BeatRecord[] = [
  {
    slug: "three-becerras",
    publicSlug: "three-becerras",
    title: "Three Becerras",
    deck:
      "Xavier Becerra cosponsored single-payer bills seven times across four Congresses. On March 23 he said he was ready to deliver single-payer health care. Six weeks later he told the doctors lobby he was not supportive at this point. The donor list explains who is acceptable to whom.",
    prototypeFile: "beat-three-becerras.html",
    prototypeUrl: "http://localhost:8096/three-becerras",
    donorListFile: "donors-becerra-2026.html",
    donorListUrl: "http://localhost:8096/donors-becerra-2026",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/becerra.md",
    status: "published",
    verificationSeeds: THREE_BECERRAS_SEEDS,
    perplexityRounds: [
      { name: "Anti-Steyer verification (Steyer beat)", status: "applied", date: "2026-05-01" },
      { name: "Becerra donor verification (Phase 5g)", status: "applied", date: "2026-05-01" },
      { name: "Polling firms + funders", status: "applied (with correction)", date: "2026-05-02" },
      { name: "Becerra single-payer record (Phase 5h)", status: "applied", date: "2026-05-02" },
      { name: "CPCA Advocates funder map (Phase 5i)", status: "applied", date: "2026-05-02" },
      { name: "Eleni Kounalakis status", status: "applied", date: "2026-05-02" },
      { name: "Steyer polling apparatus (correction round)", status: "applied", date: "2026-05-02" },
      { name: "Ballot certification + debate calendar", status: "applied", date: "2026-05-02" },
      { name: "Tigran Martinian identification", status: "applied (State Bar #247638 + ZIP+4 match)", date: "2026-05-02" },
      { name: "CPCA Advocates historical baseline (Round A)", status: "applied", date: "2026-05-02" },
      { name: "CMA parallel actions for Becerra (Round B)", status: "applied", date: "2026-05-02" },
      { name: "Becerra single-payer March 23 to April window (Round C)", status: "applied", date: "2026-05-02" },
      { name: "Newsom 2018 single-payer retreat parallel (Round D)", status: "applied", date: "2026-05-02" },
      { name: "Becerra HHS-era specific donor actions (Round E)", status: "applied", date: "2026-05-02" },
    ],
    auditPasses: [
      { name: "Forensic audit round 1 (10 critique classes)", date: "2026-05-02", status: "applied" },
      {
        name: "Audit round 2 real-time critiques (4 from David)",
        date: "2026-05-02",
        status: "applied: comparative baseline added, silence-as-info-gap reframed, Kaiser/FQHC nuance, Bravo direct-quote restoration",
      },
      {
        name: "ChatGPT critique pass (7 points + David's voice critique)",
        date: "2026-05-02",
        status: "applied: lede sharpened, donor quantification, DHR lock-down, Newsom trim, CPCA clarifier, Anthem framing corrected",
      },
      {
        name: "Editorial voice sweep: we → I",
        date: "2026-05-02",
        status: "applied: every editorial-voice 'we' switched to 'I' across 4 pages; in-quote 'we' preserved",
      },
    ],
    editorialChecklist: [
      {
        label: "Forensic audit applied",
        detail: "Page revised against the 10-class audit + David's 4 real-time critiques + ChatGPT 7-point pass.",
        status: "done",
      },
      {
        label: "Tier 1 quote verifications",
        detail: "GovTrack cosponsorships verified. Senate Finance transcript verified. Cal-Access donor amounts verified.",
        status: "done",
      },
      {
        label: "Companion donor-list page",
        detail: "/donors-becerra-2026 with top-15 + healthcare slice cross-reference table.",
        status: "done",
      },
      {
        label: "Meme kit drafted",
        detail: "10 memes across 5 stories. Five tagged for this beat. Captions queued via /distribution/cards/by-beat ops surface.",
        status: "done",
      },
      {
        label: "Tip box on the beat page",
        detail: "Brutalist tip box at the bottom; routes to guerillapropaganda@proton.me.",
        status: "done",
      },
    ],
  },
  {
    slug: "chevron",
    publicSlug: "not-the-bad-guy",
    title: "He took the check. Then he defended it.",
    deck:
      "$39,200 from Chevron USA Inc. landed in Becerra's 2026 California governor account on June 16, 2025. Ten months later he told voters Chevron was not the bad guy. Two of his rivals refused fossil fuel money. He took it. Public route renamed from /chevron to /not-the-bad-guy on 2026-05-03 to avoid collision with the Chevron donor profile.",
    prototypeFile: "beat-chevron.html",
    prototypeUrl: "http://localhost:8096/chevron",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/becerra.md",
    status: "published",
    verificationSeeds: CHEVRON_SEEDS,
    perplexityRounds: [
      { name: "Becerra non-healthcare donor machine (9-section)", status: "applied", date: "2026-05-02" },
    ],
    auditPasses: [
      {
        name: "ChatGPT critique 2-8: tighten claims, lock thesis",
        date: "2026-05-02",
        status: "applied: 'Chevron knew what it was doing' replaced; 'framing inverts' tightened; Steyer compare line de-implicated; Exxon non-action clarifier added; 'conspicuous restraint' replaced; El Segundo hard boundary; explicit thesis callout near top",
      },
      {
        name: "Normie-language sweep (Cal-Access jargon → plain English)",
        date: "2026-05-02",
        status: "applied: '12,259-row Cal-Access bulk extract' replaced with 'every donation his governor campaign reported'; lede technical IDs moved to receipts table only",
      },
    ],
    editorialChecklist: [
      {
        label: "Hero SVG timeline",
        detail: "4-node timeline (inherited Exxon file → Bonta files in 2023 → $39,200 in 2025 → defense quote in 2026).",
        status: "done",
      },
      {
        label: "Three-up rivals contrast row",
        detail: "Steyer / Porter (refused) versus Becerra (took it). Brutalist tile pattern.",
        status: "done",
      },
      {
        label: "Hazard banner above rivals row",
        detail: "Yellow-and-black hazard tape contrast alert.",
        status: "done",
      },
      {
        label: "Explicit thesis callout near top",
        detail: "Red-bordered callout block right after the lede locks the structural claim.",
        status: "done",
      },
      {
        label: "What this page does not claim (5 explicit non-claims)",
        detail: "Coordination, motive, anti-Trump record, El Segundo cause linkage, Steyer/Porter universe.",
        status: "done",
      },
      {
        label: "Tip box on the beat page",
        detail: "Brutalist tip box at the bottom; routes to guerillapropaganda@proton.me.",
        status: "done",
      },
    ],
  },
]

const CLASS_TRAITOR_SEEDS: VerificationSeed[] = [
  {
    id: "class-traitor-car-raa",
    beat: "class-traitor",
    label: "URL pass: CAR REALTOR Action Assessment (split-roll listed as 2026 threat)",
    detail:
      "Source for the CAR mechanism subsection. CAR own page identifies Split Roll, Lowering the Vote Threshold, and More Transfer Taxes as 2026 potential initiatives.",
    lane: "Editor",
    url: "https://www.car.org/advocacy/PACSnRAF/RAA",
  },
  {
    id: "class-traitor-steyer-tax-loopholes",
    beat: "class-traitor",
    label: "URL pass: Steyer campaign tax-loopholes plan",
    detail:
      "Direct mirror of the policy collision with CAR. Steyer page promises to reform the commercial side of Prop 13.",
    lane: "Editor",
    url: "https://www.tomsteyer.com/issues/tax-loopholes",
  },
  {
    id: "class-traitor-kqed-taxes",
    beat: "class-traitor",
    label: "URL pass: KQED — how the next governor will change your taxes",
    detail: "KQED published April 14, 2026. Source for Steyer's 2027 special-election proposal on Political Breakdown.",
    lane: "Editor",
    url: "https://www.kqed.org/news/12079441/heres-how-californias-next-governor-will-change-your-taxes",
  },
  {
    id: "class-traitor-politico-special-election",
    beat: "class-traitor",
    label: "URL pass: Politico — Steyer wants 2027 special election",
    detail: "Politico February 18, 2026. Source for Steyer's commitment to do what it takes to get split roll passed.",
    lane: "Editor",
    url: "https://www.politico.com/news/2026/02/18/tom-steyer-wants-a-special-election-to-hike-corporate-taxes-in-2027-00786876",
  },
  {
    id: "class-traitor-reuters-black-to-green",
    beat: "class-traitor",
    label: "URL pass: Reuters — From black to green",
    detail:
      "Reuters May 13, 2014. Primary source for Farallon financing of Bumi/Berau/Adaro Indonesian coal deals plus 220M Nexen and 125M Kinder Morgan exposure pre-2012 exit.",
    lane: "Editor",
    url: "https://www.reuters.com/article/world/from-black-to-green-us-billionaires-road-to-damascus-idUSBREA4C06C/",
  },
  {
    id: "class-traitor-nyt-coal",
    beat: "class-traitor",
    label: "URL pass: NYT — Prominent environmentalist helped fund coal projects",
    detail:
      "NYT July 4, 2014. Source for Berau/Maules Creek/Indiabulls/Meiya coal financing under Steyer.",
    lane: "Editor",
    url: "https://www.nytimes.com/2014/07/05/us/politics/prominent-environmentalist-helped-fund-coal-projects.html",
  },
  {
    id: "class-traitor-politico-cca",
    beat: "class-traitor",
    label: "URL pass: Politico — Steyer Farallon and CCA",
    detail: "Politico October 24, 2016. Source for the 5.5 percent CCA holding (89.1M peak Q2 2005) and Steyer's student-leaders quote.",
    lane: "Editor",
    url: "https://www.politico.com/states/california/story/2016/10/tom-steyer-pursuing-racial-and-economic-justice-issues-invested-heavily-in-for-profit-prisons-106634",
  },
  {
    id: "class-traitor-sacbee-tobacco",
    beat: "class-traitor",
    label: "URL pass: Sacramento Bee — Farallon and tobacco",
    detail:
      "Sacramento Bee October 12, 2016. Source for UST Inc and National Tobacco exposure plus the Gil Duran Steyer-opposed-and-lost-the-vote response.",
    lane: "Editor",
    url: "http://www.sacbee.com/news/politics-government/capitol-alert/article107857907.html",
  },
  {
    id: "class-traitor-sacbee-trump-resorts",
    beat: "class-traitor",
    label: "URL pass: Sacramento Bee — Farallon and Trump Entertainment Resorts",
    detail:
      "Sacramento Bee November 3, 2016. Source for the 558K Trump Entertainment Resorts 2006 disclosure plus Mandalay/Station Casinos/Anchor Gaming.",
    lane: "Editor",
    url: "http://www.sacbee.com/news/politics-government/capitol-alert/article112425947.html",
  },
  {
    id: "class-traitor-bloomberg-exit",
    beat: "class-traitor",
    label: "URL pass: Bloomberg — Steyer steps down at Farallon (second-largest investor after departure)",
    detail:
      "Bloomberg October 22, 2012. CRITICAL source for the honesty caveat: Steyer would remain the second-largest investor in the hedge fund after departure.",
    lane: "Editor",
    url: "https://www.bloomberg.com/news/articles/2012-10-22/farallon-s-steyer-to-step-down-as-spokes-named-manager",
  },
  {
    id: "class-traitor-forbes-exit",
    beat: "class-traitor",
    label: "URL pass: Forbes — Steyer to step down at Farallon",
    detail: "Forbes October 23, 2012. Source for the 20B AUM at exit figure.",
    lane: "Editor",
    url: "https://www.forbes.com/sites/kerryadolan/2012/10/23/california-hedge-fund-billionaire-tom-steyer-to-step-down-at-farallon/",
  },
  {
    id: "class-traitor-nyt-factcheck",
    beat: "class-traitor",
    label: "URL pass: NYT 2020 fact-check on Steyer withdrew-from-fossil-fuels claim",
    detail:
      "NYT January 23, 2020. Source for the somewhat overstated rating on Steyer's 2020 debate claim. Critical for the partial-and-not-instantaneous honesty.",
    lane: "Editor",
    url: "https://www.nytimes.com/2020/01/23/us/politics/tom-steyer-factcheck-investments.html",
  },
  {
    id: "class-traitor-latimes-cca-corecivic",
    beat: "class-traitor",
    label: "URL pass: LA Times — Steyer Farallon record as 2026 issue (CCA to CoreCivic)",
    detail:
      "LA Times April 6, 2026. Source for I deeply regret that Farallon made that investment 2019 quote and the CoreCivic Otay Mesa ICE continuation.",
    lane: "Editor",
    url: "https://www.latimes.com/california/story/2026-04-06/billionaire-candidate-for-california-governor-catching-heat-for-past-business-interests-wealth",
  },
]

const BEATS_UPCOMING: BeatRecord[] = [
  {
    slug: "mahan",
    publicSlug: "mahan",
    title: "$43 million for Matt Mahan. Sixty-one people wrote almost all of it.",
    deck:
      "Matt Mahan's campaign architecture is structurally distinct from every other candidate in the 2026 California Governor field: ~67% of the money is in IE PACs, not the candidate committee. Sixty-one donors funded the two pro-Mahan IEs ($26.95M combined). The candidate committee has 1,519 donors but 99.6% of its $14M came from four-figure-and-up checks. Brian Armstrong (Coinbase CEO) gave $500K to the IE. Mahan voted alone against city-worker raises in 2023. His own 2022 mayoral campaign had to reclassify 18 workers under AB5.",
    prototypeFile: "beat-mahan.html",
    prototypeUrl: "http://localhost:8096/mahan",
    donorListFile: "donors-mahan-2026.html",
    donorListUrl: "http://localhost:8096/donors-mahan-2026",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/mahan.md",
    status: "active",
    verificationSeeds: MAHAN_SEEDS,
    perplexityRounds: [
      { name: "Mahan dossier (Cal-Access primary extraction)", status: "applied (dossier mahan.md)", date: "2026-05-01" },
      { name: "Mahan institutional money audit (full IE PAC verification)", status: "applied (perplexity-research/2026-05-03-mahan-institutional-money-results.md)", date: "2026-05-03" },
      { name: "Mahan public-sector labor conflicts (San Jose mayoralty 2023-2026)", status: "applied (perplexity-research/2026-05-03-mahan-public-sector-labor-results.md)", date: "2026-05-03" },
      { name: "Coinbase / Ripple California regulatory + crypto donor map", status: "applied — surfaced Brian Armstrong $500K to Back to Basics IE + Elena Nadolinski $78,400 to candidate cmte (perplexity-research/2026-05-03-coinbase-ripple-crypto-map-results.md)", date: "2026-05-03" },
    ],
    auditPasses: [
      {
        name: "Cal-Access ingest cross-form TRAN_ID dedup fix",
        date: "2026-05-03",
        status: "applied — Mahan IE numbers were 2x inflated by Form 496 + Form 460 double-reporting. Auto-block totals corrected: Back to Basics $46.74M -> $22.80M, Deliver $6.50M -> $3.27M, Moritz $6M -> $3M. Beat headline locked: $43 million for Matt Mahan. Sixty-one people wrote almost all of it.",
      },
    ],
    editorialChecklist: [
      { label: "Headline locked", detail: '"$43 million for Matt Mahan. Sixty-one people wrote almost all of it." (decided 2026-05-03 after Perplexity numbers verified vs. broken auto-block)', status: "done" },
      { label: "Target ship date", detail: "Week 2 of distribution push (post-May 8)", status: "pending" },
      { label: "Cal-Access RCPT_CD primary verification (post-dedup)", detail: "Verified post-fix: Back to Basics 44 donors / $22.80M, Deliver 17 donors / $3.27M, candidate cmte 1,519 donors / $14.11M, total $40.18M. Perplexity audit shows $43.22M (~$3M higher likely from empty-tran_id rows we filter).", status: "done" },
      { label: "Govern for California funnel architecture", detail: "GfC -> Back to Basics 2-step ($1.5M April 13). Singerman vehicle-shopping documented across 4 committees totaling $1.13M. One-level-up GfC donors include Pritzker $300K, Kelly $250K, Baszucki $200K, Singerman $50K.", status: "done" },
      { label: "Coinbase corporate-cluster pattern", detail: "Brian Armstrong $500K + Elena Nadolinski $78,400 = $578,400 traceable to Coinbase. Mahan is THE crypto candidate of the field.", status: "done" },
      { label: "Labor record anchored", detail: "Lone vote against city-worker raises Sept 15, 2023. 99% strike-authorization vote 4,500 city workers Aug 2023. South Bay Labor Council head Jean Cohen on record. 2022 AB5 misclassification of 18 own campaign workers (state labor commissioner complaint settled).", status: "done" },
      { label: "Prototype HTML", detail: "beat-mahan.html · 948 lines (pre-data-correction; needs full rewrite per locked headline + corrected numbers)", status: "pending" },
      { label: "OG share card", detail: "Pending — add CARDS entry to scripts/render-og-images.cjs when prototype is shipped", status: "pending" },
    ],
  },
  {
    slug: "hilton",
    publicSlug: "hilton",
    title: "Steve Hilton holds stock in an AI startup. His wife runs its comms.",
    deck:
      "Steve Hilton's March 6, 2026 candidate Form 700 puts him personally on Schedule A-1 holding equity in Sierra Technology Inc., a private AI company at $10B valuation chaired by OpenAI board chair Bret Taylor. His spouse Rachel Whetstone is on Schedule C with $100K+ income from the same Sierra as Communications lead. Hilton also discloses ongoing Fox News Network commentator income ($10K-$100K range) while campaigning, alongside a $39,200 contribution from Rupert Murdoch. Donor base: $7.73M from ~15,000 donors, top tier includes Tim Draper, Murdoch, Chris Larsen, John McEntee. Cross-hedge: Sergey Brin and Joe Lonsdale gave both Hilton AND Mahan. Sidebar: a six-person Lighthouse Worldwide Solutions C-suite cluster from Grants Pass / Medford / Jacksonville Oregon gave ~$196K in lockstep on the same December 2025 dates while the corporation gave nothing.",
    prototypeFile: "beat-hilton.html",
    prototypeUrl: "http://localhost:8096/hilton",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/hilton.md",
    status: "active",
    verificationSeeds: HILTON_SEEDS,
    perplexityRounds: [
      { name: "Hilton dossier (Cal-Access primary extraction)", status: "applied (dossier hilton.md)", date: "2026-05-01" },
      { name: "Hilton UK background research (Phase 5e)", status: "applied (ca-gov-2026-hilton-uk-research-2026-05-01.md) — Cameron strategy director, Whetstone career arc, Crowdpac dissolution", date: "2026-05-01" },
      { name: "Hilton UK verifications follow-up", status: "applied (ca-gov-2026-hilton-uk-verifications-2026-05-01.md) — Crowdpac MVL not strike-off, FEC MUR 7309/7399, Hilton v. Weber", date: "2026-05-01" },
      { name: "Hilton US side donor + media network (institutional money audit)", status: "applied — Sierra equity story + Lighthouse Worldwide Oregon C-suite cluster + Fox News commentator income surfaced", date: "2026-05-03" },
      { name: "Hilton remaining gaps follow-up", status: "applied (perplexity-research/2026-05-03-hilton-remaining-gaps-results.md) — Sierra $10B valuation no OpenAI/MS investor, Lighthouse cluster verified, McEntee identity NOT confirmed, Form 700 Fox commentator income confirmed", date: "2026-05-03" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Headline locked", detail: '"Steve Hilton holds stock in an AI startup. His wife runs its comms." (decided 2026-05-03 — David picked angle A from three-option proposal)', status: "done" },
      { label: "Target ship date", detail: "Pending URL-pass and David sign-off; week 2-3 of distribution push", status: "pending" },
      { label: "Form 700 disclosure spine (3 cards)", detail: "Schedule A-1 Sierra equity (Hilton) + Schedule C Sierra income $100K+ (Whetstone) + Schedule C Fox News commentator income $10K-$100K (Hilton). All three rendered as the hero black-banded callout. URL-pass critical: this filing IS the beat.", status: "done" },
      { label: "Sierra → Bret Taylor → OpenAI board chair diagram", detail: "SVG showing both household arrows converging on Sierra, then Sierra chaired by Bret Taylor, who also chairs OpenAI's board. The chairmanship-overlap is the structural fact.", status: "done" },
      { label: "Sacramento AI policy section (SB 1047 + AB 2013)", detail: "Two concrete bills cited: SB 1047 vetoed Sep 2024, AB 2013 in effect Jan 1 2026. Frames why a CA gov AI-equity disclosure is consequential.", status: "done" },
      { label: "Donor base + top 15 table", detail: "$7.73M / 14,989 donors / avg $515. Top 15 includes Murdoch $39.2K, Tim Draper $78.4K, Chris Larsen $39.2K, John McEntee $39.2K. Cross-hedge: Brin and Lonsdale (also gave Mahan).", status: "done" },
      { label: "Lighthouse Oregon C-suite cluster sidebar", detail: "Six employees from Grants Pass / Medford / Jacksonville OR gave ~$196K on same Dec 8/29 2025 dates. Corp gave nothing. Tae Yun Kim (chairman), Paul Newman (president), Thomas Saunders (SVP), Scott Salton (manager), Michael Chunhan (engineer) at $39K each.", status: "done" },
      { label: "Open questions section", detail: "Sierra cap table, recusal protocol, Fox commentator role, Lighthouse ownership, McEntee identity. All flagged as open rather than asserted, per Rule 13 / lane discipline.", status: "done" },
      { label: "MSNBC 2020-election-dodge clip", detail: "DROPPED — David: 'No need to keep the msnbc clip or anything. That was a bad idea from me.' Beat sticks to the structural conflict-of-interest spine.", status: "done" },
      { label: "UK citizenship discrepancy", detail: "EXCLUDED from this beat — open Tier 3 question per dossier (Wikipedia says renounced; April 2026 social says dual). Not load-bearing for the Sierra/AI-conflict thesis. Park for separate handling.", status: "done" },
      { label: "Prototype HTML", detail: "content/hilton/index.html + prototype/beat-hilton.html · ~625 lines. 3 Form 700 cards, 1 SVG (Sierra-OpenAI orbit), 2 receipts tables (top-15 + Lighthouse), 14 sources.", status: "done" },
      { label: "Public-routes.json exposure", detail: "BLOCKED on David URL-pass. Per memory rule feedback_no_auto_public_route.md — Code Claude does not add slug to data/public-routes.json without explicit David authorization. URL-pass runs at /active-beat/hilton in ops.", status: "blocked" },
      { label: "OG share card", detail: "Pending — add CARDS entry to scripts/render-og-images.cjs once URL-pass clears", status: "pending" },
    ],
  },
  {
    slug: "steyer",
    publicSlug: "steyer",
    title: "Tom Steyer wants tighter AI rules. His brother runs the lobby that writes them.",
    deck:
      "Tom Steyer is running for California governor on tighter AI regulation. His brother Jim Steyer founded Common Sense Media in 2003 and has been its CEO for 23 years. Common Sense is the named advocate behind AB-1064 (LEAD for Kids Act, vetoed by Newsom in fall 2025), AB-1709 (social media age limit under 16, pending in Assembly), and AB-2023 (companion chatbot safety + annual third-party audits beginning 2028, pending). Tom and his wife Kat Taylor have donated at least $5M to Common Sense Media per CalMatters May 4 2026 reporting (Jeanne Kuang byline). Bay Area Council quote: 'Common Sense Media would have an outsized influence on California tech policy if Mr. Steyer ends up becoming the governor.' Republican-side mirror is at /hilton (Hilton + Whetstone + Sierra). This story is the Democratic-side parallel: same shape of family-AI conflict, opposite policy direction. The mechanisms differ (Hilton owns equity directly; Steyer's family donates to a nonprofit). The structural-conflict question is what they share.",
    prototypeFile: "beat-steyer.html",
    prototypeUrl: "http://localhost:8096/steyer",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/steyer.md",
    status: "active",
    verificationSeeds: STEYER_SEEDS,
    perplexityRounds: [
      { name: "CalMatters May 4 2026 article (Jeanne Kuang) — re-verified for exact bill numbers and quotes", status: "applied — confirmed AB-1064 / AB-1709 / AB-2023 from 2025-2026 session, Newsom veto on AB-1064, $5M family donations, Bay Area Council and Consumer Watchdog quotes, Tom Steyer's response", date: "2026-05-04" },
      { name: "Bill verification round — leginfo.legislature.ca.gov direct fetch of all three bills", status: "applied — AB-1064 LEAD for Kids Act (Bauer-Kahan, enrolled 2025-09-15), AB-1709 covered platforms age restriction (Lowenthal et al + Sen Allen, last amended 2026-04-23), AB-2023 companion chatbots children's safety (Wicks + Bauer-Kahan + Sen Padilla, last amended 2026-04-27)", date: "2026-05-04" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Headline locked", detail: '"Tom Steyer wants tighter AI rules in California. His brother runs the lobby that writes them." Mirrors the /hilton hook structure (candidate stated position followed by family-financial-tie revelation).', status: "done" },
      { label: "Target ship date", detail: "Pending URL-pass and David sign-off. CalMatters published May 4 2026 — news-cycle window narrowing through June 2 primary.", status: "pending" },
      { label: "Three-card spine callout", detail: "Tom (the candidate, blue spine) + Jim (the brother) + the bills (AB-1064 / AB-1709 / AB-2023). Status badges VETOED · PENDING · PENDING. Family-donation figure $5M+ on the candidate card.", status: "done" },
      { label: "Bill detail section — three subsection cards with verified leginfo provisions", detail: "Each bill: official title, what it would do, who introduced it, status, direct link to leginfo. Vetoed bill (AB-1064) red-bordered. Pending bills (AB-1709, AB-2023) blue-bordered. All provisions quoted from the Legislative Counsel's Digest.", status: "done" },
      { label: "Consequences section — what each bill would actually do", detail: "Three rows (one per bill), each split into two cells: what changes for users / what changes for platforms or AI operators. Closing red-bordered structural-point row showing what all three share and where Common Sense fits in the regulatory ecosystem.", status: "done" },
      { label: "Named-figure quotes — Bay Area Council + Consumer Watchdog + Tom Steyer", detail: "Three pull-quotes reproduced from CalMatters: Peter Leroe-Munoz (Bay Area Council, the conflict-flag quote), Jamie Court (Consumer Watchdog, the brother-policy-difference framing), Tom Steyer (the 'I don't slavishly follow him' response).", status: "done" },
      { label: "See-also block linking to /hilton", detail: "Red-bordered see-also card at the end framing the Hilton story as the Republican-side mirror. Brief paragraph (does not redo Hilton's content), CTA button to /hilton.", status: "done" },
      { label: "Boundary block — six explicit non-claims", detail: "Not illegal. Not corruption. Not quid pro quo. Not a critique of Common Sense Media as an organization. Not an accusation against Jim. Not equating to Hilton factually (Steyer doesn't own the nonprofit; Hilton owns equity in a for-profit). Each boundary explicit on the page.", status: "done" },
      { label: "Sources block", detail: "8 sources: CalMatters article, three leginfo bill pages, Common Sense Media homepage, ProPublica Form 990 search, Brown v. EMA SCOTUS opinion, Hilton cross-reference. Methodology paragraph at the bottom.", status: "done" },
      { label: "Prototype HTML", detail: "content/steyer/index.html + prototype/beat-steyer.html · ~530 lines. 3 spine cards, 3 bill cards (one per bill), 3 consequence rows + 1 structural-point row, 3 pull quotes, 1 see-also block, 1 boundary block, 8 sources.", status: "done" },
      { label: "Public-routes.json exposure", detail: "BLOCKED on David URL-pass. Per memory rule feedback_no_auto_public_route.md — Code Claude does not add slug to data/public-routes.json without explicit David authorization. URL-pass runs at /active-beat/steyer in ops.", status: "blocked" },
      { label: "OG share card", detail: "Pending — render via scripts/render-og-images.cjs after URL-pass clears. Suggested treatment: typography card with the parallel hook structure, similar to the Hilton typography variant, blue accent matching the spine.", status: "pending" },
    ],
  },
  {
    slug: "cop-coddler",
    publicSlug: "cop-coddler",
    title: "The state's top coddler of bad cops",
    deck:
      "As California AG, Xavier Becerra refused SB 1421 misconduct records on his own DOJ officers, sued by First Amendment Coalition + KQED. Threatened two Berkeley journalists with criminal prosecution over a 12,000-name convicted-cop list. ~$300K in 2018 from police unions; continues taking the money in 2026.",
    prototypeFile: "beat-cop-coddler.html",
    prototypeUrl: "http://localhost:8096/cop-coddler",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/becerra.md",
    status: "active",
    verificationSeeds: [],
    perplexityRounds: [
      { name: "Becerra non-healthcare donor machine (Section 8 AG record)", status: "applied (Section 8.3.4)", date: "2026-05-02" },
      { name: "2026-specific police-union categorical totals", status: "queued (follow-up Perplexity round)", date: "queued" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Target ship date", detail: "May 20, 2026 (Wed)", status: "pending" },
      { label: "SB 1421 enforcement timeline (Jan-Feb 2019)", detail: "Primary-source verified via KQED Feb 5 + Feb 26 + March 5, 2019; FAC Feb 14, 2019; Freedom of the Press Foundation March 5, 2019; CalMatters Feb 22, 2021", status: "done" },
      { label: "2026 police-union categorical totals", detail: "Pending dedicated Perplexity round on Becerra's law-enforcement donor base", status: "pending" },
      { label: "Prototype HTML", detail: "beat-cop-coddler.html · 886 lines", status: "done" },
    ],
  },
  {
    slug: "bearstar-octopus",
    publicSlug: "bearstar-octopus",
    title: "Bearstar Octopus: one shop, three IEs, Newsom-orbit",
    deck:
      "Bearstar Strategies + Polaris Campaigns + Jim DeBoo. The political-consulting infrastructure running both sides of the 2026 California gov primary. Process journalism on California's machine.",
    prototypeFile: "(not yet built)",
    prototypeUrl: "",
    dossierPath: "content/Admin Notes/emerging-beat-candidates.md",
    status: "upcoming",
    verificationSeeds: [],
    perplexityRounds: [
      { name: "Bearstar + Polaris client maps", status: "applied (Prompt #4)", date: "2026-05-02" },
      { name: "BOCC sponsor structural resolution (DeBoo + Bearstar + Matier + Deane & Co + Negrete)", status: "applied (Prompt #2)", date: "2026-05-02" },
      { name: "Williamson federal indictment context (C-004 candidate)", status: "applied (LA Times Nov 13 2025 + KCRA May 1 2026)", date: "2026-05-02" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Target ship date", detail: "May 27, 2026 (Wed)", status: "pending" },
      { label: "Perplexity material now primary-source verified", detail: "Polaris $13.78M VERIFIED via 5 Cal-Access EXPN_CD payments. Bearstar simultaneous on Swalwell + Steyer + Becerra IEs confirmed by Politico Apr 17 + KCRA May 1.", status: "done" },
      { label: "Williamson/Collaborative thread", detail: "C-004 in emerging-beat-candidates.md. Could be third act of this beat or its own follow-up.", status: "pending" },
      { label: "Prototype HTML", detail: "Not yet built", status: "pending" },
    ],
  },
  {
    slug: "carace26-map",
    publicSlug: "carace26-map",
    title: "California 2026 Governor: Where the money actually flows",
    deck:
      "Cross-candidate hedge bets, industry wars, shell aggregations. Eight candidates, 55 named donors, 8 multi-candidate hedges, 17 industry tags. Interactive D3 force-directed graph at the top — hover any candidate to see their donors, hover any donor to see which candidates they fund. Backed by per-candidate dossier extracts in content/Admin Notes/ca-gov-2026-dossiers/. Replaces the typography-only Iteration 0 hero with a dense, hoverable visualization that turns the editorial argument into a map readers can read.",
    prototypeFile: "beat-carace26-map.html",
    prototypeUrl: "http://localhost:8096/carace26-map",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/_summary.md",
    status: "active",
    verificationSeeds: CARACE26_MAP_SEEDS,
    perplexityRounds: [
      { name: "Anti-IE fairness audit across all 8 candidates", status: "applied — confirmed Steyer uniquely targeted in voter-facing anti-IE money. Anti-Steyer coalition expanded from $10M (PG&E + IBEW only) to $30M+ verified (added JOBSPAC $5M, CA Realtors IE $5M, CA BIA $1M, CCPOA $25K). Mahan has $61K research-only from public-sector-labor Opportunity PAC. Six other candidates have ZERO anti-IE money. Filed at content/Admin Notes/perplexity-research/2026-05-04-anti-ie-fairness-audit.md.", date: "2026-05-04" },
      { name: "Race-map verification gaps + cross-cutter discovery (8 questions)", status: "applied — Larsen identity high-confidence same-person, M&D/Downs primary records confirm officer overlap, CRC + Leon separate transactions, $2M Working Families IE PAC for Becerra surfaced, Habematolel Villa total $59.2K not $79K, Pechanga 3-way cross-party tribal hedge surfaced, Spencer-Hilton donor confirmed Fresno developer not alt-right, McEntee verified. Filed at content/Admin Notes/perplexity-research/2026-05-04-race-map-verification.md.", date: "2026-05-04" },
      { name: "Porter donor + contradiction", status: "applied (Prompt #5) — surfaced Uber Innovation PAC $150K + plaintiff-bar concentration + Larsen Porter-Hilton hedge", date: "2026-05-03" },
      { name: "Porter app-based worker classification (follow-up)", status: "applied — confirmed PRO Act Yea vote 2021 + NO DATA on 2026 AB5/Prop 22 position + NO press has asked her about Uber money (perplexity-research/2026-05-03-porter-app-worker-classification-results.md)", date: "2026-05-03" },
      { name: "Porter Uber press-coverage accountability audit (meta-press)", status: "applied — quantified asymmetry: Porter-Uber 0 accountability articles, Becerra-Chevron 5+, Villaraigosa-fossil 4+, Mahan-Armstrong 3+ donor-base mentions but 0 direct asks. Surfaces Mahan-Armstrong as a parallel accountability gap. Uber Innovation PAC giving map: Newsom Yes on Prop 1 $58,500, oppose-DeMaio $100K, CA GOP State $25K, Women in Power PAC, others. Per Politico Feb 7 2024, Teamsters alarmed Uber would pour $30M into CA politics via this PAC. (perplexity-research/2026-05-03-porter-uber-press-coverage-results.md)", date: "2026-05-03" },
      { name: "Bianco donor + LE money", status: "applied (Prompt #6)", date: "2026-05-02" },
      { name: "Bianco institutional money audit (M&D + Downs)", status: "applied", date: "2026-05-03" },
      { name: "Villaraigosa donor + post-mayor income", status: "applied (Prompt #7)", date: "2026-05-02" },
      { name: "Hilton US side donor + media network", status: "applied (Prompt #8) — Sierra equity story + Lighthouse Worldwide Oregon C-suite cluster + Fox News commentator income", date: "2026-05-03" },
      { name: "Hilton remaining gaps follow-up", status: "applied — confirmed US citizenship 2021 + Sierra $10B valuation no OpenAI/MS + Lighthouse cluster verified + McEntee identity NOT confirmed (perplexity-research/2026-05-03-hilton-remaining-gaps-results.md)", date: "2026-05-03" },
      { name: "Mahan institutional money + public-sector labor + Coinbase crypto", status: "applied (3 separate Perplexity rounds)", date: "2026-05-03" },
      { name: "Resnick / Wonderful water-rights cross-candidate hedge", status: "applied — $545K across 5 candidate cmtes + Newsom Yes on 50; Tier 1 State Water Board 2025 order names Wonderful Nut Orchards", date: "2026-05-03" },
    ],
    auditPasses: [
      {
        name: "Cal-Access ingest cross-form TRAN_ID dedup fix",
        date: "2026-05-03",
        status: "applied — affects all CA Gov 2026 candidate auto-blocks. IE-PAC totals were 2x inflated; candidate-committee totals largely unaffected.",
      },
    ],
    editorialChecklist: [
      { label: "Target ship date", detail: "June 1, 2026 (Mon, primary-eve)", status: "pending" },
      { label: "Per-candidate Perplexity parity", detail: "All four follow-up prompts (Porter, Hilton-followup, Resnick, Coinbase, Mahan-labor) applied 2026-05-03. Two macro cross-hedge stories now anchored: Bay Area capital (Brin/Caruso/Moritz) + Agribusiness/water (Resnicks).", status: "done" },
      { label: "Prototype HTML built", detail: "content/carace26-map/index.html + prototype/beat-carace26-map.html · ~1700 lines. Iteration 0 (static SVG hero) → Iteration 1 (D3 force-directed graph, 60 donors / 78 edges / 15 hedges / 6 cross-party) → §0 explainer for normies → §5 'Why this matters' kill-shot per ChatGPT critique → Mahan $0 callout. U-shape candidate ring pinned, donors orbit. Tooltip transparency applied.", status: "done" },
      { label: "Race-map verification round (8 questions)", detail: "Perplexity verification round filed 2026-05-04 closed: Larsen identity, M&D/Downs primary-source check, CRC + Leon dedup, $2M Becerra IE PAC discovery (Working Families), Habematolel Villa total correction $79K → $59K + Thurmond add-on $39K, Pechanga 3-way cross-party tribal hedge surfaced, Spencer-Hilton donor confirmed Fresno developer (not alt-right), McEntee no business relationship to Hilton/Whetstone. All applied to graph data + share card + §1 hedge table + §3 M&D framing.", status: "done" },
      { label: "Anti-candidate IE coverage fairness audit", detail: "Perplexity audit applied 2026-05-04 (perplexity-research/2026-05-04-anti-ie-fairness-audit.md). Confirmed: 6 candidates (Hilton, Bianco, Becerra, Porter, Villaraigosa, Thurmond) have ZERO voter-facing anti-IE money. Mahan has $61K research-only from Opportunity PAC (CNA + CTA + CSEA + CFT + Cal Lab Fed). Steyer is uniquely targeted: $30M+ source money + $20M+ verified IE spending from PG&E + JOBSPAC + CA Realtors IE + CA BIA + IBEW 1245 + CCPOA. Map updated: 4 new anti-Steyer edges + 1 anti-Mahan edge added. New §6 'Who the system attacks' reveal block names the asymmetry as the closing image.", status: "done" },
      { label: "OG share-card render", detail: "Registered in scripts/render-og-images.cjs (slug: 'carace26-map', headline: 'Eight candidates. 55 donors. 8 hedge bets.'). NOT yet executed — needs `node scripts/render-og-images.cjs` from main repo (worktree has no node_modules). Headline counts may need updating to 60/15/6 to match current state before render.", status: "pending" },
      { label: "ShareCardFull SVG component", detail: "ops/src/components/ShareCardFull.tsx · RaceMapGraphic() built · cream/yellow/red brutalist styling · cross-party hedge receipt band shows top 4 by combined dollar (Brin / PORAC / Highland / Pechanga 3-way). Mirror in prototype/share-cards-2026-05-03.html as card-5.", status: "done" },
      { label: "Memes-catalog distribution kit", detail: "3 entries in memes-catalog.ts: may4-carace26-map-share (master, shareCardKind: 'carace26-map'), may4-carace26-map-meme-cross-party (5-row receipt-stack thumbnail), may4-carace26-map-meme-pge-bury (typography punchline tagged to /class-traitor too).", status: "done" },
      { label: "Public-routes.json exposure", detail: "BLOCKED on David URL-pass + sign-off. Per memory rule feedback_no_auto_public_route.md — Code Claude does not add slug to data/public-routes.json without explicit David authorization. URL-pass runs at /active-beat/carace26-map in ops.", status: "blocked" },
    ],
  },
  {
    slug: "bianco-ballots",
    publicSlug: "bianco-ballots",
    title: "The sheriff seized 650,000 ballots. The judge who signed the warrant was one he had endorsed.",
    deck:
      "Chad Bianco, Riverside County Sheriff and Republican gubernatorial candidate (polling 12-14%, qualified for May 5 CNN debate), seized 650,000 ballots from the 2025 Proposition 50 redistricting referendum on a warrant signed by a judge he had publicly endorsed in 2022. CalMatters Mar 26 2026 + Apr 21 2026 anchors the seizure + warrant + endorsement chain. LAist Oct 5 2021 + NPR Oct 6 2021 confirms his 2014 Oath Keepers membership via the 2021 Anonymous Epik leak. SF Chronicle Mar 31 2026 documents an FPPC single-source aggregation question: $78,400 from M&D Development + $78,400 from Downs Energy on the same December 30 2025 day — entities share addresses and management. Plus the Riverside developer / law-enforcement donor stack ($143,720 deduplicated LE money) operating inside the jurisdiction his sheriff's department polices. Plus Highland Fairview cross-party signal (Iddo Benzeevi gave Bianco $39,200 + Villaraigosa $72,800 + Riverside Sheriffs' Association PEF $49,000 + Moving California Forward $69,000). Hero SVG: ballot seizure spine + warrant signed by judge he endorsed. 8 H2 sections + receipts table + sources block. Drafted 2026-05-02. Mirrored to content/ tree 2026-05-07.",
    prototypeFile: "beat-bianco-ballots.html",
    prototypeUrl: "http://localhost:8096/bianco-ballots",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/bianco.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "bianco-cal-access-1479095",
        beat: "bianco-ballots",
        label: "URL pass: Cal-Access · Bianco for Governor 2026 (FPPC 1479095)",
        detail:
          "THE SPINE. Anchors all 2026-cycle donor figures: M&D Development $78,400 + Downs Energy $78,400 (both Dec 30 2025 — the FPPC aggregation question), Highland Fairview $39,200 (Iddo Benzeevi multi-direction giving signal), RJ Noble $35,000 (county road contractor), Mediwaste $20,000 (medical waste contractor under sheriff jurisdiction), plus the law-enforcement donor stack totaling ~$143,720 deduplicated. Total committee raised $4.47M from 7,324 donors. Verify each named entity + amount on the Cal-Access committee detail page.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1479095",
      },
      {
        id: "bianco-sf-chronicle-aggregation-mar2026",
        beat: "bianco-ballots",
        label: "URL pass: SF Chronicle Mar 31 2026 — M&D Development / Downs Energy aggregation question",
        detail:
          "LOAD-BEARING for the aggregation framing. The SF Chronicle article documents that M&D Development and Downs Energy share business addresses and are operated by sibling-managed entities, raising an FPPC single-source aggregation question on the $156,800 combined contribution that landed Dec 30 2025. Bill Essayli quote on record. The 'two checks from one source' framing depends on this verification. ADR-0030 §11 covers SF Chronicle fetches.",
        lane: "Editor",
        url: "https://www.sfchronicle.com/politics/article/contributions-bianco-violate-state-campaign-rules-22160676.php",
      },
      {
        id: "bianco-calmatters-ballot-seizure-mar2026",
        beat: "bianco-ballots",
        label: "URL pass: CalMatters Mar 26 2026 — 650,000 Prop 50 ballot seizure",
        detail:
          "Anchors the headline claim. The CalMatters article documents Bianco's Riverside County Sheriff's Department seizure of approximately 650,000 ballots from the 2025 Proposition 50 redistricting referendum. Verify the ballot count, the warrant existence, and the operational scope (was it 650K total ballots in the county or 650K seized by the warrant specifically). ADR-0030 §11 covers CalMatters fetches.",
        lane: "Editor",
        url: "https://calmatters.org/politics/2026/03/chad-bianco-ballots-seized-riverside/",
      },
      {
        id: "bianco-calmatters-cspoa-emails-apr2026",
        beat: "bianco-ballots",
        label: "URL pass: CalMatters Apr 21 2026 — CSPOA emails / endorsing-judge document trail",
        detail:
          "Anchors the 'judge he had endorsed' framing AND the Constitutional Sheriffs and Peace Officers Association (CSPOA) affiliation. CalMatters investigation surfaced internal Riverside Sheriff emails documenting both the 2022 endorsement of the judge who later signed the seizure warrant AND Bianco's CSPOA correspondence. Verify both threads against the original article before publishing.",
        lane: "Editor",
        url: "https://calmatters.org/investigation/2026/04/chad-bianco-emails/",
      },
      {
        id: "bianco-laist-oath-keepers-oct2021",
        beat: "bianco-ballots",
        label: "URL pass: LAist Oct 5 2021 — 2014 Oath Keepers membership",
        detail:
          "Anchors the 2014 Oath Keepers prior. LAist's October 2021 reporting confirmed Bianco was on the Oath Keepers membership list leaked by Anonymous through the September 2021 Epik hack and DDoSecrets distribution. Bianco confirmed and defended the membership at the time. Verify the article still loads and the 2014 membership-year specificity is in the published text.",
        lane: "Editor",
        url: "https://laist.com/news/criminal-justice/riverside-sheriff-chad-bianco-once-was-an-oath-keeper-defends-the-extremist-group",
      },
      {
        id: "bianco-npr-oath-keepers-oct2021",
        beat: "bianco-ballots",
        label: "URL pass: NPR Oct 6 2021 — Oath Keepers cross-corroboration",
        detail:
          "Cross-corroboration for the LAist Oath Keepers reporting (independent confirmation by a second Tier 1 outlet). NPR's piece independently verified Bianco's membership. The two-source citation pattern is what the beat needs for the Oath Keepers section to clear lane discipline.",
        lane: "Editor",
        url: "https://www.npr.org/2021/10/06/1043651361/oath-keepers-california-sheriff-chad-bianco-january-6-us-capitol",
      },
      {
        id: "bianco-highland-fairview-cross-party",
        beat: "bianco-ballots",
        label: "URL pass: Highland Fairview cross-candidate signal (Bianco + Villaraigosa + Sheriffs PEF)",
        detail:
          "Anchors the Iddo Benzeevi multi-direction giving claim. Highland Fairview gave Bianco $39,200 + Villaraigosa $72,800 + Riverside Sheriffs' Association Political Empowerment Fund $49,000 + Moving California Forward $69,000. The cross-party hedge (Republican Bianco + Democrat Villaraigosa from the same Riverside developer) is an editorially powerful structural fact — verify each amount against the corresponding Cal-Access committee detail page.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1471635",
      },
      {
        id: "bianco-cspoa-affiliation-public",
        beat: "bianco-ballots",
        label: "URL pass: CSPOA public-affiliation verification",
        detail:
          "The Constitutional Sheriffs and Peace Officers Association affiliation should be verified against either CSPOA's own public membership/endorsement records or the SPLC / ADL / other watchdog tracking of CSPOA-affiliated officials. The 'militia-adjacent affiliation' framing depends on the affiliation being current as of 2026, not just 2014-era. Confirm the relationship was active during Bianco's 2026 gubernatorial campaign.",
        lane: "Editor",
        url: "https://www.splcenter.org/fighting-hate/extremist-files/group/constitutional-sheriffs-and-peace-officers-association",
      },
      {
        id: "bianco-corona-staff-report-md-downs",
        beat: "bianco-ballots",
        label: "URL pass: City of Corona staff report — M&D operates Downs Energy",
        detail:
          "Corona, CA city council staff reports document M&D Development as the operating entity behind Downs Energy at the shared Corona location. This is the primary-source corroboration for the 'M&D operates Downs' link that the SF Chronicle reporting referenced. Search Corona city agenda packets for the relevant entitlement or business-license item naming both entities. Provides the second-source basis for the FPPC aggregation framing alongside SF Chronicle.",
        lane: "Editor",
        url: "https://www.coronaca.gov/government/agendas-minutes",
      },
    ],
    perplexityRounds: [
      { name: "Bianco donor + LE money + Oath Keepers + ballot seizure", status: "applied (Prompt #6)", date: "2026-05-02" },
      { name: "Bianco institutional money audit (M&D + Downs aggregation question + 5 industry donor classes)", status: "applied (perplexity-research/2026-05-03-bianco-institutional-money-results.md)", date: "2026-05-03" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Headline locked", detail: '"The sheriff seized 650,000 ballots. The judge who signed the warrant was one he had endorsed." (locked 2026-05-02, mirrored 2026-05-07)', status: "done" },
      { label: "Target ship date", detail: "Week 2 of distribution push (post-May 8). Fastest GOP-side beat to ship. Bianco polling 12-14%, qualified for May 5 CNN debate, plausibly competitive for top-2 in June 2 primary.", status: "pending" },
      { label: "Source material exists", detail: "C-005 in emerging-beat-candidates.md; Cal-Access RCPT_CD verified for committee 1479095 ($4.47M / 7,324 donors). Two May 2026 Perplexity rounds applied: institutional-money audit + Oath Keepers / ballot-seizure cross-reference.", status: "done" },
      { label: "Hero SVG / spine visualization", detail: "Ballot seizure spine visualization at top of beat — 650,000 ballots + warrant signed by judge he endorsed. Defamation framing tight: every claim sourced to a Tier 1 or Tier 2 outlet's reporting, not new factual assertion by us.", status: "done" },
      { label: "M&D / Downs Energy aggregation question (lead angle)", detail: "$78,400 from M&D Development + $78,400 from Downs Energy on the same Dec 30 2025 day. SF Chronicle Mar 31 2026 reported entities share addresses and management. City of Corona staff reports corroborate M&D operating Downs at the shared site. Bill Essayli on record. Tier 1 Cal-Access rows + Tier 2 multi-publication coverage. Defamation surface low.", status: "done" },
      { label: "Highland Fairview cross-party signal", detail: "Iddo Benzeevi gave Bianco $39,200 + Villaraigosa $72,800 + Riverside Sheriffs' Association PEF $49,000 + Moving California Forward $69,000. Same Riverside developer giving across party lines is the structural fact — pairs editorially with /villaraigosa-pledge.", status: "done" },
      { label: "Oath Keepers prior · double-source verified", detail: "LAist Oct 5 2021 + NPR Oct 6 2021 independently confirmed 2014 membership via the 2021 Anonymous Epik leak. Bianco confirmed and defended the membership on record. Two-source threshold cleared.", status: "done" },
      { label: "CSPOA affiliation", detail: "Constitutional Sheriffs and Peace Officers Association affiliation documented in CalMatters Apr 21 2026 internal-emails investigation. Militia-adjacent national-political-violence dimension is what differentiates this beat from the Steyer/Becerra material in tone and stakes.", status: "done" },
      { label: "Structural cleanup 2026-05-07", detail: "Mirrored prototype/beat-bianco-ballots.html → content/bianco-ballots/index.html so Quartz can build it. Validated: 8 TOC items + 8 H2 sections + balanced article/div tags + 0 em-dashes in body prose + no AI vernacular + no duplicate article tags (cleaner than Villaraigosa was on intake).", status: "done" },
      { label: "Prototype HTML", detail: "prototype/beat-bianco-ballots.html (1033 lines) + content/bianco-ballots/index.html (mirrored 2026-05-07). Hero SVG + 8 H2 sections + receipts table + sources block + methodology paragraph.", status: "done" },
      { label: "Verification seeds populated", detail: "9 seeds covering Cal-Access committee 1479095, SF Chronicle aggregation piece, CalMatters ballot-seizure piece, CalMatters CSPOA-emails investigation, LAist + NPR Oath Keepers double-source, Highland Fairview cross-party, CSPOA public-affiliation cross-check, Corona city staff reports for M&D-operates-Downs corroboration. URL-pass runs at /active-beat/bianco-ballots in ops.", status: "done" },
      { label: "Public-routes.json exposure", detail: "BLOCKED on David URL-pass + sign-off. Per memory rule feedback_no_auto_public_route.md.", status: "blocked" },
      { label: "OG share card", detail: "Pending — add CARDS entry to scripts/render-og-images.cjs once URL-pass clears", status: "pending" },
    ],
  },
  {
    slug: "villaraigosa-pledge",
    publicSlug: "villaraigosa-pledge",
    title: "The pledge he broke. The donors who took it.",
    deck:
      "In 2018, Antonio Villaraigosa signed a public pledge: no contributions from oil companies or named fossil-fuel executives. He has not re-signed it in 2026. His Cal-Access committee 1471635 ledger shows $464,800 from California's biggest oil and gas producers and a major natural-gas vehicle-fueling company: $72,800 from California Resources Corporation (state's largest oil-and-gas producer), $78,400 each from Chevron, Marathon Petroleum, and Berry Corporation, plus $156,800 from Clean Energy. He is the only major Democrat in the field opposing single-payer healthcare while taking $78,400 from AltaMed, $78,400 from COPE Healthcare Consulting, and $15,000 from Fresenius Medical Care (German-owned dialysis giant currently litigating against California regulation per April 2026 Ninth Circuit case 24-3655). Post-mayor income trail: Mercury Public Affairs (clients included Hyundai, Qatar, Turkey, CCSA, Westlands, Clorox, Lyft per LA Times Oct 7 2021), Actum LLC (Hungary's government per Axios Jan 27 2022), $381,820 paid by California Forward as Newsom's 'infrastructure czar' (funded by Port of San Diego, SoCalGas, Doordash, Disney, Southern California Edison, AT&T, California Communications Association per CalMatters June 17 2025). And the structural rejection: Reed Hastings put $7M into the 2018 IE supporting Villaraigosa through CCSA Advocates. Hastings's 2026 governor money went to Mahan instead. The candidate who ran in 2018 as the donor class's investment vehicle is running in 2026 as the candidate the donor class moved off of, while still taking maxes from the industry he had once promised to refuse. Drafted 2026-05-02, structurally cleaned 2026-05-07 (duplicate article tag fixed, mirrored to content/ tree).",
    prototypeFile: "beat-villaraigosa-pledge.html",
    prototypeUrl: "http://localhost:8096/villaraigosa-pledge",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/villaraigosa.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "villaraigosa-cal-access-1471635",
        beat: "villaraigosa-pledge",
        label: "URL pass: Cal-Access · Antonio Villaraigosa for Governor 2026 (FPPC 1471635)",
        detail:
          "THE SPINE. Anchors all 2026-cycle donor figures: California Resources Corp $72,800, Chevron $78,400, Marathon Petroleum $78,400, Berry Corporation $78,400, Clean Energy $156,800 (total fossil/natural-gas $464,800). Healthcare-industry block: AltaMed $78,400, COPE Healthcare Consulting $78,400, Fresenius Medical Care $15,000. Verify each name + amount on the Cal-Access committee detail page. The Clean Energy entry covers two cycles (primary plus general tranches) per Cal-Access cumulative reporting; verify both rows.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1471635",
      },
      {
        id: "villaraigosa-latimes-pledge-broken-may26-2025",
        beat: "villaraigosa-pledge",
        label: "URL pass: LA Times May 26, 2025 — broken fossil-fuel pledge",
        detail:
          "LOAD-BEARING for the 2018 pledge framing. The LA Times article documents Villaraigosa's 2018 pledge not to take oil-company or named-fossil-fuel-executive contributions, and his 2026 acceptance of those contributions without re-signing. The article also captures his 'all-of-the-above' framing and the 'poppycock' quote on California oil-production restrictions. ADR-0030 §11 carve-out covers a fetch of LA Times for quote verification.",
        lane: "Editor",
        url: "https://www.latimes.com/politics/story/2025-05-26/oil-villaraigosa-fossil-fuel-governors-race",
      },
      {
        id: "villaraigosa-calmatters-infrastructure-czar-jun2025",
        beat: "villaraigosa-pledge",
        label: "URL pass: CalMatters June 17, 2025 — infrastructure czar / California Forward funding",
        detail:
          "Anchors the $381,820 figure paid by California Forward and the named donor list (Port of San Diego, SoCalGas, Doordash, Disney, Southern California Edison, AT&T, California Communications Association). The 'paid by entities with active state regulatory exposure while serving as Newsom advisor' framing depends on this verification. ADR-0030 §11 covers CalMatters fetches for quote/figure verification.",
        lane: "Editor",
        url: "https://calmatters.org/politics/2025/06/california-newsom-villaraigosa-infrastructure-project/",
      },
      {
        id: "villaraigosa-latimes-single-payer-nov2025",
        beat: "villaraigosa-pledge",
        label: "URL pass: LA Times November 8, 2025 — single-payer opposition",
        detail:
          "Anchors the 'only major Democrat in the field opposing single-payer' framing. Verify Villaraigosa is on record opposing single-payer in this article and that no other Democrat in the 2026 field (Becerra, Porter, Steyer, Mahan, Thurmond) is similarly on record opposing.",
        lane: "Editor",
        url: "https://www.latimes.com/california/story/2025-11-08/democrats-running-for-governor-talk-about-healthcare",
      },
      {
        id: "villaraigosa-latimes-mercury-oct2021",
        beat: "villaraigosa-pledge",
        label: "URL pass: LA Times October 7, 2021 — Mercury Public Affairs client list",
        detail:
          "Anchors the Mercury Public Affairs client list (Hyundai, Qatar, Turkey, CCSA, Westlands, Clorox, Lyft). Verify Villaraigosa worked at Mercury between mayoralty and 2018 governor run, and that the cited clients were Mercury clients during his tenure. The 'selling influence to foreign governments' framing depends on the Qatar and Turkey verifications specifically.",
        lane: "Editor",
        url: "https://www.latimes.com/politics/story/2021-10-07/former-elected-leaders-nunez-boxer-villaraigosa-mercury-public-affairs",
      },
      {
        id: "villaraigosa-axios-actum-hungary-jan2022",
        beat: "villaraigosa-pledge",
        label: "URL pass: Axios January 27, 2022 — Actum LLC Hungary engagement",
        detail:
          "Anchors the Actum LLC Hungary engagement claim. Verify Villaraigosa moved from Mercury to Actum, and that Actum's Hungarian-government work overlapped with his tenure. FARA filings (Foreign Agents Registration Act) at the Department of Justice are the corroborating primary source.",
        lane: "Editor",
        url: "https://www.axios.com/2022/01/27/villaraigosa-actum-hungary-lobbying",
      },
      {
        id: "villaraigosa-ninth-circuit-fresenius-apr2026",
        beat: "villaraigosa-pledge",
        label: "URL pass: Ninth Circuit April 7, 2026 — Fresenius v. California regulation (case 24-3655)",
        detail:
          "Anchors the 'Fresenius Medical Care currently litigating against California regulation while donating to a CA gov candidate' framing. Verify the case number, the April 7 2026 opinion date, and that Fresenius is the appellant against a California state agency. ADR-0030 §1 covers court.gov / cdn.ca9.uscourts.gov fetches as government primary sources.",
        lane: "Editor",
        url: "https://cdn.ca9.uscourts.gov/datastore/opinions/2026/04/07/24-3655.pdf",
      },
      {
        id: "villaraigosa-fppc-2018-ie-22m",
        beat: "villaraigosa-pledge",
        label: "URL pass: FPPC June 2018 Primary Election top-10 contributors archive",
        detail:
          "Anchors the $22M 2018 IE total flowing through California Charter Schools Association Advocates (CCSA-IE). Verify the 2018 top-10 contributors archive shows Reed Hastings as the largest contributor to the pro-Villaraigosa CCSA Advocates IE. KQED April 13, 2018 has the original reporting.",
        lane: "Editor",
        url: "https://www.fppc.ca.gov/transparency/top-contributors.html",
      },
      {
        id: "villaraigosa-fppc-2026-hastings-mahan",
        beat: "villaraigosa-pledge",
        label: "URL pass: FPPC June 2026 Primary Election top-10 contributors (Hastings to Mahan)",
        detail:
          "Anchors the 'Hastings's 2026 governor money went to Mahan instead' structural rejection point. Verify Hastings's 2026 contribution to the Mahan IE PAC (Back to Basics California, FPPC 1487425) and the absence of any 2026 Hastings contribution to a Villaraigosa committee or pro-Villaraigosa IE.",
        lane: "Editor",
        url: "https://www.fppc.ca.gov/transparency/top-contributors.html",
      },
    ],
    perplexityRounds: [
      { name: "Villaraigosa donor + post-mayor income + fossil fuel pledge break", status: "applied (Prompt #7)", date: "2026-05-02" },
      { name: "Resnick / Wonderful Company water-rights regulatory exposure", status: "applied — Wonderful Nut Orchards named in State Water Board 2025 order; Resnick gave $72,800 + cross-candidate hedge ($545K across 5 cmtes including Mahan/Swalwell/Becerra/Newsom Yes on 50)", date: "2026-05-03" },
      { name: "Coinbase / Ripple California regulatory + crypto donor map", status: "applied — Villaraigosa joined Coinbase global advisory council April 2024 (LA Times); paid adviser through 2026 governor run", date: "2026-05-03" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Headline locked", detail: '"The pledge he broke. The donors who took it." (locked 2026-05-02; structurally cleaned 2026-05-07)', status: "done" },
      { label: "Target ship date", detail: "Week 2 of distribution push (post-May 8). Strongest contradiction in the Dem field. June 2 primary in 26 days.", status: "pending" },
      { label: "Source material exists", detail: "C-006 in emerging-beat-candidates.md; Cal-Access RCPT_CD verified for committee 1471635; LA Times May 26 2025 + CalMatters Jun 17 2025 + LA Times Nov 8 2025 + LA Times Oct 7 2021 + Axios Jan 27 2022 + Ninth Circuit Apr 7 2026 (case 24-3655) all anchored as verification seeds.", status: "done" },
      { label: "Hero SVG (2018 pledge ↔ 2026 ledger)", detail: "Two-column 900x460 SVG with yellow 2018 pledge box on the left ('I will not accept contributions from oil companies or named fossil-fuel executives'), 8-year arrow center, black 2026 ledger box on the right naming each fossil-fuel donor + amount + total $464,800. The visual hero of the beat.", status: "done" },
      { label: "Hastings structural-rejection section", detail: "Section 5 documents the $22M 2018 IE through CCSA Advocates → Hastings's 2026 governor money to Mahan instead. The donor class moved off Villaraigosa while he kept taking fossil-fuel maxes.", status: "done" },
      { label: "Resnick water-rights sidebar anchored", detail: "State Water Board July 21 2025 order names Wonderful Nut Orchards LLC as part of Westside Mutual Water Company — Tier 1 regulatory tie. Resnick cross-candidate hedge documented across 5 committees + Newsom ballot committee.", status: "done" },
      { label: "Coinbase advisory sidebar anchored", detail: "LA Times April 2024 + March 2026 confirms paid advisory role. Specific compensation amount: NO DATA per Perplexity follow-up.", status: "done" },
      { label: "Structural cleanup 2026-05-07", detail: "Removed duplicate <article class='article-body'> opening tag at line 645-651 (was breaking HTML structure). Mirrored prototype/beat-villaraigosa-pledge.html to content/villaraigosa-pledge/index.html so Quartz can build it. Validated: 7 TOC items + 7 H2 sections + balanced article/div tags + 0 em-dashes in body prose.", status: "done" },
      { label: "Prototype HTML", detail: "prototype/beat-villaraigosa-pledge.html (1036 lines after duplicate-tag fix) + content/villaraigosa-pledge/index.html (mirrored 2026-05-07). Hero SVG + 7 H2 sections + receipts table + sources block + methodology paragraph.", status: "done" },
      { label: "Verification seeds populated", detail: "9 seeds covering Cal-Access committee 1471635, LA Times broken-pledge piece, CalMatters infrastructure-czar piece, LA Times single-payer piece, LA Times Mercury piece, Axios Actum piece, Ninth Circuit Fresenius opinion, FPPC 2018 + 2026 top-contributor archives. URL-pass runs at /active-beat/villaraigosa-pledge in ops.", status: "done" },
      { label: "Public-routes.json exposure", detail: "BLOCKED on David URL-pass + sign-off. Per memory rule feedback_no_auto_public_route.md.", status: "blocked" },
      { label: "OG share card", detail: "Pending — add CARDS entry to scripts/render-og-images.cjs once URL-pass clears", status: "pending" },
    ],
  },
  {
    slug: "clean-cash",
    publicSlug: "clean-cash",
    title: "Katie Porter says she does not take money from the donor class. Five names on her donor list say she does.",
    deck:
      "Katie Porter's whiteboard brand is built on rejecting corporate PACs and Wall Street executives. The rule has narrow definitions. Her donor list (Porter for Governor 2026, FPPC 1479597) shows Joe Kiani $39,200 (Masimo founder/CEO), Karla Jurvetson $40,100 (Bay Area progressive megadonor), First Foundation Bank $57,200 (wealth-management bank for HNW clients — largest single organizational direct contribution), plus Seth Klarman ~$13,900 lifetime (Baupost hedge fund) and Donald Mullen $8,000+ lifetime (former Goldman Sachs subprime trading head) per Porter master profile Core Contradiction. THE SPINE: Christian Larsen, Ripple co-founder, gave Porter the $39,200 max in 2025 — then revoked his support in March 2026 after Porter endorsed SF Proposition D (CEO pay tax, on the same June 2 2026 ballot as the CA primary). Larsen gave $700,000 against Prop D (incl $200K for mailers) and switched his support to Republican Steve Hilton (whom he also maxed out at $39,200). Per CalMatters May 2026 reporting. Larsen is also a major funder of Building a Better California, the $35M anti-wealth-tax vehicle (cross-references /the-hedge). Beat shape: 6 receipt cards + 7 sections + 3-row policy-ask matrix. The Larsen episode is the LIVE enforcement case study — the rule the donor class enforces with money when the candidate touches their wealth. Rewritten 2026-05-07 after CalMatters surfaced the Larsen revocation; original framing (cross-party hedge) was stale.",
    prototypeFile: "beat-clean-cash.html",
    prototypeUrl: "http://localhost:8096/clean-cash",
    dossierPath: "content/Politicians/Races/CA Governor 2026/Katie Porter/_Katie Porter Master Profile.md",
    status: "draft",
    verificationSeeds: CLEAN_CASH_SEEDS,
    perplexityRounds: [],
    auditPasses: [],
    editorialChecklist: [
      { label: "Headline locked", detail: '"Katie Porter says she does not take money from the donor class. Five names on her donor list say she does." (decided 2026-05-06; rewrite 2026-05-07 kept H1, pivoted Larsen card to live-enforcement framing)', status: "done" },
      { label: "Six-card receipt callout", detail: "Christian Larsen (RED spine card, NEW framing — 2025 receipt revoked March 2026 + $700K against Prop D + switched to Hilton) + Joe Kiani + Karla Jurvetson + Seth Klarman (lifetime federal) + Donald Mullen (lifetime federal) + First Foundation Bank. Each card cites Cal-Access 1479597, FEC bulk, or CalMatters as appropriate.", status: "done" },
      { label: "NEW H2: 'What happened when she crossed one of them'", detail: "Live case study section added 2026-05-07 between 'What passes through it' and 'What that donor list would ask for'. Documents the SF Prop D arc: Porter endorsement → Larsen revocation March 2026 → Larsen $700K against Prop D incl $200K for mailers → switch to Hilton. Per CalMatters May 2026. Closes with the structural read: the rule that mattered was Larsen's, not Porter's.", status: "done" },
      { label: "Three-row donor-bloc matrix", detail: "Industrial unions (~$278K, net wealth-tax beneficiaries) + Plaintiff bar (~$230K, mixed exposure) + Wealthy individuals (~$200K, direct annual hit, RED spine row — Larsen flagged as 'revoked March 2026' to track timeline). Per memory rule feedback_policy_ask_matrix_pattern.md.", status: "done" },
      { label: "Inline TOC after lede", detail: "8 sections (added 'What happened when she crossed one of them'), anchored click-to-jump. Per memory rule feedback_beat_toc_required.md.", status: "done" },
      { label: "Normie-language pass", detail: "Per memory rule feedback_normie_prose_published.md. Em-dash count: 0 in body prose. Glosses on first technical reference: 'corporate PAC,' 'wealth-management bank,' 'wealth tax,' 'CEO-pay tax,' 'independent expenditure'. No AI vernacular ('furthermore'/'crucially'/'importantly').", status: "done" },
      { label: "Cross-link to /the-hedge", detail: "'Why a statewide run tightens this' section now connects Larsen to Building a Better California ($35M anti-wealth-tax vehicle co-founded by Brin and Schmidt) and links to /the-hedge. Same coalition, same names, same fight on the city ballot, the state ballot, and the gubernatorial race at the same time.", status: "done" },
      { label: "Methodology + non-claims block", detail: "Sources block adds CalMatters (Tier 2) and SF ballot record. Explicit non-claims updated: no claim about Porter's federal Ultra-Millionaire Tax Act position; no claim about California 2026 Billionaire Tax Act position; no claim about remaining donors' politics. The Larsen episode IS asserted (CalMatters Tier 2 source).", status: "done" },
      { label: "Lane discipline · what this beat does NOT do", detail: "Does not assert a Porter cosponsorship of a specific wealth-tax bill (data not verified in our vault). Does not editorialize about Karla Jurvetson's politics. Per Rule 4 (AI translates, never generates). The Larsen revocation, the $700K opposition, and the Hilton switch are reported facts (CalMatters, May 2026), NOT new factual assertions by us.", status: "done" },
      { label: "Prototype HTML", detail: "content/clean-cash/index.html + prototype/beat-clean-cash.html · 556 lines. 6 receipt cards, 3 matrix rows, 8 h2 sections, 0 em-dashes in body prose, balanced div tags.", status: "done" },
      { label: "Public-routes.json exposure", detail: "BLOCKED on David URL-pass + sign-off. Per memory rule feedback_no_auto_public_route.md — Code Claude does not add slug to data/public-routes.json without explicit David authorization. URL-pass runs at /active-beat/clean-cash in ops.", status: "blocked" },
      { label: "OG share card", detail: "Pending — add CARDS entry to scripts/render-og-images.cjs once URL-pass clears. Meta tag references thedonormap.org/static/share/clean-cash.png; PNG not yet rendered.", status: "pending" },
      { label: "Site-preview entry", detail: "Added to ops/src/app/site-preview/page.tsx as draft-isolated. Surfaces at /site-preview in ops.", status: "done" },
    ],
  },
]

const BEATS_ACTIVE_CLASS_TRAITOR: BeatRecord = {
  slug: "class-traitor",
  publicSlug: "class-traitor",
  title: "$31 million to bury a class traitor",
  deck:
    "California's donor class organized against him: utility, realtors, chamber, developers, prison guards. The only billionaire in the race who turned against them. He didn't start outside the donor class. He left it. Partially. The class noticed.",
  prototypeFile: "beat-class-traitor.html",
  prototypeUrl: "http://localhost:8096/class-traitor",
  dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/steyer.md",
  status: "published",
  verificationSeeds: CLASS_TRAITOR_SEEDS,
  perplexityRounds: [
    { name: "Anti-Steyer IE operation", status: "applied", date: "2026-05-01" },
    { name: "Steyer financial-history stress test (Farallon record)", status: "applied", date: "2026-05-02" },
    { name: "CAR anti-Steyer tax mechanism", status: "applied", date: "2026-05-02" },
    { name: "Gudelunas / 1489677 spending update", status: "applied (with open question on payment trail)", date: "2026-05-02" },
  ],
  auditPasses: [
    {
      name: "Option C reframe pass: keep headline, metabolize Farallon record honestly",
      date: "2026-05-02",
      status: "applied: new #record section + Bloomberg second-largest-investor caveat + NYT 2020 fact-check + CCA-to-CoreCivic continuation",
    },
    {
      name: "ChatGPT critique pass: tighten claims, scope donor-class definition",
      date: "2026-05-02",
      status: "applied: donor-class defined inline, point→function, operation→machine, polling-section trim",
    },
    {
      name: "Chart rework pass: drop false category-mirror, fix label overflow",
      date: "2026-05-02",
      status: "applied: symmetry chart reframed Same wealth machine / two roles, callouts added, grey text bumped",
    },
  ],
  editorialChecklist: [
    {
      label: "Symmetry chart (Farallon vs anti-Steyer coalition)",
      detail: "Side-by-side stacked bars with red-shades-left / yellow-shades-right palette. Tobacco + CBIA + CCPOA labels in callouts.",
      status: "done",
    },
    {
      label: "Spend dam-break timeline",
      detail: "Step chart April 2 to April 28 showing $30K → $20.04M with the April 24 +$5.13M jump highlighted.",
      status: "done",
    },
    {
      label: "His own record section (#record)",
      detail: "Metabolizes the Farallon coal/CCA/casinos/tobacco record honestly with Bloomberg + NYT 2020 fact-check caveats.",
      status: "done",
    },
    {
      label: "CAR mechanism explanation",
      detail: "Split-roll commercial-Prop-13 framing, not anti-housing.",
      status: "done",
    },
    {
      label: "Spend numbers refreshed to $20.04M",
      detail: "Form 460 base + three Form 496 late filings + JOBSPAC and CRAE late receipts.",
      status: "done",
    },
    {
      label: "Open Questions section",
      detail: "Includes Gudelunas payment trail unverified + Form 496 payee gap + remaining $1M deployment watch.",
      status: "done",
    },
    {
      label: "Tip box on the beat page",
      detail: "Brutalist tip box at the bottom; routes to guerillapropaganda@proton.me.",
      status: "done",
    },
  ],
}

BEATS.push(BEATS_ACTIVE_CLASS_TRAITOR)
BEATS.push(...BEATS_UPCOMING)

const HEDGE_SEEDS: VerificationSeed[] = [
  {
    id: "hedge-cal-access-3149725",
    beat: "the-hedge",
    label: "URL pass: Cal-Access · Filing 3149725 · Stewart Resnick → Becerra $39,200 · 2026-05-04",
    detail:
      "FPPC Form 497 Late Contribution Report. Stewart A. Resnick And Affiliated Entities (committee 499047) → Becerra For Governor 2026 (committee 1480025), $39,200, contribution made 2026-05-04, filed 2026-05-05, the day before the CNN governor debate.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/PDFGen/pdfgen.prg?filingid=3149725&amendid=0",
  },
  {
    id: "hedge-cal-access-3149729",
    beat: "the-hedge",
    label: "URL pass: Cal-Access · Filing 3149729 · Lynda Resnick → Becerra $39,200 · 2026-05-04",
    detail:
      "FPPC Form 497 Late Contribution Report. Lynda Rae Resnick (committee 1252697) → Becerra For Governor 2026 (committee 1480025), $39,200, contribution made 2026-05-04, filed 2026-05-05. Combined with husband's filing: $78,400 to Becerra.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/PDFGen/pdfgen.prg?filingid=3149729&amendid=0",
  },
  {
    id: "hedge-cal-access-3139587",
    beat: "the-hedge",
    label: "URL pass: Cal-Access · Filing 3139587 · Brin → BABC $9M flow on 2026-04-10",
    detail:
      "FPPC Form 497. Sergey Brin (Reno NV, listed CO-FOUNDER GOOGLE) → Building a Better California (committee 1486767), $9,000,000, contribution made 2026-04-10. Same-day distribution: $4.5M to Californians for a More Transparent and Effective Government (committee 1488423, Initiative 25-0040A1) + $4.5M to Californians to Protect Retirement and Life Savings (committee 1488418, Initiative 25-0041A1). Memo line confirms intermediaries: BABC Incorporated and Compass4 Inc, both at 2350 Kerner Blvd Ste 250, San Rafael CA 94901.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/PDFGen/pdfgen.prg?filingid=3139587",
  },
  {
    id: "hedge-cal-access-1486767",
    beat: "the-hedge",
    label: "URL pass: Cal-Access · BABC committee 1486767 detail page",
    detail:
      "Building a Better California parent committee. Anchors the $35M coalition framing. Treasurer / registered address verification.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1486767",
  },
  {
    id: "hedge-lao-25-0024",
    beat: "the-hedge",
    label: "URL pass: LAO ballot analysis · Initiative 25-0024 (the Billionaire Tax Act)",
    detail:
      "Legislative Analyst's Office analysis of the proposed wealth tax. Anchors the 5% / $1B / one-time / phase-out structure plus the LAO's tens-of-billions revenue estimate plus the 90% healthcare allocation.",
    lane: "Editor",
    url: "https://lao.ca.gov/BallotAnalysis/Initiative/2025-024",
  },
  {
    id: "hedge-becerra-position-calmatters",
    beat: "the-hedge",
    label: "URL pass: CalMatters · Becerra opposes the wealth tax",
    detail:
      "Anchors the candidate-position table for Becerra. Becerra has stated it is unfair for billionaires to pay a lower rate but argues a one-time levy is not the way. Confirm the exact quote and date in the CalMatters piece.",
    lane: "Editor",
    url: "https://calmatters.org/politics/2026/04/billionaire-tax-labor-divided/",
  },
  {
    id: "hedge-fortune-treehouse-party",
    beat: "the-hedge",
    label: "URL pass: Fortune · Brin confronted Newsom at Christmas treehouse party (Apr 26, 2026)",
    detail:
      "Anchors the coalition origin story: Brin and his partner Gerelyn Gilbert-Soto confronted Newsom at a treehouse Christmas party hosted by Chris Larsen. Larsen is the same Ripple co-founder funding Porter, Mahan, and Hilton. Confirms Brin's $20M founding contribution + $37M spring add + $9M April Cal-Access disclosure.",
    lane: "Editor",
    url: "https://fortune.com/2026/04/26/california-billionaire-tax-ballot-measure-sergey-brin-gavin-newsom-political-war/",
  },
  {
    id: "hedge-cal-access-1486858",
    beat: "the-hedge",
    label: "URL pass: Cal-Access · Mahan committee 1486858 (Larsen $500K cross-hedge anchor)",
    detail:
      "FPPC committee 1486858. Anchors Christian Larsen's $500K to Mahan claim in the cross-candidate hedge table.",
    lane: "Editor",
    url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1486858",
  },
]

const APPARATUS_SEEDS: VerificationSeed[] = [
  {
    id: "apparatus-irs-bmf-c4",
    beat: "the-apparatus",
    label: "URL pass: IRS EO BMF · Steadfast LA EIN 33-3239336 · subsection 04 (the c4)",
    detail:
      "IRS Exempt Organization Business Master File row: STEADFAST LA, EIN 33-3239336, % David Lazarus, 2350 Kerner Blvd Ste 250, San Rafael CA 94901-5596, subsection code 04 (501(c)(4) social welfare organization). Anchors the c4 vs c3 distinction in the entities-callout spine.",
    lane: "Editor",
    url: "https://www.irs.gov/pub/irs-soi/eo3.csv",
  },
  {
    id: "apparatus-guidestar-c3",
    beat: "the-apparatus",
    label: "URL pass: GuideStar · Steadfast LA Foundation EIN 33-3413032 (the c3)",
    detail:
      "GuideStar profile for the separate 501(c)(3) Foundation entity. Distinct EIN from the c4. Resolves the c4-vs-c3 ambiguity: there are two entities, and the website uses both names.",
    lane: "Editor",
    url: "https://www.guidestar.org/profile/33-3413032",
  },
  {
    id: "apparatus-rap-board-report",
    beat: "the-apparatus",
    label: "URL pass: LA Recreation and Parks Board Report 26-017 · $40M Palisades Recreation Center",
    detail:
      "Jan 15, 2026 board report identifying PPRC Development Project, LLC as donor for the $40M rebuild, Nick Geller (Steadfast LA) at PPRC contact, Gensler + SWA Group as designers, FEMA reimbursement notes. Anchors the first of three documented policy interventions.",
    lane: "Editor",
    url: "https://recreation.parks.lacity.gov/sites/default/files/pdf/commissioner/2026/jan15/26-017.pdf",
  },
  {
    id: "apparatus-bass-rec-center-release",
    beat: "the-apparatus",
    label: "URL pass: Mayor's Office release · Steadfast LA + LA Strong Sports public-private partnership",
    detail:
      "April 10, 2025 Mayor's Office press release announcing the Palisades Recreation Center public-private partnership with Steadfast LA. Anchors the Bass-Caruso joint April 2025 event.",
    lane: "Editor",
    url: "https://mayor.lacity.gov/news/mayor-bass-la-strong-sports-and-steadfast-la-announce-public-private-partnership-rebuild",
  },
  {
    id: "apparatus-measure-ula-clerk-file",
    beat: "the-apparatus",
    label: "URL pass: City Clerk file 25-0006-S86 · Measure ULA exemption proposal",
    detail:
      "Oct 24, 2025 City Council motion citing Mayor Bass's letter that 'followed a proposal presented by Steadfast LA' to create a Measure ULA documentary-transfer-tax exemption for Palisades fire survivors. Anchors the second of three policy interventions.",
    lane: "Editor",
    url: "https://cityclerk.lacity.org/onlinedocs/2025/25-0006-S86_misc_10-24-25.pdf",
  },
  {
    id: "apparatus-archistar-mayor-release",
    beat: "the-apparatus",
    label: "URL pass: Mayor's Office release · Archistar AI permitting tool",
    detail:
      "Nov 13, 2025 Mayor's Office release announcing Archistar's eCheck AI Pilot, made available at no cost via Steadfast LA funding. Anchors the third of three policy interventions: a private vendor deployment in city permit-review workflow.",
    lane: "Editor",
    url: "https://mayor.lacity.gov/news/mayor-bass-announces-first-approvals-under-new-standard-plan-pilot-program-further-expedite",
  },
  {
    id: "apparatus-caruso-quote-source",
    beat: "the-apparatus",
    label: "URL pass: LA Times · Caruso quotes on Bass (Feb 3, 2025)",
    detail:
      "Anchors both verbatim Caruso quotes used in the 'What Caruso has said publicly' section. Caruso explicitly disclaims political motivation; quoted accurately for fairness in the framing.",
    lane: "Editor",
    url: "https://www.latimes.com/california/story/2025-02-03/rick-caruso-rebuild-foundation",
  },
  {
    id: "apparatus-la-ethics-bass-cmte",
    beat: "the-apparatus",
    label: "URL pass: LA Ethics dataset · Bass committee 1471359 · zero-direct-contributions check",
    detail:
      "LA Ethics Commission Campaign Contributions dataset. Anchors the donor-question section finding: zero exact-name contributions from Steadfast LA's 25 named participants to Bass committee 1471359 or to her two IE committees. The donor-money explanation does not exist; the apparatus is the relationship.",
    lane: "Editor",
    url: "https://data.lacity.org/resource/m6g2-gc6c.json?cmt_id=1471359",
  },
  {
    id: "apparatus-steadfast-board-page",
    beat: "the-apparatus",
    label: "URL pass: Steadfast LA · official board / coalition page",
    detail:
      "Anchors the 25-name board roster table. Confirm names + corporate affiliations + roles match the table in the published beat.",
    lane: "Editor",
    url: "https://steadfastla.com",
  },
]

const BEATS_NEW: BeatRecord[] = [
  {
    slug: "the-hedge",
    publicSlug: "the-hedge",
    title: "The Hedge: One coalition. Eight candidates. The same $35M wall around their billions.",
    deck: "Resnick, Larsen, Brin, Doerr, Moritz, Collison, Schmidt, Thiel, Xu, Levchin. The same billionaires writing max-out checks to multiple gubernatorial candidates are simultaneously funding the $35M coalition fighting California's Billionaire Tax Act.",
    prototypeFile: "beat-the-hedge.html",
    prototypeUrl: "http://localhost:8096/the-hedge",
    dossierPath: "content/Admin Notes/perplexity-research/2026-05-06-resnick-wealth-tax-coalition.md",
    status: "active",
    verificationSeeds: HEDGE_SEEDS,
    perplexityRounds: [
      { name: "Resnick water-rights / Wonderful Co political giving baseline (5/3)", status: "applied", date: "2026-05-03" },
      { name: "Resnick → Becerra primary-source verification (David retrieved Cal-Access PDFs directly)", status: "applied", date: "2026-05-06" },
    ],
    auditPasses: [
      { name: "Cal-Access primary-source verification of all dollar amounts", status: "applied", date: "2026-05-06" },
      { name: "Em-dash audit + normie-language pass", status: "applied", date: "2026-05-06" },
    ],
    editorialChecklist: [
      { label: "Two-card spine (Resnick filings)", detail: "Both Cal-Access Form 497 PDFs cited at top of beat. Filer name, committee ID, contribution date, recipient ID, $39,200 each.", status: "done" },
      { label: "Coalition table", detail: "10 named coalition donors with primary holdings + reported amounts to BABC.", status: "done" },
      { label: "Hedge pattern grid", detail: "Larsen → Porter/Mahan/Hilton + Resnick → Villaraigosa/Mahan/Swalwell/Becerra/Yes-on-50.", status: "done" },
      { label: "Each-candidate-position table", detail: "Five against, two silent, zero in favor. Becerra position sourced to CalMatters.", status: "done" },
      { label: "Brin flow on April 10 section", detail: "$9M in / $4.5M + $4.5M out same day. Pass-through structure documented.", status: "done" },
      { label: "Address overlap with Steadfast LA", detail: "2350 Kerner Blvd Ste 250 cross-reference into the apparatus beat.", status: "done" },
      { label: "Closing legal-status disclaimer", detail: "No charges, no allegations of crime; structural pattern only.", status: "done" },
      { label: "OG image", detail: "Pending render via scripts/render-og-images.cjs from main repo.", status: "pending" },
    ],
  },
  {
    slug: "the-apparatus",
    publicSlug: "the-apparatus",
    title: "The Apparatus: The candidate Bass beat in 2022 now runs the private rebuild in 2026.",
    deck: "Rick Caruso lost to Karen Bass. He founded Steadfast LA after the Palisades fire. Three documented policy interventions later, his organization is the lead private partner to her city government's rebuild apparatus. He has not given a single dollar to her reelection campaign.",
    prototypeFile: "beat-the-apparatus.html",
    prototypeUrl: "http://localhost:8096/the-apparatus",
    dossierPath: "content/Admin Notes/gemini-research/2026-05-06-steadfast-la-structural-deep-dive.md",
    status: "active",
    verificationSeeds: APPARATUS_SEEDS,
    perplexityRounds: [
      { name: "Gemini Deep Research · Steadfast LA structural deep dive (5/6)", status: "applied", date: "2026-05-06" },
    ],
    auditPasses: [
      { name: "501(c)(4) vs 501(c)(3) entity verification (separate EINs confirmed)", status: "applied", date: "2026-05-06" },
      { name: "Em-dash audit + normie-language pass", status: "applied", date: "2026-05-06" },
    ],
    editorialChecklist: [
      { label: "Two-entity spine", detail: "501(c)(4) Steadfast LA EIN 33-3239336 + 501(c)(3) Steadfast LA Foundation EIN 33-3413032.", status: "done" },
      { label: "Three documented policy interventions", detail: "$40M Rec Center + Measure ULA exemption + Archistar AI permitting.", status: "done" },
      { label: "Board / coalition table", detail: "25 named participants with corporate affiliations and rebuild-relevant sectors.", status: "done" },
      { label: "Donor-question section", detail: "Zero exact-name contributions from board members to any 2026 LA mayor committee. Documented honestly.", status: "done" },
      { label: "Address overlap with BABC", detail: "2350 Kerner Blvd Ste 250 cross-reference into The Hedge.", status: "done" },
      { label: "Caruso direct quotes", detail: "Both Feb 3, 2025 LA Times quotes used verbatim for fairness.", status: "done" },
      { label: "Closing legal-status disclaimer", detail: "No charges, no allegations of crime; structural pattern only.", status: "done" },
      { label: "OG image", detail: "Pending render via scripts/render-og-images.cjs from main repo.", status: "pending" },
    ],
  },
  {
    slug: "second-floor",
    publicSlug: "second-floor",
    title: "The Second Floor: one Riverside address buys an Inland Empire.",
    deck: "On the second floor of the historic Mission Inn Hotel & Spa in downtown Riverside, one office mailing address is on file for Moving California Forward (FPPC #1455936, the developer-funded PAC raising $220K in 2026), Pacheco Moving California Forward Ballot Measure Committee (#1461025), three candidate committees (V. Manuel Perez Sup 2026 #1396909, Yxstian Gutierrez Sup 2026 #1439760, Alvin DeJohnette Council 2024 #1473823), Troast & Associates LLC, and Riverside Sheriffs' Association lobbying. MCF funded by Stronghold Power ($25K Coachella data center developer with $2.5M DOJ False Claims Act settlement), Highland Fairview ($20K Iddo Benzeevi World Logistics Center), Lewis Management, Palm Communities, Howard Industrial, Intersect Power, Jeffrey Burum ($5K Colonies scandal), Gregory Devereaux ($1K former SB Co CAO), Athens Services, Charles B Wood ($50.8K individual). Pays out to Bianco Gov ($10K), Gutierrez ($9.5K), Spiegel ($1K, IEHP former chair during alleged $320M Medi-Cal fraud), Troast same-floor consulting ($60.6K). Wood + Highland Fairview also max-donate to Bianco directly ($39.4K + $39.2K). Hotel itself sold to San Manuel Investment Authority May 4 2026 (Roberts family → tribal gaming). Drafted 2026-05-11.",
    prototypeFile: "beat-second-floor.html",
    prototypeUrl: "http://localhost:8096/second-floor",
    dossierPath: "content/Admin Notes/gemini-research/2026-05-11-mission-inn-second-floor-results.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "second-floor-mcf-1455936",
        beat: "second-floor",
        label: "URL pass: Cal-Access · Moving California Forward (FPPC #1455936)",
        detail: "THE SPINE PAC. Anchors entire donor + payee tables. Verify Theodore Pacheco as Principal Officer + Treasurer on most recent Form 410. Verify 3649 Mission Inn Ave Fl 2 Riverside 92501 as address of record. Verify total contribs $220,950 + total expenditures $182,329 + COH $149,829 (April 2026). Verify all 17 contributors with exact amounts (Charles B Wood $50,800, Athens Services $25K, Stronghold Power Systems $25K, Lewis Management $22,500, Highland Fairview $20K, Palm Communities $19,500, Howard Industrial $10K, Intersect Power $8K, Golden State Voter Participation Project $7K, Orange County Families $5,650, Jeffrey Burum $5K, MV Investments $5K, Beyond Food Mart $5K, Taxpayers for Quality Leadership $5K, Shane Spicer $5K, Californians for a Better Future $1,500, Gregory Devereaux $1K). Verify all 25+ payees including Bianco $10K, Gutierrez $9.5K, Spiegel $1K, Troast & Associates $60,620.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1455936",
      },
      {
        id: "second-floor-mcf-1461025",
        beat: "second-floor",
        label: "URL pass: Cal-Access · Pacheco MCF Ballot Measure Committee (#1461025)",
        detail: "Sister ballot-measure committee. Verify Theodore Pacheco as Principal Officer + Treasurer. Verify same 3649 Mission Inn Ave Fl 2 address. Confirm same shared infrastructure as #1455936 per Gemini Deep Research finding.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1461025",
      },
      {
        id: "second-floor-perez-1396909",
        beat: "second-floor",
        label: "URL pass: Cal-Access · V. Manuel Perez for Supervisor 2026 (#1396909)",
        detail: "LOAD-BEARING for the address overlap claim. Verify 3649 Mission Inn Ave Fl 2 Riverside as mailing address of record on the Form 410. Verify Jennifer Mitchell as treasurer (Gemini-sourced; pending Form 460 cover page confirmation). Verify Perez's top 3 contributors. Gemini reported Highland Fairview + Pechanga Band + San Manuel Band; earlier research surfaced Riverside Sheriffs Association Education Fund + LIUNA Local 777 PAC as top $10K donors. Resolve the discrepancy.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1396909",
      },
      {
        id: "second-floor-gutierrez-1439760",
        beat: "second-floor",
        label: "URL pass: Cal-Access · Yxstian Gutierrez for Supervisor 2026 (#1439760)",
        detail: "Verify 3649 Mission Inn Ave Fl 2 mailing address. Verify Jennifer Mitchell as treasurer. Verify $77,100 seed transfer from Dr. Gutierrez for Mayor 2020 committee on Dec 27 2021. Verify IEHP board membership dates (joined Jan 2023).",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1439760",
      },
      {
        id: "second-floor-dejohnette-1473823",
        beat: "second-floor",
        label: "URL pass: Cal-Access / Riverside city · Alvin DeJohnette for City Council 2024 (#1473823)",
        detail: "Verify 3649 Mission Inn Ave Fl 2 mailing address. Verify Jennifer Mitchell as treasurer. Verify $30K total received from Moving California Forward in September 2024 ($10K + $20K per Gemini).",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1473823",
      },
      {
        id: "second-floor-bianco-1479095",
        beat: "second-floor",
        label: "URL pass: Cal-Access · Bianco for Governor 2026 (#1479095)",
        detail: "Verifies the cross-fund overlap section. Total raised $5,262,745 / spent $4,155,139 / COH $1,399,824. Charles B Wood gave $39,382 directly to this committee (in addition to $50,800 to MCF). Highland Fairview gave $39,200 directly (in addition to $20K to MCF). Both numbers must match Cal-Access primary source.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1479095",
      },
      {
        id: "second-floor-sanmanuel-purchase",
        beat: "second-floor",
        label: "URL pass: San Manuel Mission Inn purchase announcement (May 4 2026)",
        detail: "Multiple named-publication sources back this: CBS Los Angeles, The Real Deal LA (May 5 2026), Riverside Record, Tribal Gaming and Hospitality Magazine, San Manuel Investment Authority's own press release. Deal expected to close by end of May. Roberts family had 33-year ownership. Verify Yuhaaviatam of San Manuel Nation as the tribal entity behind SMIA.",
        lane: "Editor",
        url: "https://sanmanuel-nsn.gov/news/smia-enters-agreement-purchase-historic-mission-inn-hotel-spa-riverside",
      },
      {
        id: "second-floor-roberts-obit",
        beat: "second-floor",
        label: "URL pass: Duane Roberts obituary (Nov 1 2025)",
        detail: "Pepperdine University announcement + Spokesman-Review obituary + KFI AM 640 + Legacy.com. Died Nov 1 2025 age 88. Frozen burrito magnate (Butcher Boy). Bought Mission Inn 1992 for $15.6M from Chemical Bank, restored for $55M.",
        lane: "Editor",
        url: "https://www.pepperdine.edu/newsroom/articles/pepperdine-university-mourns-the-passing-of-benefactor-duane-roberts.htm",
      },
      {
        id: "second-floor-stronghold-doj",
        beat: "second-floor",
        label: "URL pass: DOJ Central CA · Stronghold Engineering $2.5M SDVOSB FCA settlement (Apr 2021)",
        detail: "Verifies the $2.5M False Claims Act settlement for SDVOSB program exploitation. Period: August 2007 to October 2013. Scott and Beverly Bailey personally signatories. Confirms relationship between Stronghold Engineering Inc (the parent) and Stronghold Power Systems Inc (the Coachella deal partner).",
        lane: "Editor",
        url: "https://www.justice.gov/usao-cdca/pr/construction-firm-pays-25-million-settle-allegations-exploiting-service-disabled",
      },
      {
        id: "second-floor-hernandez-plea",
        beat: "second-floor",
        label: "URL pass: Riverside DA · Coachella mayor pleads guilty (March 2026)",
        detail: "Verifies the Hernandez felony plea. 9-count grand jury indictment Oct 30 2025 (1 felony Govt Code §1090 + 4 felony perjury PC 118 + 4 misdemeanor Govt Code §87100). March 2026 plea to one felony. 2 years probation + 200 hours community service. Indictment scope: 'votes and advocacy related to downtown Coachella development projects.'",
        lane: "Editor",
        url: "https://rivcoda.org/coachella_mayor_guilty",
      },
      {
        id: "second-floor-iehp-doj",
        beat: "second-floor",
        label: "URL pass: CalMatters · DOJ IEHP $320M Medi-Cal fraud lawsuit (Sept 2025)",
        detail: "Verifies the IEHP DOJ False Claims Act case. $320M in federal Medi-Cal expansion funds allegedly held back. Bradley Gilbert smoking-gun email quote about funds flowing through two county hospitals 'so I can get credit for them as medical costs.' Gilbert → Newsom appointed DHCS Director after IEHP CEO tenure. Verify Spiegel as board chair 2021-Feb 2025 and Gutierrez as member since Jan 2023.",
        lane: "Editor",
        url: "https://calmatters.org/health/2025/09/medi-cal-fraud-ie-health-plan/",
      },
      {
        id: "second-floor-troast-llc-verified",
        beat: "second-floor",
        label: "VERIFIED: Troast & Associates LLC at 3649 Mission Inn Ave Fl 2 Rotunda",
        detail: "California SOS LLC filing #201736210359 confirms Troast & Associates LLC at 3649 Mission Inn Ave., 2nd Floor Rotunda, Riverside, CA 92501. Established Dec 18, 2017. Marc Troast is registered agent + Manager. Multiple business directories (b2bhint, Buzzfile, ZoomInfo) cross-confirm. ADR-0030 §1 government primary source.",
        lane: "Editor",
        url: "https://b2bhint.com/en/company/us-ca/troast-and-associates-llc--201736210359",
      },
      {
        id: "second-floor-ryan-sherman-verified",
        beat: "second-floor",
        label: "VERIFIED: Ryan Sherman as RSA's legislative advocate",
        detail: "CalMatters Digital Democracy + LinkedIn + California Assembly hearing records confirm Ryan Sherman of Sherman Consulting as the Riverside Sheriffs' Association's lobbyist. Also represents California Narcotic Officers' Association and other LE unions. Testified for RSA on SB 747 and others. SUITE NUMBER for RSA's lobbying operation still needs separate verification.",
        lane: "Editor",
        url: "https://calmatters.digitaldemocracy.org/people/2663",
      },
      {
        id: "second-floor-mitchell-cfs-verified",
        beat: "second-floor",
        label: "VERIFIED: Jennifer Mitchell at Campaign Finance Services LLC",
        detail: "LinkedIn confirms Jennifer Mitchell at Campaign Finance Services LLC. CFS LLC is itself listed as a $5,000 payee of MCF (#1455936) per TUSA-direct extraction of the payee schedule. The Gemini-reported (C/O) Mitchell as treasurer of the 3 candidate committees is consistent with her firm being the care-of address. Still need each individual Form 460 cover page to confirm she's the treasurer of record for Perez (#1396909), Gutierrez (#1439760), DeJohnette (#1473823).",
        lane: "Editor",
        url: "https://www.linkedin.com/in/jennifer-mitchell-719710a3/",
      },
      {
        id: "second-floor-sanmanuel-perez-FALSIFIED",
        beat: "second-floor",
        label: "FALSIFIED: San Manuel as V. Manuel Perez top contributor",
        detail: "Gemini's claim that San Manuel Band is a top-3 Perez donor was NOT confirmed by independent research. Uken Report and other named publications consistently identify Riverside Sheriffs Association Education Fund + LIUNA Local 777 PAC ($10K each) as Perez's top reported contributors. Original Gemini-sourced pull-quote ('buyers of the hotel are donors to the supervisor') has been REWRITTEN in the beat draft. New framing: the new hotel owners will be the landlords of the floor, no claim of direct donor relationship. Pull-quote replaced.",
        lane: "Editor",
      },
      {
        id: "second-floor-pacheco-neach-verified",
        beat: "second-floor",
        label: "VERIFIED: Pacheco & Neach pc (Rod Pacheco's law firm) at 3649 Mission Inn 2nd Floor Rotunda",
        detail: "Pacheco & Neach pc website + U.S. News Law Firms + Palm Springs Life confirm the firm's Riverside office at 3649 Mission Inn Avenue, Second Floor Rotunda, Riverside CA 92501. Named partner is Rod Pacheco (full name Rodric Anthony Pacheco), former Riverside County District Attorney (2007-2011), former CA Assembly Republican Leader (Nov 1998 to Apr 1999), former Assemblyman 1996-2002 representing western Riverside County. First Latino Republican elected to CA Assembly. UC Riverside graduate. Firm also has Irvine office.",
        lane: "Editor",
        url: "https://pacheconeach.com/team/",
      },
      {
        id: "second-floor-troast-rod-pacheco-staff",
        beat: "second-floor",
        label: "VERIFIED: Marc Troast worked as staff for Rod Pacheco in CA Assembly",
        detail: "Troast & Associates website + LinkedIn confirm Marc Troast's career history including service as staff for then-Assemblyman Rod Pacheco. Also Bono District Director 10 years, SoCal Director CA Republican Party, Exec Director Riverside Co Republican Party, Inland Empire Chair for Whitman 2010, Romney delegate 2012, Bush/Cheney 2000+2004, Schwarzenegger Recall 2003. Reframes Troast & Associates from neutral compliance firm to GOP-aligned Inland Empire political infrastructure firm with direct Pacheco lineage.",
        lane: "Editor",
        url: "https://www.troastandassociates.com/our-team",
      },
      {
        id: "second-floor-gutierrez-wlc-history",
        beat: "second-floor",
        label: "VERIFIED: Gutierrez voted yes on WLC + Benzeevi $47K to Gutierrez 2016",
        detail: "Patch Aug 2015 + BuzzFeed News (Jessica Garrison megawarehouse investigation) + IE Business Daily document the August 2015 3-2 Moreno Valley council vote approving Highland Fairview's World Logistics Center, with Gutierrez voting yes. Post-vote 'Iddo, Iddo, Iddo' chant in chambers documented in named publications. $400K+ Benzeevi IE money supporting Gutierrez and other councilmember elections documented. $47K direct/linked to Gutierrez in 2016 (~1/3 of his campaign funds). Highland Fairview FBI investigation 2013 (dormant 2015) confirmed.",
        lane: "Editor",
        url: "https://patch.com/california/banning-beaumont/world-logistics-center-moreno-valley-oks-megawarehouse-3-2-vote-0",
      },
      {
        id: "second-floor-pacheco-name-FLAG",
        beat: "second-floor",
        label: "FLAG: The Pacheco first name on MCF Form 410 — TBD",
        detail: "Gemini's earlier Deep Research result identified the MCF treasurer as 'Theodore Pacheco'. Independent verification could not confirm this name. Rod Pacheco's full name is Rodric Anthony Pacheco, NOT Theodore — so these are two different people. The MCF treasurer may be: (a) a relative of Rod Pacheco (son, nephew, brother) sharing the Mission Inn Rotunda suite, (b) Gemini's garbled rendering of an initial-only or nickname-only Form 410 entry, or (c) an unrelated Pacheco who happens to be in the same building. Beat body has been softened to refer to 'a Pacheco' / 'the same person is the principal officer and treasurer of both' — no specific first name asserted. Verify from the actual Form 410 PDF.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1455936",
      },
      {
        id: "second-floor-remaining-tenant-flags",
        beat: "second-floor",
        label: "FLAG: Standard Riverside LLC, Law Office of Matt Hill, Joe Cameron",
        detail: "Three tenant claims from Gemini's report not yet independently confirmed. Standard Riverside LLC (regional development entity), Law Office of Matt Hill Esq, Joe Cameron (RSA consultant). Confirm via building directory or business filings before public-routes flip. These tenants were mentioned in earlier-draft language but have been removed from the current beat body until verification clears.",
        lane: "Editor",
      },
    ],
    perplexityRounds: [
      { name: "Gemini Deep Research · MCF principal officer keystone", status: "applied", date: "2026-05-10" },
      { name: "Gemini Deep Research · Riverside supervisor county donors", status: "applied", date: "2026-05-10" },
      { name: "Gemini Deep Research · Mission Inn building + suite tenants", status: "applied", date: "2026-05-11" },
    ],
    auditPasses: [
      { name: "Em-dash audit + normie-language pass", status: "applied", date: "2026-05-11" },
      { name: "Open Questions subject-facing pass (Rule: questions about THEM, not us)", status: "applied", date: "2026-05-11" },
    ],
    editorialChecklist: [
      { label: "Hero diagram", detail: "Building → 2nd floor → suite → donor inflows + candidate outflows. Single visual centerpiece.", status: "done" },
      { label: "TUSA-direct dollar amounts", detail: "All MCF contributor + payee numbers come from TransparencyUSA server-rendered NUXT state (direct extraction). Gemini's lower numbers on Palm Communities + Lewis Management rejected.", status: "done" },
      { label: "3 unverified-flagged claims", detail: "Mitchell treasurer / suite tenant directory / San Manuel as Perez top donor — all flagged inline with red verify chip + as Editor-lane verification seeds.", status: "done" },
      { label: "URL-pass workspace", detail: "Run David through /active-beat/second-floor before public-routes flip.", status: "pending" },
      { label: "OG image", detail: "Pending render via scripts/render-og-images.cjs from main repo.", status: "pending" },
    ],
  },
  {
    slug: "airbnb-bass",
    publicSlug: "airbnb-bass",
    title: "The Wesson Pipeline: Bass/Airbnb budget deal",
    deck: "LA Mayor Karen Bass's 2026-27 budget includes two Airbnb-suggested provisions (limited vacation rental program through 2028 Olympics + transient occupancy tax pre-payment for ~$50M). Justin Wesson is Airbnb's CA Senior Public Policy Manager and son of former LA Council President Herb Wesson, now CA co-chair of Mercury Public Affairs. Nine Mercury employees bundled $3,500 to Bass between Sept 30-Oct 30 2025, two months after Justin's August 2025 Airbnb registration. UNITE HERE Local 11 + 3 LA Councilmembers on record opposed. PLUM May 12, Council May 21.",
    prototypeFile: "beat-airbnb-bass.html",
    prototypeUrl: "http://localhost:8096/airbnb-bass",
    dossierPath: "content/Admin Notes/riverside-tusa-pull-2026-05-09.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "airbnb-bass-mercury-bundle",
        beat: "airbnb-bass",
        label: "URL pass: LA City Ethics campaign contributions · 9 Mercury employees to Bass 2026",
        detail: "All 9 contributions Sept 30-Oct 30 2025 totaling $3,500 from Mercury Public Affairs / Mercury LLC / Mercury employees to 'Re-Elect Karen Bass for Mayor 2026'. Direct from data.lacity.org/resource/m6g2-gc6c.json. Verify each line item.",
        lane: "Editor",
        url: "https://data.lacity.org/resource/m6g2-gc6c.json",
      },
      {
        id: "airbnb-bass-laist-budget",
        beat: "airbnb-bass",
        label: "URL pass: LAist · Airbnb proposal in Bass budget (May 2026)",
        detail: "Confirms both budget provisions were 'initially suggested by Airbnb' per Justin Wesson named quote. $50M prepaid TOT figure. PLUM May 12 + Council May 21 schedule.",
        lane: "Editor",
        url: "https://laist.com/news/housing-homelessness/airbnb-claims-proposal-included-in-mayors-budget-will-bring-tax-revenue-to-la-ahead-of-olympics",
      },
      {
        id: "airbnb-bass-save-our-services",
        beat: "airbnb-bass",
        label: "URL pass: LA Times via UNITE HERE 11 — Save Our Services is Airbnb-funded astroturf",
        detail: "Verifies Save Our Services campaign is Airbnb-funded and -coordinated. Coalition member list. Airbnb declined to disclose spend.",
        lane: "Editor",
        url: "https://www.unitehere11.org/la-times-the-fliers-say-save-our-services-airbnb-is-actually-pulling-the-strings/",
      },
      {
        id: "airbnb-bass-wesson-registry",
        beat: "airbnb-bass",
        label: "URL pass: LA City Open Data registered lobbyists · Wesson family",
        detail: "Confirms Justin Wesson registered for Airbnb 2025-08-01 + renewed 2026, AND Herb Wesson registered for Mercury Public Affairs 2024-05-01 + renewed 2025 + 2026. Direct from data.lacity.org/resource/j4zm-9kqu.json.",
        lane: "Editor",
        url: "https://data.lacity.org/resource/j4zm-9kqu.json",
      },
    ],
    perplexityRounds: [],
    auditPasses: [
      { name: "Em-dash audit", status: "applied", date: "2026-05-11" },
    ],
    editorialChecklist: [
      { label: "Skeleton draft", detail: "165 lines covering deal, Wessons, Mercury bundle, Save Our Services astroturf, opposition, open questions.", status: "done" },
      { label: "Hero diagram", detail: "Not yet built. Add later — donor/recipient cross-fund diagram.", status: "pending" },
      { label: "Expansion", detail: "Could add Airbnb LA City lobbying-firm history (Mercury 2017-19 contract with Airbnb was its own structural finding), federal LDA, Wasserman / LA28 sidebar.", status: "pending" },
      { label: "OG image", detail: "Pending render.", status: "pending" },
    ],
  },
  {
    slug: "coachella-data-center",
    publicSlug: "coachella-data-center",
    title: "The Coachella Data Center: the mayor who voted yes pleaded guilty",
    deck: "Stronghold Power Systems gave Mayor Steven Hernandez $4,900. Coachella City Council approved the Stronghold Municipal Utility Development Agreement Feb 11 2026 with Hernandez presiding. Three weeks later he pleaded guilty to a felony Government Code §1090 conflict-of-interest charge (Riverside DA 9-count indictment Oct 30 2025). Stronghold's parent firm Stronghold Engineering paid $2.5M DOJ Non-Prosecution Agreement April 2021 for using shell entity KPI with nominal vet owner Neff to win 14 sham VA SDVOSB contracts 2007-2013. Bailey family also gave to Calvert federally. Town hall held May 11.",
    prototypeFile: "beat-coachella-data-center.html",
    prototypeUrl: "http://localhost:8096/coachella-data-center",
    dossierPath: "content/Admin Notes/riverside-deep-research-2026-05-09.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "coachella-hernandez-indictment",
        beat: "coachella-data-center",
        label: "URL pass: Riverside County DA · Hernandez indictment Oct 30 2025",
        detail: "9 counts: 1 felony §1090 + 4 felony perjury PC 118 (Form 700) + 4 misdemeanor §87100. Indictment scope explicitly includes 'votes and advocacy related to downtown Coachella development projects.'",
        lane: "Editor",
        url: "https://rivcoda.org/coachella_mayor_indicted",
      },
      {
        id: "coachella-hernandez-plea",
        beat: "coachella-data-center",
        label: "URL pass: Riverside County DA · Hernandez plea March 2026",
        detail: "Plea to one felony §1090 charge. 2 years probation + 200 hours community service. 8 other charges dropped.",
        lane: "Editor",
        url: "https://rivcoda.org/coachella_mayor_guilty",
      },
      {
        id: "coachella-stronghold-doj",
        beat: "coachella-data-center",
        label: "URL pass: DOJ Central CA · Stronghold Engineering $2.5M NPA April 2021",
        detail: "Non-Prosecution Agreement resolving criminal and civil investigations. KPI shell entity with nominal vet owner Neff. 14 sham SDVOSB contracts with VA Aug 2007 to Oct 2013. 2-year ethics + compliance program required.",
        lane: "Editor",
        url: "https://www.justice.gov/usao-cdca/pr/construction-firm-pays-25-million-settle-allegations-exploiting-service-disabled",
      },
      {
        id: "coachella-feb11-roll-call",
        beat: "coachella-data-center",
        label: "FLAG: Coachella Feb 11 2026 roll-call vote on Stronghold MUDA",
        detail: "Need meeting minutes / council agenda from coachella.org or municode.com for the actual roll-call on the Municipal Utility Development Agreement vote. Currently described as 'approved' but the per-member yes/no/absent record is gapped.",
        lane: "Editor",
        url: "https://www.coachella.org/city-government/city-council/agendas-and-minutes",
      },
      {
        id: "coachella-hernandez-4900",
        beat: "coachella-data-center",
        label: "URL pass: Coachella city Form 460 · Hernandez $4,900 from Stronghold",
        detail: "Verify the $4,900 contribution from Stronghold Power Systems to Hernandez campaign via the Coachella city clerk's campaign statements portal.",
        lane: "Editor",
        url: "https://www.coachella.org/departments/city-clerk/form-460-campaign-statements",
      },
      {
        id: "coachella-figueroa-moratorium",
        beat: "coachella-data-center",
        label: "URL pass: KESQ · Figueroa appointed mayor April 22 + moratorium quote",
        detail: "Verifies Frank Figueroa's appointment as Coachella mayor and his public commitment to call for a moratorium 'first thing.'",
        lane: "Editor",
        url: "https://kesq.com/news/2026/04/22/frank-figueroa-appointed-new-coachella-mayor/",
      },
    ],
    perplexityRounds: [],
    auditPasses: [
      { name: "Em-dash audit", status: "applied", date: "2026-05-11" },
    ],
    editorialChecklist: [
      { label: "Skeleton draft", detail: "145 lines with timeline + 7 sections. Covers deal, donor, mayor, opposition, Second Floor cross-link.", status: "done" },
      { label: "Hero diagram", detail: "Not yet built. Suggest: timeline visualization Donor → Vote → Plea.", status: "pending" },
      { label: "Yadira Perez sidebar", detail: "Coachella Councilmember calling for moratorium is herself in crisis (husband ICE arrest, sheriff dept resignation). Consider sidebar.", status: "pending" },
      { label: "OG image", detail: "Pending render.", status: "pending" },
    ],
  },
  {
    slug: "iehp-320m",
    publicSlug: "iehp-320m",
    title: "The $320 Million the Inland Empire Kept",
    deck: "U.S. DOJ False Claims Act lawsuit Sept 2025: IEHP allegedly withheld $320M in federal Medi-Cal expansion funds it should have returned. Smoking-gun email from then-CEO Bradley Gilbert: 'The funds have to flow through the two county hospitals from IEHP so I can get credit for them as medical costs or the dollars go back to the state.' Gilbert was IEHP CEO 2008-2019, then Newsom appointed him Director of CA DHCS (the agency overseeing Medi-Cal). IEHP Governing Board: Riverside Supervisors Spiegel (chair 2021-Feb 2025) + Gutierrez (Jan 2023+), SB Supervisor Hagman (current chair, also CUSM Trustee). IEHP gives CUSM $1.2M/yr.",
    prototypeFile: "beat-iehp-320m.html",
    prototypeUrl: "http://localhost:8096/iehp-320m",
    dossierPath: "content/Admin Notes/riverside-deep-research-2026-05-09.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "iehp-calmatters-doj",
        beat: "iehp-320m",
        label: "URL pass: CalMatters · DOJ lawsuit alleges IEHP Medi-Cal fraud (Sept 2025)",
        detail: "Primary anchor for the $320M figure and Gilbert email quote. Confirms case caption + filing details + smoking-gun email.",
        lane: "Editor",
        url: "https://calmatters.org/health/2025/09/medi-cal-fraud-ie-health-plan/",
      },
      {
        id: "iehp-governing-board",
        beat: "iehp-320m",
        label: "URL pass: IEHP Governing Board page",
        detail: "Confirms current board membership + chair history. Verify Spiegel chair 2021-Feb 2025; Hagman current chair from Feb 2025 + prior chair 2018-2020; Gutierrez Jan 2023+; Andrew Williams since 1995.",
        lane: "Editor",
        url: "https://www.iehp.org/en/our-organization/who-we-are/governing-board",
      },
      {
        id: "iehp-gilbert-dhcs",
        beat: "iehp-320m",
        label: "URL pass: PR Newswire · Gilbert appointment as CA DHCS Director",
        detail: "Verifies Gilbert's appointment by Governor Newsom as Director of the California Department of Health Care Services after retiring from IEHP. Same agency that oversees Medi-Cal.",
        lane: "Editor",
        url: "https://www.prnewswire.com/news-releases/inland-empire-health-plan-celebrates-the-appointment-of-the-new-director-of-california-department-of-health-care-services-300996610.html",
      },
      {
        id: "iehp-doj-docket",
        beat: "iehp-320m",
        label: "FLAG: PACER case docket + current status",
        detail: "Pull the actual case docket number, current status (motions to dismiss, scheduling orders, settlement talks, depositions, qui tam relator if any). David has PACER access via Riverside or LA federal court.",
        lane: "Editor",
      },
      {
        id: "iehp-supervisor-mcf",
        beat: "iehp-320m",
        label: "Cross-link: Moving California Forward payments to Spiegel + Gutierrez",
        detail: "MCF (FPPC #1455936) paid Gutierrez $9,500 and Spiegel $1,000 in the 2026 cycle. The same supervisors who govern IEHP receive money from a developer PAC. See /second-floor.",
        lane: "Editor",
        url: "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1455936",
      },
    ],
    perplexityRounds: [],
    auditPasses: [
      { name: "Em-dash audit", status: "applied", date: "2026-05-11" },
    ],
    editorialChecklist: [
      { label: "Skeleton draft", detail: "140 lines covering the case, the email, Gilbert's revolving door, the board with fiduciary duty, and the cross-link to /second-floor.", status: "done" },
      { label: "Pull the DOJ complaint PDF", detail: "Need the full complaint via PACER. Email is paraphrased per CalMatters; want the exact citation.", status: "pending" },
      { label: "Audit history", detail: "Has IEHP had prior single audits flagged? CMS oversight? Worth a research round.", status: "pending" },
      { label: "OG image", detail: "Pending render.", status: "pending" },
    ],
  },
  {
    slug: "pechanga-money",
    publicSlug: "pechanga-money",
    title: "Pechanga: #2 political donor in America operates from Riverside County",
    deck: "Pechanga Band of Luiseño Mission Indians, headquartered Temecula in Riverside County, was the #2 political donor in the US behind only NEA in the most recent cycle (~$44M). $822,989 federal contributions + $220K federal lobbying 2024 cycle alone. $46M on Props 94-97 (2008 slot expansion). Leading coalition on SB 549 (signed Newsom Sept 2024) enabling tribal suits vs CA cardrooms — filed Jan 2025. HR 5682 + S 4053 (Pechanga land-into-trust) pending in Congress. 2024 CA state-level pattern: max-out every legislator they want. $39,200 to Xavier Becerra for Governor (corporate max). $17,700 to Natasha Johnson AD63 (cross-fund with /second-floor MCF $4K).",
    prototypeFile: "beat-pechanga-money.html",
    prototypeUrl: "http://localhost:8096/pechanga-money",
    dossierPath: "content/Admin Notes/riverside-tusa-pull-2026-05-09.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "pechanga-opensecrets",
        beat: "pechanga-money",
        label: "URL pass: OpenSecrets · Pechanga federal contributions summary",
        detail: "Verify 2024 cycle: $822,989 contributions + $220K lobbying. Filer ID D000023641.",
        lane: "Editor",
        url: "https://www.opensecrets.org/orgs/pechanga-band-of-luiseno-mission-indians/summary?id=D000023641",
      },
      {
        id: "pechanga-tusa-state",
        beat: "pechanga-money",
        label: "URL pass: TransparencyUSA · Pechanga CA state-level recipients",
        detail: "Verify state recipient table including Becerra $39,200, Laura Richardson $22,800, Natasha Johnson $17,700, plus ~17 candidates at $11,800 max.",
        lane: "Editor",
        url: "https://www.transparencyusa.org/ca/committee/pechanga-band-of-luiseno-indians-498071-mdi",
      },
      {
        id: "pechanga-hr5682",
        beat: "pechanga-money",
        label: "URL pass: HR 5682 · Pechanga land into trust (119th Congress)",
        detail: "Verify bill text and committee status.",
        lane: "Editor",
        url: "https://www.congress.gov/bill/119th-congress/house-bill/5682",
      },
      {
        id: "pechanga-s4053",
        beat: "pechanga-money",
        label: "URL pass: S. 4053 · Senate companion",
        detail: "Verify bill text and committee status.",
        lane: "Editor",
        url: "https://www.congress.gov/bill/119th-congress/senate-bill/4053",
      },
      {
        id: "pechanga-cardroom-lawsuit",
        beat: "pechanga-money",
        label: "URL pass: Snell & Wilmer · Seven tribes sue California cardrooms Jan 2025",
        detail: "Confirms litigation filed Jan 1 2025 under SB 549 Tribal Nations Access to Justice Act.",
        lane: "Editor",
        url: "https://www.swlaw.com/publication/seven-california-tribes-sue-california-card-rooms-over-banking-mechanisms-for-card-games/",
      },
    ],
    perplexityRounds: [],
    auditPasses: [
      { name: "Em-dash audit", status: "applied", date: "2026-05-11" },
    ],
    editorialChecklist: [
      { label: "Skeleton draft", detail: "153 lines covering scale, sports-betting, cardroom war, land-into-trust, CA state recipients, open questions.", status: "done" },
      { label: "Full state recipient list", detail: "Sample top 20 in beat body. Could expand to full list once Cal-Access full pull is done by David.", status: "pending" },
      { label: "Mark Macarro (Pechanga chairman)", detail: "Personal political profile not yet sketched. Could be expansion topic.", status: "pending" },
      { label: "OG image", detail: "Pending render.", status: "pending" },
    ],
  },
  {
    slug: "calvert-earmarks",
    publicSlug: "calvert-earmarks",
    title: "Calvert's Earmarks: $100M+ federal money near the congressman's properties",
    deck: "Rep. Ken Calvert (R-CA41, chair House Defense Appropriations Subcommittee, 17-yr Riverside Co restaurant + real estate business owner) secured $100M+ in Community Project Funding since 2021. ECU OCE complaint Aug 2024 identifies $2M Magnolia Ave bridge widening + $9M I-15 improvements both within 3 miles of his 1210 + 1212 East 6th St Corona rental properties he failed to disclose. 2007 precedent: he submitted Corona transportation hub earmark with 7 properties in vicinity; House Ethics approved with 'other businesses must benefit' caveat. Q1 2026: $200K+ defense PAC money. Bailey family (Stronghold Engineering, $2.5M DOJ NPA) cross-funds Calvert federally. Will Rollins likely 2026 rematch.",
    prototypeFile: "beat-calvert-earmarks.html",
    prototypeUrl: "http://localhost:8096/calvert-earmarks",
    dossierPath: "content/Admin Notes/riverside-deep-research-2026-05-09.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "calvert-ecu-complaint",
        beat: "calvert-earmarks",
        label: "URL pass: ECU OCE complaint against Calvert (Aug 2024)",
        detail: "Confirms specific allegations: $2M Magnolia Ave bridge + $9M I-15 improvements within 3 miles of 1210 + 1212 East 6th St undisclosed properties. $100M+ in earmarks since 2021. 2007 House Ethics precedent.",
        lane: "Editor",
        url: "https://admin.endcitizensunited.org/latest-news/press-releases/end-citizens-united-files-complaint-with-office-of-congressional-ethics-against-rep-ken-calvert/",
      },
      {
        id: "calvert-times-of-sd-defense",
        beat: "calvert-earmarks",
        label: "URL pass: Times of San Diego · defense contractor money May 2026",
        detail: "Verifies AM General $1K + $1K Mar 2-3 2026 (right after Iran war started), Lockheed Martin PAC $5K Mar 4, RTX PAC $5K Mar 9. Q1 2026 $200K+ total defense PAC + executive money.",
        lane: "Editor",
        url: "https://timesofsandiego.com/uncategorized/2026/05/05/defense-contractors-pump-big-money-into-congressional-campaign-accounts-amid-iran-war/",
      },
      {
        id: "calvert-fec",
        beat: "calvert-earmarks",
        label: "URL pass: FEC · Calvert candidate overview",
        detail: "Full FEC profile for Ken Calvert federal campaign finance. Cross-reference Bailey family donations 2009 + 2015.",
        lane: "Editor",
        url: "https://www.fec.gov/data/candidate/H2CA37023/",
      },
      {
        id: "calvert-house-disclosures",
        beat: "calvert-earmarks",
        label: "FLAG: U.S. House Clerk · Calvert financial disclosures property inventory",
        detail: "Pull all Calvert financial disclosures since 2007 to inventory real estate holdings and cross-reference against earmark locations. Needs methodical Riverside County Assessor + House Clerk reconciliation.",
        lane: "Editor",
        url: "https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure",
      },
      {
        id: "calvert-rollins-ethics-request",
        beat: "calvert-earmarks",
        label: "URL pass: Uken Report · Rollins asks Ethics Panel to investigate",
        detail: "Confirms Will Rollins's formal request to the House Ethics Committee.",
        lane: "Editor",
        url: "https://ukenreport.com/rollins-asks-ethics-panel-to-investigate-calvert/",
      },
    ],
    perplexityRounds: [],
    auditPasses: [
      { name: "Em-dash audit", status: "applied", date: "2026-05-11" },
    ],
    editorialChecklist: [
      { label: "Skeleton draft", detail: "133 lines covering bio, earmarks, properties, ECU complaint, defense money, Bailey cross-link.", status: "done" },
      { label: "Full property inventory + earmark geocode", detail: "The donor-map's unique contribution to the Calvert story would be a systematic earmark-to-property geocode visualization. Needs Riverside Assessor records + House disclosure reconciliation.", status: "pending" },
      { label: "Hero map", detail: "A literal Riverside County map showing earmark locations vs. Calvert properties would be the visual centerpiece.", status: "pending" },
      { label: "OG image", detail: "Pending render.", status: "pending" },
    ],
  },
  {
    slug: "spencer-pratt",
    publicSlug: "spencer-pratt",
    title: "Spencer Pratt: He's the new Caruso.",
    deck: "Spencer Pratt's LA mayoral run (Pratt for Mayor 2026, FPPC committee 1485940) has raised $539,617 from 1,634 donors through April 18. Two structural findings sit at the top. (1) Two corporate-named in-kind contributions in February: KOMOS TEQUILA $1,800 in beverages Feb 1 (brand operated by Delaware corporation Komos, Inc. + Delaware LLC Casa Komos Beverage Group LLC) and DELTA SPECIAL OPERATIONS CORP $1,800 in event security Feb 9 (CA BSIS PPO #122040, private-patrol firm whose own website markets staff as off-duty law enforcement officers including presidential dignitary-protection officers; no matching CA SOS entity registration). LA Municipal Code §49.7.13 bans corporate and business-entity contributions to LA city candidates. (2) Five donors who maxed out to Rick Caruso against Karen Bass in 2022 are now writing max-out checks to Pratt against Bass in 2026: Roy Disney (Shamrock Enterprises), Michael Schwab (Big Sky Partners), Loren Booth (Booth Ranches), Michael Meldman (Discovery Land Company; contribution publicly disputed by Discovery Land per Real Deal Apr 28, 2026), Ted & Michele Waitt (Gateway Computers founder). Pratt is also a plaintiff in Grigsby v. City of Los Angeles (25STCV00832), the consolidated Palisades-fire litigation against LA + LADWP, while running for mayor of LA. Campaign paid Newport Bleach (Tyler Nichols / Tyler Treats, five-year Pratt family vendor) $24,050 in three transactions; same Shopify storefront sells PRATT2026 merch alongside 28 Heidi Montag-branded products. Largest single payee Highland Political LLC ($63,893) is not registered in TN, domain doesn't resolve, no other clients in FEC. Drafted 2026-05-09; full receipts pass + Komos/Delta entity verification + structural-anchor sharpening 2026-05-11.",
    prototypeFile: "beat-spencer-pratt.html",
    prototypeUrl: "http://localhost:8096/spencer-pratt",
    dossierPath: "content/Admin Notes/la-mayor-pratt-deep-dive-2026-05-09.md",
    status: "draft",
    verificationSeeds: [
      {
        id: "spencer-pratt-committee-1485940",
        beat: "spencer-pratt",
        label: "URL pass: LA City Ethics · Pratt for Mayor 2026 (committee 1485940)",
        detail: "THE SPINE COMMITTEE. Deep-link URL filters the open-data campaign-contributions dataset (Socrata m6g2-gc6c) to only FPPC 1485940 records. Verify total raised $539,617 / 1,634 contributions / $131,251 unitemized small dollar through April 18 2026. Schedule E payees deep-link: https://data.lacity.org/d/5mrt-4zhe/explore/query/%24where%3Dcmt_id%3D%2226519%22 (internal cmt_id 26519, 248 expenditures totaling $282,362).",
        lane: "Editor",
        url: "https://data.lacity.org/d/m6g2-gc6c/explore/query/%24where%3Dcmt_id%3D%221485940%22",
      },
      {
        id: "spencer-pratt-schedule-c-komos",
        beat: "spencer-pratt",
        label: "URL pass: KOMOS TEQUILA Schedule C in-kind contribution",
        detail: "Verify Feb 1 2026 $1,800 in-kind beverages contribution under contributor name 'KOMOS TEQUILA' at New York NY 10016 address on Pratt's CA Form 460 Schedule C. The legal entity behind the brand is Komos, Inc. (Delaware General Corporation, File #6990327, formed 7/26/2018) with affiliated Casa Komos Beverage Group LLC (Delaware LLC, File #7563318, formed 8/15/2019). Both share Delaware registered agent The Corporation Trust Company. Verify the brand's self-identification as 'Komos, Inc.' per komos.com terms of use and footer.",
        lane: "Editor",
        url: "https://komos.com/legal",
      },
      {
        id: "spencer-pratt-schedule-c-delta",
        beat: "spencer-pratt",
        label: "URL pass: DELTA SPECIAL OPERATIONS CORP Schedule C in-kind contribution",
        detail: "Verify Feb 9 2026 $1,800 in-kind event-security contribution under contributor name 'DELTA SPECIAL OPERATIONS CORP' at Santa Rosa Valley CA 93012 address on Pratt's CA Form 460 Schedule C. Verify the firm operates under California BSIS Private Patrol Operator license #122040 (issued Feb 14, 2024, current through Feb 29, 2028, address of record 11886 Barranca Rd Santa Rosa Valley CA 93012-8284). Firm's own website at deltaspecial.org markets staff as off-duty law enforcement officers including officers who do dignitary protection for presidential visits to LA. CA SOS bizfile search returns no matching corporate or LLC registration for 'Delta Special Operations,' 'DSOC,' or known officer names; the only DSOC hit is a different terminated 2018 entity in San Jose.",
        lane: "Editor",
        url: "https://search.dca.ca.gov/?BD=7500&TP=PPO&NUM=122040",
      },
      {
        id: "spencer-pratt-caruso-cross-reference",
        beat: "spencer-pratt",
        label: "URL pass: LA City Ethics · Caruso 2022 mayoral committee cross-reference",
        detail: "Deep-link URL filters the open-data campaign-contributions dataset to only Caruso records. Verify the five-donor overlap between Pratt 2026 and Caruso 2022: Roy Disney (Shamrock Enterprises), Michael Schwab (Big Sky Partners), Loren Booth (Booth Ranches), Michael Meldman (Discovery Land Company), Ted & Michele Waitt (Gateway Computers founder). Confirm each appears on Caruso for Mayor 2022 Schedule A. Combined dollars from these donors to Pratt for Mayor 2026: $10,970.",
        lane: "Editor",
        url: "https://data.lacity.org/d/m6g2-gc6c/explore/query/%24where%3Dcand_name%20like%20%27%25CARUSO%25%27",
      },
      {
        id: "spencer-pratt-meldman-dispute",
        beat: "spencer-pratt",
        label: "URL pass: Discovery Land Company public denial of Meldman contribution",
        detail: "Verify Real Deal's April 28, 2026 reporting quoting a Discovery Land Company spokesperson stating Michael Meldman did not contribute to the Pratt campaign, in direct contradiction with the campaign's $1,885 Schedule A filing dated April 14, 2026 under Meldman's name. Both statements are preserved as documentary; legal characterization is the FPPC's call.",
        lane: "Editor",
        url: "https://therealdeal.com/la/2026/04/28/where-is-real-estate-money-flowing-in-the-mayoral-race/",
      },
      {
        id: "spencer-pratt-grigsby-lawsuit",
        beat: "spencer-pratt",
        label: "URL pass: Grigsby v. City of Los Angeles (25STCV00832) lawsuit case caption",
        detail: "Verify Pratt plaintiff status in Grigsby v. City of Los Angeles, LA Superior Court Case No. 25STCV00832. The Palisades Fire Litigation Portal confirms: Department 7, Judge Samantha Jessner presiding at Spring Street Courthouse; Peter McNulty / McNulty Law Firm as Liaison Counsel. Filing date Jan 21 2025. Co-plaintiffs Heidi Pratt, Janet Pratt, William Pratt + 20+ Palisades property owners. CA Court of Appeal denied City + State petitions to halt the inverse-condemnation claims.",
        lane: "Editor",
        url: "https://www.palisadesfirelitigationportal.com/Home/CourtInfo",
      },
      {
        id: "spencer-pratt-pratt-fox11-quote",
        beat: "spencer-pratt",
        label: "URL pass: Pratt's March 27, 2026 Fox 11 LA interview with Marla Tellez",
        detail: "Verify Pratt's verbatim answer to whether he would drop the lawsuit if elected: 'Absolutely not. The city failed over 10,000 people. 12 of them died, 7,000 structures. And that lawsuit is going forward. Thankfully, I'm not running to be the judge. The case is gonna be in front of a judge, and the judge will have the ruling. So there would be no conflict because the mayor does not control the outcome of that lawsuit.'",
        lane: "Editor",
        url: "https://www.foxla.com/news/spencer-pratt-la-mayoral-race-candidate-interview-march-2026",
      },
      {
        id: "spencer-pratt-highland-political-llc",
        beat: "spencer-pratt",
        label: "URL pass: Highland Political LLC (Pratt's largest payee)",
        detail: "Verify $63,893 across 11 transactions paid by Pratt for Mayor 2026 to 'Highland Political LLC' for 'Fundraising Events' services + travel reimbursement. Verify Tennessee Secretary of State business search returns no result for 'Highland Political' (stated TN address per LinkedIn). Verify highlandpolitical.com does not resolve in DNS. Verify FEC committee-expenditure database returns zero other clients for Highland Political LLC.",
        lane: "Editor",
        url: "https://tncab.tnsos.gov/business-entity-search?name=Highland+Political",
      },
      {
        id: "spencer-pratt-newport-bleach-vendor",
        beat: "spencer-pratt",
        label: "URL pass: Newport Bleach / Tyler Nichols vendor relationship",
        detail: "Verify $24,050 across 3 transactions paid by Pratt for Mayor 2026 to 'Newport Bleach' for 'Campaign Paraphernalia.' Verify Tyler Nichols (operating publicly under brand 'Tyler Treats' at tylertreats.com) is the proprietor of Newport Bleach. Verify Pratt Daddy Crystals as a former client per tylertreats.com portfolio. Verify the Newport Bleach Shopify storefront (newportbleach.com) sells PRATT2026 campaign merchandise alongside 28 Heidi Montag-branded products on the same product line.",
        lane: "Editor",
        url: "https://tylertreats.com/work",
      },
      {
        id: "spencer-pratt-corporate-contribution-ban",
        beat: "spencer-pratt",
        label: "URL pass: LA City Charter §470 corporate-contribution ban",
        detail: "Verify LA City Charter Section 470 \"Limitations on Campaign Contributions in City Elections\" prohibits contributions to candidates from \"corporations, including foreign corporations, business entities, partnerships, joint ventures, syndicates, and associations.\" Section text published by codelibrary.amlegal.com. NOTE: an earlier draft cited LAMC Section 49.7.13 as a parallel source; that section number was not verified and has been REMOVED from the beat. The Charter Section 470 cite stands on its own as the load-bearing statutory authority. LA Ethics Commission published rules + explainers: ethics.lacity.gov/laws.",
        lane: "Editor",
        url: "https://codelibrary.amlegal.com/codes/los_angeles/latest/laac/0-0-0-1874",
      },
    ],
    perplexityRounds: [
      { name: "Pratt-gaps round 1 (Komos/Meldman/NFT thread)", status: "complete", date: "2026-05-09" },
    ],
    auditPasses: [
      { name: "Em-dash + AI-vernacular sweep", date: "2026-05-11", status: "pass" },
      { name: "Officer-name discipline (Delta principals stripped from prose)", date: "2026-05-11", status: "pass" },
    ],
    editorialChecklist: [
      { label: "LA City Ethics Socrata API extraction", detail: "data.lacity.org/resource/m6g2-gc6c.json (contributions) + 5mrt-4zhe.json (expenditures); committee 1485940 for contributions, internal cmt_id 26519 for expenditures. No auth, fully queryable via SoQL.", status: "done" },
      { label: "Komos corporate-form verification", detail: "Verified DE corp + DE LLC via Delaware icis.corp.delaware.gov. Hardens corporate-contribution-ban question.", status: "done" },
      { label: "Delta entity verification", detail: "BSIS PPO #122040 confirms private-patrol-operator status, corporate-officer governance, off-duty-law-enforcement marketing. CA SOS bizfile returns no matching corporate registration. Findings locked in entity-profile box; individual officer names deliberately not surfaced in prose (defamation discipline).", status: "done" },
      { label: "Full receipts tables", detail: "Top 25 named donors, out-of-state high-dollar table (25 rows, 14 states), top 20 Schedule E payees, Pluvious fundraiser calendar, Highland Political LLC evidence box, Komos entity profile, Delta entity profile.", status: "done" },
      { label: "Two summary cards", detail: "Hero-area finding cards (Caruso continuity + corporate contributions) added 2026-05-11 with anchor links to full sections.", status: "done" },
      { label: "Section reorg", detail: "Corporate contributions moved to position 2 (was position 3); lawsuit moved to position 3. Act labels stripped from all section headings.", status: "done" },
      { label: "URL pass", detail: "Pending. Run through /active-beat/spencer-pratt against the verificationSeeds above.", status: "pending" },
      { label: "OG image", detail: "Pending render via scripts/render-og-images.cjs.", status: "pending" },
    ],
  },
]

BEATS.push(...BEATS_NEW)

export function getBeat(slug: string): BeatRecord | null {
  return BEATS.find((b) => b.slug === slug) || null
}

export function listBeats(): BeatRecord[] {
  return BEATS
}

export function listBeatsByStatus(status: BeatStatus): BeatRecord[] {
  return BEATS.filter((b) => b.status === status)
}
