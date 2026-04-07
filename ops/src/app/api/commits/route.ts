import { NextResponse } from "next/server"
import { getRecentCommits } from "@/lib/github"

export async function GET() {
  try {
    const commits = await getRecentCommits(20)
    return NextResponse.json({ commits })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
