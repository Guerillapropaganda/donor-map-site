---
title: "Session handoff — 2026-04-15 foundation audit → next session"
type: admin-note
note-type: handoff
priority: normal
status: active
last-updated: '2026-04-15'
author: Code Claude
---

# Handoff for the next Code Claude session

This is a self-contained handoff for whoever picks up the next session. You don't need to read my whole Session State — just this file.

## Where we are

David's directive this session was **"I need to really fix foundational problems like these. I feel like we keep deferring things for later and its just building up."** I responded with a full audit, built a ruthless Tier 1/2/3 prioritization, and drained 9 commit chains of foundation rot in one ~6-hour marathon. **All 9 sentinels green on every commit. Every commit deployed successfully.**

**The pattern:** whenever I started to defer something, David called it out explicitly ("see we just deferred") and I pivoted to actually fixing the root cause. Don't defer. If something looks hard, the actionable move is usually to build a small tool that verifies it or split it into a 15-minute focused commit.

## Current state (verified at session end)

| Surface | Status |
|---|---|
| Quartz TS errors | 0 ✓ |
| Ops TS errors | 0 ✓ (was 17 at session start — **big fix**) |
| duplicate-bioguide sentinel | ✓ clean (551 unique bioguides) |
| relationship-edge-validator | ✓ 0 errors across 31,987 edges |
| Open bugs in bug-queue.md | 0 |
| Canonical store edges | 31,987 (+1,733 over session) |
| Entity store size | 1,467 |
| Class-tag proposals (total / high-conf) | 510 / 109 |
| IDEOLOGICAL_FUNCTIONS vocabulary | 21 (ADR-0010 added `surveillance-state`) |
| Ops search duplicates | 0 visible (David Sacks + JB Pritzker merged) |
| Deferred items (total / actionable) | 436 / 91 |

## What's in the `/bugs` Ops page

The `/bugs` page now **defaults to actionable-only** (`kindFilter = "unchecked-exit-criterion"`). You'll see 91 of 436 at the top. The other 345 are historical annotations captured by the parser — they're not TODOs, they're section headers and completed-item markers. Don't waste time on them unless you're adding a new heuristic to the triage script.

**The 91 actionable items break down as:**

