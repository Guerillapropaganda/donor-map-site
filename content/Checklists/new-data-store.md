---
title: New Data Store Checklist
type: checklist
scope: any new canonical JSONL store added to data/
last-updated: 2026-04-14
authority: ADR-0003, ADR-0008
---

# New Data Store Checklist

Use this whenever a new top-level canonical store is proposed (e.g. `data/new-thing.jsonl`). This is how every existing store in Phases 1–5 was built; the pattern is load-bearing and should not be shortcut.

## The existing canonical stores

As of 2026-04-14 the locked list is:
- `data/sources.jsonl` — source registry (Phase 1)
- `data/relationships.jsonl` — canonical edge store (Phase 3)
- `data/entities.jsonl` — entity signals + class tags (Phase 2)
- `data/events.jsonl` — events with obstruction type (Phase 2.75)
- `data/policies.jsonl` — policy battle pages (Phase 2.75)
- `data/polling.jsonl` — polling data (Phase 2.75)
- `data/users.jsonl` — user records + tier (Phase 2.5)
- `data/claims/{slug}.jsonl` — claim-object profiles (Phase 4)

Adding a ninth store is an ADR-worthy decision.

## Steps

### 1. Write the ADR first
- [ ] **ADR drafted** in `content/Decisions/NNNN-slug.md`. Context → options → decision → consequences → closes → opens.
- [ ] **ADR lists what existing store(s) this replaces** if any, and why a new store (not a field on an existing store) is the right shape.
- [ ] **ADR lists the editorial function.** Is this factual data? Editorial judgment? Both? The defamation firewall lives at the schema layer, so the schema has to know.

### 2. Schema + validator
- [ ] **`scripts/lib/{name}-schema.cjs`** exports:
  - `validate(record)` → `{ ok: boolean, errors: string[] }`
  - `newRecord(partial)` → fully-populated record with defaults
  - Frozen enums for every controlled-vocabulary field
- [ ] **Every factual claim field has a non-null source requirement.** If the field can be used to make an assertion about a real person or organization, the validator enforces `source_ref` or `source_fallback_url`.
- [ ] **No free-text where an enum would do.** Every status, type, category field is an enum.

### 3. Store library
- [ ] **`scripts/lib/{name}-store.cjs`** with:
  - `load()` — read JSONL into memory
  - `append(record)` — validate-on-write, append if valid, throw if not
  - `update(id, patch)` — validate patched result, rewrite file atomically
  - `query(filters)` — filter helpers for callers
- [ ] **Validate-on-write is non-negotiable.** Bypassing the validator is how drift starts.
- [ ] **Atomic writes** — write to `.tmp`, rename. No partial-file corruption.

### 4. TS mirror for the Ops app (if Next.js reads it)
- [ ] **`ops/src/lib/{name}-store.ts`** — TypeScript-native mirror of the CJS store
- [ ] **Why a mirror?** Webpack can't follow dynamic `require(path.join(...))` at build time. The CJS store is the authority for scripts/pipelines; the TS mirror is the authority for the Ops Next.js runtime. They read the same JSONL file.
- [ ] **The two stay in sync** — if you change one, you change the other in the same commit.

### 5. Regression tests
- [ ] **At least one "schema rejects bad record" test** added to `scripts/phase-6-regression-tests.cjs`
- [ ] **At least one "store round-trip" test** if the store has non-trivial append/update logic
- [ ] **The test name maps to a real bug** — "schema rejects unknown X" where X is the field most likely to drift

### 6. Data integrity audit
- [ ] **`scripts/phase-6-data-integrity-audit.cjs` updated** to load this new store
- [ ] **Foreign-key validation added** — if records reference other stores' IDs, the audit walks them and reports unresolved refs
- [ ] **Audit still passes with zero failures** on current data

### 7. Pre-commit gate
- [ ] **If the store is hand-edited in PRs**, add a sentinel to `.husky/pre-commit` that validates staged lines against the schema
- [ ] **Existing `relationship-edge-sentinel.cjs` is the reference implementation** — copy its shape

### 8. Documentation
- [ ] **`CLAUDE.md` updated** — the new store is listed in the "canonical stores" enumeration and the "write path" rule applies
- [ ] **`content/Pipeline Guide.md` updated** if any pipeline writes to this store
- [ ] **`content/Build Phases.md` updated** if this store is a new phase deliverable
- [ ] **Ops UI built** if David needs to review/approve records manually (e.g. `/class-tags` for Phase 2 entity class_tags)

### 9. Ship verification
- [ ] **`npx quartz build` clean** with new store loaded
- [ ] **Pre-commit gate runs green** on a test commit
- [ ] **Data integrity audit runs green** with new store
- [ ] **Regression tests run green** (`node --test scripts/phase-6-regression-tests.cjs`)

## Shortcuts that are not allowed

- ❌ Writing to a store without a validator
- ❌ Skipping the TS mirror and letting Next.js dynamically require a CJS file
- ❌ Free-text fields where an enum would fit
- ❌ Factual claim fields without a source reference enforcement
- ❌ Adding a store without an ADR
- ❌ Adding a store without at least one regression test
