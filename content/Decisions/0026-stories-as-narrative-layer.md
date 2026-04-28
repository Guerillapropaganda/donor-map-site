---
title: "ADR-0026: Stories as Narrative Layer"
type: adr
status: accepted
date: 2026-04-27
relates-to: 0024
amends: null
---

# ADR-0026: Stories as Narrative Layer

## Status

Accepted 2026-04-27. Establishes Stories (`data/stories.jsonl`) as a
distinct architectural layer that consumes the relationship graph (per
ADR-0024) and produces narrative drafts. Schema, store, contradiction-
miner graduation, ops UI, integrity harness check, and Verify panel
shipped same day across commits `a30b6354f`, `15328e6ce`, `7054dcb30`,
`73980b8e0`, `2b7080441`.

## Context

Three forces converged 2026-04-27 to require an architectural decision:

1. **Audit item #9** asked for a "non-graph content layer" — narrative-
   shaped findings that aren't a profile and aren't a relationship.
2. **The contradiction-miner had been writing 195 markdown seed files**
   to `content/Story Seeds/` since Phase 6, but those seeds were
   half-managed: not canonical, not state-tracked, not in the harness,
   not verifiable, and accumulating without triage.
3. **David asked the question** that surfaced the architectural truth:
   "What's the difference between this and Relationships? Aren't
   relationships the actual hardlined connections, and stories the
   draft of a narrative between two entities?"

That framing was correct and warranted a permanent decision record.

## The architectural separation

**Relationships** answer "what exists." Atomic facts. One edge per
true thing: `A → B = type`. Owned by `data/relationships.jsonl` and
the librarian (ADR-0024). Frontmatter relationship fields are read-
caches per Rule 1.

**Stories** answer "what's worth telling." Narrative interpretations
of *patterns* across multiple relationship edges. A single story
points at multiple entities via `linked_entities[]` and adds
editorial framing: severity, summary, state, archive reason, legal-
review flag.

Stories are NEVER the source of truth for any fact. Every claim in a
story traces back to a relationship edge or a `data/sources.jsonl`
record. This is Rule 4 ("AI translates, never generates") restated for
the new surface.

## Decision

Stories are a first-class architectural layer with:

- **Canonical store**: `data/stories.jsonl` (Rule 1 applies — write-
  through, store is source of truth)
- **Schema**: `scripts/lib/stories-schema.cjs` with frozen state /
  severity / detector_type / role enums
- **Read/write helper**: `scripts/lib/stories-store.cjs`
- **State flow**: `candidate → draft → ready → published` (with
  `archived` as a separate-track state for false-positive rejection;
  archive flow auto-writes to `data/false-positive-log.jsonl` so the
  detector won't re-surface)
- **Severity**: advisory display only — derived from detector
  confidence (1–5 → very-low to very-high), overrideable by editor.
  NEVER an automated publication gate. David's manual state move to
  `published` is the only thing that publishes a story.
- **Detector graduation pattern**: existing pattern miners
  (contradiction-miner, future cross-policy-recurrence, unusual-
  stock-activity, timing-proximity) write to `stories.jsonl` via
  `addOrFindStory()`. The contradiction-miner graduated 2026-04-27
  and stopped writing markdown seed files.
- **Ops surface**: `/stories` review dashboard with bulk actions,
  Verify panel, severity tooltips, state explainers
- **Harness coverage**: `story-pages-integrity-check.cjs` runs every
  15 min via dispatcher; flags stale, broken-ref, duplicate

Stories never live alongside relationships in `relationships.jsonl`,
never re-implement relationship semantics, and never assert a fact
that isn't already in the graph or in sources.

## Open architectural debt — librarian read path

The contradiction-miner currently reads profile frontmatter
(`donors:`, `opposes:`, `top-donors:`) to find both-sides patterns.
Per Rule 1 those fields are caches derived from `relationships.jsonl`,
so reading frontmatter is technically reading a projection of the
graph. But:

1. The current relationships graph is mostly UNTYPED. Of ~50K sampled
   edges, 96% are type `related` (generic), with only `political-
   opposition` (308) and `story-link` (1,776) carrying explicit
   semantic types. There's no `donated-to` or `funded` edge type
   today.

2. The frontmatter `donors:` distinction is therefore RICHER than the
   graph today. The donor/oppose split exists in frontmatter but not
   as graph edge types. Some derivation logic (likely in
   `rebuild-relationship-caches.cjs`) is doing more than type-mapping
   — possibly reading FEC source records or amount fields to classify
   `related` edges as donor-shaped.

3. This means a naive "have the contradiction-miner read the
   librarian instead of frontmatter" rewrite would lose information.

The right fix is multi-step:

  a. Audit `rebuild-relationship-caches.cjs` to understand exactly
     how `donors:` / `opposes:` are derived from `relationships.jsonl`
  b. Decide whether to enrich the relationships graph with explicit
     edge types (`donated-to`, `opposed-by`) so the librarian can
     answer the questions the miner asks today
  c. Rewrite `mineBothSides` (and the other miners) to read from the
     librarian using those typed queries
  d. Same treatment for future detector graduations (cross-policy-
     recurrence, unusual-stock-activity, timing-proximity)

This rewrite is tracked here in ADR-0026 as follow-up work. Until
done, the contradiction-miner reads frontmatter as a documented
shortcut. The Verify panel (`/api/stories/verify`) reads frontmatter
too, with the same caveat — when frontmatter and relationships drift,
verify reflects frontmatter truth.

## Consequences

**Good:**
- Detection logic is separate from narrative framing. Adding new
  detectors doesn't touch the editorial flow.
- The harness verifies pattern coherence, not just graph edges.
- False-positive log integration prevents re-surfacing rejected
  patterns automatically.
- `linked_entities[]` with role tags (subject / counterparty /
  mentioned) gives a clean schema for multi-entity stories.

**Cost:**
- One more canonical store to maintain in sync (mitigated by Rule 1
  patterns).
- The contradiction-miner reading frontmatter is an architectural
  irregular until the librarian rewrite lands.
- Decisions about WHICH detectors should graduate to story producers
  are editorial — not every pattern is a story.

**Closed by this ADR:**
- Audit item #9 ("non-graph content layer")
- Backlog: 195 orphaned Story Seeds in `content/Story Seeds/` (now
  in `data/stories.jsonl` with explicit state)

**Opened by this ADR:**
- Librarian-read-path rewrite for detectors (described above)
- Future detector graduations (cross-policy-recurrence, unusual-
  stock-activity, timing-proximity) — each its own scope conversation
- Public render of Stories — Session 3 work, gated by editorial
  state and `data/public-routes.json`

## Reference

- Schema: `scripts/lib/stories-schema.cjs`
- Store: `scripts/lib/stories-store.cjs`
- Detector: `scripts/contradiction-miner.cjs`
- Backfill: `scripts/backfill-stories-from-seeds.cjs` (one-time)
- Integrity: `scripts/story-pages-integrity-check.cjs`
- Verify endpoint: `ops/src/app/api/stories/verify/route.ts`
- Ops UI: `ops/src/app/stories/page.tsx`
- Design seed (David's framing, captured 2026-04-27):
  `content/Admin Notes/stories-as-data-design-thinking-2026-04-27.md`
