/**
 * vault-cache.ts — shared client-side cache for /api/vault.
 *
 * The vault payload is ~3,200 profiles + stats — non-trivial to fetch
 * even on localhost. Seven separate ops pages all fetched it
 * independently on mount, so navigating from one to the next paid for
 * the full round-trip every time. Sidebar navigation felt sluggish in
 * lockstep with the number of pages that did this.
 *
 * Pattern: module-level promise cache. The first caller kicks off the
 * fetch; concurrent callers await the same promise; subsequent callers
 * within TTL get the cached payload synchronously.
 *
 * Usage:
 *
 *   import { fetchVault } from "@/lib/vault-cache"
 *   useEffect(() => { fetchVault().then(d => setProfiles(d.profiles)) }, [])
 *
 * To force a re-fetch (after a write that mutates the vault):
 *
 *   import { invalidateVault } from "@/lib/vault-cache"
 *   invalidateVault(); fetchVault().then(...)
 *
 * Or pass `{ refresh: true }` to fetchVault for a one-shot bypass.
 */

import type { Profile, VaultStats } from "./vault"

interface VaultPayload {
  profiles: Profile[]
  stats: VaultStats
  source?: string
  error?: string
}

interface CacheEntry {
  promise: Promise<VaultPayload>
  timestamp: number
}

const TTL_MS = 60_000
let entry: CacheEntry | null = null

export function fetchVault(opts?: { refresh?: boolean }): Promise<VaultPayload> {
  const refresh = opts?.refresh === true
  const now = Date.now()

  if (entry && !refresh && now - entry.timestamp < TTL_MS) {
    return entry.promise
  }

  const url = refresh ? "/api/vault?refresh=true" : "/api/vault"
  const promise = fetch(url)
    .then((r) => r.json() as Promise<VaultPayload>)
    .catch((e) => {
      // Drop the cache on network failure so the next call retries.
      if (entry?.promise === promise) entry = null
      throw e
    })

  entry = { promise, timestamp: now }
  return promise
}

export function invalidateVault() {
  entry = null
}

// ─── Harness artifact cache ────────────────────────────────────────
// HarnessChip is mounted in the header bar of most ops pages, so
// /api/vault-audit GET was being hit on every navigation. Same
// dedupe pattern: short TTL (30s) so the chip's "X min ago" stays
// honest, but multiple components asking concurrently share one
// fetch.

const HARNESS_TTL_MS = 30_000
let harnessEntry: { promise: Promise<unknown>; timestamp: number } | null = null

export function fetchHarnessArtifact(opts?: { refresh?: boolean }): Promise<unknown> {
  const refresh = opts?.refresh === true
  const now = Date.now()

  if (harnessEntry && !refresh && now - harnessEntry.timestamp < HARNESS_TTL_MS) {
    return harnessEntry.promise
  }

  const promise = fetch("/api/vault-audit", { credentials: "include" })
    .then((r) => r.json())
    .catch((e) => {
      if (harnessEntry?.promise === promise) harnessEntry = null
      throw e
    })

  harnessEntry = { promise, timestamp: now }
  return promise
}

export function invalidateHarness() {
  harnessEntry = null
}
