---
title: "Research Prompt Kit"
type: reference
content-readiness: draft
last-updated: 2026-03-31
source-tier: null
parent: null
source-types:
  - Congress
known-gaps:
  - "No mapped relationships"
---

# Research Tool Prompt Kit — The Donor Map Database

## How This Research Tool Works (Quick Orientation)

This research tool is search-first. Every answer it gives is grounded in web sources, and it cites them inline with clickable URLs. That's what makes it useful for us — it's essentially a research assistant that shows its work.

**Key concepts:**
- **Spaces** — persistent projects where you set instructions that apply to every query in that Space. This is where you paste the Space Prompt below. Think of it as a system prompt that sticks around.
- **Pro Search** — deeper, multi-step search mode. Toggle it on for complex queries. It burns through your daily Pro queries faster but returns much better results.
- **Focus modes** — you can restrict search to Academic, News, etc. "All" is usually best for our work; "News" for monitoring.
- **Follow-ups** — after any answer, you can ask follow-ups in the same thread and it retains context.

**Setup:** Create a research space called "Donor Map Research" and paste the instructions below into its settings. Then use the query templates for each task.

---

## Research Space Prompt (Paste This Into Your Space Instructions)

```
You are a research assistant for an investigative campaign finance database. Your job is to find sourced, verifiable reporting on political donations, donor-policy connections, and money in politics.

RULES:
1. Every claim you make MUST have a clickable source URL. No exceptions.
2. Prefer these source types in this order:
   - Government records: FEC filings, FPPC, Senate lobbying disclosures, USASpending
   - Investigative journalism: ProPublica, The Intercept, Capital & Main, CalMatters, OpenSecrets
   - Major outlet investigations: Washington Post, NYT, LA Times, NPR, AP
   - Secondary sources: Ballotpedia, Wikipedia (only for basic biographical facts)
3. Never cite campaign websites, partisan outlets, or unsourced blogs without flagging them as low-reliability.
4. When reporting dollar amounts, always specify: the time period (cycle, career, single contribution), the source database, and whether it's an individual contribution, PAC contribution, or independent expenditure.
5. Format every source citation as: [Source Name: Description](URL)
6. If you cannot find a credible source for a claim, say so explicitly. Do not fabricate or assume.
7. When I give you a specific claim to verify, tell me: (a) whether reporting exists that supports it, (b) the strongest source you found, (c) any contradictory reporting.

CONTEXT: This research tracks how campaign donations correlate with policy outcomes. The analytical lens is donor-first — who funds politicians, what do the funders want, and what did they get. I need factual sourcing, not opinion.
```

---

## Query Templates

### 1. Source Hunting (for URL NEEDED / UNVERIFIED tags)

Use this when you have a specific claim from a vault file that needs a source URL.

**Template:**
```
Find sourced reporting for this specific claim:

CLAIM: [paste the exact claim from the vault file]
POLITICIAN/DONOR: [name]
TIME PERIOD: [if known]

I need:
1. The single best source URL that directly supports this claim
2. Any additional corroborating sources
3. If the claim can't be verified, tell me what the closest verified version of this claim is (maybe the dollar amount is slightly different, or the timeline is off)

Format each source as: [Source Name: Description](URL)
```

**Example:**
```
Find sourced reporting for this specific claim:

CLAIM: Koch Industries donated over $500,000 to Jim Jordan's campaigns between 2010-2022
POLITICIAN/DONOR: Jim Jordan / Koch Industries
TIME PERIOD: 2010-2022

I need:
1. The single best source URL that directly supports this claim
2. Any additional corroborating sources
3. If the claim can't be verified, tell me what the closest verified version of this claim is
```

**Batch version** (for processing multiple tags at once):
```
Find sourced reporting for each of these claims. For each one, give me the best source URL or tell me the claim can't be verified.

1. [claim]
2. [claim]
3. [claim]

Format: For each claim, return the source as [Source Name: Description](URL) and note whether it FULLY supports, PARTIALLY supports, or CONTRADICTS the claim.
```

---

### 2. Rapid Backgrounding (pre-session research on new politicians/donors)

Use this before a build session to get a head start on someone we haven't profiled yet.

**Template — Politician:**
```
Deep background on [POLITICIAN NAME] focusing on campaign finance and donor relationships.

I need:
1. TOP DONORS: Their top 10 career donors (organizations, not individuals) with dollar amounts and source URLs
2. INDUSTRY BREAKDOWN: Top 5 industries funding them, with cycle and career totals
3. KEY POLICY VOTES that align with major donor interests — specific votes, not generalities
4. CONTRADICTIONS: Any cases where their public rhetoric contradicts their donor relationships or voting record
5. PAC/DARK MONEY: Any Super PACs or dark money groups supporting them, with funding sources if traceable
6. REVOLVING DOOR: Staff who moved between their office and donor industries

For every data point, cite the source as [Source Name: Description](URL). Prioritize FEC data, OpenSecrets, and investigative reporting over Wikipedia.
```

