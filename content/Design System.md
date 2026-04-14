---
title: Design System
type: system
last-updated: 2026-04-09
---

# The Donor Map Design System

Code Claude follows these rules for all visual and UI decisions. This is the single source of truth for design.

---

## Core Identity

The Donor Map looks like a leaked file, not a government website. Raw, confrontational, intentionally imperfect. The design says: this information is dangerous, and we're showing it anyway.

**Design philosophy:** Brutalist art-direction. High contrast. Intentional disruption. Data presented with editorial conviction, not sterile neutrality.

---

## Light/Dark Hybrid Strategy

The site uses BOTH light and dark modes depending on context. This is not a user toggle. It is a design decision per area.

### Light mode areas (cream/white background):
- Landing page hero and content sections
- Profile body text and editorial content
- Story/investigation pages (long-form reading)
- Index/listing pages (politician grid, donor grid)
- Split cards "What they say" column
- State lookup section

### Dark mode areas (black background):
- Top navigation bar
- Left sidebar navigation
- Network graph / connection board
- Receipt/ROI comparison sections
- Verdict bars in split cards
- Interactive tools (Power Rankings, Issue Explorer, graphs)
- Footer
- Mobile bottom nav

### Rule: Dark where data is visual. Light where text is read.
If someone is reading paragraphs, it's light. If someone is scanning a graph, chart, or dense data visualization, it's dark. When in doubt, ask: "Is the user reading or scanning?"

---

## Color Palette

### Backgrounds
| Token | Value | Use |
|---|---|---|
| `--white` | `#f5f0eb` | Primary light background. Warm cream, easier on eyes than pure white. Readability first. May adjust toward `#fff` if testing shows better results. |
| `--cream` | `#ece6dd` | Alternate sections, card interiors, table row striping |
| `--black` | `#0a0a0a` | Dark mode areas (nav, sidebar, graphs, visualizations) |
| `--dark` | `#111` | Secondary dark elements |

**Note:** Cream vs pure white is not finalized. Priority is readability for long-form profile content. Test both during implementation and pick whichever reads better at 1,500 words.

### Text
| Token | Value | Use |
|---|---|---|
| `--black` | `#0a0a0a` | Primary body text, headlines |
| `--grey` | `#999` | Secondary text, labels, meta |
| `--muted` | `#555` | Dimmed text, descriptive copy |
| `--light-grey` | `#ddd` | Borders, dividers, table lines |

### Accents
| Token | Value | Use |
|---|---|---|
| `--yellow` | `#fbbf24` | Primary UI accent: buttons, highlights, callouts, badges |
| `--red` | `#e63946` | Republican party color ONLY |
| `--blue` | `#1d4ed8` | Democrat party color ONLY |
| `--green` | `#16a34a` | Verified status, positive indicators |
| `--danger` | `#dc2626` | Danger, warnings, broken links, negative outcomes (darker red, distinct from party red) |

