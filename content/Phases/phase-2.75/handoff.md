---
title: Phase 2.75 Handoff — Policy Battles MVP
type: handoff
phase: 2.75
status: not-started
last-updated: 2026-04-14
blocked-by: [phase-1, phase-2]
---

# Phase 2.75 Handoff

## Current state

Not started. Blocked on Phase 1 completion (Source Registry) and Phase 2 shipping (Query Engine MVP with class tags, events.jsonl, SQLite backend). Planning complete per ADR-0004.

## Goal

Ship the first user-facing product powered by the query engine: 5 policy battle pages + `/who-blocks-us` enemy list + OG card generation. Policy pages are the marketing funnel for the paid Researcher tier (ADR-0002), so they remain free forever and launch BEFORE Phase 2.5 auth gating.

## v1 policy set (5 policies, locked)

In build priority:

1. **Housing affordability / rent control** — kitchen table, biggest current gap, rentier-capital opposition is clean
2. **Universal healthcare / Medicare expansion** — perennial anger, strong data via existing pharma-capital relationships
3. **AIPAC / BDS laws** — highest viral ceiling, highest legal risk, editorial firewall locked in ADR-0004
4. **Minimum wage** — cleanest data, most obvious gap between polling and legislation
5. **Student debt cancellation** — Gen Z/millennial hook, recent votes, clean money trail

Plus:

6. **`/who-blocks-us`** — cross-policy donor overlap aggregate page (free byproduct of the 5 policies)

## Exactly where to pick up (when Phase 2 ships)

### Prerequisite check
Before starting Phase 2.75, verify Phase 2 shipped:
- [x] `data/events.jsonl` exists with votes, hearings, regulations populated <!-- auto-verified 2026-04-15 -->
- [x] `data/events.jsonl` schema includes `policy_id` and `obstruction_type` fields <!-- auto-verified 2026-04-15 -->
- [x] `data/entity-class-tags.jsonl` has class tags for opposition donors <!-- auto-verified 2026-04-15 -->
- [ ] SQLite query backend loading all JSONL stores at build time
- [x] `/api/query` endpoint functional <!-- auto-verified 2026-04-15 -->

If any of these are missing, extend Phase 2 scope rather than start Phase 2.75 without its dependencies.

### First concrete action
Write `data/policies.jsonl` schema + `scripts/lib/policies-store.cjs` reader/writer. Same pattern as `sources-store.cjs`: schema validator in separate module, lazy-loaded in-memory index, append-only JSONL.

Schema from ADR-0004:
```yaml
id, title, slug, category, plain_english, public_support_pct,
public_support_source, legislative_status, opposition_capital_types[],
related_events[], related_donors_query, class_analysis_tags[], status,
last-updated
```

Then seed the 5 policy records with skeleton data. Editor fills prose blurbs in a later session.

## Deliverables

### Data layer
- [x] `data/policies.jsonl` schema + store (same pattern as sources-store) <!-- auto-verified 2026-04-15 -->
- [x] `data/polling.jsonl` schema + store <!-- auto-verified 2026-04-15 -->
- [ ] ~30 polling entries (manual curation) for the 5 policies
- [ ] `events.jsonl` populated with `policy_id` and `obstruction_type` for policy-related events
- [ ] Cross-policy donor opposition index (computed at build time, not a file)

### Code layer
- [ ] Quartz policy page template plugin — renders policy page from `policies.jsonl` + query results
- [ ] `/who-blocks-us` enemy list page (template + query)
- [ ] OG card generation plugin (Quartz transformer or Next.js route)
- [ ] Twitter/X card markup on every policy page
- [ ] Zip code lookup integration on policy pages (reuse existing "Who Funds Your Rep" component)
- [ ] Contradiction callout component (politicians with high contradiction_index)

### Editorial layer
- [ ] 5 policy plain-English blurbs (Research Claude drafts, David approves)
- [ ] Sentinel blocklist extension for policy pages (`bought`, `co-opted`, `bribed`, etc.)
- [ ] AIPAC page legal review by David (non-negotiable)
- [ ] Source IDs assigned to every factual claim in every policy page

### Documentation layer
- [x] CLAUDE.md updated with policy page workflow rules <!-- auto-verified 2026-04-15 -->
- [x] Vault Rules.md updated with editorial firewall reference <!-- auto-verified 2026-04-15 -->
- [x] Pipeline Guide.md updated if a polling pipeline is added <!-- auto-verified 2026-04-15 -->
- [ ] Phase 2.75 retrospective

## Exit criteria

- [ ] All 5 policy pages render clean in Quartz build
- [ ] OG cards generate correctly for each (tested on Twitter/X card validator + Facebook OG debugger)
- [ ] `/who-blocks-us` page shows cross-policy donor overlap with working click-throughs
- [ ] AIPAC page reviewed and approved by David
- [x] Every factual claim on every page has a `{{src:ID}}` reference <!-- auto-verified 2026-04-15 -->
- [ ] No defamation-blocklist words in any policy page prose
- [ ] Zip code lookup functional on all 5 pages
- [x] `npx quartz build` clean, no regressions <!-- auto-verified 2026-04-15 -->
- [ ] Policy pages non-gated (free tier, no auth required)
- [ ] Shareable permalinks work
- [ ] Phase 2.75 retrospective written

## Dependencies on Phase 2 schema decisions

These MUST be baked into Phase 2's events.jsonl to avoid retrofitting:

1. `policy_id` field on event records (nullable)
2. `obstruction_type` field on event records (nullable, enum)
3. `events.jsonl` must support "events grouped by policy" query pattern
4. `relationships.jsonl` edges must be queryable by capital_type aggregation
5. Class tags (`data/entity-class-tags.jsonl`) must be populated for opposition donors before Phase 2.75 starts

Flag to implementer of Phase 2: these are hard dependencies. Do not ship Phase 2 without them.

## Known issues / concerns

1. **AIPAC page legal risk.** The editorial firewall in ADR-0004 is designed to be litigation-proof but David should still review personally and consider optional lawyer review before publication.
2. **Polling data freshness.** Manual curation means polls go stale. v1 accepts this; v2 considers automation.
3. **OG card generation performance.** If every build regenerates all OG cards, build time increases. Cache by policy content hash.
4. **Contradiction callouts depend on politician rhetoric fields.** If Phase 2 class tagging doesn't populate `stated_positions{}`, contradiction callouts fall back to "no data" rather than rendering empty. Design it to degrade gracefully.

## Open questions for David

To answer when Phase 2.75 begins, not now:

1. OG card visual design — follow existing Design System (cream/yellow/red brutalist) or new template?
2. Which polling orgs are authoritative for each policy? KFF for healthcare, Data for Progress for economic, Pew for civic — but housing specifically?
3. Zip code lookup — reuse existing component or rebuild?
4. `/who-blocks-us` headline copy — locked phrase or A/B test?

## Progress log

### 2026-04-14 — Planning + ADR-0004
Riff session produced the Policy Battles concept. ADR-0004 written. Phase 2.75 added to Build Phases. Blocked on Phase 1 and Phase 2 completion.
