<%*
const name = await tp.system.prompt("Media personality or outlet name");
const category = await tp.system.suggester(["Right", "Left", "Centrist"], ["right", "left", "centrist"]);
const categoryFolder = category.charAt(0).toUpperCase() + category.slice(1);
const platform = await tp.system.suggester(["YouTube", "Podcast", "Substack", "Twitter/X", "Rumble", "Multi-Platform"], ["youtube", "podcast", "substack", "twitter", "rumble", "multi-platform"]);
const today = tp.date.now("YYYY-MM-DD");

await tp.file.move(`Media & Influence Pipeline/${categoryFolder}/${name}`);
-%>
---
title: "<% name %>"
type: media-profile
content-readiness: raw
last-updated: <% today %>
source-tier: null
parent: null
category: <% category %>
platform: <% platform %>
last-enriched: null
---

#media-pipeline #<% category %> #class-analysis #follow-the-money

related:

---

### Who They Are



---

### The Funding Model



---

### FEC Record

**Total:** $ | **Contributions:** | **Party split:**
**API-verified:** <% today %>

| Date | Recipient | Amount | Party | Employer at Filing |
|------|-----------|--------|-------|--------------------|
|  |  |  |  |  |

> [!money]
>

- [FEC API: <% name %> individual contributions](https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=LASTNAME%2C+FIRSTNAME&api_key=DEMO_KEY&per_page=100&sort=-contribution_receipt_date) (Tier 1)

---

### Who Funds Them



---

### What They Push



---

### The Audience Capture Model



---

### What Their Funders Got



---

### Class Analysis



---

### Capture Architecture

- **Platform funder:**
- **Income dependency:**
- **Editorial red lines:**

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
