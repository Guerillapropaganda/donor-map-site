---
title: Distribution Schedule
status: draft
last-updated: 2026-05-02
operating-principle: "Post when there is a receipt. Engage when there is data. Otherwise stay quiet."

weekly-rhythm:
  monday:
    type: anchor
    note: "Anchor thread on the top investigation. Post the thesis sentence + 3 receipts + URL."
  tuesday:
    type: engagement
    note: "Quote-reply day. Surface 2-3 adversarial targets with receipts."
  wednesday:
    type: receipt-drop
    note: "Mid-week receipt drop. Single-image meme + sourced caption."
  thursday:
    type: engagement
    note: "Friendly amplification. Tag 2-3 allies on relevant work."
  friday:
    type: working-notes
    note: "Behind-the-scenes / methodology post. What I'm investigating next."
  saturday:
    type: off
    note: "Off."
  sunday:
    type: off
    note: "Off."

# Week-1 launch overrides the standing weekly-rhythm above.
# May 4-8, 2026: first real distribution push of four already-published beats.
# After May 8, revert to the standing rhythm.
week-one-launch:
  active-window: "2026-05-04 through 2026-05-08"
  lead-platform: bluesky
  rationale: "California political reporters live on Bluesky. Lower noise floor than X. Threads cascade better. X mirrors after Bluesky lands."
  daily-post-time: "06:00 to 06:30 PT"
  cadence-rule: "One beat per day. Do NOT drop multiple at once — splinters the audience and wastes the news cycle."

  daily-plan:
    - day: monday
      date: "2026-05-04"
      lead-beat: class-traitor
      url: "https://thedonormap.org/class-traitor/"
      headline: '"$31 million to bury a class traitor."'
      why-this-slot: "Universal money hook. Steyer is nationally known. All numbers FPPC primary-source verified — defamation surface low. Crosses partisan lanes (liberal Twitter engages with Steyer; conservative Twitter engages with class-traitor framing). Monday morning is what-happened mode."
      thread-shape:
        - "Headline + 1-line + URL"
        - "PG&E lead — $10M+ from utility that pleaded guilty to 84 counts of involuntary manslaughter for the Camp Fire"
        - "Two-committee funnel structure: PG&E -> Californians for Resilient & Affordable Energy -> $8M transferred to NO ON Steyer committee"
        - "Bearstar dual-mandate: same firm running anti-Steyer AND pro-Becerra IE messaging on opposite ends of the same race"
        - "Open source. All sources free. URL repeated. Tip line."

    - day: tuesday
      date: "2026-05-05"
      lead-beat: three-becerras
      url: "https://thedonormap.org/three-becerras/"
      headline: '"Three audiences. Three Becerras."'
      why-this-slot: "Pairs directly with Monday — same race, same Bearstar, opposite candidate. Day-after readers ask 'what else?' Three Becerras is the answer."
      thread-shape:
        - "Headline + 1-line + URL"
        - "Six weeks. Three different answers to single-payer. Hardest version: doctors lobby, on-record from CMA president Dr. Rene Bravo"
        - "CPCA circuit graph: Apr 12-13 watershed = CMA withdraws Swalwell endorsement; +8 days EMC poll commissioned; +17 days Working Families IE PAC formed"
        - "Same-day Becerra dossier: $54,700 max from Laborers' International CA Council, three-deep Laborers stack across IE PACs"
        - "Open source. URL. Tip line."

    - day: wednesday
      date: "2026-05-06"
      lead-beat: not-the-bad-guy
      url: "https://thedonormap.org/not-the-bad-guy/"
      headline: '"He took the check. Then he defended it."'
      why-this-slot: "Tightest single-thread piece. Fastest read. Climate / fossil-fuel-accountability accounts amplify. Day-3 break in the longer-form rhythm."
      thread-shape:
        - "Headline + 1-line + URL"
        - "Jan 2020: Becerra (then AG) sues Chevron over fracking. June 16, 2025: Chevron writes Becerra's gov campaign $39,200. April 2026: 'Chevron is not the bad guy.'"
        - "Two rivals (Porter, Steyer) refused fossil-fuel money. Becerra took it"
        - "Cal-Access primary-source verified: Chevron USA Inc. -> Becerra for Governor 2026. Single transaction. Public record."
        - "URL. Tip line."

    - day: thursday
      date: "2026-05-07"
      lead-beat: donors-becerra-2026
      url: "https://thedonormap.org/donors-becerra-2026/"
      headline: '"Becerra for Governor 2026: top donors."'
      why-this-slot: "Reference companion to Three Becerras. Deeper-data Thursday drop. Useful as receipt-amplification for journalists working on follow-ups."
      thread-shape:
        - "Headline + 1-line + URL"
        - "Top-donor list, every $$$ Cal-Access primary-source verified"
        - "Industry-classification disclosed for each top-tier donor (healthcare, fossil-fuel, finance, etc.)"
        - "Companion to three-becerras. The donor list names who Becerra is currently acceptable to."
        - "URL. Tip line."

    - day: friday
      date: "2026-05-08"
      lead-beat: hold-or-amplify
      note: "No new beat drop. Use Friday to (a) amplify whichever beat caught the most traction with reporter quote-replies + repost variants, OR (b) Friday working-notes post per standing rhythm if traction was flat. Decision point: review traffic + engagement Thursday evening."

  posting-structure-per-beat:
    bluesky:
      lead: true
      thread-length: 5
      char-cap-per-post: 250
      first-post-must-include: ["headline in quotes", "one-line summary", "URL"]
      subsequent-posts: "receipts with images attached. Bare URLs trigger Bluesky's link-suppression."
    x-twitter:
      lead: false
      schedule: "30-60 min after Bluesky drop (cross-platform stagger lever)"
      thread-length: 5
      char-cap-per-post: 270
      mirror-of: bluesky
    reddit:
      lead: false
      schedule: "Within 2 hours of Bluesky drop, DURING the 6-9am PT window"
      strategy: "Single post per relevant subreddit. Write each separately — never crosspost (auto-flags as spam)."
      target-subs:
        - r/California
        - r/politics
        - r/SanFrancisco
        - r/bayarea
        - r/sandiego
      post-format: "Title = headline (no editorialization). Body = 4 sentences + URL."
    facebook-groups:
      lead: false
      schedule: "Sunday evening soft-launch flow continues + Monday-Thursday morning 9-10am"
      lead-line: "I run thedonormap.org"
      attach: "1080x1080 share card from /distribution/cards/by-beat/{slug}"
      tone-variants: 3
    direct-dms-to-reporters:
      lead: false
      schedule: "Tuesday afternoon after Three Becerras has had a half-day to circulate"
      tier-1-targets:
        - { handle: "Politico CA Playbook (Jeremy White / Lara Korte / Dustin Gardiner)", reason: "Money / race beat fit" }
        - { handle: "CalMatters (Yousef Baig on $$$, Alexei Koseff on gov race)", reason: "Structural angle is their lane" }
        - { handle: "LA Times (Mark Z. Barabak, Seema Mehta)", reason: "Steyer LA-resident; Becerra HHS history" }
        - { handle: "KQED Political Breakdown (Scott Shafer, Marisa Lagos)", reason: "Format loves structural frames" }
        - { handle: "SF Chronicle (Joe Garofoli)", reason: "Bay-Area-inflected coverage" }
      dm-format: "Saw your [recent piece]. Wrote up [structural finding] on [topic]. Cal-Access primary-source verified. URL. — David"
      do-not: "Do not pitch the analysis. Pitch the data work. Let the headline land for itself."

  prep-checklist-night-before:
    - "Verify all 5 OG previews via FB Sharing Debugger. Scrape Again on each URL. Without working preview images on FB, FB-group posts are dead-on-arrival."
    - "Pre-write the four Bluesky/X threads (5 posts x 4 beats = 20 short posts). Stage in a Google Doc so 6am is paste-and-publish."
    - "Pull 8-10 reporter handles into a target list with both Bluesky + X handles. Don't compose DMs in advance — they need to reference each reporter's most recent work."
    - "Confirm analytics is live (Cloudflare Web Analytics or GA4). Without analytics you're flying blind on whether anything caught."
    - "Re-confirm Sunday-evening FB group post variants (3 group-tone variants x 4 beats = 12 short posts)."
    - "Have Mahan beat headline locked + outline ready. If a reporter asks 'what's next?' Tuesday afternoon, you can answer. Don't try to ship Mahan this week."

  do-not-rules:
    - "Do not drop all four beats at once. Splinters the audience."
    - "Do not pitch reporters who don't have a clear beat fit. Cold pitches with no relevance burn the relationship."
    - "Do not argue with detractors in replies. Reply only to factual questions ('where did this number come from?' gets the FPPC URL). 'You're a partisan hack' gets ignored."
    - "Do not leak the Mahan / Villaraigosa / Hilton / Bianco angles in posts. Those are next week's beats. Premature spoilers cost narrative momentum."
    - "Do not respond publicly to legal threats. If a campaign / donor / firm sends a cease-and-desist, do not engage on-platform. Forward to legal lane. Data is FPPC primary-source verified — that's the answer, but it goes through proper channels."

  contingency-monday-hot:
    "If a beat catches a reporter, gets quoted, traffic spikes — Tuesday's Three Becerras drop is the natural follow-up that answers 'what else have you got?' Don't move it earlier. Don't move it later. The pacing IS the strategy."

  contingency-monday-flat:
    "If no traction, no reporter pickup, low traffic Monday — that's data. Tuesday's Three Becerras is the second swing. By Wednesday afternoon you'll know if any of the four are catching. If none, the issue isn't the beats — it's reach. That's a reporter-direct-DM week-2 problem, not a content problem."

