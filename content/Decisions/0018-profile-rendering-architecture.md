---
title: "ADR-0018: Profile Rendering Architecture — section-cards + ProfileTabs + wrap transformer"
type: adr
status: accepted
date: 2026-04-21
accepted: 2026-04-21
related: ADR-0017
---

# ADR-0018: Profile Rendering Architecture

## Context

ADR-0017 introduced the `data-complete` tier so the ~1,500-profile
database can publish publicly alongside the 50 editorial flagships.
The first live-exposure deploy revealed that the rendering wasn't
ready for the scale: auto-generated profiles dumped every FEC / IRS
/ LDA / USASpending data table into one vertical wall, tabs rendered
uselessly at the bottom with no content, the same editorial prose
appeared under every tab regardless of which was active.

We fixed the rendering through four iterative passes on 2026-04-21.
The resulting architecture is now load-bearing for the launch and
needs to be documented so future sessions (or any other Claude) don't
re-invent or silently break it.

## The three-part system

### 1. `.profile-section-card` — the unit of tab-grouped content

Every piece of body content that should be tab-navigable is wrapped in:

```html
<div class="profile-section-card" data-tab="<tab-id>" data-auto-block="<type>">
  ... content ...
</div>
```

**Contract:**
- Exactly one `data-tab` attribute, one of the recognized tab ids
  (`overview`, `contradiction`, `donors`, `recipients`, `wins`,
  `voting`, `executive`, `analysis`, `timeline`, `sources`).
- Optional `data-auto-block="<type>"` if the card was generated from
  a pipeline auto-block (fec-lifetime, irs-990, etc.). Used for
  introspection, not rendering.
- Optional `data-h2-wrapped="true"` if the card was generated from
  an editorial heading wrap rather than an auto-block.
- Cards do NOT nest. A section-card is the top-level unit inside
  `<article>`; never wrap one card inside another.

### 2. `ProfileTabs.tsx` — the client-side tab builder

Vanilla-JS component that runs on every page after DOM-ready. Pseudocode:

```
1. Detect profile type via article[data-profile-type] or
   .ph-header[data-profile-type]
2. Pick tab set:
   - donor-like (donor, corporation, pac, think-tank, lobbying-firm)
     → DONOR_TABS (Overview, Contradiction, Financials, Policy Wins,
       Analysis, Timeline, Sources)
   - presidential (chamber: Presidential, Cabinet, Governor, SCOTUS,
     specific cabinet roles)
     → PRESIDENTIAL_TABS (same but Executive instead of Voting)
   - else → POLITICIAN_TABS (Overview, Contradiction, The Money,
     Key Votes, Analysis, Timeline, Sources)
3. Query all .profile-section-card elements inside the article.
4. Group by data-tab attribute. Count per tab.
5. Emit a <nav.profile-tabs> at the TOP of the article with one
   <button.profile-tab-btn> per tab (marks empty tabs via
   .profile-tab-empty class).
6. On click: toggle .profile-tab-hidden on each card based on its
   data-tab. Remember last active tab in sessionStorage.
7. Viewport responsive: <800px switches to accordion mode
   (.profile-mode-accordion class on article) — no tab nav, all
   cards visible and stacked.
```

**Hard dependencies:**
- `ProfileHeader.tsx` must render on the page and emit a
  `.ph-header` element with a `data-profile-type` attribute. Without
  this, `isProfilePage()` returns null and tabs don't build.
- `quartz.layout.ts` `isProfilePage(page)` must include the profile
  type so ProfileHeader actually renders. Currently covers all
  ADR-0017 publishable types.

### 3. `wrap-profile-sections.ts` transformer — the content labeler

Quartz textTransform plugin that runs at build time. Pseudocode:

```
1. Read profile frontmatter to determine bucket (politician /
   presidential / donor).
2. wrapBlocks: for every <!-- auto:X start --> ... <!-- auto:X end -->
   pair, wrap in <div.profile-section-card data-tab="..."> whose tab
   is looked up in AUTO_BLOCK_TAB per bucket.
3. wrapEditorialH2Sections: linear scan of every H2/H3 heading in
   the body.
   - Compute disjoint section range: heading → next heading (any
     level), guaranteeing no nested wrapping.
   - Skip headings inside an already-wrapped card (preceding
     open-div count > close-div count).
   - Skip headings whose body contains an auto-block marker
     (wrapBlocks owns them).
   - Skip "Sources" heading (wrapSourcesSection owns it).
   - Assign tab via HEADING_TAB_MAP keyword match; unmatched
     headings inherit the last matched tab from preceding siblings
     (positional inheritance).
4. wrapSourcesSection: the final Sources H2/H3/H4 heading plus all
   content to end-of-doc wraps as data-tab="sources". An "Archived"
   subsection (### Archived) is split into its own collapsed
   <details> card so dead-URL citations don't clutter the active
   Sources list.
```

**Critical invariant: no nested `.profile-section-card` divs.**
Nested cards would be counted twice by ProfileTabs (once at each
depth), producing duplicate entries in the tab it claims AND every
ancestor's tab. The disjoint heading-range calculation in pass 3
guarantees this; the Koch Network crash (build6, `Cannot read
properties of null`) was a symptom of a previous nested-wrap bug.

