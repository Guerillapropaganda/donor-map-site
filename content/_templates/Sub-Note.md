<%*
const title = await tp.system.prompt("Sub-note title (descriptive)");
const parentName = await tp.system.prompt("Parent politician's full name (must match master profile)");
const policyArea = await tp.system.prompt("Policy area or topic tag (e.g., healthcare, wall-street, israel-lobby)");
const party = await tp.system.suggester(["Democrat", "Republican", "Independent"], ["Democrats", "Republicans", "Independent"]);
const chamber = await tp.system.suggester(["Senate", "House", "Governor", "Presidential", "SCOTUS", "Trump Cabinet", "CA Governor 2026"], ["Senate", "House", "Governors", "Presidential", "SCOTUS", "Trump Cabinet", "CA Governor 2026"]);
const today = tp.date.now("YYYY-MM-DD");
const folderPath = `Politicians/${party}/${chamber}/${parentName}`;

await tp.file.move(`${folderPath}/${title}`);
-%>
---
title: "<% title %>"
type: sub-note
content-readiness: raw
last-updated: <% today %>
source-tier: null
parent: "[[_<% parentName %> Master Profile]]"
---

#sub-note #<% policyArea %> #class-analysis #follow-the-money

related: [[_<% parentName %> Master Profile]]
donors:

---

### Overview



---

### The Money Trail

> [!money]
>

---

### Rhetoric vs. Record

> [!contradiction]
>

---

### Timeline

| Date | Event | Key Players | Amount | Significance |
|------|-------|-------------|--------|--------------|
|  |  |  |  |  |

---

### Sources

#### Verified
- [Source](url) (Tier X)

#### Archived
<!-- Broken or paywalled links preserved as research trail -->
