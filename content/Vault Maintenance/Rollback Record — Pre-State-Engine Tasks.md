---
title: "Rollback Record — Pre-State-Engine Tasks"
type: reference
content-readiness: ready
last-updated: 2026-03-31
source-tier: null
parent: null
---

### Rollback Record — Pre-State-Engine Tasks

Created: 2026-03-31
Purpose: Full record of all 20 scheduled tasks disabled during the state engine refactor. Enables exact restoration if needed.

**To restore any task:** Run `update_scheduled_task` with the taskId and `enabled: true`. The cron expression, prompt, and all configuration remain intact on each task.

**To restore ALL tasks:** Re-enable every task in the table below. The new state-engine tasks (`state-structuring`, `state-node-build`, `state-story`, `state-validate`) should be disabled first to avoid conflicts.

---

### Disabled Tasks — Full Record

| # | Task ID | Cron | Schedule (Human) | Last Run (UTC) | Was Enabled | Absorbed Into |
|---|---------|------|-----------------|----------------|-------------|---------------|
| 1 | `url-verification` | `0 */2 * * *` | Every 2 hours | 2026-03-31T15:33 | YES | VALIDATION |
| 2 | `story-discovery` | `30 */3 * * *` | Every 3 hours | 2026-03-31T15:33 | YES | STORY |
| 3 | `vault-audit` | `0 8 * * *` | Daily 8 AM | 2026-03-31T15:33 | YES | STRUCTURING + VALIDATION |
| 4 | `donor-node-builder` | `15 */2 * * *` | Every 2 hours | 2026-03-31T15:34 | YES | NODE BUILD |
| 5 | `profile-builder` | `45 */2 * * *` | Every 2 hours | 2026-03-31T15:48 | YES | NODE BUILD |
| 6 | `finance-research` | `0 6 * * *` | Daily 6 AM | 2026-03-31T15:34 | YES | NODE BUILD |
| 7 | `table-format-retrofit` | `0 * * * *` | Hourly | 2026-03-26T14:03 | NO (already disabled) | STRUCTURING |
| 8 | `url-fix-broken` | `30 * * * *` | Hourly | 2026-03-31T15:35 | YES | STRUCTURING |
| 9 | `thin-profile-expansion` | `15 * * * *` | Hourly | 2026-03-31T16:16 | YES | NODE BUILD |
| 10 | `substack-content-adapter` | `0 10 * * *` | Daily 10 AM | 2026-03-30T23:17 | YES | STORY |
| 11 | `weekly-roundup-compiler` | `0 7 * * 5` | Friday 7 AM | 2026-03-27T14:10 | YES | STORY |
| 12 | `publish-audit` | `0 6 * * *` | Daily 6 AM | 2026-03-31T15:35 | YES | VALIDATION |
| 13 | `outreach-list-builder` | `0 11 * * 1` | Monday 11 AM | 2026-03-30T23:18 | YES | Manual trigger only |
| 14 | `crossover-analysis` | `0 9 * * 2,5` | Tue/Fri 9 AM | 2026-03-31T16:00 | YES | STORY |
| 15 | `media-profile-builder` | `30 * * * *` | Hourly | 2026-03-31T15:36 | YES | NODE BUILD |
| 16 | `think-tank-builder` | `45 * * * *` | Hourly | 2026-03-31T15:47 | YES | NODE BUILD |
| 17 | `lobbying-firm-builder` | `10 * * * *` | Hourly | 2026-03-31T16:12 | YES | NODE BUILD |
| 18 | `election-cycle-updater` | `0 7 * * 1,4` | Mon/Thu 7 AM | 2026-03-30T23:19 | YES | NODE BUILD |
| 19 | `connection-mapper` | `0 12 * * 3,6` | Wed/Sat 12 PM | 2026-03-28T19:03 | YES | CONNECTION MAPPING |
| 20 | `profile-freshness-checker` | `0 9 * * 0` | Sunday 9 AM | 2026-03-29T21:34 | YES | CONNECTION MAPPING |

---

### Rollback Commands

To restore the full pre-refactor system, disable the 4 new state tasks first, then re-enable each old task:

```
# Disable new state tasks
update_scheduled_task: state-structuring → enabled: false
update_scheduled_task: state-node-build → enabled: false
update_scheduled_task: state-story → enabled: false
update_scheduled_task: state-validate → enabled: false

# Re-enable old tasks (all 19 that were enabled before refactor)
update_scheduled_task: url-verification → enabled: true
update_scheduled_task: story-discovery → enabled: true
update_scheduled_task: vault-audit → enabled: true
update_scheduled_task: donor-node-builder → enabled: true
update_scheduled_task: profile-builder → enabled: true
update_scheduled_task: finance-research → enabled: true
update_scheduled_task: url-fix-broken → enabled: true
update_scheduled_task: thin-profile-expansion → enabled: true
update_scheduled_task: substack-content-adapter → enabled: true
update_scheduled_task: weekly-roundup-compiler → enabled: true
update_scheduled_task: publish-audit → enabled: true
update_scheduled_task: outreach-list-builder → enabled: true
update_scheduled_task: crossover-analysis → enabled: true
update_scheduled_task: media-profile-builder → enabled: true
update_scheduled_task: think-tank-builder → enabled: true
update_scheduled_task: lobbying-firm-builder → enabled: true
update_scheduled_task: election-cycle-updater → enabled: true
update_scheduled_task: connection-mapper → enabled: true
update_scheduled_task: profile-freshness-checker → enabled: true
# table-format-retrofit was already disabled — skip unless needed
```
