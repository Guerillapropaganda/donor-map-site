#!/usr/bin/env node
/**
 * Corrects the Hilton UK research doc + Hilton dossier with David's
 * Perplexity-research verifications (2026-05-01).
 *
 * Source: C:\Users\third\Downloads\Hilton_Verification_Followups.md
 *
 * Major corrections:
 *   - Whetstone is at Sierra (AI startup), NOT OpenAI. Started March 3 2025.
 *     Sierra co-founded by Bret Taylor (OpenAI board chair) — that's the
 *     confusion source.
 *   - HPE and Nextdoor never happened — drop from her CV
 *   - Naturalization: May 11, 2021, SF USCIS field office (Tier 1 verified)
 *   - "Crowdpac lawsuit" doesn't exist. Actual dispute: FEC MUR 7309/7399
 *     about Crowdpac as unregistered political committee. Crowdpac WON.
 *   - British citizenship: Wikipedia says renounced; other sources say
 *     dual citizen — discrepancy worth flagging
 *   - Real Hilton lawsuit: Hilton v. Weber (Sept 4 2025) on Prop 50
 *     redistricting — preliminary injunction denied
 */
const fs = require('fs');

// ── Update the UK research doc ──
{
  const fp = 'content/Admin Notes/ca-gov-2026-hilton-uk-research-2026-05-01.md';
  let text = fs.readFileSync(fp, 'utf-8');

  // Replace the "Whetstone career arc" table with corrected version
  const oldTable = `| Period | Role | Context |
|---|---|---|
| 1990s | **Conservative Research Department** (UK) | Where she met Steve Hilton. Tory political operative path. |
| 2003-2005 | **Political Secretary to Michael Howard** (Conservative Party Leader) | UK political insider track |
| 2005-2015 | **Senior VP, Communications & Public Policy, Google** | ~10 years at Google during the EU antitrust era, the Snowden / NSA-cooperation revelations, the YouTube content-moderation fights, the rise of Search-result regulation, and the start of the Google-Books controversy. Worked alongside Omid Kordestani (Senior VP of Sales — note the potential family connection to Crowdpac UK director Gisel Kordestani). |
| 2015-2017 | **Senior VP / Chief Communications Officer, Uber** | Crisis-comms tenure DURING: Susan Fowler harassment revelations (Feb 2017), the Greyball law-enforcement-evasion scandal, Travis Kalanick's resignation, the #DeleteUber campaign. Departed amid the Holder Report crisis. |
| 2017-2018 | Brief consulting / advisor period | |
| 2018-2020 | **Chief Communications Officer, Netflix** | Through the original-content arms race, Netflix's HBO competition era. |
| 2020-2022 | **Chief Communications Officer, Hewlett Packard Enterprise** (HPE) | *Verify date range — public reporting is less consistent on this period.* |
| 2022-2023 | **Chief Communications Officer, NextDoor** | Brief tenure |
| 2023-present | **Chief Communications Officer, OpenAI** | **Through the Sam Altman board firing + 5-day reinstatement saga (November 2023), the Sutskever / Toner board exit, and the 2024-2025 commercialization disputes.** Currently in role per public reporting. |`;

  const newTable = `| Period | Role | Source quality |
|---|---|---|
| ~1990-1993 | Researcher, **Conservative Research Department** (UK) — where she met Steve Hilton | Tier 2 (Evening Standard 2005 profile) |
| ~1993-1997 | **Special adviser to Home Secretary Michael Howard**, UK Home Office | Tier 2 (Evening Standard) |
| ~1997-2003 | Carlton Communications / T-Mobile UK / **Portland Communications (co-founder)** | Tier 2 (BBC profile) |
| Nov 2003-~2005 | **Political Secretary / Chief of Staff to Michael Howard** (Conservative Party leader) | Tier 2 (BBC profile) |
| 2005-early 2015 | **SVP Communications & Public Policy, Google** — ~10 years through EU antitrust era, Snowden revelations, YouTube content-moderation fights, Google-Books controversy. Worked at the same firm during the same years as Omid Kordestani (Senior VP of Sales) | Tier 2 (BBC; The Hustle profile) |
| ~mid-2015 to April 2017 | **Senior VP Policy and Communications, Uber** — crisis-comms tenure DURING: Susan Fowler harassment revelations (Feb 2017), Greyball law-enforcement-evasion scandal, Travis Kalanick's resignation, #DeleteUber campaign. Departed amid the Holder Report crisis | Tier 2 (Wikipedia + Gulf News) |
| ~mid-2017 to ~July 2018 | **VP Communications, WhatsApp / Instagram / Messenger, Facebook** | Tier 2 (Wikipedia) |
| August 2018 to early 2025 | **Chief Communications Officer, Netflix** — through the original-content arms race | Tier 2 + PRWeek Jul 2019 |
| **March 3, 2025 to present** | **Communications lead, Sierra (AI startup)** | **Axios + O'Dwyer's PR (both date to March 3, 2025 hire announcement)** |

**Critical correction from prior research:** Whetstone is **NOT at OpenAI**. She is at **Sierra**, an AI startup co-founded by **Bret Taylor** (former Salesforce CEO and **chair of OpenAI's board**) and **Clay Bavor** (former Google executive). The Sierra-OpenAI confusion came from Bret Taylor's OpenAI board chairmanship. Sierra ≠ OpenAI.

**Corrections to drop:**
- **HPE (Hewlett Packard Enterprise)** — was a confusion with Meg Whitman (HPE CEO) being someone Travis Kalanick consulted, not Whetstone working there. **No primary source places her at HPE.**
- **Nextdoor** — was a confusion with Sarah Friar (Nextdoor CEO who later went to OpenAI). **No primary source places her at Nextdoor.**`;

  if (text.includes(oldTable)) {
    text = text.replace(oldTable, newTable);
    console.log('Replaced Whetstone CV table');
  } else {
    console.log('WARNING: Whetstone CV table not found — may have been edited');
  }

  // Replace the "structural contradiction" framing to reflect Sierra not OpenAI
  const oldFraming = `**The pattern of her hires reveals it: she joined Uber during the Susan Fowler / Greyball / Kalanick-resignation crisis, joined OpenAI during the Altman board-firing crisis. She is not incidentally at these firms during their controversies — **she is hired during their controversies because she is one of the most accomplished crisis-communications executives in Silicon Valley.**

The contradiction the data surfaces:

- The Fox News *Next Revolution* host, married to the woman who ran comms for Google during the EU antitrust regime
- The "outsider" California gubernatorial candidate, married to the woman who ran comms for Uber during the Susan Fowler harassment crisis
- The anti-establishment populist, married to the woman who ran comms for OpenAI during Sam Altman's board firing
- The candidate whose UK political career was as a paid Conservative Party advisor, married to a former paid Conservative Party operative (Conservative Research Department + Howard's Political Secretary)

**Screenshot-bait formulation.** "Steve Hilton's wife runs PR for OpenAI. His Fox News show called the Silicon Valley establishment 'the enemy.' Both can be true. Both are true."`;

  const newFraming = `**The pattern of her hires reveals it: she joined Uber during the Susan Fowler / Greyball / Kalanick-resignation crisis, joined Netflix during the streaming-wars era, and as of March 2025 is at Sierra — an AI startup chaired by Bret Taylor (OpenAI's board chair). She is not incidentally at these firms — **she is hired specifically because she is one of the most accomplished crisis-communications executives in Silicon Valley.**

The contradiction the data surfaces:

- The Fox News *Next Revolution* host, married to the woman who ran comms for Google during the EU antitrust regime
- The "outsider" California gubernatorial candidate, married to the woman who ran comms for Uber during the Susan Fowler harassment crisis
- The anti-establishment populist, married to a Silicon Valley AI-industry comms executive at a startup chaired by OpenAI's board chair
- The candidate whose UK political career was as a paid Conservative Party advisor, married to a former paid Conservative Party operative (Conservative Research Department + Howard's Political Secretary)

**The current conflict-of-interest surface is AI regulation, not streaming.** Whetstone's move from Netflix to Sierra in March 2025 changed the conflict-of-interest landscape Hilton would face as governor: AI legislation is one of the most active areas in Sacramento (AB-2013 derivatives, AI safety bills, CPUC AI procurement). A governor whose spouse leads communications at a private AI startup chaired by OpenAI's board chair has a substantially larger Sacramento conflict-of-interest surface than one whose spouse runs comms for a streaming service.

**Screenshot-bait formulation.** "Steve Hilton's wife runs PR for an AI startup chaired by OpenAI's board chair. His Fox News show called the Silicon Valley establishment 'the enemy.' Both can be true. Both are true."`;

  if (text.includes(oldFraming)) {
    text = text.replace(oldFraming, newFraming);
    console.log('Replaced structural-contradiction framing');
  }

  // Add the Crowdpac correction + Hilton v. Weber
  const oldOpenQuestions = `## Open questions for verification before publishing

1. **Stephen Glenn Charles Hilton legal-name confirmation.** Cross-check against US naturalization records and California voter registration. Companies House confirms; we want a US-side anchor too.
2. **Gisel Kordestani → Omid Kordestani relationship.** If father/daughter (likely), the Google → Crowdpac institutional link is direct. If not (coincidence of surname), the Google connection is weaker.
3. **Crowdpac dissolution reason.** The Companies House filing history shows 3 filings tracked. What was the cause of dissolution — voluntary strike-off, compulsory winding-up, member's voluntary liquidation? The filing-history endpoint returned data we can dig into in a follow-up.
4. **Whetstone employment dates.** Training-knowledge baselines need cross-check against company press releases and LinkedIn. Specifically: HPE tenure dates, NextDoor tenure dates, OpenAI start date.
5. **Crowdpac US legal dispute.** The Hilton/Hilder falling-out generated a lawsuit. What were the specific allegations, what was the resolution, who held what equity?
6. **US naturalization year.** Public reporting cites 2021; confirm against USCIS-side records or news at-the-time announcements.
7. **The financial scale of Crowdpac UK.** The filing-history endpoint indicated 3 filings — these include accounts (financial statements). Were the UK arm's accounts dormant or active? Dormant suggests the UK entity was a shell; active suggests real operation.
8. **Hansard references to Hilton.** Currently CF-blocked. Defer to David's manual research at editorial time.`;

  const newOpenQuestions = `## David's Perplexity verification — 2026-05-01 (Hilton_Verification_Followups.md)

David's Perplexity research pass resolved most open questions:

1. **Stephen Glenn Charles Hilton legal name — CONFIRMED.** Companies House officer record and Wikidata Q3498953 both attest. California ballot designation is "STEVE HILTON, Republican, Small Business Owner" (Sonoma County Registrar; allowed under CA Elections Code §13104 known-as-name provision). USCIS naturalization certificate is not a public record but no public source contradicts the Companies House name.

2. **Gisel Kordestani → Omid Kordestani relationship — STILL UNCONFIRMED.** Not addressed by David's Perplexity pass. Companies House showed Omid Kordestani has UK director records (same registry); same-surname circumstantial evidence stands.

3. **Crowdpac dissolution reason — CORRECTED.** UK Crowdpac Ltd was wound up via Members' Voluntary Liquidation per Companies House filing forms (LIQ01, LIQ13, GAZ2 — verified earlier this session, see ca-gov-2026-hilton-uk-verifications-2026-05-01.md).

4. **Whetstone employment dates — VERIFIED via Perplexity.** Drop HPE and Nextdoor (never happened — confusions with other people). Add March 3, 2025 Sierra hire (Axios + O'Dwyer's both confirm). She left Netflix early 2025; she is NOT at OpenAI (Sierra ≠ OpenAI; Sierra is co-founded by Bret Taylor who chairs OpenAI's board).

5. **Crowdpac US lawsuit — DOES NOT EXIST.** Five-pass search through TechCrunch, Mediaite, The Hill, FEC, and Wikipedia found no Hilton vs. Hilder litigation. What actually happened May 15, 2018: Crowdpac suspended Republican fundraising; Hilton resigned same day; Gisel Kordestani named permanent CEO. The actual federal dispute went through FEC MUR 7309 + MUR 7399 (filed by Republican former House candidates Bassilian + DeMartini, alleging Crowdpac was an unregistered political committee). FEC found no reason to believe Crowdpac violated the Act, June 3, 2019. Hilder is NOT named as a party. **Drop the "Crowdpac dispute = lawsuit between Hilton and Hilder" framing from any editorial work — it is not in court records.**

6. **US naturalization year — CONFIRMED May 11, 2021, San Francisco USCIS field office.** Triple-sourced: USCIS official Facebook video (Tier 1 — primary government social media), Adweek 2021-05-12 (Tier 2 confirmation), Hilton's own Twitter post (primary individual). Application announced 2019-07-07 on his Fox show — ~22 month process. Hilton's framing: "I chose to become an American in 2021."

7. **Crowdpac UK financial scale — STILL OPEN.** The UK Companies House filing history was not pulled in this session for the Crowdpac UK PDF accounts. Available as one-shot fetch under ADR-0030 §10 if Crowdpac dissolution becomes a story angle.

8. **Hansard references — STILL CF-BLOCKED.** Defer to David's manual browser research at editorial time.

### NEW open questions surfaced by Perplexity research

9. **British citizenship status discrepancy.** Wikipedia says Hilton renounced British citizenship as part of US naturalization; Wikidata + April 2026 social-media coverage describe him as a "dual British-American citizen." One of these is wrong. Verifiable via UK Home Office FOI on Form RN filings under Stephen Glenn Charles Hilton. Has potential ballot-eligibility implications under CA dual-citizenship questions.

10. **The actual Hilton lawsuit that DOES exist.** *Hilton v. Weber* (filed September 4, 2025) — Hilton suing CA Secretary of State Shirley Weber over Proposition 50 / redistricting. Preliminary injunction denied. Different matter from the Crowdpac question; real and ongoing 2025 litigation against the official who runs his ballot. Editorially substantive: the candidate is in active litigation against the elections office whose ballot will list him. *Source: thearp.org/litigation/hilton-v-weber/.*

11. **Sierra's cap table / disclosure scope.** If available, would scope the size of the Whetstone conflict-of-interest surface around Sacramento's AI legislative pipeline.

12. **Hilton's most recent FPPC Form 700.** If filed as a candidate, would disclose Whetstone's current employer (Sierra) in the household financial-interest section — Tier 1 confirmation of the connection from a CA government primary source.`;

  if (text.includes(oldOpenQuestions)) {
    text = text.replace(oldOpenQuestions, newOpenQuestions);
    console.log('Updated open-questions section');
  }

  fs.writeFileSync(fp, text, 'utf-8');
}

