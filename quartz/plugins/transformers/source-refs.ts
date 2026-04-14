/**
 * source-refs.ts — Quartz transformer that resolves {{src:ID}} refs
 *
 * Part of Phase 1 — Source Registry. Profiles can cite sources using the
 * compact reference syntax `{{src:src_000123}}`, and this plugin rewrites
 * them to normal markdown links at build time using data/sources.jsonl as
 * the registry.
 *
 * Runs at the textTransform stage (earliest pipeline step), so the resulting
 * markdown links are picked up by every downstream plugin (wikilinks, link
 * crawling, etc.) just like hand-written links.
 *
 * Unknown IDs are left unchanged as `{{src:ID}}` — visible to the editor
 * and easy to grep for. Malformed records silently fall back to the raw URL.
 *
 * See:
 *   scripts/lib/sources-store.cjs — the writer (Node CJS)
 *   quartz/util/sources-store.ts  — the reader (Quartz TS)
 *   content/Phases/phase-1/handoff.md — build plan context
 */

import { QuartzTransformerPlugin } from "../types"
import { resolveSourceLink, loadSources } from "../../util/sources-store"

// Escape square brackets and parens so they don't break the markdown link
// syntax we're generating. Titles can contain characters that would otherwise
// terminate the link early.
function escapeMarkdownLinkText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]")
}

function escapeMarkdownUrl(url: string): string {
  // Parentheses in URLs need escaping inside markdown link targets
  return url.replace(/\(/g, "%28").replace(/\)/g, "%29")
}

const SRC_REF_RE = /\{\{src:(src_\d{6})\}\}/g

export const SourceRefs: QuartzTransformerPlugin = () => {
  let loaded = false
  return {
    name: "SourceRefs",
    textTransform(_ctx, src) {
      // Lazy-load the registry on first use. Subsequent invocations during
      // the same build are near-free.
      if (!loaded) {
        loadSources()
        loaded = true
      }

      if (!src.includes("{{src:")) return src

      return src.replace(SRC_REF_RE, (match, id: string) => {
        const link = resolveSourceLink(id)
        if (!link) return match // unknown id — leave literal for editor to see
        const title = escapeMarkdownLinkText(link.title)
        const url = escapeMarkdownUrl(link.url)
        return `[${title}](${url})`
      })
    },
  }
}
