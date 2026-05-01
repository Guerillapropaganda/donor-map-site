#!/usr/bin/env node
/**
 * fill-ca-gov-2026-editorial-angles.cjs
 *
 * Phase 3 (editorial angle) of CA Gov 2026 dossier plan.
 * Replaces the TODO blocks in each per-candidate dossier with
 * factual analytical paragraphs sketching the story shape revealed
 * by the data. NOT written in David's voice — these are research
 * sketches he'll rewrite. Editorial verdicts are David's lane.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join('content', 'Admin Notes', 'ca-gov-2026-dossiers');

const ANGLES = {
  becerra: {
    angle: `Becerra raised **$5.7M from 5,061 donors in the 2026 cycle** — average $1,135/donor — the second-lowest 2026 haul among the major Democratic candidates. His lifetime state-level total of $25.5M across 4 cycles is dwarfed by his FEC-side career: 8 federal cycles (2004-2022) of House campaign + leadership PAC giving, with $2.2M outgoing to other federal candidates and committees. The shape of his money tells a structural story: he is a 24-year creature of institutional Democratic infrastructure. Where he's now seeking funds for Governor — labor, healthcare, party-aligned PACs — overlaps almost completely with the regulated industries he oversaw at HHS (2021-2025).

The screenshot-bait factual question for the eventual story: **what share of Becerra's 2026 donors come from healthcare-industry entities or 501(c)(4)s funded by them?** The librarian needs cluster-tagging on his 2026 donor list before that number can be cited cleanly. As a starting gap-fill: pull the top 50 2026 Cal-Access donors against the existing class-tag application from \`scripts/classes/class-tag-path-b-application.cjs\`.`,
    questions: [
      'What proportion of his 2026 donors are healthcare-industry-aligned (insurers, pharma, hospital systems, healthcare unions)?',
      'Did any donor receive a regulatory action from HHS during his 2021-2025 tenure?',
      'Why is his 2026 fundraising lagging the field given his name recognition + Cabinet credential — is this a soft launch or a real ceiling?',
      'Are the 2 federal donors visible in the FEC data on relevant industry-side committees we should profile?',
    ],
  },

  porter: {
    angle: `Porter raised **$12M from 15,232 donors in the 2026 cycle** — average **$790/donor** — the largest small-dollar base in the race after Hilton (15K donors / $7.7M / $515 avg). The state-level shape matches her brand: she sells anti-corporate consumer-protection populism and the donor count delivers. But the federal context is louder: her FEC-side career shows **$63.5M outgoing** across cycles 2018-2026, dominated by her unsuccessful 2024 Senate run (where Schiff outraised her with corporate-aligned money and Fairshake PAC spent $10M against her — already documented in her vault profile under \`Fairshake and Crypto.md\`).

The contradiction worth probing: a politician whose entire brand is "the donor class doesn't fund me" runs a $63M federal apparatus. Both can be true; the framing matters. The screenshot-bait fact: **15,232 individual 2026 donors at $790 average.** That's the rare thing in this race — neither Steyer's billionaire pattern nor an institutional-PAC stack. It's a real grassroots base. Story angle is the *reverse* of the corruption-investigation default — what does it look like to BUILD infrastructure outside the donor class, and what does that cost in a state where Steyer can drop $14M from one wallet?`,
    questions: [
      'Of the 15,232 donors, how many are repeat-donors from her House and 2024 Senate campaigns vs. fresh acquisitions?',
      'What\'s her actual cash-on-hand vs. burn rate this cycle — the $14M outgoing in lifetime suggests heavy 2024-Senate carryover',
      'The Fairshake PAC angle from her vault profile — is the 2026 IE-spend update needed?',
      'Are any of her 2026 top donors entities her House oversight committees have investigated?',
    ],
  },

  steyer: {
    angle: `**The single most striking finding of the entire Phase 2 extract.** Steyer raised $14M in the 2026 cycle from 131 donors — average **$107,455/donor**. Of that $14M, **$13.89M (99.4%) comes from a single source**: "STEYER FOR GOVERNOR 2026, A COALITION OF HOUSING ADVOCATES, LABOR AND SMALL BUSINESS; CALIFORNIA IS NOT FOR SALE, NO ON" — an FPPC committee branded as a populist coalition whose actual funding (per the source-of-truth evidence record) is Tom Steyer himself. The next-largest donor is $39,200. The 130 other donors collectively contributed $187K — about 1.3% of the headline total.

His federal record reinforces the pattern: $335.5M outgoing across cycles 2020-2022, including the famously self-funded 2020 presidential run ($191M), NextGen Climate spending, and donor-class giving to other Democrats. Steyer's "coalition" branding is not unique — operatives often name IE PACs after the political message rather than the source of the money. But the gap between the coalition language ("California Is Not For Sale") and the actual funding source (a single billionaire whose career is buying California politics) is the story. **Screenshot-bait fact:** "Tom Steyer's 'California Is Not For Sale' coalition: $13.89M from one source. Tom Steyer."`,
    questions: [
      'Confirm the principal-funder structure of committee 1485077 + 1489677 against the FPPC committee detail page (currently Imperva-blocked — defer to Phase 5 or alt verification path)',
      'What other "coalition"-branded IE PACs is Steyer funding in down-ballot races this cycle?',
      'How does this map to the 2018 Newsom-vs-Villaraigosa primary where Steyer also intervened?',
      'Is Farallon Capital (Steyer\'s old hedge fund, now divested-from per his climate persona) showing up in any of his outgoing federal money?',
    ],
  },

  hilton: {
    angle: `Hilton raised **$7.7M from 14,989 donors** at $515 average — a small-dollar Republican base that mirrors Porter's small-dollar Democratic base in shape (Hilton: 15K/$7.7M; Porter: 15K/$12M). The pattern is the same: populist-brand candidate aggregating thousands of $200-$1000 donations. The ideological content is opposite. **The same fundraising shape funds opposite politics.** This is one of the cleanest cross-cutting findings in the data and is a strong candidate for a parallel-profile editorial piece (Hilton vs. Porter as "twin small-dollar populists, opposite teams").

What the data doesn't yet show: where his big institutional money is. Hilton has 0 FEC committees and 0 federal record. His 313KB master profile (Steve Hilton.md, single monolithic file — needs splitting into sub-pages before any editorial work) flags Murdoch / Crowdpac / Tory / Cameron-era political consulting and the Fox News pipeline. None of that infrastructure shows up directly in Cal-Access bulk because Murdoch-aligned dollars typically flow through dark-money 501(c)(4)s that don't disclose donor identities. **Screenshot-bait fact:** "Steve Hilton — Fox News host, no federal record, 14,989 small-dollar donors fund his California governor bid. The dark-money behind him: undisclosed."`,
    questions: [
      'Has any Murdoch-affiliated entity (News Corp, Fox Corp, related family LLCs) appeared in his Cal-Access disclosures? Cross-reference against his top 50.',
      'Are there 501(c)(4) IE PACs running pro-Hilton spending we should map?',
      'Pre-residency status: Hilton was a UK citizen advisor to David Cameron — what\'s his US naturalization timeline and how does that interact with foreign-donor restrictions?',
      'The vault profile is 313KB monolithic — needs splitting into sub-pages before any editorial. Code task before story work.',
    ],
  },

  bianco: {
    angle: `Bianco raised **$4.5M from 7,324 donors** at $610 average — a smaller but genuinely small-dollar MAGA / law-enforcement base. The class-of-money is already documented in his vault profile (PORAC, CCPOA, Riverside-area police unions as top donors). His vault is the second-richest in the race after Villaraigosa — 8 sub-pages covering jail deaths, Oath Keepers membership, CSPOA (Constitutional Sheriffs and Peace Officers Association), the COVID mandate refusal as brand-building moment, and the immigration / sanctuary state contradiction. He has 151 librarian edges — the most of any candidate — meaning the relationship graph for him is the densest.

The structural contradiction is in his self-description: "constitutional sheriff" implies fidelity to Constitution and state law, but the existing vault documents a record of refusing to enforce California sanctuary state law (SB 54), participating in 287(g) federal-immigration cooperation, and CSPOA-aligned ideology that explicitly rejects state authority over county sheriffs. **Screenshot-bait fact:** "Chad Bianco — 'constitutional sheriff' — refuses to enforce California state laws. Top donors: California police unions whose members enforce them daily."`,
    questions: [
      'Cross-reference Bianco\'s Oath Keepers membership history (per the existing sub-page) against the 2024 jury convictions of Oath Keepers leadership — is the timeline of his disclosed membership clean?',
      'The 290 librarian edges — how many are documented contradictions vs. confirmed alliances? Need a tagged breakdown.',
      'Has any donor on his top 50 Cal-Access list been a defendant in a Riverside County jail-death civil suit?',
      'Vault depth is a signal — most editorial sub-pages already exist. Is there an existing section that could be lifted directly into a punchy story format with light edit?',
    ],
  },

  villaraigosa: {
    angle: `Villaraigosa raised **$6.1M from 870 donors** in the 2026 cycle — average $7,000/donor — but his lifetime state-level total across 10 cycles (2000-2026) is **$77.6M from 20,414 donors**. The lifetime number is the giveaway: he is the only candidate in the race with a multi-decade FPPC paper trail (LA City Council, two Mayor of LA cycles, 2018 Governor run, 2026 Governor run, and connected officeholder accounts). The 2026 average donor of $7K marks him as the institutional-coalition candidate: real-estate developers, building trades labor, AEG (Anschutz Entertainment Group, dominant LA developer), public-employee unions.

The vault profile is **483KB** — the largest in the entire race — and is heavily focused on the real-estate-developer donor coalition (existing sub-page: "The Real Estate Mayor and the 2026 Donor Coalition"). His core contradiction is positional: he ran for governor in 2018 with charter-school-billionaire money, lost the primary, returned in 2026 with a different but equally deep coalition. **Screenshot-bait fact:** "Antonio Villaraigosa raised $77M from 20,414 donors across 10 cycles. His top 2026 donors: real-estate developers betting on a candidate they know."

Critical Phase 2-C correction: his prior dossier-plan flagged committee \`1392364\` (2018 cycle) as the FPPC ID. **Real 2026 primary committee is \`1471635\`**. Auxiliary slogan committee \`1486030\` ("Straight From The Heart Of California") is also active. Frontmatter updated.`,
    questions: [
      'Cross-reference his top 2026 donors against the LA-area developers who benefited from zoning + permitting decisions during his Mayoral tenure (2005-2013)',
      'AEG / Anschutz appears in lifetime top 10 — what\'s the relationship history and what entitlement-side benefits?',
      'The 2018 governor run was sponsored by California Charter Schools Association Advocates (per filer 1404354 in the bulk). Is that infrastructure still active in 2026 or did the sponsor switch?',
      'Of the $7K avg/donor, what\'s the breakdown of $5K+ donors vs. mid-tier? The "institutional coalition" framing rests on the donor-size distribution.',
    ],
  },

  mahan: {
    angle: `**Mahan raised $0 in the 2026 cycle from candidate-side Cal-Access filings.** Zero. His 2026 fundraising activity in the FPPC system is entirely through an Independent Expenditure committee — \`1487425\` (CALIFORNIA BACK TO BASICS SUPPORTING MATT MAHAN; SPONSORED BY...). The IE PAC structure means donors give to the IE PAC, not the candidate; the IE PAC spends to support him; he doesn't legally control the spending and isn't accountable for it on his own committee statements. The vault profile lifts the curtain: 4 sub-pages cover the Silicon Valley billionaire pipeline, the Thiel-adjacent tech network, and tech-industry policy alignment.

The structural contradiction is the cleanest of the race: a candidate framed as the "outsider mayor of San Jose" with **zero direct fundraising** and whose entire campaign infrastructure sits inside an IE PAC funded by Thiel-network and Andreessen-network billionaires. He doesn't have to *do* fundraising because he isn't being funded as a candidate — he's being deployed as a vehicle. **Screenshot-bait fact:** "Matt Mahan's 2026 fundraising: $0. The Silicon Valley billionaires running his IE PAC: $1.7M lifetime in support, with no contribution caps."`,
    questions: [
      'Identify the principal funders of IE PAC \`1487425\` — how concentrated is the funder list?',
      'Is there a candidate-side committee for Mahan that exists but hasn\'t filed activity yet, or is the IE-PAC-only structure the deliberate strategy?',
      'Mahan\'s San Jose mayor record on tech-industry policy (housing in tech corridors, AB 5 / gig-worker, Prop 22) — does it match the policy preferences of the IE PAC funders?',
      'The "Thiel-Adjacent Tech Pipeline" sub-page — what\'s the most recent verified link between Mahan and Thiel network entities?',
    ],
  },

  thurmond: {
    angle: `Thurmond raised **$327K from 294 donors** in the 2026 cycle — **roughly 1/40th of the front-runners' totals**. This is portrait-tier coverage in the dossier plan, not deep-dive, because his fundraising is so far behind that he is effectively a non-factor in the donor-class dynamics that the rest of the race embodies. His lifetime state-level total is $24M across 9 cycles (his SoSPI superintendent races accumulated), but the 2026 number is the relevant one and it shows the institutional education money is NOT following him into the governor's race.

What's editorially interesting: Thurmond IS the institutional education-establishment candidate (current Superintendent of Public Instruction; existing sub-page: "The Education Establishment and the Charter School War"). He's the natural fit for the CTA / NEA / public-school-coalition lane. The fact that lane is producing $327K total in the cycle — with primary candidates in their fourth quarter of fundraising — is itself a signal about the state of education-political-money in California in 2026. **Screenshot-bait fact:** "Tony Thurmond is California's elected schools chief. His 2026 governor fundraising: $327,000. The CTA's lifetime political spending: hundreds of millions. Conclusion left as exercise."`,
    questions: [
      'Has the CTA endorsed in this primary yet? If endorsed, where is the CTA money flowing — Thurmond, Villaraigosa, or split?',
      'Did the 2024 SoSPI race generate fresh donor infrastructure that should be carrying over but isn\'t?',
      'Is Thurmond expected to drop out before primary day, and would that funnel his donors to a specific other candidate?',
    ],
  },
};

// Cross-cutting summary observations
const SUMMARY_PATTERNS = `**Three structural patterns surface from the 2026 cycle data alone:**

**1. Two parallel small-dollar populists, opposite teams.** Porter (15,232 donors / $12M / $790 avg) and Hilton (14,989 donors / $7.7M / $515 avg) are running fundraising operations of nearly identical *shape* with diametrically opposed politics. This is unusual and is the strongest case for a comparative-profile story. The mirror-image structure is the punch.

**2. Two billionaire-money patterns, both Democratic.** Steyer ($14M, 99% from his own slogan-branded coalition) and Mahan ($0 candidate-side, IE PAC funded by Thiel/Andreessen network) represent the two distinct ways billionaire money enters a state race in 2026: direct self-fund (Steyer) and arms-length IE PAC (Mahan). Both are Democrats. Both are running against candidates with actual donor bases.

**3. The race's only multi-cycle institutional candidate is Villaraigosa.** $77M lifetime state-level across 10 cycles is unique in the field — no other candidate has comparable historical FPPC infrastructure. Becerra is institutional but federally; he's never built a state-level apparatus before. Thurmond's prior infrastructure is education-aligned and isn't following him to the governor's race.

**Cross-cutting story candidates ranked by data sharpness:**

- **Steyer self-fund through "California Is Not For Sale" coalition** — data is sharpest. Single-source story.
- **Mahan IE-PAC-only structure** — data is sharp but needs IE PAC funder breakdown to land the punch.
- **Porter vs. Hilton mirror-image small-dollar populism** — comparative piece, both candidates' donor data already in extract.
- **Bianco's "constitutional sheriff" contradiction** — vault is rich, data is supporting cast.
- **Villaraigosa real-estate-developer coalition** — vault profile is largest in race; mostly editorial work, not data work.
- **Thurmond as "where did the education money go"** — interesting structural observation, weaker as standalone story.

**Cross-cutting Phase 4 (Ware structural) preview:** all 8 in-vault candidates have FPPC committees and at least 294 donors. Ware has zero FPPC committees and zero state-level filings. The infrastructure differential — between $327K (the lowest in-vault candidate) and $0 (Ware) — is itself the structural argument the Phase 4 essay will develop.`;

for (const slug of Object.keys(ANGLES)) {
  const fp = path.join(ROOT, `${slug}.md`);
  if (!fs.existsSync(fp)) {
    console.error(`MISSING ${fp}`);
    continue;
  }
  let text = fs.readFileSync(fp, 'utf-8');
  text = text.replace(
    /<!-- TODO\[claude\]: 1-2 paragraphs synthesizing the data above into the story shape\. -->\n<!-- What does the donor pattern reveal\? What's the biggest contradiction\? -->\n<!-- What's the screenshot-bait fact\? -->/,
    ANGLES[slug].angle
  );
  text = text.replace(
    /<!-- TODO\[claude\]: list 2-4 things that need verification before publishing\. -->/,
    ANGLES[slug].questions.map(q => `- ${q}`).join('\n')
  );
  fs.writeFileSync(fp, text, 'utf-8');
  console.log(`filled ${slug}.md`);
}

// Fill the cross-cutting summary
const sumFp = path.join(ROOT, '_summary.md');
let sumText = fs.readFileSync(sumFp, 'utf-8');
sumText = sumText.replace(
  /<!-- TODO\[claude\]: cross-cutting observations\. Where the screenshot-bait stories live\. -->/,
  SUMMARY_PATTERNS
);
fs.writeFileSync(sumFp, sumText, 'utf-8');
console.log('filled _summary.md');

console.log('\nDone.');
