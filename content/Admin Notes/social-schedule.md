---
title: Social Media Schedule
type: admin-note
note-type: schedule
priority: high
status: draft
last-updated: '2026-05-02'
owner: David
companion-files:
  - content/Admin Notes/sprint-schedule.md
  - prototype/home.html
  - prototype/beat-class-traitor.html
  - prototype/beat-three-becerras.html
---

# Social Media Schedule
## Guerilla Prop / The Donor Map

Single source of truth for posting cadence, content rotation, engagement targets, and growth tactics across platforms. Mirrors the structure of `sprint-schedule.md` so the Ops calendar can later parse it.

**Status:** DRAFT. To be riffed on next session before going live. The lists of accounts are starting points; David verifies every handle on every platform before adding (Rule 13 — URL verification is editor-only).

---

## Operating principle

> Post when there is a receipt. Engage when there is data. Otherwise stay quiet.

The brand pitch is "I publish less and publish right." Daily-takes-on-the-news posting kills that pitch. The social schedule below is built to amplify finished investigations, not to manufacture filler.

---

## Weekly rhythm

```yaml
weekly_rhythm:
  monday:
    label: "ANCHOR DAY"
    target_minutes: 90
    tasks:
      - "Drop the week's anchor investigation as a thread on Bluesky + X"
      - "Cross-post lead image to Threads + IG (carousel) + FB"
      - "Patreon post: personal note + link to live investigation on thedonormap.org"
      - "Pin the X + Bluesky thread for the week"

  tuesday:
    label: "Engagement day 1"
    target_minutes: 30
    tasks:
      - "1-2 quote-replies on adjacent stories with a receipt from the data"
      - "Reply to comments on Monday's anchor"

  wednesday:
    label: "Receipt drop"
    target_minutes: 45
    tasks:
      - "Mid-week single-image receipt post (a stat or finding from the working data, not a full investigation)"
      - "Cross-post: X + Bluesky + Threads"

  thursday:
    label: "Engagement day 2"
    target_minutes: 30
    tasks:
      - "1-2 quote-replies with receipts"
      - "Engage with Tier 1 journalist accounts (replies that add data, not 'great post')"

  friday:
    label: "Working notes"
    target_minutes: 45
    tasks:
      - "Bluesky-only: 'what I'm working on' post (low-effort, builds personal brand)"
      - "Optional: short Patreon working-notes post if a major lead developed"

  saturday:
    label: "OFF"
    target_minutes: 0
    tasks: []

  sunday:
    label: "OFF (planning only)"
    target_minutes: 30
    tasks:
      - "Plan next week's anchor (which beat is shipping?)"
      - "Schedule Monday's posts in advance if possible"
```

**Total target:** ~4-5 hours/week. If the budget exceeds 6 hours/week, you are over-investing in social and under-investing in the work.

---

## Per-platform cadence

```yaml
platforms:
  - id: bluesky
    priority: 1
    posts_per_week: 6-10
    posts_per_day_max: 4
    best_content: "Long threads, receipt screenshots, quote-skeets with data"
    best_times_et: ["09:00-12:00", "16:00-18:00"]
    why: "Highest credibility per post. Journalism class lives here. Get on starter packs + custom feeds."
    notes:
      - "No quote-tweet engagement bait dynamic; rewards substance"
      - "Custom feeds matter more than the algorithm"

  - id: x
    priority: 2
    posts_per_week: 8-15
    posts_per_day_max: 4
    best_content: "Single-image meme posts (highest reach), quote-replies with receipts"
    best_times_et: ["08:00-10:00", "12:00-13:00"]
    why: "Politicians + PR shops still see things here first. Necessary for visibility."
    notes:
      - "Algorithm has been quietly demoting threads; lead with image"
      - "Avoid weekends — engagement craters"
      - "Toxic engagement environment; do not feed trolls"

  - id: instagram
    priority: 3
    posts_per_week: 2-4
    posts_per_day_max: 1
    best_content: "Brutalist meme images (carousel of receipts: donor 1 / donor 2 / donor 3 / contradiction)"
    best_times_et: ["11:00-13:00", "19:00-21:00"]
    why: "Visual language already optimized for the grid. Carousels reward swipes."
    notes:
      - "Long captions work; repurpose thread content as caption"
      - "Skip Reels unless you commit to making video"
      - "Hashtags still matter for discovery here"

  - id: patreon
    priority: 4
    posts_per_month: 4-8
    best_content: "Personal note + link to investigation. Occasional 'what I'm working on' update."
    why: "Donation infrastructure. Low cadence by design."
    notes:
      - "Posting too much actively HURTS retention"
      - "Quarterly is the floor; weekly is the ceiling"
      - "Never post just to stay active"

  - id: threads
    priority: 5
    posts_per_week: 3-7
    posts_per_day_max: 2
    best_content: "Short punchy text. Killer stat in the post itself, link as reply."
    best_times_et: ["18:00-22:00"]
    why: "Cross-post the X anchor. Low investment."
    notes:
      - "Algorithm penalizes external links in post body"
      - "Skews younger; political-journalism class hasn't fully landed yet"

  - id: facebook
    priority: 6
    posts_per_week: 1-3
    best_content: "Long captions (people read on FB). Image first, link in comments."
    best_times_et: ["09:00-11:00"]
    why: "Lowest priority. Skip or auto-cross-post. Older voter audience only."
    notes:
      - "Algorithm punishes external links in post body — put link in first comment"
      - "Group posting > page posting for reach"
      - "Honestly: skip unless reaching older CA voters specifically matters"
```

