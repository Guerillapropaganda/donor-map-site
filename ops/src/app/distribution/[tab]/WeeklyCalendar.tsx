"use client"

import { useState, useMemo } from "react"
import type { LogEntry } from "@/lib/distribution-log"
import type { PlatformRecord, DayRhythm } from "@/lib/distribution-schedule"

/**
 * Weekly calendar with click-to-toggle posted slots.
 *
 * Grid layout: 7-column header row (Mon-Sun) + one row per platform.
 * Each cell shows the platform's best-times as clickable buttons. Click
 * marks "posted" (green tint + check). Click again unmarks.
 *
 * Color-coded by platform on the row's left band. Today's column gets
 * a yellow accent border. Saturday + Sunday are dimmed (off-days per
 * the rhythm).
 *
 * State is optimistic: click flips local state immediately, then POSTs
 * to /api/distribution-log. On error, reverts.
 */

interface Props {
  weekStart: string
  weekDates: string[] // 7 ISO date strings, Mon..Sun
  today: string // ISO date YYYY-MM-DD
  platforms: PlatformRecord[]
  weeklyRhythm: DayRhythm[]
  initialEntries: LogEntry[]
}

const PLATFORM_COLORS: Record<string, string> = {
  x: "#ffffff",
  bluesky: "#0085ff",
  threads: "#a855f7",
  instagram: "#e63946",
  facebook: "#1d4ed8",
  patreon: "#fbbf24",
}

