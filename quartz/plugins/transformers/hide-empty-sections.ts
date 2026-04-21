/**
 * hide-empty-sections.ts — ADR-0017
 *
 * On `content-readiness: data-complete` profiles, editorial sections that
 * Research Claude would normally populate (Who They Are, Class Analysis,
 * The Contradictions) may be missing. Rendering them as empty H2 headers
 * looks broken. This transformer strips any H2 whose body contains only
 * whitespace / HTML comments before the next H2 or end-of-document.
 *
 * Only runs when the profile frontmatter declares
 * `content-readiness: data-complete`. Verified profiles are never stripped —
 * if a verified profile has an empty section, that's a template violation
 * the `profile-template-validator` is supposed to catch.
 *
 * Implementation detail: we work at the text-transform stage on the raw
 * markdown string (same stage as hide-internal-markers). Parsing the AST
 * would be more precise but over-engineered for the "empty between two
 * headers" pattern.
 */

import { QuartzTransformerPlugin } from "../types"

const READINESS_FIELD = /^content-readiness:\s*(['"]?)([a-z-]+)\1\s*$/im

function isDataComplete(src: string): boolean {
  // Only inspect the frontmatter block
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!fm) return false
  const m = fm[1].match(READINESS_FIELD)
  return m?.[2] === "data-complete"
}

function sectionIsEmpty(sectionBody: string): boolean {
  // Remove HTML comments + whitespace. What's left is either substantive or not.
  const stripped = sectionBody
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, "")
  return stripped.length === 0
}

function transform(src: string): string {
  if (!isDataComplete(src)) return src

  // Preserve frontmatter untouched
  const fmMatch = src.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/)
  const frontmatter = fmMatch ? fmMatch[1] : ""
  const body = fmMatch ? fmMatch[2] : src

  // Split body into segments at each H2. Keep the H2 lines with their
  // subsequent content so we can decide per-segment whether to emit.
  const lines = body.split(/\r?\n/)
  type Seg = { header: string | null; body: string[] }
  const segments: Seg[] = [{ header: null, body: [] }]
  let inFence = false
  let fenceMarker = ""

  for (const line of lines) {
    const fence = line.match(/^(\s*)(```+|~~~+)/)
    if (fence) {
      const marker = fence[2]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (line.trim().startsWith(fenceMarker)) {
        inFence = false
      }
      segments[segments.length - 1].body.push(line)
      continue
    }
    if (inFence) {
      segments[segments.length - 1].body.push(line)
      continue
    }
    if (/^##\s+/.test(line)) {
      segments.push({ header: line, body: [] })
    } else {
      segments[segments.length - 1].body.push(line)
    }
  }

  // Emit: keep preamble (segments[0]) always. For each H2 segment, drop
  // the header + its body if the body is empty after comment stripping.
  const out: string[] = []
  out.push(segments[0].body.join("\n"))
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i]
    const body = seg.body.join("\n")
    if (sectionIsEmpty(body)) continue
    out.push(seg.header ?? "")
    out.push(body)
  }

  return frontmatter + out.join("\n")
}

export const HideEmptySections: QuartzTransformerPlugin = () => {
  return {
    name: "HideEmptySections",
    textTransform(_ctx, src) {
      return transform(src)
    },
  }
}
