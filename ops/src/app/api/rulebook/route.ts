import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { clearRulebookCache, loadRulebook, type Rulebook } from "@/lib/profile-type-rulebook"

// Resolve rulebook path from ops/ cwd or repo root (mirrors profile-type-rulebook.ts)
function rulebookPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "..", "config", "profile-type-rulebook.json"),
    path.resolve(process.cwd(), "config", "profile-type-rulebook.json"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

// Pull the authoritative check-id list from scripts/lib/checklist-helpers.cjs.
// That file is the single source of truth for what a check id means.
function loadCheckIds(): string[] {
  try {
    const helpersPath = path.resolve(
      process.cwd(),
      "..",
      "scripts",
      "lib",
      "checklist-helpers.cjs",
    )
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const helpers = require(helpersPath) as {
      CHECK_IDS?: () => string[]
      CHECKS?: Record<string, unknown>
    }
    const ids =
      (typeof helpers.CHECK_IDS === "function" && helpers.CHECK_IDS()) ||
      Object.keys(helpers.CHECKS || {})
    return ids.sort()
  } catch {
    return []
  }
}

const GATE_ENUM = ["auto", "manual", "none", "hybrid"] as const
const HEX = /^#[0-9a-f]{3,8}$/i

interface ValidationResult {
  ok: boolean
  errors: string[]
}

function validateRulebook(rb: unknown, validCheckIds: Set<string>): ValidationResult {
  const errors: string[] = []
  if (!rb || typeof rb !== "object") {
    return { ok: false, errors: ["Rulebook is not an object"] }
  }
  const r = rb as Record<string, unknown>
  if (typeof r.version !== "string") errors.push("version: must be a string")
  if (!Array.isArray(r["tier-order"])) errors.push("tier-order: must be an array")
  if (!r.types || typeof r.types !== "object") {
    errors.push("types: must be an object")
    return { ok: false, errors }
  }

  const types = r.types as Record<string, unknown>
  for (const [typeName, typeEntryRaw] of Object.entries(types)) {
    const ctx = `types.${typeName}`
    if (!typeEntryRaw || typeof typeEntryRaw !== "object") {
      errors.push(`${ctx}: must be an object`)
      continue
    }
    const te = typeEntryRaw as Record<string, unknown>
    if (typeof te.label !== "string" || !te.label.trim()) {
      errors.push(`${ctx}.label: required`)
    }

    // visual
    const visual = te.visual as Record<string, unknown> | undefined
    if (!visual) {
      errors.push(`${ctx}.visual: required`)
    } else {
      const cl = visual["color-light"]
      const cd = visual["color-dark"]
      const icon = visual.icon
      if (typeof cl !== "string" || !HEX.test(cl)) {
        errors.push(`${ctx}.visual.color-light: must be hex color, got ${JSON.stringify(cl)}`)
      }
      if (typeof cd !== "string" || !HEX.test(cd)) {
        errors.push(`${ctx}.visual.color-dark: must be hex color, got ${JSON.stringify(cd)}`)
      }
      if (typeof icon !== "string" || !icon.trim()) {
        errors.push(`${ctx}.visual.icon: required`)
      }
    }

    // base-rulebook.tiers
    const baseRB = te["base-rulebook"] as Record<string, unknown> | undefined
    if (!baseRB) {
      errors.push(`${ctx}.base-rulebook: required`)
      continue
    }
    const tiers = baseRB.tiers as Record<string, unknown> | undefined
    if (!tiers || typeof tiers !== "object") {
      errors.push(`${ctx}.base-rulebook.tiers: must be an object`)
      continue
    }

    for (const [tierName, tierEntryRaw] of Object.entries(tiers)) {
      const tctx = `${ctx}.base-rulebook.tiers.${tierName}`
      if (!tierEntryRaw || typeof tierEntryRaw !== "object") {
        errors.push(`${tctx}: must be an object`)
        continue
      }
      const tier = tierEntryRaw as { required?: unknown; recommended?: unknown }
      for (const field of ["required", "recommended"] as const) {
        const arr = tier[field]
        if (arr === undefined) continue
        if (!Array.isArray(arr)) {
          errors.push(`${tctx}.${field}: must be an array`)
          continue
        }
        for (const id of arr) {
          if (typeof id !== "string") {
            errors.push(`${tctx}.${field}: contains non-string`)
            continue
          }
          if (validCheckIds.size && !validCheckIds.has(id)) {
            errors.push(`${tctx}.${field}: unknown check id "${id}"`)
          }
        }
      }
    }

    // promotion-gate
    const gates = baseRB["promotion-gate"] as Record<string, unknown> | undefined
    if (gates) {
      for (const [gk, gv] of Object.entries(gates)) {
        if (typeof gv !== "string" || !(GATE_ENUM as readonly string[]).includes(gv)) {
          errors.push(
            `${ctx}.base-rulebook.promotion-gate.${gk}: must be one of ${GATE_ENUM.join("|")}`,
          )
        }
      }
    }

    // voice-scanned / hallucination-scanned flags must be boolean if set
    for (const flag of ["voice-scanned", "hallucination-scanned"] as const) {
      if (flag in te && typeof te[flag] !== "boolean") {
        errors.push(`${ctx}.${flag}: must be boolean`)
      }
    }

    // sub-categories
    const subs = te["sub-categories"] as Record<string, unknown> | undefined
    if (subs) {
      if (typeof subs !== "object") {
        errors.push(`${ctx}.sub-categories: must be an object`)
      } else {
        for (const [subName, subRaw] of Object.entries(subs)) {
          const sctx = `${ctx}.sub-categories.${subName}`
          if (!subRaw || typeof subRaw !== "object") {
            errors.push(`${sctx}: must be an object`)
            continue
          }
          const sub = subRaw as Record<string, unknown>
          if (typeof sub.label !== "string" || !sub.label.trim()) {
            errors.push(`${sctx}.label: required`)
          }
          const ov = sub.overrides as Record<string, unknown> | undefined
          if (!ov) continue
          // adds: { tier: [check-ids] }
          if (ov.adds) {
            if (typeof ov.adds !== "object" || Array.isArray(ov.adds)) {
              errors.push(`${sctx}.overrides.adds: must be an object`)
            } else {
              for (const [atier, aids] of Object.entries(ov.adds)) {
                if (!Array.isArray(aids)) {
                  errors.push(`${sctx}.overrides.adds.${atier}: must be an array`)
                  continue
                }
                for (const id of aids) {
                  if (typeof id !== "string") continue
                  if (validCheckIds.size && !validCheckIds.has(id)) {
                    errors.push(
                      `${sctx}.overrides.adds.${atier}: unknown check id "${id}"`,
                    )
                  }
                }
              }
            }
          }
          // removes: [check-ids]
          if (ov.removes !== undefined) {
            if (!Array.isArray(ov.removes)) {
              errors.push(`${sctx}.overrides.removes: must be an array`)
            } else {
              for (const id of ov.removes) {
                if (typeof id !== "string") continue
                if (validCheckIds.size && !validCheckIds.has(id)) {
                  errors.push(`${sctx}.overrides.removes: unknown check id "${id}"`)
                }
              }
            }
          }
          // replaces: { old: new }
          if (ov.replaces !== undefined) {
            if (typeof ov.replaces !== "object" || Array.isArray(ov.replaces)) {
              errors.push(`${sctx}.overrides.replaces: must be an object`)
            } else {
              for (const [oldId, newId] of Object.entries(ov.replaces as Record<string, unknown>)) {
                if (validCheckIds.size) {
                  if (!validCheckIds.has(oldId)) {
                    errors.push(
                      `${sctx}.overrides.replaces: unknown source check id "${oldId}"`,
                    )
                  }
                  if (typeof newId === "string" && !validCheckIds.has(newId)) {
                    errors.push(
                      `${sctx}.overrides.replaces: unknown target check id "${newId}"`,
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

export async function GET() {
  try {
    clearRulebookCache()
    const rulebook = loadRulebook()
    const checkIds = loadCheckIds()
    return NextResponse.json({
      rulebook,
      checkIds,
      gates: GATE_ENUM,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const incoming = body?.rulebook
    if (!incoming) {
      return NextResponse.json({ error: "Missing rulebook in body" }, { status: 400 })
    }

    const validCheckIds = new Set(loadCheckIds())
    const result = validateRulebook(incoming, validCheckIds)
    if (!result.ok) {
      return NextResponse.json(
        { error: "Validation failed", details: result.errors },
        { status: 422 },
      )
    }

    // Stamp last-updated to today (YYYY-MM-DD local)
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    ;(incoming as Rulebook)["last-updated"] = today

    const target = rulebookPath()
    const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
    const json = JSON.stringify(incoming, null, 2) + "\n"
    fs.writeFileSync(tmp, json, "utf-8")
    fs.renameSync(tmp, target)
    clearRulebookCache()

    return NextResponse.json({ ok: true, "last-updated": today })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
