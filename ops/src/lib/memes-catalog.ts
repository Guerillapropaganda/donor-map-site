/**
 * Meme catalog · 2026-05-02 ops Memes page
 *
 * Hand-curated list of every meme in prototype/memes-may-1.html, tagged with
 * which beats it supports, with the editorial caption pre-written for X /
 * Bluesky compose intent.
 *
 * Add a new meme:
 *   1. Add the <div class="meme" id="meme-N"> to prototype/memes-may-1.html
 *   2. Add an entry below with id matching the anchor
 *   3. Restart the ops dev server (Next.js doesn't always hot-reload data files)
 *
 * Captions: written em-dash-free, AI-vernacular-free, primary-source-cited.
 * Each caption ends with "thedonormap.org" so social posts always carry the
 * site link. Hashtags are minimal; we let the receipts speak.
 */

export type BeatSlug = "three-becerras" | "not-the-bad-guy" | "class-traitor" | "hilton" | "steyer" | "mahan" | "carace26-map" | "race-overview"

export interface BeatMeta {
  slug: BeatSlug
  title: string
  description: string
  prototypeUrl: string
  status: "published" | "unpublished"
}

export interface MemeEntry {
  id: string
  title: string
  story: string
  beats: BeatSlug[]
  caption: string
  prototypeAnchor: string
  prototypeUrlBase: string
  /** Brutalist thumbnail render data. Each meme has 1-3 lines of headline,
   *  optional highlighted phrase, and optional receipt list. The thumbnail
   *  component renders these in the Donor Map design system (cream bg,
   *  Inter 900 + Instrument Serif italic + Space Mono, yellow/red/blue/black
   *  highlight blocks). */
  thumbnail: {
    /** Big headline lines, rendered in Inter 900. */
    headlineLines: { text: string; highlight?: { phrase: string; color: "yellow" | "red" | "blue" | "black" } }[]
    /** Optional smaller serif-italic deck under the headline. */
    deck?: string
    /** Optional receipt list (donor or quote rows). */
    receipts?: { name: string; value: string }[]
    /** Topbar tag (right side of the topbar), defaults to "CA GOV 2026". */
    topbarTag?: string
    /** When set, MemeCard renders the full share-card layout (with embedded
     *  SVG graph) instead of the structured-data thumbnail. The Copy as PNG
     *  button captures the rendered ShareCardFull element directly. */
    shareCardKind?: "three-becerras" | "not-the-bad-guy" | "class-traitor" | "hilton" | "carace26-map" | "mahan" | "steyer"
  }
}

export const BEATS: BeatMeta[] = [
  {
    slug: "three-becerras",
    title: "Three Becerras",
    description:
      "Xavier Becerra's 2026 California gubernatorial bid: 24 years of single-payer cosponsorships, three different 2026 messages, the donor list whose interests the softest message serves. Live at thedonormap.org/three-becerras.",
    prototypeUrl: "http://localhost:8096/three-becerras",
    status: "published",
  },
  {
    slug: "not-the-bad-guy",
    title: "Not the Bad Guy (Becerra · Chevron)",
    description:
      "$39,200 from Chevron USA Inc. landed in Becerra's California governor account on June 16, 2025 (the legal max). Two rivals signed pledges refusing fossil fuel money. He kept the check and called the company 'not the bad guy' at a public forum on April 29, 2026. Live at thedonormap.org/not-the-bad-guy.",
    prototypeUrl: "http://localhost:8096/not-the-bad-guy",
    status: "published",
  },
  {
    slug: "class-traitor",
    title: "Class Traitor (Steyer)",
    description:
      "~$31 million in regulated-industry money to defeat Tom Steyer in the 2026 California gubernatorial primary: PG&E $10M, CA Realtors $5M, CA Chamber $5M, BIA $1M, coalition tracked ~$10M more. Live at thedonormap.org/class-traitor.",
    prototypeUrl: "http://localhost:8096/class-traitor",
    status: "published",
  },
  {
    slug: "hilton",
    title: "Hilton (AI conflict of interest)",
    description:
      "Steve Hilton's March 6, 2026 candidate Form 700 puts him personally on Schedule A-1 holding equity in Sierra Technologies, Inc. (FMV Over $1,000,000), a private AI company at $10B valuation. His spouse Rachel Whetstone is on Schedule C with Over $100,000 income from the same Sierra as head of communications. Hilton also discloses ongoing Fox News Network commentator income while campaigning. Live at thedonormap.org/hilton.",
    prototypeUrl: "http://localhost:8096/hilton",
    status: "published",
  },
  {
    slug: "steyer",
    title: "Steyer (AI policy: brother runs the lobby)",
    description:
      "Tom Steyer is running on tighter California AI rules. His brother Jim runs Common Sense Media, the named advocate behind the three biggest CA AI bills (AB-1064 vetoed, AB-1709 pending, AB-2023 pending). Tom and Kat Taylor have donated $5M+ to the lobby. CalMatters May 4 2026 reporting (Jeanne Kuang). The Democratic-side mirror to /hilton — same family-AI-policy conflict shape, opposite policy direction. Live at thedonormap.org/steyer.",
    prototypeUrl: "http://localhost:8096/steyer",
    status: "published",
  },
  {
    slug: "mahan",
    title: "Mahan ($43M IE PAC, 61 people)",
    description:
      "Matt Mahan has raised $0 in his own candidate committee. The $43M+ on his side flows entirely through Back to Basics California, an Independent Expenditure PAC he legally cannot coordinate with. Sequoia (Moritz $2M), Y Combinator (Seibel $1M), Stripe (Collison $990K), Coinbase (Armstrong $500K), plus Pritzker, Caruso, Mehta, Ashley Merrill. Sand Hill Road's preferred candidate, no direct fundraising at all. Live at thedonormap.org/mahan.",
    prototypeUrl: "http://localhost:8096/mahan",
    status: "published",
  },
  {
    slug: "carace26-map",
    title: "Race Map (cross-cutting donor overlay)",
    description:
      "Eight candidates, 55 named donors, 8 multi-candidate hedge bets, 17 industry tags. Interactive D3 force-directed graph at the top — hover any candidate to see their donors, hover any donor to see which candidates they fund. Sections: §1 hedge bets, §2 industry wars, §3 aggregation/cluster patterns, §4 candidate-by-candidate shape comparison. The editorial synthesis the site has been promising since launch.",
    prototypeUrl: "http://localhost:8096/carace26-map",
    status: "unpublished",
  },
  {
    slug: "race-overview",
    title: "Race Overview (cross-cutting)",
    description: "Memes that span multiple candidates or address the race at a structural level rather than per-beat.",
    prototypeUrl: "http://localhost:8096/memes-may-1",
    status: "unpublished",
  },
]

