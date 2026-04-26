---
title: "ADR-0025: Pipeline Janitor Mechanical-Demote Authority"
type: adr
status: accepted
date: 2026-04-25
amends: 0021
---

# ADR-0025: Pipeline Janitor Mechanical-Demote Authority

## Status

Accepted 2026-04-25. Carve-out amendment to Rule 9 (CLAUDE.md) /
ADR-0021 — `scripts/reclassify-readiness.cjs` is no longer the *sole*
script authorized to demote `content-readiness`; `pipeline-janitor.cjs`
shares that authority for a narrow, well-defined class of issues.

## Context

Rule 9 of CLAUDE.md says:

> *"Readiness flow: raw → draft → ready → data-complete → verified
> (ADR-0017). One authoritative script owns classification logic
> (`scripts/reclassify-readiness.cjs`). Never write new code that
> demotes content-readiness outside this script."*

The intent is clear: prevent random scripts from making editorial
judgments about whether a profile is ready. Readiness is a load-bearing
concept that affects publication, rendering, and the harness gate.

`pipeline-janitor.cjs` predates this rule. Its `--write` mode demotes
`ready`/`verified` profiles to `draft` and stamps `needs-reenrichment:
true` on any profile flagged with issues. Issues come in two flavors
the script doesn't currently distinguish:

1. **Mechanical issues** — the profile is structurally broken. The
   pipeline thinks the data is fresh (frontmatter key set) but the
   body block is missing, OR the profile is at `ready` without ever
   having pipeline data run, OR enrichment is ≥90 days stale, OR the
   profile's own `known-gaps`/`internal-notes` field declares it
   needs a pipeline re-run. These aren't editorial judgments — they're
   "the data layer is broken, treat it like new" facts.

2. **Advisory issues** — the profile fails type-specific A+ bars
   (ADR-0022): below the source-tier floor, defamation-prone phrases
   not legal-reviewed, missing central-thesis or story-grade,
   committee cross-references not run, both-sides donor patterns.
   These are publication-quality judgments that belong to the
   readiness owner (David + reclassify-readiness.cjs), not to the
   pipeline maintainer.

Because the current code calls `applyFix` indiscriminately, running
`pipeline-janitor.cjs --write` would demote ~606 profiles tonight —
but ~600 of those are advisory-only failures the janitor isn't
qualified to act on. So `--write` has been parked: too dangerous to
run, and Rule 9 forbids it anyway.

## Decision

**Pipeline-janitor `--write` is authorized to demote a profile iff
that profile has at least one MECHANICAL issue.** The mechanical issue
set is closed and lives in code as `MECHANICAL_DEMOTE_KINDS`:

- `zombie-block` — frontmatter key set, body block missing
- `missing-block` — `ready` profile with no pipeline data at all
- `never-enriched` — no `last-enriched` date set
- `stale` — `last-enriched` ≥90 days old
- `known-gap-pipeline` — the profile's own `known-gaps` field cites
  a pipeline gap
- `internal-notes-pipeline` — same, in `internal-notes`

Profiles whose only issues are `a-plus-*` (advisory) are NOT demoted
by the janitor. They surface in the dry-run report and on `/attention`
for editorial action. `reclassify-readiness.cjs` retains sole authority
to act on those.

## Rationale

The mechanical kinds aren't editorial judgments. "The body block is
missing" is a structural fact you can verify by string-matching the
file. "The pipeline declared this profile enriched but the data isn't
there" is a contradiction the pipeline maintainer is closer to than
the editor. Forcing this through `reclassify-readiness.cjs` would mean
duplicating the detection logic across two scripts (the janitor knows
how to detect zombies; reclassify-readiness wouldn't, unless we move
the detection too — at which point we've moved the script and not
solved the duplication).

The advisory kinds *are* editorial judgments. The janitor flags them;
the editor (David) decides whether to demote, rewrite, or leave as-is.
That's the right division of labor.

## Consequences

- **`pipeline-janitor.cjs` `--write` is safe to run** for the first
  time. Will demote profiles with mechanical issues only; leave
  advisory-only profiles at their current readiness. Demotion surface
  is much smaller than the current 606 finding count.
- **Rule 9 wording in `CLAUDE.md`** updates from "Never write new code
  that demotes content-readiness outside this script" to "Never write
  new code that demotes content-readiness outside this script
  *without an ADR*. ADR-0025 carves out pipeline-janitor for the
  mechanical issue set."
- The next session that adds a new mechanical-issue kind to
  `pipeline-janitor.cjs` should add it to `MECHANICAL_DEMOTE_KINDS`
  in the same commit; otherwise the new kind silently becomes
  advisory-only.
- **The advisory issues remain visible** via the harness
  `pipeline-janitor` check (which runs `--tier=a-plus`). They surface
  on `/attention` per the existing dispatcher cadence.

## Closes

- The "what to do about pipeline-janitor `--write`" question that has
  been deferred for several sessions.
- One of the longest-standing entries in the "things you wish you
  could automate but Rule 9 forbids" mental backlog.

## Opens

- Pipeline-janitor's existing `applyFix` function still adds a
  `[JANITOR YYYY-MM-DD]` note to `internal-notes`. That's a
  user-facing string in the editor's view; if we change the demote
  semantics later (e.g., demote-to-`raw` instead of `draft` for the
  worst cases), the note format may need a corresponding update.
- A future ADR may further split mechanical kinds into "demote to
  draft" vs "demote to raw" tiers — `never-enriched` might warrant
  a stronger demotion than `stale`, for example. Not in scope today.
