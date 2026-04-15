---
title: Bug Queue
type: admin-note
note-type: bug
status: active
last-updated: 2026-04-15
---

# Bug Queue

Single dumping ground for bugs David finds while using Ops. Format is
intentionally lightweight — just enough to triage. Every bug gets a
`bug-NNN` ID for referencing in commits + chat.

**How to add a bug:**

Option 1 — tell Claude in chat: "bug on the /query page — HTTP 401
after server restart" — Claude appends it here under the right section
with a new ID.

Option 2 — type it into this file yourself, no particular format needed.
Claude will normalize it on the next visit.

**Severity levels:**
- **blocker** — David can't do his job; drop everything and fix
- **high** — real functionality broken, workaround exists
- **medium** — rough edge, minor loss of function
- **low** — polish, nice-to-have, cosmetic

---

## open

### bug-001: Clerk dev-mode sign-in fails ("Couldn't find your account")
- **reported:** 2026-04-15
- **severity:** blocker
- **where:** Ops sign-in page (`/sign-in`)
- **what:** After `npm install` + server restart, the Clerk sign-in form rejected `guerillapropaganda@proton.me` with "Couldn't find your account." Originally David signed up via GitHub OAuth, but the current form only shows Google OAuth + email/password — GitHub isn't visible.
- **root cause:** Clerk's dev-mode instance is ephemeral — accounts can be dropped, OAuth providers can shift, sessions don't persist reliably across server restarts. Compounded by the fact that David's original GitHub-OAuth account isn't discoverable via email/password lookup.
- **fix shipped (same session):** added `OPS_AUTH_BYPASS=1` dev escape hatch in `ops/src/lib/auth.ts`. When set (and `NODE_ENV !== "production"`), every `requireTier` / `requireAdmin` call returns a synthetic admin user. A yellow banner at the top of every page makes it impossible to forget it's on. `scripts/status.cjs` still reports honest user counts. Turn on: add `OPS_AUTH_BYPASS=1` to `ops/.env.local` + restart dev server.
- **long-term fix:** upgrade Clerk from dev-mode to a production environment (~5 min in Clerk dashboard, $25/mo), which gives persistent accounts that survive server restarts. For now, the bypass is the recommended path for local dev.
- **resolved:** 2026-04-15 (bypass shipped, commit TBD)

### bug-002: HTTP 401 on /query page Entities tab
- **reported:** 2026-04-15
- **severity:** high
- **where:** Ops `/query` page, Entities tab (first tab)
- **what:** Immediately returns HTTP 401 with a red banner. Every query subject likely has the same issue — `/api/query` calls `requireTier` which rejects the session.
- **possible causes:** same root as bug-001 (stale Clerk session). Likely resolved by the same `OPS_AUTH_BYPASS` fix — when the bypass is active, `requireTier` returns a synthetic admin so the 401 stops.
- **status:** likely fixed by bug-001's bypass; needs verification once David re-enables dev server with `OPS_AUTH_BYPASS=1`
- **resolved:** (verify after bypass test)

---

## resolved (archive)

*Entries move here when the `resolved` field is filled in. Keep this
section for the last 5-10 fixes as a quick "what recently changed"
reference.*

---

*This file is read by future Claude sessions. New bugs should be
appended to `## open` with the next available `bug-NNN` ID.*
