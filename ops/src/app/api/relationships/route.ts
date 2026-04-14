/**
 * /api/relationships — POST/DELETE a relationship between two profiles
 *
 * Phase 3 Part 3b (2026-04-11): POST and DELETE now upsert the canonical
 * JSONL edge store via ops/src/lib/relationships-store.ts's subprocess
 * wrappers (buildEdge + upsertEdge + deprecateEdge). The frontmatter
 * write is PRESERVED during the migration window so Quartz components
 * (which still read frontmatter as of this commit) continue to work.
 * Once Phase 3 Part 4 retargets those components, the frontmatter write
 * can be removed.
 *
 * Read behavior (mirroring the pre-Phase-3-Part-3b route):
 *   - Reject if the connection already exists (in frontmatter OR body OR
 *     the canonical edge store)
 *   - Check body-text legacy fields for backward compatibility
 *   - Add to the body-text field if one exists (legacy pattern), otherwise
 *     append to frontmatter, preserving the existing shape (string vs
 *     YAML list)
 *
 * Write behavior (new):
 *   1. Build a schema-complete edge via buildEdge() (resolves type,
 *      subcategory, id, direction from the title index + TYPE_META)
 *   2. Upsert into data/relationships.jsonl via upsertEdge()
 *   3. Also update frontmatter (legacy path) so Quartz consumers see
 *      the change immediately
 *   4. Invalidate the /api/connections cache
 *
 * Type mapping (legacy → Phase 3 edge type):
 *   related  → related
 *   donors   → monetary (REVERSE direction: legacy "profile has X in
 *              donors:" means X gave money TO profile. JSONL stores as
 *              from: donor, to: recipient. We flip source/target for
 *              the buildEdge call so the stored edge is correct.)
 *   opposes  → political-opposition
 *   stories  → story-link (role="mentioned" default)
 */
import { NextResponse } from "next/server"
import matter from "gray-matter"
import { readFile, writeAndPush } from "@/lib/local-write"
import {
  buildEdge,
  upsertEdge,
  deprecateEdge,
  clearEdgesCache,
  legacyToPhase3Type,
  endpointsForLegacyWrite,
  LEGACY_RELATIONSHIP_TYPES,
  type LegacyRelationshipType,
  type RelationshipEdge,
} from "@/lib/relationships-store"

const VALID_TYPES = LEGACY_RELATIONSHIP_TYPES
type LegacyType = LegacyRelationshipType

// Find and remove a wikilink from a body-text field line
function removeFromBodyField(body: string, field: string, targetTitle: string): { updated: string; found: boolean } {
  const regex = new RegExp(`^(${field}:\\s*)(.+)$`, "m")
  const match = body.match(regex)
  if (!match) return { updated: body, found: false }

  const line = match[2]
  if (!line.includes(targetTitle)) return { updated: body, found: false }

  const links = line.split("·").map((s) => s.trim()).filter((s) => !s.includes(targetTitle))
  if (links.length === 0) {
    return { updated: body.replace(regex, "").replace(/\n{3,}/g, "\n\n"), found: true }
  }
  return { updated: body.replace(regex, `${match[1]}${links.join(" · ")}`), found: true }
}

// Add a wikilink to a body-text field line
function addToBodyField(body: string, field: string, targetTitle: string): string {
  const wikilink = `[[${targetTitle}]]`
  const regex = new RegExp(`^(${field}:\\s*)(.+)$`, "m")
  const match = body.match(regex)
  if (match) {
    return body.replace(regex, `${match[1]}${match[2]} · ${wikilink}`)
  }
  return body
}

function normalizeFieldForCheck(value: unknown): string {
  if (!value) return ""
  if (Array.isArray(value)) return value.map((s) => String(s)).join(" · ").toLowerCase()
  return String(value).toLowerCase()
}

/**
 * Append a wikilink to a frontmatter field value, preserving its existing shape.
 * CRITICAL: never stringify an array via template literal — that was the
 * April 2026 Sheldon Whitehouse bug. See Pipeline Guide § Known incidents.
 */
