"use client"

/**
 * SavedViewsBar — compact UI for naming + recalling filter combos on
 * any ops page that has a serializable filter state.
 *
 * Established 2026-04-27 (deferred audit item #10) for /capitol-trades
 * and /money-trail. Designed to drop into the top of any page that
 * accumulates filter state worth re-using.
 *
 * Usage:
 *
 *   <SavedViewsBar
 *     pageKey="money-trail"
 *     currentView={{ search, connFilter, maxNodes }}
 *     onLoadView={(v) => {
 *       setSearch(v.search)
 *       setConnFilter(v.connFilter)
 *       setMaxNodes(v.maxNodes)
 *     }}
 *   />
 *
 * Persistence is localStorage (per machine). See ops/src/lib/saved-views.ts.
 *
 * The bar shows:
 *   · A "Saved views" select dropdown (loads on change)
 *   · A "Save current view" button (prompts for name, stores)
 *   · A "✕" delete button next to the select when a view is selected
 *
 * Style: dark theme matching the rest of ops. Compact, single line.
 */

import { useEffect, useState } from "react"
import {
  listViews,
  saveView,
  deleteView,
  renameView,
  type SavedView,
} from "@/lib/saved-views"

interface SavedViewsBarProps<T> {
  pageKey: string
  currentView: T
  onLoadView: (view: T) => void
  /** Optional class for the wrapper div. */
  className?: string
}

export function SavedViewsBar<T>({
  pageKey,
  currentView,
  onLoadView,
  className,
}: SavedViewsBarProps<T>) {
  const [views, setViews] = useState<SavedView<T>[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  // Refresh count — bumped after save/delete to re-read storage. We don't
  // listen to storage events because changes only come from this component.
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    setViews(listViews<T>(pageKey))
  }, [pageKey, refresh])

  const handleLoad = (id: string) => {
    setSelectedId(id)
    if (!id) return
    const v = views.find((x) => x.id === id)
    if (!v) return
    onLoadView(v.view)
  }

  const handleSave = () => {
    const name = window.prompt(
      "Name this view:",
      `View ${new Date().toLocaleString()}`,
    )
    if (!name) return
    const entry = saveView(pageKey, name, currentView)
    setRefresh((r) => r + 1)
    setSelectedId(entry.id)
  }

  const handleDelete = () => {
    if (!selectedId) return
    const v = views.find((x) => x.id === selectedId)
    if (!v) return
    if (!window.confirm(`Delete view "${v.name}"?`)) return
    deleteView(pageKey, selectedId)
    setSelectedId("")
    setRefresh((r) => r + 1)
  }

  const handleRename = () => {
    if (!selectedId) return
    const v = views.find((x) => x.id === selectedId)
    if (!v) return
    const newName = window.prompt("Rename view:", v.name)
    if (!newName || newName === v.name) return
    renameView(pageKey, selectedId, newName)
    setRefresh((r) => r + 1)
  }

  return (
    <div
      className={`flex items-center gap-2 text-xs ${className || ""}`}
      data-testid="saved-views-bar"
    >
      <span className="text-neutral-500 uppercase tracking-wider">
        Saved views
      </span>
      <select
        value={selectedId}
        onChange={(e) => handleLoad(e.target.value)}
        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-200 min-w-[200px]"
      >
        <option value="">— pick a view —</option>
        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      {selectedId && (
        <>
          <button
            onClick={handleRename}
            title="Rename this view"
            className="px-2 py-1 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500 rounded"
          >
            rename
          </button>
          <button
            onClick={handleDelete}
            title="Delete this view"
            className="px-2 py-1 border border-red-900 text-red-400 hover:text-red-200 hover:bg-red-900/30 rounded"
          >
            ✕
          </button>
        </>
      )}
      <button
        onClick={handleSave}
        className="px-2 py-1 border border-amber-700 bg-amber-900/30 text-amber-200 hover:bg-amber-900/60 rounded ml-auto"
      >
        + save current view
      </button>
    </div>
  )
}
