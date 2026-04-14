---
title: "ADR-0007: Phase 4 Claim-Object Experiment — Initial Findings"
type: decision
adr: 7
date: 2026-04-14
status: approved
authors: [Code Claude, David]
extends: ADR-0003
---

# ADR-0007: Phase 4 Claim-Object Experiment — Initial Findings

## Context

ADR-0003 Phase 4 scope: "can we render a profile page from a list of claim objects plus a thin synthesis prose layer, instead of writing a monolithic prose profile?" The experiment target was AOC — the vault's most editorially-nuanced profile (working-class origin, unusual funding model, internal Democratic conflicts). If the pattern works for AOC, it works for anything.

The experiment design per ADR-0003:
- Extract factual claims into `data/claims/aoc.jsonl`
- Write interpretive prose scaffold in `data/claims/aoc-synthesis.md`
- Quartz plugin activates on `claim-object: true` frontmatter
- Compare rendered result to the existing prose profile side-by-side

## What was built

### Schema + store (`scripts/lib/claims-{schema,store}.cjs`)

Per-profile JSONL storage under `data/claims/{slug}.jsonl`. Each claim record:
- `id` — `claim_NNNNNN` minted per-profile
- `profile_slug` — which profile this claim belongs to
- `text` — the load-bearing fact, short and standalone
- `category` + `section_key` — maps to rendering section in synthesis.md
- `source_ref` OR `source_fallback_url` — **validator requires at least one**, this is the defamation firewall
- `confidence` — high / medium / low
- `data` — optional structured payload (amount, date, bill, etc.)
- `verified` / `verified_at` / `verified_by` — editorial lifecycle

### Quartz transformer (`quartz/plugins/transformers/claim-object.ts`)

Runs at the `textTransform` stage BEFORE `SourceRefs` and `ObsidianFlavoredMarkdown`. On any file with `claim-object: true` + `claims-slug: {slug}` frontmatter:

1. Load `data/claims/{slug}.jsonl` and `data/claims/{slug}-synthesis.md`
2. Replace `<!-- CLAIMS: {section_key} -->` markers in synthesis with bulleted lists of matching claims
3. Each claim renders as `- {text} {{src:ID}}` or `- {text} [source](url)` depending on whether it has a registry ref or a fallback URL
4. Preserve the file's frontmatter, replace the body with the assembled rendering

Unknown or missing slug / missing synthesis file produces a visible warning in the body (not a silent skip) so editors see the problem immediately.

### Seed data

15 starter claims across 6 section keys (identity, funding, positions, votes, alliances, moments) populated via `scripts/seed-aoc-claims.cjs`. Every claim has a `source_fallback_url` pointing at primary sources (bioguide, FEC, clerk.house.gov, Congress.gov, NYT, White House Oversight) — a follow-up pass registers them in `sources.jsonl` and swaps to `src_` refs via the normal source registry workflow.

Synthesis prose in `data/claims/aoc-synthesis.md` is the only editorial voice layer. Every factual assertion in synthesis is either a claim with a source or framing prose that connects claims. The file is deliberately narrow about editorial judgments beyond "the data says X."

### Test render

`content/Politicians/Democrats/House/Alexandria Ocasio-Cortez/_Alexandria Ocasio-Cortez (claim-object experiment).md` is a sidecar file (NOT a replacement for the existing Master Profile) with `claim-object: true` and `claims-slug: aoc`. The sidecar body is a deliberate fallback warning that should NEVER appear in the rendered output — if you see it, the transformer didn't fire.

Quartz build result:
- 2,291 files parsed in 21s
- 8,698 HTML emitted in 5m
- Exit 0
- Rendered HTML spot-checked for content from all 6 section keys: "Green New Deal", "Squad", "bartender", `section: funding` (from the synthesis headers) all present
- Fallback warning text "ClaimObject transformer didn't fire" NOT present → transformer successfully replaced the body

## Findings

### 1. The pattern works at the mechanical level
The transformer fires reliably, claims render in their correct section, synthesis prose provides the connective tissue, and the rendered result reads like a profile (not a database dump). The Quartz build time impact is negligible (within normal variance).

