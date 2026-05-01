#!/usr/bin/env node
/**
 * URGENT correction to Steyer dossier — Phase 5c (2026-05-01).
 *
 * David caught a major attribution error: the committee named "STEYER FOR
 * GOVERNOR 2026, A COALITION OF HOUSING ADVOCATES, LABOR AND SMALL BUSINESS;
 * CALIFORNIA IS NOT FOR SALE, NO ON" was actually an ANTI-STEYER committee.
 * The "NO ON" suffix is the FPPC's required disclosure that an opposition
 * committee names its target candidate. The committee's actual sponsor (per
 * FILERNAME_CD): "CALIFORNIANS FOR THE PEOPLE, SPONSORED BY BUSINESS OWNERS
 * AND CONCERNED CITIZENS." The earlier librarian-derived edge that surfaced
 * this as "Steyer self-funded $13.89M through his own coalition" was a
 * direction-flow misattribution.
 *
 * Re-verification against raw RCPT_CD reveals Steyer's ACTUAL self-fund:
 *   - $133,776,000 across 41 contribution events from Tom Steyer personally
 *     (employer "Steyer for Governor 2026" / occupation "Candidate") to his
 *     own committee 1485077 ("STEYER FOR GOVERNOR 2026", clean naming, no
 *     "NO ON" suffix). This matches his 2020 presidential self-fund pattern
 *     ($191M historical) — same operator, same playbook.
 *
 * Anti-Steyer committees identified (Tier 1 verified, both have "NO ON
 * STEYER FOR GOVERNOR 2026" suffix per FPPC opposition naming convention):
 *   - 1490270 — "CALIFORNIANS FOR RESILIENT AND AFFORDABLE ENERGY, NO ON
 *     STEYER FOR GOVERNOR 2026" — PG&E-funded ~$16M (verified)
 *   - 1489677 — "CALIFORNIANS FOR THE PEOPLE, SPONSORED BY BUSINESS OWNERS
 *     AND CONCERNED CITIZENS" / alt name "STEYER FOR GOVERNOR 2026 ...
 *     CALIFORNIA IS NOT FOR SALE, NO ON" — funder TBD, ~$13.89M flow
 *     (verified anti-Steyer by FPPC naming convention; flow direction
 *     correction implies this was anti-Steyer ad spending)
 *
 * Total identified anti-Steyer spending: ~$30M (combined PG&E + Business
 * Owners). Steyer is the most-targeted candidate in the race by opposition
 * spending.
 *
 * Data-quality finding (separate concern): the librarian's bulk-edge
 * derivation should distinguish opposition committees from candidate-
 * controlled committees. Pattern: any FPPC committee whose registered name
 * contains "NO ON [CANDIDATE] FOR [OFFICE]" is opposing that candidate, not
 * controlled by them. Worth a harness check.
 */
const fs = require('fs');
const fp = 'content/Admin Notes/ca-gov-2026-dossiers/steyer.md';
let text = fs.readFileSync(fp, 'utf-8');

// Replace the entire Phase 5b NEW FINDINGS section with the corrected version.
const phase5bStart = '## NEW FINDINGS (Phase 5b deep extract — 2026-05-01)';
const phase5bEnd = '## Open questions for David';

const startIdx = text.indexOf(phase5bStart);
const endIdx = text.indexOf(phase5bEnd, startIdx);
if (startIdx < 0 || endIdx < 0) {
  console.error('Could not locate Phase 5b section in steyer.md');
  process.exit(1);
}

