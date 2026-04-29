---
title: Pipeline Janitor Report
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-29'
generated-by: scripts/pipeline-janitor.cjs
---

# Pipeline Janitor Report

Generated: 2026-04-29T22:15:31.378Z
Mode: DRY RUN (report only)

## Pipeline Status

**API pipelines paused since 2026-04-24** (7 workflows disabled — see `data/enrichment-state.json`).

Findings below are split into three buckets:
- **Fixable now** — CSV-bulk fallback exists, run the listed command
- **Blocked on paused pipeline** — no local fallback; defer or resume Actions
- **Editorial / advisory** — A+ findings that require David or Research Claude (never auto-demote per ADR-0025)

## Summary

- Profiles scanned: 3287
- Profiles at ready/verified audited: 250
- Profiles with issues: **250**
- Total issues: 573

### By category

- Fixable now (CSV bulk or demote): **37**
- Blocked on paused pipeline: **0**
- Editorial / advisory (no auto-fix): **536**

### By issue kind

- `a-plus-missing-story-grade`: 250 (250 advisory)
- `a-plus-missing-thesis`: 147 (147 advisory)
- `a-plus-legal-review`: 68 (68 advisory)
- `a-plus-committee-cross-ref`: 46 (46 advisory)
- `missing-block`: 35 (35 fixable-now)
- `a-plus-source-floor`: 18 (18 advisory)
- `a-plus-both-sides`: 7 (7 advisory)
- `known-gap-pipeline`: 1 (1 fixable-now)
- `zombie-block`: 1 (1 fixable-now)

## Findings — Fixable Now

_Each issue lists the exact command. Run them, then re-run `node scripts/pipeline-janitor.cjs` to clear._

### Mike Lawler Master Profile

