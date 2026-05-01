---
title: CA Governor 2026 Research Dossier — Audit + Phase 2-4 Plan
type: admin-note
tags: ["plan", "ca-gov-2026", "research-scaffolding"]
created: 2026-05-01
status: open
audience: code-claude / david
---

# CA Governor 2026 Research Dossier — Audit + Phase 2-4 Plan

**What this is.** Phase 1 audit of vault state for 9 candidates in the CA Gov 2026 race + planned phases 2-4 to fill gaps. Research scaffolding for editorial work — nothing here publishes. Once filled, becomes the springboard for the first 7-10 stories in the new beat-style site.

**Scope confirmed 2026-04-30** (David):
- **Deep dossier (7):** Becerra, Porter, Steyer, Hilton, Bianco, Villaraigosa, Mahan
- **Portrait (1):** Thurmond
- **Structural investigation (1):** Butch Ware — *why he can't win*
- **Dropped:** Swalwell (suspended), Yee (out of scope)

---

## Phase 1 audit findings

### State-of-data snapshot

| Candidate | Vault tier | Master size | Sub-pages | FEC ID | FPPC committee | Librarian edges |
|---|---|---|---|---|---|---|
| Xavier Becerra | draft | 22KB | 1 | H2CA30143 / C00264101 | 1480025 | 14 |
| Katie Porter | ready | 33KB | 5 | S4CA00522 + 2 cmtes | 1479597 | 61 |
| Tom Steyer | data-complete | 24KB | 4 | P00012716 | 1485077 | 54 |
| Steve Hilton | draft | 313KB monolithic | 0 | — | 1480425 | 21 |
| Chad Bianco | data-complete | 182KB | 8 | — | 1479095 | **151** |
| Antonio Villaraigosa | data-complete | **483KB** | 1 | — | 1392364 (2018 cycle ⚠️) | 18 |
| Matt Mahan | data-complete | 19KB | 4 | — | 1487425 + 1473129 | 29 |
| Tony Thurmond | data-complete | 119KB | 1 | — | 1461509 | 12 |
| **Butch Ware** | **MISSING** | — | — | — | — | 0 |

### Surprises worth knowing
- **Villaraigosa is 483KB already** — much richer than expected. Real-estate-developer donor mapping is heavy. *But:* Cal-Access committee `1392364` is his 2018 cycle, not 2026. Need to confirm whether his 2026 committee is filed yet or whether he's running through old infrastructure. **Fetch task.**
- **Bianco has 151 librarian edges** — the most of any candidate. Constitutional sheriff / CSPOA / Oath Keepers documentation already deep. Editorial framework is mostly there.
- **Mahan is thin (19KB)** despite `data-complete` tier. Tech-billionaire pipeline framing exists but the donor-level detail is shallow. Will benefit most from Cal-Access enrichment.
- **Hilton is 313KB single file** — never got split into sub-pages. Refactoring before writing.
- **Becerra at `draft` tier** — pipeline-janitor demoted him 2026-04-26 (missing voting/Congress data). Federal data exists; just not pulled.
- **Thurmond is portrait-tier already** — 119KB with one sub-story on charter schools. Don't over-invest.

### What Cal-Access committee IDs we have
All 8 in-vault candidates have identified state filing committees in `data/derived/cal-access-bulk.jsonl`. Committee IDs identified in the audit but **NOT YET WRITTEN to profile frontmatter as `fppc-id:` fields.** First Phase 2 task: backfill those.

### Butch Ware confirmation
Completely absent. No profile, no FEC committee from his 2024 Stein-Ware Green VP run, no librarian edges, no entity record. The gap is structural — the 2024 VP run never generated federal committee records that reached the vault's ingestion pipeline. *This absence is itself part of the story.*

---

## Phase 2-4 plan

### Phase 2 — Tier-1 source fetches (~$20-30 Opus)

**Goal:** fill the data gaps from primary government sources under ADR-0030 §10. All fetches log to `data/code-audit-fetches.jsonl`. Profile-body URLs do NOT change — Rule 13 reserves URL verification for David.

**P2-A. Backfill `fppc-id` frontmatter.** Write the 8 identified FPPC committee IDs into each candidate's frontmatter. No external fetch needed — IDs already in cal-access-bulk evidence fields. ~$3.

**P2-B. Cal-Access deep extract per committee.** Filter `cal-access-bulk.jsonl` + `cal-access-expn.jsonl` by the 8 committee IDs. Build per-candidate donor rosters (top 50 by $, dominant capital cluster, total raised, total spent, cash-on-hand if filed). Write to `data/derived/ca-gov-2026-{slug}.json`. ~$8.

**P2-C. Verify Villaraigosa 2026 committee.** His current Cal-Access ID is 2018-cycle. Either: (a) his 2026 committee hasn't filed yet, (b) he's reusing the 2018 committee number, or (c) there's a 2026 committee we missed. Fetch Cal-Access SoS lookup for "VILLARAIGOSA FOR GOVERNOR 2026" — ADR-0030 logged. ~$3.

**P2-D. FEC committee summary pulls** for the 3 with federal records (Becerra, Porter, Steyer). Pull Form 3/3X totals via FEC bulk by committee ID. Confirms career federal totals + cycle-specific. ~$5.

