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

algorithm-levers:
  - lever: "Reply within 30 minutes"
    note: "X algorithm rewards fast replies under big accounts. First-mover quote-reply with receipt outperforms a 4-hour-late thread."
    status: testing
  - lever: "Native video / image"
    note: "Image posts outperform link posts by approximately 3x on every platform. Brutalist meme tiles travel; bare URLs do not."
    status: confirmed
  - lever: "Threads > standalone posts"
    note: "5-7 post threads on X consistently get pinned by replies, which boosts subsequent reach."
    status: confirmed
  - lever: "Cross-platform timing"
    note: "Stagger by 30-60 minutes across platforms; same-content same-minute posting reads as automation and gets de-ranked."
    status: testing
---

## Algorithm levers (long form)

This section is freeform. Use it to track what is working, what is not, and what to test next. The structured `algorithm-levers` field above is for the dashboard view; this is for the weekly review.

### Currently testing

(Empty. Add notes here as I run experiments.)

### Currently working

(Empty. Promote levers here from "testing" once they are clearly converting.)

### Killed

(Empty. Track what stopped working and why.)

## Weekly review notes

Track week-over-week numbers and observations. One short entry per week.

### Week of 2026-05-04

(Placeholder.)
