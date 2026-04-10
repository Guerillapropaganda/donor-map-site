"use client"

import { useMemo } from "react"
import type { SprintSchedule, SprintState, TaskStatus } from "./types"
import { tasksByDay, PHASE_COLORS } from "./types"
import { sprintDays, phaseForDate } from "./utils"
import { DayCell } from "./DayCell"

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

interface Props {
  schedule: SprintSchedule
  state: SprintState
  today: string
  onToggleTask: (taskId: string, status: TaskStatus) => void
  onOpenDay: (date: string) => void
}

export function MonthGrid({ schedule, state, today, onToggleTask, onOpenDay }: Props) {
  const days = useMemo(() => sprintDays(schedule.metadata), [schedule.metadata])
  const byDay = useMemo(() => tasksByDay(schedule), [schedule])

  // Build weeks: Mon-Sun columns. Pad the first week with empty cells for any
  // weekday before the sprint start, and the last week with empty cells after.
  const weeks = useMemo(() => {
    const rows: (string | null)[][] = []
    let current: (string | null)[] = []

    // Weekday index: Mon=0, Sun=6 (JS getUTCDay: Sun=0, Mon=1 ... Sat=6)
    const mondayIndex = (iso: string) => {
      const day = new Date(iso + "T00:00:00Z").getUTCDay()
      return (day + 6) % 7 // Mon=0
    }

    // Pad the leading empty cells of week 1
    const firstMondayIdx = mondayIndex(days[0])
    for (let i = 0; i < firstMondayIdx; i++) current.push(null)

    for (const d of days) {
      current.push(d)
      if (mondayIndex(d) === 6) {
        rows.push(current)
        current = []
      }
    }
    if (current.length) {
      while (current.length < 7) current.push(null)
      rows.push(current)
    }
    return rows
  }, [days])

  return (
    <section className="space-y-2">
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-[10px] tracking-[0.25em] font-mono text-[var(--color-text-dim)] px-2 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-2">
          {week.map((date, di) => {
            if (!date) {
              return <div key={di} className="min-h-[160px]" />
            }
            const phase = phaseForDate(schedule.phases, date)
            const phaseId = phase?.id ?? null
            const dayTasks = byDay[date] ?? []
            const isToday = date === today
            const isPhaseEnd = phase && date === phase.end
            const isSoftLaunch = date === "2026-04-27"
            const isPublicLaunch = date === "2026-04-30"

            return (
              <DayCell
                key={date}
                date={date}
                phaseId={phaseId}
                phaseName={phase?.name ?? ""}
                phaseStart={phase?.start ?? ""}
                tasks={dayTasks}
                state={state}
                isToday={isToday}
                isPhaseEnd={!!isPhaseEnd}
                isSoftLaunch={isSoftLaunch}
                isPublicLaunch={isPublicLaunch}
                hardStopTime={schedule.metadata.hard_stop_time}
                onToggleTask={onToggleTask}
                onOpen={() => onOpenDay(date)}
              />
            )
          })}
        </div>
      ))}

      {/* Anchor targets for phase-bar links */}
      {schedule.phases.map((p) => (
        <div key={p.id} id={p.id} className="h-0" />
      ))}

      {/* Phase-key helper */}
      <div className="text-[9px] text-[var(--color-text-dim)] font-mono mt-2">
        PHASE DOTS:{" "}
        {Object.entries(PHASE_COLORS).map(([id, info]) => (
          <span key={id} className="mr-3">
            <span className="inline-block w-2 h-2 mr-1 align-middle" style={{ backgroundColor: info.hex }} />
            {info.label}
          </span>
        ))}
      </div>
    </section>
  )
}
