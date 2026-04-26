---
title: Source Corroboration Audit
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-16'
generated-by: scripts/security/source-corroboration-audit.cjs
note-kind: report
---

# Source Corroboration Audit

**Scan date:** 2026-04-16
**Total edges:** 74064

| Category | Count | % of total |
|----------|------:|----------:|
| No source at all | 0 | 0.0% |
| Single source only | 74064 | 100.0% |
| Multiple sources, same domain | 0 | 0.0% |
| Well-corroborated (2+ domains) | 0 | 0.0% |

## Single-source edges (74064)

These edges have exactly one backing source. Single-source data is vulnerable to source corruption.

| Domain | Single-source edges |
|--------|-------------------:|
| unknown | 74064 |

## Recommendations

1. Prioritize adding a second independent source to high-dollar monetary edges
2. FEC-sourced edges should be cross-referenced with state campaign finance databases
3. No-source edges should be registered through the source registry before any public launch