| Category | Count | Your lane? |
|---|---:|---|
| misc | 40 | Mixed — some Phase 1 URL triage (David's), some class-tag approval UX, assorted |
| regression / tests | 21 | Mostly historical — probably 10+ more auto-verifiable with tighter heuristics |
| phase 2.75 polish | 8 | Other session (policy pages) |
| data integrity | 4 | Yours |
| documentation | 5 | Yours |
| class tags | 5 | Mixed |
| security / auth | 4 | **Other session's lane — do not touch** |
| performance | 4 | Yours (benchmark runs) |
| legal / defamation | 3 | David's + editorial |

## Top 5 next priorities (in order)

### 1. Drain the 6 remaining profile-dedup groups
📂 **[content/Admin Notes/profile-dedup-queue.md](content/Admin%20Notes/profile-dedup-queue.md)** has explicit merge instructions for each:
- **GEO Group** — 2 files (Carceral State + Dark Money). Probably fully merge into Carceral State canonical.
- **Meta** — 3 files (Mega-Donors redirect handled; still Tech & Crypto/Meta - Facebook + Tech & Crypto/Meta - Facebook Political Operation redirect handled). Needs editorial review of which is canonical.
- **Blackstone Real Estate** — 2 files (Blackstone Real Estate + Blackstone Real Estate Political Operation). May be intentionally separate (parent vs. subsidiary).
- **Raytheon Technologies** — has real enrichment data that needs to be MERGED into Raytheon (RTX).md canonical before converting to redirect.
- **Fox Corp - Rupert Murdoch** — 8 dangling wikilinks. Need to find/create canonical Fox profile.
- **EMILY's List** — 7 dangling wikilinks. Either create new profile or find adjacent one to alias.

**The pattern that works (established today for David Sacks + JB Pritzker):**
1. Canonical = the richest file (or politician master profile if person is both)
2. Move donor-side into politician folder as `type: sub-note` OR mark as `type: redirect` with `editorial-status: redirect` + `redirect-target:`
3. Add `aliases:` on canonical for all variant names
4. Rewrite wikilinks `[[Old Name]] → [[Canonical]]`
5. Run `scripts/tmp-rename-edges.cjs`-style cleanup if canonical store has stale references (recompute edge IDs, drop hash collisions)
6. Run `renormalize-edge-types.cjs --write`
7. Remove orphan entity records from `data/entities.jsonl`

Each group is 15-30 min of focused work. **Don't try to do all 6 in one commit** — do one group per commit so rollback is easy.

### 2. Perplexity batch 2 — remaining 51 Bucket B entities
40 of 91 Bucket B entities were researched this session. 51 remain. To generate the filled-in prompt:

1. Read [content/Admin Notes/class-tag-research-queue.md](content/Admin%20Notes/class-tag-research-queue.md) Bucket B section
2. Use the same prompt format as [content/Admin Notes/perplexity-research/class-tag-research-2026-04-15.md](content/Admin%20Notes/perplexity-research/class-tag-research-2026-04-15.md) but with entities 41-91 inlined
3. Save to `content/Admin Notes/perplexity-research/class-tag-research-{YYYY-MM-DD}-batch-2.md`
4. Give David the full Windows path (`C:\Users\third\donor-map-site\content\...`) — he needs the absolute path for file operations
5. When David returns results, run `node scripts/load-perplexity-class-tag-proposals.cjs <results-file> --write`

**Important:** `surveillance-state` is now in the locked vocab, so Perplexity can use it directly this time. 0 vocab drops expected.

### 3. Triage the 204 dangling wikilinks
169 unique targets point at profiles that don't exist. I have NOT generated a structured research task for these yet — it would be a good next step. Each needs: does the entity deserve a new profile, is the wikilink pointing at the wrong name (should be aliased), or should the wikilink be removed?

Build a file like: `content/Admin Notes/perplexity-research/dangling-wikilinks-triage-{date}.md` grouped by target type (corporation / politician / story / other) with 169 entries. Top dangling targets (counts from session-end audit):
- Fox Corp - Rupert Murdoch (8)
- EMILY's List (7)
- Ripple Labs (4)
- SENATE LEADERSHIP FUND (4)
- America First Legal (3)
- Koch - Koch Industries (3) — probable alias collision with Koch Network - Charles Koch
- Marc Andreessen (2)
- Comcast Corporation (2)
- First Look Media (2)
- ... +160 more

### 4. Drain more data-integrity + performance deferred items
Open `/bugs` page, set Category filter to `data integrity`, then `performance`. With the actionable-only filter on, you'll see ~4-8 real items per category. Each is likely a 5-15 min check or fix.

Good candidates I spotted but didn't do this session:
- **phase-2.75 L17**: "events.jsonl has policy_id populated for all policy-related events" — 18/188 events have policy_id. Need to define "policy-related" (probably means events whose `type` is in a known-policy set), then verify or populate the missing 170.
- **phase-6 performance items**: Quartz build time benchmark, top-3 slow paths. These need actual runs — `time npx quartz build`, record, commit the timing in a benchmark file.
- **phase-6 documentation**: CLAUDE.md / Vault Rules.md / Pipeline Guide.md cross-reference checker. Build a tiny script that walks all `[text](path)` and `[[wikilink]]` references and flags broken ones.

### 5. Re-run triage-deferred-items with tighter heuristics
[scripts/triage-deferred-items.cjs](scripts/triage-deferred-items.cjs) currently auto-verified 74 of 254 items. The remaining 180 are mostly items whose verification is harder (tests exist + pass? content written? "X verified" phrases?). Adding 5-10 more heuristic resolvers would likely catch another 20-30 stale items. Worth ~30 min of investment.

## Things David decides (DO NOT start on these)

1. **2 entity-record collisions** still need David's editorial call on canonical choice (Note: David Sacks + JB Pritzker were handled via sub-note merge, but fix-entity-name-mismatches flagged 2 OTHER collisions not yet addressed. Check the script output for specifics — they're different from the 2 humans I merged this session).
2. **"Class tag approval UX verified"** (phase-2 L26) — needs David to actually use the /class-tags page with a stopwatch.
3. **Readiness promotions** — 19 profiles are one flag-flip from verified. David-only sign-off per CLAUDE.md rule 11.
4. **Lawyer review** for AIPAC page + optional. David's call on timing.

