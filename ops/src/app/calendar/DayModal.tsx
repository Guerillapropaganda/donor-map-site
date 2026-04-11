"use client"

import { useEffect } from "react"
import type { SprintSchedule, SprintState, TaskStatus } from "./types"
import { PHASE_COLORS, OWNER_COLORS, OWNER_LABELS, tasksByDay } from "./types"
import { phaseForDate } from "./utils"
import { TaskCheckbox } from "./TaskCheckbox"

interface Props {
  date: string
  schedule: SprintSchedule
  state: SprintState
  onClose: () => void
  onToggleTask: (taskId: string, status: TaskStatus) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  return d
    .toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase()
}

export function DayModal({ date, schedule, state, onClose, onToggleTask }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const phase = phaseForDate(schedule.phases, date)
  const phaseColor = phase ? PHASE_COLORS[phase.id]?.hex ?? "#fbbf24" : "#7a7a86"
  const dayState = state.day_states[date] ?? {}

  // Tasks anchored to this day (first day of phase or explicit scheduled)
  const byDay = tasksByDay(schedule)
  const dayTasks = byDay[date] ?? []

  // Compute hours worked from task completion timestamps on this day
  // (15 min credit per completed task — see Calendar.tsx::computeHoursPerDay)
  const autoHours = Object.values(state.task_states || {}).reduce((sum, ts) => {
    if (ts.status === "done" && ts.completed_at?.slice(0, 10) === date) return sum + 0.25
    return sum
  }, 0)
  const displayHours = dayState.actual_hours_worked ?? (autoHours > 0 ? autoHours : undefined)

  // Tasks completed on this day with their exact times — helps reconstruct "when did what happen"
  const completedOnThisDay = Object.entries(state.task_states || {})
    .filter(([_, ts]) => ts.status === "done" && ts.completed_at?.slice(0, 10) === date)
    .map(([taskId, ts]) => {
      const task = schedule.allTasks.find(t => t.id === taskId)
      return { taskId, task: task?.task || taskId, completedAt: ts.completed_at || "" }
    })
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-8 bg-black/70 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] my-auto"
        style={{ borderLeftWidth: 4, borderLeftColor: phaseColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-start justify-between">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-[var(--color-text-dim)] font-mono">
              {formatDate(date)}
            </div>
            {phase && (
              <div
                className="text-[11px] tracking-[0.2em] font-mono font-bold mt-1"
                style={{ color: phaseColor }}
              >
                {PHASE_COLORS[phase.id]?.label} · {phase.theme}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close day modal"
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-2xl leading-none font-mono px-2"
          >
            ×
          </button>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x md:divide-[var(--color-border)]">
          {/* Left: daily template */}
          <div className="p-5">
            <div className="text-[10px] tracking-[0.25em] text-[var(--color-text-dim)] font-mono mb-3">
              DAILY TEMPLATE
            </div>
            <div className="space-y-1">
              {schedule.dailyTemplate.map((block, i) => {
                const ownerColor = OWNER_COLORS[block.owner] ?? "#7a7a86"
                const ownerLabel = OWNER_LABELS[block.owner] ?? "??"
                const isRest = block.category === "rest"
                const isHardStop = block.block === "hard_stop"
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 py-1 px-2 border-l-2 ${
                      isHardStop ? "border-[var(--color-red)]" : "border-transparent"
                    }`}
                    style={{
                      backgroundColor: isRest ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <div className="text-[9px] font-mono text-[var(--color-text-dim)] w-24 flex-shrink-0 pt-0.5">
                      {block.time}
                    </div>
                    <div
                      className="text-[8px] font-mono font-bold border px-1 py-0.5 flex-shrink-0"
                      style={{ color: ownerColor, borderColor: ownerColor + "80" }}
                    >
                      {ownerLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-[var(--color-text)] leading-snug">
                        {block.work}
                      </div>
                      <div className="text-[9px] text-[var(--color-text-dim)] font-mono mt-0.5">
                        {block.block}
                        {block.duration_hours ? ` · ${block.duration_hours}h` : ""}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: tasks + day state */}
          <div className="p-5 space-y-4">
            <div>
              <div className="text-[10px] tracking-[0.25em] text-[var(--color-text-dim)] font-mono mb-3">
                TASKS ANCHORED TO {date.slice(5)}
              </div>
              {dayTasks.length === 0 ? (
                <div className="text-[10px] text-[var(--color-text-dim)] italic">
                  No tasks explicitly anchored to this day. Phase tasks render on the phase
                  start day by default; edit sprint-schedule.md with a{" "}
                  <code className="font-mono">scheduled:</code> field to pin a task.
                </div>
              ) : (
                <div className="space-y-1">
                  {dayTasks.map((task) => {
                    const status = state.task_states[task.id]?.status ?? "pending"
                    return (
                      <TaskCheckbox
                        key={task.id}
                        task={task}
                        status={status}
                        onToggle={onToggleTask}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] tracking-[0.25em] text-[var(--color-text-dim)] font-mono mb-2">
                HOW THE DAY WENT
              </div>
              <div className="text-[10px] font-mono text-[var(--color-text-dim)] space-y-1">
                <div title="Estimated from task completion timestamps (15 min credit per task). If you logged real hours manually, those override the estimate.">
                  HOURS WORKED:{" "}
                  <span className="text-[var(--color-text)]">
                    {displayHours !== undefined ? `${displayHours.toFixed(1)}H` : "—"}
                  </span>
                  {autoHours > 0 && dayState.actual_hours_worked === undefined && (
                    <span className="text-[7px] text-[var(--color-text-dim)] ml-1">(estimated)</span>
                  )}
                </div>
                <div title="Extended-hours day — worked past the usual stop-work time">
                  EXTENDED HOURS:{" "}
                  <span className="text-[var(--color-text)]">{dayState.crunch_day ? "YES" : "NO"}</span>
                </div>
                <div title="Half-day rest — worked only part of the day on purpose">
                  HALF-DAY REST:{" "}
                  <span className="text-[var(--color-text)]">
                    {dayState.rest_half_day ? "YES" : "NO"}
                  </span>
                </div>
                {dayState.notes && (
                  <div className="mt-2 p-2 border border-[var(--color-border)] text-[var(--color-text)]">
                    {dayState.notes}
                  </div>
                )}
              </div>

              {/* Completion timeline — every task closed on this day with its exact time */}
              {completedOnThisDay.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] tracking-[0.25em] text-[var(--color-text-dim)] font-mono mb-2">
                    COMPLETION TIMELINE
                  </div>
                  <div className="text-[10px] font-mono space-y-1">
                    {completedOnThisDay.map((c, idx) => (
                      <div key={`${c.taskId}-${idx}`} className="flex gap-2">
                        <span className="text-[var(--color-text-dim)] w-10 flex-shrink-0">
                          {c.completedAt.slice(11, 16)}
                        </span>
                        <span className="text-[var(--color-green)] flex-shrink-0">✓</span>
                        <span className="text-[var(--color-text)] truncate">{c.task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-2 border-t border-[var(--color-border)] text-[9px] text-[var(--color-text-dim)] font-mono flex justify-between">
          <span>Press ESC or click outside to close</span>
          <span>Day modal · v1</span>
        </div>
      </div>
    </div>
  )
}
