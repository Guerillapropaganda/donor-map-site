---
title: "Readiness Promotion Digest — Next Review Session"
type: admin-note
note-type: code
status: open
last-updated: 2026-04-15
generator: scripts/readiness-promotion-digest.cjs
note-kind: rollup
---

# Readiness Promotion Digest

Prep sheet for David's next manual review session. Profiles are ranked by distance-to-ready — the profiles at the top are ONE edit away from passing the publication-readiness gate. Work through them in order.

## Summary

- **Total profiles scanned:** 1274
- **Already passing the gate:** 0
- **One failure away:** 30
- **Two failures away:** 775

## 🟢 ready → verified promotion (19)

These profiles have passed every automated quality gate and are currently flagged `content-readiness: ready`. They need one thing: a human read-through, then a flag flip to `verified`. **Workflow:** open the profile in Ops, read the body end-to-end, check the Class Analysis section matches the editorial tone, then in the ops /readiness UI (or directly in frontmatter) change the flag. The next publication-readiness check will mark the profile as READY.

| Profile | Current flag |
|---|---|
| [Angie Craig Master Profile](/content/Politicians/Democrats/House/Angie Craig/_Angie Craig Master Profile.md) | ready |
| [Hakeem Jeffries Master Profile](/content/Politicians/Democrats/House/Hakeem Jeffries/_Hakeem Jeffries Master Profile.md) | ready |
| [Nina Turner Master Profile](/content/Politicians/Democrats/House/Nina Turner/_Nina Turner Master Profile.md) | ready |
| [Joe Manchin Master Profile](/content/Politicians/Independent/Joe Manchin/_Joe Manchin Master Profile.md) | ready |
| [Ron DeSantis Master Profile](/content/Politicians/Republicans/Governors/Ron DeSantis/_Ron DeSantis Master Profile.md) | ready |
| [Mike Lee Master Profile](/content/Politicians/Republicans/Senate/Mike Lee/_Mike Lee Master Profile.md) | ready |
| [Agricultural Labor Vulnerability Donors](/content/Donors & Power Networks/Agriculture/Agricultural Labor Vulnerability Donors.md) | ready |
| [ViaPath Technologies - GTL](/content/Donors & Power Networks/Carceral State/ViaPath Technologies - GTL.md) | ready |
| [Democracy Alliance](/content/Donors & Power Networks/Dark Money/Democracy Alliance.md) | ready |
| [Ohio Federation of Teachers](/content/Donors & Power Networks/Dark Money/Ohio Federation of Teachers.md) | ready |
| [DeVos Family](/content/Donors & Power Networks/Education/DeVos Family.md) | ready |
| [California Building and Construction Trades Council](/content/Donors & Power Networks/Labor Unions/California Building and Construction Trades Council.md) | ready |
| [Christopher Ruddy](/content/Donors & Power Networks/Media & Entertainment/Christopher Ruddy.md) | ready |
| [Kelcy Warren - Energy Transfer Partners](/content/Donors & Power Networks/Mega-Donors/Kelcy Warren - Energy Transfer Partners.md) | ready |
| [Patrick Soon-Shiong](/content/Donors & Power Networks/Mega-Donors/Patrick Soon-Shiong.md) | ready |
| [Real Estate Development Industry Bloc](/content/Donors & Power Networks/Real Estate/Real Estate Development Industry Bloc.md) | ready |
| [MAGA Small Dollar Base](/content/Donors & Power Networks/Super PACs/MAGA Small Dollar Base.md) | ready |
| [Craft Ventures](/content/Donors & Power Networks/Tech & Crypto/Craft Ventures.md) | ready |
| [QVT Financial](/content/Donors & Power Networks/Wall Street/QVT Financial.md) | ready |

## 🟡 draft → verified promotion (11)

These passed every other gate BUT are still marked `draft`. Skipping the `ready` intermediate tier is technically allowed if the content is solid. Still requires a full read.

| Profile |
|---|
| [Andy Beshear Master Profile](/content/Politicians/Democrats/Governors/Andy Beshear/_Andy Beshear Master Profile.md) |
| [Kamala Harris Master Profile](/content/Politicians/Democrats/Vice Presidential/Kamala Harris/_Kamala Harris Master Profile.md) |
| [Dick Cheney Master Profile](/content/Politicians/Republicans/Bush Cabinet/Dick Cheney/_Dick Cheney Master Profile.md) |
| [Lindsey Graham Master Profile](/content/Politicians/Republicans/Senate/Lindsey Graham/_Lindsey Graham Master Profile.md) |
| [Pam Bondi Master Profile](/content/Politicians/Republicans/Trump Cabinet/Pam Bondi/_Pam Bondi Master Profile.md) |
| [RSA - The Single-Patron Sheriff](/content/Donors & Power Networks/Dark Money/RSA - The Single-Patron Sheriff.md) |
| [aipac_bds](/content/Policies/aipac_bds.md) |
| [healthcare](/content/Policies/healthcare.md) |
| [housing](/content/Policies/housing.md) |
| [minimum_wage](/content/Policies/minimum_wage.md) |
| [student_debt](/content/Policies/student_debt.md) |

## 📋 Two failures (775)

Profiles with exactly two failures. Often the readiness flag PLUS one content issue. Two fixes away from ready.

Top failure-pair patterns:

- **578×** content-readiness is X, must be X + missing ## Class Analysis section (mandatory edito
- **180×** content-readiness is X, must be X + visible text contains strikethrough source — move 
- **16×** content-readiness is X, must be X + visible text contains marker
- **1×** content-readiness is X, must be X + source ref {{src

---

*Regenerate: `node scripts/readiness-promotion-digest.cjs --write`. Re-run after each review batch to see updated numbers.*
