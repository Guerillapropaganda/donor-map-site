# Donor Map Ops

David's local operations app for managing the vault, profiles, pipelines, and editorial workflow.

**Local only.** Runs at `localhost:3333`. Not internet-accessible.

## Quick start

```bash
cd ops
npm install
npm run dev        # http://localhost:3333
```

Or double-click `ops/start-ops.bat`.

## Authentication (Clerk)

The ops app uses Clerk for authentication. Two environments:

### Development (current)
- **Tenant:** `valued-squid-68.clerk.accounts.dev`
- **Keys:** In `ops/.env.local` (gitignored)
- **Bypass:** Set `OPS_AUTH_BYPASS=true` in `.env.local` to skip auth entirely (local dev only)

### Production (when ops goes remote)
- Create a **separate** Clerk project (never reuse dev keys in prod)
- New publishable key + secret key in a fresh `.env.production`
- Remove `OPS_AUTH_BYPASS` (never set this in prod)
- Enable Clerk production mode in the Clerk dashboard

### Env vars

Copy `.env.example` to `.env.local` and fill in:

```env
# Clerk (auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Stripe (payments — optional until paid tier launch)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Auth bypass (dev only, NEVER in prod)
OPS_AUTH_BYPASS=true
```

**Never commit `.env.local` or any file containing real keys.** The `.gitignore` excludes `ops/.env.local`. The `deps-staging-sentinel` pre-commit hook catches `package.json` without `package-lock.json`; there is no automatic `.env` leak gate, so be careful.

## Credential rotation checklist

Before any public/remote deployment:

1. [ ] Create new Clerk production project (separate from dev)
2. [ ] Generate new Clerk publishable + secret keys
3. [ ] Create new Stripe account or use live keys (not test)
4. [ ] Set new Stripe webhook secret for the production endpoint
5. [ ] Remove `OPS_AUTH_BYPASS` from production env
6. [ ] Update Clerk allowed origins to the production domain
7. [ ] Verify webhook signature checking in `/api/stripe/webhook/route.ts`

## Architecture

- **Next.js 14** (App Router)
- **Reads/writes the vault directly** via filesystem
- **Own `package.json` and `node_modules`** (separate from the Quartz site)
- **Data dir** (`ops/data/`) is gitignored — local state only (security checklists, costs, etc.)

## Key pages

| Page | What it does |
|------|-------------|
| `/` | Dashboard overview |
| `/profile` | Browse/search/edit all profiles |
| `/sources` | Source registry triage |
| `/relationships` | Relationship edge browser |
| `/operations` | Security checklist, costs, service accounts |
| `/system-health` | Live status of pages + APIs |
| `/attention` | Attention queue (ranked work items) |
| `/bugs` | Bug/deferred item tracker |
| `/policies` | Policy promote/publish workflow |
| `/query` | Query engine UI |
