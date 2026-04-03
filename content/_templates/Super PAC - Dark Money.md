<%*
const entityName = await tp.system.prompt("PAC or dark money entity full name");
const entityType = await tp.system.suggester(["pac", "donor"], ["pac", "donor"]);
const sector = await tp.system.suggester(
  ["Dark Money", "Super PACs", "Defense & Intelligence", "Energy & Utilities", "Healthcare", "Israel Lobby", "Pharma & Healthcare", "Real Estate", "Tech & Crypto", "Wall Street"],
  ["Dark Money", "Super PACs", "Defense & Intelligence", "Energy & Utilities", "Healthcare", "Israel Lobby", "Pharma & Healthcare", "Real Estate", "Tech & Crypto", "Wall Street"]
);
const sectorTag = sector.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
const today = tp.date.now("YYYY-MM-DD");
const folderPath = `Donors & Power Networks/${sector}`;

await tp.file.move(`${folderPath}/${entityName}`);
-%>
---
title: "<% entityName %>"
type: <% entityType %>
content-readiness: raw
last-updated: <% today %>
source-tier: null
parent: null
---

#<% entityType %> #<% sectorTag %> #dark-money #class-analysis #follow-the-money

related:

---

### Who They Are

- **Legal structure:**
- **FEC Committee ID:**
- **Disclosed donors:**
- **Affiliated entities:**

---

### What They Want



---

### Who They Fund

> [!money] Follow the Money
>

- Independent expenditures (for/against, by candidate)
- Contributions to other PACs
- Coordinated expenditures
- Electioneering communications
- State-level spending

---

### Money Flow — Source to Impact

| Date | Source → Recipient | Amount | Electoral/Policy Impact | Time Gap |
|------|-------------------|--------|------------------------|----------|
|  |  |  |  |  |

---

### Dark Money Pipeline

> [!money]
> [Map the money flow: who funds this entity → where it spends → what that spending achieves. Identify affiliate PAC structures, shell entities, and fiscal sponsors.]

---

### Class Analysis



---

### Sources

- [Source](url) (Tier X)

---

research-status:: raw — Initial template
content-readiness:: raw
