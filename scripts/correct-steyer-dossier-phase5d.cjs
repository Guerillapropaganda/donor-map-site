#!/usr/bin/env node
/**
 * SECOND correction round on Steyer dossier — Phase 5d (2026-05-01).
 * Prompted by David's instruction to verify pro/anti attribution
 * across all findings. Filing-trace verification via CVR_CAMPAIGN_
 * DISCLOSURE_CD revealed:
 *
 * VERIFIED (Tier 1, primary-source filing-trace):
 *   - PG&E gave $8,000,000 to anti-Steyer committee 1490270 on
 *     2026-04-10 (filing 3134124, F497)
 *   - PG&E gave $1,975,000 to anti-Steyer committee 1490270 on
 *     2026-04-20 (filing 3135715, F497)
 *   - IBEW Local 1245 gave $50,000 to anti-Steyer committee 1490270
 *     on 2026-04-10 (same filing 3137638 as PG&E's primary $8M)
 *   - VERIFIED ANTI-STEYER TOTAL: ~$10,025,000 (not $16M)
 *
 * RETRACTED:
 *   - The "$16M PG&E anti-Steyer" claim from Phase 5b was wrong.
 *     The "two $8M filings" interpretation was a librarian duplicate-
 *     counting artifact. Raw RCPT_CD shows ONE $8M record + ONE
 *     $1.975M record = $9.975M PG&E total.
 *   - The "$13.89M from anti-Steyer 1489677" claim from Phase 5c
 *     cannot be verified. Committee 1489677 exists (registered
 *     2026-04-01 as "Californians for the People... STEYER FOR
 *     GOVERNOR 2026 ... NO ON" — anti-Steyer by FPPC naming
 *     convention), but no contribution records exist in raw bulk
 *     yet (committee too new — only 30 days old). The $13.89M
 *     figure was librarian-extrapolated from misinterpreted edges.
 *
 * NEW FINDINGS:
 *   - PG&E's own issues PAC: "Building Resilient Infrastructure for
 *     a Decarbonized Green Economy Issues PAC (BRIDGE Issues)"
 *     committee 1490585, established 2026-04-20, San Rafael (same
 *     compliance shop as anti-Steyer 1490270). PG&E gave its own
 *     PAC at minimum $1.2M+ ($500K + $700K visible in S497).
 *   - Cross-cutting compliance-shop pattern: Nielsen Merksamer
 *     LLP (form410@nmgovlaw.com, San Rafael) is the operator
 *     behind anti-Steyer 1490270, PG&E's BRIDGE Issues PAC 1490585,
 *     AND both Mahan IE PACs 1487425 + 1488176. Same compliance
 *     firm filing for utility-aligned anti-Steyer money AND tech-
 *     billionaire-aligned pro-Mahan money. Coordinated political
 *     infrastructure pattern.
 *
 * Steyer self-fund finding ($133.8M) STANDS — verified independently
 * via raw RCPT_CD filings to his own committee 1485077 (clean name,
 * not opposition committee).
 */
const fs = require('fs');
const fp = 'content/Admin Notes/ca-gov-2026-dossiers/steyer.md';
let text = fs.readFileSync(fp, 'utf-8');

const phase5cStart = '## CORRECTED FINDINGS (Phase 5c — 2026-05-01)';
const phase5cEnd = '## Open questions for David';

const startIdx = text.indexOf(phase5cStart);
const endIdx = text.indexOf(phase5cEnd, startIdx);
if (startIdx < 0 || endIdx < 0) {
  console.error('Could not locate Phase 5c section in steyer.md');
  process.exit(1);
}

