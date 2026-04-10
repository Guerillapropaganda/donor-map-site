---
title: Pipeline Janitor Report
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-10'
generated-by: scripts/pipeline-janitor.cjs
---

# Pipeline Janitor Report

Generated: 2026-04-10T23:31:06.923Z
Mode: **WRITE** (applied fixes)

## Summary

- Profiles scanned: 1752
- Profiles at ready/verified audited: 494
- Profiles with issues: **32**
- Total issues: 38

### By issue kind

- `zombie-block`: 34
- `known-gap-pipeline`: 4

## Findings

### Ayanna Pressley Master Profile

- **Path:** `Politicians/Democrats/House/Ayanna Pressley/_Ayanna Pressley Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (3):**
  - `known-gap-pipeline` — known-gaps mentions "Needs re-enrichment" — should be draft → **demote to draft**
  - `zombie-block` — fec-candidate-id=H8MA07032 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=P000617 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Jamie Raskin

- **Path:** `Politicians/Democrats/House/Jamie Raskin/_Jamie Raskin Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — fec-candidate-id=H6MD08457 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=R000606 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Katie Porter Master Profile

- **Path:** `Politicians/Races/CA Governor 2026/Katie Porter/_Katie Porter Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — fec-candidate-id=S4CA00522 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=P000618 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Tom Cole

- **Path:** `Politicians/Republicans/House/Tom Cole/_Tom Cole Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — fec-candidate-id=H2OK04055 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=C001053 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Lisa Murkowski

- **Path:** `Politicians/Republicans/Senate/Lisa Murkowski/_Lisa Murkowski Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (2):**
  - `zombie-block` — fec-candidate-id=S4AK00099 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**
  - `zombie-block` — bioguide-id=M001153 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### QVT Financial

- **Path:** `Donors & Power Networks/Wall Street/QVT Financial.md`
- **Current readiness:** `ready`
- **Type:** `corporation`
- **Issues (1):**
  - `known-gap-pipeline` — known-gaps mentions "Auto-blocks stripped" — should be draft → **demote to draft**

### Sherrod Brown

- **Path:** `Politicians/Democrats/Former/Sherrod Brown.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `known-gap-pipeline` — known-gaps mentions "needs re-enrichment" — should be draft → **demote to draft**

### Cori Bush

- **Path:** `Politicians/Democrats/House/Cori Bush/_Cori Bush Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=B001224 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Frank Pallone

- **Path:** `Politicians/Democrats/House/Frank Pallone/_Frank Pallone Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=P000034 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Hakeem Jeffries Master Profile

- **Path:** `Politicians/Democrats/House/Hakeem Jeffries/_Hakeem Jeffries Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=J000294 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Ilhan Omar Master Profile

- **Path:** `Politicians/Democrats/House/Ilhan Omar/_Ilhan Omar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=O000173 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Jamaal Bowman Master Profile

- **Path:** `Politicians/Democrats/House/Jamaal Bowman/_Jamaal Bowman Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `known-gap-pipeline` — known-gaps mentions "needs fresh pipeline" — should be draft → **demote to draft**

### Jim Himes

- **Path:** `Politicians/Democrats/House/Jim Himes/_Jim Himes Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — fec-candidate-id=H8CT04172 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**

### Mark Takano

- **Path:** `Politicians/Democrats/House/Mark Takano/_Mark Takano Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — fec-candidate-id=H2CA43245 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**

### Raja Krishnamoorthi

- **Path:** `Politicians/Democrats/House/Raja Krishnamoorthi/_Raja Krishnamoorthi Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=K000391 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Rashida Tlaib

- **Path:** `Politicians/Democrats/House/Rashida Tlaib/_Rashida Tlaib Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=T000481 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Ro Khanna Master Profile

- **Path:** `Politicians/Democrats/House/Ro Khanna/_Ro Khanna Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=K000389 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Rosa DeLauro

- **Path:** `Politicians/Democrats/House/Rosa DeLauro/_Rosa DeLauro Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=D000216 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Zoe Lofgren

- **Path:** `Politicians/Democrats/House/Zoe Lofgren/_Zoe Lofgren Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=L000397 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Amy Klobuchar

- **Path:** `Politicians/Democrats/Senate/Amy Klobuchar/_Amy Klobuchar Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — fec-candidate-id=S6MN00267 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**

### Cory Booker

- **Path:** `Politicians/Democrats/Senate/Cory Booker/_Cory Booker Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=B001288 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Jack Reed

- **Path:** `Politicians/Democrats/Senate/Jack Reed/_Jack Reed Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=R000122 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Raphael Warnock Master Profile

- **Path:** `Politicians/Democrats/Senate/Raphael Warnock/_Raphael Warnock Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=W000790 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Sheldon Whitehouse

- **Path:** `Politicians/Democrats/Senate/Sheldon Whitehouse/_Sheldon Whitehouse Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=W000802 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Vivek Ramaswamy Master Profile

- **Path:** `Politicians/Races/OH Governor 2026/Vivek Ramaswamy/_Vivek Ramaswamy Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — fec-candidate-id=P40011082 but no <!-- auto:fec-politician --> block in body → **re-run fec pipeline**

### Bruce Westerman

- **Path:** `Politicians/Republicans/House/Bruce Westerman/_Bruce Westerman Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=W000821 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Bryan Steil

- **Path:** `Politicians/Republicans/House/Bryan Steil/_Bryan Steil Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=S001213 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### James Comer

- **Path:** `Politicians/Republicans/House/James Comer/_James Comer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=C001108 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Jason Smith

- **Path:** `Politicians/Republicans/House/Jason Smith/_Jason Smith Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=S001195 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Deb Fischer

- **Path:** `Politicians/Republicans/Senate/Deb Fischer/_Deb Fischer Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=F000463 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Jim Risch

- **Path:** `Politicians/Republicans/Senate/Jim Risch/_Jim Risch Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=R000584 but no <!-- auto:congress --> block in body → **re-run congress pipeline**

### Tim Scott

- **Path:** `Politicians/Republicans/Senate/Tim Scott/_Tim Scott Master Profile.md`
- **Current readiness:** `ready`
- **Type:** `politician`
- **Issues (1):**
  - `zombie-block` — bioguide-id=S001184 but no <!-- auto:congress --> block in body → **re-run congress pipeline**
