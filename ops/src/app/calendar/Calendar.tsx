"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import type { SprintSchedule, SprintState, TaskStatus, Task, LiveVaultCounts } from "./types"
import { PHASE_COLORS, TARGET_COLORS, OWNER_COLORS, OWNER_LABELS, progressFraction, todayIso, effectiveTargetCurrent } from "./types"
import { MonthGrid } from "./MonthGrid"
import { PhaseBar } from "./PhaseBar"
import { DayModal } from "./DayModal"

interface Props {
  schedule: SprintSchedule
  initialState: SprintState
  serverDate: string   // YYYY-MM-DD from the server — authoritative "today"
  serverTime: string   // ISO timestamp from the server
  liveCounts?: LiveVaultCounts  // Live vault counts for the North Star meters
}

/**
 * Compute hours worked per day from sprint-state.json task completion
 * timestamps. Each completed task is credited 0.25h as a minimum estimate
 * (the actual work might have taken longer but this is a signal, not a
 * timesheet). Tasks completed on the same day accumulate.
 *
 * Returns: { 'YYYY-MM-DD': hoursEstimate }
 */
function computeHoursPerDay(state: SprintState): Record<string, number> {
  const byDay: Record<string, number> = {}
  for (const [_, taskState] of Object.entries(state.task_states || {})) {
    if (taskState.status !== "done" || !taskState.completed_at) continue
    const day = taskState.completed_at.slice(0, 10)
    byDay[day] = (byDay[day] || 0) + 0.25  // 15 min per task minimum
  }
  return byDay
}

