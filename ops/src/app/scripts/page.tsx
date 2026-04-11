import Link from "next/link"

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

export default function ScriptsPage() {
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Scripts Reference</h1>
          <p className="text-[12px] text-[var(--color-text-dim)]">
            Every automation script in the vault, explained in plain English.
            Less relying on "asking Claude what does X do" — reference this page instead.
          </p>
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
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Footer note */}
        <div className="mt-12 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[10px] text-[var(--color-text-dim)]">
          <p className="mb-2">
            <strong className="text-[var(--color-text)]">Adding a new script?</strong>{" "}
            Add its entry to the SCRIPTS array in{" "}
            <code className="text-[var(--color-steel)]">ops/src/app/scripts/page.tsx</code>.
            Plain-English descriptions only — no jargon. If a non-coder can't understand what it does, rewrite.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Where they live:</strong>{" "}
            <code className="text-[var(--color-steel)]">scripts/</code> in the site repo. Each is a standalone
            Node.js CommonJS script. Run from the repo root with{" "}
            <code className="text-[var(--color-steel)]">node scripts/NAME.cjs</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
