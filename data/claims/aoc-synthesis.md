# AOC — synthesis layer

This file is the interpretive prose that connects the raw claims in `data/claims/aoc.jsonl` into a reading experience. Each section below is an anchor that claim-object rendering uses to assemble the final profile page. Section keys match the `section_key` field on claims.

This is the ONLY place editorial voice lives in a claim-object profile. Claims are facts with sources; synthesis is framing. If you find yourself writing a factual assertion in this file without a claim backing it, stop — move the fact into a claim object in `aoc.jsonl` first, then cite it back here.

---

## section: identity

Alexandria Ocasio-Cortez is, by the metrics the Donor Map tracks, an anomaly: a working-class politician in a Congress dominated by inherited wealth and professional-class donors. Her biographical claims below aren't trivia — they're the structural explanation for why her funding pattern, her voting record, and her rhetorical choices look nothing like her colleagues'.

<!-- CLAIMS: identity -->

## section: funding

This is the heart of the class-analysis case study. AOC's funding pattern is the opposite of almost every other high-profile Democrat: no corporate PAC money, majority small-dollar donors, and a fundraising floor that still produces eight-figure cycles. The claims below quantify that pattern.

The absence of corporate PAC money is not symbolic. In 2020, when her cycle raised $17.3M, the median Democratic House freshman raised a smaller amount with a materially different composition (corporate PACs, ideological PACs, bundled large-donor networks). The funding model isn't just different; it's incompatible with the donor-class pressure the rest of this vault documents.

<!-- CLAIMS: funding -->

## section: positions

AOC's stated positions are legible because she puts them on bills. She does not equivocate, she does not float and retreat, and the positions she names publicly are the ones she sponsors or cosponsors. That makes the `contradiction_index` test unusually easy for her: positions are on record and votes are on record, and they overwhelmingly match.

<!-- CLAIMS: positions -->

## section: votes

Where stated positions meet the floor. AOC's voting record is consistent with her stated positions in almost every high-profile case. The handful of notable divergences are typically votes WHERE she moved LEFT of her stated position — like opposing the 2021 infrastructure bill's decoupling from Build Back Better as a leverage play, or opposing the 2023 rail strike intervention because it denied paid sick leave. These aren't contradictions; they're refusals to accept watered-down legislation.

<!-- CLAIMS: votes -->

## section: alliances

The Squad and the Progressive Caucus are the institutional context for AOC's votes. Her coalition inside the Democratic caucus is small but internally coherent, and the alliances below explain both her leverage (block-voting) and her limits (she is one of a few, not one of many).

<!-- CLAIMS: alliances -->

## section: moments

Politicians are measured by what they say, what they vote for, and — often overlooked — what they're physically present for. The Pelosi sit-in and the Cohen hearing are the two moments where AOC's political capital shifted most visibly in public. They belong in the record.

<!-- CLAIMS: moments -->

---

## Class analysis

AOC is tagged `class_origin: working-class` in the entity vocabulary, and `primary_funders_class: grassroots-small-dollar`. These tags aren't editorial claims; they're structured metadata derived from the specific facts above. The claim that matters here is not "AOC is working-class" — that's an identity fact. The claim that matters is that **her funding model is structurally incompatible with the donor-class pressure this vault documents across every other profile**, and therefore her voting record is the control case for what a politician can do when freed from that pressure.

Whether she uses that freedom well or badly is an editorial question, and this synthesis file is deliberately narrow about making that call. The data answers it: on minimum wage, Medicare for All, climate legislation, and labor support, her votes and her stated positions align. When they diverge, she moves left. That's the full structural story.

<!-- CLAIMS: contradiction -->

---

## Experimental notes (Phase 4)

This profile is the Phase 4 claim-object experiment per ADR-0003. If the pattern reads naturally here, the migration template is proved and we can expand to other profiles. If it reads as a database dump, we learn where synthesis prose is load-bearing and adjust the format.

Reading-experience comparison lives in `content/Phases/phase-4/comparison.md` (written after the first render).
