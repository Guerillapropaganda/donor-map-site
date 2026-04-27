"use client"

import Link from "next/link"
import { useState } from "react"
import { PageHeader } from "@/components/PageHeader"

/**
 * Scripts documentation page — plain-English explanations of every
 * automation script in the scripts/ directory. This is David's
 * reference for "what do I have running, what does it do, when do I
 * run it." Less reliance on asking Claude "what does X do."
 *
 * Organized by purpose, not alphabetically. Each entry explains:
 *   - What the script does in plain English
 *   - When to run it (cron / on-demand / one-shot)
 *   - What command to run
 *   - Where its output goes
 *   - What the result looks like
 */

interface ScriptEntry {
  name: string
  command: string
  purpose: string
  plainEnglish: string
  output: string
  when:
    | "daily"
    | "weekly"
    | "on-demand"
    | "one-shot"
    | "hourly"
    | "every-2-hours"
    | "when-needed"
  danger: "safe" | "writes-profiles" | "destructive"
  category:
    | "health-check"
    | "audit"
    | "cleanup"
    | "research"
    | "pipeline"
    | "reporting"
    | "intelligence"
    | "gate"
}

const SCRIPTS: ScriptEntry[] = [
  // ─── REPORTING / DAILY BRIEFINGS ───────────────────────────────
  {
    name: "Morning Briefing",
    command: "node scripts/morning-briefing.cjs",
    purpose: "Overnight summary for your coffee.",
    plainEnglish:
      "Generates a markdown report summarizing everything that changed in the vault since yesterday. Sign-off queue, S-tier candidates, super-connectors, anomalies, both-sides conflicts, stale profiles, recent commits. Read it over coffee and you'll know where to start your day.",
    output: "content/Admin Notes/daily-briefing-YYYY-MM-DD.md",
    when: "daily",
    danger: "safe",
    category: "reporting",
  },
  {
    name: "S-Tier Candidate Scanner",
    command: "node scripts/s-tier-candidate-scanner.cjs",
    purpose: "Find the best S-tier candidates in the vault.",
    plainEnglish:
      "Scores every verified (A+) profile on how ready it is for S-tier promotion. Uses 8 heuristics: contradiction count, donation-to-policy timeline, dark money trace, revolving door documentation, source diversity, cross-vault triangulation, central-thesis written, investigation grade. Outputs a ranked list so you know which profiles to write an angle: field for next.",
    output: "content/Admin Notes/s-tier-candidates.md",
    when: "on-demand",
    danger: "safe",
    category: "research",
  },
  {
    name: "Sign-Off Reminder",
    command: "node scripts/sign-off-reminder.cjs",
    purpose: "Nag yourself when the A+ queue is piling up.",
    plainEnglish:
      "Checks how many profiles are waiting for your manual editorial sign-off. If >50 profiles OR the oldest has been waiting >7 days, writes an urgent reminder note. Intended as a daily cron but safe to run on-demand.",
    output: "content/Admin Notes/signoff-reminder-YYYY-MM-DD.md (only when queue is over threshold)",
    when: "daily",
    danger: "safe",
    category: "reporting",
  },

  // ─── AUDIT / HEALTH CHECKS ─────────────────────────────────────
  {
    name: "YAML Sanity Scan",
    command: "node scripts/yaml-sanity-scan.cjs",
    purpose: "Make sure every profile's frontmatter parses cleanly.",
    plainEnglish:
      "Walks every .md file in the vault and tries to parse its YAML frontmatter. If any file is broken (like when a Wikipedia extract contains unescaped quotes), this script catches it BEFORE the Quartz deploy fails. Should always return 0 broken. Also runs automatically as part of the husky pre-commit hook — broken YAML blocks the commit.",
    output: "Console only — exits 1 if any broken files found",
    when: "on-demand",
    danger: "safe",
    category: "health-check",
  },
  {
    name: "Duplicate Bioguide Sentinel",
    command: "node scripts/duplicate-bioguide-sentinel.cjs",
    purpose: "Catch wrong-bioguide contamination waves.",
    plainEnglish:
      "Scans the vault for any bioguide-id appearing on more than one profile. Bioguides are unique per person (it's a government ID) — any duplicate is definitionally wrong. On 2026-04-11 we caught 22 profiles sharing wrong IDs (19 Castro + 3 B001296) and this script exists to catch the next wave within an hour of it landing. Also runs automatically as part of the husky pre-commit hook — any duplicate blocks the commit.",
    output: "Console + content/Admin Notes/bioguide-contamination-alert.md (on failure)",
    when: "hourly",
    danger: "safe",
    category: "health-check",
  },
  {
    name: "Pipeline Janitor",
    command: "node scripts/pipeline-janitor.cjs --tier=a-plus --cohort --write",
    purpose: "The big nightly audit. Stamps A+ passes + cohort metrics.",
    plainEnglish:
      "Audits every ready/verified profile for missing pipeline data, demotes zombies to draft, stamps audit-a-plus-passed on profiles that clear all A+ checks, computes cross-vault-triangulation-count and anomaly-flags across the whole vault. This is the core quality-control engine. Runs in multiple modes: --zombies-only (safest), --tier=a-plus (adds A+ audit), --cohort (adds Tier D uniqueness metrics), --write (applies changes).",
    output: "content/Admin Notes/pipeline-janitor-report.md + frontmatter stamps",
    when: "daily",
    danger: "writes-profiles",
    category: "audit",
  },
  {
    name: "Featured-Date Enforcer",
    command: "node scripts/featured-date-enforcer.cjs",
    purpose: "Find profiles featured on the homepage that shouldn't be.",
    plainEnglish:
      "Audits every profile with a featured-date set and flags any that are below verified (A+). Currently diagnostic — the Quartz homepage still renders by featured-date regardless of tier. Once the A+ pool is large enough, this becomes the enforcement gate.",
    output: "content/Admin Notes/featured-date-audit.md",
    when: "weekly",
    danger: "safe",
    category: "audit",
  },

  // ─── RESEARCH / INTELLIGENCE ───────────────────────────────────
  {
    name: "Connection Suggester",
    command: "node scripts/connection-suggester.cjs",
    purpose: "Propose missing relationships you haven't mapped yet.",
    plainEnglish:
      "Cross-references committee assignments against donor sectors. If Senator X is on Banking Committee and Bank Y is in the vault as a donor, but no connection exists between them, the script suggests it for Research Claude to investigate. Pure suggestion engine — every hit needs manual review (not every Banking senator took money from every bank), but it surfaces candidates you'd otherwise miss.",
    output: "content/Admin Notes/connection-suggestions.md",
    when: "on-demand",
    danger: "safe",
    category: "research",
  },
  {
    name: "Relationship Bidirectional Checker",
    command: "node scripts/relationship-bidirectional.cjs",
    purpose: "Find half-broken connections (A→B exists, B→A doesn't).",
    plainEnglish:
      "Every relationship in the vault should be bidirectional. If Profile A lists B in its related: field, B should reference A somewhere. Orphan edges are usually data-quality bugs from a one-sided edit. This script surfaces them for Research Claude to fix. Currently finds ~4500 orphan pairs — a big cleanup opportunity but low urgency.",
    output: "content/Admin Notes/relationship-bidirectional-report.md",
    when: "on-demand",
    danger: "safe",
    category: "research",
  },
  {
    name: "URL Staleness Report",
    command: "node scripts/url-staleness.cjs",
    purpose: "Find old profiles that probably have link-rotted URLs.",
    plainEnglish:
      "Surfaces profiles that haven't been updated in 180+ days but still contain sourced URLs. Link rot is progressive — anything older than ~6 months should be re-checked before it's used in a verified profile. This script does NOT hit URLs to check if they're live (that's your job, per Vault Rules) — it just tells you which profiles to look at.",
    output: "content/Admin Notes/url-staleness-report.md",
    when: "on-demand",
    danger: "safe",
    category: "research",
  },
  {
    name: "Editorial Priority",
    command: "node scripts/editorial-priority.cjs",
    purpose: "Rank profiles by how close they are to A+ verification.",
    plainEnglish:
      "Scores profiles by readiness proximity — which ones are closest to verified and which ones need the most work. Helps you decide what to work on next if you want to maximize the verified-profile count.",
    output: "content/Admin Notes/editorial-priority.md",
    when: "on-demand",
    danger: "safe",
    category: "research",
  },

  // ─── CLEANUP / MAINTENANCE ─────────────────────────────────────
  {
    name: "Story Grade Auto-Updater",
    command: "node scripts/story-grade-auto-updater.cjs --write",
    purpose: "Keep story-grade fields in sync with URL count.",
    plainEnglish:
      "Computes the correct story-grade (story / report / investigation) based on Vault Rules § 2: story = 1-4 URLs, report = 5-9, investigation = 10+ AND 3+ Tier 1 markers. Walks every profile, updates any whose computed grade differs from the current value. Idempotent — safe to re-run.",
    output: "Writes to profile frontmatter",
    when: "weekly",
    danger: "writes-profiles",
    category: "cleanup",
  },
  {
    name: "Staleness Decay",
    command: "node scripts/staleness-decay.cjs --write",
    purpose: "Demote verified profiles that haven't been re-enriched.",
    plainEnglish:
      "Per Vault Rules § 2c, verified (A+) profiles must be re-enriched within 90 days. This script walks the vault, finds profiles past that window, and demotes them back to ready. Demotion isn't failure — it's the system being honest about data freshness.",
    output: "Writes to profile frontmatter + content/Admin Notes/staleness-decay-report.md",
    when: "weekly",
    danger: "writes-profiles",
    category: "cleanup",
  },
  {
    name: "Reclassify Readiness",
    command: "node scripts/reclassify-readiness.cjs --write",
    purpose: "Recompute readiness tier based on content quality.",
    plainEnglish:
      "Scans every profile and assigns the correct readiness tier based on actual content quality, source diversity, and enrichment state. Used after major Vault Rules changes to bring the whole vault in line with new standards.",
    output: "Writes to profile frontmatter + content/Admin Notes/reclassify-report.md",
    when: "on-demand",
    danger: "writes-profiles",
    category: "cleanup",
  },

  // ─── ONE-SHOT EMERGENCY TOOLS ──────────────────────────────────
  {
    name: "Fix Bioguide Contamination",
    command: "node scripts/fix-bioguide-contamination.cjs --write",
    purpose: "Clear wrong bioguide IDs when the sentinel catches a wave.",
    plainEnglish:
      "Used when duplicate-bioguide-sentinel.cjs detects contamination. Removes wrong bioguide-id values from affected profiles, adds a known-gap entry, writes a plain-English [JANITOR] note explaining what happened. Does NOT attempt auto-fix with correct IDs — that's manual via recover-bioguide.cjs.",
    output: "Writes to profile frontmatter (clears wrong IDs only)",
    when: "when-needed",
    danger: "writes-profiles",
    category: "cleanup",
  },
  {
    name: "Recover Bioguide",
    command: 'node scripts/recover-bioguide.cjs "Jamaal Bowman" B001223',
    purpose: "Apply a verified bioguide ID to a cleared profile.",
    plainEnglish:
      "After fix-bioguide-contamination has cleared a wrong ID, use this to apply the correct one. Includes a built-in duplicate-detection check — refuses to apply a bioguide that's already in use. Supports batch mode with a JSON file mapping name → bioguide.",
    output: "Writes to profile frontmatter",
    when: "when-needed",
    danger: "writes-profiles",
    category: "cleanup",
  },

  // ─── INTELLIGENCE / ATTENTION QUEUE PRODUCERS ─────────────────
  // These scripts all contribute entries to the Attention Queue via
  // scripts/lib/attention-queue.cjs. They're serialized and auto-run by
  // scripts/attention-dispatcher.cjs. Never run directly unless debugging —
  // the dispatcher keeps them all fresh on a schedule.
  {
    name: "Attention Dispatcher (daemon)",
    command: "node scripts/attention-dispatcher.cjs --daemon",
    purpose: "Auto-runs all 5 Attention Queue producers on a schedule.",
    plainEnglish:
      "Background node-cron daemon that fires each Attention Queue producer on its own cadence (voice-drift every 30 min, hallucination-catcher hourly, missing-profile-detector every 2 hr, etc). Serialized so producers never contend for the vault. 60-sec timeout per producer. Top-level crash guards so cron callback errors never kill the daemon. Logs rotate at 1MB to .attention-dispatcher.log.1. Set HEALTHCHECKS_PING_URL env var to get an email if the daemon dies silently. Install on Windows by dropping scripts/attention-dispatcher.bat into shell:startup.",
    output: "content/Admin Notes/.attention-dispatcher.log (rotated at 1MB)",
    when: "daily",
    danger: "safe",
    category: "intelligence",
  },
  {
    name: "Attention Dispatcher (run-now)",
    command: "node scripts/attention-dispatcher.cjs --run-now",
    purpose: "Force-run every Attention Queue producer once, then exit.",
    plainEnglish:
      "Same as the daemon but runs all producers sequentially once and exits. Use this to force-refresh the Attention Queue after editing vault content — saves you running each producer by hand. About 2 seconds total across all 5 producers.",
    output: "content/Admin Notes/.attention-queue-store.json + Attention Queue.md",
    when: "on-demand",
    danger: "safe",
    category: "intelligence",
  },
  {
    name: "Voice Drift Detector",
    command: "node scripts/voice-drift-detector.cjs",
    purpose: "Flag profiles that drift from your voice baseline.",
    plainEnglish:
      "Compares every ready/verified profile against a baseline voice signature (avg sentence length, hedging frequency, passive voice, numbers density). Hard-fail rules are always enforced regardless of baseline drift: em dashes, banned AI vocabulary (delve, moreover, furthermore, tapestry, plethora, 'navigating the complexities'). Hard fails land in the Attention Queue blocking bucket; soft drift lands in deciding.",
    output: "Attention Queue (bucket: blocking for hard fails, deciding for drift)",
    when: "hourly",
    danger: "safe",
    category: "intelligence",
  },
  {
    name: "Hallucination Catcher",
    command: "node scripts/hallucination-catcher.cjs",
    purpose: "Find unsupported factual claims needing citations.",
    plainEnglish:
      "Scans every paragraph for specific factual claims (dollar amounts paired with claim verbs, percentages with contextual nouns, year-actions, multipliers). Checks whether each claim has a citation within 150 chars — inline markdown links, [^N] footnotes, or [cite] marks. Flags only claims without a nearby citation. Exempts blockquotes, auto-blocks, Sources sections, Class Analysis sections, tables, and bullet lists. Verified profiles → blocking bucket. Ready profiles → deciding bucket.",
    output: "Attention Queue (bucket: blocking/deciding, top 25 profiles by claim count)",
    when: "hourly",
    danger: "safe",
    category: "intelligence",
  },
  {
    name: "Contradiction Miner (story seeds)",
    command: "node scripts/contradiction-miner.cjs",
    purpose: "Surface story-worthy contradictions across the vault.",
    plainEnglish:
      "Cross-references donor profiles, politician profiles, and committee data to find contradictions worth writing about: same donor funds both sides of an issue, cross-party donors, issue-contradiction (donor gives to climate and fossil fuel), committee capture (donor gives to committee members overseeing their industry). Each hit becomes a standalone markdown seed file at content/Story Seeds/ that Research Claude can expand. Top 15 also go to the Attention Queue deciding bucket.",
    output: "content/Story Seeds/ + Attention Queue (deciding bucket)",
    when: "daily",
    danger: "safe",
    category: "intelligence",
  },
  {
    name: "Missing Profile Detector",
    command: "node scripts/missing-profile-detector.cjs",
    purpose: "Find entities referenced but not yet profiled.",
    plainEnglish:
      "Walks every profile body looking for `[[Wikilinks]]` to profiles that don't exist. Normalizes names (strips _, 'Master Profile' suffix, lowercases) to avoid false positives. Ranks by unique inbound reference count — the more profiles reference an entity, the higher priority it gets. Top 15 become compounding-bucket entries in the Attention Queue.",
    output: "content/Admin Notes/missing-profiles.md + Attention Queue (compounding)",
    when: "every-2-hours",
    danger: "safe",
    category: "intelligence",
  },
  {
    name: "Promotion Candidate Queue",
    command: "node scripts/promotion-candidate-queue.cjs",
    purpose: "Rank ready profiles by cheapest path to A+.",
    plainEnglish:
      "Walks every content-readiness: ready profile and scores how far it is from A+. Profiles that already have audit-a-plus-passed stamp need only David's sign-off (~2 min). Profiles missing central-thesis or story-grade need small Research Claude work (~8 min). Profiles missing pipeline data or Class Analysis are bigger effort (~20-30 min). Sorted cheapest first so you see the biggest wins per minute at the top.",
    output: "Attention Queue (deciding bucket, top 10 cheapest promotions)",
    when: "hourly",
    danger: "safe",
    category: "intelligence",
  },

  // ─── PRE-COMMIT GATES ─────────────────────────────────────────
  // These run automatically on every git commit via the husky hook in
  // .husky/pre-commit. You don't invoke them by hand. They're listed here
  // so you remember they exist and know how to override them.
  {
    name: "Self-Review Mirror",
    command: "node scripts/self-review-mirror.cjs",
    purpose: "Pre-commit gate — blocks banned language + regressions.",
    plainEnglish:
      "Reads only the NEW lines in staged .md files (via `git diff --cached`) and blocks the commit if the new content contains em dashes, banned AI vocabulary (delve, moreover, furthermore, plethora, tapestry, testament to), or defamation-prone words (fraud, corrupt, scheme, bribed) outside blockquotes on profiles without legal-review-result: pass. Also blocks regressions: verified profiles can't silently lose Tier 1 source types or the ## Class Analysis heading. Pre-existing violations are NOT flagged — only what this commit adds. Emergency bypass: ALLOW_REGRESSION=1 git commit.",
    output: "Pre-commit console only — exits 1 to block the commit",
    when: "on-demand",
    danger: "safe",
    category: "gate",
  },
  {
    name: "Attention Dispatcher (Healthchecks)",
    command: "HEALTHCHECKS_PING_URL=https://hc-ping.com/... node scripts/attention-dispatcher.cjs --daemon",
    purpose: "Enable external health monitoring of the dispatcher.",
    plainEnglish:
      "Sign up at healthchecks.io (free, 10 min), create a check with a 40-min grace period, copy its ping URL, set it as HEALTHCHECKS_PING_URL before launching the dispatcher. Every successful producer cycle pings the URL. If Healthchecks stops hearing from the dispatcher for 40+ min, it emails you. Catches the 'daemon died silently' failure mode. Leave unset to disable — dispatcher runs fine without it.",
    output: "Pings HEALTHCHECKS_PING_URL on every cycle",
    when: "daily",
    danger: "safe",
    category: "intelligence",
  },

  // ─── QUERY ENGINE BUILD / PUBLICATION READINESS ────────────────
  // Everything below here was shipped during the Phase 6 closeout +
  // pre-launch hardening + audit/polish/integration sprint cycle.
  // Most are READ-ONLY audits; a few write admin reports. The only
  // destructive one is migrate-strikethrough-sources (bulk rewrite).

  {
    name: "Status Dashboard",
    command: "node scripts/status.cjs",
    purpose: "One-glance system health across all 8 engines.",
    plainEnglish:
      "Runs in under 5 seconds. Shows record counts for all 8 canonical data stores (sources, relationships, entities, events, policies, polling, users, claims), source status distribution (live/archived/needs_review/dead/paywall/redirected/generic_orphan), class tag approval progress (pending/approved/rejected with approval rate), entity coverage by type, policy readiness by tier, test + audit health (regression tests, contract tests, data integrity audit, pre-commit sentinel count), auth + users. No writes. Safe to run anytime — this is your daily 'where is the system right now' check. Also supports --compact (one-line summary) and --json (machine-readable).",
    output: "Console only — no writes",
    when: "on-demand",
    danger: "safe",
    category: "reporting",
  },
  {
    name: "Publication Readiness Check",
    command: "node scripts/publication-readiness-check.cjs",
    purpose: "The publication gate — is this profile safe to publish?",
    plainEnglish:
      "Walks every profile in content/ and enforces 6 gates for public URL exposure (CLAUDE.md Rule 9): content-readiness: verified, no (URL NEEDED) / (UNVERIFIED) / (NEEDS REVIEW) markers in visible text, no strikethrough sources outside ## Archived section, every {{src:ID}} ref resolves to a live/archived source, every cited entity has approved class tags, ## Class Analysis section present. Supports --folder X (filter to one folder like Policies), --file path (check one file), --ready-only (show passing profiles only), --json, --verbose. Exit code 0 means all scanned profiles passed; exit 1 means at least one failed. This is the single source of truth for 'can I expose this URL publicly'.",
    output: "Console + exit code",
    when: "on-demand",
    danger: "safe",
    category: "gate",
  },
  {
    name: "Readiness Promotion Digest",
    command: "node scripts/readiness-promotion-digest.cjs --write",
    purpose: "Prep sheet for David's next manual review session.",
    plainEnglish:
      "Runs publication-readiness-check.cjs under the hood, sorts profiles by distance-to-ready (how many gates each one fails), and writes a digest organized into sections: profiles one flag-flip away (trivial promote after a human read), two-failures-away, and failure pattern summaries. Use this BEFORE each review session to know exactly which profiles are highest leverage to work on. Finding as of 2026-04-15: 19 profiles are one ready→verified flip away, 11 more are draft→verified.",
    output: "content/Admin Notes/readiness-promotion-digest.md",
    when: "on-demand",
    danger: "safe",
    category: "reporting",
  },
  {
    name: "Policy Class-Tag Gap Report",
    command: "node scripts/policy-class-tag-gap-report.cjs --write",
    purpose: "Exactly which class tags block WHICH policy pages (Rule 11).",
    plainEnglish:
      "Parses every policy page in content/Policies/ for entity citations — both [[wikilinks]] AND markdown table rows under 'Top opposition donors' headers — and cross-references against class tag approval state. Reports per-policy: which entities are approved, pending (Rule 11 blockers), no-proposal (entity exists but never through the heuristic), no-entity (wikilink doesn't resolve). Sort: approve these in order for maximum policy-unblocking per review minute. Much more targeted than the general priority queue.",
    output: "content/Admin Notes/policy-class-tag-gap-report.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Class Tag Priority Queue",
    command: "node scripts/class-tag-priority-queue.cjs --write",
    purpose: "Rank pending class tag proposals by citation count.",
    plainEnglish:
      "Loads data/entity-class-tags-proposed.jsonl (pending proposals), walks every [[wikilink]] in visible vault text, and ranks pending entities by: policies-cited (Rule 11 blockers) > stories-cited > total citation count. Produces a prioritized worksheet so your next class-tag review session approves the highest-leverage entities first. Re-run after each approval batch to see updated priorities.",
    output: "content/Admin Notes/class-tag-priority-queue.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Entity Dedup + Orphan Audit",
    command: "node scripts/entity-dedup-orphan-audit.cjs --write",
    purpose: "Find duplicates, name mismatches, and orphans in entities.jsonl.",
    plainEnglish:
      "Three-way audit of the entity registry. (1) Probable duplicates via name normalization (strips Inc/LLC/Corp suffixes, punctuation, parentheticals). (2) Name mismatches — entity.name differs from how the vault wikilinks it (breaks class-tag lookup silently). (3) True orphans — registry records that no vault file references by any name variant. (4) Missing profile files — entity.profile_path points to a nonexistent file. Each category has a dedicated section in the report with specific fix instructions.",
    output: "content/Admin Notes/entity-dedup-orphan-audit.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Source Registry Dedup Audit",
    command: "node scripts/source-registry-dedup-audit.cjs --write",
    purpose: "Find dedup gaps that slip past the write-path normalizer.",
    plainEnglish:
      "The sources-store.cjs normalizeUrl() dedupes on write (lowercase host, strip www, force https, drop tracking params, normalize trailing slash) but misses several categories. This audit groups sources by LOOSER normalization (also strips fragments + archive.org prefixes) and by ENTITY KEY (same FEC committee / congress bill / member across different URL shapes). Reports normalizer bugs (exact duplicate URL → 2 source IDs — an outright write-path failure), entity-duplicate groups, and loose duplicate groups. HASH_ROUTING_HOSTS guard prevents false positives on GLEIF.",
    output: "content/Admin Notes/source-registry-dedup-audit.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Broken Source Refs Report",
    command: "node scripts/broken-source-refs-report.cjs --write",
    purpose: "Find {{src:ID}} refs in profiles that don't resolve.",
    plainEnglish:
      "Walks every .md file in content/ (excluding admin notes, checklists, phases, decisions — which contain literal {{src:ID}} examples in docs) and finds every {{src:ID}} reference that doesn't resolve to a record in data/sources.jsonl. Categorizes broken refs: possible-typo (nearby valid ID exists), out-of-range (ID exceeds registry max), never-registered (format valid, not in registry), malformed-id. Suggests fixes where possible. Strips backtick code blocks before scanning to avoid documentation false positives. Current result: 0 broken refs, the source registry system is working perfectly.",
    output: "content/Admin Notes/broken-source-refs-report.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Relationship Cache Drift Audit",
    command: "node scripts/relationship-cache-drift-audit.cjs --write",
    purpose: "Compare frontmatter caches against canonical relationships.jsonl.",
    plainEnglish:
      "CLAUDE.md Rule 10 says data/relationships.jsonl is canonical and frontmatter fields (related, donors, top-donors, politicians-funded, opposes, stories) are READ-CACHES. This audit extracts every wikilink from every profile's guarded frontmatter fields and cross-checks against the canonical store. Reports drift two ways: stale-in-frontmatter (cached link no longer in canonical) and missing-from-cache (canonical link not yet rebuilt into frontmatter). Current finding: 15,023 frontmatter links exist BUT NOT in canonical — this is a COVERAGE GAP (canonical store is still catching up from migration), NOT drift. Running the existing cache-rebuilder would REGRESS data. Fix is a new migration script (migrate-frontmatter-to-canonical.cjs, TBD).",
    output: "content/Admin Notes/relationship-cache-drift-audit.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Phase 6 Regression Tests",
    command: "node --test scripts/phase-6-regression-tests.cjs",
    purpose: "20 tests covering every bug fixed in Phases 1-5.",
    plainEnglish:
      "Uses Node's built-in node:test module (zero extra dependencies, runs in ~75ms). Each test maps to a specific bug fixed during the query engine build that would silently regress if a future refactor 'cleaned up' the fix: source URL normalization (3 tests for www, case, utm), schema validator rejections across sources/entities/events/claims (7 tests for the defamation firewall), tier hierarchy admin/researcher/anonymous/patron (4 tests for Phase 2.5 auth), story scorer math including recency decay curve (4 tests for Phase 5), heuristic class tag labor-aligned override (1 test for the California Nurses Association bug). Wired into .husky/pre-commit as sentinel #6 and into CI workflow — blocks merge if any test fails.",
    output: "Console only — TAP format, exit code",
    when: "on-demand",
    danger: "safe",
    category: "gate",
  },
  {
    name: "Query Engine Contract Tests",
    command: "node --test scripts/query-engine-contract-tests.cjs",
    purpose: "20 tests locking in the query engine's public API shape.",
    plainEnglish:
      "Contract tests for scripts/lib/query-engine.cjs — the 6-subject query interface used by the policy pages, the /query UI, and the /api/query route. Tests: query() returns { subject, total, returned, rows[] } shape for edges / entities / events / cross_party_donors / timing_proximity / top_opposition_donors subjects, unknown subject throws, count() on unknown is tolerant (returns 0), pagination respects offset + limit, entity_type / tags_approved filters actually filter. Locks in the API contract so a future refactor can't silently drift it. Runs in ~250ms. Wired into .husky/pre-commit as sentinel #7 and into CI workflow.",
    output: "Console only — TAP format, exit code",
    when: "on-demand",
    danger: "safe",
    category: "gate",
  },
  {
    name: "Data Integrity Audit",
    command: "node scripts/phase-6-data-integrity-audit.cjs",
    purpose: "Schema + FK validation across all 8 canonical stores.",
    plainEnglish:
      "Loads every canonical JSONL store (sources, relationships, entities, events, policies, polling, users, claims), runs each record through its schema validator, detects duplicate IDs within each store, and resolves foreign-key references across stores (policies → events, events → policies, sources → entities, claims → sources, etc.). Reports per-store pass/fail counts. Currently: 43,678 records, 0 failures across all 8 stores. Run after any large data migration or pipeline change.",
    output: "Console only — exit code",
    when: "on-demand",
    danger: "safe",
    category: "health-check",
  },
  {
    name: "Bug Queue Parser",
    command: "node scripts/bug-queue-parser.cjs --write",
    purpose: "Regenerate /bugs dashboard manifest after editing bug-queue.md or deferred-items.md.",
    plainEnglish:
      "Parses content/Admin Notes/bug-queue.md (bugs David hits using Ops) and content/Phases/phase-6/deferred-items.md (267 items from the Phase 6 audit) into a unified manifest at ops/src/data/bugs-manifest.json. The /bugs Ops dashboard reads this manifest to render its cards, stats, and filter controls. Re-run this script any time you edit either source file (e.g. resolve a bug, triage a deferred item). Safe, read-only — doesn't touch the source files.",
    output: "ops/src/data/bugs-manifest.json",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Ops Surface Audit",
    command: "node scripts/ops-surface-audit.cjs --write",
    purpose: "Regenerate /system-health manifest after adding pages or APIs.",
    plainEnglish:
      "Walks ops/src/app/ for every page.tsx and api/**/route.ts file, parses each for fetch() calls + auth helpers, and writes a structured manifest to ops/src/data/ops-surfaces.json. The /system-health Ops dashboard reads this manifest to render its cards + run live health checks. Re-run this script any time you add a new Ops page, a new API route, or change the Sidebar.tsx NAV_ITEMS. Also writes a human-readable report to content/Admin Notes/ops-surface-audit.md. Safe, read-only — doesn't touch any Ops route.",
    output: "ops/src/data/ops-surfaces.json + content/Admin Notes/ops-surface-audit.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Deps Sync Check",
    command: "node scripts/deps-sync-check.cjs",
    purpose: "Detect package.json / node_modules drift (root + ops).",
    plainEnglish:
      "Catches the 2026-04-15 Clerk incident class: someone adds a dependency to package.json, commits the lockfile, but nobody re-runs npm install. The new dep sits in package.json but is MISSING from node_modules. The Ops dev server then throws 'Module not found: @clerk/nextjs' on next cold build. This check compares package.json against node_modules for BOTH the root Quartz build AND the ops/ Next.js app, reports exactly which packages are missing, and gives a one-line fix command. Runs automatically via the .husky/post-merge hook after every git pull — warns loudly if a merge brings in dep changes. Also wired into the pre-commit gate as sentinel #8 (blocks commits that stage package.json without package-lock.json). Exit 0 = clean, exit 1 = drift.",
    output: "Console only — exit code",
    when: "on-demand",
    danger: "safe",
    category: "health-check",
  },
  {
    name: "Deps Sync Fix",
    command: "node scripts/deps-sync-check.cjs --fix",
    purpose: "Run npm install in any directory with drifted deps.",
    plainEnglish:
      "Runs deps-sync-check.cjs and, if any directory is drifted, automatically runs `npm install` there. Covers root/ (Quartz) and ops/ (Next.js app). Use this as the one-liner fix when the post-merge hook warns you, or when you switch branches and the post-checkout hook flags drift. Idempotent — safe to re-run.",
    output: "Runs npm install in drifted dirs",
    when: "when-needed",
    danger: "writes-profiles",
    category: "cleanup",
  },
  {
    name: "Phase 6 Deferred Items Collector",
    command: "node scripts/phase-6-deferred-items-collector.cjs --write",
    purpose: "Walk every phase doc + ADR for deferred items and known issues.",
    plainEnglish:
      "The first concrete action of Phase 6 per ADR-0005. Walks every content/Phases/phase-*/ doc and every ADR in content/Decisions/, extracts lines matching 'deferred' markers (TODO, known issue, tech debt, revisit, fix later, not blocking, follow-up, pending, out of scope, won't fix, XXX/FIXME/HACK) plus whole sections titled 'Known issues', 'What this opens', 'Open questions', 'Blockers', 'Deferred'. Categorizes into 11 buckets (legal/defamation, security/auth, performance, regression/tests, documentation, data integrity, pipelines, phase 2.75/4/5 polish, class tags, misc). Current backlog: 267 items.",
    output: "content/Phases/phase-6/deferred-items.md",
    when: "on-demand",
    danger: "safe",
    category: "reporting",
  },
  {
    name: "Strikethrough Source Migration (DRY RUN)",
    command: "node scripts/migrate-strikethrough-sources-to-archived.cjs --report",
    purpose: "Preview: move ~~strikethrough~~ sources into ## Archived sections.",
    plainEnglish:
      "DRY RUN preview only — this variant writes a report showing which files WOULD change if you ran the actual migration with --write. The real migration finds bullet-list lines starting with '- ~~[Title](url)~~ (metadata)' in visible text and moves them to a ## Archived section at the bottom of the profile (creating the section if needed). Inline-prose strikethrough is flagged for manual review (Research Claude's lane), not auto-migrated. Current preview: 1,083 files would change, 3,427 bullet lines auto-movable, 894 inline-prose cases flagged. Run this button first to review; run the 'Strikethrough Source Migration (APPLY)' button below only after reading the report.",
    output: "content/Admin Notes/strikethrough-migration-report.md",
    when: "on-demand",
    danger: "safe",
    category: "audit",
  },
  {
    name: "Strikethrough Source Migration (APPLY)",
    command: "node scripts/migrate-strikethrough-sources-to-archived.cjs --write",
    purpose: "APPLY the strikethrough migration to 1,083 profile files.",
    plainEnglish:
      "⚠️ DESTRUCTIVE — rewrites ~1,083 profile .md files. Only run AFTER reviewing the DRY RUN report. Moves bullet-list strikethrough source lines from visible text into ## Archived sections. Preserves the full original line with metadata suffix (e.g. '(was Tier 1 — URL broken, archived by Ops)'). Inline-prose strikethrough is NOT touched — those go to the flagged list for Research Claude. Idempotent: safe to re-run, already-migrated files are no-ops. Git tracks every change; revert with `git reset --hard` if needed.",
    output: "Rewrites ~1,083 .md files + updates report",
    when: "on-demand",
    danger: "writes-profiles",
    category: "cleanup",
  },

  // ─── FEC COMMITTEE REGISTRY (Pillar 2b) ────────────────────────
  {
    name: "FEC Committee Resolver",
    command: "node scripts/fec-committee-resolver.cjs",
    purpose: "Look up unmatched FEC committees in the OpenFEC API and populate the committee registry.",
    plainEnglish:
      "Reads the unmatched committees report at content/Admin Notes/fec-unmatched-committees.md (emitted by migrate-fec-body-tables-to-edges). For each unknown committee name, queries GET /v1/committees/?q=<name> and captures the authoritative committee_id, canonical name, committee type, designation, connected org, candidate IDs, and cycles. Caches raw responses to data/fec-committee-cache.jsonl so re-runs are free. Rate-limited to 1 req / 4 sec (well under FEC's 1000/hr standard-key limit). This button runs the default top-50-by-dollar-volume pass — use the --all variant for full coverage.",
    output: "data/fec-committee-cache.jsonl + data/fec-committee-metadata.json + enriched content/Admin Notes/fec-unmatched-committees.md",
    when: "on-demand",
    danger: "safe",
    category: "pipeline",
  },
  {
    name: "FEC Committee Resolver (ALL)",
    command: "node scripts/fec-committee-resolver.cjs --all",
    purpose: "Resolve every unmatched committee against the FEC API (~20 min).",
    plainEnglish:
      "Same as FEC Committee Resolver but runs on every row in the unmatched report, not just the top 50. Takes about 20 minutes at the 4-sec rate limit. Idempotent because of the cache — after the first full pass, subsequent runs only hit committees newly added by the body-table migration.",
    output: "data/fec-committee-cache.jsonl + data/fec-committee-metadata.json + enriched content/Admin Notes/fec-unmatched-committees.md",
    when: "on-demand",
    danger: "safe",
    category: "pipeline",
  },
  {
    name: "Seed FEC Committee Registry (DRY RUN)",
    command: "node scripts/seed-fec-committee-registry.cjs",
    purpose: "Preview populating the FEC committee registry from the resolver cache.",
    plainEnglish:
      "Reads data/fec-committee-cache.jsonl and proposes records to add to data/fec-committee-registry.json. Each FEC committee is matched against the vault title index via case-insensitive exact + suffix-strip lookup. Matches are marked status: mapped with vault_profile populated; non-matches are marked status: unmapped-needs-stub. Dry-run only — the registry file is not touched.",
    output: "Console — summary of mapped vs unmapped vs review",
    when: "on-demand",
    danger: "safe",
    category: "pipeline",
  },
  {
    name: "Seed FEC Committee Registry (APPLY)",
    command: "node scripts/seed-fec-committee-registry.cjs --write",
    purpose: "Populate data/fec-committee-registry.json from the resolver cache.",
    plainEnglish:
      "Same as DRY RUN but actually writes data/fec-committee-registry.json. Idempotent — re-running upserts with fresh FEC metadata. After this, run Apply FEC Committee Registry to sync the new mapped entries into vault profile aliases.",
    output: "Writes data/fec-committee-registry.json",
    when: "on-demand",
    danger: "writes-profiles",
    category: "pipeline",
  },
  {
    name: "Apply FEC Committee Registry (DRY RUN)",
    command: "node scripts/apply-fec-committee-registry.cjs",
    purpose: "Preview which vault profiles would get new FEC-committee aliases from the registry.",
    plainEnglish:
      "Reads data/fec-committee-registry.json. For every record with status: mapped and a vault_profile, lists the aliases that would be added to that profile's frontmatter. DRY RUN only — no files are touched. Run this BEFORE the APPLY variant below to confirm the changes look right. Idempotent: re-running after an apply shows zero changes.",
    output: "Console only — lists profiles that would be touched",
    when: "on-demand",
    danger: "safe",
    category: "pipeline",
  },
  {
    name: "Apply FEC Committee Registry (APPLY)",
    command: "node scripts/apply-fec-committee-registry.cjs --write",
    purpose: "Write new FEC-committee aliases into vault profile frontmatter from the registry.",
    plainEnglish:
      "Syncs the mapped records from data/fec-committee-registry.json into the vault. Touches only the frontmatter aliases: field of each profile — everything else is byte-for-byte preserved. Profiles with status: unmapped-needs-stub are reported but NOT created automatically (stub creation is David's editorial decision). After this, re-run 'FEC Body Table → Edges Migration' to pick up the new matches in data/relationships.jsonl.",
    output: "Rewrites N profile .md files (reported in console)",
    when: "on-demand",
    danger: "writes-profiles",
    category: "pipeline",
  },
  {
    name: "FEC Body Table → Edges Migration (DRY RUN)",
    command: "node scripts/migrate-fec-body-tables-to-edges.cjs",
    purpose: "Preview the FEC body-table → canonical monetary edges migration.",
    plainEnglish:
      "Walks every politician profile's auto:fec-politician body-table block, parses the 'Top outside spenders' committee | support | oppose rows, resolves each committee to a vault profile via the registry + case-insensitive title index, and previews the monetary edges it would upsert into data/relationships.jsonl. Reports match rate and dollar volume. DRY RUN — no edges are written.",
    output: "Console + content/Admin Notes/fec-unmatched-committees.md (regenerated)",
    when: "on-demand",
    danger: "safe",
    category: "pipeline",
  },
  {
    name: "FEC Body Table → Edges Migration (APPLY)",
    command: "node scripts/migrate-fec-body-tables-to-edges.cjs --write",
    purpose: "Apply the body-table migration: upsert monetary edges with amount + cycle + role.",
    plainEnglish:
      "Same as DRY RUN but calls upsertEdges() to insert or update monetary edges in data/relationships.jsonl. Idempotent — re-running writes an updated last_verified timestamp on every existing edge + adds any newly matched edges. Run this AFTER Apply FEC Committee Registry so the new aliases are picked up. Deploy after to see the amounts show up on policy pages.",
    output: "Rewrites data/relationships.jsonl + content/Admin Notes/fec-unmatched-committees.md",
    when: "on-demand",
    danger: "writes-profiles",
    category: "pipeline",
  },

  // ─── Bulk Data Ingest ──────────────────────────────────────────────
  {
    name: "FEC Bulk Ingest (Committee→Candidate)",
    file: "scripts/ingest-fec-bulk.cjs",
    commands: ["node scripts/ingest-fec-bulk.cjs", "node scripts/ingest-fec-bulk.cjs --write"],
    purpose: "Ingest FEC PAS2 bulk files: committee-to-candidate contributions across 3 election cycles (2022/2024/2026).",
    plainEnglish: "Reads 1.58M rows of FEC committee-to-candidate contribution data. Matches committees via the FEC registry and candidates via fec-candidate-id in profile frontmatter. Aggregates dollar amounts by donor→politician→cycle and writes monetary edges. Re-running is safe (idempotent). Requires data/bulk/fec-cmte-to-candidate-*.zip files.",
    output: "Writes monetary edges to data/relationships.jsonl. Last run: 25,144 edges from 164,788 matched rows.",
    when: "on-demand",
    danger: "writes-profiles",
    category: "bulk",
  },
  {
    name: "FEC Candidate Master Ingest",
    file: "scripts/ingest-fec-candidate-master.cjs",
    commands: ["node scripts/ingest-fec-candidate-master.cjs", "node scripts/ingest-fec-candidate-master.cjs --write"],
    purpose: "Match vault politicians against FEC candidate master bulk files to populate fec-candidate-id frontmatter.",
    plainEnglish: "Reads all FEC candidate master files (6 cycles, 48K candidates). Matches against vault politician profiles by normalized name, validates party and state. Writes fec-candidate-id to matching profiles. This ID is how the FEC bulk ingest matches committees to candidates — more IDs = more edge matches on the next bulk run.",
    output: "Adds fec-candidate-id to politician profile frontmatter. Last run: 231 new IDs (187→418 total).",
    when: "on-demand",
    danger: "writes-profiles",
    category: "bulk",
  },
  {
    name: "FEC Committee Master Registry Expansion",
    file: "scripts/ingest-fec-committee-master.cjs",
    commands: ["node scripts/ingest-fec-committee-master.cjs", "node scripts/ingest-fec-committee-master.cjs --write"],
    purpose: "Expand the FEC committee registry by matching committee master bulk data against vault profiles.",
    plainEnglish: "Reads all FEC committee master files (6 cycles, 48K committees). Matches CONNECTED_ORG_NM and CMTE_NM against vault entity names. Adds new entries to data/fec-committee-registry.json. More registry entries = more matches when running the FEC bulk ingest.",
    output: "Expands data/fec-committee-registry.json. Last run: 559 new entries (293→852 total).",
    when: "on-demand",
    danger: "writes-profiles",
    category: "bulk",
  },
  {
    name: "FEC PAC Summary Ingest",
    file: "scripts/ingest-fec-pac-summary.cjs",
    commands: ["node scripts/ingest-fec-pac-summary.cjs", "node scripts/ingest-fec-pac-summary.cjs --write"],
    purpose: "Enrich vault PAC/committee profiles with financial summary data (total raised, spent, cash on hand, independent expenditures).",
    plainEnglish: "Reads FEC PAC summary files across 6 cycles. Matches committees via the registry. Writes total-raised, total-spent, cash-on-hand, independent-expenditures, individual-contributions, contributions-to-committees to profile frontmatter. Top results: ActBlue $1.4B, WinRed $470M.",
    output: "Writes frontmatter fields to matched profiles. Last run: 481 profiles updated.",
    when: "on-demand",
    danger: "writes-profiles",
    category: "bulk",
  },
  {
    name: "USASpending Bulk Ingest (Federal Contracts)",
    file: "scripts/ingest-usaspending-bulk.cjs",
    commands: ["node scripts/ingest-usaspending-bulk.cjs", "node scripts/ingest-usaspending-bulk.cjs --write"],
    purpose: "Stream USASpending contract award CSVs and write government-contract edges + auto-blocks to corporation profiles.",
    plainEnglish: "Streams multi-GB USASpending CSV files line-by-line (handles files too large for memory). Matches recipient_parent_name against vault corporation names. Writes government-contract edges and auto:usaspending auto-blocks with contract totals by agency. Handles the ACRONYM - Full Name pattern for matching. Top: Lockheed Martin $127B.",
    output: "Writes government-contract edges to data/relationships.jsonl + auto-blocks + frontmatter. Last run: 714 edges, 66 profiles, 13.3M rows streamed.",
    when: "on-demand",
    danger: "writes-profiles",
    category: "bulk",
  },
  {
    name: "EPA FRS Bulk Ingest (Facility Registry)",
    file: "scripts/ingest-epa-frs-bulk.cjs",
    commands: ["node scripts/ingest-epa-frs-bulk.cjs", "node scripts/ingest-epa-frs-bulk.cjs --write"],
    purpose: "Match EPA Facility Registry bulk data against vault corporations to write auto-blocks with facility counts and states.",
    plainEnglish: "Reads 3.2M EPA facility records. Matches FAC_NAME against vault corporation names. Writes auto:epa-echo auto-blocks showing facility count, states, and registry IDs. This was the fix for 0/110 corporations having EPA data — the API pipeline had never worked.",
    output: "Writes auto-blocks + frontmatter to corporation profiles. Last run: 104 profiles, 4,779 facility matches.",
    when: "on-demand",
    danger: "writes-profiles",
    category: "bulk",
  },
  {
    name: "Checklist Auto-N/A Sweeper",
    file: "scripts/checklist-auto-na.cjs",
    commands: ["node scripts/checklist-auto-na.cjs", "node scripts/checklist-auto-na.cjs --write"],
    purpose: "Bulk-mark obvious N/A checklist items across the vault and stamp urls-first-triaged dates.",
    plainEnglish: "Sweeps all profiles and marks checklist items as N/A when the entity type makes the data irrelevant (e.g., EPA/OSHA for PACs, federal contracts for media profiles). Also stamps urls-first-triaged date on profiles with zero URL NEEDED / NEEDS REVIEW tags. Corporations are correctly excluded — they should have EPA and contract data.",
    output: "Writes checklist-na and urls-first-triaged to profile frontmatter. Last run: 3,432 N/A items across 2,464 profiles, 2,238 URL stamps.",
    when: "on-demand",
    danger: "writes-profiles",
    category: "bulk",
  },

  // ─── Screening / Compliance ────────────────────────────────────────
  {
    name: "ICIJ Offshore Leaks Screening",
    file: "scripts/screen-icij-offshore.cjs",
    commands: ["node scripts/screen-icij-offshore.cjs"],
    purpose: "Screen vault entities against the ICIJ Offshore Leaks Database (Panama Papers, Paradise Papers, Pandora Papers).",
    plainEnglish: "Matches vault person names against 771K ICIJ officers and vault company names against 814K ICIJ entities. Looks up 3.3M ICIJ relationships for matched nodes. Generates a report for David's review — does NOT auto-write to profiles because offshore entities are legal and matches need editorial verification. Most entity matches are false positives from common company names.",
    output: "Report at content/Admin Notes/icij-offshore-screening-report.md. Last run: 12 officer + 142 entity matches.",
    when: "on-demand",
    danger: "safe",
    category: "screening",
  },
  {
    name: "OFAC SDN Sanctions Screening",
    file: "scripts/screen-ofac-sdn.cjs",
    commands: ["node scripts/screen-ofac-sdn.cjs"],
    purpose: "Screen vault entities against the US Treasury OFAC Specially Designated Nationals (SDN) sanctions list.",
    plainEnglish: "Extracts 49K names from the OFAC SDN XML and matches against all vault profile names. Zero matches = vault is clean. Any match would mean a profiled entity appears on the US sanctions list and needs immediate editorial attention.",
    output: "Report at content/Admin Notes/ofac-sdn-screening-report.md (if matches found). Last run: 0 matches, vault clean.",
    when: "on-demand",
    danger: "safe",
    category: "screening",
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  reporting: "Daily Reports",
  "health-check": "Health Checks",
  audit: "Audits",
  research: "Research Tools",
  cleanup: "Cleanup",
  pipeline: "Pipeline",
  intelligence: "Intelligence / Attention Queue",
  gate: "Pre-Commit Gates",
  bulk: "Bulk Data Ingest",
  screening: "Screening / Compliance",
}

const WHEN_LABELS: Record<string, string> = {
  daily: "Run daily (or automate as cron)",
  hourly: "Run hourly (or automate as cron)",
  "every-2-hours": "Run every 2 hours (auto by dispatcher)",
  weekly: "Run weekly",
  "on-demand": "Run when you need it",
  "one-shot": "Run once",
  "when-needed": "Run when something is wrong",
}

const DANGER_COLORS: Record<string, string> = {
  safe: "var(--color-green)",
  "writes-profiles": "var(--color-amber)",
  destructive: "var(--color-red)",
}

const DANGER_LABELS: Record<string, string> = {
  safe: "SAFE — read-only, no writes",
  "writes-profiles": "WRITES — modifies profile frontmatter",
  destructive: "DESTRUCTIVE — irreversible",
}

// Archived scripts — moved to scripts/_archive/ 2026-04-16
// Preserved for reference, not in active use. Git history follows.
interface ArchivedScript {
  name: string
  category: "migrations" | "backfills" | "one-time-cleanups" | "deprecated-experiments"
  whatItDid: string
  archivedDate: string
}

const ARCHIVED_CATEGORIES: Record<string, string> = {
  migrations: "Migrations (one-time data migrations)",
  backfills: "Backfills (one-time historical loads)",
  "one-time-cleanups": "One-time cleanups (bug fixes already applied)",
  "deprecated-experiments": "Deprecated experiments",
}

const ARCHIVED_SCRIPTS: ArchivedScript[] = [
  // MIGRATIONS
  { name: "migrate-fec-body-tables-to-edges.cjs", category: "migrations", whatItDid: "Parsed FEC body tables in profiles, promoted to canonical monetary edges in data/relationships.jsonl. Phase 2b.1.", archivedDate: "2026-04-16" },
  { name: "migrate-fec-citations-to-refs.cjs", category: "migrations", whatItDid: "Rewrote FEC URL citations to {{src:ID}} refs via the source registry. Phase 1 reference implementation.", archivedDate: "2026-04-16" },
  { name: "migrate-frontmatter-delta.cjs", category: "migrations", whatItDid: "Upserted frontmatter relationship fields into data/relationships.jsonl (Pillar 2a).", archivedDate: "2026-04-16" },
  { name: "migrate-frontmatter-to-relationships-jsonl.cjs", category: "migrations", whatItDid: "Original Phase 3 Part 1 migration from frontmatter to canonical store.", archivedDate: "2026-04-16" },
  { name: "migrate-ops-add-clerk-stripe.cjs", category: "migrations", whatItDid: "Ops auth bootstrap (Phase 2.5) — added Clerk + Stripe config files.", archivedDate: "2026-04-16" },
  { name: "migrate-strikethrough-sources-to-archived.cjs", category: "migrations", whatItDid: "Moved strikethrough-marked dead sources to Archived sections.", archivedDate: "2026-04-16" },
  // BACKFILLS
  { name: "financial-disclosures-backfill.cjs", category: "backfills", whatItDid: "One-time STOCK Act PTR historical load. Current data flows through financial-disclosures-pipeline.cjs (still active).", archivedDate: "2026-04-16" },
  { name: "senate-disclosures-backfill.cjs", category: "backfills", whatItDid: "Senate disclosure backfill. Same pattern as PTR backfill.", archivedDate: "2026-04-16" },
  // ONE-TIME CLEANUPS
  { name: "clean-a000383-contamination.cjs", category: "one-time-cleanups", whatItDid: "Cleared 95 profiles contaminated with A000383 (Alan Armstrong) bioguide from a bad fuzzy-match.", archivedDate: "2026-04-16" },
  { name: "clean-inline-fields.cjs", category: "one-time-cleanups", whatItDid: "Removed legacy Obsidian Dataview 'field:: value' body fields.", archivedDate: "2026-04-16" },
  { name: "clean-redirect-contamination.cjs", category: "one-time-cleanups", whatItDid: "Cleaned up redirect files the pipeline had accidentally enriched.", archivedDate: "2026-04-16" },
  { name: "fix-demo-key-urls.cjs", category: "one-time-cleanups", whatItDid: "Removed DEMO_KEY URLs from profile citations.", archivedDate: "2026-04-16" },
  { name: "fix-entity-name-mismatches.cjs", category: "one-time-cleanups", whatItDid: "Entity consolidation repair.", archivedDate: "2026-04-16" },
  { name: "fix-fec-ids.cjs", category: "one-time-cleanups", whatItDid: "One-off FEC ID repair (Katie Porter S4CA00522 case).", archivedDate: "2026-04-16" },
  { name: "strip-em-dashes.cjs", category: "one-time-cleanups", whatItDid: "Removed em dashes from existing profile content (banned vocab cleanup).", archivedDate: "2026-04-16" },
  { name: "strip-inline-dataview.cjs", category: "one-time-cleanups", whatItDid: "Companion to clean-inline-fields.cjs. Removed Dataview syntax from 562 profiles.", archivedDate: "2026-04-16" },
  { name: "strip-master-profile-title-suffix.cjs", category: "one-time-cleanups", whatItDid: "Normalized 'X Master Profile' title formatting.", archivedDate: "2026-04-16" },
  { name: "classify-mistyped-politicians.cjs", category: "one-time-cleanups", whatItDid: "Fixed type: politician profiles that should have been state-politician or local-politician.", archivedDate: "2026-04-16" },
  { name: "find-mistyped-politicians.cjs", category: "one-time-cleanups", whatItDid: "Audit companion to classify-mistyped-politicians.", archivedDate: "2026-04-16" },
  { name: "apply-type-reclassification.cjs", category: "one-time-cleanups", whatItDid: "Bulk type migration driven by profile-type-rulebook.cjs.", archivedDate: "2026-04-16" },
  { name: "archive-followthemoney.cjs", category: "one-time-cleanups", whatItDid: "FollowTheMoney source migration after the service merged into OpenSecrets.", archivedDate: "2026-04-16" },
  // DEPRECATED EXPERIMENTS
  { name: "batch-propose-class-tags-heuristic.cjs", category: "deprecated-experiments", whatItDid: "Heuristic class-tag proposal pass. 346 proposals approved, heuristic retired. Ongoing work uses manual approvals.", archivedDate: "2026-04-16" },
  { name: "batch-gather-entity-signals.cjs", category: "deprecated-experiments", whatItDid: "Signal collection for class-tag heuristic. Companion to batch-propose.", archivedDate: "2026-04-16" },
  { name: "gen-perplexity-batches.cjs", category: "deprecated-experiments", whatItDid: "Generated batch research requests for Perplexity. Workflow now ad-hoc per CLAUDE.md rule 13.", archivedDate: "2026-04-16" },
  { name: "load-perplexity-class-tag-proposals.cjs", category: "deprecated-experiments", whatItDid: "Integrated Perplexity research into class-tag proposals.", archivedDate: "2026-04-16" },
  { name: "integrate-perplexity-research.cjs", category: "deprecated-experiments", whatItDid: "Same workflow as above.", archivedDate: "2026-04-16" },
  { name: "match-fec-pdf.cjs", category: "deprecated-experiments", whatItDid: "Incomplete PDF-matcher experiment.", archivedDate: "2026-04-16" },
  { name: "phase-6-deferred-items-collector.cjs", category: "deprecated-experiments", whatItDid: "Phase 6 closed (ADR-0008).", archivedDate: "2026-04-16" },
]

// Map script names to their API IDs for the Run button
const SCRIPT_ID_MAP: Record<string, string> = {
  "Morning Briefing": "morning-briefing",
  "S-Tier Candidate Scanner": "s-tier-candidate-scanner",
  "Sign-Off Reminder": "sign-off-reminder",
  "Voice Drift Detector": "voice-drift-detector",
  "Hallucination Catcher": "hallucination-catcher",
  "Promotion Candidate Queue": "promotion-candidate-queue",
  "Contradiction Miner": "contradiction-miner",
  "Missing Profile Detector": "missing-profile-detector",
  "Connection Suggester": "connection-suggester",
  "Relationship Bidirectional Check": "relationship-bidirectional",
  "URL Staleness Checker": "url-staleness",
  "FEC Candidate ID Verifier": "verify-fec-candidate-ids",
  "Pipeline Janitor": "pipeline-janitor",
  "Duplicate Bioguide Sentinel": "duplicate-bioguide-sentinel",
  "Self-Review Mirror": "self-review-mirror",
  "YAML Sanity Scan": "yaml-sanity-scan",
  "Strip Inline Dataview": "strip-inline-dataview",
  "Normalize Bidirectionality": "normalize-related-bidirectionality",
  "Build Relationships Per Profile": "build-relationships-per-profile",
}

export default function ScriptsPage() {
  const [running, setRunning] = useState<string | null>(null)
  const [result, setResult] = useState<{ scriptId: string; success: boolean; output: string } | null>(null)

  const runScript = async (name: string) => {
    const scriptId = SCRIPT_ID_MAP[name]
    if (!scriptId) return
    setRunning(name)
    setResult(null)
    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId }),
      })
      const data = await res.json()
      setResult({ scriptId: name, success: data.success, output: data.output || data.error || "No output" })
    } catch (err) {
      setResult({ scriptId: name, success: false, output: String(err) })
    } finally {
      setRunning(null)
    }
  }

  const byCategory = SCRIPTS.reduce((acc, s) => {
    acc[s.category] = acc[s.category] || []
    acc[s.category].push(s)
    return acc
  }, {} as Record<string, ScriptEntry[]>)

  const categoryOrder: string[] = [
    "intelligence",
    "gate",
    "reporting",
    "health-check",
    "audit",
    "research",
    "cleanup",
    "pipeline",
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-4">
          <Link href="/" className="hover:text-[var(--color-text)]">Dashboard</Link>
          <span>/</span>
          <span className="text-[var(--color-text)]">Scripts</span>
        </div>

        <PageHeader
          title="Scripts Catalog"
          whatThisDoes={`Every automation script in the vault, explained in plain English. ${SCRIPTS.length} scripts documented. Less "ask Claude what does X do" — reference this page instead.`}
          action="Filter by purpose group at top. Click a script for usage examples + run frequency + side effects. Switch to System Docs tab below for vault rules and ADRs."
        />

        {/* Sibling-page tab — paired with /docs under the Reference
            sidebar slot. */}
        <div className="flex gap-1 mb-8 border-b border-[var(--color-border)]">
          <a
            href="/docs"
            className="px-3 py-2 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            style={{ borderBottom: "2px solid transparent", textDecoration: "none" }}
          >
            ← System Docs
          </a>
          <span
            className="px-3 py-2 text-xs font-semibold"
            style={{
              color: "var(--color-steel)",
              borderBottom: "2px solid var(--color-steel)",
            }}
          >
            ▼ Scripts catalog
          </span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Total scripts documented</div>
            <div className="text-2xl font-bold mt-1">{SCRIPTS.length}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Safe (read-only)</div>
            <div className="text-2xl font-bold mt-1 text-[var(--color-green)]">
              {SCRIPTS.filter((s) => s.danger === "safe").length}
            </div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Writes to profiles</div>
            <div className="text-2xl font-bold mt-1 text-[var(--color-amber)]">
              {SCRIPTS.filter((s) => s.danger === "writes-profiles").length}
            </div>
          </div>
        </div>

        {/* Categories */}
        {categoryOrder.map((cat) => {
          const scripts = byCategory[cat]
          if (!scripts || scripts.length === 0) return null
          return (
            <div key={cat} className="mb-8">
              <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3 border-b border-[var(--color-border)] pb-2">
                {CATEGORY_LABELS[cat]}{" "}
                <span className="text-[var(--color-text-dim)] normal-case">({scripts.length})</span>
              </h2>
              <div className="space-y-3">
                {scripts.map((s) => (
                  <div
                    key={s.name}
                    className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-[14px] font-bold">{s.name}</h3>
                        <p className="text-[11px] text-[var(--color-text-dim)] mt-0.5">
                          {s.purpose}
                        </p>
                      </div>
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                        style={{
                          color: DANGER_COLORS[s.danger],
                          borderColor: DANGER_COLORS[s.danger],
                        }}
                        title={DANGER_LABELS[s.danger]}
                      >
                        {s.danger === "safe" ? "safe" : s.danger === "writes-profiles" ? "writes" : "destructive"}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-[var(--color-text)] mb-3">
                      {s.plainEnglish}
                    </p>

                    <div className="space-y-1 text-[10px]">
                      <div className="flex gap-2">
                        <span className="text-[var(--color-text-dim)] uppercase tracking-wider min-w-[70px]">
                          command
                        </span>
                        <code className="text-[var(--color-steel)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded font-mono">
                          {s.command}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[var(--color-text-dim)] uppercase tracking-wider min-w-[70px]">
                          output
                        </span>
                        <code className="text-[var(--color-text-dim)] font-mono">{s.output}</code>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[var(--color-text-dim)] uppercase tracking-wider min-w-[70px]">
                          cadence
                        </span>
                        <span className="text-[var(--color-text-dim)]">{WHEN_LABELS[s.when]}</span>
                      </div>
                    </div>

                    {/* Run button */}
                    {SCRIPT_ID_MAP[s.name] && (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => runScript(s.name)}
                          disabled={running !== null}
                          className={`text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border transition-all ${
                            running === s.name
                              ? "opacity-50 cursor-wait"
                              : s.danger === "writes-profiles"
                              ? "border-[var(--color-amber)] text-[var(--color-amber)] hover:bg-[var(--color-amber)]/10"
                              : "border-[var(--color-green)] text-[var(--color-green)] hover:bg-[var(--color-green)]/10"
                          }`}
                        >
                          {running === s.name ? "Running..." : "Run"}
                        </button>
                        {result?.scriptId === s.name && (
                          <span className={`text-[9px] ${result.success ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                            {result.success ? "Completed" : "Failed"}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Script output */}
                    {result?.scriptId === s.name && result.output && (
                      <details className="mt-2">
                        <summary className="text-[9px] text-[var(--color-text-dim)] cursor-pointer hover:text-[var(--color-text)]">
                          Output ({result.success ? "success" : "error"})
                        </summary>
                        <pre className="mt-1 text-[8px] font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-[var(--color-text-dim)]">
                          {result.output}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Archived Scripts — expandable section */}
        <details className="mt-8 border border-[var(--color-border)] bg-[var(--color-bg-card)] rounded">
          <summary className="p-4 cursor-pointer text-[13px] font-bold uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-bg)]">
            Archived Scripts ({ARCHIVED_SCRIPTS.length}) — moved out of active use
          </summary>
          <div className="p-4 border-t border-[var(--color-border)]">
            <p className="text-[11px] text-[var(--color-text-dim)] mb-4">
              These scripts ran once (migrations, backfills, one-time cleanups) or were experiments that concluded.
              Preserved in <code className="text-[var(--color-steel)]">scripts/_archive/</code> with git history intact.
              To resurrect: <code className="text-[var(--color-steel)]">git mv scripts/_archive/&lt;category&gt;/&lt;name&gt;.cjs scripts/</code>
            </p>
            {Object.entries(ARCHIVED_CATEGORIES).map(([cat, label]) => {
              const items = ARCHIVED_SCRIPTS.filter((s) => s.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat} className="mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-yellow)] mb-2">
                    {label} ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.map((s) => (
                      <div key={s.name} className="p-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[10px] font-mono">
                        <div className="flex items-center justify-between">
                          <code className="text-[var(--color-text)]">{s.name}</code>
                          <span className="text-[9px] text-[var(--color-text-dim)]">{s.archivedDate}</span>
                        </div>
                        <p className="mt-1 text-[var(--color-text-dim)] font-sans text-[11px]">
                          {s.whatItDid}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </details>

        {/* Footer note */}
        <div className="mt-12 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[10px] text-[var(--color-text-dim)]">
          <p className="mb-2">
            <strong className="text-[var(--color-text)]">Adding a new script?</strong>{" "}
            Add its entry to the SCRIPTS array in{" "}
            <code className="text-[var(--color-steel)]">ops/src/app/scripts/page.tsx</code>.
            Plain-English descriptions only — no jargon. If a non-coder can't understand what it does, rewrite.
          </p>
          <p className="mb-2">
            <strong className="text-[var(--color-text)]">Where they live:</strong>{" "}
            <code className="text-[var(--color-steel)]">scripts/</code> in the site repo. Each is a standalone
            Node.js CommonJS script. Run from the repo root with{" "}
            <code className="text-[var(--color-steel)]">node scripts/NAME.cjs</code>.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Archived scripts</strong> live in{" "}
            <code className="text-[var(--color-steel)]">scripts/_archive/</code> with a README catalog. See the expandable section above.
          </p>
        </div>
      </div>
    </div>
  )
}
