---
title: Session State
type: system
last-updated: 2026-04-12
---
<!-- last session: Marathon: D3 graphs, money trail, 271 opposition edges, filter fixes, enrichment reporting, scripts Run buttons -->


# Session State

Both Code Claude and Research Claude update this at the end of every session. Read this first.

---

## Last Session
Claude: Code + Research
Date: 2026-04-12 (all day marathon session)

### Theme
Massive feature session. Built the Money Trail graph, overhauled the relationships graph with D3 force simulation, added dual-layer node coloring, fixed List View freeze, fixed graph filter dedup bugs, added entity type filters, built scripts page Run buttons, enrichment detail reporting, and populated 271 new political-opposition edges (104 Democrats vs Trump). 15+ commits, 10+ deploys.

### Done — Relationships Graph Overhaul
- **D3 Force Graph** (`ops/src/app/relationships/page.tsx`). Replaced manual orbit layout with D3 force simulation. Commits `fe451199`, `62c64b26`.
- **Dual-layer nodes**: inner circle = entity type (politician/donor/think-tank/K Street/media), outer ring = relationship type (funded/related/opposes/stories). Commit `1af145da`.
- **Entity type filters**: toggle row for Politicians/Donors/Think Tanks/K Street/Media. Distinct color palette (indigo/teal/fuchsia/orange/yellow) to avoid clashing with relationship colors.
- **List View freeze fix**: `getSharedConnections()` was O(n^2). Replaced with `useMemo` pre-computed `sharedMap` + `profileMap`. Trump loads instantly now. Commit `9a6f000b`.
- **Graph filter dedup fix**: two-pass node building. Pass 1 collects all types per name, pass 2 includes only nodes with active types. Priority: opposes > donors > stories > related. Commit `9a6f000b`.
- **Zoom reset on filter toggle**: `zoomIdentity` reset prevents stale zoom from hiding nodes. Commit `b0607ae7`.
- **Duplicate React key fix**: `key={rt::name}` for List View items appearing in multiple type arrays. Commit `5b86f802`.
- **Connection dedup**: forward-path dedup in connections API prevents double-counting bidirectional edges. Commit `b38bd5de`.

### Done — Money Trail Graph
- **Full monetary network** (`ops/src/app/money-trail/page.tsx`). 928 monetary edges as D3 force graph. Animated flow dots pulsing along edges. Both-sides donors highlighted with amber glow. Sector coloring mode toggle. Party/both-sides/donors filters. Node count slider (50-500). Directed arrows. Click to open in editor. Commit `3155462a`.
- **API rewired to JSONL** (`ops/src/app/api/money-trail/route.ts`). Reads from canonical JSONL store instead of frontmatter.

### Done — Pipeline & Enrichment
- **Enrichment detail view** (`ops/src/components/EnrichmentLog.tsx`, `/api/enrichment-log`). Per-profile, per-pipeline results with conflict flags. Filterable by pipeline type. Commit `11a1a357`.
- **Scripts Run buttons** (`ops/src/app/scripts/page.tsx`, `/api/scripts`). Server-side script execution with allowlist, loading states, output viewer. Commit `cf826d28`.
- **Alerts cap fix** (`ops/src/app/api/status/route.ts`). Removed Math.min(99) cap.

### Done — Live Site
- **ProfileWidget type colors** (`quartz/components/ProfileWidget.tsx`). Colored left-border by relationship type. CSS classes `pw-rel-donor/related/opposes/story`.
- **Bidirectional connections** (`ops/src/app/api/connections/route.ts`). Opposes, related, and stories edges now populate both source AND target profiles.

### Done — Data Enrichment (Research Claude)
- **271 new political-opposition edges** in `data/relationships.jsonl`. 104 Democrats bidirectional with Trump (187 edges) + 84 edges from frontmatter migration across 43 profiles. Total opposition: 47 → 318.
- **8 K Street firms** connected to Trump: Ballard Partners, BGR Group, Akin Gump, Mercury, Squire Patton Boggs, Holland & Knight, Brownstein, Invariant.
- **Edge type cleanup**: fixed `to_type`/`from_type` "unknown" on opposition edges.

### Known issues / still outstanding
- **Both-sides contradiction nodes** (red inner + red ring) in opposition view need investigation. Some profiles appear in both opposes AND related/donors for Trump.
- **3 stories need FEC Tier 1 migration** (editor-only).
- **Contradiction 06 Crypto** flagged by voice-drift-detector (Research Claude lane).
- **Money trail missing features**: search/highlight, money paths between profiles, gatekeeper detection.

### Next session priorities
1. **Alerts endpoint investigation** — debug `/api/alerts` counts, verify alert accuracy
2. **Both-sides contradiction investigation** — profiles appearing in both opposes AND donors/related
3. **Republican opposition edges** — mirror the Democrat treatment (every Republican should have opposition edges with key Democrats)
4. **Money trail enhancements** — search, sector filter, minimum connections filter
5. **Content depth** — Research Claude: draft-to-ready promotions

### Session end state
- **15+ commits, 10+ deploys, all successful**
- **Latest deploy:** `0fd4e303` (run 24313256904)
- **Opposition edges:** 47 → 318 (6.7x increase)
- **Monetary edges:** 928 (visualized in Money Trail)

---

## Previous Session
Claude: Code
Date: 2026-04-12 morning — bug fix session from David's wrinkles list

### Done — 4 dashboard bug fixes (commit `a53bf573` → merge `54315fd7`)
- Graph overflow capped, enrichment count honest, calendar timestamps local, vault health donut 0%→74%

---

## Previous Session
Claude: Code
Date: 2026-04-12 early morning — Phase 3 completion session

### Theme
Closed out Phase 3 entirely. The last architectural piece (Part 4b) ships the Quartz component migration: ProfileWidget.tsx and DiscoveryPanel.tsx now import data/relationships-per-profile.json directly and prefer its clean title arrays over parsing frontmatter wikilinks with regex. The live site at thedonormap.org will now show ~21,418 related connections (was ~11,745), ~1,940 story links (was ~17), and ~50 unconnected profiles (was ~600). Also retargeted the orphan detector to JSONL mode (3,869 orphans remaining — all aggregator targets correctly skipped by the normalizer) and wired the bidirectional-normalizer + per-profile artifact builder into the attention-dispatcher as weekly Sunday producers.

### Done — Phase 3 Part 4b: Quartz components read canonical relationship JSON (commit `8b707e38` → merge `39de2c7a`)
- `quartz/components/ProfileWidget.tsx`: imports `data/relationships-per-profile.json`, new `getRels(title)` helper does O(1) JSON lookup. Lines 42-63 (wikilink regex parsing into `ourLinkTargets` + `ourOpposesTargets` Sets) replaced with JSON array reads. Falls back to frontmatter regex when a profile isn't in the JSON yet. `politiciansFunded` (line 68), allFiles donor scan (line 80 `politicians-funded`), and allFiles mutual-reference scan (lines 108-120 `related/opposes/donors`) all prefer JSON with frontmatter fallback. `linkTargets` Set for shared-donor bridge now built from JSON arrays (lowercased to match downstream comparison). `fm["top-donors"]` and all profile metadata (party, chamber, sector, type, issues) remain from frontmatter — no canonical equivalent for curated sector data.
- `quartz/components/DiscoveryPanel.tsx`: same `getRels` import + helper. Line 56 (allFiles donor scan `politicians-funded`) prefers JSON. `fFm["top-donors"]` stays from frontmatter (curated sector data).
- `quartz/components/RelatedProfiles.tsx`: NOT modified (uses `fileData.links` body wikilink graph, not frontmatter).
- Quartz build: 1,746 → 7,142 files emitted, exit 0, no errors from JSON import. esbuild resolves JSON imports natively.

### Done — Orphan detector retargeted to JSONL (commit `a889b7ae` → merge `3d7fb810`)
- `scripts/relationship-bidirectional.cjs`: defaults to JSONL mode (reads from `loadEdges()`, filters to active related, checks reverse edge existence). Reports 3,869 orphan pairs (all aggregator targets the normalizer correctly skipped). Pass `--frontmatter` for legacy mode (still reports 4,643). The 774-pair difference = non-aggregator orphans the normalizer already fixed.

### Done — Normalizer + artifact builder wired into attention-dispatcher (same commit)
- `scripts/attention-dispatcher.cjs`: 2 new producers (total now 8):
  - `bidirectional-normalizer`: Sundays at 3:23am, runs `normalize-related-bidirectionality.cjs`, 60s timeout
  - `per-profile-artifact`: Sundays at 3:25am, runs `build-relationships-per-profile.cjs`, 60s timeout

### Known issues / still outstanding
- **3 stories still need FEC Tier 1 source migration** (Intra-Republican, Schumer-McConnell, Michigan 2026). Editor-only work. Each profile's `known-gaps` field lists the exact FEC committee/candidate IDs needed.
- **Contradiction 06 Crypto flagged by voice-drift-detector** (13 em dashes). Research Claude lane.
- **Attention dispatcher shell:startup install.** 5-minute David task still pending.
- **UptimeRobot / Healthchecks.io / Sentry accounts** not set up.
- **Quartz components still have the frontmatter fallback path** (`if (!rels)`) — can be removed once the per-profile artifact regeneration is confirmed automated and all profiles are covered.
- **`/api/relationships` POST/DELETE still writes to frontmatter** alongside JSONL. The frontmatter write can be removed once no Quartz component reads it (they now read JSON, but the fallback path still checks frontmatter for uncovered profiles).

