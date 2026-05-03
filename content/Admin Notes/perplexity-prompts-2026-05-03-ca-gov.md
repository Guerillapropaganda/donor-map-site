---
title: "Perplexity Prompts — CA Gov 2026 candidate audits (2026-05-03)"
type: admin-note
note-type: research
status: open
last-updated: 2026-05-03
authority: CLAUDE.md Rule 14 (Perplexity-first research protocol)
note-kind: prompts
related-races: ca-gov-2026
audience: david
---

# CA Gov 2026 candidate audits — five Perplexity prompts (2026-05-03)

Follow-up to the Hilton institutional-money audit (May 3, 2026). Same template: Tier 1/2 sources only (FPPC, FEC, IRS Form 990, SEC, court records, Cal-Access, named-publication CA political press: LAist, KQED, CalMatters, Sacramento Bee, Politico CA, LA Times, SF Chronicle, SF Standard). NO DATA when Tier 1/2 absent. No aggregators (TransparencyUSA, OpenSecrets aggregations). No social media.

Each return: source URL (canonical permalink), source tier, date, one-line factual statement.

**Save returns to:** `content/Admin Notes/perplexity-research/2026-05-03-{candidate}-funder-gaps-results.md`

---

## Prompt 1 — Bianco institutional money

```
I'm researching the funder base behind Chad Bianco's 2026 California gubernatorial campaign (Riverside County Sheriff, Republican). His state-level FPPC committee is BIANCO FOR GOVERNOR 2026. Cal-Access primary records show $4.47M raised from 7,324 donors. Top donors are concentrated in Riverside County development + law-enforcement (M & D Development $78,400, Downs Energy $78,400, Sierra Pacific Electrical Contracting $39,200, Highland Fairview Operating Co. $39,200, Walker Evans Construction $39,200, Bradley Chapman / Alliance Building Solutions $39,200, PORAC PAC $39,200, Haagen family + Haagen Company LLC ~$78K combined).

Treat each numbered question independently. Cite primary sources only (FPPC, FEC, IRS Form 990, SEC, court records, Cal-Access, named-publication CA political press: LAist, KQED, CalMatters, Sacramento Bee, Politico CA, LA Times, SF Chronicle). If a question has no Tier 1 / Tier 2 support, return NO DATA. For every finding return: source URL (canonical permalink), source tier, date, and a one-line factual statement.

QUESTIONS:

1. PRO-BIANCO IE COMMITTEES. Are there any FPPC-registered IE committees, super PACs, or 501(c)(4)s spending money to support Chad Bianco or to oppose his Republican primary opponent Steve Hilton? Check FPPC's Top 10 Contributors list for the June 2026 primary, FPPC search-filings for "Bianco" and "Hilton-opposing" entities, and any conservative / sheriff-association / law-enforcement-aligned 501(c)(4) active in California (Peace Officers Research Association of California beyond its candidate-PAC giving, California State Sheriffs' Association PAC, California Police Chiefs PAC, Riverside Sheriffs' Association, Western Conference of Teamsters law-enforcement affiliates). Federal super PACs targeting California in the Republican primary also count.

2. HIGHLAND FAIRVIEW OPERATING CO. — full California political footprint 2024-2026. Highland Fairview gave Bianco $39,200 (max). The company is tied to Iddo Benzeevi and Riverside-County land-use decisions. Has Highland Fairview, Iddo Benzeevi personally, or any Highland Fairview affiliate / subsidiary contributed to other 2024-2026 California state or federal candidates, ballot committees, or 501(c)(4)s? Pull all FPPC + FEC contributions associated with the entity and its principals.

3. HAAGEN FAMILY DONOR NETWORK. Alexander Haagen III, Betty Haagen, and Haagen Company LLC combined for ~$78K to Bianco. Map their full California political footprint: who else have they given to in 2024-2026? Are there other Haagen-family entities (foundations, family LLCs, real-estate investment vehicles) giving in California politics? The Haagen family has historically been associated with Southern California shopping-center development (Haagen-Dazs ice cream is a separate unrelated company).

4. M & D DEVELOPMENT, LLC + DOWNS ENERGY. Both gave the corporate maximum ($78,400) to Bianco. Who owns each? What other California state or federal political contributions has each entity made in 2024-2026? Both at the legal corporate max suggests pre-positioned institutional support — what are these entities and what are their California regulatory exposures (CEQA, energy, real estate, water)?

5. BIANCO VENDOR / EXPENDITURE PROFILE. The Bianco campaign's spending side (Schedule E expenditures): who are the top 10 vendors / payees from his FPPC EXPN_CD records? Specifically: media buyer, mailer printer, polling vendor, consulting firm, fundraising firm. If the same firms appear in the Hilton-for-Governor expenditure record (or any pro-Hilton IE), flag the overlap.

6. PORAC PAC + LAW-ENFORCEMENT-UNION GIVING TO BIANCO. PORAC PAC gave $39,200 (max). What other police / sheriff / corrections union committees have given to Bianco — Riverside Sheriffs' Association PAC, California Correctional Peace Officers Association (CCPOA) PAC, California State Sheriffs' Association, statewide police-union IE committees? Aggregate the total law-enforcement-union dollar figure to Bianco.

7. BIANCO CALIFORNIA FORM 700. As a candidate for governor, Bianco must file an FPPC Form 700 disclosing financial interests. What does his most recent filed Form 700 disclose about (a) Riverside County–related real estate or land-use holdings; (b) Sheriff's Office–adjacent business interests; (c) outside income beyond his sheriff's salary; (d) any holdings in donor companies (Highland Fairview, M&D Development, Downs Energy)?

8. BIANCO 2014 OATH KEEPERS DISCLOSURE — current status. Bianco was a Riverside Sheriff's deputy who joined the Oath Keepers around 2014. He has confirmed the membership publicly. What is the most recent on-record statement from Bianco about that membership? Has any 2026-cycle CA political press done a forensic audit of the timeline?

9. BIANCO BALLOT-SEIZURE LITIGATION CURRENT STATUS. The 2025 Riverside County Prop 50 ballot-warrant incident — has any subsequent litigation, oversight investigation, or court ruling addressed the legality of the warrant or the seizure? Cite docket and most recent ruling.

10. NAMED-PUBLICATION COVERAGE OF BIANCO'S DONOR BASE. Has LAT, SF Chronicle, CalMatters, Politico CA, KQED, LAist, Sacramento Bee, Press-Enterprise, or equivalent CA political press done editorial analysis of Bianco's funder base specifically — not "Bianco announces" but "where Bianco's money comes from"? Cite article URL and lede.

If a question has no Tier 1 / Tier 2 sources available, return NO DATA. Do not fall back to aggregators (TransparencyUSA, OpenSecrets aggregations) or social media.
```