platforms:
  - id: x
    handle: "@Guerillaprop"
    url: "https://x.com/Guerillaprop"
    posts-per-week: 8
    best-times: ["07:00", "12:00", "20:00"]
    priority: 1
    content-type: "Receipts + adversarial quote-replies. Short threads."
    note: "Highest-leverage adversarial surface. Quote-reply with receipts beats standalone posts."

  - id: bluesky
    handle: "@thedonormap.bsky.social"
    url: "https://bsky.app/profile/thedonormap.bsky.social"
    posts-per-week: 6
    best-times: ["08:00", "13:00", "21:00"]
    priority: 2
    content-type: "Long-form receipts. Audience skews journalist + researcher."
    note: "Most receptive to detailed thread structure."

  - id: threads
    handle: "@guerillaprop"
    url: "https://www.threads.net/@guerillaprop"
    posts-per-week: 4
    best-times: ["09:00", "19:00"]
    priority: 3
    content-type: "Cross-post strongest X material. Native commentary."
    note: "Algorithm rewards fresh native posts more than cross-posts."

  - id: instagram
    handle: "@guerillaprop"
    url: "https://www.instagram.com/guerillaprop/"
    posts-per-week: 3
    best-times: ["11:00", "20:00"]
    priority: 4
    content-type: "Brutalist meme tiles. Carousel for multi-receipt stories."
    note: "Visual brutalist tiles from /memes catalog. Captions point to bio link."

  - id: facebook
    handle: "Guerilla Prop"
    url: "https://www.facebook.com/profile.php?id=100064085292406"
    posts-per-week: 2
    best-times: ["10:00", "18:00"]
    priority: 5
    content-type: "Long-form for older / nontechnical audience."
    note: "Lower leverage; cross-post strongest material weekly."

  - id: patreon
    handle: "Guerilla Prop"
    url: "https://www.patreon.com/c/Guerilla_Prop"
    posts-per-week: 1
    best-times: ["weekly Friday"]
    priority: 6
    content-type: "Working notes for supporters. No paywalled content; donation-only."
    note: "4-8 posts/month max. Never post just to stay active."

