/**
 * edge-role-taxonomy.ts — Ops adapter for scripts/lib/edge-role-taxonomy.cjs
 *
 * The canonical classifier lives in CJS so Node scripts + the Quartz
 * build share one source of truth. This file mirrors query-engine.ts's
 * lazy-load-via-dynamic-import pattern so Next/Turbopack can't try to
 * rewrite the require at build time.
 */

import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"

let _taxModulePromise: Promise<any> | null = null

function loadTaxonomyModule(): Promise<any> {
  if (_taxModulePromise) return _taxModulePromise

  _taxModulePromise = (async () => {
    function findRepoRoot(startDir: string): string {
      let dir = startDir
      for (let i = 0; i < 8; i++) {
        if (fs.existsSync(path.join(dir, "scripts", "lib", "edge-role-taxonomy.cjs"))) return dir
        if (fs.existsSync(path.join(dir, ".git"))) return dir
        const parent = path.dirname(dir)
        if (parent === dir) break
        dir = parent
      }
      return startDir
    }

    const cwd = process.cwd()
    const root = findRepoRoot(cwd)
    const taxPath = path.join(root, "scripts", "lib", "edge-role-taxonomy.cjs")

    if (!fs.existsSync(taxPath)) {
      throw new Error(`edge-role-taxonomy.cjs not found. Tried: ${taxPath}.`)
    }

    const url = pathToFileURL(taxPath).href
    const mod = await import(/* webpackIgnore: true */ /* @vite-ignore */ url)
    return mod.default ?? mod
  })()

  return _taxModulePromise
}

export type EdgeClassification = {
  category: string
  label: string
  bucket: string
  countsAsMoneyReceived: boolean
  countsAsMoneyGiven: boolean
  description: string
}

export async function classifyEdge(edge: any): Promise<EdgeClassification> {
  const mod = await loadTaxonomyModule()
  return mod.classifyEdge(edge)
}

// Sync variant — safe to call only after an async priming call has
// happened in the same request. We prime in handleSummary before
// calling synchronously in the fact-bits loop.
let _syncClassify: ((e: any) => EdgeClassification) | null = null
let _syncSumDedup: ((edges: any[]) => number) | null = null
export async function primeClassifier(): Promise<void> {
  if (_syncClassify && _syncSumDedup) return
  const mod = await loadTaxonomyModule()
  _syncClassify = mod.classifyEdge
  _syncSumDedup = mod.sumMonetaryEdgesDedup
}
export function classifyEdgeSync(edge: any): EdgeClassification {
  if (!_syncClassify) {
    throw new Error("classifyEdgeSync called before primeClassifier()")
  }
  return _syncClassify(edge)
}
// Dedupe-aware sum for monetary edges. Resolves the fec-api
// (lifetime-cumulative) vs fec-pas2 (per-transaction) double-count
// by using max(lifetime, sum-of-per-cycle) per (from, to, role) pair.
export function sumMonetaryEdgesDedupSync(edges: any[]): number {
  if (!_syncSumDedup) {
    throw new Error("sumMonetaryEdgesDedupSync called before primeClassifier()")
  }
  return _syncSumDedup(edges)
}

export const CATEGORIES = {
  DIRECT_CONTRIBUTION: "direct-contribution",
  IE_SUPPORT: "ie-support",
  IE_OPPOSE: "ie-oppose",
  CAMPAIGN_EXPENDITURE: "campaign-expenditure",
  EXPENDITURE_527: "527-expenditure",
  CONTRIBUTION_527: "527-contribution",
  PHILANTHROPIC_GRANT: "philanthropic-grant",
  GOVERNMENT_CONTRACT: "government-contract",
  FEDERAL_GRANT: "federal-grant",
  AFFILIATION: "affiliation",
  INTERMEDIARY: "intermediary",
  RELATIONSHIP: "relationship",
  STORY_LINK: "story-link",
  POLITICAL_OPPOSITION: "political-opposition",
} as const
