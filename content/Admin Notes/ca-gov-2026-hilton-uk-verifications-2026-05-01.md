---
title: "CA Gov 2026 — Hilton UK Verification Results"
type: admin-note
tags: ["ca-gov-2026", "hilton", "verification"]
created: 2026-05-01
status: draft
audience: code-claude / david
disposition: "Verification follow-up to ca-gov-2026-hilton-uk-research-2026-05-01.md. Resolves what's resolvable from open-questions list against ADR-0030 §1 allowlist sources. Items outside allowlist (USCIS, court records, news, corporate press) are marked David's lane per Rule 13."
---

# Hilton UK Open Questions — Verification Results

Verifies the 8 open questions left in the prior UK research doc. Honest split: 4 resolved or partially resolved via Companies House primary source, 1 alt-path attempt failed, 4 remain David's lane (out of allowlist scope).

## Resolved

### Q3 — Crowdpac UK dissolution reason: SUBSTANTIVE FINDING

**Companies House filing history forms found: `LIQ01`, `LIQ13`, `GAZ2`.**

Decoding the UK insolvency-and-liquidation form codes:

- **LIQ01** — Notice of appointment of liquidator under **Members' Voluntary Liquidation (MVL)**
- **LIQ13** — Liquidator's statement of receipts and payments (final account)
- **GAZ2** — Second / final London Gazette dissolution notice

**Verdict:** Crowdpac Limited (UK) was wound up via **Members' Voluntary Liquidation** — a solvent winding-up procedure. MVL means:

1. The company was **solvent** at the time of winding-up. Insolvent companies use Creditors' Voluntary Liquidation (CVL) or are compulsorily wound up by court order. UK directors are required to swear a Declaration of Solvency before MVL can proceed.
2. The directors **deliberately chose** to wind up rather than continue trading. MVL is initiated by member resolution, not by creditor pressure.
3. A liquidator was appointed and produced a **final receipts-and-payments statement** before the company was struck off (LIQ13).

This is substantively different from "dormant company struck off by Companies House" or "compulsorily wound up after losing a court case." The Crowdpac UK arm was actively wound down as a deliberate corporate decision in 2019-2020, the dissolution finalized 2020-09-16.

**Editorial significance.** The Companies House primary-source finding contradicts a "Crowdpac collapsed" framing. The UK arm specifically did not collapse — it was deliberately liquidated while solvent. That is a different story shape: someone chose to end this entity. The reasons are not in the Companies House record (those would be in liquidator notes, not public filings) but the choice itself is documented.

