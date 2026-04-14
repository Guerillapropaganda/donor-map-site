---
title: "README - Stories"
type: reference
content-readiness: draft
last-updated: 2026-03-25
source-tier: null
parent: null
known-gaps:
  - "No mapped relationships"
---

# Stories/

Analytical pieces and working files, separated for clean publishing.

## Structure

| Folder | Purpose | Publish? |
|--------|---------|----------|
| **Published/** | Analytical stories, investigations, contradiction deep dives, race analyses, crossover comparisons | Yes, candidates for Obsidian Publish |
| **Internal/** | Automated daily scans, research logs, working outputs from scheduled tasks | No, internal infrastructure only |

### Published/ subfolders

| Subfolder | Contents |
|-----------|----------|
| Cross-Politician Analysis/ | Cross-spectrum comparisons (Trump-Newsom, Schumer-McConnell, etc.) |
| Contradiction Deep Dives/ | 13 deep dives on shared-donor contradictions |
| Investigations/ | Money trail investigations (ALEC, crypto PACs, revolving door, etc.) |
| 2026 Senate Races/ | State-by-state 2026 Senate race donor analysis |
| 2026 House Races/ | District-level 2026 House race donor analysis |
| 2028 Presidential Race/ | 2028 landscape, donor fractures, funding gaps |
| *(root)* | Standalone analytical stories (Carried Interest, Farm Bill, SCOTUS Capture, etc.) |

### Internal/ subfolders

| Subfolder | Contents | Source |
|-----------|----------|--------|
| Daily Updates/ | News scans, story discoveries | `story-discovery` scheduled task |
| Research Logs/ | Finance research, policy research | `finance-research` scheduled task |

## YAML Types

- Published stories: `type: story`
- Internal daily updates: `type: daily-update`

