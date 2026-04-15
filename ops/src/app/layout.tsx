import type { Metadata } from "next"
import "./globals.css"
import { Sidebar } from "@/components/Sidebar"
import { ClientProviders } from "@/components/ClientProviders"
import { LayoutBreadcrumbs } from "@/components/LayoutBreadcrumbs"
import { DevModeBanner } from "@/components/DevModeBanner"
import { ClerkProvider } from "@clerk/nextjs"

export const metadata: Metadata = {
  title: "Donor Map Ops",
  description: "The Donor Map Operations Center",
}

// Force every page and API route to render dynamically at request time.
// The Ops app reads live JSONL data on every request — static
// prerendering is never correct for it, and trying to prerender forces
// useSearchParams() / cookies() / headers() callers into awkward
// Suspense boundary workarounds (see the 2026-04-15 /editor prerender
// failure). This one line makes all of ops/ a live-data app, which
// is what it actually is.
export const dynamic = "force-dynamic"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ClerkProvider wraps the entire app so any server component / client
  // component can read the Clerk session. It's a no-op visually — no
  // layout impact. See content/Admin Notes/phase-2.5-setup.md for the
  // full Phase 2.5 activation steps.
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap"
            rel="stylesheet"
          />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0c0c0f" />
          <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </head>
        <body className="flex flex-col min-h-screen">
          <DevModeBanner />
          <ClientProviders>
            <div className="flex flex-1 min-h-0">
              <Sidebar />
              <main className="flex-1 ml-0 md:ml-56 p-4 md:p-6 overflow-auto">
                <LayoutBreadcrumbs />
                {children}
              </main>
            </div>
          </ClientProviders>
        </body>
      </html>
    </ClerkProvider>
  )
}
