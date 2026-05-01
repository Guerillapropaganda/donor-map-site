#!/usr/bin/env node
/**
 * Bianco dossier Phase 5b update.
 * Findings from raw Cal-Access bulk (FILERNAME_CD + CVR_CAMPAIGN_DISCLOSURE_CD + EXPN_CD):
 *   1. Bianco Legal Defense Fund (committee 1484731) established 2025-10-29.
 *   2. $80,000 transferred FROM Bianco for Governor 2026 (1479095) TO the
 *      Legal Defense Fund (1484731) on 2025-10-24, FORM_TYPE EXPN code TSF.
 *   3. Defense Fund has filed two Form 460 cover statements (semi-annual
 *      ending 2025-12-31, pre-election ending 2026-04-18).
 *   4. Prior committee history: BIANCO FOR SHERIFF-CORONER 2014 (1354860,
 *      terminated 2016).
 */
const fs = require('fs');
const fp = 'content/Admin Notes/ca-gov-2026-dossiers/bianco.md';
const text = fs.readFileSync(fp, 'utf-8');
const anchor = '## Open questions for David';

const insert = `## NEW FINDINGS (Phase 5b deep extract — 2026-05-01)

### Bianco established a Legal Defense Fund — funded by his own gubernatorial campaign

Cal-Access raw bulk reveals two Bianco-related findings not present in the derived librarian edges:

**Committee 1484731 — BIANCO LEGAL DEFENSE FUND.** Established 2025-10-29 per FILERNAME_CD bulk. Filed two Form 460 cover statements: semi-annual period ending 2025-12-31 (filed 2026-02-02) and pre-election period ending 2026-04-18 (filed 2026-04-23, deadline 2026-06-02 — likely the primary date).

**$80,000 funding transfer — from his own campaign.** EXPN_CD filing 3113053 (filed by committee \`1479095\` = BIANCO FOR GOVERNOR 2026 itself) shows a single TSF (transfer) expenditure of **$80,000 to the Bianco Legal Defense Fund (1484731) dated 2025-10-24**. The transfer was filed within his governor campaign's semi-annual report covering 2025-07-01 to 2025-12-31.

**Editorial significance.** A sitting elected sheriff running for governor moved $80,000 from his gubernatorial campaign committee into a separately-organized legal defense fund just days before officially establishing that defense fund. The structural choice (separate vehicle, not paying legal fees directly from campaign account) is significant. California campaign finance permits candidate use of campaign funds for legal defense related to the campaign or to holding office, but routes that money through specific compliance pathways. The separate-vehicle structure typically signals one of:

1. Pre-funding for anticipated legal exposure
2. Legal matters related to his Sheriff role being kept separate from campaign accounts
3. Specific legal action already initiated requiring defense
4. Tax / disclosure-strategy structuring

**Without independent verification of what the legal defense fund is defending against, the data cannot resolve which.** *David's verification at editorial time:* contemporaneous press coverage (October 2025) of any civil suit, criminal investigation, public-records-act litigation, or other legal action involving Bianco or Riverside County Sheriff's Office.

**Screenshot-bait formulation (data-only, framing TBD by David).** "Chad Bianco's gubernatorial campaign moved $80,000 into a legal defense fund a week before the defense fund was officially registered. He's running for governor and his own campaign is funding his lawyers."

### Bianco's lifetime committee history (Cal-Access)

Confirmed via FILERNAME_CD bulk:

| FPPC ID | Committee | Status | Established |
|---|---|---|---|
| 1479043 | Chad Bianco (CANDIDATE/OFFICEHOLDER profile) | Active | 2025-02-17 |
| 1479095 | Bianco for Governor 2026 | Active | 2025-02-19 |
| 1484731 | **Bianco Legal Defense Fund** | Active | **2025-10-29** |
| 1354860 | Bianco for Sheriff-Coroner 2014, Supporters of Chad | Terminated | 2014-onset, terminated 2016-12-31 |

The 2014 Sheriff committee terminated 2016-12-31 means his post-2018 sheriff campaigns (2018 reelection, 2022 reelection, 2026 governor pivot) used different reporting committees. Riverside County sheriff campaigns may also report at the COUNTY level rather than the state Cal-Access bulk — that's a known gap in the Cal-Access state-bulk-only model.

`;

if (!text.includes(anchor)) {
  console.error('Anchor not found in bianco.md');
  process.exit(1);
}
const updated = text.replace(anchor, insert + anchor);
fs.writeFileSync(fp, updated, 'utf-8');
console.log('Updated bianco.md with Phase 5b findings');
