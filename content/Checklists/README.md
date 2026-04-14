---
title: Checklists
type: index
last-updated: 2026-04-14
---

# Checklists

Single-page gates for recurring high-stakes operations. Every checklist here is load-bearing — skipping one has produced real incidents in the past.

| Checklist | When to use | Enforcer |
|---|---|---|
| [Pre-Publication](pre-publication.md) | Before any profile / policy page / story goes on a public URL | `scripts/publication-readiness-check.cjs` |
| [New Data Store](new-data-store.md) | When adding a ninth (or later) canonical JSONL store to `data/` | Manual + ADR + regression tests |
| [New Pipeline](new-pipeline.md) | When building a pipeline that ingests from a new external API | Pipeline Research Protocol + Pipeline Guide |

## Rule of thumb

Every checkbox is in the list because skipping it caused a real bug. Don't delete items. If an item becomes obsolete, write an ADR explaining why, then remove.
