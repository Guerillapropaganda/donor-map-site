"use client"

import { useEffect, useMemo, useState } from "react"

// ─── Types (loose copies of profile-type-rulebook.ts shapes) ───────────

interface TypeVisual {
  "color-light": string
  "color-dark": string
  icon: string
}
interface TierReq {
  required?: string[]
  recommended?: string[]
}
interface BaseRulebook {
  tiers: Record<string, TierReq>
  "promotion-gate"?: Record<string, string>
}
interface SubCatOverrides {
  adds?: Record<string, string[]>
  removes?: string[]
  replaces?: Record<string, string>
}
interface SubCategory {
  label: string
  visual?: { icon?: string }
  overrides?: SubCatOverrides
}
interface TypeEntry {
  label: string
  description?: string
  visual: TypeVisual
  "voice-scanned"?: boolean
  "hallucination-scanned"?: boolean
  "base-rulebook": BaseRulebook
  "sub-categories"?: Record<string, SubCategory>
  notes?: Record<string, string>
}
interface Rulebook {
  $schema?: string
  version: string
  "last-updated"?: string
  "tier-order": string[]
  types: Record<string, TypeEntry>
}

// ─── Small helpers ─────────────────────────────────────────────────────

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

function stableStringify(x: unknown): string {
  return JSON.stringify(x)
}

// ─── Reusable tag list (required/recommended check ids) ────────────────

