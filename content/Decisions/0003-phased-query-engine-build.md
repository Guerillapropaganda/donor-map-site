---
title: "ADR-0003: Phased Query Engine Build"
type: decision
adr: 3
date: 2026-04-14
status: approved
authors: [Code Claude, David]
---

# ADR-0003: Phased Query Engine Build

## Context
Planning session identified the Donor Map should transition from blog-shape (profile-centric) to system-shape (structured data with query front door), while preserving the editorial narrative layer as marketing funnel. The transition touches source citations, profile rendering, tagging, auth, and story surfacing. Too large for a single build.

## Options considered

1. **Big bang rewrite** — new architecture, migrate everything at once. Rejected: would stall on 1,600 profiles, high risk of broken state.

2. **Parallel system** — build new system alongside, cut over when done. Rejected: duplicate maintenance, unclear cutover point.

3. **Phased migration** with strict phase gates and exit criteria. Approved.

## Decision
Eight sequential phases:
- Phase 1: Source Registry + generic-link cleanup (foundation)
- Phase 2: Query Engine MVP with class tags
- Phase 2.75: Policy Battles MVP — first user-facing product (added via ADR-0004)
- Phase 2.5: Auth & Gating (non-skippable, now ships AFTER 2.75 so policy pages launch free)
- Phase 3: Profile Data Panels
- Phase 4: Claim-Object Experiment (AOC)
- Phase 5: Story Score
- Phase 6: Bug Hunt / Hardening (final gate, added via ADR-0005)

Each phase has exit criteria, a handoff doc, a decisions log, and a retrospective. Phase transitions use the `phase-transition` skill.

Details in `content/Build Phases.md`.

## Rationale
- Each phase delivers standalone value
- Phase 1 foundation unlocks everything downstream
- Phase 2.5 must exist before Phase 3 to avoid retrofitting auth
- Claim-object experiment validates before committing to vault-wide change
- Story score needs all prior structured data to exist

## Consequences
- No phase skipping (enforced by the phase-transition skill)
- Each session starts by reading `content/Build Phases.md` + current handoff
- `content/Phases/phase-N/` folder structure per phase
- ADR entries for any mid-phase architecture changes

## What this closes
- Uncertainty on build order
- Risk of parallel builds colliding

## What this opens
- Need for phase-transition ceremony
- Need for session start/end checklists that reference Build Phases
- Ops `/phases` dashboard to surface current state
- **Policy Battles Page — now Phase 2.75 via ADR-0004.** What started as a noted-but-unscoped idea became a full phase after a riff session on 2026-04-14. Slotted between Phase 2 (Query Engine) and Phase 2.5 (Auth), so policy pages ship as the user-facing product BEFORE auth gating lands. See ADR-0004 and `content/Phases/phase-2.75/`.
