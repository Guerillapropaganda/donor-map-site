# CA Governor 2026 Donor Map Verification Gaps

This note consolidates the eight donor-identity and cross-candidate verification gaps for the 2026 California governor race money map. Cal-Access references use the California Secretary of State campaign-finance bulk export as the primary record source, with table, filing, line item, and transaction identifiers included where available.

## Source shorthand

- **Cal-Access bulk export**: `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip`
- **California Secretary of State Bizfile**: `https://bizfileonline.sos.ca.gov/search/business`
- **FEC data**: `https://www.fec.gov/data/`
- **SEC EDGAR**: `https://www.sec.gov/edgar/search/`

## Executive summary

| Issue | Bottom-line verification status |
| --- | --- |
| Chris Larsen identity | High-confidence same-person match between Hilton and Porter records based on name variant, Ripple title, San Francisco ZIP, and contribution metadata; Porter’s apparent multiple entries appear to be duplicate/amended rows for the same transaction ID, not three separate deduped checks. |
| M&D Development / Downs Energy | Contributions and Downs Energy corporate officers are verified; the strongest primary-source bridge located is a Corona city staff report describing M&D Development LLC as owner/operator of Downs Energy, while the sibling-managed framing remains stronger in Tier 2 reporting than in primary records found so far. |
| California Resources / Francisco Leon | Verified as separate Villaraigosa receipts: corporate/entity contributions totaling $72,800 and Francisco Leon’s separate individual contribution of $10,350.25; SEC records confirm Leon as CRC president and CEO. |
| CPCA Advocates IE PAC | Latest located Cal-Access filings show Working Families for Healthy Communities Supporting Becerra received $2,000,000 from Laborers Pacific Southwest Regional Organizing Coalition PAC and $115,200 from CPCA Advocates, then reported $2,000,000 in TV/digital IE spending. |
| Habematolel Pomo of Upper Lake | Thurmond and Villaraigosa contributions are verified, but located deduped Villaraigosa records total $59,200 rather than $79,200; no Habematolel contributions were located to Steyer, Porter, or Becerra governor committees in the checked set. |
| Missed hedges | Several notable same-race cross-candidate donors surfaced, including Chris/Christian Larsen, Joe Lonsdale, Rick Caruso, Stewart/Lynda Resnick, Kurt Rappaport, David Pyle, tribal committees, and plaintiffs-side donors. |
| Steve Hilton “Richard Spencer” donor | High-confidence different person from the alt-right Richard B. Spencer; Cal-Access identifies the Hilton donor as Fresno-based Richard Spencer of Spencer Enterprises, owner/developer. |
| John McEntee | Verified $39,200 Hilton contribution; no same-string contributions to the other seven governor candidates were located in the checked committee set, and no permitted-source business relationship with Hilton/Whetstone was found. |

## Verification answers

### Question 1 — Chris Larsen identity

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access `RCPT_CD` supports treating Hilton donor “Chris Larsen” and Porter donor “Christian Larsen” as the same Ripple figure: Hilton filer 1480425 reports Chris Larsen, San Francisco 94109, Ripple, “Exec chair,” $39,200 on 2025-12-16, filing 3115750 line 8486 transaction A-54547, while Porter filer 1479597 reports Christian Larsen, San Francisco 94109, Ripple, “Executive Chairman,” $39,200 on 2025-06-17, filing 3071494 transaction INC592. | **High.** Original e-file/F460 PDFs showing the full street address and contribution-card metadata would raise this from high confidence to near-certain identity confirmation. |
| `https://www.sec.gov/enforcement-litigation/litigation-releases/lr-26369` | The SEC’s Ripple litigation release identifies “Christian A. Larsen” in the Ripple Labs enforcement matter, corroborating the legal-name form behind the Cal-Access “Christian Larsen” entry. | **Medium-high.** This supports legal identity but does not independently connect the Hilton “Chris Larsen” row; original Hilton disclosure address would close the remaining gap. |

**Dedup note:** The user’s “$117,600 across three Porter contributions” appears to reflect duplicate/amended Cal-Access display rows tied to the same Porter transaction ID INC592, not three distinct deduped Porter contributions located in the transaction-level check.

