# DATA GAPS — 2026 CA Governor Donor Intelligence
*Consolidated from all 9 candidate dossiers + cross-cutting analysis | As of 2026-04-29*

---

## SYSTEMIC CROSS-CUTTING GAPS

These gaps affect ALL candidates:

1. **Cal-Access direct portal universally blocked.** Every subagent attempting `https://cal-access.sos.ca.gov/Campaign/Candidates/list.aspx` and `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=...` received a robots.txt disallow error. No Form 460 (Schedule A itemized contributions), Form 461 (independent expenditure filer), Form 496 (24-hour IE disclosure), or Form 497 (late contribution) data was retrieved directly from Cal-Access for any candidate. All financial data in all dossiers comes from Tier 2 aggregators (TransparencyUSA, The Ballot Book, cagovtracker.com, OpenSecrets, CalMatters) or FPPC-published top-10 contributor lists.

2. **Cal-Access NextGen / PowerSearch blocked.** `https://powersearch.sos.ca.gov/basic.php` returned HTTP 400. `https://powersearch.sos.ca.gov/advanced.php` returned only a form UI with no results. No candidate or committee searches succeeded.

3. **FPPC enforcement database not directly queried.** `https://www.fppc.ca.gov/enforcement/enforcement-actions.html` returned HTTP 4xx or was blocked in all research sessions. Enforcement status for all candidates is based on press reporting and secondary sources only, not primary FPPC database search.

4. **Treasurer names absent for most committees.** Cal-Access Form 410 (Statement of Organization) was not retrievable for any 2026 governor committee. Treasurer names confirmed from primary source for ONLY Mahan for Governor 2026 (Ted Trujillo) and Porter's federal committees (Alexander Warren).

5. **Individual donor itemized lists unavailable.** Without Cal-Access Form 460 Schedule A access, no cross-candidate individual donor cross-reference was possible from primary sources. The donor_overlaps.csv relies on Tier 2 sources for most individual donor-candidate pairs.

6. **FPPC 2025-26 contribution limit discrepancy unresolved.** SHARED_CONTEXT cites $36,400/election; filings show contributors at $39,200 and $78,400 (suggesting primary+general). Current FPPC-adjusted limit for 2025-26 gubernatorial cycle not independently confirmed from `fppc.ca.gov`.

7. **No Form 496 (24-hour late IE) data retrieved.** IE spending close to the primary (April-May 2026) is likely underreported in all dossiers.

---

## KATIE PORTER

1. Cal-Access direct portal blocked; committee ID for "Katie Porter for Governor 2026" not confirmed from Tier 1 source.
2. Itemized Schedule A (individual donors) for governor 2026 — no top-donor list retrievable.
3. Itemized Schedule B (expenditures) — no vendor/consultant list retrievable; SKDK engagement unverified.
4. Maxed-out donors cannot be identified without Cal-Access itemized data.
5. LLC donors — beneficial owners cannot be assessed.
6. FPPC enforcement database — absence of enforcement not confirmed from primary source.
7. Katie Porter House FEC candidate ID — task-provided ID H8CA45072 resolves to different candidate.
8. WHITEBOARD PAC top donors not fully itemized; only $620K aggregate and two names retrieved.
9. Truth to Power leadership PAC individual donors — names not retrieved.
10. Governor race IEs for or against Porter — Cal-Access Form 496 not reviewed; none confirmed.
11. Former staff now lobbying — no individuals identified.
12. H2 2025 and Q1 2026 burn rate — specific spending totals not disaggregated from Tier 1.
13. SKDK consulting relationship — not confirmed in any record.
14. Source: [Porter dossier DATA GAPS](../dossiers/porter.md)

---

## XAVIER BECERRA

1. Cal-Access Form 460 itemized filings blocked; committee ID 1480025 confirmed only via third-party aggregator.
2. Treasurer name for Becerra for Governor 2026 — not disclosed in available filings.
3. Employer/occupation for individual donors — aggregate view only.
4. Expenditure detail (consultant payments, media buys) — HTTP error on TransparencyUSA expenditures page.
5. Dollar amounts for South Cord Management LLC, BAK Festivals — not populated.
6. "California's Best" entity type and beneficial owners — unknown.
7. FPPC enforcement database — not confirmed as directly searched for Becerra.
8. Independent expenditure committees filing 496s for/against Becerra — not directly accessible.
9. Post-government OGE Form 278 termination — not retrieved.
10. Becerra 2018 AG Cal-Access committee ID — not retrieved.
11. Hatch Act 2024 Medicare email — OSC final finding not confirmed.
12. Source: [Becerra dossier DATA GAPS](../dossiers/becerra.md)

---

## ANTONIO VILLARAIGOSA

