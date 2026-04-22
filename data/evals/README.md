---
title: Query Engine Evals
type: system
---

# Query Engine Eval Harness

Golden-query regression suite for `scripts/lib/query-engine.cjs` and the
Ask API handlers it backs. Every entry in `queries.jsonl` is a known
good query with an expected-result contract. The runner
(`scripts/eval-query-engine.cjs`) executes each one, compares, and
reports pass/fail.

## Why

The query engine has a 37-test contract suite that locks in API shape.
But shape-correctness isn't accuracy-correctness — a query that
returns `{subject, total, returned, rows}` can still return the *wrong*
rows, or miss rows, or show totals that contradict FEC summary data.
ADR-0016 (Ask labeled breakdown) documented this problem.

This harness tests accuracy — does "who funds Bernie" return
something plausibly Bernie-shaped? Does the money_chain from Marble
Freedom Trust to Leonard Leo's committees surface? Does the AOC
donors_to panel return ≥1 row with ActBlue (the canonical committee
he runs through)?

## Format

`queries.jsonl` — one JSON object per line. Fields:

```json
{
  "id": "unique-slug",
  "description": "What this query tests",
  "spec": { "subject": "edges", "filters": { ... } },
  "expect": {
    "minTotal": 10,             // result.total must be >= this
    "maxTotal": 100000,          // and <= this (optional)
    "rowFieldExists": ["from", "amount"],  // every row must have these fields non-null
    "rowFieldContains": {         // at least one row must have field ~= value
      "from": "Bernie Sanders"
    },
    "rowFieldMinValue": {         // at least one row must have field >= value
      "amount": 10000
    }
  }
}
```

All `expect` fields are optional. If no checks are present, the test
only asserts that the query executed without throwing.

## Running

```bash
# Run all evals
node scripts/eval-query-engine.cjs

# Run one by id
node scripts/eval-query-engine.cjs --id donors_to_bernie_basic

# Run evals matching a pattern
node scripts/eval-query-engine.cjs --grep donors_to

# Verbose (show actual vs expected for each check)
node scripts/eval-query-engine.cjs --verbose

# JSON output (for CI consumption)
node scripts/eval-query-engine.cjs --json
```

## Exit codes

- `0` — all passed
- `1` — one or more failed
- `2` — harness error (missing data store, malformed jsonl, etc.)

## Adding new evals

When a query bug is reported and fixed, add a new line to
`queries.jsonl` covering the fixed case. The next run verifies the fix
stays fixed on future engine changes.

Golden data notes:
- Evals run against the LIVE canonical stores in `data/`. If a store
  gets re-ingested and drifts, totals can shift. Expected values use
  `minTotal`/`maxTotal` ranges rather than exact numbers.
- Entity names use the canonical title spelling from `data/entities.jsonl`.
- Amount filters target cycle-specific data where applicable to stay
  stable across re-ingests.
