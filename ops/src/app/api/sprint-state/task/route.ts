import { NextResponse } from "next/server"
import { updateTaskState, type TaskStatus } from "@/lib/sprint-state"

// POST /api/sprint-state/task
// body: { taskId: string, status: TaskStatus, ...extras }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      taskId?: string
      status?: TaskStatus
      blocked_reason?: string
      progress?: { current: number; target: number }
    }
    if (!body.taskId || !body.status) {
      return NextResponse.json({ error: "taskId and status required" }, { status: 400 })
    }
    const next = await updateTaskState(body.taskId, {
      status: body.status,
      blocked_reason: body.blocked_reason,
      progress: body.progress,
    })
    return NextResponse.json(next)
  } catch (err) {
    console.error("[sprint-state/task POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update task" },
      { status: 500 }
    )
  }
}
