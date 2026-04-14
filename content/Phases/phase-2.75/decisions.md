---
title: Phase 2.75 Mid-Phase Decisions
type: log
phase: 2.75
last-updated: 2026-04-14
---

# Phase 2.75 Mid-Phase Decisions

Decisions made during Phase 2.75 implementation that aren't big enough for a full ADR but need to be recorded for continuity.

---

## 2026-04-14 — Planning session

### Policy = query + prose wrapper, not a profile
A "policy profile" is NOT a new content type requiring pipeline enrichment and manual maintenance. It's a stored query over `relationships.jsonl`, `events.jsonl`, `sources.jsonl` plus a one-paragraph editorial blurb. This cuts the build cost from "15 profiles to maintain forever" to "one template + 5 paragraphs."

### v1 is 5 policies, not 15
Ship narrow, prove the pattern, expand. 5 policies chosen per David's priority: Housing, Healthcare, AIPAC/BDS, Minimum Wage, Student Debt. v2 candidates deferred (marijuana, drug pricing, climate, gun reform, campaign finance, carried interest, antitrust, private prisons, etc.).

### Enemy list URL: `/who-blocks-us`
Second-person, visceral, shareable. Alias `/policies/enemy-list` as secondary redirect for discoverability but `/who-blocks-us` is the canonical share slug.

### Obstruction types are first-class events
Procedural kills (`chair_bottled_up`, `filibustered`, `held_for_concessions`, `pocket_vetoed`) are as important as floor votes. Often MORE important because they're invisible to the public. Events.jsonl schema adds `obstruction_type` field in Phase 2 to support this. Schumer killing big tech antitrust was a procedural kill, not a no-vote — the policy page must surface that.

### AIPAC page editorial firewall
See ADR-0004 § "Editorial firewall — AIPAC / BDS page" for full rules. Key points:
- Banned words: `bought`, `co-opted`, `bribed`, `corrupt`, `scheme`
- Facts-only prose, juxtaposition does the work
- Every claim needs a source ID
- Class analysis tags carry the opinion weight (imperialist-aligned, zionist-aligned)
- Precise description: "US-based 501(c)(4) funded by US donors advocating for US foreign policy aligned with Israeli government interests" — never "foreign government influence"
- David reviews personally before publication (non-negotiable)

### OG cards are mandatory, not optional
Nobody shares a URL. They share the screenshot. Without OG cards, the page loses ~80% of viral potential. OG card generation is a hard deliverable, not a stretch goal.

### Contradiction callouts depend on Phase 2 politician rhetoric fields
The "these 8 senators said they support this and took $X to kill it" feature only works if Phase 2 class tagging populates `stated_positions{}` on politician entities. If that field is empty, the callout falls back to "no data" rather than rendering empty.

### Policy pages stay free forever
Per ADR-0002, all factual content is free. Policy pages are factual content. They ship BEFORE Phase 2.5 auth gating and are explicitly excluded from any future tier gating. The `/query` engine behind them is paid; the policy pages that render from the engine are free.
