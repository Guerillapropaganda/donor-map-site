---
title: "Methodology"
---

## Methodology

This page documents how The Donor Map builds its claims: what counts as evidence, how units are defined, what the analytical framework can and cannot establish, and where the limitations are. Every profile in the database is built on these standards. If something doesn't meet them, it gets flagged or removed.

This is the warranty.

---

## Evidentiary Standards

Every factual claim in this database must be supported by at least one citable source. The standard is not "we believe this is true." The standard is "here is the document."

Claims fall into three categories, each with its own evidentiary threshold:

**Financial claims** — donation amounts, expenditure totals, lobbying spend. These require primary source documentation: FEC filings, state campaign finance records (FPPC, FollowTheMoney), lobbying disclosure reports, IRS 990s, or SEC filings. No financial claim appears in this database sourced solely from a news article. If the underlying record exists, we cite the record.

**Policy claims** — votes, bill sponsorship, committee actions, regulatory decisions. These require official government records: congressional roll call votes, bill text, committee hearing transcripts, Federal Register entries, or executive orders. Voting records are cross-referenced against at least two tracking sources.

**Analytical claims** — donation-to-policy timelines, pattern identification, conflict-of-interest analysis. These are the core of the project and carry the highest disclosure burden. Every analytical claim must show its work: the donation, the timeline, the policy outcome, and the structural relationship between them. Where causal claims cannot be established, the language says "correlation," "timeline alignment," or "structural incentive" — never "caused" or "bought."

---

## Source Hierarchy

Sources are tiered by reliability. Every citation in the database carries a tier designation, either explicitly or through the source type:

**Tier 1 — Primary Documents & Government Records.** The foundation. Includes FEC individual and committee filings (via api.open.fec.gov), FPPC campaign finance reports (California), FollowTheMoney state-level data, Lobbying Disclosure Act (LDA) filings, congressional voting records (clerk.house.gov, senate.gov), court documents, IRS 990 nonprofit disclosures, SEC filings, FOIA responses, and the Federal Register. When a Tier 1 source is available, it is always the cited source — not a news article reporting on the same data.

**Tier 2 — Major Investigative Journalism.** Work product from organizations with editorial standards, fact-checking processes, and correction policies. Includes OpenSecrets/Center for Responsive Politics analysis, ProPublica investigations, The Intercept, the investigative teams at the New York Times, Washington Post, LA Times, Wall Street Journal, Reuters, and AP. Tier 2 sources are used for narrative context, investigative findings not available in public records, and analysis that builds on primary documents.

**Tier 3 — Secondary Reporting & Reference Sources.** Ballotpedia, Wikipedia, specialist trade press, state-level political outlets, and academic publications. Used for biographical data, electoral history, and contextual background. Not relied upon for financial claims or analytical conclusions without corroboration from Tier 1 or 2.

**Tier 4 — Partisan, Single-Sourced, or Unverified.** Any source that does not meet Tier 1–3 criteria. Includes advocacy organizations, partisan media, anonymous sources, and social media. When used, Tier 4 sources are flagged explicitly with "(UNVERIFIED)" or "(PARTISAN SOURCE)" tags. They appear only when no higher-tier source covers the same ground and only for context — never as the sole basis for a factual claim.

---

## Unit Definitions

When the database says a politician received "$14.2M" or a donor spent "$2.9M," here is what those numbers include and exclude:

**Politician donation totals** include direct contributions (individual and PAC), bundled contributions where documented, and independent expenditures made on the politician's behalf — all drawn from FEC or state filings. They do not include dark money spending where the beneficiary is inferred rather than documented. When a total includes independent expenditures, that is noted. Career totals span the full FEC filing history available for that individual.

**Donor spending totals** include direct contributions, PAC contributions, independent expenditures, and — where disclosed — contributions to 501(c)(4) organizations and super PACs. Dark money estimates are identified as estimates and sourced to investigative reporting or IRS 990 analysis, never presented as precise figures.

**Lobbying spend** is drawn from LDA filings and reported as the registered amount per filing period. It does not capture grassroots lobbying, issue advertising, or informal influence spending that falls outside LDA disclosure requirements.

**"Top donors"** lists are compiled from FEC data via OpenSecrets unless otherwise noted, and represent either career or cycle totals as specified. They reflect the employer/organization attribution methodology used by the Center for Responsive Politics: contributions are attributed to the donor's employer, not the employer itself, unless the contribution comes from a corporate PAC.

---

## Donation-to-Policy Timeline Methodology

The core analytical tool of this database is the donation-to-policy timeline: mapping the sequence from contribution to legislative or regulatory action. Here is how they work and what they can and cannot establish.