---

## Engagement target tiers

> **Rule 13 reminder:** every handle below is a NAME, not a verified URL. David verifies the handle on each platform before following or tagging. I (Code Claude) do not verify social URLs.

### Tier 1 — Quote-reply with receipts (high signal)

These are the accounts where adding data they don't have is genuinely useful. Quote-reply pattern: quote the post, add one stat from your data + link to the source filing. Never "great post." Always a fact they can use.

```yaml
tier_1_national_accountability:
  - Judd Legum (Popular Information)
  - Andy Kroll (ProPublica)
  - Marisa Kabas (The Handbasket)
  - David Sirota (The Lever)
  - Walker Bragman (The Lever)
  - Anna Massoglia (OpenSecrets dark-money lead)
  - Donald Shaw (Sludge)
  - David Moore (Sludge)
  - Jim Lardner (Documented)
  - Aaron Mendelson (The Markup, accountability beat)

tier_1_california_political_press:
  - Sameea Kamal (CalMatters)
  - Alexei Koseff (CalMatters)
  - Frank Stoltze (LAist)
  - Marisa Lagos (KQED)
  - Scott Shafer (KQED)
  - Christopher Cadelago (Politico CA)
  - Jeremy White (Politico CA)
  - Mark Z. Barabak (LA Times)
  - Phil Willon (LA Times)
  - Lindsey Holden (Sacramento Bee)

tier_1_orgs_institutional:
  - "@OpenSecrets"
  - "@ProPublica"
  - "@TheLeverNews"
  - "@DocumentedNY"
  - "@CommonCauseCA"
  - "@CREWcrew"
```

### Tier 2 — Follow + occasional engage

Follow these to stay on top of what they cover. Engage when there's a clear data overlap with your investigations. Do not chase.

```yaml
tier_2_adjacent:
  - Aaron Rupar (amplification, large reach)
  - Kyle Cheney (legal docs)
  - Heather Knight (NYT SF bureau)
  - Joe Garofoli (SF Chronicle politics)
  - Seema Mehta (LA Times campaigns)
  - Dustin Gardiner (Politico CA, formerly SFC)
  - Phil Matier (former SFC, still reads political tea leaves)
  - George Skelton (LA Times Sacramento column)

tier_2_candidates_and_their_pr:
  # Follow the active CA Gov 2026 candidates and their comms staff to track
  # what they're saying publicly vs. what their donors say privately.
  - Becerra campaign + comms staff
  - Porter campaign + comms staff
  - Steyer campaign + comms staff
  - Hilton campaign + comms staff
  - Bianco campaign + comms staff
  - Villaraigosa campaign + comms staff
```

### Tier 3 — Tag opportunistically

When a published investigation is directly relevant to their beat, tag once at the post drop. Don't repeat-tag.

```yaml
tier_3_tag_when_relevant:
  - "@LATimes"
  - "@calmatters"
  - "@KQED"
  - "@LAist"
  - "@SacBee_News"
  - "@sfchronicle"
  - "@politicoca"
```

### Avoid list

```yaml
do_not_engage:
  - "Bothsides centrist accounts that will launder findings into 'both candidates have donor problems' framing"
  - "Pure-pundit accounts with no journalism background — they amplify and then screenshot to attack you"
  - "Anyone who responds to receipts with 'sources?' when the source URL is in the post"
  - "QT-dunkers (people whose entire feed is mocking quote-tweets) — they will eventually turn on you"
```

---

## Content templates

### Anchor thread (Mon, Bluesky + X)

