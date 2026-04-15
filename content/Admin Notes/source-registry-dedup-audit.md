---
title: "Source Registry Dedup Audit"
type: admin-note
note-type: data
status: open
last-updated: 2026-04-15
generator: scripts/source-registry-dedup-audit.cjs
---

# Source Registry Dedup Audit

The source registry's `normalizeUrl()` in `scripts/lib/sources-schema.cjs` dedupes on write using: lowercase host, strip `www.`, force `https://`, strip tracking params (utm/fbclid/etc.), strip trailing slash. This catches ~90% of duplicates but misses several categories that need a second pass.

## Summary

- **Total sources:** 14681
- **Loose-duplicate groups:** 1 (1 redundant records)
- **Entity-duplicate groups:** 8 (11 redundant records)
- **Normalizer bugs:** 0 (exact same URL, different source IDs — these are outright dedup failures on the write path)

## Entity-duplicate groups (8)

Same FEC committee / FEC candidate / Congress.gov bill / Congress.gov member, registered multiple times with different URL shapes (e.g. `/data/committee/C00123` vs `/committee/C00123` vs `/committee/C00123/receipts`). Consolidating these is a larger effort — pick one canonical URL per entity and migrate all citations.

| Entity key | Count | URL variants |
|---|---:|---|
| `fec-committee:C00495861` | 5 | https://www.fec.gov/data/committee/C00495861/ · https://www.fec.gov/data/committee/C00495861/?cycle=2012 · https://www.fec.gov/data/committee/C00495861/?cycle=2016 … |
| `congress-bill:117th-congress/house-bill/5376` | 2 | https://www.congress.gov/bill/117th-congress/house-bill/5376 · https://www.congress.gov/bill/117th-congress/house-bill/5376/text |
| `fec-committee:C00504530` | 2 | https://www.fec.gov/data/committee/C00504530/ · https://www.fec.gov/data/committee/C00504530/?tab=summary |
| `congress-bill:118th-congress/house-bill/7521` | 2 | https://www.congress.gov/bill/118th-congress/house-bill/7521/text · https://www.congress.gov/bill/118th-congress/house-bill/7521 |
| `congress-bill:115th-congress/house-bill/1` | 2 | https://www.congress.gov/bill/115th-congress/house-bill/1/text · https://www.congress.gov/bill/115th-congress/house-bill/1 |
| `fec-committee:C00753251` | 2 | https://www.fec.gov/data/committee/C00753251/ · https://www.fec.gov/data/committee/C00753251/?tab=contributions |
| `congress-bill:118th-congress/house-bill/3421` | 2 | https://www.congress.gov/bill/118th-congress/house-bill/3421/cosponsors · https://www.congress.gov/bill/118th-congress/house-bill/3421 |
| `fec-committee:C00042366` | 2 | https://www.fec.gov/data/committee/C00042366/ · https://www.fec.gov/data/committee/C00042366/?cycle=2024 |

## Loose-duplicate groups (top 30 of 1)

These groups share the same loosely-normalized URL (host lowercased, trailing slash stripped, fragment removed, archive.org prefix unwrapped). Candidates for a future extension to `normalizeUrl()`.

| Loose key | Count | Sample URLs |
|---|---:|---|
| `https://en.wikipedia.org/wiki/hillbilly_elegy` | 2 | https://en.wikipedia.org/wiki/Hillbilly_Elegy · https://en.wikipedia.org/wiki/Hillbilly_Elegy#Critical_reception |

---

*Regenerate: `node scripts/source-registry-dedup-audit.cjs --write`. Re-run after each dedup pass.*