**Construction.** A timeline begins with a documented contribution or expenditure (Tier 1 source). It identifies a subsequent policy action — vote, bill sponsorship, committee action, regulatory decision, or executive order — that benefits the contributor's documented interests. The timeline records: the contribution date and amount, the policy action and date, the beneficiary's documented interest, and the gap between contribution and action.

**What the timeline establishes.** The sequence of events. The financial relationship. The alignment between contributor interest and policy outcome. The structural incentive. That is what the evidence supports.

**What the timeline does not establish.** Causation. A donation-to-policy timeline shows that money flowed and policy followed. It does not prove the money caused the policy. Politicians have multiple motivations — constituency pressure, ideology, party leadership, staff recommendations, personal conviction. The database does not claim to read minds.

**Language conventions.** Timelines use specific language to stay within evidentiary bounds: "donated, then voted" (sequence), "funding aligns with" (structural relationship), "top recipient among those who voted for" (correlation), "the policy outcome matched the donor's documented interest" (alignment). The database never uses "bought," "bribed," or "paid for" unless quoting a legal finding.

**ROI calculations.** The ROI figures that appear in profiles and interactive tools are illustrative, not causal. When the database shows "$200K donated → $2.4B in contracts," this documents the scale asymmetry between political investment and policy return. It does not claim the donation was the sole or primary cause of the contract. The ROI framework makes visible what the system is designed to hide: the ratio between political spending and policy benefit.

---

## Analytical Framework

The database uses a class-analysis framework. It examines the structural relationship between donor-class interests and policy outcomes — across both parties, all chambers, and every level of government profiled.

This means:

**Bipartisan coverage.** Democrats and Republicans receive the same analytical treatment. The framework is not partisan. When the same donor funds both parties — and many do — both sides of that relationship are documented. The "Both-Sides" analysis exists specifically to make cross-party funding visible.

**Pattern identification.** Recurring patterns are named and tracked across the database: Revolving Door, Two-Audience Problem, Donor-Class Override, Dark Money Symmetry, Committee Jurisdiction as Fundraising Engine, and others documented on the [[Browse by Pattern]] page. These patterns are identified inductively from the data, not imposed on it.

**Structural analysis over individual motive.** The database focuses on structural incentives rather than individual corruption. A politician who votes in alignment with their top donors may be acting from conviction, party pressure, or financial incentive — or all three. The database documents the structural relationship and lets the evidence speak. It does not require proof of corrupt intent to document the pipeline.

---

## Limitations

**Dark money gaps.** 501(c)(4) organizations are not required to disclose donors. This means significant funding flows are invisible to public records. Where investigative journalism has uncovered dark money donors, those findings are included with Tier 2 sourcing. But the database cannot document what is designed to be undocumentable. The known dark money networks represent a floor, not a ceiling.

**Attribution methodology.** The FEC employer attribution method used by OpenSecrets has known limitations. When "Goldman Sachs employees" donate to a candidate, the FEC data reflects where those individuals work — it does not prove the firm directed those contributions. The database notes this distinction. PAC contributions are separately identified.

**Timing and freshness.** FEC data is reported on filing cycles — quarterly for most committees, monthly for some. There is an inherent lag between contribution and public disclosure. State-level data varies by jurisdiction. The database updates profiles as new filings become available, but at any given moment some data may be one to three months behind the most recent filings. Every profile carries a "Last updated" field in its metadata.

**Scope.** The database currently covers federal elected officials, California state-level figures, Supreme Court justices, and selected international figures with direct U.S. political funding connections. Municipal, county, and most state-level officials outside California are not yet covered. Expansion is ongoing.

**Single-researcher limitations.** This database is built and maintained by one person. Errors of fact, omission, or interpretation are possible despite rigorous sourcing standards. If you find an error, report it. Corrections are made promptly and documented.

---

## Timestamps and Versioning

Every profile in the database carries metadata including:

**Last updated** — the date the profile was last substantively reviewed or revised. This appears in the YAML frontmatter of every note.

**Data vintage** — when financial data represents a specific filing cycle, that cycle is noted. "2024 cycle" means the 2023–2024 FEC filing period. "Career" means the full available FEC history.

**Source access dates** — web sources include the access date when the underlying URL may change or disappear. Government records that are permanently accessible cite the filing ID rather than an access date.

---

## Verify It Yourself

Every source cited in this database is chosen because it is publicly accessible. FEC filings are free. OpenSecrets is free. Congressional voting records are free. State campaign finance databases are free. Court documents are available through PACER or state court systems. IRS 990s are available through ProPublica's Nonprofit Explorer.

Click any claim. Follow the source. Verify it yourself. That is the point.

---

**[[About The Donor Map]]** · **[[Politicians Index]]** · **[[Donors & Power Networks Index]]** · **[[Follow the Money - Guided Tour]]** · **[[Browse by Pattern]]**