const corrected = `## CORRECTED FINDINGS (Phase 5c — 2026-05-01)

**Major correction to earlier Phase 5b findings.** David's skepticism prompted re-verification. The "California Is Not For Sale" framing of committee \`1489677\` as a Steyer self-fund vehicle was wrong. Re-verification against FILERNAME_CD primary source reveals \`1489677\` is an **anti-Steyer opposition committee**, not a Steyer-controlled committee. Corrected findings below.

### Steyer self-funded $133.8M to his own campaign — corrected total

Raw RCPT_CD verification: **Tom Steyer (employer "Steyer for Governor 2026," occupation "Candidate") personally contributed $133,776,000 across 41 contribution events to his own committee 1485077 ("STEYER FOR GOVERNOR 2026" — clean naming, no opposition-committee suffix).** Largest single contribution: $20M on November 19, 2025 (his official campaign launch date). Several individual contributions exceed $10M.

This **dwarfs the earlier $14M figure** that came from the librarian's bulk-edge derivation (\`data/derived/cal-access-bulk.jsonl\`). The bulk-edge derivation appears to have undercounted candidate-self contributions, possibly treating them as internal transfers rather than reportable contributions. **Data-quality finding.**

**Editorial significance.** Steyer's $133.8M self-fund matches the scale of his 2020 presidential self-fund pattern ($191M historical). Same operator, same playbook. The "billionaire self-fund" archetype is more than confirmed — it's the dominant fact about his campaign, more than any individual donor or any particular contradiction. He has effectively created a category of CA gubernatorial candidate that exists only with a billionaire's bank account.

**Screenshot-bait formulation.** "Tom Steyer's California governor campaign has 131 outside donors and Tom Steyer. Tom Steyer has given $133,776,000. The 131 others have given $187,873." (Numbers approximate — verify against the latest filings.)

### Anti-Steyer opposition spending — TWO committees identified, ~$30M total

**The "California Is Not For Sale" framing was wrong; both committees with that pattern are opposing Steyer.** FPPC naming convention requires opposition committees to disclose their target candidate's name in their official committee name, with "NO ON [CANDIDATE]" as the disclosure pattern. Two such committees verified:

| Committee | Registered Name | Funder | Amount |
|---|---|---|---:|
| \`1490270\` | "CALIFORNIANS FOR RESILIENT AND AFFORDABLE ENERGY, NO ON STEYER FOR GOVERNOR 2026" | Pacific Gas & Electric Corporation (two filings) + IBEW Local 1245 | ~$16.05M |
| \`1489677\` | Primary: "CALIFORNIANS FOR THE PEOPLE, SPONSORED BY BUSINESS OWNERS AND CONCERNED CITIZENS." Alt: "STEYER FOR GOVERNOR 2026 ... CALIFORNIA IS NOT FOR SALE, NO ON" | TBD (per FILERNAME_CD: "Business Owners and Concerned Citizens" — ID-of-actual-funder remains David's verification) | ~$13.89M |

**Both committees registered at the same Sacramento address (Deane and Company, a major California campaign-finance compliance firm).** Different actual funders, same operational shop. The pattern suggests coordinated opposition infrastructure, though independence between the funders cannot be confirmed without further filing review.

**Total identified anti-Steyer spending: ~$30M.** This makes Steyer the most-targeted candidate in the entire CA Gov 2026 race by opposition spending. Mahan's IE-PAC funding (~$2.4M+, see his dossier) is small by comparison; no other major candidate has comparable opposition-committee infrastructure organized against them.

### The PG&E story still stands — refined

The Phase 5b finding on PG&E spending $16M to defeat Steyer is verified by FPPC naming-convention analysis: committee \`1490270\` explicitly names "NO ON STEYER FOR GOVERNOR 2026" in its registered title. PG&E's two $8M filings to that committee are confirmed. The class-analysis frame stands:

> Pacific Gas & Electric Corporation — the utility behind multiple deadly wildfires (Camp Fire 2018 killed 85 people), the 2019 bankruptcy filing, and the 2020 felony pleas to involuntary manslaughter for negligent maintenance — funded ~$16M against the only major candidate whose brand is climate-and-utility accountability. Plus $50K from IBEW Local 1245 (PG&E's own utility-workers union).

### Refined editorial framing

The story shape changes substantially from the Phase 5b draft:

**OLD (corrected away):** "Steyer is a billionaire self-funder operating through a slogan-branded coalition committee."

**NEW (verified):** Steyer is a billionaire who has personally funded $133.8M of his own campaign through clean, named candidate committee infrastructure. He is also the most-targeted candidate in the race by opposition spending — facing combined ~$30M+ from a PG&E-funded anti-Steyer committee plus a "Business Owners and Concerned Citizens" anti-Steyer committee, both organized through the same compliance shop.

**The class-money story is sharper than before:** Steyer's $133.8M and PG&E's $16M are operating in the same race, on the same primary ballot, against each other. Two billionaire-tier money flows colliding — one inside one candidate's pocket, one organized against him. The political-spending market for this single primary is approaching $200M when you count Steyer's self-fund + the anti-Steyer opposition + the other major candidates' campaigns.

### Background — Steyer's longer Becerra-support history (federal, retracted from earlier draft)

Earlier Phase 5b text incorrectly stated Steyer made a 2026 contribution to Becerra. Raw RCPT_CD verification revealed the actual transaction was 2016 (federal, to Becerra's House campaign), not 2026 (state, to Becerra's Gov committee). The Steyer-to-Becerra giving relationship is real but historical. *Documented in detail in [the verifications doc](../ca-gov-2026-hilton-uk-verifications-2026-05-01.md) — separate retraction.*

### Data-quality findings — for the harness backlog

Two distinct librarian misattribution patterns surfaced this session:

1. **Cycle-misattribution on amended filings.** Bulk-edge derivation conflated RCPT_DATE (filing/amendment date) with DATE_THRU (original transaction date), producing edges flagged as "cycle 2026" when actual transactions were earlier cycles. (First surfaced via Steyer-Becerra-2016 finding; correction documented in earlier dossier round.)

2. **Direction-flow misattribution on opposition committees.** Bulk-edge derivation treated FPPC opposition committees (whose names contain "[CANDIDATE] FOR [OFFICE], NO ON" per FPPC disclosure rules) as if they were the candidate's own committees, surfacing money flows in the wrong direction. (Surfaced this round via the "California Is Not For Sale" finding correction.)

Both warrant harness checks. Recommended check shape:
- Flag any edge where source/target name pattern matches \`/^[A-Z][A-Z\\s]+ FOR [A-Z]+\\d+.*NO ON/\` as a candidate's committee — that's an opposition committee, not a candidate-controlled committee.
- Flag any edge where RCPT_DATE and DATE_THRU diverge by more than one cycle as suspect for cycle-misattribution.

Both checks would prevent the kind of false findings that surfaced in Phase 5b.

`;

text = text.slice(0, startIdx) + corrected + text.slice(endIdx);
fs.writeFileSync(fp, text, 'utf-8');
console.log('Corrected steyer.md — Phase 5c. Earlier Phase 5b findings replaced with verified set.');