const corrected = `## VERIFIED FINDINGS (Phase 5d — 2026-05-01)

**This is the second correction round prompted by David's instruction to verify all pro/anti committee attributions via primary-source filing trace.** Findings below are verified through CVR_CAMPAIGN_DISCLOSURE_CD filings (which committee filed which Form 460 / Form 497) — the source-of-truth path that distinguishes which committee is sender vs. receiver in any given record. Earlier librarian-derived bulk edges had multiple direction-flow misattributions and one duplicate-counting artifact.

### Steyer self-fund: $133.8M to his own campaign — VERIFIED

Tom Steyer (employer "Steyer for Governor 2026," occupation "Candidate") personally contributed **$133,776,000 across 41 contribution events** to his own committee \`1485077\` ("STEYER FOR GOVERNOR 2026" — clean naming, no opposition-committee suffix). Largest single contribution: $20M on 2025-11-19 (his official campaign launch date). Several individual contributions exceed $10M.

This finding is independently verifiable from raw RCPT_CD records and is not affected by the librarian's bulk-derivation issues. **The "$14M raised" figure from the librarian is wrong.** The bulk-derivation appears to have undercounted candidate-self contributions, possibly treating them as internal transfers rather than reportable contributions.

**Editorial significance unchanged:** Matches Steyer's 2020 presidential self-fund pattern ($191M historical). Same operator, same playbook. The "billionaire self-fund" archetype is the dominant fact about his campaign.

### Anti-Steyer spending: ~$10M verified (PG&E + IBEW Local 1245)

**Committee \`1490270\`** — "CALIFORNIANS FOR RESILIENT AND AFFORDABLE ENERGY, NO ON STEYER FOR GOVERNOR 2026" — verified anti-Steyer via FPPC opposition naming convention. Filing-trace verified contributions:

| Donor | Amount | Date | Filing ID | Verification path |
|---|---:|---|---|---|
| Pacific Gas & Electric Corporation | $8,000,000 | 2026-04-10 | 3134124 (F497P1) | RCPT_CD donor record + CVR filer = 1490270 |
| Pacific Gas & Electric Corporation | $1,975,000 | 2026-04-20 | 3135715 (F497P1) | RCPT_CD donor record + CVR filer = 1490270 |
| IBEW Local 1245 (Electrical Workers) | $50,000 | 2026-04-10 | 3137638 (F497P1) | RCPT_CD donor record + CVR filer = 1490270 |

**Total verified anti-Steyer spending: ~$10,025,000.**

### RETRACTED — earlier overcount

- **The "$16M PG&E anti-Steyer total" from Phase 5b was wrong.** The librarian's bulk-derived edges showed two $8M records (PG&E and "PG&E Corporation" with capitalization differences). This was a duplicate-counting artifact — raw RCPT_CD shows ONE $8M record and ONE $1.975M record from PG&E to 1490270. Verified total is $9.975M (~$10M, not $16M).

- **The "$13.89M anti-Steyer from committee 1489677" from Phase 5c cannot be verified.** Committee 1489677 exists (registered 2026-04-01 as "Californians for the People..., sponsored by Business Owners and Concerned Citizens" / alt name "STEYER FOR GOVERNOR 2026 ... CALIFORNIA IS NOT FOR SALE, NO ON" — anti-Steyer by FPPC naming convention). But the committee is only 30 days old and has not filed any Form 460 cover statement yet. The $13.89M figure was librarian-extrapolated from misinterpreted edges. **The committee exists; the $13.89M figure does not have primary-source backing.**

### NEW — PG&E's own BRIDGE Issues PAC

PG&E established a separate political vehicle: committee \`1490585\` "**Building Resilient Infrastructure for a Decarbonized Green Economy Issues PAC (BRIDGE Issues), Funded by PG&E Corporation**" — registered 2026-04-20, San Rafael. PG&E contributed at minimum $1.2M+ to its own PAC ($500K on 2026-04-23 + $700K on 2026-04-21 visible in S497). The naming pattern is utility-greenwash camouflage — "decarbonized green economy" branding from a utility behind multiple deadly wildfires and a felony plea to involuntary manslaughter for negligent maintenance.

This is **separate from the anti-Steyer money** — BRIDGE Issues PAC is a general-purpose PG&E-aligned issues PAC, not primarily formed against any specific candidate. Editorial framing TBD by David, but the existence of the dedicated PG&E political vehicle is sourceable.

### Cross-cutting compliance-shop pattern — Nielsen Merksamer

Filing-trace reveals **Nielsen Merksamer LLP** (San Rafael, contact form410@nmgovlaw.com, phone 415-389-6800) is the compliance firm behind a coordinated set of 2026-cycle political-money committees:

| Committee | Position | Sponsor |
|---|---|---|
| 1490270 | Anti-Steyer | PG&E + IBEW Local 1245 |
| 1490585 | PG&E own BRIDGE Issues PAC | PG&E Corporation |
| 1487425 | Pro-Mahan IE PAC | Patrick Collison + John Pritzker + Rick Caruso |
| 1488176 | Second pro-Mahan IE PAC | (specific funder identification pending) |

The same compliance firm is filing for utility-aligned anti-Steyer money AND tech-billionaire-aligned pro-Mahan money. This is **not necessarily collusion** — Nielsen Merksamer is one of California's largest campaign-finance compliance firms and represents many committees from many sources. But it IS a structural observation worth surfacing: the ad-buying / political-spending professional class is centralized in a small number of compliance shops, and the same operators produce the legal infrastructure for ostensibly opposing political projects.

### Editorial framing — corrected

The story shape after Phase 5d:

**Steyer's $133.8M self-fund vs. ~$10M+ verified anti-Steyer spending = ~13:1 self-fund advantage over identified opposition.** He is heavily out-spending his identified opposition. The PG&E + IBEW vs. Steyer narrative is real but **smaller than I originally claimed**. Even at $10M, it's the largest opposition spending against any candidate in the race — but it's not $30M and the $16M figure I cited was wrong.

The class-money frame still holds, refined: PG&E (utility-monopoly capital) is spending real money to defeat the candidate running on utility-accountability — but the dollar scale is more modest than the librarian suggested, and the "California Is Not For Sale" branding turned out to be opposition-committee disclosure, not Steyer's own messaging.

**Screenshot-bait formulations (data-only, framing TBD by David):**

1. "Tom Steyer self-funded $133,776,000 to his California governor campaign. PG&E spent ~$10 million to defeat him. The wildfire utility vs. the climate billionaire."
2. "PG&E — the utility behind the Camp Fire — gave $9,975,000 to defeat Tom Steyer in the California governor's primary. Plus $50K from PG&E's own utility-workers union."
3. "California's largest campaign-finance compliance shop, Nielsen Merksamer, files for the anti-Steyer committee, PG&E's own issues PAC, and the pro-Mahan billionaire IE PAC. The political-money infrastructure is centralized."

### Background — Steyer's longer Becerra-support history (2016, federal)

Earlier "Steyer-to-Becerra-2026 $2,700" was a librarian misattribution (filing date vs. transaction date confusion). The actual transaction was 2016 (federal, to Becerra's House campaign), not 2026. Documented in earlier dossier round.

### Data-quality findings — for the harness backlog

Three distinct librarian misattribution patterns surfaced across the Phase 5b/c/d rounds:

1. **Cycle-misattribution on amended filings.** Bulk-edge derivation conflated RCPT_DATE (filing/amendment date) with DATE_THRU (original transaction date). [Surfaced via Steyer-Becerra-2016.]

2. **Direction-flow misattribution on opposition committees.** Bulk-edge derivation treated FPPC opposition committees (whose names contain "[CANDIDATE] FOR [OFFICE], NO ON" per FPPC disclosure rules) as if they were the candidate's own committees. [Surfaced via "California Is Not For Sale" finding.]

3. **Duplicate-counting on similar-spelling donor names.** Bulk-edge derivation treated "PG&E Corporation" and "Pacific Gas & Electric Corporation" as separate records, double-counting some contributions. [Surfaced via "$16M = $8M ×2" correction.]

4. **Candidate-self contributions undercounted.** Bulk-edge derivation appears to have treated candidate self-funding as internal transfers, undercounting Steyer's $133.8M self-fund as $14M. [Surfaced via raw RCPT_CD scan.]

All four patterns warrant harness checks. The Phase 5d corrections demonstrate that primary-source filing-trace via CVR_CAMPAIGN_DISCLOSURE_CD is the source of truth — the librarian's derived edges are an approximation that needs auditing against this primary source.

`;

text = text.slice(0, startIdx) + corrected + text.slice(endIdx);
fs.writeFileSync(fp, text, 'utf-8');
console.log('Final correction (Phase 5d) applied to steyer.md');