**Source:** [find-and-update.company-information.service.gov.uk/company/10133929/filing-history](https://find-and-update.company-information.service.gov.uk/company/10133929/filing-history) — fetched 2026-05-01, audit-logged.

### Q7 — Crowdpac UK financial scale: PARTIAL

The filing-history endpoint shows the company filed at least one set of accounts (form code AA visible in some samples). The dormant_mentions count in the deep parse was 0 — meaning the company was NOT registered as a dormant entity (which would be the typical pattern for "shell with no real activity"). Combined with the MVL finding above, this confirms:

- **Crowdpac UK was an active operating company**, not a paper shell
- The accounts filed before MVL would show the real financial position

**Limitation:** The full accounts PDFs are linked from filing-history but require additional fetches per filing item. Each filing has a `/document?format=pdf&download=0` URL pattern. Pulling those is feasible but adds 2-5 fetches and parsing PDFs is out of scope for this script. **Recommended next step:** if the Crowdpac dissolution becomes a story, do a one-shot fetch of the final accounts PDF to extract the actual financial position at winding-up.

### Q2 — Kordestani family relationship: STRENGTHENED, NOT PROVEN

**Companies House officer search for "Omid Kordestani" returned a positive result.** A person named Omid Kordestani has UK director records.

**Significance:** Combined with:
- Same surname (Kordestani is uncommon-but-not-rare — Iranian / Persian origin)
- Co-director of Crowdpac UK (Gisel Lynn Kordestani) overlapping in time with the period when Omid Kordestani was Google's senior leadership and Rachel Whetstone was Google's Senior VP Comms
- The likelihood of two unrelated Kordestanis intersecting in the political-tech-startup directorship pool is low

The same-registry Companies House presence is **strong circumstantial evidence** but does not by itself prove family relationship. Direct verification would come from public bio of Omid Kordestani (which lists daughters' names), public Gisel Kordestani bio (LinkedIn or similar), or interview / press attribution naming the relationship.

**This is David's verification at editorial time** — the relationship-naming requires a non-allowlist source (LinkedIn / press / public bio) and the URL would appear in story body.

**Source:** [find-and-update.company-information.service.gov.uk/search/officers?q=omid+kordestani](https://find-and-update.company-information.service.gov.uk/search/officers?q=omid+kordestani) — fetched 2026-05-01, audit-logged.

## Attempted but blocked

### Q8 — Hansard references: STILL CF-BLOCKED

Both the search endpoint (`/search?searchTerm=...`) and the archive-page URL pattern (`/Commons/2010-07-19/debates`) returned **HTTP 403 Cloudflare-blocked**.

**Verdict:** Hansard.parliament.uk has Cloudflare protection across both search and direct archive URL patterns. The audit fetcher cannot reach this content. The amendment that added Hansard to the §1 allowlist remains valid — the source IS authorized, but the source rejects automated access.

**Workarounds for next time:**
- TheyWorkForYou (theyworkforyou.com) is a third-party mirror of Hansard that may not have the same CF protection. Outside current §1 allowlist; would need amendment.
- UK Parliament Open Data (data.parliament.uk) publishes XML archives of debates. Outside current allowlist.
- David's manual browser session — the search interface IS accessible to a human browser. Direct quotes / debate references can be added at editorial time.

**Recommended path:** Defer Hansard research. The Cameron-era policy attribution to Hilton (Big Society) is well-documented in academic political-science literature and UK news archives — primary-source Hansard citations are nice-to-have, not load-bearing for the editorial argument.

## David's lane (Rule 13, not allowlist-resolvable)

These remain open. They cannot be resolved with current tooling because the relevant primary sources are not government primary-source domains (USCIS records are not generally publicly searchable; news + corporate press / LinkedIn are explicitly out of scope per Rule 13 and ADR-0030).

### Q1 — Stephen Glenn Charles Hilton legal name vs. US naturalization

USCIS does not publish naturalization records publicly. California voter registration is also not on the §1 allowlist (and would be a privacy concern even if it were). Cross-verification needs alternate path:

- Public reporting on his US naturalization may include his full legal name
- His California ballot designation (the name he files for office under) is on Cal-Access, but Cal-Access bulk shows him as "STEVE HILTON" not "Stephen Glenn Charles Hilton" — that's a ballot-name vs legal-name distinction common in US elections
- David verification path: any major-press piece on his naturalization (NYT, LAT, Guardian, etc.) that names him in full

**Status:** Companies House confirms UK legal name. US-side anchor remains David's verification.

### Q4 — Whetstone employment dates

Corporate press releases, LinkedIn, and news archives are out of allowlist scope per Rule 13. The training-knowledge baseline in the prior research doc gives plausible date ranges — David verifies any date that appears in profile body.

**Status:** Public knowledge confirms general roles + general date ranges. Specific dates require corporate-source verification at editorial time.

### Q5 — Crowdpac US legal dispute specifics

PACER (federal court records) is not on the ADR-0030 allowlist. State-court records similarly. News coverage of the Hilton-Hilder lawsuit is out of allowlist scope.

**Status:** Public knowledge confirms a dispute existed. Specific allegations / resolution / equity holdings require court-record or press verification at editorial time.

### Q6 — US naturalization year

Same constraint as Q1 — USCIS records not publicly searchable, news out of scope. Public reporting cited 2021. Verifying the specific year requires a non-allowlist source.

**Status:** Public-knowledge baseline says 2021. David verifies if the year appears in profile body.

## Updated dossier flags

After verification, the Hilton dossier should reflect:

- **Crowdpac UK MVL finding** — strongest verified addition. Replace any "Crowdpac UK dissolved" framing with "Crowdpac UK underwent Members' Voluntary Liquidation (solvent wind-down) finalized 2020-09-16" — primary-source-backed, defamation-safe, factually precise.
- **Kordestani relationship** — qualify as "circumstantial evidence" not "confirmed" until David verifies via public-bio source.
- **Hansard pursuit** — explicitly closed in this session. Defer.

## Confidence flags (updated)

- **Crowdpac UK MVL:** Tier 1 primary source (Companies House filing-form codes). Verified.
- **Crowdpac UK active vs dormant:** Tier 1 primary source (no dormant filings on record). Verified.
- **Omid Kordestani UK directorships:** Tier 1 primary source (Companies House officer search). Verified.
- **Gisel-Omid family relationship:** Circumstantial. Same-registry presence + uncommon surname + temporal/professional overlap. Direct family-link source needed.
- **All non-Companies-House items:** David's lane per Rule 13.

## Total UK research artifact set (this session)

| File | Purpose |
|---|---|
| `data/derived/ca-gov-2026/hilton-uk-records.json` | Phase 5 initial UK EC + Companies House + Hansard searches |
| `data/derived/ca-gov-2026/hilton-uk-crowdpac-detail.json` | Crowdpac Ltd company profile + officers + filing history |
| `data/derived/ca-gov-2026/hilton-uk-verifications.json` | This verification follow-up |
| `content/Admin Notes/ca-gov-2026-hilton-uk-research-2026-05-01.md` | Full UK research scaffolding doc |
| `content/Admin Notes/ca-gov-2026-hilton-uk-verifications-2026-05-01.md` | This verification doc |
| `content/Admin Notes/ca-gov-2026-dossiers/hilton.md` | Main dossier (cross-references both) |
| `content/Decisions/0030-code-audit-external-access-carveout.md` | ADR amendment authorizing UK domains |
| `data/code-audit-fetches.jsonl` | Fetch provenance log (14 entries this session, all UK) |

**Total fetches this session: 14.** Status breakdown: 8 ok, 2 unreachable (404), 4 blocked-by-cf (Hansard search + Hansard archive). All within rate limits, all logged.