**Template — Donor/Organization:**
```
Deep background on [DONOR/ORG NAME] as a political donor and influence operation.

I need:
1. POLITICAL SPENDING: Total political spending (federal + state if available), broken down by cycle
2. RECIPIENT MAP: Top 10 politicians they fund, with amounts and party breakdown
3. POLICY AGENDA: What specific policy outcomes are they spending to achieve?
4. RETURNS: Concrete policy wins they've gotten — contracts, regulatory decisions, legislation
5. NETWORK: Related PACs, 501(c)(4)s, trade associations, or subsidiary entities in their political spending network
6. INVESTIGATIVE COVERAGE: Any major investigative pieces written about their political influence

Cite every source as [Source Name: Description](URL).
```

---

### 3. Cross-Referencing Claims Against Current Reporting

Use this to check whether a donor-policy connection we've identified has been reported on by others.

**Template:**
```
Has anyone reported on the connection between [DONOR/ORGANIZATION] and [SPECIFIC POLICY OR POLITICIAN]?

Specifically, I'm looking for reporting that covers:
- [DONOR] donating to [POLITICIAN] and [POLITICIAN] subsequently [POLICY ACTION]
- The time gap between the donation and the policy outcome
- Any investigative pieces that frame this as a quid pro quo or influence operation

If no one has reported this specific connection, tell me:
1. What HAS been reported about [DONOR]'s political spending?
2. What HAS been reported about [POLITICIAN]'s position on [POLICY AREA]?
3. Are there adjacent connections that have been reported (same donor, different politician, same policy area)?
```

**Batch cross-reference** (for checking multiple connections):
```
For each of the following donor-policy connections, tell me whether investigative reporting exists. Rate each as: REPORTED (with URL), PARTIALLY REPORTED, or UNREPORTED.

1. [Donor A] → [Policy outcome A]
2. [Donor B] → [Policy outcome B]
3. [Donor C] → [Policy outcome C]

For anything rated UNREPORTED, note whether the individual components (the donor's spending, the policy outcome) have been separately reported even if the connection hasn't.
```

---

### 4. News Monitoring (Breaking Campaign Finance Stories)

Use this with the research tool's News focus mode for real-time monitoring.

**Daily scan template:**
```
What are today's most significant campaign finance and political money stories? Focus on:

1. New FEC filings or disclosure reports
2. Dark money or Super PAC spending revelations
3. Lobbying disclosure updates
4. Donor-policy connection reporting (any outlet)
5. Campaign finance regulation changes
6. Any stories involving these specific names: [paste a short list of politicians/donors you're actively tracking]

For each story, give me: one-sentence summary, source URL, and which of my tracked names (if any) are involved.
```

**Breaking story deep-dive:**
```
[Paste headline or brief description of breaking story]

Give me the full context on this story:
1. What are the primary sources reporting it?
2. What campaign finance data is involved?
3. Who are the donors and recipients?
4. What dollar amounts are cited and from what time period?
5. Is there any prior reporting that set this up?

Cite every source as [Source Name: Description](URL).
```

---

## Workflow Integration

**How this feeds back into sessions:**

1. **Source hunting results** → Copy the URLs found. In the build session, I'll verify each one via Chrome load test before writing it to a vault file. This tool finds candidates; Chrome confirms they're live.

2. **Backgrounding results** → Paste the full research output into the build session at the start of a build. I'll use it as a research base, cross-check the key claims via API (FEC, USASpending, Congress.gov), and build the profile with verified data. Saves 20-30 minutes per profile.

3. **Cross-reference results** → If reporting we missed is found, bring the URLs into the session. If it confirms a connection is UNREPORTED, that's a signal we may have an original analytical finding worth featuring in a story.

4. **News monitoring results** → Flag anything that touches active vault profiles. Bring breaking stories into the session for rapid integration.

---

## Tips

- **Deep search vs. quick search:** Use deep search for backgrounding and cross-referencing. Quick search is fine for news monitoring and simple source hunting.
- **Follow-up aggressively.** If results are vague, push back: "That source doesn't specify the dollar amount. Find me the FEC filing or OpenSecrets page with the exact figure."
- **Don't trust the URLs blindly.** Research tools occasionally generate incorrect URLs or cite pages that have moved. Every URL still needs Chrome verification in the session before it goes in the vault.
- **Batch your source hunting.** Collect 5-10 `(URL NEEDED)` tags and run them in one batch query. More efficient than one at a time.
- **Time-bound your news queries.** "Past 24 hours" or "past week" keeps results current. Unbounded news queries return stale results.

content-readiness:: ready