- **Path:** `Politicians/Republicans/House/Mike Lawler/_Mike Lawler Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `missing-block` — no voting pipeline data (no govtrack-id, no block) → **no govtrack-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-voting-bulk.cjs`, or demote to draft (admits no voting record coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Pete Buttigieg

- **Path:** `Politicians/Democrats/Biden Cabinet/Pete Buttigieg/_Pete Buttigieg Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no voting pipeline data (no govtrack-id, no block) → **no govtrack-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-voting-bulk.cjs`, or demote to draft (admits no voting record coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ayanna Pressley Master Profile

- **Path:** `Politicians/Democrats/House/Ayanna Pressley/_Ayanna Pressley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `known-gap-pipeline` — known-gaps mentions "Needs re-enrichment" — should be draft → **demote to draft**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). → **occ: BLOCKED: OCC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | sec-edgar: BLOCKED: SEC EDGAR API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 11 defamation-prone phrases outside blockquotes: #pressley #massachusetts #progressive #squad #financial-services #criminal-justi | Pressley is the least media-visible Squad member but arguably the most legislati → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bob Menendez

- **Path:** `Politicians/Democrats/Senate/Bob Menendez/_Bob Menendez Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: The class analysis is straightforward: Menendez proves that the campaign finance | - [FBI: Menendez and Melgen Indictment](https://www.fbi.gov/contact-us/field-off → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Dick Durbin

- **Path:** `Politicians/Democrats/Senate/Dick Durbin/_Dick Durbin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Benjamin Netanyahu

- **Path:** `Politicians/International/Benjamin Netanyahu/_Benjamin Netanyahu Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Michael Whatley

- **Path:** `Politicians/Republicans/Senate/Michael Whatley/_Michael Whatley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no voting pipeline data (no govtrack-id, no block) → **no govtrack-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-voting-bulk.cjs`, or demote to draft (admits no voting record coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tom Cotton Master Profile

- **Path:** `Politicians/Republicans/Senate/Tom Cotton/_Tom Cotton Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending, federal-register. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Armed Services oversees defense contracts — must cross-ref USASpending awardees. Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs` | federal-register: BLOCKED: Federal Register API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-04-15 | S.4303-119 | — | A bill to amend the Tariff Act of 1930 to provid → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### David Sacks

- **Path:** `Politicians/Republicans/Trump Cabinet/David Sacks/_David Sacks Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `missing-block` — no voting pipeline data (no govtrack-id, no block) → **no govtrack-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-voting-bulk.cjs`, or demote to draft (admits no voting record coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Stephen Miller

- **Path:** `Politicians/Republicans/Trump Cabinet/Stephen Miller/_Stephen Miller Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: Denaturalization Program. February 2025. Miller activated denaturalization team: → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Greg Casar Master Profile

- **Path:** `Politicians/Democrats/House/Greg Casar/_Greg Casar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — fec-candidate-id=H2TX35108 but no <!-- auto:fec-lifetime --> block in body → **re-run CSV bulk: `node scripts/ingest-fec-pas2-bulk.cjs && node scripts/build-fec-lifetime-panels.cjs`**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chuck Schumer

- **Path:** `Politicians/Democrats/Senate/Chuck Schumer/_Chuck Schumer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mallory McMorrow Master Profile

- **Path:** `Politicians/Democrats/Senate/Mallory McMorrow/_Mallory McMorrow Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no voting pipeline data (no govtrack-id, no block) → **no govtrack-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-voting-bulk.cjs`, or demote to draft (admits no voting record coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Eric Swalwell Master Profile

- **Path:** `Politicians/Races/CA Governor 2026/Eric Swalwell/_Eric Swalwell Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no voting pipeline data (no govtrack-id, no block) → **no govtrack-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-voting-bulk.cjs`, or demote to draft (admits no voting record coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### French Hill

- **Path:** `Politicians/Republicans/House/French Hill/_French Hill Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). → **occ: BLOCKED: OCC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | sec-edgar: BLOCKED: SEC EDGAR API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim Jordan

- **Path:** `Politicians/Republicans/House/Jim Jordan/_Jim Jordan Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Rogers

- **Path:** `Politicians/Republicans/House/Mike Rogers/_Mike Rogers Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bill Cassidy Master Profile

- **Path:** `Politicians/Republicans/Senate/Bill Cassidy/_Bill Cassidy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, federal-register. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | federal-register: BLOCKED: Federal Register API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim Risch

- **Path:** `Politicians/Republicans/Senate/Jim Risch/_Jim Risch Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### JD Vance Master Profile

- **Path:** `Politicians/Republicans/Vice Presidential/JD Vance/_JD Vance Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Samuel Alito

- **Path:** `Politicians/SCOTUS/Samuel Alito/_Samuel Alito Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Saikat Chakrabarti Master Profile

- **Path:** `Politicians/Democrats/House/Saikat Chakrabarti/_Saikat Chakrabarti Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no congress pipeline data (no bioguide-id, no block) → **no bioguide-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-congress-bulk.cjs`, or demote to draft (admits no Congress coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Johnson

- **Path:** `Politicians/Republicans/House/Mike Johnson/_Mike Johnson Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Collins

- **Path:** `Politicians/Republicans/Senate/Mike Collins/_Mike Collins Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Crapo

- **Path:** `Politicians/Republicans/Senate/Mike Crapo/_Mike Crapo Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no fec pipeline data (no fec-candidate-id, no block) → **no fec-candidate-id resolved for this profile — either resolve ID upstream then run `node scripts/ingest-fec-pas2-bulk-bulk.cjs`, or demote to draft (admits no FEC coverage)**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

## Findings — Editorial / Advisory

_A+ findings — David or Research Claude action required. Never auto-demoted (ADR-0025)._

### American Farm Bureau Federation

- **Path:** `Donors & Power Networks/Agriculture/American Farm Bureau Federation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: The American Farm Bureau Federation is a case study in institutional identity fr | **Issues lobbied:** Aerospace, Agriculture, Animals, Arts/Entertainment, Automot → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ActBlue

- **Path:** `Donors & Power Networks/Dark Money/ActBlue.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: - [Texas Attorney General Ken Paxton: Investigation into ActBlue fraud and suspi | - [Washington Examiner: "Chaos and fraud: A look at the allegations facing ActBl → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bradley Foundation

- **Path:** `Donors & Power Networks/Dark Money/Bradley Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Budget/Appropriations, Defense, Economics/Economic Developme → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Conservative Partnership Institute

- **Path:** `Donors & Power Networks/Dark Money/Conservative Partnership Institute.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: CPI's structural function is filling the gap between the traditional conservativ → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Demand Justice

- **Path:** `Donors & Power Networks/Dark Money/Demand Justice.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: Here's the operative contradiction: Democratic Party rhetoric positions the Fede | **Issues lobbied:** Aerospace, Aviation/Airlines/Airports, Banking, Budget/Appro → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Freedom Partners Chamber of Commerce

- **Path:** `Donors & Power Networks/Dark Money/Freedom Partners.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Accounting, Animals, Banking, Budget/Appropriations, Civil R → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Heritage Foundation

- **Path:** `Donors & Power Networks/Dark Money/Heritage Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Agriculture, Arts/Entertainment, Banking, Budget/Appropriati → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Stand Together

- **Path:** `Donors & Power Networks/Dark Money/Stand Together.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 8 defamation-prone phrases outside blockquotes: **Criminal justice "reform" as libertarian state-reduction:** Stand Together's m | **Think tanks:** Heritage Foundation (model legislation factory), Cato Institute → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Anduril Industries

- **Path:** `Donors & Power Networks/Defense & Intelligence/Anduril Industries.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - ~~[Reuters: Anduril pre-IPO fraud charges](https://www.reuters.com/legal/gover → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bechtel Corporation

- **Path:** `Donors & Power Networks/Defense & Intelligence/Bechtel Corporation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 360 P.I.: Other, 370 Other Fraud, 380 Personal Property: Other, 4 → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Raytheon (RTX Corporation)

- **Path:** `Donors & Power Networks/Defense & Intelligence/Raytheon (RTX).md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 6 defamation-prone phrases outside blockquotes: #donor #defense #corporation #military-industrial-complex #lobbying #revolving-d | ### The $950 Million DOJ Fraud Settlement (October 2024) → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### American Fuel and Petrochemical Manufacturers

- **Path:** `Donors & Power Networks/Energy & Utilities/American Fuel and Petrochemical Manufacturers.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Aerospace, Agriculture, Animals, Arts/Entertainment, Automot → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ConocoPhillips

- **Path:** `Donors & Power Networks/Energy & Utilities/ConocoPhillips.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Clean Air and Water (quality), Energy/Nuclear, Environment/S → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Drummond Co.

- **Path:** `Donors & Power Networks/Energy & Utilities/Drummond Co.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 360 P.I.: Other, 370 Other Fraud, 410 Anti-Trust, 440 Civil Right → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Enterprise Products Partners

- **Path:** `Donors & Power Networks/Energy & Utilities/Enterprise Products Partners.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: | Case Types | 190 Contract: Other, 370 Other Fraud, 440 Civil Rights: Other, 44 | **Issues lobbied:** Accounting, Aerospace, Agriculture, Automotive Industry, Avi → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Southern Company

- **Path:** `Donors & Power Networks/Energy & Utilities/Southern Company.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Agriculture, Budget/Appropriations, Civil Rights/Civil Liber → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Valero Energy

- **Path:** `Donors & Power Networks/Energy & Utilities/Valero Energy.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 2899 Other Statutes APA/Review Agency, 470 Other Statutes: Racket → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### American Gaming Association

- **Path:** `Donors & Power Networks/Gig Economy/American Gaming Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | ASSOCIATION OF STATE CRIMINAL INVESTIGATIVE AGENCIES | $13K | 1 | 2024 | → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Blue Shield of California

- **Path:** `Donors & Power Networks/Healthcare/Blue Shield of California.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Aerospace, Agriculture, Alcohol and Drug Abuse, Animals, Ban → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Insurance Industry

- **Path:** `Donors & Power Networks/Healthcare/Insurance Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Accounting, Agriculture, Alcohol and Drug Abuse, Automotive  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Haim Saban

- **Path:** `Donors & Power Networks/Israel Lobby/Haim Saban.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 320 Assault Libel & Slander, 440 Civil Rights: Other, 470 Rackete → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mark Mellman

- **Path:** `Donors & Power Networks/Israel Lobby/Mark Mellman.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### California Labor Federation

- **Path:** `Donors & Power Networks/Labor Unions/California Labor Federation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **The containment thesis:** The Federation's structural function in the vault's  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Nurses United

- **Path:** `Donors & Power Networks/Labor Unions/National Nurses United.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Advertising, Agriculture, Animals, Arts/Entertainment, Autom → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ohio AFL-CIO

- **Path:** `Donors & Power Networks/Labor Unions/Ohio AFL-CIO.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Aerospace, Agriculture, Aviation/Airlines/Airports, Budget/A → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### UAW - United Auto Workers

- **Path:** `Donors & Power Networks/Labor Unions/UAW - United Auto Workers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 3 defamation-prone phrases outside blockquotes: ### The Scheme: Two Interlocking Mechanisms | The General Motors civil lawsuit (filed August 2020) alleged the scheme was even → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Fraternal Order of Police

- **Path:** `Donors & Power Networks/Law Enforcement/Fraternal Order of Police.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Aviation/Airlines/Airports, Budget/Appropriations, Education → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### AT&T

- **Path:** `Donors & Power Networks/Media & Entertainment/AT&T - WarnerMedia.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 440 Civil Rights: Other, 470 Racketeer/Corrupt Organization, 751  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### News Corp - Fox Corporation

- **Path:** `Donors & Power Networks/Media & Entertainment/News Corp - Fox Corporation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 3 defamation-prone phrases outside blockquotes: **Agenda Setting Power:** Fox News does not merely report conservative politics, | **Dominion Settlement as Cost of Business:** The $787.5 million Dominion settlem → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bernie Marcus

- **Path:** `Donors & Power Networks/Mega-Donors/Bernie Marcus.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Paul Singer

- **Path:** `Donors & Power Networks/Mega-Donors/Paul Singer.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Accounting, Aerospace, Budget/Appropriations, Civil Rights/C → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Robert Mercer

- **Path:** `Donors & Power Networks/Mega-Donors/Robert Mercer.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 365 Personal Inj. Prod. Liability, 440 Civil Rights: Other, 470 R → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rupert Murdoch

- **Path:** `Donors & Power Networks/Mega-Donors/Rupert Murdoch.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [NPR: Fox News headed for trial over Smartmatic election fraud claims](https:/ → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sam Bankman-Fried

- **Path:** `Donors & Power Networks/Mega-Donors/Sam Bankman-Fried.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 3 defamation-prone phrases outside blockquotes: #sbf #ftx #crypto #fraud #democratic-donor #bipartisan #effective-altruism | The "effective altruism" packaging was the class innovation. SBF wrapped crypto  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Eli Lilly

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Eli Lilly.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Aerospace, Agriculture, Banking, Budget/Appropriations, Clea → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gilead Sciences

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Gilead Sciences.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 360 P.I.: Other, 470 Racketeer/Corrupt Organization, 835 Patent - → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Blackstone Real Estate

- **Path:** `Donors & Power Networks/Real Estate/Blackstone Real Estate.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 190 Contract: Other, 230 Rent Lease & Ejectment, 360 P.I.: Other, → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Lennar Corporation

- **Path:** `Donors & Power Networks/Real Estate/Lennar Corporation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: Lennar and Five Point developed and sold homes while the contamination fraud was | The Hunters Point development makes the class function explicit: Lennar extracte → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Real Estate Industry

- **Path:** `Donors & Power Networks/Real Estate/Real Estate Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 190 Contract: Other, 360 P.I.: Other, 370 Other Fraud, 791 Labor: → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Restaurant Association

- **Path:** `Donors & Power Networks/Restaurant & Food/National Restaurant Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Advertising, Agriculture, Animals, Arts/Entertainment, Autom → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Change Now

- **Path:** `Donors & Power Networks/Super PACs/Change Now.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Citizen Super PAC

- **Path:** `Donors & Power Networks/Super PACs/Citizen Super PAC.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Committee for Defending American Values

- **Path:** `Donors & Power Networks/Super PACs/Committee for Defending American Values.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Planned Parenthood Advocates of Kansas

- **Path:** `Donors & Power Networks/Super PACs/Planned Parenthood Advocates of Kansas.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Planned Parenthood of KS & Mid-MO

- **Path:** `Donors & Power Networks/Super PACs/Planned Parenthood of KS & Mid-MO.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Political Action for Lasting Security

- **Path:** `Donors & Power Networks/Super PACs/Political Action for Lasting Security.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sandre Swanson for Assembly 2010

- **Path:** `Donors & Power Networks/Super PACs/Sandre Swanson for Assembly 2010.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### VIGOP

- **Path:** `Donors & Power Networks/Super PACs/VIGOP.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Apple

- **Path:** `Donors & Power Networks/Tech & Crypto/Apple.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Agriculture, Aviation/Airlines/Airports, Banking, Budget/App → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ben Horowitz

- **Path:** `Donors & Power Networks/Tech & Crypto/Ben Horowitz.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brad Garlinghouse

- **Path:** `Donors & Power Networks/Tech & Crypto/Brad Garlinghouse.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brian Armstrong

- **Path:** `Donors & Power Networks/Tech & Crypto/Brian Armstrong.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Craft Ventures

- **Path:** `Donors & Power Networks/Tech & Crypto/Craft Ventures.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Alcohol and Drug Abuse, Beverage Industry, Budget/Appropriat → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Microsoft

- **Path:** `Donors & Power Networks/Tech & Crypto/Microsoft.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Budget/Appropriations, Communications/Broadcasting/Radio/TV, → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mithril Capital

- **Path:** `Donors & Power Networks/Tech & Crypto/Mithril Capital.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 13 Recovery of money/property - 548 fraudulent transfer; 14 Recov → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Oracle

- **Path:** `Donors & Power Networks/Tech & Crypto/Oracle.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Budget/Appropriations, Computer Industry, Consumer Issues/Sa → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### World Liberty Financial

- **Path:** `Donors & Power Networks/Tech & Crypto/World Liberty Financial.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: **Issues lobbied:** Agriculture, Alcohol and Drug Abuse, Animals, Apparel/Clothi → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Blackstone Group

- **Path:** `Donors & Power Networks/Wall Street/Blackstone Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 440 Civil Rights: Other, 443 Civil Rights: Accommodations, 448 Ci → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### CalPERS

- **Path:** `Donors & Power Networks/Wall Street/CalPERS.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 5 defamation-prone phrases outside blockquotes: The most revealing episode in CalPERS history: the placement agent bribery schem | **The scheme:** Villalobos paid Buenrostro approximately $250,000 in cash (deliv → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Goldman Sachs

- **Path:** `Donors & Power Networks/Wall Street/Goldman Sachs.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: - **Steven Mnuchin** (Goldman partner 1985–2002, CEO of Goldman Sachs Mortgage C | 6. **SEC Enforcement Reduction**. Goldman has faced zero criminal prosecutions r → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### JPMorgan Chase

- **Path:** `Donors & Power Networks/Wall Street/JPMorgan.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 4 defamation-prone phrases outside blockquotes: **$13 billion settlement without criminal charges (2013):** The Department of Ju | | Nov 2013 | $13B settlement | $9B fines + $4B relief | Civil immunity granted,  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Walmart

- **Path:** `Donors & Power Networks/Wall Street/Walmart.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `a-plus-legal-review` — 5 defamation-prone phrases outside blockquotes: The Walton heirs. Jim C. Walton, Alice Walton, Rob Walton, and their descendants | - **California Proposition 36** (criminal sentencing): $3.5+ million from Walton → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gregory Meeks

- **Path:** `Politicians/Democrats/House/Gregory Meeks/_Gregory Meeks Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: - [CREW: Most Corrupt Members of Congress 2013. Gregory Meeks](https://s3.amazon | - [Washington Times: Lawmaker with corrupt ties to Chávez represents U.S. at fun → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jamie Raskin

- **Path:** `Politicians/Democrats/House/Jamie Raskin/_Jamie Raskin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: | 2026-03-26 | HR.8123-119 | Finance and Financial Sector | STOP Corrupt Bets Ac | - [NPR: Raskin discusses Jan 6 referrals for Trump](https://www.npr.org/2022/12/ → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Joseph Morelle

- **Path:** `Politicians/Democrats/House/Joseph Morelle/_Joseph Morelle Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - HJRES 193: Proposing an amendment to the Constitution of the United States pro → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rashida Tlaib

- **Path:** `Politicians/Democrats/House/Rashida Tlaib/_Rashida Tlaib Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). → **occ: BLOCKED: OCC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | sec-edgar: BLOCKED: SEC EDGAR API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | PL 116-126 | 2020-03-18 | HR.5214-116 | Representative Payee Fraud Prevention  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Hickenlooper

- **Path:** `Politicians/Democrats/Senate/John Hickenlooper/_John Hickenlooper Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, ftc, federal-register, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. Transportation & Infrastructure oversees DOT contracts. → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | ftc: BLOCKED: FTC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | federal-register: BLOCKED: Federal Register API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: The Brownstein Hyatt Farber Schreck connection illustrates how the donor class o → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Raphael Warnock

- **Path:** `Politicians/Democrats/Senate/Raphael Warnock/_Raphael Warnock Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fda, ftc, usaspending. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Transportation & Infrastructure oversees DOT contracts. → **occ: BLOCKED: OCC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | sec-edgar: BLOCKED: SEC EDGAR API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | ftc: BLOCKED: FTC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — AMERICAN CROSSROADS, PEACHTREE PAC, NRSC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sheldon Whitehouse

- **Path:** `Politicians/Democrats/Senate/Sheldon Whitehouse/_Sheldon Whitehouse Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: - [Senator Whitehouse: The Scheme 30 — Update on Captured Supreme Court](https:/ | - [Senator Whitehouse: The Scheme 18 — Leonard Leo's $1.6 Billion Payday](https: → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chip Roy Master Profile

- **Path:** `Politicians/Republicans/House/Chip Roy/_Chip Roy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-03-24 | HR.8064-119 | Crime and Law Enforcement | Career Criminal Account → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jerry Moran

- **Path:** `Politicians/Republicans/Senate/Jerry Moran/_Jerry Moran Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - S 5472: A bill to authorize peace officer standards and training agencies to a → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Josh Hawley

- **Path:** `Politicians/Republicans/Senate/Josh Hawley/_Josh Hawley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-01-14 | S.3643-119 | Government Operations and Politics | Special Inspect → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — PATRIOTS PREVAIL PAC, Patriots Prevail PAC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rick Scott

- **Path:** `Politicians/Republicans/Senate/Rick Scott/_Rick Scott Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-legal-review` — 5 defamation-prone phrases outside blockquotes: #rick-scott #senate #florida #medicare-fraud #columbia-hca #self-funded #billion | ### The Fraud Fortune: → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ADM - Archer Daniels Midland

- **Path:** `Donors & Power Networks/Agriculture/ADM - Archer Daniels Midland.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: **Price-Fixing Legacy:** ADM was convicted of lysine and citric acid price-fixin | **Issues lobbied:** Agriculture, Banking, Budget/Appropriations, Civil Rights/Ci → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### CA Farm Bureau Federation

- **Path:** `Donors & Power Networks/Agriculture/CA Farm Bureau Federation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cargill

- **Path:** `Donors & Power Networks/Agriculture/Cargill.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Deere

- **Path:** `Donors & Power Networks/Agriculture/John Deere.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Monsanto - Bayer

- **Path:** `Donors & Power Networks/Agriculture/Monsanto - Bayer.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tyson Foods

- **Path:** `Donors & Power Networks/Agriculture/Tyson Foods.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Western Growers Association

- **Path:** `Donors & Power Networks/Agriculture/Western Growers Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ViaPath Technologies - GTL

- **Path:** `Donors & Power Networks/Carceral State/ViaPath Technologies - GTL.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bacardi - Bacardi USA

- **Path:** `Donors & Power Networks/Corporate/Bacardi - Bacardi USA.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Alliance Defending Freedom

- **Path:** `Donors & Power Networks/Dark Money/Alliance Defending Freedom.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### America Votes

- **Path:** `Donors & Power Networks/Dark Money/America Votes.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### American Action Network

- **Path:** `Donors & Power Networks/Dark Money/American Action Network.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brady Campaign

- **Path:** `Donors & Power Networks/Dark Money/Brady Campaign.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Business Roundtable

- **Path:** `Donors & Power Networks/Dark Money/Business Roundtable.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Council for National Policy

- **Path:** `Donors & Power Networks/Dark Money/Council for National Policy.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Media Matters

- **Path:** `Donors & Power Networks/Dark Money/Media Matters.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Association of Manufacturers

- **Path:** `Donors & Power Networks/Dark Money/National Association of Manufacturers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sports Betting Alliance

- **Path:** `Donors & Power Networks/Dark Money/Sports Betting Alliance.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### BAE Systems

- **Path:** `Donors & Power Networks/Defense & Intelligence/BAE Systems.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 442 Civil Rights: Jobs, 470 Racketeer/Corrupt Organization, 830 P → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Booz Allen Hamilton

- **Path:** `Donors & Power Networks/Defense & Intelligence/Booz Allen Hamilton.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Leidos

- **Path:** `Donors & Power Networks/Defense & Intelligence/Leidos.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Eli Broad Foundation

- **Path:** `Donors & Power Networks/Education/Eli Broad Foundation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Education Association

- **Path:** `Donors & Power Networks/Education/National Education Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### American Petroleum Institute

- **Path:** `Donors & Power Networks/Energy & Utilities/American Petroleum Institute.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chevron

- **Path:** `Donors & Power Networks/Energy & Utilities/Chevron.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Devon Energy

- **Path:** `Donors & Power Networks/Energy & Utilities/Devon Energy.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### General Motors

- **Path:** `Donors & Power Networks/Gig Economy/General Motors.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Lyft

- **Path:** `Donors & Power Networks/Gig Economy/Lyft.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Uber

- **Path:** `Donors & Power Networks/Gig Economy/Uber.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cigna Group

- **Path:** `Donors & Power Networks/Healthcare/Cigna Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Humana

- **Path:** `Donors & Power Networks/Healthcare/Humana.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### UnitedHealth Group - Optum

- **Path:** `Donors & Power Networks/Healthcare/UnitedHealth Group - Optum.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### DMFI - Democratic Majority for Israel

- **Path:** `Donors & Power Networks/Israel Lobby/DMFI - Democratic Majority for Israel.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### NORPAC

- **Path:** `Donors & Power Networks/Israel Lobby/NORPAC.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### AFGE - American Federation of Government Employees

- **Path:** `Donors & Power Networks/Labor Unions/AFGE - American Federation of Government Employees.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### AFL-CIO

- **Path:** `Donors & Power Networks/Labor Unions/AFL-CIO.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### AFSCME - American Federation of State County and Municipal Employees

- **Path:** `Donors & Power Networks/Labor Unions/AFSCME - American Federation of State County and Municipal Employees.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### California Nurses Association

- **Path:** `Donors & Power Networks/Labor Unions/California Nurses Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### IBEW - International Brotherhood of Electrical Workers

- **Path:** `Donors & Power Networks/Labor Unions/IBEW - International Brotherhood of Electrical Workers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### UNITE HERE

- **Path:** `Donors & Power Networks/Labor Unions/UNITE HERE.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### United Farm Workers

- **Path:** `Donors & Power Networks/Labor Unions/United Farm Workers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Leonard Leo

- **Path:** `Donors & Power Networks/Leonard Leo.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sinclair Broadcast Group

- **Path:** `Donors & Power Networks/Media & Entertainment/Sinclair Broadcast Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Telecom Industry

- **Path:** `Donors & Power Networks/Media & Entertainment/Telecom Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Adelson Family

- **Path:** `Donors & Power Networks/Mega-Donors/Adelson Family.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bernard Marcus

- **Path:** `Donors & Power Networks/Mega-Donors/Bernard Marcus.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bill Gates

- **Path:** `Donors & Power Networks/Mega-Donors/Bill Gates.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### David McIntosh

- **Path:** `Donors & Power Networks/Mega-Donors/David McIntosh.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Dustin Moskovitz

- **Path:** `Donors & Power Networks/Mega-Donors/Dustin Moskovitz.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Everytown for Gun Safety

- **Path:** `Donors & Power Networks/Mega-Donors/Everytown for Gun Safety.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### George Soros

- **Path:** `Donors & Power Networks/Mega-Donors/George Soros.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Harold Hamm

- **Path:** `Donors & Power Networks/Mega-Donors/Harold Hamm.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jeff Bezos

- **Path:** `Donors & Power Networks/Mega-Donors/Jeff Bezos.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jeffrey Yass

- **Path:** `Donors & Power Networks/Mega-Donors/Jeffrey Yass.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kelcy Warren

- **Path:** `Donors & Power Networks/Mega-Donors/Kelcy Warren.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ken Griffin

- **Path:** `Donors & Power Networks/Mega-Donors/Ken Griffin.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kenneth Griffin

- **Path:** `Donors & Power Networks/Mega-Donors/Kenneth Griffin.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Larry Ellison

- **Path:** `Donors & Power Networks/Mega-Donors/Larry Ellison.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Laurene Powell Jobs

- **Path:** `Donors & Power Networks/Mega-Donors/Laurene Powell Jobs.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mark Zuckerberg

- **Path:** `Donors & Power Networks/Mega-Donors/Mark Zuckerberg.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Michael Bloomberg

- **Path:** `Donors & Power Networks/Mega-Donors/Michael Bloomberg.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Miriam Adelson

- **Path:** `Donors & Power Networks/Mega-Donors/Miriam Adelson.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Peter Thiel

- **Path:** `Donors & Power Networks/Mega-Donors/Peter Thiel.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Reed Hastings

- **Path:** `Donors & Power Networks/Mega-Donors/Reed Hastings.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Richard and Elizabeth Uihlein

- **Path:** `Donors & Power Networks/Mega-Donors/Richard and Elizabeth Uihlein.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ross Stevens

- **Path:** `Donors & Power Networks/Mega-Donors/Ross Stevens.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sheldon & Miriam Adelson

- **Path:** `Donors & Power Networks/Mega-Donors/Sheldon Adelson.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Stephen Schwarzman

- **Path:** `Donors & Power Networks/Mega-Donors/Stephen Schwarzman.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Timothy Mellon

- **Path:** `Donors & Power Networks/Mega-Donors/Timothy Mellon.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Centene Corporation

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Centene Corporation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Novo Nordisk

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Novo Nordisk.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Pfizer Inc.

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Pfizer.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Invitation Homes - Institutional Landlords

- **Path:** `Donors & Power Networks/Real Estate/Invitation Homes - Institutional Landlords.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Moinian Group

- **Path:** `Donors & Power Networks/Real Estate/Moinian Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### California Apartment Association

- **Path:** `Donors & Power Networks/Real Estate & Housing/California Apartment Association.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### California Restaurant Association

- **Path:** `Donors & Power Networks/Restaurant & Food/California Restaurant Association.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Starbucks

- **Path:** `Donors & Power Networks/Restaurant & Food/Starbucks.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### United Democracy Project - UDP

- **Path:** `Donors & Power Networks/Super PACs/United Democracy Project - UDP.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Amazon

- **Path:** `Donors & Power Networks/Tech & Crypto/Amazon.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chris Larsen

- **Path:** `Donors & Power Networks/Tech & Crypto/Chris Larsen.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Eric Schmidt

- **Path:** `Donors & Power Networks/Tech & Crypto/Eric Schmidt.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Meta - Facebook

- **Path:** `Donors & Power Networks/Tech & Crypto/Meta - Facebook.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tech Industry

- **Path:** `Donors & Power Networks/Tech & Crypto/Tech Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### TikTok - ByteDance

- **Path:** `Donors & Power Networks/Tech & Crypto/TikTok - ByteDance.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Elliott Management

- **Path:** `Donors & Power Networks/Wall Street/Elliott Management.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Lawrence Summers

- **Path:** `Donors & Power Networks/Wall Street/Larry Summers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Alexandria Ocasio-Cortez Master Profile

- **Path:** `Politicians/Democrats/House/Alexandria Ocasio-Cortez/_Alexandria Ocasio-Cortez Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc, federal-register. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **ftc: BLOCKED: FTC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | federal-register: BLOCKED: Federal Register API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cori Bush

- **Path:** `Politicians/Democrats/House/Cori Bush/_Cori Bush Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — Fairshake PAC, United Democracy Project - UDP → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Frank Pallone

- **Path:** `Politicians/Democrats/House/Frank Pallone/_Frank Pallone Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc, federal-register. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **ftc: BLOCKED: FTC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | federal-register: BLOCKED: Federal Register API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim Himes

- **Path:** `Politicians/Democrats/House/Jim Himes/_Jim Himes Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Raja Krishnamoorthi

- **Path:** `Politicians/Democrats/House/Raja Krishnamoorthi/_Raja Krishnamoorthi Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rick Larsen

- **Path:** `Politicians/Democrats/House/Rick Larsen/_Rick Larsen Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Transportation & Infrastructure oversees DOT contracts. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ro Khanna

- **Path:** `Politicians/Democrats/House/Ro Khanna/_Ro Khanna Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rosa DeLauro

- **Path:** `Politicians/Democrats/House/Rosa DeLauro/_Rosa DeLauro Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Summer Lee

- **Path:** `Politicians/Democrats/House/Summer Lee/_Summer Lee Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — UNITED DEMOCRACY PROJECT (UDP), United Democracy Project - UDP → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Zoe Lofgren

- **Path:** `Politicians/Democrats/House/Zoe Lofgren/_Zoe Lofgren Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Josh Gottheimer

- **Path:** `Politicians/Democrats/House/_Josh Gottheimer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fara, opensanctions. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **occ: BLOCKED: OCC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | sec-edgar: BLOCKED: SEC EDGAR API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brian Schatz

- **Path:** `Politicians/Democrats/Senate/Brian Schatz/_Brian Schatz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Debbie Stabenow

- **Path:** `Politicians/Democrats/Senate/Debbie Stabenow/_Debbie Stabenow Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ed Markey

- **Path:** `Politicians/Democrats/Senate/Ed Markey/_Ed Markey Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). → **ftc: BLOCKED: FTC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hillary Clinton

- **Path:** `Politicians/Democrats/Senate/Hillary Clinton/_Hillary Clinton Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — KENTUCKIANS FOR STRONG LEADERSHIP, Kentuckians for Strong Leadership → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Maria Cantwell

- **Path:** `Politicians/Democrats/Senate/Maria Cantwell/_Maria Cantwell Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). → **ftc: BLOCKED: FTC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mark Warner

- **Path:** `Politicians/Democrats/Senate/Mark Warner/_Mark Warner Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Richard Blumenthal

- **Path:** `Politicians/Democrats/Senate/Richard Blumenthal/_Richard Blumenthal Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press, usaspending. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tammy Duckworth

- **Path:** `Politicians/Democrats/Senate/Tammy Duckworth/_Tammy Duckworth Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kyrsten Sinema

- **Path:** `Politicians/Independent/Kyrsten Sinema/_Kyrsten Sinema Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — DEFENDARIZONA, AMERICAN FUTURE FUND, DefendArizona → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Carlos Gimenez

- **Path:** `Politicians/Republicans/House/Carlos Gimenez/_Carlos Gimenez Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Transportation & Infrastructure oversees DOT contracts. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### James Comer

- **Path:** `Politicians/Republicans/House/James Comer/_James Comer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [PBS: Smirnov Guilty Plea](https://www.pbs.org/newshour/politics/former-fbi-in → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jodey Arrington

- **Path:** `Politicians/Republicans/House/Jodey Arrington/_Jodey Arrington Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tom Cole

- **Path:** `Politicians/Republicans/House/Tom Cole/_Tom Cole Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Frank Lucas Master Profile

- **Path:** `Politicians/Republicans/House/_Frank Lucas Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bill Hagerty

- **Path:** `Politicians/Republicans/Senate/Bill Hagerty.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - SJRES 12: Disapproving the action of the District of Columbia Council in appro → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Deb Fischer

- **Path:** `Politicians/Republicans/Senate/Deb Fischer/_Deb Fischer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Hoeven

- **Path:** `Politicians/Republicans/Senate/John Hoeven/_John Hoeven Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Joni Ernst Master Profile

- **Path:** `Politicians/Republicans/Senate/Joni Ernst/_Joni Ernst Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **fda: BLOCKED: FDA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Markwayne Mullin

- **Path:** `Politicians/Republicans/Senate/Markwayne Mullin/_Markwayne Mullin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ted Cruz

- **Path:** `Politicians/Republicans/Senate/Ted Cruz/_Ted Cruz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press, fara, opensanctions, ftc, usaspending. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Transportation & Infrastructure oversees DOT contracts. → **courtlistener: BLOCKED: CourtListener API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | doj-press: BLOCKED: DOJ Press API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | ftc: BLOCKED: FTC API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | usaspending: run CSV bulk: `node scripts/ingest-usaspending-bulk.cjs`**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Ratcliffe

- **Path:** `Politicians/Republicans/Trump Cabinet/John Ratcliffe/_John Ratcliffe Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **fara: BLOCKED: FARA API pipeline paused since 2026-04-24 — defer or resume GitHub Actions | opensanctions: BLOCKED: OpenSanctions API pipeline paused since 2026-04-24 — defer or resume GitHub Actions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Lee Zeldin

- **Path:** `Politicians/Republicans/Trump Cabinet/Lee Zeldin/_Lee Zeldin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2021-03-17 | HR.1995-117 | Immigration | Criminal Alien Gang Member Removal Ac → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Michael Waltz

- **Path:** `Politicians/Republicans/Trump Cabinet/Michael Waltz/_Michael Waltz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — AMERICAN JOBS AND GROWTH PAC, American Jobs and Growth PAC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Charles Koch

- **Path:** `Donors & Power Networks/Mega-Donors/Charles Koch.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Reid Hoffman

- **Path:** `Donors & Power Networks/Mega-Donors/Reid Hoffman.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Barbara Lee

- **Path:** `Politicians/Democrats/House/Barbara Lee.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hakeem Jeffries Master Profile

- **Path:** `Politicians/Democrats/House/Hakeem Jeffries/_Hakeem Jeffries Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Henry Cuellar

- **Path:** `Politicians/Democrats/House/Henry Cuellar/_Henry Cuellar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ilhan Omar

- **Path:** `Politicians/Democrats/House/Ilhan Omar/_Ilhan Omar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Melissa Bean

- **Path:** `Politicians/Democrats/House/Melissa Bean/_Melissa Bean Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Nancy Pelosi

- **Path:** `Politicians/Democrats/House/Nancy Pelosi/_Nancy Pelosi Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Dianne Feinstein

- **Path:** `Politicians/Democrats/Senate/Dianne Feinstein.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Harry Reid

- **Path:** `Politicians/Democrats/Senate/Harry Reid/_Harry Reid Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jon Ossoff

- **Path:** `Politicians/Democrats/Senate/Jon Ossoff/_Jon Ossoff Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Joe Manchin

- **Path:** `Politicians/Independent/Joe Manchin/_Joe Manchin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Katie Porter Master Profile

- **Path:** `Politicians/Races/CA Governor 2026/Katie Porter/_Katie Porter Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jason Smith

- **Path:** `Politicians/Republicans/House/Jason Smith/_Jason Smith Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Boehner

- **Path:** `Politicians/Republicans/House/John Boehner/_John Boehner Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mark Green

- **Path:** `Politicians/Republicans/House/Mark Green/_Mark Green Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Matt Gaetz

- **Path:** `Politicians/Republicans/House/Matt Gaetz/_Matt Gaetz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Nancy Mace

- **Path:** `Politicians/Republicans/House/Nancy Mace.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Patrick McHenry

- **Path:** `Politicians/Republicans/House/Patrick McHenry/_Patrick McHenry Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Paul Ryan

- **Path:** `Politicians/Republicans/House/Paul Ryan/_Paul Ryan Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Roger Williams

- **Path:** `Politicians/Republicans/House/Roger Williams/_Roger Williams Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Steve Scalise

- **Path:** `Politicians/Republicans/House/Steve Scalise/_Steve Scalise Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kevin McCarthy Master Profile

- **Path:** `Politicians/Republicans/House/_Kevin McCarthy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ashley Hinson Master Profile

- **Path:** `Politicians/Republicans/Senate/Ashley Hinson/_Ashley Hinson Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bernie Moreno

- **Path:** `Politicians/Republicans/Senate/Bernie Moreno.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Barrasso

- **Path:** `Politicians/Republicans/Senate/John Barrasso/_John Barrasso Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John McCain

- **Path:** `Politicians/Republicans/Senate/John McCain/_John McCain Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mitch McConnell Master Profile

- **Path:** `Politicians/Republicans/Senate/Mitch McConnell/_Mitch McConnell Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mitt Romney

- **Path:** `Politicians/Republicans/Senate/Mitt Romney/_Mitt Romney Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rand Paul

- **Path:** `Politicians/Republicans/Senate/Rand Paul/_Rand Paul Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kristi Noem

- **Path:** `Politicians/Republicans/Trump Cabinet/Kristi Noem/_Kristi Noem Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tulsi Gabbard

- **Path:** `Politicians/Republicans/Trump Cabinet/Tulsi Gabbard/_Tulsi Gabbard Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**