---

## Prompt 2 — Porter institutional money

```
I'm researching the funder base behind Katie Porter's 2026 California gubernatorial campaign. FPPC committee FRIENDS OF KATIE PORTER FOR GOVERNOR 2026. Cal-Access shows $12.46M raised from 15,238 donors. Top donors include Uber Innovation PAC ($150,000), Donna M. Bower ($117,600), Joe Kiani ($117,600), Christian Larsen ($117,600), Benjamin Stockton ($117,300), National Union of Healthcare Workers Candidate Committee ($115,000), McNicholas & McNicholas LLP ($103,400), California Teamsters Public Affairs Council PAC ($100,000), Singleton Schreiber LLP ($100,000), First Foundation Bank ($93,589), Brett Schreiber ($88,400), Gerald B. Singleton ($85,000). The base shape is heavy trial-lawyer + union, with one notable corporate PAC (Uber).

Tier 1/2 sources only. NO DATA if not found. Per finding return: source URL, source tier, date, one-line factual statement.

QUESTIONS:

1. UBER INNOVATION PAC — full California 2026 footprint. The PAC gave Porter $150,000 (her top donor). Who else has Uber Innovation PAC backed in 2026 California state and federal races? Cross-check the Swalwell IE history — Porter audit notes flag Uber Innovation PAC as the largest funder of "Californians for a Fighter in Support of Eric Swalwell for Governor" at $2,000,000 before he suspended. With Swalwell out, did Uber Innovation PAC redirect that money — to Porter directly, to a pro-Porter IE, or to a different candidate?

2. PRO-PORTER IE COMMITTEES — full sweep. The 2024 Senate cycle had two Porter-supporting IEs (OVRSITE PAC, WHITEBOARD). For 2026 governor: are there active FPPC-registered IE committees supporting Porter? Top 10 Contributors list, FPPC search-filings, federal super PACs targeting CA Democratic primary.

3. SINGLETON SCHREIBER LLP — full footprint. Singleton Schreiber LLP gave $100,000; Gerald B. Singleton personally gave $85,000; Brett Schreiber gave $88,400. The firm is also the named top funder of OVRSITE PAC (2024 pro-Porter IE) at $250,000. Map their full 2024-2026 California political giving — direct + IE + 501(c)(4). What's the firm's litigation portfolio (PG&E fire cases, mass-tort, regulatory)?

4. NATIONAL UNION OF HEALTHCARE WORKERS — political-giving pattern. NHWQ Patient Care committee gave $115,000. Is this their candidate-PAC's standard max-out level for governor races, or is this an unusually large commitment? Cross-check their 2018 / 2022 governor-cycle giving for comparison.

5. CALIFORNIA TEAMSTERS PUBLIC AFFAIRS COUNCIL PAC — Porter alignment. Teamsters gave $100,000. Have they given equivalent amounts to other 2026 California gubernatorial candidates (Becerra, Steyer, Villaraigosa, Mahan, Hilton, Bianco)? Where are Teamsters concentrating in this race?

6. CHRISTIAN LARSEN ($117,600). Verify identity — is this Chris Larsen the Ripple co-founder (who also gave Hilton $39,200), or a different "Christian Larsen"? Employer / occupation field on the FPPC filing should resolve. If it IS Chris Larsen, his cross-party giving (Porter + Hilton) is editorially substantive.

7. PORTER FORM 700 — current employer / household income disclosure. What does her most recent FPPC Form 700 disclose about household income, business interests, and any policy-relevant holdings (financial sector, healthcare, energy, AI/tech, regulated industries)?

8. THE UBER FRAME. Has any named-publication CA political press analyzed the Uber Innovation PAC → Porter relationship in light of (a) Uber's labor-law fights in California (AB 5, Prop 22, gig-worker classification ongoing), (b) Porter's prior CFPB / consumer-protection record? Specifically: any KQED, CalMatters, LAT coverage that pairs the donation with Porter's labor stance.

9. NAMED-PUBLICATION COVERAGE OF PORTER'S 2026 DONOR BASE. Has any major CA political publication done editorial analysis of where Porter's 2026 money comes from? Trial-lawyer concentration, labor-union coalition shape, the Schreiber/Singleton role, the Uber question.

If no Tier 1/2 source available, NO DATA. No aggregators or social media.
```