### Question 2 — M&D Development LLC and Downs Energy

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access verifies Downs Energy gave Bianco two $39,200 contributions, filing 3070594 line 365 transaction A-915 and filing 3113053 line 6972 transaction A-28945, while M&D Development LLC gave two $39,200 Bianco contributions, filing 3113053 lines 6999-7000 transactions A-28946 and A-28947. | **High.** Original F460 PDFs would confirm the full address fields and filer-form presentation. |
| `https://bizfileonline.sos.ca.gov/search/business` | California SOS Bizfile identifies Downs Energy as entity 1997677, active stock corporation, filed 1997-01-02, with Michael J. Downs listed as agent/CEO and Sharon Messner listed as secretary/CFO in located records. | **Medium-high.** Downloaded/certified SOS filings and statement-of-information PDFs would raise confidence by preserving the exact filing history and officer dates. |
| `https://pub-corona.escribemeetings.com/filestream.ashx?documentid=7136` | A City of Corona staff report describes M&D Development LLC as “owner, operator of Downs Energy” for a 12.2-acre property at the southeast corner of Magnolia Avenue and I-15. | **High for the owner/operator statement in the city record; medium for broader control.** A filed M&D LLC operating agreement, member schedule, or SOS LLC-12 record would raise confidence on ownership/control. |
| `https://newsroom.pilotcompany.com/sc-fuels-acquires-cardlock-fueling-and-lubricants-assets-from-downs-energy-expanding-footprint-in-southern-california/` | Pilot Company announced that SC Fuels, a wholly owned subsidiary of Pilot Travel Centers LLC, closed its acquisition of Downs Energy’s cardlock fueling and lubricants assets on 2025-10-01. | **High.** Purchase documents, merger filings, or regulatory closing records would clarify whether all operating assets or only specified business lines transferred. |

**Framing caveat:** The “Mike Downs + Sherry Messner sibling-managed” formulation is supported in named press reporting, but the primary records located here support officer/director overlap and M&D/Downs operational linkage rather than independently proving the sibling relationship.

### Question 3 — California Resources Corporation and Francisco Leon

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access verifies two separate Villaraigosa receipts from “California Resources Corporation and Subsidiaries (Matthew Alvarez)” of $39,200 and $33,600 on 2025-01-08, filing 3070419 lines 37-38, transactions INC626 and INC627. | **High.** Original e-filing images would confirm whether the source is shown as a corporate/entity contributor and whether any attribution language appears on the filed form. |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access separately verifies Francisco Leon’s individual Villaraigosa contribution of $10,350.25 on 2025-06-23, filing 3070419 line 162 transaction INC1064, employer California Resources Corporation, occupation Executive. | **High.** Original F460 images would add full address confirmation but are not needed to resolve double-counting. |
| `https://www.sec.gov/Archives/edgar/data/1609253/000095017025042053/crc-20250318.htm` | California Resources Corporation’s 2025 proxy identifies Francisco J. Leon as CRC president, chief executive officer, and director. | **High.** No further research needed for title verification. |

**Double-counting conclusion:** The CRC corporate/entity contributions and Francisco Leon’s individual contribution are separate Cal-Access transactions and should not be collapsed into one donor unless the map deliberately aggregates corporate-plus-executive networks.

### Question 4 — CPCA Advocates IE PAC

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access filings for Working Families for Healthy Communities Supporting Becerra for Governor 2026, filer 1490885, show filing 3148708/F496 and filing 3148677/F497 dated 2026-05-01, including $2,000,000 from Laborers Pacific Southwest Regional Organizing Coalition PAC and $115,200 from California Primary Care Association Advocates Supporting Becerra for Governor 2026. | **High.** Later filings after 2026-05-01 could change the “most recent filed amount,” so a final URL-pass should recheck Cal-Access immediately before publication. |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | The same F496 record reports $2,000,000 in independent-expenditure spending for “TV and digital ads.” | **High.** Vendor-level details, if needed, require the underlying expenditure schedule and any later amendments. |

### Question 5 — Habematolel Pomo of Upper Lake

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access verifies Habematolel Pomo of Upper Lake gave Tony Thurmond $15,000 on 2023-12-13, filing 2883140 line 204 transaction INC682, plus later Thurmond receipts of $21,400 in 2024 and $2,800 in 2025. | **High.** A final deduped export by contributor name and committee would confirm no amended-row issue. |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access located deduped Villaraigosa records show Habematolel Pomo of Upper Lake giving $20,000 on 2025-11-19 and $19,200 plus $20,000 on 2026-02-23, for $59,200 located in the checked records rather than the user-stated $79,200. | **Medium-high.** A full raw-row reconciliation, including amended filings and possible name variants, would determine whether the missing $20,000 is a separate contribution or a duplicate/omitted transaction. |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | No Habematolel contributions were located to Steyer, Porter, or Becerra governor committees in the checked eight-candidate committee set. | **Medium.** A statewide normalized donor search across all committees and name variants would raise confidence. |
| `https://www.consumerfinance.gov/enforcement/investigatory-authority/petitions-to-modify-or-set-aside/hpul-entities/` | The CFPB published a 2025 petition page involving HPUL entities, indicating federal consumer-finance regulatory activity tied to HPUL-related lending entities. | **Medium.** This is federal, not California, and does not itself establish California gubernatorial regulatory overlap. |
| `https://www.hpultribe-nsn.gov/commission/` | The tribe’s own commission page describes a Tribal Consumer Financial Services Regulatory Commission governing tribal consumer-financial-services activity. | **Medium.** California DFPI records or court dockets would be needed to establish a California-specific regulatory matter. |