adversarial-targets:
  - handle: "@example_target"
    platform: x
    tier: 1
    why: "EXAMPLE: politician with documented donor contradiction. Quote-reply with the receipt when they post about the issue."
    receipts: ["three-becerras", "chevron"]
    last-engaged: null
    note: "Replace this row with real targets. Verify handle before engaging."

friendly-targets:
  - handle: "@example_ally"
    platform: x
    tier: 1
    alignment: "EXAMPLE: investigative journalist covering the same beat."
    last-engaged: null
    note: "Replace with real allies. Verify handle before tagging."

hashtag-cohorts:
  ca-gov-2026: ["#CAGov2026", "#CaliforniaGovernor", "#CAGov"]
  healthcare: ["#CalCare", "#SinglePayer", "#MedicareForAll"]
  fossil-fuel: ["#NoFossilFuelMoney", "#KeepItInTheGround", "#StopBigOil"]
  donor-accountability: ["#FollowTheMoney", "#DarkMoney", "#CampaignFinance"]

weekly-goals:
  followers-x: 500
  followers-bluesky: 300
  followers-instagram: 200
  patreon-supporters: 25
  engagement-rate: 5

# Live numbers - update after each weekly review. Page renders
# actual / target with a progress meter. Leave a metric blank if
# you are not tracking it yet.
weekly-actual:
  followers-x: 0
  followers-bluesky: 0
  followers-instagram: 0
  patreon-supporters: 0
  engagement-rate: 0

