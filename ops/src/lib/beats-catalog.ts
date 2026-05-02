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

export type BeatStatus = "active" | "draft" | "published" | "archived"

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
    status: "active",
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
        detail: "10 memes across 5 stories. Five tagged for this beat. Captions queued via /memes ops surface.",
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
    publicSlug: "chevron",
    title: "He took the check. Then he defended it.",
    deck:
      "$39,200 from Chevron USA Inc. landed in Becerra's 2026 California governor account on June 16, 2025. Ten months later he told voters Chevron was not the bad guy. Two of his rivals refused fossil fuel money. He took it.",
    prototypeFile: "beat-chevron.html",
    prototypeUrl: "http://localhost:8096/chevron",
    dossierPath: "content/Admin Notes/ca-gov-2026-dossiers/becerra.md",
    status: "active",
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

export function getBeat(slug: string): BeatRecord | null {
  return BEATS.find((b) => b.slug === slug) || null
}

export function listBeats(): BeatRecord[] {
  return BEATS
}
