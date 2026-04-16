import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const ROOT = process.cwd().replace(/[\\\/]ops$/, "")
const AUDIT_FILE = path.join(ROOT, "content", "Admin Notes", "launch-50-audit.json")
const SIGNOFF_FILE = path.join(process.cwd(), "data", "launch-50-signoff.json")

interface AuditRow {
  name: string
  file?: string
  missing?: boolean
  err?: string
  readiness?: string
  type?: string
  hasClassAnalysis?: boolean
  sourceCount?: number
  urlNeeded?: number
  unverified?: number
  needsReview?: number
  autoBlocks?: number
  hasGaps?: boolean
}

interface SignoffState {
  [name: string]: {
    classAnalysisWritten?: boolean
    urlsVerified?: boolean
    davidReviewed?: boolean
    promotedToVerified?: boolean
    notes?: string
    updatedAt?: string
  }
}

function ensureDir() {
  const dir = path.dirname(SIGNOFF_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readAudit(): { politicians: AuditRow[]; donors: AuditRow[]; corporations: AuditRow[] } {
  if (!fs.existsSync(AUDIT_FILE)) {
    return { politicians: [], donors: [], corporations: [] }
  }
  return JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8"))
}

function readSignoff(): SignoffState {
  ensureDir()
  if (!fs.existsSync(SIGNOFF_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(SIGNOFF_FILE, "utf-8"))
  } catch {
    return {}
  }
}

function writeSignoff(data: SignoffState) {
  ensureDir()
  fs.writeFileSync(SIGNOFF_FILE, JSON.stringify(data, null, 2))
}

export async function GET() {
  try {
    const audit = readAudit()
    const signoff = readSignoff()
    return NextResponse.json({ audit, signoff, auditFileExists: fs.existsSync(AUDIT_FILE) })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { name, updates } = body
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 })
    }
    const data = readSignoff()
    data[name] = { ...data[name], ...updates, updatedAt: new Date().toISOString() }
    writeSignoff(data)
    return NextResponse.json({ ok: true, record: data[name] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
