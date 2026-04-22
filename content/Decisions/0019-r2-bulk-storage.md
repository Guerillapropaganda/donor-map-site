---
title: "ADR-0019: Cloudflare R2 for bulk data storage"
type: adr
status: proposed
date: 2026-04-21
---

# ADR-0019: Cloudflare R2 for bulk data storage

## Context

Today's enrichment sprint (2026-04-21) surfaced the bulk-storage
problem sharply:

- `data/bulk/` on David's machine is **60.84 GB** of government CSV
  downloads (FEC individual contributions 19.9 GB, IRS 990 25.7 GB,
  CFR 4.3 GB, etc.) — gitignored, on disk only.
- `C:/donor-map-data/` has **another 5.7 GB** of intermediate derived
  stores from prior ingests.
- Ingest scripts reference hardcoded paths like
  `C:/donor-map-data/bulk/IRS 990/` — fragile across machines.
- CI cannot regenerate the derived files we untracked earlier (e.g.
  `data/derived/fec-indiv-by-committee.jsonl`, 63 MB tracked / 1.7 GB
  locally) because `data/bulk/` isn't reachable from the CI runner.
  This broke when we tried to untrack derived files in Session A.
- A fresh clone (new machine or contributor) has no path to running
  the ingest pipelines because 60 GB of bulk data isn't in git and
  isn't fetched from anywhere.

We need a canonical off-repo location for bulk source data that:
1. CI can fetch from (resolves the untrack-derived-files blocker)
2. A new machine can sync from (resolves the dev-env-bootstrap problem)
3. Isn't egress-taxing if we fetch often (CI, dev clones, re-ingests)
4. Is cheap at the 60-100 GB scale
5. Integrates without adding operational complexity to an already-
   stretched solo maintainer

## Options considered

### Option A — Backblaze B2

- Storage: $0.006/GB/month → ~$0.37/month for 60 GB
- Download: $0.01/GB (first 3× storage free per day)
- **Rejected:** egress charges become annoying for CI. Every deploy
  would pull fragments of bulk data. The free-per-day allowance helps
  but adds complexity. Cloudflare connection isn't native.

### Option B — AWS S3

- Storage: $0.023/GB/month → ~$1.38/month
- Download: $0.09/GB after first 100 GB
- **Rejected:** pricier than R2, and AWS adds IAM/credentials complexity
  that's overkill for our scale. Not a fit for a solo-dev operation.

### Option C — Git LFS

- Storage: included with GitHub ($5/month for 50 GB → $10/month at our
  scale)
- Bandwidth: $5/month per 50 GB
- **Rejected:** per-file 2 GB cap rules out the bigger IRS 990 zips.
  Bandwidth is metered and quickly eats budget. Ecosystem friction
  (needs lfs install on every clone, including CI).

### Option D (chosen) — Cloudflare R2

- Storage: $0.015/GB/month → ~$0.91/month for 60 GB
- Egress: **$0** (core R2 selling point)
- Class A (write) operations: $4.50/M — negligible at our scale
- Class B (read) operations: $0.36/M — negligible
- S3-compatible API — works with `@aws-sdk/client-s3`, `rclone`, `mc`,
  all common tooling
- Cloudflare account already in the stack (thedonormap.org runs
  behind Cloudflare CDN + security)
- Zero-egress means CI can re-fetch bulk data on every deploy without
  cost, and any dev can bootstrap from zero without bandwidth anxiety

## Decision

Adopt Cloudflare R2 as the canonical bulk-data storage backend.

Bucket: **`donor-map-bulk`** (single bucket, logical layout below).

### Bucket layout

Mirror the existing `data/bulk/` subdirectory structure. Each
subfolder corresponds to one pipeline:

