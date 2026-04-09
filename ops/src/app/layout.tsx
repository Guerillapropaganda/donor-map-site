import type { Metadata } from "next"
import "./globals.css"
import { Sidebar } from "@/components/Sidebar"
import { ClientProviders } from "@/components/ClientProviders"

export const metadata: Metadata = {
  title: "Donor Map Ops",
  description: "The Donor Map Operations Center",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
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
      <body className="flex min-h-screen">
        <ClientProviders>
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-56 p-4 md:p-6 overflow-auto">{children}</main>
        </ClientProviders>
      </body>
    </html>
  )
}