// ── Update the Hilton dossier (main file) — replace the "UK background" subsection ──
{
  const fp = 'content/Admin Notes/ca-gov-2026-dossiers/hilton.md';
  let text = fs.readFileSync(fp, 'utf-8');

  const oldFinding = `### UK background — surfaced this session (Phase 5, ADR-0030 §10 amendment 2026-05-01)

The "Fox media / outsider populist" archetype above is necessary-but-not-sufficient for Hilton. The fuller archetype includes:

- **Stephen Glenn Charles Hilton** (legal name, Companies House primary source) is a **Hungarian-British Oxford PPE** product whose career was 20+ years inside the UK Conservative Party machine, culminating as **Director of Strategy to Prime Minister David Cameron at #10 Downing Street, 2010-2012** — author of the "Big Society" policy framing that has been widely critiqued in UK political-science literature as branding for austerity-era public-service cuts.
- The "outsider populist" identity is a **2017+ product** (Fox News *The Next Revolution* era), not a career-long identity. The career arc is the editorial story.
- He was **Director of Crowdpac Limited (UK) #10133929** — a UK political-tech startup co-founded with Paul Hilder and a third director Gisel Lynn Kordestani (likely related to former Google Chief Business Officer Omid Kordestani — Companies House confirms Omid has UK director records, strengthening but not proving the family link). The UK entity was incorporated April 2016 and **wound up via Members' Voluntary Liquidation in 2019-2020** (filing forms LIQ01, LIQ13, GAZ2 — solvent deliberate wind-down, not a dormant strike-off or compulsory winding-up), dissolution finalized 2020-09-16. The MVL mechanism means the UK arm was actively *chosen* to be liquidated while solvent — a corporate decision, not a collapse.
- He is married to **Rachel Whetstone**, a former Conservative Research Department / Howard's Political Secretary operative who has served as Senior VP / Chief Communications Officer at **Google (2005-2015), Uber (2015-2017, through the Susan Fowler crisis), Netflix, NextDoor, and now OpenAI (through the November 2023 Sam Altman board firing)**. She is one of Silicon Valley's most senior crisis-comms operators.

**The screenshot-bait expansion.** "Steve Hilton's wife runs PR for OpenAI. His Fox News show called Silicon Valley 'the enemy.' Both can be true. Both are true."

**Three editorial story candidates** detailed in [the UK research doc](../ca-gov-2026-hilton-uk-research-2026-05-01.md): A) the naturalized populist career-arc piece, B) the Whetstone power-couple contradiction, C) the Big Society + Crowdpac dissolution pattern-of-failure piece. Recommended publishing order if running all three: A → B → C.`;

  const newFinding = `### UK background + Whetstone trail — VERIFIED (Phase 5e, David's Perplexity pass 2026-05-01)

The "Fox media / outsider populist" archetype above is necessary-but-not-sufficient for Hilton. The fuller archetype, incorporating David's Perplexity verification:

- **Stephen Glenn Charles Hilton** (legal name, Companies House primary source) is a **Hungarian-British Oxford PPE** product (Brasenose College, same as Cameron) whose career was 20+ years inside the UK Conservative Party machine, culminating as **Director of Strategy to Prime Minister David Cameron at #10 Downing Street, 2010-2012** — author of the "Big Society" policy framing.

- The "outsider populist" identity is a **2017+ product** (Fox News *The Next Revolution* era), not a career-long identity. The career arc is the editorial story.

- **US naturalization confirmed May 11, 2021, San Francisco USCIS field office.** Triple-sourced (USCIS official Facebook video, Adweek 2021-05-12, Hilton's own contemporaneous tweet). Applied 2019-07-07 on his Fox show — ~22-month process. His framing: "I chose to become an American in 2021."

- **British citizenship status — DISCREPANCY worth flagging.** Wikipedia says he renounced UK citizenship as part of naturalization; Wikidata + April 2026 social-media coverage describes him as "dual British-American." One is wrong. Worth resolution before publishing — has CA ballot-eligibility implications.

- He was **Director of Crowdpac Limited (UK) #10133929** — co-founders Paul Hilder + Gisel Lynn Kordestani. UK entity incorporated April 2016, **wound up via Members' Voluntary Liquidation 2019-2020** (Companies House filing codes LIQ01/LIQ13/GAZ2 — solvent deliberate wind-down, not a dormant strike-off or compulsory winding-up). Dissolution finalized 2020-09-16.

- **CRITICAL CORRECTION — there is no "Crowdpac lawsuit between Hilton and Hilder."** Earlier dossier text speculating about a US lawsuit was wrong. David's Perplexity research found zero court records. What actually happened May 15, 2018: Crowdpac suspended Republican fundraising; Hilton resigned same day; Gisel Kordestani named permanent CEO. The actual federal proceeding was **FEC MUR 7309 + MUR 7399**, filed by Republican former House candidates **Ron Bassilian** + **Frank DeMartini** alleging Crowdpac was an unregistered political committee. The FEC found NO REASON TO BELIEVE Crowdpac violated the Act on June 3, 2019. Hilder is not a party. Crowdpac then shut down May 2019 and was acquired by Prytany; rebranded as CrowdBlue in 2025.

- **The actual ongoing Hilton lawsuit:** *Hilton v. Weber* (filed September 4, 2025) — Hilton suing California Secretary of State Shirley Weber over Proposition 50 / redistricting. **Preliminary injunction denied.** Editorially substantive: the candidate is in active litigation against the elections office whose ballot lists him.

#### Whetstone trail — corrected via Perplexity

He is married to **Rachel Whetstone**, a former Conservative Research Department / Special Adviser to Michael Howard / Political Secretary to Howard who became one of Silicon Valley's most senior crisis-comms executives. **Verified chronology:**

- Conservative Research Department ~1990-1993 (where she met Hilton)
- Special adviser to Home Secretary Michael Howard ~1993-1997
- Carlton Communications / T-Mobile UK / Portland Communications ~1997-2003
- Political Secretary / Chief of Staff to Michael Howard (Tory leader) Nov 2003-~2005
- **SVP Communications & Public Policy, Google** 2005-early 2015 (EU antitrust era)
- **SVP Policy & Communications, Uber** mid-2015-April 2017 (departed amid Susan Fowler / Holder Report crisis)
- VP Communications WhatsApp/Instagram/Messenger, Facebook ~mid-2017-July 2018
- **Chief Communications Officer, Netflix** August 2018-early 2025
- **Communications lead, Sierra (AI startup)** **March 3, 2025-present**

**HPE and Nextdoor never happened** — those entries in the prior dossier were errors (HPE was a confusion with Meg Whitman; Nextdoor was a confusion with Sarah Friar). **She is NOT at OpenAI** — Sierra is co-founded by Bret Taylor (OpenAI's board chair), and the OpenAI confusion came from that chairmanship link. **Sierra ≠ OpenAI.**

#### The corrected Whetstone conflict-of-interest framing

Whetstone's March 2025 move from Netflix to Sierra **changed the Sacramento conflict-of-interest surface significantly** — from streaming-industry comms (limited Sacramento exposure) to **AI-industry comms at a private AI startup chaired by OpenAI's board chair** (active Sacramento legislative pipeline: AB-2013 derivatives, AI safety bills, CPUC AI procurement). A governor whose spouse leads communications at a private AI startup with deep OpenAI-board-chair links has a substantially larger Sacramento conflict-of-interest exposure than a governor whose spouse runs comms for Netflix.

**The screenshot-bait expansion (corrected).** "Steve Hilton's wife runs PR for an AI startup whose chairman also chairs OpenAI's board. His Fox News show called Silicon Valley 'the enemy.' Both can be true. Both are true."

**Three editorial story candidates** detailed in [the UK research doc](../ca-gov-2026-hilton-uk-research-2026-05-01.md): A) the naturalized populist career-arc piece, B) the Whetstone power-couple contradiction (now sharper with the Sierra/OpenAI-chairman update), C) the Big Society + Crowdpac dissolution pattern-of-failure piece. Recommended publishing order: A → B → C.`;

  if (text.includes(oldFinding)) {
    text = text.replace(oldFinding, newFinding);
    console.log('Updated Hilton dossier UK section with Perplexity corrections');
  } else {
    console.log('WARNING: Hilton dossier section not found — may have been edited');
  }

  fs.writeFileSync(fp, text, 'utf-8');
}

console.log('Done.');
