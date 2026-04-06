<%*
const name = await tp.system.prompt("Politician's full name");
const party = await tp.system.suggester(["Democrat", "Republican", "Independent"], ["Democrats", "Republicans", "Independent"]);
const chamber = await tp.system.suggester(["Senate", "House", "Governor", "Presidential", "SCOTUS", "Trump Cabinet", "CA Governor 2026"], ["Senate", "House", "Governors", "Presidential", "SCOTUS", "Trump Cabinet", "CA Governor 2026"]);
const state = await tp.system.prompt("State (2-letter abbreviation)");
const stateLower = state.toLowerCase();
const partyTag = party === "Democrats" ? "democrat" : party === "Republicans" ? "republican" : "independent";
const chamberTag = chamber.toLowerCase().replace(" ", "-");
const today = tp.date.now("YYYY-MM-DD");
const folderPath = `Politicians/${party}/${chamber}/${name}`;

// Create folder and move file
await tp.file.move(`${folderPath}/_${name} Master Profile`);
-%>
---
title: "<% name %>"
type: politician
party: <% party %>
chamber: <% chamber %>
state: "<% state %>"
state-abbr: "<% stateLower %>"
content-readiness: raw
source-tier: null
last-updated: <% today %>
last-enriched: null
total-raised: null
total-spent: null
bills-sponsored: null
---

#politician #<% partyTag %> #<% chamberTag %> #<% stateLower %> #class-analysis #follow-the-money

related:

---

### Sub-Notes



---

### Who They Are



---

### The Central Thesis



---

### The Core Contradiction

> [!contradiction]
>

---

### Donor Class Map

> [!money] Follow the Money
>

- Top individual donors with amounts and time periods
- PAC contributions by sector
- Super PAC support (independent expenditures)
- Self-funding if applicable
- Bundler networks if documented
- Behested payments (California politicians)

---

### Donation-to-Policy Timeline

| Date | Money In | Amount | Policy Out | Time Gap |
|------|----------|--------|------------|----------|
|  |  |  |  |  |

Flag every case where a policy decision follows a donation within 6-18 months.

---

### Policy Area Notes



---

### Rhetorical Signature Moves



---

### Analytical Patterns

- **Genuine Win + Structural Limit** —
- **Villain Framing** —
- **Two-Audience Problem** —
- **Pilot Program** —
- **Donor-Class Override** —
- **Revolving Door** —
- **Both-Sides Illusion** —
- **Self-Funding as Independence** —
- **Dark Money Symmetry** —

---

### Sources

#### Verified
- [Source](url) (Tier X)

#### Archived
<!-- Broken or paywalled links preserved as research trail -->
