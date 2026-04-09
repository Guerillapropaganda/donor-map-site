import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const VAULT_ROOT = path.resolve(process.cwd(), "..")

interface RuleDoc {
  name: string
  path: string
  content: string
  lastModified: string
  sizeKb: number
}

export async function GET() {
  try {
    const docs = [
      { name: "Vault Rules", file: "content/Vault Rules.md" },
      { name: "CLAUDE.md", file: "CLAUDE.md" },
      { name: "Pipeline Guide", file: "content/Pipeline Guide.md" },
      { name: "Pipeline Issues", file: "content/Pipeline Guide - Known Issues.md" },
    ]

    const results: RuleDoc[] = []

    for (const doc of docs) {
      const fullPath = path.join(VAULT_ROOT, doc.file)
      if (!fs.existsSync(fullPath)) {
        results.push({
          name: doc.name,
          path: doc.file,
          content: `File not found: ${doc.file}`,
          lastModified: "unknown",
          sizeKb: 0,
        })
        continue
      }
      const stat = fs.statSync(fullPath)
      const content = fs.readFileSync(fullPath, "utf-8")
      results.push({
        name: doc.name,
        path: doc.file,
        content,
        lastModified: stat.mtime.toISOString(),
        sizeKb: Math.round(stat.size / 1024),
      })
    }

    return NextResponse.json({ docs: results })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