const PLATFORM_GLYPHS: Record<string, string> = {
  x: "𝕏",
  bluesky: "🦋",
  threads: "@",
  instagram: "📷",
  facebook: "f",
  patreon: "P",
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function keyOf(date: string, platform: string, slot: string): string {
  return `${date}|${platform}|${slot}`
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export function WeeklyCalendar({ weekStart, weekDates, today, platforms, weeklyRhythm, initialEntries }: Props) {
  // Optimistic local state: set of "date|platform|slot" strings that are posted
  const initialPosted = useMemo(
    () => new Set(initialEntries.filter((e) => e.status === "posted").map((e) => keyOf(e.date, e.platform, e.slot))),
    [initialEntries],
  )
  const [posted, setPosted] = useState<Set<string>>(initialPosted)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Compute slots: for each platform x for each weekday Mon-Fri, the
  // platform's best-times become individual slots. Special: if a best-time
  // string contains "weekly Friday", that platform only gets a single slot
  // on Friday with that label.
  const platformSlots = useMemo(() => {
    return platforms.map((p) => {
      const isWeeklyFriday = p.bestTimes.some((t) => t.toLowerCase().includes("friday"))
      const dayMap: Record<string, string[]> = {}
      weekDates.forEach((d, i) => {
        const dayName = DAY_NAMES[i]
        if (dayName === "Sat" || dayName === "Sun") {
          dayMap[d] = []
        } else if (isWeeklyFriday) {
          dayMap[d] = dayName === "Fri" ? ["weekly"] : []
        } else {
          dayMap[d] = p.bestTimes.filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        }
      })
      return { platform: p, dayMap }
    })
  }, [platforms, weekDates])

  const totalSlots = useMemo(() => {
    let total = 0
    for (const { dayMap } of platformSlots) {
      for (const slots of Object.values(dayMap)) total += slots.length
    }
    return total
  }, [platformSlots])

  const totalPosted = posted.size

  async function toggleSlot(date: string, platform: string, slot: string) {
    const k = keyOf(date, platform, slot)
    if (busy.has(k)) return
    setBusy((b) => new Set([...b, k]))
    setError(null)
    // Optimistic flip
    const wasPosted = posted.has(k)
    setPosted((p) => {
      const next = new Set(p)
      if (wasPosted) next.delete(k)
      else next.add(k)
      return next
    })
    try {
      const res = await fetch("/api/distribution-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, platform, slot }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        // Revert
        setPosted((p) => {
          const next = new Set(p)
          if (wasPosted) next.add(k)
          else next.delete(k)
          return next
        })
      }
    } catch (err) {
      setError(String(err))
      setPosted((p) => {
        const next = new Set(p)
        if (wasPosted) next.add(k)
        else next.delete(k)
        return next
      })
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(k)
        return next
      })
    }
  }

  const overallPct = totalSlots > 0 ? Math.round((totalPosted / totalSlots) * 100) : 0
  const meterColor = overallPct >= 80 ? "#16a34a" : overallPct >= 40 ? "#fbbf24" : "#e63946"

  return (
    <div>
      {/* Top meter */}
      <div style={{ marginBottom: "16px", padding: "14px 18px", background: "rgba(31, 41, 55, 0.4)", border: "1px solid #1f2937" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", letterSpacing: "1.5px", color: "var(--color-text-dim)", textTransform: "uppercase" }}>
            Week of {shortDate(weekStart)} · completion
          </span>
          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", color: meterColor, fontWeight: 700, letterSpacing: "1px" }}>
            {totalPosted} / {totalSlots} POSTED · {overallPct}%
          </span>
        </div>
        <div style={{ height: "6px", background: "#1f2937" }}>
          <div style={{ height: "6px", width: `${overallPct}%`, background: meterColor, transition: "width 0.3s" }} />
        </div>
        {error && (
          <div style={{ marginTop: "8px", fontSize: "11px", color: "#e63946" }}>Error: {error}</div>
        )}
      </div>

      {/* Day header */}
      <div style={{ display: "grid", gridTemplateColumns: "180px repeat(7, 1fr)", gap: "1px", marginBottom: "1px" }}>
        <div /> {/* spacer for platform column */}
        {weekDates.map((date, i) => {
          const dayName = DAY_NAMES[i]
          const isToday = date === today
          const isOff = dayName === "Sat" || dayName === "Sun"
          const rhythm = weeklyRhythm[i]
          return (
            <div
              key={date}
              style={{
                padding: "8px 6px",
                background: isToday ? "rgba(251, 191, 36, 0.12)" : "rgba(31, 41, 55, 0.6)",
                border: isToday ? "2px solid #fbbf24" : "1px solid #1f2937",
                opacity: isOff ? 0.55 : 1,
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", letterSpacing: "1.5px", color: isToday ? "#fbbf24" : "var(--color-text)", fontWeight: 700, textTransform: "uppercase" }}>
                {dayName} {shortDate(date)}
              </div>
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "9px", letterSpacing: "0.5px", color: "var(--color-text-dim)", marginTop: "2px", textTransform: "uppercase" }}>
                {rhythm?.type || ""}
              </div>
            </div>
          )
        })}
      </div>

      {/* Platform rows */}
      {platformSlots.map(({ platform, dayMap }) => {
        const platformPosted = weekDates.reduce((acc, d) => {
          const slots = dayMap[d] || []
          return acc + slots.filter((s) => posted.has(keyOf(d, platform.id, s))).length
        }, 0)
        const platformTotal = weekDates.reduce((acc, d) => acc + (dayMap[d]?.length || 0), 0)
        const platformPct = platform.postsPerWeek > 0 ? Math.round((platformPosted / platform.postsPerWeek) * 100) : 0
        const platformMeter = platformPct >= 100 ? "#16a34a" : platformPct >= 50 ? "#fbbf24" : "#737373"
        const color = PLATFORM_COLORS[platform.id] || "#5b8dce"
        const glyph = PLATFORM_GLYPHS[platform.id] || "?"
        return (
          <div key={platform.id} style={{ display: "grid", gridTemplateColumns: "180px repeat(7, 1fr)", gap: "1px", marginBottom: "1px" }}>
            {/* Platform label cell */}
            <div style={{ padding: "10px 12px", background: "rgba(31, 41, 55, 0.6)", borderLeft: `4px solid ${color}`, display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "16px", color, width: "20px", textAlign: "center", flexShrink: 0 }}>{glyph}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "11px", fontWeight: 700, color: "var(--color-text)", letterSpacing: "1px", textTransform: "uppercase" }}>{platform.id}</div>
                <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: platformMeter, marginTop: "2px" }}>
                  {platformPosted} / {platform.postsPerWeek}
                </div>
              </div>
            </div>

            {/* 7 day cells */}
            {weekDates.map((date, i) => {
              const slots = dayMap[date] || []
              const isToday = date === today
              const dayName = DAY_NAMES[i]
              const isOff = dayName === "Sat" || dayName === "Sun"
              return (
                <div
                  key={date}
                  style={{
                    padding: "8px 4px",
                    background: isToday ? "rgba(251, 191, 36, 0.06)" : "rgba(31, 41, 55, 0.3)",
                    border: isToday ? "1px solid rgba(251, 191, 36, 0.4)" : "1px solid #1f2937",
                    opacity: isOff ? 0.4 : 1,
                    minHeight: "56px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "3px",
                    alignContent: "flex-start",
                    justifyContent: "center",
                  }}
                >
                  {slots.length === 0 ? (
                    <span style={{ fontSize: "11px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)" }}>—</span>
                  ) : (
                    slots.map((slot) => {
                      const k = keyOf(date, platform.id, slot)
                      const isPosted = posted.has(k)
                      const isBusy = busy.has(k)
                      const display = slot === "weekly" ? "post" : slot
                      return (
                        <button
                          key={slot}
                          onClick={() => toggleSlot(date, platform.id, slot)}
                          disabled={isBusy}
                          title={isPosted ? `Posted ${display} ${date} (click to unmark)` : `Mark ${display} ${date} posted`}
                          style={{
                            padding: "3px 7px",
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: "10px",
                            fontWeight: 700,
                            letterSpacing: "0.5px",
                            background: isPosted ? color : "transparent",
                            color: isPosted ? (color === "#fbbf24" || color === "#ffffff" ? "#0a0a0a" : "#fff") : "var(--color-text)",
                            border: `1px solid ${isPosted ? color : "#374151"}`,
                            cursor: isBusy ? "wait" : "pointer",
                            opacity: isBusy ? 0.5 : 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isPosted ? "✓" : ""}{display}
                        </button>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <p style={{ marginTop: "12px", fontSize: "11px", color: "var(--color-text-dim)", fontStyle: "italic" }}>
        Click any slot to toggle posted. State persists in <code>data/distribution-log.jsonl</code>. Saturday + Sunday are off-days per the rhythm; today's column is highlighted yellow.
      </p>
    </div>
  )
}
