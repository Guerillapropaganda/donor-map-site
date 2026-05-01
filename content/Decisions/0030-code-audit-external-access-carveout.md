---
title: "ADR-0030: Code-Audit External Access Carve-out"
type: adr
status: accepted
date: 2026-04-30
last-amended: 2026-04-30
relates-to: 0021, 0023, 0024, 0029
amends: null
---

# ADR-0030: Code-Audit External Access Carve-out

## Status

**Accepted 2026-04-30. Implementation: phased — Cal-Access first, other government primary sources added by amendment as audit needs arise.**

## Context — why now

CLAUDE.md Rule 13 ("URL verification is Editor-only") was written to prevent Code Claude and Research Claude from hunting URLs in editorial profile content. That intent is correct. The defamation surface around real people requires human accountability for every cited URL.

Rule 13 also has a side effect that wasn't the original design intent: **Code Claude cannot verify its own pipeline output against the source it claims to have ingested from.** The Cal-Access pipeline (cc_p3_185 through cc_p3_190) ships ~95k edges from `data/derived/cal-access-bulk.jsonl` + `cal-access-expn.jsonl` + `cal-access-loans.jsonl`. The override map at `data/cal-access-filer-overrides.json` claims filer 1485077 is "STEYER FOR GOVERNOR 2026". I cannot verify that claim against Cal-Access itself — only against the local TSV dump my discovery script read. If the discovery script misread the TSV, or the override map is wrong, the bug is structurally invisible from inside Code Claude sessions.

The 2026-04-30 vault audit (cc_p3_191) surfaced multiple findings I could identify by internal cross-reference but could not verify externally:

