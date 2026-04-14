---
title: "Featured-date audit"
type: admin-note
note-type: data
last-updated: '2026-04-11'
generated-by: scripts/featured-date-enforcer.cjs
---

# Featured-date audit

Generated: 2026-04-11T09:11:46.966Z

**3 profiles** have `featured-date:` set.

- **0** are at verified or s-tier ✓
- **3** are BELOW verified ⚠️

## At tier (OK to feature)

_None yet._

## Below tier, should not be featured once enforcement is enabled

- **Raytheon (RTX Corporation)** _(ready)_, featured 2026-04-10, `Donors & Power Networks/Defense & Intelligence/Raytheon (RTX).md`
- **AIPAC - American Israel Public Affairs Committee** _(ready)_, featured 2026-04-03, `Donors & Power Networks/Israel Lobby/AIPAC - American Israel Public Affairs Committee.md`
- **Koch Network - Charles Koch** _(draft)_, featured 2026-04-17, `Donors & Power Networks/Mega-Donors/Koch Network - Charles Koch.md`

## How to resolve

1. Run the A+ audit on each below-tier profile: `node scripts/pipeline-janitor.cjs --tier=a-plus --write`
2. Fill in missing fields (central-thesis, story-grade, etc.)
3. David signs off → profile becomes verified
4. The Quartz homepage will then render them through the A+ gate instead of the curated featured-date list