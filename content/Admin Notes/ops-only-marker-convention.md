---
title: ops-only marker convention
type: convention
status: active
last-updated: 2026-04-27
---

# `<!-- ops-only -->` marker convention

## What it is

A way for build scripts to emit content that:
- **Renders visibly** in ops preview surfaces (currently `/policies` preview tab)
- **Is hidden** on the public site (HTML comments — invisible in the rendered page; preserved in HTML source per the same pattern as the placeholder transformer in CLAUDE.md rule 8)

Use it for build provenance, methodology footnotes, coverage caveats, advisory flags — anything David should see while reviewing a draft in ops but a public reader doesn't need.

Established 2026-04-27 alongside the /policies UX redesign. First consumer: `scripts/build-policy-pages.cjs`.

## Syntax

```markdown
<!-- ops-only

This content renders as a styled "🔒 ops-only context" callout in ops preview,
and is invisible (HTML comment) on the public site.

-->
```

The wrapper is **one HTML comment** from `<!-- ops-only` through `-->`. CommonMark treats this as a type-2 HTML block — content inside is literal, markdown is NOT processed by the public Quartz build.

Multi-line content is fine. Markdown inside (bold, lists, code, wikilinks) is preserved as raw text by the public build, and rendered correctly when the ops preview's `revealOpsOnly()` extracts the inner content into a blockquote.

### Why single-comment, not two markers

An earlier draft used `<!-- ops-only -->...<!-- /ops-only -->` — two separate HTML comments with markdown content between them. This **does not hide the content** because Quartz strips the comment tags themselves but parses everything between them as normal markdown. Verified via micromark on 2026-04-27: only the single-comment form produces inert output.

## How it works

| Surface | Mechanism | Result |
|---|---|---|
| Public site (Quartz) | Default markdown rendering | HTML comments, invisible to readers |
| Ops preview (`/policies`) | `revealOpsOnly()` preprocessor in `ops/src/app/policies/page.tsx` runs *before* react-markdown | Converts each block into a markdown blockquote with a "🔒 ops-only context" header line |

The preprocessor regex: `/<!--\s*ops-only\s*([\s\S]*?)\s*-->/g`

## Where to use it

Build scripts that emit markdown destined for `content/` and consumed by both Quartz (public) and an ops preview surface. Examples that already exist or are planned:

- `scripts/build-policy-pages.cjs` ✓ (class-analysis methodology, donor-table coverage caveat, build provenance footer)
- Future: any other generated page where the ops reviewer needs context the public reader doesn't

## Adding a new ops preview surface

If you build a new ops page that previews vault markdown via react-markdown, copy the `revealOpsOnly()` helper from `ops/src/app/policies/page.tsx` and run input through it before `<ReactMarkdown>`. Two lines.

If react-markdown ever gets replaced with a Quartz iframe in ops preview (so ops + public render via the same engine), this whole convention can be replaced by a Quartz transformer that converts `<!-- ops-only -->` blocks into a CSS-class-tagged div with `display: none` on public + `display: block` in an "ops-mode" stylesheet. Single source of truth, no preprocessor.

## What this is NOT

- **Not a security boundary.** HTML comments are still in the page source (visible via "view source"). For genuinely confidential content, don't emit it to public-bound markdown at all.
- **Not a permission system.** Any reader who knows to look at HTML source can read it. Treat it as "for the casual reader, hidden" not "secret."
- **Not for editorial firewall content** (ADR-0004). Sensitive editorial framing needs full review before emission, not a comment marker.

## Reverting the convention

If we ever want to remove the marker pattern:
1. Strip the `<!-- ops-only -->` / `<!-- /ops-only -->` lines from build scripts
2. Either inline the formerly-wrapped content (visible everywhere) or delete it
3. Remove `revealOpsOnly()` from `ops/src/app/policies/page.tsx`

Idempotent in both directions — markers are just HTML comments in the source.
