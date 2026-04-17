---
title: Class Analysis Style Guide
type: system
last-updated: 2026-04-16
---

# Class Analysis Style Guide

Required reading before writing any `## Class Analysis` section. Applies to both Research Claude drafts and David's editorial polish.

**The problem we're solving:** a Class Analysis that recites donor names and dollar amounts is a data summary, not an analysis. It sounds like OpenSecrets. We don't need another OpenSecrets. We need the editorial position that data supports.

**Reference voices:** Jacobin article voice. Popular Information's "here's the receipt" energy. Intercept investigative framing. Popular Information / Judd Legum. Matt Stoller's BIG newsletter. Not WaPo, not Ballotpedia, not OpenSecrets.

---

## Hard rules

### Every Class Analysis MUST

1. **Open with a position-taking sentence.** Name the class conflict. Declare whose side you're on without using the word "side."
2. **Use 1–2 specific data points per paragraph AS AMMUNITION, not as summary.** Max 5 numbers in 400 words total. If you're listing more than 5 numbers, you're writing the Money section, not Class Analysis.
3. **Name the contradiction explicitly.** Who does this subject perform for (rhetorically) vs. who do they actually serve (materially).
4. **Identify the material stakes for the working class.** What specifically is the reader paying for through this relationship — in tax dollars, in regulatory damage, in lost public goods.
5. **Use active voice. Name actors.** "Six billionaires bought the presidency" not "the presidency was supported by significant donations." "Exxon wrote the rule" not "the rule was informed by industry consultation."
6. **Close with a line that makes the grift visible.** The reader should finish with a sentence they want to quote.

### Every Class Analysis MUST NEVER

- **Recap the money data from Section 4** — that section exists for a reason. Reference it with one line, don't duplicate it.
- **Use "the donor class" or "big money" as a vague noun without identifying specific members.** Name them.
- **Equivocate.** "Some would say," "arguably," "critics contend" are banned. This is a point of view document. Hold the view.
- **List donor names with dollar amounts in parentheses.** That's Section 4's job. Class Analysis can name 1–2 actors per paragraph with a single data point, not a parenthetical database dump.
- **End with a summary.** Summaries are empty calories. End with an argument.
- **Use AI vocabulary:** delve, moreover, furthermore, plethora, tapestry, testament to, navigate the complexities, multifaceted, vibrant. (Flagged by self-review-mirror.)
- **Use em dashes.** Period or comma. (Flagged by self-review-mirror.)

---

## Per-type framing templates

Different profile types call for different class analysis frames. Research Claude should pick the matching template and work within it.

### Politician — populist-mask type (Trump, populist Republicans, some left-populists)

**The frame:** Performance of working-class authenticity vs. who actually gets paid.

**The arc:**
1. State the populist pitch. Note who it's performed FOR.
2. Name who actually funds them. The billionaires who wrote the check.
3. Show the policy returns that went to those funders, not to the people the pitch is addressed to.
4. Close with the material cost to the working class in specific terms.

### Politician — elite donor-class type (McConnell, Schumer, corporate establishment)

**The frame:** Which capital fraction owns them, what they deliver.

**The arc:**
1. Identify their specific sectoral alignment. Finance? Defense? Real estate? Pharma?
2. The revolving door + institutional power they command.
3. The signature policy deliveries that match the alignment.
4. What the reader-class is losing that the politician is facilitating.

### Mega-donor — individual

**The frame:** Where the fortune came from, what policy captures they're buying.

**The arc:**
1. Fortune origin — what class position does their wealth represent. (Inheritance? Tech? Finance? Fossil? Pharma?)
2. The specific policy interest driving their political spending. Not "conservative" or "liberal" — the specific regulatory win they're buying.
3. The ROI calculation. What does X dollars of donations return in protected income or captured regulation.
4. The public cost of that capture.

### Corporation

**The frame:** What state function they capture. The revolving door. Material interest in current policy.

**The arc:**
1. The state function they capture (defense procurement, pharma pricing, surveillance, carceral, etc.).
2. The revolving-door pattern — who cycles between government and the corporation's executive ranks.
3. The lobbying + donation pattern as continuous investment in policy capture.
4. What the public pays for this — in contracts, in regulatory damage, in lost alternatives.

### PAC / super PAC

**The frame:** The laundry — who funds it, who benefits, the regulatory gap it exploits.

**The arc:**
1. The top upstream funders. Who's actually paying the bills.
2. The downstream recipients and their ideological alignment.
3. The legal structure enabling this (the Citizens United / FEC gap being exploited).
4. What this architecture costs democracy — what's hidden by the PAC intermediary.

### Think tank / lobbying firm

**The frame:** Ideological infrastructure — who pays for the ideas that become policy.

**The arc:**
1. Who funds the institution (corporate? foundation? dark money?).
2. The specific ideas/studies/reports they've produced that became policy.
3. The revolving door between the institution and government.
4. The pattern: paid research → government position → policy capture → more funding.

---

## Exemplar paragraphs

### Before (bad) — Trump Class Analysis original draft

> "The 2024 funding structure reveals the class architecture. $1.45 billion raised. 44% from just 10 megadonors. Six individuals gave over $100 million each: Timothy Mellon ($125-197M, banking heir), Elon Musk ($292M total, holds $38B+ in federal contracts), Miriam Adelson ($100-148M, Israel maximalism), the Uihleins ($100M+, far-right infrastructure), Kenneth Griffin ($100M+, financial deregulation), Jeffrey Yass ($100M+, TikTok stake protection)."

**Why it fails:** Data dump. Names + dollar amounts in parens = OpenSecrets format. No argument. Reader learns numbers but not what to think about them.

### After (good) — Trump Class Analysis rewrite

> "Trump's pitch is that he's the enemy of the elite. The billionaires laugh at that pitch because they wrote the check that bought the megaphone. Six of them put up nine-figure sums for the 2024 campaign. They weren't buying a populist. They were buying the performance of populism, because a president who can convince a factory worker in Ohio that Wall Street is the enemy while signing Wall Street's tax bill is worth every penny."

**Why it works:** Opens with position. Uses a specific number (six) as ammunition not summary. Names the contradiction (populist pitch vs. Wall Street customer). Identifies the material stake (the factory worker in Ohio). Closes with an argument ("worth every penny").

---

## Process

### Drafting (Research Claude)

1. Read this style guide.
2. Read the profile's data sections (The Money, Key Votes / Executive Actions / Politicians Funded).
3. Pick the per-type framing template above.
4. Draft 3–5 paragraphs, 300–500 words total.
5. Check against the hard rules. Revise until every paragraph passes.

### Editorial polish (David)

Every Class Analysis must be signed off by David before a profile promotes to `content-readiness: verified`.

Sign-off adds `class-analysis-signed-off: true` to frontmatter. Profile-template-validator will check this on verified-tier profiles.

### Reference profiles

Exemplars of this style once complete:
- [[_Donald Trump Master Profile|Donald Trump]] — populist-mask frame
- (to be added as more profiles clear editorial review)

---

## The bottom line

A Class Analysis that feels like a Jacobin article is good. A Class Analysis that feels like a Ballotpedia entry is bad. If a reader can't tell whose side the writer is on, you've written the wrong thing.
