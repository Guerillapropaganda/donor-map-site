---
title: Bugs auto-resolver — predicate pattern
type: reference
status: open
kind: reference
last-updated: '2026-04-28'
auto-generated: false
---

# Bugs auto-resolver — Layer A predicate pattern

`scripts/bugs-auto-resolver.cjs` lets exit-criteria items declare a
predicate that, when satisfied, automatically flips the box from
`[ ]` to `[x]`. Runs daily at 04:24 UTC via the dispatcher, one minute
before `bug-queue-parser` regenerates the manifest at 04:25.

This closes the loop established 2026-04-27 when /bugs was ground to
zero. Without an auto-resolver, /bugs slowly drifts back up as
criteria get unchecked. With Layer A, criteria that have a clean,
machine-checkable predicate self-resolve.

## How to add a predicate to a criterion

Add an inline HTML comment at the end of the criterion line:

```markdown
- [ ] All harness JSON outputs parse <!-- auto-resolve-when: harness-check=harness-json-smoke-test -->
```

Multiple predicate forms supported (AND together — all must be true):

| Predicate | What resolves it |
|---|---|
| `harness-check=<name>` | Named harness check has `findings_count: 0` in latest `vault-audit-latest.json` |
| `regex=<pattern> source=<file>` | Regex matches content of the named file (relative to repo root) |
| `file-exists=<path>` | The named file exists |
| `jsonl-empty=<path>` | JSONL file has zero non-empty lines |

Values can be quoted with single or double quotes if they contain spaces.

## Examples

```markdown
- [ ] No story-pages-integrity findings <!-- auto-resolve-when: harness-check=story-pages-integrity -->

- [ ] Stories canonical store exists <!-- auto-resolve-when: file-exists=data/stories.jsonl -->

- [ ] Auth-smoke tests pass <!-- auto-resolve-when: harness-check=auth-smoke-tests -->

- [ ] False-positive log has been cleaned <!-- auto-resolve-when: jsonl-empty="content/Admin Notes/.false-positive-log.json" -->
```

## What auto-resolution looks like

When a predicate fires, the script flips the box and appends an
annotation explaining why:

```markdown
- [x] No story-pages-integrity findings <!-- auto-resolve-when: harness-check=story-pages-integrity --> <auto-resolved date="2026-05-01" reason="story-pages-integrity has 0 findings" />
```

The `<auto-resolved>` tag is searchable in case you want to find
which criteria self-resolved vs which got manual sign-off.

## When NOT to use an auto-resolve predicate

- Criteria that need editorial judgment (does the prose actually
  read well? is the tone right? — those stay manual).
- Criteria where the harness check exists but its zero-findings
  state doesn't actually mean the criterion is done. Be precise.
- Criteria that are tied to multi-system state. Layer A predicates
  AND together but each is a single check; complex preconditions
  belong in a custom harness check, not a Layer A predicate.

## Status

Layer A is the FIRST tier of auto-resolution. Future layers could
include:

- **Layer B**: producer-driven auto-uncheck when a previously-resolved
  criterion's predicate fails. Would let criteria self-correct
  in both directions.
- **Layer C**: predicate inheritance / composition (referencing other
  criteria's predicates).

Both deferred until Layer A demonstrates value with several criteria
opted in.

## Reference

- Producer: `scripts/bugs-auto-resolver.cjs`
- Dispatcher entry: `scripts/attention-dispatcher.cjs` (cron `24 4 * * *`)
- Pairs with: `bug-queue-parser` (cron `25 4 * * *`)
- Related pattern: `scripts/note-auto-resolver.cjs` (notes auto-resolver
  established 2026-04-27 morning — same predicate-evaluation shape)
