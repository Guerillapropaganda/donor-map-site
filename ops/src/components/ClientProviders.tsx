"use client"

import { CommandPalette } from "./CommandPalette"
import { KeyboardShortcuts } from "./KeyboardShortcuts"

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
      <KeyboardShortcuts />
    </>
  )
}