function appendRelationship(existing: unknown, targetTitle: string): string | string[] {
  const wikilink = `[[${targetTitle}]]`
  if (Array.isArray(existing)) {
    return [...existing.map((s) => String(s)), targetTitle]
  }
  if (existing) {
    return `${String(existing)} · ${wikilink}`
  }
  return wikilink
}

// POST — add a relationship between two profiles
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourcePath, targetTitle, relationshipType } = body

    if (!sourcePath || !targetTitle || !relationshipType) {
      return NextResponse.json({ error: "sourcePath, targetTitle, and relationshipType required" }, { status: 400 })
    }

    if (!VALID_TYPES.includes(relationshipType as LegacyType)) {
      return NextResponse.json({ error: `relationshipType must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 })
    }
    const legacyType = relationshipType as LegacyType

    const content = readFile(sourcePath)
    const { data: fm, content: bodyContent } = matter(content)
    const sourceTitle = typeof fm.title === "string" ? fm.title : ""

    // Check both frontmatter and body for existing connection
    const fmValue = fm[legacyType]
    const fmValueNormalized = normalizeFieldForCheck(fmValue)
    if (fmValueNormalized && fmValueNormalized.includes(targetTitle.toLowerCase())) {
      return NextResponse.json({ error: "Connection already exists", existing: true }, { status: 409 })
    }
    if (
      bodyContent.match(
        new RegExp(`^${legacyType}:.*${targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"),
      )
    ) {
      return NextResponse.json({ error: "Connection already exists in body text", existing: true }, { status: 409 })
    }

    // ─── Phase 3: build + upsert canonical edge ─────────────────────
    // If either endpoint isn't in the title index (e.g. user is linking
    // to a profile that doesn't exist yet) we still update frontmatter
    // but skip the JSONL write. The next discovery-scanner run will
    // pick it up once the profile is created.
    let phase3Status: {
      edgeId?: string
      upserted?: boolean
      skipReason?: string
    } = {}
    const { from: edgeFrom, to: edgeTo } = endpointsForLegacyWrite(legacyType, sourceTitle, targetTitle)
    const phase3Type = legacyToPhase3Type(legacyType)
    // Confidence: manual-ops edges start at 0.7 (medium). Research Claude
    // or human editorial review can upgrade them further; the scanner's
    // next pass can also bump them if Tier 1 data confirms.
    const edgeInput = {
      from: edgeFrom,
      to: edgeTo,
      type: phase3Type,
      source: "manual-ops" as const,
      confidence: 0.7,
      role: phase3Type === "story-link" ? "mentioned" : null,
    }
    const builtEdge = buildEdge(edgeInput)
    if (!builtEdge) {
      phase3Status = { skipReason: "endpoint not in title index (profile may not exist yet)" }
    } else {
      const upsertResult = upsertEdge(builtEdge as Partial<RelationshipEdge>)
      if (upsertResult.invalid > 0) {
        phase3Status = { skipReason: `validator rejected: ${upsertResult.errors[0]?.error || "unknown"}` }
      } else {
        phase3Status = { edgeId: builtEdge.id, upserted: true }
      }
    }

    // ─── Legacy: update frontmatter/body (for Quartz consumers) ─────
    const bodyRegex = new RegExp(`^${legacyType}:\\s*.+$`, "m")
    let updatedBody = bodyContent
    if (bodyRegex.test(bodyContent)) {
      updatedBody = addToBodyField(bodyContent, legacyType, targetTitle)
    } else {
      fm[legacyType] = appendRelationship(fmValue, targetTitle)
    }

    fm["last-updated"] = new Date().toISOString().split("T")[0]

    const updated = matter.stringify(updatedBody, fm)
    writeAndPush(sourcePath, updated, `Add ${legacyType} connection: ${fm.title || sourcePath} → ${targetTitle}`)

    invalidateCache()
    clearEdgesCache()

    return NextResponse.json({
      success: true,
      field: legacyType,
      phase3: phase3Status,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — remove a relationship
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { sourcePath, targetTitle, relationshipType } = body

    if (!sourcePath || !targetTitle || !relationshipType) {
      return NextResponse.json({ error: "sourcePath, targetTitle, and relationshipType required" }, { status: 400 })
    }
    if (!VALID_TYPES.includes(relationshipType as LegacyType)) {
      return NextResponse.json({ error: `relationshipType must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 })
    }
    const legacyType = relationshipType as LegacyType

    const content = readFile(sourcePath)
    const { data: fm, content: bodyContent } = matter(content)
    const sourceTitle = typeof fm.title === "string" ? fm.title : ""

    // ─── Legacy: remove from frontmatter/body ──────────────────────
    let foundInFrontmatterOrBody = false
    let updatedBody = bodyContent

    const fmValue = fm[legacyType]
    if (Array.isArray(fmValue)) {
      const targetLower = targetTitle.toLowerCase()
      const filtered = fmValue.filter((item) => !String(item).toLowerCase().includes(targetLower))
      if (filtered.length !== fmValue.length) {
        if (filtered.length === 0) delete fm[legacyType]
        else fm[legacyType] = filtered
        foundInFrontmatterOrBody = true
      }
    } else if (typeof fmValue === "string" && fmValue.includes(targetTitle)) {
      const links = fmValue.split("·").map((s: string) => s.trim()).filter((s: string) => !s.includes(targetTitle))
      if (links.length === 0) delete fm[legacyType]
      else fm[legacyType] = links.join(" · ")
      foundInFrontmatterOrBody = true
    }

    if (!foundInFrontmatterOrBody) {
      const result = removeFromBodyField(bodyContent, legacyType, targetTitle)
      if (result.found) {
        updatedBody = result.updated
        foundInFrontmatterOrBody = true
      }
    }

    // ─── Phase 3: deprecate canonical edge ─────────────────────────
    // We look up the matching edge by re-computing its id from the
    // endpoints + type, then flip its status to "deprecated" in the
    // store. If the frontmatter had the connection but the JSONL
    // doesn't (e.g. user deleted before the next discovery-scanner
    // tick), we still return success from the frontmatter delete.
    let phase3Status: { edgeId?: string; deprecated?: boolean; skipReason?: string } = {}
    const { from: edgeFrom, to: edgeTo } = endpointsForLegacyWrite(legacyType, sourceTitle, targetTitle)
    const phase3Type = legacyToPhase3Type(legacyType)
    // Build a minimal edge to compute the id. buildEdge does the
    // title-index resolve, direction flip, and id hash in one shot.
    const builtEdge = buildEdge({
      from: edgeFrom,
      to: edgeTo,
      type: phase3Type,
      source: "manual-ops",
      confidence: 0.7,
      role: phase3Type === "story-link" ? "mentioned" : null,
    })
    if (builtEdge) {
      const deprResult = deprecateEdge(builtEdge.id)
      if (deprResult.ok) {
        phase3Status = { edgeId: builtEdge.id, deprecated: true }
      } else {
        phase3Status = { edgeId: builtEdge.id, skipReason: deprResult.error || "not found in store" }
      }
    } else {
      phase3Status = { skipReason: "endpoint not in title index" }
    }

    if (!foundInFrontmatterOrBody && !phase3Status.deprecated) {
      return NextResponse.json({ error: `Connection not found in ${legacyType}` }, { status: 404 })
    }

    if (foundInFrontmatterOrBody) {
      fm["last-updated"] = new Date().toISOString().split("T")[0]
      const updated = matter.stringify(updatedBody, fm)
      writeAndPush(sourcePath, updated, `Remove ${legacyType} connection: ${fm.title || sourcePath} ✕ ${targetTitle}`)
    }

    invalidateCache()
    clearEdgesCache()

    return NextResponse.json({
      success: true,
      phase3: phase3Status,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function invalidateCache() {
  try {
    ;(globalThis as Record<string, unknown>).__connectionsInvalidated = Date.now()
  } catch {
    /* skip */
  }
}
