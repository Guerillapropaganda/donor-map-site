---
title: Distribution kit · Hilton AI-conflict beat
type: admin-note
beat: hilton
created: 2026-05-04
status: open
tags: [distribution, hilton, ca-gov-2026]
---

# Distribution kit · Hilton AI-conflict beat

Paste-ready copy for X / Reddit / Facebook launch of [/hilton](../hilton/index.html). Voice rules applied: zero em dashes, no AI vernacular, normie language. Each block is a self-contained selection.

**Beat URL:** https://thedonormap.org/hilton
**Companion holdings page:** https://thedonormap.org/holdings-hilton-2026
**OG image (diagram):** /static/share/hilton.png
**Holdings OG image:** /static/share/holdings-hilton-2026.png

Image-share captions for the master share card and the two structured-receipt memes already live in `ops/src/lib/memes-catalog.ts` (`may4-hilton-share`, `may4-hilton-meme-receipt-stack`, `may4-hilton-meme-regulate-own-stock`). This file covers the text-only surfaces those captions don't.

---

## X thread (6 posts, pin post 1)

### Post 1 (hook)

```
Steve Hilton wants to regulate AI in California.

He owns stock in an AI company.

It's on his own sworn financial disclosure.
```

### Post 2 (receipt)

```
Form 700, filed March 6, 2026 under penalty of perjury:

· Schedule A-1: personal stock in Sierra Technologies, Inc., FMV Over $1,000,000

· Schedule C: spouse Rachel Whetstone, communications head at Sierra Technologies, Inc., income Over $100,000

Two of three sworn lines on the filing point at the same company.
```

### Post 3 (why it matters)

```
Sierra is a private AI startup. Most recent reported valuation: $10 billion.

What a California governor actually does with AI:

· signs or vetoes AI safety bills the legislature passes
· appoints the people who write and enforce the rules
· decides what AI software state agencies buy
```

### Post 4 (mechanism)

```
Those decisions move costs, regulatory risk, and valuation for AI companies operating in California.

Sierra is one of those companies.
```

### Post 5 (boundary)

```
Not illegal. Not proof of wrongdoing.

It's a structural conflict on the public record. Form 700 exists so voters can see this kind of thing.
```

### Post 6 (link)

```
Full breakdown with every Schedule line, the $10B valuation citation, and Hilton's full disclosed portfolio:

thedonormap.org/hilton

Companion holdings page (every line of his Schedule A-1):
thedonormap.org/holdings-hilton-2026
```

---

## X short-form (single post · for reach · day 4 repost)

```
Steve Hilton is running to regulate AI in California while owning stock in an AI company his wife works for.

It's disclosed on his Form 700.

Not illegal. But it's exactly the kind of conflict voters are supposed to know about.

thedonormap.org/hilton
```

---

## Reddit (neutral tone · works for r/California, r/Politics, r/Sacramento, r/SanFrancisco)

### Title

```
Steve Hilton's Form 700 discloses personal stock in a $10B AI company plus spouse income from the same company
```

### Body

```
Found this in Steve Hilton's March 6, 2026 candidate Form 700 (filed under penalty of perjury).

· Schedule A-1: personal stock in Sierra Technologies, Inc. at fair market value Over $1,000,000
· Schedule C: spouse Rachel Whetstone, communications head at Sierra Technologies, Inc., income Over $100,000

Sierra is a private AI startup last reported at a $10 billion valuation.

A California governor signs AI safety bills, appoints the people who enforce them, and decides what AI software California state agencies buy. All of those decisions affect AI companies operating in the state.

Not alleging wrongdoing. Just flagging a disclosed financial conflict that's on the public record. That's what Form 700 is for.

Full breakdown with sources: thedonormap.org/hilton
Holdings page (every Schedule A-1 line): thedonormap.org/holdings-hilton-2026
```

---

## Pushback responses (keep on hand · stay on-message)

### "Every rich candidate has investments."

```
True. Form 700 makes them disclose those investments so voters can evaluate conflicts. That's the system working as designed. The question isn't whether he has investments. It's whether voters get to weigh a structural conflict in an industry the office regulates.
```

### "You're implying corruption."

```
No. The post says explicitly: not illegal, not proof of wrongdoing. It's a disclosed financial conflict in an industry the governor's office makes binding decisions about. That's a legitimate thing for voters to factor in.
```

### "This is normal."

```
Disclosure is normal. Owning stock is normal. A candidate who personally owns equity in a private company in an industry the office directly regulates, while his spouse draws six-figure income from that same company, is the specific kind of structural conflict Form 700 was designed to surface.
```

---

## Suggested cadence

| Day | Surface | Asset |
|---|---|---|
| Mon (today) | X thread (pin) + Reddit | thread above + Reddit post |
| Mon evening | Facebook groups | master share card caption (`may4-hilton-share` in memes-catalog) |
| Tue | X | receipt-stack image post (`may4-hilton-meme-receipt-stack`) |
| Wed | X | regulate-own-stock punchline image (`may4-hilton-meme-regulate-own-stock`) |
| Thu | X | short-form repost |
| Fri | X | engage replies, quote-tweet good-faith pushback |

---

## Source-of-truth references

- Beat: `content/hilton/index.html`
- Companion holdings page: `content/holdings-hilton-2026/index.html`
- Image-share captions: `ops/src/lib/memes-catalog.ts` (entries `may4-hilton-*`)
- Form 700 ADR-0030 verification log: `data/code-audit-fetches.jsonl` (entry `caf_e3937fe26f4b`)
- OG renderer: `scripts/render-og-images.cjs` (typography cards) + `scripts/render-hilton-diagram-og.cjs` (the household → Sierra diagram, currently used for `/hilton`)

---

## What's intentionally NOT in this kit

- **No AI attribution.** Per `feedback_no_ai_attribution_in_published.md` no post credits Perplexity, ChatGPT, or any AI tool. Sources are direct primary-source URLs only.
- **No corruption framing.** "Conflict" not "corruption." "Structural" not "shady." The boundary line ("not illegal, not proof of wrongdoing") is in every long-form variant.
- **No OpenAI overclaim.** The Bret Taylor / OpenAI link is a shared-leadership note, not an ownership tie. It stays as flavor on the diagram and as a footnote in the body, never in the lede.
- **No Fox News framing in lead.** Fox income is one of three Schedule C lines. It's secondary to Sierra and stays that way.
