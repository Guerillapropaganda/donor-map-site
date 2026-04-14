---
title: "ADR-0002: Monetization Model"
type: decision
adr: 2
date: 2026-04-14
status: approved
authors: [Code Claude, David]
---

# ADR-0002: Monetization Model

## Context
The Donor Map has ongoing operational costs (pipelines, APIs, hosting) and David's labor is unsustainable without revenue. At the same time, the editorial mission requires that facts remain free and accessible. A model is needed that funds the project without paywalling knowledge.

## Options considered

1. **Full paywall** — all content behind a subscription. Rejected: kills the editorial mission and the marketing funnel.

2. **Donations only** — ask for support, hope for the best. Rejected: unreliable, doesn't scale, doesn't capture value from professional users.

3. **Ads** — monetize free readers. Rejected: incompatible with editorial integrity and investigative mission.

4. **Facts free, tools paid** (freemium with clear line). Approved.

## Decision
Tiered model:
- Free: all content, search, sources, stories, basic Capitol Trades
- Free-auth: lead-gen tier with 5 queries/day
- Researcher $20/mo: full query engine, data panels, export, alerts
- Newsroom $150/mo: API, bulk, team seats, priority
- Patron $500 one-time: lifetime Researcher

Details in `content/Monetization Model.md`.

## Rationale
- Facts stay free → editorial mission preserved → marketing funnel intact
- Professional users get professional tools they'll pay for
- Vault stays open-source on GitHub — anyone can fork but forks stale fast
- Paid value is freshness + tooling + labor, not the facts themselves

## Consequences
- Every new `/api/*` route must pass through tier-check middleware
- Phase 2.5 auth layer is non-negotiable before Phase 3 data panels ship
- Clerk chosen as auth provider for speed
- Stripe for payments

## What this closes
- Uncertainty on whether content goes behind paywall
- Auth/payment architecture decision

## What this opens
- Need for pricing validation after Phase 3 launch
- Need for student discount application workflow
- Ongoing governance: tier changes require new ADR
