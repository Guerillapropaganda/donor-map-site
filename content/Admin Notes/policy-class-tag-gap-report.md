---
title: "Policy Class-Tag Gap Report"
type: admin-note
note-type: data
status: open
last-updated: 2026-04-15
generator: scripts/policy-class-tag-gap-report.cjs
---

# Policy Class-Tag Gap Report

For each v1 policy page, which class-tag approvals are needed to pass CLAUDE.md Rule 11 (no `content-readiness: verified` promotion if any cited entity has class tags in `status: pending`). This is the MOST targeted unblock list for publication readiness on the /policies soft-launch path.

**Three categories per policy:** `pending` (entity has heuristic proposal awaiting David's review — approve in Ops /class-tags), `no-proposal` (entity exists but was never run through the heuristic pass — needs a re-run or manual tagging), `no-entity` (wikilink doesn't resolve to any entity in the registry — needs entity creation or link fix).

## Summary by policy

| Policy | Unique entities | Approved | Pending (Rule 11 blockers) | No-proposal | No-entity |
|---|---:|---:|---:|---:|---:|
| [aipac_bds](/content/Policies/aipac_bds.md) | 10 | 4 | **4** | 2 | 0 |
| [healthcare](/content/Policies/healthcare.md) | 10 | 4 | **4** | 2 | 0 |
| [housing](/content/Policies/housing.md) | 10 | 4 | **4** | 2 | 0 |
| [minimum_wage](/content/Policies/minimum_wage.md) | 10 | 4 | **4** | 2 | 0 |
| [student_debt](/content/Policies/student_debt.md) | 10 | 4 | **4** | 2 | 0 |
| [who-blocks-us](/content/Policies/who-blocks-us.md) | 20 | 0 | **0** | 0 | 20 |

**Interpretation:** a policy page becomes Rule-11-unblocked when the **Pending** column hits 0. The other categories (`no-proposal`, `no-entity`) are data-completeness gaps but don't block Rule 11 specifically — they block the publication-readiness gate through other paths (entity must exist in registry, entity must have approved tags).

## aipac_bds

### 🔴 Pending approval (4) — approve these in Ops /class-tags first

| Entity | Citations on this page | Proposed capital_type | Proposed class_position |
|---|---:|---|---|
| Western Growers Association | 1 | agribusiness-capital | petty-bourgeois |
| Majority Forward | 1 | dark-money-vehicle | — |
| California Farm Bureau Federation | 1 | agribusiness-capital | petty-bourgeois |
| Boeing | 1 | military-industrial | — |

### 🟡 No proposal yet (2) — entity exists, heuristic pass hasn't run

These entities are in `data/entities.jsonl` but don't have a record in `data/entity-class-tags-proposed.jsonl`. Run `node scripts/batch-propose-class-tags-heuristic.cjs --write` to generate proposals for them.

| Entity | Citations on this page |
|---|---:|
| Bank of America | 1 |
| National Republican Senatorial Committee | 1 |

## healthcare

### 🔴 Pending approval (4) — approve these in Ops /class-tags first

| Entity | Citations on this page | Proposed capital_type | Proposed class_position |
|---|---:|---|---|
| Western Growers Association | 1 | agribusiness-capital | petty-bourgeois |
| Majority Forward | 1 | dark-money-vehicle | — |
| California Farm Bureau Federation | 1 | agribusiness-capital | petty-bourgeois |
| Boeing | 1 | military-industrial | — |

### 🟡 No proposal yet (2) — entity exists, heuristic pass hasn't run

These entities are in `data/entities.jsonl` but don't have a record in `data/entity-class-tags-proposed.jsonl`. Run `node scripts/batch-propose-class-tags-heuristic.cjs --write` to generate proposals for them.

| Entity | Citations on this page |
|---|---:|
| Bank of America | 1 |
| National Republican Senatorial Committee | 1 |

## housing

### 🔴 Pending approval (4) — approve these in Ops /class-tags first

| Entity | Citations on this page | Proposed capital_type | Proposed class_position |
|---|---:|---|---|
| Western Growers Association | 1 | agribusiness-capital | petty-bourgeois |
| Majority Forward | 1 | dark-money-vehicle | — |
| California Farm Bureau Federation | 1 | agribusiness-capital | petty-bourgeois |
| Boeing | 1 | military-industrial | — |

### 🟡 No proposal yet (2) — entity exists, heuristic pass hasn't run

These entities are in `data/entities.jsonl` but don't have a record in `data/entity-class-tags-proposed.jsonl`. Run `node scripts/batch-propose-class-tags-heuristic.cjs --write` to generate proposals for them.

| Entity | Citations on this page |
|---|---:|
| Bank of America | 1 |
| National Republican Senatorial Committee | 1 |

## minimum_wage

### 🔴 Pending approval (4) — approve these in Ops /class-tags first

| Entity | Citations on this page | Proposed capital_type | Proposed class_position |
|---|---:|---|---|
| Western Growers Association | 1 | agribusiness-capital | petty-bourgeois |
| Majority Forward | 1 | dark-money-vehicle | — |
| California Farm Bureau Federation | 1 | agribusiness-capital | petty-bourgeois |
| Boeing | 1 | military-industrial | — |

### 🟡 No proposal yet (2) — entity exists, heuristic pass hasn't run

These entities are in `data/entities.jsonl` but don't have a record in `data/entity-class-tags-proposed.jsonl`. Run `node scripts/batch-propose-class-tags-heuristic.cjs --write` to generate proposals for them.

| Entity | Citations on this page |
|---|---:|
| Bank of America | 1 |
| National Republican Senatorial Committee | 1 |

## student_debt

### 🔴 Pending approval (4) — approve these in Ops /class-tags first

| Entity | Citations on this page | Proposed capital_type | Proposed class_position |
|---|---:|---|---|
| Western Growers Association | 1 | agribusiness-capital | petty-bourgeois |
| Majority Forward | 1 | dark-money-vehicle | — |
| California Farm Bureau Federation | 1 | agribusiness-capital | petty-bourgeois |
| Boeing | 1 | military-industrial | — |

### 🟡 No proposal yet (2) — entity exists, heuristic pass hasn't run

These entities are in `data/entities.jsonl` but don't have a record in `data/entity-class-tags-proposed.jsonl`. Run `node scripts/batch-propose-class-tags-heuristic.cjs --write` to generate proposals for them.

| Entity | Citations on this page |
|---|---:|
| Bank of America | 1 |
| National Republican Senatorial Committee | 1 |

## who-blocks-us

### ⚪ No entity in registry (20) — wikilink doesn't resolve

These wikilinks on the policy page point to names that don't exist in `data/entities.jsonl`. Either the entity needs to be created (data gap), or the wikilink is a typo (content gap).

| Wikilink target | Citations on this page |
|---|---:|
| 1 | 1 |
| 2 | 1 |
| 3 | 1 |
| 4 | 1 |
| 5 | 1 |
| 6 | 1 |
| 7 | 1 |
| 8 | 1 |
| 9 | 1 |
| 10 | 1 |
| 11 | 1 |
| 12 | 1 |
| 13 | 1 |
| 14 | 1 |
| 15 | 1 |
| 16 | 1 |
| 17 | 1 |
| 18 | 1 |
| 19 | 1 |
| 20 | 1 |

---

*Regenerate: `node scripts/policy-class-tag-gap-report.cjs --write`. Re-run after each approval batch to see updated policy unblock status.*
