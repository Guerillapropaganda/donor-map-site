# Handoff Prompt — Obama Policy Dossier Merge

Paste everything below into a new chat to resume.

---

## Task

Merge the Obama policy dossier (18 domains, 2124 lines) into the Donor Map vault, creating or refreshing sub-notes under the Barack Obama master profile. Work one domain at a time, stopping to hand off when context runs low.

## Files

**Dossier source (input):**
`/sessions/focused-funny-archimedes/mnt/Downloads/obama-policy-dossiers.md`

**Vault target (output):**
`/sessions/focused-funny-archimedes/mnt/topics/Politicians/Democrats/Presidential/Barack Obama/`

**Existing Obama sub-notes (12):**
- `_Barack Obama Master Profile.md` (32KB, 239 lines)
- `ACA and the Insurance Industry Negotiation.md`
- `The ACA - Insurance Industry Capture Disguised as Healthcare Reform.md`
- `Dodd-Frank and the Wall Street Bailout.md`
- `The Bank Bailout and the Prosecution That Never Came.md`
- `DACA and the Limits of Executive Action.md`
- `The Deportation Machine - Obama to Biden and the Apparatus Trump Inherited.md`
- `The Silicon Valley Presidency - Google Surveillance and Market Dominance.md`
- `Barack Obama Donor Network - The Full Map.md`
- `Barack Obama Executive Orders Timeline.md`
- `Term 1 vs Term 2 - Obama Comparison.md`
- `The Post-Presidency Capitalization - From Hope and Change to Martha's Vineyard.md`

## Dossier Domains (18 total)

Already has partial vault coverage (refresh existing notes with dossier depth):
1. Healthcare (ACA) — merge into existing 2 ACA notes
2. Financial Crisis Response — merge into Bank Bailout note
9. Immigration — merge into DACA + Deportation Machine notes
10. Surveillance — partially in Silicon Valley note
13. Wall Street Regulation — merge into Dodd-Frank note
14. Tech/Silicon Valley — merge into Silicon Valley note
16. Pharmaceutical — merge into ACA notes

No vault coverage yet (create new sub-notes):
3. Auto Bailout
4. Climate/Environment
5. Labor
6. Trade (TPP)
7. Foreign Policy (drones, Libya, Syria, Iran)
8. Judicial (Garland, appointments)
11. Civil Rights
12. Education (Race to the Top, charter schools)
15. Defense (drone program, MIC)
17. Infrastructure
18. Housing (HAMP, foreclosure crisis)

## Vault Rules (Editorial — STRICT)

- **No em-dashes, ever.** Use periods, commas, or parentheses.
- Punchy first-person David voice. No hedging, no both-sidesing.
- Class analysis lens. Name the donors. Follow the money to policy.
- Only `###` H3 headers inside notes.
- Full-filename wikilinks with aliases: `[[_Barack Obama Master Profile|Obama]]`
- Custom callouts: `> [!money]`, `> [!contradiction]`, `> [!quote]`
- Source tiers: 1 (gov/FEC/APIs) / 2 (major journalism) / 3 (secondary) / 4 (partisan)
- Every claim cited with `[Source: outlet — Tier X]` or inline markdown link
- YAML frontmatter required: title, type, content-readiness, last-updated, source-tier, parent, politician, issues, sector

## The 9 Named Patterns (tag material explicitly)

1. Donor-Class Override
2. Both-Sides Illusion
3. Two-Audience Problem
4. Villain Framing
5. Genuine Win + Structural Limit
6. Pilot Program
7. Revolving Door
8. Self-Funding as Independence
9. Dark Money Symmetry

## Approach

1. Start with highest-leverage domain (suggest: **Foreign Policy — drones** OR **Housing — HAMP foreclosure betrayal** OR **Education — charter school capture** since they have no vault coverage and hit the Donor-Class Override pattern hard).
2. Read the dossier section for that domain (use Bash `sed -n` with line ranges from grep below).
3. Create new sub-note following vault spec.
4. Link back to master profile and related donor nodes.
5. Update master profile to reference new sub-note.
6. Move to next domain.

## Dossier Line Numbers (for targeted reads)

```
1.  Healthcare (ACA)          lines 8-123
2.  Financial Crisis          lines 124-254
3.  Auto Bailout              lines 255-361
4.  Climate/Environment       lines 362-457
5.  Labor                     lines 458-554
6.  Trade                     lines 555-667
7.  Foreign Policy            lines 668-797
8.  Judicial                  lines 798-884
9.  Immigration               lines 885-1006
10. Surveillance              lines 1007-1115
11. Civil Rights              lines 1116-1198
12. Education                 lines 1199-1314
13. Wall Street Regulation    lines 1315-1444
14. Tech/Silicon Valley       lines 1445-1550
15. Defense                   lines 1551-1689
16. Pharmaceutical            lines 1690-1787
17. Infrastructure            lines 1788-1910
18. Housing                   lines 1911-2100
Cross-Domain Summary          lines 2101-2124
```

## Prior Session Context (already completed, do not redo)

All 8 donor vault nodes refreshed with Tier-A dossier research:
- Elon Musk, Timothy Mellon, Kenneth Griffin, Jeffrey Yass, Peter Thiel, Hansjörg Wyss, AIPAC, Democracy PAC

## First Action in New Chat

Ask David which domain to start with. Recommend starting with one of:
- **Housing/HAMP** — clearest Donor-Class Override story (Geithner's "foam the runway" quote, 9M foreclosures, banks saved not homeowners)
- **Foreign Policy/Drones** — most underdocumented in vault, highest editorial voltage
- **Education/Race to the Top** — Arne Duncan, Gates Foundation, charter capture, teacher attacks from a Democrat

Then work one-by-one until context runs low, then create another handoff prompt.

## Skills Available

- `profile-builder` — vault spec for creating new sub-notes
- `donor-research` — if additional donor lookups needed
- `vault-audit` — for QA pass at end
- `url-fixer` — if sources need Chrome verification
