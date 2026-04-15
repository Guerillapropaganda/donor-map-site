#!/usr/bin/env node
// ops-surface-audit.cjs — Pillar 3 inventory of every Ops surface
//
// Walks ops/src/app/ for:
//   - page routes (page.tsx files) — the user-facing pages
//   - API routes (api/**/route.ts files) — the server-side endpoints
//
// For each page, parses the file for fetch("/api/...") calls and
// records the dependency. For each API route, reads the file to
// detect auth requirements (requireAdmin / requireTier).
//
// Produces a manifest at ops/src/data/ops-surfaces.json that the
// /system-health page reads to render its dashboard. The manifest
// is REGENERATED on demand by running this script; the /system-health
// page does live-checks (via client-side fetch) on top of the static
// manifest.
//
// Output:
//   ops/src/data/ops-surfaces.json   — structured manifest
//   content/Admin Notes/ops-surface-audit.md — human-readable report
//
// Usage:
//   node scripts/ops-surface-audit.cjs              # dry-run (preview)
//   node scripts/ops-surface-audit.cjs --write      # write both outputs

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const APP_DIR = path.join(ROOT, "ops", "src", "app")
const API_DIR = path.join(APP_DIR, "api")
const MANIFEST_PATH = path.join(ROOT, "ops", "src", "data", "ops-surfaces.json")
const REPORT_PATH = path.join(ROOT, "content", "Admin Notes", "ops-surface-audit.md")

const WRITE = process.argv.includes("--write")

// ─── Sidebar order (for stable display) ───────────────────────────────
// Mirrors ops/src/components/Sidebar.tsx NAV_ITEMS so /system-health
// shows surfaces in the same order as the sidebar itself.
const SIDEBAR_ORDER = [
  { route: "/", label: "Dashboard" },
  { route: "/attention", label: "Attention Queue" },
  { route: "/pipelines", label: "Pipelines" },
  { route: "/signoff-queue", label: "Sign-off Queue" },
  { route: "/notes", label: "Notes & Queues" },
  { route: "/tips", label: "Public Tips" },
  { route: "/urls", label: "URL Manager" },
  { route: "/source-hunter", label: "Source Hunter" },
  { route: "/relationships", label: "Relationships" },
  { route: "/editor", label: "Editor" },
  { route: "/publisher", label: "Publisher" },
  { route: "/profile", label: "Profile View" },
  { route: "/money-trail", label: "Money Trail" },
  { route: "/capitol-trades", label: "Capitol Trades" },
  { route: "/calendar", label: "Calendar" },
  { route: "/alerts", label: "Alerts" },
  { route: "/distribution", label: "Distribution" },
  { route: "/rules", label: "Rulebook" },
  { route: "/operations", label: "Operations" },
  { route: "/docs", label: "System Docs" },
  { route: "/scripts", label: "Scripts" },
  { route: "/sources", label: "Source Registry" },
  { route: "/class-tags", label: "Class Tags" },
  { route: "/policies", label: "Policies" },
  { route: "/query", label: "Query Engine" },
  { route: "/account", label: "Account" },
  { route: "/pricing", label: "Pricing" },
]

// ─── Page discovery ──────────────────────────────────────────────────

function findPageFiles(dir) {
  const pages = []
  function walk(current) {
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const p = path.join(current, e.name)
      if (e.isDirectory()) {
        // Skip API routes — those are handled separately
        if (p === API_DIR) continue
        walk(p)
      } else if (e.name === "page.tsx") {
        pages.push(p)
      }
    }
  }
  walk(dir)
  return pages
}

function findApiRoutes(dir) {
  const routes = []
  function walk(current) {
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const p = path.join(current, e.name)
      if (e.isDirectory()) {
        walk(p)
      } else if (e.name === "route.ts") {
        routes.push(p)
      }
    }
  }
  walk(dir)
  return routes
}

// ─── Route derivation ────────────────────────────────────────────────
// ops/src/app/policies/page.tsx → /policies
// ops/src/app/sign-in/[[...sign-in]]/page.tsx → /sign-in
// ops/src/app/page.tsx → /
// ops/src/app/api/policies/route.ts → /api/policies
// ops/src/app/api/policies/[slug]/preview/route.ts → /api/policies/:slug/preview

function pageFileToRoute(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, "/")
  // Strip /page.tsx
  let route = rel.replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "")
  // Strip Next.js route groups: (group)/...
  route = route.replace(/\/?\(([^)]+)\)/g, "")
  // Strip catch-all: [[...slug]]
  route = route.replace(/\/?\[\[\.\.\.([^\]]+)\]\]/g, "")
  // Dynamic segment: [slug] → :slug
  route = route.replace(/\[([^\]]+)\]/g, ":$1")
  return "/" + route
}

