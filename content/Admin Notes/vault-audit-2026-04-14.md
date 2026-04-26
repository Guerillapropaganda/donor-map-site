---
title: "Vault Audit — 2026-04-14"
type: admin-note
note-type: code
priority: normal
status: open
last-updated: 2026-04-14
note-kind: report
---

# Vault Audit 2026-04-14

Cleanup pass triggered by the post-bulk-approval investigation. See Session State for full context.

## Done (Code Claude)

### Em dashes stripped vault-wide
- Processed all `ready/verified` profiles (body) + all profiles in `--all` mode (body, visible frontmatter, callouts)
- `20,105` em dashes removed from live content
- Skipped on purpose: external news blockquotes, fenced code, auto-blocks, `internal-notes` frontmatter, `content/Vault Maintenance/`
- Residual count outside archive: `0` body, `0` callout, `23` frontmatter (mostly `known-gaps`), `2582` blockquote (news quotes), `175` code, `7245` auto-block
- Script: `scripts/strip-em-dashes.cjs --all`
- Also updated `ops/src/app/api/urls/save/route.ts` — archive marker now uses a comma instead of an em dash

### "Master Profile" suffix stripped from titles
- `612` profile titles updated: `"X Master Profile"` → `"X"`
- Filenames left alone (renaming would break `[[_X Master Profile]]` wikilinks across the vault)
- Script: `scripts/strip-master-profile-title-suffix.cjs`

### Duplicate entity cases resolved (8)
- **Merged and deleted the smaller duplicate** (6): Heritage Foundation, American Enterprise Institute, Center for American Progress, Federalist Society, PhRMA, Ballard Partners. Pipeline frontmatter (EIN, SEC filings, total-revenue, etc.) was absorbed into the canonical profile first. Aliases added so FEC writes still route.
- **Renamed to disambiguate** (2): David Sacks and JB Pritzker donor profiles are LARGER than the politician profiles and contain unique editorial analysis. Titles renamed to `"David Sacks (Donor Network)"` and `"JB Pritzker (Donor Network)"`. Both files preserved.
- Script: `scripts/merge-duplicate-entities.cjs`

## Flagged for Research Claude (not auto-fixed)

### Banned AI vocabulary — 270 instances
Voice-drift-detector words present in live profile bodies. Not auto-replaced because context-sensitive.

| Word | Count |
|---|---|
| significantly | 125 |
| ultimately | 78 |
| notably | 42 |
| additionally | 11 |
| importantly | 10 |
| crucially | 5 |
| testament to | 1 |
| moreover | 1 |
| delves | 1 |

**Top 10 files to clean up first** (highest density):
1. `Think Tanks & Policy Infrastructure/Conservative/American Enterprise Institute.md` (5)
2. `Think Tanks & Policy Infrastructure/Conservative/Heritage Foundation.md` (4)
3. `Donors & Power Networks/Energy & Utilities/Koch Industries.md` (3)
4. `Donors & Power Networks/Labor Unions/UAW - United Auto Workers.md` (3)
5. `Donors & Power Networks/Pharma & Healthcare/PhRMA.md` (3)
6. `Donors & Power Networks/Real Estate/Invitation Homes - Institutional Landlords.md` (3)
7. `Lobbying Firms & K Street/Alpine Group.md` (3)
8. `Lobbying Firms & K Street/Squire Patton Boggs.md` (3)
9. `Politicians/Democrats/House/Pramila Jayapal/_Pramila Jayapal Master Profile.md` (3)
10. `Donors & Power Networks/Dark Money/Gun Owners of America.md` (2)

Re-run `node scripts/audit-banned-vocab.cjs` to refresh.

### Body-merge pending on 2 people duplicates
David Sacks and JB Pritzker now have two distinct profiles: a politician master profile and a "(Donor Network)" profile. The donor profiles have ~40K/25K of editorial analysis that would be lost if the politician profile absorbed and deleted them. Suggested path: Research Claude merges the donor analysis into the master profile bodies, then the `(Donor Network)` profile can be deleted.

## Flagged for David (Editor-only)

### URL issues (do not fix automatically)
- **47 profiles still reference FollowTheMoney** (`followthemoney.org`). The site is dead; all FTM URLs are broken. Should be archived via `~~strikethrough~~`.
- **18 profiles have inline `[Source: OpenSecrets]`** without a real URL. Need to be converted to proper markdown links so the URL Manager can triage them.
- **15 profiles have `(URL NEEDED)` markers** — standard triage queue, Editor handles.

## Still Open

The 39 new PAC stub profiles created yesterday (`editorial-status: stub`) still need full editorial content. They surface via promotion-candidate-queue automatically.