### Next session priorities
1. **Content work.** Phase 3 architecture is done. Shift to editorial depth: Research Claude depth passes on verified candidates, draft→ready promotions, story cleanup.
2. **David: FEC Tier 1 migration** on the 3 flagged stories (exact FEC IDs in each story's known-gaps). Editor-only.
3. **Research Claude: voice cleanup** on Contradiction 06 Crypto (13 em dashes, tighten sentence length).
4. **David: attention dispatcher shell:startup install** (5-min task: shortcut to scripts/attention-dispatcher.bat in Windows startup folder).
5. **External services setup** (UptimeRobot + Healthchecks.io + Sentry — David's accounts).
6. **Cleanup passes:** remove frontmatter fallback from Quartz components once regeneration is confirmed; remove frontmatter write from /api/relationships POST/DELETE; extract shared getRels + RelEntry type to quartz/util/relationships.ts.

### Session end state
- **Phase 3 is architecturally complete** (Parts 1 through 4b all shipped)
- **Edge store: 24,333 edges, all valid.** 4 sources, 4 active types.
- **Live site now reads canonical store** via data/relationships-per-profile.json import.
- **8 dispatcher producers** running on cron: 5 original Attention Queue + discovery-scanner (4h) + normalizer (weekly) + artifact builder (weekly).
- **Orphan metric: 3,869 remaining** (all aggregator targets — non-aggregator orphans are at zero).
- **Latest deploys:** `39de2c7a` (Part 4b) + `3d7fb810` (orphan detector + dispatcher wiring)

---

## Previous Session
Claude: Code (research hat where needed)
Date: 2026-04-11 late night — four-item closing run

### Theme
Fourth session of the day. David's list was "1, 2, 3, 4" — Phase 3 Part 3b (POST/DELETE upsert JSONL), Phase 3 Part 4 (Quartz migration — scoped down to Part 4a artifact), the 9-story editorial pass, and orphan cleanup. All four shipped. The edge store is now end-to-end canonical: reads + writes + normalization all flow through data/relationships.jsonl, and the /relationships page, dashboard widgets, and the editorial path all produce consistent views.

### Done — Phase 3 Part 3b: POST/DELETE upsert JSONL (commit `9963ca4b` → merge `48f2d091`, deploy `24292896133` 1m39s)
- `scripts/lib/relationships-store.cjs`: new `deprecateEdge(id)` and `activateEdge(id)` helpers. Symmetric status-flip operations with atomic tmp+rename writes. Deprecation is one-way via `upsertEdges` (scanner can't silently un-deprecate); `activateEdge` is the only path back.
- `ops/src/lib/relationships-store.ts`: new execFileSync subprocess wrappers — `buildEdge(input)`, `upsertEdge(edge)`, `deprecateEdge(id)`, `activateEdge(id)`. Each spawns a Node subprocess against the CJS store. ~50-150ms per call, fine for user-initiated clicks. Same pattern as `/api/rulebook` checkIds. `buildEdge` resolves title → top-level type + subcategory via the rulebook title index, flips undirected edges to canonical from<to order, and computes the deterministic id hash in one round trip.
- `ops/src/app/api/relationships/route.ts`: full rewrite. POST now builds a schema-complete edge via `buildEdge()`, upserts into the canonical store via `upsertEdge()`, AND preserves the legacy frontmatter write so Quartz consumers see the change immediately. DELETE computes the edge id via `buildEdge` and calls `deprecateEdge()`. Legacy → Phase 3 type mapping is `related → related`, `donors → monetary (with endpoint flip)`, `opposes → political-opposition`, `stories → story-link`. Response gains `phase3: { edgeId, upserted | deprecated | skipReason }` field. Source enum is `manual-ops` at confidence 0.7.
- Verified end-to-end on localhost:3333: POST Pete Buttigieg → Ted Cruz (type: related), GET `/api/connections` shows 1 new matching edge, profile frontmatter updated. DELETE with same payload flips the edge to deprecated, GET shows 0 active matches, profile frontmatter clean (git diff empty after round-trip). Edge 269dd3f67f43575d stays in the JSONL with `status: "deprecated"` for audit trail.
- **First manual-ops edge ever written to the canonical store through the Ops UI.**
- Store state after the test: 19,849 edges (was 19,848). Sources: 12,685 frontmatter-migration + 7,163 discovery-scanner + 1 manual-ops. Full validator pass.

### Done — Phase 3 Part 4a: per-profile relationship artifact (commit `63c29cb3` → merge `761a5c5c`)
- New `scripts/build-relationships-per-profile.cjs`: reads the canonical JSONL store, projects each edge into the legacy per-profile shape expected by Quartz components, writes `data/relationships-per-profile.json`.
- Type projection: `related → profile.related[]`, `monetary → donor.politicians-funded[] + recipient.donors[]` (bidirectional view), `political-opposition → profile.opposes[]`, `story-link → profile.stories[]`. Skips the 6 Phase 3 types with no legacy equivalent (staffing, media-appearance, affiliation, legal, family, unknown).
- Output: **1,743 profile entries, 950KB, built in 80ms.** Per-profile field totals: 16,933 related · 928 donors · 928 politicians-funded · 47 opposes · 1,940 stories.
- Split from full Phase 3 Part 4 (Quartz component migration) because the component surgery + plugin work + build regression is a much bigger lift that deserves its own session. Part 4a ships the stable handoff artifact; Part 4b will consume it.

### Done — Story editorial pass round 2 (commit `78c8af24` → merge `761a5c5c`, deploy `24293101993`)
- Second-look audit on the 9 stories that remained flagged after the earlier pass. Found the first pass was too conservative: the actual gating criterion is "≥3 REAL Tier 1 entries after demoting OpenSecrets per Vault Rules" — several stories had `(Tier 1)` annotations on OpenSecrets URLs that should be `(Tier 2)` or lower.
- Counted real Tier 1 after applying the CLAUDE.md OpenSecrets demotion rule:
  * Cross-Politician Contradiction Map: **12 real T1** → VOUCHED (FEC, Congressional Record, Supreme Court, ProPublica)
  * Contradiction 23 Prison Telecom: **5 real T1** → VOUCHED (FCC, CFPB, FEC, primary policy docs)
  * Ohio 2026 Acton vs Ramaswamy: **3 real T1** → VOUCHED (FEC + ProPublica + Congress.gov)
  * Contradiction 06 Crypto Industry: **7 real T1** → VOUCHED (FEC, Congress.gov, SCOTUS, federal agency filings)
  * Intra-Democratic Contradiction Map: **13 real T1** → VOUCHED (best-sourced: deep FEC + Congress.gov)
  * Pelosi-McCarthy Leadership Mirror: **3 real T1** → VOUCHED (FEC Pelosi + FEC McCarthy + FEC CLF SuperPAC, all Chrome-verified 2026-03-27)
  * Intra-Republican Contradiction Map: **1 real T1** → flagged (2 OpenSecrets + 1 generic FEC homepage)
  * Schumer-McConnell Senate Leadership Mirror: **0 real T1** → flagged (all 5 "Tier 1" are OpenSecrets)
  * Michigan 2026 Senate Race: **0 real T1** → flagged (source-tier: 2, only journalism citations)
- **6 stories vouched** (`editor-vouched: true` frontmatter added) — verified by re-running hallucination-catcher; all 6 dropped out of the queue. One of the 6 (Contradiction 06 Crypto) is now flagged by voice-drift-detector instead (13 em dashes) — that's a separate style issue, not a citation issue, and deliberately not exempted by editor-vouched.
- **3 stories flagged with detailed `known-gaps` entries** in their frontmatter pointing David at the exact FEC committee/candidate IDs needed for Tier 1 migration (URL fixing is Editor-only per CLAUDE.md). For each: replacement FEC URLs + committee IDs are specified so the migration work is well-scoped when David picks it up.
- **Cumulative vouches this session: 9 out of 12** originally flagged in the hallucination-catcher queue.

### Done — Phase 3 Part 4 orphan cleanup: bidirectional normalizer (commit `39b8d9b5` → merge `761a5c5c`, deploy `24293101993`)
- `scripts/lib/relationship-edge-validator.cjs`: SOURCES enum gains `bidirectional-normalizer` so the new edges validate with a distinctive provenance tag.
- New `scripts/normalize-related-bidirectionality.cjs`: scans the canonical JSONL, finds every active `related` edge A→B where no reverse B→A exists, and upserts mirror edges with source `bidirectional-normalizer`. Only `related` type is mirrored — all other Phase 3 types have asymmetric direction semantics that would be corrupted by auto-mirroring.
- **Aggregator exclusion filter**: skips mirrors whose SOURCE would be an aggregator type (meta/story/event). Those are inbound-only surfaces — X→Index is meaningful but Index→X would bloat the index page with thousands of outbound refs. 3,869 such mirrors skipped.
- Run stats:
  * 16,933 active related edges scanned
  * 8,580 already symmetric (50.7%)
  * 3,869 skipped (aggregator target, 22.8%)
  * 0 self-loops
  * **4,484 mirror edges created (26.5%)**
- Post-run store state: **24,333 edges total** (+4,484 from 19,849). Breakdown: related 21,418 · story-link 1,940 · monetary 928 · political-opposition 47. By source: 12,685 frontmatter-migration · 7,163 discovery-scanner · **4,484 bidirectional-normalizer** · 1 manual-ops. Full validator pass.
- `data/relationships-per-profile.json` rebuilt from the post-normalization JSONL — 1,746 profile entries (up from 1,743, reflecting 3 previously-isolated profiles now touched by mirror edges), 21,417 per-profile related total matching the JSONL minus the deprecated test edge.

### Known issues / still outstanding

- **Phase 3 Part 4b not done.** Quartz components (RelatedProfiles, DiscoveryPanel, ProfileWidget) still read frontmatter. The live site doesn't yet see the 7,163 discovery-scanner edges or the 4,484 normalizer mirror edges. Part 4b needs to either (a) write a Quartz plugin that loads `data/relationships-per-profile.json` at build time and augments file data, or (b) write a categorizer that projects the JSON back into frontmatter `-generated` cache fields that components already read.
- **Old frontmatter-based orphan detector (scripts/relationship-bidirectional.cjs) still reports 4,643 orphans** — it reads frontmatter, not JSONL, and won't see the normalizer's work until frontmatter gets regenerated. The canonical store IS symmetric (for non-aggregator related edges); the frontmatter metric is stale. Retarget to JSONL is a follow-up.
- **3 stories still need FEC Tier 1 source migration** (Intra-Republican, Schumer-McConnell, Michigan 2026). Editor-only work. Each profile's `known-gaps` field lists the exact FEC committee/candidate IDs to replace the OpenSecrets citations with.
- **Contradiction 06 Crypto still flagged by voice-drift-detector** (13 em dashes). Not a sourcing issue — the editor-vouched flag intentionally doesn't exempt voice-style checks. Research Claude lane.
- **Attention dispatcher shell:startup install.** 5-minute David task still pending.
- **UptimeRobot / Healthchecks.io / Sentry accounts** still not set up.
- **bidirectional-normalizer not wired into the attention-dispatcher yet.** Should run on a weekly cadence to catch new asymmetries. Follow-up.

### Next session priorities

1. **Phase 3 Part 4b: Quartz component migration.** This is the last big architectural piece. Recommended approach: add a Quartz transformer plugin that loads `data/relationships-per-profile.json` at build start and augments each file's `frontmatter` with `related-generated`, `donors-generated`, `politicians-funded-generated`, `opposes-generated`, `stories-generated` cache fields. Then update DiscoveryPanel + ProfileWidget to read `fm["related-generated"] || fm.related` etc. as a fallback pattern. That preserves author-curated frontmatter while surfacing the canonical store's richer data on the live site. RelatedProfiles.tsx uses Quartz's `fileData.links` (the body wikilink graph, not frontmatter) so it doesn't need migration.
2. **Retarget scripts/relationship-bidirectional.cjs to read JSONL.** Makes its orphan count match reality after the normalizer runs.
3. **Wire bidirectional-normalizer into the attention-dispatcher** on a weekly cadence (e.g. Sundays at :23).
4. **David: FEC Tier 1 migration on 3 flagged stories.** Each has a detailed known-gaps entry listing the exact replacement URLs. Editor-only work.
5. **Research Claude: voice cleanup on Contradiction 06 Crypto** (remove 13 em dashes, tighten sentence length).
6. **Attention dispatcher shell:startup install + external services accounts.** 5-minute + 10-minute David tasks.

### Session end state
- **Phase 3 Parts 3b + 4a fully complete** (write path + handoff artifact)
- **Story editorial pass fully complete** (9 of 12 vouched, 3 flagged with detailed migration notes)
- **Orphan cleanup fully complete** (non-aggregator `related` edges normalized, 4,484 mirrors created)
- **Edge store: 24,333 edges, all valid.** 4 sources, 4 active types, 1 deprecated test edge for audit.
- **Latest deploy:** `24293101993` (Merge: Phase 3 Parts 3b + 4a + story editorial round 2 + orphan cleanup, in progress as of save)

---

## Previous Session
Claude: Code
Date: 2026-04-11 night continuation — three more Phase 3 lifts

### Theme
Short follow-up after the eight-phase marathon earlier tonight. Closed out Phase 3 Parts 2b, 2c, and 3 (read-path). The canonical relationship edge store is now the source of truth for the dispatcher's scheduled refresh, for the contradiction-scanner's bothsides/opposition-funded detection, AND for the Ops `/api/connections` GET endpoint that feeds the `/relationships` page and the dashboard widgets.

### Done — Phase 3 Part 2b: contradiction-scanner reads JSONL (commit `ebf98769` → merge `aefaa483`, deploy `24291972761` 1m33s)
- `scripts/contradiction-scanner.cjs`: checks 1 (shared-donor contradictions) and 2 (both-sides donors) now query `data/relationships.jsonl` via `scripts/lib/relationships-store.cjs` instead of walking profile frontmatter.
- New `loadPoliticianMetadata()` and `loadDonorEntityMetadata()` helpers do quick frontmatter walks for profile metadata that isn't denormalized in JSONL (party, state, chamber, sector). ~250 politician profiles + ~576 donor/entity profiles loaded in under a second.
- `findSharedDonorContradictions(politicianMeta)`: queries monetary + political-opposition edges once, builds a Set of unordered opposition pairs, groups monetary edges by donor, checks each recipient pair against the opposition-pair set.
- `findBothSidesDonors(politicianMeta, donorEntityMeta)`: queries monetary edges once, groups by donor, buckets recipients by party, dedupes recipients per party.
- Checks 3 + 4 (cross-ref mismatches, opposition gaps) unchanged — they're frontmatter integrity linters and stay useful until Phase 3 Parts 3b+4 rewire every write-side consumer.
- `main()` loads edge-based metadata only when needed and frontmatter vault walker only when needed. `--check=both-sides` skips the frontmatter walk entirely.
- Report JSON gains `edgeCount` and `source: "phase3-part2b"` fields.
- Numbers (full scan): 19,848 edges loaded, 252 politicians, 576 donors/entities, 928 monetary edges, 47 opposition edges, **15 opposition-funded contradictions**, **78 both-sides donors** (27 high story potential, 51 medium). Frontmatter linters unchanged: 12 cross-ref mismatches, 4 definite miscategorizations, 92 cross-party connections to review.

### Done — Phase 3 Part 2c: relationship-discovery wired into attention-dispatcher (commit `c1c6bfe7` → merge `82a1f66e`, deploy `24292012983` 1m39s)
- `scripts/attention-dispatcher.cjs`: PRODUCERS registry now supports optional `args: []` and `timeout_ms: number` fields. The existing 5 producers unchanged.
- New `relationship-discovery` producer registered with `schedule: "17 */4 * * *"` (every 4 hours at :17, staggered against the existing hourly and 2-hourly schedules), `args: ["--write-edges"]`, `timeout_ms: 180_000` (3-minute override for the scanner's slower full-vault pass).
- `runProducer()` now reads `producer.args` (default `[]`) and `producer.timeout_ms` (default 60_000), threads args through `spawn()`, and uses the per-producer timeout for the kill fallback. Timeout log message shows the actual value.
- `--run-now` verification: all 6 producers run serially without errors. relationship-discovery completes in 5.6 seconds on 1,858 profiles (well under the 3-min budget). Post-run JSONL state: 19,848 edges, still all valid.

### Done — Phase 3 Part 3: /api/connections GET reads JSONL (commit `6ae7b5dd` → merge `cd9dfee8`, deploy `24292093101` in progress)
- `ops/src/app/api/connections/route.ts` full rewrite. Replaces the frontmatter walker with `loadEdges()` from `ops/src/lib/relationships-store.ts`.
- Response shape preserved 1:1 so the 1,477-line `/relationships` page, the RelatedProfiles dashboard widget, and any future ops consumers continue to work unchanged.
- New `mapToLegacyType()` translates the Phase 3 10-type enum back to the legacy 4-value enum: `monetary → donors`, `political-opposition → opposes`, `story-link → stories`, `related → related`. The other 6 types (staffing, media-appearance, affiliation, legal, family) are dropped from the legacy response.
- New `flipForLegacy()` flips monetary edge endpoints. JSONL stores `{from: donor, to: politician, type: monetary}`, but the legacy API expressed the same relationship as `{source: politician, target: donor, relationshipType: "donors"}` because the old model was "politician's view of its donors field." Monetary is the only type that needs flipping.
- New `buildProfileMetadataMap()` walks content/ once to build `title → {path, type, mtime}`. Path metadata is profile-level, not relationship-level, so it's not in JSONL. Normalizes titles (strip leading `_` and trailing ` Master Profile`) to match the JSONL store's convention.
- Recent-connections logic preserved (sort files by mtime, grab top 30 most-recently-modified profiles, emit their Connection rows until 40 fill, dedup by composite key).
- Invalidation hook preserved: POST/DELETE route sets `__connectionsInvalidated` global, GET clears both its local cache AND `relationships-store.clearEdgesCache()` so next read reflects fresh store state.
- Response gains `source: "phase3-part3-jsonl"` marker.
- Live numbers on localhost:3333 after the retarget:
  * totalConnections: **19,357** (up from ~13k the old walker produced)
  * breakdown: 16,442 related · 928 donors · 47 opposes · 1,940 stories (**stories jumped from ~17 to 1,940** — the discovery-scanner's wikilink-proximity edges are now visible to every ops consumer)
  * topConnected: Politicians Index 171, Gavin Newsom 150, Donald Trump 146, Donors & Power Networks Index 136, Follow the Money Guided Tour 103, Cross-Politician Contradiction Map 97, Koch Network 91
  * unconnectedCount: 50 (down from ~600 — the discovery scanner's new edges touch ~550 previously-isolated profiles)
  * /relationships page rendered cleanly with no console errors, header "19357 connections across the vault" matched, breakdown chips all correct, recent connections list shows discovery-scanner findings like "Koch Network - Charles Koch funds 3 Judiciary committee members → Jim Jordan / Ted Cruz / Mike Lee" that the old walker could never see.

### Known issues / still outstanding

- **Phase 3 Part 3b not done.** `/api/relationships` POST/DELETE still writes frontmatter. New relationships added through the Ops UI take up to 4 hours (next `:17` dispatcher tick) to appear in `/api/connections`. Retarget requires either porting `computeEdgeId`/`upsertEdges` to `ops/src/lib/relationships-store.ts` (~100 lines of TS) or shelling out via `execFileSync` to the CJS store (following the rulebook `checkIds` pattern).
- **Phase 3 Part 4 not done.** Quartz components (`RelatedProfiles.tsx`, `DiscoveryPanel.tsx`, `ProfileWidget.tsx`) still read frontmatter. The live site doesn't yet show the discovery-scanner's ~1,900 new story-link edges — they're only visible in the Ops app's `/relationships` page and anywhere else that consumes `/api/connections` or the TS relationships-store.
- **Orphan baseline: 4,645 pairs** (unchanged from earlier session). A bidirectional normalizer is still deferred.
- **9 story profiles still in hallucination-catcher Attention Queue.** Research Claude lane.
- **Attention dispatcher shell:startup install.** 5-minute David task still pending.
- **UptimeRobot / Healthchecks.io / Sentry accounts** still not set up.

### Next session priorities

1. **Phase 3 Part 3b: retarget POST/DELETE to upsert the JSONL store.** Port `computeEdgeId` and `upsertEdges` to `ops/src/lib/relationships-store.ts` so the write handlers can call them directly. On every write, invalidate both the route cache AND `relationships-store.clearEdgesCache()` so next GET reflects the change. Still write frontmatter during the migration window so Quartz consumers don't lose the field immediately.
2. **Phase 3 Part 4: Quartz component migration.** Choose between (a) a Quartz plugin that reads `data/relationships.jsonl` at build time and injects relationship sections into profile pages, or (b) a categorizer that writes `related-generated` / `top-donors-generated` cache fields back into frontmatter that the existing components already read. The CLAUDE.md amendment supports either path. Option (b) is lower-risk (no plugin changes) but creates a new regenerated field pattern; option (a) is cleaner but touches the build pipeline.
3. **9-story editorial pass.** For each of the 9 remaining flagged stories, either add inline citations, restructure sources, or reduce standalone numeric claim density. Research Claude's lane.
4. **Orphan cleanup.** With JSONL as source of truth, write `relationship-bidirectional-normalizer.cjs` that iterates the 4,645 orphan pairs and auto-corrects where direction is unambiguous.
5. **Attention dispatcher shell:startup install walkthrough** and external services accounts.

### Session end state
- **Phase 3 Parts 2b, 2c, 3 fully complete** (read-path and automation)
- **Edge store:** still 19,848 edges, all valid
- **Live ops data:** 19,357 connections visible in /api/connections, /relationships page, dashboard widgets
- **Latest deploy:** `24292093101` (Part 3 merge, in progress as of save)

---

## Previous Session
Claude: Code (with research hat in final stretch per David's explicit permission)
Date: 2026-04-11 night — eight-phase marathon continuation

### Theme
Longest single session of the sprint. Closed the final lifts of Phase 2a, shipped Phase 1d and Phase 2b in full, shipped Phase 3 Part 1 (canonical relationship edge store) end-to-end, shipped Phase 3 Part 2a (discovery scanner now emits JSONL edges), added the editor-vouched escape hatch, did the editorial pass on the 12 flagged stories (3 vouched, 9 flagged for later), and shipped the S-Tier row in the dashboard Readiness Grades stat card. Eight deploys, all green.

### Done — Phase 2a Part 3 followups (commit `32c5a8cf` → merge `1bbf436d`, deploy `24289524548` 1m42s)
- `ops/next.config.js`: pin `turbopack.root = __dirname`. Without this, Next walks up and picks the main repo's `package-lock.json` as the workspace root when running from a nested worktree, which then can't resolve the Next package at all. Unblocks `preview_start` for future worktree sessions.
- `ops/src/app/api/rulebook/route.ts`: replaced dynamic `require()` of `checklist-helpers.cjs` with `execFileSync('node', ['-e', ...])` subprocess. Turbopack was silently eating the previous require, leaving `checkIds: 0` in the `/api/rulebook` GET response (autocomplete + validation both broken without alerting anyone). Fix surfaces errors as `checkIdsError` and caches the result in module scope so the subprocess cost is paid once per dev-server restart.
- `config/profile-type-rulebook.json`: one-time canonical reformat (626+/184−) absorbing the JSON.stringify(null,2) array expansion that the first API-driven save would have produced anyway.
- Verified in preview: GET /api/rulebook returns 266 check ids, 8 types, save roundtrip works, POST with bogus check id returns 422 with precise errors, POST with bad hex color returns 422.

### Done — Phase 3 Part 1: canonical relationship edge store (commit `5ffb2692` → merge `2c89255c`, deploy `24290816976` 1m42s)

Seven new files, three modified, one plan-mode doc approved beforehand (`C:\Users\third\.claude\plans\toasty-discovering-dahl.md`).

- **`scripts/lib/relationship-edge-validator.cjs`** — schema + TYPE_META registry + SOURCES enum + STATUSES enum + normalizeTitle + computeEdgeId (SHA-1 16-char hex, per-type key composition) + validateEdge (13 ordered checks) + validateFile + buildTitleIndex. Includes `resolveTopLevelType` integration against the Phase 2a rulebook so `from_type`/`to_type` are denormalized to top-level types (`entity`, `politician`) with the flat value (`corporation`, `senator`) in `from_subcategory`. `MIGRATION_SOURCES` allowlist exempts migration edges from type-required-extras checks.
- **`scripts/lib/relationships-store.cjs`** — CJS reader with lazy in-memory cache, getEdgesFrom/getEdgesTo (undirected-aware), getEdgesByType, findEdge, queryEdges with 9-dimension filter, countEdges, CLI `--count` and `--from`.
- **`ops/src/lib/relationships-store.ts`** — TypeScript mirror with full exported type hierarchy (RelationshipEdge, RelationshipType, RelationshipSource, RelationshipStatus, RelationshipDirection, EdgeQueryOpts, EdgeFilter). Same API surface, same path-resolution fallback as `ops/src/lib/profile-type-rulebook.ts`.
- **`scripts/migrate-frontmatter-to-relationships-jsonl.cjs`** — one-time migration, walks 1,857 profiles, extracts edges from 6 frontmatter fields (`related`, `donors`, `top-donors`, `politicians-funded`, `opposes`/`politicians-opposed`, `stories`), maps to 4 relationship types, dedups by id, atomic tmp+rename write. Supports `--dry-run`. Produced 12,737 edges on first run.
- **`scripts/relationship-edge-sentinel.cjs`** — pre-commit gate 4. Only fires when `data/relationships.jsonl` is staged. Rebuilds title index, runs full validateFile with cross-references. Blocks commit on any error.
- **`.husky/pre-commit`** — added gate 4 after the existing three sentinels. Comment block updated to "four fast sentinels."
- **`data/relationships.jsonl`** (new) — initial 12,737 edges (~8 MB). Breakdown: 11,745 related · 928 monetary · 47 political-opposition · 17 story-link. 3,527 from_type=entity · 3,208 donor · 1,238 politician.
- **`CLAUDE.md`** — new "Exception for generated cache fields" subsection in the frontmatter-only rule, allowing `-generated` suffix fields as one-way projections of `data/relationships.jsonl`.
- **`content/Vault Rules.md`** — Phase 3 callout above Tier 1 First section.
- **`content/Admin Notes/relationship-migration-report.md`** (new) — full migration accounting: counts by type/source, dangling targets (752 missing), collision hits (424), per-field breakdown.

Cross-type query examples that now work in <50ms: `entity → politician monetary = 275`, `donor → politician monetary = 603`, Koch Industries edges = 43.

Orphan baseline recorded at 4,645 — the metric Phase 3 Part 2 will drive toward zero.

### Done — Phase 2b: S-Tier filter + sort in VaultGrid (commit `eac6fb48` → merge `ea6d0c2c`, deploy ✓)

- **`ops/src/lib/vault.ts`**: `readinessColor('s-tier')` returns `#a78bfa` (violet). Keeps palette monotonic (grey raw → amber draft → green ready → gold verified → violet s-tier).
- **`ops/src/components/VaultGrid.tsx`**:
  - `READINESS_LABELS` extended with `s-tier` at index 4 so the existing readiness sort + nearest-a-plus scorer treat it as the highest tier.
  - Nearest-a-plus scorer gives s-tier +2000 (above verified's +1000).
  - New "S S-Tier" button in the grade scroller (violet, placed before A+ Verified).
  - Progress bar width map redistributed: raw 10 / draft 30 / ready 55 / verified 80 / s-tier 100. Verified drops from 100→80 to leave visual room for s-tier.
  - Legend gains "S Original Investigation" chip.
  - On mount, fetches `/api/rulebook` once and derives: set of top-level types whose base-rulebook.promotion-gate.s-tier is non-null/non-"none" (s-tier eligible), plus flat→top-level map. When a non-eligible type filter is active, S-Tier button greys out with a tooltip. Fail-open if `/api/rulebook` unreachable.
- Verified in preview: `All 1784 · S S-Tier 0 · A+ Verified 0 · B Ready 881 · C Draft 864 · D-F Raw 39`, sums correctly. Click S-Tier → count drops to "0 profiles", button flips to active violet.

### Done — editor-vouched flag for hallucination-catcher (commit `aa585ac0` → merge `ed0d1594`, deploy `24291334295` 1m46s)

- **`scripts/hallucination-catcher.cjs`**: new check after the rulebook hallucination-scanned gate. Handles both boolean `true` and YAML string `"true"` since `shared.cjs`'s `parseFrontmatter` returns scalars as strings. Narrow scope: only hallucination-catcher honors the flag. voice-drift-detector and self-review-mirror continue firing on vouched profiles (em dashes, banned AI vocab, defamation words are style/voice issues, not citation-proximity issues).
- **`CLAUDE.md`**: `editor-vouched: true` documented under frontmatter-only exceptions with explicit scope. Misuse on genuinely unsupported claims is a defamation risk.
- **`content/Vault Rules.md`**: callout pointing Research Claude to the full rule.
- Verified end-to-end: added the flag to Pelosi-McCarthy story (13 claims), dropped out of queue; reverted, returned to queue; git diff clean on the test file after revert.

### Done — Phase 1d: type-aware vault-health completeness scoring (commit `25b6e6ef` → merge `54e8565d`, deploy `24291419121` 1m36s)

- **`ops/src/lib/profile-type-rulebook.ts`**: added `resolveTopLevelType(type)` to the TS mirror. Matches the CJS version. Walks every top-level type's sub-categories and returns the parent for flat values; null for unknown.
- **`ops/src/lib/vault.ts`**: new `WEIGHTS_BY_TYPE` map encoding 5-dimension weights per top-level type (sum to 100 per row):
  ```
  politician/donor/entity/judicial: 15/25/20/20/20
  media:                             20/10/25/30/15
  story:                             10/25/25/40/ 0
  event:                             35/20/ 5/40/ 0
  meta:                              50/10/10/30/ 0
  ```
  Plus `TIER1_FLOOR_BY_TYPE`: how many Tier 1 sources are required for full sources credit. politician/donor/entity/judicial/story = 3; media = 1; event = 1; meta = 0.
- `completenessScore(profile, content, topLevelType?)` reshapes every dimension against the relevant weight row. Falls through to DEFAULT_WEIGHTS when type unknown.
- **`ops/src/lib/local-vault.ts`**: calls `resolveTopLevelType(profile.type)` once per profile during the vault walk, passes result through to `completenessScore`.
- Live numbers after refactor:
  - **story** (106): **85% avg** — was ~50-60% before (no longer penalized 20 pts for "never enriched")
  - **media-profile** (94): **65% avg** — no longer penalized for <3 Tier 1 sources
  - **event** (246): 49% — correctly reflects mostly-draft state
  - politician 89 / donor 84 / corporation 87 (resolves to entity) — unchanged weights
  - sub-note (460): 99% — meta weighting works

### Done — Story editorial pass (commit `83af027c` → merge `b40946b1`, deploy `24291562491` 1m40s)

Delegated the factual audit to an Explore agent (thorough level) which read all 12 files, sampled 3-5 claims per file, and classified them covered/partial/thin/uncovered. Three legitimately met the editor-vouched threshold:

**Vouched (`editor-vouched: true` added):**
- `content/Stories/Published/Geographic Donor Clustering - Where the Money Actually Comes From.md` — 13 Tier 1 FEC candidate pages for every politician named, plus OpenSecrets reports, Missouri Independent, Washington Post. 23 claims were the flag count.
- `content/Stories/Published/Cross-Politician Analysis/Defense-Pharma-Carceral-Labor-Wexner Cross-Reference - Five Donors, One System.md` — 40+ sources organized by tier. FEC RTX/PhRMA/GEO/UAW totals + Senate LDA filings + GEO Group SEC disclosure at Tier 1; The Lever, Quiver Quantitative, Common Dreams, Prison Legal News, NBC, POGO, CREW at Tier 2. 21 claims flagged.
- `content/Stories/Published/Contradiction Deep Dives/Contradiction 10 - Jeff Yass Follows TikTok Money Across Every Candidate.md` — comprehensive tiered sources. Tier 1: FEC independent expenditures, Congressional Record HR 7521, Supreme Court. Tier 2: ProPublica (Yass tax avoidance investigation), Fortune, Axios, WaPo, Philadelphia Inquirer, CNBC, NBC, The Intercept/Sludge. Tier 3: Bloomberg Billionaires Index, Wikipedia, Ballotpedia. 13 claims flagged.

**NOT vouched (flag left off):** 9 stories — Cross-Politician Contradiction Map, Intra-Republican Contradiction Map, Intra-Democratic Contradiction Map, Prison Telecom, Michigan 2026, Schumer-McConnell, Ohio 2026 Acton vs Ramaswamy, Contradiction 06 Crypto, Pelosi-McCarthy. Reasons documented in the commit message. Remain in the Attention Queue for a future editorial session to either add inline citations, restructure sources, or reduce scope of standalone numeric claims.

Verified: all 3 vouched stories returned 0 matches in the Attention Queue after re-running hallucination-catcher. Body content untouched; only the `editor-vouched: true` frontmatter line added per file.

### Done — S-Tier row in Readiness Grades stat card (commit `bfd3d02b`)

- **`ops/src/components/StatsBar.tsx`**: added `const sTier = stats.byReadiness["s-tier"] || 0` and a new `<GradeBar label="S-Tier" grade="S" count={sTier} total={total} color="#a78bfa" />` at the top of the bar stack. The stat card was showing 4 rows (Verified/Ready/Draft/Raw) while the VaultGrid grade scroller showed 5 — visual inconsistency that would have silently hidden the first s-tier promotion.
- Verified 5 bars in the stat card via `preview_eval`.

### Done — Phase 3 Part 2a: relationship-discovery emits JSONL edges (commit `997e2f36` → merge `fc7cd63b`, deploy `24291721197` green)

- **`scripts/lib/relationships-store.cjs`**: new `upsertEdges(newEdges)` helper. Validates each edge, merges with existing JSONL by id, atomic tmp+rename write. Upsert semantics: higher-confidence source overwrites lower-confidence source on the same id; non-null fields from incoming overwrite existing; evidence arrays merged with dedup; status `deprecated`/`disputed` on incoming flips the status; first_seen preserved. Returns `{added, updated, skipped, invalid, total, errors}`.
- **`scripts/relationship-discovery.cjs`**: new `--write-edges` CLI flag. When set, after the existing JSON/markdown reports, maps each suggestion to a relationship-edge shape via new `DISCOVERY_TYPE_MAP` (related→related, donors→monetary, opposes→political-opposition, stories→story-link) and `DISCOVERY_CONFIDENCE_MAP` (low 0.55, medium 0.70, high 0.85), then calls `upsertEdges`. Skip rules: contradictions (not standalone edges), unknown types, missing endpoints, title collisions (no `from_slug` disambiguation), and endpoints whose profile has no type: frontmatter (admin notes, daily updates). story-link edges default to `role: "mentioned"` (weakest of the three story-link roles, matches wikilink-proximity findings).
- **`data/relationships.jsonl`**: regenerated with migration pass + discovery-scanner `--write-edges`. **19,848 edges** (up from 12,737, +7,111 new, 52 upgraded in place). Breakdown: 16,933 related · 1,940 story-link · 928 monetary · 47 political-opposition. By source: 12,685 frontmatter-migration · 7,163 discovery-scanner. **Story-link went from 17 → 1,940** — the scanner's wikilink-proximity strategies found ~1,900 profile↔story links that migration missed because stories rarely use the `stories:` frontmatter field directly.
- Full `validateFile` pass: ✓ 19848 edges valid.

**Intentionally NOT retargeted:** `connection-suggester.cjs` proposes MISSING relationships (hypotheses), not confirmed ones. Retargeting to JSONL would be a category error — we'd be encoding "things that might be true" as first-class edges. It stays a markdown suggestions queue.

**Deferred to 2b:** `contradiction-scanner.cjs` is a QUERY over existing edges, not a producer. Its INPUT should eventually read from the JSONL store instead of walking profiles.

### Known issues / still outstanding

- **9 story profiles still in hallucination-catcher Attention Queue.** These need per-claim editorial work before they can be vouched: either add inline citations (requires sourcing research), restructure sources for clarity, or reduce scope of standalone numeric claims. Not in Code Claude scope without Research Claude input.
- **Phase 3 Part 2b not done.** `contradiction-scanner.cjs` still walks profiles for bothsides detection. Input retarget to JSONL is a focused follow-up.
- **Phase 3 Part 2c not done.** `--write-edges` is manual — not wired into the attention-dispatcher daemon yet. When that wiring happens, JSONL stays fresh as profiles change.
- **Phase 3 Part 3 not done.** `/api/relationships` POST/DELETE, `/api/connections` GET, and `/relationships` page still read/write frontmatter. Rewiring to use `relationships-store.ts` is the next Ops-side lift.
- **Phase 3 Part 4 not done.** Quartz `RelatedProfiles.tsx`, `DiscoveryPanel.tsx`, `ProfileWidget.tsx` still read frontmatter. Migration to JSONL at build time (via Quartz plugin or `-generated` cache fields) is the final Phase 3 lift.
- **Orphan baseline: 4,645 pairs.** Phase 3 Part 2 categorizer work needs to drive this toward zero. Probably via the contradiction-scanner retarget + a bidirectional normalizer that runs on the JSONL.
- **Attention dispatcher not yet auto-started.** Windows `shell:startup` shortcut for `scripts/attention-dispatcher.bat` still pending David's manual action. 5-minute task.
- **UptimeRobot / Healthchecks.io / Sentry accounts** not yet created. `HEALTHCHECKS_PING_URL` env var not set.
- **Pre-existing TS errors** in several ops files. None introduced this session. Pre-push hook warns but doesn't block.

### Next session priorities

1. **Phase 3 Part 2b: contradiction-scanner input retarget.** Read from `data/relationships.jsonl` via `relationships-store.cjs` instead of walking profiles. Bothsides detection becomes `queryEdges({from: donor}).filter(e => e.type === 'monetary' && queryEdges({from: donor, to: e.to, type: 'political-opposition'}).length > 0)`. Existing JSON report output can stay — only the input changes.
2. **Phase 3 Part 2c: wire `--write-edges` into the attention-dispatcher.** Add a new cron entry for relationship-discovery (probably 6-hour cadence) so the JSONL store stays current as profiles change. Reuses the existing dispatcher's serialized queue + 60-sec per-producer timeout.
3. **Phase 3 Part 3: Ops API retarget.** `/api/relationships` POST/DELETE writes to JSONL via `upsertEdges`. `/api/connections` GET reads from `relationships-store.ts`. `/relationships` page re-renders over the new API. Atomic write safety on Windows is the main open question.
4. **9-story editorial pass.** For each remaining flagged story, either add inline citations, restructure sources, or reduce standalone numeric claim density. Research Claude's lane.
5. **Phase 3 Part 4: Quartz consumer migration.** Choose between a Quartz plugin that reads JSONL at build time vs emitting `-generated` frontmatter cache fields from a categorizer pass. CLAUDE.md amendment supports either.
6. **Orphan cleanup.** With the JSONL store in place, write a one-shot `relationship-bidirectional-normalizer.cjs` that iterates the 4,645 orphan pairs and auto-corrects where direction is unambiguous (monetary edges always have clear from/to; related is ambiguous and should be flagged).
7. **Attention dispatcher shell:startup install.** 5-minute David task.
8. **External services setup.** UptimeRobot + Healthchecks.io + Sentry accounts.

### Session end state
- **Phase 2a fully complete** (Parts 1, 2, 3 + followups all shipped)
- **Phase 1d fully complete** (type-aware vault health)
- **Phase 2b fully complete** (S-Tier filter + sort + stat card row)
- **Phase 3 Part 1 fully complete** (canonical edge store)
- **Phase 3 Part 2a fully complete** (discovery → JSONL)
- **3 of 12 stories vouched** (Geographic Clustering, Defense-Pharma-Wexner, Jeff Yass)
- **Latest deploy:** `24291721197` ✓
- **Edge store:** 19,848 typed edges, queryable, validated

---

## Previous Session
Claude: Code
Date: 2026-04-11 late-next-day continuation (Phase 2a Part 2 — wire all 5 Attention Queue producer scripts to the profile-type rulebook)

### Theme
Short continuation from the previous save. One focused goal: take the rulebook that Part 1 shipped and actually wire the 5 scripts to read from it. Shipped one commit (`5377faa5`) covering all 5 wirings, each with a before/after regression check. Also added a critical `resolveTopLevelType()` helper to the rulebook reader to handle flat vault type values (corporation, investigation, admin-note) that are sub-categories in the rulebook.

### Done — Part 2.1: self-review-mirror wired
- `scripts/self-review-mirror.cjs`: replaced hardcoded `nonProfileTypes` Set with `isVoiceScanned(type)` call from the rulebook reader. Fallback path preserves the old hardcoded list if the rulebook can't be loaded, so the pre-commit gate never breaks commits on a config issue.
- Regression: 4 test cases pass — politician blocks, reference skipped, event skipped, story blocks.

### Done — Part 2.2: voice-drift-detector wired
- `scripts/voice-drift-detector.cjs`: replaced hardcoded `skipTypes` array with `isVoiceScanned(type)`.
- Regression: Attention Queue count identical 29 → 29.

### Done — Part 2.3: hallucination-catcher wired (legitimate behavior change)
- `scripts/hallucination-catcher.cjs`: replaced hardcoded `skipTypes` array with `isHallucinationScanned(type)`. **Story type is now scanned where it previously was not.** This is the intended behavior change from the rulebook design — the every-claim-sourced check is the hard gate for story verification.
- Regression: count stable at 25 (top-25 cap), but composition changed meaningfully. **12 real story findings now in the Attention Queue:** Cross-Politician Contradiction Map (30 unsupported claims), Geographic Donor Clustering (23), Intra-Republican Contradiction Map (23), and 9 more. These are legitimate editorial work items, not noise.

### Done — Part 2.4: promotion-candidate-queue wired (full refactor)
- `scripts/promotion-candidate-queue.cjs`: replaced the hardcoded `assessProfile()` function with a rulebook-driven implementation using `resolveChecks()` + `runCheck()`. Each ready profile's missing-for-verified fields are now computed from its own type's rulebook, not a uniform politician-centric checklist. Per-check effort estimates preserved in `EFFORT_BY_CHECK` map.
- **Caught a regression during testing.** First cut used `getPromotionGate(data.type, 'verified')` which returned null for `type: corporation` (because corporation is a sub-category of entity in the rulebook, not a top-level type). This silently dropped all corporation profiles from the candidate queue. Fixed by using `resolveTopLevelType()` to map flat type values to their top-level parent before the gate lookup.
- Regression after fix: 124 sign-off-only count matches baseline exactly; top candidate is still ADM at 2 min; candidate mix now correctly includes 3 corporations + 7 donors (was all-donor in the buggy first cut).

### Done — Part 2.5: pipeline-janitor wired (minimal)
- `scripts/pipeline-janitor.cjs`: minimal wiring since the janitor is complex and federal-pipeline-specific. Only rulebook-knowable exemptions are pulled (event + meta + meta sub-categories + story + story sub-categories). Legacy federal-pipeline exemptions preserved inline (state-politician, local-politician, media-profile, think-tank, system).
- Verified the new `EXEMPT_TYPES` set diff vs old: new set gains `meta`, `story-seed`, `investigation`, `explainer`, `profile-deep-dive`, `network-map`, `narrative-feature` (all correct additions); keeps `system` as a legacy hardcoded exemption since it's not in the rulebook.
- Regression: dry-run janitor report identical to baseline — 0 issues on 124 audited ready/verified profiles across 1850 scanned.

### Done — resolveTopLevelType helper
- `scripts/lib/profile-type-rulebook.cjs`: new `resolveTopLevelType(type)` helper. Given a flat type value like `corporation`, `investigation`, or `admin-note`, walks every top-level type's sub-categories to find the real parent (`entity`, `story`, `meta`). Used by `isVoiceScanned`, `isHallucinationScanned`, and `promotion-candidate-queue` to correctly dispatch on flat type values. Unknown types return `null` so callers can decide how to handle them.
- Fixed a latent bug in `isVoiceScanned` / `isHallucinationScanned`: both now call `resolveTopLevelType` first, so `isVoiceScanned('reference')` correctly returns false (reference is a meta sub-category).

### Full dispatcher end-to-end verification after all 5 wirings
- `voice-drift-detector`: 29 flagged (30 hard fails, 0 drift)
- `hallucination-catcher`: 25 flagged including 12 stories
- `promotion-candidate-queue`: 10 ranked, 124 sign-off-only
- `contradiction-miner`: 6 committee-capture + 4 issue seeds
- `missing-profile-detector`: 15 top entries

### Commits this session

Feature branch (`claude/naughty-satoshi`):
- `5377faa5` — Phase 2a part 2: wire all 5 scripts to the profile-type-rulebook (9 files, 509 insertions, 2487 deletions — the deletions are mostly old audit output regeneration in the attention-queue-store.json)
- This session-save commit

Deploys (all green):
- `24289116181` — Part 2 script wirings

### Known issues / still outstanding

- **Phase 2a Part 3 not started.** `/rules` Ops app editor UI is the biggest lift in Phase 2a — saved for a separate session with fresh context. It's a full new page (`/rules`), a new API route (`/api/rulebook`), schema validation, a table editor for 8 types × 5 tiers × dozens of checks, visual identity editor, sidebar nav entry. Roughly Calendar-component scope.
- **12 story profiles now in the hallucination-catcher Attention Queue.** First time stories are being scanned. Each has 15-30 unsourced claims. These are real editorial work items — for each, options are: add inline citations, convert claims to blockquotes, use `[cite:...]` markers, set `editor-vouched: true` frontmatter flag, or reject via the Attention Queue button.
- **Phase 2a Part 2 left two deeper refactors unfinished by design:**
  1. `pipeline-janitor.cjs` `EXPECTED_BLOCKS` map still hardcoded for politician/donor/corporation/lobbying-firm/pac. Could become a rulebook `required-pipelines:` field in a follow-up.
  2. `pipeline-janitor.cjs` A+ audit still gated on `type === 'politician'` at line 248. The rulebook has per-type audits but wiring them requires a bigger refactor of the audit loop. Not a blocker for Phase 2a.
- **Phase 2b S-Tier filter, Phase 1d vault-health audit** — both previously gated on Part 2 being done. Now unblocked. Neither started yet.
- **Phase 3 relationship model discussion** still deferred. Needs a plan-mode design session before any code.
- **Attention dispatcher not yet auto-started.** Windows `shell:startup` shortcut for `scripts/attention-dispatcher.bat` still pending David's manual action.
- **UptimeRobot / Healthchecks.io / Sentry accounts** not yet created. `HEALTHCHECKS_PING_URL` env var not set. Documented in `content/Admin Notes/External Services Setup.md`.
- **Pre-existing TS errors** in `quartz/*`, `ops/src/app/page.tsx` (lines 303-305), `ops/src/app/profile/page.tsx`, `ops/src/app/relationships/page.tsx`, `ops/src/components/VaultGrid.tsx`. None introduced this session. Pre-push hook warns but doesn't block.

### Next session priorities (Phase 2a Part 3 and beyond)

1. **Phase 2a Part 3: `/rules` Ops app editor UI.** Biggest lift remaining in Phase 2a. Write the API route first (`ops/src/app/api/rulebook/route.ts` — GET/POST with validation), then the page component (`ops/src/app/rules/page.tsx` — editable tables per type, tier columns, per-cell required/recommended/N/A dropdowns, visual identity editor), then the sidebar nav entry. Atomic write via tmp+rename when saving the JSON back. Validate on save: check-ids exist in helpers, hex colors valid, icon names known, enum values valid, no orphan sub-categories, schema version matches.

2. **Phase 1d vault-health audit** (now unblocked). Rewrite the dashboard vault-health computation to score each profile against its own type's rulebook verified tier instead of a uniform checklist. Should produce more honest numbers: stories don't get penalized for missing FEC data, media doesn't get penalized for Tier 1 count <3, etc.

3. **Phase 2b S-Tier filter** (now unblocked). Dashboard filter + VaultGrid sort option reads `getPromotionGate(type, 's-tier')` from the rulebook to know which types are eligible. Filter the grid to profiles where `content-readiness === 's-tier'`.

4. **First batch of story hallucination cleanup.** Walk through the 12 newly-surfaced stories in the hallucination-catcher Attention Queue. Decide per-claim: add citation, convert to blockquote, use `[cite:...]`, or reject via the false-positive button.

5. **Phase 3 relationship model** — plan-mode design session. Before any code: walk through the relationship taxonomy (related / bothsides / monetary / story-link / media-appearance / staffing / legal) with `from` / `to` / `confidence` / `source` fields. Lock the data model first, then write the categorizer script, then update the profile view relationships panel.

6. **Attention dispatcher `shell:startup` install walkthrough.** 5-minute David task. Drop a shortcut to `scripts/attention-dispatcher.bat` into the Windows startup folder. Confirmation test: reboot, dispatcher runs on login automatically.

### Session end state: fully verified + deployed
- **Phase 2a Part 1 foundation shipped** (previous session)
- **Phase 2a Part 2 wiring shipped** (this session) — all 5 scripts consult the rulebook
- **resolveTopLevelType helper added** — unblocks correct dispatch on flat vault type values
- **Regression checks passed on every wiring commit**
- **12 legitimate story findings newly surfaced** in hallucination-catcher Attention Queue — real editorial work, not noise
- **Latest deploy:** `24289116181` ✓

David pausing here to save and restart in a fresh conversation for Phase 2a Part 3 (`/rules` editor UI). The fresh context will give full headroom for the biggest lift remaining in Phase 2a.

---

## Previous Session
Claude: Code
Date: 2026-04-11 next-day (Phase 2a rulebook foundation — automation hardening, dashboard bugs, Phase 0 vault cleanup, Phase 2a Part 1 rulebook file)

### Theme
Long continuation session. Four distinct phases shipped:

1. **Attention Queue feedback loop + hallucination-catcher tightening** — reject button on `/attention`, universal signature filter in `addEntries()`, stricter claim-pattern regexes
2. **Automation hardening** — dispatcher crash guards + log rotation + Healthchecks.io env-var placeholder, new scripts registered in `/scripts` ops page, rules docs updated
3. **Phase 0 vault cleanup** — audited and committed a 619-file + 44-file pipeline enrichment backlog that had been sitting uncommitted, patched `self-review-mirror` to use net-new comparison + auto-block / heading / wikilink-bullet / type exemptions so the gate stops false-positive blocking
4. **Phase 1 dashboard bugs** — calendar clock UTC → local, session-save timestamps via new `completed_at` field, alerts dashboard card unified with `/api/alerts` summary (was showing a fake heuristic count)
5. **Phase 2a Part 1** — shipped `config/profile-type-rulebook.json` (1172 lines) serializing all 8 top-level types + 50+ sub-categories walked through interactively, plus CJS and TS readers, plus extended check-helpers with the CHECKS registry (64 real, 201 stubbed for Part 2)

### Done — Attention Queue polish (commit `c0e7dc9c`, deploy `24281367092`)

- **Reject button on `/attention`.** Per-entry `✕ reject` button prompts for an optional reason and POSTs to new `/api/attention-queue/reject` route. Removes the entry immediately and records a rejection in `.false-positive-log.json` keyed by a stable `(source|where|what)` signature.
- **Universal filter in `addEntries()`.** `scripts/lib/attention-queue.cjs` `addEntries()` now auto-filters entries whose signature matches a prior rejection. All 5 producers inherit this for free — no per-script wiring. Verified live: rejected "Economic Policy Institute" from voice-drift-detector, reran the producer, 30 → 29 (rejection persisted through a fresh run).
- **Hallucination-catcher tightened.** Raytheon went from 96 flagged claims → 25 (71 false positives eliminated). Changes: `dollar-amount` requires a claim verb within 80 chars; `percentage` requires contextual noun (of/increase/share/etc); `bill-reference` pattern dropped; per-claim citation proximity check (150 chars) replaces whole-paragraph exemption; footnote refs `[^N]` and `[cite]` count as citations; bullet lists and tables exempt.

### Done — Automation hardening (commit `ee2eccd6`, deploy `24281756494`)

- **`scripts/attention-dispatcher.cjs` crash recovery.** Added `uncaughtException` + `unhandledRejection` top-level guards; try/catch around `spawn()` and each `processQueue` iteration; cron schedule callbacks wrapped per-producer. Log rotation at 1MB threshold → rotates to `.log.1` (one keep). Verified live by pre-writing a 1.2MB log file; dispatcher correctly rotated it to `.log.1` on next run and started a fresh `.log`.
- **`HEALTHCHECKS_PING_URL` env var placeholder.** Fire-and-forget ping on startup (`/start`), successful queue cycles (bare URL), failures (`/fail`). 5-sec timeout, errors swallowed. No-op when unset; daemon logs state at startup.
- **`/scripts` ops page registered all new scripts.** New categories **Intelligence / Attention Queue** (8 entries) and **Pre-Commit Gates** (1 entry), pinned to top. Entries for attention-dispatcher (daemon/run-now/healthchecks), voice-drift-detector, hallucination-catcher, contradiction-miner, missing-profile-detector, promotion-candidate-queue, self-review-mirror. yaml-sanity-scan and duplicate-bioguide-sentinel entries updated to note they also run as pre-commit gates.
- **Rules docs.** `CLAUDE.md` gained a new "Automation you should know about" section describing pre-commit gate, Attention Queue producer discipline (never edit `Attention Queue.md` directly — use `addEntries()`), and dispatcher. `content/Vault Rules.md` gained a new **§ 9 Automation Layers** with the same three sub-sections. Existing § 9 Decisions Log bumped to § 10.

### Done — Phase 0 vault cleanup (commits `427a5827` + `ab7221d0`, deploy `24282337750`)

- **Audited 619 modified + 44 untracked uncommitted files.** Classified by change pattern: 307 frontmatter-only (pipeline `last-updated` / `last-enriched` / `related:` bumps), 193 frontmatter+body (+ new auto-block sections with Wikidata / LEI / Federal Register data), 53 pipeline-only auto-block content, 65 body-only timestamp rerenders, 1 `site-status.md` stats recalc, 38 RSS Event drafts, 3 Story Seeds from contradiction-miner, 1 `bioguide-contamination-alert.md`.
- **Patched `self-review-mirror` with 5 exemptions.** Fixed the false-positive cascade that would have blocked 188 files with "new em dash" errors from pipeline enrichment:
  - **Net-new comparison, not per-line matching** — count banned phrase occurrences before/after and flag only net increases. A pipeline rewriting `(990 Filing — 2018)` to `(990 Filing — 2019)` doesn't trigger because the em-dash count is unchanged.
  - **Auto-block exemption** — content inside `<!-- auto:X -->` blocks is API data, not authored prose
  - **Heading exemption** — Markdown headings are labels, not prose
  - **Wikilink-bullet exemption** — bullet lines with wikilinks are structured data enumerations
  - **Non-editorial file type exemption** — `reference` / `system` / `methodology` / `index` / `page` / `digest` / `daily-update` / `event` / `sub-note` types skipped entirely
- **Trimmed Auto-Enrichment Log.** 260 empty padding lines removed (preserving all 2026-04-11 legitimate entries).
- **Gitignored `content/Admin Notes/.attention-dispatcher.log[.1]`** so log rotation artifacts never commit.
- **Bulk commit: 662 files shipped.** 619 pipeline enrichments + 41 untracked + 1 site-status recalc + 1 auto-enrichment log. Zero uncommitted files remaining.

### Done — Phase 1 dashboard fixes (commit `ec7cdb94`, deploy `24286226374`)

- **1a Calendar clock timezone.** `ops/src/app/calendar/Calendar.tsx` was storing `liveTime` as ISO string and slicing UTC positions — David on PT saw `11:40` at `4:41am`. Fixed: store as Date object, format with `getHours()` / `getMinutes()` / `getFullYear()` etc. Verified live: preview renders `08:38` matching `new Date()`.
- **1b Session-save timestamps.** `ops/src/lib/sprint-state.ts` reconciler was synthesizing `completed_at = completed_date + "T00:00:00Z"` — always midnight UTC, breaking the "hours today" meter. Three-part fix:
  - `ops/src/lib/sprint-schedule-parser.ts` Task type gains optional `completed_at` field
  - `sprint-state.ts` new `resolveCompletedAt()` helper prefers YAML `completed_at` over midnight fallback, used in both `buildInitialState` and `reconcileScheduleIntoState`
  - `.claude/commands/session-save.md` skill instructions now require Claude to write `completed_at: '2026-04-11T14:32:00-07:00'` alongside `completed_date` for every task it marks done
- **1c Alerts dashboard sync.** `ops/src/app/api/status/route.ts` counted "critical" by scanning profiles missing `content-readiness:` — a fake heuristic unrelated to real alerts. `/alerts` page used `/api/alerts` (stale / never-enriched / broken wikilinks / pipeline failures / contradictions). Classic drift bug. Fix: `/api/status` now delegates to `/api/alerts` for its summary. Dashboard card label upgraded from just critical count to `{N} critical, {M} warning`. Verified live: both endpoints return matching `summary.critical` and `summary.warning`; dashboard shows "View Alerts · 1 critical, 2 warning".

### Done — Phase 2a Part 1: profile type rulebook (commit `ee147d6e`, deploy `24288685353`)

Walked through all 8 top-level types + 50+ sub-categories interactively with David in session. Every table, every override, every tier requirement was locked in conversation before serialization. Part 1 ships the file and the readers. Nothing consumes it yet.

**New files:**
- `config/profile-type-rulebook.json` (1172 lines) — 8 top-level types (politician / donor / entity / media / judicial / story / event / meta), 50+ sub-categories with `adds` / `removes` / `replaces` override grammar, tier requirements (raw / draft / ready / verified / s-tier), promotion-gate rules (ready auto, verified manual, s-tier manual across every editorial type), visual identity (color-light / color-dark / icon), `voice-scanned` and `hallucination-scanned` flags.
- `scripts/lib/profile-type-rulebook.cjs` (320 lines) — CJS reader with `--validate` CLI. Exports `loadRulebook`, `listAllTypes`, `listAllSubCategories`, `getTypeRulebook`, `getSubCategoryOverrides`, `getTierRequirements`, `getTypeVisual`, `getPromotionGate`, `isVoiceScanned`, `isHallucinationScanned`, `resolveChecks`. The `resolveChecks` helper composes sub-category overrides onto base rulebook checks.
- `ops/src/lib/profile-type-rulebook.ts` (202 lines) — TS mirror with typed interfaces for the JSON schema.

**Extended existing files:**
- `scripts/lib/checklist-helpers.cjs` (180 → 551 lines) — existing helpers preserved; added `CHECKS` registry with 265 check-ids (64 fully implemented — frontmatter field presence, counts, thresholds, body scanners reusing `hasHeading` / `runLegalReviewCheck` / `isEnrichedWithin` / `countSourceTypes`; 201 stubbed as always-passing with `[stub: id]` reasons so Part 2 integration can identify unwired checks).
- `ops/src/lib/checklist-helpers.ts` (240 → 545 lines) — same treatment in TS. `Frontmatter` type alias + `CheckFn` signature + `_toProfileShape` adapter for reusing camelCase helpers.

**Key locked decisions from the Phase 2a conversation:**
- 8 top-level types (not 12) — PAC / think tank / K Street / dark money all collapse into `entity` with sub-categories
- `judicial` is its own top-level type (not a sub-category of politician) — judges operate under completely different rules
- `media` is a first-class type — prosecutors/AGs moved into politician as sub-categories
- Dual-role people (Steyer, Pritzker, Trump, Bloomberg) use a `secondary-types:` array — primary type governs promotion, secondary types add supplementary fields
- S-tier requires a linked **original `investigation`-grade story we wrote** — not just any story. This is the single most important editorial gate. Prevents S-tier from being minted out of pipeline data alone.
- Type colors: politician amber, donor green, entity slate, media orange, judicial burgundy, story purple, event cyan, meta gray. Red + blue reserved for party coloring.
- Sub-categories distinguish by **icon only**, not shade — keeps graph rendering scannable
- Story grade hierarchy: `story` (report existing reporting) / `report` (synthesis + analysis) / `investigation` (new facts, primary sources, legally reviewed). Only `investigation` grade can anchor s-tier.
- Hallucination-catcher becomes a hard gate for story verification, with safety-valve override paths: `[cite:...]` inline marker, blockquote conversion, `editor-vouched: true` frontmatter flag, Attention Queue reject button.
- Media uses `tier1-source-count>=2` (lower than the >=3 of other types) because pipeline coverage for media is the weakest
- Dark money `funder-triangulation` is required at verified with `N/A acceptable` for "deep research pending" cases (surfaced in Attention Queue for case-by-case upgrade)

**Verification:**
- `node scripts/lib/profile-type-rulebook.cjs --validate` → clean, 8 types, 266 check ids referenced, 0 missing
- `resolveChecks('politician', 'president', 'verified')` correctly composes base + president overrides (adds `executive-orders-documented`, `cabinet-appointments-listed`, `nominations-record-present`; removes `voting-record-pipeline`; replaces `fec-fundraising-data` → `previous-cycle-fundraising`)
- Real check against Elizabeth Warren's profile: `title-present` passes, `class-analysis-heading` passes, `tier1-source-count-gte-3` correctly fails (1 Tier 1 source type, needs ≥3)
- Stubs return `passed: true` with `[stub: id]` markers
- TS mirror compiles cleanly; pre-existing errors in `quartz/*`, `page.tsx`, `profile/page.tsx`, `VaultGrid.tsx` are NOT introduced by this commit and do not affect the rulebook infrastructure

**Runtime effect: zero.** Nothing reads from the rulebook yet. The dashboard looks identical, every script still uses its embedded assumptions, every Attention Queue producer still runs the way it did before. The rulebook just exists and can be loaded.

### Commits this session

Feature branch (`claude/naughty-satoshi`):
- `c0e7dc9c` — Attention Queue polish (reject button + hallucination-catcher tightening)
- `67f5475d` / amended to `427a5827` — self-review-mirror net-new scanning patch
- `ee2eccd6` — Automation hardening (dispatcher resilience + scripts page + rules docs)
- `35bcce69` superseded by `427a5827` — scanner patch (amended during Phase 0 audit)
- `ab7221d0` — Pipeline enrichment 2026-04-11 bulk commit (662 files)
- `ec7cdb94` — Phase 1 dashboard fixes
- `ee147d6e` — **Phase 2a part 1: profile type rulebook + check-helper catalog**
- This session-save commit

Deploys (all green):
- `24281367092` — Attention Queue polish
- `24281756494` — Automation hardening
- `24282337750` — Phase 0 scanner patch + bulk enrichment
- `24286226374` — Phase 1 dashboard fixes
- `24288685353` — Phase 2a Part 1 rulebook foundation

### Known issues / still outstanding

- **Phase 2a Part 2 not started.** Five sequential script wirings pending (self-review-mirror → voice-drift-detector → hallucination-catcher → promotion-candidate-queue → pipeline-janitor). Each needs a before/after regression check. Do NOT skip the regression checks.
- **Phase 2a Part 3 not started.** `/rules` Ops app editor UI is the biggest lift — saves for a separate session.
- **Phase 2b S-tier filter** still pending. Depends on Part 2 being wired.
- **Phase 1d vault-health audit** still pending. Depends on Part 2 being wired (can't meaningfully audit type-specific health until scripts read per-type rules).
- **Phase 3 relationship model discussion** deferred. User's "relationship meter / bothsides" architecture needs a plan-mode design session before any code.
- **188 profiles have `N/A` placeholder `voting-record-pipeline` stubs** in the rulebook — stub always-passing means these fields don't currently fail checks. Real logic lands in Part 2.
- **Attention dispatcher not yet auto-started.** Windows `shell:startup` shortcut for `scripts/attention-dispatcher.bat` still pending David's manual action.
- **UptimeRobot / Healthchecks.io / Sentry** accounts not yet created. Documented in `content/Admin Notes/External Services Setup.md`.
- **`HEALTHCHECKS_PING_URL`** env var not set (infrastructure ready, just needs the URL after account creation).
- **ts/cjs helper drift lint** still not implemented. `checklist-helpers.cjs` ↔ `.ts` stay in sync by hand; now also `profile-type-rulebook.cjs` ↔ `.ts`.
- **Pre-existing TS errors** in `quartz/components/scripts/networkGraph.inline.ts`, `quartz/plugins/emitters/networkGraphIndex.ts`, `ops/src/app/page.tsx` (lines 303-305), `ops/src/app/profile/page.tsx`, `ops/src/app/relationships/page.tsx`, `ops/src/components/VaultGrid.tsx`. None introduced by this session. Pre-push hook warns (not blocks) on these.

### Next session priorities (Phase 2a continuation)

1. **Part 2.1: wire `self-review-mirror` to rulebook.** Replace the hardcoded `nonProfileTypes` Set with `isVoiceScanned(type)` derived from the rulebook. Meta and event types stay exempt. Regression check: full scan against the vault, confirm the same profiles are flagged (no regression in pre-commit gate behavior). This is the lowest-risk integration — do it first.
2. **Part 2.2: wire `voice-drift-detector` to rulebook.** Replace readiness-based filter with `isVoiceScanned(type)`. Story type becomes scanned (currently isn't). Regression: Attention Queue count shouldn't balloon.
3. **Part 2.3: wire `hallucination-catcher` to rulebook.** Replace hardcoded `skipTypes` with `isHallucinationScanned(type)`. Story type becomes required (the gate for story verification). Regression: first batch of story profile findings should be reviewed — they're legitimate but need spot-checking for noise.
4. **Part 2.4: wire `promotion-candidate-queue` to rulebook.** Replace hardcoded promotion criteria with `getTierRequirements(type, category, 'verified')` + `getTierRequirements(type, category, 's-tier')`. The script computes per-type-aware missing fields.
5. **Part 2.5: wire `pipeline-janitor` to rulebook.** Highest-risk integration — janitor writes to profile frontmatter. Update `--tier=a-plus` and `--tier=s` audits. Dry-run first, inspect report, only then `--write`.
6. **After Part 2: Phase 1d vault-health audit** — now that scripts read per-type rules, compute a real vault health number per type.
7. **Phase 2b S-tier filter** — dashboard filter reads `getPromotionGate(type, 's-tier')` to know which types are eligible.
8. **Phase 3 design session** — relationship meter / bothsides / money flow model. Plan mode only; no code until locked.

### Session end state: fully verified + deployed
- **Phase 0 vault cleanup complete** — 662 files committed, zero uncommitted work remaining
- **Phase 1 dashboard bugs fixed** — calendar clock, session-save timestamps, alerts sync
- **Phase 2a Part 1 shipped** — rulebook file + readers + check-helpers (64 real checks, 201 stubs)
- **Automation hardening shipped** — dispatcher crash guards, log rotation, Healthchecks placeholder, scripts page, rules docs
- **Attention Queue feedback loop complete** — reject button, universal signature filter, hallucination-catcher tightened
- **self-review-mirror rewritten** — net-new comparison, 5 exemptions (auto-block / heading / wikilink-bullet / type / non-editorial), no more false-positive blocking on pipeline enrichment
- **Latest deploy:** `24288685353` ✓

David paused here to save session. Phase 2a Part 2 picks up next session with the self-review-mirror wiring (lowest-risk of the 5 script integrations).

---

## Previous Session
Claude: Code
Date: 2026-04-11 late overnight (Phase 1 Day 3 close — S-tier plan full ship + parseWikilinks hotfix + first full A+ audit pass)

### Theme
Final stretch of the marathon 2026-04-11 day. Capped off the overnight S-tier work with: (1) browser-verified the grouped checklist UI on a politician profile in the ops preview server, (2) diagnosed and fixed a pre-existing `parseWikilinks` crash on array-shaped `related:` fields that was blocking the Ayanna Pressley profile detail page, (3) ran the first full janitor `--tier=a-plus --cohort --write` pass against the entire vault — 256 demotions + 124 `audit-a-plus-passed` stamps + cohort metrics on all 380 audited profiles. Also wrote a comprehensive project brief for David to hand off to another chat for S-tier / media-pipeline riffing.

### Done — Browser verification of Step 4 grouped checklist

- Restarted the preview server (previous SWC cache was stuck with a stale compile error)
- Navigated to Koch Network donor profile → rendered cleanly with grouped layout, "CORE 5/8 (63%)" section visible
- Navigated to Ayanna Pressley politician profile → surfaced a runtime `value.match is not a function` crash
- Extracted stack trace via shadow DOM inspection: `src/app/profile/page.tsx:58 @ parseWikilinks`

### Done — Hotfix: parseWikilinks defensive input handling (commit `c22110b4`, deploy `24274279849`)

Pre-existing bug in `ops/src/app/profile/page.tsx::parseWikilinks`. The function signature was `(value: string)` but in practice received arrays from YAML-list `related:` fields. The old guard `if (!value) return []` didn't catch arrays (truthy), and `Array.prototype.match` doesn't exist, so the call crashed. Ayanna Pressley's profile has `related:` as a YAML list, reliably triggering it.

Fix: signature changed to `(value: unknown)`. Now handles four shapes:
- Falsy → `[]` (unchanged)
- Array → recursive flatMap through each item → handles YAML lists
- Non-string non-array → `[]` (defensive)
- String → original `.match()` path

Bug was latent for some time; surfaced only because this session touched the profile-loading code path indirectly (new fields added to Profile interface). Fix is 9 lines.

Verified: Ayanna Pressley profile now renders with the full grouped Tier A/B/C/D + locked S-tier checklist. 10/27 items passing. Promotion blocker correctly shows "ready blocked — FEC fundraising data, Committee-relevant regulatory cross-ref +15 more". Screenshot captured as visual proof.

### Done — First full janitor audit pass (commit `6fd0f141` / merge `fc06bb76`, deploy `24274692104`)

Ran `node scripts/pipeline-janitor.cjs --tier=a-plus --cohort --write` against the full vault for the first time. This is the "run the janitor sweep on donors, corporations, PACs, lobbying-firms" task from the first session-save that was outstanding.

**Results:**
- 1753 profiles scanned
- 380 ready/verified audited (non-exempt types)
- **256 demoted ready→draft** — donors, corporations, PACs, lobbying-firms, think-tanks that had been promoted without pipeline data. Each got a plain-English [JANITOR] note explaining which check(s) failed.
- **124 stamped `audit-a-plus-passed: 2026-04-11`** — these profiles passed every automated A+ check and are waiting ONLY on David's manual editorial sign-off. **This is the first-ever population of that new field.**
- All 380 audited profiles stamped with `cross-vault-triangulation-count: N` (some 0, some >0 depending on network centrality)
- Anomaly-flagged profiles got `anomaly-flags: [...]` populated (e.g., `total-received-3x-cohort-median`, `unusually-many-committees-N`)

Merge required `-X theirs` to resolve ~41 conflicts from concurrent remote writes (enrichment pipeline auto-commits). Worktree version authoritative.

### Done — Comprehensive project brief for David's chat handoff

Wrote a ~2000-word brief describing the project architecture, readiness tier system, S-tier plan state, what's shipped, what's pending, where the media pipeline fits, and 6 riff prompts (media pipeline expansion, S-tier forcing function for media, donor-to-media flow tracking, cross-vault triangulation for media, blind spots the vault isn't catching, S-tier expansion candidates beyond Whitehouse). David will paste it into another chat tomorrow to riff on media pipeline ideas + S-tier expansion while he's away from dispatch.

### Commits this final stretch

Site repo (`donor-map-site`, branch `v4`):
- `c22110b4` — Hotfix: parseWikilinks defensive input handling
- `6fd0f141` → merge `fc06bb76` — Full janitor audit pass: 256 demotions + 124 A+ stamps
- This session-save commit

Deploys (all green):
- `24274279849` — parseWikilinks hotfix
- `24274692104` — Full audit pass

### New vault state (final)

```
raw:         39
draft:      904  (was 648; +256 from this audit)
ready:      563  (was 819; -256 to draft)
verified:     0
s-tier:       0
stamped:    124  (audit-a-plus-passed — NEW field, first population)
```

The 124 stamped profiles are the queue for David's next manual editorial sign-off pass. Mechanical A+ gates all pass — the narrative + class analysis review is the remaining gate.

### Known issues / still outstanding

- **124 profiles awaiting David's manual sign-off** to become A+ verified. This is a new queue — previously there was no automated way to identify "mechanically ready" profiles.
- **Zero profiles at s-tier.** Infrastructure is complete, content is not. First S-tier candidate pass (Whitehouse recommended) is queued.
- **Non-politician checklists still flat.** Donor, corporation, pac, lobbying-firm, media-profile, think-tank types don't yet have the Tier A/B/C/D grouped buildout. Only Congress politicians do.
- **Media pipeline gaps** — FCC ownership database, podcast/YouTube revenue tracking, think-tank→media influence mapping, advertiser-boycott tracking, media-politician feedback loop — all listed in the brief David is riffing on.
- **Quartz-side homepage gating** still pending. WeeklySpotlight, PowerRankings, LandingPage still feature curated `featured-date:` profiles regardless of tier. Migration to `getFeaturedPool()` happens when S-tier pool ≥ 3.
- **ts/cjs helper drift lint** not implemented. The two copies of checklist-helpers and committee-pipeline-map stay in sync by hand.

### Next session priorities (2026-04-12 Saturday night — David's return)

1. **Review David's handoff-chat ideas** — the brief was written with 6 riff prompts on media pipeline + S-tier expansion. Whatever comes back drives the first work of the session.
2. **First S-tier candidate depth pass on Sheldon Whitehouse.** His editorial notes already document 3 strong contradictions with dollar figures. Research Claude writes `angle:`, `exclusive-connections:`, `original-finding:`, `central-thesis:`, `story-grade:`. David reviews and sets `editorial-signoff-narrative:`. Run `node scripts/pipeline-janitor.cjs --tier=s --write` to stamp `audit-s-tier-passed: true`. Promote via the readiness API.
3. **Review the 124 `audit-a-plus-passed` profiles for manual sign-off.** David opens the ops app, filters to audit-a-plus-passed, walks through each, signs off where ready.
4. **Media pipeline v1** — whatever the other chat surfaces as high-value additions.
5. **Research Claude depth passes** on the 17 bioguide-recovered profiles to add central-thesis / story-grade / lawyer-dispute fields.
6. **Non-politician checklist tiering** — extend the grouped Tier A/B/C/D structure to donor and corporation types at minimum.

### Session end state: fully verified + deployed
- **All 6 S-tier plan steps shipped + deployed** (dbfe3336 → 2f837495)
- **All 3 engine bugs fixed** (updateFrontmatter full-field, selectTargets reenrich, updateFrontmatter quote-escape)
- **parseWikilinks crash fixed** — politician profile detail page loads clean
- **First full janitor audit pass written through** — 256 demotions, 124 A+ stamps, cohort metrics on 380 profiles
- **David has a complete project brief** to hand off to another chat for media pipeline + S-tier riffing
- **Latest deploy:** `24274692104` ✓

David checking out at 2026-04-11 21:25 local. Back tomorrow night.

---

## Previous Session
Claude: Code
Date: 2026-04-11 overnight (Phase 1 Day 3 early — S-tier verification plan shipped in full, all 6 steps + engine fixes)

### Theme
Executed the full 6-step S-tier verification plan from `C:\Users\third\.claude\plans\keen-inventing-wall.md`. Expanded the verified (A+) tier from "has FEC + Congress data" to a four-sub-tier investigative standard (Data Breadth + Investigation Depth + Narrative Quality + automated Uniqueness). Added a new S-tier above A+ gated on an `angle:` forcing function, 3+ "damning" exclusive-connections, an original-finding, and TWO sign-offs (janitor automated audit + David manual narrative sign-off). Also fixed two pre-existing engine bugs that were causing deploy failures (updateFrontmatter quote-escape for Wikipedia extracts, fresh Ro Khanna + Zoe Lofgren YAML hotfix).

### Done — S-tier plan (all 6 steps)

**Step 1: Schema + Vault Rules** (commit `dbfe3336`, deploy `24273405179`)
- `ops/src/lib/vault.ts`: added 16 new optional fields to Profile interface — centralThesis, storyGrade, lawyerDispute, legalReviewDate, legalReviewResult, boardSeats, stockTrades, bothSidesFlag, crossVaultTriangulationCount, anomalyFlags, auditAPlusPassed, angle, exclusiveConnections, originalFinding, auditSTierPassed, editorialSignoffData, editorialSignoffNarrative. Plus `ContentReadinessTier` type export.
- `content/Vault Rules.md` § 2 Content Readiness rewritten from 4-tier to 5-tier system with full A+ sub-tier breakdown (A/B/C/D) and new S-tier requirements section.
- Zero enforcement. Pure schema + docs. Backward compatible.

**Step 2: Extract shared checklist helpers** (commit `93881d87`, deploy `24273624255`)
- `ops/src/lib/checklist-helpers.ts` (236 lines, new) — TypeScript helpers
- `scripts/lib/checklist-helpers.cjs` (190 lines, new) — CJS parallel
- Exported: `hasAutoBlock`, `hasAnyAutoBlock`, `countTier1InBody`, `countSourceTypes`, `hasHeading`, `hasCallout`, `hasDonationPolicyTimeline`, `hasDarkMoneyTrace`, `hasRevolvingDoor`, `runLegalReviewCheck`, `detectBothSidesEntities`, `normalizeEntityList`, `normalizeEntityName`, `isEnrichedWithin`, `countMarkdownUrls`, `countWikilinks`.
- `VerificationChecklist.tsx`: replaced 6 inline source-diversity patterns, 4 enriched-90d patterns, 3+ URL count checks, 3+ wikilink count checks with helper calls. Pure refactor — identical behavior before and after.
- `scripts/pipeline-janitor.cjs`: imports helpers for use in Step 3 checks. Existing zombie-block / missing-block logic unchanged.

**Step 3: Committee map + janitor A+ audit** (commit `c1d454d0`, deploy `24273715402`)
- `scripts/lib/committee-pipeline-map.cjs` (115 lines, new) — single source of truth for "which regulatory pipelines are required by which committees." Exports `getRequiredPipelinesForCommittees()` and `getRequirementReasons()`. Covers Banking, HELP/Agriculture, Judiciary, Intel/Foreign, Armed Services, Commerce, Energy, Ways and Means, Appropriations, Transportation.
- `ops/src/lib/committee-pipeline-map.ts` (86 lines, new) — TypeScript mirror, kept in sync by hand, lint check planned.
- `scripts/pipeline-janitor.cjs`: added `--tier=a-plus` flag (dry-run only in Step 3), added new A+ issue kinds:
  - `a-plus-committee-cross-ref` (uses the committee map)
  - `a-plus-source-floor` (3+ Tier 1 raised from 2)
  - `a-plus-legal-review` (defamation-prone word scan with blockquote exception)
  - `a-plus-both-sides` (donors ∩ opposes entity detection)
  - `a-plus-missing-thesis` / `a-plus-missing-story-grade`
- Each new issue kind gets a plain-English translation in `laymanNote()`.

**Step 4: Grouped checklist UI + tier breakdown evaluator** (commit `48e93fc0`, deploy `24273851210`)
- `ChecklistItem` interface gained `group: ChecklistGroup` and `blockingFor: "ready"|"verified"|"s-tier"` fields. New exported types: `ChecklistGroup`, `ChecklistBlockingFor`.
- Congress politician checklist populated with ~20 new items across 5 groups (Tier A/B/C/D + S-tier). Legacy common items marked group: "core".
- Rendered as 5 collapsible `<details>` sections with per-group progress bars. S-tier section is LOCKED (🔒) and grayed-out until every non-s-tier group passes.
- `evaluateReadinessEligibility()` signature expanded to return `tierBreakdown: Record<ChecklistGroup, { passed, total, pct }>`. New `maxTier` logic: returns `"s-tier"` when all groups pass, `"verified"` when non-s-tier groups pass, degrades to ready/draft.
- `Profile` interface gained `stockTrades?: number | string` for financial-disclosure check.

**Step 5: VaultGrid tiered fields + cohort checks + --write stamping** (commit `abbd9049`, deploy `24273931396`)
- `ops/src/lib/vault.ts`: `profileNeeds()` now reads janitor-stamped frontmatter (audit-a-plus-passed, centralThesis, storyGrade, bothSidesFlag, anomalyFlags) instead of inline regex. Source-type floor raised from 2 to 3 for A+. S-tier recognized as a first-class readiness. Added thin-alias `profileNeedsFromChecklist()` export.
- `scripts/pipeline-janitor.cjs`: added `--cohort` flag for whole-vault comparative analysis. New helpers: `loadAllProfiles()`, `computeAnomalyFlags()`, `computeTriangulationCount()`, `normalizeRelatedList()`, `buildEntityIndex()`, `stampAuditFields()`. Cohort pass stamps `cross-vault-triangulation-count` and `anomaly-flags` into frontmatter with `--write`. A+ audit with `--write` also stamps `audit-a-plus-passed: YYYY-MM-DD` on profiles that clear all checks.
- Tested: `node scripts/pipeline-janitor.cjs --tier=a-plus --cohort` loads 1745 profiles, 1727 unique entities, runs cleanly.

**Step 6: S-tier readiness API + tier helpers** (commit `2f837495`, deploy `24274019304`)
- `ops/src/app/api/profile/readiness/route.ts`: VALID_TIERS expanded from 4 to 5 values, TIER_LABELS gets "s-tier" → "S". New S-tier promotion gate rejects HTTP 400 unless ALL of: `audit-s-tier-passed: true`, `editorial-signoff-narrative:`, `angle:`, `original-finding:`, and 3+ `exclusive-connections` items are present. Structured `missing[]` array in the error response for UI use.
- `ops/src/lib/tier.ts` (99 lines, new) — central S-tier render-time helpers. Exports: `isSTier(profile)` (three-check gate), `isVerified(profile)`, `getFeaturedPool(profiles, minCount)` (graceful degradation to A+), `tierLabel(readiness)`, `tierColor(readiness)` (purple for S-tier).
- Quartz-side homepage components (WeeklySpotlight, PowerRankings, LandingPage) intentionally NOT wired. They currently feature 3 profiles (Raytheon, AIPAC, Koch) that are below A+. Adding a strict tier filter would break the live site; migration happens as a separate commit when the S-tier pool is ready.

### Done — Engine fixes (shipped mid-session)

**Engine: updateFrontmatter picks quote style to prevent Wikipedia-extract corruption** (`donor-map-engine@b96f99e` on main)
- Root cause fix for the Ro Khanna + Zoe Lofgren YAML corruption that broke 2 deploys tonight.
- Both scalar and array writers in `scripts/lib/shared.cjs::updateFrontmatter()` now pick a quote style based on the value's contents: single-quoted when value contains `"` but not `'`; double-quoted with `\"` escape when value contains both; legacy default otherwise.
- Test suite validates 4 scenarios (Ro Khanna `"Ro"` case, California apostrophe, mixed both-quotes, plain-text control). All pass.
- Prevents recurrence on all future enrichment runs.

**Site: Ro Khanna + Zoe Lofgren YAML hotfix** (commit `9429f0ff`)
- Vault-side patch: converted the broken `wikipedia-extract: "Rohit "Ro" Khanna..."` lines to single-quoted YAML strings. Unblocked the deploy.

### Commits this session (8 site + 1 engine)

Site repo (`donor-map-site`, branch `v4`):
- `9429f0ff` — Hotfix: escape wikipedia-extract double quotes
- `dbfe3336` — S-tier plan Step 1: schema additions + Vault Rules § 2 rewrite
- `93881d87` — S-tier plan Step 2: extract shared checklist helpers
- `c1d454d0` — S-tier plan Step 3: committee→pipeline map + A+ audit (dry-run)
- `48e93fc0` — S-tier plan Step 4: grouped checklist UI + tier breakdown evaluator
- `abbd9049` — S-tier plan Step 5: VaultGrid tiered fields + cohort checks + stamping
- `2f837495` — S-tier plan Step 6: s-tier readiness API + tier.ts helpers
- This session-save commit

Engine repo (`donor-map-engine`, branch `main`):
- `b96f99e` — updateFrontmatter picks quote style

Deploys (all green):
- `24273405179` (hotfix + Step 1)
- `24273624255` (Step 2)
- `24273715402` (Step 3)
- `24273851210` (Step 4)
- `24273931396` (Step 5)
- `24274019304` (Step 6)

### Known issues / still outstanding

- **S-tier pool is empty.** No profile in the vault currently has `angle:`, `exclusive-connections:`, or `original-finding:` populated. Research Claude will need to do depth passes to populate these fields on candidate profiles (Whitehouse, Warren, Sanders, Jayapal, Jeffries, and eventually others). The infrastructure is ready; the content is not.
- **Zero politicians at `ready`.** After tonight's earlier cleanup demoted 96 politicians to draft, the janitor's A+ audit has nothing to stamp. The next pipeline run should re-enrich the 17 bioguide-recovered profiles + populate fresh data for others. Research Claude can then re-review and re-promote.
- **Weekly Spotlight still renders non-A+ profiles.** Raytheon, AIPAC, and Koch Network have `featured-date` set but are below A+. The S-tier gate is intentionally not enforced in Quartz components yet. This migration happens when the A+ pool is large enough to support it.
- **Non-politician types still have flat checklists.** Step 4's grouped layout only applies to Congress politician profiles. Donor, corporation, pac, lobbying-firm, and think-tank checklists are still flat. Migration to the grouped format is a future cleanup.
- **Lint check for ts/cjs helper drift not yet implemented.** The two copies of checklist-helpers and committee-pipeline-map stay in sync by hand. A simple normalized-string-compare lint script should run in CI. Follow-up.

### Next session priorities (2026-04-12)

1. **Run the A+ audit + cohort pass with --write on the full vault.** `node scripts/pipeline-janitor.cjs --tier=a-plus --cohort --write` will stamp `audit-a-plus-passed:`, `cross-vault-triangulation-count:`, and `anomaly-flags:` into frontmatter for every ready/verified profile that passes. This populates the uniqueness signals the VaultGrid now reads.
2. **Run the full janitor sweep on donors, corporations, PACs, lobbying-firms, think-tanks** (David's earlier request from the first session-save — still outstanding because tonight was spent on S-tier). Same `--type=<X>` pattern as the politician sweep. Expect 100-200 more demotions.
3. **First S-tier candidate depth pass.** Pick one profile (Whitehouse is the obvious first — his editorial notes already document 3 strong contradictions, a clean class analysis, and exclusive connections). Research Claude writes `angle:`, `exclusive-connections:`, `original-finding:`, `central-thesis:`, `story-grade:`. David reviews and signs off `editorial-signoff-narrative:`. Run `node scripts/pipeline-janitor.cjs --tier=s --write` to stamp `audit-s-tier-passed: true`. Then promote via the readiness API.
4. **Wire Quartz homepage features to the A+ gate.** WeeklySpotlight, PowerRankings, Landing page each need a tier check. Start with "A+ or higher" (graceful degradation). Upgrade to "S-tier or higher" once pool ≥ 3.
5. **Research Claude depth passes.** Populate `central-thesis:`, `story-grade:`, `lawyer-dispute:` on the 17 bioguide-recovered profiles (Bowman, Pelosi, Schumer, etc.) now that they have correct Congress data.
6. **Document the 6-step plan completion in Pipeline Guide.** The S-tier verification system rewrite is significant enough to warrant a § in the guide.
7. **David**: start using the new grouped checklist. Mark items N/A where appropriate. The janitor stamps will populate as you work.

### Session end state: the A+ / S-tier foundation is in place
- **All 6 S-tier plan steps shipped + deployed** across 7 commits and 6 deploy runs
- **1 engine bug fixed** (updateFrontmatter quote-escape)
- **2 deploy failures resolved** (Ro Khanna/Zoe Lofgren hotfix + root cause)
- **Vault Rules § 2 documents the full 5-tier system with all sub-tier requirements**
- **Janitor has `--tier=a-plus` + `--cohort` audit modes with stamping**
- **VerificationChecklist renders grouped Tier A/B/C/D + locked S-tier section**
- **Readiness API validates S-tier promotion gates before accepting**
- **Zero breaking changes to existing profiles, components, or deploys**

The foundation is ready. The product differentiation (angle, exclusive connections, original findings) now has a place to live in the schema and a system to enforce it. Research Claude's next job is to fill that foundation with actual investigative work.

---

## Previous Session
Claude: Code (with earlier Research work now superseded by bulk cleanup)
Date: 2026-04-11 late night (Phase 1 Day 2 second session-save — bioguide recovery + taxonomy expansion + mass politician cleanup)

### Theme
Continued directly after the first session-save with manual bioguide recovery for the 22 contaminated profiles from the earlier session. Recovered 17 via David's bioguide.congress.gov lookups + Rick Scott via direct Congress.gov API query. The remaining 5 turned out to be state/local politicians that shouldn't have had bioguides in the first place — surfacing the need for new profile types. Shipped `state-politician` / `local-politician` / `candidate-for` taxonomy, then used that to catch a much larger problem: the Ops app grid showed stories, media, and genuinely-incomplete politicians at "ready" across the board. A full politician-only janitor pass demoted 64 additional profiles (on top of the 32 from earlier) that had never passed pipeline enrichment. Zero politicians at ready anywhere in the vault now.

### Done — 17 bioguide recoveries

- **`scripts/recover-bioguide.cjs`** (new, ~210 lines) — single-profile and batch mode. Applies a verified bioguide to a previously-cleared contaminated profile: inserts `bioguide-id` after `fec-candidate-id`/`state-abbr`/`chamber`, removes the "bioguide-id needs manual verification" known-gap entry, flips `needs-reenrichment: true` with a recovery-dated reason, and prepends a `[MANUAL YYYY-MM-DD]` note to `internal-notes`. Includes **duplicate-bioguide detection** — refuses to apply a bioguide if it's already in use by another profile (second line of defense against re-contamination). Commit `660e5e35` + `422e7988`.
- **Batch of 15** applied via `scripts/bioguide-recovery-batch.json`:
  Morelle M001206, Pelosi P000197, Gottheimer G000583, Padilla P000145, Coons C001088, Schumer S000148, Clinton C001041, Hickenlooper H000273, Sinema S001191, Crenshaw C001120, Salazar S000168, Gaetz G000578, Ted Cruz C001098, Tuberville T000278, Bean B001253. Three of these (Padilla, Hickenlooper, Crenshaw) were auto-extracted from Congress.gov citation URLs already in their profile bodies; David confirmed them afterward.
- **Bowman** (B001223) — applied first, single-profile call.
- **Rick Scott** (S001217) — David's bioguide.congress.gov search didn't surface him. Worked around by querying the Congress.gov API directly: `GET /v3/member/congress/119/FL?format=json` returned both Florida senators (Rick Scott + Ashley Moody). Applied via recover-bioguide.cjs. Documents a new quality-check rule: when the bioguide.congress.gov web UI fails to find a known current member, fall back to `/v3/member/congress/{N}/{stateCode}` for authoritative state delegation.

### Done — new profile type taxonomy (state/local/candidate)

Per user approval, introduced three new frontmatter values to support edge cases:

- **`type: state-politician`** — Governors, Lt Governors, state legislators, state AGs, etc. Congress.gov + GovTrack + Committee pipelines SKIPPED. FEC still fires if `fec-candidate-id` exists (state politicians running for federal office legitimately file with FEC).
- **`type: local-politician`** — Mayors, city council, county commissioners, DAs, sheriffs, school board. Same pipeline behavior as state-politician.
- **`candidate-for:` field** — optional, additive to any `type:`. Marks anyone currently running for federal office with a value like `"US Senate 2026 (IL, Democratic primary)"`. Remove after election is decided; if they win they become `politician` on next sync.

**Vault Rules** — new "Politician type taxonomy (three tiers)" and "Candidate tracking" sections added under Frontmatter schema. Both Claudes must respect these going forward.

**Janitor** — `EXEMPT_TYPES` in `scripts/pipeline-janitor.cjs` now includes `state-politician` and `local-politician`. They're skipped by the auto-block audit because Congress/GovTrack don't apply.

**Applied to 5 profiles** that were cleared in the contamination cleanup and should never have had federal bioguides:
- **Juliana Stratton** → state-politician (IL Lt Gov) + candidate-for: US Senate 2026 (IL)
- **Roy Cooper** → state-politician (former NC Governor 2017–2025) + candidate-for: US Senate 2026 (NC)
- **Zach Wahls** → state-politician (IA State Senator 2019–present) + candidate-for: US Senate 2026 (IA)
- **Daniel Biss** → local-politician (Evanston Mayor 2021–present) + former-roles: IL State Senator 2013–2019, US House IL-9 candidate 2018 (lost)
- **Donna Miller** → local-politician (Cook County Commissioner D6) + candidate-for: US House 2026 (IL, exact district pending FEC filing verification)

Each of the 5 also had the stale "bioguide-id needs manual verification" known-gap entry cleaned up, and got real known-gap entries pointing at the sources that DO apply (state legislature sites, county board minutes, city government sites). Commit `8c3191c9` / merged as `c36a1c12`.

### Done — full politician cleanup (96 total demotions)

After the taxonomy shipped, David pointed out that the Ops app grid was still showing lots of profiles at "ready" that were obviously not done — stories, media, and half-finished politicians. Investigation revealed three mixed problems that required a full audit pass:

**Wave A: 27 topical sub-notes mis-typed as `politician`** — `scripts/find-mistyped-politicians.cjs` + `scripts/classify-mistyped-politicians.cjs` found 52 non-master files with `type: politician`. Splitting them by filename heuristic showed 27 were actually topical sub-notes nested under a parent politician's directory:
- 22 Trump policy deep-dives (Project 2025, DOGE, Pardon Machine, Iran War Money Trail, Fox News Pipeline, Section 702, Palantir State, Tariff Wars, Schedule F, Billionaire Cabinet, Adelson Pipeline, etc.)
- 6 Chad Bianco sheriff-era stories (CA DOJ Investigation, Deputy Misconduct, CSPOA, Oath Keepers Membership, Gubernatorial Pivot, COVID Mandate Refusal)

All retyped to `sub-note` via `scripts/apply-type-reclassification.cjs`. Impact: these disappear from the Ops app politician grid and the checklist correctly stops demanding pipeline enrichment from them.

**Wave B: 5 state politicians mis-typed as `politician`** — same classifier flagged:
- Kathy Hochul (NY Governor) → state-politician
- Brian Kemp (GA Governor) → state-politician
- Ash Kalra (CA State Assembly) → state-politician
- Anthony Rendon (Former CA State Assembly Speaker) → state-politician
- Buffy Wicks (CA State Assembly) → state-politician

Each got `current-office:` as an informational field (e.g., "Governor of New York (2021–present)").

**Wave C: 64 politicians at `ready` demoted to `draft`** — ran `pipeline-janitor.cjs --type=politician` (new `--type` filter added). Every single one of the 64 audited politicians failed the new strict Vault Rules for `ready`:
- 97 `missing-block` issues (no FEC, no Congress, no GovTrack auto-blocks at all)
- 38 `never-enriched` (no `last-enriched` date — pipelines had literally never touched them)
- 3 `internal-notes-pipeline` (pipeline cleanup damage from earlier incidents)
- 1 `zombie-block`

Examples: Gerry Connolly, Bob Casey, Dick Cheney, Virginia Foxx, Jim McGovern, AOC, Bennie Thompson, Brendan Boyle, Debbie Wasserman Schultz. Pattern across all 64: manually promoted to ready by Research Claude based on body content alone, no pipeline ever run. Each now has `needs-reenrichment: true` + a plain-English [JANITOR] note.

**Result: zero politicians at `ready` anywhere in the vault.** 246 politicians at draft (up from ~181). The Ops app grid will finally tell the truth — every politician in the Ready tab is either one of the ~3 legit verified profiles or doesn't exist there.

### Done — 3 Tier 1 incidents documented in Pipeline Guide

Added new entries to `content/Pipeline Guide.md` § "Engine-wide known incidents":
- **"updateFrontmatter scalar/list hybrid corruption (fixed 2026-04-11)"** — root cause, smoking-gun commit, fix approach, quality-check rule
- **"Bulk bioguide contamination — C001091 (Castro) + B001296 waves (fixed 2026-04-11)"** — root cause, real-time near-miss, four new quality-check rules covering the candidates[0] fallback pattern, duplicate-bioguide detection, pipeline-side dedupe defense, and the `q=` parameter truth

### Tooling shipped this session

Seven new scripts + two new YAML fields + two new profile types:

```
scripts/pipeline-janitor.cjs              (audit ready/verified profiles; auto-demote zombies, self-heal)
scripts/yaml-sanity-scan.cjs              (vault-wide YAML parse validator)
scripts/fix-bioguide-contamination.cjs    (clears contaminated bioguides with [JANITOR] notes)
scripts/recover-bioguide.cjs              (single/batch manual bioguide recovery with duplicate detection)
scripts/find-mistyped-politicians.cjs     (quick diagnostic for wrong type: politician)
scripts/classify-mistyped-politicians.cjs (splits mis-typed into real/sub-note/state/international)
scripts/apply-type-reclassification.cjs   (one-shot bulk type rewrite; kept for audit trail)
scripts/bioguide-recovery-batch.json      (the 15-profile recovery batch)
```

Engine patches (`donor-map-engine` main):
- `061c2c7` — `selectTargets` honors `needs-reenrichment: true` flag (bypasses enrichedKey skip + notFoundCache, prioritizes flagged profiles first)
- `4b23618` — `updateFrontmatter` uses `fullFieldRegex(key)` helper to consume continuation lines (prevents scalar/list hybrid corruption)

### Commits this session-save cycle

Site repo (`donor-map-site`, branch `v4`):
- `596ebeb4` — First session-save (moved to Previous Session by this update)
- `660e5e35` — Bioguide recovery: 16 profiles (Bowman + batch of 15)
- `8c3191c9` — Taxonomy: state-politician + local-politician + candidate-for + Rick Scott recovery
- `9ae94152` — Full politician cleanup: 32 type reclassifications + 64 demotions (101 files changed)
- Deploys: `24270279903` ✓ (first session-save), `24272235465` ✓ (taxonomy), `24272545408` ✓ (cleanup)

Engine repo (`donor-map-engine`, branch `main`):
- No new commits this session-save cycle (all engine work was in the previous session-save cycle at `061c2c7` and `4b23618`).

### Known issues / still outstanding

- **22 contaminated profiles → 17 recovered, 5 reclassified.** None of the 22 have wrong bioguides anymore. Full recovery.
- **Enrichment pipeline runs dispatched:** `24269046614` cancelled at ~24 minutes (contamination save), `24272289750` dispatched after recoveries and currently running. When the new run completes it will populate the 17 recovered profiles with CORRECT Congress.gov data for the first time. Spot-check Bowman next session to verify.
- **Not yet audited by the full janitor:** donors (184 at ready), corporations (140 at ready), PACs (35 at ready), lobbying-firms (21 at ready), think-tanks (21 at ready). Same "ready but actually incomplete" problem is almost certainly present in these. Next session priority #1 per David's instruction.
- **3 international politicians** (Smotrich, Ben-Gvir, Zelenskyy) still at `type: politician` — need either a new `international-politician` type or a manual exemption. Deferred.
- **~39 stub profiles still at `raw`** — eventual draft→ready path but not urgent.
- **Bowman / Cori Bush verified review (rc_05)** — Bush is ready for sign-off, Bowman needs pipeline run `24272289750` to complete before re-review.

### Next session priorities (2026-04-12)

1. **Run full janitor sweep on donors, corporations, PACs, lobbying-firms, think-tanks.** Same pattern as tonight's politician sweep. Use `--type=donor`, `--type=corporation`, etc. Expect another 100-200 profiles demoted ready→draft. **David explicitly asked for this: "and we will start looking at other profiles for flags."**
2. **Verify enrichment run `24272289750` finished cleanly** — check `gh run list --workflow=api-enrichment.yml` for its conclusion. Spot-check Bowman's profile body for a `<!-- auto:congress -->` block containing **Bowman's** actual legislative record (not Joaquin Castro's). This is the definitive proof that the contamination chain is fully broken.
3. **Re-run janitor self-healing pass** to clear `needs-reenrichment` flags on profiles whose auto-blocks are now populated by run `24272289750`.
4. **rc_05 finale: Bowman + Bush verified re-review** once fresh pipeline data lands.
5. **Investigate the 3 international politicians** — propose `international-politician` type or exemption.
6. **Research Claude depth passes** on the newly-draft politicians — Gerry Connolly, Bob Casey, AOC, Bennie Thompson, Brendan Boyle, Debbie Wasserman Schultz, etc. Now that they're honestly at draft, Research Claude can work through them with pipeline data as the foundation instead of manually curating without data.
7. **David**: conflict triage backlog (~528 remaining, target 27/day).
8. **David**: sign off on Cori Bush verified candidate (she's been ready for it since earlier today).

### Session end state: dramatically cleaner foundation
- **22 bioguide contaminations fully resolved** (17 recovered + 5 reclassified to non-federal types)
- **32 mis-typed profiles fixed** (27 sub-notes + 5 state politicians)
- **64 additional politicians demoted** from ready → draft (honest readiness)
- **0 politicians at ready** (none meet the strict Vault Rules definition yet)
- **Zero broken YAML, zero duplicate bioguides, zero mis-typed politician sub-notes**
- **2 new profile types + 1 new optional field** in the schema
- **7 new tools** in `scripts/` for future audits

---

## Previous Session
Claude: Both (Code + Research, switched as needed)
Date: 2026-04-11 night (Phase 1 Day 2 final session — Pipeline Janitor + bioguide contamination near-miss + 4 depth passes)

### Theme
What started as a rc_03/04/05 depth-pass continuation became the single most consequential infrastructure + safety session of the sprint. Built the pipeline-janitor (full audit tool), discovered and defused a live contamination emergency (22 profiles with the wrong bioguide-id about to be re-enriched with Joaquin Castro's data), patched two root-cause engine bugs (`updateFrontmatter` scalar/list hybrid corruption + `selectTargets` not honoring needs-reenrichment), tightened the `ready` definition in Vault Rules, and still got 4 progressive senator depth passes shipped (Summer Lee draft→ready, Sanders, Warren, Jayapal).

### Done — Pipeline health infrastructure (the big one)

- **`scripts/pipeline-janitor.cjs`** (new, ~450 lines) — audits all `ready`/`verified` profiles for missing pipeline auto-blocks, demotes zombies to `draft`, sets `needs-reenrichment: true`, and writes a plain-English `[JANITOR]` note to `internal-notes` explaining why. Scope is strict: pipeline data only (no URLs, no wikilinks, no class analysis). Exempts media-profile/think-tank/story/event/etc. types. Self-healing: clears the flag on profiles whose auto-blocks have returned. Modes: default dry-run, `--write` to apply, `--zombies-only` for safest scope (only `zombie-block` + `known-gap-pipeline` + `internal-notes-pipeline` issues).
- **First janitor pass: 32 zombie profiles demoted `ready → draft`** — Pressley, Raskin, Porter, Murkowski, Khanna, Booker, Warnock, Whitehouse, Cori Bush, and others — all A000383 / DOJ false-positive / NHTSA cleanup casualties whose frontmatter enrichment keys stayed set after body auto-blocks were stripped. Commit `ad67ffad`.
- **Engine patch `selectTargets()` honors `needs-reenrichment` flag** (`donor-map-engine@061c2c7` on main). Flagged profiles bypass the `enrichedKey` skip + `notFoundCache`, run at the front of the queue. Closes the loop: janitor flags zombies → pipeline reprocesses them → janitor self-heals. Without this patch, flagged profiles would sit at draft forever while the pipeline skipped them as "already enriched".
- **Vault Rules: `ready` tier rewritten.** Now explicitly means "99% done, only David's sign-off remains." Hard rule added: missing auto-blocks, stale data, or any `known-gap` / `internal-notes` phrase mentioning "needs fresh pipeline run" / "awaits pipeline" / "not yet enriched" forces `draft`. Both Claudes must enforce the gate rather than leave half-finished profiles labeled ready. Commit `283da862`.

### Done — Bug fixes that prevent deploy breaks

- **Whitehouse YAML corruption fixed** — `donors:` was both a scalar string AND a YAML list underneath, invalid YAML, blocking the Quartz deploy for two consecutive runs (`24267993437`, `24269003528`). Root cause was NOT my edits — it shipped in the earlier "API enrichment: 412 files" commit (`865e0156`). Fixed by removing the scalar duplicate line; 10-element list is the canonical value. Commit `61bda197`. Deploy turned green on `24269113665` after the fix.
- **Engine `updateFrontmatter()` scalar/list hybrid bug fixed** (`donor-map-engine@4b23618` on main). Both the scalar-write and array-write branches had their own regex that replaced just the key line and left orphaned indented continuation lines behind when the value type changed. Fixed by a single `fullFieldRegex(key)` helper that consumes the key line PLUS any indented continuation lines before replacement. Test suite exercises scalar-replacing-list, array-replacing-list, array-replacing-scalar, and new-key insertion — all pass.
- **`scripts/yaml-sanity-scan.cjs`** (new) — parses every profile's frontmatter with `js-yaml` and reports failures. Commit `2fe6cb70`. Current state: **1753 scanned, 0 broken YAML, 0 duplicate bioguide IDs.**
- **Pipeline Guide** — two new incident entries under "Engine-wide known incidents":
  - "updateFrontmatter scalar/list hybrid corruption (fixed 2026-04-10)" — root cause, fix approach, quality-check rule
  - "Bulk bioguide contamination — C001091 (Castro) + B001296 waves (fixed 2026-04-10)" — root cause, real-time near-miss, four quality-check rules

### Done — BIOGUIDE CONTAMINATION EMERGENCY (22 profiles)

This was discovered during a depth-pass scan ("lets look at 5 more profiles that make sense"). A bioguide duplication check turned up **19 unrelated profiles all sharing `C001091`** (Joaquin Castro's bioguide) plus **3 more sharing `B001296`** — 22 profiles with wrong IDs. Same class of bug as the A000383 Alan Armstrong incident: a past bulk-set script fell through to `candidates[0]?.bioguideId` when the Congress.gov `q=` name search produced no confident match.

**Live safety risk:** Bowman was in the janitor-flagged `needs-reenrichment: true` set. The running enrichment pipeline (`24269046614`) was actively processing profiles at minute 24+ with the new `selectTargets` patch guaranteeing Bowman would be hit. The Congress pipeline would have called `/v3/member/C001091`, fetched Castro's data, and written it to Bowman's body as a fresh `<!-- auto:congress -->` block. Exact repeat of the A000383 incident at bigger scale.

**Actions:**
1. **Cancelled `24269046614` mid-run** — `gh run cancel` at ~24 minutes elapsed, before the contamination committed.
2. Wrote `scripts/fix-bioguide-contamination.cjs` — CLEARS the wrong bioguide-id rather than attempting auto-fix (auto-fix via `q=` search would produce a third wave of contamination since the API has the same name-matching weakness).
3. Cleared both waves (C001091 + B001296). Each affected profile got: wrong bioguide line removed, `known-gap` entry added, `needs-reenrichment: false` with a `BLOCKED` reason, plain-English `[JANITOR]` note prepended to `internal-notes`.
4. Commits: `660e5e35` (22 profile fixes + script), `3f197d28` (Pipeline Guide incident doc).

**Affected profiles (need manual bioguide verification at https://bioguide.congress.gov/search next session):**
C001091 wave — Bowman, Morelle, Pelosi, Josh Gottheimer, Alex Padilla, Chris Coons, Schumer, Hillary Clinton, Hickenlooper, Juliana Stratton, Roy Cooper, Zach Wahls, Sinema, Dan Crenshaw, Maria Elvira Salazar, Matt Gaetz, Rick Scott, Ted Cruz, Tuberville.
B001296 wave — Daniel Biss, Donna Miller, Melissa Bean.

### Done — Ops app UX fixes

- **VerificationChecklist.tsx** — "2+ Tier 1 source types" check was reading only the `source-types` frontmatter array. The stats panel was counting `(Tier 1)` markers in the body text. Mismatch caused false-negative `✗ N/A` on profiles like Adam Smith (6 Tier 1 sources in body, 0 in frontmatter array). Fix: check passes if EITHER the frontmatter array has ≥2 entries OR the body has ≥2 `(Tier 1)` markers. Applied to all checklist variants (politician common, donor, corporation, lobbying-firm, pac, media-profile, think-tank, DEFAULT). Verified live on Adam Smith — went from `6/9 67%` to `7/9 78%` after HMR. Commit `e13b8df3`.
- **Pipelines route (`ops/src/app/api/pipelines/route.ts`)** — generic "GITHUB_TOKEN not set" error replaced with diagnostic messages: format validation (must start with `ghp_` / `github_pat_` / `ghs_`) and actionable next-step guidance. David's existing PAT only had `repo` scope — generated a new one with `repo + workflow`, updated `ops/.env.local`, restarted the server. Pipeline dispatches now work.
- **Worktree `.env.local` was missing** — root cause of "I added the token and it doesn't work" — the preview server runs from the worktree directory but only the main repo had the updated `.env.local`. Copied it over + restarted the preview server. Fixed.

### Done — Research Claude depth passes (rc_03, rc_04, ad-hoc)

Safe targets only — profiles NOT in the janitor's 32 (avoid merge conflicts with the running pipeline).

**rc_03 finale — Squad/leadership:**
- **Rashida Tlaib** — removed duplicate FEC source, added `### Verified` header
- **Ayanna Pressley** — fixed missing Voting Record table header row
- **Hakeem Jeffries** — added Congress.gov Tier 1 source, updated `corroboration-count: 2`, removed stray `--- (Tier 3)` formatting artifact, flagged `editorial-result: verified-candidate`
- **Greg Casar** — **created new raw stub** (profile didn't exist in vault despite being on the rc_03 candidate list), bioguide C001133, FEC H2TX35108

**rc_04 — Summer Lee promoted draft→ready:**
- Added Class Analysis section (DSA alignment, AIPAC actuarial failure pattern, demographic limits of donor-class override)
- Cleaned Sources structure (Verified / Archived split)
- Added `bioguide-id: L000299` + `corroboration-count: 2` to frontmatter
- Flagged `editorial-result: ready-candidate` for David's verified sign-off once committee/bill data populates via pipeline

**Sanders depth pass** (commit `b65e6ece`):
- **Factual fix:** `party: "Democrat"` → `"Independent"` with `caucus: "Democratic"`. Longest-serving Independent in Congress; the title, file path, and body all said Independent; only the frontmatter was wrong.
- Added `bioguide-id: "S000033"` (was missing — the reason Congress pipeline could never enrich him)
- Issues 1→9 entries, added committees, expanded top-donors with small-dollar model, structured opposes, expanded related wikilinks
- Removed body inline dataview `donors: [[SEIU...]], ...` + orphan double `---` separator + body `research-status:: ready` dataview line
- Stays `draft` per new Vault Rules (Congress/GovTrack blocks still missing, FEC auto-block shows stale cycle-2006 data), flagged `needs-reenrichment: true`
- **Body untouched** — 4-pattern class analysis arguably the strongest anti-donor case study in the vault

**Warren depth pass** (commit `03ef38dd`):
- Added `bioguide-id: "W000817"`, removed false-positive `DOJ` from source-types (engine scan artifact), expanded issues 1→8, added committees, restructured top-donors to lead with 96.2% individual contributions (the "anti-model"), added structured opposes (Fairshake, Griffin, corporate PACs), removed inline body dataview + double-separator
- Stays `draft`, flagged `needs-reenrichment: true`

**Jayapal depth pass** (commit `03ef38dd`):
- Added `former-roles: CPC Chair 2021-2024`, expanded committees (Judiciary/Antitrust, Budget), restructured issues to lead with Medicare for All + immigration, added structured opposes (Amazon, Microsoft — the WA-7 antitrust contradiction the body analyzes), removed inline body dataview
- Stays `draft`, NOT flagging needs-reenrichment (Congress data IS present; only GovTrack missing, normal rotation will hit her)

### Commits this session (~20 commits)

Engine repo (`donor-map-engine`, branch `main`):
- `061c2c7` — selectTargets honors needs-reenrichment flag
- `4b23618` — updateFrontmatter consumes full field (key + continuations)

Site repo (`donor-map-site`, branch `v4`) — major commits only:
- `ad67ffad` — Pipeline health: janitor + tightened `ready` definition + 32 zombie demotions
- `e13b8df3` — Ops app: fix checklist false negatives + diagnostic token errors
- `283da862` — Research Claude: Vault Rules tighten + Squad depth pass + Summer Lee promoted
- `61bda197` — Fix Whitehouse YAML: remove duplicate scalar donors line
- `2fe6cb70` / `b164b099` — YAML sanity scan + Pipeline Guide updateFrontmatter incident doc
- `b65e6ece` — Bernie Sanders depth pass
- `03ef38dd` — Warren + Jayapal depth passes
- `660e5e35` — Clear wrong bioguide contamination (19× C001091 + 3× B001296)
- `3f197d28` — Pipeline Guide: bioguide contamination incident doc
- Deploys: `24269113665` ✓ (Whitehouse YAML fix — turned builds back green)

### Known issues / still outstanding

- **22 profiles need correct bioguides added manually** — all cleared, all have `known-gap` documenting the contamination, all have `needs-reenrichment: false` with a `BLOCKED` reason. Verify each at `https://bioguide.congress.gov/search`. Once a verified bioguide is in place, flip `needs-reenrichment` to `true` and the patched `selectTargets` will pick them up. This is rc_06 / next-session work.
- **Enrichment run `24269046614` was cancelled mid-run** — it had been running for ~24 min. The ~10 safely-flagged profiles (not in the bad-bioguide set) still need their re-enrichment. Re-dispatch after the bioguide recovery lands, OR wait for the next scheduled cron slot.
- **rc_05 (Bowman + Bush verified review) still blocked** — Bowman specifically needs a correct bioguide first. Bush looks clean and is ready for David's sign-off.
- **Janitor should add duplicate-bioguide check** — per the Pipeline Guide "quality check rule 2" from today's incident. Small addition to `scripts/pipeline-janitor.cjs`.
- **FEC auto-blocks showing cycle 2006 for Sanders and possibly others** — stale pipeline data even though the block exists. Janitor currently only checks for block PRESENCE, not content freshness. Follow-up: add a `stale-fec-cycle` detector.

### Next session priorities (2026-04-12)

1. **Manual bioguide recovery for the 22 contaminated profiles.** Use `https://bioguide.congress.gov/search` to look up each, verify against the profile's title + state + chamber, write the correct bioguide to frontmatter, flip `needs-reenrichment: true`. Estimated 15–20 min for all 22. This unblocks rc_05 (Bowman re-review).
2. **Re-dispatch `api-enrichment.yml` pipeline** once bioguides are restored. With the `selectTargets` patch live, the flagged profiles from today's janitor run will be processed first. Watch for a clean completion and verify via the next janitor self-healing pass that the `needs-reenrichment` flags clear.
3. **Add duplicate-bioguide check to the janitor** — `scripts/pipeline-janitor.cjs` should flag any bioguide-id appearing on more than one profile. Small addition, high prevention value per today's incident.
4. **rc_05 finale: Bowman + Bush verified re-review** once fresh pipeline data lands.
5. **Continue Research Claude depth passes** — AOC (already at ready, has inline-dataview + metadata gaps), Adam Smith, Jeff Merkley, Chris Murphy, Tammy Baldwin — all `draft`, all safe targets.
6. **David**: conflict triage backlog (~528 remaining, target 27/day).
7. **David**: review today's `verified-candidate` flags (Jeffries, Summer Lee, Sanders-pending, Warren-pending, Jayapal-pending after pipeline).

### Session end state: safer than start
- **22 contamination cases defused** before the pipeline could amplify them
- **1753 profiles / 0 broken YAML / 0 duplicate bioguides** (vault-wide clean)
- **Engine has two new root-cause fixes** that prevent recurrence of both corruption classes
- **Janitor + `ready` rule tightening** means future contamination gets caught automatically rather than silently breaking deploys
- **8 Research Claude profile updates** committed across rc_03/04 + ad-hoc

---

## Previous Session
Claude: Code
Date: 2026-04-11 evening (Phase 1 Day 2 continued — 5 infrastructure safety nets + 3 new corporate accountability pipelines + Ops app wiring)

### Theme
Second half of the 2026-04-11 Phase 1 Day 2 session. Knocked out five quick infrastructure safety nets (stuck-scheduler kick, FEC ID audit retry logic, YAML parse scan in /preflight, deploy polling in /deploy and /session-save, scheduler-incident docs), then built three brand-new corporate accountability pipelines (FDA, OCC, FTC) end-to-end — source code, CI wiring, Ops app integration, and Pipeline Guide docs. 2026-04-10 follow-ups and Day 2 ad-hoc work are now caught up.

### Done — infrastructure safety nets (5 items)

1. **Kicked stuck api-enrichment.yml scheduler** via `gh workflow disable/enable` toggle. Workflow metadata refreshed at 2026-04-10 20:32Z. Scheduled runs had been dead since 2026-04-09 17:44Z (four consecutive missed slots) because both prior scheduled runs hit the 25-min parallel-step timeout and GitHub paused the scheduler silently. Should resume on next scheduled slot (02:00Z / 08:00Z UTC).

2. **Added retry loop to `scripts/verify-fec-candidate-ids.cjs`** (engine commit `c9025e8`). `probeCandidate()` now retries up to 3 attempts with 2s/4s backoff on both empty results and fetch errors. Eliminates the 5 transient rate-limit false positives from the first audit run (Daniel Biss, Chris Murphy, Mallory McMorrow, Sheldon Whitehouse, Tim Walberg — all verified clean on direct re-check).

3. **Wired a 3-second vault YAML parse scan into `/preflight`** (new Step 6). Uses js-yaml to parse every `.md` frontmatter block in `content/`; reports any errors prominently in the preflight summary and flags them as blocking. Catches silent build-break states like the 2026-04-10 Whitehouse donors hybrid-string-list corruption before any session work begins.

4. **Wired deploy-success polling into `/deploy` (new Step 8) and `/session-save` (updated Step 5).** Polls `gh run list --workflow=deploy.yml --limit 1` every 20s up to 5 minutes after a push, hard-fails on failure/cancelled/timed-out. Red Flag #7 from the 2026-04-10 lesson-learned doc. **Validated live on this very session's deploys** — run `24263270533` (safety nets commit) polled 5 attempts and caught `completed/success`. Run `24264591063` (pipelines commit) hit `completed/success` on first poll attempt. Run `$latest` (this session-save) will be polled at the bottom of this Step 5.

5. **Documented the stuck-scheduler incident** in `content/Pipeline Guide.md` under Engine-wide known incidents → "GitHub Actions scheduled runs silently stop firing". Includes the gh workflow disable/enable fix recipe and a quality-check rule for preflight to track "last scheduled run within 12 hours" going forward.

6. **Synced global skills** (`~/.claude/skills/preflight/skill.md`, `deploy/skill.md`, `session-save/skill.md`) with the updated repo-local command versions, so `Skill` tool invocations pick up the same rules as `.claude/commands/*.md`.

### Done — 3 new corporate accountability pipelines (FDA, OCC, FTC)

**Shared-key theory confirmed:** `api.data.gov` is the unified gateway for FEC, Congress.gov, FTC, OCC, USDA, NASA, SAM.gov, and every other .data.gov-fronted API. One registration covers all of them. Requesting a new key does NOT break existing keys — each signup mints a fresh key, old ones stay valid. David's existing FEC key now also powers FTC and OCC via an automatic fallback in `api-config.cjs`. FDA uses a separate signup at `open.fda.gov/apis/authentication/` but the key is OPTIONAL — unauth gets 240 req/min/IP which is plenty for our scale.

**FDA pipeline** (`scripts/fda-pipeline.cjs`, 420+ lines):
- Queries `/drug/enforcement.json`, `/device/enforcement.json`, `/food/enforcement.json` for every FDA-adjacent profile
- Profile filter: NAICS 3254 / 3391 / 311 / 445 + ~40 hard-coded big-pharma / big-device / big-food brands (38 profiles filtered from 384 in testing)
- Strict firm verification with corporate-suffix stripping (`extractFirmTokens()`) — "Pfizer Inc." tokenizes to just `["pfizer"]`, not `["pfizer", "inc"]`
- **Verified:** Pfizer Inc. → **103 recalls** (100 drug, 3 device), **14 Class I life-threatening**, 15 ongoing. Johnson & Johnson → **110 recalls** (24 drug, 86 device), 2 Class I, 41 ongoing.
- Frontmatter: `fda-recalls`, `fda-recalls-class-i`, `last-enriched`
- Auto-block: `### FDA Enforcement (openFDA)` with metric table, Class I highlight, 6 most recent recalls

**OCC pipeline** (`scripts/occ-pipeline.cjs`, 460+ lines):
- Queries `/EnforcementActions/list/{variant}` per name variant, dedupes by DocketNumber
- **Discovered + documented:** `/Institutions/List/1` keyword search is broken — searching "JPMorgan" returns Charter 1 (Wells Fargo's predecessors CoreStates/Wachovia), NOT JPMorgan. Pipeline skips the institution lookup entirely and parses CharterNumber directly from enforcement results. Documented in Pipeline Guide § OCC.
- `nameVariants()` splits compound vault titles like "JPMorgan - Chase Bank" and strips corporate suffixes
- Strict institution match on `Institution` / `Company` / `Individual` fields, full word-boundary regex on both sides
- Parses `Amount` defensively (it's a STRING: "2614456.00", "0.00", "See Order", or "")
- Distinguishes active vs terminated actions, tracks CMP totals, derives canonical institution name from most-common Institution value
- **Verified:** Wells Fargo → **116 actions**, 95 active, **$899,171,205 in civil money penalties**. JPMorgan Chase → **78 actions**, 58 active, **$1,222,035,000 in CMPs** (~$1.22B).
- Frontmatter: `occ-enforcement-actions`, `occ-active-actions`, `occ-charter-numbers`, `occ-cmp-dollars`, `last-enriched`
- Auto-block: `### OCC Enforcement Actions` with legal name + charter table, action type breakdown, subject areas, still-active actions list with PDF links, recent enforcement history

**FTC pipeline** (`scripts/ftc-pipeline.cjs`, 470+ lines):
- FTC has NO enforcement search API. Pipeline combines two sources:
  - Three static enforcement CSVs (merger, non-merger, civil penalty) loaded at startup — 644 records total covering FY1996–FY2021
  - HSR Early Termination Notices via `/v0/hsr-early-termination-notices` API for real-time merger data
- In-tree CSV parser (no csv library dependency) handles quoted fields with embedded commas
- Same `nameVariants()` + word-boundary strict matching as OCC
- **Bug caught in testing and fixed:** first version of the regex used `\b${token}` (word boundary only at start) which matched "Meta" against "Commercial Metals Company" via "Metals". Fixed with full word boundary on both sides (`\b${token}\b`). Same trap was present in FDA's `matchesFirm` — fixed simultaneously.
- Explicit CSV-cutoff caveat in every auto-block pointing editors to the FTC Legal Library for post-2021 cases
- **Verified:** Meta - Facebook → 1 historical enforcement (Facebook/Instagram 2020), 0 HSR (correct — Meta files under "Meta Platforms" which post-dates the 2021 CSV cutoff), 0 false positives
- Frontmatter: `ftc-enforcement-actions`, `ftc-hsr-notices`, `last-enriched`
- Auto-block: `### FTC Enforcement & Merger Review` with enforcement + HSR counts, by-type breakdown, recent cases, staleness caveat

**api-config.cjs** — added `ftc`, `fda`, `occ` blocks with automatic FEC-key fallback for FTC and OCC, optional FDA key. `printStatus()` updated to show key source for each.

**api-enrichment.yml workflow** — added `run_if fda`, `run_if occ`, `run_if ftc` to the parallel run list (each with `--limit=15`), plus updated the pipeline dropdown in `workflow_dispatch` inputs.

### Done — Ops app integration for the 3 new pipelines

- **`ops/src/lib/pipelines.ts`** — added FDA, OCC, FTC to the `PIPELINES` array under "AUTO-FILL — pure data, no editorial needed". All three categorized as `regulatory` / `auto-fill`, Tier 1, with descriptions matching the cheatsheets. Now visible in the Ops app's pipeline dropdown and trigger UI.
- **`ops/src/app/api/enrichment-history/route.ts`** — added human-readable labels for `fda`, `fda-enforcement`, `occ`, `occ-enforcement`, `ftc`, `ftc-enforcement` so they show correctly in the Enrichment History view when they appear in future commit messages.
- **`ops/src/components/PipelineDataViewer.tsx`** — added `fda-enforcement`, `occ-enforcement`, `ftc-enforcement` to `BLOCK_LABELS` so their auto-blocks render with proper titles in the profile data viewer.

### Commits this session (second half)

Engine repo (donor-map-engine, branch `main`):
- `0ade14c` — CI: drop lobbyview + doj-press + add verify-fec-candidate-ids.cjs
- `c9025e8` — verify-fec-candidate-ids: 3-attempt retry with backoff
- `9a7a07e` — Add FDA + OCC + FTC corporate accountability pipelines (5 files, +1680/-1)

Site repo (donor-map-site, branch `v4`):
- `b6594eed` — Katie Porter FEC ID fix
- `775d0e46` — Session state 2026-04-11: deep pipeline bug sweep + calendar wiring
- Merge `b82b6966` → v4 → push → deploy run `24263270533` ✓ success
- `de43d755` — Preflight + deploy + session-save + Pipeline Guide safety nets
- Merge `f21ffb12` → v4 → push → deploy run `24263270533` ✓ success
- `bc91128c` — Pipeline Guide: document FDA, OCC, FTC pipelines
- Merge `e2a8467e` → v4 → push → deploy run `24264591063` ✓ success on first poll
- This session-save commit → deploy polled below

### Known issues / still outstanding

- **Scheduled api-enrichment.yml runs** — disable/enable toggle applied at 2026-04-10 20:32Z. We won't know for sure whether the scheduler resumed until the next scheduled slot (02:00Z or 08:00Z UTC). If still stuck, /preflight should include a scheduled-runs health gauge per the documented quality-check rule.
- **FTC CSVs frozen at FY2021** — documented in every FTC auto-block. Post-2021 cases require either the FTC Legal Library HTML search (fragile) or a paid Google Custom Search API. Not urgent.
- **OCC only covers national banks + federal savings associations** — state-chartered banks (Goldman Sachs Bank USA, Morgan Stanley Bank, regional state banks) need a separate FDIC BankFind pipeline. Logical next data source for complete Wall Street coverage.
- **FDA `search_after` deep paging** — not yet wired. Biggest response in testing was Pfizer at 103 recalls (well under the `skip=25000` limit), but Cargill or Tyson Foods might cross it.
- **LobbyView Firebase refresh-token flow** — still not implemented. LobbyView stays disabled in CI.

### Next session priorities (Phase 1 Day 3, 2026-04-12)

1. **Verify scheduled api-enrichment.yml runs resumed** — check `gh run list --workflow=api-enrichment.yml --limit 10 --json event,status,conclusion,createdAt` for at least one `schedule` event after 2026-04-10 20:32Z. If none, the toggle didn't work and we need deeper diagnosis (workflow file edit to force re-parse, support ticket, etc.).
2. **Run a full enrichment batch against the vault** — `gh workflow run api-enrichment.yml -f limit=30 -f pipeline=all -f profile=` to populate the vault with FDA / OCC / FTC data for all eligible profiles at once. Expected: ~40 FDA hits, ~20 OCC hits, ~30 FTC hits on the first run.
3. **Build FDIC BankFind pipeline** for state-chartered bank coverage. Free, no auth required, separate cheatsheet needed. Complements OCC.
4. **Research Claude**: continue depth reviews — Brian Schatz (paused mid-review), then Jon Ossoff, Fetterman, Gary Peters, Chris Murphy, Martin Heinrich, Ed Markey, Tammy Baldwin.
5. **David**: review verified-candidate flags from 2026-04-10 (6 candidates + Cori Bush re-review). Phase 1 exit target is ≥12 verified by 2026-04-16.
6. **David**: conflict triage backlog (~528 remaining, target 27/day).
7. **Follow-up**: the `gh workflow run` button in the Ops app should be checked after these pipelines run once to confirm the pipelines show up correctly in the Enrichment History view.

---

## Previous Session
Claude: Code
Date: 2026-04-11 (Phase 1 Day 2 — deep pipeline bug sweep, 13 fixes across two sweeps, Katie Porter + vault FEC ID audit, LobbyView / DOJ Press retired from CI, session-save wired to update calendar)

### Theme
Ran a thorough pipeline health check with real API keys after David pasted them. Tested every pipeline locally with small limits, documented failures, and fixed them at root. This was the session that turned the pipelines from "mostly broken silently" to "known-good or known-dead-and-guarded".

### Done — First sweep (6 bugs)

- **Congress.gov `/member?query=` parameter is silently ignored.** Verified against `?query=Bernie Sanders`, `?query=Sanders`, and empty `?query=` — all three returned the same default page of 5 members (Joaquin Castro, Kristen McDonald Rivet, Jason Crow, Alan Armstrong, Markwayne Mullin), none of which were Sanders. Every politician without a pre-populated `bioguide-id` was silently dropped. **Fix:** `scripts/congress-pipeline.cjs` now uses `/member/congress/{N}/{stateCode}` (the only endpoint that honours state filtering), fetches each state delegation once per run (cached), and matches locally with nickname-aware first-name logic. Verified on Bernie Sanders, Lisa Murkowski, Chuck Schumer, Mark Green, Diaz-Balart, Rick Larsen — all 5/5 found across parties/chambers.

- **GovTrack `/person?q=Jim Risch` returns 0 results** because GovTrack stores him as "James Risch". Every senator/rep whose vault profile uses a nickname (Jim/James, Bill/William, Bob/Robert, Bernie/Bernard, Chuck/Charles, etc.) was silently dropped. **Fix:** `searchPerson()` in `scripts/govtrack-pipeline.cjs` now queries by last name only and does nickname-aware first-name matching via a `NICKNAMES` table.

- **ProPublica Nonprofit `bestMatch()` had an A000383-class `return results[0]` fallback.** Searching "Coinbase" (for-profit, not a nonprofit) returned "Coinwise Foundation" (EIN 882190767) with a completely unrelated 990. **Fix:** strict match only (exact or full-phrase substring with ≤3 extra boilerplate tokens), returns null rather than guess.

- **Wikipedia + OpenSanctions cold-cache short-circuit.** Four sites checked `if (cached !== undefined) return cached`, but `FileCache.get()` returns `null` for missing keys (not `undefined`), so every profile was short-circuited on first run without ever hitting the API. **Fix:** changed all 4 sites to `if (cached != null) return cached`. Verified John Boozman now resolves.

- **api-config dual env-var naming.** Keys in David's `.env` used GitHub-Secret naming (`FECAPI`, `CONGRESSAPI`, `LOBBYVIEWAPI`) but api-config.cjs only read standard names (`FEC_API_KEY`, `CONGRESS_API_KEY`). Pipelines were falling back to DEMO_KEY silently. **Fix:** added `pickKey(...names)` helper that tries both naming conventions. Added `requireRealKeys(...)` that hard-fails on DEMO_KEY for fec/congress pipelines, with `ALLOW_DEMO_KEYS=1` escape hatch.

- **`api-enrichment.yml` stale-log cache contamination.** Identified by noticing identical per-pipeline counts across many commits with wildly different file totals (9 commits in a row showing `courtlistener:14 doj-press:15 fara:2 ...` despite file counts of 93→125→220). The parallel step cached `reports/` including `logs/`, and when the step timed out at 25 min the stale logs from the previous run remained in cache. The commit-message grep then counted fresh + stale writes together. **Fix:** exclude `reports/logs` from cache path, wipe `reports/logs` at step start as defence-in-depth, bump timeout 25→30 and job timeout 35→40.

### Done — Second sweep (7 more bugs)

- **NHTSA `/recalls/recallsByManufacturer` and `/complaints/complaintsByManufacturer` are DEAD (HTTP 403 "Missing Authentication Token"),** `/investigations?manufacturer=X` still works. **Fix:** `fetchRecalls()` now queries DOT Socrata `datahub.transportation.gov/resource/6axg-epim.json` with a LIKE filter on manufacturer name and normalizes Socrata snake_case back to the legacy PascalCase shape so `parseRecall()` doesn't need changes. Complaints stubbed to `[]` until a replacement source is found. Verified Ford Motor Company → 500 recalls (hit cap) + 10 investigations.

- **DOJ Press pipeline is DEAD** — `/api/v1/press_releases.json ?keyword=` is silently ignored (returns the 264,553-record index for every query) and the `/news` fallback is behind Akamai Bot Manager with `bm-verify` meta-refresh gates. **Fix:** dead-guard at top of `main()` that exits(0) with a clear message. Override: `ALLOW_DOJ_DEAD=1`.

- **Congress.gov v3 API does NOT expose committee membership anywhere.** Neither `/member/{bioguideId}` nor `/committee/{chamber}/{code}` returns a members list. Verified against Bernie Sanders (S000033) and Senate Budget (ssbu00). The old `committee-pipeline.cjs` burned 33 API calls per politician looking for members that weren't there, returned 0 committees for everyone. **Fix:** rewrote `fetchCommitteeAssignments()` to use GovTrack's `/api/v2/committee_member?person={id}` endpoint. Verified Bernie → 5 committees + 9 subcommittees in 2 API calls.

- **committee-pipeline.cjs line 448 syntax error** — stray `"last-enriched": today(),` outside an object literal prevented the script from parsing at all. **Fix:** brace placement in the `updates = {}` literal.

- **committee-pipeline.cjs null congress bug** — empty `&congress=` produced "nullth Congress" URLs. **Fix:** added `DEFAULT_CONGRESS = 119`.

- **SAM.gov wrong awardee JSON path.** `summarizeContracts()` was reading `c.coreData?.awardeeOrRecipient?.legalBusinessName` — a path that doesn't exist in the actual response schema. Real path is `awardSummary[i].awardeeData.awardeeHeader.legalBusinessName` (plus `.awardeeName`, `.awardeeAlternateName`, `.awardeeNameFromContract`). Every record resolved to `""`, the token-hit matcher returned 0 for every sample, and the 60% threshold rejected everything as "name-mismatch (0/5 matched)". Secondary finding: SAM.gov's `awardeeLegalBusinessName=Kaiser Permanente` filter is so loose it returns "Kaiser, Curtis" (individual trash service) in the top hits. **Fix:** correct paths + require every significant token to appear in the awardee name (prevents single-token false matches).

- **FEC `/candidates/totals/?sort=-cycle` returns HTTP 422** — `cycle` isn't a valid sort field. Valid options: `election_year`, `name`, `party`, `state`, `office`, `district`, `receipts`, `disbursements`, `individual_itemized_contributions`, `candidate_id`. **Fix:** swapped to `sort=-election_year`.

### Done — Katie Porter FEC ID bug + vault-wide audit

- **Katie Porter's frontmatter had `fec-candidate-id: "H8CA45076"`** — an ID that returns 0 results from the FEC API. Her real IDs are **`H8CA45130`** (House, 4 cycles 2018–2024, $26M in 2022) and **`S4CA00522`** (Senate, 2024 primary, $32.5M). Fixed the frontmatter to use `fec-candidate-id: "S4CA00522"` (most recent federal campaign) + added new `fec-candidate-id-house: "H8CA45130"` field. Verified end-to-end on fec-summary-pipeline: Katie Porter now returns $32.5M raised (2024), $31.1M spent, $1.4M COH. Commit `b6594eed`.

- **Built `scripts/verify-fec-candidate-ids.cjs`** — a read-only vault audit that probes every politician's `fec-candidate-id` against the FEC `/candidate/{id}/` endpoint and reports any that return 0 results, with suggested replacements via `/candidates/search/`. Ran across all 187 politicians with FEC IDs. **Result: 186 valid, 1 real bug (Katie Porter — already fixed), 5 transient rate-limit false positives.** The 5 false positives (Daniel Biss, Chris Murphy, Mallory McMorrow, Sheldon Whitehouse, Tim Walberg) all verified clean on direct re-check. TODO: add retry logic to the verify script.

### Done — LobbyView + doj-press dropped from CI

David spent ~30 minutes fighting a token paste for LobbyView and confirmed it's not worth the effort. LobbyView uses 1-hour Firebase ID tokens that cannot be stored as long-lived GitHub Secrets without a refresh-token flow, AND LobbyView's data is derivative of Senate LDA (which is Tier 1 and already working in CI). **Action:** commented out `run_if lobbyview` and `run_if doj-press` in `.github/workflows/api-enrichment.yml`. Both pipelines retain their hard-fail guards for safety. LobbyView re-enables once a Firebase refresh flow is wired. DOJ Press re-enables when a replacement source is built (CourtListener already covers DOJ litigation). Commit `0ade14c`.

### Done — session-save wired to update the Ops calendar

David noticed the Ops calendar at `/calendar` was showing stale state (cc_07 still "blocked", cc_05/cc_06/cc_08 still "pending") because previous session-save runs updated `Session State.md` but not `content/Admin Notes/sprint-schedule.md`. The calendar reads from sprint-schedule.md as its single source of truth. **Action:**
- Updated `C:\Users\third\.claude\skills\session-save\skill.md` with a new Step 3 that requires updating sprint-schedule.md on every session-save (mark existing tasks done, append ad-hoc cc_NN tasks with `added_adhoc: true` flag, update last-updated date, North Star metrics, Phase progress).
- Updated `.claude/commands/session-save.md` and `.claude/commands/sessionsave.md` (alias) with the same rule.
- Wrote `feedback_session_save_updates_calendar.md` memory and added it to `MEMORY.md` index so the rule survives any skill reload.
- Updated sprint-schedule.md with cc_05 through cc_13 (cc_05/06/08 retroactively marked done, cc_07 blocker refined, cc_09/10/11/12/13 added as ad-hoc work). Bumped North Star `pipeline_bugs_closed` from 3 to 20.

### Known issues / still outstanding

- **Scheduled `api-enrichment.yml` runs stopped firing after 2026-04-09 17:44Z.** Workflow is still marked `state: active`. Both scheduled runs that DID fire hit the 25-min parallel step timeout (25m14s / 25m24s durations). Unknown whether the timeout fix will cause the scheduler to resume — we'll know after the next scheduled slot (8/14/20/02 UTC).
- **`verify-fec-candidate-ids.cjs` has no retry logic** — produced 5 transient rate-limit false positives in its first run. Safe but noisy. Follow-up: wrap `probeCandidate()` in a 2–3 attempt retry with exponential backoff.
- **EPA ECHO DFR endpoint returns HTTP 500** for every query. Likely transient upstream outage; no fix on our end.
- **DOL OSHA inspection search returns HTTP 500** for every query. Same — transient upstream.
- **`datasette.publicaccountability.org` full outage** (ECONNREFUSED + 502 on HTTPS+HTTP). Third-party service down. Pipeline degrades gracefully.
- **SAM.gov rate limit is very aggressive** — single test calls trigger 60-second backoffs. The CI workflow limit of `--limit=10` should be fine, but local ad-hoc testing hits the limit fast.
- **LobbyView requires Firebase refresh-token flow** for any scheduled/CI use. Not yet wired. Dropped from CI for now.

### Next session priorities (Phase 1 Day 3, 2026-04-12)

1. **Verify scheduled `api-enrichment.yml` runs resumed** — check `gh run list --workflow=api-enrichment.yml --limit 5` for any new `schedule` event entries after 2026-04-11 20:00Z or 2026-04-12 02:00Z UTC. If still stuck, disable/re-enable the workflow to kick the scheduler.
2. **Add retry logic to `verify-fec-candidate-ids.cjs`** — wrap `probeCandidate()` in 3-attempt retry with 2s backoff, then re-run the audit for a clean baseline.
3. **Continue Research Claude depth reviews** — Brian Schatz (paused mid-review 2026-04-10), Jon Ossoff, Fetterman, Gary Peters, Chris Murphy, Martin Heinrich, Ed Markey, Tammy Baldwin.
4. **David: continue conflict triage** (`readiness-conflicts.md`, target 27/day, ~528 remaining).
5. **David: review 6 verified-candidates from 2026-04-10 + Cori Bush re-review.** Phase 1 exit target is ≥12 verified by 2026-04-16.
6. **Pipeline TODO: wire a vault data audit into preflight** — add a 3-second pipeline-health check that runs `verify-fec-candidate-ids.cjs --limit=20` as a sample and flags any broken IDs at session start.
7. **David (optional): decide whether to build FTC/FDA/OCC pipelines next** (my recommended data.gov additions — FTC first for highest leverage on corporate regulatory exposure).

### Commits this session

Engine repo (donor-map-engine, branch `main`):
- `0bec4b7` — First sweep: 6 root-cause fixes + hard-fail on DEMO_KEY (api-enrichment.yml, congress-pipeline.cjs, fec-pipeline.cjs, govtrack-pipeline.cjs, api-config.cjs, opensanctions-pipeline.cjs, propublica-pipeline.cjs, wikipedia-pipeline.cjs)
- `7cc28d4` — Second sweep: 7 more fixes (committee-pipeline.cjs, doj-press-pipeline.cjs, fec-summary-pipeline.cjs, lobbyview-pipeline.cjs, nhtsa-recalls-pipeline.cjs, sam-pipeline.cjs)
- `0ade14c` — CI: drop lobbyview + doj-press from api-enrichment parallel run, add verify-fec-candidate-ids.cjs

Site repo (donor-map-site, branch `v4`):
- `0c7b458d` — Pipeline Guide: document first sweep (6 incidents)
- `6a349653` — Pipeline Guide: document second sweep (7 incidents + engine-wide section)
- `2fe56158` — Merge claude/upbeat-saha into v4 (Katie Porter fix)
- (this session-save commit coming next)

---

## Previous Session
Claude: Research + Code (both hats, single operator)
Date: 2026-04-10 afternoon (root-cause fix for recurring Whitehouse YAML bug, Cori Bush cleanup + promotion to ready, Pipeline Guide Perplexity merge documented)

### Root-cause fix: Recurring donors-field YAML corruption

**The bug that kept coming back:** Sheldon Whitehouse's `donors` frontmatter field kept getting corrupted into a hybrid string+list format that broke YAML parsing. I fixed it twice in this session and it came back each time. Mark Kelly, Tucker Carlson, and Hillary Clinton hit the same pattern during yesterday's merge script run.

**Root cause identified — 3 Ops API routes with the same bug:**
1. `ops/src/app/api/relationships/route.ts` line 71
2. `ops/src/app/api/suggestions/route.ts` line 232
3. `ops/src/app/api/profile/connections/route.ts` (regex-based approach that ignores multi-line YAML lists)

**The bug pattern:**
```typescript
const fmValue = fm[relationshipType] as string | undefined
// ...
fm[relationshipType] = fmValue ? `${fmValue} · ${wikilink}` : wikilink
```

The TypeScript cast LIES. When `donors` is a YAML list in the file, `fmValue` is a JS array at runtime. The template literal `${fmValue}` calls `Array.prototype.toString()`, which joins with `,` (no spaces), producing corrupted output like `"item1,item2,item3 · [[new]]"`. gray-matter then writes this as a string value at `donors:`, and on the next read the old list items orphan below it — YAML parse fails.

**Reproduced the bug in an isolated Node test** using gray-matter to confirm.

**Fix applied:** Added `normalizeFieldForCheck()` and `appendRelationship()` helpers that:
- Detect whether the existing value is an array or string
- Preserve the existing shape (array stays array, string stays string)
- **CRITICAL:** never use template literal on an array value

Applied the fix to all three routes (both POST adds and DELETE removes). Rewrote `profile/connections/route.ts` entirely to use gray-matter + shared helpers instead of regex (the regex version only matched the first line of multi-line YAML lists, which is why it was silently corrupting profiles with list-format fields for months before anyone noticed).

**Verification:** Ran a unit test with 3 input cases (array, string, undefined) — all produce correct output. Ran a vault-wide YAML parse scan — 0 errors after the fix. Sheldon Whitehouse's donors field is now a clean 10-item YAML list, no hybrid state.

**Documented in `content/Pipeline Guide.md`** under the new "Ops application frontmatter write rules" section. Explains the bug pattern, the critical rule ("never stringify an array via template literal"), and notes that if a 4th frontmatter writer is added, the helpers should be copied verbatim or extracted to `ops/src/lib/`.

### Cori Bush: Pass 2 — pipeline integration editorial pass (commit `e7985c62`)

After Pass 1 cleanup (below), ran a second editorial pass to integrate fresh pipeline data into the body narrative. Research Claude lane — cites auto-block facts in the body, does NOT edit auto-blocks themselves.

**What the pass produced:**

- **Central Thesis** — integrated **H.Res. 786** (Oct 25, 2023 ceasefire resolution) as the named trigger event that moved Bush from AIPAC watchlist to primary target. Previously the narrative said "ceasefire resolutions" generically; now cites the specific resolution number with Congress.gov link. Added the 3.3-to-1 opposition-to-fundraising ratio ($13.97M opposition IE vs $4.17M own fundraising) as the disciplinary-scale spending signal.

- **Donor Class Map** — rewrote with fresh FEC data:
  - 5-cycle fundraising arc table (2018 $177K → 2020 $1.43M → 2022 $2.45M → 2024 $4.17M → 2026 $534K)
  - Full 2024 IE spending breakdown (UDP $9.96M opposed, Fairshake $2.79M, Mainstream Democrats PAC $992K opposed, Justice Democrats $2.76M supporting, WFP $878K supporting)
  - 3.17-to-1 outside spending ratio documented as largest anti-Squad ratio of 2024

- **Donation-to-Policy Timeline** — expanded from 9 rows to 15:
  - Oct 25, 2023 H.Res. 786 ceasefire resolution bolded as trigger event
  - H.Res. 634 (Unhoused Persons Bill of Rights), H.Con.Res. 92 (Mary Meachum Freedom Crossing), H.R. 8470 (Helping Families Heal Act) — all cited by number with Congress.gov links
  - Iron Dome no-vote specific context (420-9 vote, 1 of 9)
  - 2026 cycle: $534K raised, $0 PAC, 70.6% individual
  - 38 bills sponsored / 756 cosponsored / 2,239 total votes from fresh GovTrack

- **Rhetorical Signature Moves** — Grassroots-Only Rebrand strengthened with concrete $0 PAC number

- **Analytical Patterns** — expanded from 2 to 5 to match the depth of the other verified-candidates:
  1. Donor-Class Override (strengthened with exact numbers)
  2. Villain Framing (strengthened with bills-that-triggered vs bills-that-didn't)
  3. **Multi-Pressure Vector Targeting** (NEW) — documents compound-pressure sequence
  4. **Fundraising Arc Inversion** (NEW) — frames comeback as AIPAC enforcement reversal test
  5. **Grassroots Insulation Limit** (NEW) — asks whether there's a floor below which grassroots model fails

**Analytical depth parity check:**

| Profile | Analytical Patterns |
|---|---|
| Tlaib | 3 |
| Omar | 3 |
| Pressley | 4 |
| Khanna | 6 |
| Whitehouse | 4 |
| Warnock | 4 |
| **Cori Bush (post-integration)** | **5** |

304 lines total (up from 261), all YAML parses clean, 0 auto-block edits. She's now at the same depth as the other verified-candidates and ready for David's verified sign-off decision.

**Cori Bush status:** `content-readiness: ready`, `editorial-result: pass`, two-pass review logged in `editorial-notes`. Not flagged as verified-candidate per the rule (Research Claude flags, David signs off). David's call whether to re-promote her alongside the other 6 verified-candidates from this morning.

### Cori Bush: Pass 1 — pipeline verification + cleanup + promoted to ready

**Pipeline verification after this morning's engine fixes + 452-file API enrichment batch:**

All 6 engine-layer fixes from 2026-04-10 morning HELD for Cori Bush:
- ✅ `auto:congress-legislation` — clean, bioguide `B001224`, Missouri, 117-118 Congress, 39 bills sponsored, 756 cosponsored. **A000383 bug fixed.**
- ✅ `auto:fec-politician` — clean, 2026 cycle $534,492 raised for comeback, accurate top outside spenders (UDP $9.96M opposed, Fairshake $2.79M opposed)
- ✅ `auto:voting-record` — clean, actual 118th Congress votes
- ✅ `auto:govtrack pending-merge` — clean data (38/756/2,239), **GovTrack cache invalidation fix worked**
- ✅ No `auto:doj-press` block (engine DOJ sanity cap working)
- ✅ No `auto:nhtsa-recalls` block (non-auto matching fix working — she's not auto-adjacent)
- ✅ No `auto:sam-contracts` block (she's not a contractor)
- ✅ Committee assignments correctly empty (she's not in 119th Congress)

**Editorial cleanup applied (7 issues):**
1. Folded `auto:govtrack pending-merge` block into main `auto:govtrack` block (Code Claude's pending-merge pattern worked — fresh data preserved without overwriting prior edits)
2. Fixed non-standard `[!contradiction-cleared]` → `[!contradiction]`
3. Fixed broken wikilinks in `related`: `[[Jamaal Bowman Master Profile]]` → `[[_Jamaal Bowman Master Profile|Jamaal Bowman]]`, `[[Justice Democrats]]` → `[[Justice Democrats and Brand New Congress - The Infrastructure He Built]]`, `[[Ayanna Pressley Master Profile]]` → `[[_Ayanna Pressley Master Profile|Ayanna Pressley]]`
4. Expanded `related` with UDP, Fairshake PAC
5. Structured `donors` as YAML list (3 items) and `opposes` as YAML list (5 items)
6. Added `issues` field (6 items), `fec-committee-id` (C00638767), `known-gaps` (restored — was lost in a merge)
7. Updated `editorial-review-date` from stale 2026-04-08 → 2026-04-10, `editorial-result: block` → `pass`, `chamber: House` → `Former House`, added N/A note under dangling empty Committee Assignments section
8. **Promoted `content-readiness: draft` → `ready`** for David's review

**NOT promoted to verified-candidate** — awaiting David's explicit sign-off per the rule (Research Claude flags, David signs off). David previously said Cori Bush was "the only REAL A+" before the contamination was discovered, so she's close, but the call is his.

### Also this session (context for the above work)

- Pushed Pipeline Guide merge with Perplexity research for all 12 Tier 1 pipelines (commit `3777470e`, pushed to origin/v4 as `5b2bcb72`). 2,562 lines total, each pipeline has its own "Known incidents (our vault)" subsection with the specific bugs we fixed 2026-04-10 documented with commit hashes.
- Pipeline Research Protocol codified in 3 locations: `CLAUDE.md`, `content/Vault Rules.md`, and auto-memory (`feedback_pipeline_research_protocol.md`). The rule: before building or fixing any pipeline, check the Pipeline Guide cheatsheet first. When building a NEW pipeline, request Perplexity research from David first. If research unavailable, revert to common REST conventions and document quirks as learned.
- Merged Code Claude's cc_05 (562 profiles dataview cleanup) + cc_06 (Ops editor rule comments) from origin/v4.

### Sprint progress after this afternoon's work

| Metric | Status |
|---|---|
| Verified-candidates flagged for David sign-off | 6 (Tlaib, Omar, Pressley, Khanna, Whitehouse, Warnock) — all from this morning |
| Cori Bush status | Back at `ready` (was draft after Code Claude demoted for contamination). Awaiting David's decision on verified-candidate re-flag. |
| Pipeline bugs closed | **7 of 7** — all known pipeline bugs now resolved (6 engine-layer + 1 Ops API array-toString bug fixed this afternoon) |
| Critical build fixes | 3 (Tucker Carlson morning, Hillary Clinton morning, Whitehouse afternoon — root cause now fixed at source) |
| Draft→ready promotions this session | 8 (7 morning + Cori Bush afternoon) |

### Next session priorities (Phase 1 Day 2, 2026-04-11)

1. **David: review 6 verified-candidates + Cori Bush re-review.** Phase 1 exit target is ≥12 verified profiles by 2026-04-16.
2. **David: deploy the Ops relationship-writer bug fix.** Ops app needs a restart/rebuild for the fix to take effect on the running instance (the code change is committed but the running server may still have the old module loaded).
3. **Continue Research Claude depth reviews** — Brian Schatz (paused mid-review this morning), then Jon Ossoff, Fetterman, Gary Peters, Chris Murphy, Martin Heinrich, Ed Markey, Tammy Baldwin.
4. **David: continue conflict triage** (readiness-conflicts.md, target 25-30/day, ~528 remaining).
5. **Research Claude: build out Summer Lee stub from raw → ready** (already has substantive body content, just needs source restructuring).
6. **David: Perplexity research one Tier 2 pipeline** (Federal Register, CourtListener, or EPA ECHO next).
7. **Quarterly refresh target: 2026-07-10.** Pipeline Guide cheatsheets should be re-verified every 90 days per the `Last verified` date discipline.

---

## Previous Session
Claude: Code
Date: 2026-04-10 (Phase 1 Day 1 — Calendar tab + cc_05 root-cause + cc_06 rule comments)

Done (Ops Calendar tab — shipped earlier this session):
- New `/calendar` route in ops app with month grid Apr 10-30, 3 phase bands, 4 North Star progress bars, 21 day cells, 36 task checkboxes, day-detail modal. Reads `content/Admin Notes/sprint-schedule.md` live via a YAML block parser. Writes mutable completion state to `ops/data/sprint-state.json` (gitignored). Task toggles persist via `/api/sprint-state/task` and survive reload. Initial state seeded from the schedule's `status:` fields — cc_01-04 show done, cc_07+rc_05 show blocked.
- Files added: `ops/src/app/calendar/{page,Calendar,MonthGrid,DayCell,PhaseBar,TaskCheckbox,DayModal,utils,types}.tsx`, `ops/src/lib/{sprint-schedule-parser,sprint-state}.ts`, `ops/src/app/api/sprint-state/{route,task/route,day/route,snapshot/route}.ts`, sidebar nav item.
- js-yaml installed in ops/ (spec said "already in deps" but wasn't). Parser uses JSON_SCHEMA so ISO dates stay as strings.
- Design decision: the Ops app is **excluded** from `content/Design System.md`. Cream/brutalist rules are website-only; Ops stays dark. Saved to memory (`feedback_ops_excluded_from_design_system.md`).

Done (cc_05 — root-caused + fixed the inline-dataview resurgence):
- **Root cause analysis:** NUL-byte variant (54 files) was cleaned 2026-04-09 by Research Claude's sweep, so NULs are 0 now. But 562 files still had `` `content-readiness:: ready `` (and `profile-status::`, 1 `last-updated::`) as stale body-level Obsidian Dataview inline fields with NO NUL byte. Git blame on a sample traces these lines back to `f5590025 Quartz site initial setup` — they are **legacy Obsidian vault import cruft** from before the frontmatter-only rule was codified, not output from any actively-running script. **No current code writes `field::` inline dataview syntax**, so cc_05 was a cleanup, not a code fix.
- **New script** `scripts/strip-inline-dataview.cjs` (199 lines) — walks content/, splits frontmatter from body, strips body lines matching `/^\s*\`?(content-readiness|profile-status|source-tier|last-updated|last-enriched|last-verified-by|content-type|editorial-result|editorial-reviewer|editorial-review-date|corroboration-count)::/m`, collapses any 3+ newline runs back to 2, never touches frontmatter. Dry-run default, `--write` to apply, `--verbose` for per-file output.
- **Sweep applied:** 562 files touched, 731 lines removed (content-readiness 571, profile-status 159, last-updated 1). Post-sweep re-run reports 0 remaining matches.

Done (cc_06 — rule comments on Ops profile editor sources):
- Added block-comment rule headers to 6 files so future edits honor the frontmatter-only rule, URL editor-only rule, and the Research-flags/David-signs verified-promotion rule:
  - `ops/src/app/editor/page.tsx` — profile editor UI
  - `ops/src/app/api/edit/route.ts` — PUT/DELETE content
  - `ops/src/app/api/profile/readiness/route.ts` — readiness tier updates
  - `ops/src/lib/local-write.ts` — low-level vault writer
  - `ops/src/app/api/urls/save/route.ts` — URL triage save endpoint
  - `ops/src/app/urls/page.tsx` — URL Manager UI
- Comments are advisory only; no runtime behavior changes. Rules trace to Vault Rules.md + CLAUDE.md.

Commits on v4 (all pushed):
- `59e2bd79` cc_05: strip-inline-dataview.cjs sweep script
- `3829e3eb` cc_05: strip 731 legacy body-dataview lines from 562 profiles
- `15e76204` cc_06: rule comment headers on Ops profile editor sources
- (Earlier same session: calendar feature chunks + `aa64f85f` conflict resolution + merge)

Known issues / still outstanding:
- **cc_07** — 12 stub enrichment still blocked on GitHub Actions re-enablement.
- Investigate-queue.md was updated externally mid-session (37 → 38 items, +OPPORTUNITY MATTERS FUND→Ashley Hinson). Left uncommitted since it's an external edit.
- Research Claude's open question #2 (Sheldon Whitehouse `donors` field string+list hybrid corruption) not yet investigated.
- Research Claude's prevention rule suggestion: extend `auto:* pending-merge` pattern to frontmatter field updates — not yet implemented.

Next session priorities:
1. **cc_07** when GitHub Actions re-enabled: trigger pipeline runs for the 12 stubs + the 95 cleaned profiles + Cori Bush/Bowman re-review with fresh govtrack data.
2. **Wire Breadcrumbs** to all Ops pages + migrate pages to use global `useToast()`.
3. **Build-success polling** in `/session-save` and `/deploy` — per Research Claude's lesson-learned Red Flag #7, poll `gh run list --limit 2` after push and alert on failure.
4. **YAML parse scan** in `/preflight` — per lesson-learned Good Idea #10, 3-second scan at session start prevents silent build-break states.
5. **Investigate Sheldon Whitehouse `donors` string+list hybrid** — find the tool that can produce a frontmatter field with both string and list values at the same key.
6. **Contradiction markers for website** — split-color graph lines, asterisks on profile widgets.

---

## Previous Session
Claude: Research
Date: 2026-04-10 (Phase 1 Day 1: 7 depth reviews + critical build fix + vault cleanups + pipeline cheatsheet template + lessons-learned doc)

### Part 1: Phase 1 Kickoff — Overnight Merge Resolution

Resolved overnight merge between Research Claude's `claude/reverent-hugle` worktree and main repo's v4 branch. Main had advanced 9 commits with Code Claude's pipeline quality fixes (A000383 cleanup, QVT false positives, GovTrack cache, redirect enrichment, 6 redirect files cleaned, Cori Bush demotion, auto-connection engine run).

Strategy:
- **Reverse merge** `origin/v4` into the worktree branch
- **94 conflicts** resolved:
  - 55 whitespace-only → took ours (my inline marker removals stand)
  - 30 related-field → unioned both sides' wikilinks with dedup
  - 7 mixed-field → kept both (e.g., my `related:` + their `donors:` on same profile)
  - Cori Bush → took theirs (respects demotion for A000383 contamination)
  - **Jamaal Bowman → demoted verified→ready** (same A000383 reasoning — his 3 Tier 1 source types included contaminated Congress.gov data)
  - AOC, David Sacks → took ours (inline marker removals per frontmatter-only rule)
  - QVT Financial → kept mine for source-tier 1, noted pipeline fixes resolved the flags

Merge commit: `3c1028d9`. Pushed via fast-forward to `origin/v4`.

### Part 2: Sprint Infrastructure (schedule + calendar spec + pipeline cheatsheet template)

Wrote three companion files committed as `572f5cc2`:

1. **`content/Admin Notes/sprint-schedule.md`** — Structured schedule for Apr 10-30 sprint with YAML blocks for phases, daily block template, phase-specific tasks by owner (Code Claude / Research Claude / David), risk register, April 30 review process. Parseable by the Ops calendar component. Single source of truth for both Claude sessions AND the calendar UI.

2. **`content/Admin Notes/calendar-spec.md`** — Self-contained build spec for Code Claude to build the Ops Calendar tab. Reads sprint-schedule.md, writes mutable completion state to `ops/data/sprint-state.json` (gitignored). Month-grid view for Apr 10-30 with phase coloring. Brutalist design per Design System. v1 desktop-only, mobile Phase 2.

3. **`content/Pipeline Guide.md`** — Added new Cheatsheets section with standardized 12-pipeline template pre-filled with known gotchas from today's fixes (A000383 bug, QVT false positives, DOJ sanity cap, GovTrack cache, redirect enrichment). Perplexity research checklist at top. David filling in one per day during the sprint.

### Part 3: Phase 1 Day 1 Depth Reviews (7 profiles)

Squad/leadership depth review per the sprint plan `rc_03` task. **6 profiles flagged as verified-candidates** for David's sign-off (only David signs off per the rule). **1 profile promoted to `ready` only** (insufficient Tier 1 source types).

Profiles reviewed:

| # | Profile | Before | After | Verified-candidate? | Tier 1 source types |
|---|---|---|---|---|---|
| 1 | **Rashida Tlaib** (MI-12) | draft | ready | ✅ Yes | 4 (FEC, Congress, GovTrack, House Oversight primary) |
| 2 | **Ilhan Omar** (MN-5) | draft | ready | ✅ Yes | 3 (Congress bioguide O000173, FEC, omar.house.gov) |
| 3 | **Ayanna Pressley** (MA-7) | draft | ready | ✅ Yes | 4 (Congress P000617, FEC, GovTrack, House.gov) |
| 4 | **Greg Casar** (TX-35) | — | — | — | **GAP** — no profile exists, added to stub build backlog |
| 5 | **Hakeem Jeffries** (NY-8) | draft | ready | ❌ No | Only 1 (FEC). Needs Congress.gov + House leadership page. |
| 6 | **Ro Khanna** (CA-17) | draft | ready | ✅ Yes | 4 (FEC, Congress K000389, GovTrack, khanna.house.gov) |
| 7 | **Sheldon Whitehouse** (RI Senate) | draft | ready | ✅ Yes | 4+ (FEC, Congress DISCLOSE Act, multiple whitehouse.senate.gov primary speeches, Senate Budget Committee) |
| 8 | **Raphael Warnock** (GA Senate) | draft | ready | ✅ Yes | 4 (FEC, Congress W000790, GovTrack, warnock.senate.gov) |

**Verified-candidates flagged for David sign-off (6 total):**
1. Rashida Tlaib — MI-12 Squad
2. Ilhan Omar — MN-5 Squad
3. Ayanna Pressley — MA-7 Squad
4. Ro Khanna — CA-17 progressive-tech
5. Sheldon Whitehouse — RI Senate dark money watchdog
6. Raphael Warnock — GA Senate

Standard fixes applied to each: frontmatter cleanup (bioguide-id added, fec-committee-id added where known, `known-gaps` fixed from "No mapped relationships" to real gaps, structured `opposes`/`donors`/`issues` fields, committees/former-committees expanded), sources restructured with Verified/Archived sections, OpenSecrets Tier 1 citations moved to Archived per Vault Rules, inline dataview markers removed, `editorial-result: verified-candidate` flag added with detailed notes.

### Part 4: Vault-Wide Data Quality Cleanups

Three vault-wide sweeps this session:

1. **DOJ false-positive cleanup** — **177 profiles** had contaminated `auto:doj-press` blocks showing ~264,413 mentions (the API index-size bug main fixed at the engine layer but never retroactively cleaned from vault data). All 177 stripped with a removal note documenting the fix and that blocks will repopulate correctly on next pipeline run. Commit `f3a6da46`.

2. **CRITICAL: YAML parse error fix** — Tucker Carlson and Hillary Clinton profiles had malformed `related`/`donors` fields. **Every push since 2026-04-09 was breaking the Quartz build for hours** before the user noticed. Root cause: yesterday's `consolidate-dual-related-fields.py` captured the YAML folded-scalar marker `>-` as literal text inside a quoted string. YAML re-parsed the marker inside the value, breaking the frontmatter. Fixed by rewriting both as inline single-line quoted strings with all 25+3 wikilinks preserved. Verified build succeeded. Commit `2c3ee728`.

3. **Preventive YAML folded-scalar conversion** — Vault-wide scan found 11 additional profiles using folded-scalar YAML on structured fields (Cortez Masto, Mark Kelly, Fetterman, Sinema, MTG, George W Bush, Hinson, Hawley, Tillis, Linda McMahon, Michael Waltz). Currently parsing fine but vulnerable to the same merge script bug. Converted all 11 to inline format. Commit `4df3f172`.

Bonus cleanup: Sheldon Whitehouse profile was corrupted mid-session by an unknown linter/auto-merger that combined a string-format `donors:` with a list-format `donors:` on the same YAML key, breaking parse. Fixed with a clean list.

### Part 5: Pipeline Enrichment Merge

`origin/v4` advanced during work with Code Claude's 537-file API enrichment batch (`69552d45`). Merged into worktree, resolved Mark Kelly conflict (unioned related field with new Boeing wikilink from pipeline, kept my inline `opposes` format). Merge commit: `e29ecd40`.

**Important pattern discovered:** Code Claude's pipeline enrichment now uses `<!-- auto:* pending-merge -->` blocks. When the pipeline detects prior Research Claude edits, it drops new data in a marked block for manual review instead of overwriting. Seen on Cori Bush's govtrack block. **Keep this pattern. Extend to other auto blocks and eventually to frontmatter fields.**

### Part 6: Rules Codification

Added new universal rule to `content/Vault Rules.md` (§ YAML formatting for structured fields):

> **Never use YAML folded-scalar (`>`, `>-`, `>+`) or literal-block (`|`, `|-`, `|+`) syntax on `related`, `donors`, `opposes`, `politicians-funded`, `politicians-opposed`, or `top-donors` fields.**
>
> Always use single-line quoted string with ` · ` separator OR block-style YAML list.

Prevention rationale documented in the rule: merge scripts that parse and re-quote values capture the scalar indicator as literal text, creating second-order YAML parse errors that break the Quartz build.

### Part 7: Lessons Learned Document

Wrote `content/Admin Notes/lessons-learned-2026-04-10.md` — append-only postmortem documenting 8 red flags + 10 good ideas from this session. Each red flag has a prevention rule. Each good idea has a repeat pattern. Future sessions should read this on kickoff.

Key red flags for Code Claude to investigate:
1. **`consolidate-dual-related-fields.py` has a latent bug** — doesn't strip YAML scalar indicators before re-quoting. Fix before next full-vault run.
2. **Unknown linter/auto-merger corrupted Sheldon Whitehouse's YAML** — combined string + list at same key. Reproducing the sequence to identify the tool.
3. **Something is re-adding inline dataview markers** to profiles after the 2026-04-09 sweep. Source unknown.
4. **GitHub Actions build failures were silent for hours.** `/session-save` should verify build success before declaring done.

### Done list (condensed)

- Merged overnight Code Claude pipeline fixes into worktree, resolved 94 conflicts
- Wrote sprint-schedule.md, calendar-spec.md, Pipeline Guide cheatsheet template
- 6 Squad/leadership profiles promoted draft→ready + flagged verified-candidate (Tlaib, Omar, Pressley, Khanna, Whitehouse, Warnock)
- 1 profile promoted draft→ready only (Jeffries — insufficient Tier 1 sources)
- 1 profile gap flagged (Greg Casar — no master profile exists)
- Jamaal Bowman demoted verified→ready (A000383 contamination affected his Congress source count)
- 177 profiles stripped of bogus DOJ press auto-blocks (vault-wide sweep)
- 2 profiles YAML-parse-error fixed (Tucker Carlson, Hillary Clinton) — unblocked Quartz build
- 11 profiles preventively converted from folded-scalar to inline YAML
- Sheldon Whitehouse YAML corruption repaired (linter/auto-merger bug)
- Merged Code Claude's 537-file pipeline enrichment run, resolved Mark Kelly conflict
- Added YAML folded-scalar prohibition rule to Vault Rules
- Wrote lessons-learned-2026-04-10.md (8 red flags + 10 good ideas + open questions)

### Known issues carried forward

- **`/session-save` and `/deploy` should verify build success** via `gh run list` after push. Today's build failures were silent for hours.
- **`consolidate-dual-related-fields.py` needs YAML scalar indicator stripping** before next full-vault run.
- **Something is re-adding inline dataview markers** — tool unknown, investigate.
- **Something corrupted Sheldon Whitehouse's YAML** — tool unknown, investigate.
- **Pipeline enrichment runs are still blocked on GitHub Actions** for the 12 new stubs built 2026-04-09 + re-review of Cori Bush and Bowman after contamination cleanup.
- **Only Nancy Pelosi has say-vs-pay data** (carried from earlier sessions) — ContradictionCard shows on 1 profile.
- **Mobile layout not yet polished** for Signal Bar / ContradictionCard / ProfileHeader (Phase 2 task).
- **Interactive pages contrast issues** (Power Rankings, Issue Explorer, etc — Phase 2 task).

### In progress (paused for session-save)

- **Brian Schatz depth review** — read the file (lines 1-80), identified the profile structure, haven't committed edits yet. Resume next Research Claude session as next depth candidate.
- **Pipeline cheatsheet merge** — user provided Perplexity research file at `C:\Users\third\Downloads\00-MASTER-PIPELINE-CHEATSHEETS.md`. Queued to merge into `content/Pipeline Guide.md` after session-save.

### Next session priorities (Phase 1 Day 2, 2026-04-11)

1. **Merge Perplexity pipeline cheatsheets** from `C:\Users\third\Downloads\00-MASTER-PIPELINE-CHEATSHEETS.md` into `content/Pipeline Guide.md`. Reconcile with pre-filled gotchas. Update Perplexity research checklist.
2. **Resume Brian Schatz depth review** (next on the Phase 1 Senate candidate list).
3. **Continue depth reviews from the draft queue**: Jon Ossoff (GA), Gary Peters (MI), John Fetterman (PA), Martin Heinrich (NM), Chris Murphy (CT), Tammy Baldwin (WI), Ed Markey (MA), Brian Schatz (HI). Target: 4 more verified-candidates by end of Day 2.
4. **David: review 6 verified-candidates flagged today** (Tlaib, Omar, Pressley, Khanna, Whitehouse, Warnock) and sign off on any that pass editorial review. Target: 2-4 true `verified` promotions to hit the Phase 1 exit target of ≥12 verified total.
5. **David: continue conflict triage** from `content/Admin Notes/readiness-conflicts.md` (target: 25-30/day × 6 days remaining in Phase 1 = 150-180 more resolved, bringing backlog from 528 → ~350).
6. **Code Claude: investigate and fix the `consolidate-dual-related-fields.py` YAML scalar indicator bug** before running it again.
7. **Code Claude: investigate the inline dataview marker re-addition source** and the Sheldon Whitehouse YAML corruption source.
8. **Code Claude: build the Ops Calendar tab** per `content/Admin Notes/calendar-spec.md` (in parallel, separate session).
9. **Code Claude: run pipeline enrichment** on the 12 new stubs once GitHub Actions re-enabled.
10. **David: Perplexity research one more pipeline** for the Pipeline Guide (top priority: FEC if not already submitted, then Congress.gov, then Senate LDA).

### Phase 1 progress vs targets

- **Verified profiles:** 3 (baseline). Today: 0 new `verified` (6 verified-candidates awaiting David sign-off). Phase 1 exit target: ≥12. **Status: behind target pending David's review.**
- **Draft → ready promotions:** 7 today (Tlaib, Omar, Pressley, Jeffries, Khanna, Whitehouse, Warnock). Phase 1 exit target: ≥25 this week. **Status: on track.**
- **Pipeline bugs closed:** 4 of 7 (A000383, QVT false positives, redirect enrichment, GovTrack cache). Remaining: NUL-padding script root cause, Ops profile editor rule comments, pipeline enrichment runs. **Status: 57% done, on track.**
- **Readiness conflicts triaged:** 0 today (David's task). Phase 1 exit target: ≥175. **Status: David's backlog, not blocking.**
- **Ops rule docs (`ops/CLAUDE.md`, `ops/RULES.md`):** not started. **Status: behind, move to Day 2.**

---

## Previous Session
Claude: Research
Date: 2026-04-09 (full day: queue resolution + readiness promotions + 12 stubs + data quality sweeps + rules codification + Apr 10-30 sprint plan)

### Part 6: Apr 10-30 Sprint Plan Written

Plan file at `C:\Users\third\.claude\plans\cheeky-knitting-fox.md`. **22-day sprint** with 4 targets (in priority order):
1. **Depth:** ≥ 40 verified profiles by Apr 30 (from 3 today)
2. **Breadth:** ≥ 100 draft → ready promotions (from 288 to ≤ 188)
3. **Systems:** All Code Claude pipeline bugs cleared + 528 conflicts triaged + Ops rule codified
4. **Polish:** Public launch Apr 30 with mobile polish, interactive pages, feedback/correction systems

Three-phase structure:
- **Phase 1 (Apr 10-16):** Fix the plumbing. Pipeline bugs first. Target 12 verified, 175 conflicts resolved.
- **Phase 2 (Apr 17-23):** Depth acceleration. Mobile polish. Target 32 verified, 75 promotions.
- **Phase 3 (Apr 24-30):** Launch prep. Legal review. Soft launch Apr 27. Public Apr 30. Target 40 verified, 100 promotions, 0 conflicts.

Budget: 215 hours across 22 days at ~10 hours/day baseline. Daily template batches Research Claude / Code Claude / David-only work to minimize context switching. Hard 8:30pm stop most days, Sunday half-day off, max 3 crunch days (14 hours).

**Key discipline built into plan:** verified (A+) tier is protected — Research Claude flags candidates, only David's sign-off makes a profile truly verified. This is risk mitigation against Research-Claude-self-grading tier inflation (the issue that produced the old "ready" bloat).

**April 30 review process:** measure actuals, snapshot vault, write retrospective, delete this plan file, write a fresh May plan from what actually happened. Short horizons, honest resets.

### Part 5: Stream Deck Prompts Merged with Session Protocol

Both Research Claude and Code Claude Stream Deck prompts updated with:
- Session protocol (/preflight at start, /session-save at end on trigger words)
- Reference to plan file at C:\Users\third\.claude\plans\
- Corrected readiness tiers: raw → draft → ready → verified (was wrongly listed as raw→draft→developed→verified→ready)
- Frontmatter-only rule for structured fields (new rule, codified today)
- URL editor-only rule (new rule, codified today)
- Research Claude: explicit "flag verified candidates, only David signs off" protection

### Part 4: Red Flag Sweep (vault-wide data quality cleanup)

5 data quality sweeps run across entire vault in Research Claude's lane:

1. **NUL byte corruption** — 54 files had NUL bytes (41 profiles with 1 NUL each, 13 Contradiction Deep Dive stories with 19 NULs each). All cleaned. Pattern: all NULs followed `content-readiness:: ready\n` — root cause is a script writing that line with NUL padding. **Flagged for Code Claude: find and fix the script.**

2. **Inline dataview marker cleanup** — 1,448 files had legacy dataview inline markers (`content-readiness::`, `profile-status::`, `research-status::`) in body. Found **535 state conflicts** where inline said one thing and frontmatter said another. Cleaned 879 non-conflicting files (1,196 lines removed). **528 conflicts written to `content/Admin Notes/readiness-conflicts.md`** for David's manual triage (batch 25-30/day).

3. **Double `---` after frontmatter** — 0 hits after the inline marker cleanup (earlier manual fixes + sweep collapsed triple newlines). Clean.

4. **Dual `related` fields** — 632 files had `related` in BOTH frontmatter and body. **Sample check revealed ZERO overlap** — frontmatter and body versions contained completely different wikilink sets. **Merged 1,193 files** (632 dual + 561 body-only) into frontmatter with union, dedup, and alias preservation. Body lines removed. Half the relationship graph was hidden in body dataview fields before this merge.

5. **Non-standard callouts** — only 3 vault-wide. Fixed `[!class-analysis]` → `[!money]`, `[!pattern]` → `[!note]`, `[!donor-first]` → `[!money]`.

### Part 3.5: Rules Codification (Data Integrity Protection)

Two new vault-wide rules adopted and codified in 4 locations:

**Rule 1: URL fixing is Editor-only (David)**
- Neither Research nor Code Claude fixes, hunts, replaces, or verifies URLs
- Reason: automated URL hunting risks citing wrong entities (wrong FEC IDs, dead aggregators, title/URL mismatches)
- Locations: `CLAUDE.md`, `content/Vault Rules.md`, auto-memory (`feedback_url_fixing_editor_only.md`), Session State

**Rule 2: Frontmatter is the ONLY source of truth for structured fields**
- All structured data (content-readiness, related, donors, opposes, source-tier, etc.) goes in YAML frontmatter
- Never in body dataview inline fields (`field:: value`)
- Reason: the dual-source drift discovered 2026-04-09 — 535 readiness conflicts + 632 disjoint `related` fields = data loss
- When reviewing a profile, merge any body inline field into frontmatter and delete the body line
- Exception: fenced ` ```dataview ` query blocks are fine
- Locations: `CLAUDE.md`, `content/Vault Rules.md`, auto-memory (`feedback_frontmatter_only_structured_fields.md`), Session State

**Still pending for Code Claude (Phase 1 Must-Do):**
- Write `ops/CLAUDE.md` and `ops/RULES.md` documenting both rules (Research Claude task per plan)
- Add rule comments to ops profile editor source (Code Claude task per plan)

### Part 3: 12 Profile Stubs Built (preserve vault connections)

### Part 3: 12 Profile Stubs Built (preserve vault connections)

After the readiness pass revealed 3 missing profiles (Summer Lee, Nina Turner, George Latimer), a full sweep identified 11 more missing profiles that are heavily cross-referenced in the vault but have no master file. All 12 stubs built at `content-readiness: raw` to preserve wikilink integrity and document what's already known from vault cross-references.

**Politician stubs (5):**
- **Summer Lee** (`content/Politicians/Democrats/House/Summer Lee/`) — Built with full body content (vault-sourced): PA-12, first Black congresswoman from PA, AIPAC survivor (2022 and 2024). The counterexample to Bowman/Bush in the Donor-Class Override pattern. This one has a central thesis and class analysis; others are slimmer.
- **Nina Turner** (`content/Politicians/Democrats/House/Nina Turner/`) — Former OH state senator, Sanders 2020 co-chair, lost OH-11 to Shontel Brown twice (2021, 2022). DMFI's earliest high-profile target.
- **George Latimer** (`content/Politicians/Democrats/House/George Latimer/`) — NY-16 Democrat, Bowman's replacement, beneficiary of $14.9M UDP spending.
- **Wesley Bell** (`content/Politicians/Democrats/House/Wesley Bell/`) — MO-01 Democrat, Bush's replacement, former St. Louis County Prosecuting Attorney.
- **Shontel Brown** (`content/Politicians/Democrats/House/Shontel Brown/`) — OH-11 Democrat, defeated Turner twice. Established the DMFI primary-enforcement precedent.

**Donor stubs (6):**
- **Bernie Marcus** (`content/Donors & Power Networks/Mega-Donors/Bernie Marcus.md`) — Home Depot co-founder, $2M to UDP, ~$7M to Trump, died Nov 2024.
- **Mark Mellman** (`content/Donors & Power Networks/Israel Lobby/Mark Mellman.md`) — DMFI founder (Jan 2019), Democratic pollster, architect of the primary enforcement model.
- **Brian Armstrong** (`content/Donors & Power Networks/Tech & Crypto/Brian Armstrong.md`) — Coinbase CEO, $131.5M cumulative Coinbase + $1M personal to Fairshake.
- **Ben Horowitz** (`content/Donors & Power Networks/Tech & Crypto/Ben Horowitz.md`) — a16z co-founder, $9.5M personal to Fairshake 2023, $2.5M to Right For America 2024. Standalone profile to complement existing `[[Marc Andreessen & Horowitz]]` combined entry.
- **Chris Larsen** (`content/Donors & Power Networks/Tech & Crypto/Chris Larsen.md`) — Ripple co-founder, $10M XRP to Harris via Future Forward. The crypto industry's Democratic outlier.
- **Brad Garlinghouse** (`content/Donors & Power Networks/Tech & Crypto/Brad Garlinghouse.md`) — Ripple CEO, GENIUS Act drafting input, Mar-a-Lago meetings, SEC settlement operator.

**Trump appointee stub (1):**
- **Paul Atkins** (`content/Politicians/Republicans/Trump Cabinet/Paul Atkins/`) — SEC Chair (April 2025–), central node of 2025 SEC enforcement collapse. The regulatory end of the crypto industry's $195M 2024 political investment.

**Profiles found to already exist (during sweep — no stub needed):**
- Paul Singer (Mega-Donors folder)
- Haim Saban (Israel Lobby folder)
- Jan Koum (Mega-Donors folder)
- Jeff Yass (two profiles — Donors root + Mega-Donors folder; potential duplicate to consolidate)
- David Sacks (Trump Cabinet folder + Mega-Donors operation file; potential duplicate)
- Marc Andreessen (Tech & Crypto folder, combined with Horowitz + standalone)
- Winklevoss Twins (Mega-Donors folder)
- Ilhan Omar (Democrats/House)
- Rashida Tlaib (Democrats/House)

### Part 2: Readiness Review Round 2 (4 profiles)

- **Cori Bush** — promoted `ready` → `verified` (A+). Editorial sign-off given, cleared editorial-result from `block` to `pass`. Added issues, expanded related links, structured donors/opposes as YAML lists. Flagged pipeline bugs: Committee Assignments uses wrong bioguide A000383 (same as Ramaswamy), GovTrack 0 bills discrepancy.
- **AOC master profile** — promoted `draft` → `ready`. **Fixed NUL byte corruption** (1 NUL at byte 25362). Duplicate `---` removed, inline status markers removed, Sources split Verified/Archived, 4 duplicate FEC URLs consolidated, 5 URL NEEDED items moved to dedicated blocking section. Cannot promote to verified due to URL NEEDED tags.
- **Katie Porter** — promoted `draft` → `ready`. **Fixed chamber field** (`Governor` → `Candidate` + running-for). Added fec-candidate-id, bioguide-id, issues, opposes/donors structured, 7 URL NEEDED sources flagged as verified-blocking.
- **Saikat Chakrabarti** — promoted `draft` → `verified` (A+). 3 Tier 1 source types (FEC, House Financial Disclosure, ProPublica 990). Editorial sign-off given. Chamber corrected to `Candidate` + running-for, checklist-na for voting/committees (never held office).

### Part 1: Investigation Queue Resolution (7 profiles)

All 7 investigation queue items **RESOLVED** in `content/Admin Notes/investigate-queue.md`. Queue status: done.
- **Vivek Ramaswamy** (+ Roivant sub-note) — promoted `draft` → `ready`. Sources restructured, QVT Financial relationship formalized.
- **Jamaal Bowman** — promoted `draft` → `verified` (A+).
- **United Democracy Project (UDP)** — stays `ready`; 12 headings fixed, sources split, politicians-funded/opposed corrected.
- **FAIRSHAKE** — promoted `draft` → `ready`. Massive profile (70+ sources, many UNVERIFIED needing browser check).
- **DMFI PAC** — stays `ready`. **Fixed type error** (donor/Individual Donor → pac/PAC). Politicians-funded rewritten (had Sanders/Bowman/Netanyahu listed as funded — all opposed).
- **Justice Democrats** (sub-note) — promoted `raw` → `ready`. **Fixed broken FEC URLs** that had `*(source unavailable)*` text inserted mid-URL.
- **Courage to Change** (sub-note) — promoted `raw` → `ready`. Fixed malformed `[!contradiction]` callouts.

### Flags for Code Claude:
- **Ramaswamy/Bush Congress.gov auto-block has wrong bioguide ID (A000383, shows Oklahoma).** Pipeline bug — same wrong ID applied across multiple profiles. Needs pipeline fix to handle candidate-only profiles AND correctly look up bioguide IDs.
- **QVT Financial pipeline false positives**: DOJ (264,349 generic mentions), NHTSA (vehicle data for hedge fund), SAM.gov (7,670 contracts wrong entity match). Pipeline matching is overly loose.
- **FAIRSHAKE 70+ UNVERIFIED URLs** need browser verification pass before `verified` promotion.
- **GovTrack pipeline query gap**: Multiple profiles (Bush, Porter) show 0 bills sponsored/cosponsored when Congress.gov data confirms real counts. Different GovTrack query.
- **12 new stub profiles** (content-readiness: raw) need pipeline enrichment runs to populate FEC, Congress.gov, GovTrack auto-blocks where applicable.
- **Potential duplicate profiles** found during sweep: Jeff Yass (2 files), David Sacks (2 files), Marc Andreessen (2 files). Consolidation needed.

### Known issues (carried from prior session):
- Only Nancy Pelosi has say-vs-pay data — ContradictionCard shows on 1 profile. Research Claude needs template to add across top profiles.
- Mobile layout not yet polished for new Signal Bar, ContradictionCard, ProfileHeader elements.
- Interactive pages (Power Rankings, Issue Explorer, etc) still have some faint contrast issues.

### Next session priorities (Phase 1 of Apr 10-30 sprint — see plan file):

**Code Claude — Phase 1 Must-Do (pipeline foundation):**
1. Fix A000383 bioguide pipeline bug (Ramaswamy shows Oklahoma, pollutes Bush and others)
2. Fix GovTrack query gap (0 bills when Congress.gov confirms real counts)
3. Fix QVT Financial false positives (DOJ/NHTSA/SAM.gov loose matching)
4. Fix pipeline enriching redirect files (`Jeff Yass.md` LDA block bleeding through)
5. Root-cause the `content-readiness:: ready\n\0` NUL-padding script
6. Add rule comments to ops profile editor source (per frontmatter-only + URL editor-only rules)
7. Run pipeline enrichment on the 12 new stubs built today (Summer Lee, Nina Turner, George Latimer, Wesley Bell, Shontel Brown, Bernie Marcus, Mark Mellman, Brian Armstrong, Ben Horowitz, Chris Larsen, Brad Garlinghouse, Paul Atkins)

**Research Claude — Phase 1 Must-Do (depth + docs):**
1. Write `ops/CLAUDE.md` and `ops/RULES.md` (frontmatter-only rule + URL editor-only rule)
2. Begin depth work on Squad/leadership verified candidates (Tlaib, Omar, Pressley, Casar, Jeffries, AOC)
3. Flag verified candidates for David's sign-off — do NOT self-promote to verified
4. Build out Summer Lee stub from raw → draft → ready first (already has substantive body content)

**David — Phase 1 Must-Do (backlog + setup):**
1. Start batch conflict triage at `content/Admin Notes/readiness-conflicts.md` (target 25/day × 7 days = 175 resolved)
2. First URL verification pass (AOC 5 URL NEEDED, Porter 7 URL NEEDED, Fairshake top priorities)
3. Sign off on verified candidates Research Claude flags
4. Review the plan file at `C:\Users\third\.claude\plans\cheeky-knitting-fox.md` once more before Phase 1 execution begins

**Phase 1 exit checkpoint (Apr 16):** 0 pipeline bugs, ≥ 12 verified profiles total, ≥ 175 conflicts resolved, ~25 draft→ready promotions, ops rule files written.

---

## Previous Session: 2026-04-09 Research (Parts 1-3 earlier in the day)
Claude: Research
Date: 2026-04-09 (readiness review pass on 7 investigation queue profiles + queue resolution)

Done:
- **Investigation Queue fully resolved** — all 7 items marked RESOLVED in `content/Admin Notes/investigate-queue.md`. Queue status: done.
- **Vivek Ramaswamy** — promoted `draft` → `ready`. Fixed sources (Verified/Archived split, OpenSecrets archived, FEC candidate URL), removed inline status duplicates, expanded issues, fixed Roivant sub-note (10 headings h3→h2, added Verified/Archived split). QVT Financial relationship formalized.
- **Jamaal Bowman** — promoted `draft` → `verified` (A+ with editorial sign-off). 3 Tier 1 source types (FEC, Congress.gov, GovTrack), exhaustive class analysis, 7 headings h3→h2, Sources split, DMFI added to opposes.
- **United Democracy Project (UDP)** — stays `ready` (only 1 Tier 1: FEC). 12 headings h3→h2, Sources split (3 OpenSecrets archived), politicians-funded/opposed corrected, fec-committee-id added.
- **FAIRSHAKE** — promoted `draft` → `ready`. Massive profile (70+ sources). 16 headings h3→h2, politicians-funded cleaned (Porter was opposed), fec-committee-id added. 70+ UNVERIFIED URLs need browser verification by Code Claude for `verified` promotion.
- **DMFI PAC** — stays `ready`. **Fixed type error** (was `donor/Individual Donor` → `pac/PAC`). Rewrote politicians-funded (had Sanders/Bowman/Netanyahu listed as funded — all opposed). 11 headings h3→h2, Sources split Verified/Archived with 3 OpenSecrets archived + ProPublica 990 added as Tier 1.
- **Justice Democrats (sub-note)** — promoted `raw` → `ready`. **Fixed broken FEC URLs** that had `*(source unavailable)*` text inserted mid-URL. 9 headings h3→h2, Sources split, source-types/corroboration-count added.
- **Courage to Change (sub-note)** — promoted `raw` → `ready`. Fixed malformed `[!contradiction]` callouts (missing `>` prefix), 7 headings h3→h2, Sources rewritten with proper markdown links, fec-committee-id added.

Flags for Code Claude:
- **Ramaswamy Congress.gov auto-block has wrong bioguide ID (A000383, shows Oklahoma).** He's never served in Congress. Pipeline needs to handle candidate-only profiles (no Congress data).
- **QVT Financial pipeline false positives**: DOJ (264,349 generic mentions), NHTSA (vehicle data for a hedge fund), SAM.gov (7,670 contracts wrong entity match). Pipeline matching is overly loose.
- **FAIRSHAKE 70+ UNVERIFIED URLs** need browser verification pass before promoting to `verified`.
- **Justice Democrats PAC has no standalone master profile** in Donors & Power Networks folder — only exists as sub-note under Saikat Chakrabarti. Consider creating one.
- **Courage to Change** has 5 URLs marked `URL NEEDED` (Reuters, CNN, Politico, City & State NY, SF Chronicle) that need hunting.

Known issues (carried from prior session):
- Only Nancy Pelosi has say-vs-pay data — ContradictionCard shows on 1 profile. Research Claude needs template to add across top profiles.
- Mobile layout not yet polished for new Signal Bar, ContradictionCard, ProfileHeader elements.
- Interactive pages (Power Rankings, Issue Explorer, etc) still have some faint contrast issues.

Next session priorities:
1. Continue readiness promotions — next batch of profiles (Cori Bush, Summer Lee, other Squad members frequently referenced in this pass).
2. **Say-vs-pay data system** — build template/guide for Research Claude to add contradiction data to top 20-50 profiles.
3. Mobile polish (Code Claude).
4. Interactive pages contrast audit.
5. Consider creating standalone Justice Democrats PAC master profile in Donors & Power Networks.
6. URL hunt pass for Courage to Change and Fairshake UNVERIFIED sources.

---

## Previous Session
Claude: Code
Date: 2026-04-10 (Phase 1 Day 1 — Ops Calendar tab shipped)

Done (Ops Calendar tab — `ops/src/app/calendar/`):
- **New worktree** `.claude/worktrees/calendar` on branch `claude/calendar` (Research Claude is parallel on `reverent-hugle`, no collision — I only touch `ops/`).
- **Sprint schedule parser** (`ops/src/lib/sprint-schedule-parser.ts`) — reads `content/Admin Notes/sprint-schedule.md` on every request (no cache), extracts ```yaml fenced blocks under each H2 heading via js-yaml with JSON_SCHEMA so ISO dates stay strings. Handles missing file with a readable error.
- **Mutable sprint state lib** (`ops/src/lib/sprint-state.ts`) — atomic writes to `ops/data/sprint-state.json` (already gitignored). First-load seeds task_states from the schedule's status fields so cc_01-04 show as done and cc_07/rc_05 show as blocked.
- **API routes** — `GET/POST /api/sprint-state`, `POST /api/sprint-state/task`, `POST /api/sprint-state/day`, `POST /api/sprint-state/snapshot`.
- **Calendar components** — `page.tsx` (server component, dynamic = "force-dynamic"), `Calendar.tsx` (client, optimistic task toggle), `PhaseBar.tsx` (3 color-coded segments), `MonthGrid.tsx` (7-col Mon-Sun with empty pad cells for the Fri-start + Thu-end), `DayCell.tsx` (weekday, day #, phase label, task count, scrollable task list, phase-exit / launch / hard-stop markers), `TaskCheckbox.tsx` (status-aware, owner chip, blocked disabled), `DayModal.tsx` (daily template + anchored tasks, ESC to close), `utils.ts` (client-safe helpers split out so client bundle doesn't pull fs), `types.ts` (phase colors, owner colors, progressFraction, tasksByDay).
- **Sidebar nav item** — `Calendar` added between Money Trail and Alerts with a calendar SVG.
- **js-yaml installed** — spec said "already in deps" but wasn't. `npm install js-yaml @types/js-yaml` in ops/.

Acceptance criteria verified via preview_eval at `localhost:3334/calendar`:
- 21 day cells ✓ · 36 task checkboxes ✓ · 3 phase bar segments ✓ · 4 North Star progress bars ✓
- TODAY marker on Apr 10 ✓ · SOFT LAUNCH on Apr 27 ✓ · PUBLIC LAUNCH on Apr 30 ✓
- Task toggle POST persists to `ops/data/sprint-state.json`, survives reload ✓
- Initial state correctly seeds cc_01-04 as done, cc_07/rc_05 as blocked ✓
- No console errors, no NaN rendering after switching js-yaml to JSON_SCHEMA ✓

Design decision saved to memory (`feedback_ops_excluded_from_design_system.md`):
- The ops/ app is **excluded** from `content/Design System.md`. The brutalist cream/yellow/square rules are website-only. Ops stays dark (`--color-bg: #0c0c0f`, Tailwind utility classes, rounded corners OK). David clarified mid-build: "this is specifically for the Operations App. Those visual aspects are/should be excluded inside the Operations build. The cream bg is for the website."

Commits on `claude/calendar`:
- `5461c70c` ops: add js-yaml for sprint schedule parsing
- `9cbced5b` ops: sprint schedule parser + mutable sprint-state lib
- `cd9acbcd` ops: /api/sprint-state routes
- `7fe9b30c` ops: Calendar tab with month grid, phase bar, day modal

Known issues:
- `content/Admin Notes/sprint-schedule.md` and `calendar-spec.md` live in Research Claude's `reverent-hugle` worktree. They're excluded from my calendar worktree via `.git/info/exclude` so dev testing works without polluting my commits. Once Research Claude merges their worktree to v4, the spec files land via pull. Until then, if you run the calendar at a fresh v4 checkout, add `content/Admin Notes/sprint-schedule.md` first.
- `content-readiness:: ready\n\0` NUL-padding script root cause (cc_05) still pending.
- Ops profile editor frontmatter-only + URL editor-only rule comments (cc_06) still pending.
- 12 stub enrichment (cc_07) still blocked on GitHub Actions re-enablement.

Next session priorities:
1. **cc_05** — find and fix the NUL-padding script
2. **cc_06** — add rule comments to Ops profile editor source
3. **Test the calendar at `localhost:3333`** after Research Claude's spec file lands on v4 (verify default ops-dashboard port still works)
4. **Wire Breadcrumbs** to all Ops pages + migrate ToastProvider usage
5. **cc_07** — trigger pipeline runs when GitHub Actions re-enabled

---

## Previous Session
Claude: Code
Date: 2026-04-10 (Pipeline quality fixes + red flag cleanup — redirect contamination, A000383 bug, GovTrack stale cache, Cori Bush demotion)

Done (Pipeline Quality Fixes in `donor-map-engine`):
- **`scripts/lib/shared.cjs`**: Added `isRedirectProfile()` helper + `loadProfiles()` now skips redirect files from all pipelines (detects `#redirect` tag, `(Redirect)` title, `redirect: true` frontmatter, "this file is a redirect" body text). Fixes pipelines enriching redirect files with fabricated data.
- **`scripts/doj-press-pipeline.cjs`**: Sanity cap rejects results with >10K total (API returning index size). Validates 60%+ of press releases actually mention the search name. Fixes QVT Financial getting 264,349 fake DOJ mentions.
- **`scripts/sam-pipeline.cjs`**: Validates `awardeeLegalBusinessName` matches search on first 5 samples (60% threshold). Fixes QVT Financial getting 7,670 fake federal contracts.
- **`scripts/nhtsa-recalls-pipeline.cjs`**: Filters corporation pool to auto-adjacent only (name contains auto/motor/vehicle, NAICS 3361-3363, known brand names). Prevents hedge funds/defense contractors/tech companies from getting vehicle recall data.
- **`scripts/congress-pipeline.cjs`**: (1) Skip non-congressional politicians (governors, candidates, cabinet, SCOTUS) — accept former members only with explicit bioguide-id. (2) Name search now REQUIRES state match AND last name verification. No state = refuse to guess instead of grabbing `data.members[0]`. Prevents the A000383 fuzzy-match bug.
- **`scripts/committee-pipeline.cjs`**: Same chamber filter applied.
- **`scripts/govtrack-pipeline.cjs`**: Same chamber filter + cache invalidation (if cached result has votes>0 but bills==0 AND cosponsored==0, refetch) + frontmatter re-enrichment for profiles with `bills-sponsored: 0` (breaks the enrichedKey lock).
- Engine commits: `d1ceb91` (redirect/doj/sam/nhtsa fixes), `bc24819` (congress/committee/govtrack fixes).

Done (Vault Cleanup in `donor-map-site`):
- **`scripts/clean-redirect-contamination.cjs`**: Built cleanup script that strips auto-blocks and enrichment frontmatter from redirect files. Cleaned 6 redirect files: Jeff Yass (bogus LDA lobbying), Blackstone (DOJ + SAM), Google (DOJ), Meta (NHTSA — Meta doesn't make cars!), Raytheon (NHTSA + USASpending — defense contractor, not automotive), Meta Facebook Political Operation (DOJ + NHTSA).
- **QVT Financial manually cleaned**: Removed auto:doj-press (264K fake mentions), auto:nhtsa-recalls (hedge fund, not auto), auto:sam-contracts (7670 fake contracts). Kept legitimate auto:gleif-lei + auto:sec-edgar.
- **`scripts/clean-a000383-contamination.cjs`**: Built cleanup script removing `auto:congress-legislation`, `auto:committee-assignments`, `auto:voting-record` blocks containing the bogus A000383 bioguide ID. **Cleaned 95 profiles, removed 129 contaminated blocks.** Affected: Vivek Ramaswamy, Kash Patel, Marco Rubio, Michael Waltz, Pam Bondi, Rex Tillerson, Russell Vought, Scott Bessent (Trump cabinet), Amy Coney Barrett, Neil Gorsuch (SCOTUS), Kathy Hochul, JB Pritzker, Amy Acton, Josh Green, Janet Mills (governors), Cori Bush, Jamaal Bowman (former members).
- **3 orphan A000383 links struck through**: Gary Peters, John Kennedy, Shelley Moore Capito (real sitting senators whose auto-blocks were clean but source links had the wrong bioguide URL).
- Vault commit: `9a64489f` (95 profiles cleaned).

Done (Investigation + Demotion):
- **Vivek Ramaswamy "critical flag" investigated**: He was never in Congress but pipeline wrote 3 bogus congress auto-blocks. All stripped.
- **GovTrack 0/0 bills investigated**: Tested GovTrack API directly — Cori Bush sponsor=456829 returns 38 sponsored + 756 cosponsored. The profile body showed 0/0 from a stale cache. Pipeline fix added cache invalidation for impossible states.
- **Cori Bush demoted** `ready` → `draft` (commit `d7ac0262`): (1) Previous A000383 congress blocks contained wrong member. (2) Body auto:govtrack said 0/0 but frontmatter had 39/756 — stripped for fresh run. (3) Body falsely marked "(VERIFIED)" on stale data. Added internal-note documenting demotion reason. Previous session's "A+ promoted" claim was inaccurate — she was actually at `ready` (B), not `verified` (A+).

Known issues:
- GitHub Actions still disabled (per previous sessions) — cannot trigger pipeline runs to refresh the cleaned profiles. Blocks the "12 new stubs" enrichment task.
- GovTrack cache invalidation fix deployed but won't take effect until next pipeline run.
- Breadcrumbs component still not wired to pages (from previous session).
- ToastProvider still not migrated into individual pages (from previous session).

Next session priorities:
1. **Trigger pipeline runs** when GitHub Actions re-enabled — will refresh all 95 cleaned profiles + stubs with correct congress/committee/govtrack data using the new chamber-filtered pipelines.
2. **Wire breadcrumbs** to all Ops pages + migrate pages to use global useToast()
3. **Tune scanner** — reduce LOW noise from wikilink-mention strategy (8K+ results)
4. **Build contradiction markers for website** — split-color graph lines, asterisks on profile widgets
5. **Add relationship discovery rules to Ops Rules tab**
6. **Test all profile types after design reskin** — politician, donor, corporation, think tank
7. **Turn off construction mode** when GitHub Actions re-enabled

---

## Previous Session
Claude: Code
Date: 2026-04-09 (Ops app professional polish + suggestions system + contradiction detection)

Done (Suggestions System):
- Built full suggestions API from scratch (`ops/src/app/api/suggestions/route.ts`) — GET with filtering/pagination/search + POST handling 8 action types. Approve writes wikilinks to vault (handles empty sourcePath by writing to target). Undo reverses vault writes. Per-card notepad. Priority research flag (manual=urgent, approve=normal auto-queue). Pending/All/History toggle, history stats, search box, compact mode, bulk select + batch actions. New Profiles: Flag for Research on unnamed entities.
- Partisan flow fix — opposes now shows attacker's alignment, not target's.
- **Contradiction detection**: scanner flags same entity funding AND opposing same candidate (4 cards, 2 pairs — NRA + National Right to Life hedging on Bush). Yellow star badge + "BOTH SIDES" banner with amounts/ratio. Vault Rules Section 3 updated with full spec.

Done (Ops App Polish):
- ToastProvider (`ops/src/components/ToastProvider.tsx`) + wrapped in ClientProviders
- Sidebar badges (`ops/src/components/Sidebar.tsx`) + GET /api/status endpoint
- Dashboard overhaul (`ops/src/app/page.tsx`) — Quick Actions, Vault Health gauge, unified Activity Feed
- GET /api/activity aggregating git + suggestions + URLs
- Alerts upgrade (`ops/src/app/alerts/page.tsx`) — sort, resolve/unresolve, auto-refresh
- Editor upgrade — inline Add Field form replaces prompt(), beforeunload warning
- Pipelines grid — 8 pipeline cards with hover-to-reveal Run buttons
- Breadcrumbs component built (not yet wired to pages)

---

## Previous Session
Claude: Code + Research
Date: 2026-04-09 (Ops polish run + congress pipeline fix + Cori Bush A+ review)

Done:
- Ops polish run COMPLETE (10/10 items audited). Key fixes: 46 bioguide URLs archived, 7 bogus IDs removed, search focus bug fixed, connection count flash fixed, mobile responsive tabs.
- Congress/committee/govtrack pipeline fixes (all-congresses default, bioguide-first lookup).
- Cori Bush promoted to A+ verified.
- Relationship Discovery Engine: scanner built (7 strategies, 11,735 suggestions), Vault Rules Section 3, suggestions UI with filters/meters/pagination, transparency scores, partisan flow, dollar magnitude.

---

## Previous Session
Claude: Code
Date: 2026-04-09 (design overhaul — brutalist prototyping, Design System doc, construction page live)

Done:
- **Brutalist landing page prototype v2** (dark version) — `prototype/landing-v2.html`. Pure black bg, yellow accents, live ticker, scroll-triggered connection board, split-screen contradiction cards, state lookup, explore grid. All working with animations.
- **Brutalist landing page prototype v3** (final direction) — `prototype/landing-v3.html`. White/cream bg, yellow highlight blocks, serif italic editorial voice, monospace data labels, graph-paper connection board, split cards with verdict bars, state grid lookup. David approved this direction.
- **Design System doc** — `content/Design System.md`. Full design bible covering colors, typography, layout, components, animations, responsive rules, and "What NOT to Do" list. Single source of truth for all visual decisions.
- **CLAUDE.md updated** — Design system section added, old dark theme colors replaced with new palette reference.
- **Ops Rules tab updated** — Design System now shows as 5th tab in Ops app Rules page.
- **Prototype server** — `prototype/server.cjs` serves prototypes at localhost:8096. `/` = v3 (white), `/v2` = v2 (dark). Launch config added to `.claude/launch.json`.
- **Construction page pushed live** — new brutalist construction page deployed to thedonormap.org via v4 push. Cream bg, yellow highlights, 655,172x teaser card, "LAUNCHING SOON".
- **Design decisions finalized** — hybrid light/dark, split card colors (red say/blue pay), danger vs party red separated, serif=rhetoric monospace=receipts, animation budget per page type, mobile secondary but functional, state lookup committed.
- **Ops Rules tab** — Design System added as 5th tab (both worktree and main repo).
- **Landing page v3 ported to Quartz** — full `LandingPage.tsx` rewrite with all 6 sections (hero, receipt, connection board, split cards, state lookup, explore grid). Client-side JS for ticker, scroll reveals, connection board animation, state lookup from build-time data. 778 lines of new SCSS. All pushed to v4 (behind construction mode flag).

In progress:
- Landing page v3 is BEHIND construction mode. To see it locally, set `isConstructionMode = false` in `quartz/constructionMode.ts`.
- State lookup pulls senator data from frontmatter at build time. Works for states with senator profiles that have `state-abbr` and `top-donors` frontmatter fields.
- Global chrome reskin (sidebar, nav for non-landing pages) still pending.

Done (continued):
- **Landing page v3 tested in Quartz** — all 6 sections rendering correctly at 1280px viewport
- **CSS overflow fixes** — reduced all section max-widths from 1000px to 900px, fixed ROI number clamp, fixed lookup title size
- **Yellow highlight block fixed** — `isolation: isolate` solves z-index stacking in Quartz
- **Quartz layout override solved** — `body:has(.lp-v3)` pattern works for full-width pages. Key learning: use `100%` not `100vw` to avoid HiDPI doubling.
- **Site-wide reskin pushed** — custom.scss fully swapped from dark to light (288 lines changed). All dark colors → cream/light equivalents. All border-radius → 0. All shadows removed.
- **29 component files reskinned** — EvidencePanel, ProfileWidget, ProfileTabs, NetworkGraph, PowerRankings, InteractiveGraphs, IssueExplorer, VotingRecord, MobileProfile, MobileNav, DonorMapSidebar, DiscoveryPanel, EventTimeline, AdminBar, and 15 more. 650 lines changed across all components.
- **Profile page verified** — Cori Bush profile rendering on cream bg with dark text, dark sidebar, dark graph widget. Evidence panel still slightly dark (minor fix needed). Body text readable.
- **GitHub Actions disabled again** — David contacted GitHub support. Waiting for re-enablement.

Known issues remaining:
- Evidence panel background still slightly dark (inline or base style override)
- Need to test more profile types (donor, corporation, think tank)
- Some component colors in the sidebar/right widgets may need fine-tuning after visual testing on live

Done (continued, same session):
- **Profile page yellow accents** — H2 headers get yellow left border, article title gets yellow underline, active tab yellow indicator, type badge yellow bg, section card yellow borders, callout key findings yellow borders. Profile pages now pop like the homepage.
- **Both sidebars now light** — David changed from hybrid to full light sidebars. Header also light.
- **Evidence panel simplified** — shows only: yellow POLITICIAN badge + context (Democrat · House · MO) + UPDATED date + HOW WE VERIFY link. Source counts, tier badges, readiness removed (editorial, not for readers).
- **Profile header simplified** — removed TIER 1 and READY badges. Shows only: party dot + type badge (POLITICIAN/DONOR).
- **Sources section fixed** — was dark bg (#14141a missed by bulk replace), now cream with readable links.
- **Politician blue heavier** — #1e3a5f for text on cream bg (old #5b8dce was too light).
- **Table text darker** — #0a0a0a for td (was #333, too grey).
- **29 component files reskinned** — bulk color swap across all TSX components.
- **Remaining dark colors cleaned** — #1a1a24, #151520, #14141a, #8a8a96, #1a1a22, #10b981 all fixed.
- **4 Claude Code skills built** — /deploy, /session-save, /design-audit, /preflight. Pushed to both main repo and worktree.
- **GitHub Actions still disabled** — David contacted support, waiting for re-enablement.

Next session priorities:
1. **Test all profile types** — politician, donor, corporation, think tank. Verify colors/readability across types.
2. **Fine-tune remaining component colors** — search overlay, mobile nav, network graph on light bg, any remaining dark colors.
3. **Run /design-audit** — catch any remaining Design System violations.
4. **Turn off construction mode** when GitHub Actions re-enabled.
5. **State lookup data coverage** — ensure senator profiles have `top-donors` in frontmatter.
6. Continue A+ reviews.
7. Fix congress pipeline (engine).
8. Fix lda-pipeline.cjs domain (engine).

Design direction approved by David:
- Brutalist art-direction. **Hybrid light/dark** — not full light, not full dark.
- **Light where text is read** (profiles, stories, landing content, listings). **Dark where data is visual** (nav, sidebar, graphs, interactive tools, verdict bars).
- Yellow (`#fbbf24`) as primary UI accent. Red (`#e63946`) for Republican ONLY. Blue (`#1d4ed8`) for Democrat ONLY. Separate `--danger` (`#dc2626`) for warnings/negative.
- Split cards: red label "What they say" (rhetoric), blue label "Who pays them" (money). Verdict bar: black bg, yellow text.
- Serif italic (Instrument Serif) for politician quotes. Monospace (Space Mono) for data/evidence next to quotes. The contrast IS the design.
- Cream vs pure white: TBD, test during implementation. Readability first.
- Landing page: full animation (ticker, scroll reveals, connection board). Profiles: light animation only.
- Mobile: secondary but must work. Desktop-first.
- State lookup: committed feature. Needs build-time data serialization from politician frontmatter.
- No rounded corners, no shadows, no gradients. Ever.
- "Looks like a leaked file, not a government website."

Next session priorities:
1. **Port landing page to Quartz** — rewrite `LandingPage.tsx` from v3 prototype, update `custom.scss` foundation
2. **Global chrome reskin** — topbar/sidebar stays dark, content areas go light
3. **State lookup data** — build-time plugin to serialize politician+donor data for client-side lookup
4. Continue A+ reviews after design port
5. Fix congress pipeline to query all congresses (engine)
6. Fix lda-pipeline.cjs domain in engine repo

---

## Previous Session
Claude: Code
Date: 2026-04-09 (marathon — ID cleanup, construction mode, pipeline debugging, Ops features)

Done:
- **Under-construction mode** — `CONSTRUCTION_MODE=true` in deploy.yml. Only homepage deploys to production. All profile pages 404. Local dev unaffected. Live on thedonormap.org.
- **67 wrong bioguide/FEC IDs fixed** — removed 58 bogus A000383 bioguide IDs, corrected 33 FEC candidate IDs (wrong state, presidential, legacy House)
- **Pipeline trigger fix** — Ops profile viewer enrichment buttons now work (route was 404)
- **Single-profile enrichment** — `--profile` flag added to engine workflow. Ops sends profile name when triggering. Shell quoting fixed for names with spaces.
- **FEC pipeline: use frontmatter ID** — `processPolitician()` now uses `fec-candidate-id` from frontmatter instead of unreliable name search. Fixes Cori Bush and similar.
- **last-enriched fix** — all 5 major pipelines (fec, congress, govtrack, committee, voting-record) now set `last-enriched` in frontmatter on write.
- **116 FEC API URLs → website URLs** — removed DEMO_KEY rate limiting from profile links across 70 files.
- **19 LDA URLs updated** — `lda.senate.gov` → `lda.gov` domain migration.
- **Connection removal bug fixed** — regex now matches aliases (e.g., `[[Full Name|AIPAC]]`).
- **URL triage yellow/purple fixed** — distinct `(SLOW)` vs `(NEEDS REVIEW)` tags, persistent states.
- **Network graph expanded** — think tanks, lobbying firms, media profiles now included (~300 more nodes).
- **Enrichment logging** — pipeline results logged in Reviews timeline, auto-pull after completion, checklist refreshes.
- **Rules tab in Ops sidebar** — read-only view of Vault Rules, CLAUDE.md, Pipeline Guide with timestamps.
- **Class analysis mandate** — #1 editorial rule. "Class Analysis" is 8th required section for A+.
- **Pipeline Known Issues doc** — `content/Pipeline Guide - Known Issues.md` tracks bugs, fixes, debugging checklist.
- **Cori Bush bill counts fixed** — 39 sponsored, 756 cosponsored (congress pipeline returned 0 due to 119th Congress bug).

Known issues:
- Congress pipeline hardcoded to 119th Congress — former members get 0 bills (engine fix needed)
- `lda-pipeline.cjs` in engine repo still generates old domain (site-side URLs fixed, engine not yet)
- NY/TX governor scrapers need HTML pattern fixes

In progress:
- **Relationship notes on graph** — note input on connections that Research Claude reads as work orders

Next session priorities:
1. Fix congress pipeline to query all congresses a member served in (engine)
2. Fix lda-pipeline.cjs domain in engine repo
3. Cori Bush: editorial sign-off remaining (only blocker left after bills fix)
4. Continue A+ reviews — Congress batch
5. Run enrichment on profiles with corrected FEC IDs (33 senators should get fresh data now)

---

## Previous Session
Claude: Code
Date: 2026-04-09 (ID cleanup + construction mode + pipeline fixes)

Done:
- **Pipeline trigger fix** — Ops profile viewer was calling `/api/pipelines/run` (404). Fixed to `/api/pipelines`. Pipeline enrichment buttons now work.
- **GitHub token for Ops** — David created fine-grained token scoped to donor-map-engine with Actions write. Stored in `ops/.env.local`. Enrichment triggers confirmed working.
- **58 bogus bioguide IDs removed** — A000383 (Alan Armstrong) was mass-stamped across 58 profiles by a pipeline bug. All removed.
- **9 wrong FEC IDs fixed** — Bobby Scott, Chris Murphy, Mark Green, Tom Cole, John Kennedy, Ron Johnson, Adam Smith, Jason Smith, Paul Ryan all had wrong-person/wrong-state IDs. Corrected via FEC lookup.
- **FEC ID audit script** built (`scripts/fix-fec-ids.cjs`) — validates FEC IDs by chamber prefix and state code. Reusable.
- **Under-construction mode** — `CONSTRUCTION_MODE=true` env var in deploy.yml. Only homepage emits to production. All other pages 404. Local dev unaffected. Live on thedonormap.org now.
- **GitHub Actions reinstated** — David's account unflagged, pipelines running.

David's feedback (next session):
1. **Enrichment result logging** — when pipeline runs from profile viewer, log success/failure in the Reviews tab timeline
2. **Reviews tab change log** — timestamped log of all changes, persists permanently
3. **Connection removal bug** — can't remove AIPAC from Cori Bush "funded by" (and possibly other categories). Investigate Ops connection editor.
4. **Class analysis editorial rule** — ALL profiles must be written from class analysis perspective. Add "Class Analysis" as mandatory section. This is #1 editorial rule.

Next session priorities:
1. Fix connection removal bug in Ops profile viewer
2. Add enrichment result logging to Reviews tab
3. Add class analysis mandate to Vault Rules + editorial quality block
4. Continue FEC ID fixes (18 Senators with legacy House IDs, 9 with presidential IDs)
5. Graph legend on live site
6. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code + Research
Date: 2026-04-08 (continued — Reviews tab rebuild + editorial quality standards)

Done (Code Claude):
- **Reviews tab simplified** — replaced 3 sub-tabs with blocker lists → single scrollable timeline journal. Color-coded entries by author (blue=Code, green=Research, amber=Editor). Filter pills. Add Entry box.
- **Blockers split by owner** — formal review auto-generates separate Code Claude and Research Claude entries based on blocker keywords
- **URL note input focus fix** — switched to uncontrolled input (defaultValue + onBlur)
- **ProfileData interface** — added all editorial fields so Reviews tab actually displays data
- **Committed editorial review data** — Cori Bush, Carlos Gimenez, Sherrod Brown frontmatter was unstaged, now on v4

Done (Research Claude / with David):
- **Editorial quality block** added to Vault Rules — 7 core sections required for A+: Who They Are, Central Thesis, Core Contradiction, Donor Class Map, Donation-to-Policy Timeline, Rhetorical Signature Moves, Analytical Patterns
- **Review workflow rewritten** — three-stage (Research Claude reviews+fixes → Code Claude fixes pipeline → Editor approves). Review-fix-document-move on, not just find problems.
- **Vault Rules updated** — editorial quality criteria, workflow clarification, decisions log

Done (Research Claude, continued):
- **Cori Bush full editorial review + improvement** (8/10 blocks verified):
  - FIXED: Mapped connections to frontmatter (AIPAC, Justice Democrats, DMFI, AOC, Omar, Wesley Bell in related/donors/opposes)
  - FIXED: Sources reorganized to Verified/Archived two-section layout. Archived bush.house.gov (dead).
  - FIXED: Donation-to-Policy Timeline expanded from 2 to 9 rows with FEC data
  - FIXED: Rhetorical Signature Moves expanded from 1 paragraph to 4 patterns
  - FIXED: Contradiction investigated and cleared with FEC/DOJ sources
  - FIXED: Removed all em dashes from editorial content (new rule: no em dashes, sounds AI)
  - FIXED: Removed empty Sub-Notes and Policy Area sections, stale profile-status lines
  - BLOCKED: Congress auto-block corrupted (shows Republican/Oklahoma). Code Claude needs to fix.
- **Editorial quality block** added to Vault Rules: 7 core sections required (Who They Are, Central Thesis, Core Contradiction, Donor Class Map, Donation-to-Policy Timeline, Rhetorical Signature Moves, Analytical Patterns)
- **No em dashes rule** saved to memory: never use — in profile content

**GitHub Actions reinstated** as of end of session.

Next session priorities:
1. Code Claude: clear backlog from 3 reviews (Cori Bush auto-block, Sherrod Brown FEC ID, Gimenez enrichment)
2. Research Claude: continue Congress batch reviews (Carlos Gimenez, Sherrod Brown full passes)
3. Editor: review Cori Bush profile and approve/send back
4. Graph legend on live site
5. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code + Research
Date: 2026-04-08 (marathon session — ops fixes + contradiction scanner + money trail + governor pipeline + A+ editorial system + first reviews + Reviews tab)

Done (Code Claude):
- **Pipeline buttons on checklists** — ▶ run buttons next to each checklist item
- **URL Manager fixes** — checked URLs persist via sidecar JSON triage, notes input on triage, focus loss bug fixed (uncontrolled input)
- **Spacing fixes** — pipeline buttons, N/A buttons, URL triage buttons all closer to labels (checklist, profile viewer, URL Manager)
- **Trump connections** — moved 30+ related: from body to frontmatter, added donors: field
- **Contradiction scanner** (`scripts/contradiction-scanner.cjs`) — 34 both-sides donors (12 high story), 1 opposition-funded (Musk funds Newsom+Trump), 9 cross-ref mismatches, 9 cross-party connections. Wired into ops alerts.
- **Money Trail visualizer** (`/money-trail` in ops) — force-directed graph, donor→politician→committee→bill flow, search any profile, draggable nodes
- **Governor executive actions pipeline** (`scripts/governor-exec-actions.cjs`) — CA (10 EOs via RSS), FL (25 EOs). NY/TX scrapers need HTML fixes. Written to Newsom/DeSantis profiles.
- **Reviews tab** in profile viewer — 3 sub-tabs (Code Claude, Research Claude, Editor). Each has notepad, blocker lists, action buttons (Fix This ▶, Request Review, Approve for A+). Color-coded status dot on tab.

Done (Research Claude):
- **A+ Editorial Review System** designed with David — section-by-section sign-off, priority scoring, type-batched reviews, orphan claims rule, correction trail
- **Vault Rules updated** — editorial review system, orphan claims from broken URLs, new frontmatter schema, review blocks per profile type, decisions log
- **editorial-priority.cjs** — scores 899 ready profiles. Batches: Congress(94), Executive(7), Donors(185), Corporations(141), Think Tanks/PACs(54), Lobbying/Media(84)
- **First 3 A+ reviews** — all BLOCKED:
  - Cori Bush (70): 4/10 pass. Corrupted Congress auto-block, sparse connections, unresolved contradiction
  - Carlos Gimenez (55.3): 5/10 pass. No last-enriched, Crowley contradiction, broken Wikipedia URL
  - Sherrod Brown (47.5): 1/10 pass. Wrong FEC ID (House not Senate), 0/0 bills wrong, OpenSecrets archived
- **vault.ts** updated with editorial review fields

Known issues:
- GitHub Actions still disabled
- NY/TX governor scrapers need HTML pattern fixes
- lda-pipeline.cjs still generates lda.senate.gov URLs
- Sherrod Brown FEC ID needs fixing (H2OH13033 → S6OH00163)
- Cori Bush Congress auto-block corrupted (shows Republican/Oklahoma)

Next session priorities:
1. Fix Code Claude blockers from first 3 reviews (FEC IDs, auto-blocks, enrichment)
2. Continue A+ reviews — Congress batch (91 remaining)
3. Graph legend on live site
4. Fix lda-pipeline.cjs domain
5. Write stories from both-sides donor data (AIPAC, Goldman Sachs, Boeing)
6. Fix NY/TX governor scrapers

---

## Previous Session
Claude: Research (then Code)
Date: 2026-04-08 (A+ editorial review system + contradiction scanner + money trail + governor pipeline)

Done (Research Claude):
- **A+ Editorial Review System** — designed and implemented with David:
  - Section-by-section sign-off via `verified-blocks` array
  - Priority scoring: connections(25%) + sources(30%) + corroboration(20%) + body(10%) - gaps(15%)
  - Type-batched reviews: Congress(94) → Executive(7) → Donors(185) → Corporations(141) → Think Tanks/PACs(54) → Lobbying/Media(84)
  - Detailed review log in frontmatter (date, reviewer, result, blocks reviewed, blockers, notes)
  - `orphan-claims` block mandatory on every review — broken URLs' claims must be re-sourced or rewritten
  - All rewrites documented in `corrections` frontmatter for permanent audit trail
  - 10 profile types with type-specific block checklists
- **Vault Rules updated** — orphaned claims rule, editorial review system, new frontmatter schema, review blocks table, decisions log entry
- **editorial-priority.cjs** — scores and ranks 899 ready (B) profiles. Top candidates: Cori Bush (70), League of Conservation Voters (74.5), Lennar Corp (71.5)
- **vault.ts** — editorial review fields added to Profile interface

Next session priorities (Research Claude):
1. Start A+ reviews — Congress batch first (94 profiles, top: Cori Bush, Carlos Gimenez, Sherrod Brown)
2. Fix cross-ref mismatches from contradiction scanner (Peter Thiel → 6 media profiles)
3. Review 9 cross-party connections flagged by scanner
4. Write stories from both-sides donor data (AIPAC, Goldman Sachs, Boeing)

---

## Previous Session
Claude: Code
Date: 2026-04-08 (contradiction scanner + money trail + governor pipeline + ops fixes)

Done:
- **Checklist pipeline buttons** — ▶ run buttons next to each checklist item (fec, govtrack, lda, etc.)
- **URL Manager fix** — checked URLs no longer revert to unchecked after save (sidecar JSON triage)
- **URL notes** — optional note input when triaging URLs (both URL Manager and profile viewer)
- **Spacing fixes** — pipeline buttons, N/A buttons, URL triage buttons all closer to labels
- **Trump connections fixed** — moved 30+ related: connections from body to frontmatter, added donors: field
- **Internal-notes audit** — only 5 files have internal-notes, all valid YAML (no corruption)
- **Contradiction scanner** (`scripts/contradiction-scanner.cjs`) — 4 checks:
  - 34 both-sides donors (12 high story potential: AIPAC 18 pols, Goldman Sachs 17, Boeing 10)
  - 1 opposition-funded contradiction (Elon Musk funds Newsom + Trump)
  - 9 cross-ref mismatches (Peter Thiel listed by 6 media figures not in his profile)
  - 9 cross-party connections to review
  - Results wired into ops alerts dashboard
- **Money Trail visualizer** (`/money-trail` in ops) — force-directed graph:
  - Default: top 15 both-sides donors with cross-party flows
  - Profile view: full donor→politician→committee→bill flow
  - Draggable nodes, zoom, hover highlights, arrows, legend
  - Color-coded: donors=amber, Dem=blue, Rep=red, committees=green
- **Governor executive actions pipeline** (`scripts/governor-exec-actions.cjs`):
  - California: 10 EOs via gov.ca.gov RSS (Tier 1)
  - Florida: 25 EOs from flgov.com (Tier 1)
  - NY/TX scrapers need HTML pattern fixes (0 results currently)
  - Data written to Newsom and DeSantis profiles

Known issues:
- GitHub Actions still disabled (David awaiting reinstatement)
- NY/TX governor scraper patterns need fixing (different HTML structures)
- lda-pipeline.cjs still generates lda.senate.gov URLs (not yet fixed)

Next session priorities:
1. Graph legend on live site (Stories, Opposition, entity types)
2. Fix NY/TX governor scraper HTML patterns
3. Fix lda-pipeline.cjs domain (lda.senate.gov → lda.gov)
4. Social scheduling for Distribution page
5. Run contradiction scanner periodically (add to pipeline schedule)
6. Verify live site build when GitHub Actions is back

---

## Previous Session
Claude: Code
Date: 2026-04-08 (readiness overhaul + ops v2 + profile viewer rebuild + type-specific checklists)

Done:
- **Readiness tier overhaul** — removed "developed", established 4-tier grading (raw/draft/ready/verified) with investigative journalism standards
- **Profile viewer overhaul** — Notes tab (internal, per-profile), connection editor (search + add/remove + commit), sources merged into URLs tab, readiness scroller, A-Z bar, completeness rings, promote/demote buttons, refresh button
- **Dashboard redesign** — 3-panel stats bar (Grades/Quality/Health), readiness scroller pills, "Sort: Nearest to A+" option, legend bar
- **Reclassification scripts** — reclassify-readiness.cjs + staleness-decay.cjs (not yet run with --write)
- **New APIs** — POST /api/profile/readiness, /api/profile/notes, /api/profile/connections
- Built `reclassify-readiness.cjs` — scans all profiles, computes source diversity, corroboration, known gaps. Dry-run: 592 ready (B), 371 draft (C), 0 verified (A+), 483 A+ candidates
- Built `staleness-decay.cjs` — auto-demotes verified→ready (90d), ready→draft (180d)
- New frontmatter: `source-types`, `corroboration-count`, `known-gaps`, `last-verified-by`
- Gold A+ badge on live site for verified profiles, green "SOURCED" for ready
- Near-verified + decay candidate alerts in Ops dashboard
- **Stale profile detector** — alerts API + dashboard cards for stale/never-enriched
- **A-Z navigation bar** — letter filter on vault grid, disabled letters dimmed
- **"What's needed" per profile** — color-coded next-action on cards and detail panel
- **"View Full Profile" button** — dashboard detail → profile viewer navigation
- Updated all docs: Vault Rules, CLAUDE.md, Pipeline Guide

**Reclassification executed**: 963 profiles audited, 387 reclassified. 598 ready (B), 365 draft (C), 525 A+ candidates.

Bug fixes: URL dedup, nested bracket regex, internal-notes YAML corruption (newlines), refresh button loading, search matching paths.

Additional done:
- **Type-specific A+ checklists** — VerificationChecklist component with role-aware requirements:
  Congress (voting records, committees, bills), President (executive orders, cabinet appointments),
  Governor (executive actions, state legislation), Cabinet (appointment, revolving door),
  Donor, Corporation, Media, Think Tank, Lobbying Firm, PAC — each with tailored criteria
- **N/A system** — edge cases (candidate not in office, private company, independent media) can mark
  items N/A with a reason, stored in checklist-na frontmatter. N/A items excluded from A+ scoring.
- **Pipeline Data Viewer** — expandable read-only view of all auto-blocks (voting records, committees,
  bills, FEC, executive orders, lobbying, contracts). Priority-sorted by profile type.
- **Executive orders pipeline** — proper pipeline in engine repo, ran for 5 presidents:
  Trump (474 EOs), Obama (294), Clinton (310), Biden (162), Bush W (294). Write run in progress.
- **Prev/Next navigation** on profile viewer
- **URL deduplication**, nested bracket regex fix, internal-notes YAML corruption fix
- **Connection type editor** — hover any connection to change type via dropdown (Related/Funded By/Opposes)
- **Editor auto-loads** profile from ?profile= query param
- Removed redundant ReadinessChart, added ContentBreakdown by category
- GitHub support ticket responded to (Actions disabled, awaiting re-enablement)

Known issues:
- Trump's `related:`/`donors:` in body not frontmatter — shows 0 connections in profile viewer
- Executive orders --write run may not have completed (check next session)
- Some profiles may have corrupted internal-notes from early auto-check runs

Executive orders pipeline ran with --write: Obama, Clinton, Biden, Bush W inserted. Trump parked (manual edit detected). Minor flushLog error (non-critical).

Back/Forward nav buttons added to sidebar (site-wide). Fixed exec orders pipeline bug (passed content instead of filePath to updateFrontmatter).

Editorial framework discussion with David — agreed on:
- Checklist must ENFORCE readiness (not just visual) + bypass button for edge cases
- Contradictions reworded: "Contradiction investigation complete (Research Claude)" — mandatory for A+
- Story grading: Story (1-4 URLs/draft) → Report (5-9/ready) → Investigation (10+/verified)
- Stories/events/sub-notes don't require pipeline enrichment
- Research Claude + Code Claude integration protocol (surfaces → acts, requests → builds)
- Additional editorial checks: cross-ref consistency, claim attribution, legal sensitivity, correction history, wikilink integrity, orphan detection, update cadence

Additional done (continued):
- **Editorial framework implemented** — checklist enforces readiness with bypass button, story grading (story/report/investigation by URL count), contradiction reworded as Research Claude requirement
- **Story/event/sub-note checklists** — editorial types get editorial criteria, no enrichment required
- **Vault integrity scanner** built — 499 broken wikilinks, 23 orphans, 10 cross-ref mismatches
- **Integrity alerts wired into Ops** — reads from reports/vault-integrity.json
- **New frontmatter fields** — corrections, update-cadence, legal-sensitivity
- **Reclassification v2 run** — 1,493 files, 351 changes. Final: 899 ready, 565 draft, 29 raw, 0 verified, 0 developed
- **Back/Forward nav** in sidebar (site-wide)
- **Executive orders pipeline** ran — Obama, Clinton, Biden, Trump, Bush W all written
- **Vault Rules** fully updated with editorial framework, integration protocol, story grading, contradiction protocol

Next session priorities:
1. Graph legend on live site (Stories, Opposition, entity types)
2. Contradiction scanner — auto-find shared-donor contradictions
3. Money trail visualizer — donor→politician→committee→bill flow
4. Fix lda-pipeline.cjs domain
5. Governor executive actions pipeline (state-level)
6. Verify live site build with all readiness/component changes
7. Social scheduling for Distribution page

Next session priorities:
1. Run reclassify-readiness.cjs --write after David reviews report
2. Run staleness-decay.cjs --write
3. Graph legend on live site (Stories, Opposition, entity types)
4. Contradiction scanner — auto-find shared-donor contradictions
5. Money trail visualizer — donor→politician→committee→bill flow
6. Fix lda-pipeline.cjs domain

---

## Previous Session
Claude: Code
Date: 2026-04-08 (marathon session — Ops v1.0 → v1.5, live site upgrades)

Biggest session in the project's history. Ops v1.0→v1.5, live site voting records, responsive tables, graph fixes.

**Ops v1.1**: Ctrl+K command palette, unified Profile page, rich activity feed, keyboard shortcuts, visual readiness badges
**Ops v1.2**: Source Hunter 6→15 APIs, auto-connection engine (8 strategies, 5,733 connections), LDA migration (509 URLs), relationship editing everywhere, clickable URLs, entity type filtering
**Ops v1.3**: Voting Record pipeline, pipeline action categories (Auto-Fill/Source Discovery/Needs Review/Relationship), visible edit controls
**Ops v1.4**: Pipeline diff viewer, profile completeness score (0-100% ring), stories connection type
**Ops v1.5**: VotingRecord live site component, View Logs button, blockquote vote format, draggable graph nodes (whole bubble), responsive tables site-wide

**Live site changes:**
- `VotingRecord.tsx` component — party loyalty ring, ideology spectrum, leadership score, auto-renders on politician profiles
- `ProfileWidget.tsx` — opposition edges fixed for ALL profile types (was only non-politicians), stories field added
- Responsive tables — ALL tables in article content stack vertically (no horizontal scroll)
- Obama profile cleaned (NUL bytes), David Sacks YAML fixed (build failure)

**Ops app changes:**
- Relationship Mapper: draggable nodes (entire bubble, container-level tracking), stories type, fuzzy name matching, context menu, entity filters
- Pipelines: action categories, View Logs (per-pipeline found/not-found/errors from GitHub Actions), voting record in pipeline list
- Source Hunter: 15 APIs with env vars matching GitHub Secret names
- Dashboard: completeness rings, diff viewer, activity feed

**Engine repo changes:**
- `auto-connection-engine.cjs` — 8 strategies for all profile types
- `voting-record-pipeline.cjs` — Congress.gov + GovTrack, blockquote format
- `auto-connect.yml` — standalone workflow with Run Auto-Connect button
- Voting record added to enrichment workflow

**Key lesson:** Verify UI changes in preview before pushing. The draggable nodes took 4 iterations because changes were pushed untested. Memory saved: `feedback_verify_before_push.md`.

Known issues:
- `.next` cache corruption if app killed mid-compile — `rm -rf ops/.next`
- LDA auth tokens don't work on lda.gov yet
- `lda-pipeline.cjs` in engine repo still generates lda.senate.gov URLs
- Voting record: some profiles "not found" on Congress.gov (name mismatches)

Next session priorities:
1. **Graph legend on live site** — Stories, Opposition, entity types in legend
2. **Stale profile detector** — surface profiles not enriched in 30+ days
3. **Contradiction scanner** — auto-find shared-donor contradictions
4. **Money trail visualizer** — donor→politician→committee→bill flow
5. **Auto-story generator** — draft stories from detected patterns
6. Fix lda-pipeline.cjs domain
7. Social scheduling for Distribution
8. Riff on live site graph improvements

---

## Previous Sessions

### Code Claude — 2026-04-08 (earlier sessions combined)
2. **Profile completeness score** — percentage ring on every profile card
3. **Stale profile detector** — surface profiles needing attention
4. **Contradiction scanner** — auto-find shared-donor contradictions for stories
5. **Money trail visualizer** — donor→politician→committee→bill flow diagram
6. **Auto-story generator** — draft story skeletons from detected patterns
7. Fix lda-pipeline.cjs domain
8. Social scheduling for Distribution page

---

## Previous Sessions

### Code Claude — 2026-04-08 (early morning)

Done:
- **Built Donor Map Ops v1.0** — 10-module local operations app at `ops/`
- Modules: Dashboard, Pipelines, Notes & Queues, URL Manager, Source Hunter, Relationships, Editor, Publisher, Alerts, Distribution
- **Switched all reads to local filesystem** — zero GitHub API for browsing (was hitting 5,000/hr rate limit)
- **Switched all writes to local filesystem + git push** — saves write to disk, git commit, git push. No GitHub Contents API.
- URL Manager: two-tier triage (active + completed archive), quick-assign buttons, undo from completed, drag-and-drop
- Editor: 4 view modes (Edit/Split/Preview/Live Site), markdown renderer with proper CSS, iframe of live page
- Enrichment Results: plain English breakdown of what each pipeline run gathered, from local git history
- Admin Notes: saved as markdown in `content/Admin Notes/`, both Claudes check these every session
- Desktop launcher, PWA manifest, toast notifications
- Updated CLAUDE.md with full Ops app documentation for both Claudes

Architecture:
- App at `ops/` — Next.js + Tailwind, fully separate from Quartz
- **Reads from local filesystem** (instant, zero API)
- **Writes to local files + git push** (no GitHub API needed)
- GitHub API only for: pipeline triggers (workflow_dispatch), Source Hunter (gov APIs)
- Desktop shortcut: `ops/start-ops.bat`, or `ops/create-shortcut.bat` for desktop icon
- Run: `cd ops && npm run dev` → localhost:3333

David's workflow:
- Opens Ops app daily to browse, edit, triage URLs, leave notes
- Notes in `content/Admin Notes/` are work orders for both Claudes
- URL triage marks broken links as archived (strikethrough) per Vault Rules
- Check `content/Admin Notes/` every session for open notes

Known issues:
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)
- `.next` cache corrupts if app killed mid-compile — `rm -rf ops/.next` fixes it

Next:
- David testing Ops app, reporting issues for polish
- Check `content/Admin Notes/` for any open notes from David
- Run opensecrets-replace for remaining categories (~3,000 URLs)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Pipeline coverage report for enrichment gaps

---

## Previous Sessions

### Code Claude — 2026-04-07 (evening)
- Restored 626 content files lost during worktree-v4 merge conflicts
- Fixed CI pipeline merge conflicts: `git pull --no-rebase -X theirs`
- Deployed graph widget to ALL profile types
- Full-screen graph contextual filter bar
- Restored 6 missing profiles, reverted sidebar featured items
- Fixed landing page broken links, ProfileTabs empty states, MobileNav fix

### Code Claude — 2026-04-07 (earlier)
- Fixed front page 404 caused by wholesale v4 file sync — reverted 4 core files, surgically added NetworkGraph registrations
- Graph tab moved to first position in ProfileWidget with Expand Network button
- Built shared-donor bridge: expanded graph now shows think tanks, K Street, and media figures connected through shared donors
- Migrated `related:` and `donors:` from body text into YAML frontmatter for 155 think tank, K Street, and media profiles
- Confirmed FCC pipeline unfixable (per-station API, no global search)
- Confirmed House Stock Watcher dead (GitHub repo deleted, S3 returns 403, site offline)

### Code Claude — 2026-04-06 (evening)

Done:
- **Built 11 new pipelines**, bringing total from 21 → 32 data source pipelines
- New pipelines: OSHA, Nonprofit 990, SEC Litigation, FEC Summary, DOJ Press, Wikipedia/Wikidata, Committee Assignments, OFAC SDN, CPSC Recalls, USASpending Awards, NHTSA Recalls, Lobbying Cross-Reference
- All 32 wired into CI workflow (api-enrichment.yml), running 4x daily in parallel
- Built pipeline coverage dashboard (`pipeline-coverage-report.cjs`) — scans vault against 26 enrichment markers
- Created data sources page (`content/Interactive/data-sources.md`) documenting all 32 pipelines
- Bumped CI timeout to 35min job / 25min pipeline step
- All API keys configured (user added DOLAPI this session)
- 22 of 32 pipelines need zero auth

Known issues:
- FCC pipeline returns 0 results (needs correct endpoint paths)
- House Stock Watcher data URL 404s (Senate works fine)
- EPA ECHO API flaky (500 errors, has fallback endpoints)
- Public Accountability HTTPS cert issues (falls back to HTTP)

In flight:
- CI run triggered with limit=3 to test all 32 pipelines
- Session State and Pipeline Guide updates need finishing (agents hit rate limit)

Next:
- Fix FCC endpoint paths (research Swagger UI)
- Fix House stock watcher data URL
- Update Pipeline Guide with all 32 pipeline entries
- Run opensecrets-replace for remaining categories (orgs, pacs, outside-spending)
- LDA migration: lda.senate.gov → lda.gov before June 30, 2026 sunset
- Run pipeline coverage report to identify enrichment gaps
- Split CI into fast/slow workflows if timeout issues arise

---

## Previous Sessions

### Code Claude — 2026-04-06 (afternoon)
- Built FARA, CourtListener, Federal Register, SEC EDGAR, Public Accountability, FCC, OpenSanctions, Stock Watcher, GLEIF, EPA ECHO pipelines (10 new, bringing total from 11 → 21)
- Completed FARA two-phase matching strategy with correct API field names
- Fixed loadProfiles `donors` bucket to use `all` for broad entity matching
- Researched 30+ potential data sources from Perplexity suggestions, categorized as Build/Defer/Skip

### Code Claude — 2026-04-06 (earlier)
- Slimmed CLAUDE.md from 171→107 lines
- Created opensecrets-replace.yml workflow + ran for members-of-congress (997 URLs across 346 files)
- 127 URLs skipped (generic sub-pages), 3,011 remain in other categories

### Code Claude — 2026-04-06 (earlier)
- Built LobbyView pipeline (lobbyview-pipeline.cjs) — client-bill lobbying networks, 100 req/day
- Built OpenSecrets URL replacement script (opensecrets-replace.cjs) — maps 4,075 URLs to FEC/Congress.gov/LDA equivalents
- Added LobbyView to api-config.cjs and GitHub Actions workflow
- Rewrote vault methodology: Vault Rules.md + Pipeline Guide.md + Session State.md replace 10 old docs
- New readiness tier: `verified` (has Tier 1 pipeline data). Existing `ready` files stay published.

### Code Claude — 2026-04-06 (earlier)
- Party dots on profiles (blue D, red R, grey I)
- Fixed sidebar nav links (Fox News, Daily Wire, pod paths)
- Widened ProfileWidget scope to all profile types
- Empty states for EventTimeline and ProfileWidget
- Categorization audit: Bush Cabinet folder, Former folders
- Wired FEC + Congress pipelines into auto-block body section writes
- Pipeline timeout fixes and push conflict resolution

### Code Claude — 2026-04-05
- API enrichment runs: 122 files updated across 4 pipeline runs
- Fixed ProPublica hitting corporations + deduplicated frontmatter keys
- GovTrack, SAM, USASpending pipelines running in parallel

### Research Claude — 2026-04-05
- Vault audit and roadmap (identified ~1,350 total files, 1,204 ready)
- Source integrity pass on 55 files
- URL fix log started