---

## Prompt 3 — Mahan institutional money

```
I'm researching Matt Mahan's 2026 California gubernatorial campaign. Cal-Access shows an EXTRAORDINARY donor-base structure: only 58 unique donors, 63 receipts, $53.24M total raised. That's $918,000 average per donor — roughly 1,800x Hilton's per-donor average. The funding is almost entirely IE-PAC (super PAC) + a tiny direct-candidate-committee component. Top funders by total: Michael Moritz $6,000,000, Govern FOR California Action Committee $3,000,000, Rick Caruso & affiliates $3,000,000, Patrick Collison $2,980,000, Vinod Khosla $2,200,000, Ashley Merrill $2,040,000, Brian Singerman $2,000,000, Sergey Brin $2,000,000, Michael Seibel $2,000,000, Paul Buchheit $2,000,000, L. John Doerr III $2,000,000, Steve Huffman $1,999,998. Twelve donors at $2M+ each.

Tier 1/2 sources only. NO DATA if not found. Per finding return: source URL, source tier, date, one-line factual statement.

QUESTIONS:

1. GOVERN FOR CALIFORNIA ACTION COMMITTEE — full sponsor + funder identity. The committee gave Mahan $3,000,000. What is its FPPC committee ID? Who are its registered officers / treasurer? Who are ITS top funders one level up (the source money behind the $3M to Mahan)? IRS Form 990 if 501(c)(4)–adjacent. Sponsor disclosure if applicable.

2. RICK CARUSO & AFFILIATED ENTITIES — Mahan giving structure. Rick Caruso gave Mahan $3,000,000 across affiliated entities. Identify each affiliated entity (Caruso Affiliated, Caruso Properties, Caruso Family Foundation, etc.) and the contribution from each. Caruso is a Republican-leaning real-estate developer who ran for LA mayor in 2022 — Mahan is a Democrat. Cross-party hedge or genuine ideological alignment? Has any CA political press analyzed this?

3. THE 12-DONOR $2M+ TIER. Vinod Khosla, Brian Singerman, Sergey Brin, Michael Seibel, Paul Buchheit, L. John Doerr III, Steve Huffman, Patrick Collison, Ashley Merrill — eight Silicon Valley / VC-class individuals each at $2M+. Identify the firm / fund affiliation for each. Have any of them ALSO given to other 2026 California gubernatorial candidates (Hilton, Becerra, Steyer, Porter)? The Brin $2M to Mahan + $39,200 to Hilton hedge is verified — who else hedges?

4. PRO-MAHAN IE COMMITTEES — full structure. Two are publicly known: California Back to Basics Supporting Matt Mahan for Governor 2026 (FPPC 1487425, ~$16.7M, top funder Moritz at $3M); Deliver for California - Matt Mahan for Governor 2026 (FPPC 1488716, ~$2.9M, top funder Brin at $1M, though Cal-Access derived data shows Brin at $2M). Are there additional pro-Mahan FPPC IE committees not in this set? Which committee did each $2M+ donor's money flow into?

5. FPPC TOP 10 CONTRIBUTORS LIST — JUNE 2026 PRIMARY — Mahan column. What entities appear on the FPPC Top 10 list for pro-Mahan spending, and what are their cumulative totals? Compare against my Cal-Access derived data to see if I'm missing recent filings.

6. MAHAN'S CANDIDATE COMMITTEE vs IE-PAC RATIO. With $53M total in IE-money and Cal-Access showing only 58 donors total, what is his actual candidate-committee fundraising figure (the money he can directly control vs the money the IE PACs control)? Has he received any small-dollar voter contributions to the candidate committee?

7. MAHAN FORM 700. As a sitting San Jose mayor running for governor, Mahan files Form 700 in two capacities. Most recent gubernatorial Form 700 filing — what does it disclose about his household income, San Jose mayoralty financial interests, and any tech-investor holdings?

8. NAMED-PUBLICATION COVERAGE OF MAHAN'S DONOR BASE. The "$0 from voters / millions from Silicon Valley" framing exists in CalMatters / SF Standard coverage already. What's the most recent (last 60 days) editorial analysis specifically on (a) the 58-donor base structure, (b) the Caruso cross-party question, (c) whether Mahan has any visible grassroots funding component?

9. MICHAEL MORITZ — political-giving pattern. Moritz at $6M is the largest single Mahan funder. Verify all his 2024-2026 California political contributions, federal contributions, and 501(c)(4) giving. He is also the founder of SF Standard. Has any press analyzed his $6M Mahan investment in light of his media ownership?

If no Tier 1/2 source available, NO DATA. No aggregators or social media.
```

