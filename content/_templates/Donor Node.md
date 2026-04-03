<%*
const entityName = await tp.system.prompt("Entity full name (e.g., Koch Network - Charles Koch)");
const entityType = await tp.system.suggester(["donor", "pac", "corporation"], ["donor", "pac", "corporation"]);
const sector = await tp.system.suggester(
  ["Agriculture", "Carceral State", "Dark Money", "Defense & Intelligence", "Education", "Energy & Utilities", "Foreign", "Gig Economy", "Healthcare", "Israel Lobby", "Labor Unions", "Law Enforcement", "Media & Entertainment", "Mega-Donors", "Pharma & Healthcare", "Real Estate", "Restaurant & Food", "Super PACs", "Tech & Crypto", "Wall Street"],
  ["Agriculture", "Carceral State", "Dark Money", "Defense & Intelligence", "Education", "Energy & Utilities", "Foreign", "Gig Economy", "Healthcare", "Israel Lobby", "Labor Unions", "Law Enforcement", "Media & Entertainment", "Mega-Donors", "Pharma & Healthcare", "Real Estate", "Restaurant & Food", "Super PACs", "Tech & Crypto", "Wall Street"]
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

#<% entityType %> #<% sectorTag %> #class-analysis #follow-the-money

related:

---

### Who They Are



---

### What They Want



---

### Who They Fund

> [!money] Follow the Money
>

- Federal PAC contributions (with FEC committee ID if available)
- State-level contributions
- Super PAC funding
- Lobbying expenditures (annual and cumulative)
- Industry association memberships
- Behested payments (California)
- Dark money vehicles (501(c)(4) if documented)

---

### What They've Gotten

| Date | Recipient/Target | Amount | Policy Return | Time Gap |
|------|------------------|--------|---------------|----------|
|  |  |  |  |  |

---

### Class Analysis



---

### Sources

- [Source](url) (Tier X)

---

research-status:: raw — Initial template
content-readiness:: raw
