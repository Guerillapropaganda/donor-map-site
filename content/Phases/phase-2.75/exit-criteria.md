---
title: Phase 2.75 Exit Criteria
type: checklist
phase: 2.75
last-updated: 2026-04-14
---

# Phase 2.75 Exit Criteria

All items must be verified before `phase-transition` skill runs.

## Data
- [ ] `data/policies.jsonl` schema defined with validator
- [ ] `data/polling.jsonl` schema defined with validator
- [ ] 5 policy records populated in `policies.jsonl`
- [ ] ~30 polling entries in `polling.jsonl` covering the 5 policies
- [ ] `events.jsonl` has `policy_id` populated for all policy-related events
- [ ] `events.jsonl` has `obstruction_type` populated where applicable
- [ ] Class tags exist for every opposition donor cited on any policy page

## Code
- [ ] `scripts/lib/policies-store.cjs` with read/write API
- [ ] `scripts/lib/polling-store.cjs` with read/write API
- [ ] Quartz plugin for policy page template
- [ ] Quartz plugin (or Next.js route) for OG card generation
- [ ] `/who-blocks-us` page renders from cross-policy query
- [ ] Zip code lookup wired into policy pages
- [ ] Contradiction callout component with graceful fallback

## Pages shipped
- [ ] Housing affordability / rent control
- [ ] Universal healthcare / Medicare expansion
- [ ] AIPAC / BDS laws (legally reviewed)
- [ ] Minimum wage
- [ ] Student debt cancellation
- [ ] `/who-blocks-us` enemy list

## OG cards
- [ ] Tested on Twitter/X card validator
- [ ] Tested on Facebook OG debugger
- [ ] Tested on LinkedIn card validator
- [ ] Each card shows: policy name, money blocked, public support %, Donor Map branding
- [ ] Build time impact acceptable (<30s increase)

## Editorial
- [ ] 5 plain-English blurbs approved by David
- [ ] Every factual claim has a `{{src:ID}}` reference
- [ ] Sentinel blocklist extension active on policy pages
- [ ] AIPAC page reviewed by David
- [ ] No banned words (`bought`, `co-opted`, `bribed`, `corrupt`, `scheme`) in prose

## Access
- [ ] Policy pages free for anonymous visitors (no auth gate)
- [ ] `/who-blocks-us` free for anonymous visitors
- [ ] Confirmed the auth middleware from Phase 2.5 does NOT gate these pages when it ships

## Documentation
- [ ] CLAUDE.md updated with policy page workflow rules
- [ ] Vault Rules.md updated with editorial firewall reference
- [ ] Pipeline Guide.md updated if polling pipeline added
- [ ] Phase 2.75 retrospective written

## Verification
- [ ] `npx quartz build` clean
- [ ] All pre-commit sentinels pass
- [ ] Every policy page loads in <2s on a cold cache
- [ ] Shareable permalinks resolve correctly
- [ ] Cross-page links (donor profile → policy page → rep lookup) work end-to-end
