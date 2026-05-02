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

- Followers X: started at 0
- Followers Bluesky: started at 0
- Followers IG: started at 0
- Patreon supporters: 0
- Notes:

