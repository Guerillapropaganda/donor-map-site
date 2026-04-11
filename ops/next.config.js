import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin turbopack workspace root to this ops directory. Without this,
  // running the dev server from a nested worktree (.claude/worktrees/<name>/ops)
  // lets Next walk up and pick the main repo's package-lock.json as the
  // workspace root, which then fails to resolve the Next.js package.
  turbopack: {
    root: __dirname,
  },
}
export default nextConfig
