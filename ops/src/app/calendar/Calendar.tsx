"use client"

import { useState, useMemo, useCallback } from "react"
import type { SprintSchedule, SprintState, TaskStatus } from "./types"
import { PHASE_COLORS, TARGET_COLORS, progressFraction, todayIso } from "./types"
import { MonthGrid } from "./MonthGrid"
import { PhaseBar } from "./PhaseBar"
import { DayModal } from "./DayModal"

interface Props {
  schedule: SprintSchedule
  initialState: SprintState
}

export function Calendar({ schedule, initialState }: Props) {
  const [state, setState] = useState<SprintState>(initialState)
  const [openDay, setOpenDay] = useState<string | null>(null)

  const today = todayIso()
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
  const verifiedCurrent = verifiedTarget ? Number(verifiedTarget.current) : 0
  const verifiedGoal = verifiedTarget ? Number(verifiedTarget.goal) : 40

  const taskCountInSprint = schedule.allTasks.filter((t) => t.id).length
  const doneCount = Object.values(state.task_states).filter((s) => s.status === "done").length

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
            <div>
              <span className="text-[var(--color-text-dim)]">DAY </span>
              <span className="text-[var(--color-text)] text-base font-bold">{dayOfSprint}</span>
              <span className="text-[var(--color-text-dim)]"> / {schedule.metadata.duration_days}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-dim)]">BUDGET </span>
              <span className="text-[var(--color-text)]">{schedule.metadata.total_hour_budget}H</span>
            </div>
            <div>
              <span className="text-[var(--color-text-dim)]">HARD STOP </span>
              <span className="text-[var(--color-red)]">{schedule.metadata.hard_stop_time}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-dim)]">TASKS </span>
              <span className="text-[var(--color-green)]">{doneCount}</span>
              <span className="text-[var(--color-text-dim)]">/{taskCountInSprint}</span>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] font-mono">
          {sprintStart} → {sprintEnd}
          <span className="mx-3 text-[var(--color-border)]">|</span>
          VERIFIED {verifiedCurrent}/{verifiedGoal}
          <span className="mx-3 text-[var(--color-border)]">|</span>
          DEPTH WINS WHEN STREAMS CONFLICT
        </div>
      </header>

      {/* North Star progress bars */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {schedule.targets.map((target) => {
          const frac = progressFraction(target)
          const color = TARGET_COLORS[target.id] ?? "#fbbf24"
          return (
            <div key={target.id} className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
              <div className="flex items-baseline justify-between">
                <div className="text-[10px] tracking-[0.2em] font-mono" style={{ color }}>
                  #{target.rank} {target.id.toUpperCase()}
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)] font-mono">
                  {typeof target.current === "boolean" ? (target.current ? "YES" : "NO") : target.current}
                  {typeof target.goal !== "boolean" && (
                    <span className="text-[var(--color-text-dim)]"> / {String(target.goal)}</span>
                  )}
                </div>
              </div>
              <div className="mt-2 h-2 bg-[var(--color-bg)] border border-[var(--color-border)]">
                <div
                  className="h-full transition-all"
                  style={{ width: `${Math.round(frac * 100)}%`, backgroundColor: color }}
                />
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
