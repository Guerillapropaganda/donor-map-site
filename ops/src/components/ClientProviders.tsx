"use client"

import { CommandPalette } from "./CommandPalette"
import { KeyboardShortcuts } from "./KeyboardShortcuts"
import { ToastProvider } from "./ToastProvider"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <CommandPalette />
      <KeyboardShortcuts />
    </ToastProvider>
  )
}
