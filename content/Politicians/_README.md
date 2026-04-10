---
title: "README - Politicians"
type: reference
content-readiness: draft
last-updated: 2026-03-23
source-tier: null
parent: null
known-gaps:
  - "No mapped relationships"
---

### Politicians/

All politician profiles in the vault. Organized by party, then by role.

### Structure

```
Politicians/
├── Democrats/
│   ├── Senate/          ← Each senator gets a folder: Name/ containing master + sub-notes
│   ├── House/
│   ├── Governors/       ← Includes Newsom with full subfolder tree
│   ├── Presidential/    ← 2028 field: Pritzker, Shapiro, Moore, Beshear, etc.
│   └── CA Governor 2026/
├── Republicans/
│   ├── Senate/
│   ├── House/
│   ├── Governors/
│   ├── Presidential/
│   ├── Trump Cabinet/   ← All 9 cabinet master profiles + sub-notes
│   └── CA Governor 2026/
├── Independent/         ← Manchin, Sinema, Christie
├── SCOTUS/              ← Thomas, Alito, Kavanaugh, Barrett
└── International/       ← Netanyahu, Ben-Gvir, Smotrich, Zelenskyy
```

### Naming Convention

- Master profiles: `_[Name] Master Profile.md` (underscore prefix sorts first)
- Sub-notes: Descriptive name in the same folder as the master profile
- Each politician with sub-notes gets their own folder
- Politicians without sub-notes are standalone files in their role folder

### File Types

| YAML type | Description |
|-----------|-------------|
| `politician` | Master profiles, placeholders, standalone politician files |
| `sub-note` | Policy analysis, donor mapping under a specific politician |

### Rules

- Every master profile must have a dataview table pulling sub-notes
- Sub-notes must set `parent:` in YAML frontmatter
- Every politician must be linked to at least one donor node
- Placeholders use `content-readiness: raw` and include build-out priorities

