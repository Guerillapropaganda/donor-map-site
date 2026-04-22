---
title: "Session log — 2026-04-21"
type: admin-note
status: closed
lane: code
date: 2026-04-21
---

# Session log — 2026-04-21

Marathon single-session day. Three distinct arcs:

1. ADR-0017 backend + eleven local-data enrichment sessions (A–K)
2. Four rendering passes on the data-complete tab system
3. Kicked off the full bulk-data enrichment sprint at end of day

All work shipped to v4 worktree `claude/infallible-leavitt-bef781` and
merged. **Public exposure remained off for the entire day** — kill-switch
`TIER_GATED_PUBLISHING = false` in `quartz/constructionMode.ts`. The 446
data-complete profiles exist classified and rendered in `public/`, but
the deploy does not expose them past the 9-entry
`data/public-routes.json` allowlist.

---

## Arc 1 — ADR-0017 + Sessions A–K

**ADR-0017** (accepted 2026-04-21): adds the `data-complete` tier between
`ready` and `verified` so the database can ship at scale without holding
auto-generated content hostage to Research Claude's editorial bottleneck.
See `content/Decisions/0017-data-complete-tier.md` for the full rationale.

Backend landed across these commits (all on v4):

| Session | Work | data-complete |
|---|---|---|
| Start | — | 0 |
| A | Backfill `last-enriched` (git mtime) on 978 profiles | 18 |
| B | Drop vestigial `contradictionsClear` check | 90 |
| C | Canonical `hasConnections` (rule 1 alignment) | 91 |
| D | Harvest Tier 1 citations from canonical IDs on 262 profiles | 165 |
| E | Backfill `committees` from `legislator-committees.jsonl` (421 politicians) | 188 |
| F | Backfill `total-raised` from FEC weball summary (313 politicians) | 188 |
| G | Backfill `bills-sponsored` from PLAW (93 politicians) | 201 |
| H | Expand canonical check to all 5 edge stores | 236 |
| I | Donor `total-political-spend` from monetary edges (135 donors) | 315 |
| J | Edge-based FEC/IRS citations (90 profiles) | 397 |
| K | Chamber-branched politician typeReqs | 446 |

**Scripts shipped:**
- `scripts/reclassify-readiness.cjs` — 5-tier system + `--diagnose` mode
- `scripts/backfill-last-enriched.cjs`
- `scripts/backfill-committee-assignments.cjs`
- `scripts/backfill-fec-candidate-totals.cjs`
- `scripts/backfill-bills-sponsored.cjs`
- `scripts/backfill-donor-spend-totals.cjs`
- `scripts/harvest-profile-sources.cjs` — canonical-ID-based Tier 1 URLs
- `scripts/harvest-edge-citations.cjs` — edge-based parameterized FEC search URLs

**Rules + docs updated to match:**
- CLAUDE.md rules 5, 9, 10, 11
- `content/Vault Rules.md` § 1 (full 6-tier table including s-tier)
- `content/Profile Template.md` (promotion flow split)
- `ops/src/lib/vault.ts` — type + color (cyan `#06b6d4`)
- `ops/src/app/api/profile/readiness/route.ts` — VALID_TIERS

**13 one-shot scripts archived** to `scripts/_archive/` with README entry.

---

## Arc 2 — Rendering passes

David reviewed the first live-exposure deploy and found critical issues:
AUTO-GENERATED banner wrong for editorial profiles, tabs rendering at
bottom instead of top, same content appearing in every tab, state-
politician profiles missing tabs entirely.

**Immediate mitigation:** flipped `TIER_GATED_PUBLISHING = false` and
removed the DataCompleteBanner component from the layout. The 446
profiles returned to 404 on the public site while we fixed rendering.

Then four iterative passes on the transformer + components:

**Pass 1** (`wrap-profile-sections.ts` created): wraps each
`<!-- auto:X -->` auto-block in `<div class="profile-section-card"
data-tab="...">` so ProfileTabs can find and group them. Also wraps the
Sources heading. 42 auto-block types mapped to politician / presidential
/ donor tab buckets.

**Pass 2**:
- Extended `isProfilePage` to all publishable types (state-politician,
  local-politician, pac, corporation, think-tank, lobbying-firm) so
  ProfileHeader renders on them
- Widened `ProfileHeader` internal gate (was politician/donor only)
- Widened `ProfileTabs` donor-subtype detection to include corporation/
  pac/think-tank/lobbying-firm
- H2_TAB_MAP regex widened from `^##` to `^#{2,3}` so H3 editorial
  sections match (most donors use `### Who They Are`)

**Pass 3** (the rewrite): replaced the keyword-only matcher with a
heading-scan approach. Every H2/H3 in the body is found, its direct
content range computed (heading → next heading, any level — disjoint
wrapping, no nesting), and wrapped with a section-card. Skips sections
containing auto-block markers (wrapBlocks owns those) and the Sources
heading (wrapSourcesSection owns that). Fixes the "same content on
every tab" bug that came from unwrapped editorial prose rendering
regardless of active tab.

Koch Network (1,164-line profile) previously crashed the HTML parser
with nested divs; pass 3's disjoint wrapping resolved it. Emitted
302KB, 108 cards.

**Pass 4** (polish based on live-preview feedback on Koch/AEI/Crow):
- Koch had 78 Overview cards from the catch-all fallback. Added
  **positional inheritance**: unmatched headings inherit the tab of
  the last-matched heading. Koch overview: 78 → 15.
- Renamed "Recipients" tab → **"Financials"** for donor-like profiles.
- Moved `data-panel` auto-block (contains "Total political spend")
  from Overview → Financials so the headline numbers live with the
  other money tables instead of crowding the bio area.
