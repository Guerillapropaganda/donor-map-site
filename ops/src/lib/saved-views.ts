/**
 * saved-views.ts — small utility for storing named filter combos per page.
 *
 * Established 2026-04-27 alongside the savable-views feature on
 * /capitol-trades and /money-trail (deferred audit item #10). The
 * intent is "let David save a filter combo he uses often, name it,
 * and recall it with one click."
 *
 * Storage: localStorage under a single namespaced key. Per-page lists
 * are namespaced inside that one record so we touch one storage slot.
 *
 *   {
 *     "money-trail": [
 *       { id, name, view: {...}, saved_at: ISO }
 *     ],
 *     "capitol-trades": [...]
 *   }
 *
 * Per-machine. Clears with browser cache. If we ever want cross-machine
 * persistence, swap the storage layer for a JSON file in data/ (these
 * are user prefs, not vault data, so not the canonical-store path).
 *
 * Not a security boundary — anything you save in views is visible in
 * devtools storage.
 */

const STORAGE_KEY = "donor-map-saved-views-v1"

export interface SavedView<T = unknown> {
  id: string
  name: string
  view: T
  saved_at: string
}

type Store = Record<string, SavedView[]>

function read(): Store {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function write(store: Store): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage may be full / disabled — silent failure is fine here;
    // saved views are a convenience, not load-bearing.
  }
}

export function listViews<T>(pageKey: string): SavedView<T>[] {
  const store = read()
  const list = store[pageKey] || []
  return list as SavedView<T>[]
}

export function saveView<T>(pageKey: string, name: string, view: T): SavedView<T> {
  const store = read()
  const id = `view_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`
  const entry: SavedView<T> = {
    id,
    name: name.trim() || "Unnamed view",
    view,
    saved_at: new Date().toISOString(),
  }
  if (!store[pageKey]) store[pageKey] = []
  store[pageKey].push(entry)
  write(store)
  return entry
}

export function deleteView(pageKey: string, id: string): void {
  const store = read()
  if (!store[pageKey]) return
  store[pageKey] = store[pageKey].filter((v) => v.id !== id)
  write(store)
}

export function renameView(pageKey: string, id: string, newName: string): void {
  const store = read()
  if (!store[pageKey]) return
  const v = store[pageKey].find((v) => v.id === id)
  if (!v) return
  v.name = newName.trim() || v.name
  write(store)
}
