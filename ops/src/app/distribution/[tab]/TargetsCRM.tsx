"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import type { TargetWithMetrics, EngagementRecord, TargetKind, TargetStatus, EngagementType, EngagementOutcome } from "@/lib/distribution-targets"

/**
 * Targets CRM client component.
 *
 * Renders the full Targets tab as an interactive surface:
 *   - "+ Add target" inline forms for adversarial + friendly
 *   - Per-target row: handle, tier badge, platform, last-engaged
 *     metric, expand-to-see-history click
 *   - Engagement log per target with "+ Log engagement" modal
 *   - Activity feed at top (recent engagements across all targets)
 *   - Filter bar: by platform, tier, status, days-since-engaged
 *
 * Server passes initial data; subsequent CRUD round-trips via fetch.
 */

interface Props {
  initialTargets: TargetWithMetrics[]
  initialEngagements: Array<EngagementRecord & { target?: { handle: string; platform: string; kind: TargetKind } }>
  knownPlatforms: string[]
  knownBeats: string[]
}

const PLATFORM_OPTIONS = ["x", "bluesky", "threads", "instagram", "facebook", "patreon"] as const

export function TargetsCRM({ initialTargets, initialEngagements, knownPlatforms, knownBeats }: Props) {
  const [targets, setTargets] = useState<TargetWithMetrics[]>(initialTargets)
  const [engagements, setEngagements] = useState(initialEngagements)
  const [error, setError] = useState<string | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>("")
  const [filterTier, setFilterTier] = useState<string>("")
  const [filterStaleness, setFilterStaleness] = useState<string>("")
  const [showAddForm, setShowAddForm] = useState<TargetKind | null>(null)

  const platforms = useMemo(() => {
    const set = new Set<string>([...PLATFORM_OPTIONS, ...knownPlatforms, ...targets.map((t) => t.platform)])
    return Array.from(set).sort()
  }, [targets, knownPlatforms])

  function applyFilters(list: TargetWithMetrics[]): TargetWithMetrics[] {
    return list.filter((t) => {
      if (filterPlatform && t.platform !== filterPlatform) return false
      if (filterTier && t.tier !== Number(filterTier)) return false
      if (filterStaleness === "fresh" && (t.daysSinceLastEngaged === null || t.daysSinceLastEngaged > 7)) return false
      if (filterStaleness === "stale" && (t.daysSinceLastEngaged !== null && t.daysSinceLastEngaged <= 7)) return false
      if (filterStaleness === "never" && t.engagementCount > 0) return false
      return true
    })
  }

  const adversarial = applyFilters(targets.filter((t) => t.kind === "adversarial"))
  const friendly = applyFilters(targets.filter((t) => t.kind === "friendly"))

  async function refresh() {
    try {
      const [tRes, eRes] = await Promise.all([
        fetch("/api/distribution-targets").then((r) => r.json()),
        fetch("/api/distribution-engagements").then((r) => r.json()),
      ])
      setTargets(tRes.targets || [])
      setEngagements(eRes.engagements || [])
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleAdd(kind: TargetKind, payload: AddPayload) {
    setError(null)
    try {
      const res = await fetch("/api/distribution-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, kind }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return false
      }
      await refresh()
      return true
    } catch (err) {
      setError(String(err))
      return false
    }
  }

  async function handleUpdate(id: string, patch: Record<string, unknown>) {
    try {
      const res = await fetch("/api/distribution-targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      await refresh()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this target? Engagement log entries will remain in the audit trail but show as orphaned.")) return
    try {
      const res = await fetch("/api/distribution-targets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      await refresh()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleLogEngagement(targetId: string, payload: LogEngagementPayload, screenshot?: File) {
    try {
      const res = await fetch("/api/distribution-engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return false
      }
      // If a screenshot was attached, upload it now and link to the engagement
      if (screenshot && data.engagement?.id) {
        const fd = new FormData()
        fd.append("engagementId", data.engagement.id)
        fd.append("file", screenshot)
        const upRes = await fetch("/api/distribution-screenshots", { method: "POST", body: fd })
        if (!upRes.ok) {
          const upData = await upRes.json().catch(() => ({}))
          setError(`engagement logged but screenshot failed: ${upData.error || `HTTP ${upRes.status}`}`)
        }
      }
      await refresh()
      return true
    } catch (err) {
      setError(String(err))
      return false
    }
  }

  return (
    <div>
      {/* Activity feed */}
      <Section title={`Recent engagements (${engagements.length})`}>
        {engagements.length === 0 ? (
          <EmptyState text="No engagements logged yet. Click any target below and log your first one." />
        ) : (
          <div style={{ display: "grid", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
            {engagements.slice(0, 30).map((e) => <ActivityRow key={e.id} engagement={e} />)}
          </div>
        )}
      </Section>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", padding: "12px 16px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "1.5px", color: "var(--color-text-dim)", textTransform: "uppercase", marginRight: "4px" }}>Filter:</span>
        <FilterSelect label="Platform" value={filterPlatform} onChange={setFilterPlatform} options={[{ v: "", l: "all" }, ...platforms.map((p) => ({ v: p, l: p }))]} />
        <FilterSelect label="Tier" value={filterTier} onChange={setFilterTier} options={[{ v: "", l: "all" }, { v: "1", l: "T1" }, { v: "2", l: "T2" }, { v: "3", l: "T3" }]} />
        <FilterSelect label="Engagement" value={filterStaleness} onChange={setFilterStaleness} options={[{ v: "", l: "all" }, { v: "fresh", l: "engaged ≤ 7d" }, { v: "stale", l: "stale > 7d" }, { v: "never", l: "never engaged" }]} />
      </div>

      {error && (
        <div style={{ marginBottom: "16px", padding: "8px 12px", background: "rgba(230, 57, 70, 0.1)", border: "1px solid #e63946", color: "#e63946", fontSize: "12px" }}>
          {error}
        </div>
      )}

      {/* Adversarial */}
      <Section title={`Adversarial (${adversarial.length})`}>
        <p style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "12px", lineHeight: 1.6 }}>
          Quote-reply with receipts. Per Rule 13, verify the handle on the platform before tier 1/2 engagement.
        </p>
        {showAddForm === "adversarial" ? (
          <AddTargetForm kind="adversarial" platforms={platforms} knownBeats={knownBeats} onAdd={handleAdd} onCancel={() => setShowAddForm(null)} />
        ) : (
          <button onClick={() => setShowAddForm("adversarial")} style={addBtnStyle}>+ Add adversarial target</button>
        )}
        <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
          {adversarial.map((t) => (
            <TargetCard
              key={t.id}
              target={t}
              engagements={engagements.filter((e) => e.targetId === t.id)}
              platforms={platforms}
              knownBeats={knownBeats}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onLogEngagement={handleLogEngagement}
            />
          ))}
        </div>
      </Section>

      {/* Friendly */}
      <Section title={`Friendly (${friendly.length})`}>
        <p style={{ fontSize: "12px", color: "var(--color-text-dim)", marginBottom: "12px", lineHeight: 1.6 }}>
          Amplify and tag opportunistically. Reciprocity matters more than volume.
        </p>
        {showAddForm === "friendly" ? (
          <AddTargetForm kind="friendly" platforms={platforms} knownBeats={knownBeats} onAdd={handleAdd} onCancel={() => setShowAddForm(null)} />
        ) : (
          <button onClick={() => setShowAddForm("friendly")} style={addBtnStyle}>+ Add friendly target</button>
        )}
        <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
          {friendly.map((t) => (
            <TargetCard
              key={t.id}
              target={t}
              engagements={engagements.filter((e) => e.targetId === t.id)}
              platforms={platforms}
              knownBeats={knownBeats}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onLogEngagement={handleLogEngagement}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

interface AddPayload {
  handle: string
  platform: string
  tier: 1 | 2 | 3
  reason: string
  receipts?: string[]
  notes?: string
  verified?: boolean
}

interface LogEngagementPayload {
  type: EngagementType
  platform: string
  date?: string
  myPostUrl?: string
  theirPostUrl?: string
  receiptUsed?: string
  outcome?: EngagementOutcome
  notes?: string
}

function AddTargetForm({
  kind,
  platforms,
  knownBeats,
  onAdd,
  onCancel,
}: {
  kind: TargetKind
  platforms: string[]
  knownBeats: string[]
  onAdd: (kind: TargetKind, payload: AddPayload) => Promise<boolean>
  onCancel: () => void
}) {
  const [handle, setHandle] = useState("")
  const [platform, setPlatform] = useState("x")
  const [tier, setTier] = useState<1 | 2 | 3>(2)
  const [reason, setReason] = useState("")
  const [receipts, setReceipts] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!handle.trim() || !reason.trim()) return
    setBusy(true)
    const ok = await onAdd(kind, { handle: handle.trim(), platform, tier, reason: reason.trim(), receipts: receipts.length ? receipts : undefined, notes: notes.trim() || undefined, verified })
    setBusy(false)
    if (ok) {
      setHandle("")
      setReason("")
      setReceipts([])
      setNotes("")
      setVerified(false)
      onCancel()
    }
  }

  function toggleReceipt(beat: string) {
    setReceipts((cur) => (cur.includes(beat) ? cur.filter((r) => r !== beat) : [...cur, beat]))
  }

  return (
    <div style={{ padding: "16px 18px", background: "rgba(31, 41, 55, 0.6)", border: `2px solid ${kind === "adversarial" ? "#e63946" : "#16a34a"}`, marginBottom: "12px" }}>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", letterSpacing: "1.5px", color: kind === "adversarial" ? "#e63946" : "#16a34a", textTransform: "uppercase", fontWeight: 700, marginBottom: "12px" }}>
        + Add {kind} target
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <Field label="Handle">
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@username" style={inputStyle} />
        </Field>
        <Field label="Platform">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", marginBottom: "10px" }}>
        <Field label="Tier">
          <select value={tier} onChange={(e) => setTier(Number(e.target.value) as 1 | 2 | 3)} style={inputStyle}>
            <option value={1}>T1 · top priority</option>
            <option value={2}>T2 · regular</option>
            <option value={3}>T3 · opportunistic</option>
          </select>
        </Field>
        <Field label={kind === "adversarial" ? "Why" : "Alignment"}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={kind === "adversarial" ? "e.g. politician with documented donor contradiction" : "e.g. investigative journalist on the same beat"} style={inputStyle} />
        </Field>
      </div>
      {knownBeats.length > 0 && (
        <Field label="Receipts to use (link to active beats)">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", paddingTop: "4px" }}>
            {knownBeats.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => toggleReceipt(b)}
                style={{
                  padding: "3px 8px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  background: receipts.includes(b) ? "#fbbf24" : "transparent",
                  color: receipts.includes(b) ? "#0a0a0a" : "var(--color-text)",
                  border: `1px solid ${receipts.includes(b) ? "#fbbf24" : "#374151"}`,
                  cursor: "pointer",
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </Field>
      )}
      <Field label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Anything else worth knowing." />
      </Field>
      <label style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px", fontSize: "11px", color: "var(--color-text-dim)", cursor: "pointer" }}>
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        <span>I have verified this handle on {platform} (Rule 13)</span>
      </label>
      <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
        <button onClick={submit} disabled={busy || !handle.trim() || !reason.trim()} style={primaryBtnStyle}>
          {busy ? "Saving..." : "Add target"}
        </button>
        <button onClick={onCancel} style={secondaryBtnStyle}>Cancel</button>
      </div>
    </div>
  )
}

function TargetCard({
  target,
  engagements,
  platforms,
  knownBeats,
  onUpdate,
  onDelete,
  onLogEngagement,
}: {
  target: TargetWithMetrics
  engagements: EngagementRecord[]
  platforms: string[]
  knownBeats: string[]
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onLogEngagement: (targetId: string, payload: LogEngagementPayload, screenshot?: File) => Promise<boolean>
}) {
  const [expanded, setExpanded] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)
  const tierBg = target.tier === 1 ? (target.kind === "adversarial" ? "#e63946" : "#16a34a") : target.tier === 2 ? "#fbbf24" : "#737373"
  const stalenessColor = target.daysSinceLastEngaged === null
    ? "#737373"
    : target.daysSinceLastEngaged <= 1
      ? "#16a34a"
      : target.daysSinceLastEngaged <= 7
        ? "#fbbf24"
        : "#e63946"
  const lastEngagedLabel = target.daysSinceLastEngaged === null
    ? "never engaged"
    : target.daysSinceLastEngaged === 0
      ? "engaged today"
      : `${target.daysSinceLastEngaged}d ago`

  return (
    <div style={{ background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          color: "var(--color-text)",
          cursor: "pointer",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ background: tierBg, color: tierBg === "#fbbf24" ? "#0a0a0a" : "#fff", padding: "2px 8px", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", fontFamily: "var(--font-mono, monospace)" }}>T{target.tier}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>{target.handle}</span>
        <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "1px", textTransform: "uppercase" }}>{target.platform}</span>
        {target.verified ? (
          <span style={{ fontSize: "10px", color: "#16a34a", fontFamily: "var(--font-mono, monospace)" }}>✓ verified</span>
        ) : (
          <span style={{ fontSize: "10px", color: "#fbbf24", fontFamily: "var(--font-mono, monospace)" }}>⚠ unverified</span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)" }}>{target.engagementCount} engagements</span>
        <span style={{ fontSize: "10px", color: stalenessColor, fontFamily: "var(--font-mono, monospace)" }}>{lastEngagedLabel}</span>
        <span style={{ fontSize: "12px", color: "var(--color-text-dim)" }}>{expanded ? "▾" : "▸"}</span>
      </button>

      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ fontSize: "12px", color: "var(--color-text)", lineHeight: 1.5 }}>{target.reason}</div>
        {target.receipts && target.receipts.length > 0 && (
          <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {target.receipts.map((r) => (
              <Link key={r} href={`/active-beat/${r}`} style={{ fontSize: "10px", padding: "2px 6px", border: "1px solid #374151", color: "#fbbf24", textDecoration: "none", fontFamily: "var(--font-mono, monospace)" }}>
                {r}
              </Link>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid #1f2937" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "1.5px", color: "var(--color-text-dim)", textTransform: "uppercase" }}>
              Engagement history ({engagements.length})
              {target.positiveResponses > 0 && <span style={{ marginLeft: "8px", color: "#16a34a" }}>· {target.positiveResponses} responded</span>}
              {target.negativeResponses > 0 && <span style={{ marginLeft: "8px", color: "#e63946" }}>· {target.negativeResponses} adverse</span>}
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => setShowLogForm((v) => !v)} style={primaryBtnStyle}>+ Log engagement</button>
              <button onClick={() => onUpdate(target.id, { verified: !target.verified })} style={secondaryBtnStyle}>{target.verified ? "Unverify" : "Mark verified"}</button>
              <button onClick={() => onDelete(target.id)} style={dangerBtnStyle}>Delete</button>
            </div>
          </div>

          {showLogForm && (
            <LogEngagementForm
              target={target}
              platforms={platforms}
              knownBeats={knownBeats}
              onSubmit={async (payload, screenshot) => {
                const ok = await onLogEngagement(target.id, payload, screenshot)
                if (ok) setShowLogForm(false)
              }}
              onCancel={() => setShowLogForm(false)}
            />
          )}

          {engagements.length === 0 ? (
            <EmptyState text="No engagements logged yet." />
          ) : (
            <div style={{ display: "grid", gap: "4px" }}>
              {engagements.map((e) => <EngagementRow key={e.id} engagement={e} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LogEngagementForm({
  target,
  platforms,
  knownBeats,
  onSubmit,
  onCancel,
}: {
  target: TargetWithMetrics
  platforms: string[]
  knownBeats: string[]
  onSubmit: (payload: LogEngagementPayload, screenshot?: File) => Promise<void>
  onCancel: () => void
}) {
  const [type, setType] = useState<EngagementType>(target.kind === "adversarial" ? "quote-reply" : "tag")
  const [platform, setPlatform] = useState(target.platform)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [myPostUrl, setMyPostUrl] = useState("")
  const [theirPostUrl, setTheirPostUrl] = useState("")
  const [receiptUsed, setReceiptUsed] = useState("")
  const [outcome, setOutcome] = useState<EngagementOutcome>("pending")
  const [notes, setNotes] = useState("")
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    await onSubmit({ type, platform, date, myPostUrl: myPostUrl.trim() || undefined, theirPostUrl: theirPostUrl.trim() || undefined, receiptUsed: receiptUsed || undefined, outcome, notes: notes.trim() || undefined }, screenshotFile || undefined)
    setBusy(false)
  }

  return (
    <div style={{ padding: "12px 14px", background: "rgba(31, 41, 55, 0.7)", border: "1px solid #5b8dce", marginBottom: "10px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "8px" }}>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as EngagementType)} style={inputStyle}>
            <option value="quote-reply">quote-reply</option>
            <option value="reply">reply</option>
            <option value="tag">tag / mention</option>
            <option value="dm">DM</option>
            <option value="follow">follow</option>
            <option value="like">like</option>
            <option value="repost">repost</option>
            <option value="reply-to-me">they replied to me</option>
            <option value="reposted-me">they reposted me</option>
            <option value="blocked-me">they blocked me</option>
            <option value="ignored-me">ignored me</option>
          </select>
        </Field>
        <Field label="Platform">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
            {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
        <Field label="My post URL (optional)">
          <input value={myPostUrl} onChange={(e) => setMyPostUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </Field>
        <Field label="Their post URL (optional)">
          <input value={theirPostUrl} onChange={(e) => setTheirPostUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
        <Field label="Receipt used">
          <select value={receiptUsed} onChange={(e) => setReceiptUsed(e.target.value)} style={inputStyle}>
            <option value="">none</option>
            {knownBeats.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Outcome">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as EngagementOutcome)} style={inputStyle}>
            <option value="pending">pending</option>
            <option value="no-response">no response</option>
            <option value="engaged">engaged / replied</option>
            <option value="reposted">reposted</option>
            <option value="argued">argued</option>
            <option value="blocked">blocked</option>
            <option value="deleted">deleted</option>
          </select>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>
      <Field label="Screenshot (optional · PNG/JPG/WebP/GIF, ≤8MB)">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
          style={{ ...inputStyle, padding: "5px 8px", cursor: "pointer" }}
        />
        {screenshotFile && (
          <div style={{ marginTop: "4px", fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
            ✓ {screenshotFile.name} · {(screenshotFile.size / 1024).toFixed(0)} KB
          </div>
        )}
      </Field>
      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button onClick={submit} disabled={busy} style={primaryBtnStyle}>{busy ? "Logging..." : "Log engagement"}</button>
        <button onClick={onCancel} style={secondaryBtnStyle}>Cancel</button>
      </div>
    </div>
  )
}

function EngagementRow({ engagement }: { engagement: EngagementRecord }) {
  const outcomeColor = OUTCOME_COLORS[engagement.outcome] || "#737373"
  const screenshotUrl = engagement.screenshot ? `/api/distribution-screenshots/${engagement.screenshot}` : null
  return (
    <div style={{ padding: "8px 12px", background: "rgba(31, 41, 55, 0.3)", border: "1px solid #1f2937" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr auto", gap: "10px", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: "var(--color-text-dim)" }}>{engagement.date}</span>
        <span style={{ background: "#1f2937", padding: "2px 6px", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: "var(--color-text)", letterSpacing: "0.5px" }}>{engagement.type}</span>
        <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>
          {engagement.notes || (engagement.theirPostUrl ? <a href={engagement.theirPostUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#5b8dce" }}>their post ↗</a> : "")}
          {engagement.myPostUrl && <a href={engagement.myPostUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "8px", color: "#5b8dce" }}>my post ↗</a>}
          {engagement.receiptUsed && <span style={{ marginLeft: "8px", color: "#fbbf24", fontFamily: "var(--font-mono, monospace)" }}>·{engagement.receiptUsed}</span>}
          {screenshotUrl && <span style={{ marginLeft: "8px", color: "#16a34a", fontFamily: "var(--font-mono, monospace)" }}>📷 screenshot</span>}
        </span>
        <span style={{ background: outcomeColor, color: outcomeColor === "#fbbf24" ? "#0a0a0a" : "#fff", padding: "2px 6px", fontFamily: "var(--font-mono, monospace)", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase" }}>{engagement.outcome}</span>
      </div>
      {screenshotUrl && (
        <div style={{ marginTop: "6px" }}>
          <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" title="Click to open full-size">
            <img src={screenshotUrl} alt="engagement screenshot" style={{ maxWidth: "320px", maxHeight: "200px", border: "1px solid #374151", display: "block" }} />
          </a>
        </div>
      )}
    </div>
  )
}

function ActivityRow({ engagement }: { engagement: EngagementRecord & { target?: { handle: string; platform: string; kind: TargetKind } } }) {
  const tone = engagement.target?.kind === "adversarial" ? "#e63946" : "#16a34a"
  const outcomeColor = OUTCOME_COLORS[engagement.outcome] || "#737373"
  return (
    <div style={{ padding: "6px 10px", background: "rgba(31, 41, 55, 0.3)", border: "1px solid #1f2937", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", fontSize: "11px" }}>
      <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-dim)" }}>{engagement.date}</span>
      <span style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--color-text)", letterSpacing: "0.5px" }}>{engagement.type}</span>
      <span style={{ color: tone, fontWeight: 700 }}>{engagement.target?.handle || "(deleted)"}</span>
      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "9px", color: "var(--color-text-dim)" }}>{engagement.platform}</span>
      {engagement.receiptUsed && <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "9px", color: "#fbbf24" }}>·{engagement.receiptUsed}</span>}
      <span style={{ flex: 1 }} />
      <span style={{ background: outcomeColor, color: outcomeColor === "#fbbf24" ? "#0a0a0a" : "#fff", padding: "1px 6px", fontFamily: "var(--font-mono, monospace)", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase" }}>{engagement.outcome}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "32px" }}>
      <div style={{ borderBottom: "2px solid var(--color-text)", paddingBottom: "8px", marginBottom: "12px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--color-text)", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: "16px", color: "var(--color-text-dim)", fontStyle: "italic", textAlign: "center", border: "1px dashed #374151" }}>{text}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "1.5px", color: "var(--color-text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>{label}</label>
      {children}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "1px", textTransform: "uppercase" }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, padding: "4px 6px", fontSize: "11px", width: "auto" }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

const OUTCOME_COLORS: Record<string, string> = {
  pending: "#fbbf24",
  "no-response": "#737373",
  engaged: "#16a34a",
  reposted: "#16a34a",
  argued: "#e63946",
  blocked: "#e63946",
  deleted: "#737373",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  background: "rgba(0, 0, 0, 0.3)",
  color: "var(--color-text)",
  border: "1px solid #374151",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: "12px",
  outline: "none",
}

const primaryBtnStyle: React.CSSProperties = {
  background: "#16a34a",
  color: "#fff",
  padding: "6px 14px",
  fontFamily: "var(--font-mono, monospace)",
  fontWeight: 700,
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  border: "1px solid #16a34a",
  cursor: "pointer",
}

const secondaryBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--color-text)",
  padding: "6px 14px",
  fontFamily: "var(--font-mono, monospace)",
  fontWeight: 700,
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  border: "1px solid #374151",
  cursor: "pointer",
}

const dangerBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#e63946",
  padding: "6px 14px",
  fontFamily: "var(--font-mono, monospace)",
  fontWeight: 700,
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  border: "1px solid #e63946",
  cursor: "pointer",
}

const addBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--color-text-dim)",
  padding: "10px 16px",
  fontFamily: "var(--font-mono, monospace)",
  fontWeight: 700,
  fontSize: "11px",
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  border: "1px dashed #374151",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
}
