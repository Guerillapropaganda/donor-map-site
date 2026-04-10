"use client"

import { createContext, useContext, useState, useCallback, useRef } from "react"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const TYPE_STYLES: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", text: "#22c55e", icon: "\u2713" },
  error: { bg: "rgba(239,68,71,0.12)", border: "rgba(239,68,71,0.3)", text: "#ef4444", icon: "\u2717" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#f59e0b", icon: "\u26A0" },
  info: { bg: "rgba(91,141,206,0.12)", border: "rgba(91,141,206,0.3)", text: "#5b8dce", icon: "\u2139" },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current
    setToasts(prev => [...prev.slice(-2), { id, message, type }]) // max 3
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 360 }}>
        {toasts.map((t, i) => {
          const s = TYPE_STYLES[t.type]
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: `1px solid ${s.border}`,
                animation: "slideIn 0.25s ease-out",
              }}
            >
              <span className="text-sm font-bold mt-0.5" style={{ color: s.text }}>{s.icon}</span>
              <p className="text-[11px] text-[var(--color-text)] flex-1 leading-relaxed">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-xs ml-2 mt-0.5"
              >
                \u2715
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