1. Cal-Access direct query blocked; FPPC ID #1471635 confirmed only from NGP VAN payment page.
2. Treasurer name — not confirmed from Tier 1 source.
3. Form 460 direct filing — "no transfer" campaign claim cannot be independently verified.
4. Straight From the Heart of California (IE #1486030) donor itemization — not retrieved; website provides no donor list.
5. JRJ Corporation, Prenton Inc., COPE Healthcare Consulting — beneficial ownership unknown.
6. Ron Burkle 2026 contribution — not found; may not have donated.
7. Ricardo Olivos (brother) consulting role — no public records found.
8. AECOM 2026 donor — not found.
9. Tribal gaming donor — not found in available 2026 data.
10. Villaraigosa Assembly-era (1994-2000) itemized donor list — Cal-Access pre-2000 coverage limited.
11. 501(c)(4) organized around Villaraigosa — none identified; absence not conclusively confirmed.
12. Current FPPC contribution limit discrepancy — $36,400 vs. $39,200 not resolved.
13. Source: [Villaraigosa dossier DATA GAPS](../dossiers/villaraigosa.md)

---

## TOM STEYER

1. Cal-Access direct committee detail page for ID 1485077 — blocked by robots.txt.
2. Individual top-donor list for Steyer 2026 committee — not retrievable; only self-funding confirmed.
3. NextGen Climate Action Committee FEC search — robot-blocked; resolved via direct URL.
4. ProPublica 990 search page for NextGen America (c4) — search URL robot-blocked.
5. Need to Impeach — closed 2020; 501(c)(4) so no public donor disclosure ever required.
6. FPPC enforcement database — robot-blocked.
7. Galvanize Action as distinct 501(c)(4) — not separately confirmed in IRS records.
8. Whether NextGen apparatus is spending for Steyer in 2026 governor race — not confirmed.
9. Source: [Steyer dossier DATA GAPS](../dossiers/steyer.md)

---

## STEVE HILTON

1. Cal-Access blocked; committee ID 1480425-CAO confirmed via TransparencyUSA.
2. Treasurer name — not identified in any public source.
3. Golden Together 501(c)(4) Form 990 — not found on ProPublica; organization may be too new.
4. Crowdpac investors — specific VC firms and amounts not confirmed; Sean Parker connection unverified.
5. Donor employers/occupations for ranks 13-25 — not identified.
6. Contribution limit clarification — multiple donors at $39,200 vs. stated $36,400/election limit.
7. IE spending for or against Hilton — Cal-Access Form 496 search blocked.
8. Tito Ortiz / CA Rifle & Pistol Association endorsements — not confirmed in primary sources.
9. Campaign debt — not confirmed.
10. Golden Together funders — 501(c)(4) not required to disclose; no 990 found.
11. Cal Pacific Supply beneficial owner — not confirmed.
12. Post-Trump-endorsement donor surge — full post-endorsement donor list not retrieved.
13. Source: [Hilton dossier DATA GAPS](../dossiers/hilton.md)

---

## TONY THURMOND

1. Committee treasurer name for ID 1461509 — Cal-Access blocked.
2. Form 460 Schedule A individual donor itemization (full list) — Cal-Access blocked.
3. Cal-Access IDs for 2018 and 2022 SPI committees beyond 1448022 — not retrieved.
4. 2022 general election IE dollar amounts for pro-Thurmond committees — not extractable.
5. CCSA Advocates IE against Thurmond in 2018 and 2022 — not confirmed as direct negative spending.
6. All City Management Services — CDE vendor relationship not confirmed (potential conflict).
7. Kamilos Companies LLC beneficial owner — Cal-Access blocked.
8. FPPC formal enforcement database entry for Thurmond — warning letters may not appear.
9. Individual donors #11-25 (full Schedule A) — TransparencyUSA shows only top 10.
10. Source: [Thurmond dossier DATA GAPS](../dossiers/thurmond.md)

---

## MATT MAHAN

1. Cal-Access direct filing search — blocked by robots.txt.
2. Cal-Access NextGen committee search — blocked.
3. Form 460 filings (itemized donors) — not accessed; all donor data from FPPC Top-10 lists and press.
4. Mahan for Mayor 2022/2024 committee IDs — not confirmed.
5. Full itemized donor list for Mahan for Governor 2026 (FPPC 1486858) — partial only.
6. Back to Basics California (501(c)(4)) donor list — not available; no Form 990 found for 2024.
7. Ron Conway, Marc Benioff, Sean Parker 2026 donations — not confirmed.
8. FPPC enforcement history pre-2026 — unconfirmed.
9. San Jose Ethics Commission complaints — not searched.
10. SJPOA 2026 political expenditure — not confirmed.
11. "Deliver for California" full contributor list — partial (only FPPC top-10 available).
12. Source: [Mahan dossier DATA GAPS](../dossiers/mahan.md)

---

## CHAD BIANCO

1. Cal-Access primary source inaccessible; FPPC #1479095 confirmed via secondary press.
2. Treasurer name — not identified in any public source.
3. RSA PAC governor-cycle IE spending — Form 496 filings for RSA PAC not confirmed.
4. FPPC enforcement database — not directly queried.
5. Tribal gaming contributions — Pechanga, Soboba, Morongo not identified in available Bianco filings.
6. Top employers of individual donors — not available for most contributors.
7. Bianco for Sheriff 2022 committee ID and donor detail — not directly queried.
8. Riverside Sheriff's Charities IRS Form 990 — not retrieved; EIN not confirmed.
9. Legal defense fund committee details — FPPC committee ID and full donor list not confirmed.
10. Post-March 2026 filings (Q1 2026) — not available in aggregated form.
11. Downs Energy / M&D Development FPPC aggregation review outcome — no formal enforcement confirmed yet.
12. Source: [Bianco dossier DATA GAPS](../dossiers/bianco.md)

---

## ERIC SWALWELL (suspended)

1. Cal-Access direct committee page — blocked by robots.txt; committee ID not confirmed from primary source.
2. Cal-Access NextGen committee search — blocked.
3. PowerSearch SoS — returned only form UI, no results.
4. FEC Candidate ID H2CA15125 (from task brief) — page not found; correct ID appears to be H2CA15094.
5. Swalwell governor committee original treasurer name — not identified.
6. Individual donor breakdown from Cal-Access Form 460 — Cal-Access blocked; NY Post review used as proxy.
7. FPPC enforcement formal complaint against Swalwell — no enforcement action identified.
8. OpenSecrets career total (all cycles) — HTTP error on career aggregate URL.
9. Source: [Swalwell dossier DATA GAPS](../dossiers/swalwell.md)

---

## CROSS-CUTTING GAPS IDENTIFIED IN THIS ANALYSIS

1. **No donor cross-reference from primary Cal-Access data.** The donor_overlaps.csv relies entirely on Tier 2 sources. Any cross-candidate giving patterns not captured in press coverage or FPPC top-10 lists are invisible. A systematic Cal-Access bulk data download (available at `https://github.com/california-civic-data-coalition/django-calaccess-raw-data`) would enable primary-source cross-referencing.

2. **AltaMed dual role (Becerra + Swalwell donor, anti-SEIU ballot committee funder) — amounts to Swalwell not independently verified** from a Tier 1 source; cross-dossier confirmation needed.

3. **Atkins/Yee/Cloobeck/Kounalakis dropout donor migration.** Specific individual donor moves from these withdrawn candidates to active candidates are not captured in itemized filings (Cal-Access blocked). Only endorsement-level signals and polling data confirm migration patterns.

4. **SEIU post-Swalwell money.** SEIU California ($4M in IEs for Swalwell) has not confirmed any redeployment of IE committee funds post-suspension. Whether the orphaned IE committees (1488732, 1489873) can legally redirect funds to other candidates requires legal analysis — a gap this research did not resolve.

5. **Becerra's "post-Swalwell surge" of ~$400K** — described in press but not verified against Cal-Access F497 filings.

6. **FPPC June 2026 Primary top-10 list completeness.** The list is updated intermittently; the version reviewed may not reflect April 28-June 2 activity.

7. **Dark money (501(c)(4)) cross-comparisons.** Golden Together (Hilton), Back to Basics California (Mahan), and NextGen Climate Action (Steyer) are all 501(c)(4)s not required to disclose donors. None had retrievable Form 990s for the 2025-26 period. No cross-organization donor overlap analysis is possible.

8. **Villaraigosa Coinbase advisory relationship and 2026 crypto donations.** Villaraigosa joined Coinbase's advisory council in April 2024. Chris Larsen (Ripple co-founder) gave to both Porter and Hilton but no confirmed Villaraigosa 2026 crypto donation identified. The Coinbase advisory role warrants follow-up given crypto's heavy involvement in CA electoral politics via Fairshake.

9. **Mercury/Actum client list vs. Villaraigosa 2026 donors.** Mercury and Actum clients (charter schools, Westlands Water, utilities) who may now be 2026 donors cannot be verified without full itemized Cal-Access data.

10. **CCPOA (prison guard union) alignment with Bianco vs. anti-Steyer IE participation.** CCPOA gave $25,000 to the anti-Steyer IE but no confirmed direct Bianco contribution. Whether CCPOA is coordinating with the Bianco campaign through non-disclosed channels requires primary source review.