```
donor-map-bulk/
├── fec/
│   ├── candidate-master/           # cn{YY}.zip per cycle
│   ├── committee-master/
│   ├── pas2/                       # PAC-to-candidate
│   ├── individual-contributions/   # 19.9 GB — the big one
│   ├── operating-expenditures/     # oppexp
│   ├── committee-transactions/     # oth
│   ├── weball/                     # candidate cycle summaries
│   ├── all-candidates/             # metadata
│   └── pac-summary/
├── irs/
│   └── form-990/                   # 25.7 GB — e-file bulk releases
├── usaspending/
│   ├── contracts/
│   ├── subawards/
│   └── grants/
├── congress/
│   ├── bills/
│   ├── bill-status/
│   └── members/
├── voteview/                       # legislator-positions/{108..119}.jsonl
├── federal-register/
├── cfr/                            # Code of Federal Regulations
├── plaw/                           # Public Laws
├── polling/                        # ICIJ, OpenSanctions, offshore
├── epa/                            # FRS + ECHO enforcement
└── sam/                            # SAM.gov contracts
```

### Access model

Two scoped API tokens:

1. **`R2_TOKEN_WRITE`** — full read/write/delete on `donor-map-bulk`.
   Used by David's local machine for initial upload + monthly refresh
   uploads when new FEC/IRS cycles drop. Stored in `.env.local`,
   never in git.

2. **`R2_TOKEN_READ`** — read-only on `donor-map-bulk`. Used by:
   - CI deploy runner (GitHub Actions secrets)
   - Any dev/contributor's `.env.local` for pulling data locally

R2 bucket configuration: **private** (not public-CDN-accessible). Even
though the data is public government records, private-bucket + scoped
tokens is cleaner and future-proofs mixed proprietary content
(scraped journalism archives, paid datasets, etc.).

### Configuration

`.env` additions (documented in `.env.example`):

```
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<scoped token access key>
R2_SECRET_ACCESS_KEY=<scoped token secret>
R2_BUCKET=donor-map-bulk
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

GitHub Actions: same keys exposed as `secrets.R2_*` in repo settings,
injected into `deploy.yml` env block.

### Tooling

New scripts in `scripts/lib/`:

- `scripts/lib/bulk-storage.cjs` — thin S3-compatible client wrapping
  `@aws-sdk/client-s3`, with methods:
  - `fetchBulk(subfolder, { force? })` — download a subfolder to
    `data/bulk/<subfolder>/`; skip files that already exist locally
    with matching size (etag fallback).
  - `uploadBulk(subfolder)` — push local changes under `data/bulk/
    <subfolder>/` up to R2. Used after a fresh FEC or IRS download.
  - `listBulk(subfolder)` — directory listing with sizes.
  - `verifyBulk(subfolder)` — compare local ↔ R2 manifest.

- `scripts/fetch-bulk.cjs` — CLI wrapper:
  `node scripts/fetch-bulk.cjs fec/pas2`
  `node scripts/fetch-bulk.cjs irs/form-990 --force`

- `scripts/upload-bulk.cjs` — CLI wrapper for pushing local edits.

### Ingest-script integration

Every `ingest-*-bulk.cjs` prepends:

```js
const { fetchBulk } = require('./lib/bulk-storage.cjs');
await fetchBulk('fec/pas2');  // resolves if already local
```

Scripts remain backward-compatible (if R2 is unreachable and local
data exists, proceeds with what's on disk). New behavior: if local
is missing AND R2 has the files, fetches them.

### CI integration

`.github/workflows/deploy.yml` adds a step between `npm ci` and the
Quartz build:

```yaml
- name: Fetch bulk data for derived artifact rebuild
  run: node scripts/ci-prebuild.cjs
  env:
    R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
    R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
    R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
