---
title: "ADR-0023: Frontmatter Schema (stub)"
type: adr
status: proposed
date: 2026-04-24
accepted: null
---

# ADR-0023: Frontmatter Schema

## Status

**Stub.** Slot reserved 2026-04-24 during Phase 3 of ADR-0021. Not yet
designed. Draft when ADR-0021 Phase 4 (auto-fix triage) starts, or
sooner if another session blocks on a schema decision.

## Problem

There is no single declarative source of truth for which frontmatter
fields each profile type must populate, may populate, or must not
populate. Today the rules are scattered:

- `scripts/lib/profile-type-rulebook.cjs` — informal per-type coverage
  checks (Session K, 2026-04-21)
- `scripts/publication-readiness-check.cjs` — gates specific fields
  behind the public-routes list
- `scripts/profile-template-validator.cjs` — the 9-section contract
  for `verified` bodies, not frontmatter
- ADR-0022 (2026-04-24) — implicit per-type A+ field requirements
- CLAUDE.md Rule 1 — canonical-store-backed fields (can't hand-edit)
- `content/Profile Template.md` — prose description, partially stale

Consequences of the drift:

1. **Silent field retirement** — fields like `story-grade` sit unpopulated
   on 446/446 publication-tier profiles (Phase 3 finding, 2026-04-24);
   nobody knows whether the field is required-but-backlogged or dead.
2. **Auto-fix can't ship safely** — ADR-0021 Phase 4 needs a strict
   schema to know what's safe to fill in.
3. **Pipelines invent fields** — new enrichment pipelines occasionally
   add frontmatter keys that no downstream consumer reads.
4. **No TTL convention** for `internal-notes` / `known-gaps` —
   stale markers accumulate, can't be purged mechanically.

## Scope (to be decided)

The draft ADR will need to settle:

- Per-type required / optional / forbidden field lists.
- Retirement policy for dead fields (delete, or archive to a legacy map).
- TTL conventions for markdown annotations inside frontmatter values
  (`internal-notes`, `known-gaps`, `[JANITOR]`-style markers).
- Schema file format (JSON schema? TypeScript types? Plain cjs module
  matching the `profile-type-rulebook` pattern?).
- Validator as pre-commit sentinel vs harness check.
- Backfill plan for fields newly declared required.

## Connections

- Depends on: nothing (can be drafted anytime).
- Blocks: ADR-0021 Phase 4 (auto-fix triage needs this).
- Affects: ADR-0017 (readiness gates), ADR-0022 (A+ bar field lists),
  every enrichment pipeline that writes frontmatter.

## Effort estimate

1 session to draft + David review. 2-3 sessions to implement validator
+ backfill of newly-required fields + cleanup of retired ones.

## Decision

Deferred. This file exists so the slot is discoverable in
`content/Decisions/` listings and in the CLAUDE.md active ADR list.
