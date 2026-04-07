import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { urls } = body as { urls: string[] }

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: "urls array required" }, { status: 400 })
    }

    // Check URLs in parallel (max 10 at a time)
    const BATCH_SIZE = 10
    const results: Record<string, { status: "ok" | "broken" | "slow" | "redirect"; code?: number; ms?: number; redirectUrl?: string }> = {}

    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE)

      const checks = await Promise.allSettled(
        batch.map(async (url) => {
          const start = Date.now()
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 10000)

            const res = await fetch(url, {
              method: "HEAD",
              redirect: "follow",
              signal: controller.signal,
              headers: {
                "User-Agent": "DonorMapOps/1.0 (link-checker)",
              },
            })

            clearTimeout(timeout)
            const ms = Date.now() - start

            if (res.ok) {
              if (ms > 5000) {
                return { url, status: "slow" as const, code: res.status, ms }
              }
              // Check for redirect
              if (res.redirected && res.url !== url) {
                return { url, status: "redirect" as const, code: res.status, ms, redirectUrl: res.url }
              }
              return { url, status: "ok" as const, code: res.status, ms }
            }

            // Some servers block HEAD — retry with GET
            if (res.status === 405 || res.status === 403) {
              const getRes = await fetch(url, {
                method: "GET",
                redirect: "follow",
                signal: AbortSignal.timeout(10000),
                headers: { "User-Agent": "DonorMapOps/1.0 (link-checker)" },
              })
              const getMs = Date.now() - start
              if (getRes.ok) {
                return { url, status: getMs > 5000 ? "slow" as const : "ok" as const, code: getRes.status, ms: getMs }
              }
              return { url, status: "broken" as const, code: getRes.status, ms: getMs }
            }

            return { url, status: "broken" as const, code: res.status, ms }
          } catch {
            return { url, status: "broken" as const, ms: Date.now() - start }
          }
        })
      )

      for (const result of checks) {
        if (result.status === "fulfilled") {
          const r = result.value
          results[r.url] = { status: r.status, code: r.code, ms: r.ms, redirectUrl: r.redirectUrl }
        }
      }
    }

    return NextResponse.json({ results })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