```
Post 1 (lead, with image):
[10-WORD HEADLINE — punchy, names a specific person or pattern]

[2-line lede stating the finding]

🧵
———
Post 2:
THE RECEIPTS:

— [Donor 1]: $[amount] · [class tag]
— [Donor 2]: $[amount] · [class tag]
— [Donor 3]: $[amount] · [class tag]
———
Post 3-5:
[The story the receipts already told. One stat per post.]
———
Final post:
Read the full investigation, with every source linked:
thedonormap.org/[SLUG]

— David
@guerillaprop
```

### Quote-reply with receipt (Tue/Thu)

```
[1-line response with the stat that contradicts or extends the original post.]

[Receipt: source name + dollar amount + date]

Filing: [direct primary-source URL]
```

### Mid-week receipt drop (Wed, single image)

```
[1-line stat that lands as a standalone fact]

[Image: brutalist meme card with the receipt]

Source: [primary-source URL]

(More on [politician/donor] at thedonormap.org/[SLUG])
```

### "What I'm working on" (Fri, Bluesky-only)

```
What I'm reading this week:

— [State filing 1]
— [Federal filing 2]
— [Tip received from a reader]

Next investigation drops [Mon/Tue]. The pattern is [one-line tease without spoiling].
```

### Patreon post (when an investigation lands)

```
I just published [investigation name]. Here's what didn't make it into the public piece:

[1-2 paragraphs of patron-only context — could be a dead end, a source dynamic, what surprised you in the data]

Read the full investigation: thedonormap.org/[SLUG]

— David
```

---

## Hashtags by platform

```yaml
hashtags:
  bluesky:
    # Bluesky doesn't have native hashtags but tags work for custom feeds.
    use_sparingly:
      - "#politics"
      - "#cagov2026"
      - "#campaignfinance"

  x:
    use_per_post: 1-2
    candidates:
      - "#CAGov2026"
      - "#CampaignFinance"
      - "#DarkMoney"
      - "#FollowTheMoney"

  instagram:
    use_per_post: 5-10
    candidates:
      - "#politicalcorruption"
      - "#campaignfinance"
      - "#darkmoney"
      - "#cagov2026"
      - "#california"
      - "#accountability"
      - "#independentjournalism"

  threads:
    use_sparingly:
      - "#politics"
      - "#cagov2026"

  facebook:
    avoid_hashtags: true
    note: "Hashtags do not help on FB. Use plain text + groups instead."
```

---

## Metrics to track (weekly)

```yaml
metrics:
  growth:
    - followers_per_platform
    - new_patreon_pledges
    - patreon_total_monthly
  reach:
    - top_post_impressions_per_platform
    - link_clicks_to_thedonormap_org_per_platform
  engagement_quality:
    - tier_1_journalists_who_quoted_or_replied (count, not list)
    - press_pickups (if any reporter cited an investigation that week)
  brand_health:
    - misuse_of_findings_seen (anyone screenshotting and misframing)
    - takedown_or_legal_inquiries (should be 0; spike = audit)

review_cadence: "Friday afternoon, 15-min check-in"
```

---

## Verification items (David's lane)

```yaml
needs_verification_before_launch:
  - id: handles
    description: "Every account name in the engagement tiers needs handle verification on each platform. Code Claude cannot verify social URLs (Rule 13)."
    owner: David
    blocking: true

  - id: posting_voice_pass
    description: "Read every content template above and confirm the voice matches your homepage prose. Edit anything that reads like AI."
    owner: David
    blocking: true

  - id: avoid_list
    description: "The 'do not engage' list is generic; you may want to add specific accounts you have already had bad experiences with."
    owner: David
    blocking: false

  - id: cadence_sanity
    description: "4-5 hours/week target — confirm this matches what you actually want to spend. Adjust if too low or too high."
    owner: David
    blocking: false
```

---

## What changes when the corpus grows

```yaml
phases:
  - phase: 1
    name: "Pre-launch (1-2 beats live)"
    posting_volume: "low — anchor weekly, replies daily"
    focus: "Build the journalist follow list. Quality over quantity."
    metric: "First 100 quality follows (Tier 1 journalists, accountability orgs)"

  - phase: 2
    name: "Active publication (3-8 beats live)"
    posting_volume: "medium — anchor weekly, mid-week receipt drops, replies daily"
    focus: "Establish the chart-as-hero visual language. Aim for first press pickup."
    metric: "First citation by a Tier 1 journalist"

  - phase: 3
    name: "Full beat (10+ beats live, weekly cadence)"
    posting_volume: "this schedule, sustained"
    focus: "Stop chasing follows. Convert Tier 2 accounts into Tier 1 by consistently adding value."
    metric: "Weekly retention of paying patrons; quarterly press pickups"
```