export function Calendar({ schedule, initialState, serverDate, serverTime, liveCounts }: Props) {
  const [state, setState] = useState<SprintState>(initialState)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [liveTime, setLiveTime] = useState<string>(serverTime ?? new Date().toISOString())

  // Tick every 30s so the displayed clock stays fresh
  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date().toISOString()), 30_000)
    return () => clearInterval(id)
  }, [])

  const today = serverDate   // use server-side date as the authoritative "today"
  const sprintStart = schedule.metadata.start_date
  const sprintEnd = schedule.metadata.end_date

  // Day index within the sprint for the header (Day N of 21)
  const dayOfSprint = useMemo(() => {
    const start = new Date(sprintStart + "T00:00:00Z").getTime()
    const now = new Date(today + "T00:00:00Z").getTime()
    const days = Math.floor((now - start) / 86400000) + 1
    return Math.max(1, Math.min(schedule.metadata.duration_days, days))
  }, [sprintStart, today, schedule.metadata.duration_days])

  const toggleTask = useCallback(
    async (taskId: string, currentStatus: TaskStatus) => {
      const nextStatus: TaskStatus = currentStatus === "done" ? "pending" : "done"
      // Optimistic update
      setState((prev) => ({
        ...prev,
        task_states: {
          ...prev.task_states,
          [taskId]: {
            ...prev.task_states[taskId],
            status: nextStatus,
            ...(nextStatus === "done" ? { completed_at: new Date().toISOString() } : {}),
          },
        },
      }))
      try {
        const res = await fetch("/api/sprint-state/task", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ taskId, status: nextStatus }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const next = (await res.json()) as SprintState
        setState(next)
      } catch (err) {
        console.error("[Calendar] toggleTask failed:", err)
        // Revert
        setState((prev) => ({
          ...prev,
          task_states: {
            ...prev.task_states,
            [taskId]: { ...prev.task_states[taskId], status: currentStatus },
          },
        }))
      }
    },
    []
  )

  // Depth / breadth / systems / polish rendering
  const verifiedTarget = schedule.targets.find((t) => t.id === "depth")
  const effectiveDepthCurrent = verifiedTarget
    ? Number(effectiveTargetCurrent(verifiedTarget, liveCounts))
    : 0
  const verifiedGoal = verifiedTarget ? Number(verifiedTarget.goal) : 40

  const taskCountInSprint = schedule.allTasks.filter((t) => t.id).length
  const doneCount = Object.values(state.task_states).filter((s) => s.status === "done").length

  // Hours-per-day computed from task completion timestamps
  const hoursPerDay = useMemo(() => computeHoursPerDay(state), [state])
  const hoursToday = hoursPerDay[today] || 0
  const hoursTotalSoFar = Object.values(hoursPerDay).reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen">
      {/* Header row */}
      <header className="border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-[var(--color-text-dim)]">
              SPRINT
            </div>
            <h1 className="text-lg font-bold tracking-wider text-[var(--color-text)] font-mono">
              {schedule.metadata.sprint_id.toUpperCase()}
            </h1>
          </div>
          <div className="flex items-baseline gap-6 text-[11px] font-mono tracking-wider text-[var(--color-text-dim)]">
            {/* Live clock — ticks every 30s, seeded from server time */}
            <div className="text-[10px] font-mono" title="Server time — authoritative today">
              <span className="text-[var(--color-amber)]">
                {liveTime.slice(0, 10)}
              </span>
              <span className="text-[var(--color-text-dim)] ml-1">
                {liveTime.slice(11, 16)}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-dim)]">DAY </span>
              <span className="text-[var(--color-text)] text-base font-bold">{dayOfSprint}</span>
              <span className="text-[var(--color-text-dim)]"> / {schedule.metadata.duration_days}</span>
            </div>
            <div title="Total hours budgeted for the whole sprint (not a daily target)">
              <span className="text-[var(--color-text-dim)]">TOTAL BUDGET </span>
              <span className="text-[var(--color-text)]">{schedule.metadata.total_hour_budget}H</span>
            </div>
            <div title="Stop working at this time every day to protect sleep">
              <span className="text-[var(--color-text-dim)]">STOP WORK </span>
              <span className="text-[var(--color-red)]">{schedule.metadata.hard_stop_time}</span>
            </div>
            <div title={`Hours worked today = ${hoursToday.toFixed(2)}, total so far = ${hoursTotalSoFar.toFixed(2)}. Estimated from task completion timestamps (15 min credit per task).`}>
              <span className="text-[var(--color-text-dim)]">HOURS TODAY </span>
              <span className="text-[var(--color-amber)]">{hoursToday > 0 ? hoursToday.toFixed(1) + "H" : "—"}</span>
            </div>
            <div title="Tasks completed / total tasks in the sprint plan">
              <span className="text-[var(--color-text-dim)]">TASKS DONE </span>
              <span className="text-[var(--color-green)]">{doneCount}</span>
              <span className="text-[var(--color-text-dim)]">/{taskCountInSprint}</span>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] font-mono">
          {sprintStart} → {sprintEnd}
          <span className="mx-3 text-[var(--color-border)]">|</span>
          VERIFIED {effectiveDepthCurrent}/{verifiedGoal}
          {liveCounts && liveCounts.signoffQueue > 0 && (
            <>
              <span className="mx-3 text-[var(--color-border)]">|</span>
              <a href="/signoff-queue" className="text-[var(--color-amber)] hover:underline">
                {liveCounts.signoffQueue} READY FOR SIGN-OFF →
              </a>
            </>
          )}
          <span className="mx-3 text-[var(--color-border)]">|</span>
          DEPTH WINS WHEN STREAMS CONFLICT
        </div>
      </header>

      {/* North Star progress bars — now reads live vault counts for depth + breadth */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {schedule.targets.map((target) => {
          // Override the static `current:` field with live vault counts
          // where applicable (depth reads verifiedCount, breadth reads readyCount).
          const liveCurrent = effectiveTargetCurrent(target, liveCounts)
          const effectiveTarget = { ...target, current: liveCurrent }
          const frac = progressFraction(effectiveTarget)
          const color = TARGET_COLORS[target.id] ?? "#fbbf24"
          const pct = Math.round(frac * 100)
          return (
            <div key={target.id} className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
              <div className="flex items-baseline justify-between">
                <div className="text-[10px] tracking-[0.2em] font-mono" style={{ color }}>
                  #{target.rank} {target.id.toUpperCase()}
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)] font-mono">
                  {typeof liveCurrent === "boolean" ? (liveCurrent ? "YES" : "NO") : liveCurrent}
                  {typeof target.goal !== "boolean" && (
                    <span className="text-[var(--color-text-dim)]"> / {String(target.goal)}</span>
                  )}
                </div>
              </div>
              <div className="mt-2 h-2 bg-[var(--color-bg)] border border-[var(--color-border)] relative">
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
                {/* Percent label overlaid on the bar */}
                {pct >= 5 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono" style={{ color: pct > 20 ? "#000" : "var(--color-text-dim)" }}>
                    {pct}%
                  </div>
                )}
              </div>
              <div className="mt-2 text-[10px] text-[var(--color-text-dim)] leading-snug">
                {target.description}
              </div>
            </div>
          )
        })}
      </section>

      {/* Phase bar */}
      <PhaseBar phases={schedule.phases} today={today} />

      {/* Month grid */}
      <MonthGrid
        schedule={schedule}
        state={state}
        today={today}
        onToggleTask={toggleTask}
        onOpenDay={setOpenDay}
      />

      {/* Day detail modal */}
      {openDay && (
        <DayModal
          date={openDay}
          schedule={schedule}
          state={state}
          onClose={() => setOpenDay(null)}
          onToggleTask={toggleTask}
        />
      )}

      {/* Unplanned Extras — tasks completed that weren't in the original sprint plan.
          Renamed from "Ad-hoc log" per David's feedback — "ad-hoc" isn't plain English. */}
      {(() => {
        const adhocTasks = schedule.allTasks.filter(
          (t) => (t as Task & { added_adhoc?: boolean }).added_adhoc
        )
        if (adhocTasks.length === 0) return null
        // Sort by completion timestamp (newest first) so the most recent work is at the top
        const sorted = [...adhocTasks].sort((a, b) => {
          const aAt = state.task_states[a.id]?.completed_at || a.completed_date || ""
          const bAt = state.task_states[b.id]?.completed_at || b.completed_date || ""
          return bAt.localeCompare(aAt)
        })
        return (
          <section className="border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-baseline justify-between">
              <div className="text-[10px] tracking-[0.25em] text-[var(--color-amber)] font-mono font-bold">
                UNPLANNED EXTRAS — {adhocTasks.length} TASKS DONE OUTSIDE THE DAILY PLAN
              </div>
              <div className="text-[9px] text-[var(--color-text-dim)] font-mono">
                surprise work that wasn&apos;t on the schedule
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {sorted.map((task) => {
                const taskWithCtx = task as Task & { phase: string; owner: string; added_adhoc?: boolean }
                const taskStatus = state.task_states[task.id]?.status ?? task.status
                const ownerColor = OWNER_COLORS[taskWithCtx.owner] ?? "#7a7a86"
                const ownerLabel = OWNER_LABELS[taskWithCtx.owner] ?? "??"
                const isDone = taskStatus === "done"
                // Prefer live timestamp from sprint-state.json (ISO), fall back to static completed_date
                const liveTimestamp = state.task_states[task.id]?.completed_at
                const displayDate = liveTimestamp
                  ? liveTimestamp.slice(0, 10)
                  : task.completed_date
                const displayTime = liveTimestamp ? liveTimestamp.slice(11, 16) : null
                return (
                  <div key={task.id} className="px-5 py-2 flex items-start gap-3 text-[10px] font-mono">
                    <span style={{ color: isDone ? "#22c55e" : "#7a7a86" }}>{isDone ? "☒" : "☐"}</span>
                    <span
                      className="px-1 border text-[8px] flex-shrink-0"
                      style={{ color: ownerColor, borderColor: ownerColor + "80" }}
                      title={`Worked by: ${ownerLabel === "CC" ? "Code Claude (infrastructure/scripts)" : ownerLabel === "RC" ? "Research Claude (profile writing)" : ownerLabel === "DC" ? "David (editorial + decisions)" : "either Claude"}`}
                    >
                      {ownerLabel}
                    </span>
                    <span className="text-[var(--color-text-dim)] w-16 flex-shrink-0">{task.id}</span>
                    <span className={isDone ? "line-through text-[var(--color-text-dim)]" : "text-[var(--color-text)]"}>
                      {task.task}
                    </span>
                    {displayDate && (
                      <span
                        className="ml-auto flex-shrink-0 text-[var(--color-text-dim)]"
                        title={liveTimestamp ? `Completed ${liveTimestamp}` : `Completed ${displayDate}`}
                      >
                        {displayDate}
                        {displayTime && <span className="text-[var(--color-text-dim)]/60 ml-1">{displayTime}</span>}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })()}

      {/* Legend */}
      <section className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] font-mono mb-2">
          LEGEND
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] font-mono">
          {Object.entries(PHASE_COLORS).map(([id, info]) => (
            <div key={id} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3" style={{ backgroundColor: info.hex }} />
              <span className="text-[var(--color-text-dim)]">{info.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 border-2 border-[var(--color-red)]" />
            <span className="text-[var(--color-text-dim)]">HARD STOP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-[var(--color-green)]" />
            <span className="text-[var(--color-text-dim)]">DONE</span>
          </div>
        </div>
      </section>
    </div>
  )
}
