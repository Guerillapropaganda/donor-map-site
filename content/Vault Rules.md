---
title: Vault Rules
type: system
last-updated: 2026-04-21
---

# Vault Rules

Shared rules for Code Claude and Research Claude. This is the single source of truth for editorial, data, and lane boundaries. `CLAUDE.md` has Code-Claude-specific rules; this doc has rules both Claudes share.

When a rule changes, write an ADR.

---

## 1. Content readiness tiers

```
raw → draft → ready → data-complete → verified → s-tier
```

| Tier | Definition | Who can promote | Publishable? |
|------|------------|-----------------|--------------|
| raw | Initial stub or import. May be missing key fields. | automatic (on profile creation) | no |
| draft | Partial enrichment. Pipeline data present but editorial work incomplete. | pipelines, Research Claude | no |
| ready | 99% complete. All auto-sections populated. Editorial sections written. Only David's sign-off remains. | Research Claude | no |
| **data-complete** (ADR-0017) | All type-specific auto-sections populated, ≥1 Tier 1 source, mapped relationships, fresh (≤90 days), zero blocking flags. **No editorial sign-off required.** | automatic via `reclassify-readiness.cjs` | **yes** — renders with auto-generated banner |
| verified | Editor-signed-off. All placeholder flags cleared or consciously preserved. Template validator passes. 9-section contract met. | David only | yes — no banner, shows "Verified" |
| s-tier | Original investigation / exclusive finding. Requires janitor audit + David's narrative sign-off + `angle` + `original-finding` + 3+ exclusive-connections. | David only (both gates required) | yes |

**ADR-0017 framing:** the site's moat is comprehensive structured data, not 50 hand-polished essays. `data-complete` lets the database publish at scale — profiles render from canonical stores with an "auto-generated from federal disclosures" banner. Editorial work (Class Analysis, Who They Are, The Contradictions) rolls profiles from data-complete → verified over time as a queue, not a launch gate.

**Hard rule: `ready` means David's sign-off is the only thing left** for verified promotion. Missing auto-blocks, stale data (>90 days), or unresolved `known-gaps` / `needs-reenrichment: true` all force the profile back to draft.

**One authority for classification:** `scripts/reclassify-readiness.cjs` (consolidates former `reclassify-readiness`, `pipeline-janitor`, `staleness-decay` logic). Never write new code that edits `content-readiness` outside this script — with one exception: the ops `/api/profile/readiness` route which handles David's manual `verified` / `s-tier` promotions and is subject to stricter gates.

## 2. Source tiers

| Tier | Definition | Examples |
|------|------------|----------|
| Tier 1 | Government / primary / regulatory | FEC, Congress.gov, GovTrack, USASpending, SAM.gov, SEC EDGAR, IRS 990 via ProPublica, DOJ, FDA, OCC, FTC, EPA FRS, Senate LDA |
| Tier 2 | Major journalism with investigative rigor | ProPublica articles, Sludge, Popular Information, The Intercept, The Guardian, NYT, WaPo, WSJ, Reuters, AP, Bloomberg |
| Tier 3 | Aggregator + advocacy | OpenSecrets (demoted from Tier 1), FollowTheMoney (dead), CREW, Open Secrets Dark Money, Ballotpedia |
| Tier 4 | Blogs, social media, unverified | Bluesky, Mastodon, X posts, Substack newsletters without editorial review |
| Archived | Dead, redirected, paywalled, generic-orphan, or historically-Tier-1-now-broken | LDA URLs (broken until June 2026), all FTM URLs |

**Tier 1 First mandate:** every factual claim must have at least one Tier 1 source before a profile can reach verified tier. If no Tier 1 source exists, the claim is not safe to publish.

## 3. Frontmatter is the only source of truth for structured non-relationship fields

All structured profile data lives in YAML frontmatter, not body `field:: value` lines.

- `content-readiness`, `profile-status`, `source-tier`, `source-types`, `corroboration-count`, `known-gaps`
- Type-specific fields (see `Profile Template.md`)

**Exception: relationship cache fields are READ-ONLY.** These are rebuilt from `data/relationships.jsonl` by `scripts/rebuild-relationship-caches.cjs`:

- `related`, `donors`, `top-donors`, `politicians-funded`, `politicians-opposed`, `opposes`, `stories`

Editing these by hand is blocked by the `canonical-store-sentinel` pre-commit hook.

**To add a new relationship:** edit `data/relationships.jsonl` through `scripts/lib/relationships-store.cjs` (or via the Ops `/relationships` page). The cache rebuilder picks it up.

