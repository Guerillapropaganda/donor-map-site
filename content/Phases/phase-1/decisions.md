---
title: Phase 1 Mid-Phase Decisions
type: log
phase: 1
last-updated: 2026-04-14
---

# Phase 1 Mid-Phase Decisions

Decisions made during Phase 1 implementation that aren't big enough for a full ADR but need to be recorded for continuity.

Format: one entry per decision, dated, signed with session identifier.

---

## 2026-04-14 — Foundation session (Code Claude)

### Source ID format: `src_NNNNNN` zero-padded
Chose 6 digits (supports up to 1M sources — way beyond foreseeable need). Sequential, no UUIDs. Rationale: stable, human-readable in diffs, sortable. Stored as string to avoid any JSON number truncation surprises.

### JSONL append-only with in-memory dedupe index
Following the `relationships-store.cjs` pattern. Store is lazy-loaded on first call, cached for the life of the process. `addOrFindSource` checks the URL dedupe index before writing. Updates mutate in-memory then rewrite the whole file (acceptable for ~10k sources; revisit if we hit 100k).

### Schema validator lives in separate module
Mirrors `relationship-edge-validator.cjs` pattern. `sources-schema.cjs` exports `validate(record)` that returns `{ ok, errors }`. Store calls it on every write. Pre-commit sentinel (future) can call the same validator.

### Status enum
Locked to: `unverified`, `live`, `dead`, `redirected`, `generic_orphan`, `archived`, `needs_review`, `paywall`. `paywall` is new vs the original spec — needed for NYT/WSJ case where we can't reasonably content-check.

### URL normalization for dedupe
Lowercase host, strip trailing slash, strip common tracking params (`utm_*`, `fbclid`, `gclid`), preserve query params that affect content (`?id=`, `?q=`). Applied only for dedupe key, original URL preserved in the record.

### Timestamp format
ISO 8601 with Z suffix (`2026-04-14T16:30:00Z`). No timezone conversion. All writes use `new Date().toISOString()`.
