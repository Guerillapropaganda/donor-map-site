"use client"

import React from "react"

/**
 * PageHeader — uniform "what this does / right now / action" banner
 * that drops at the top of every ops page.
 *
 * Per the 2026-04-26 ops UX redesign:
 *   - title: imperative noun phrase ("Class Tag Review", "Sign-off Queue")
 *   - whatThisDoes: 1–2 sentences, plain English, no jargon
 *   - rightNow: dynamic "what's outstanding right now" — typically a
 *     count + a one-liner ("13 reconciled proposals need your eye, oldest
 *     11d"). Pass null to skip — pages without per-instance state don't
 *     need a Right Now line.
 *   - action: how to use the page (keyboard shortcuts / next click).
 *     One sentence. Always present.
 *   - href: optional canonical link (e.g. /attention deeplink, GitHub
 *     issue tracker, etc.) shown on the right edge as a small ↗ link.
 *
 * Components MAY pass `rightNow` as a React node so dynamic counts can
 * embed badges. The shared shape lets you scan any page in 5 seconds.
 */
export interface PageHeaderProps {
  title: string
  whatThisDoes: string
  rightNow?: React.ReactNode | null
  action: string
  href?: { label: string; url: string }
}

export function PageHeader({ title, whatThisDoes, rightNow, action, href }: PageHeaderProps) {
  return (
    <div
      style={{
        marginBottom: "1.5rem",
        padding: "1rem 1.25rem",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "0.5rem",
        display: "grid",
        gridTemplateColumns: href ? "1fr auto" : "1fr",
        gap: "1rem",
        alignItems: "start",
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "1.5rem",
            color: "#f3f4f6",
            fontWeight: 700,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            marginTop: "0.5rem",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            columnGap: "0.75rem",
            rowGap: "0.35rem",
            fontSize: "0.85rem",
            lineHeight: "1.4",
          }}
        >
          <span style={{ color: "#9ca3af", whiteSpace: "nowrap", fontVariant: "small-caps", letterSpacing: "0.05em" }}>
            What this does
          </span>
          <span style={{ color: "#e5e7eb" }}>{whatThisDoes}</span>

          {rightNow != null && (
            <>
              <span style={{ color: "#fbbf24", whiteSpace: "nowrap", fontVariant: "small-caps", letterSpacing: "0.05em" }}>
                Right now
              </span>
              <span style={{ color: "#e5e7eb" }}>{rightNow}</span>
            </>
          )}

          <span style={{ color: "#9ca3af", whiteSpace: "nowrap", fontVariant: "small-caps", letterSpacing: "0.05em" }}>
            Action
          </span>
          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>{action}</span>
        </div>
      </div>

      {href && (
        <a
          href={href.url}
          style={{
            color: "#9ca3af",
            fontSize: "0.75rem",
            textDecoration: "none",
            whiteSpace: "nowrap",
            padding: "0.35rem 0.65rem",
            border: "1px solid #374151",
            borderRadius: "0.25rem",
          }}
        >
          {href.label} ↗
        </a>
      )}
    </div>
  )
}
