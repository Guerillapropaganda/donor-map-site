---
title: "ADR-0027: Frontmatter Cache Prune Mode"
type: adr
status: proposed
date: 2026-04-28
relates-to: 0024, 0026
amends: null
---

# ADR-0027: Frontmatter Cache Prune Mode

## Status

Proposed 2026-04-28. Not yet implemented. Surfaces a load-bearing
asymmetry in `scripts/rebuild-relationship-caches.cjs` that produces
false-positive story candidates and lets editorial errors persist
indefinitely. Implementation gated on this ADR being accepted.

## Context

Three things forced this decision in the same session:

1. **The Crypto Industry Bloc / Elizabeth Warren ghost.** A both-sides
   story candidate fired at 5/5 confidence very-high severity. Verify
   confirmed the pattern: "Crypto Industry Bloc" was in both Warren's
   `donors[]` and `opposes[]`. But the librarian (ADR-0024) had **zero
   monetary edges** between them — only opposition edges. The
   contradiction was an artifact of bad frontmatter, not a real
   relationship.

2. **The harness check we shipped 2026-04-28
   (`scripts/relationship-overlap-check.cjs`) found this is not
   isolated.** Vault-wide scan: 65 same-profile overlaps where a name
   appears in both a funding field and `opposes`. 61 are real
   both-sides plays (DefendArizona ↔ Mark Kelly, NRA PVF ↔ G.W. Bush,
   Lincoln Project ↔ MTG — backed by real $ in the librarian). 4 are
   "frontmatter-only ghosts" with no librarian backing. Two halves of
   the Bloc/Warren case were two of those four.

3. **The root cause.** `scripts/rebuild-relationship-caches.cjs` is
   **additive-only**: it adds names matching canonical edges, but it
   never removes names that lack canonical backing. So any historical
   bad data — Research Claude's editorial conflations, a deprecated
   pipeline's stale output, a one-time hand-edit — persists in
   frontmatter forever, even though Rule 1 says these fields are
   "read-caches rebuilt from the canonical store." The cache is
   *write-only allowed to drift*. The contradiction-miner reads the
   frontmatter, takes the drift seriously, and produces stories the
   librarian cannot defend.

This violates Rule 1 in spirit. ADR-0024 declared the librarian the
source of truth, but the read-cache rebuilder doesn't fully obey it.

## The hard constraint

Aggressive auto-prune is unsafe. The same scan revealed
**Jamaal Bowman ↔ Fairshake PAC** as a frontmatter-only finding —
which is a librarian gap, not an editorial typo. Fairshake spent $14M
against Bowman in 2024; the FEC edges exist under a committee_id but
the librarian's resolver doesn't currently map "Fairshake PAC" to that
ID (the broader committee-stub-resolution problem tracked as a
separate multi-session project). If the rebuilder had auto-pruned
"Fairshake PAC" from Bowman's `donors[]`, it would have erased real
data because of an entity-resolution gap, not because the relationship
was fake.

So the rule "strip names not in the librarian" is wrong by itself.
The librarian is incomplete in known ways; pruning would compound the
incompleteness into permanent vault state.

## Options

**A. Aggressive auto-prune (rejected).** Default mode strips any
frontmatter name lacking librarian backing. Maximally enforces Rule 1.
**Rejected** because the librarian has known gaps and pruning would
erase real-but-not-yet-resolved relationships. Bowman / Fairshake is
the canonical example — there are likely thousands of similar cases
where the editorial truth is correct and the librarian is behind.

**B. Conservative auto-prune (rejected).** Only strip names matching
the narrow editorial-typo signal: in funding field AND in opposes AND
zero monetary edges in librarian AND at least one political-opposition
edge in librarian. **Rejected** because the same Bowman / Fairshake
case satisfies every condition: it's in `donors`, it's in `opposes`,
the librarian doesn't have the FEC edge under that name, and the
librarian does have political-opposition edges between them. The
narrow rule still erases real data when the librarian is incomplete.

**C. Diff-report mode + editor-in-the-loop (chosen).** The rebuilder
gains a `--report-orphans` mode that writes prune candidates to a
report file and an attention-queue entry. Each candidate carries:
profile, field, name, why-flagged, "open in /relationships review."
**Editor decides per case** — prune (typo), keep (librarian gap),
open ticket (need to fix librarian first). No frontmatter edits
happen automatically.

**D. Tiered auto-prune (deferred).** Auto-prune for fields where the
librarian is provably comprehensive (e.g. `donors[]` on politicians,
once FEC committee-stub resolution is finished); diff-report for
fields where it's known incomplete. Deferred until the
committee-stub-resolution project completes — without it we can't
prove which fields are safe.

## Decision

Option C: **diff-report mode + editor-in-the-loop**, no automatic
mutation of frontmatter relationship caches.

Concretely:

1. **`scripts/rebuild-relationship-caches.cjs` gains
   `--report-orphans`.** New mode (off by default). Walks every
   profile, computes `frontmatter_names \ librarian_names` per guarded
   field, writes per-name candidates to
   `data/frontmatter-orphan-candidates.jsonl` (canonical store —
   subject to Rule 1, edits go through this ADR's harness, never
   hand-edited). Each record:
   ```json
   {
     "id": "orphan_<sha>",
     "profile_path": "content/.../X.md",
     "field": "politicians-funded",
     "name": "Elizabeth Warren",
     "in_opposes": true,
     "librarian_monetary_edges": 0,
     "librarian_opposition_edges": 2,
     "first_detected": "...",
     "state": "candidate" | "approved-prune" | "kept" | "blocked-by-librarian-gap"
   }
   ```

