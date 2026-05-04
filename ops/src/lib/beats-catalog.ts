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
    slug: "race-map",
    publicSlug: "race-map",
    title: "Race Map: cross-cutting donor overlay for primary-eve",
    deck:
      "Every CA gov primary candidate, every donor, every overlap. Primary-eve cross-cutting visualization showing which industries fund which candidates and where the donor pools overlap.",
    prototypeFile: "(not yet built)",
    prototypeUrl: "",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/_summary.md",
    status: "upcoming",
    verificationSeeds: [],
    perplexityRounds: [
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
      { label: "Prototype HTML", detail: "Not yet built", status: "pending" },
    ],
  },
  {
    slug: "bianco-ballots",
    publicSlug: "bianco-ballots",
    title: "Bianco: The Sheriff Who Seized the Ballots",
    deck:
      "Riverside County Sheriff seized 650,000 ballots from the 2025 Prop 50 referendum on a warrant from a judge he had endorsed. 2014 Oath Keepers membership confirmed by LAist + NPR. $78,400 from M&D Development + $78,400 from Downs Energy on the same December 30, 2025 day — SF Chronicle (Mar 31 2026) reported the entities share addresses and management, raising an FPPC single-source aggregation question. Plus the Riverside developer / law-enforcement donor stack ($143,720 deduplicated LE money). Plus Highland Fairview cross-party signal (also gave Villaraigosa $78,400).",
    prototypeFile: "(not yet built)",
    prototypeUrl: "",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/bianco.md",
    status: "upcoming",
    verificationSeeds: [],
    perplexityRounds: [
      { name: "Bianco donor + LE money + Oath Keepers + ballot seizure", status: "applied (Prompt #6)", date: "2026-05-02" },
      { name: "Bianco institutional money audit (M&D + Downs aggregation question + 5 industry donor classes)", status: "applied (perplexity-research/2026-05-03-bianco-institutional-money-results.md)", date: "2026-05-03" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Lead angle locked", detail: "M&D Development + Downs Energy aggregation question — Tier 1 Cal-Access rows + Tier 2 SF Chronicle Mar 31 2026 (shared address, M&D operates Downs per Corona staff report, Bill Essayli on record). Defamation surface low. Single-page tight beat.", status: "done" },
      { label: "Target ship date", detail: "Week 2 of distribution push (post-May 8). Fastest GOP-side beat to ship.", status: "pending" },
      { label: "Source material exists", detail: "C-005 in emerging-beat-candidates.md; Cal-Access RCPT_CD verified for committee 1479095 ($4.47M / 7,324 donors — unaffected by Form 496 dedup fix because direct candidate-committee giving rarely triggers 24-hr reports)", status: "done" },
      { label: "Highland Fairview cross-region signal", detail: "Same entity gave Bianco $39,200 + Villaraigosa $72,800 + Riverside Sheriffs' Association PEF $49,000 + Moving California Forward $69,000. Iddo Benzeevi (principal) is Riverside developer with multi-direction giving.", status: "done" },
      { label: "Prototype HTML", detail: "Not yet built", status: "pending" },
      { label: "OG share card", detail: "Pending — add CARDS entry to scripts/render-og-images.cjs when prototype is shipped", status: "pending" },
    ],
  },
  {
    slug: "villaraigosa-pledge",
    publicSlug: "villaraigosa-pledge",
    title: "The pledge he dropped.",
    deck:
      "Signed the No Fossil Fuel Money pledge in 2018. Refused to re-sign it in 2026. $176K+ from oil donors since entering the 2026 race (LA Times May 2025), $1M+ over decades. CalMatters March 2026: called for moratorium on greenhouse-gas reduction rules and CARB overhaul. His own spokesperson Josh Pulliam on record: 'He didn't break the pledge — he's just refusing to sign it this time around.' Sidebars: $381,820 Newsom advisory contract; Stewart Resnick $72,800 + Wonderful Nut Orchards named in 2025 State Water Board order; paid Coinbase advisory role 2024-2026.",
    prototypeFile: "(not yet built)",
    prototypeUrl: "",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/villaraigosa.md",
    status: "upcoming",
    verificationSeeds: [],
    perplexityRounds: [
      { name: "Villaraigosa donor + post-mayor income + fossil fuel pledge break", status: "applied (Prompt #7)", date: "2026-05-02" },
      { name: "Resnick / Wonderful Company water-rights regulatory exposure", status: "applied — Wonderful Nut Orchards named in State Water Board 2025 order; Resnick gave $72,800 + cross-candidate hedge ($545K across 5 cmtes including Mahan/Swalwell/Becerra/Newsom Yes on 50)", date: "2026-05-03" },
      { name: "Coinbase / Ripple California regulatory + crypto donor map", status: "applied — Villaraigosa joined Coinbase global advisory council April 2024 (LA Times); paid adviser through 2026 governor run", date: "2026-05-03" },
    ],
    auditPasses: [],
    editorialChecklist: [
      { label: "Headline locked", detail: '"The pledge he dropped." Strongest contradiction in the field — Tier 1 + Tier 2 anchored, on-record spokesperson defense.', status: "done" },
      { label: "Target ship date", detail: "Week 2 of distribution push (post-May 8). Highest-leverage second beat after Mahan concentration.", status: "pending" },
      { label: "Source material exists", detail: "C-006 in emerging-beat-candidates.md; Cal-Access RCPT_CD verified for committee 1471635; LA Times May 26 2025 + CalMatters Mar 18 2026 + Politico Jul 31 2025 multi-publication coverage already in record.", status: "done" },
      { label: "Resnick water-rights sidebar anchored", detail: "State Water Board July 21 2025 order names Wonderful Nut Orchards LLC as part of Westside Mutual Water Company — Tier 1 regulatory tie. Resnick cross-candidate hedge documented across 5 committees + Newsom ballot committee.", status: "done" },
      { label: "Coinbase advisory sidebar anchored", detail: "LA Times April 2024 + March 2026 confirms paid advisory role. Specific compensation amount: NO DATA per Perplexity follow-up.", status: "done" },
      { label: "Prototype HTML", detail: "Not yet built", status: "pending" },
      { label: "OG share card", detail: "Pending — add CARDS entry to scripts/render-og-images.cjs when prototype is shipped", status: "pending" },
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

export function getBeat(slug: string): BeatRecord | null {
  return BEATS.find((b) => b.slug === slug) || null
}

export function listBeats(): BeatRecord[] {
  return BEATS
}

export function listBeatsByStatus(status: BeatStatus): BeatRecord[] {
  return BEATS.filter((b) => b.status === status)
}
