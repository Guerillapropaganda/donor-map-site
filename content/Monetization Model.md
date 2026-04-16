---
title: Monetization Model
type: system
status: active
last-updated: 2026-04-14
authority: ADR-0002
urls-first-triaged: "2026-04-15"
---

# Monetization Model

## Core principle

**Facts free. Labor and tooling paid.**

The database of facts is a public good and must remain free. What's paid for is the ongoing labor of maintaining freshness, the tooling for serious research, and the convenience of API / bulk / alert access.

This structure:
- Aligns with the editorial mission (knowledge should not be paywalled)
- Lets the free tier serve as marketing funnel for the paid tier
- Monetizes the people who get material professional value (journalists, researchers, opposition, academics, union staff, policy orgs)
- Keeps the vault open-source on GitHub — anyone can fork but forks stale fast

---

## Tier map

### Free — no account required

- All profile pages (prose, sidebar, event timeline, related profiles)
- Site-wide search
- All source links (live or archived)
- Homepage narrative / story features
- Capitol Trades basic view (tables, simple filters)
- RSS / event feed
- Attention queue public output (surfaced stories, not scoring internals)
- Class-analysis tags visible on profiles (read-only)

### Free — account required (lead-gen)

- 5 queries per day on `/query`
- 1 saved query
- 1 email alert subscription
- "Explain this row" disabled (upgrade prompt)

### Researcher — $20/month

- Unlimited queries
- Full profile data panels (live rendering from structured data)
- CSV export on any query
- Unlimited saved queries
- Unlimited alert subscriptions
- "Explain this row" AI calls
- Full class-tag filter access
- Historical query versioning (see what a query returned 6 months ago)

### Newsroom / Org — $150/month

- Everything in Researcher
- API access (rate-limited per minute, not per day)
- Bulk export (full JSONL dumps)
- 3 team seats (additional seats $10/month)
- Early access to new story candidates (before public attention queue)
- Priority on "data gaps I need filled" requests to David

### Patron — one-time $500

- Everything in Researcher, lifetime
- Name in credits (optional)
- For supporters who want to support without monthly billing

### Student / independent journalist discount

50% off Researcher ($10/month). Honor system + email verification. Apply via simple form, David approves manually.

---

## Non-negotiable free forever

These never go behind a paywall, regardless of future monetization pressure:

- All profile **content** (the facts themselves)
- All **source links**
- **Site search**
- **Homepage stories** and narrative layer
- **RSS feeds**
- **Attention queue output** (the stories it surfaces)
- **Capitol Trades basic view**
- The **GitHub vault** (open-source, anyone can clone)

If a future business pressure pushes against this, the principle wins.

---

## Technical implementation

### Auth provider
**Clerk** (chosen for speed of setup and generous free tier up to 10k MAU). Alternative if Clerk pricing becomes an issue: Supabase Auth.

### Payments
**Stripe Checkout** → webhook → tier update in user record.

### Schema

`data/users.jsonl` (Ops side, never public):
```yaml
id: usr_...
email: ...
clerk_id: ...
tier: free | free-auth | researcher | newsroom | patron
stripe_customer_id: ...
rate_limit_override: null | number
created: YYYY-MM-DD
expires: YYYY-MM-DD
team_id: null | str
```

### Middleware

`ops/src/middleware/tier-check.ts` — runs on every `/api/*` route in the public site. Returns 401 if not authenticated, 402 (Payment Required) if tier insufficient, 429 if rate-limited.

Every new API route must pass through this middleware by default. Opting out requires an explicit `export const public = true` in the route file, which lints if used in a new commit without ADR justification.

### Rate limits

SQLite counter table keyed on `user_id + endpoint`. Resets at UTC midnight for daily limits, per-minute sliding window for per-minute limits.

| Tier | Query limit | API limit |
|---|---|---|
| Anonymous | 0/day | 0 |
| Free-auth | 5/day | 0 |
| Researcher | unlimited | 60/minute |
| Newsroom | unlimited | 600/minute |

### Teaser pattern for data panels

Unauthenticated visitors see:
- Profile prose (free)
- Data panel header visible
- Top 3 rows visible, rest blurred
- "Sign up to see full data" CTA card

Free-auth users see:
- Top 10 rows visible, rest blurred
- "Upgrade to Researcher" CTA

Researcher+ sees full panel.

---

## Governance

Tier changes, pricing changes, and "non-negotiable free" list changes all require ADR entries. The principle (facts free, labor paid) is locked and cannot be changed without explicit rewrite of this document.
