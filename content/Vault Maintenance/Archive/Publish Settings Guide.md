---
title: "Publish Settings Guide"
type: reference
content-readiness: draft
last-updated: 2026-03-24
source-tier: null
parent: null
known-gaps:
  - "No mapped relationships"
---

### Obsidian Publish Settings Guide

These are settings changes David needs to make in the Obsidian desktop app to complete the website overhaul. None of these can be done from outside — they require the Publish plugin settings panel.

---

### 1. Pin "The Donor Map Database" to Top of Sidebar

**Where:** Obsidian → Settings → Publish → Site options → Navigation

**What to do:** Set "The Donor Map Database" as the home page. In the Publish settings, under "Navigation," you can drag the file order or set it as the default landing note. This will pin it above the folder tree (Donors & Power Networks, Politicians, Stories) in the left sidebar.

---

### 2. Make "The Donor Map" Header Link to Homepage

**Where:** Obsidian → Settings → Publish → Site options → General

**What to do:** Set the "Home page" field to `The Donor Map Database`. This makes the site title ("The Donor Map") in the top-left corner clickable and linked to the homepage. Visitors clicking the site name will always return to the homepage.

---

### 3. Publish the New Pages

**Where:** Obsidian → Publish plugin → Publish changes

### New files to publish:
- `topics/The Donor Map Database.md` (updated homepage)
- `topics/Politicians Index.md` (new)
- `topics/Donors & Power Networks Index.md` (new)
- `topics/Follow the Money - Guided Tour.md` (new)
- `topics/Browse by Pattern.md` (new)
- `topics/publish.css` (updated CSS)

---

### 4. Include New Pages in Navigation

**Where:** Obsidian → Settings → Publish → Site options → Navigation

**What to do:** Add the new index pages to the sidebar navigation so visitors can find them. Suggested order:

1. The Donor Map Database (homepage — pinned to top)
2. Politicians Index
3. Donors & Power Networks Index
4. Follow the Money - Guided Tour
5. Browse by Pattern
6. Donors & Power Networks (folder)
7. Politicians (folder)
8. Stories (folder)

---

### 5. Optional: Custom Favicon

**Where:** Obsidian → Settings → Publish → Site options → General → Favicon

**What to do:** Upload a custom favicon (16x16 or 32x32 PNG). Suggested: a simple dollar sign, crosshair, or a stylized "DM" logo. The default is the Obsidian icon.

---

### 6. Show Full Graph on Homepage

**Where:** On the published site, click the graph view icon (top-right). Then look for the settings gear inside the graph panel.

**What to do:** Set the **graph depth to maximum** (5 or 6). Since the homepage links to the index pages, which link to every profile, which link to every donor — the full 724-node network will render from the homepage. This is the "investigation board" effect — visitors see the entire web of money and power on their first visit.

**On individual profile pages:** The high depth means those pages will also show more of the network than before, but that's actually a feature — it shows visitors how connected everything is. The graph becomes a visual argument for the vault's thesis: everything is connected through money.

**CSS already updated:** The `publish.css` now includes larger graph panel minimum height (300px), gold-colored nodes by default, red for active/hovered nodes, brighter gold for connected neighbors, and dimmed unresolved links. Nodes are slightly larger for visibility at full-network scale.

**Note on per-folder coloring:** Full node-color-by-folder (politicians = red, donors = gold, stories = blue) requires features Obsidian Publish doesn't yet expose. The CSS applies what's available — gold base nodes, red active nodes, dimmed unresolved. If Obsidian adds folder-based graph node classes to Publish in the future, we can add per-type coloring.

---

### Quick Checklist

- [ ] Set "The Donor Map Database" as home page
- [ ] Set graph depth to maximum (5-6)
- [ ] Publish 6 new/updated files + updated CSS
- [ ] Add new pages to sidebar navigation
- [ ] Reorder sidebar: homepage first, then index pages, then folders
- [ ] Optional: upload custom favicon
- [ ] Test: click "The Donor Map" header → should go to homepage
- [ ] Test: sidebar shows homepage at top
- [ ] Test: homepage graph shows full network (not just local connections)

---

content-readiness:: ready
