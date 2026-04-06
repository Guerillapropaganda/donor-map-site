---
title: Session State
type: system
last-updated: 2026-04-06
---

# Session State

Both Code Claude and Research Claude update this at the end of every session. Read this first.

---

## Last Session
Claude: Code
Date: 2026-04-06

Done:
- **Network Graph**: Built force-directed network graph at `/interactive/network-graph`
  - New emitter (`networkGraphIndex.ts`) generates 711 nodes + 717 edges at build time
  - D3 force simulation with hexagonal politician nodes (party-colored) + donor rectangles
  - Search, party/donor filters, node count slider (50-500), zoom/pan, hover tooltips
  - ProfileWidget mini-graph tab: 1-hop neighborhood as small force graph in sidebar
- **OpenSecrets URL migration continued**: ran 4 more categories via GitHub Actions
  - federal-lobbying: 374 URLs → Senate LDA (84 files)
  - outside-spending: 117 URLs → FEC (38 files)
  - donor-lookup: 108 URLs → FEC (42 files)
  - industries: 205 URLs → FEC (77 files)
  - `orgs` category run triggered (820 URLs, needs FEC lookups — may have timed out)
- Verified LobbyView API key works (LOBBYVIEWAPI secret confirmed in repo)
- Slimmed CLAUDE.md, archived Publish Settings Guide

In flight:
- `orgs` opensecrets run may need retry (FEC lookups are slow)
- `political-action-committees-pacs` (387 URLs) not yet run

Next:
- Check `orgs` run result, retry if timed out
- Run `political-action-committees-pacs` category
- Run remaining small categories: races, officeholders, fara, dark-money, JFCs
- Polish network graph: edge visibility, label overlap in dense areas, mobile layout
- Run full pipeline enrichment cycle to populate `verified` tier

---

## Previous Sessions

### Code Claude — 2026-04-06 (earlier)
- Ran opensecrets-replace --write for members-of-congress: 997 URLs across 346 files
- Built opensecrets-replace.yml workflow + fixed generic slug bug
- Slimmed CLAUDE.md from 171→107 lines

### Code Claude — 2026-04-06 (earlier)
- Built LobbyView pipeline, OpenSecrets URL replacement script
- Rewrote vault methodology: Vault Rules.md + Pipeline Guide.md + Session State.md

### Code Claude — 2026-04-06 (earlier)
- Party dots, sidebar nav fixes, ProfileWidget scope widening
- FEC + Congress pipeline auto-blocks, pipeline timeout/push fixes

### Code Claude — 2026-04-05
- API enrichment: 122 files across 4 runs
- GovTrack, SAM, USASpending pipelines

### Research Claude — 2026-04-05
- Vault audit, source integrity pass on 55 files
