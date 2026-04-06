# Handoff Prompt: Donor Map Vault Continuation

## Context

You are working on the **Donor Map Database**, an Obsidian vault tracking political donor-to-policy relationships with a class-analysis lens. The vault owner is David.

**Vault location:** `C:\Users\third\Documents\Obsidian Vaults\topics`
**Dossier source (if needed):** `C:\Users\third\Downloads\obama-policy-dossiers.md` (2,124 lines, 18 policy domains)

Request directory access to both folders before doing any work.

---

## What Was Completed (Prior Sessions)

### Obama Dossier Merge (manual, done)
- **Housing / HAMP**: `The HAMP Betrayal - Foaming the Runway While 9 Million Homes Were Lost.md` (new build, 224 lines)
- **Foreign Policy / Drones + Defense**: `The Drone Presidency - Seven Countries Bombed and the Peace Prize Paradox.md` (new build, merged dossier lines 668-797 + 1551-1689)
- Master profile updated with both wikilinks, issues expanded

### Infrastructure / Methodology Work (done)
- 13 dead URL replacements across 4 Obama sub-notes (Bank Bailout, Silicon Valley, Post-Presidency, ACA)
- Pipeline Reports Integration Protocol written into `Vault Maintenance/API Pipeline.md`
- Dead-URL pre-check step (Step 1b) added to `Vault Maintenance/Quality Standards.md`
- Pipeline pointer added to `Vault Maintenance/Research Methodology and Data Sources.md`

---

## What Is Scheduled (DO NOT DUPLICATE)

15 one-time scheduled tasks are running tonight (April 5-6, 2026) to complete the Obama dossier merge. Each builds or refreshes one domain. These are handled. Do not rebuild them.

**New builds scheduled:**
1. `obama-education` (Race to the Top, dossier lines 1199-1314) - ALREADY RAN
2. `obama-climate` (Climate/Environment, lines 362-457)
3. `obama-auto-bailout` (Auto Bailout, lines 255-361)
4. `obama-labor` (Labor, lines 458-554)
5. `obama-trade-tpp` (Trade/TPP, lines 555-667)
6. `obama-judicial` (Judicial, lines 798-884)
7. `obama-civil-rights` (Civil Rights, lines 1116-1198)
8. `obama-pharmaceutical` (Pharmaceutical, lines 1690-1787)
9. `obama-infrastructure` (Infrastructure, lines 1788-1910)

**Refreshes of existing notes scheduled:**
10. `obama-aca-refresh` (ACA, lines 8-123)
11. `obama-dodd-frank-refresh` (Financial Crisis + Wall Street Regulation, lines 124-254 + 1313-1444)
12. `obama-daca-refresh` (Immigration/DACA, lines 885-1006)
13. `obama-deportation-refresh` (Immigration/Deportation, lines 885-1006)
14. `obama-silicon-valley-refresh` (Surveillance + Tech, lines 1007-1115 + 1445-1550)
15. `obama-post-presidency-refresh` (Cross-Domain Summary, lines 2101+)

---

## What You Should Do

### Priority 1: QA the Scheduled Task Outputs
Once the scheduled tasks have completed, audit their output:
- Read each new/refreshed sub-note
- Grep for em-dashes (must be zero)
- Verify YAML frontmatter is complete (title, type, content-readiness, last-updated, source-tier, parent, policy-domain, related)
- Verify wikilinks use full-filename format with aliases
- Verify callouts use only `> [!money]`, `> [!contradiction]`, `> [!quote]`
- Verify source citations use `[Source: outlet - Tier X]` format
- Verify the master profile `_Barack Obama Master Profile.md` has all new wikilinks in `related:` and all new domains in `issues:`
- Check that Pipeline Intel appendices are present with FEC data
- Check that named patterns are tagged where applicable
- Flag any notes that need manual correction

### Priority 2: Vault-Wide Work
With the Obama dossier merge handled, vault priorities include:

**Active daily state-engine tasks (running, do not recreate):**
- `state-structuring` (6 AM daily, YAML/wikilinks/headers audit)
- `state-node-build` (9 AM daily, profile expansion)
- `state-story` (12 PM daily, story discovery + weekly roundup)
- `state-validate` (3 PM daily, connection mapping + source verification)

**Disabled legacy tasks (available to re-enable if needed):**
- `url-verification`, `profile-builder`, `url-fix-broken`, `weekly-roundup-compiler`, `publish-audit`, `crossover-analysis`, `media-profile-builder`, `think-tank-builder`, `lobbying-firm-builder`, `election-cycle-updater`, `connection-mapper`, `profile-freshness-checker`

**Vault sections beyond Obama:**
- Other politician profiles across `Politicians/Democrats/`, `Politicians/Republicans/`, `Politicians/Independent/`, `Politicians/SCOTUS/`
- `Donors & Power Networks/` (donor nodes, industry blocs)
- Think tanks, lobbying firms, media profiles
- Events and races

---

## Vault Rules (MANDATORY, every session)

Before writing ANY content, read these governance docs:
- `Vault Maintenance/Quality Standards.md` (the constitution)
- `Vault Maintenance/Research Methodology and Data Sources.md`
- `Vault Maintenance/API Pipeline.md`
- The profile-builder skill at `.claude/skills/profile-builder/SKILL.md`

### Formatting Rules
- **NO EM-DASHES EVER.** Use colons, commas, parentheses, or "to" instead of the em-dash character.
- Only H3 headers (`###`), never H1 or H2
- Full-filename wikilinks with aliases: `[[Full Filename|display text]]`
- Custom callouts only: `> [!money]`, `> [!contradiction]`, `> [!quote]`
- Source tiers: Tier 1 (gov/API), Tier 2 (major journalism), Tier 3 (secondary), Tier 4 (partisan)
- Inline citations: `[Source: outlet name - Tier X]`
- YAML frontmatter required on every note

### Analytical Framework
- Punchy first-person David voice with class-analysis lens
- Donors control politicians, not the other way around
- 9 named patterns to tag: Donor-Class Override, Both-Sides Illusion, Two-Audience Problem, Villain Framing, Genuine Win + Structural Limit, Pilot Program, Revolving Door, Self-Funding as Independence, Dark Money Symmetry
- Every sub-note includes: donor-to-policy timeline table, policy contradictions table, Sources section, Pipeline Intel appendix with FEC data

### Source Protocol
- API-first (FEC, Congress.gov, Senate LDA, USASpending) before Chrome browsing
- Pre-check all URLs against `Vault Maintenance/Pipeline Reports/url-check.md` before citing
- Dead-URL pre-check (Step 1b in Quality Standards) is mandatory before drafting citations
- Chrome browser load-test any URL not in the pipeline reports

---

## Skills Available
- `profile-builder`: Builds politician profiles and sub-notes to vault spec
- `donor-research`: Conducts donor research using OpenSecrets, FEC, FPPC, FollowTheMoney
- `vault-audit`: Audits vault for formatting compliance, broken links, source verification
- `url-fixer`: Finds and fixes broken source URLs
- `skill-creator`: Creates/modifies skills
- Document skills: `docx`, `xlsx`, `pptx`, `pdf`