algorithm-levers:
  - lever: "Quote-reply within 30 minutes"
    note: "X surfaces fresh replies under big accounts to their followers. First-mover quote-reply with a receipt beats a 4-hour-late standalone thread by an order of magnitude. Set a 30-minute window after a target posts."
    status: testing
  - lever: "Native image beats link"
    note: "Image posts outperform link posts by roughly 3x across X, Bluesky, Threads, IG. Bare URLs trigger link-suppression on most platforms. Always attach the brutalist meme tile from the cards generator; put the URL in a follow-up reply, not the parent."
    status: confirmed
  - lever: "Thread structure: hook + receipts + URL + CTA"
    note: "5 to 7 posts. Post 1 is the thesis sentence with no link. Posts 2-5 are receipts with images. Post 6 is the URL. Post 7 is the call to action (tip line, follow). Threads on X consistently get reply-pinned, which compounds reach."
    status: confirmed
  - lever: "Cross-platform stagger"
    note: "Stagger same-content posts by 30 to 60 minutes across platforms. Same-content same-minute posting reads as automation and triggers algorithmic de-ranking on every platform that has spam detection."
    status: testing
  - lever: "Bluesky audience asymmetry"
    note: "Bluesky's audience is journalists + researchers + academics. Receipts with primary-source URLs perform 2-3x what they do on X. Lean Bluesky for long-form receipts; lean X for quote-reply combat."
    status: testing
  - lever: "Reply-and-retreat"
    note: "On a quote-reply, post the receipt and one sentence. Do NOT engage further down the thread unless the target responds substantively. Algorithm reads long arguments as toxic and de-ranks both sides."
    status: testing
  - lever: "First post stays under 240 chars"
    note: "X compresses any post over 240 chars into 'show more.' First post of any thread or standalone needs to read complete in the preview. Receipts go in posts 2+."
    status: confirmed
---

# Algorithm levers (long form)

Save edits with the button at the top. The structured `algorithm-levers` block above renders as cards on the page; this section is freeform for ideas, weekly review notes, and experiments in flight.

## Currently testing

- (add notes here as I run experiments)

## Currently working

- (promote levers here from "testing" once they reliably convert)

## Killed

- (track what stopped working and why)

# Weekly review notes

One short entry per week. Numbers + observations.

## Week of 2026-05-04

**FIRST REAL DISTRIBUTION PUSH.** See `week-one-launch:` block in frontmatter for the full day-by-day plan. One beat per day, 6:00-6:30am PT, Bluesky-led, X-mirrored 30-60 min later, Reddit + FB groups within 2 hours.

- Followers X: started at 0
- Followers Bluesky: started at 0
- Followers IG: started at 0
- Patreon supporters: 0

### Day-by-day quick-reference

| Day | Beat | Headline | Lead platform |
|---|---|---|---|
| **Mon 5/4** | `/class-traitor` | "$31 million to bury a class traitor." | Bluesky 6am, X 6:30am, Reddit 7am, FB 9am |
| **Tue 5/5** | `/three-becerras` | "Three audiences. Three Becerras." | Same cadence |
| **Wed 5/6** | `/not-the-bad-guy` | "He took the check. Then he defended it." | Same cadence |
| **Thu 5/7** | `/donors-becerra-2026` | "Becerra for Governor 2026: top donors." | Same cadence |
| **Fri 5/8** | hold or amplify | (decided Thursday evening based on traction) | n/a |

### Lead pick rationale: Class Traitor goes Monday

- Universal money hook ($31M, $21M anti-Steyer IE, all FPPC verified)
- Steyer is nationally known — story doesn't require California-politics literacy
- Defamation surface low — every dollar primary-source-anchored
- Crosses partisan lanes (liberal: Steyer; conservative: "class traitor")
- Bearstar dual-mandate is the second-paragraph hook → Three Becerras Tuesday

### Critical prep before Monday 6am

1. **OG preview verification** — all 5 URLs through FB Sharing Debugger. Without images, FB previews are dead.
2. **Pre-write Bluesky/X threads** (20 posts staged in a doc).
3. **Reporter handle list** (10 names with Bluesky + X handles).
4. **Analytics live** (Cloudflare Web Analytics or GA4).
5. **FB group post variants** (3 tone variants × 4 beats).

### Notes (fill in throughout the week)

- Mon 5/4 morning:
- Mon 5/4 evening (traffic + engagement check):
- Tue 5/5 morning:
- Tue 5/5 evening:
- Wed 5/6 morning:
- Wed 5/6 evening:
- Thu 5/7 morning:
- Thu 5/7 evening (DECISION POINT for Friday):
- Fri 5/8:
- Weekend retro (what worked / what didn't / week 2 plan):

