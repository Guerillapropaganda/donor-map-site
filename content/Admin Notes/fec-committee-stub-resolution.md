---
title: FEC committee stub → canonical entity resolution (follow-up)
type: report
status: resolved
kind: ticket
last-updated: '2026-04-28'
resolved-date: '2026-04-28'
auto-generated: false
owner: Code Claude
---

# FEC committee stub → canonical entity resolution

> **RESOLVED 2026-04-28 PM (third-session sweep). Original ~10hr scope
> turned out to be ~30 minutes once an actual audit ran.**
>
> What I expected (per the original framing below): a multi-session
> project building a resolver library, an ingest-time integration, plus
> editorial calls per committee.
>
> What actually happened:
> 1. Wrote `scripts/fec-committee-stub-audit.cjs` — walks every
>    FEC-derived edge file, finds committee_ids referenced on edges
>    that aren't mapped in `data/fec-committee-registry.json`.
> 2. First scan: **371 unregistered committee_ids in FEC edges,
>    accounting for 13,818 edges total.**
> 3. **368 of 371 (99.2%) exact-matched an existing vault entity by
>    `fec_name`.** Koch Industries → Koch Industries entity, AFL-CIO
>    → AFL-CIO entity, etc. The data was already aligned; the registry
>    just hadn't been told.
> 4. Auto-resolved all 368 via the audit's `--apply` flag.
> 5. Manually mapped the remaining 3 (Edward J. Markey → Ed Markey,
>    CLAUDIA TENNEY FOR CONGRESS → Claudia Tenney).
> 6. Re-ran audit: **0 stubs remaining.**
> 7. Audit registered in `vault-audit.cjs` so future FEC ingests that
>    introduce new stubs surface automatically.
>
> **Why the original scope was off:** the existing Admin Note assumed
> resolution would be hard (committee stubs vs canonical names mostly
> diverging). The actual data shows FEC committee `fec_name` fields
> were already canonical entity names because Research Claude had
> normalized them during entity creation. Only 3 cases had FEC's
> formal-name form ("Edward J. Markey" / "CLAUDIA TENNEY FOR CONGRESS")
> diverging from the vault's canonical form. The wall this scope was
> built around didn't exist.
>
> **Impact:** the librarian (which reads `fec-committee-registry.json`)
> now correctly attributes 13,818 edges to canonical entities. Story-
> evidence queries, money-trail aggregation, and any consumer going
> through the librarian benefit. The cjs harness checks
> (librarian-gap-audit, frontmatter-orphan-check) don't read the registry
> directly, so their counts are unchanged — that's a separate refactor
> tracked under "audits should use the librarian per ADR-0024."

---

## Why this exists (original framing — preserved for history)

Surfaced during the Phase A canonical-gap audit (ADR-0026 follow-up).
Initially framed as a missing-rebuild-handler problem; turned out to
be a deeper architectural gap that deserves its own scope.

## What I observed

The 2026-04-28 audit reported 8,882 graph-only donor entries and
43,784 graph-only politicians-funded entries. Both numbers looked
alarming. Investigation showed:

- **6,640 of 8,882** "missing donor" entries are on PAC/donor profiles.
  Schema convention says PACs have `politicians-funded:` for outgoing
  money, not `donors:` for incoming. By design, not a bug.

- **602 entries on 318 politician profiles** are real graph data not
  reflected in frontmatter. Sampling shows the missing entries are
  almost all FEC committee stub names, e.g.:
    - `MCCAUL FOR CONGRESS, INC`
    - `BOST, MICHAEL`
    - `BEN CLINE FOR CONGRESS, INC.`
    - `MARK ALFORD FOR CONGRESS, INC.`

- These are **other politicians' campaign committees** transferring
  money to the target via leadership PACs or joint-fundraising
  committees. Real donor activity, but the FROM-name is the FEC
  committee stub rather than the politician's canonical name.

- The rebuild script's gates **deliberately exclude** committee stubs.
  Per the comment in `rebuild-relationship-caches.cjs`:
  > *"Without these gates the PAS2 aggregator's recipient_cmte_id
  > resolution started routing money to FEC committee stubs (e.g.
  > 'MCCAUL FOR CONGRESS, INC'), which then leaked into politicians-
  > funded as raw committee names."*

  So loosening the gates would re-introduce known noise.

## What the right fix looks like

Build a resolver that maps FEC committee IDs → canonical entity names:

  `MCCAUL FOR CONGRESS, INC` (`C00444412`) → `Michael McCaul`
  `BOST, MICHAEL` (`C00524017`)            → `Mike Bost`

Once the graph edges are written with canonical entity names instead
of committee stubs, the rebuild script's gates can be loosened, and
the donors / politicians-funded gaps close automatically the same way
opposes did in Phase B-1.

## Where the resolver should live

Three components likely needed:

1. **`data/fec-committee-registry.jsonl`** — already exists. Currently
   maps committee IDs to candidate names per FEC. Verify completeness
   for leadership PACs / JFCs (these may not be in the candidate
   registry, only in `cm.txt` from FEC bulk).

2. **`scripts/lib/fec-committee-resolver.cjs`** (new) — given a
   committee ID OR a committee name, return the canonical entity
   name. Falls back to the stub name if no resolution found.

3. **Ingest-time integration** — the FEC PAS2/oth-transfers ingester
   should call the resolver before writing edges, so new edges land
   with canonical names. Existing edges need a one-time migration.

## Estimated scope

Multi-session — likely its own ADR and ~10 hours of work spread
across sessions:

- Session A: audit fec-committee-registry coverage, decide whether
  to enrich it from FEC bulk `cm.txt` for leadership PACs / JFCs
- Session B: build the resolver library + tests
- Session C: backfill canonical names on existing edges
- Session D: wire resolver into ingest pipelines so future edges
  land clean
- Session E: rerun rebuild-relationship-caches; donors + politicians-
  funded gaps should close automatically

## What's NOT in scope here

- Donor → politician monetary edges where both ends are clean
  entity names. Those work today.
- The opposes gap. Closed in Phase B-1 of the librarian rewrite.
- The 22 frontmatter-only opposes entries that are genuine editorial
  assertions (Wesley-Bell pattern, concept-level oppositions).
  Those are Phase C territory.

## Reference

- Phase A audit: `content/Admin Notes/relationship-cache-canonical-gap.md`
- Phase A diagnostic script: `scripts/relationship-cache-canonical-gap.cjs`
- ADR-0026 (Stories as narrative layer): `content/Decisions/0026-stories-as-narrative-layer.md`
- Existing committee registry: `data/fec-committee-registry.jsonl`
- Rebuild script gate comment: `scripts/rebuild-relationship-caches.cjs:127`