**To fix an inline dataview `field:: value` line in a profile body:** if it's a non-relationship field (e.g. `readiness`, `last-updated`), merge into frontmatter and delete the body line. If it's a relationship field, add the edge to `relationships.jsonl` and delete the body line — never copy its value to frontmatter.

## 4. Placeholder markers stay in source, hide from render

`(URL NEEDED)`, `(UNVERIFIED)`, `(NEEDS REVIEW)`, `[JANITOR ...]` notes, and `internal-notes` frontmatter values are roadmap markers. They stay in the markdown as internal signals but a Quartz build-time transformer converts them to HTML comments so readers don't see them.

**Rationale:** we need these to know where expansion is needed. Readers don't need to see our internal roadmap. Both can be true.

Do not silently strip these markers. A script that removes one without consciously clearing the underlying issue is a bug.

## 5. URL verification is Editor-only

**Neither Claude fixes, hunts, replaces, or verifies source URLs in content.** David handles all URL work personally.

This includes:
- Broken URL replacement (no URL searching, no substitute hunting)
- `(URL NEEDED)` / `(UNVERIFIED)` / `(NEEDS REVIEW)` tag resolution
- Browser-based URL verification
- Running the `url-fixer` skill — do not invoke

**What both Claudes do instead:**
- Leave broken URLs tagged `(URL NEEDED)` or `~~strikethrough~~` them in the Archived section
- Document the gap in `known-gaps` frontmatter
- Flag counts in Session State (e.g., "Koch Industries has 23 UNVERIFIED")
- **Never** substitute, search for replacements, or run url-fixer

**Exception:** Claudes can verify that a pipeline-supplied ID matches its named entity before committing a citation. E.g. "does FEC committee C00234120 actually show Koch Industries on fec.gov?" That's ID verification, not URL replacement.

## 6. Class analysis is mandatory and editorial

Every verified profile has a `## Class Analysis` section. Not optional, not a nice-to-have.

Vocabulary locked by ADR-0001 + amendments (0010, 0011). The 5-dimension schema:
- `capital-type` — finance, tech, fossil, carceral, defense, pharma, labor, etc.
- `class-position` — bourgeois, petite-bourgeois, labor-aligned, etc.
- `worker-relationship` — exploiter, organizer, adjacent, etc.
- `ideological-function` — reactionary, liberal, left-populist, etc.
- `serves-capital-type` — which capital does this entity serve

Research Claude writes these. David signs them off.

## 7. Lane boundaries

### Code Claude owns
- Scripts, pipelines, components, styling, builds, deploys, schema
- Data integrity sentinels, ingest automation
- Ops app features and UI
- Auth, rate limiting, security
- Frontmatter field edits (except canonical-store-backed fields)
- Folder structure, file naming

### Research Claude owns
- Profile body prose (the 3 editorial template sections)
- Class Analysis writing
- Narrative framing, editorial voice
- Story seeds → finished stories
- Policy explainer bodies
- Central-thesis statements

### David owns
- URL verification (see rule 5)
- Editorial sign-off → verified tier promotion
- Class-tag approval (blocks verified tier per rule 6 gate)
- Sensitive-word editorial review (defamation-prone word triage — see rule 8)
- Architecture decisions (new ADRs)
- Money or legal risk decisions

### Nobody silently crosses lanes
A Claude that crosses into another lane must stop and ask. Research Claude cannot fix a script bug even if they see it — they flag it to David for Code Claude. Code Claude cannot write profile prose even if they see a gap — they flag it to David for Research Claude.

## 8. Editorial integrity

### No em dashes
— is banned. Sounds AI-generated. Use period or comma. Enforced by `self-review-mirror` on new lines only.

### Banned AI vocabulary
delve, moreover, furthermore, plethora, tapestry, testament to, navigate the complexities, vibrant, multifaceted. Full list in `scripts/self-review-mirror.cjs`. Enforced on new lines only.

### Defamation-prone words need editorial review
`fraud`, `corrupt`, `scheme`, `bribed` outside blockquotes are flagged. This does NOT mean they can't be used — it means they need David's deliberate editorial decision, not a silent AI insertion. When flagged, sanitizing to "misconduct" or similar destroys meaning. Either keep the original word with David's sign-off, or rewrite the sentence to make a different point.

### `editor-vouched: true` flag
For long-form story profiles that cite sources in an aggregated Sources section (standard magazine format). Skips `hallucination-catcher`'s proximity check only. Does NOT exempt defamation word check or voice-drift. Use only when every claim traces to the aggregated sources and inlining would wreck reading flow.

## 9. Pipeline research protocol

