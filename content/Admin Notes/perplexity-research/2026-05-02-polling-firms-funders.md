---
title: "Perplexity Prompt: California Polling Firms and Their Funders"
type: admin-note
note-type: research
status: open
last-updated: 2026-05-02
authority: CLAUDE.md Rule 13 (Perplexity-first research protocol)
note-kind: prompt
audience: david / perplexity
related-races: ca-gov-2026
---

# Polling firms and their funders: research prompt

## Why this matters

The anti-Steyer beat already surfaced one concrete hook: committee 1489677 reported a **$30,000 opposition-research expenditure to David Binder Research** (Cal-Access EXPN_CD filing 3138008) for polling against Steyer. That single line is the visible end of a much longer infrastructure question:

- Who commissions the polls that frame each CA gubernatorial candidate's "viability"?
- Which firms get hired by which side, and why?
- Which firms are owned by, funded by, or partnered with parties / industries / advocacy networks that have direct stakes in the outcome?
- Which polls move donor confidence, and which donor classes pay for the polls that move that confidence?

Pollsters are infrastructure. If donor money pays for the poll that creates the narrative that justifies the next donation, the loop is worth naming. This research prompt produces the dataset that lets us name it.

## Verification pattern

Same pattern as the Anti-Steyer and Becerra rounds: helper finds candidate-side data via `scripts/lib/cal-access-claim-verifier.cjs` (campaign payments to pollsters appear in EXPN_CD as Schedule G/E entries with payee names like "FM3 Research", "David Binder Research", etc.), then this Perplexity round independently verifies firm ownership, partisan history, and funder concentration.

## The prompt (paste into Perplexity)

```
I am building an investigative dossier on the political polling industry as it
relates to the 2026 California gubernatorial race. I need primary-source
verification on the polling firms most active in California politics, who funds
them, who owns them, and what their partisan and industry alignments are.

For EACH of the following firms, return a structured profile in this exact
format:

1. **Firm identity**
   - Legal entity name(s); state of registration; year founded; headquarters
   - Founder(s); current ownership / parent company; any acquisitions or PE ownership

2. **Public-facing partisan affiliation**
   - Self-described as Democratic / Republican / nonpartisan / academic / media-funded
   - Public client list and what those clients suggest about partisan lean

3. **Funder concentration (the load-bearing question)**
   - Top 10 paying clients across the last two election cycles where data exists
     (FEC Schedule B for federal; FPPC Schedule G/E for California state; LDA
     for federally registered lobbying clients)
   - Any single-client dependency above 20% of disclosed revenue
   - Any industry-association sponsorships (e.g. polls commissioned by tobacco
     industry, fossil-fuel coalitions, healthcare lobbies, tech trade groups)

4. **Track record on California races (2018, 2020, 2022, 2024 cycles)**
   - Final-poll-vs-actual margin error
   - Any documented systematic miss (consistent house effect favoring one party
     or one type of candidate)

5. **Known controversies or methodology disputes**
   - Pollster ratings (FiveThirtyEight, ABC News, Pew, AAPOR transparency
     initiative; note that 538 ratings are frozen as of August 2025)
   - Any documented case of a poll being commissioned to manufacture a narrative
     rather than measure opinion (e.g. "push polls", message-testing dressed as
     horserace polling)
   - Any FPPC, FEC, or state-AG enforcement actions against the firm

6. **2026 California gubernatorial race involvement**
   - Has the firm been retained by any 2026 CA Gov candidate, IE-PAC, party
     committee, or industry coalition? If so: which committee, what dollar
     amount, what filing?
   - Has the firm published any public polls on the 2026 CA Gov race? If so:
     who commissioned them, when, what did they show?

The firms to profile:

- David Binder Research (San Francisco)
- FM3 Research (Oakland / Madison WI)
- Public Policy Institute of California (PPIC)
- Berkeley IGS Poll (UC Berkeley Institute of Governmental Studies)
- USC Dornsife / LA Times poll
- Tulchin Research (San Francisco)
- EMC Research (Oakland / DC / Seattle)
- Goodwin Simon Strategic Research (LA)
- Probolsky Research (Newport Beach)
- Strategies 360 (whose CA operation has handled multiple statewide candidates)
- Inside California Politics / Emerson College polling partnership
- Any other firm that has published a public poll on the 2026 CA Gov race
  through May 2026. Please surface and profile them too

For each firm, source URLs are required for every factual claim. If a fact is
not sourceable to a primary record (firm website, FEC/FPPC/LDA filing, court
record, AAPOR transparency disclosure, peer-reviewed academic publication, or
direct news-article reporting that itself cites a primary source), flag it
[UNVERIFIED]. Do NOT include claims sourced only to Wikipedia, anonymous
forum posts, or marketing materials without independent corroboration.

Specific facts I need verified at the top of the report (these are the
hooks the dossier already hangs on):

a) Committee 1489677 (anti-Steyer IE PAC) reported a $30,000 expenditure to
   David Binder Research on Cal-Access EXPN_CD filing 3138008. Confirm: was
   this commissioned for opposition messaging research, public horserace
   polling, or both? What is the firm's relationship history with the
   committee's funders (PG&E, IBEW, CA Realtors, Cal Chamber JOBSPAC, CA
   Building Industry, CCPOA)?

b) Has Tom Steyer's campaign or any pro-Steyer committee retained David
   Binder Research, FM3 Research, or any of the above firms in the 2026
   cycle? (David Binder is historically associated with progressive /
   Democratic candidates, which makes the anti-Steyer commission notable.)

c) For each major published 2026 CA Gov poll (Berkeley IGS, USC Dornsife,
   PPIC, Emerson, etc.), who paid for it? Public-interest funded vs
   media-funded vs candidate-funded vs industry-funded. List specifically.

d) Has any 2026 CA Gov polling firm published numbers that diverged
   materially from the eventual aggregate, in a direction that benefited
   a specific donor coalition? Flag any such patterns.

Format the final output as a structured markdown report I can drop into
content/Admin Notes/perplexity-research/. Sections in this order: (1) the
four specific hook-verifications above, (2) the firm-by-firm profiles, (3)
a "what's missing / unverifiable" section listing any fact I asked about
that you could not source.
```

## Expected output destination

Save Perplexity's response as:
`content/Admin Notes/perplexity-research/2026-05-02-polling-firms-funders-results.md`

Then Code Claude can:
1. Apply the verified findings into a structured dataset (likely a new
   `data/polling-firms.jsonl` keyed by firm name, with funder-concentration
   and partisan-history fields)
2. Cross-reference against Cal-Access EXPN_CD payments to those firms across
   the full 2026 candidate field (not just the anti-Steyer committee), via
   the existing `cal-access-claim-verifier.cjs` helper
3. Surface the strongest single-frame finding as a beat-page candidate

## Why this is a beat candidate, not just research scaffolding

If the verification confirms the structural pattern (donor coalitions
commissioning polls that justify their next round of donations to the same
race), the resulting page writes itself. Working title: **"The poll that
justifies the donation that pays for the poll"**. The daisy-chain frame
already proven in the class-traitor beat applied to a different layer of
the same infrastructure.

The Becerra "regulator who joined his regulators" beat takes priority for
sequencing reasons (Phase 5g corrections already applied this session, donor
list verified, page ready to draft). The polling beat slots in next.
