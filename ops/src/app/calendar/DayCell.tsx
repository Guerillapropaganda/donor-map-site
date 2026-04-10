"use client"

import type { Task, SprintState, TaskStatus } from "./types"
import { PHASE_COLORS } from "./types"
import { TaskCheckbox } from "./TaskCheckbox"

interface Props {
  date: string
  phaseId: string | null
  phaseName: string
  phaseStart: string
  tasks: (Task & { phase: string; owner: string })[]
  state: SprintState
  isToday: boolean
  isPhaseEnd: boolean
  isSoftLaunch: boolean
  isPublicLaunch: boolean
  hardStopTime: string
  onToggleTask: (taskId: string, status: TaskStatus) => void
  onOpen: () => void
}

function shortWeekday(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getUTCDay()]
}

function dayNumber(iso: string): string {
  return iso.slice(8, 10)
}

export function DayCell({
  date,
  phaseId,
  phaseName,
  phaseStart,
  tasks,
  state,
  isToday,
  isPhaseEnd,
  isSoftLaunch,
  isPublicLaunch,
  hardStopTime,
  onToggleTask,
  onOpen,
}: Props) {
  const phaseColor = phaseId ? PHASE_COLORS[phaseId]?.hex ?? "#fbbf24" : "#2a2a35"
  const doneCount = tasks.filter((t) => state.task_states[t.id]?.status === "done").length
  const totalCount = tasks.length

  // Day-in-phase index (1-based)
  const dayInPhase = phaseStart
    ? Math.floor((new Date(date).getTime() - new Date(phaseStart).getTime()) / 86400000) + 1
    : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`relative min-h-[200px] border bg-[var(--color-bg-card)] cursor-pointer transition-all flex flex-col ${
        isToday
          ? "border-[var(--color-amber)]"
          : isPhaseEnd
          ? "border-[var(--color-border)]"
          : "border-[var(--color-border)] hover:border-[var(--color-text-dim)]"
      }`}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: phaseColor,
        ...(isToday ? { boxShadow: `inset 0 0 0 1px ${phaseColor}` } : {}),
      }}
    >
      {/* Today strip */}
      {isToday && (
        <div
          className="absolute top-0 right-0 px-1.5 py-0.5 text-[8px] font-bold font-mono"
          style={{ backgroundColor: "#fbbf24", color: "#000" }}
        >
          TODAY
        </div>
      )}

      {/* Header row: weekday + day number */}
      <div className="px-2 pt-2 pb-1 flex items-baseline justify-between">
        <div className="text-[9px] tracking-[0.2em] text-[var(--color-text-dim)] font-mono">
          {shortWeekday(date)}
        </div>
        <div
          className="text-2xl font-bold font-mono leading-none"
          style={{ color: isToday ? "#fbbf24" : "#e4e4e7" }}
        >
          {dayNumber(date)}
        </div>
      </div>

      {/* Phase label */}
      {phaseId && (
        <div className="px-2 pb-1">
          <div
            className="text-[8px] tracking-[0.15em] font-mono font-bold"
            style={{ color: phaseColor }}
          >
            {PHASE_COLORS[phaseId]?.label}
            {dayInPhase > 0 && (
              <span className="text-[var(--color-text-dim)] ml-1">· D{dayInPhase}</span>
            )}
          </div>
        </div>
      )}

      {/* Task count */}
      {totalCount > 0 && (
        <div className="px-2 pb-1 text-[9px] font-mono text-[var(--color-text-dim)]">
          TASKS {doneCount}/{totalCount}
        </div>
      )}

      {/* Task list — scrollable if overflow */}
      <div className="flex-1 px-1 overflow-hidden">
        <div className="space-y-0.5 max-h-[96px] overflow-y-auto">
          {tasks.map((task) => {
            const status = state.task_states[task.id]?.status ?? "pending"
            return (
              <TaskCheckbox
                key={task.id}
                task={task}
                status={status}
                onToggle={onToggleTask}
                compact
              />
            )
          })}
          {tasks.length === 0 && (
            <div className="text-[9px] text-[var(--color-text-dim)]/50 italic px-1 py-1">
              no phase tasks anchored
            </div>
          )}
        </div>
      </div>

      {/* Footer markers */}
      <div className="px-2 py-1 border-t border-[var(--color-border)]/60 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          {isPhaseEnd && (
            <div className="text-[8px] font-mono font-bold" style={{ color: phaseColor }}>
              ▶ EXIT
            </div>
          )}
          {isSoftLaunch && (
            <div className="text-[8px] font-mono font-bold text-[var(--color-amber)]">
              SOFT LAUNCH
            </div>
          )}
          {isPublicLaunch && (
            <div className="text-[8px] font-mono font-bold text-[var(--color-red)]">
              PUBLIC LAUNCH
            </div>
          )}
        </div>
        <div
          className="text-[8px] font-mono tracking-wide"
          style={{
            color: "#ef4444",
            borderLeft: "2px solid #ef4444",
            paddingLeft: 4,
          }}
          title="Hard stop time per sprint metadata"
        >
          STOP {hardStopTime}
        </div>
      </div>
    </div>
  )
}