## Things the other session owns (DO NOT touch)

Per [content/Admin Notes/pre-launch-security-brief.md](content/Admin%20Notes/pre-launch-security-brief.md):
- LICENSE / CONTENT-LICENSE files
- Public `/legal` page
- Rate limiting middleware
- gitleaks CI wiring
- Pseudonymity audit scripts
- Corrections policy / DMCA playbook / backup playbook

The `donor-map-engine` repo (pipeline orchestration) is also a separate-session / engine-repo concern. Pipeline bug fixes live there, not here.

## Tools you should know about (built this session)

| Tool | Purpose |
|---|---|
| [scripts/create-top-fec-pac-stubs.cjs](scripts/create-top-fec-pac-stubs.cjs) | Create frontmatter-only stub profiles from FEC Committee Registry; collision detection, acronym-aware titleCase |
| [scripts/fix-entity-name-mismatches.cjs](scripts/fix-entity-name-mismatches.cjs) | Strip " Master Profile" suffix from entity records; delete "(Redirect)" orphans |
| [scripts/load-perplexity-class-tag-proposals.cjs](scripts/load-perplexity-class-tag-proposals.cjs) | Parse Perplexity markdown response → merge into proposals JSONL with vocab normalization |
| [scripts/triage-deferred-items.cjs](scripts/triage-deferred-items.cjs) | Walk phase docs, verify each unchecked criterion against repo reality, flip boxes deterministically |

**Existing tools that are load-bearing** (don't recreate):
- [scripts/migrate-frontmatter-delta.cjs](scripts/migrate-frontmatter-delta.cjs) — the frontmatter→canonical delta upserter
- [scripts/renormalize-edge-types.cjs](scripts/renormalize-edge-types.cjs) — fixes stale from_type/to_type denormalizations
- [scripts/rebuild-relationship-caches.cjs](scripts/rebuild-relationship-caches.cjs) — canonical→frontmatter cache propagation
- [scripts/lib/relationship-edge-validator.cjs](scripts/lib/relationship-edge-validator.cjs) — **has the buildTitleIndex() with the new filename alias logic (added this session)**
- [scripts/batch-gather-entity-signals.cjs](scripts/batch-gather-entity-signals.cjs) — **has the README/redirect/reference skip filter (added this session)**

## Sentinel gotchas

- **canonical-store-sentinel** will block if you edit frontmatter relationship fields (`related`, `donors`, `top-donors`, `politicians-funded`, `politicians-opposed`, `opposes`, `stories`) without also staging a canonical-write-path file. If your commit is legit (you ran rebuild-relationship-caches after a canonical edit), it'll pass. If you ONLY edited frontmatter, you're doing it wrong — edit the canonical store and rebuild instead.
- **relationship-edge-sentinel** will flag stale from_type/to_type denormalizations whenever you change a profile's `type:` field. Always run `node scripts/renormalize-edge-types.cjs --write` after type changes.
- **self-review-mirror** rejects em dashes and banned AI vocabulary in authored prose. Admin notes are exempt. But if you write `—` in anything under `content/` that isn't an admin note, the commit gets blocked.
- **Windows case-only filename renames** require `git mv -f` to update the git index. `fs.renameSync` alone is a no-op on case-insensitive filesystems and git silently keeps the old name in the index. This bit me twice this session (SEIU Cope → SEIU COPE and re-bit on merge conflict resolution).

## One-line summary for the session start

Read [content/Session State.md](content/Session%20State.md) "Last Session" + this handoff. You should be oriented in under 5 minutes.

Godspeed. The foundation is in much better shape than it was this morning.
