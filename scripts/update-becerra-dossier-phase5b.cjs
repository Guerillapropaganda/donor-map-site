#!/usr/bin/env node
/**
 * Becerra dossier Phase 5b update.
 * Findings from raw Cal-Access RCPT_CD bulk for committee 1480025
 * (Becerra for Governor 2026):
 *
 * Confirmed identity-verified findings (employer/occupation in raw RCPT_CD):
 *   - Leonard Schaeffer (Santa Monica, retired, formerly North Bristol
 *     Partners CEO) maxed out at $39,200 on 2025-04-15. Schaeffer is
 *     the WellPoint/Anthem founder and former CEO — major healthcare
 *     insurance executive making a max contribution to the former HHS
 *     Secretary now running for governor.
 *
 * Pattern findings (top 30 2026 donors):
 *   - Healthcare-aligned: Altamed Health Network ($39,200), Border
 *     Health Federal PAC ($39,200), Leonard Schaeffer ($39,200),
 *     plus tribal-band donors with health-system overlap.
 *   - Construction labor (LIUNA dominant): California State Council
 *     of Laborers PAC ($54,700, top donor), Southern California
 *     District Council of Laborers PAC ($47,000), plus Northern CA
 *     and Pacific Southwest Regional Organizing Coalition LIUNA PACs.
 *     ~$170K combined from Laborers International Union of North
 *     America infrastructure.
 *   - Fossil capital (single, notable): Chevron USA Inc. ($39,200).
 *   - Tribal: Pechanga Band ($44,600), Agua Caliente Band ($41,900).
 *
 * Verification confidence: Tier 1 — raw Cal-Access RCPT_CD, employer
 * + occupation fields confirm donor identity for Schaeffer.
 */
const fs = require('fs');
const fp = 'content/Admin Notes/ca-gov-2026-dossiers/becerra.md';
const text = fs.readFileSync(fp, 'utf-8');
const anchor = '## Open questions for David';

const insert = `## NEW FINDINGS (Phase 5b deep extract — 2026-05-01)

### Leonard Schaeffer — WellPoint/Anthem founder — maxed out to Becerra

Cal-Access raw RCPT_CD shows: **Leonard Schaeffer (Santa Monica, listed employer "Not Employed" / occupation "Retired") contributed $39,200 to BECERRA FOR GOVERNOR 2026 on 2025-04-15.** That is the legal maximum individual contribution for a 2026 California gubernatorial candidate.

**Identity verification (Tier 1 raw bulk).** The Schaeffer at this Santa Monica address has prior Cal-Access records (2017, 2018) showing employer "North Bristol Partners" with occupation "CEO." Leonard Schaeffer of Santa Monica is the **founder and former CEO of WellPoint Health Networks** (the holding company that became Anthem after the WellChoice merger), one of the largest health-insurance companies in the United States. He has subsequently chaired North Bristol Partners (private investment), advised private-equity firms in healthcare, and held board positions at major healthcare companies. The "Retired" designation on the 2025 contribution reflects his current professional status but understates his ongoing influence in healthcare investment and policy.

**Editorial significance — direct contradiction with the dossier's central question.** The original Becerra dossier flagged: "what proportion of his 2026 donors come from healthcare-industry entities or 501(c)(4)s funded by them?" Schaeffer's $39,200 is the cleanest single-frame answer: the founder of one of the largest US health insurers maxed out to the former HHS Secretary running for governor. Becerra's HHS tenure (2021-2025) included direct regulatory authority over insurance markets, ACA implementation, Medicare Advantage (where Anthem has major exposure), and Medicaid managed-care contracts (where Anthem subsidiaries hold state contracts). The post-departure max contribution from Schaeffer is the kind of revolving-door pattern that the class-money frame is built to surface.

**Screenshot-bait formulation (data-only, framing TBD by David).** "Xavier Becerra spent four years as Secretary of Health and Human Services regulating insurance companies. Two months after leaving, the founder of Anthem maxed out to his governor campaign."

### Cross-cutting pattern in Becerra's top 30 — 2026 cycle

| Cluster | Top donors visible in top 30 | Combined $ |
|---|---|---:|
| **Construction labor (LIUNA)** | CA State Council of Laborers PAC, So. CA District Council of Laborers PAC SCC, Northern CA District Council of Laborers PAC, LIUNA Pacific Southwest Regional Organizing Coalition PAC | ~$180K (top donor + 3 of top 17) |
| **Healthcare-aligned** | Leonard Schaeffer (Anthem founder), Altamed Health Network Inc., Border Health Federal PAC, plus tribal-health overlap (Pechanga, Agua Caliente) | ~$200K identifiable |
| **Tribal** | Pechanga Band of Luiseno Indians ($44,600), Agua Caliente Band of Cahuilla Indians ($41,900) | $86,500 |
| **Fossil capital (single)** | Chevron USA Inc. ($39,200) | $39,200 |
| **Bundled individuals at max** | Multiple individual donors at exactly $39,200 (Tigran Martinian, Joseph Molina, Cindy Horn, Morgan Chu, Alexandra Seros, others) | ~$280K combined |

**Editorial framing the data supports.** Becerra's 2026 fundraising is **institutional-Democratic, not small-dollar populist and not billionaire self-fund**. The donor base is built on:

1. Construction labor (LIUNA) as the institutional spine
2. Healthcare-aligned money flowing to a former Cabinet healthcare regulator
3. Tribal-gaming donor coalitions (standard CA institutional Dem)
4. Single-corporation contributions from select fossil and corporate sources
5. Bundled max-out individual donations (organized donor networks)

This contrasts cleanly with:
- **Steyer's $107K avg / 131 donors / 99% self-fund** (billionaire model)
- **Porter's $790 avg / 15K donors / small-dollar populism** (different Democratic model)
- **Hilton's $515 avg / 15K donors / small-dollar populism** (Republican mirror of Porter)
- **Mahan's $0 candidate-side / IE-PAC structure** (tech-billionaire model)

**Becerra's archetype is "the institutional Democrat the system has been preparing for years"** — and the Schaeffer max-out is the receipt that sharpens what "institutional" means in his case: regulated industries that knew him in office now back him for higher office.

`;

if (!text.includes(anchor)) {
  console.error('Anchor not found in becerra.md');
  process.exit(1);
}
const updated = text.replace(anchor, insert + anchor);
fs.writeFileSync(fp, updated, 'utf-8');
console.log('Updated becerra.md with Phase 5b findings');
