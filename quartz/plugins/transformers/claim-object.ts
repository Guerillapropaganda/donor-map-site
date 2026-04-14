/**
 * claim-object.ts — Quartz transformer for Phase 4 claim-object profiles
 *
 * When a markdown file has `claim-object: true` in its frontmatter AND
 * a matching `claims-slug: {slug}` field, this transformer replaces
 * the body of the file at the textTransform stage with a rendering
 * assembled from:
 *
 *   data/claims/{slug}.jsonl           — the load-bearing facts
 *   data/claims/{slug}-synthesis.md    — the interpretive prose scaffold
 *
 * The synthesis file uses `<!-- CLAIMS: section_key -->` markers. At
 * render time, each marker is replaced with the bulleted list of
 * claims whose section_key matches. This lets the editor write prose
 * in one place and the facts flow in structurally.
 *
 * Frontmatter is preserved. Only the body gets swapped.
 *
 * This runs BEFORE ObsidianFlavoredMarkdown and SourceRefs in the
 * textTransform chain, so wikilinks and `{{src:ID}}` refs in the
 * synthesis file still work naturally.
 *
 * See:
 *   content/Phases/phase-4/handoff.md — experiment design
 *   scripts/lib/claims-schema.cjs     — claim record shape
 *   ADR-0003                          — Phase 4 authority
 */

import { QuartzTransformerPlugin } from "../types"
import {
  loadClaimsForProfile,
  loadSynthesis,
  type ClaimRecord,
} from "../../util/claims-store"

// Short-circuit check: does the raw markdown opt into claim-object
// rendering? We match the exact frontmatter key to avoid false
// positives from body text.
function shouldRender(src: string): { enabled: boolean; slug: string | null } {
  const fmMatch = src.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) return { enabled: false, slug: null }
  const fm = fmMatch[1]
  const enabled = /^claim-object:\s*true\s*$/m.test(fm)
  if (!enabled) return { enabled: false, slug: null }
  const slugMatch = fm.match(/^claims-slug:\s*["']?([a-z0-9_-]+)["']?\s*$/m)
  const slug = slugMatch ? slugMatch[1] : null
  return { enabled, slug }
}

function renderClaim(claim: ClaimRecord): string {
  const cite = claim.source_ref
    ? `{{src:${claim.source_ref}}}`
    : claim.source_fallback_url
      ? `[source](${claim.source_fallback_url})`
      : "_(no source)_"
  return `- ${claim.text} ${cite}`
}

function renderClaimSection(claims: ClaimRecord[], sectionKey: string): string {
  const matching = claims.filter((c) => c.section_key === sectionKey)
  if (!matching.length) return "_(no claims for this section yet)_"
  return matching.map(renderClaim).join("\n")
}

function assembleBody(synthesis: string, claims: ClaimRecord[]): string {
  // Replace `<!-- CLAIMS: section_key -->` markers with the bulleted
  // list of matching claims.
  return synthesis.replace(/<!--\s*CLAIMS:\s*([a-z0-9_-]+)\s*-->/g, (_match, sectionKey) => {
    return renderClaimSection(claims, String(sectionKey))
  })
}

export const ClaimObject: QuartzTransformerPlugin = () => {
  return {
    name: "ClaimObject",
    textTransform(_ctx, src) {
      const { enabled, slug } = shouldRender(src)
      if (!enabled) return src

      if (!slug) {
        // Opted in but no slug — leave a visible warning in the body
        return src.replace(
          /^---\s*\n[\s\S]*?\n---\s*\n/,
          (frontmatter) =>
            frontmatter +
            "\n> ⚠ `claim-object: true` frontmatter is set but no `claims-slug` — claim-object rendering skipped. Add `claims-slug: {name}` to enable.\n\n",
        )
      }

      const claims = loadClaimsForProfile(slug)
      const synthesis = loadSynthesis(slug)

      if (!synthesis) {
        return src.replace(
          /^---\s*\n[\s\S]*?\n---\s*\n/,
          (frontmatter) =>
            frontmatter +
            `\n> ⚠ \`claim-object\` profile for \`${slug}\` has no synthesis file at \`data/claims/${slug}-synthesis.md\`. Claim count: ${claims.length}.\n\n`,
        )
      }

      const body = assembleBody(synthesis, claims)

      // Preserve frontmatter, replace body
      const fmMatch = src.match(/^---\s*\n[\s\S]*?\n---\s*\n/)
      if (!fmMatch) return src // shouldn't happen; shouldRender checked
      return fmMatch[0] + "\n" + body + "\n"
    },
  }
}
