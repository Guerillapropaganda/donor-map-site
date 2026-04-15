"use client"

/**
 * Class Tags Review — ops/src/app/class-tags/page.tsx
 *
 * Phase 2 class tag approval UI. Serves David's triage of heuristic
 * proposals from data/entity-class-tags-proposed.jsonl. The target UX
 * is 3 seconds per proposal (phase-2/decisions.md §Phase 2 launch #1),
 * so this page is keyboard-first:
 *
 *   A      approve as-is
 *   R      reject
 *   E      toggle edit mode (then Enter or A to approve with edits)
 *   →      next (without action)
 *   ←      previous
 *   Esc    clear focus / exit edit mode
 *
 * Paginated 50 per batch with URL-state position persistence so breaks
 * don't cost progress. Defaults to pending+high-confidence first; the
 * filter bar switches buckets.
 *
 * Only mutates proposal status + tag overrides. The entity record in
 * data/entities.jsonl gets updated server-side on approval/edit via
 * /api/class-tags PATCH.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react"

type CapitalType =
  | "fossil-capital"
  | "extractive-capital"
  | "finance-capital"
  | "rentier-capital"
  | "tech-monopoly"
  | "retail-monopoly"
  | "military-industrial"
  | "carceral-capital"
  | "pharma-capital"
  | "media-capital"
  | "agribusiness-capital"
  | "small-capital"
  | "professional-class"
  | "labor-aligned"
  | "dark-money-vehicle"
  | "mixed"

const CAPITAL_TYPES: CapitalType[] = [
  "fossil-capital",
  "extractive-capital",
  "finance-capital",
  "rentier-capital",
  "tech-monopoly",
  "retail-monopoly",
  "military-industrial",
  "carceral-capital",
  "pharma-capital",
  "media-capital",
  "agribusiness-capital",
  "small-capital",
  "professional-class",
  "labor-aligned",
  "dark-money-vehicle",
  "mixed",
]

type ClassPosition =
  | "ruling-class"
  | "upper-bourgeois"
  | "petty-bourgeois"
  | "labor-aligned"
  | "ambiguous"

const CLASS_POSITIONS: ClassPosition[] = [
  "ruling-class",
  "upper-bourgeois",
  "petty-bourgeois",
  "labor-aligned",
  "ambiguous",
]

type IdeologicalFunction =
  | "union-busting"
  | "climate-denial"
  | "deregulatory"
  | "libertarian-ideology"
  | "religious-right"
  | "carceral-expansion"
  | "imperialist-aligned"
  | "zionist-aligned"
  | "nativist"
  | "voter-suppression"
  | "privatization"
  | "austerity"
  | "anti-trust-defender"
  | "tax-avoidance-lobby"
  | "astroturf"
  | "dark-money-networked"
  | "progressive-capital"
  | "labor-organizing"
  | "electoral-left"
  | "movement-left"

const IDEOLOGICAL_FUNCTIONS: IdeologicalFunction[] = [
  "union-busting",
  "climate-denial",
  "deregulatory",
  "libertarian-ideology",
  "religious-right",
  "carceral-expansion",
  "imperialist-aligned",
  "zionist-aligned",
  "nativist",
  "voter-suppression",
  "privatization",
  "austerity",
  "anti-trust-defender",
  "tax-avoidance-lobby",
  "astroturf",
  "dark-money-networked",
  "progressive-capital",
  "labor-organizing",
  "electoral-left",
  "movement-left",
]

type WorkerRelationship =
  | "union-busting"
  | "union-hostile"
  | "low-wage-extractive"
  | "neutral"
  | "union-neutral-employer"
  | "union-aligned"
  | "worker-owned"

const WORKER_RELATIONSHIPS: WorkerRelationship[] = [
  "union-busting",
  "union-hostile",
  "low-wage-extractive",
  "neutral",
  "union-neutral-employer",
  "union-aligned",
  "worker-owned",
]

type ProposalStatus = "pending" | "approved" | "rejected" | "edited"

interface ProposedTags {
  capital_type: CapitalType | null
  secondary_capital_type: CapitalType | null
  class_position: ClassPosition | null
  ideological_function: IdeologicalFunction[]
  worker_relationship: WorkerRelationship | null
  policy_stakes: string[]
}

interface EntitySnapshot {
  id: string
  name: string
  entity_type: string
  profile_path: string | null
  signals: {
    sector?: string | null
    total_political_spend?: number | null
    edge_count?: number
    top_politicians_funded?: Array<{ name: string; amount: number; count: number }>
    body_snippet?: string | null
  }
}

interface Proposal {
  entity_id: string
  entity_name: string
  proposed_by: string
  proposed_at: string
  confidence: "high" | "medium" | "low"
  reasoning: string
  tags: ProposedTags
  status: ProposalStatus
  entity?: EntitySnapshot | null
}

interface QueryResponse {
  total: number
  filtered: number
  returned: number
  proposals: Proposal[]
  counts: Record<ProposalStatus, number>
  confidence_counts: Record<"high" | "medium" | "low", number>
}

const PAGE_SIZE = 50

export default function ClassTagsReviewPage() {
  const [data, setData] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ProposalStatus | "">("pending")
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | "">("")
  const [capitalType, setCapitalType] = useState<CapitalType | "">("")
  const [proposedBy, setProposedBy] = useState<string>("")
  const [search, setSearch] = useState("")
  const [offset, setOffset] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [editedTags, setEditedTags] = useState<ProposedTags | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const activeCardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (status) p.set("status", status)
    if (confidence) p.set("confidence", confidence)
    if (capitalType) p.set("capital_type", capitalType)
    if (proposedBy) p.set("proposed_by", proposedBy)
    if (search) p.set("search", search)
    p.set("limit", String(PAGE_SIZE))
    p.set("offset", String(offset))
    return p.toString()
  }, [status, confidence, capitalType, proposedBy, search, offset])

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/class-tags?${queryString}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as QueryResponse
      setData(json)
      setActiveIdx(0)
      setEditMode(false)
      setEditedTags(null)
    } catch (e: any) {
      setError(e?.message || "failed to fetch")
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const activeProposal = data?.proposals[activeIdx] || null

  // Enter edit mode with the current proposal's tags as a base
  const enterEditMode = useCallback(() => {
    if (!activeProposal) return
    setEditedTags({ ...activeProposal.tags })
    setEditMode(true)
  }, [activeProposal])

  const exitEditMode = useCallback(() => {
    setEditMode(false)
    setEditedTags(null)
  }, [])

  const submitDecision = useCallback(
    async (newStatus: ProposalStatus, tagsOverride?: ProposedTags, rejectReason?: string) => {
      if (!activeProposal) return
      try {
        const body: any = { status: newStatus }
        if (tagsOverride) body.tags = tagsOverride
        if (rejectReason !== undefined) body.reject_reason = rejectReason
        const res = await fetch(`/api/class-tags?entity_id=${activeProposal.entity_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || `HTTP ${res.status}`)
        }
        setToast(`${activeProposal.entity_id} → ${newStatus}`)
        // Advance locally: drop this proposal from the current view
        if (data) {
          const nextProposals = data.proposals.filter((_, i) => i !== activeIdx)
          const nextCounts = { ...data.counts }
          nextCounts.pending = Math.max(0, (nextCounts.pending ?? 0) - 1)
          nextCounts[newStatus] = (nextCounts[newStatus] ?? 0) + 1
          setData({
            ...data,
            proposals: nextProposals,
            filtered: data.filtered - 1,
            returned: nextProposals.length,
            counts: nextCounts,
          })
          if (activeIdx >= nextProposals.length) {
            setActiveIdx(Math.max(0, nextProposals.length - 1))
          }
        }
        exitEditMode()
      } catch (e: any) {
        setError(e?.message || "update failed")
      }
    },
    [activeProposal, data, activeIdx, exitEditMode],
  )

  // Keyboard handlers — only active when a proposal is loaded and no input is focused
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") {
          ;(e.target as HTMLElement).blur()
        }
        return
      }
      if (!activeProposal) return

      if (e.key === "a" || e.key === "A") {
        e.preventDefault()
        submitDecision(editMode ? "edited" : "approved", editMode && editedTags ? editedTags : activeProposal.tags)
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        submitDecision("rejected")
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault()
        if (editMode) exitEditMode()
        else enterEditMode()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        if (data && activeIdx < data.proposals.length - 1) setActiveIdx(activeIdx + 1)
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        if (activeIdx > 0) setActiveIdx(activeIdx - 1)
      } else if (e.key === "Escape") {
        if (editMode) exitEditMode()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [activeProposal, activeIdx, data, editMode, editedTags, submitDecision, enterEditMode, exitEditMode])

  // Auto-scroll active card into view
  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [activeIdx])

  const totalPending = data?.counts.pending ?? 0
  const totalPages = data ? Math.ceil(data.filtered / PAGE_SIZE) : 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const tagsForDisplay = editMode && editedTags ? editedTags : activeProposal?.tags || null

  const updateEditedTag = <K extends keyof ProposedTags>(key: K, value: ProposedTags[K]) => {
    if (!editedTags) return
    setEditedTags({ ...editedTags, [key]: value })
  }

  const toggleIdeological = (tag: IdeologicalFunction) => {
    if (!editedTags) return
    const cur = editedTags.ideological_function
    const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]
    setEditedTags({ ...editedTags, ideological_function: next })
  }

  return (
    <div
      style={{
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
        color: "#e5e7eb",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#f3f4f6" }}>Class Tag Review</h1>
        <p style={{ margin: "0.25rem 0 0", color: "#9ca3af", fontSize: "0.9rem" }}>
          Phase 2 class tag triage — approve / reject / edit heuristic proposals. Keyboard:{" "}
          <kbd style={kbdStyle}>A</kbd> approve · <kbd style={kbdStyle}>R</kbd> reject ·{" "}
          <kbd style={kbdStyle}>E</kbd> edit · <kbd style={kbdStyle}>←</kbd>/<kbd style={kbdStyle}>→</kbd> navigate ·{" "}
          <kbd style={kbdStyle}>Esc</kbd> clear
        </p>
      </header>

      {/* Status summary */}
      {data && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
            alignItems: "center",
          }}
        >
          <div
            style={{
              padding: "0.5rem 0.75rem",
              background: "#1f2937",
              borderRadius: "0.375rem",
              fontSize: "0.85rem",
            }}
          >
            <strong>{data.total.toLocaleString()}</strong> total proposals
          </div>
          {(["pending", "approved", "rejected", "edited"] as ProposalStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setOffset(0)
                setStatus(s)
              }}
              style={{
                padding: "0.5rem 0.75rem",
                background: status === s ? statusColor(s) : "#1f2937",
                color: status === s ? "#0f172a" : statusColor(s),
                border: `1px solid ${statusColor(s)}`,
                borderRadius: "0.375rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: status === s ? 700 : 500,
              }}
            >
              {s}: {(data.counts[s] ?? 0).toLocaleString()}
            </button>
          ))}
          <div style={{ marginLeft: "1rem", fontSize: "0.85rem", color: "#9ca3af" }}>
            confidence:
          </div>
          {(["high", "medium", "low"] as const).map((c) => (
            <button
              key={c}
              onClick={() => {
                setOffset(0)
                setConfidence(confidence === c ? "" : c)
              }}
              style={{
                padding: "0.5rem 0.75rem",
                background: confidence === c ? confidenceColor(c) : "#1f2937",
                color: confidence === c ? "#0f172a" : confidenceColor(c),
                border: `1px solid ${confidenceColor(c)}`,
                borderRadius: "0.375rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: confidence === c ? 700 : 500,
              }}
            >
              {c}: {data.confidence_counts[c] ?? 0}
            </button>
          ))}
        </div>
      )}

      {/* Filter row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 2fr",
          gap: "0.5rem",
          marginBottom: "1rem",
          padding: "0.75rem",
          background: "#111827",
          borderRadius: "0.5rem",
          border: "1px solid #1f2937",
        }}
      >
        <select
          value={capitalType}
          onChange={(e) => {
            setOffset(0)
            setCapitalType(e.target.value as CapitalType | "")
          }}
          style={inputStyle}
        >
          <option value="">all capital_types</option>
          {CAPITAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={proposedBy}
          onChange={(e) => {
            setOffset(0)
            setProposedBy(e.target.value)
          }}
          style={inputStyle}
          title="Filter by proposer source"
        >
          <option value="">all proposers</option>
          <option value="heuristic-v1">heuristic-v1</option>
          <option value="perplexity-research-2026-04-15">perplexity-research-2026-04-15</option>
        </select>
        <input
          type="text"
          placeholder="search entity name..."
          value={search}
          onChange={(e) => {
            setOffset(0)
            setSearch(e.target.value)
          }}
          style={inputStyle}
        />
      </div>

      {/* Progress line */}
      {data && (
        <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "#9ca3af" }}>
          {loading ? "Loading..." : `${data.filtered.toLocaleString()} in view`}
          {data.filtered > PAGE_SIZE && (
            <>
              {" · batch "}
              {currentPage} of {totalPages}
            </>
          )}
          {" · active "}
          {activeIdx + 1} of {data.proposals.length}
          {totalPending > 0 && (
            <span style={{ marginLeft: "1rem" }}>
              <strong style={{ color: "#fbbf24" }}>{totalPending}</strong> pending total
            </span>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "#7f1d1d",
            color: "#fecaca",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Active proposal card */}
      {activeProposal && tagsForDisplay && (
        <div
          ref={activeCardRef}
          style={{
            background: "#0f172a",
            border: `2px solid ${confidenceColor(activeProposal.confidence)}`,
            borderRadius: "0.5rem",
            padding: "1.25rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f3f4f6" }}>
                {activeProposal.entity_name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                <code>{activeProposal.entity_id}</code>
                {activeProposal.entity && (
                  <>
                    {" · "}
                    {activeProposal.entity.entity_type}
                    {activeProposal.entity.signals.sector && ` · ${activeProposal.entity.signals.sector}`}
                    {typeof activeProposal.entity.signals.total_political_spend === "number" &&
                      ` · $${activeProposal.entity.signals.total_political_spend.toLocaleString()}`}
                  </>
                )}
              </div>
            </div>
            <div
              style={{
                padding: "0.25rem 0.75rem",
                background: confidenceColor(activeProposal.confidence),
                color: "#0f172a",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {activeProposal.confidence}
            </div>
          </div>

          {/* Reasoning */}
          <div
            style={{
              fontSize: "0.8rem",
              color: "#9ca3af",
              marginBottom: "0.75rem",
              fontStyle: "italic",
            }}
          >
            {activeProposal.reasoning || "(no heuristics matched)"}
          </div>

          {/* Body snippet */}
          {activeProposal.entity?.signals.body_snippet && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "#d1d5db",
                background: "#1f2937",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.25rem",
                marginBottom: "0.75rem",
                maxHeight: "4.5em",
                overflow: "hidden",
                lineHeight: "1.4",
              }}
            >
              {activeProposal.entity.signals.body_snippet.slice(0, 250)}
              {activeProposal.entity.signals.body_snippet.length > 250 && "…"}
            </div>
          )}

          {/* Tag grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            <TagField
              label="capital_type"
              value={tagsForDisplay.capital_type}
              options={CAPITAL_TYPES}
              editable={editMode}
              onChange={(v) => updateEditedTag("capital_type", v as CapitalType | null)}
            />
            <TagField
              label="class_position"
              value={tagsForDisplay.class_position}
              options={CLASS_POSITIONS}
              editable={editMode}
              onChange={(v) => updateEditedTag("class_position", v as ClassPosition | null)}
            />
            <TagField
              label="worker_relationship"
              value={tagsForDisplay.worker_relationship}
              options={WORKER_RELATIONSHIPS}
              editable={editMode}
              onChange={(v) => updateEditedTag("worker_relationship", v as WorkerRelationship | null)}
            />
            <TagField
              label="secondary_capital_type"
              value={tagsForDisplay.secondary_capital_type}
              options={CAPITAL_TYPES}
              editable={editMode}
              onChange={(v) => updateEditedTag("secondary_capital_type", v as CapitalType | null)}
            />
          </div>

          {/* Ideological function (multi-select) */}
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.25rem" }}>
              ideological_function
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {IDEOLOGICAL_FUNCTIONS.map((f) => {
                const active = tagsForDisplay.ideological_function.includes(f)
                return (
                  <button
                    key={f}
                    disabled={!editMode}
                    onClick={() => toggleIdeological(f)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: active ? "#dc2626" : "#1f2937",
                      color: active ? "#fff" : "#9ca3af",
                      border: `1px solid ${active ? "#dc2626" : "#374151"}`,
                      borderRadius: "0.25rem",
                      fontSize: "0.7rem",
                      cursor: editMode ? "pointer" : "default",
                      opacity: !editMode && !active ? 0.5 : 1,
                    }}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={() =>
                submitDecision(
                  editMode ? "edited" : "approved",
                  editMode && editedTags ? editedTags : activeProposal.tags,
                )
              }
              style={actionButtonStyle("#22c55e")}
            >
              {editMode ? "Save (E)" : "Approve (A)"}
            </button>
            <button onClick={() => submitDecision("rejected")} style={actionButtonStyle("#ef4444")}>
              Reject (R)
            </button>
            {!editMode ? (
              <button onClick={enterEditMode} style={actionButtonStyle("#3b82f6")}>
                Edit (E)
              </button>
            ) : (
              <button onClick={exitEditMode} style={actionButtonStyle("#6b7280")}>
                Cancel (Esc)
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => activeIdx > 0 && setActiveIdx(activeIdx - 1)}
              disabled={activeIdx === 0}
              style={navButtonStyle(activeIdx === 0)}
            >
              ←
            </button>
            <button
              onClick={() => data && activeIdx < data.proposals.length - 1 && setActiveIdx(activeIdx + 1)}
              disabled={!data || activeIdx >= data.proposals.length - 1}
              style={navButtonStyle(!data || activeIdx >= data.proposals.length - 1)}
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data && data.proposals.length === 0 && !loading && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#6b7280",
            background: "#111827",
            borderRadius: "0.5rem",
            border: "1px dashed #374151",
          }}
        >
          No proposals match the current filters.
          {status === "pending" && " All caught up!"}
        </div>
      )}

      {/* Queue preview (next proposals) */}
      {data && data.proposals.length > 1 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem" }}>
            up next
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {data.proposals.slice(activeIdx + 1, activeIdx + 6).map((p, i) => (
              <div
                key={p.entity_id}
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: "0.25rem",
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {activeIdx + 2 + i}. {p.entity_name}
                </span>
                <span style={{ color: confidenceColor(p.confidence) }}>
                  {p.tags.capital_type || "—"} · {p.confidence}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {data && data.filtered > PAGE_SIZE && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            style={pageButtonStyle(offset === 0)}
          >
            ← prev batch
          </button>
          <span style={{ padding: "0.5rem 1rem", color: "#9ca3af", fontSize: "0.85rem" }}>
            batch {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= data.filtered}
            style={pageButtonStyle(offset + PAGE_SIZE >= data.filtered)}
          >
            next batch →
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            padding: "0.75rem 1rem",
            background: "#065f46",
            color: "#d1fae5",
            borderRadius: "0.375rem",
            fontSize: "0.85rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Small subcomponents ──────────────────────────────────────────

function TagField({
  label,
  value,
  options,
  editable,
  onChange,
}: {
  label: string
  value: string | null
  options: readonly string[]
  editable: boolean
  onChange: (v: string | null) => void
}) {
  return (
    <div>
      <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "0.25rem" }}>{label}</div>
      {editable ? (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          style={inputStyle}
        >
          <option value="">— null —</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            background: value ? "#0891b2" : "#1f2937",
            color: value ? "#fff" : "#6b7280",
            borderRadius: "0.25rem",
            fontSize: "0.85rem",
            fontWeight: value ? 600 : 400,
          }}
        >
          {value || "— null —"}
        </div>
      )}
    </div>
  )
}

// ─── Inline styles ─────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "0.375rem",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  outline: "none",
  width: "100%",
}

const kbdStyle: React.CSSProperties = {
  padding: "0.125rem 0.375rem",
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "0.25rem",
  fontFamily: "monospace",
  fontSize: "0.75rem",
  color: "#d1d5db",
}

function actionButtonStyle(color: string): React.CSSProperties {
  return {
    padding: "0.625rem 1.25rem",
    background: color,
    color: "#0f172a",
    border: "none",
    borderRadius: "0.375rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  }
}

function navButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.625rem 0.875rem",
    background: disabled ? "#1f2937" : "#374151",
    color: disabled ? "#4b5563" : "#e5e7eb",
    border: "1px solid #374151",
    borderRadius: "0.375rem",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "1rem",
  }
}

function pageButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 1rem",
    background: disabled ? "#1f2937" : "#374151",
    color: disabled ? "#4b5563" : "#e5e7eb",
    border: "1px solid #374151",
    borderRadius: "0.375rem",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.85rem",
  }
}

function statusColor(s: ProposalStatus): string {
  switch (s) {
    case "pending":
      return "#fbbf24"
    case "approved":
      return "#22c55e"
    case "rejected":
      return "#ef4444"
    case "edited":
      return "#3b82f6"
  }
}

function confidenceColor(c: "high" | "medium" | "low"): string {
  switch (c) {
    case "high":
      return "#22c55e"
    case "medium":
      return "#fbbf24"
    case "low":
      return "#6b7280"
  }
}
