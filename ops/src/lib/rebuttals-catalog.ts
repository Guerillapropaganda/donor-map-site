/**
 * Rebuttals catalog - per-beat counter-arguments and prepared responses.
 *
 * When a beat catches press attention or critique, the campaign / donors /
 * affected parties will deploy predictable defenses. This catalog records
 * the strongest counter-arguments per beat, why each one lands with general
 * audiences, and the prepared response to each.
 *
 * Read on the per-beat workspace at /active-beat/[slug] under the
 * "Counter-arguments + responses" section. The intent is operational —
 * pull this up before responding to a reporter, a quote-reply, or a
 * campaign statement, so you have ready answers and don't drift into
 * defensive overclaiming.
 *
 * Source rule: never use risky language ("controlled by", "bought by",
 * "corrupt"). Reframe to "financial alignment", "shared donor network",
 * "overlapping interests". Show patterns, don't assert intent.
 */

export interface Rebuttal {
  /** The counter-argument as a campaign / opponent would phrase it */
  counter_argument: string
  /** Why this counter-argument resonates with general audiences */
  why_it_lands: string
  /** Prepared response — the reframe, not a denial */
  response: string
}

export interface BeatRebuttals {
  beat_slug: string
  rebuttals: Rebuttal[]
  /** One-sentence guiding principle for this beat's defensive posture */
  guiding_principle: string
  /** Where these came from. Refresh when a real counter-argument appears in the wild that's not on this list. */
  source: string
  last_updated: string
}

