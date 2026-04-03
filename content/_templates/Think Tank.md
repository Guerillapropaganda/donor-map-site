<%*
const name = await tp.system.prompt("Think tank / policy organization name");
const category = await tp.system.suggester(["Conservative", "Liberal", "Centrist"], ["conservative", "liberal", "centrist"]);
const taxStatus = await tp.system.suggester(["501(c)(3)", "501(c)(4)", "Hybrid", "For-Profit"], ["501c3", "501c4", "hybrid", "for-profit"]);
const today = tp.date.now("YYYY-MM-DD");

await tp.file.move(`Think Tanks & Policy Infrastructure/${category.charAt(0).toUpperCase() + category.slice(1)}/${name}`);
-%>
---
title: "<% name %>"
type: think-tank
content-readiness: raw
last-updated: <% today %>
source-tier: null
parent: null
category: <% category %>
tax-status: <% taxStatus %>
---

#think-tank #<% category %> #class-analysis #follow-the-money

related:

---

### Who They Are

- **Founded:**
- **Annual budget:**
- **Staff size:**
- **Tax status:** <% taxStatus %>
- **Stated mission:**

---

### Who Funds Them

> [!money] Follow the Money
>

- Major individual donors
- Foundation grants (with IRS 990 citations)
- Corporate sponsors
- Government contracts/grants
- Anonymous/dark money funding

---

### What They Produce

- Key policy papers
- Model legislation
- Judicial nominations lists
- Regulatory frameworks

---

### The Policy Pipeline

> [!money]
> [Map: research paper → politician citation → bill language → enacted policy]

---

### The Revolving Door

| Name | Government Position | Think Tank Role | Direction | Policy Area |
|------|-------------------|-----------------|-----------|-------------|
|  |  |  |  |  |

---

### What Their Funders Got

---

### Donation-to-Policy Timeline

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
