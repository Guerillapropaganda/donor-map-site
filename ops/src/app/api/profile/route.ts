import { NextResponse } from "next/server"
import { getFileContent } from "@/lib/github"
import { parseProfile, countSources, extractUrls } from "@/lib/vault"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  if (!path) {
    return NextResponse.json({ error: "path parameter required" }, { status: 400 })
  }

  try {
    const content = await getFileContent(path)
    const profile = parseProfile(path, content)
    const sources = countSources(content)
    const urls = extractUrls(content)

    return NextResponse.json({ profile, sources, urls, raw: content })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
