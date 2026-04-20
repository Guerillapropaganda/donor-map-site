---
title: "ADR-0015: Public Ask Backend — Scaffold Now, Host Later"
type: adr
status: open
date: 2026-04-20
---

# ADR-0015: Public Ask Backend

## Context

The Ask query UI was built in the ops app (`ops/src/app/api/ask/route.ts`
+ `ops/src/app/ask/page.tsx`) and has evolved through this session into
a mature surface: plain-English translation, money-trail visualization,
compare-intent side-by-side tables, CSV export, clickable entity
deep-links, acronym/token-subset fuzzy resolution, empty-result rescue,
shareable URLs, and a glossary tooltip system. It is running well
against the real edge store at localhost:3333 via Clerk-gated auth.

We now want the same Ask surface on the public site (thedonormap.org),
integrated into the Quartz-served experience rather than confined to
David's localhost-only ops tool.

The problem: Quartz is a static-site generator. It emits HTML at build
time. There is no Quartz-native API route. The Ask engine needs live
query execution (classify intent → walk the edge store → synthesize
plain-English narrative), which cannot be prerendered for an open query
space.

## Options considered

### Option A — Prerender common queries only

Build-time: run the 100 most common queries, emit one JSON file per
query under `public/ask-cache/`. Client: static lookup, fall back to
"query not available" for anything uncached.

**Rejected:** defeats the product. The whole point of Ask is arbitrary
questions. Prerendering only the top-N means most user queries fail,
and the system stops being a "research tool."

### Option B — Ship a compressed edge-store subset to the client

Client does all classification and querying in-browser over a gzipped
subset of `data/relationships.jsonl` + `data/entities.jsonl`.

**Rejected:** the edge store is 92MB canonical + derived, 22MB minified
at minimum. Browser-side query engine would need a major rewrite.
Unfavorable privacy story (all FEC donor data pushed to every visitor).

### Option C — Standalone serverless function (Cloudflare Worker / Vercel / Fly.io)

Port `route.ts` and its handlers into a standalone function. Mount
the data files via R2 / KV or ship them bundled with the function.
Public Quartz page fetches via the function's URL. Rate limiting +
abuse protection at the edge.

**Preferred for production.** Preserves the ops logic unchanged (we
extract handlers to a shared package), keeps the query engine server-
side so donor data isn't dumped on every visitor, and has a tenable
abuse-protection story.

### Option D — Keep ops running as the API, point public page at it

For local dev: public Quartz page fetches `http://localhost:3333/api/ask`
directly. For production, public fetches a rate-limited URL served by
the ops app deployed somewhere reachable (fly.io, cloud VM).

**Accepted as Phase 1 / dev scaffold.** Lets us ship the UI now without
waiting for the serverless migration. The Quartz page works end-to-end
against the existing ops API in local dev. When we move to production,
we decide on Option C (serverless) vs continuing Option D (hosted ops).

## Decision

Ship Option D now as the dev/scaffold backend. The public Quartz Ask
page lives at `/Ask`, rendered by `quartz/components/AskPanel.tsx` +
`quartz/components/scripts/askPanel.inline.ts`. The client calls the
ops `/api/ask` route at a URL configurable via `window.ASK_API_URL`
(default `http://localhost:3333/api/ask`).

Dev CORS allowlist added to `ops/src/app/api/ask/route.ts`: accepts
`localhost:8080`, `localhost:8081`, `localhost:3000`, and `127.0.0.1:8080`.
Preflight OPTIONS returns 204 with the matching origin.

When we commit to a production backend, we'll write a follow-up ADR
choosing between:

- **Serverless (Option C)** — extract handlers into a shared package,
  deploy to Cloudflare Workers or Vercel Edge. Cost-bounded, no server
  to babysit. Requires bundling/mounting data files.
- **Hosted ops (Option D continued)** — deploy the ops app (or a
  trimmed subset) to fly.io / a VM. Keep the current architecture
  intact. Adds an always-on server to the ops budget.

Either way, the Phase 1 scaffold ensures the UI is done and the API
surface is stable — the only remaining decision is deployment shape.

## Consequences

### Immediate (Phase 1, shipped this session)

- Public `/Ask` page works end-to-end in local dev when both `ops`
  and Quartz dev servers are running.
- `ASK_API_URL` is a single swap to repoint at a production backend
  when one exists.
- Anyone cloning the repo can run the full stack locally.

### Pending (Phase 2, future)

- Public visitors can't use Ask until we deploy a backend.
- The Ask page currently shows an error banner with setup instructions
  if the backend is unreachable.
- A future ADR will pick between serverless and hosted deployment.

### Follow-ups opened

- **Rate limiting at the public edge.** The ops API's `checkPerMinuteLimit`
  was built for authenticated users (keyed on user-id). For public
  unauthenticated traffic we need IP-based or token-based rate limiting.
- **Production CORS.** The dev allowlist must be replaced with the
  production origin(s) when we ship.
- **Caching strategy.** In-memory cache in the ops route has a 5-min
  TTL. For public scale we'll want an edge cache (CDN / Cloudflare).
- **Observability.** No logging of question → answer pairs today. For
  public launch we'll want at minimum aggregate query-shape telemetry.

## Closes

None (this is new infrastructure, not a supersede).

## Opens

The follow-up ADR on deployment shape (Phase 2).