Before building, fixing, or significantly modifying any pipeline, BOTH Claudes must check `content/Pipeline Guide.md` first.

When fixing an existing pipeline bug:
1. Read the cheatsheet section. Check "Known quirks" + "Known incidents" + "Quality signals"
2. If the bug matches a documented pattern, use the documented fix
3. If new, fix it and add an entry to "Known incidents (our vault)"

When building a NEW pipeline:
1. Do not start blind
2. Request Perplexity research from David before writing code (`content/Admin Notes/perplexity-prompt-library.md`)
3. Add the research as a new section in Pipeline Guide following existing format
4. If no research available, revert to generic REST conventions and document the gap prominently

## 10. Scope boundaries

### We are thedonormap.org
Political donor intelligence database. US federal + state politicians and the money funding them. Scope expansion outside the US requires an ADR.

### We are not
- A news site (we link to news, we don't compete with it)
- A social network
- A crypto/blockchain project (crypto donors are profiled like any other donor)
- A paid content platform at launch (soft launch is free; paid tier May 2026+)

### Subject types we profile
- Federal politicians (Senate, House, Presidential)
- State politicians (governor, state legislator)
- Local politicians (mayor, county commissioner)
- Individual donors (mega-donors, family offices)
- Corporations (public companies, private corps with political footprint)
- PACs, Super PACs, 501(c)(4)s
- Think tanks
- Lobbying firms
- Media profiles (outlets, pundits)
- Stories (thematic investigations, not single-entity)
- Story seeds (candidate patterns before they become stories)
- Events (news, votes, bills)

### Types we don't profile (explicit scope-out)
- Private individuals without political contribution footprint
- Corporations with no federal contracts, lobbying, or political contributions
- Foreign politicians (except as they intersect with US donor flows)

## 11. Canonical stores

The 9 canonical JSONL stores are the authoritative source for structured data:

1. `data/relationships.jsonl` — edges between entities (monetary, related, opposes, stories, government-contract, government-grant, political-opposition)
2. `data/entities.jsonl` — named entity records (politicians, donors, corps, with class-analysis signals)
3. `data/events.jsonl` — dated events (bills, votes, news)
4. `data/sources.jsonl` — source registry (all citations)
5. `data/policies.jsonl` — policy page records
6. `data/polling.jsonl` — public opinion data for policy pages
7. `data/users.jsonl` — auth records (Ops app only)
8. `data/claims/*.jsonl` — claim-object profiles (ADR-0007)
9. `data/fec-committee-registry.jsonl` — FEC committee-to-profile mappings (Phase 2b.3)

All writes go through `scripts/lib/*-store.cjs` helpers. Sentinels enforce the contract.

## 12. Decisions log

Architecture decisions live in `content/Decisions/NNNN-slug.md` as ADRs.

### Active ADRs (load-bearing)

- **ADR-0001** — Class Tag Vocabulary (5-dimension schema)
- **ADR-0002** — Monetization Model (facts free, tools paid)
- **ADR-0004** — Policy Battles (policies as stored queries)
- **ADR-0007** — Claim-Object Pattern (AOC reference)
- **ADR-0009** — Auth Architecture (Clerk + tier-check middleware)
- **ADR-0010** — Class Tag Amendment: Surveillance State
- **ADR-0011** — Class Tag Amendment: Reproductive Rights

### Historical ADRs

Preserved in `content/Decisions/Archive/`:
- ADR-0003 (superseded by 0008)
- ADR-0005 (Phase 6 closed)
- ADR-0006 (Phase 1 closed)
- ADR-0008 (closure record for 0003)

Never edit old ADRs to reverse their decisions. Write a new ADR that supersedes them.

## 13. What changed from the prior rules doc

Recorded here for future reference. Delete this section after April 30 launch.

**Killed:**
- `-generated` cache fields rule (was documented but no code implemented — zombie rule)
- Rule-10-vs-frontmatter-only contradiction (rule 2 now makes the carve-out explicit)
- Research-Claude-replaces-URLs (was stale in Vault Rules §2b line 370, now aligned with editor-only rule)

**New:**
- Placeholder markers preserved in source, hidden in render (rule 4)
- One authoritative readiness adjudicator (rule 1)
- 9-section profile template is load-bearing (Profile Template doc)
- CSV-first data architecture (CSV Data Sources doc)
- Lane boundary enforcement — Claudes flag, don't cross (rule 7)

**Clarified:**
- Claude URL ID verification is allowed, URL substitution is not (rule 5)
- `editor-vouched` flag does NOT exempt defamation or voice-drift checks (rule 8)
- Scope boundaries made explicit (rule 10)
