---
title: Pipeline Janitor Report
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-26'
generated-by: scripts/pipeline-janitor.cjs
---

# Pipeline Janitor Report

Generated: 2026-04-26T00:48:25.898Z
Mode: DRY RUN (report only)

## Summary

- Profiles scanned: 3238
- Profiles at ready/verified audited: 606
- Profiles with issues: **606**
- Total issues: 1969

### By issue kind

- `a-plus-missing-story-grade`: 606
- `a-plus-missing-thesis`: 472
- `missing-block`: 448
- `zombie-block`: 135
- `a-plus-source-floor`: 125
- `a-plus-legal-review`: 87
- `a-plus-committee-cross-ref`: 81
- `a-plus-both-sides`: 11
- `known-gap-pipeline`: 4

## Findings

### Sam T. Liccardo

- **Path:** `Politicians/Democrats/House/Sam T. Liccardo/_Sam T. Liccardo Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (7):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=L000607 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fara, opensanctions. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: occ, sec-edgar, fara, opensanctions**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2025-11-10 | HR.6010-119 | Health | Insurance Fraud Accountability Act | → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### David J. Taylor

- **Path:** `Politicians/Republicans/House/David J. Taylor/_David J. Taylor Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (7):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=T000490 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fda, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-03-19 | HR.8028-119 | Agriculture and Food | SNAP Fraud Reporting Act of  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mark B. Messmer

- **Path:** `Politicians/Republicans/House/Mark B. Messmer/_Mark B. Messmer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (7):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001233 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: fda, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-02-26 | HR.7720-119 | Families | Child Care Payment Integrity and Fraud A → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ryan Zinke

- **Path:** `Politicians/Republicans/Trump Cabinet/Ryan Zinke/_Ryan Zinke Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (7):**
  - `zombie-block` — fec-candidate-id=H4MT01041 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=Z000018 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fara, opensanctions, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Deb Haaland

- **Path:** `Politicians/Democrats/Biden Cabinet/Deb Haaland/_Deb Haaland Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Marcia Fudge

- **Path:** `Politicians/Democrats/Biden Cabinet/Marcia Fudge/_Marcia Fudge Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `zombie-block` — fec-candidate-id=H8OH11141 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=F000455 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### April McClain Delaney

- **Path:** `Politicians/Democrats/House/April McClain Delaney/_April McClain Delaney Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001232 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Eugene Simon Vindman

- **Path:** `Politicians/Democrats/House/Eugene Simon Vindman/_Eugene Simon Vindman Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=V000138 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: fda, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gilbert Ray Cisneros

- **Path:** `Politicians/Democrats/House/Gilbert Ray Cisneros/_Gilbert Ray Cisneros Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=C001123 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Armed Services oversees defense contracts — must cross-ref USASpending awardees. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fara, opensanctions, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Herbert C. Conaway

- **Path:** `Politicians/Democrats/House/Herbert C. Conaway/_Herbert C. Conaway Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=C001136 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### James R. Walkinshaw

- **Path:** `Politicians/Democrats/House/James R. Walkinshaw/_James R. Walkinshaw Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=W000831 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fara, opensanctions, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Janelle S. Bynum

- **Path:** `Politicians/Democrats/House/Janelle S. Bynum/_Janelle S. Bynum Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=B001326 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). → **run pipelines: occ, sec-edgar**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John W. Mannion

- **Path:** `Politicians/Democrats/House/John W. Mannion/_John W. Mannion Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001231 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Johnny Olszewski

- **Path:** `Politicians/Democrats/House/Johnny Olszewski/_Johnny Olszewski Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=O000176 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, federal-register. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: fara, opensanctions, federal-register**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Luz M. Rivas

- **Path:** `Politicians/Democrats/House/Luz M. Rivas/_Luz M. Rivas Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=R000620 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: federal-register. Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: federal-register**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Nellie Pou

- **Path:** `Politicians/Democrats/House/Nellie Pou/_Nellie Pou Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=P000621 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fara, opensanctions, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gary Locke

- **Path:** `Politicians/Democrats/Obama Cabinet/Gary Locke/_Gary Locke Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hilda Solis

- **Path:** `Politicians/Democrats/Obama Cabinet/Hilda Solis/_Hilda Solis Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `zombie-block` — fec-candidate-id=H6CA38139 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=S001153 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Kerry

- **Path:** `Politicians/Democrats/Obama Cabinet/John Kerry/_John Kerry Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `zombie-block` — fec-candidate-id=S4MA00069 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=K000148 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ken Salazar

- **Path:** `Politicians/Democrats/Obama Cabinet/Ken Salazar/_Ken Salazar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `zombie-block` — fec-candidate-id=S4CO00163 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=S001163 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rahm Emanuel

- **Path:** `Politicians/Democrats/Obama Cabinet/Rahm Emanuel/_Rahm Emanuel Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=E000287 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Angela D. Alsobrooks

- **Path:** `Politicians/Democrats/Senate/Angela D. Alsobrooks/_Angela D. Alsobrooks Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=A000382 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fda, usaspending. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: occ, sec-edgar, fda, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Robert F. Kennedy Jr

- **Path:** `Politicians/Independent/Presidential/Robert F. Kennedy Jr/_Robert F. Kennedy Jr Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Abraham J. Hamadeh

- **Path:** `Politicians/Republicans/House/Abraham J. Hamadeh/_Abraham J. Hamadeh Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=H001098 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: fara, opensanctions, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Addison P. McDowell

- **Path:** `Politicians/Republicans/House/Addison P. McDowell/_Addison P. McDowell Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001240 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Craig A. Goldman

- **Path:** `Politicians/Republicans/House/Craig A. Goldman/_Craig A. Goldman Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=G000601 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc, federal-register. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: ftc, federal-register**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gabe Evans

- **Path:** `Politicians/Republicans/House/Gabe Evans/_Gabe Evans Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=E000300 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, ftc, federal-register. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: fara, opensanctions, ftc, federal-register**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jeff Hurd

- **Path:** `Politicians/Republicans/House/Jeff Hurd/_Jeff Hurd Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=H001100 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: federal-register, usaspending. Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: federal-register, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John J. McGuire

- **Path:** `Politicians/Republicans/House/John J. McGuire/_John J. McGuire Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001239 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fara, opensanctions, usaspending. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: occ, sec-edgar, fara, opensanctions, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Marlin A. Stutzman

- **Path:** `Politicians/Republicans/House/Marlin A. Stutzman/_Marlin A. Stutzman Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=S001188 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fara, opensanctions. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: occ, sec-edgar, fara, opensanctions**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Matt van Epps

- **Path:** `Politicians/Republicans/House/Matt van Epps/_Matt van Epps Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=V000139 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fara, opensanctions, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Nicholas J. Begich

- **Path:** `Politicians/Republicans/House/Nicholas J. Begich/_Nicholas J. Begich Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=B001323 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: federal-register, usaspending. Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: federal-register, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Riley M. Moore

- **Path:** `Politicians/Republicans/House/Riley M. Moore/_Riley M. Moore Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001235 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc, usaspending. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **run pipelines: ftc, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Robert F. Onder

- **Path:** `Politicians/Republicans/House/Robert F. Onder/_Robert F. Onder Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=O000177 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press, usaspending. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: courtlistener, doj-press, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Robert P. Bresnahan

- **Path:** `Politicians/Republicans/House/Robert P. Bresnahan/_Robert P. Bresnahan Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=B001327 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fda, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tom Barrett

- **Path:** `Politicians/Republicans/House/Tom Barrett/_Tom Barrett Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=B001321 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chuck Hagel

- **Path:** `Politicians/Republicans/Obama Cabinet/Chuck Hagel/_Chuck Hagel Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ray LaHood

- **Path:** `Politicians/Republicans/Obama Cabinet/Ray LaHood/_Ray LaHood Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=L000552 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### David McCormick

- **Path:** `Politicians/Republicans/Senate/David McCormick/_David McCormick Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001243 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fara, opensanctions, federal-register, usaspending. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: occ, sec-edgar, fara, opensanctions, federal-register, usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### James C. Justice

- **Path:** `Politicians/Republicans/Senate/James C. Justice/_James C. Justice Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=J000312 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, federal-register. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: fda, federal-register**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ben Carson

- **Path:** `Politicians/Republicans/Trump Cabinet/Ben Carson/_Ben Carson Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Dan Coats

- **Path:** `Politicians/Republicans/Trump Cabinet/Dan Coats/_Dan Coats Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jeff Sessions

- **Path:** `Politicians/Republicans/Trump Cabinet/Jeff Sessions/_Jeff Sessions Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rick Perry

- **Path:** `Politicians/Republicans/Trump Cabinet/Rick Perry/_Rick Perry Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (6):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Laphonza Butler

- **Path:** `Politicians/Democrats/Former/Laphonza Butler.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=B001320 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Christian D. Menefee

- **Path:** `Politicians/Democrats/House/Christian D. Menefee/_Christian D. Menefee Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M001245 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Nina Turner

