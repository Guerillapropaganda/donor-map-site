---
title: "ADR-0024: Unified Graph Engine — One Library for Every Donor-Map Query"
type: adr
status: accepted
date: 2026-04-24
accepted: 2026-04-25
supersedes-partial: none
---

# ADR-0024: Unified Graph Engine

## Context

The Donor Map is, structurally, a single graph. Politicians, donors, PACs, think tanks, media figures, corporations, policies, and events are nodes. Money flows, opposition relationships, votes, trades, staffing, and editorial endorsements are edges. The canonical stores in `data/` (relationships.jsonl, entities.jsonl, policies.jsonl, fec-committee-registry.json, claims/*.jsonl, events.jsonl, etc.) are the source of truth for that graph.

The UI surfaces, however, never agreed on how to read it. Each ops page (`/profile`, `/relationships`, `/money-trail`, `/capitol-trades`, `/connections`, `/contradictions`, `/query`, `/ask`) grew its own read path against the same canonical stores. The public site reads frontmatter caches that are rebuilt on a separate path again, by `scripts/rebuild-relationship-caches.cjs`. The result: three answers to one question, with no shared validator catching when one of them is wrong.

The data-integrity bugs that have surfaced over the last six months are all symptoms of this:

- **Bioguide-id collisions** — multiple profiles claiming the same politician ID. Caught only when the duplicate-bioguide-sentinel was added; nothing structurally prevents the next one.
- **Fairshake / Future Forward USA registry confusion** (2026-04-23) — `data/fec-committee-registry.json` mapped FEC committee `C00669259` to the wrong vault profile. Every surface that read the registry propagated the error. No surface caught it because none had a "validate this mapping" step in its read path.
- **Wrong FEC numbers in profile prose** — frontmatter said "$2.4M from 6 mega-donors," prose said "10 mega-donors," the canonical store said something else. Three readers, three answers, no comparator.
- **Connections not connecting** — `/relationships` reads `data/relationships.jsonl` directly; profile widgets read frontmatter caches; the two drift. ADR-0021's `rebuild-relationship-caches.cjs` exists to close the gap but only runs periodically.
- **Multiple "alerts" surfaces** — pre-2026-04-24, `/alerts` and `/attention` both surfaced "things to fix" with parallel computation pipelines. Retired by ADR-0024-day commit `0b128fe4f`, but the same anti-pattern can recur for any data signal.

Beyond the bugs, the project's *thesis* is being held back. The Donor Map exists to argue, with evidence: **money flows shape ideology and policy.** That argument lives in queries like "for this politician, what do their top donors want, and how does their voting record line up?" Today, no UI surface answers that question end-to-end — every page shows a slice of the data and leaves the cross-referencing to the reader. The thesis can't be delivered in the current shape.

Two audiences are also being served on the same surface mass:

- **The normie reader** arrives at a politician's profile, wants a narrative: "here's who funds them, here's what they voted for, here's the class-analysis angle, here's where the connection lights up."
- **The journalist** arrives sideways with a query: "show me every donor funding politicians who claim to oppose each other," "find policies where the vote pattern correlates with donor giving more than with party affiliation," "trace the funding chain from this think tank to this politician through which media figures." Same graph, different door.

Both doors require the same underlying ability to walk the graph cleanly. Today, neither is well-served because the graph is fragmented across read paths.

## Decision

Build an **in-memory graph engine** as a shared library — `lib/donor-map/` — that:

1. Loads from the existing JSONL canonical stores (no schema migration, no new database).
2. Builds an indexed in-memory graph at startup.
3. Exposes a typed query API that **every consumer goes through** — ops pages, the public-site cache rebuilder, scripts, future surfaces.
4. Owns canonical entity resolution and validation. Bugs like the Fairshake mismapping become structurally impossible to display.
5. Is the home of both **plumbing queries** (resolve, neighbors, aggregate) and **thesis queries** (influence map, policy alignment, donor contradictions) — the latter as first-class, named operations.

The library is written in TypeScript, distributed both as an importable module to the Next.js ops app and as a CommonJS-compatible export to the cache-rebuilder script. The same code runs in both places. One bug fix, one place, applied everywhere.

The canonical stores remain JSONL on disk per Rule 1. The graph engine is a *read* layer; writes still go through the existing `scripts/lib/*-store.cjs` helpers as today.

### The query API

Three layers of queries, each building on the one below.

#### Plumbing — what every reader needs

These are the building blocks. Every page uses these directly or indirectly.

| Function | Plain English |
|---|---|
| `resolve(input)` | "Who is this?" Take a name, FEC ID, bioguide ID, or path; return the one canonical node, with validation. Throws if duplicate IDs exist or the FEC registry is inconsistent. |
| `neighbors(entityId, opts?)` | "What is this connected to?" Direct edges, optionally filtered by edge type and date range. |
| `paths(fromId, toId, maxHops)` | "How is A connected to B?" Returns all paths up to N hops, ranked by edge weight (dollars, frequency, recency). |
| `subgraph(seedIds, maxHops, edgeTypes?)` | "Show me the neighborhood." Returns nodes + edges for graph rendering. Powers the public visual graph view. |
| `aggregate(entityId, edgeType, dateRange?)` | "How much / how many?" Live computation from canonical edges; never reads frontmatter caches. |
| `timeline(entityId, edgeTypes?)` | "When did things happen?" Chronological list of edges affecting this entity. |

#### Thesis — what the project is *for*

These are the queries that prove the donor-map argument. Both audiences use them; the difference is how the result is presented.

| Function | Plain English | Normie use | Journalist use |
|---|---|---|---|
| `influenceMap(politicianId)` | "Who pays for this politician, what do they want, and is the politician delivering?" Returns: top donors with their stated interests (class tags), the politician's voting record on related policies, and an alignment score per donor cluster. | The story on a politician's profile page: "This politician's top funders care about X. Here's where they voted X. Here's where they didn't." | Filter all politicians by alignment-with-donors score; investigate outliers. |
| `policyAlignment(politicianId, policyId)` | "On this specific policy: did they vote for it, did their donors want it, did the vote match the donors more than the party?" | Profile sidebar: "On bill XYZ: voted yes. Their top donor cluster wanted yes. Their party voted no." | Find policies where donor-correlation > party-correlation across many politicians; surface the structural pattern. |
| `donorContradictions(donorId)` | "Does this donor fund people who oppose each other?" Returns the both-sides pattern with story potential ranking. | Donor profile narrative: "This donor gives to both Senator A and Senator B who publicly disagree on X." | Leaderboard of donors funding the most adversarial politician pairs. |
| `politicianContradictions(politicianId)` | "Where does this politician's stated platform diverge from what their donors want?" | "Politician claims to support X, but their top donors fund the opposition to X." | Filter all politicians by platform-vs-funding divergence; rank stories. |
| `bothSidesDonors(filter?)` | "Donors funding politicians who oppose each other." Returns: donor, paired adversaries, total to each, story potential. | Browseable list with narrative cards. | Filter by sector, date range, dollar threshold. |
| `influencePipelines(seedId, maxHops?)` | "Trace the money flow." Donor → think tank → media → politician chains. | Visual graph showing the chain with edge labels. | Export tabular for spreadsheet analysis. |
| `classProfile(entityId)` | "What's the class-analysis angle?" Per ADR-0001 vocabulary; returns class tags with confidence and the source edges that support them. | The Class Analysis section of a profile, surfaced in plain language. | Filter entities by class tag combination; cross-reference with voting patterns. |
| `votingDivergence(politicianId, dateRange?)` | "Which votes diverged from their stated platform?" | "On these N votes, this politician went against their own stated position." | Trend analysis across time. |

#### Composition — both audiences ride the same engine

Two surfaces consume the thesis layer:

- **Public profile page** (existing, today driven by frontmatter caches) — calls `influenceMap`, `policyAlignment`, `classProfile`, `donorContradictions`, renders narrative paragraphs and graph snippets. The reader doesn't know they're calling functions; they see a story.
- **Future journalist query tool** (planned, replaces today's `/query` + `/ask`) — calls the same functions with filters and ranges, renders sortable tables and exportable results.

Both surfaces ship the same numbers because they ship through the same library.

### Canonical entity resolution

The single highest-value piece of the library is `resolve()`. Today, every ops page does its own version of "given a name or ID, find the right profile." Each one is slightly different, slightly wrong in different ways. The Fairshake bug happened because three readers found three different "right" profiles for the same FEC ID.

`resolve()` is the **only** function permitted to translate inputs into canonical nodes. It:

- Loads `data/fec-committee-registry.json`, `data/entities.jsonl`, and the bioguide-master file at startup
- Validates every mapping at load time (no duplicate bioguides, no FEC IDs pointing at multiple profiles, no aliases overlapping)
- Throws a typed error on validation failure, with file path and line number
- Caches the resolution in memory; cache invalidates on canonical-store change
- Logs every "I had to disambiguate" event to a debug stream so we can see when input data is fuzzy

Validation failures at load = library refuses to start. This forces fixes upstream rather than letting bad data leak into rendered output.

### Architecture not chosen: hosted graph database

Neo4j, ArangoDB, or a hosted graph DB was considered. Rejected because:

- **Operational debt** — backup, hosting, schema migrations, network dependencies. David is solo; every layer of infra is cost.
- **Loses gitability** — current canonical stores are JSONL, gitable, human-readable, AI-readable. A graph DB binary store breaks that.
- **Scale doesn't justify it** — current corpus is ~3,300 profiles, ~62k monetary edges, 19,848 total edges. In-memory load is sub-second. The corpus could grow 10x and an in-memory engine still wins.
- **Reversibility** — if at some future scale the in-memory approach falls over, the *API* of `donor-map` stays stable and the storage layer underneath swaps out. Pages don't have to change.

Architecture not chosen: extending one of the existing scripts/lib helpers (`relationships-store.cjs`). The existing helpers are write-path utilities — they validate edges before insertion. The graph engine is a read-path layer that builds indexes and runs queries. Different concern, different code. They cooperate but don't merge.

### Migration strategy

Three risks dominate: behavior drift (new library returns different numbers from old reads), partial migration (some pages on new, some on old, indefinitely), and audience confusion (numbers change visibly when the public site cuts over).

Mitigations, in order:

1. **Build the library against today's canonical stores** with no UI changes. Land tests proving it returns the same shape on golden inputs.
2. **Run shadow mode for one week** — every old ops read also calls the new library and logs the diff to a file. Walk the diffs with David; confirm "yes, the new number is right and the old was wrong" or fix the library.
3. **Migrate `/profile` first.** Highest traffic, biggest data-integrity payoff. Stays in shadow mode against frontmatter cache for a week after migration.
4. **Migrate the cache rebuilder.** This is where the public site picks up the new numbers. Do this only after `/profile` has been on the new library for a week with diffs reviewed.
5. **Migrate remaining ops surfaces** — `/relationships`, `/money-trail`, `/capitol-trades`, etc. Order by usage frequency.
6. **Then** the UI consolidation work (the `/explore` page that replaces `/relationships + /money-trail + /connections + /contradictions + /query`). At this point pages share a backend so the UI merge is mechanical.

No flag day. Old paths stay live until each successor proves itself. The `feedback_stabilize_before_shipping` memory applies — drafts are fine, but cut over only when the new path is provably correct.

## Consequences

### What this enables

- **The Fairshake-class bug becomes structurally impossible.** One resolver, one validator, one place to fix.
- **The thesis is deliverable.** Functions like `policyAlignment` and `influenceMap` exist as named operations, not as ad-hoc cross-page queries.
- **The public site and ops share truth.** Cache rebuilder and ops pages run identical code; numbers can't drift.
- **The two audiences are served by one engine.** Normie narrative and journalist query mode are presentation layers on top of the same query API.
- **UI consolidation becomes safe.** Once pages share a backend, merging `/relationships + /money-trail + /capitol-trades + /connections + /contradictions` into one `/explore` is a UI change, not a data-correctness change.
- **Future scale is bought.** API stable; storage swappable. If we ever outgrow in-memory, swap the layer; surfaces don't notice.

### What this costs

- **Development time.** Realistic estimate: 4-6 sessions. Skeleton + tests (1), `/profile` migration with shadow mode (1-2), cache rebuilder migration (1), remaining ops surfaces (1-2). UI consolidation is on top of that.
- **Risk of behavior drift surfacing.** When the new library returns "correct" numbers, anything currently rendering "wrong" numbers will visibly change. Shadow mode + diff review is the mitigation but it requires David's attention during the cutover weeks.
- **Maintenance commitment.** The library becomes the canonical read path. Bugs in it ripple everywhere. This is the same risk we accept for any shared library; the upside is one place to fix bugs.
- **Opinionated typing.** TypeScript types for nodes and edges become load-bearing. Schema changes touch the library.

### What this does *not* address

- **Edit paths.** Writes still go through `scripts/lib/*-store.cjs`. The library is read-only. (A future ADR might unify the write path, but that's separate.)
- **The CSV-only enrichment phase.** The graph engine reads whatever the canonical stores contain; how those stores get filled is upstream.
- **Public-facing graph rendering.** That's a UI piece on top of the `subgraph()` query. Existing Quartz components (`InteractiveGraphs`, `DonorMapSidebar`) get their data from the library; the rendering work is separate.
- **Auth.** The library is server-side only. Public exposure of journalist queries is gated by ADR-0009 auth and ADR-0002 monetization decisions.

## Open questions

1. **Do thesis queries return rendered text or structured data?** Argued for structured data — let the surface decide presentation. Open to revisiting if normie narrative needs LLM-generated prose.
2. **Where does the class-analysis confidence come from?** ADR-0001 vocabulary defines tags but not how to compute confidence per entity. This ADR assumes `classProfile` returns whatever the canonical store has; if confidence needs computing, that's a follow-up ADR.
3. **Does the library need to expose write-path concerns at all?** Currently no. Open to revisit if a future surface needs "what would change if I added this edge?" preview functionality.

## Closes

(none — first ADR in this thread.)

## Opens

- Implementation work: build `lib/donor-map/` skeleton with `resolve` + `neighbors` + `aggregate` first.
- A future ADR on the journalist query tool UI that replaces `/query + /ask`.
- A future ADR on the `/explore` UI that consolidates `/relationships + /money-trail + /capitol-trades + /connections + /contradictions`.
- A future ADR on the public-facing visual graph (Obsidian-style) once `subgraph()` is in.

---

*Drafted 2026-04-24 by Code Claude in conversation with David. Accepted 2026-04-25. Implementation deferred to subsequent sessions; the three open questions in the body stay open until the relevant implementation session reaches them.*