function TagList({
  ids,
  onChange,
  suggestions,
  placeholder = "add check-id…",
  accent = "var(--color-steel)",
}: {
  ids: string[]
  onChange: (next: string[]) => void
  suggestions: string[]
  placeholder?: string
  accent?: string
}) {
  const [input, setInput] = useState("")
  const filtered = useMemo(() => {
    if (!input.trim()) return []
    const q = input.toLowerCase()
    return suggestions
      .filter((s) => s.toLowerCase().includes(q) && !ids.includes(s))
      .slice(0, 8)
  }, [input, suggestions, ids])

  function commit(id: string) {
    const v = id.trim()
    if (!v || ids.includes(v)) return
    onChange([...ids, v])
    setInput("")
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((id) => {
        const valid = suggestions.length === 0 || suggestions.includes(id)
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border"
            style={{
              borderColor: valid ? accent : "var(--color-red)",
              color: valid ? "var(--color-text)" : "var(--color-red)",
              background: "var(--color-bg)",
            }}
            title={valid ? id : `${id} — not in checklist-helpers.cjs`}
          >
            {id}
            <button
              type="button"
              className="text-[var(--color-text-dim)] hover:text-[var(--color-red)]"
              onClick={() => onChange(ids.filter((x) => x !== id))}
            >
              ×
            </button>
          </span>
        )
      })}
      <div className="relative">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              if (filtered.length > 0) commit(filtered[0])
              else commit(input)
            }
          }}
          placeholder={placeholder}
          className="px-2 py-0.5 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none w-44"
        />
        {filtered.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-10 w-64 max-h-56 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className="block w-full text-left px-2 py-1 text-[10px] font-mono text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-category editor (label + icon + overrides JSON) ───────────────

function SubCategoryEditor({
  name,
  sub,
  onChange,
  onRemove,
}: {
  name: string
  sub: SubCategory
  onChange: (next: SubCategory) => void
  onRemove: () => void
}) {
  const [overridesText, setOverridesText] = useState(
    JSON.stringify(sub.overrides || {}, null, 2),
  )
  const [overridesError, setOverridesError] = useState<string | null>(null)

  // When sub.overrides changes externally (e.g. reset), resync text
  useEffect(() => {
    setOverridesText(JSON.stringify(sub.overrides || {}, null, 2))
    setOverridesError(null)
  }, [sub.overrides])

  function commitOverrides(text: string) {
    setOverridesText(text)
    try {
      const parsed = text.trim() ? JSON.parse(text) : undefined
      setOverridesError(null)
      onChange({ ...sub, overrides: parsed })
    } catch (e) {
      setOverridesError((e as Error).message)
    }
  }

  return (
    <div className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-bg)]/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] font-mono">
          {name}
        </span>
        <input
          value={sub.label}
          onChange={(e) => onChange({ ...sub, label: e.target.value })}
          placeholder="Label"
          className="flex-1 px-2 py-1 text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
        />
        <input
          value={sub.visual?.icon || ""}
          onChange={(e) =>
            onChange({ ...sub, visual: { ...(sub.visual || {}), icon: e.target.value } })
          }
          placeholder="icon"
          className="w-32 px-2 py-1 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
        />
        <button
          type="button"
          onClick={onRemove}
          className="px-2 py-1 text-[10px] rounded border border-[var(--color-border)] text-[var(--color-red)] hover:border-[var(--color-red)]"
        >
          delete
        </button>
      </div>
      <div className="mt-2">
        <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
          Overrides (JSON — adds / removes / replaces)
        </label>
        <textarea
          value={overridesText}
          onChange={(e) => commitOverrides(e.target.value)}
          spellCheck={false}
          rows={Math.min(12, Math.max(4, overridesText.split("\n").length))}
          className="mt-1 w-full px-2 py-1 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none resize-y"
        />
        {overridesError && (
          <p className="text-[10px] text-[var(--color-red)] mt-1">JSON error: {overridesError}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────

export default function RulesPage() {
  const [rulebook, setRulebook] = useState<Rulebook | null>(null)
  const [original, setOriginal] = useState<Rulebook | null>(null)
  const [checkIds, setCheckIds] = useState<string[]>([])
  const [gates, setGates] = useState<string[]>(["auto", "manual", "none", "hybrid"])
  const [activeType, setActiveType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveErrorDetails, setSaveErrorDetails] = useState<string[]>([])
  const [saveOk, setSaveOk] = useState<string | null>(null)

  async function fetchRulebook() {
    setLoading(true)
    try {
      const r = await fetch("/api/rulebook")
      const data = await r.json()
      if (data.rulebook) {
        setRulebook(data.rulebook)
        setOriginal(deepClone(data.rulebook))
        setCheckIds(data.checkIds || [])
        setGates(data.gates || ["auto", "manual", "none", "hybrid"])
        if (!activeType) {
          const first = Object.keys(data.rulebook.types || {})[0]
          if (first) setActiveType(first)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRulebook()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dirty = useMemo(() => {
    if (!rulebook || !original) return false
    return stableStringify(rulebook) !== stableStringify(original)
  }, [rulebook, original])

  function updateType(typeName: string, next: TypeEntry) {
    if (!rulebook) return
    setRulebook({
      ...rulebook,
      types: { ...rulebook.types, [typeName]: next },
    })
  }

  async function handleSave() {
    if (!rulebook) return
    setSaving(true)
    setSaveError(null)
    setSaveErrorDetails([])
    setSaveOk(null)
    try {
      const res = await fetch("/api/rulebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rulebook }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || `HTTP ${res.status}`)
        if (Array.isArray(data.details)) setSaveErrorDetails(data.details)
        return
      }
      setSaveOk(`Saved. last-updated: ${data["last-updated"]}`)
      await fetchRulebook()
    } catch (e) {
      setSaveError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (!original) return
    setRulebook(deepClone(original))
    setSaveError(null)
    setSaveErrorDetails([])
    setSaveOk(null)
  }

  const type = rulebook && activeType ? rulebook.types[activeType] : null
  const tierOrder = rulebook?.["tier-order"] || ["raw", "draft", "ready", "verified", "s-tier"]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-lg font-bold tracking-wider"
            style={{ color: "var(--color-steel)" }}
          >
            Profile Type Rulebook
          </h1>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
            Authoritative config for what each profile type requires at each readiness tier.
            Consumed by all 5 Attention Queue producers, hallucination-catcher, voice-drift-detector,
            promotion-candidate-queue, and the pre-commit self-review-mirror.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10px] font-mono text-[var(--color-amber)]">● unsaved</span>
          )}
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleReset}
            className="px-3 py-1.5 text-[10px] rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-30"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={handleSave}
            className="px-4 py-1.5 text-[10px] rounded border border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10 hover:bg-[var(--color-steel)]/20 disabled:opacity-30"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Save feedback */}
      {saveError && (
        <div className="mb-4 p-3 rounded border border-[var(--color-red)] bg-[var(--color-red)]/5">
          <p className="text-[11px] font-bold text-[var(--color-red)]">{saveError}</p>
          {saveErrorDetails.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {saveErrorDetails.map((d, i) => (
                <li key={i} className="text-[10px] font-mono text-[var(--color-red)]">
                  — {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {saveOk && (
        <div className="mb-4 p-3 rounded border border-[var(--color-green)] bg-[var(--color-green)]/5">
          <p className="text-[11px] font-bold text-[var(--color-green)]">{saveOk}</p>
        </div>
      )}

      {loading && <p className="text-[var(--color-text-dim)] text-sm">Loading…</p>}

      {rulebook && (
        <>
          {/* Top-level metadata */}
          <div className="flex items-center gap-4 px-4 py-2 mb-4 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Version</span>
              <input
                value={rulebook.version}
                onChange={(e) => setRulebook({ ...rulebook, version: e.target.value })}
                className="w-20 px-2 py-0.5 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
              />
            </div>
            <div className="w-px h-4 bg-[var(--color-border)]" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Last updated</span>
              <span className="text-[10px] font-mono text-[var(--color-amber)]">
                {rulebook["last-updated"] || "—"}
              </span>
            </div>
            <div className="w-px h-4 bg-[var(--color-border)]" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Tiers</span>
              <span className="text-[10px] font-mono text-[var(--color-text)]">
                {tierOrder.join(" → ")}
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                Known check ids
              </span>
              <span className="text-[10px] font-mono text-[var(--color-text)]">
                {checkIds.length}
              </span>
            </div>
          </div>

          {/* Type tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(Object.entries(rulebook.types) as [string, TypeEntry][]).map(([name, entry]) => {
              const active = activeType === name
              const color = entry.visual?.["color-dark"] || "var(--color-steel)"
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveType(name)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono border transition-colors ${
                    active
                      ? "bg-[var(--color-bg-card)] text-[var(--color-text)]"
                      : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                  }`}
                  style={active ? { borderColor: color, color } : undefined}
                >
                  <span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ background: color }} />
                  {entry.label}
                </button>
              )
            })}
          </div>

          {/* Type editor */}
          {type && activeType && (
            <TypeEditor
              key={activeType}
              typeName={activeType}
              type={type}
              tierOrder={tierOrder}
              checkIds={checkIds}
              gates={gates}
              onChange={(next) => updateType(activeType, next)}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── TypeEditor ────────────────────────────────────────────────────────

function TypeEditor({
  typeName,
  type,
  tierOrder,
  checkIds,
  gates,
  onChange,
}: {
  typeName: string
  type: TypeEntry
  tierOrder: string[]
  checkIds: string[]
  gates: string[]
  onChange: (next: TypeEntry) => void
}) {
  const [newSubId, setNewSubId] = useState("")

  function setLabel(v: string) {
    onChange({ ...type, label: v })
  }
  function setDescription(v: string) {
    onChange({ ...type, description: v })
  }
  function setVisual(field: keyof TypeVisual, v: string) {
    onChange({ ...type, visual: { ...type.visual, [field]: v } })
  }
  function setFlag(flag: "voice-scanned" | "hallucination-scanned", v: boolean) {
    onChange({ ...type, [flag]: v })
  }
  function setTier(tier: string, field: "required" | "recommended", ids: string[]) {
    const tiers = { ...(type["base-rulebook"].tiers || {}) }
    const cur = tiers[tier] || {}
    tiers[tier] = { ...cur, [field]: ids }
    onChange({ ...type, "base-rulebook": { ...type["base-rulebook"], tiers } })
  }
  function setGate(tier: string, gate: string) {
    const gates = { ...(type["base-rulebook"]["promotion-gate"] || {}) }
    gates[tier] = gate
    onChange({ ...type, "base-rulebook": { ...type["base-rulebook"], "promotion-gate": gates } })
  }
  function updateSub(subId: string, next: SubCategory) {
    const subs = { ...(type["sub-categories"] || {}) }
    subs[subId] = next
    onChange({ ...type, "sub-categories": subs })
  }
  function removeSub(subId: string) {
    const subs = { ...(type["sub-categories"] || {}) }
    delete subs[subId]
    onChange({ ...type, "sub-categories": subs })
  }
  function addSub() {
    const id = newSubId.trim()
    if (!id) return
    const subs = { ...(type["sub-categories"] || {}) }
    if (subs[id]) return
    subs[id] = { label: id, visual: { icon: "" }, overrides: {} }
    onChange({ ...type, "sub-categories": subs })
    setNewSubId("")
  }

  const tiers = type["base-rulebook"].tiers || {}
  const gateMap = type["base-rulebook"]["promotion-gate"] || {}
  const subs = type["sub-categories"] || {}

  return (
    <div className="space-y-6">
      {/* Identity + visual */}
      <section className="p-4 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-steel)] font-bold mb-3">
          Identity
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Type key</label>
            <input
              value={typeName}
              disabled
              className="mt-1 w-full px-2 py-1 text-[11px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-dim)]"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Label</label>
            <input
              value={type.label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full px-2 py-1 text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Description</label>
            <textarea
              value={type.description || ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full px-2 py-1 text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none resize-y"
            />
          </div>
        </div>

        <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-steel)] font-bold mt-5 mb-3">
          Visual identity
        </h2>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Color (light)</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={type.visual["color-light"]}
                onChange={(e) => setVisual("color-light", e.target.value)}
                className="flex-1 px-2 py-1 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
              />
              <span
                className="w-6 h-6 rounded border border-[var(--color-border)]"
                style={{ background: type.visual["color-light"] }}
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Color (dark)</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={type.visual["color-dark"]}
                onChange={(e) => setVisual("color-dark", e.target.value)}
                className="flex-1 px-2 py-1 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
              />
              <span
                className="w-6 h-6 rounded border border-[var(--color-border)]"
                style={{ background: type.visual["color-dark"] }}
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Icon</label>
            <input
              type="text"
              value={type.visual.icon}
              onChange={(e) => setVisual("icon", e.target.value)}
              className="mt-1 w-full px-2 py-1 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
            />
          </div>
        </div>

        <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-steel)] font-bold mt-5 mb-3">
          Scan flags
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={type["voice-scanned"] !== false}
              onChange={(e) => setFlag("voice-scanned", e.target.checked)}
            />
            voice-scanned
          </label>
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={type["hallucination-scanned"] !== false}
              onChange={(e) => setFlag("hallucination-scanned", e.target.checked)}
            />
            hallucination-scanned
          </label>
        </div>
      </section>

      {/* Base rulebook tiers */}
      <section className="p-4 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-steel)] font-bold mb-3">
          Base rulebook — tiers
        </h2>
        <div className="space-y-4">
          {tierOrder.map((tier) => {
            const entry = tiers[tier] || {}
            const gate = gateMap[tier]
            return (
              <div key={tier} className="border border-[var(--color-border)] rounded p-3 bg-[var(--color-bg)]/50">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-bold text-[var(--color-amber)] uppercase tracking-wider">
                    {tier}
                  </span>
                  {["ready", "verified", "s-tier"].includes(tier) && (
                    <>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                        gate
                      </span>
                      <select
                        value={gate || ""}
                        onChange={(e) => setGate(tier, e.target.value)}
                        className="px-2 py-0.5 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)]"
                      >
                        <option value="">—</option>
                        {gates.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
                <div className="mb-2">
                  <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">
                    required
                  </label>
                  <TagList
                    ids={entry.required || []}
                    onChange={(next) => setTier(tier, "required", next)}
                    suggestions={checkIds}
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">
                    recommended
                  </label>
                  <TagList
                    ids={entry.recommended || []}
                    onChange={(next) => setTier(tier, "recommended", next)}
                    suggestions={checkIds}
                    accent="var(--color-amber)"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Sub-categories */}
      <section className="p-4 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-steel)] font-bold">
            Sub-categories ({Object.keys(subs).length})
          </h2>
          <div className="flex items-center gap-2">
            <input
              value={newSubId}
              onChange={(e) => setNewSubId(e.target.value)}
              placeholder="new sub-category id (kebab-case)"
              className="w-64 px-2 py-1 text-[10px] font-mono rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addSub()
                }
              }}
            />
            <button
              type="button"
              onClick={addSub}
              className="px-3 py-1 text-[10px] rounded border border-[var(--color-steel)] text-[var(--color-steel)] hover:bg-[var(--color-steel)]/10"
            >
              add
            </button>
          </div>
        </div>
        {Object.keys(subs).length === 0 ? (
          <p className="text-[10px] text-[var(--color-text-dim)] italic">No sub-categories.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(subs).map(([subId, sub]) => (
              <SubCategoryEditor
                key={subId}
                name={subId}
                sub={sub}
                onChange={(next) => updateSub(subId, next)}
                onRemove={() => removeSub(subId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
