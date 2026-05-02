---
title: "CA Gov 2026 Editorial Timeline: May 2 to June 2"
type: admin-note
note-type: schedule
status: open
last-updated: 2026-05-02
related-races: ca-gov-2026
audience: david / code-claude / research-claude
---

# CA Gov 2026 editorial timeline

The California gubernatorial primary is **June 2, 2026**. Top-two primary, meaning the two highest vote-getters advance to the November general regardless of party. Today is **May 2, 2026**. Thirty-one days out.

This file is the editorial calendar between now and the primary. Each row has the date window, what is expected to happen externally, and what we should be ready to publish on the beat-style site.

## The race state as of May 2

**Confirmed candidates (per most recent verifications):**
- Tom Steyer (D): billionaire self-funder, $134M deployed, polling 13-17%, target of $22M+ anti-Steyer industry coalition
- Xavier Becerra (D): former HHS Secretary, surging into top tier per IE-funded polls (10% to 24% range)
- Steve Hilton (R): Fox News populist, polling 17-23%, possible Trump-endorsement frame
- Chad Bianco (R): Riverside County Sheriff, polling 13-17%
- Katie Porter (D): former US Rep, polling 8-12%
- Antonio Villaraigosa (D): former LA Mayor, polling 3-6%
- Matt Mahan (D): San Jose Mayor, polling 6-8%, IE-PAC structure
- Tony Thurmond (D): state Superintendent, polling thin
- Butch Ware (Green): structural third-party piece

**Withdrawn during this cycle:**
- Toni Atkins (former state senator): exited 2025
- Eric Swalwell (US Rep): exited April 12, 2026
- Betty Yee (former state controller): exited April 20, 2026, endorsed Steyer

**Status uncertain (Perplexity Round 4 needed):**
- Eleni Kounalakis (current Lt Governor): was widely expected to run; status as of May 2 not verified in our data

## Timeline

| Date window | Expected external events | What we should be ready to publish |
|---|---|---|
| **May 2** (today) | Becerra announces $3M raised post-Swalwell. Pyers / political-press confirming consolidation narrative. Anti-Steyer IE has approximately $7M unspent. | Steyer beat with polling layer (shipped today). Becerra dossier with Phase 5g (shipped today). Tweet replies on Becerra meme. |
| **May 4-6** | Vote-by-mail ballots arrive in mailboxes statewide. CA mails to all registered voters automatically. First 10-15% of votes cast in the first 4 days. | The Becerra "regulator who joined his regulators" beat should ship before ballots arrive. Single-payer Perplexity round (running in parallel) is the keystone for the editorial frame. |
| **May 6-13** | Expected: 2-3 more public polls. Emerson/ICP weekly cadence. Possibly a Berkeley IGS wave. Possibly the late-May PPIC. Watch for another Gudelunas wave timed to sustain the Becerra surge narrative. | Polling-beat candidate page if findings hold. Polling-firm conflict tracker (data/polling-firms.jsonl) populated and live. |
| **May 13-20** | Heaviest TV-ad and IE-spending phase. The remaining $7M from anti-Steyer cmte 1489677 most likely lands here. F496 24-hour late-contribution disclosures fire in real time. Final candidate debates if any are scheduled (Perplexity Round 1 closes this gap). | Any new IE money should be published within 24 hours of the F496 hitting Cal-Access. The harness already runs the dispatcher every 15 minutes; the editorial side just needs a publish trigger. |
| **May 18** | Last day to register to vote in California. After this, persuadable universe is locked. | Persuadable-electorate-shape piece (who is left to convince) if research supports. |
| **May 20-25** | Final wave of major polls. PPIC final, Berkeley IGS final, Emerson final, possibly one more Gudelunas / EMC commissioned wave. Late polls have outsized influence because by now 30-40% of votes are already cast and the framing is locked. | Poll-aggregator hygiene piece (the 27% undisclosed-sponsor finding from the polling dossier). |
| **May 25 to June 1** | Final get-out-the-vote saturation. Most votes cast by now. | Pre-election synthesis piece: who has spent what, who has been pushed by which polls, who is still standing. |
| **June 2** | Primary Election Day. Top two advance to November. | Election-night observations, no election-night calls (we are a beat-style site, not a results aggregator). |
| **June 3-7** | Post-primary final filings come in. Real spending totals published in the 48 hours after the polls close. | Post-mortem beat: what the donor coalition spent, what they got, who advanced. |

## Open verification dependencies

These are the items that need to close before the corresponding beat ships. Most are running through Perplexity in parallel:

| Item | Source | Status | Blocks which beat |
|---|---|---|---|
| Becerra single-payer position | Perplexity (in flight) | Running | Becerra beat (the editorial keystone) |
| Certified candidate list + remaining debate calendar | Perplexity Round 1 | Drafted, pending run | Timeline accuracy + ballot-ghost question |
| CPCA Advocates funder map | Perplexity Round 2 | Drafted, pending run | Polling-layer beat (CPCA → AltaMed → Becerra finding) |
| Steyer's polling apparatus | Perplexity Round 3 | Drafted, pending run | Steyer self-fund accuracy (the gap is itself a finding) |
| Eleni Kounalakis status | Perplexity Round 4 | Drafted, pending run | Field-shape accuracy |
| Cal-Access cmte-ID-to-Gudelunas trace | `cal-access-claim-verifier.cjs` | Code Claude can run on demand | Polling-layer beat (Tier 1 verification of Sac Bee's Tier 2 sponsor identification) |
| `data/2026-ca-gov-poll-tracker.jsonl` | Code Claude synthesis | Buildable from Perplexity polling dossier | Future poll-comparison charts on any beat |

## Beats in the pipeline (priority order)

1. **Becerra "regulator who joined his regulators"**: Phase 5g donor data shipped, single-payer Perplexity round in flight. Page-ready when the single-payer position is verified.
2. **Polling layer beat**: DBR three-contract conflict + Gudelunas/EMC/CPCA pattern. Requires CPCA Round 2 + Cal-Access Gudelunas trace to lock.
3. **Anti-Steyer IE money flow**: already running on the class-traitor beat. Needs continual update as the remaining $7M lands.
4. **Steyer polling-apparatus gap**: if Round 3 confirms the apparatus is opaque, that is its own beat.
5. **Post-primary post-mortem**: June 3-7. Synthesis piece on what got spent vs what got bought.

## Editorial standards reminder for any beat shipping this window

- No em dashes in editorial prose.
- No AI vernacular tics ("furthermore," "crucially," "ultimately," "it is not X but Y").
- No AI attribution in published material. Sources are direct primary-source URLs only.
- All claims trace to a verifiable record. Inferences flagged. [UNVERIFIED] for items that cannot trace.
- David handles all URL verification for editorial content (Rule 13).
- Tier 1 = primary records; Tier 2 = named-publication reporting that itself cites a primary; anything Tier 2 only is flagged in the prose.
