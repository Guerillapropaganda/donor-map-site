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

export type BeatSlug = "three-becerras" | "not-the-bad-guy" | "class-traitor" | "race-overview"

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
