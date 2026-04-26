---
title: Attack Surface Inventory
type: admin-note
note-type: code
priority: normal
status: open
last-updated: '2026-04-15'
generated-by: manual (Code Claude security sprint)
note-kind: reference
---

# Attack Surface Inventory

What is publicly exposed, what accepts input, and what needs hardening.

## Public endpoints (GitHub Pages static site)

| Route | Type | Auth | User input | Risk |
|-------|------|------|------------|------|
| `/*` (all pages) | Static HTML | None | None | Negligible. Static files served by GitHub CDN. |
| `/interactive/*` | Client-side JS | None | URL params, clicks | Low. D3 renders data from static JSON. No server calls. |
| Under-construction gate | Static page | None | None | None. Default for all routes until explicit opt-in. |

**Current risk: minimal.** The static site takes no user input and makes no server-side calls.

## Ops app endpoints (localhost:3333 only)

These are NOT internet-accessible. Risk is local only.

### API routes (ops/src/app/api/)

| Route | Method | Auth | User input | Risk if exposed |
|-------|--------|------|------------|----------------|
| `/api/attention-queue/reject` | POST | Clerk | signature ID | Low |
| `/api/operations` | GET, PATCH | Clerk | checklist updates | Low |
| `/api/profile` | GET, PATCH | Clerk | profile slug, frontmatter edits | Medium (writes to vault) |
| `/api/profiles` | GET | Clerk | search query | Low |
| `/api/query` | GET | Clerk | QuerySpec (subject, filters, limit, offset) | **HIGH if exposed.** Unbounded queries can full-scan 30k edges. |
| `/api/relationships` | GET, POST, PATCH | Clerk | edge data | Medium (writes to canonical store) |
| `/api/source-registry` | GET, PATCH | Clerk | source record updates | Medium |
| `/api/sources` | GET | Clerk | search query | Low |
| `/api/stripe/webhook` | POST | Stripe signature | Stripe event payload | **HIGH if exposed.** Must verify webhook signature. |

### Hardening needed before any route goes public:

1. **Rate limiting** on all routes (Cloudflare Worker KV at edge, or in-app middleware)
2. **Query cost limits** on `/api/query` (mandatory filters, page ceiling, timeout)
3. **Input validation** on all PATCH/POST routes (already partially in place via Zod schemas)
4. **CORS headers** locked to allowed origins
5. **CSP headers** via Cloudflare Transform Rules

## External services with credentials

| Service | Credential type | Stored where | Rotation needed |
|---------|----------------|-------------|-----------------|
| Clerk | Publishable key + Secret key | ops/.env.local | Before prod launch |
| Stripe | Publishable key + Secret key + Webhook secret | ops/.env.local | Before prod launch |
| Web3Forms | Access key | hardcoded in component | Review |
| GitHub | gh CLI auth token | OS credential store | As needed |

## Git repository

| Surface | Risk | Mitigation |
|---------|------|------------|
| Full commit history | Leaked secrets recoverable | Run gitleaks scan (scripts/security/gitleaks-full-scan.cjs) |
| Commit author identity | Personal name exposure | Run identity audit (scripts/security/identity-audit.cjs) |
| Public repo visibility | Code + vault content visible | By design. Facts are free. |

## DNS / domain

| Surface | Risk | Mitigation |
|---------|------|------------|
| WHOIS records | Personal info exposure | Verify registrar has WHOIS privacy enabled |
| DNS pointing directly to GitHub | Origin IP is GitHub's (fine for static) | When Cloudflare proxy is enabled, all traffic routes through CF |
| No DNSSEC | DNS poisoning (theoretical) | Enable DNSSEC at registrar |

## Forms / user input on the public site

| Component | Input type | Backend | Risk |
|-----------|-----------|---------|------|
| Tip submission form | Text fields | Web3Forms (external) | Low. Honeypot in place. Turnstile recommended. |

No other public-facing forms exist currently.

## Summary

The static GitHub Pages site has near-zero attack surface. All meaningful risk is concentrated in the Ops app API routes, which are currently localhost-only. The security sprint focuses on hardening these routes BEFORE they go public, plus securing the git history and dependency chain.
