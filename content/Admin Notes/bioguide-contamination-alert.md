---
title: "🚨 Bioguide contamination alert — 2026-04-11"
type: admin-note
note-type: data
priority: urgent
status: open
last-updated: '2026-04-11'
generated-by: scripts/duplicate-bioguide-sentinel.cjs
---

# 🚨 Duplicate bioguide-ids detected

1 bioguide-id values appear on more than one profile. Bioguides are unique per person — this is definitionally wrong.

## Affected

### C001091

- **Bennie Thompson** — `Politicians/Democrats/House/Bennie Thompson/_Bennie Thompson Master Profile.md`
- **Brendan Boyle** — `Politicians/Democrats/House/Brendan Boyle/_Brendan Boyle Master Profile.md`
- **Debbie Wasserman Schultz** — `Politicians/Democrats/House/Debbie Wasserman Schultz/_Debbie Wasserman Schultz Master Profile.md`
- **Gerry Connolly** — `Politicians/Democrats/House/Gerry Connolly/_Gerry Connolly Master Profile.md`
- **Jim Himes** — `Politicians/Democrats/House/Jim Himes/_Jim Himes Master Profile.md`
- **Jim McGovern** — `Politicians/Democrats/House/Jim McGovern/_Jim McGovern Master Profile.md`
- **Mark Takano** — `Politicians/Democrats/House/Mark Takano/_Mark Takano Master Profile.md`
- **Maxine Waters** — `Politicians/Democrats/House/Maxine Waters/_Maxine Waters Master Profile.md`

## Action

1. Run `node scripts/fix-bioguide-contamination.cjs` (clears wrong bioguides)
2. Use `node scripts/recover-bioguide.cjs "Name" BIOGUIDE` to restore correct IDs manually
3. Investigate which script wrote the wrong value