### Question 6 — missed cross-candidate hedges

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Notable same-race cross-candidate donor hedges located in Cal-Access include Christian/Chris Larsen to Porter and Hilton; Joe Lonsdale to Mahan and Hilton; Rick Caruso to Mahan and Becerra; Stewart and Lynda Resnick/Wonderful Company-linked giving to Villaraigosa, Becerra, and Mahan; Kurt Rappaport to Villaraigosa and Mahan; David A. Pyle to Villaraigosa and Porter; Santa Ynez Band of Mission Indians to Thurmond, Becerra, and Porter; Sycuan to Thurmond and Villaraigosa; and Pechanga to Bianco and Porter. | **Medium.** Fuzzy name matching and amended filings make this a strong leads list, not a final normalized donor universe; a formal deduped donor-entity table would raise confidence. |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Plaintiffs-side and legal-sector cross-candidate donors located include Elizabeth Cabraser, Niall McCarthy, Paul Kiesel, Stuart Liner, and Tigran Martinian across Porter, Becerra, and/or Villaraigosa records. | **Medium.** Employer/title normalization and law-firm entity matching would distinguish individual hedges from broader sector patterns. |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Real-estate or development-linked cross-candidate names located include Thomas Safran, Sandy Sigal, Jason Oppenheim, Roger Fields, Scott Kepner, Kurt Rappaport, and Rick Caruso. | **Medium.** A donor-by-industry coding pass using employer disclosures plus corporate records would raise confidence. |

### Question 7 — Steve Hilton’s “Richard Spencer” donor

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access identifies the Steve Hilton donor as Richard Spencer of Fresno 93727, employer Spencer Enterprises, occupation owner/developer, with located Hilton rows including $10,000 on 2025-05-02, $20,000 on 2025-06-30, $5,198.09 on 2025-09-24, and 2026 correction/activity rows around $5,000 and $998.09. | **High for different-person finding; medium for exact net total.** Original F460 address lines and a transaction-level correction reconciliation would lock the exact contribution total. |
| `https://spencerenterprises.com` | Spencer Enterprises publicly describes itself as a San Joaquin Valley real-estate builder/developer, consistent with the Fresno Cal-Access donor metadata. | **Medium-high.** Direct corporate officer records or a donor confirmation would raise confidence. |
| `https://www.thomasaquinas.edu/about/governance/richard-f-spencer` | Thomas Aquinas College identifies Richard F. Spencer as a Central California figure associated with Spencer Enterprises, supporting the conclusion that the Hilton donor is not Richard B. Spencer of the white-nationalist/alt-right movement. | **Medium-high.** The full Cal-Access street address matched to a Spencer Enterprises principal record would fully close the identity question. |

**Identity conclusion:** The Hilton donor should not be identified as the alt-right Richard B. Spencer based on the located Cal-Access metadata; the safer map label is “Richard Spencer, Spencer Enterprises/Fresno developer” unless full address matching proves otherwise.

### Question 8 — John McEntee’s max-out to Hilton

| Primary-source URL | One-sentence factual answer | Confidence and what would raise it |
| --- | --- | --- |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | Cal-Access verifies one Steve Hilton contribution from John McEntee of Fullerton 92831, employer McEntee Group, occupation Business Owner, $39,200 on 2026-04-16, filing 3139373 line 9458 transaction A-125469. | **Medium-high.** Original F460 address lines and independent corporate records for McEntee Group would raise confidence. |
| `https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip` | No same-string “John McEntee” contributions to the other seven governor candidates were located in the checked committee set. | **Medium.** A statewide donor-name search with address and employer variants would raise confidence. |
| `https://www.heritage.org/press/former-ppo-director-john-mcentee-joins-project-2025-personnel-database-launches` | Heritage identifies John McEntee as former White House Presidential Personnel Office director, but no permitted-source record located in this pass establishes a business relationship with Steve Hilton or Rachel Whetstone/Sierra. | **Low for the no-business-relationship finding.** Corporate filings, investor lists, event-host records, or campaign finance-host disclosures would be needed to close the relationship gap. |

## Recommended map-label changes

| Map item | Recommended handling |
| --- | --- |
| Chris Larsen | Treat as same person across Hilton and Porter, but dedupe Porter to one $39,200 transaction unless another distinct transaction ID is found. |
| M&D / Downs | Label as linked Downs-family/Corona entities with primary-source operational linkage; reserve “sibling-managed” for prose sourced to SF Chronicle unless primary family records are added. |
| California Resources | Keep corporate CRC and Francisco Leon as separate donor nodes, with an optional “CRC network” grouping if the visualization supports entity clusters. |
| CPCA/Becerra IE | Update to reflect the May 1 Cal-Access filings showing Laborers PAC $2,000,000 plus CPCA Advocates $115,200. |
| Habematolel | Use verified Villaraigosa total of $59,200 unless the missing $20,000 is recovered in amended/raw rows; flag the current $79,200 map value for reconciliation. |
| Richard Spencer | Do not tag as alt-right Richard Spencer; tag as Fresno/Spencer Enterprises developer unless full-address evidence says otherwise. |
| John McEntee | Keep as verified Hilton max-out; business relationship to Hilton/Whetstone remains NO DATA in permitted sources. |