### 2. The source-backing rule is load-bearing
Requiring every claim to carry `source_ref` or `source_fallback_url` at the schema level is the single most important design decision. It makes the defamation firewall architectural instead of editorial vigilance — an unsourced claim cannot be added to the store because the validator rejects it. This is what the Phase 1 source registry unlocks: citation discipline becomes a compiler error, not a review item.

### 3. Section keys are the right granularity
Initial instinct was to make each sentence a claim, but that produces a choppy reading experience. The working granularity is **one fact per claim, grouped by section key, with synthesis prose providing the connective frame**. The 15-claim AOC seed covers a reasonable amount of the profile without feeling exhaustive.

### 4. Claim-object profiles are NOT a replacement for prose profiles yet
The current AOC experiment is a sidecar, not a replacement. The existing `_Alexandria Ocasio-Cortez Master Profile.md` prose profile remains the primary entry and has ~500 lines of editorial content that would take significant work to decompose into claims. The claim-object version is leaner but also less rich — there's genuine editorial nuance in the prose that gets lost when atomized.

**Verdict:** claim-object is the right pattern for NEW profiles where the editorial decision is made up-front, or for profiles being migrated with dedicated attention. It is NOT a pattern to retrofit onto the 1,167 existing profiles wholesale without an editorial pass per profile.

### 5. The opt-in frontmatter flag is the right switch
`claim-object: true` as a per-file flag (vs a vault-wide config or a folder convention) lets the pattern coexist with prose profiles without conflict. The transformer short-circuits when the flag isn't set, so files that don't opt in pay zero cost.

## Decision

**Approve the claim-object pattern as an opt-in tool, not as a migration target.**

1. **Phase 4 ships as-is** — the schema, store, transformer, AOC seed, and synthesis scaffold are the working foundation. The pattern is production-ready for any new or migrated profile that opts in.

2. **New politician profiles should default to claim-object** going forward, because the up-front editorial discipline is cheaper than retrofitting. New donor profiles can choose — the policy page generator has already proved that rendering from canonical data works for category-level profiles, so donor profiles might benefit more from the data-panel pattern (already shipped in Phase 3) than from full claim-object decomposition.

3. **The existing 1,167 prose profiles stay prose** unless and until an editorial pass migrates them individually. No vault-wide conversion script.

4. **The Phase 3 data panel pattern is the complementary move** — existing prose profiles get live data panels without body rewrites, claim-object profiles get atomized facts with synthesis. Both patterns coexist.

5. **The AOC prose profile keeps its Master Profile title** and the claim-object version lives at `_Alexandria Ocasio-Cortez (claim-object experiment).md` for comparison. This is deliberately unresolved — future editorial decision on which becomes canonical.

## What this closes

- The Phase 4 question of whether claim-object rendering is viable (yes, mechanically)
- The question of whether it's a migration target (no, opt-in only)
- The defamation firewall implementation — structural schema enforcement wins over post-hoc review

## What this opens

- **Source registry migration for the 15 AOC claims** — follow-up task: register each `source_fallback_url` in `sources.jsonl` via `addOrFindSource`, swap to `src_` refs in the claim records
- **Editorial policy for new profiles** — which profile types default to claim-object, which default to prose
- **Synthesis prose voice guidelines** — what belongs in synthesis vs what belongs in a claim (no rule yet)
- **Claim-object editing workflow in Ops** — currently requires direct JSONL editing; a future Ops `/claims` page could make adding claims interactive
- **Tier-gating for the data panels the claim-object pattern implies** — the panel would show different claim counts by viewer tier in Phase 2.5

## Meta note

Phase 4 shipped faster than the 1–2 session estimate because the Phase 2 + Phase 2.75 + Phase 3 work had already proved the relevant patterns (schema/store convention, lazy-load + cache, Quartz transformer hook, read-only TS mirror for build time). Phase 4 was a remix of components built earlier, not new infrastructure.