---

## Prompt 4 — Hilton remaining gaps (after the May 3 audit)

```
Follow-up on the Steve Hilton institutional-money audit completed May 3, 2026. That audit resolved: pro-Hilton IE PAC (none found), Brin dual-candidate hedge (verified), Lonsdale federal Republican giving (verified, 119+106 FEC receipts), Murdoch family footprint (only Rupert), Hilton Form 700 (Sierra Technology Inc. spouse income + Sierra stock holding + Fox News commentator salary $10K-$100K + broad tech stock portfolio), Hilton v. Weber (dismissed Nov 4 2025), Bret Taylor / Sierra / Bavor (Bavor $5,900 to Brian Goldsmith state senate; nothing else), CalMatters + Politico + SFChron coverage (Brin hedge already reported by Politico Mar 4 2026).

Remaining open. Tier 1/2 sources only. Per finding: URL, tier, date, one-line statement.

QUESTIONS:

1. UK CITIZENSHIP STATUS — final resolution. Wikipedia says Hilton renounced UK citizenship at his May 11, 2021 US naturalization. Wikidata Q3498953 + April 2026 social-media coverage describe him as "dual British-American citizen." UK Home Office RN-form filings under Stephen Glenn Charles Hilton are the primary source for renunciation but not generally public. Has Hilton in any on-record statement (interview transcript, court filing, candidate-disclosure form, federal naturalization documentation, official campaign material) confirmed which is true? Has any major-press piece on his US naturalization (NYT, LAT, Guardian, FT, Adweek beyond the existing 2021 piece) clarified the UK side?

2. SIERRA TECHNOLOGY INC. — investor / cap-table / valuation. Hilton's Form 700 confirms personal stock holding in Sierra Technology Inc. (the AI startup co-founded by Bret Taylor and Clay Bavor). Sierra has raised at least one Series funding round publicly reported by tech press. What is Sierra's most recent disclosed valuation, what funding rounds has it announced, and what investors are publicly named (Sequoia, Benchmark, etc.)? Is OpenAI an investor? Is Microsoft (the OpenAI corporate partner) an investor through any AI-vehicle fund?

3. LIGHTHOUSE WORLDWIDE SOLUTIONS — corporate identification. Five Hilton donors disclosed Lighthouse Worldwide Solutions as employer at $39,000-$39,200 each (Michael Chunhan, Thomas Saunders, Paul Newman, Scott Salton, Tae Yun Kim). What is Lighthouse Worldwide Solutions Inc.? Industry, ownership, California regulatory exposure, prior political-giving footprint? The five named donors — verify identity for each (current title, role at Lighthouse, prior political giving).

4. JOHN McENTEE — donor identity verification. McEntee gave Hilton $39,200 (max). Verify whether this is the same John McEntee who served as Trump's White House Director of Personnel during the first Trump administration. Cross-check FPPC employer disclosure and any contemporaneous press coverage of the Hilton donation that names McEntee.

5. HILTON FOX NEWS COMMENTATOR ROLE — current status. Form 700 disclosed Fox News Network LLC commentator salary $10,001-$100,000 (income range). Is Hilton currently appearing on Fox News while running for governor? "The Next Revolution" ended in 2024, but the salary disclosure suggests ongoing payments. Has any press analyzed the candidate-on-Fox-News-payroll situation?

6. CALIFORNIA BALLOT-ELIGIBILITY IMPLICATIONS. California Elections Code requires gubernatorial candidates to be a US citizen at time of filing. If the dual-citizenship vs renunciation question (Q1) goes one way or the other, are there any ballot-eligibility implications? Has Hilton's candidate certification been challenged on this basis, or is the citizenship question answered for ballot purposes by his US naturalization regardless of UK status?

If no Tier 1/2 source, NO DATA. No aggregators or social media.
```

