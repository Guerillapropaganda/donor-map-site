---
title: Pre-Publication Checklist
type: checklist
scope: every public-facing profile, policy page, story, or route
last-updated: 2026-04-14
authority: ADR-0008
enforcer: scripts/publication-readiness-check.cjs
---

# Pre-Publication Checklist

Every public-facing profile, policy page, or story passes through this gate before it's exposed on a live URL. The script `scripts/publication-readiness-check.cjs` enforces most of these automatically — exit code 0 means safe to publish, exit code 1 means blocked.

## Script-enforced gates (run `node scripts/publication-readiness-check.cjs --file <path>`)

- [ ] **`content-readiness: verified`** in frontmatter
- [ ] **No `(URL NEEDED)`, `(UNVERIFIED)`, `(NEEDS REVIEW)` markers** in visible text (Archived section excluded)
- [ ] **No strikethrough sources** in visible text — move to `## Archived` section first
- [ ] **Every `{{src:ID}}` ref resolves** to a source with `status: live` or `status: archived`. No `dead`, `generic_orphan`, `needs_review`, or `paywall`.
- [ ] **Every cited entity has approved class tags** — `class_tags.status: approved`, never `proposed`
- [ ] **`## Class Analysis` section present** (mandatory editorial rule, #1 in CLAUDE.md)

## Human-enforced gates (the script can't catch these)

- [ ] **Voice passes the mirror test.** No em dashes, no banned AI vocabulary (delve, moreover, furthermore, plethora, tapestry, testament to, etc.). The `self-review-mirror.cjs` pre-commit sentinel covers new lines; manually reread the full body.
- [ ] **Defamation-prone vocabulary absent.** No "bribed", "corrupt", "scheme", "fraud", "bought", "co-opted" outside of direct quote blockquotes. Class analysis tags carry the editorial weight — never the prose.
- [ ] **Factual claims trace to primary sources.** For prose profiles: every factual claim has an inline citation within 150 chars, OR the profile is flagged `editor-vouched: true` (meaning every claim is vouched for by the aggregated Sources section). For claim-object profiles: `data/claims/{slug}.jsonl` validates clean.
- [ ] **Precise descriptions, no implication.** The page describes what happened, not what the reader should conclude. Juxtaposition does the work.
- [ ] **For AIPAC or other legally sensitive pages:** David personal review + optional lawyer review complete. The `editor-vouched` flag is not self-set — it's set after the review.
- [ ] **OG card validates** on X / LinkedIn / Facebook debug tools (when OG cards are in scope).

## Route-level gates (site-wide, not per-profile)

- [ ] **Under-construction gating removed** on the public path serving this page
- [ ] **Tier middleware verified** — page is either explicitly free or properly gated
- [ ] **No private data leaks** — the public vault has no `.env`, no private JSONL files, no API keys, no Clerk/Stripe secrets

## How to run the check

```bash
# Single file
node scripts/publication-readiness-check.cjs --file "content/Policies/housing.md"

# One folder
node scripts/publication-readiness-check.cjs --folder Policies

# Everything (default)
node scripts/publication-readiness-check.cjs

# Machine-readable
node scripts/publication-readiness-check.cjs --json
```

## If the script says READY, is it safe to publish?

**Not automatically.** The script is necessary but not sufficient. It catches mechanical issues (missing frontmatter, broken refs, unapproved tags) but it cannot assess:

- Whether the prose is libel-risk-adjacent
- Whether the source cited actually supports the claim (vs being tangential)
- Whether the story is genuinely newsworthy or a nothingburger
- Whether the aggregated Sources section on an `editor-vouched` profile actually covers every claim

A green script result means "no mechanical blockers." A human (David or Research Claude) still reads the profile end-to-end before it ships.
