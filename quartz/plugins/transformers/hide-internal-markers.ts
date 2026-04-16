/**
 * hide-internal-markers.ts — convert internal roadmap markers to HTML comments at build time
 *
 * Per Vault Rules rule 4 and CLAUDE.md rule 8: placeholder markers stay in the
 * source markdown as internal roadmap signals, but readers should not see them.
 *
 * Converts at build time (textTransform stage, before any other plugin runs):
 *   - (URL NEEDED)      -> <!-- URL NEEDED -->
 *   - (UNVERIFIED)      -> <!-- UNVERIFIED -->
 *   - (NEEDS REVIEW)    -> <!-- NEEDS REVIEW -->
 *   - [JANITOR ...]     -> <!-- JANITOR: ... -->
 *   - [URL Check ...]   -> <!-- URL Check: ... -->
 *
 * The markers are preserved in view-source (as HTML comments) for future audit,
 * but readers don't see them in the rendered page. The source markdown in the
 * repo is untouched — this is a build-time-only transformation.
 *
 * See content/Vault Rules.md rule 4 for the rationale.
 */

import { QuartzTransformerPlugin } from "../types"

// Patterns: each one [regex with capture group, HTML comment template]
const PATTERNS: Array<[RegExp, (match: string, ...groups: string[]) => string]> = [
  // Standalone inline markers — all editorial signals, not for readers
  [/\(URL NEEDED\)/g, () => "<!-- URL NEEDED -->"],
  [/\(UNVERIFIED\)/g, () => "<!-- UNVERIFIED -->"],
  [/\(NEEDS REVIEW\)/g, () => "<!-- NEEDS REVIEW -->"],
  [/\(VERIFIED\)/g, () => "<!-- VERIFIED -->"],
  [/\(DEFAMATION-SANITIZED\)/g, () => "<!-- DEFAMATION-SANITIZED -->"],

  // Bracketed annotations like [JANITOR 2026-04-11] ... end of line
  // Only match when they appear in a paragraph context, not inside code blocks
  // (handled below by code-fence detection)
  [/^\s*\[JANITOR(?:\s+[^\]]+)?\]\s+([^\n]*)/gm, (_m, rest) => `<!-- JANITOR: ${rest.trim()} -->`],
  [/^\s*\[URL Check(?:\s+[^\]]+)?\]\s+([^\n]*)/gm, (_m, rest) => `<!-- URL Check: ${rest.trim()} -->`],
]

/**
 * Apply replacements while skipping fenced code blocks. Preserves ```code``` and ~~~code~~~
 * untouched so we don't mangle code examples that legitimately contain these strings.
 */
function transform(src: string): string {
  if (!/\(URL NEEDED\)|\(UNVERIFIED\)|\(NEEDS REVIEW\)|\(VERIFIED\)|\(DEFAMATION-SANITIZED\)|\[JANITOR|\[URL Check/.test(src)) {
    return src // fast path — nothing to do
  }

  // Split frontmatter from body. Never touch frontmatter — YAML parses fail
  // if our regexes rewrite inside field values. The pattern is: if the source
  // starts with a `---` line, the YAML frontmatter runs until the next `---`
  // line. Everything after that is body and safe to transform.
  const fmMatch = src.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/)
  const frontmatter = fmMatch ? fmMatch[1] : ""
  const body = fmMatch ? fmMatch[2] : src

  const lines = body.split("\n")
  let inFence = false
  let fenceMarker = ""
  const out: string[] = []

  for (const line of lines) {
    const fenceMatch = line.match(/^(\s*)(```+|~~~+)/)
    if (fenceMatch) {
      const marker = fenceMatch[2]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (line.trim().startsWith(fenceMarker)) {
        inFence = false
      }
      out.push(line)
      continue
    }

    if (inFence) {
      out.push(line)
      continue
    }

    let transformed = line
    for (const [re, repl] of PATTERNS) {
      // @ts-ignore — String.prototype.replace accepts a function here
      transformed = transformed.replace(re, repl)
    }
    out.push(transformed)
  }

  return frontmatter + out.join("\n")
}

export const HideInternalMarkers: QuartzTransformerPlugin = () => {
  return {
    name: "HideInternalMarkers",
    textTransform(_ctx, src) {
      return transform(src)
    },
  }
}
