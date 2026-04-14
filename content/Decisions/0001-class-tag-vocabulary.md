---
title: "ADR-0001: Class Tag Vocabulary"
type: decision
adr: 1
date: 2026-04-14
status: approved
authors: [Code Claude, David]
supersedes: null
superseded-by: null
---

# ADR-0001: Class Tag Vocabulary

## Context
The Donor Map query engine needs a structured vocabulary for tagging entities with class-analysis metadata. Without a locked vocabulary, each tagging run would drift, queries would return inconsistent results, and migrations would be painful.

Additionally, the vocabulary must reflect the site's editorial lens (class analysis) — a neutral-sounding schema like "sector: Energy" fails to surface the power relationships the project exists to expose.

## Options considered

1. **Neutral technocratic schema** — sectors, dollar amounts, NAICS codes. Rejected: reduces us to a prettier FEC.gov with no editorial distinctiveness.

2. **Freeform tags** — let both Claudes tag as they see fit. Rejected: drift, duplication, impossible to query reliably.

3. **Locked class-analysis vocabulary** with five dimensions. Approved.

## Decision
Locked vocabulary with five dimensions: `capital_type`, `class_position`, `ideological_function`, `worker_relationship`, `policy_stakes`. Plus a mirror schema for politicians focused on alignment.

Full vocabulary in `content/Class Tag Vocabulary.md`.

## Rationale
- Class analysis is the project's editorial differentiator
- Multi-select on `ideological_function` surfaces contradictions (e.g. `progressive-capital` tag for DEI-washing)
- `policy_stakes` is the one mutable dimension, growing as the vocabulary proves inadequate
- Worked examples locked in the doc prevent drift on edge cases

## Consequences
- Changes to the vocabulary require new ADR + migration pass
- Both Claudes must reference `content/Class Tag Vocabulary.md` for all tagging
- Ops `/class-tags` UI dropdowns derive from the vocabulary — single source of truth
- Query engine filters are built against these tags; any change cascades

## What this closes
- Ambiguity on how donors are categorized in the query engine
- Editorial drift risk in tagging runs

## What this opens
- Need for governance on policy_stakes growth (quarterly review)
- Need for migration tooling when vocabulary changes