- Filer 1418587 — anti-Newsom-recall coalition committee whose name lists multiple politicians; mapped under both Yee and Becerra as `ie_supporting`. Almost certainly a false positive (it's a counter-recall vehicle, not an IE supporting either of them), but I cannot confirm without reading the Cal-Access committee detail page.
- 14 controlled committees mapped under Villaraigosa spanning 2000-2026, including ballot-measure coalitions ("Yes on Prop S") that mention him by name. Some are likely false positives. Cannot confirm.
- The empirical taxonomy I inferred (`CATEGORY=40002` = candidate-controlled) is asserted but not verified against the Cal-Access codebook PDF.
- The $63M Steyer-opposition figure and the $21M figure cited in independent reporting cannot be reconciled without external verification.

This is not editorial verification (that stays Tier 3 / David's lane). This is pipeline self-audit against the structural source the pipeline claims to read from. The current rules conflate the two cases under one prohibition.

## Decision

**Code Claude may fetch external sources for the explicit, narrow purpose of verifying its own pipeline output against the government primary source the pipeline claims to have ingested from.** Every fetch is logged for provenance. Nothing fetched flows into editorial content without going through the editorial-decision-pipeline (ADR-0029).

This is a carve-out from Rule 13, not a replacement of it. Rule 13's editorial protection stays intact for profile bodies; ADR-0030 opens a narrow back-channel for pipeline correctness audits.

## Scope

### §1 — Allowlisted domains (Phase 1 — active)

The following sources are allowed for Code-Claude external fetch:

**Cal-Access (active 2026-04-30):**
- `cal-access.sos.ca.gov` — Cal-Access committee detail pages
- `www.sos.ca.gov` — California Secretary of State documentation (codebook PDFs, schema docs)
- `campaignfinance.cdn.sos.ca.gov` — bulk dump CDN

**Federal legislative + voting (added by 2026-04-30 amendment — see §10):**
- `voteview.com`, `www.voteview.com` — UCLA Voteview NOMINATE + per-legislator roll-call data (`HSall_*.csv` bulk downloads)
- `www.govinfo.gov` — Congress bulk data including `BILLSTATUS-{congress}-{type}.zip` cosponsor lineage
- `www.congress.gov` — federal bill metadata
- `clerk.house.gov` — House roll-call vote XML (per-legislator yea/nay)
- `www.senate.gov` — Senate roll-call vote XML

The 2026-04-30 amendment additionally authorizes **bulk-data downloads** from these federal sources for ingest pipelines, not just per-URL audit fetches. Bulk downloads are not subject to the `code-audit-fetcher` rate caps in §7 — they're one-shot multi-MB file pulls via wget/curl/script. The `data/code-audit-fetches.jsonl` log records bulk-download intent rather than per-URL detail (one entry per ingest run, listing source URLs).

### §2 — Allowlisted domains (Phase 2 — when each pipeline ships)

To be unlocked when an audit need arises for the corresponding pipeline. Each addition requires a new ADR amendment OR documentation in the relevant pipeline's "Phase 0 — Research" entry in `content/Pipeline Guide.md`:

- `*.fec.gov` — FEC primary source data (committee detail, candidate profiles)
- `*.irs.gov` — IRS exempt-organization search, Forms 990 verification
- `*.sec.gov` — SEC EDGAR primary
- `fppc.ca.gov` — FPPC enforcement DB
- `www.house.gov` — federal legislative (member directories etc.; clerk.house.gov for roll calls is in §1 per 2026-04-30 amendment)
- `projects.propublica.org/nonprofits/*` — Nonprofit Explorer (already Tier 1 in existing source registry)

Activation rule: a domain in §2 becomes allowed for fetch when the corresponding pipeline (a) is active in the vault, AND (b) David approves activation in writing (commit message reference, admin note, or amendment to this ADR).

### §3 — Explicitly NOT allowed

These are out of scope and require a new ADR to expand:

- News domains (calmatters.org, sfchronicle.com, latimes.com, politico.com, etc.) — editorial framing
- Aggregator domains (opensecrets.org, followthemoney.org, ballotpedia.org, transparencyusa.org) — interpreted/aggregated data
- Social media (twitter.com, x.com, facebook.com, reddit.com, etc.)
- Anything not explicitly in §1 or §2

These remain Tier 3 / Perplexity research / David's lane per Rule 14.

## Provenance

### §4 — Fetch log

Every external fetch by Code Claude under this carve-out is appended to `data/code-audit-fetches.jsonl`. Required fields:

```json
{
  "id": "caf_<hash>",
  "timestamp": "ISO 8601",
  "url": "full URL fetched",
  "domain": "the domain checked against allowlist",
  "purpose": "one-sentence: what pipeline output was being verified",
  "script": "scripts/<name>.cjs that issued the fetch",
  "session_id": "cc_p3_<n> or worktree branch",
  "status": "ok | unreachable | rate-limited | blocked-by-cf | parse-failed",
  "result": "verified | discrepancy | inconclusive",
  "discrepancy_detail": "if result=discrepancy: what the source said vs what the pipeline claimed",
  "fetched_content_hash": "sha256 of the response body for reproducibility",
  "response_status_code": 200
}
```

This file is git-tracked. The full audit trail is reviewable in retrospect by anyone with vault access.

### §5 — Allowed actions on a fetch result

If the fetched source confirms the pipeline output (`result: verified`):
- Log entry is sufficient. No further action.

If the fetched source contradicts the pipeline output (`result: discrepancy`):
- File a bug in `data/bug-queue.md` referencing the fetch ID
- Surface the finding in the next vault-audit harness run
- Propose a correction to the affected canonical-store record (override map, librarian alias, etc.) **only via the editorial-decision-pipeline as a Tier 2 entry**, never auto-applied. David approves at `/audit-claude-decisions`.
- Update technical documentation in `content/Pipeline Guide.md` if the discrepancy reveals a misread codebook or schema assumption

If the fetched source is unreachable or returns blocked content:
- Log entry with `status: unreachable` (or `blocked-by-cf` etc.)
- Add to attention queue for David
- Do NOT retry in a tight loop (rate-limit safety per §7)

### §6 — Forbidden actions

Code Claude must NOT:

- Cite a fetched URL in a profile body. Profile-body URLs come from David per Rule 13 (unchanged).
- Update any field that affects how a real person is characterized (class tags, party, framing language) based on a fetched source.
- Create a new class tag from a fetched source. Rule 14 unchanged.
- Promote a profile to `verified` based on a fetched source. David approves verified per Rule 9.
- Treat a fetched page's editorial content as authoritative even when the page is on an allowed domain. (Cal-Access has occasional press-release pages; those are not pipeline-source data.)

## Safety mechanisms

### §7 — Rate limiting + backoff

- Maximum 60 fetches per session per domain (hard cap, enforced in code).
- Minimum 2-second delay between fetches to the same domain.
- Exponential backoff on 429 / 503: 2s, 4s, 8s, 16s, 32s, then give up and log `rate-limited`.
- User-Agent: `Donor Map Pipeline Audit / thedonormap.org / Code Claude ADR-0030`.

### §8 — Sentinel: `code-audit-fetch-sentinel`

A new pre-commit sentinel (`scripts/code-audit-fetch-sentinel.cjs`) that blocks commits where:

- A profile body cites a URL that first appears in `data/code-audit-fetches.jsonl` (forces editorial review of any URL Code Claude introduced)
- A canonical-store edit's commit message references an audit-fetch ID that doesn't exist in the log
- A Code Claude fetch was attempted to a domain not in §1 or §2 (the fetcher should refuse, but the sentinel is a belt-and-braces check)
- The `data/code-audit-fetches.jsonl` file's mtime is newer than the most recent fetch entry (prevents tampering)

This sentinel mechanically prevents Code Claude from drifting into editorial territory using the carve-out as cover.

### §9 — Harness integration

A new harness check (`scripts/code-audit-fetch-discrepancy-check.cjs`) reads `data/code-audit-fetches.jsonl`, surfaces any entry with `result: discrepancy` that isn't yet linked to a `bug-queue.md` entry or an editorial-decision-pipeline record. Runs in `vault-audit.cjs`. Steady state: zero unaddressed discrepancies.

### §10 — Implementation surface

Code Claude exercises this carve-out via a single helper module:

```
scripts/lib/code-audit-fetcher.cjs
```

Exports `fetchForAudit({ url, purpose, script, expected }) → Promise<{ status, result, content, ... }>`.

The helper is the only place that issues fetches. It enforces:

- Allowlist check (§1, §2)
- Rate limit + backoff (§7)
- Provenance logging (§4)
- Content-hash + status code capture
- Refusal on disallowed domain (logs and throws)

No script issues raw `fetch()` / `https.get()` to external domains for audit purposes outside this helper. Pre-commit lint check rejects new code that does.

## Rationale

1. **Solves the structural blind spot.** The 2026-04-30 audit identified findings I could not verify because Rule 13 blocks the verification path. ADR-0030 unblocks the verification path **and only the verification path** — it does not relax Rule 13 for editorial content.

2. **Provenance log is the safety net.** Every fetch is logged before it happens. A future auditor (you, a journalist, opposing counsel) can verify "is Claude fetching only what we said it could?" by reading one git-tracked file.

3. **Allowlist is restrictive by design.** Phase 1 = Cal-Access only. Phase 2 unlocks government primary sources as their pipelines need audit. News + aggregators + social = explicitly excluded, full stop.

4. **Mirrors ADR-0029's tier system.** Code Claude can mechanically *fetch and log*. Code Claude can mechanically *file a bug*. Code Claude *cannot* mechanically *update editorial content* — any profile-body change derived from a fetch goes through editorial-decision-pipeline as Tier 2 minimum (David approves).

5. **The sentinel mechanically prevents scope creep.** §8 rejects commits where a fetched URL leaks into profile content. The carve-out cannot be used as cover for editorial work because the sentinel blocks the commit.

6. **Defamation surface unchanged.** Profile bodies still get URLs from David. News verification still goes through Perplexity. Real-people-current-events facts still require human accountability. Nothing about the legal exposure profile changes.

## Consequences

### Closes
- The structural blind spot where Code Claude pipelines could drift from their gov-primary source data and the drift was invisible from inside Code Claude sessions.
- The need for David to manually verify pipeline override maps via Perplexity prompts (now Code Claude does mechanical structural-fact verification; David's Perplexity time stays focused on editorial reporting where it's actually needed).

### Opens
- **Implementation work** for `scripts/lib/code-audit-fetcher.cjs`, the sentinel, the harness check, and the first-use-case audit script (`scripts/audit-cal-access-overrides.cjs`).
- **Phase 2 expansion** when other pipelines need it. Each domain addition is a new amendment or pipeline-doc entry, not auto.
- **Possible discovery of pipeline bugs**, including ones in production. A fetch that says "filer X is not what your override map claims" is real, and the resulting Tier 2 correction proposal is exactly what David approves at `/audit-claude-decisions`. Expected, not a problem.

### Does not change
- Rule 13 for editorial content. Profile-body URLs come from David.
- Rule 14 Perplexity-first protocol for new pipelines and class-tag vocabulary.
- Rule 9 readiness flow + Tier 3 promotion gates.
- ADR-0001 class tag vocabulary.
- Any defamation-prone content path.
- Any rule about real-people facts, current-events claims, or editorial framing.

## First use case

Implementation order — single PR, ~$15-25 Opus across one session:

1. `scripts/lib/code-audit-fetcher.cjs` (the helper)
2. `data/code-audit-fetches.jsonl` (init the log file)
3. `scripts/code-audit-fetch-sentinel.cjs` (pre-commit sentinel) + `.husky/pre-commit` wiring
4. `scripts/code-audit-fetch-discrepancy-check.cjs` (harness check) + `vault-audit.cjs` wiring
5. `scripts/audit-cal-access-overrides.cjs` — first concrete use case: walks every filer_id in `data/cal-access-filer-overrides.json`, fetches its Cal-Access detail page, compares displayed name to the override map's claim, files findings to bug-queue
6. Run on the 82 CA-Gov filer IDs; eyeball the discrepancy report; propose Tier 2 corrections via editorial-decision-pipeline

Expected discoveries:
- Filer 1418587 confirmed false-positive (anti-recall coalition, not IE supporting Yee/Becerra)
- 1-3 other override-map false positives surfaced
- Confirmation that the Steyer / Mahan / Thurmond active-cycle committees ARE what we claim
- Possibly: a refined understanding of Cal-Access category codes after reading the codebook PDF

## Open questions

None blocking acceptance. The phased rollout is the deliberate answer to "what about other pipelines?" — they wait until they need this and are added by amendment.

---

**Summary.** ADR-0030 adds a narrow, logged, sentinel-enforced ability for Code Claude to verify pipeline output against the government primary source it claims to read from. It does not relax editorial protections. Every fetch is logged. Every discrepancy proposed as a correction goes through David's approval queue. The carve-out is restricted to government primary domains; news + aggregators + social stay out of scope. Rule 13 protects editorial content; ADR-0030 protects pipeline correctness; both can be true.

---

## §10 — Amendments

### Amendment 2026-04-30 — Federal legislative + voting sources active

**Authorized by David in session cc_p3_201 ("I authorize") to unblock ADR-0024 Phase 3 thesis queries `votingDivergence`, `policyAlignment`, and the cosponsor half of sponsorship edges.**

**Domains promoted from §2 to §1 (active):**
- `voteview.com`, `www.voteview.com`
- `www.govinfo.gov`
- `www.congress.gov`
- `clerk.house.gov`
- `www.senate.gov`

**New scope: bulk-data downloads.** Phase 1 originally covered per-URL audit fetches through `scripts/lib/code-audit-fetcher.cjs`. The amendment additionally authorizes one-shot bulk-data downloads from these federal sources (e.g. `voteview.com/static/data/out/votes/HSall_votes.csv` ~600MB, `www.govinfo.gov/bulkdata/BILLSTATUS/119/HR/BILLSTATUS-119-HR.zip` ~50MB) via wget/curl/Node fetch. Bulk downloads are exempt from the per-domain rate cap in §7 — they are intentional ingest events, not exploratory crawls.

**Provenance for bulk downloads:** one summary entry per ingest run in `data/code-audit-fetches.jsonl`:

```json
{
  "id": "caf_bulk_<hash>",
  "kind": "bulk-download",
  "domain": "voteview.com",
  "files_fetched": ["url1", "url2", ...],
  "total_bytes": 712038400,
  "purpose": "voteview-bulk ingest for vote-on-bill edges (D-prereq)",
  "script": "scripts/ingest-voteview-bulk.cjs",
  "session_id": "cc_p3_NNN"
}
```

**Pipelines unblocked:**
1. `scripts/ingest-voteview-bulk.cjs` — already wired, was waiting on CSVs in `data/bulk/`
2. `scripts/ingest-bill-status-bulk.cjs` — already wired, was waiting on `BILLSTATUS-*.zip` in `C:/donor-map-data/bulk/Bill Status/`
3. New script needed: per-legislator votes for 115th–119th congresses from clerk.house.gov + www.senate.gov XML (gap voteview doesn't cover post-2017 with the same richness; existing `votes.jsonl` has the source URLs)

**Editorial protections unchanged.** Rule 13 still binds for profile-body URLs. The `code-audit-fetch-sentinel` still blocks any fetched URL from leaking into profile content. Bulk-downloaded data lands in `data/legislator-positions/` and `data/derived/govinfo-bill-status.jsonl` — librarian-consumed, not profile-body content.

**Allowlist code change:** see corresponding update to `scripts/lib/code-audit-fetcher.cjs` PHASE_1_DOMAINS in the amendment commit.

### Amendment 2026-05-01 — UK government primary sources for foreign-operator vault entries

**Authorized by David in session cc_p3_ca_gov_2026 ("Yes option A and B") to unblock the Steve Hilton dossier — Hilton's pre-US political career (2010-2012 Director of Strategy to PM David Cameron, prior Conservative Party advisory roles) is the load-bearing context for his 2026 California gubernatorial bid, but the relevant primary-source records sit on UK government domains that were never added to the §1 allowlist because no prior story crossed into UK politics.**

**Scope of the amendment.** Adds three UK government domains to §1 (active). The pattern matches the 2026-04-30 federal-source amendment: government primary sources only, no news/aggregator/social, every fetch logged, the `code-audit-fetch-sentinel` still blocks fetched URLs from leaking into profile content.

**Domains promoted to §1 (active):**

1. **`search.electoralcommission.org.uk`** — UK Electoral Commission donations + political party finance database. The structured-disclosure regime closest to FEC for UK politics. Contains: registered donations to political parties + regulated entities, donor names, donor types, recipient parties, dates, amounts. Searchable interface; some endpoints serve JSON.
2. **`find-and-update.company-information.service.gov.uk`** — UK Companies House. Contains: incorporation records, director appointments + resignations, registered offices, filing histories, persons with significant control, accounts. Free, comprehensive, structured. Relevant to Hilton via Crowdpac's UK entity history (if any) and any current or past UK directorships of Hilton or Whetstone.
3. **`hansard.parliament.uk`** — Hansard official record of UK Parliament debates. Searchable archive of all parliamentary speeches and written answers since the 1800s. Relevant to Hilton via Cameron-era policy attribution (Big Society, austerity-era debates) and any contemporaneous parliamentary discussion that names him as Director of Strategy.

**Why these three and not others.** The amendment scope is intentionally narrow — only the structured-disclosure UK gov domains directly analogous to the §1 US gov sources we already use:

| Function | US source (already §1) | UK source (this amendment) |
|---|---|---|
| Campaign finance disclosure | `cal-access.sos.ca.gov`, `www.fec.gov` (§2) | `search.electoralcommission.org.uk` |
| Corporate registry | `www.sec.gov` (§2) | `find-and-update.company-information.service.gov.uk` |
| Legislative record | `clerk.house.gov`, `www.senate.gov` | `hansard.parliament.uk` |

UK media outlets (BBC, Guardian, Telegraph, Times) are explicitly out of scope — they are news sources and Rule 13 keeps editorial URL verification in David's lane.

**New scope: the foreign-operator carve-out frame.** Phase 1 was originally written for "Code Claude verifies pipeline output against the source the pipeline claims to read from." Hilton's UK records are not "pipeline output we are verifying" — they are *new* primary-source data we want to ingest into the dossier scaffolding. The amendment broadens §10's authorized purpose by one notch:

> Code Claude may fetch government primary sources for foreign operators who appear in vault profiles **specifically when the operator's foreign-political career is load-bearing context for their current US-political relevance.** The fetch produces research scaffolding in `content/Admin Notes/` only — never directly into profile content. Rule 13 still applies to every URL that lands in profile body text.

This narrows future creep: the carve-out is for documented operators in the vault, not "anyone interesting." Hilton qualifies (CA gubernatorial candidate, pre-US career was Cameron's Director of Strategy). A speculative person we aren't profiling does not qualify.

**Pipelines unblocked:**

1. `scripts/audit-hilton-uk-records.cjs` — new fetch script searching UK EC for Hilton + Whetstone donor history, Companies House for Crowdpac UK entity history + director records, Hansard for Cameron-era references.
2. Future foreign-operator fetches follow the same pattern: per-script audit fetches under §10, results integrated into dossier-tier admin notes, never auto-written into profile bodies.

**Editorial protections unchanged.** Rule 13 still binds for profile-body URLs. The `code-audit-fetch-sentinel` still blocks any fetched URL from leaking into profile content. Bot-block detection in the fetcher (`blocked-by-cf` enum) still captures Imperva/Cloudflare challenges as terminal non-results — UK gov domains may use similar protections.

**Allowlist code change:** see corresponding update to `scripts/lib/code-audit-fetcher.cjs` PHASE_1_DOMAINS in the amendment commit. The three UK domains added to the active set; `electoralcommission.org.uk` (apex) and `www.companieshouse.gov.uk` (legacy) added as secondary entries to handle redirect targets.

**What does NOT change with this amendment:**

- The Phase 2 not-yet-enabled list (FEC, IRS, SEC, FPPC, etc.) is untouched.
- News + aggregator + social media remain explicitly out of scope.
- The session cap (60 fetches per domain) and per-domain rate limit (2s) apply to UK domains exactly as they apply to US.
- Editorial verdicts on UK history remain David's lane (Rule 13 — defamation surface). Code Claude assembles factual records and source citations; David writes editorial framing.