**P2-E. FPPC Form 700 economic interest disclosures** for incumbents/officeholders (Becerra, Porter, Thurmond, Bianco where applicable). Form 700 reveals personal financial holdings — surfaces conflicts. ADR-0030 logged. ~$8.

**P2-F. Butch Ware filing status check.** Fetch CA Secretary of State candidate list for governor 2026 → confirm whether he's filed, party, signature status, FPPC committee if any, Form 460 if any. ADR-0030 logged. ~$3.

**Total Phase 2: ~$30**

### Phase 3 — Compile dossiers (~$30-40 Opus)

Per-candidate dossier in `content/Admin Notes/ca-gov-2026-dossiers/{slug}.md` containing:
- Top 10 donors with $ amounts (from P2-B extract)
- Dominant capital cluster (from existing class-tags or fresh apply)
- Biggest factual contradiction with primary-source URL
- Stance/vote/action history relevant to 2026 race
- Confidence flags per claim (Tier 1 source-backed vs. pipeline-inferred)
- "Open questions" section — what David needs to verify before publishing

**Per-candidate budget estimate:**
- Becerra ~$5 (federal-data heavy, light vault)
- Porter ~$6 (rich vault + federal + state)
- Steyer ~$6 (richest narrative, self-fund angle)
- Hilton ~$6 (large existing file, split + structure)
- Bianco ~$5 (heavy vault, mostly synthesis)
- Villaraigosa ~$6 (largest vault, real-estate donor angle)
- Mahan ~$5 (thinnest vault, Silicon Valley enrichment)
- Thurmond ~$3 (portrait depth only)

**Total Phase 3: ~$42**

### Phase 4 — Butch Ware structural investigation (~$20-30 Opus)

This is the most editorially distinct piece — investigates the *system*, not the person. Output: `content/Admin Notes/ca-gov-2026-ware-structural-2026-05-01.md` (private), eventually becomes a published Story.

**Research components:**
- **Filing status** — has Ware filed for CA Gov 2026? As what party (Green / nonpartisan / write-in)? Source: CA SoS candidate list.
- **Ballot access law** — CA Elections Code §§8000-8200. Requirements for governor: registered voter, signature requirements (whether nominated by party or independent path), filing fee or signatures-in-lieu.
- **Top-two primary mechanics** — Prop 14 (2010), how it structurally excludes minor parties from the November ballot. Cite stats: how many Green/Libertarian/Peace+Freedom candidates have advanced to general since 2012.
- **Fundraising comparison** — Ware's federal totals from 2024 Stein-Ware (if any) vs. Steyer's self-fund vs. Becerra/Porter institutional money. The asymmetry is the story.
- **Polling threshold** — what % support disqualifies Ware from major debates? (CA Public Policy Institute, FOX 11, KQED debate criteria — fetch and cite.)
- **Media coverage gap** — count mentions in LAT, Politico-California, SF Chronicle of Ware vs. top 5 candidates over a 90-day window. Methodology: structured search of media archives if accessible, or rough count via CA newsroom Twitter/Bluesky feeds. *Note: news fetches are out of scope under ADR-0030 — would need a separate carve-out or use only what's already in vault.*
- **Historical precedent** — last 10 CA Gov cycles (1994-2022): vote share of non-D/non-R candidates. Source: CA SoS election results.
- **The verdict** — synthesis section. Verdicts on the SYSTEM are OK because they're structural claims, not defamation-prone claims about a person.

**Total Phase 4: ~$25**

### Total operation: ~$95-100

Aligns with the original $85-115 estimate. Phase 1 (this doc) cost ~$15.

---

## Constraints / what to remember

1. **Living-people defamation surface.** Per Rule 13, every profile-body URL is David's verification. Code Claude assembles factual material with primary-source citations. Code Claude does NOT write editorial verdicts on the deep dossiers — those are David's lane. Verdicts on the Ware *structural* piece are OK because they're system-level.
2. **ADR-0030 §10 governs all external fetches.** Government primary sources only — Cal-Access, FEC, IRS, FPPC, CA SoS, congressional. News + aggregators + social explicitly out of scope. Every fetch logs to `data/code-audit-fetches.jsonl`. The `code-audit-fetch-sentinel` blocks any fetched URL leaking into profile content.
3. **Stays private.** Everything writes to `content/Admin Notes/` — outside published-routes scope. `data/public-routes.json` untouched.
4. **Construction page stays up.** No public deploy of any of this until David greenlights individual pieces.

---

## Handoff brief — paste into next chat

> Execute Phase 2-4 of `content/Admin Notes/ca-gov-2026-dossier-plan-2026-05-01.md`. Code Claude, Opus 4.7. Cost expectation $80-95 across the 3 phases, announce phase-by-phase. All work writes to `content/Admin Notes/` and `data/derived/` — nothing publishes. Construction page stays up. Read the plan doc first, then begin Phase 2-A (`fppc-id` frontmatter backfill). Commit incrementally per phase.

---

**Plan written:** 2026-05-01
**Phase 1 cost:** ~$15
**Phases 2-4 estimated:** ~$80-95
