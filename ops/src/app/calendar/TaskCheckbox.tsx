"use client"

import type { Task, TaskStatus } from "./types"
import { OWNER_COLORS, OWNER_LABELS } from "./types"

interface Props {
  task: Task & { phase: string; owner: string }
  status: TaskStatus
  onToggle: (taskId: string, status: TaskStatus) => void
  compact?: boolean
}

export function TaskCheckbox({ task, status, onToggle, compact = false }: Props) {
  const done = status === "done"
  const blocked = status === "blocked"
  const inProgress = status === "in_progress"
  const ownerColor = OWNER_COLORS[task.owner] ?? "#7a7a86"
  const ownerLabel = OWNER_LABELS[task.owner] ?? "??"

  const statusIcon = done ? "☒" : blocked ? "⛌" : inProgress ? "◐" : "☐"
  const statusColor = done
    ? "#22c55e"
    : blocked
    ? "#ef4444"
    : inProgress
    ? "#f59e0b"
    : "#7a7a86"

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        if (!blocked) onToggle(task.id, status)
      }}
      disabled={blocked}
      className={`w-full text-left flex items-start gap-1.5 py-0.5 px-1 hover:bg-[var(--color-bg-hover)] transition-colors group ${
        blocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      }`}
      title={blocked ? `BLOCKED: ${task.blocker ?? "see task"}` : task.task}
    >
      <span className="font-mono text-[11px] leading-4 flex-shrink-0" style={{ color: statusColor }}>
        {statusIcon}
      </span>
      <span
        className="font-mono text-[8px] leading-4 flex-shrink-0 px-1 border"
        style={{ color: ownerColor, borderColor: ownerColor + "80" }}
      >
        {ownerLabel}
      </span>
      <span
        className={`text-[10px] leading-4 flex-1 min-w-0 ${
          done ? "line-through text-[var(--color-text-dim)]" : "text-[var(--color-text)]"
        } ${compact ? "truncate" : ""}`}
      >
        {task.id}{" "}
        <span className={done ? "text-[var(--color-text-dim)]" : "text-[var(--color-text-dim)]"}>
          {compact ? task.task.slice(0, 38) + (task.task.length > 38 ? "…" : "") : task.task}
        </span>
      </span>
    </button>
  )
}