```

`scripts/ci-prebuild.cjs` extended to fetch only the bulk subfolders
its specific derived artifacts require, keeping CI minutes low (we
don't need all 60 GB in CI — just the ones needed for
relationships-per-profile.json + any other artifact pinned there).

### Initial upload

One-time operation run from David's machine:

1. Install rclone or use `scripts/upload-bulk.cjs`
2. Sync `data/bulk/` + `C:/donor-map-data/bulk/` to R2
3. 60 GB at typical residential upload (30-50 Mbps) = 3-6 hours
   overnight
4. Verify with `node scripts/verify-bulk.cjs` (manifest diff)

Estimated cost for initial 60 GB upload: ~$0 (within R2's free tier
allowances for PUT operations at this volume).

### After R2 is live

Derived file cleanup unblocks:
- Untrack every `data/derived/*.jsonl` (freed ~150 MB from tracked
  tree)
- CI rebuilds them via `ci-prebuild.cjs` → `fetchBulk` →
  `ingest-*-bulk.cjs` chain
- Any fresh clone becomes a first-class dev environment with
  `npm install && node scripts/fetch-bulk.cjs <subfolder>`

## Consequences

### Positive

- **60 GB of bulk data becomes reproducible** across any machine. Solo-
  maintainer risk mitigated (no more "only works on David's laptop").
- **CI unblock**: derived files can be regenerated in pipeline,
  meaning we can untrack them from git and slim the repo further.
- **Zero-egress** means we can run aggressive CI (re-ingest on every
  deploy if we want) without cost anxiety.
- **Standard S3 API** — any future tooling (BigQuery import, Athena
  queries, Snowflake loads) plugs in cleanly.
- **Private bucket** + scoped tokens is a security posture upgrade —
  even the public government data has clearer audit trail of who
  accessed it.

### Negative

- New credentials to manage (4 env vars + GitHub secrets). Rotation
  policy lives in `ops/README.md`'s credentials checklist.
- First-time setup: ~1 hour of David's dashboard work + a multi-hour
  overnight upload.
- R2 is Cloudflare-coupled. Migrating off requires re-uploading to
  another provider. Low concern given Cloudflare's financial stability
  and the S3-compat API insulating us.
- One more external dependency. If R2 is down, ingest pipelines fall
  back to local if present; CI deploy fails cleanly if both are
  unreachable.

### Required changes before flip

1. Create `donor-map-bulk` R2 bucket in Cloudflare dashboard.
2. Generate scoped `R2_TOKEN_WRITE` + `R2_TOKEN_READ`.
3. Install `@aws-sdk/client-s3` in `package.json`.
4. Write `scripts/lib/bulk-storage.cjs` wrapper.
5. Write `scripts/fetch-bulk.cjs` + `scripts/upload-bulk.cjs` CLIs.
6. Write `scripts/verify-bulk.cjs` manifest diff tool.
7. One-time upload of 60 GB from David's local bulk dirs.
8. Reference ingest-script pattern update (1 script first, then roll
   across the ~20 `ingest-*-bulk.cjs` files).
9. `ci-prebuild.cjs` extended to fetch required subfolders.
10. `deploy.yml` injects R2 secrets.
11. `.env.example` documents the four env vars.
12. `ops/README.md` credentials + rotation section updated.
13. `CLAUDE.md` rule 3 amended to say canonical bulk source is R2
    (data/bulk/ becomes a local cache).

Once all landed, untrack tracked derived files:
- `data/derived/fec-indiv-by-committee.jsonl` (already untracked
  2026-04-21)
- Other large derived files (see Session A audit report)

## Closes
- Derived-files cleanup gap from ADR-0017 Session A
- Multi-machine reproducibility concern flagged 2026-04-21 in
  session log

## Opens
- Monthly bulk-refresh operational cadence (when do we re-upload
  FEC / IRS / USASpending zips). Probably quarterly to match
  government publication cycles.
- Dev-env bootstrap doc (`content/Admin Notes/dev-environment-setup.md`)
  covering R2 credentials + `fetch-bulk` workflow.
- Decision on whether to ALSO mirror canonical stores (data/*.jsonl)
  to R2 for faster cross-machine sync. Probably yes but separate
  decision.
- Retirement of `C:/donor-map-data/` hardcoded paths throughout the
  ingest scripts in favor of the fetchBulk → `data/bulk/` local
  cache pattern.
