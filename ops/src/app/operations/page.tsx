"use client"

import { useState, useEffect, useCallback } from "react"
import HarnessChip from "@/components/HarnessChip"

// --- Types ---

interface SecurityItem {
  id: string
  name: string
  description: string
  status: "done" | "in-progress" | "not-started"
  priority: "critical" | "high" | "medium" | "low"
  category: "infrastructure" | "application" | "personal" | "monitoring" | "legal"
  notes: string
  updatedAt: string
}

interface CostEntry {
  id: string
  service: string
  category: string
  amount: number
  billingCycle: "monthly" | "yearly" | "one-time" | "usage-based"
  startDate: string
  notes: string
  updatedAt: string
}

interface ServiceEntry {
  id: string
  name: string
  accountEmail: string
  plan: string
  signupDate: string
  loginUrl: string
  notes: string
  updatedAt: string
}

// --- Constants ---

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#5b8dce",
  low: "var(--color-text-dim)",
}

const STATUS_COLORS: Record<string, string> = {
  done: "#22c55e",
  "in-progress": "#f59e0b",
  "not-started": "var(--color-text-dim)",
}

const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  "in-progress": "In Progress",
  "not-started": "Not Started",
}

const STATUS_ICONS: Record<string, string> = {
  done: "\u2713",
  "in-progress": "\u25CB",
  "not-started": "\u2015",
}

const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: "Infrastructure",
  application: "Application",
  personal: "Personal",
  monitoring: "Monitoring",
  legal: "Legal",
}

const COST_CATEGORY_COLORS: Record<string, string> = {
  hosting: "#22c55e",
  security: "#5b8dce",
  tools: "#a855f7",
  api: "#06b6d4",
  domain: "#f59e0b",
  ai: "#ec4899",
}

const BILLING_LABELS: Record<string, string> = {
  monthly: "/mo",
  yearly: "/yr",
  "one-time": "one-time",
  "usage-based": "/mo (est)",
}

type Tab = "security" | "costs" | "services"

// --- Component ---

