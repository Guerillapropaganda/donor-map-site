---
title: "Thesis Data Audit"
date: 2026-04-30
lane: code
status: open
---

# Thesis Data Audit (ADR-0030 §10 first exercise)

**Generated:** 2026-04-30T20:53:05.686Z
**Script:** `scripts/audit-thesis-data-vs-sources.cjs`
**Samples per audit:** 10

## Audit 1 — Sponsorship (bills.jsonl vs www.congress.gov)

Verified: 0 · Discrepancies: 0 · Inconclusive: 0 · Errors: 0

| Sample | Result | Detail |
|---|---|---|
| `HR.2079-119` | blocked-by-cf |  |
| `HR.7624-117` | blocked-by-cf |  |
| `HR.9548-118` | blocked-by-cf |  |
| `S.199-119` | blocked-by-cf |  |
| `HR.3885-118` | blocked-by-cf |  |
| `HR.6105-118` | blocked-by-cf |  |
| `S.1044-118` | blocked-by-cf |  |
| `HR.8627-118` | blocked-by-cf |  |
| `S.721-119` | blocked-by-cf |  |
| `S.584-119` | blocked-by-cf |  |

## Audit 2 — Roll-call outcomes (votes.jsonl vs clerk.house.gov / senate.gov)

Verified: 7 · Discrepancies: 1 · Inconclusive: 2 · Errors: 0

| Sample | Result | Detail |
|---|---|---|
| `s128-118.1` | inconclusive | Could not extract result from XML (tag schema mismatch?) |
| `h460-115.2` | verified | Match: Passed |
| `h356-117.1` | verified | Match: Agreed to |
| `h616-116.1` | verified | Match: Passed |
| `h85-115.2` | verified | Match: Passed |
| `s465-117.1` | discrepancy | MISMATCH: votes.jsonl says "Nomination Confirmed (58-35)</vote_result_text>
  <question>On the Nomination</question>
  <vote_title>Confirmation: Robert Luis Santos, of Texas, to be Director of the Cen |
| `h291-116.1` | verified | Match: Agreed to |
| `h312-119.1` | verified | Match: Passed |
| `h225-116.1` | verified | Match: Agreed to |
| `s279-118.1` | inconclusive | Could not extract result from XML (tag schema mismatch?) |

## Next steps

- Discrepancies file as Tier 2 corrections via the editorial-decision-pipeline (David approves at `/audit-claude-decisions`).
- Inconclusive results indicate parser drift (markup or schema changed since the regex was written) — adjust the audit script.
- Fetch errors typically mean the source URL is wrong in the canonical store — file a bug.
