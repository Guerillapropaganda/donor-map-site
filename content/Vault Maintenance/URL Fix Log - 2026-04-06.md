---
title: "URL Fix Log - 2026-04-06"
type: reference
content-readiness: ready
last-updated: 2026-04-06
source-tier: null
parent: null
---

### URL Fix Log — April 6, 2026

**File:** `topics/Stories/Published/Investigations/Defense Contractor 450000 Percent ROI.md`

---

### Fix 1: OpenSecrets Revolving Door — Northrop Grumman

- **Dead:** `https://www.opensecrets.org/revolving/search.php?q=Northrop+Grumman`
- **Also dead (inline):** `https://www.opensecrets.org/revolving/`
- **Replaced with:** `https://www.opensecrets.org/orgs/northrop-grumman/summary?id=D000000170`
- **Reason:** The old `/revolving/search.php` endpoint is gone. The org summary page now embeds the revolving door data directly — it shows 29 of 36 Northrop lobbyists previously held government jobs (80.56%).
- **Occurrences fixed:** 2 (inline citation line 29, Sources section line 91)

---

### Fix 2: ProPublica Represent

- **Dead:** `https://projects.propublica.org/represent/`
- **Replaced with:** `https://projects.propublica.org/api-docs/congress-api/`
- **Reason:** The Represent tool was retired. The Congress API documentation page is its direct successor.
- **Occurrences fixed:** 2 (inline citation line 30, Sources section line 92)

---

### Fix 3: Public Citizen — Defense Contractor Donations

- **Dead:** `https://www.citizen.org/article/defense-contractor-donations/`
- **Dead (inline):** `https://www.citizen.org/article/military-industrial-complex-contributions-report/` (this was actually the live one)
- **Replaced both with:** `https://www.citizen.org/article/military-industrial-complex-contributions-report/`
- **Reason:** The `/defense-contractor-donations/` slug never existed. The actual live article is "Military-Industrial Complex Clinches Nearly 450,000% Return on Investment" at the `/military-industrial-complex-contributions-report/` path. Verified live via WebFetch.
- **Occurrences fixed:** 2 (inline citation line 27, Sources section line 89)

---

### Fix 4: OpenSecrets Defense Industry Tracker

- **Dead:** `https://www.opensecrets.org/industries/ind_defense.php`
- **Dead (inline):** `https://www.opensecrets.org/industries?Ind=D`
- **Replaced both with:** `https://www.opensecrets.org/industries/contrib?cycle=2024&ind=D`
- **Reason:** Both old URLs used a deprecated PHP/query structure. The current defense industry contributions page uses the new path format.
- **Occurrences fixed:** 2 (inline citation line 25, Sources section line 87)

---

### Summary

| # | Source | Old URL | New URL | Count |
|---|--------|---------|---------|-------|
| 1 | OpenSecrets Revolving Door | `/revolving/search.php` + `/revolving/` | `/orgs/northrop-grumman/summary?id=D000000170` | 2 |
| 2 | ProPublica Represent | `/represent/` | `/api-docs/congress-api/` | 2 |
| 3 | Public Citizen | `/defense-contractor-donations/` | `/military-industrial-complex-contributions-report/` | 2 |
| 4 | OpenSecrets Defense Industry | `/industries/ind_defense.php` + `/industries?Ind=D` | `/industries/contrib?cycle=2024&ind=D` | 2 |

**Total:** 8 URL occurrences fixed across 1 file.