const REBUTTALS: BeatRebuttals[] = [
  {
    beat_slug: "class-traitor",
    guiding_principle:
      "Don't argue legality or intent. Argue alignment, pattern, and timing. The story is structural, not accusatory.",
    rebuttals: [
      {
        counter_argument: "Independent expenditures aren't controlled by the candidate (legal firewall defense).",
        why_it_lands:
          "Sounds technical but credible. Most voters vaguely understand 'super PACs = separate.'",
        response:
          "Don't argue control. Argue alignment + pattern. 'Legally independent doesn't mean politically unrelated. Same donors, same consultants, same message timing.' Then show overlap (vendors, timing, messaging sync). Bearstar Strategies running both anti-Steyer AND pro-Becerra IE messaging on opposite ends of the same race is the documentation.",
      },
      {
        counter_argument: "Steyer is self-funding / climate-first billionaire — he's not bought by donors.",
        why_it_lands: "Counters 'bought by donors' narrative emotionally.",
        response:
          "Shift from source of money → coalition around him. 'Even if he self-funds, who is building the machine against him?' Focus on the donor class organizing OPPOSITION, not who pays Steyer's campaign upstream.",
      },
      {
        counter_argument: "PG&E involvement is old / indirect / overstated.",
        why_it_lands: "Distance argument. 'That was years ago' deflects.",
        response:
          "Timeline discipline. 'Here's when, here's how, here's the structural relationship.' PG&E's $10.05M is current 2026 cycle, traced through two committees (Californians for Resilient & Affordable Energy → NO ON Steyer). Avoid exaggeration. Precision wins credibility here.",
      },
    ],
    source: "ChatGPT synthesis pass 2026-05-03 + Donor Map editorial framing",
    last_updated: "2026-05-03",
  },
  {
    beat_slug: "three-becerras",
    guiding_principle:
      "Don't deny compromise. Reframe the pattern as documented and repeated, with named audience-specific framing.",
    rebuttals: [
      {
        counter_argument: "Governance vs. campaigning — reality requires compromise.",
        why_it_lands: "Normie voters accept 'politics is messy.'",
        response:
          "Don't deny compromise. Reframe as pattern, not one-off: 'Compromise is one thing. Repeated alignment with the same industry is another.' Three audiences, three different answers, six weeks. The hardest version reserved for the doctors lobby.",
      },
      {
        counter_argument: "CMA endorsement does not equal policy control.",
        why_it_lands: "True on paper.",
        response:
          "Show incentive alignment, not control. 'Endorsements don't dictate policy, but they signal who expects access.' The CMA endorsement timeline (CMA withdraws Swalwell endorsement → IE PAC formed 17 days later → Working Families IE began commissioning polling 8 days later) is the structural documentation.",
      },
      {
        counter_argument: "Single-payer failure was legislative, not Becerra's fault.",
        why_it_lands: "Blame diffusion works.",
        response:
          "Narrow it: 'What did he actively push vs. passively allow to die?' Force agency back onto him. Across thirty years and three audiences, the question is what he actually advocated, not what the legislature happened to do.",
      },
    ],
    source: "ChatGPT synthesis pass 2026-05-03 + Donor Map editorial framing",
    last_updated: "2026-05-03",
  },
  {
    beat_slug: "chevron",
    guiding_principle:
      "Don't argue legality or amount. Argue door-opening function and post-litigation timing.",
    rebuttals: [
      {
        counter_argument: "Campaign donations are legal and common.",
        why_it_lands: "It's true and widely accepted.",
        response:
          "Don't argue illegality. Argue optics + timing: 'Legal doesn't mean irrelevant. The question is why that relationship exists at all after adversarial litigation.' The 2020 fracking lawsuit → the 2025 max-out donation → the 2026 'not the bad guy' defense is the documented sequence.",
      },
      {
        counter_argument: "AGs sue companies routinely — doesn't imply conflict.",
        why_it_lands: "Normalizes behavior.",
        response:
          "Focus on post-action relationship: 'The lawsuit is expected. The continued financial relationship is the signal.' Two rivals (Porter, Steyer) refused fossil-fuel money. He took it.",
      },
      {
        counter_argument: "$39,200 is insignificant in statewide politics.",
        why_it_lands: "Minimization.",
        response:
          "Shift from amount → door-opening function: 'It's not the size, it's the access.' $39,200 is the FPPC max — the maximum amount California law allows. By definition it's not minor; it's the legal ceiling.",
      },
    ],
    source: "ChatGPT synthesis pass 2026-05-03 + Donor Map editorial framing",
    last_updated: "2026-05-03",
  },
  {
    beat_slug: "donors-becerra-2026",
    guiding_principle:
      "Pivot from quid-pro-quo arguments (legal terrain you lose) to structural-alignment arguments (factual terrain you win).",
    rebuttals: [
      {
        counter_argument: "Healthcare donors support experienced regulators.",
        why_it_lands: "Sounds logical.",
        response:
          "Flip it: 'Or they support regulators they understand and can predict.' The donor list is the documentation — who is currently acceptable to the candidate.",
      },
      {
        counter_argument: "There's no direct quid pro quo evidence.",
        why_it_lands: "Strong legal framing.",
        response:
          "Agree, then pivot: 'This isn't about quid pro quo. It's about structural alignment.' We're mapping who funds whom, not asserting illegal exchange. The pattern speaks; we don't have to.",
      },
      {
        counter_argument: "Healthcare is complex — consolidation isn't inherently bad.",
        why_it_lands: "True nuance.",
        response:
          "Narrow scope: 'Then let's evaluate outcomes: prices, access, competition.' The donor list raises the question; voters evaluate the answer at the ballot.",
      },
    ],
    source: "ChatGPT synthesis pass 2026-05-03 + Donor Map editorial framing",
    last_updated: "2026-05-03",
  },
  {
    beat_slug: "mahan",
    guiding_principle:
      "Don't argue billionaires are bad. Argue concentration ratio is structurally distinctive.",
    rebuttals: [
      {
        counter_argument: "IE-heavy campaigns reflect grassroots enthusiasm via PACs.",
        why_it_lands: "Tries to claim small donors via the IE structure.",
        response:
          "'Grassroots doesn't usually show up as 67% IE funding from 61 donors.' The candidate committee has 1,519 donors — that's the grassroots base. The IE PAC has 61 donors funding more than half the total spend. The two are structurally different.",
      },
      {
        counter_argument: "Tech donors support reform candidates.",
        why_it_lands: "Frames billionaire money as ideological alignment.",
        response:
          "Tie to policy exposure: 'The donors funding Mahan invest in companies California is about to regulate — AI, autonomous vehicles, gig-platform classification, crypto.' Specifically: Brian Armstrong $500K to the IE while DFAL crypto licensing went live July 1, 2026.",
      },
      {
        counter_argument: "The 2022 AB5 misclassification was a campaign mistake / misinterpretation.",
        why_it_lands: "Distance from current candidate.",
        response:
          "Keep it simple: 'He misclassified the same kind of worker he later took $150K from Uber via a PAC to influence policy on.' The 2022 misclassification of 18 campaign workers as contractors is documented. The 2023 lone vote against city-worker raises is documented. The 2026 Uber + Coinbase money is documented. Pattern.",
      },
    ],
    source: "ChatGPT synthesis pass 2026-05-03 + Donor Map editorial framing (pending Mahan beat)",
    last_updated: "2026-05-03",
  },
  {
    beat_slug: "villaraigosa-pledge",
    guiding_principle:
      "Don't dismiss energy realism. Reframe the question as 'what changed since 2018?' The pivot itself is the story.",
    rebuttals: [
      {
        counter_argument: "Energy realism — California still needs refining capacity.",
        why_it_lands: "Practical-sounding policy frame.",
        response:
          "Don't dismiss the policy point. Reframe the personal turn: 'Then why sign the No Fossil Fuel Money pledge before? What changed?' Either the 2018 pledge was a mistake then, or the 2026 reversal is the mistake. Both can't be right. He signed; now he won't re-sign.",
      },
      {
        counter_argument: "The 2018 pledge was symbolic / PR.",
        why_it_lands: "Minimizes the original commitment.",
        response:
          "'Symbolic commitments still signal priorities.' His own spokesperson Josh Pulliam said 'he didn't break the pledge — he's just refusing to sign it this time around.' That's the campaign on the record. The candidate's own spokesperson confirmed the framing.",
      },
      {
        counter_argument: "$176,000 is small / exaggerated as a fossil-fuel donor block.",
        why_it_lands: "Minimization.",
        response:
          "Again: access > amount. Plus: $176K is what's verified since entering the 2026 race. LA Times reported $1M+ over decades. CalMatters documented the 2026 policy turn (refinery moratorium call, CARB overhaul). The dollar figure is the floor, not the ceiling.",
      },
    ],
    source: "ChatGPT synthesis pass 2026-05-03 + Donor Map editorial framing (pending Villaraigosa beat)",
    last_updated: "2026-05-03",
  },
]

export function getRebuttals(beatSlug: string): BeatRebuttals | undefined {
  return REBUTTALS.find((r) => r.beat_slug === beatSlug)
}

export function listAllRebuttals(): BeatRebuttals[] {
  return REBUTTALS.slice()
}