- **Path:** `Politicians/Democrats/House/Nina Turner/_Nina Turner Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Julian Castro

- **Path:** `Politicians/Democrats/Obama Cabinet/Julian Castro/_Julian Castro Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bob Menendez

- **Path:** `Politicians/Democrats/Senate/Bob Menendez/_Bob Menendez Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=M000639 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: The class analysis is straightforward: Menendez proves that the campaign finance | - [FBI: Menendez and Melgen Indictment](https://www.fbi.gov/contact-us/field-off → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sheldon Whitehouse

- **Path:** `Politicians/Democrats/Senate/Sheldon Whitehouse/_Sheldon Whitehouse Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `zombie-block` — bioguide-id=W000802 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: courtlistener, doj-press**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: - [Senator Whitehouse: The Scheme 30 — Update on Captured Supreme Court](https:/ | - [Senator Whitehouse: The Scheme 18 — Leonard Leo's $1.6 Billion Payday](https: → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — Judicial Crisis Network → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bezalel Smotrich

- **Path:** `Politicians/International/Bezalel Smotrich.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Itamar Ben-Gvir

- **Path:** `Politicians/International/Itamar Ben-Gvir.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Volodymyr Zelenskyy

- **Path:** `Politicians/International/Volodymyr Zelenskyy.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Steve Hilton

- **Path:** `Politicians/Races/CA Governor 2026/Steve Hilton.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Lawler Master Profile

- **Path:** `Politicians/Republicans/House/Mike Lawler/_Mike Lawler Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Alan Armstrong

- **Path:** `Politicians/Republicans/Senate/Alan Armstrong/_Alan Armstrong Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=A000383 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim Inhofe

- **Path:** `Politicians/Republicans/Senate/Jim Inhofe/_Jim Inhofe Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=I000024 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: usaspending**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tom Cotton Master Profile

- **Path:** `Politicians/Republicans/Senate/Tom Cotton/_Tom Cotton Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=C001095 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending, federal-register. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Armed Services oversees defense contracts — must cross-ref USASpending awardees. Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: fara, opensanctions, usaspending, federal-register**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-04-15 | S.4303-119 | — | A bill to amend the Tariff Act of 1930 to provid → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Stephen Miller

- **Path:** `Politicians/Republicans/Trump Cabinet/Stephen Miller/_Stephen Miller Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (5):**
  - `zombie-block` — fec-candidate-id=H2NC07104 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: Denaturalization Program. February 2025. Miller activated denaturalization team: → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ACLU Foundation

- **Path:** `Donors & Power Networks/Dark Money/ACLU Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ALEC - American Legislative Exchange Council

- **Path:** `Donors & Power Networks/Dark Money/ALEC - American Legislative Exchange Council.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [Common Cause: ALEC Losing Clout Amid Controversy](https://www.commoncause.org → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Center for Popular Democracy

- **Path:** `Donors & Power Networks/Dark Money/Center for Popular Democracy.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ClimateWorks Foundation

- **Path:** `Donors & Power Networks/Dark Money/ClimateWorks Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Crossroads Grassroots Policy Strategies

- **Path:** `Donors & Power Networks/Dark Money/Crossroads Grassroots Policy Strategies.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cryptocurrency Industry Bloc , Fairshake PAC Network

- **Path:** `Donors & Power Networks/Dark Money/Cryptocurrency Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Equal Justice Initiative

- **Path:** `Donors & Power Networks/Dark Money/Equal Justice Initiative.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Federalist Society

- **Path:** `Donors & Power Networks/Dark Money/Federalist Society.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [Senator Whitehouse: The Scheme Speech 5 — The Federalist Society](https://www → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Finance and Tech Bundler Network

- **Path:** `Donors & Power Networks/Dark Money/Finance and Tech Bundler Network.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### LARA Fund - Mauricio Claver-Carone

- **Path:** `Donors & Power Networks/Dark Money/LARA Fund - Mauricio Claver-Carone.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Legal Sector Donors

- **Path:** `Donors & Power Networks/Dark Money/Legal Sector Donors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Progressive Donor Networks

- **Path:** `Donors & Power Networks/Dark Money/National Progressive Donor Networks.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Natural Resources Defense Council

- **Path:** `Donors & Power Networks/Dark Money/Natural Resources Defense Council.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### NEO Philanthropy

- **Path:** `Donors & Power Networks/Dark Money/NEO Philanthropy.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### North Fund

- **Path:** `Donors & Power Networks/Dark Money/North Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Open Society Foundations

- **Path:** `Donors & Power Networks/Dark Money/Open Society Foundations.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 3 defamation-prone phrases outside blockquotes: #donor #donor-node #dark-money #soros #progressive #democracy-infrastructure #in | [How [[George Soros|George Soros]] changed justice system in America](https://dn → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Proteus Fund

- **Path:** `Donors & Power Networks/Dark Money/Proteus Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Republican Party Apparatus

- **Path:** `Donors & Power Networks/Dark Money/Republican Party Apparatus.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sierra Club Foundation

- **Path:** `Donors & Power Networks/Dark Money/Sierra Club Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Stand Together Foundation

- **Path:** `Donors & Power Networks/Dark Money/Stand Together Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### The Barack Obama Foundation

- **Path:** `Donors & Power Networks/Dark Money/The Barack Obama Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### The Seminar Network

- **Path:** `Donors & Power Networks/Dark Money/The Seminar Network.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Vital Strategies

- **Path:** `Donors & Power Networks/Dark Money/Vital Strategies.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Boeing Defense

- **Path:** `Donors & Power Networks/Defense & Intelligence/Boeing Defense.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (4):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [CNBC: Judge dismisses Boeing case for 737 Max crashes at DOJ request](https:/ → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### PG&E

- **Path:** `Donors & Power Networks/Energy & Utilities/PG&E.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (4):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: #donor #utility #PGE #regulated-monopoly #wildfire #ratepayers #california #foll → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mohammed bin Salman

- **Path:** `Donors & Power Networks/Foreign/Mohammed bin Salman.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### United Arab Emirates - Influence Operation

- **Path:** `Donors & Power Networks/Foreign/United Arab Emirates - Influence Operation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tenet Healthcare

- **Path:** `Donors & Power Networks/Healthcare/Tenet Healthcare.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (4):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: #tenet #hospital #healthcare #for-profit #lobbying #medicaid #emergency #fraud # | - [Georgia AG: Landmark Kickback Settlement With Tenet Healthcare. Over $100 Mil → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### JCRC Bay Area

- **Path:** `Donors & Power Networks/Israel Lobby/JCRC Bay Area.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### PORAC - Peace Officers Research Association of California

- **Path:** `Donors & Power Networks/Law Enforcement/PORAC - Peace Officers Research Association of California.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### States Newsroom

- **Path:** `Donors & Power Networks/Media & Influence/States Newsroom.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bernie Marcus

- **Path:** `Donors & Power Networks/Mega-Donors/Bernie Marcus.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cambridge Analytica and the Data Weaponization of Elections

- **Path:** `Donors & Power Networks/Mega-Donors/Cambridge Analytica and the Data Weaponization of Elections.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Renaissance Technologies and the 7 Billion Dollar Tax Settlement

- **Path:** `Donors & Power Networks/Mega-Donors/Renaissance Technologies and the 7 Billion Dollar Tax Settlement.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rupert Murdoch

- **Path:** `Donors & Power Networks/Mega-Donors/Rupert Murdoch.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [NPR: Fox News headed for trial over Smartmatic election fraud claims](https:/ → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Wilks Brothers , Dan and Farris Wilks

- **Path:** `Donors & Power Networks/Mega-Donors/Wilks Brothers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Anthem PAC

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Anthem PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Purdue Pharma - Sackler Family

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Purdue Pharma - Sackler Family.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (4):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: Purdue admitted it conspired to impede the DEA by misrepresenting its anti-diver | - [HHS OIG: Purdue Pharma pleads guilty to fraud and kickback conspiracies](http → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cayre Family

- **Path:** `Donors & Power Networks/Real Estate/Cayre Family.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tisch Family

- **Path:** `Donors & Power Networks/Real Estate/Tisch Family.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Affordable Chicago Now PAC

- **Path:** `Donors & Power Networks/Super PACs/Affordable Chicago Now PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### America PAC - Elon Musk

- **Path:** `Donors & Power Networks/Super PACs/America PAC - Elon Musk.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Americans for Job Security

- **Path:** `Donors & Power Networks/Super PACs/Americans for Job Security.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C30001135 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Arizonans for Affordable Electricity

- **Path:** `Donors & Power Networks/Super PACs/Arizonans for Affordable Electricity.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C90018292 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Change Now

- **Path:** `Donors & Power Networks/Super PACs/Change Now.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C00683599 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Citizen Super PAC

- **Path:** `Donors & Power Networks/Super PACs/Citizen Super PAC.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C00496927 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Committee for Defending American Values

- **Path:** `Donors & Power Networks/Super PACs/Committee for Defending American Values.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C00759142 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### FF PAC

- **Path:** `Donors & Power Networks/Super PACs/FF PAC.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Illinois Future PAC

- **Path:** `Donors & Power Networks/Super PACs/Illinois Future PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### MAGA Inc

- **Path:** `Donors & Power Networks/Super PACs/MAGA Inc.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [Campaign Legal Center: Straw donor scheme involving MAGA Inc contributions](h → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Marble Freedom Trust

- **Path:** `Donors & Power Networks/Super PACs/Marble Freedom Trust.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Opportunity PAC - a Coalition of Teachers Health Care Givers Faculty Members School Employees and Public and Pr

- **Path:** `Donors & Power Networks/Super PACs/Opportunity PAC - a Coalition of Teachers Health Care Givers Faculty Members School Employees and....md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C90016841 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Planned Parenthood Advocates of Kansas

- **Path:** `Donors & Power Networks/Super PACs/Planned Parenthood Advocates of Kansas.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C90006719 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Planned Parenthood of KS & Mid-MO

- **Path:** `Donors & Power Networks/Super PACs/Planned Parenthood of KS & Mid-MO.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C90006032 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Political Action for Lasting Security

- **Path:** `Donors & Power Networks/Super PACs/Political Action for Lasting Security.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C00174748 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sandre Swanson for Assembly 2010

- **Path:** `Donors & Power Networks/Super PACs/Sandre Swanson for Assembly 2010.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C90012618 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Save America PAC

- **Path:** `Donors & Power Networks/Super PACs/Save America PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: [Source: [NPR: January 6 Panel. Trump Campaign Misled Donors](https://www.npr.or | - [NPR: January 6 Panel. Trump Campaign Misled Donors](https://www.npr.org/2022/ → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Susan B. Anthony Pro-Life America PAC

- **Path:** `Donors & Power Networks/Super PACs/Susan B. Anthony Pro-Life America PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### SV&B PAC

- **Path:** `Donors & Power Networks/Super PACs/SV&B PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### The 60 Plus Association

- **Path:** `Donors & Power Networks/Super PACs/The 60 Plus Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C30001671 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Trump Victory

- **Path:** `Donors & Power Networks/Super PACs/Trump Victory.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: ### The State Party Pass-Through Scheme → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### VIGOP

- **Path:** `Donors & Power Networks/Super PACs/VIGOP.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `zombie-block` — fec-committee-id=C00553560 but no <!-- auto:fec-donor --> block in body → **re-run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ben Horowitz

- **Path:** `Donors & Power Networks/Tech & Crypto/Ben Horowitz.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brad Garlinghouse

- **Path:** `Donors & Power Networks/Tech & Crypto/Brad Garlinghouse.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brian Armstrong

- **Path:** `Donors & Power Networks/Tech & Crypto/Brian Armstrong.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### FTX - Sam Bankman-Fried

- **Path:** `Donors & Power Networks/Tech & Crypto/FTX - Sam Bankman-Fried.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 5 defamation-prone phrases outside blockquotes: #donor #crypto #dark-money #fraud #class-analysis #follow-the-money #both-sides- | ### Class Analysis — Fraud as Political Infrastructure → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Silicon Valley Democratic Donor Network

- **Path:** `Donors & Power Networks/Tech & Crypto/Silicon Valley Democratic Donor Network.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tech and Media Donors

- **Path:** `Donors & Power Networks/Tech & Crypto/Tech and Media Donors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bank of America Charitable Gift Fund

- **Path:** `Donors & Power Networks/Wall Street/Bank of America Charitable Gift Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bank of America

- **Path:** `Donors & Power Networks/Wall Street/Bank of America.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (4):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [Department of Justice: Bank of America $16.65 billion settlement](https://www → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Blue Meridian Partners

- **Path:** `Donors & Power Networks/Wall Street/Blue Meridian Partners.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hedge Fund Industry Bloc

- **Path:** `Donors & Power Networks/Wall Street/Hedge Fund Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Private Equity Industry Bloc

- **Path:** `Donors & Power Networks/Wall Street/Private Equity Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### QVT Financial

- **Path:** `Donors & Power Networks/Wall Street/QVT Financial.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (4):**
  - `known-gap-pipeline` — known-gaps mentions "Auto-blocks stripped" — should be draft → **demote to draft**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Renaissance Charitable Foundation

- **Path:** `Donors & Power Networks/Wall Street/Renaissance Charitable Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Robin Hood Foundation

- **Path:** `Donors & Power Networks/Wall Street/Robin Hood Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Wall Street Bloc

- **Path:** `Donors & Power Networks/Wall Street/Wall Street Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Wall Street Finance PACs

- **Path:** `Donors & Power Networks/Wall Street/Wall Street Finance PACs.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Wells Fargo

- **Path:** `Donors & Power Networks/Wall Street/Wells Fargo.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (4):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-legal-review` — 4 defamation-prone phrases outside blockquotes: #wells-fargo #wall-street #consumer #fraud #fake-accounts #banking #charlotte | Wells Fargo is the clearest demonstration in the vault that "too big to fail" me → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brownstein Hyatt Farber Schreck

- **Path:** `Lobbying Firms & K Street/Brownstein Hyatt Farber Schreck.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (4):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [Common Dreams: Oil Lobbyist Turned Interior Chief Proposes Giving Contract to → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Pete Buttigieg

- **Path:** `Politicians/Democrats/Biden Cabinet/Pete Buttigieg/_Pete Buttigieg Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ayanna Pressley Master Profile

- **Path:** `Politicians/Democrats/House/Ayanna Pressley/_Ayanna Pressley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `known-gap-pipeline` — known-gaps mentions "Needs re-enrichment" — should be draft → **demote to draft**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). → **run pipelines: occ, sec-edgar**
  - `a-plus-legal-review` — 11 defamation-prone phrases outside blockquotes: #pressley #massachusetts #progressive #squad #financial-services #criminal-justi | Pressley is the least media-visible Squad member but arguably the most legislati → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Greg Casar Master Profile

- **Path:** `Politicians/Democrats/House/Greg Casar/_Greg Casar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — fec-candidate-id=H2TX35108 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=C001131 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gregory Meeks

- **Path:** `Politicians/Democrats/House/Gregory Meeks/_Gregory Meeks Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — bioguide-id=M001137 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: - [CREW: Most Corrupt Members of Congress 2013. Gregory Meeks](https://s3.amazon | - [Washington Times: Lawmaker with corrupt ties to Chávez represents U.S. at fun → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jerry Nadler

- **Path:** `Politicians/Democrats/House/Jerry Nadler/_Jerry Nadler Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: courtlistener, doj-press**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Dick Durbin

- **Path:** `Politicians/Democrats/Senate/Dick Durbin/_Dick Durbin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: courtlistener, doj-press**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Graham Platner Master Profile

- **Path:** `Politicians/Democrats/Senate/Graham Platner/_Graham Platner Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — fec-candidate-id=S6ME00373 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Raphael Warnock

- **Path:** `Politicians/Democrats/Senate/Raphael Warnock/_Raphael Warnock Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — bioguide-id=W000790 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fda, ftc, usaspending. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: occ, sec-edgar, fda, ftc, usaspending**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — AMERICAN CROSSROADS, PEACHTREE PAC, NRSC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Benjamin Netanyahu

- **Path:** `Politicians/International/Benjamin Netanyahu/_Benjamin Netanyahu Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 1 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Betty Yee

- **Path:** `Politicians/Races/CA Governor 2026/Betty Yee/_Betty Yee Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Eric Swalwell Master Profile

- **Path:** `Politicians/Races/CA Governor 2026/Eric Swalwell/_Eric Swalwell Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — fec-candidate-id=H2CA15094 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chip Roy Master Profile

- **Path:** `Politicians/Republicans/House/Chip Roy/_Chip Roy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — bioguide-id=R000614 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: courtlistener, doj-press**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-03-24 | HR.8064-119 | Crime and Law Enforcement | Career Criminal Account → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim Jordan

- **Path:** `Politicians/Republicans/House/Jim Jordan/_Jim Jordan Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=J000289 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: courtlistener, doj-press**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jodey Arrington

- **Path:** `Politicians/Republicans/House/Jodey Arrington/_Jodey Arrington Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — fec-candidate-id=H6TX19099 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=A000375 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Marjorie Taylor Greene

- **Path:** `Politicians/Republicans/House/Marjorie Taylor Greene/_Marjorie Taylor Greene Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `zombie-block` — bioguide-id=G000596 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — GEORGIANS FOR STRONG FAMILIES, INC., THE LINCOLN PROJECT, A GREAT AMERICA PAC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Rogers

- **Path:** `Politicians/Republicans/House/Mike Rogers/_Mike Rogers Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=R000575 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tom Cole

- **Path:** `Politicians/Republicans/House/Tom Cole/_Tom Cole Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — fec-candidate-id=H2OK04055 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=C001053 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### George W. Bush

- **Path:** `Politicians/Republicans/Presidential/George W Bush/_George W Bush Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — NRA POLITICAL VICTORY FUND → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bill Cassidy Master Profile

- **Path:** `Politicians/Republicans/Senate/Bill Cassidy/_Bill Cassidy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=C001075 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, federal-register. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: fda, federal-register**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chuck Grassley

- **Path:** `Politicians/Republicans/Senate/Chuck Grassley/_Chuck Grassley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=G000386 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, courtlistener, doj-press. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: fda, courtlistener, doj-press**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jerry Moran

- **Path:** `Politicians/Republicans/Senate/Jerry Moran/_Jerry Moran Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — bioguide-id=M000934 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - S 5472: A bill to authorize peace officer standards and training agencies to a → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim Risch

- **Path:** `Politicians/Republicans/Senate/Jim Risch/_Jim Risch Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=R000584 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Joni Ernst Master Profile

- **Path:** `Politicians/Republicans/Senate/Joni Ernst/_Joni Ernst Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — fec-candidate-id=S4IA00129 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=E000295 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Josh Hawley

- **Path:** `Politicians/Republicans/Senate/Josh Hawley/_Josh Hawley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — bioguide-id=H001089 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | 2026-01-14 | S.3643-119 | Government Operations and Politics | Special Inspect → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — PATRIOTS PREVAIL PAC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Michael Whatley

- **Path:** `Politicians/Republicans/Senate/Michael Whatley/_Michael Whatley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rick Scott

- **Path:** `Politicians/Republicans/Senate/Rick Scott/_Rick Scott Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `zombie-block` — fec-candidate-id=S8FL00273 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions, usaspending. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: fara, opensanctions, usaspending**
  - `a-plus-legal-review` — 5 defamation-prone phrases outside blockquotes: #rick-scott #senate #florida #medicare-fraud #columbia-hca #self-funded #billion | ### The Fraud Fortune: → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### David Sacks

- **Path:** `Politicians/Republicans/Trump Cabinet/David Sacks/_David Sacks Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Pompeo

- **Path:** `Politicians/Republicans/Trump Cabinet/Mike Pompeo/_Mike Pompeo Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=P000602 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### JD Vance Master Profile

- **Path:** `Politicians/Republicans/Vice Presidential/JD Vance/_JD Vance Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (4):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - Hillbilly Elegy and the Class Fraud → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Agribusiness Donor Bloc

- **Path:** `Donors & Power Networks/Agriculture/Agribusiness Donor Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Agricultural Labor Vulnerability Donors

- **Path:** `Donors & Power Networks/Agriculture/Agricultural Labor Vulnerability Donors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### American Farm Bureau Federation

- **Path:** `Donors & Power Networks/Agriculture/American Farm Bureau Federation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: The American Farm Bureau Federation is a case study in institutional identity fr | **Issues lobbied:** Aerospace, Agriculture, Animals, Arts/Entertainment, Automot → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Fanjul Family - Florida Crystals

- **Path:** `Donors & Power Networks/Agriculture/Fanjul Family - Florida Crystals.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Aramark

- **Path:** `Donors & Power Networks/Carceral State/Aramark.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bail Bond Industry

- **Path:** `Donors & Power Networks/Carceral State/Bail Bond Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### CCPOA - California Correctional Peace Officers Association

- **Path:** `Donors & Power Networks/Carceral State/CCPOA - California Correctional Peace Officers Association.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### CoreCivic - Private Prisons

- **Path:** `Donors & Power Networks/Carceral State/CoreCivic - Private Prisons.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Securus Technologies - Aventiv

- **Path:** `Donors & Power Networks/Carceral State/Securus Technologies - Aventiv.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### America First Policy Institute

- **Path:** `Donors & Power Networks/Dark Money/America First Policy Institute.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Americans for Tax Reform - Grover Norquist

- **Path:** `Donors & Power Networks/Dark Money/Americans for Tax Reform - Grover Norquist.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Arabella Advisors

- **Path:** `Donors & Power Networks/Dark Money/Arabella Advisors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ballard Partners

- **Path:** `Donors & Power Networks/Dark Money/Ballard Partners.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Concerned Veterans for America

- **Path:** `Donors & Power Networks/Dark Money/Concerned Veterans for America.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### CREW - Citizens for Responsibility and Ethics in Washington

- **Path:** `Donors & Power Networks/Dark Money/CREW - Citizens for Responsibility and Ethics in Washington.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Democratic Donor Network

- **Path:** `Donors & Power Networks/Dark Money/Democratic Donor Network.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Democratic Party Infrastructure

- **Path:** `Donors & Power Networks/Dark Money/Democratic Party Infrastructure.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Democratic Small Dollar Networks

- **Path:** `Donors & Power Networks/Dark Money/Democratic Small Dollar Networks.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Donors Capital Fund

- **Path:** `Donors & Power Networks/Dark Money/Donors Capital Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Entertainment and Hollywood Donors

- **Path:** `Donors & Power Networks/Dark Money/Entertainment and Hollywood Donors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Environmental Law & Policy Center

- **Path:** `Donors & Power Networks/Dark Money/Environmental Law & Policy Center.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### House Freedom Caucus

- **Path:** `Donors & Power Networks/Dark Money/Freedom Caucus.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Gun Owners of America

- **Path:** `Donors & Power Networks/Dark Money/Gun Owners of America.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### HBW Resources

- **Path:** `Donors & Power Networks/Dark Money/HBW Resources.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Healthcare Sector

- **Path:** `Donors & Power Networks/Dark Money/Healthcare Sector.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Majority Forward

- **Path:** `Donors & Power Networks/Dark Money/Majority Forward.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### New Venture Fund

- **Path:** `Donors & Power Networks/Dark Money/New Venture Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ocean Conservancy

- **Path:** `Donors & Power Networks/Dark Money/Ocean Conservancy.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ohio Federation of Teachers

- **Path:** `Donors & Power Networks/Dark Money/Ohio Federation of Teachers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Organizing for Action

- **Path:** `Donors & Power Networks/Dark Money/Organizing for Action.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Small Dollar Donors - ActBlue

- **Path:** `Donors & Power Networks/Dark Money/Small Dollar Donors - ActBlue.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### The 85 Fund

- **Path:** `Donors & Power Networks/Dark Money/The 85 Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### TPUSA - Turning Point USA

- **Path:** `Donors & Power Networks/Dark Money/TPUSA - Turning Point USA.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Trial Lawyers Fund

- **Path:** `Donors & Power Networks/Dark Money/Trial Lawyers Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Trump 2024 Campaign

- **Path:** `Donors & Power Networks/Dark Money/Trump 2024 Campaign.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Trump Donor Coalition

- **Path:** `Donors & Power Networks/Dark Money/Trump Donor Coalition.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### US Chamber of Commerce

- **Path:** `Donors & Power Networks/Dark Money/US Chamber of Commerce.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Boeing

- **Path:** `Donors & Power Networks/Defense & Intelligence/Boeing.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Defense Contractors Bloc

- **Path:** `Donors & Power Networks/Defense & Intelligence/Defense Contractors Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Defense Contractors

- **Path:** `Donors & Power Networks/Defense & Intelligence/Defense Contractors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Defense Industry Bloc

- **Path:** `Donors & Power Networks/Defense & Intelligence/Defense Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Defense Industry

- **Path:** `Donors & Power Networks/Defense & Intelligence/Defense Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### General Dynamics

- **Path:** `Donors & Power Networks/Defense & Intelligence/General Dynamics.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Honeywell International

- **Path:** `Donors & Power Networks/Defense & Intelligence/Honeywell.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### L3 Technologies

- **Path:** `Donors & Power Networks/Defense & Intelligence/L3 Technologies.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### L3Harris Technologies

- **Path:** `Donors & Power Networks/Defense & Intelligence/L3Harris Technologies.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Lockheed Martin

- **Path:** `Donors & Power Networks/Defense & Intelligence/Lockheed Martin.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Northrop Grumman

- **Path:** `Donors & Power Networks/Defense & Intelligence/Northrop Grumman.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Nucor Corporation

- **Path:** `Donors & Power Networks/Defense & Intelligence/Nucor Corporation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### California Charter Schools Association

- **Path:** `Donors & Power Networks/Education/California Charter Schools Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### DeVos Family

- **Path:** `Donors & Power Networks/Education/DeVos Family.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Student Loan Servicer Industry

- **Path:** `Donors & Power Networks/Education/Student Loan Servicer Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Walton Family Foundation

- **Path:** `Donors & Power Networks/Education/Walton Family Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Alabama Power

- **Path:** `Donors & Power Networks/Energy & Utilities/Alabama Power.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Consumer Energy Alliance

- **Path:** `Donors & Power Networks/Energy & Utilities/Consumer Energy Alliance.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Duke Energy

- **Path:** `Donors & Power Networks/Energy & Utilities/Duke Energy.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Ethanol Industry

- **Path:** `Donors & Power Networks/Energy & Utilities/Ethanol Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### ExxonMobil

- **Path:** `Donors & Power Networks/Energy & Utilities/ExxonMobil.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Fossil Fuel Bloc

- **Path:** `Donors & Power Networks/Energy & Utilities/Fossil Fuel Bloc.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Halliburton

- **Path:** `Donors & Power Networks/Energy & Utilities/Halliburton.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hawaiian Electric Company

- **Path:** `Donors & Power Networks/Energy & Utilities/Hawaiian Electric Company.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Koch Industries

- **Path:** `Donors & Power Networks/Energy & Utilities/Koch Industries.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Marathon Petroleum

- **Path:** `Donors & Power Networks/Energy & Utilities/Marathon Petroleum.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### NextEra Energy

- **Path:** `Donors & Power Networks/Energy & Utilities/NextEra Energy.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Occidental Petroleum

- **Path:** `Donors & Power Networks/Energy & Utilities/Occidental Petroleum.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Oil & Gas PACs

- **Path:** `Donors & Power Networks/Energy & Utilities/Oil & Gas PACs.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Petrochemical Industry Bloc

- **Path:** `Donors & Power Networks/Energy & Utilities/Petrochemical Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### PG&E - Pacific Gas and Electric

- **Path:** `Donors & Power Networks/Energy & Utilities/PG&E - Pacific Gas and Electric.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Western States Petroleum Association

- **Path:** `Donors & Power Networks/Energy & Utilities/Western States Petroleum Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Williams Companies

- **Path:** `Donors & Power Networks/Energy & Utilities/Williams Companies.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### WSPA - Western States Petroleum Association

- **Path:** `Donors & Power Networks/Energy & Utilities/WSPA - Western States Petroleum Association.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gulf State Money - Saudi Arabia, UAE, Qatar

- **Path:** `Donors & Power Networks/Foreign/Gulf State Money - Saudi Arabia, UAE, Qatar.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Israel - Government Lobbying Operation

- **Path:** `Donors & Power Networks/Foreign/Israel - Government Lobbying Operation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Saudi Arabia - Kingdom Investment

- **Path:** `Donors & Power Networks/Foreign/Saudi Arabia - Kingdom Investment.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Turkey - Erdogan Lobbying Operation

- **Path:** `Donors & Power Networks/Foreign/Turkey - Erdogan Lobbying Operation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Airbnb

- **Path:** `Donors & Power Networks/Gig Economy/Airbnb.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### DoorDash

- **Path:** `Donors & Power Networks/Gig Economy/DoorDash.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Flex Association

- **Path:** `Donors & Power Networks/Gig Economy/Flex Association.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ford Motor Company

- **Path:** `Donors & Power Networks/Gig Economy/Ford Motor Company.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Instacart

- **Path:** `Donors & Power Networks/Gig Economy/Instacart.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Anthem - Elevance Health Political Operation

- **Path:** `Donors & Power Networks/Healthcare/Anthem - Elevance Health Political Operation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Blue Cross Blue Shield Association

- **Path:** `Donors & Power Networks/Healthcare/Blue Cross Blue Shield Association.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Civica Rx

- **Path:** `Donors & Power Networks/Healthcare/Civica Rx.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hospital Corporation of America - HCA

- **Path:** `Donors & Power Networks/Healthcare/Hospital Corporation of America - HCA.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Insurance Industry Bloc

- **Path:** `Donors & Power Networks/Healthcare/Insurance Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Kaiser Permanente

- **Path:** `Donors & Power Networks/Healthcare/Kaiser Permanente.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### PBM Industry Bloc - OptumRx, CVS Caremark, Express Scripts

- **Path:** `Donors & Power Networks/Healthcare Industry/PBM Industry Bloc - OptumRx, CVS Caremark, Express Scripts.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Christians United for Israel

- **Path:** `Donors & Power Networks/Israel Lobby/Christians United for Israel.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### DMFI - Democratic Majority for Israel

- **Path:** `Donors & Power Networks/Israel Lobby/DMFI - Democratic Majority for Israel.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### One Israel Fund

- **Path:** `Donors & Power Networks/Israel Lobby/One Israel Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jeffrey Epstein Network

- **Path:** `Donors & Power Networks/Jeffrey Epstein Network.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### California Building and Construction Trades Council

- **Path:** `Donors & Power Networks/Labor Unions/California Building and Construction Trades Council.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### IBEW California State Association

- **Path:** `Donors & Power Networks/Labor Unions/IBEW California State Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### IBEW Local 440 - Riverside

- **Path:** `Donors & Power Networks/Labor Unions/IBEW Local 440 - Riverside.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### IBEW Local 477 - San Bernardino

- **Path:** `Donors & Power Networks/Labor Unions/IBEW Local 477 - San Bernardino.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### UFCW - United Food and Commercial Workers

- **Path:** `Donors & Power Networks/Labor Unions/UFCW - United Food and Commercial Workers.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### International Association of Chiefs of Police

- **Path:** `Donors & Power Networks/Law Enforcement/International Association of Chiefs of Police.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Riverside Sheriffs Association

- **Path:** `Donors & Power Networks/Law Enforcement/Riverside Sheriffs Association.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Leonard Leo

- **Path:** `Donors & Power Networks/Leonard Leo.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Comcast - NBCUniversal

- **Path:** `Donors & Power Networks/Media & Entertainment/Comcast - NBCUniversal.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hollywood Democratic Donor Network

- **Path:** `Donors & Power Networks/Media & Entertainment/Hollywood Democratic Donor Network.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### iHeartMedia

- **Path:** `Donors & Power Networks/Media & Entertainment/iHeartMedia.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Sinclair Broadcasting Group

- **Path:** `Donors & Power Networks/Media & Entertainment/Sinclair Broadcasting Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Verizon

- **Path:** `Donors & Power Networks/Media & Entertainment/Verizon.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Walt Disney Company

- **Path:** `Donors & Power Networks/Media & Entertainment/Walt Disney Company.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ajay Royan

- **Path:** `Donors & Power Networks/Mega-Donors/Ajay Royan.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Centene Corporation PAC

- **Path:** `Donors & Power Networks/Mega-Donors/Centene Corporation PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Dustin Moskovitz

- **Path:** `Donors & Power Networks/Mega-Donors/Dustin Moskovitz.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gates Foundation

- **Path:** `Donors & Power Networks/Mega-Donors/Gates Foundation.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### George Soros

- **Path:** `Donors & Power Networks/Mega-Donors/George Soros.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jeffrey Yass

- **Path:** `Donors & Power Networks/Mega-Donors/Jeffrey Yass.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kelcy Warren - Energy Transfer Partners

- **Path:** `Donors & Power Networks/Mega-Donors/Kelcy Warren - Energy Transfer Partners.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kelcy Warren

- **Path:** `Donors & Power Networks/Mega-Donors/Kelcy Warren.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Koch Network - Charles Koch

- **Path:** `Donors & Power Networks/Mega-Donors/Koch Network - Charles Koch.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Koch network

- **Path:** `Donors & Power Networks/Mega-Donors/Koch network.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Laurene Powell Jobs

- **Path:** `Donors & Power Networks/Mega-Donors/Laurene Powell Jobs.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Les Wexner - Wexner Family Enterprises

- **Path:** `Donors & Power Networks/Mega-Donors/Les Wexner - Wexner Family Enterprises.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Michael Bloomberg

- **Path:** `Donors & Power Networks/Mega-Donors/Michael Bloomberg.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Miriam Adelson

- **Path:** `Donors & Power Networks/Mega-Donors/Miriam Adelson.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Narya Capital

- **Path:** `Donors & Power Networks/Mega-Donors/Narya Capital.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Palantir Technologies Political Operation

- **Path:** `Donors & Power Networks/Mega-Donors/Palantir Technologies Political Operation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Palantir Technologies

- **Path:** `Donors & Power Networks/Mega-Donors/Palantir.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Peter Thiel

- **Path:** `Donors & Power Networks/Mega-Donors/Peter Thiel.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Richard and Elizabeth Uihlein

- **Path:** `Donors & Power Networks/Mega-Donors/Richard and Elizabeth Uihlein.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-source-floor` — only 2 Tier 1 source types (A+ requires 3+) → **add more Tier 1 sources or run more cross-ref pipelines**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Robert Mercer

- **Path:** `Donors & Power Networks/Mega-Donors/Robert Mercer.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | Case Types | 365 Personal Inj. Prod. Liability, 440 Civil Rights: Other, 470 R → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ross Stevens

- **Path:** `Donors & Power Networks/Mega-Donors/Ross Stevens.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Sheldon & Miriam Adelson

- **Path:** `Donors & Power Networks/Mega-Donors/Sheldon Adelson.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Stephen Schwarzman

- **Path:** `Donors & Power Networks/Mega-Donors/Stephen Schwarzman.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Susquehanna International Group

- **Path:** `Donors & Power Networks/Mega-Donors/Susquehanna International Group.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Timothy Mellon

- **Path:** `Donors & Power Networks/Mega-Donors/Timothy Mellon.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### UPS

- **Path:** `Donors & Power Networks/Mega-Donors/UPS.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Walmart - Walton Family

- **Path:** `Donors & Power Networks/Mega-Donors/Walmart - Walton Family.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Winklevoss Twins

- **Path:** `Donors & Power Networks/Mega-Donors/Winklevoss Twins.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### AbbVie

- **Path:** `Donors & Power Networks/Pharma & Healthcare/AbbVie.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Johnson & Johnson

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Johnson & Johnson.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Meatpacking Corporations

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Meatpacking Corporations.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Merck

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Merck.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Moderna

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Moderna.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Pharmaceutical Industry Bloc

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Pharmaceutical Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Pharmaceutical Industry

- **Path:** `Donors & Power Networks/Pharma & Healthcare/Pharmaceutical Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### PhRMA - Pharmaceutical Research and Manufacturers of America

- **Path:** `Donors & Power Networks/Pharma & Healthcare/PhRMA.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### CBRE Group

- **Path:** `Donors & Power Networks/Real Estate/CBRE Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Las Vegas Sands

- **Path:** `Donors & Power Networks/Real Estate/Las Vegas Sands.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### National Association of Realtors

- **Path:** `Donors & Power Networks/Real Estate/National Association of Realtors.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Real Estate Board of New York

- **Path:** `Donors & Power Networks/Real Estate/Real Estate Board of New York.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Real Estate Development Industry Bloc

- **Path:** `Donors & Power Networks/Real Estate/Real Estate Development Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Real Estate Industry Bloc

- **Path:** `Donors & Power Networks/Real Estate/Real Estate Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Real Estate Roundtable

- **Path:** `Donors & Power Networks/Real Estate/Real Estate Roundtable.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Multifamily Housing Council

- **Path:** `Donors & Power Networks/Real Estate & Housing/National Multifamily Housing Council.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Rental Home Council

- **Path:** `Donors & Power Networks/Real Estate & Housing/National Rental Home Council.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### McDonalds Corporation

- **Path:** `Donors & Power Networks/Restaurant & Food/McDonalds Corporation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Americans for Prosperity

- **Path:** `Donors & Power Networks/Super PACs/Americans for Prosperity.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Club for Growth

- **Path:** `Donors & Power Networks/Super PACs/Club for Growth.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Congressional Leadership Fund

- **Path:** `Donors & Power Networks/Super PACs/Congressional Leadership Fund.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Democratic Governors Association

- **Path:** `Donors & Power Networks/Super PACs/Democratic Governors Association.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Democratic Senatorial Campaign Committee

- **Path:** `Donors & Power Networks/Super PACs/Democratic Senatorial Campaign Committee.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### DonorsTrust

- **Path:** `Donors & Power Networks/Super PACs/DonorsTrust.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### DSCC - Democratic Senatorial Campaign Committee

- **Path:** `Donors & Power Networks/Super PACs/DSCC - Democratic Senatorial Campaign Committee.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Elect Chicago Women PAC

- **Path:** `Donors & Power Networks/Super PACs/Elect Chicago Women PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Emilys List

- **Path:** `Donors & Power Networks/Super PACs/Emilys List.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Future Forward USA Action

- **Path:** `Donors & Power Networks/Super PACs/Future Forward USA Action.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Great Lakes Conservatives Fund

- **Path:** `Donors & Power Networks/Super PACs/Great Lakes Conservatives Fund.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### House Majority PAC

- **Path:** `Donors & Power Networks/Super PACs/House Majority PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### League of Conservation Voters

- **Path:** `Donors & Power Networks/Super PACs/League of Conservation Voters.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### MAGA Small Dollar Base

- **Path:** `Donors & Power Networks/Super PACs/MAGA Small Dollar Base.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Republican Senatorial Committee

- **Path:** `Donors & Power Networks/Super PACs/National Republican Senatorial Committee.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### National Rifle Association

- **Path:** `Donors & Power Networks/Super PACs/National Rifle Association.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### One Nation

- **Path:** `Donors & Power Networks/Super PACs/One Nation.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Preserve America

- **Path:** `Donors & Power Networks/Super PACs/Preserve America.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Priorities USA Action

- **Path:** `Donors & Power Networks/Super PACs/Priorities USA Action.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Reclaim America PAC

- **Path:** `Donors & Power Networks/Super PACs/Reclaim America PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Senate Leadership Fund

- **Path:** `Donors & Power Networks/Super PACs/Senate Leadership Fund.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Senate Majority PAC

- **Path:** `Donors & Power Networks/Super PACs/Senate Majority PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Sentinel Action Fund

- **Path:** `Donors & Power Networks/Super PACs/Sentinel Action Fund.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### United Democracy Project - UDP

- **Path:** `Donors & Power Networks/Super PACs/United Democracy Project - UDP.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Winning for Women PAC

- **Path:** `Donors & Power Networks/Super PACs/Winning for Women PAC.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### WinRed

- **Path:** `Donors & Power Networks/Super PACs/WinRed.md`
- **Current readiness:** `ready`
- **Type:** `pac`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Anthropic

- **Path:** `Donors & Power Networks/Tech & Crypto/Anthropic.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Chris Larsen

- **Path:** `Donors & Power Networks/Tech & Crypto/Chris Larsen.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Coinbase

- **Path:** `Donors & Power Networks/Tech & Crypto/Coinbase.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Cryptocurrency Industry

- **Path:** `Donors & Power Networks/Tech & Crypto/Cryptocurrency Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Eric Schmidt

- **Path:** `Donors & Power Networks/Tech & Crypto/Eric Schmidt.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Founders Fund

- **Path:** `Donors & Power Networks/Tech & Crypto/Founders Fund.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Google - Alphabet

- **Path:** `Donors & Power Networks/Tech & Crypto/Google - Alphabet.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jump Crypto

- **Path:** `Donors & Power Networks/Tech & Crypto/Jump Crypto.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Marc Andreessen & Horowitz

- **Path:** `Donors & Power Networks/Tech & Crypto/Marc Andreessen & Horowitz.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Nvidia

- **Path:** `Donors & Power Networks/Tech & Crypto/Nvidia.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### OpenAI

- **Path:** `Donors & Power Networks/Tech & Crypto/OpenAI.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Silicon Valley Donors

- **Path:** `Donors & Power Networks/Tech & Crypto/Silicon Valley Donors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### SpaceX

- **Path:** `Donors & Power Networks/Tech & Crypto/SpaceX.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tesla - Elon Musk Political Operation

- **Path:** `Donors & Power Networks/Tech & Crypto/Tesla - Elon Musk Political Operation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Valinor Enterprises

- **Path:** `Donors & Power Networks/Tech & Crypto/Valinor Enterprises.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Apollo Global Management

- **Path:** `Donors & Power Networks/Wall Street/Apollo Global Management.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### BlackRock

- **Path:** `Donors & Power Networks/Wall Street/Blackrock.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### CalSTRS - California State Teachers' Retirement System

- **Path:** `Donors & Power Networks/Wall Street/CalSTRS.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Carlyle Group

- **Path:** `Donors & Power Networks/Wall Street/Carlyle Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Charles Schwab

- **Path:** `Donors & Power Networks/Wall Street/Charles Schwab.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Citadel - Kenneth Griffin

- **Path:** `Donors & Power Networks/Wall Street/Citadel - Kenneth Griffin.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Fidelity Investments

- **Path:** `Donors & Power Networks/Wall Street/Fidelity Investments.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Financial Services Donors

- **Path:** `Donors & Power Networks/Wall Street/Financial Services Donors.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### MassMutual

- **Path:** `Donors & Power Networks/Wall Street/MassMutual.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### MBNA Corporation

- **Path:** `Donors & Power Networks/Wall Street/MBNA Corporation.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Morgan Stanley

- **Path:** `Donors & Power Networks/Wall Street/Morgan Stanley.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Securities & Investment Industry

- **Path:** `Donors & Power Networks/Wall Street/Securities & Investment Industry.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Trump Media & Technology Group

- **Path:** `Donors & Power Networks/Wall Street/Trump Media & Technology Group.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Trump Organization

- **Path:** `Donors & Power Networks/Wall Street/Trump Organization.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Wall Street Finance Networks

- **Path:** `Donors & Power Networks/Wall Street/Wall Street Finance Networks.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Akin Gump Strauss Hauer & Feld

- **Path:** `Lobbying Firms & K Street/Akin Gump Strauss Hauer & Feld.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Alpine Group

- **Path:** `Lobbying Firms & K Street/Alpine Group.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ballard Partners

- **Path:** `Lobbying Firms & K Street/Ballard Partners.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### BGR Group

- **Path:** `Lobbying Firms & K Street/BGR Group.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Capitol Counsel

- **Path:** `Lobbying Firms & K Street/Capitol Counsel.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cassidy & Associates

- **Path:** `Lobbying Firms & K Street/Cassidy & Associates.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cornerstone Government Affairs

- **Path:** `Lobbying Firms & K Street/Cornerstone Government Affairs.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Crossroads Strategies

- **Path:** `Lobbying Firms & K Street/Crossroads Strategies.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Fierce Government Relations

- **Path:** `Lobbying Firms & K Street/Fierce Government Relations.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Forbes Tate Partners

- **Path:** `Lobbying Firms & K Street/Forbes Tate Partners.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Holland & Knight

- **Path:** `Lobbying Firms & K Street/Holland & Knight.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Invariant

- **Path:** `Lobbying Firms & K Street/Invariant.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### K&L Gates

- **Path:** `Lobbying Firms & K Street/K&L Gates.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mehlman Consulting

- **Path:** `Lobbying Firms & K Street/Mehlman Consulting.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mercury Public Affairs

- **Path:** `Lobbying Firms & K Street/Mercury Public Affairs.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Peck Madigan Jones (now Tiber Creek Group)

- **Path:** `Lobbying Firms & K Street/Peck Madigan Jones.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Prime Policy Group

- **Path:** `Lobbying Firms & K Street/Prime Policy Group.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### SKDK (SKDKnickerbocker)

- **Path:** `Lobbying Firms & K Street/SKDK.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Squire Patton Boggs

- **Path:** `Lobbying Firms & K Street/Squire Patton Boggs.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Subject Matter (now Avoq)

- **Path:** `Lobbying Firms & K Street/Subject Matter.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Thorn Run Partners

- **Path:** `Lobbying Firms & K Street/Thorn Run Partners.md`
- **Current readiness:** `ready`
- **Type:** `lobbying-firm`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Gerry Connolly

- **Path:** `Politicians/Democrats/House/Gerry Connolly/_Gerry Connolly Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | PL 119-56 | 2025-12-12 | HR.1912-119 | Veteran Fraud Reimbursement Act of 2025 → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jamaal Bowman

- **Path:** `Politicians/Democrats/House/Jamaal Bowman/_Jamaal Bowman Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `known-gap-pipeline` — known-gaps mentions "needs fresh pipeline" — should be draft → **demote to draft**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — UNITED DEMOCRACY PROJECT ('UDP'), DMFI - Democratic Majority for Israel → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jamie Raskin

- **Path:** `Politicians/Democrats/House/Jamie Raskin/_Jamie Raskin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: courtlistener, doj-press**
  - `a-plus-legal-review` — 2 defamation-prone phrases outside blockquotes: | 2026-03-26 | HR.8123-119 | Finance and Financial Sector | STOP Corrupt Bets Ac | - [NPR: Raskin discusses Jan 6 referrals for Trump](https://www.npr.org/2022/12/ → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim McGovern

- **Path:** `Politicians/Democrats/House/Jim McGovern/_Jim McGovern Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Joseph Morelle

- **Path:** `Politicians/Democrats/House/Joseph Morelle/_Joseph Morelle Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **run pipelines: usaspending**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - HJRES 193: Proposing an amendment to the Constitution of the United States pro → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rashida Tlaib

- **Path:** `Politicians/Democrats/House/Rashida Tlaib/_Rashida Tlaib Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). → **run pipelines: occ, sec-edgar**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: | PL 116-126 | 2020-03-18 | HR.5214-116 | Representative Payee Fraud Prevention  → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rick Larsen

- **Path:** `Politicians/Democrats/House/Rick Larsen/_Rick Larsen Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=L000560 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Summer Lee

- **Path:** `Politicians/Democrats/House/Summer Lee/_Summer Lee Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=L000602 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — United Democracy Project → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Abdul El-Sayed Master Profile

- **Path:** `Politicians/Democrats/Senate/Abdul El-Sayed/_Abdul El-Sayed Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bob Casey

- **Path:** `Politicians/Democrats/Senate/Bob Casey.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=C001070 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Brian Schatz

- **Path:** `Politicians/Democrats/Senate/Brian Schatz/_Brian Schatz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=S001194 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chuck Schumer

- **Path:** `Politicians/Democrats/Senate/Chuck Schumer/_Chuck Schumer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Debbie Stabenow

- **Path:** `Politicians/Democrats/Senate/Debbie Stabenow/_Debbie Stabenow Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=S000770 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ed Markey

- **Path:** `Politicians/Democrats/Senate/Ed Markey/_Ed Markey Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=M000133 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). → **run pipelines: ftc**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Hickenlooper

- **Path:** `Politicians/Democrats/Senate/John Hickenlooper/_John Hickenlooper Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, ftc, federal-register, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: fda, ftc, federal-register, usaspending**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: The Brownstein Hyatt Farber Schreck connection illustrates how the donor class o → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mallory McMorrow Master Profile

- **Path:** `Politicians/Democrats/Senate/Mallory McMorrow/_Mallory McMorrow Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Maria Cantwell

- **Path:** `Politicians/Democrats/Senate/Maria Cantwell/_Maria Cantwell Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=C000127 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). → **run pipelines: ftc**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mark Warner

- **Path:** `Politicians/Democrats/Senate/Mark Warner/_Mark Warner Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=W000805 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Richard Blumenthal

- **Path:** `Politicians/Democrats/Senate/Richard Blumenthal/_Richard Blumenthal Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=B001277 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press, usaspending. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: courtlistener, doj-press, usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tammy Duckworth

- **Path:** `Politicians/Democrats/Senate/Tammy Duckworth/_Tammy Duckworth Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=D000622 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Chris Christie

- **Path:** `Politicians/Independent/Chris Christie.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Katie Porter Master Profile

- **Path:** `Politicians/Races/CA Governor 2026/Katie Porter/_Katie Porter Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — fec-candidate-id=S4CA00522 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=P000618 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Xavier Becerra Master Profile

- **Path:** `Politicians/Races/CA Governor 2026/Xavier Becerra/_Xavier Becerra Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no voting pipeline data (no key, no block) → **run voting pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Vivek Ramaswamy

- **Path:** `Politicians/Races/OH Governor 2026/Vivek Ramaswamy/_Vivek Ramaswamy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — fec-candidate-id=P40011082 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Carlos Gimenez

- **Path:** `Politicians/Republicans/House/Carlos Gimenez/_Carlos Gimenez Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=G000593 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Transportation & Infrastructure oversees DOT contracts. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### French Hill

- **Path:** `Politicians/Republicans/House/French Hill/_French Hill Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). → **run pipelines: occ, sec-edgar**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### James Comer

- **Path:** `Politicians/Republicans/House/James Comer/_James Comer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=C001108 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - [PBS: Smirnov Guilty Plea](https://www.pbs.org/newshour/politics/former-fbi-in → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Bost

- **Path:** `Politicians/Republicans/House/Mike Bost/_Mike Bost Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=B001295 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Johnson

- **Path:** `Politicians/Republicans/House/Mike Johnson/_Mike Johnson Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=J000299 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Frank Lucas Master Profile

- **Path:** `Politicians/Republicans/House/_Frank Lucas Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=L000491 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). → **run pipelines: fda**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Donald Trump

- **Path:** `Politicians/Republicans/Presidential/Donald Trump/_Donald Trump Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-legal-review` — 6 defamation-prone phrases outside blockquotes: | 2026-03-19 | [Establishing the Task Force To Eliminate Fraud](https://www.fede | | 2026-03-11 | [Combating Cybercrime, Fraud, and Predatory Schemes Against Ameri → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bill Hagerty

- **Path:** `Politicians/Republicans/Senate/Bill Hagerty.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=H000601 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-legal-review` — 1 defamation-prone phrases outside blockquotes: - SJRES 12: Disapproving the action of the District of Columbia Council in appro → **David must legal-review and set legal-review-result: pass, OR rewrite the flagged phrases**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Deb Fischer

- **Path:** `Politicians/Republicans/Senate/Deb Fischer/_Deb Fischer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=F000463 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: fda, usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Hoeven

- **Path:** `Politicians/Republicans/Senate/John Hoeven/_John Hoeven Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=H001061 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **run pipelines: fda, usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Markwayne Mullin

- **Path:** `Politicians/Republicans/Senate/Markwayne Mullin/_Markwayne Mullin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=M001190 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Collins

- **Path:** `Politicians/Republicans/Senate/Mike Collins/_Mike Collins Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=C001129 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mike Crapo

- **Path:** `Politicians/Republicans/Senate/Mike Crapo/_Mike Crapo Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `zombie-block` — bioguide-id=C000880 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tommy Tuberville

- **Path:** `Politicians/Republicans/Senate/Tommy Tuberville/_Tommy Tuberville Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fda, usaspending. HELP and Agriculture committees oversee FDA-regulated products (drugs, devices, food). Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: fda, usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Alexander Acosta

- **Path:** `Politicians/Republicans/Trump Cabinet/Alexander Acosta/_Alexander Acosta Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Ratcliffe

- **Path:** `Politicians/Republicans/Trump Cabinet/John Ratcliffe/_John Ratcliffe Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=R000601 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kristi Noem

- **Path:** `Politicians/Republicans/Trump Cabinet/Kristi Noem/_Kristi Noem Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — fec-candidate-id=H0SD00054 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=N000184 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Michael Waltz

- **Path:** `Politicians/Republicans/Trump Cabinet/Michael Waltz/_Michael Waltz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — bioguide-id=W000823 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — AMERICAN JOBS AND GROWTH PAC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tulsi Gabbard

- **Path:** `Politicians/Republicans/Trump Cabinet/Tulsi Gabbard/_Tulsi Gabbard Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `zombie-block` — fec-candidate-id=H2HI02508 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=G000571 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Samuel Alito

- **Path:** `Politicians/SCOTUS/Samuel Alito/_Samuel Alito Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### State Policy Network

- **Path:** `Think Tanks & Policy Infrastructure/Conservative/State Policy Network.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### InfluenceMap

- **Path:** `Think Tanks & Policy Infrastructure/Liberal/InfluenceMap.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (3):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
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

### CoreCivic

- **Path:** `Donors & Power Networks/Carceral State/CoreCivic.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Charles Koch

- **Path:** `Donors & Power Networks/Mega-Donors/Charles Koch.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### David McIntosh

- **Path:** `Donors & Power Networks/Mega-Donors/David McIntosh.md`
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

### Mark Zuckerberg

- **Path:** `Donors & Power Networks/Mega-Donors/Mark Zuckerberg.md`
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

### Reid Hoffman

- **Path:** `Donors & Power Networks/Mega-Donors/Reid Hoffman.md`
- **Current readiness:** `ready`
- **Type:** `donor`
- **Issues (2):**
  - `missing-block` — no fec pipeline data (no key, no block) → **run fec pipeline**
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

### Amazon

- **Path:** `Donors & Power Networks/Tech & Crypto/Amazon.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `a-plus-missing-thesis` — central-thesis field not populated → **add central-thesis: "<one sentence>" to frontmatter**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Crypto Industry Bloc

- **Path:** `Donors & Power Networks/Tech & Crypto/Crypto Industry Bloc.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (2):**
  - `missing-block` — no lda pipeline data (no key, no block) → **run lda pipeline**
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

### Sherrod Brown

- **Path:** `Politicians/Democrats/Former/Sherrod Brown.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `known-gap-pipeline` — known-gaps mentions "needs re-enrichment" — should be draft → **demote to draft**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Tim Walz

- **Path:** `Politicians/Democrats/Governors/Tim Walz/_Tim Walz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Alexandria Ocasio-Cortez Master Profile

- **Path:** `Politicians/Democrats/House/Alexandria Ocasio-Cortez/_Alexandria Ocasio-Cortez Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc, federal-register. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: ftc, federal-register**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Cori Bush

- **Path:** `Politicians/Democrats/House/Cori Bush/_Cori Bush Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — United Democracy Project, Fairshake PAC, Mainstream Democrats PAC → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Frank Pallone

- **Path:** `Politicians/Democrats/House/Frank Pallone/_Frank Pallone Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: ftc, federal-register. Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Energy committee oversees FERC + DOE rulemaking — cross-ref Federal Register notices. → **run pipelines: ftc, federal-register**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Henry Cuellar

- **Path:** `Politicians/Democrats/House/Henry Cuellar/_Henry Cuellar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=C001063 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jim Himes

- **Path:** `Politicians/Democrats/House/Jim Himes/_Jim Himes Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Raja Krishnamoorthi

- **Path:** `Politicians/Democrats/House/Raja Krishnamoorthi/_Raja Krishnamoorthi Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: fara, opensanctions. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: fara, opensanctions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ro Khanna

- **Path:** `Politicians/Democrats/House/Ro Khanna/_Ro Khanna Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Armed Services oversees defense contracts — must cross-ref USASpending awardees. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rosa DeLauro

- **Path:** `Politicians/Democrats/House/Rosa DeLauro/_Rosa DeLauro Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: usaspending. Appropriations controls federal spending — USASpending cross-ref surfaces where their votes landed. → **run pipelines: usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Saikat Chakrabarti Master Profile

- **Path:** `Politicians/Democrats/House/Saikat Chakrabarti/_Saikat Chakrabarti Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Zoe Lofgren

- **Path:** `Politicians/Democrats/House/Zoe Lofgren/_Zoe Lofgren Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. → **run pipelines: courtlistener, doj-press**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Josh Gottheimer

- **Path:** `Politicians/Democrats/House/_Josh Gottheimer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: occ, sec-edgar, fara, opensanctions. Banking/Financial Services committee oversees banks (OCC) and public-company disclosures (SEC). Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). → **run pipelines: occ, sec-edgar, fara, opensanctions**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Harry Reid

- **Path:** `Politicians/Democrats/Senate/Harry Reid/_Harry Reid Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=R000146 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Hillary Clinton

- **Path:** `Politicians/Democrats/Senate/Hillary Clinton/_Hillary Clinton Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — KENTUCKIANS FOR STRONG LEADERSHIP → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jon Ossoff

- **Path:** `Politicians/Democrats/Senate/Jon Ossoff/_Jon Ossoff Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=O000174 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Scott Wiener

- **Path:** `Politicians/Democrats/Senate/Scott Wiener/_Scott Wiener Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Dan Osborn

- **Path:** `Politicians/Independent/Dan Osborn/_Dan Osborn Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `missing-block` — no congress pipeline data (no key, no block) → **run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Joe Manchin

- **Path:** `Politicians/Independent/Joe Manchin/_Joe Manchin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=M001183 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kyrsten Sinema

- **Path:** `Politicians/Independent/Kyrsten Sinema/_Kyrsten Sinema Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-both-sides` — entities appear in both donors: and opposes: — DEFENDARIZONA, AMERICAN FUTURE FUND → **Research Claude should reconcile or document the both-sides pattern**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Jason Smith

- **Path:** `Politicians/Republicans/House/Jason Smith/_Jason Smith Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=S001195 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Boehner

- **Path:** `Politicians/Republicans/House/John Boehner/_John Boehner Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=B000589 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mark Green

- **Path:** `Politicians/Republicans/House/Mark Green/_Mark Green Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=G000590 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Nancy Mace

- **Path:** `Politicians/Republicans/House/Nancy Mace.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=M000194 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Patrick McHenry

- **Path:** `Politicians/Republicans/House/Patrick McHenry/_Patrick McHenry Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=M001156 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Paul Ryan

- **Path:** `Politicians/Republicans/House/Paul Ryan/_Paul Ryan Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=R000570 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Roger Williams

- **Path:** `Politicians/Republicans/House/Roger Williams/_Roger Williams Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=W000816 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Steve Scalise

- **Path:** `Politicians/Republicans/House/Steve Scalise/_Steve Scalise Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=S001176 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Kevin McCarthy Master Profile

- **Path:** `Politicians/Republicans/House/_Kevin McCarthy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=M001165 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ashley Hinson Master Profile

- **Path:** `Politicians/Republicans/Senate/Ashley Hinson/_Ashley Hinson Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=H001091 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Bernie Moreno

- **Path:** `Politicians/Republicans/Senate/Bernie Moreno.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=M001242 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John Barrasso

- **Path:** `Politicians/Republicans/Senate/John Barrasso/_John Barrasso Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=B001261 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### John McCain

- **Path:** `Politicians/Republicans/Senate/John McCain/_John McCain Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=M000303 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mitch McConnell Master Profile

- **Path:** `Politicians/Republicans/Senate/Mitch McConnell/_Mitch McConnell Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=M000355 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Mitt Romney

- **Path:** `Politicians/Republicans/Senate/Mitt Romney/_Mitt Romney Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=R000615 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Rand Paul

- **Path:** `Politicians/Republicans/Senate/Rand Paul/_Rand Paul Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=P000603 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Ted Cruz

- **Path:** `Politicians/Republicans/Senate/Ted Cruz/_Ted Cruz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `a-plus-committee-cross-ref` — missing committee-relevant pipelines: courtlistener, doj-press, fara, opensanctions, ftc, usaspending. Judiciary committee oversees DOJ and federal courts — must cross-ref litigation + enforcement. Intel/Foreign Affairs must cross-ref foreign agents (FARA) and sanctioned entities (OpenSanctions). Commerce committee oversees FTC jurisdiction (antitrust, consumer protection). Transportation & Infrastructure oversees DOT contracts. → **run pipelines: courtlistener, doj-press, fara, opensanctions, ftc, usaspending**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**

### Lee Zeldin

- **Path:** `Politicians/Republicans/Trump Cabinet/Lee Zeldin/_Lee Zeldin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — bioguide-id=Z000017 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
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

### Matt Gaetz

- **Path:** `Politicians/Republicans/House/Matt Gaetz/_Matt Gaetz Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `a-plus-missing-story-grade` — story-grade field not populated → **add story-grade: story|report|investigation**
