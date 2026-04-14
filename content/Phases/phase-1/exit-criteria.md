---
title: Phase 1 Exit Criteria
type: checklist
phase: 1
last-updated: 2026-04-14
---

# Phase 1 Exit Criteria

All items must be verified before `phase-transition` skill runs.

## Code
- [x] `scripts/lib/sources-schema.cjs` with strict schema validation
- [x] `scripts/lib/sources-store.cjs` exists and exports documented API
- [ ] `scripts/extract-sources-from-vault.cjs` working
- [ ] `scripts/orphan-citation-detector.cjs` working
- [ ] Quartz plugin for `{{src:ID}}` ref resolution
- [ ] At least one pipeline migrated end-to-end

## Data
- [ ] `data/sources.jsonl` populated from existing vault
- [ ] Every source has content hash, title, final host
- [ ] Deduplication verified (no URL appears twice)
- [ ] Tier 1 sources auto-archived to archive.org

## UI
- [ ] Ops `/sources` page lists all sources
- [ ] Filter by status, tier, entity, source_type
- [ ] One-click re-fetch working
- [ ] Bulk status change working
- [ ] URL edit in place working

## Reports
- [ ] `content/Admin Notes/orphan-citations-report.md` generated
- [ ] Top 50 triaged by David
- [ ] Report regenerates cleanly

## Documentation
- [ ] CLAUDE.md updated with Source Registry Discipline section
- [ ] Vault Rules.md updated with Structured Data Layer section
- [ ] Pipeline Guide.md updated with Source Registry Integration section
- [ ] Phase 1 retrospective written

## Verification
- [ ] `npx quartz build` clean (no errors)
- [ ] All pre-commit sentinels pass
- [ ] Test profiles render `{{src:ID}}` correctly
- [ ] Ops app starts and /sources page loads in under 2s

## Progress: 2 / 25 (8%)