function apiFileToRoute(filePath) {
  const rel = path.relative(APP_DIR, filePath).replace(/\\/g, "/")
  let route = rel.replace(/\/route\.ts$/, "")
  route = route.replace(/\/?\(([^)]+)\)/g, "")
  route = route.replace(/\/?\[\[\.\.\.([^\]]+)\]\]/g, "")
  route = route.replace(/\[([^\]]+)\]/g, ":$1")
  return "/" + route
}

// ─── Dependency parsing ──────────────────────────────────────────────

function parsePageDependencies(filePath) {
  let content
  try {
    content = fs.readFileSync(filePath, "utf-8")
  } catch {
    return []
  }
  // Match fetch("/api/...") or fetch('/api/...') or fetch(`/api/...`)
  const deps = new Set()
  const re = /fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g
  let m
  while ((m = re.exec(content)) !== null) {
    const url = m[1]
    if (url.startsWith("/api/")) {
      // Normalize template-literal placeholders: /api/policies/${slug}/preview → /api/policies/:slug/preview
      const normalized = url.replace(/\$\{[^}]+\}/g, ":param")
      deps.add(normalized)
    }
  }
  return [...deps].sort()
}

function parseApiAuth(filePath) {
  let content
  try {
    content = fs.readFileSync(filePath, "utf-8")
  } catch {
    return { auth: "unknown" }
  }
  if (content.includes("requireAdmin")) return { auth: "admin" }
  // Check for requireTier("tier-name")
  const tierMatch = content.match(/requireTier\s*\([^,]+,\s*["']([^"']+)["']/)
  if (tierMatch) return { auth: `tier:${tierMatch[1]}` }
  if (content.includes("requireTier")) return { auth: "tier:unknown" }
  return { auth: "public" }
}

function parseHttpMethods(filePath) {
  let content
  try {
    content = fs.readFileSync(filePath, "utf-8")
  } catch {
    return []
  }
  const methods = []
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
    const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`)
    if (re.test(content)) methods.push(m)
  }
  return methods
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ ops-surface-audit ═══")
  console.log("")

  const pageFiles = findPageFiles(APP_DIR)
  console.log(`  ${pageFiles.length} page files found`)

  const apiFiles = findApiRoutes(API_DIR)
  console.log(`  ${apiFiles.length} API route files found`)
  console.log("")

  // Build page surfaces
  const pageSurfaces = pageFiles.map((f) => {
    const route = pageFileToRoute(f)
    const rel = path.relative(ROOT, f).replace(/\\/g, "/")
    const deps = parsePageDependencies(f)
    const sidebarEntry = SIDEBAR_ORDER.find((s) => s.route === route)
    const label = sidebarEntry?.label || route
    return {
      route,
      label,
      file: rel,
      type: "page",
      api_dependencies: deps,
      in_sidebar: !!sidebarEntry,
    }
  })

  // Sort pages by sidebar order first, then alphabetical
  pageSurfaces.sort((a, b) => {
    const ia = SIDEBAR_ORDER.findIndex((s) => s.route === a.route)
    const ib = SIDEBAR_ORDER.findIndex((s) => s.route === b.route)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.route.localeCompare(b.route)
  })

  // Build API surfaces
  const apiSurfaces = apiFiles.map((f) => {
    const route = apiFileToRoute(f)
    const rel = path.relative(ROOT, f).replace(/\\/g, "/")
    const methods = parseHttpMethods(f)
    const auth = parseApiAuth(f)
    return {
      route,
      file: rel,
      type: "api",
      methods,
      auth: auth.auth,
    }
  })
  apiSurfaces.sort((a, b) => a.route.localeCompare(b.route))

  // Stats
  const inSidebar = pageSurfaces.filter((p) => p.in_sidebar).length
  const orphanPages = pageSurfaces.filter((p) => !p.in_sidebar).length
  const publicApis = apiSurfaces.filter((a) => a.auth === "public").length
  const adminApis = apiSurfaces.filter((a) => a.auth === "admin").length
  const tierApis = apiSurfaces.filter((a) => a.auth?.startsWith("tier:")).length

  console.log(`  ${inSidebar} pages in sidebar`)
  console.log(`  ${orphanPages} orphan pages (exist but not in sidebar)`)
  console.log(`  ${apiSurfaces.length} API routes`)
  console.log(`    ${publicApis} public / ${adminApis} admin / ${tierApis} tier-gated`)
  console.log("")

  // Detect orphan deps — API calls that don't match any API route
  const apiRouteSet = new Set(apiSurfaces.map((a) => a.route))
  const orphanDeps = new Set()
  for (const p of pageSurfaces) {
    for (const dep of p.api_dependencies) {
      // Strip query params for matching
      const base = dep.split("?")[0].replace(/:param/g, ":param")
      // Try exact match first
      if (apiRouteSet.has(base)) continue
      // Try param-fuzzy match: /api/policies/:slug/preview matches /api/policies/:param/preview
      let matched = false
      for (const apiRoute of apiRouteSet) {
        const apiTemplate = apiRoute.replace(/:[a-zA-Z_]+/g, ":X")
        const depTemplate = base.replace(/:[a-zA-Z_]+/g, ":X")
        if (apiTemplate === depTemplate) {
          matched = true
          break
        }
      }
      if (!matched) orphanDeps.add(`${p.route} → ${dep}`)
    }
  }

  if (orphanDeps.size > 0) {
    console.log(`  ⚠ ${orphanDeps.size} page→API dependencies with no matching route file:`)
    for (const od of [...orphanDeps].slice(0, 10)) {
      console.log(`    ${od}`)
    }
    if (orphanDeps.size > 10) console.log(`    ... +${orphanDeps.size - 10} more`)
    console.log("")
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    stats: {
      total_pages: pageSurfaces.length,
      pages_in_sidebar: inSidebar,
      orphan_pages: orphanPages,
      total_api_routes: apiSurfaces.length,
      public_apis: publicApis,
      admin_apis: adminApis,
      tier_apis: tierApis,
      orphan_dependencies: orphanDeps.size,
    },
    sidebar_order: SIDEBAR_ORDER,
    pages: pageSurfaces,
    api_routes: apiSurfaces,
    orphan_dependencies: [...orphanDeps],
  }

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to save manifest + report")
    return
  }

  // Write manifest
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, MANIFEST_PATH)}`)

  // Write human-readable report
  const reportLines = []
  reportLines.push("---")
  reportLines.push('title: "Ops Surface Audit"')
  reportLines.push("type: admin-note")
  reportLines.push("note-type: data")
  reportLines.push("status: active")
  reportLines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  reportLines.push("generator: scripts/ops-surface-audit.cjs")
  reportLines.push("---")
  reportLines.push("")
  reportLines.push("# Ops Surface Audit")
  reportLines.push("")
  reportLines.push(
    "Static inventory of every page + API route in the Ops app. Generated by walking `ops/src/app/` and parsing each file. This is the backing manifest for the `/system-health` Ops dashboard (ADR-0009 Pillar 3). Re-run the script after adding any new page or API route.",
  )
  reportLines.push("")
  reportLines.push("## Stats")
  reportLines.push("")
  reportLines.push(`- **Total pages:** ${pageSurfaces.length}`)
  reportLines.push(`- **In sidebar:** ${inSidebar}`)
  reportLines.push(`- **Orphan pages (exist but not in sidebar):** ${orphanPages}`)
  reportLines.push(`- **Total API routes:** ${apiSurfaces.length}`)
  reportLines.push(`  - Public: ${publicApis}`)
  reportLines.push(`  - Admin-only: ${adminApis}`)
  reportLines.push(`  - Tier-gated: ${tierApis}`)
  reportLines.push(`- **Orphan page→API dependencies (unmatched):** ${orphanDeps.size}`)
  reportLines.push("")

  reportLines.push("## Pages (sidebar order)")
  reportLines.push("")
  reportLines.push("| Route | Label | API dependencies | File |")
  reportLines.push("|---|---|---:|---|")
  for (const p of pageSurfaces) {
    const depCount = p.api_dependencies.length
    const sidebarFlag = p.in_sidebar ? "" : " ⚠ orphan"
    reportLines.push(`| \`${p.route}\`${sidebarFlag} | ${p.label} | ${depCount} | \`${p.file}\` |`)
  }
  reportLines.push("")

  reportLines.push("## API routes")
  reportLines.push("")
  reportLines.push("| Route | Methods | Auth | File |")
  reportLines.push("|---|---|---|---|")
  for (const a of apiSurfaces) {
    reportLines.push(`| \`${a.route}\` | ${a.methods.join(", ") || "?"} | ${a.auth} | \`${a.file}\` |`)
  }
  reportLines.push("")

  if (orphanDeps.size > 0) {
    reportLines.push("## ⚠ Orphan page→API dependencies")
    reportLines.push("")
    reportLines.push(
      "These are `fetch('/api/...')` calls in page files that don't match any API route file we found. Either the API route was deleted, the URL has a typo, or the dependency is dynamically constructed in a way the static parser missed.",
    )
    reportLines.push("")
    for (const od of orphanDeps) {
      reportLines.push(`- ${od}`)
    }
    reportLines.push("")
  }

  reportLines.push("---")
  reportLines.push("")
  reportLines.push("*Regenerate: `node scripts/ops-surface-audit.cjs --write`.*")
  reportLines.push("")

  fs.writeFileSync(REPORT_PATH, reportLines.join("\n"), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, REPORT_PATH)}`)
  console.log("")
}

main()