### Split Card Colors
The "What they say vs Who pays them" pattern uses specific colors:
- "WHAT THEY SAY" label: `--red` (they're lying/contradicting)
- "VS." divider: `--black`
- "WHO PAYS THEM" label: `--blue` (follow the money)
- Verdict bar: black background, yellow text

### Rules
- Yellow is the ONLY UI accent color. Do not introduce new accent colors.
- Red and blue are for party affiliation. `--danger` is for negative UI states (separate from party red).
- Green is ONLY for verified/positive status indicators.
- No gradients. No shadows. No glows. Flat color only.
- Background alternation: white sections alternate with cream or black sections. Never two white sections in a row without visual break.

---

## Typography

### Font Stack
| Role | Font | Weight | Use |
|---|---|---|---|
| Headlines | `Inter` (system sans fallback) | 900 | Page titles, section headers, stat numbers |
| Editorial/Quotes | `Instrument Serif` (Georgia fallback) | 400 italic | Pull quotes, editorial asides, politician quotes in split cards |
| Data/Labels | `Space Mono` | 400, 700 | Navigation, meta labels, monospace data, ticker values, donor amounts, verdict bars |
| Body | `Inter` (system sans fallback) | 400 | Paragraph text, descriptions, profile body content |

### Font usage clarified
- When a politician is being QUOTED ("I will fight for.."), use Instrument Serif italic. This is the editorial voice.
- When raw DATA is shown next to the quote (PhRMA $415K, Pfizer $198K), use Space Mono. This is the evidence.
- The contrast between serif quotes and monospace data IS the design. It visually separates rhetoric from receipts.

### Rules
- Headlines: minimum 36px, maximum 140px. Always `font-weight: 900`. Negative letter-spacing (`-2px` to `-6px` based on size).
- Section tags: Space Mono, 10-11px, uppercase, letter-spacing 2-3px, colored (yellow or red).
- Body text: 14-16px, line-height 1.5-1.6, color `--black` or `--muted`.
- No font size below 10px.
- No text color lighter than `#999` on light backgrounds, no text darker than `#888` on dark backgrounds.

### Highlight Treatment
Bold key phrases use a yellow highlight underline: `background: linear-gradient(to bottom, transparent 60%, var(--yellow) 60%)`. Use sparingly, maximum 1 per section.

### Yellow Block Highlight
For hero/headline emphasis, use a rotated yellow background block behind text: `::before` pseudo-element with `background: var(--yellow)`, `transform: rotate(-0.5deg)`. Use only on landing page hero.

---

## Layout

### Grid
- Max content width: `1000px` centered
- Page padding: `40px` horizontal (20px on mobile)
- Section padding: `100px` vertical (80px on mobile)
- No rounded corners anywhere. `border-radius: 0` on everything.

### Borders
- Section dividers: `2px solid var(--black)` between major sections
- Card borders: `2px solid var(--black)` or `2px solid var(--light-grey)`
- Internal dividers: `1px solid var(--light-grey)` or `1px solid var(--black)`
- Hover states: border transitions to `var(--yellow)` or `var(--black)`
- No border-radius. Ever. Zero.

### Navigation
- Top bar: fixed, full-width, `1px solid var(--black)` bottom border, Space Mono, 11px uppercase
- Site name left, nav links right
- The dollar sign in "The Donor Map$" is always colored `var(--red)`

---

## Components

### Buttons
- Primary: `background: var(--black)`, `color: var(--white)`, uppercase, `letter-spacing: 2px`, `padding: 16px 40px`. Hover: `background: var(--red)`.
- Secondary: text link with `border-bottom: 1px solid var(--grey)`, Space Mono, uppercase. Hover: border turns black.
- No rounded buttons. No pill shapes. No outlines except secondary.

### Cards
- White or cream background
- `border: 2px solid var(--black)` or `var(--light-grey)`
- No shadow, no border-radius
- Hover: border-color transitions to yellow or black
- Grid cards use shared borders (no gap between cells, borders merge)

### Tables
- Alternate row shading: white / cream
- Header row: `background: var(--black)`, `color: var(--white)`, Space Mono uppercase
- Cell borders: `1px solid var(--light-grey)`
- Numeric columns: right-aligned, Space Mono
- Dollar amounts: always `var(--red)` or `var(--yellow)` depending on context

### Split Cards (Says vs Pays)
- Two-column grid with black border
- Left: "What they say", editorial quote, serif italic
- Right: "Who pays them", donor list, cream background
- Bottom verdict bar: black background, yellow text, Space Mono

### Stat Numbers
- Large stats (hero, receipt): `font-weight: 900`, 48-120px, tight letter-spacing
- Inline stats: Space Mono, 28-36px, bold
- Always paired with a label underneath: Space Mono, 9-10px, uppercase, grey

### Evidence/Verification
- Verified badge: green dot + "VERIFIED" in Space Mono
- Source count: displayed as monospace number
- Readiness tiers keep same logic, just restyled for light background

---

## Animations & Interactions

### Scroll Reveals
- Elements fade in and translate up (16-20px) on intersection
- Transition: `all 0.5s ease`
- Threshold: 0.15-0.2
- Use `IntersectionObserver` in `afterDOMLoaded`

### Ticker
- Count-up animation with cubic ease-out
- Duration: 2-3 seconds
- Triggered on page load with 1.4s delay

### Connection Board
- Nodes appear one by one (180-200ms stagger)
- Lines draw in after all nodes visible (120ms stagger per line)
- Dashed stroke: `stroke-dasharray: 4 3`

### General
- Hover transitions: `0.15s` duration
- No bounce, no elastic, no spring physics
- No parallax scrolling
- No decorative animation. Every animation reveals information or draws attention to data.

### Animation budget by page type
- **Landing page:** Full animation (ticker, scroll reveals, connection board, split card reveals). This is the showpiece.
- **Profile pages:** Light animation. Scroll reveals on major sections (evidence panel, donor table). No ticker, no connection board animation.
- **Interactive pages:** Animation where it serves the data (graph node transitions, sort animations). Not decorative.
- **Index/listing pages:** Minimal. Card hover states only.

Rule: if you're debating whether to add an animation, don't. Only animate what earns it.

---

## Dark Sections

Some sections use inverted (dark) backgrounds for contrast:
- Receipt/ROI comparisons
- Verdict bars in split cards
- Navigation elements

Rules for dark sections:
- Background: `var(--black)` (`#0a0a0a`)
- Text: `var(--white)` for primary, `#888` for secondary
- Accents: yellow stays yellow, red stays red
- Borders: `#333` for internal, `var(--yellow)` for emphasis

---

## What NOT to Do

1. **No rounded corners**, ever, on anything
2. **No shadows**, box-shadow, text-shadow, drop-shadow: none
3. **No gradients**, flat colors only
4. **No decorative icons**, if it's not data, it doesn't need an icon
5. **No stock photography**, no hero images, no background photos
6. **No blue for UI**, blue is Democrat party color only, never for buttons or links on light bg
7. **No light grey text on white**, minimum contrast is `#999` on `#f5f0eb`
8. **No more than 3 accent colors** visible on any single page
9. **No em dashes** in content (editorial rule, not design, but enforced everywhere)
10. **No "designed" feel**, if it looks polished, make it rawer

---

## Responsive Breakpoints

- Desktop: 1000px+ content width (primary target)
- Tablet: 768px breakpoint, single column, reduced padding
- Mobile: 480px, stacked everything, 20px padding, reduced font sizes

**Mobile is secondary but must work.** Desktop is the priority. Mobile should be functional and readable, not feature-identical. Some features (network graph, full data tables) may be simplified or hidden on mobile.

### Mobile-specific rules
- Hero title: `clamp(48px, 8vw, 96px)`
- Two-column grids → single column
- Split cards → stacked (says on top, pays below)
- State grid: 5 columns instead of 10
- Touch targets: minimum 44px height
- Network graph: simplified or link to full-screen view
- Data tables: horizontal scroll with sticky first column, or card layout

---

## File Naming

Design-related files:
- `quartz/styles/custom.scss`, all style overrides (single file, no splitting)
- `quartz/components/*.tsx`, component-level styles in `css` string property
- `prototype/`, design prototypes (not deployed, reference only)

---

---

## State Lookup Feature

The "Who owns your representative?" section is a committed feature, not a placeholder. Implementation requires:
- Serialize politician frontmatter (name, party, state, top-donors) to client-side JSON at Quartz build time
- State grid triggers lookup against this data
- Shows senators + top donors for selected state
- Links to full profile pages
- This replaces or complements the existing Who Funds Your Rep interactive page

Data source: FEC frontmatter already on politician profiles. Build-time plugin or data pass needed.

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-09 | Hybrid light/dark, not full light or full dark | Dark where data is visual, light where text is read |
| 2026-04-09 | Separate `--danger` from `--red` party color | Red is Republican. Danger/warnings need distinct color |
| 2026-04-09 | Split card labels: red "What they say", blue "Who pays them" | Red = rhetoric/lies, blue = follow the money |
| 2026-04-09 | Serif italic for quotes, monospace for data | Visual contrast = rhetoric vs receipts |
| 2026-04-09 | Cream vs white TBD, test during implementation | Readability is priority, not aesthetic preference |
| 2026-04-09 | Landing page gets full animation, profiles get light animation | Animation earns its place, not decorative |
| 2026-04-09 | Mobile secondary but functional | Desktop-first, mobile must work but not match features |
| 2026-04-09 | State lookup is committed feature, needs build-time data | Personal hook is essential for engagement |

---

*Last updated: 2026-04-09 by Code Claude*
*Approved by: David*