## AUTO_BLOCK_TAB mapping (abbreviated; full table in source)

| auto-block type | politician | presidential | donor |
|---|---|---|---|
| data-panel | donors | donors | recipients |
| fec-lifetime / fec-donor / fec-individual / fec-summary / fec | donors | donors | recipients |
| voting-record / govtrack / sponsored-bills / congress-bills | voting | executive | voting |
| executive-orders / executive-actions / governor-exec-actions | voting | executive | voting |
| irs-990 / nonprofit-990 / propublica-990 / sec-edgar | donors | donors | recipients |
| lda-lobbying / federal-register | donors | donors | wins |
| usaspending / usaspending-subawards / usaspending-grants / sam-contracts | voting | executive | wins |
| court-listener / opensanctions / offshore / ofac / stock-trades / enforcement-* | analysis | analysis | analysis |
| harvested-sources / harvested-edge-citations | sources | sources | sources |

New auto-block types added by future ingest pipelines MUST be added
to `AUTO_BLOCK_TAB` in `wrap-profile-sections.ts` or they default to
"overview" (not ideal but not broken). Include a matching
`BLOCK_LABEL` entry so the card has a human-readable H3 heading.

## HEADING_TAB_MAP (editorial section routing)

Keyword-based patterns (`\bkeyword\b`, allow trailing text) map
editorial H2/H3 headings to tabs. Current keywords cover Who They
Are, Class Analysis, The Contradictions, The Money, Campaign Finance,
Key Votes, Executive Orders, Timeline, Policy Positions, and ~20 more
specific phrases. Unmatched headings use positional inheritance from
the preceding matched heading; if nothing has matched yet, default is
"overview".

Adding new patterns is low-risk: append to the array with a regex +
bucket mapping. Order matters — earlier entries win when multiple
match.

## Performance

Dense profiles (Koch Network, 302 KB HTML, 108 cards, 1,164 source
lines) need CSS perf hints to scroll smoothly:

```scss
.profile-section-card {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
  contain: layout style;
}
```

Browser skips layout + paint for off-screen cards. Tested on
Chrome/Edge/Safari 18+; gracefully degrades.

The reveal animation (`ProfileHeader.tsx animateProfile`) uses
IntersectionObserver with `rootMargin: 200px` so cards fade in
**before** entering viewport — user perceives instant load. 180 ms
transition, no stagger, one-shot unobserve. Previous 500 ms +
per-card stagger caused a 5-second cascade on Koch; that was the
"scroll lag" in David's review.

## Consequences

### Positive
- Every piece of body content belongs to exactly one tab.
- Auto-blocks and editorial prose coexist without fighting.
- ProfileTabs has no ambiguity about what to show/hide.
- New profile types + new auto-block types slot in via config, not
  architectural change.
- Dense profiles render without layout thrash.
- The `data-tab` attribute is a stable API — future components (TOC
  per ADR-0018.1, analytics, export) can query against it.

### Negative
- Writing profile markdown requires awareness of the heading
  hierarchy. An H3 in the wrong place routes to an unexpected tab.
- The transformer runs on every profile build; adds ~10 ms per file
  on dense profiles (acceptable, but non-zero).
- The POSITIONAL INHERITANCE catch-all can route content to a
  surprising tab if the preceding matched heading was unrelated. In
  practice the inheritance usually matches intent better than the
  old "overview" default, but edge cases exist.

### Required invariants for future development

1. **Never nest section-cards.** Any new wrapping logic must check
   for existing wrappers. The disjoint-range calculation in
   wrapEditorialH2Sections is the canonical pattern.
2. **Preserve `data-tab` attribute names.** Renaming a tab id breaks
   ProfileTabs' grouping. Safe to change the label (see
   Recipients → Financials in DONOR_TABS); unsafe to change the id.
3. **Don't emit section-cards outside `<article>`.** ProfileTabs
   queries within article; cards outside are invisible to it.
4. **Keep `ProfileHeader.tsx` rendering on every publishable profile
   type.** Its `data-profile-type` attribute is the only way
   ProfileTabs identifies profile pages.
5. **Any new ingest script emitting `<!-- auto:X -->` blocks must
   add its type to AUTO_BLOCK_TAB + BLOCK_LABEL in
   `wrap-profile-sections.ts`** to route correctly.

## Closes
- ADR-0017 §10 open item: renderer for data-complete profiles
- ADR-0017 §10 open item: graceful section skip

## Opens
- Per-profile table of contents (ADR-0018.1 or follow-up) — a
  sidebar TOC that lists section-cards grouped by tab, with click-
  to-jump + auto-switch-tab behavior. Drafted but not implemented
  this session.
- Tab-label-vs-id documentation — `Recipients` id renders as
  `Financials` label for donor-like profiles. Mismatch is
  intentional (backwards compat) but easy to trip on.
- Mobile accordion mode styling polish — currently functional but
  card ordering is dictated by source order, not tab order.