---

## Prompt 5 — Cross-candidate hedge / dual-party giving

```
I'm mapping cross-party hedge donors in the 2026 California gubernatorial primary. Confirmed dual-party givers from Cal-Access primary records:

  - Sergey Brin: $39,200 to Hilton (R) Mar 2 + $2M to Mahan IE (D) Mar 9
  - Joe Lonsdale: $25,000 to Hilton (R) Jan 30 + $5,000 to Mahan (D) 2024

Politico CA Playbook (Mar 4 2026) framed Brin's split as "Silicon Valley hedging."

Tier 1/2 sources only. Per finding: URL, tier, date, one-line statement.

QUESTIONS:

1. FULL CROSS-PARTY HEDGE MAP. Beyond Brin and Lonsdale, who else has given to BOTH a Republican (Hilton, Bianco) AND a Democrat (Becerra, Steyer, Porter, Mahan, Villaraigosa) in the 2026 California gubernatorial primary? Pull from FPPC Top 10 lists, Cal-Access cross-references, FEC where federal candidates are also receiving California-related gov-race money. The signal: a name that appears in a Republican AND a Democrat donor list at any non-trivial level.

2. CHRIS LARSEN (Ripple co-founder) — verified across this race. He gave Hilton $39,200 and shows up on Porter's donor list as "Christian Larsen" at $117,600. Verify identity match (employer / occupation field). If same person, that's a major hedge across both parties. Also: any Larsen-affiliated entity (Larsen Foundation, Ripple Labs PAC) giving on either side?

3. RICK CARUSO — Mahan $3M. Caruso ran for LA mayor in 2022 as Democrat-leaning Republican. His giving to Mahan (a Democrat) at $3M is striking. Has Caruso given to any 2026 California Republican (Hilton, Bianco)? Has any CA political press analyzed his Mahan investment relative to his Republican history?

4. SAME-DONOR DIFFERENT-VEHICLE HEDGES. Cal-Access patterns where the same individual donor or family appears across (a) one candidate's committee and (b) an opposing-candidate's IE PAC — a more sophisticated hedge than direct dual-party giving. Specifically check for any Hilton donors who appear as funders in pro-Mahan or anti-Steyer IE committees, or vice versa.

5. SAME-CONSULTING-FIRM ON BOTH SIDES. Bearstar Strategies runs media for the pro-Becerra IE AND the anti-Steyer IE — already documented. Are there other CA political consulting firms working on both sides of this primary? Check Schedule E vendor records across major IE committees: Polaris Campaigns, Bearstar Strategies, Nielsen Merksamer, Deane & Co., Mercury Public Affairs, Sacramento Strategies. Same firm running messaging for two opposing candidates is editorially substantive.

6. POLITICAL-GIVING PATTERNS AMONG OPENAI INVESTORS / BOARD. Confirmed Bret Taylor (OpenAI board chair) and Sam Altman political contributions to CA Gov 2026: zero direct candidate-committee giving (per my Cal-Access scan). Beyond Bavor's $5,900 to Brian Goldsmith state senate, are there other Sierra (Taylor + Bavor's AI startup) executives, OpenAI execs, or OpenAI-investor-fund principals giving in the CA Gov 2026 primary or related California state races?

7. NAMED-PUBLICATION COVERAGE OF HEDGING. What CA political press has analyzed cross-party donor hedging in the 2026 governor primary specifically? Politico Mar 4 covered Brin. Beyond that — KQED, CalMatters, LAT, SF Chronicle, SF Standard — has anyone framed the broader pattern (multiple donors hedging across parties)? This would be the "is this a one-off Brin story or a structural feature of the race" question.

If no Tier 1/2 source, NO DATA. No aggregators or social media.
```

---

## Run order recommendation

If running them serially (one Perplexity round at a time):

1. **Bianco first.** Highest leverage — Republican-side balance + the Bianco/Hilton compare-and-contrast beat David asked for.
2. **Hilton remaining gaps second.** Closes out the Hilton story so it can ship.
3. **Cross-candidate hedge third.** Pulls Brin/Lonsdale/Larsen/Caruso into one structural finding.
4. **Mahan fourth.** Already well-covered by SF Standard / CalMatters; this prompt is mostly verification + Caruso-cross-party + Govern-FOR-CA sponsor identification.
5. **Porter last.** The most narratively-loaded already (trial-lawyer + Uber + Schreiber). Lower urgency.

If running them in parallel: all five at once is fine — they don't share state.
