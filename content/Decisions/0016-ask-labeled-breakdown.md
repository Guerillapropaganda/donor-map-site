---
title: "ADR-0016: Ask Panel — Labeled Breakdown Instead of One Ambiguous Total"
type: adr
status: open
date: 2026-04-21
---

# ADR-0016: Labeled Breakdown for Ask Panels

## Context

Every Ask panel that shows "how much did X receive / spend" currently
surfaces a single headline number — e.g. "Bernie Sanders received
$625K in tracked support edges from 2,147 donors/committees." Users
comparing this number against external sources (FEC reports showing
Bernie raised $550M+ lifetime) conclude the data is broken.

The number isn't wrong; the **label** is wrong. $625K is the sum of
itemized donor edges at ≥$1K aggregation per donor-per-cycle — a
narrow slice of "major donors" that systematically excludes Bernie's
small-dollar base. The headline says "received," the user reads it
as "total raised." Same bug surfaces for every small-dollar specialist
(AOC, Rashida Tlaib, Katie Porter).

The same class of confusion hits dark-money / DAF entities from the
opposite direction: Marble Freedom Trust and Sixteen Thirty Fund both
show "0 donors, $0 received" on the compare panel. The zeros are
technically correct — 501(c)(4) nonprofits legally don't disclose
donors — but the UI presents them as missing data.

Multiple panels (`donors_to`, `summary`, `compare`, `leaderboard`)
each compute a "total" independently, apply different filters, and
occasionally disagree with each other on the same entity. A user
comparing two panels sees mismatched numbers and concludes the system
is unreliable.

## Options considered

### Option A — Pick one definition and standardize silently

Choose one number (e.g. FEC-summary lifetime) and use it everywhere.
Rejected: loses specificity. "Bernie raised $550M" is true but hides
the donor structure (almost entirely small-dollar). The $625K of major
itemized donors is also a real number worth surfacing — it shows the
gap between his fundraising model and most politicians'. Collapsing to
one headline loses signal.

### Option B — Keep current one-number panels, add disclaimer text

Add "this may be incomplete" footer on every panel. Rejected: users
don't read disclaimers. The panel still shows $625K as the lead,
which is what gets screenshotted and shared.

### Option C (chosen) — Break the total into labeled slices

For every entity type with real fundraising complexity (politicians,
super-PACs, dark-money nonprofits, DAFs), decompose the "received" /
"spent" narrative into labeled lines. Each line is a specific,
defensible number with a source. No single headline number to be
"wrong."

Structure varies by entity type. Politician example:

```
Bernie Sanders
├── Total FEC receipts (all cycles):  $550M   [fec-candidate-summary]
├── Individual donors (itemized ≥$1K): 2,147 donors, $625K  [fec-indiv]
├── PAC contributions (itemized):      47 PACs, $3.2M       [fec-pas2]
├── IE support (ads run FOR them):     3 super-PACs, $8M    [fec-pas2/24E]
├── IE attack (ads run AGAINST them):  8 super-PACs, $35K   [fec-pas2/24A]
└── Small-dollar shown here: ≥$1K aggregate. The FEC receipts line
    above captures the full base including sub-$200 unitemized.
```

501(c)(4) dark-money entity:

```
Marble Freedom Trust
├── Donors (publicly disclosed):    None required — 501(c)(4) social-
│                                   welfare org. The $1.6B Barre Seid
│                                   gift is known from news reporting,
│                                   not from any filing.
├── Tracked outflows:               4 recipients, $995M  [irs-990]
├── Top recipient:                  The 85 Fund, $160M
└── Attack spending (IE-oppose):    —
```

DAF:

```
Fidelity Charitable
├── Donors:          DAFs are designed to break the paper trail between
│                    who gave and where it landed. Donor identities are
│                    not part of any public record. This is the product,
│                    not missing data.
├── Tracked grants out:  N recipients, $NM  [irs-990]
└── Top recipient:       Schwab Charitable Fund, $XM
```

### How this differs from today's "dual-layer footnote"

The current dual-layer footnote (shipped 2026-04-20) surfaces only the
FEC-lifetime number and only on `donors_to`. That was a narrow patch.
ADR-0016 generalizes: every "total" a user sees gets a labeled
breakdown, in every panel that shows totals.

## Decision

Implement a shared `computeBreakdown(entity, edges, direction)` helper
in `ops/src/app/api/ask/route.ts`. Returns an ordered list of
`{ label, value, citation?, note? }` rows. Handlers that previously
built a one-line `answer` call the helper and render the breakdown
instead.

Applied to:
- `donors_to` — primary ("who funds X")
- `summary` — profile-snapshot answer
- `compare` — each side's column
- `handleSummary` — the structured ent/edges summary used by money_chain

Skipped for V1 (can add later): leaderboard rows (already multi-column
tables), explain_concept (not an entity lookup), voting_record (not
a money query).

## Consequences

Positive:
- Numbers can be read and cited individually. "Bernie's $625K itemized
  donors" is a defensible standalone claim.
- Dark-money / DAF entities no longer read as "broken." The legal-
  shield explanation turns the zero into a teaching moment.
- Same entity renders consistent breakdown across panels; no more
  divergence between `who funds X` and `compare X vs Y`.

Negative:
- Slightly more vertical space per panel (5-6 labeled rows vs 1-line
  headline). Worth it; space is cheap, confusion is expensive.
- Requires the entity-store `signals.*_lifetime` fields to be kept in
  sync. Already the case for the 409 politicians synced via
  `sync-politician-summary-receipts.cjs`; gap is flagged when the
  field is missing ("FEC lifetime not available").

Opens:
- Labeled-breakdown schema should inform the public-facing API design
  (ADR-0015 open). A CSV export of "Bernie's donor breakdown" should
  ship with the same row labels a user sees on screen.
- The "small-dollar" qualifier on politicians needs a similar breakdown
  for outflows (campaign spending) once `fec-oppexp` is queryable.

Closes:
- The "Bernie looks broke" UX class (multiple sessions of re-triage).
- The "0 donors" empty-state confusion for dark-money / DAF entities.
- The "same entity, different total on different panel" bug class.
