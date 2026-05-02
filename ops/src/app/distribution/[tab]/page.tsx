import fs from "node:fs"
import path from "node:path"
import { notFound } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import {
  parseDistributionSchedule,
  DistributionScheduleNotFoundError,
  type DistributionSchedule,
  type DayRhythm,
  type PlatformRecord,
  type TargetRecord,
  type AlgorithmLever,
  type HashtagCohort,
} from "@/lib/distribution-schedule"
import { TabNav } from "../TabNav"
import { BodyEditor } from "./BodyEditor"
import { WeeklyCalendar } from "./WeeklyCalendar"
import { mondayOf, dayDates, getEntriesForWeek } from "@/lib/distribution-log"

/**
 * /distribution/[tab] — multi-tab Distribution surface.
 *
 * Server component. Reads content/Admin Notes/distribution-schedule.md
 * fresh on every request via parseDistributionSchedule. Each tab is a
 * focused view of the same underlying schedule.
 *
 * Tabs handled here:
 *   - cadence    weekly rhythm + per-platform schedule
 *   - queue      today's drafts pulled from meme-publish-queue.jsonl
 *   - targets    adversarial + friendly profile lists
 *   - algorithm  boost levers + freeform body notes
 *
 * The /distribution/cards subroute is a separate static client page;
 * it is not handled here.
 */

export const dynamic = "force-dynamic"
export const revalidate = 0

const VALID_TABS = new Set(["cadence", "queue", "targets", "algorithm"])

interface PageProps {
  params: { tab: string }
}

export function generateStaticParams() {
  return Array.from(VALID_TABS).map((tab) => ({ tab }))
}

export default function DistributionTabPage({ params }: PageProps) {
  if (!VALID_TABS.has(params.tab)) notFound()

  let schedule: DistributionSchedule
  try {
    schedule = parseDistributionSchedule()
  } catch (err) {
    const msg =
      err instanceof DistributionScheduleNotFoundError
        ? err.message
        : err instanceof Error
          ? err.message
          : "unknown error"
    return (
      <div>
        <PageHeader
          title="Distribution"
          whatThisDoes="Multi-tab social ops surface. Cadence, queue, targets, algorithm levers, and the existing card generator."
        />
        <TabNav active={params.tab} />
        <ErrorPanel message={msg} />
      </div>
    )
  }

  const tabTitle = TAB_TITLES[params.tab] ?? "Distribution"
  return (
    <div>
      <PageHeader
        title={`Distribution · ${tabTitle}`}
        whatThisDoes={WHAT_THIS_DOES[params.tab] ?? ""}
        rightNow={
          <span>
            schedule status: <strong>{schedule.status}</strong> ·{" "}
            {schedule.lastUpdated ? `updated ${schedule.lastUpdated}` : "no last-updated stamp"} ·{" "}
            <em>"{schedule.operatingPrinciple}"</em>
          </span>
        }
        action={ACTION_TEXT[params.tab] ?? ""}
      />
      <TabNav active={params.tab} />
      {params.tab === "cadence" && <CadenceView schedule={schedule} />}
      {params.tab === "queue" && <QueueView />}
      {params.tab === "targets" && <TargetsView schedule={schedule} />}
      {params.tab === "algorithm" && <AlgorithmView schedule={schedule} />}
      <EditHint />
    </div>
  )
}

const TAB_TITLES: Record<string, string> = {
  cadence: "Cadence",
  queue: "Queue",
  targets: "Targets",
  algorithm: "Algorithm",
}

const WHAT_THIS_DOES: Record<string, string> = {
  cadence:
    "Weekly posting rhythm. What to post on which platform on which day. Mon anchor / Tue+Thu engagement / Wed receipt drop / Fri working notes / Sat+Sun off. Per-platform: handle, posts-per-week target, best times, content type, priority rank.",
  queue:
    "Drafts ready to post. Pulled live from data/meme-publish-queue.jsonl (the queue from /memes share workflow). Items show status, beat, target platform, and date.",
  targets:
    "Adversarial + friendly accounts to engage. Adversarial = quote-reply with receipts. Friendly = amplify and tag. Per row: handle, platform, tier, why, last engagement date.",
  algorithm:
    "Boost levers and what's converting. Structured table at top (lever / status / note). Freeform Markdown body below for weekly review notes, killed experiments, things in flight.",
}