const BASE = "http://localhost:8096/memes-may-1"
const SHARE_CARDS_BASE = "http://localhost:8096/share-cards-2026-05-03"

export const MEMES: MemeEntry[] = [
  {
    id: "may1-meme-1",
    title: "PG&E spent $10M to defeat Steyer",
    story: "Story 1 · Utility-vs-billionaire",
    beats: ["class-traitor"],
    prototypeAnchor: "#meme-1",
    prototypeUrlBase: BASE,
    caption:
      "PG&E spent $10 million to defeat Tom Steyer in the 2026 California gubernatorial primary.\n\nThe utility behind the Camp Fire (84 counts of involuntary manslaughter, 2020) is funding the campaign against the only major candidate running on utility-and-climate accountability.\n\nFPPC committee 1490270, Cal-Access primary-source verified.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "PG&E spent" },
        { text: "$10M", highlight: { phrase: "$10M", color: "red" } },
        { text: "to defeat Tom Steyer." },
      ],
      deck: "The utility behind the Camp Fire is funding the campaign against utility-and-climate accountability.",
    },
  },
  {
    id: "may1-meme-2",
    title: "$30K to David Binder Research for opposition polling",
    story: "Story 1 · Utility-vs-billionaire",
    beats: ["class-traitor"],
    prototypeAnchor: "#meme-2",
    prototypeUrlBase: BASE,
    caption:
      "First the anti-Steyer industry coalition spent $10M to defeat him.\n\nThen they paid $30,000 to David Binder Research for opposition polling.\n\nFiling description, on the public record: \"Survey/Oppose/Tom Steyer/Governor/Statewide.\"\n\nCal-Access EXPN_CD filing 3138008. FPPC committee 1489677.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "Then they paid" },
        { text: "$30,000", highlight: { phrase: "$30,000", color: "yellow" } },
        { text: "for opposition polling." },
      ],
      deck: "Filing description, on the public record: \"Survey/Oppose/Tom Steyer/Governor/Statewide.\"",
    },
  },
  {
    id: "may1-meme-3",
    title: "Anti-Steyer ledger · receipt of $10,050,000",
    story: "Story 1 · Utility-vs-billionaire",
    beats: ["class-traitor"],
    prototypeAnchor: "#meme-3",
    prototypeUrlBase: BASE,
    caption:
      "The anti-Steyer ledger, primary-source verified through Cal-Access:\n\nPG&E Corp · $8,000,000\nPG&E Corp (4/20) · $1,975,000\nIBEW Local 1245 · $75,000\n\nVerified total · $10,050,000\n\nFPPC committee 1490270. Plus a separate $30K David Binder Research opposition poll commissioned by sister committee 1489677.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [{ text: "Anti-Steyer ledger" }],
      receipts: [
        { name: "Pacific Gas & Electric Corp", value: "$8,000,000" },
        { name: "PG&E Corp (4/20)", value: "$1,975,000" },
        { name: "IBEW Local 1245", value: "$75,000" },
        { name: "VERIFIED TOTAL", value: "$10,050,000" },
      ],
    },
  },
  {
    id: "may1-meme-4",
    title: "Becerra surge from 15% to 24% in two weeks",
    story: "Story 2 · Who's buying the front-runner",
    beats: ["three-becerras"],
    prototypeAnchor: "#meme-4",
    prototypeUrlBase: BASE,
    caption:
      "Xavier Becerra polling two weeks ago: 15%.\n\nXavier Becerra today: 24%.\n\nThe poll commissioner: an anti-Steyer independent expenditure backing Becerra (Sacramento Bee, April 21).\n\nWho is paying for that 9-point surge?\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "Becerra two weeks ago: 15%" },
        { text: "Becerra today:" },
        { text: "24%", highlight: { phrase: "24%", color: "red" } },
      ],
      deck: "Who is paying for that 9-point surge?",
      topbarTag: "POLL · 4/27/2026",
    },
  },
  {
    id: "may1-meme-5",
    title: "Becerra spent four years regulating Anthem",
    story: "Story 2 · Who's buying the front-runner",
    beats: ["three-becerras"],
    prototypeAnchor: "#meme-5",
    prototypeUrlBase: BASE,
    caption:
      "Xavier Becerra spent four years regulating Anthem as Secretary of Health and Human Services.\n\nTwo months after he left, Anthem's founder Leonard Schaeffer maxed out to his governor campaign at $39,200.\n\nCal-Access RCPT_CD filing 3071361. FPPC committee 1480025. April 15, 2025.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "Xavier Becerra spent four years" },
        { text: "regulating Anthem.", highlight: { phrase: "regulating Anthem.", color: "blue" } },
        { text: "Two months after he left," },
        { text: "Anthem's founder", highlight: { phrase: "Anthem's founder", color: "yellow" } },
        { text: "maxed out to his governor campaign." },
      ],
      receipts: [
        { name: "Leonard Schaeffer (Anthem founder)", value: "$39,200" },
        { name: "Chevron USA Inc.", value: "$39,200" },
        { name: "AltaMed Health Network", value: "$39,200" },
      ],
    },
  },
  {
    id: "may1-meme-6",
    title: "Crypto industry hedges all three lanes",
    story: "Story 3 · The crypto hedge",
    beats: ["race-overview"],
    prototypeAnchor: "#meme-6",
    prototypeUrlBase: BASE,
    caption:
      "Chris Larsen of Ripple just maxed out to a Republican (Steve Hilton, $39,200) AND a Democrat (Katie Porter, $39,200) in the same California governor's race.\n\nBrian Armstrong of Coinbase put $500,000 into Mahan's IE PAC.\n\nThe crypto industry is not picking sides. It is owning all three lanes simultaneously.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "Chris Larsen of" },
        { text: "Ripple", highlight: { phrase: "Ripple", color: "yellow" } },
        { text: "maxed out to:" },
      ],
      deck: "Steve Hilton (R) · $39,200. Katie Porter (D) · $39,200. Same person. Same race. Opposite parties.",
    },
  },
  {
    id: "may1-meme-7",
    title: "The polls are part of the race",
    story: "Story 4 · The polling layer",
    beats: ["class-traitor"],
    prototypeAnchor: "#meme-7",
    prototypeUrlBase: BASE,
    caption:
      "In plain English: the companies that don't want Steyer to win are paying for the polls that say Steyer is losing.\n\nThe polls aren't measuring the race. The polls are part of the race.\n\nAnti-Steyer coalition: PG&E, California Realtors, Cal Chamber JOBSPAC, Building Industry Association, IBEW Local 1245, CCPOA. Approximately $22M visible pool.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "The companies that don't want" },
        { text: "Steyer", highlight: { phrase: "Steyer", color: "red" } },
        { text: "to win are paying for the polls" },
        { text: "that say", },
        { text: "Steyer is losing.", highlight: { phrase: "Steyer is losing.", color: "yellow" } },
      ],
      deck: "The polls aren't measuring the race. The polls are part of the race.",
      topbarTag: "POLLING LAYER",
    },
  },
  {
    id: "may1-meme-8",
    title: "One pollster, three paying clients, same race",
    story: "Story 4 · The polling layer",
    beats: ["class-traitor"],
    prototypeAnchor: "#meme-8",
    prototypeUrlBase: BASE,
    caption:
      "David Binder Research, in the same months, on the same California governor race, has paid contracts from:\n\n· Anti-Steyer industry coalition (oppose Steyer): $30,000\n· Eric Swalwell for Governor (support Swalwell): $50,000\n· California Democratic Party VOTER Index (official tracker)\n\nPlus public horserace polls in the news on the same race.\n\nLegal under California disclosure law. No FPPC complaint on file.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [{ text: "David Binder Research, on the same race:" }],
      receipts: [
        { name: "Anti-Steyer coalition (oppose Steyer)", value: "$30,000" },
        { name: "Swalwell for Governor (support)", value: "$50,000" },
        { name: "CA Dem Party VOTER Index Tracker", value: "official" },
        { name: "PLUS public horserace polls", value: "on same race" },
      ],
      topbarTag: "ONE POLLSTER · ONE RACE",
    },
  },
  {
    id: "may1-meme-9",
    title: "Becerra: 24% from Gudelunas vs 13% from CBS",
    story: "Story 4 · The polling layer",
    beats: ["class-traitor", "three-becerras"],
    prototypeAnchor: "#meme-9",
    prototypeUrlBase: BASE,
    caption:
      "Becerra polling on the same field dates, April 14 through April 27:\n\nGudelunas (anti-Steyer IE sponsor): 24%\nIndependent Voter Project: 23%\nEMC Research: 21%\nCBS News / YouGov (media-funded): 13%\nEmerson / ICP (media-funded): 10%\n\nSame person, same race, two-week window. The IE-sponsored polls put him 11 points above the media-funded ones.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [{ text: "Becerra · same field window:" }],
      receipts: [
        { name: "Gudelunas (anti-Steyer IE)", value: "24%" },
        { name: "Independent Voter Project", value: "23%" },
        { name: "EMC Research", value: "21%" },
        { name: "CBS News / YouGov · media", value: "13%" },
        { name: "Emerson / ICP · media", value: "10%" },
      ],
      topbarTag: "SAME WEEK · DIFFERENT POLLS",
    },
  },
  {
    id: "may1-meme-10",
    title: "Three audiences. Three Becerras. The receipts pick one.",
    story: "Story 5 · The Becerra bait-and-switch",
    beats: ["three-becerras"],
    prototypeAnchor: "#meme-10",
    prototypeUrlBase: BASE,
    caption:
      "Xavier Becerra cosponsored single-payer bills seven times across four Congresses.\n\nMarch 23, 2026 (campaign social media): \"I'm ready to go further as Governor and deliver single-payer health care for our state.\"\n\nApril 2026 (KQED reporting on his closed-door meeting with the California Medical Association): \"He said very clearly that, at this point, he wasn't supportive of single payer.\"\n\nSix weeks. Same election. Same candidate.\n\nThe healthcare-industry max donors on his receipts list: Anthem founder, Molina Healthcare CEO, the largest CA FQHC, a hospital chain under active HHS-OIG agreement, the founder of one of the largest physician-owned hospital systems, plus an Adventist + Kaiser household pair.\n\nthedonormap.org/three-becerras",
    thumbnail: {
      headlineLines: [
        { text: "Becerra cosponsored single-payer" },
        { text: "seven times", highlight: { phrase: "seven times", color: "yellow" } },
        { text: "in Congress." },
      ],
      deck: "Three audiences. Three Becerras. The receipts pick one.",
      receipts: [
        { name: "Schaeffer (Anthem founder)", value: "$39,200" },
        { name: "Molina Healthcare CEO", value: "$49,700" },
        { name: "AltaMed (largest CA FQHC)", value: "$39,200" },
        { name: "Cantu (DHR Health)", value: "$39,200" },
        { name: "Prime Healthcare (HHS-OIG CIA)", value: "$20,000" },
      ],
      topbarTag: "BECERRA · CA GOV 2026",
    },
  },
  {
    id: "may1-meme-11",
    title: "$13,782,095 paid to Polaris Campaigns to attack Steyer",
    story: "Story 6 · Anti-Steyer machine + Becerra silent gap",
    beats: ["class-traitor"],
    prototypeAnchor: "#meme-11",
    prototypeUrlBase: BASE,
    caption:
      "$13,782,095 paid to one digital-ad vendor to attack one candidate.\n\nPolaris Campaigns, Inc. received the money from FPPC committee 1489677 across multiple Form 460 line items, every one filed under the description \"Digital Media / Oppose / Tom Steyer / Governor / Statewide.\"\n\nThat's the operational shop turning a regulated-industry coalition's $21 million into the digital ads flooding the feed of every California voter who looked up Steyer this cycle.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "Anti-Steyer machine paid one vendor" },
        { text: "$13,782,095", highlight: { phrase: "$13,782,095", color: "red" } },
        { text: "to attack one candidate." },
      ],
      deck: "Polaris Campaigns, every Form 460 line filed under \"Digital Media / Oppose / Tom Steyer / Governor / Statewide.\"",
      topbarTag: "STEYER · CA GOV 2026",
    },
  },
  {
    id: "may1-meme-12",
    title: "Bearstar Strategies: same shop, both sides",
    story: "Story 6 · Anti-Steyer machine + Becerra silent gap",
    beats: ["class-traitor", "three-becerras"],
    prototypeAnchor: "#meme-12",
    prototypeUrlBase: BASE,
    caption:
      "Bearstar Strategies, Inc. took $49,800 from the anti-Steyer committee on April 1, 2026, filed as \"Digital Media / Oppose / Tom Steyer / Governor / Statewide.\"\n\nThe same firm runs Becerra's pro-Becerra independent expenditure committee.\n\nThe shop messaging against Steyer is the shop messaging for Becerra. The IE coalition's attack and the Becerra campaign's defense are the same operation.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "The shop messaging" },
        { text: "against Steyer", highlight: { phrase: "against Steyer", color: "red" } },
        { text: "is the shop messaging" },
        { text: "for Becerra.", highlight: { phrase: "for Becerra", color: "yellow" } },
      ],
      deck: "Bearstar Strategies. Same firm, both sides. April 1, 2026.",
      topbarTag: "STEYER + BECERRA · CA GOV 2026",
    },
  },
  {
    id: "may1-meme-13",
    title: "The 72-hour committee rename",
    story: "Story 6 · Anti-Steyer machine + Becerra silent gap",
    beats: ["class-traitor"],
    prototypeAnchor: "#meme-13",
    prototypeUrlBase: BASE,
    caption:
      "FPPC committee 1489677 was first filed March 27, 2026 under the name \"Californians for the People, sponsored by business owners and concerned citizens.\"\n\nAmended three days later: \"California is Not for Sale, NO ON Steyer for Governor 2026, a Coalition of Housing Advocates, Labor and Small Business.\"\n\nSame FPPC ID. Same filer. Same treasurer. Same Sacramento address.\n\nThe civic-sounding placeholder was the cover. The explicit anti-Steyer name was always the intent. No outlet has reported the rename.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "Same FPPC ID." },
        { text: "Two names" },
        { text: "in 72 hours.", highlight: { phrase: "72 hours", color: "red" } },
      ],
      deck: "March 27 \"Californians for the People\" → March 30 \"California is Not for Sale, NO ON Steyer.\"",
      topbarTag: "STEYER · CA GOV 2026",
    },
  },
  {
    id: "may1-meme-14",
    title: "Becerra stopped cosponsoring single-payer in 2013",
    story: "Story 6 · Anti-Steyer machine + Becerra silent gap",
    beats: ["three-becerras"],
    prototypeAnchor: "#meme-14",
    prototypeUrlBase: BASE,
    caption:
      "Xavier Becerra cosponsored single-payer health care seven times in Congress: 1993, 1994, 1995, 2005, 2007, 2009, 2011.\n\nIn 2013 (113th Congress) and 2015 (114th Congress), Becerra was still in the House. He did not cosponsor HR 676 in either.\n\nHe stopped four years before he left office.\n\nThe \"30-year advocate\" framing his 2026 campaign uses describes 1993 through 2011 accurately. It elides the 2013-2016 silence on the same bill while he was still in office. The gap is in the public GovInfo bill-status record.\n\nthedonormap.org",
    thumbnail: {
      headlineLines: [
        { text: "He cosponsored" },
        { text: "7 times.", highlight: { phrase: "7 times", color: "yellow" } },
        { text: "Then went" },
        { text: "silent.", highlight: { phrase: "silent", color: "red" } },
      ],
      deck: "Becerra cosponsored single-payer 1993, 1994, 1995, 2005, 2007, 2009, 2011. Not in 2013. Not in 2015. Still in office.",
      receipts: [
        { name: "1993-2011 · cosponsored", value: "7 times" },
        { name: "2013-2016 · cosponsored", value: "0 times" },
      ],
      topbarTag: "BECERRA · CA GOV 2026",
    },
  },
  // ─── 2026-05-03 share-card kit (3 master beat cards) ───────────────────
  {
    id: "may3-three-becerras-share",
    title: "Three Becerras · master share card",
    story: "Sunday-evening soft-launch · FB-group share kit",
    beats: ["three-becerras"],
    prototypeAnchor: "#card-1",
    prototypeUrlBase: SHARE_CARDS_BASE,
    caption:
      "Xavier Becerra cosponsored single-payer bills seven times across four Congresses. In 2026 he gave three different answers in six weeks about whether he still supports it.\n\nThe donor list explains which version he settled on. Six healthcare-industry max contributors. About $207,000. Roughly 45% of his top-fifteen dollars.\n\nWhat he says depends on who is listening:\nthedonormap.org/three-becerras",
    thumbnail: {
      headlineLines: [
        { text: "What he says depends on" },
        { text: "who is listening.", highlight: { phrase: "who is listening", color: "red" } },
      ],
      deck: "Six healthcare-industry max donors fund the candidate whose softest message is the one their business is served by.",
      receipts: [
        { name: "Schaeffer (Anthem founder)", value: "$39,200" },
        { name: "AltaMed (largest CA FQHC)", value: "$39,200" },
        { name: "Molina Healthcare (former CEO)", value: "$49,700" },
        { name: "Cantu (DHR Health co-founder)", value: "$39,200" },
      ],
      topbarTag: "BECERRA · CA GOV 2026",
      shareCardKind: "three-becerras",
    },
  },
  {
    id: "may3-not-the-bad-guy-share",
    title: "Not the Bad Guy · master share card",
    story: "Sunday-evening soft-launch · FB-group share kit",
    beats: ["not-the-bad-guy"],
    prototypeAnchor: "#card-2",
    prototypeUrlBase: SHARE_CARDS_BASE,
    caption:
      "$39,200 from Chevron USA Inc. landed in Xavier Becerra's California governor account on June 16, 2025. The legal max.\n\nTwo of his rivals signed pledges refusing fossil fuel money. He took the check.\n\nTen months later, asked at a public forum why he kept it: \"They're not the bad guy.\"\n\nthedonormap.org/not-the-bad-guy",
    thumbnail: {
      headlineLines: [
        { text: "He took the check." },
        { text: "Then he", highlight: { phrase: "defended it", color: "red" } },
        { text: "defended it." },
      ],
      deck: "$39,200 from Chevron. The legal max. Two rivals signed pledges refusing fossil fuel money. He kept it and called the company not the bad guy.",
      receipts: [
        { name: "Chevron USA Inc. → Becerra", value: "$39,200" },
        { name: "Date filed", value: "Jun 16, 2025" },
        { name: '"Not the bad guy" forum', value: "Apr 29, 2026" },
      ],
      topbarTag: "BECERRA · CA GOV 2026",
      shareCardKind: "not-the-bad-guy",
    },
  },
  {
    id: "may3-class-traitor-share",
    title: "Class Traitor · master share card",
    story: "Sunday-evening soft-launch · FB-group share kit",
    beats: ["class-traitor"],
    prototypeAnchor: "#card-3",
    prototypeUrlBase: SHARE_CARDS_BASE,
    caption:
      "California's donor class organized against Tom Steyer in 2026.\n\nPG&E $10M. CA Realtors $5M. CA Chamber $5M. CA Building Industry Association $1M. Coalition tracked ~$10M more.\n\nApproximately $31 million from regulated-industry money against the only billionaire in the race who pledged to refuse fossil-fuel and corporate money.\n\nFPPC committee 1489677. Top 10 Contributors list, June 2026 primary.\n\nthedonormap.org/class-traitor",
    thumbnail: {
      headlineLines: [
        { text: "$31 million to bury a" },
        { text: "class traitor.", highlight: { phrase: "class traitor", color: "red" } },
      ],
      deck: "California's donor class organized against the only billionaire who pledged to refuse fossil-fuel and corporate money.",
      receipts: [
        { name: "PG&E (utility monopoly)", value: "$10M" },
        { name: "CA Realtors", value: "$5M" },
        { name: "CA Chamber of Commerce", value: "$5M" },
        { name: "Coalition tracked", value: "~$10M" },
      ],
      topbarTag: "STEYER · CA GOV 2026",
      shareCardKind: "class-traitor",
    },
  },
  // ─── 2026-05-04 Hilton AI-conflict share kit ───────────────────────────
  {
    id: "may4-hilton-share",
    title: "Hilton · master share card · Form 700 disclosure spine",
    story: "Hilton AI-conflict launch · FB-group + X share kit",
    beats: ["hilton"],
    prototypeAnchor: "#card-4",
    prototypeUrlBase: SHARE_CARDS_BASE,
    caption:
      "Steve Hilton wants to regulate AI in California. He owns stock in an AI company.\n\nThis is on his own sworn financial disclosure.\n\nMarch 6, 2026 · candidate Form 700 · filed under penalty of perjury:\n\n· Schedule A-1 · Stephen G. Hilton · Sierra Technologies, Inc. · FMV Over $1,000,000\n· Schedule C · Rachel Whetstone (spouse) · Sierra Technologies, Inc. · Income Over $100,000\n· Schedule C · Stephen G. Hilton · Fox News Network LLC · Income $10,001-$100,000\n\nTwo of three lines point at the same company. Sierra is a private AI startup valued at $10 billion.\n\nThe California governor signs AI safety bills, appoints the people who enforce them, and decides what AI software California state agencies buy.\n\nthedonormap.org/hilton",
    thumbnail: {
      headlineLines: [
        { text: "Steve Hilton wants to" },
        { text: "regulate AI", highlight: { phrase: "regulate AI", color: "yellow" } },
        { text: "in California." },
        { text: "He owns" },
        { text: "stock in an AI company.", highlight: { phrase: "stock in an AI company", color: "red" } },
      ],
      deck: "His own sworn financial disclosure shows it. His wife heads communications at the same AI company.",
      receipts: [
        { name: "Sched A-1 · Hilton · Sierra Technologies, Inc.", value: "FMV Over $1M" },
        { name: "Sched C · Whetstone · Sierra Technologies, Inc.", value: "Over $100K" },
        { name: "Sched C · Hilton · Fox News Network LLC", value: "$10K-$100K" },
      ],
      topbarTag: "HILTON · CA GOV 2026",
      shareCardKind: "hilton",
    },
  },
  {
    id: "may4-hilton-meme-receipt-stack",
    title: "Three sworn lines, one filing, two point at Sierra",
    story: "Hilton AI-conflict launch · structured-receipt thumbnail",
    beats: ["hilton"],
    prototypeAnchor: "#meme-hilton-receipts",
    prototypeUrlBase: BASE,
    caption:
      "Steve Hilton's March 2026 candidate Form 700, signed under penalty of perjury.\n\nThree sworn disclosures. Two of them point at the same company.\n\n· Hilton · Sierra Technologies, Inc. stock · FMV Over $1,000,000 (Schedule A-1)\n· Wife Rachel Whetstone · Sierra Technologies, Inc. comms head · Over $100,000 income (Schedule C)\n· Hilton · Fox News Network LLC commentator income · $10,001-$100,000 (Schedule C)\n\nSierra is a private AI startup at a $10 billion valuation. The next governor of California signs AI safety bills and picks the people who enforce them.\n\nthedonormap.org/hilton",
    thumbnail: {
      headlineLines: [
        { text: "Three sworn lines on" },
        { text: "one filing.", highlight: { phrase: "one filing", color: "yellow" } },
        { text: "Two point at" },
        { text: "the same AI company.", highlight: { phrase: "the same AI company", color: "red" } },
      ],
      deck: "Steve Hilton's March 6, 2026 candidate Form 700, signed under penalty of perjury. Sierra Technologies, Inc. is a private AI company valued at $10 billion.",
      receipts: [
        { name: "A-1 · Hilton · Sierra stock", value: "Over $1M" },
        { name: "C · Whetstone · Sierra income", value: "Over $100K" },
        { name: "C · Hilton · Fox News income", value: "$10K-$100K" },
      ],
      topbarTag: "HILTON · CA GOV 2026",
    },
  },
  {
    id: "may4-hilton-meme-regulate-own-stock",
    title: "He wants to regulate the industry he owns stock in",
    story: "Hilton AI-conflict launch · structural punchline",
    beats: ["hilton"],
    prototypeAnchor: "#meme-hilton-regulate",
    prototypeUrlBase: BASE,
    caption:
      "California's governor signs the AI safety bills the legislature passes.\n\nCalifornia's governor appoints the people who enforce California's AI training-data rules.\n\nCalifornia's governor decides what AI software California state agencies buy.\n\nSteve Hilton is running for that office. He personally owns stock in Sierra Technologies, Inc. (a private AI company, $10 billion valuation, Form 700 Schedule A-1, FMV Over $1,000,000). His wife heads communications at the same Sierra.\n\nthedonormap.org/hilton",
    thumbnail: {
      headlineLines: [
        { text: "He wants to" },
        { text: "regulate AI.", highlight: { phrase: "regulate AI", color: "yellow" } },
        { text: "He owns" },
        { text: "stock in an AI company.", highlight: { phrase: "stock in an AI company", color: "red" } },
      ],
      deck: "California's governor signs AI safety bills, appoints the people who enforce them, and decides what AI software California state agencies buy.",
      topbarTag: "HILTON · CA GOV 2026",
    },
  },
  // ─── 2026-05-04 not-the-bad-guy gap-fill (master share existed; +2 thumbnails) ───
  {
    id: "may4-not-the-bad-guy-meme-timeline",
    title: "Chevron check landed June 2025. Defense came April 2026.",
    story: "Becerra-Chevron timeline · receipt-stack thumbnail",
    beats: ["not-the-bad-guy"],
    prototypeAnchor: "#meme-becerra-chevron-timeline",
    prototypeUrlBase: BASE,
    caption:
      "Xavier Becerra's Chevron-money timeline, primary-source verified through Cal-Access:\n\n· Jun 16, 2025 · Chevron USA Inc. → Becerra for Governor 2026 · $39,200 (the legal max)\n· Apr 29, 2026 · Becerra at California Environmental Voters forum: \"They're not the bad guy.\"\n\nTen months between the check and the public defense of the company that wrote it. Two of his rivals signed pledges refusing fossil-fuel money in the same election.\n\nFPPC committee 1480025. Cal-Access RCPT_CD primary-source verified.\n\nthedonormap.org/not-the-bad-guy",
    thumbnail: {
      headlineLines: [
        { text: "$39,200 from Chevron." },
        { text: "Then ten months later:" },
        { text: '"They\'re not the bad guy."', highlight: { phrase: "not the bad guy", color: "red" } },
      ],
      deck: "Two of his rivals signed pledges refusing fossil-fuel money. He kept the check and defended the company that wrote it.",
      receipts: [
        { name: "Chevron USA Inc. → Becerra", value: "$39,200" },
        { name: "Date filed", value: "Jun 16, 2025" },
        { name: "California Environmental Voters forum", value: "Apr 29, 2026" },
        { name: "Months between", value: "10" },
      ],
      topbarTag: "BECERRA · CA GOV 2026",
    },
  },
  {
    id: "may4-not-the-bad-guy-meme-quote-punchline",
    title: '"They\'re not the bad guy." quote-as-punchline',
    story: "Becerra-Chevron · typography punchline",
    beats: ["not-the-bad-guy"],
    prototypeAnchor: "#meme-becerra-chevron-quote",
    prototypeUrlBase: BASE,
    caption:
      "Xavier Becerra, on accepting $39,200 from Chevron USA in his 2026 California governor campaign, asked at a public forum on April 29, 2026:\n\n\"They're not the bad guy.\"\n\nThe forum was hosted by California Environmental Voters. The check landed ten months earlier. Two of his rivals declined that money in the same election.\n\nthedonormap.org/not-the-bad-guy",
    thumbnail: {
      headlineLines: [
        { text: "He took" },
        { text: "$39,200 from Chevron.", highlight: { phrase: "$39,200 from Chevron", color: "yellow" } },
        { text: "His defense:" },
        { text: '"They\'re not the bad guy."', highlight: { phrase: "not the bad guy", color: "red" } },
      ],
      deck: "Xavier Becerra at the California Environmental Voters forum, April 29, 2026. The check landed June 16, 2025.",
      topbarTag: "BECERRA · CA GOV 2026",
    },
  },
  // ─── 2026-05-04 Steyer AI-policy beat · 3-meme launch kit ─────────────
  {
    id: "may4-steyer-share",
    title: "Steyer · master share card · brother + AI lobby parallel",
    story: "Steyer AI-policy · FB-group + X share kit",
    beats: ["steyer"],
    prototypeAnchor: "#card-5",
    prototypeUrlBase: SHARE_CARDS_BASE,
    caption:
      "Tom Steyer is running for California governor on tighter AI regulation.\n\nHis brother Jim Steyer founded Common Sense Media in 2003 and has been its CEO for 23 years. Common Sense is the named advocate behind the three biggest California AI bills:\n\n· AB-1064 (LEAD for Kids Act) · vetoed by Newsom Sept 2025\n· AB-1709 (covered platforms age restriction) · pending in Assembly\n· AB-2023 (companion chatbot safety + audits) · pending\n\nTom and Kat Taylor have donated $5,000,000+ to Common Sense Media per CalMatters May 4 2026 reporting (Jeanne Kuang).\n\nThe Republican-side mirror is at thedonormap.org/hilton: same shape of family-AI conflict, opposite policy direction.\n\nthedonormap.org/steyer",
    thumbnail: {
      headlineLines: [
        { text: "Tom Steyer wants" },
        { text: "tighter AI rules", highlight: { phrase: "tighter AI rules", color: "yellow" } },
        { text: "in California." },
        { text: "His brother runs", highlight: { phrase: "His brother runs", color: "blue" } },
        { text: "the lobby that writes them.", highlight: { phrase: "the lobby that writes them", color: "red" } },
      ],
      deck: "Common Sense Media, founded by Jim Steyer, is the named advocate behind AB-1064, AB-1709, and AB-2023. Tom and Kat Taylor have donated $5M+ to it.",
      receipts: [
        { name: "AB-1064 LEAD for Kids · Bauer-Kahan", value: "VETOED" },
        { name: "AB-1709 platform age restriction", value: "PENDING" },
        { name: "AB-2023 companion chatbot safety", value: "PENDING" },
        { name: "Steyer family → Common Sense Media", value: "$5M+" },
      ],
      topbarTag: "STEYER · CA GOV 2026",
      shareCardKind: "steyer",
    },
  },
  {
    id: "may4-steyer-meme-three-bills",
    title: "Three California AI bills, one named advocate, one family backing it",
    story: "Steyer AI-policy · receipt-stack thumbnail",
    beats: ["steyer"],
    prototypeAnchor: "#meme-steyer-three-bills",
    prototypeUrlBase: BASE,
    caption:
      "California's three biggest AI bills, all currently moving through Sacramento, all with the same named advocate organization:\n\n· AB-1064 LEAD for Kids Act (chatbot age-gate for minors) · vetoed by Newsom September 2025\n· AB-1709 covered platforms age restriction under 16 · pending in Assembly\n· AB-2023 companion chatbot safety + annual third-party audits · pending\n\nThe named advocate on all three: Common Sense Media. Founded 2003 by Jim Steyer. CEO for 23 years.\n\nTom Steyer and his wife Kat Taylor have donated $5,000,000+ to Common Sense Media per CalMatters May 4, 2026 reporting.\n\nthedonormap.org/steyer",
    thumbnail: {
      headlineLines: [
        { text: "Three California AI bills." },
        { text: "One named advocate.", highlight: { phrase: "One named advocate", color: "yellow" } },
        { text: "One family", highlight: { phrase: "One family", color: "blue" } },
        { text: "backing it.", highlight: { phrase: "backing it", color: "red" } },
      ],
      deck: "Tom Steyer is running on tighter AI rules. His brother runs the lobby pushing them. The family has donated $5M+ to that lobby.",
      receipts: [
        { name: "AB-1064 LEAD for Kids", value: "VETOED" },
        { name: "AB-1709 age restriction <16", value: "PENDING" },
        { name: "AB-2023 chatbot safety", value: "PENDING" },
        { name: "Common Sense Media · CEO Jim Steyer", value: "23 years" },
      ],
      topbarTag: "STEYER · CA GOV 2026",
    },
  },
  {
    id: "may4-steyer-meme-five-million",
    title: "$5 million into the lobby. Three bills. Same family.",
    story: "Steyer AI-policy · structural punchline",
    beats: ["steyer"],
    prototypeAnchor: "#meme-steyer-five-million",
    prototypeUrlBase: BASE,
    caption:
      "Tom Steyer and Kat Taylor have donated $5,000,000+ to Common Sense Media, the nonprofit founded by Tom's brother Jim Steyer in 2003.\n\nThat's the named advocate behind California's three most consequential AI bills currently in the legislature: AB-1064 (vetoed), AB-1709 (pending), AB-2023 (pending).\n\nTom Steyer is running for California governor on a platform of tighter AI regulation.\n\nThe California governor signs the bills the legislature passes. CalMatters published the $5M-plus figure on May 4, 2026 (Jeanne Kuang byline).\n\nthedonormap.org/steyer",
    thumbnail: {
      headlineLines: [
        { text: "$5 million", highlight: { phrase: "$5 million", color: "yellow" } },
        { text: "into the lobby." },
        { text: "Three bills." },
        { text: "Same family.", highlight: { phrase: "Same family", color: "red" } },
      ],
      deck: "Tom Steyer and Kat Taylor → Common Sense Media (founded by brother Jim Steyer). Common Sense → AB-1064, AB-1709, AB-2023.",
      topbarTag: "STEYER · CA GOV 2026",
    },
  },
  // ─── 2026-05-04 Mahan IE-PAC beat · 3-meme launch kit ─────────────────
  {
    id: "may4-mahan-share",
    title: "Mahan · master share card · $43M IE PAC, $0 candidate",
    story: "Mahan structure · FB-group + X share kit",
    beats: ["mahan"],
    prototypeAnchor: "#card-6",
    prototypeUrlBase: SHARE_CARDS_BASE,
    caption:
      "Matt Mahan has raised $0 in his own candidate-controlled committee.\n\nThe $43,000,000+ on his side flows entirely through Back to Basics California, an Independent Expenditure PAC he is legally barred from coordinating with.\n\nTop disclosed funders to date:\n\n· Michael Moritz (Sequoia Capital) · $2,000,000\n· Michael Seibel (Y Combinator) · $1,000,000\n· Ashley Merrill (Lunya / Merrill household) · $1,000,000\n· Patrick Collison (Stripe) · $990,000\n· Brian Armstrong (Coinbase) · $500,000\n· John Pritzker (Pritzker family) · $500,000\n· Neil Mehta (Greenoaks Capital) · $500,000\n· Brian Singerman (Founders Fund) · $250,000\n· Rick Caruso (Caruso Affiliated) · $250,000\n\n61 people wrote almost all of it.\n\nthedonormap.org/mahan",
    thumbnail: {
      headlineLines: [
        { text: "$43,000,000", highlight: { phrase: "$43,000,000", color: "yellow" } },
        { text: "for Matt Mahan." },
        { text: "61 people", highlight: { phrase: "61 people", color: "red" } },
        { text: "wrote almost all of it." },
      ],
      deck: "Mahan has raised zero dollars in his own candidate committee. All money flows through an outside spending PAC he legally cannot coordinate with.",
      receipts: [
        { name: "Moritz · Sequoia", value: "$2M" },
        { name: "Seibel · Y Combinator", value: "$1M" },
        { name: "Merrill · Lunya / household", value: "$1M" },
        { name: "Collison · Stripe", value: "$990K" },
        { name: "Armstrong · Coinbase", value: "$500K" },
      ],
      topbarTag: "MAHAN · CA GOV 2026",
      shareCardKind: "mahan",
    },
  },
  {
    id: "may4-mahan-meme-zero-from-voters",
    title: "$0 from voters. $43M from Sand Hill Road.",
    story: "Mahan structure · receipt-stack thumbnail",
    beats: ["mahan"],
    prototypeAnchor: "#meme-mahan-zero-voters",
    prototypeUrlBase: BASE,
    caption:
      "Matt Mahan, candidate-controlled-committee fundraising for the 2026 California governor's race, total to date: $0.\n\nMatt Mahan, Independent Expenditure PAC funding from the Silicon Valley billionaire class: $43,000,000+.\n\nThe IE PAC, Back to Basics California, is legally barred from coordinating with the candidate. Federal Fairshake PAC (Coinbase-backed) spent $10M against Katie Porter in 2024 using the same model.\n\nFPPC IE PAC committee verified through Cal-Access. Top funder list: Sequoia (Moritz $2M), Y Combinator (Seibel $1M), Stripe (Collison $990K), Coinbase (Armstrong $500K), plus Pritzker, Caruso, Mehta, Ashley Merrill.\n\nthedonormap.org/mahan",
    thumbnail: {
      headlineLines: [
        { text: "$0", highlight: { phrase: "$0", color: "red" } },
        { text: "from voters." },
        { text: "$43,000,000", highlight: { phrase: "$43,000,000", color: "yellow" } },
        { text: "from Sand Hill Road." },
      ],
      deck: "Mahan has not raised a candidate-committee dollar in this cycle. Every cent on his side comes through an outside spending PAC.",
      receipts: [
        { name: "Mahan candidate committee · raised", value: "$0" },
        { name: "Back to Basics CA · IE PAC", value: "$43M+" },
        { name: "Total disclosed donors to IE PAC", value: "61" },
        { name: "Top single contribution (Moritz)", value: "$2M" },
      ],
      topbarTag: "MAHAN · CA GOV 2026",
    },
  },
  {
    id: "may4-mahan-meme-sand-hill-road",
    title: "Same crypto money that opposed Porter federally now backs Mahan",
    story: "Mahan structure · structural punchline · Coinbase parallel",
    beats: ["mahan"],
    prototypeAnchor: "#meme-mahan-coinbase-parallel",
    prototypeUrlBase: BASE,
    caption:
      "Brian Armstrong, CEO of Coinbase, gave $500,000 to Back to Basics California, the IE PAC backing Matt Mahan.\n\nIn 2024, Coinbase's federal Fairshake PAC spent more than $10,000,000 attacking Katie Porter's US Senate campaign.\n\nNow Coinbase money is backing Mahan against Porter in the same 2026 California governor's race.\n\nThe federal model and the state model are the same: same companies, same operatives, same candidate selection. The only thing that changes is the disclosure name.\n\nthedonormap.org/mahan",
    thumbnail: {
      headlineLines: [
        { text: "Same crypto money" },
        { text: "spent $10M", highlight: { phrase: "spent $10M", color: "red" } },
        { text: "against Porter in 2024." },
        { text: "Now backing", highlight: { phrase: "Now backing", color: "yellow" } },
        { text: "Mahan against her." },
      ],
      deck: "Coinbase CEO Brian Armstrong → Back to Basics California IE PAC → $500,000. Same company, same operatives, same candidate selection.",
      topbarTag: "MAHAN · CA GOV 2026",
    },
  },
  // ─── 2026-05-04 Race Map (carace26-map) · 3-meme launch kit ───────────
  {
    id: "may4-carace26-map-share",
    title: "Race Map · master share card · whole field, all flows",
    story: "Race Map launch · FB-group + X share kit",
    beats: ["carace26-map"],
    prototypeAnchor: "#card-7",
    prototypeUrlBase: SHARE_CARDS_BASE,
    caption:
      "The 2026 California governor's race, every named donor, every overlap, mapped:\n\n· Eight candidates (Hilton, Bianco, Becerra, Steyer, Porter, Mahan, Villaraigosa, Thurmond)\n· 60 named donors at the institutional + max-out tier\n· 15 multi-candidate hedge bets — donors funding two or more candidates in the same race\n· 17 industry tags (tech VC, crypto, oil, police, real estate, plaintiffs, healthcare, utility, labor, agriculture, entertainment, finance, tribal, education, media, dark money, plus aggregation clusters)\n\nSix of the 15 hedges cross the R/D line. Pechanga's tribal-gaming hedge across Bianco, Becerra, and Porter is the first cross-party tribal hedge in the field.\n\nSame donor, both sides, same race.\n\nThe whole money map. Hover any candidate to see their donors. Hover any donor to see which candidates they fund.\n\nthedonormap.org/carace26-map",
    thumbnail: {
      headlineLines: [
        { text: "Eight candidates." },
        { text: "60 named donors.", highlight: { phrase: "60 named donors", color: "yellow" } },
        { text: "15 hedge bets.", highlight: { phrase: "15 hedge bets", color: "red" } },
      ],
      deck: "The whole 2026 California governor's race, every overlap mapped. Six of the 15 hedges cross the R/D line.",
      receipts: [
        { name: "Brin · Hilton (R) + Mahan (D)", value: "$1.04M" },
        { name: "PORAC · Bianco (R) + Villa (D)", value: "$117K" },
        { name: "Highland Fairview · Bianco (R) + Villa (D)", value: "$112K" },
        { name: "Pechanga · Bianco (R) + Becerra (D) + Porter (D)", value: "$94K" },
      ],
      topbarTag: "CA GOV 2026 · RACE MAP",
      shareCardKind: "carace26-map",
    },
  },
  {
    id: "may4-carace26-map-meme-cross-party",
    title: "Same person. Both parties. Five hedges.",
    story: "Race Map · cross-party hedge receipt-stack",
    beats: ["carace26-map"],
    prototypeAnchor: "#meme-racemap-cross-party",
    prototypeUrlBase: BASE,
    caption:
      "Five named donors are funding both a Republican AND a Democrat in the 2026 California governor's race:\n\n· Sergey Brin (Google co-founder) · Hilton (R) $39K + Mahan (D) $1M IE PAC · $1.04M total\n· Christian Larsen (Ripple chairman) · Hilton (R) $39K + Porter (D) $118K · $157K total\n· Joe Lonsdale (Palantir / 8VC) · Hilton (R) $25K + Mahan (D) $78K · $103K total\n· Highland Fairview (Iddo Benzeevi) · Bianco (R) $39K + Villaraigosa (D) $73K · $112K total\n· PORAC PAC · Bianco (R) $39K + Villaraigosa (D) $78K · $117K total\n\nDonor-class hedging signals what the money actually wants: a policy outcome that's neutral on partisan label, specific on industry interest.\n\nCal-Access RCPT_CD primary-source verified.\n\nthedonormap.org/carace26-map",
    thumbnail: {
      headlineLines: [
        { text: "Same person." },
        { text: "Both parties.", highlight: { phrase: "Both parties", color: "red" } },
        { text: "Five hedges.", highlight: { phrase: "Five hedges", color: "yellow" } },
      ],
      deck: "Cross-party donor-class hedging in the 2026 California governor's race. Same donor writes a check to both a Republican and a Democrat.",
      receipts: [
        { name: "Brin · Hilton + Mahan", value: "$1.04M" },
        { name: "Larsen · Hilton + Porter", value: "$157K" },
        { name: "Lonsdale · Hilton + Mahan", value: "$103K" },
        { name: "Highland Fairview · Bianco + Villa", value: "$112K" },
        { name: "PORAC · Bianco + Villa", value: "$117K" },
      ],
      topbarTag: "CA GOV 2026 · RACE MAP",
    },
  },
  {
    id: "may4-carace26-map-meme-pge-bury",
    title: "$10M from one utility to bury one candidate",
    story: "Race Map · single-industry-attack punchline · PG&E vs Steyer",
    beats: ["carace26-map", "class-traitor"],
    prototypeAnchor: "#meme-racemap-pge-bury",
    prototypeUrlBase: BASE,
    caption:
      "Pacific Gas & Electric Corporation has spent $9,975,000 on the anti-Steyer Independent Expenditure PAC in the 2026 California governor's race. IBEW Local 1245 (PG&E's own union) added $75,000 to the same effort.\n\nVerified anti-Steyer total from utility-and-trades: $10,050,000.\n\nPG&E pleaded guilty to 84 counts of involuntary manslaughter for the 2018 Camp Fire. Tom Steyer is the only major candidate in the 2026 race who built his pre-political brand on holding utilities accountable for climate disasters.\n\nThe utility behind the Camp Fire is funding the campaign against utility-and-climate accountability. FPPC committee 1490270.\n\nthedonormap.org/carace26-map\nthedonormap.org/class-traitor",
    thumbnail: {
      headlineLines: [
        { text: "$10,050,000", highlight: { phrase: "$10,050,000", color: "red" } },
        { text: "from one utility" },
        { text: "to bury", highlight: { phrase: "to bury", color: "yellow" } },
        { text: "one candidate." },
      ],
      deck: "PG&E pleaded guilty to 84 counts of involuntary manslaughter for the 2018 Camp Fire. Tom Steyer is the only candidate running on utility accountability.",
      receipts: [
        { name: "PG&E Corp · 4/10 + 4/20", value: "$9,975,000" },
        { name: "IBEW 1245 · PG&E's own union", value: "$75,000" },
        { name: "Verified anti-Steyer total", value: "$10,050,000" },
        { name: "FPPC committee", value: "1490270" },
      ],
      topbarTag: "CA GOV 2026 · RACE MAP",
    },
  },
]

export function memesByBeat(slug: BeatSlug): MemeEntry[] {
  return MEMES.filter((m) => m.beats.includes(slug))
}

export function getMeme(id: string): MemeEntry | undefined {
  return MEMES.find((m) => m.id === id)
}

export function getBeat(slug: string): BeatMeta | undefined {
  return BEATS.find((b) => b.slug === slug)
}
