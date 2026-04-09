---
name: designaudit
description: "Scan all SCSS and TSX files for colors, border-radius, and shadows that violate the Design System. Reports violations and optionally fixes them."
---
name: designaudit

# Design Audit

You are auditing the codebase for Design System violations.

## What to scan

Scan all files in:
- `quartz/styles/custom.scss`
- `quartz/components/**/*.tsx`
- `quartz/components/styles/**/*.scss`

## Design System palette (from content/Design System.md)

### Allowed colors
```
Backgrounds: #f5f0eb (cream), #ece6dd (secondary cream), #e5dfd6 (hover), #0a0a0a (dark sections)
Text: #0a0a0a (primary), #333 (body), #555 (muted), #777 (dimmed), #999 (labels/meta)
Borders: #ddd (standard), #0a0a0a (heavy)
Accents: #fbbf24 (yellow UI), #e63946 (red/Republican), #1d4ed8 (blue/Democrat), #1e3a5f (heavy blue), #16a34a (green/verified), #dc2626 (danger)
White text on dark: #f5f0eb, #ccc
```

### Violations to find
1. **Old dark-theme colors** — any hex matching: `#0c0c0f`, `#0e0e14`, `#111118`, `#13131a`, `#141419`, `#151520`, `#1a1a22`, `#1a1a24`, `#1e1e28`, `#2a2a36`, `#5b8dce`, `#7a7a86`, `#8a8a96`, `#9a9aa6`, `#a1a1aa`, `#b4b4bc`, `#c8c8d2`, `#e4e4e7`, `#14141a`, `#0a0a0f`
2. **Old accent colors** — `#ef4444` (should be `#e63946`), `#f59e0b` (should be `#fbbf24`), `#22c55e` (should be `#16a34a`), `#10b981` (should be `#16a34a`)
3. **Border radius > 0** — any `border-radius` value that isn't `0`, `0px`, `0 !important`, or `50%` (circles allowed)
4. **Box shadows** — any `box-shadow` that isn't `none`
5. **Gradients** — any `linear-gradient` or `radial-gradient` used for decoration (not for the yellow underline highlight effect)
6. **rgba with old colors** — `rgba(91, 141, 206, ...)` (old blue), `rgba(129, 140, 248, ...)` (old purple)

## Output format

Report violations grouped by file:
```
FILE: quartz/components/SomeComponent.tsx
  Line 45: #5b8dce → should be #0a0a0a or #1d4ed8
  Line 89: border-radius: 6px → should be 0
  Line 102: box-shadow: 0 2px 4px... → should be none

FILE: quartz/styles/custom.scss
  Line 234: #e4e4e7 → should be #0a0a0a
```

## Fix mode

If the user says "fix" or "fix them", apply all replacements automatically using the Edit tool. Commit with message:
```
Design audit: fix N violations across M files
```

If the user just says "audit" or "check", report only — don't modify files.

## Exclusions
- Skip `prototype/` directory (reference files, not deployed)
- Skip `LandingPage.tsx` construction mode section (has its own palette)
- Skip `node_modules/`, `.next/`, `ops/`
- `50%` border-radius is allowed (circles for party dots)
- The yellow underline `linear-gradient(to bottom, transparent 60%, #fbbf24 60%)` is allowed