export default function OperationsPage() {
  const [tab, setTab] = useState<Tab>("security")
  const [security, setSecurity] = useState<SecurityItem[]>([])
  const [costs, setCosts] = useState<CostEntry[]>([])
  const [services, setServices] = useState<ServiceEntry[]>([])
  const [summary, setSummary] = useState({ monthlyTotal: 0, yearlyTotal: 0, activeServices: 0 })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [secFilter, setSecFilter] = useState<string>("all")
  const [secStatusFilter, setSecStatusFilter] = useState<string>("all")
  const [showAddForm, setShowAddForm] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/operations")
      .then((r) => r.json())
      .then((data) => {
        setSecurity(data.security || [])
        setCosts(data.costs || [])
        setServices(data.services || [])
        setSummary(data.summary || { monthlyTotal: 0, yearlyTotal: 0, activeServices: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // --- Security actions ---

  const cycleStatus = async (item: SecurityItem) => {
    const order: SecurityItem["status"][] = ["not-started", "in-progress", "done"]
    const next = order[(order.indexOf(item.status) + 1) % 3]
    await fetch("/api/operations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "security", id: item.id, status: next }),
    })
    setSecurity((prev) => prev.map((s) => (s.id === item.id ? { ...s, status: next } : s)))
  }

  const deleteItem = async (type: string, id: string) => {
    await fetch("/api/operations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    })
    load()
  }

  const updateNotes = async (type: string, id: string, notes: string) => {
    await fetch("/api/operations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, notes }),
    })
    if (type === "security") {
      setSecurity((prev) => prev.map((s) => (s.id === id ? { ...s, notes } : s)))
    }
  }

  // --- Add forms ---

  const addSecurity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "security",
        name: fd.get("name"),
        description: fd.get("description"),
        priority: fd.get("priority"),
        category: fd.get("category"),
        status: "not-started",
        notes: "",
      }),
    })
    setShowAddForm(false)
    load()
  }

  const addCost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "cost",
        service: fd.get("service"),
        category: fd.get("category"),
        amount: parseFloat(fd.get("amount") as string) || 0,
        billingCycle: fd.get("billingCycle"),
        startDate: fd.get("startDate"),
        notes: fd.get("notes") || "",
      }),
    })
    setShowAddForm(false)
    load()
  }

  const addService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "service",
        name: fd.get("name"),
        accountEmail: fd.get("accountEmail"),
        plan: fd.get("plan"),
        signupDate: fd.get("signupDate"),
        loginUrl: fd.get("loginUrl"),
        notes: fd.get("notes") || "",
      }),
    })
    setShowAddForm(false)
    load()
  }

  // --- Filtered security items ---

  const filteredSecurity = security.filter((item) => {
    if (secFilter !== "all" && item.category !== secFilter) return false
    if (secStatusFilter !== "all" && item.status !== secStatusFilter) return false
    return true
  })

  const doneCount = security.filter((s) => s.status === "done").length
  const totalCount = security.length
  const criticalPending = security.filter((s) => s.priority === "critical" && s.status !== "done").length

  // --- Priority sort ---
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const sortedSecurity = [...filteredSecurity].sort((a, b) => {
    const statusOrder: Record<string, number> = { "in-progress": 0, "not-started": 1, done: 2 }
    const sd = statusOrder[a.status] - statusOrder[b.status]
    if (sd !== 0) return sd
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // --- Render ---

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="text-[var(--color-text-dim)] text-sm">Loading operations data...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold">OPERATIONS</h1>
          <p className="text-[11px] text-[var(--color-text-dim)]">
            Security posture, costs, and service accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Ambient harness freshness chip — added per ops-harness-audit-2026-04-24
              follow-up #2. /operations is daily-use; surfacing the harness
              age here means a stale dispatcher won't silently mask a bad
              vault state in the background while David is reviewing
              security/cost/service entries. */}
          <HarnessChip />
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-[10px] font-bold border border-[var(--color-border)] hover:border-[var(--color-steel)] hover:text-[var(--color-steel)] transition-colors"
          >
            + ADD
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-[var(--color-border)] mb-4">
        {(["security", "costs", "services"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowAddForm(false) }}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors relative ${
              tab === t
                ? "text-[var(--color-steel)]"
                : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            }`}
          >
            {t === "security" && `Security (${totalCount})`}
            {t === "costs" && `Costs (${costs.length})`}
            {t === "services" && `Services (${services.length})`}
            {tab === t && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-steel)]" />
            )}
          </button>
        ))}
      </div>

      {/* === SECURITY TAB === */}
      {tab === "security" && (
        <div>
          {/* Progress bar */}
          <div className="mb-4 p-3 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold">
                {doneCount}/{totalCount} complete
              </span>
              {criticalPending > 0 && (
                <span className="text-[10px] font-bold" style={{ color: "#ef4444" }}>
                  {criticalPending} critical pending
                </span>
              )}
            </div>
            <div className="h-2 bg-[var(--color-bg)] overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
                  backgroundColor: doneCount === totalCount ? "#22c55e" : "#5b8dce",
                }}
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 mb-2 flex-wrap">
            {["all", "infrastructure", "application", "personal", "monitoring", "legal"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSecFilter(cat)}
                className={`px-2 py-1 text-[10px] border transition-colors ${
                  secFilter === cat
                    ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
              >
                {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {["all", "not-started", "in-progress", "done"].map((st) => (
              <button
                key={st}
                onClick={() => setSecStatusFilter(st)}
                className={`px-2 py-1 text-[10px] border transition-colors ${
                  secStatusFilter === st
                    ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
              >
                {st === "all" ? "All Status" : STATUS_LABELS[st]}
              </button>
            ))}
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={addSecurity} className="mb-4 p-3 border border-[var(--color-steel)]/30 bg-[var(--color-bg-card)] space-y-2">
              <div className="text-[11px] font-bold mb-2">Add Security Item</div>
              <input name="name" required placeholder="Name" className="w-full px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
              <input name="description" required placeholder="Description" className="w-full px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
              <div className="flex gap-2">
                <select name="priority" defaultValue="medium" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select name="category" defaultValue="application" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
                  <option value="infrastructure">Infrastructure</option>
                  <option value="application">Application</option>
                  <option value="personal">Personal</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="legal">Legal</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 text-[10px] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">Cancel</button>
                <button type="submit" className="px-3 py-1 text-[10px] font-bold border border-[var(--color-steel)] text-[var(--color-steel)] hover:bg-[var(--color-steel)]/10">Add</button>
              </div>
            </form>
          )}

          {/* Security list */}
          <div className="space-y-1">
            {sortedSecurity.map((item) => (
              <div key={item.id} className="border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border)]/80 transition-colors"
                style={{ borderLeftWidth: 3, borderLeftColor: PRIORITY_COLORS[item.priority] }}>
                <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => toggle(item.id)}>
                  {/* Status toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); cycleStatus(item) }}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center border text-[10px] font-bold transition-colors"
                    style={{
                      borderColor: STATUS_COLORS[item.status],
                      color: STATUS_COLORS[item.status],
                      backgroundColor: item.status === "done" ? STATUS_COLORS[item.status] + "20" : "transparent",
                    }}
                    title={`Click to cycle: ${STATUS_LABELS[item.status]}`}
                  >
                    {STATUS_ICONS[item.status]}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-bold ${item.status === "done" ? "line-through opacity-50" : ""}`}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-dim)] truncate">{item.description}</div>
                  </div>

                  {/* Badges */}
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 border" style={{ borderColor: PRIORITY_COLORS[item.priority], color: PRIORITY_COLORS[item.priority] }}>
                    {item.priority}
                  </span>
                  <span className="text-[8px] text-[var(--color-text-dim)] uppercase">{item.category}</span>

                  <svg width={12} height={12} className={`flex-shrink-0 text-[var(--color-text-dim)] transition-transform ${expanded.has(item.id) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded */}
                {expanded.has(item.id) && (
                  <div className="px-3 pb-3 border-t border-[var(--color-border)] pt-2 ml-8">
                    <textarea
                      value={item.notes}
                      onChange={(e) => {
                        const val = e.target.value
                        setSecurity((prev) => prev.map((s) => (s.id === item.id ? { ...s, notes: val } : s)))
                      }}
                      onBlur={(e) => updateNotes("security", item.id, e.target.value)}
                      placeholder="Add notes..."
                      className="w-full px-2 py-1.5 text-[10px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)] min-h-[40px] resize-y"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-[var(--color-text-dim)]">
                        Updated: {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => deleteItem("security", item.id)}
                        className="text-[9px] text-[var(--color-red)] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {sortedSecurity.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-dim)] text-[11px]">
              No items match filters
            </div>
          )}
        </div>
      )}

      {/* === COSTS TAB === */}
      {tab === "costs" && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Monthly</div>
              <div className="text-xl font-bold" style={{ color: summary.monthlyTotal < 50 ? "#22c55e" : summary.monthlyTotal < 200 ? "#f59e0b" : "#ef4444" }}>
                ${summary.monthlyTotal.toFixed(2)}
              </div>
            </div>
            <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Yearly</div>
              <div className="text-xl font-bold text-[var(--color-text)]">
                ${summary.yearlyTotal.toFixed(2)}
              </div>
            </div>
            <div className="p-3 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider mb-1">Services</div>
              <div className="text-xl font-bold text-[var(--color-steel)]">
                {summary.activeServices}
              </div>
            </div>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={addCost} className="mb-4 p-3 border border-[var(--color-steel)]/30 bg-[var(--color-bg-card)] space-y-2">
              <div className="text-[11px] font-bold mb-2">Add Cost Entry</div>
              <input name="service" required placeholder="Service name" className="w-full px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
              <div className="flex gap-2">
                <select name="category" defaultValue="tools" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
                  <option value="hosting">Hosting</option>
                  <option value="security">Security</option>
                  <option value="tools">Tools</option>
                  <option value="api">API</option>
                  <option value="domain">Domain</option>
                  <option value="ai">AI</option>
                </select>
                <input name="amount" type="number" step="0.01" required placeholder="Amount ($)" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
                <select name="billingCycle" defaultValue="monthly" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)]">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time</option>
                  <option value="usage-based">Usage-based</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input name="startDate" type="date" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
                <input name="notes" placeholder="Notes (optional)" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 text-[10px] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">Cancel</button>
                <button type="submit" className="px-3 py-1 text-[10px] font-bold border border-[var(--color-steel)] text-[var(--color-steel)] hover:bg-[var(--color-steel)]/10">Add</button>
              </div>
            </form>
          )}

          {/* Cost list */}
          <div className="space-y-1">
            {costs.map((cost) => (
              <div key={cost.id} className="border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-border)]/80 transition-colors">
                <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => toggle(cost.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold">{cost.service}</div>
                    {cost.notes && <div className="text-[10px] text-[var(--color-text-dim)] truncate">{cost.notes}</div>}
                  </div>

                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 border" style={{ borderColor: COST_CATEGORY_COLORS[cost.category] || "var(--color-border)", color: COST_CATEGORY_COLORS[cost.category] || "var(--color-text-dim)" }}>
                    {cost.category}
                  </span>

                  <div className="text-right flex-shrink-0">
                    <div className="text-[12px] font-bold" style={{ color: cost.amount > 0 ? "var(--color-text)" : "#22c55e" }}>
                      ${cost.amount}{BILLING_LABELS[cost.billingCycle]}
                    </div>
                    {cost.billingCycle === "yearly" && cost.amount > 0 && (
                      <div className="text-[9px] text-[var(--color-text-dim)]">
                        ${(cost.amount / 12).toFixed(2)}/mo
                      </div>
                    )}
                  </div>

                  <svg width={12} height={12} className={`flex-shrink-0 text-[var(--color-text-dim)] transition-transform ${expanded.has(cost.id) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {expanded.has(cost.id) && (
                  <div className="px-3 pb-3 border-t border-[var(--color-border)] pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-[var(--color-text-dim)]">
                        {cost.startDate ? `Started: ${cost.startDate}` : "Start date not set"}
                      </span>
                      <button
                        onClick={() => deleteItem("cost", cost.id)}
                        className="text-[9px] text-[var(--color-red)] hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {costs.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-dim)] text-[11px]">
              No cost entries yet
            </div>
          )}
        </div>
      )}

      {/* === SERVICES TAB === */}
      {tab === "services" && (
        <div>
          {/* Add form */}
          {showAddForm && (
            <form onSubmit={addService} className="mb-4 p-3 border border-[var(--color-steel)]/30 bg-[var(--color-bg-card)] space-y-2">
              <div className="text-[11px] font-bold mb-2">Add Service Account</div>
              <div className="flex gap-2">
                <input name="name" required placeholder="Service name" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
                <input name="plan" placeholder="Plan / tier" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
              </div>
              <div className="flex gap-2">
                <input name="accountEmail" placeholder="Account email / username" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
                <input name="signupDate" type="date" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
              </div>
              <div className="flex gap-2">
                <input name="loginUrl" placeholder="Login URL" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
                <input name="notes" placeholder="Notes" className="flex-1 px-2 py-1.5 text-[11px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-steel)]" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 text-[10px] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">Cancel</button>
                <button type="submit" className="px-3 py-1 text-[10px] font-bold border border-[var(--color-steel)] text-[var(--color-steel)] hover:bg-[var(--color-steel)]/10">Add</button>
              </div>
            </form>
          )}

          {/* Services grid */}
          <div className="space-y-2">
            {services.map((svc) => (
              <div key={svc.id} className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[12px] font-bold">{svc.name}</div>
                    <div className="text-[10px] text-[var(--color-steel)]">{svc.plan}</div>
                  </div>
                  {svc.loginUrl && (
                    <a
                      href={svc.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-[var(--color-steel)] hover:underline"
                    >
                      Login &rarr;
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  {svc.accountEmail && (
                    <>
                      <span className="text-[var(--color-text-dim)]">Account</span>
                      <span className="text-[var(--color-text)]">{svc.accountEmail}</span>
                    </>
                  )}
                  {svc.signupDate && (
                    <>
                      <span className="text-[var(--color-text-dim)]">Signed up</span>
                      <span className="text-[var(--color-text)]">{svc.signupDate}</span>
                    </>
                  )}
                  {svc.notes && (
                    <>
                      <span className="text-[var(--color-text-dim)]">Notes</span>
                      <span className="text-[var(--color-text)]">{svc.notes}</span>
                    </>
                  )}
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => deleteItem("service", svc.id)}
                    className="text-[9px] text-[var(--color-red)] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {services.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-dim)] text-[11px]">
              No service accounts tracked yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}