- Added 15+ new keyword patterns (Network Spending, Think Tank
  Pipeline, Donor Summit, Graveyard, Killed-by, Donation-to-Policy,
  Revenue History, etc.).
- **Scroll animation fix**: previous 500ms fade × 0.05s per-card
  stagger caused cascading "loading lag" on dense profiles. New:
  180ms no-stagger, IntersectionObserver `rootMargin: 200px` so
  cards fade in before entering viewport (invisible during normal
  scrolling).
- **CSS perf**: `content-visibility: auto` + `contain-intrinsic-size`
  + `contain: layout style` on `.profile-section-card`. Browser skips
  layout/paint for off-screen cards.

**Verification via local preview (`localhost:8095` static-preview,
desktop viewport)**: Harlan Crow 23 cards across 6 tabs; AEI 2/15/2/1
overview/financials/wins/analysis; Koch 108 cards spread cleanly;
Barre Seid Financials populated. David approved the structure.

---

## Arc 3 — Enrichment sprint (kicked off end of session)

`scripts/enrichment-sprint.sh` — 25-step wrapper that runs every local
bulk ingest, aggregate, cache rebuild, and today's backfill scripts in
sequence. Error-tolerant (one failure doesn't kill the chain), logs per
step to `/tmp/enrichment-<timestamp>.log`, status to
`/tmp/enrichment-status.log`.

**Purpose:** refresh canonical stores from the 60 GB of bulk CSVs on
disk so profiles that weren't matched earlier today pick up new data on
their next backfill pass. Prediction: data-complete count 446 → somewhere
in 800–1,200 range.

**Still running when session ended.** Status tracked via Monitor tool
streaming OK/FAIL events. Expected runtime 2–4 hours mostly waiting on
`ingest-fec-indiv-aggregate` (19 GB of individual contributions) and
`ingest-irs-990-bulk` (25 GB of 990 filings).

Partial failures observed during first hour: `ingest-fec-pac-summary`
(readdir on missing bulk dir), `ingest-fec-oth-bulk` (missing
`oth00.zip`), `ingest-fec-oppexp-bulk` (died partway through cycle 10).
Non-blocking — subsequent steps use whatever canonical state exists.

---

## State at end of session

- **Worktree:** `claude/infallible-leavitt-bef781` clean, committed,
  pushed to origin
- **v4:** all work merged; kill-switch `TIER_GATED_PUBLISHING = false`
- **Public site:** unchanged from pre-session (9 allowlisted routes only)
- **Enrichment sprint:** running in background; monitor will notify on
  completion
- **Data-complete profiles:** 446 classified, rendered correctly in
  `public/`, not publicly exposed
- **Preview:** `localhost:8095` serving current build for local review

## Open items / next-session picks

1. **Verify enrichment sprint output** once it finishes — diagnose
   report should show new data-complete count; review failure log for
   any ingests worth re-running with different paths.
2. **Decide when to flip the kill-switch.** Rendering passes 1–4 make
   exposure safe. No blocker to enabling other than David's final sign-
   off on the visual design.
3. **Rendering architecture ADR** — document the section-card /
   tab-wrapping system so it's not lore (in progress this session).
4. **Timeline sidebar** — David mentioned wanting a unified timeline
   in the right column. Scoped as polish, not critical.
5. **Overview tab density** on extremely large profiles (Koch) — still
   acceptable per David's read; revisit only if more complaints.
6. **State/local politician enrichment gap** — federal bulk doesn't
   have state-level campaign finance. Need a separate pipeline for
   state-politician / local-politician data. Post-launch.

## Commits shipped today (v4)

```
fd3caf1ca  Untrack data/legislator-positions/ (595MB) + draft ADR-0017
9de9b777b  Delete 4 upstream-only Quartz workflows
21c497528  ADR-0017: data-complete tier + derived cleanup + scripts report
73da39324  ADR-0017 renderer + tier-gated publishing + auto-promote + scripts archive
4f35af7de  ADR-0017: rules + ops integration
370d1e342  reclassify-readiness: add --diagnose mode for data-complete bottlenecks
1e89071f4  Session A: backfill last-enriched on 978 never-stamped profiles
95bc3efad  Session B: drop vestigial contradictionsClear check → +72 data-complete
00072ccc3  Session C (partial): hasConnections queries canonical store per rule 1
b15489a4c  Session D: harvest-profile-sources → data-complete 91 → 165
2d334fe4c  Session E: backfill committee assignments → data-complete 165 → 188
5fb4f1546  Session F: backfill FEC candidate totals on 313 politicians
5d82d2c20  Session G: backfill bills-sponsored → data-complete 188 → 201
0a130a19f  Session H: expand hasConnections to all canonical edge stores
ca8e0bbfe  Session I: donor total-political-spend backfill → data-complete 236 → 315
bcfaab134  Session J: edge-based FEC/IRS citations → data-complete 315 → 397
24a5a9e09  Session K: branch politician typeReqs by chamber → 397 → 446
f13adddd6  Pull data-complete tier off public exposure; remove DataCompleteBanner
b1f76b1e4  Wrap profile auto-blocks + Sources in ProfileTabs section-cards
647349f36  Rendering pass 2: H3 editorial wrapping + all profile subtypes get tabs
91758ae7e  Rendering pass 3: disjoint heading-scan wrapping
77304517f  Rendering pass 4: reduce overview overflow, rename Financials, snappier scroll
```

~23 commits. ~15,000+ lines of code + data changes across 1,500+ files.