2. **New harness check** `frontmatter-orphan-candidates`
   (`scripts/frontmatter-orphan-check.cjs`) reads the canonical store,
   reports state=candidate as findings_count, surfaces top-N to the
   attention queue. Runs every dispatcher tick.

3. **Ops UI surface** at `/relationships/orphans` (new view inside
   existing `/relationships` page). Per-row actions: ✂ prune (writes
   approved-prune to canonical, runs frontmatter edit + commit on
   next rebuild), 🔒 keep (state=kept, suppresses for 90 days),
   🚧 librarian-gap (state=blocked-by-librarian-gap, opens an
   attention-queue entry pointing at the underlying resolver issue).

4. **The actual prune writes happen during `rebuild-relationship-
   caches.cjs --apply-approved`** — only names with state=approved-
   prune get stripped. This stays inside the existing canonical-
   store-sentinel allowlist (the rebuilder is on the allowlist), so
   commits remain auditable.

5. **`relationship-overlap-check.cjs` (already shipped 2026-04-28)
   becomes a derived view** of frontmatter-orphan-candidates: the
   subset where `in_opposes=true`. It stays a separate harness check
   because the editorial-typo signal is narrower and more actionable
   than the generic orphan signal, but its data flows from the same
   underlying store.

## Rationale

- **Rule 1 in letter and spirit.** The frontmatter cache becomes
  consistent with the canonical store *when the editor explicitly
  approves it*. The rebuilder is no longer additive-only — it can
  remove names — but only with editorial sign-off recorded as canonical
  state.
- **Librarian gaps stay visible, not erased.** A `blocked-by-librarian-
  gap` state explicitly tracks "the editorial truth is correct, the
  data layer is incomplete." That becomes a queue we can drain when
  e.g. FEC committee-stub-resolution lands. Without this state, a gap
  becomes silent erasure.
- **Editor in the loop, but not in the path of every commit.** The
  per-case approval is asynchronous. Pipelines + dispatcher run as
  before; they just produce candidates, not edits. A weekly review
  pass clears the queue.
- **Aligns with ADR-0021 (Ops Stability Strategy).** Self-healing
  harness, no one-off audits, no auto-fix without an authority record.
  This is exactly the shape that ADR called for.
- **Aligns with Rule 22 ("auto-resolve bugs when fixing").** When the
  librarian is fixed (e.g. FEC committee-stub-resolution maps
  Fairshake's committee ID to the wikilink), the orphan candidates
  for that name auto-resolve on next harness tick. State transitions
  to "no longer orphan" without manual cleanup.

## Consequences

**Positive:**
- The Crypto Industry Bloc / Warren class of false-positive stories
  becomes systematically catchable, not an accidental discovery.
- The vault stops accumulating editorial typo debt forever.
- Librarian gaps get a name and a queue, not a silent erosion.
- The rebuilder finally fully implements Rule 1.

**Negative:**
- ~3-4hr build cost (rebuilder mode + harness check + ops UI).
- Adds a new canonical store
  (`data/frontmatter-orphan-candidates.jsonl`) that itself is subject
  to Rule 1 and its own pre-commit sentinel.
- Editor capacity is now in the loop. The first pass over the existing
  vault may surface hundreds of candidates — needs a triage budget.

**Risks:**
- The store could grow unwieldy if many candidates are deferred. Mitigated
  by the 90-day suppression on `kept` and the auto-resolve on librarian
  fixes.
- The "first scan" may overwhelm. Mitigated by rolling out per-field:
  start with `politicians-funded` (smallest scope, mostly Research
  Claude editorial), then `donors`/`top-donors` (largest, mostly
  pipeline output).

## Phasing

**Phase 1 (this ADR):** Rebuilder gains `--report-orphans`, writes
canonical store. Harness check registered. Initial vault scan,
findings logged. **No frontmatter writes.**

**Phase 2:** `/relationships/orphans` ops UI ships, three actions wired.

**Phase 3:** `--apply-approved` mode added. First batch of approved
prunes runs. Confirmation that the canonical-store-sentinel still
guards as expected.

**Phase 4 (future):** Tiered auto-prune (option D) becomes feasible
once FEC committee-stub-resolution closes the dominant librarian gap.
At that point we can promote `politicians-funded` to auto-prune
without editorial review, leaving only the still-incomplete fields in
the editor-in-the-loop path.

## Closes

Nothing. This is additive infrastructure.

## Opens

- The first vault scan will reveal scope. If it's >500 candidates,
  prioritization rules need to be added (which fields, which profiles
  first).
- `data/frontmatter-orphan-candidates.jsonl` schema may need fields
  not anticipated here (e.g. `last_seen` for self-resolving on librarian
  fixes — likely needed in Phase 1).
- Phase 4's tiered auto-prune is contingent on FEC committee-stub-
  resolution and possibly LDA pipeline reactivation. Track here as
  the upgrade trigger.

## Implementation hints

- Reuse `scripts/relationship-overlap-check.cjs`'s librarian-loading
  logic (`loadMonetaryPairs`) — already battle-tested, handles canonical
  + derived stores at scale.
- The ops UI page can be built on top of `/relationships`'s existing
  table component; the per-row action shape is identical to /sources
  and /attention.
- Pre-commit sentinel for `data/frontmatter-orphan-candidates.jsonl`:
  edits must come from `scripts/rebuild-relationship-caches.cjs` or the
  `/api/relationships/orphans` PATCH route. Add to the
  `canonical-store-sentinel` allowlist as a side-effect of Phase 1.
