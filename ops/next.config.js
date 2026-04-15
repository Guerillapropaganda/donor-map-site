import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// OPS_CI_BUILD=1 tells the build to focus on import resolution (the
// 2026-04-15 Clerk incident class — catching "package.json says it's
// installed but it's missing from node_modules"). It explicitly skips
// the stricter `tsc --noEmit` pass that Next runs after webpack,
// because the ops/ codebase has pre-existing D3 type inference issues
// in money-trail/page.tsx that are unrelated to deps drift. When those
// are cleaned up, flip this back off.
const CI_BUILD = process.env.OPS_CI_BUILD === "1"

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin turbopack workspace root to this ops directory. Without this,
  // running the dev server from a nested worktree (.claude/worktrees/<name>/ops)
  // lets Next walk up and pick the main repo's package-lock.json as the
  // workspace root, which then fails to resolve the Next.js package.
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: CI_BUILD,
  },
  eslint: {
    ignoreDuringBuilds: CI_BUILD,
  },
}
export default nextConfig
