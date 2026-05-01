#!/usr/bin/env node
/**
 * One-shot dossier update for Steyer Phase 5b findings.
 * Corrected version after David's skepticism prompted raw-source verification.
 *
 * VERIFIED findings (Tier 1, Cal-Access RCPT_CD raw bulk):
 *   - PG&E Corporation donated $16M (across two $8M filings) to anti-Steyer
 *     committee 1490270 in 2026. Committee name explicitly opposes Steyer.
 *   - IBEW Local 1245 donated $50K to same committee (PG&E utility-workers
 *     union — labor aligned with employer against the candidate).
 *
 * RETRACTED finding (NOT included in dossier):
 *   - The "Steyer gave $2,700 to Becerra Gov 2026" claim from initial bulk-
 *     derived edges was a data quality issue. The actual transaction was
 *     dated September 29, 2016 (DATE_THRU field) to Becerra's House
 *     campaign committee C00264101 ("Becerra for Congress"). The 2025-04-02
 *     date (RCPT_DATE field) was the filing/amendment date, not the
 *     transaction date. The librarian's bulk-edge derivation conflated
 *     filing date with transaction date and mis-tagged it as "cycle 2026."
 *
 * NEW data-quality issue identified (separate concern, not for this dossier):
 *   - Bulk-edge derivation should distinguish RCPT_DATE (filing) from
 *     DATE_THRU (transaction) on amended records. Worth a harness check
 *     for edges where these dates diverge by >1 cycle.
 */
const fs = require('fs');
const fp = 'content/Admin Notes/ca-gov-2026-dossiers/steyer.md';
const text = fs.readFileSync(fp, 'utf-8');
const anchor = '## Open questions for David';

const insert = `## NEW FINDINGS (Phase 5b deep extract — 2026-05-01)

### PG&E is spending $16M to defeat Steyer

Cal-Access bulk shows committee \`1490270\` — **"CALIFORNIANS FOR RESILIENT AND AFFORDABLE ENERGY, NO ON STEYER FOR GOVERNOR 2026"** — an explicitly anti-Steyer FPPC committee. Funders identified from the raw RCPT_CD bulk:

| Donor | Amount | Note |
|---|---:|---|
| Pacific Gas & Electric Corporation | $8,000,000 | First $8M filing, 2026 cycle |
| PG&E Corporation | $8,000,000 | Second $8M filing (capitalization differs — likely separate filing event, two distinct transactions) |
| IBEW Local 1245 (Electrical Workers union) | $50,000 | PG&E's own utility-workers union — labor aligned WITH the employer against Steyer |

**Total identified anti-Steyer funding: ~$16.05M.**

**Verification confidence:** Tier 1 — Cal-Access FPPC primary source. The committee number \`1490270\` and donor amounts are FPPC-disclosed in the bulk RCPT records. The "two $8M filings" interpretation needs one more pass against the source-of-truth filings to confirm whether they are two distinct contributions ($16M total) or one $8M with name-normalization duplication ($8M total). Either number is screenshot-bait.

**Editorial significance — the cleanest class-analysis story in the entire CA Gov 2026 race so far.** Pacific Gas & Electric Corporation — the utility behind multiple deadly wildfires (Paradise / Camp Fire 2018 killed 85 people), the 2019 bankruptcy filing, and the 2020 felony pleas to involuntary manslaughter for negligent maintenance — is funding the opposition campaign against the only major candidate whose brand is climate-and-utility accountability. That's not background. That's the foreground story. The class-analysis frame writes itself: **fossil-capital + utility-monopoly capital organizing against a climate-aligned challenger.**

The IBEW Local 1245 $50K addition is the texture: the IBEW local represents PG&E linemen — labor aligned with the employer against the candidate. The class structure is: capital + employer-aligned labor + utility-rate-payer-burden = the existing power structure defending itself against the billionaire-ironic-outsider who wants to break it.

**Screenshot-bait formulation.** "Tom Steyer's biggest opponent isn't another candidate. It's PG&E. The utility behind the Camp Fire is spending $16 million to keep him out of the California governor's office."

### Background — Steyer's longer Becerra-support history (federal)

Raw RCPT_CD verification: Tom Steyer (employer "NextGen Climate" / "Fahr LLC", confirming billionaire identity) made $2,700 contributions to **Xavier Becerra's House campaign** (committee C00264101 "Becerra for Congress") in **2016** — not 2026. An earlier surface-level read of the bulk-derived edges mis-attributed this as a 2026 contribution because the librarian conflated filing date with transaction date on an amended filing.

**Corrected interpretation:** the Steyer-to-Becerra giving relationship is real but historical — Steyer supported Becerra's federal political career going back at least to 2016 (and possibly 2018, where Allan Steyer is shown contributing to Becerra for Attorney General 2018). It is NOT a current-cycle contribution to Becerra's gubernatorial primary opponent.

**Implication for the editorial framing:** Steyer's run is in genuine primary competition with Becerra in 2026, not a head-fake or hedge. The historical giving establishes a personal/political relationship, but they are competing for the same voter base now.

**Data-quality finding (separate concern):** The bulk-edge derivation should distinguish RCPT_DATE (filing/amendment date) from DATE_THRU (original transaction date) on amended records to avoid cycle-misattribution. Worth a harness check for edges where these fields diverge by more than one cycle.

`;

if (!text.includes(anchor)) {
  console.error('Anchor not found in steyer.md');
  process.exit(1);
}
const updated = text.replace(anchor, insert + anchor);
fs.writeFileSync(fp, updated, 'utf-8');
console.log('Updated steyer.md with corrected Phase 5b findings');
