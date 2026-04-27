---
title: "Stories as data — design thinking from David, captured 2026-04-27"
type: design-note
status: open
owner: David + next Code Claude session
related-items: ["audit-item-9"]
---

# Stories as data — design thinking captured

This note captures David's plain-English vision for deferred audit
item #9 ("non-graph content layer"), expressed during the
2026-04-27 session. Implementation deferred to a fresh chat where we
can scope properly. This note is the seed material for that
conversation.

## David's framing (verbatim, lightly edited)

> For the website, we need to explain as much as possible, but where
> editorial doesn't get too crazy. I think that's where the system
> breaks slightly because editorial becomes too complicated.
>
> Stories should link to entity records by id, by name, by wikilink so
> we can connect through the vault and it has a story.
>
> We should probably have a stories page. If we see contradictions or
> things of that nature that the data is alerting us to, and by our
> system of design it's creating a narrative out of it, we should see
> that story.
>
> I think we would publish stories but these would be based on
> importance, how much editorial content I need to provide and how
> damning it really is.

## What I hear in plain English

The system already detects narrative-shaped patterns automatically —
contradictions (donor funds both sides), cross-policy opposition
recurrence (same donor blocks N policies), unusual stock activity,
timing proximity between donations and votes. Today these patterns
surface piecemeal in `/attention`, `/contradictions`, `/capitol-trades
/unusual`, etc.

David wants those patterns to graduate into **story candidates** —
first-class records that:

1. **Link to the entities they're about** — by entity id, name, or
   wikilink (multiple resolution paths so we can find them either way).
2. **Live on a stories page in ops** — like `/attention` but for
   narrative-shaped findings rather than data-quality findings.
3. **Get triaged by editorial weight** — David picks which ones to
   invest in based on (a) importance, (b) editorial work required,
   (c) how damning the underlying claim is.
4. **Publish selectively** — not every story candidate becomes a
   public story. The bar is editorial finish + legal review where
   needed. Probably an `editorial-readiness` flow: auto-generated
   draft → David edits → legal review (when high-risk) → published.

The tension David identified: **editorial gets too complicated and
the system breaks.** Stories must be auto-generatable from the data
*as a baseline*, with David adding the editorial layer where it
matters. If every story requires hand-curation from scratch, the
system doesn't scale beyond the current ~5 policies / ~10 stories.

## Resemblance to existing systems

This is structurally the same shape as `/policies` (which we just
finished). The /policies arc taught us the pattern:
- Auto-generated baseline content from canonical data
- Editorial overrides per record (`editorial_headline` on policies)
- Published via `data/public-routes.json`
- Harness check verifies output integrity (`policy-pages-integrity`)

A `/stories` system would mirror this. The differences:
- Stories are *generated* by detection logic (contradiction-miner,
  unusual-activity, timing-proximity), not hand-written records like
  policies.
- Stories link *to* entities rather than *being* about entities.
- The editorial finish layer matters more — a story that's just
  "donor X gave to politician Y while Y voted on Z" needs framing
  before publication.

## Open scoping questions for the fresh-chat session

Each of these is a real call. Don't decide them now:

1. **Story records: JSON or markdown?**
   Per David's "data-driven with some explanation" rule on /policies,
   leaning toward JSON-record-with-build-script-rendered-markdown
   pattern (same as policies).

2. **Detection sources.** Which existing detectors graduate to
   story-candidate generators?
   - `contradiction-miner.cjs` — already detects donor contradictions
   - `cross-policy-recurrence` — already in /policies as the badge
   - `unusual-stock-activity` — already in /capitol-trades
   - `timing-proximity` — already in query engine
   - All four feel like first-class story sources.

3. **Story → entity linking.** David said "by id, by name, by
   wikilink." Plain English: a story record has a `linked_entities`
   array where each entry can be resolved through any of those three.
   The librarian (ADR-0024) already does multi-form resolution; this
   is the natural consumer.

4. **Editorial readiness flow.**
   - `auto-generated` — detector produced a candidate
   - `triaging` — David has acknowledged it, deciding whether to invest
   - `drafting` — David is writing editorial content
   - `legal-review` — high-risk-editorial flag set, legal review pending
   - `ready` — passes editorial gate
   - `published` — appears on public site
   - `archived` — closed without publishing
   Same flow as profile content-readiness (ADR-0017), adapted.

5. **Public site presentation.**
   /policies has individual policy pages + a who-blocks-us cross-page.
   Stories likely have individual story pages + an index. Possibly
   grouped by tag (contradiction stories, money-flow stories, unusual-
   activity stories).

6. **Stories page in ops.** Like `/policies` review surface — table
   of candidates, filter by status, click to expand, edit / promote /
   publish actions. Probably mostly the same UI primitives we already
   have (PageHeader, FreshnessChip, SavedViewsBar, ops-only markers).

7. **Harness coverage.** Mirror `policy-pages-integrity` —
   `story-pages-integrity` check that verifies each story has its
   linked entities resolved, has a non-empty headline, etc.

## What's already built that this would consume

- **Librarian (ADR-0024)** — entity resolution by id/name/wikilink
  is the librarian's exact job. Story-to-entity links would resolve
  through it.
- **Contradiction miner** — one of the most natural sources of
  story candidates. Today writes to /attention; could also write
  story candidates.
- **/attention queue infrastructure** — the dispatcher + producer
  pattern is already proven. Story-candidate detection is just
  another producer that writes to a different store.
- **Class tag vocabulary (ADR-0001)** — stories would inherit class
  framing from the entities they touch.
- **Ops-only marker convention** — methodology footnotes on story
  pages can be ops-only (build provenance, detector source) the same
  way policy methodology is.

## What would need to be built new

- `data/stories.jsonl` — canonical store
- `scripts/lib/stories-store.cjs` + `scripts/lib/stories-schema.cjs`
- `scripts/build-story-pages.cjs` — auto-renders public pages from
  the JSONL store, similar to build-policy-pages
- `ops/src/app/stories/` — review + promote + publish dashboard,
  similar shape to `/policies`
- Migration plan: which existing detectors graduate to story-
  candidate producers, which stay at /attention only
- Editorial readiness state machine
- Public site stories index + tag pages
- Optional: `/stories` public route, gated through public-routes.json

## Estimated scope

Multi-session work. Probably:
- **Session 1: schema + store + a single producer** (e.g. wire
  contradiction-miner to also emit story candidates). Smallest
  end-to-end vertical slice.
- **Session 2: ops review surface** (/stories page).
- **Session 3: public render** (build-story-pages.cjs + public route).
- **Session 4: harness + remaining producers + cleanup.**

Or done piecemeal as backlog work. Either way, NOT a tail-end-of-
session task.

## Action item

When David starts a fresh chat for this, hand it this note + the
/policies build-script as the reference implementation. The pattern
generalizes naturally.
