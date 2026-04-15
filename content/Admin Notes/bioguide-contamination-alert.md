---
title: "🚨 Bioguide contamination alert — 2026-04-15"
type: admin-note
note-type: data
priority: urgent
status: open
last-updated: '2026-04-15'
generated-by: scripts/duplicate-bioguide-sentinel.cjs
---

# 🚨 Duplicate bioguide-ids detected

1 bioguide-id values appear on more than one profile. Bioguides are unique per person — this is definitionally wrong.

## Affected

### C001091

- **Barbara Lee** — `Politicians/Democrats/House/Barbara Lee.md`
- **Joaquin Castro** — `Politicians/Democrats/House/Joaquin Castro/_Joaquin Castro Master Profile.md`

## Action

1. Run `node scripts/fix-bioguide-contamination.cjs` (clears wrong bioguides)
2. Use `node scripts/recover-bioguide.cjs "Name" BIOGUIDE` to restore correct IDs manually
3. Investigate which script wrote the wrong value