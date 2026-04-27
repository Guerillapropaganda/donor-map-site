"use client"

import { useState } from "react"
import { TEMPLATES, generateFilePath, generateContent } from "@/lib/templates"
import type { ProfileTemplate } from "@/lib/templates"
import { PageHeader } from "@/components/PageHeader"

export default function PublisherPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ProfileTemplate | null>(null)
  const [subfolder, setSubfolder] = useState<string>("")
  const [values, setValues] = useState<Record<string, string>>({})
  const [body, setBody] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const setField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => {
    setSelectedTemplate(null)
    setSubfolder("")
    setValues({})
    setBody("")
    setResult(null)
  }

  const filePath = selectedTemplate && values.title
    ? generateFilePath(selectedTemplate, values.title, subfolder || undefined)
    : null

  const publish = async () => {
    if (!selectedTemplate || !values.title || !filePath) return
    setPublishing(true)
    setResult(null)

    const content = generateContent(selectedTemplate, { ...values, _body: body })

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content, title: values.title }),
      })
      const data = await res.json()

      if (data.error) {
        setResult({ type: "error", message: data.error })
      } else {
        setResult({ type: "success", message: `Created: ${data.path}` })
      }
    } catch {
      setResult({ type: "error", message: "Failed to publish" })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Content Publisher"
        whatThisDoes="Create new vault profiles from templates — politicians, donors, corporations, think tanks, etc. Templates auto-generate the correct folder path, file naming convention, and required frontmatter so the new profile lands in the right place with valid schema from minute one."
        action="Pick a template card → fill the basics (name, slug, type-specific fields) → preview → save. Saves to content/<correct-folder>/<correct-name>.md and applies template-specified content_readiness."
      />

      {/* Template picker */}
      {!selectedTemplate ? (
        <div>
          <h2 className="text-xs font-bold text-[var(--color-text)] mb-3">Choose a template</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setValues({ "content-readiness": "raw" }) }}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 text-left hover:border-current transition-all group"
                style={{ "--hover-color": t.color } as React.CSSProperties}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mb-3"
                  style={{ backgroundColor: `${t.color}15`, color: t.color }}
                >
                  {t.label[0]}
                </div>
                <p className="text-xs font-bold text-[var(--color-text)] mb-0.5">{t.label}</p>
                <p className="text-[9px] text-[var(--color-text-dim)]">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Back button + template name */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={reset}
              className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
            >
              <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: `${selectedTemplate.color}15`, color: selectedTemplate.color }}
            >
              {selectedTemplate.label[0]}
            </div>
            <span className="text-sm font-bold text-[var(--color-text)]">New {selectedTemplate.label}</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Form */}
            <div className="xl:col-span-2 space-y-4">
              {/* Subfolder picker */}
              {selectedTemplate.subfolders && (
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">
                    Category / Folder
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.subfolders.map((sf) => (
                      <button
                        key={sf.key}
                        onClick={() => setSubfolder(sf.key)}
                        className={`text-[9px] px-2.5 py-1.5 rounded border transition-all ${
                          subfolder === sf.key
                            ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10"
                            : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-text-dim)]"
                        }`}
                      >
                        {sf.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fields */}
              {selectedTemplate.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">
                    {field.label} {field.required && <span className="text-[var(--color-red)]">*</span>}
                  </label>
                  {field.type === "select" ? (
                    <select
                      value={values[field.key] || field.default || ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={values[field.key] || ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] min-h-[80px] resize-y"
                    />
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={values[field.key] || field.default || ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
                    />
                  )}
                </div>
              ))}

              {/* Body content */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">
                  Body Content (optional)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write profile content here... You can use markdown."
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] min-h-[160px] resize-y"
                />
              </div>
            </div>

            {/* Preview sidebar */}
            <div>
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 sticky top-6">
                <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Preview</h3>

                {/* File path */}
                <div className="mb-3">
                  <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-0.5">File Path</span>
                  <p className="text-[10px] text-[var(--color-steel)] break-all">
                    {filePath || <span className="text-[var(--color-text-dim)]">Enter a name to see the path...</span>}
                  </p>
                </div>

                {/* Frontmatter preview */}
                <div className="mb-3">
                  <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-0.5">Frontmatter</span>
                  <pre className="text-[9px] text-[var(--color-text-dim)] bg-[var(--color-bg)] rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                    {selectedTemplate && values.title
                      ? generateContent(selectedTemplate, { ...values, _body: "" }).split("---")[1]?.trim() || "..."
                      : "Fill in fields to preview..."}
                  </pre>
                </div>

                {/* Publish button */}
                <button
                  onClick={publish}
                  disabled={publishing || !values.title || (selectedTemplate.subfolders && !subfolder)}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2.5 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-40"
                >
                  {publishing ? "Publishing..." : "Publish to Vault"}
                </button>

                {/* Validation hints */}
                {selectedTemplate.subfolders && !subfolder && (
                  <p className="text-[9px] text-[var(--color-amber)] mt-2">Select a category above</p>
                )}
                {!values.title && (
                  <p className="text-[9px] text-[var(--color-amber)] mt-1">Name is required</p>
                )}

                {/* Result */}
                {result && (
                  <div className={`mt-3 text-[10px] p-2 rounded ${
                    result.type === "success"
                      ? "bg-[var(--color-green)]/10 text-[var(--color-green)]"
                      : "bg-[var(--color-red)]/10 text-[var(--color-red)]"
                  }`}>
                    {result.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