const ACTION_TEXT: Record<string, string> = {
  cadence: "Post when there is a receipt, engage when there is data, otherwise stay quiet. Edit the schedule in content/Admin Notes/distribution-schedule.md.",
  queue: "Items shown here are drafted via /memes. Click a beat to jump into its meme catalog. Status flips as posts ship.",
  targets: "Per Rule 13, every handle in tier 1 + 2 needs Editor verification before engagement. Add new targets by editing the schedule file.",
  algorithm: "Tier each lever testing / confirmed / killed. Promote levers from testing to confirmed once they reliably convert.",
}

// ─── Tab views ───────────────────────────────────────────────────────

function CadenceView({ schedule }: { schedule: DistributionSchedule }) {
  const today = new Date().toISOString().slice(0, 10)
  const weekStart = mondayOf(today)
  const weekDates = dayDates(weekStart)
  const entries = getEntriesForWeek(weekStart)
  const todayDayIndex = weekDates.indexOf(today)
  return (
    <div>
      <Section title="This week">
        <WeeklyCalendar
          weekStart={weekStart}
          weekDates={weekDates}
          today={today}
          platforms={schedule.platforms}
          weeklyRhythm={schedule.weeklyRhythm}
          initialEntries={entries}
        />
      </Section>

      <Section title="Weekly rhythm">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
          {schedule.weeklyRhythm.map((d, i) => (
            <DayCard key={d.day} day={d} isToday={i === todayDayIndex} />
          ))}
        </div>
      </Section>

      <Section title={`Platforms (${schedule.platforms.length})`}>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1f2937" }}>
                <th style={th}>Priority</th>
                <th style={th}>Platform</th>
                <th style={th}>Handle</th>
                <th style={th}>Posts / wk</th>
                <th style={th}>Best times</th>
                <th style={th}>Content type</th>
                <th style={th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {schedule.platforms.map((p) => (
                <PlatformRow key={p.id} platform={p} />
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {schedule.hashtagCohorts.length > 0 && (
        <Section title="Hashtag cohorts">
          <div style={{ display: "grid", gap: "8px" }}>
            {schedule.hashtagCohorts.map((c) => (
              <HashtagCohortRow key={c.id} cohort={c} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function QueueView() {
  const queueItems = readPublishQueue()
  const byStatus = (status: string) => queueItems.filter((q) => q.status === status)
  const draft = byStatus("draft")
  const approved = byStatus("approved")
  const posted = byStatus("posted")
  const archived = queueItems.filter((q) => q.status === "archived" || q.status === "rejected")

  return (
    <div>
      <Section title={`Drafted (${draft.length})`}>
        {draft.length === 0 ? (
          <EmptyState text="No drafted items in the queue. Draft new memes via /memes." />
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {draft.map((q) => <QueueRow key={q.id} item={q} />)}
          </div>
        )}
      </Section>

      <Section title={`Approved (${approved.length})`}>
        {approved.length === 0 ? (
          <EmptyState text="No approved items waiting to post." />
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {approved.map((q) => <QueueRow key={q.id} item={q} />)}
          </div>
        )}
      </Section>

      <Section title={`Posted (${posted.length})`}>
        {posted.length === 0 ? (
          <EmptyState text="Nothing posted yet from this queue." />
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {posted.map((q) => <QueueRow key={q.id} item={q} />)}
          </div>
        )}
      </Section>

      {archived.length > 0 && (
        <Section title={`Archived / rejected (${archived.length})`}>
          <div style={{ display: "grid", gap: "8px" }}>
            {archived.map((q) => <QueueRow key={q.id} item={q} />)}
          </div>
        </Section>
      )}

      <div style={{ marginTop: "20px", padding: "12px 16px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937", fontSize: "12px", color: "var(--color-text-dim)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--color-text)" }}>Source:</strong> data/meme-publish-queue.jsonl. Items get drafted from the per-beat meme catalog at <Link href="/memes" style={{ color: "#5b8dce" }}>/memes</Link>. Status transitions: draft → approved → posted (or archived/rejected).
      </div>
    </div>
  )
}

function TargetsView({ schedule }: { schedule: DistributionSchedule }) {
  return (
    <div>
      <Section title={`Adversarial (${schedule.adversarialTargets.length})`}>
        <p style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "12px", lineHeight: 1.6 }}>
          Quote-reply with receipts. Per Rule 13, verify the handle on the platform before engagement; do not engage based on guesswork.
        </p>
        {schedule.adversarialTargets.length === 0 ? (
          <EmptyState text="No adversarial targets defined yet." />
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {schedule.adversarialTargets.map((t, i) => <TargetRow key={i} target={t} kind="adversarial" />)}
          </div>
        )}
      </Section>

      <Section title={`Friendly (${schedule.friendlyTargets.length})`}>
        <p style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "12px", lineHeight: 1.6 }}>
          Amplify and tag opportunistically. Reciprocity matters more than volume; engage with substance, not boilerplate.
        </p>
        {schedule.friendlyTargets.length === 0 ? (
          <EmptyState text="No friendly targets defined yet." />
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {schedule.friendlyTargets.map((t, i) => <TargetRow key={i} target={t} kind="friendly" />)}
          </div>
        )}
      </Section>
    </div>
  )
}

function AlgorithmView({ schedule }: { schedule: DistributionSchedule }) {
  return (
    <div>
      <Section title={`Levers (${schedule.algorithmLevers.length})`}>
        {schedule.algorithmLevers.length === 0 ? (
          <EmptyState text="No levers tracked yet." />
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {schedule.algorithmLevers.map((l, i) => <LeverRow key={i} lever={l} />)}
          </div>
        )}
      </Section>

      <Section title="Weekly progress">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
          <ProgressCard label="Followers · X" actual={schedule.weeklyActual.followersX} target={schedule.weeklyGoals.followersX} />
          <ProgressCard label="Followers · Bluesky" actual={schedule.weeklyActual.followersBluesky} target={schedule.weeklyGoals.followersBluesky} />
          <ProgressCard label="Followers · IG" actual={schedule.weeklyActual.followersInstagram} target={schedule.weeklyGoals.followersInstagram} />
          <ProgressCard label="Patreon supporters" actual={schedule.weeklyActual.patreonSupporters} target={schedule.weeklyGoals.patreonSupporters} />
          <ProgressCard label="Engagement %" actual={schedule.weeklyActual.engagementRate} target={schedule.weeklyGoals.engagementRate} suffix="%" />
        </div>
        <p style={{ marginTop: "10px", fontSize: "11px", color: "var(--color-text-dim)", fontStyle: "italic" }}>
          Update <code>weekly-actual</code> in distribution-schedule.md after each weekly review. Targets edit via <code>weekly-goals</code> in the same file.
        </p>
      </Section>

      <Section title="Notes (freeform)">
        <p style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "12px", lineHeight: 1.6 }}>
          Algorithm ideas, weekly review notes, experiments in flight. Markdown-formatted. Saved directly to the schedule file.
        </p>
        <BodyEditor initialBody={schedule.body} />
      </Section>
    </div>
  )
}

// ─── Components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div style={{ borderBottom: "2px solid var(--color-text)", paddingBottom: "8px", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--color-text)", margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function DayCard({ day, isToday }: { day: DayRhythm; isToday?: boolean }) {
  const isOff = day.type === "off"
  const accent = DAY_COLORS[day.type] || "#374151"
  return (
    <div
      style={{
        padding: "12px 14px",
        background: isToday ? "rgba(251, 191, 36, 0.12)" : isOff ? "rgba(31, 41, 55, 0.2)" : "rgba(31, 41, 55, 0.5)",
        border: isToday ? "2px solid #fbbf24" : `1px solid ${isOff ? "#1f2937" : accent}`,
        opacity: isOff ? 0.6 : 1,
        position: "relative",
      }}
    >
      {isToday && (
        <span
          style={{
            position: "absolute",
            top: "-9px",
            left: "10px",
            background: "#fbbf24",
            color: "#0a0a0a",
            padding: "2px 8px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "1.5px",
          }}
        >
          TODAY
        </span>
      )}
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "10px",
          letterSpacing: "1.5px",
          color: isToday ? "#fbbf24" : accent,
          textTransform: "uppercase",
          marginBottom: "6px",
          fontWeight: 700,
        }}
      >
        {day.day} · {day.type}
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text)", lineHeight: 1.5 }}>{day.note || (isOff ? "Off." : "")}</div>
    </div>
  )
}

const DAY_COLORS: Record<string, string> = {
  anchor: "#fbbf24",
  engagement: "#5b8dce",
  "receipt-drop": "#e63946",
  "working-notes": "#a855f7",
  off: "#737373",
  other: "#737373",
}

function PlatformRow({ platform }: { platform: PlatformRecord }) {
  return (
    <tr style={{ borderBottom: "1px solid #1f2937" }}>
      <td style={td}><span style={{ background: priorityColor(platform.priority), color: "#fff", padding: "2px 8px", fontSize: "10px", fontWeight: 700, letterSpacing: "1px" }}>{platform.priority}</span></td>
      <td style={{ ...td, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{platform.id}</td>
      <td style={td}>{platform.url ? <a href={platform.url} target="_blank" rel="noopener noreferrer" style={{ color: "#5b8dce" }}>{platform.handle}</a> : platform.handle}</td>
      <td style={{ ...td, fontFamily: "var(--font-mono, monospace)", textAlign: "center" }}>{platform.postsPerWeek}</td>
      <td style={{ ...td, fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim)" }}>{platform.bestTimes.join(", ")}</td>
      <td style={td}>{platform.contentType}</td>
      <td style={{ ...td, fontStyle: "italic", color: "var(--color-text-dim)", fontSize: "11px" }}>{platform.note}</td>
    </tr>
  )
}

function priorityColor(p: number): string {
  if (p === 1) return "#16a34a"
  if (p === 2) return "#5b8dce"
  if (p === 3) return "#fbbf24"
  return "#737373"
}

function HashtagCohortRow({ cohort }: { cohort: HashtagCohort }) {
  return (
    <div style={{ padding: "10px 14px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937" }}>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "1.5px", color: "var(--color-text-dim)", textTransform: "uppercase", marginBottom: "6px" }}>{cohort.id}</div>
      <div style={{ fontSize: "13px", color: "var(--color-text)", display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {cohort.tags.map((t, i) => (
          <span key={i} style={{ padding: "2px 8px", background: "rgba(91, 141, 206, 0.15)", color: "#5b8dce", fontFamily: "var(--font-mono, monospace)", fontSize: "11px" }}>{t}</span>
        ))}
      </div>
    </div>
  )
}

function TargetRow({ target, kind }: { target: TargetRecord; kind: "adversarial" | "friendly" }) {
  const tierBg = target.tier === 1 ? (kind === "adversarial" ? "#e63946" : "#16a34a") : target.tier === 2 ? "#fbbf24" : "#737373"
  return (
    <div style={{ padding: "12px 16px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
        <span style={{ background: tierBg, color: tierBg === "#fbbf24" ? "#0a0a0a" : "#fff", padding: "2px 8px", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", fontFamily: "var(--font-mono, monospace)" }}>T{target.tier || "?"}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>{target.handle}</span>
        <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "1px", textTransform: "uppercase" }}>{target.platform}</span>
        {target.lastEngaged && (
          <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)" }}>last: {target.lastEngaged}</span>
        )}
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text)", lineHeight: 1.5 }}>{target.reason}</div>
      {target.receipts && target.receipts.length > 0 && (
        <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", letterSpacing: "1px" }}>Receipts:</span>
          {target.receipts.map((r) => (
            <Link key={r} href={`/active-beat/${r}`} style={{ fontSize: "10px", padding: "2px 6px", border: "1px solid #374151", color: "#fbbf24", textDecoration: "none", fontFamily: "var(--font-mono, monospace)" }}>
              {r}
            </Link>
          ))}
        </div>
      )}
      {target.note && (
        <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--color-text-dim)", fontStyle: "italic" }}>{target.note}</div>
      )}
    </div>
  )
}

function LeverRow({ lever }: { lever: AlgorithmLever }) {
  const statusBg = lever.status === "confirmed" ? "#16a34a" : lever.status === "killed" ? "#737373" : "#fbbf24"
  const statusFg = lever.status === "killed" ? "#fff" : lever.status === "confirmed" ? "#fff" : "#0a0a0a"
  return (
    <div style={{ padding: "12px 16px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937" }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
        <span style={{ background: statusBg, color: statusFg, padding: "2px 8px", fontSize: "10px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "var(--font-mono, monospace)" }}>{lever.status}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>{lever.lever}</span>
      </div>
      <div style={{ fontSize: "12px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>{lever.note}</div>
    </div>
  )
}

function ProgressCard({
  label,
  actual,
  target,
  suffix = "",
}: {
  label: string
  actual?: number
  target?: number
  suffix?: string
}) {
  // If neither set, render a placeholder
  const hasAny = actual !== undefined || target !== undefined
  if (!hasAny) {
    return (
      <div style={{ padding: "12px 16px", background: "rgba(31, 41, 55, 0.2)", border: "1px dashed #374151", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "1.5px", color: "var(--color-text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
        <div style={{ fontSize: "12px", color: "var(--color-text-dim)", fontStyle: "italic" }}>not tracked yet</div>
      </div>
    )
  }
  const a = actual ?? 0
  const t = target ?? 0
  const pct = t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0
  const onTrack = pct >= 100
  const meterColor = onTrack ? "#16a34a" : pct >= 50 ? "#fbbf24" : "#e63946"
  return (
    <div style={{ padding: "12px 16px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937" }}>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "1.5px", color: "var(--color-text-dim)", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "26px", fontWeight: 800, color: "#fbbf24", fontFamily: "var(--font-mono, monospace)", letterSpacing: "-0.5px" }}>
          {actual !== undefined ? actual.toLocaleString() : "—"}{actual !== undefined ? suffix : ""}
        </span>
        <span style={{ fontSize: "12px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
          / {target !== undefined ? target.toLocaleString() + suffix : "—"}
        </span>
      </div>
      {target && target > 0 && (
        <>
          <div style={{ height: "4px", background: "#1f2937", marginBottom: "4px" }}>
            <div style={{ height: "4px", width: `${pct}%`, background: meterColor, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: "10px", color: meterColor, fontFamily: "var(--font-mono, monospace)", letterSpacing: "1px", fontWeight: 700 }}>
            {pct}%{onTrack ? " · ON TARGET" : target > a ? ` · ${(target - a).toLocaleString()} TO GO` : ""}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: "20px", color: "var(--color-text-dim)", fontStyle: "italic", textAlign: "center", border: "1px dashed #374151" }}>
      {text}
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div style={{ padding: "16px 20px", background: "rgba(230, 57, 70, 0.1)", border: "1px solid #e63946" }}>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: "#e63946", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "6px" }}>Distribution schedule error</div>
      <div style={{ fontSize: "13px", color: "var(--color-text)" }}>{message}</div>
      <div style={{ fontSize: "11px", color: "var(--color-text-dim)", marginTop: "10px", fontFamily: "var(--font-mono, monospace)" }}>Expected: content/Admin Notes/distribution-schedule.md</div>
    </div>
  )
}

function EditHint() {
  return (
    <div style={{ marginTop: "32px", padding: "12px 16px", background: "rgba(31, 41, 55, 0.3)", border: "1px solid #1f2937", fontSize: "11px", color: "var(--color-text-dim)", lineHeight: 1.6 }}>
      <strong style={{ color: "var(--color-text)" }}>Editing:</strong> all values on this page (cadence, platforms, targets, levers, goals, hashtags, freeform notes) are edited in <code>content/Admin Notes/distribution-schedule.md</code>. Save the file, refresh, see updates.
    </div>
  )
}

// ─── Queue helpers ───────────────────────────────────────────────────

interface QueueItem {
  id: string
  beat?: string
  template?: string
  caption?: string
  platforms?: string[]
  status: string
  createdAt?: string
  postedAt?: string
}

function readPublishQueue(): QueueItem[] {
  try {
    const fp = path.join(process.cwd(), "..", "data", "meme-publish-queue.jsonl")
    if (!fs.existsSync(fp)) return []
    const text = fs.readFileSync(fp, "utf-8")
    return text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l) as QueueItem
        } catch {
          return null
        }
      })
      .filter((x): x is QueueItem => x !== null)
  } catch {
    return []
  }
}

function QueueRow({ item }: { item: QueueItem }) {
  const statusColor = STATUS_COLORS[item.status] || "#737373"
  return (
    <div style={{ padding: "10px 14px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "4px" }}>
        <span style={{ background: statusColor, color: item.status === "approved" ? "#0a0a0a" : "#fff", padding: "2px 8px", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "var(--font-mono, monospace)" }}>{item.status}</span>
        {item.beat && (
          <Link href={`/memes/${item.beat}`} style={{ fontSize: "11px", color: "#fbbf24", fontFamily: "var(--font-mono, monospace)", textDecoration: "none" }}>{item.beat}</Link>
        )}
        {item.template && (
          <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "1px", textTransform: "uppercase" }}>{item.template}</span>
        )}
        {item.platforms && item.platforms.length > 0 && (
          <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>{item.platforms.join(", ")}</span>
        )}
      </div>
      {item.caption && (
        <div style={{ fontSize: "12px", color: "var(--color-text)", lineHeight: 1.5, fontStyle: "italic" }}>{item.caption.length > 200 ? item.caption.slice(0, 200) + "..." : item.caption}</div>
      )}
      {(item.createdAt || item.postedAt) && (
        <div style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", marginTop: "4px" }}>
          {item.postedAt ? `posted ${item.postedAt}` : item.createdAt ? `created ${item.createdAt}` : ""}
        </div>
      )}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#fbbf24",
  approved: "#16a34a",
  posted: "#5b8dce",
  archived: "#737373",
  rejected: "#e63946",
}

const th: React.CSSProperties = {
  padding: "8px 12px 8px 0",
  textAlign: "left",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "1.5px",
  color: "var(--color-text-dim)",
  textTransform: "uppercase",
}

const td: React.CSSProperties = {
  padding: "10px 12px 10px 0",
  fontSize: "12px",
  color: "var(--color-text)",
  verticalAlign: "top",
}
