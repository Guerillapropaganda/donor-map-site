import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")
const SECURITY_FILE = path.join(DATA_DIR, "security-checklist.json")
const COSTS_FILE = path.join(DATA_DIR, "cost-tracker.json")

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const now = () => new Date().toISOString()

// --- Seed data ---

const SECURITY_SEED = {
  items: [
    // --- Infrastructure ---
    // Dashboard: https://dash.cloudflare.com — DNS, SSL, Transform Rules, Workers
    { id: "cf-proxy", name: "Cloudflare DNS proxy", description: "All traffic routes through Cloudflare. DDoS protection, CDN, origin IP hidden.", status: "done", priority: "critical", category: "infrastructure", notes: "Done 2026-04-15. Dashboard: https://dash.cloudflare.com | Nameservers: liv.ns.cloudflare.com + tadeo.ns.cloudflare.com | SSL: Full mode | HSTS: 6 months | Min TLS: 1.2 | Always HTTPS: on | Registrar: Namecheap (https://www.namecheap.com)", updatedAt: now() },
    { id: "sec-headers", name: "Security headers (Transform Rule)", description: "X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/mic/geo denied", status: "done", priority: "critical", category: "application", notes: "Done 2026-04-15. Edit at: https://dash.cloudflare.com > thedonormap.org > Rules > Transform Rules > 'Security Headers' | 1/10 rules used", updatedAt: now() },
    // Dashboard: https://github.com/Guerillapropaganda/donor-map-site/settings
    { id: "branch-protect", name: "Branch protection on v4", description: "CI checks required (regression, data integrity, ops build). Force push + branch deletion blocked. Admin bypass on.", status: "done", priority: "high", category: "infrastructure", notes: "Done 2026-04-15. Edit at: https://github.com/Guerillapropaganda/donor-map-site/settings/branches", updatedAt: now() },
    { id: "pin-actions", name: "Pin GitHub Action versions to SHAs", description: "All 7 project-owned .yml workflows pinned to immutable commit SHAs. Quartz upstream .yaml files left unpinned.", status: "done", priority: "medium", category: "infrastructure", notes: "Done 2026-04-15. Files: .github/workflows/*.yml | checkout, setup-node, cache, upload-pages-artifact, deploy-pages, github-script", updatedAt: now() },
    { id: "codeowners", name: "CODEOWNERS file", description: "Require review for changes to workflows, scripts, and security-sensitive paths", status: "done", priority: "medium", category: "infrastructure", notes: "Done 2026-04-15. File: .github/CODEOWNERS", updatedAt: now() },
    // --- Application ---
    // Turnstile dashboard: https://dash.cloudflare.com > Turnstile
    { id: "turnstile", name: "Cloudflare Turnstile on tip form", description: "Invisible CAPTCHA on all profile tip forms. Honeypot kept as fallback.", status: "done", priority: "high", category: "application", notes: "Done 2026-04-15. Site key active in quartz/components/TipForm.tsx | Manage widget: https://dash.cloudflare.com > Turnstile | Mode: Invisible | Hostname: thedonormap.org", updatedAt: now() },
    // Worker code: scripts/cloudflare/rate-limit-worker.js
    { id: "worker-ratelimit", name: "Edge rate limiting (Cloudflare Worker KV)", description: "60 req/min per IP, sliding window. Worker code ready, not yet deployed.", status: "not-started", priority: "high", category: "application", notes: "Code ready at: scripts/cloudflare/rate-limit-worker.js | To deploy: https://dash.cloudflare.com > Workers & Pages > Create > paste code > Settings > KV Bindings > add RATE_LIMIT namespace > Workers Routes > thedonormap.org/* | Not needed until public API launches", updatedAt: now() },
    { id: "security-txt", name: "security.txt file", description: "Responsible disclosure contact at /.well-known/security.txt", status: "done", priority: "low", category: "application", notes: "Done 2026-04-15. File: quartz/static/.well-known/security.txt | Live at: https://thedonormap.org/.well-known/security.txt", updatedAt: now() },
    { id: "query-cost-limits", name: "Query engine cost limits", description: "MAX_PAGE_SIZE=500, unbounded-query gate, 5s timeout. 7 security contract tests.", status: "done", priority: "high", category: "application", notes: "Done 2026-04-15. File: scripts/lib/query-engine.cjs | Tests: scripts/query-engine-contract-tests.cjs (37 total)", updatedAt: now() },
    { id: "corrections-policy", name: "Corrections policy + public log", description: "Public corrections process with email, GitHub issue template, and log.", status: "done", priority: "medium", category: "application", notes: "Done 2026-04-15. Pages: https://thedonormap.org/corrections + https://thedonormap.org/legal | Issue template: https://github.com/Guerillapropaganda/donor-map-site/issues/new?template=correction-request.yml | Contact: guerillapropaganda@proton.me", updatedAt: now() },
    // --- Monitoring ---
    // Re-run scans: node scripts/security/<script>.cjs
    { id: "audit-secrets", name: "Git history secret scan (gitleaks)", description: "Full-history scan for leaked credentials. Re-run periodically.", status: "done", priority: "high", category: "monitoring", notes: "Done 2026-04-15. Clean (32 false positives, 0 real secrets). Script: scripts/security/gitleaks-full-scan.cjs | Requires: C:\\Users\\third\\gitleaks_8.30.1_windows_x64\\gitleaks.exe | Report: .security/gitleaks-report.json (gitignored)", updatedAt: now() },
    // GitHub security settings: https://github.com/Guerillapropaganda/donor-map-site/settings/security_analysis
    { id: "dependabot", name: "Dependabot alerts + auto-updates", description: "GitHub auto-detects vulnerable deps and creates fix PRs.", status: "done", priority: "medium", category: "monitoring", notes: "Done 2026-04-15. Dashboard: https://github.com/Guerillapropaganda/donor-map-site/security | Settings: https://github.com/Guerillapropaganda/donor-map-site/settings/security_analysis", updatedAt: now() },
    { id: "secret-scanning", name: "GitHub secret scanning + push protection", description: "Auto-detect committed tokens. Push protection blocks secrets BEFORE they land in history.", status: "done", priority: "medium", category: "monitoring", notes: "Done 2026-04-15. Settings: https://github.com/Guerillapropaganda/donor-map-site/settings/security_analysis", updatedAt: now() },
    { id: "deps-cve-scan", name: "npm CVE scan + CI gate", description: "npm audit wrapper. CI job fails PRs with critical/high CVEs.", status: "done", priority: "high", category: "monitoring", notes: "Done 2026-04-15. 0 vulnerabilities. Script: scripts/security/deps-cve-scan.cjs | Re-run: node scripts/security/deps-cve-scan.cjs | CI: .github/workflows/regression-tests.yml > deps-cve-scan job", updatedAt: now() },
    { id: "identity-audit", name: "Identity/pseudonymity audit", description: "Scans repo files + git history for personal identity exposure.", status: "done", priority: "high", category: "monitoring", notes: "Done 2026-04-15. No personal exposure found. Script: scripts/security/identity-audit.cjs | Report: content/Admin Notes/identity-audit-report.md", updatedAt: now() },
    { id: "source-corroboration", name: "Source corroboration audit", description: "Flags single-source edges vulnerable to data poisoning.", status: "done", priority: "low", category: "monitoring", notes: "Done 2026-04-15. Script: scripts/security/source-corroboration-audit.cjs | Report: content/Admin Notes/source-corroboration-audit.md", updatedAt: now() },
    { id: "backup-staleness", name: "Backup staleness alarm", description: "Alerts Attention Queue if donor-map-vault backup is >48h stale.", status: "done", priority: "medium", category: "monitoring", notes: "Done 2026-04-15. Script: scripts/security/backup-staleness-check.cjs | Backup repo: https://github.com/Guerillapropaganda/donor-map-vault", updatedAt: now() },
    // GoatCounter dashboard: https://guerillapropaganda.goatcounter.com
    { id: "analytics", name: "GoatCounter analytics", description: "Privacy-respecting, cookie-free traffic stats. No personal data collected.", status: "done", priority: "medium", category: "monitoring", notes: "Done 2026-04-15. Dashboard: https://guerillapropaganda.goatcounter.com | Config: quartz.config.ts (provider: goatcounter, websiteId: guerillapropaganda) | Docs: https://www.goatcounter.com/help", updatedAt: now() },
    // --- Personal ---
    { id: "whois", name: "WHOIS privacy verified", description: "Domain WHOIS fully redacted. No personal info exposed.", status: "done", priority: "high", category: "personal", notes: "Done 2026-04-15. Check: https://who.is/whois/thedonormap.org | Provider: Withheld for Privacy ehf | Registrar: Namecheap (https://www.namecheap.com) | clientTransferProhibited set", updatedAt: now() },
    { id: "2fa", name: "2FA on all accounts", description: "2FA active on GitHub, Cloudflare, Namecheap, ProtonMail.", status: "done", priority: "critical", category: "personal", notes: "Done 2026-04-15. Logins: GitHub (https://github.com/settings/security) | Cloudflare (https://dash.cloudflare.com/profile/authentication) | Namecheap (https://www.namecheap.com/myaccount/login-signup/twofactorauth.aspx) | ProtonMail (https://mail.proton.me)", updatedAt: now() },
    // --- Legal ---
    { id: "licensing", name: "MIT + CC-BY-SA licensing", description: "MIT for code, CC-BY-SA 4.0 for editorial content, public /legal page.", status: "done", priority: "high", category: "legal", notes: "Done 2026-04-15. Files: LICENSE + CONTENT-LICENSE (repo root) | Live: https://thedonormap.org/legal | Copyright: The Donor Map", updatedAt: now() },
    { id: "dmca-playbook", name: "DMCA / legal response playbook", description: "Reference doc: DMCA counter-notice, defamation defense, C&D response.", status: "done", priority: "medium", category: "legal", notes: "Done 2026-04-15. File: content/Admin Notes/legal-response-playbook.md | Key resource: https://www.rcfp.org/legal-defense/ (Reporters Committee) | Lawyer contacts: TBD (fill in before launch)", updatedAt: now() },
    // USPTO trademark search: https://tmsearch.uspto.gov
    { id: "trademark", name: "Trademark registration", description: "Register 'The Donor Map' via USPTO. ~$250-350 filing fee.", status: "not-started", priority: "medium", category: "legal", notes: "David's lane. File at: https://www.uspto.gov/trademarks/apply | Search existing marks: https://tmsearch.uspto.gov | Protects brand against hostile forks", updatedAt: now() },
    // --- Backup ---
    { id: "backup-remote", name: "Backup remote (donor-map-vault)", description: "Private GitHub repo mirrors v4 daily. git remote: backup.", status: "done", priority: "high", category: "infrastructure", notes: "Done 2026-04-15. Repo: https://github.com/Guerillapropaganda/donor-map-vault | Remote name: backup | First push resolved 19-day staleness", updatedAt: now() },
    { id: "backup-automation", name: "Daily automated backup (3 AM)", description: "Windows Task Scheduler pushes v4 + dated tags to backup remote.", status: "done", priority: "high", category: "infrastructure", notes: "Done 2026-04-15. Script: scripts/backup/refresh-vault-backup.bat | Scheduler: DonorMapVaultBackup (3:00 AM daily) | Verify: schtasks /query /tn DonorMapVaultBackup | Remove: schtasks /delete /tn DonorMapVaultBackup /f", updatedAt: now() },
    { id: "backup-playbook", name: "Backup & recovery playbook", description: "4 recovery scenarios + laptop replacement checklist.", status: "done", priority: "medium", category: "infrastructure", notes: "Done 2026-04-15. File: content/Admin Notes/backup-recovery-playbook.md", updatedAt: now() },
    // --- Docs ---
    { id: "attack-surface", name: "Attack surface inventory", description: "Every public endpoint, API route, credential, and form in one doc.", status: "done", priority: "medium", category: "monitoring", notes: "Done 2026-04-15. File: content/Admin Notes/attack-surface-inventory.md", updatedAt: now() },
    { id: "ops-readme", name: "Ops README with Clerk dev/prod docs", description: "Clerk setup, credential rotation checklist, key page index.", status: "done", priority: "medium", category: "infrastructure", notes: "Done 2026-04-15. File: ops/README.md | Clerk dashboard: https://dashboard.clerk.com | Stripe dashboard: https://dashboard.stripe.com", updatedAt: now() },
  ],
}

const COSTS_SEED = {
  costs: [
    { id: "web3forms", service: "Web3Forms", category: "tools", amount: 49, billingCycle: "yearly", startDate: "2026-04-12", notes: "Tip submission form backend. Starter plan.", updatedAt: now() },
    { id: "gh-pages", service: "GitHub Pages", category: "hosting", amount: 0, billingCycle: "monthly", startDate: "2026-01-01", notes: "Free static site hosting on v4 branch", updatedAt: now() },
    { id: "cloudflare", service: "Cloudflare", category: "security", amount: 0, billingCycle: "monthly", startDate: "2026-04-12", notes: "Free tier. Workers + future DNS proxy", updatedAt: now() },
    { id: "domain", service: "Domain (thedonormap.org)", category: "domain", amount: 0, billingCycle: "yearly", startDate: "", notes: "TBD - confirm registrar and cost", updatedAt: now() },
    { id: "claude", service: "Claude Code", category: "ai", amount: 0, billingCycle: "usage-based", startDate: "2026-01-01", notes: "TBD - enter monthly spend manually", updatedAt: now() },
    { id: "clerk", service: "Clerk", category: "tools", amount: 0, billingCycle: "monthly", startDate: "2026-04-14", notes: "Auth provider — login, signup, session management for the Ops app and any paid-tier gating. Free tier covers up to 10,000 monthly active users; no charge until we outgrow that.", updatedAt: now() },
    { id: "stripe", service: "Stripe", category: "tools", amount: 0, billingCycle: "usage-based", startDate: "2026-04-14", notes: "Payment processor for Researcher/Newsroom/Patron subscriptions and student discount. Takes 2.9% + 30¢ per transaction — no monthly fee, cost scales with actual paid signups.", updatedAt: now() },
  ],
  services: [
    { id: "svc-cloudflare", name: "Cloudflare", accountEmail: "guerillapropaganda@proton.me", plan: "Free", signupDate: "2026-04-12", loginUrl: "https://dash.cloudflare.com", notes: "DNS proxy ACTIVE. Turnstile ACTIVE. Worker relay deployed. Security headers Transform Rule deployed. SSL Full + HSTS + TLS 1.2+.", updatedAt: now() },
    { id: "svc-goatcounter", name: "GoatCounter", accountEmail: "guerillapropaganda@proton.me", plan: "Free (non-commercial)", signupDate: "2026-04-15", loginUrl: "https://guerillapropaganda.goatcounter.com", notes: "Privacy-respecting analytics. No cookies, no personal data. Stats dashboard at login URL. Config in quartz.config.ts.", updatedAt: now() },
    { id: "svc-namecheap", name: "Namecheap", accountEmail: "", plan: "Domain registration", signupDate: "2026-04-03", loginUrl: "https://www.namecheap.com/myaccount/", notes: "Domain registrar for thedonormap.org. WHOIS privacy ON (Withheld for Privacy ehf). Nameservers pointed to Cloudflare. Auto-renew ON. Expires 2027-04-03.", updatedAt: now() },
    { id: "svc-github", name: "GitHub", accountEmail: "Guerillapropaganda", plan: "Free", signupDate: "", loginUrl: "https://github.com", notes: "Public repo, GitHub Pages hosting, Actions CI/CD", updatedAt: now() },
    { id: "svc-web3forms", name: "Web3Forms", accountEmail: "", plan: "Starter ($49/yr)", signupDate: "2026-04-12", loginUrl: "https://web3forms.com", notes: "Webhook config still needed", updatedAt: now() },
    { id: "svc-clerk", name: "Clerk", accountEmail: "", plan: "Free (up to 10k MAU)", signupDate: "2026-04-14", loginUrl: "https://dashboard.clerk.com", notes: "WHY: authentication for the Ops app + subscriber tier gating (Phase 2.5). WHAT IT DOES: email/password + OAuth sign-in, session cookies, password reset, email verification. Our code integrates via @clerk/nextjs — see content/Admin Notes/phase-2.5-setup.md for the full setup walkthrough.", updatedAt: now() },
    { id: "svc-stripe", name: "Stripe", accountEmail: "", plan: "Standard (2.9% + 30¢/txn)", signupDate: "2026-04-14", loginUrl: "https://dashboard.stripe.com", notes: "WHY: payment processing for Researcher ($20/mo), Newsroom ($150/mo), Patron ($500 one-time), and Researcher Student ($10/mo) tiers. WHAT IT DOES: Stripe Checkout handles the payment page, recurring billing, cancellation flow, receipts, chargebacks, tax. We never touch card numbers ourselves. Webhook at /api/stripe/webhook receives subscription state events and updates user tier in data/users.jsonl. Setup: content/Admin Notes/phase-2.5-setup.md.", updatedAt: now() },
  ],
}

function readSecurity() {
  ensureDir()
  if (!fs.existsSync(SECURITY_FILE)) {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(SECURITY_SEED, null, 2))
    return SECURITY_SEED
  }
  const existing = JSON.parse(fs.readFileSync(SECURITY_FILE, "utf-8"))
  // Migration: inject any seed items not already present (by id) into the
  // existing file. Preserves user edits to existing items while adding new
  // items from code updates (e.g. security sprint adding 15 new items).
  // Also updates status/notes for items that were completed by automation
  // (only upgrades not-started → done, never downgrades user edits).
  const existingById = new Map((existing.items || []).map((i: { id: string }) => [i.id, i]))
  let changed = 0
  for (const seedItem of SECURITY_SEED.items) {
    if (!existingById.has(seedItem.id)) {
      existing.items.push(seedItem)
      changed++
    } else if (seedItem.status === "done" || seedItem.status === "in-progress") {
      const ex = existingById.get(seedItem.id)
      if (ex.status === "not-started") {
        ex.status = seedItem.status
        ex.notes = seedItem.notes
        ex.updatedAt = seedItem.updatedAt
        changed++
      }
    }
  }
  if (changed > 0) {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(existing, null, 2))
  }
  return existing
}

function readCosts() {
  ensureDir()
  if (!fs.existsSync(COSTS_FILE)) {
    fs.writeFileSync(COSTS_FILE, JSON.stringify(COSTS_SEED, null, 2))
    return COSTS_SEED
  }
  return JSON.parse(fs.readFileSync(COSTS_FILE, "utf-8"))
}

function writeSecurity(data: unknown) {
  ensureDir()
  fs.writeFileSync(SECURITY_FILE, JSON.stringify(data, null, 2))
}

function writeCosts(data: unknown) {
  ensureDir()
  fs.writeFileSync(COSTS_FILE, JSON.stringify(data, null, 2))
}

function computeSummary(costs: Array<{ amount: number; billingCycle: string }>) {
  let monthly = 0
  let yearly = 0
  let services = costs.length

  for (const c of costs) {
    const amt = c.amount || 0
    switch (c.billingCycle) {
      case "monthly":
        monthly += amt
        yearly += amt * 12
        break
      case "yearly":
        monthly += amt / 12
        yearly += amt
        break
      case "one-time":
        yearly += amt
        break
      case "usage-based":
        monthly += amt
        yearly += amt * 12
        break
    }
  }

  return {
    monthlyTotal: Math.round(monthly * 100) / 100,
    yearlyTotal: Math.round(yearly * 100) / 100,
    activeServices: services,
  }
}

// GET — return all data
export async function GET() {
  try {
    const security = readSecurity()
    const costsData = readCosts()
    const summary = computeSummary(costsData.costs || [])

    return NextResponse.json({
      security: security.items || [],
      costs: costsData.costs || [],
      services: costsData.services || [],
      summary,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST — add new item
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, ...item } = body

    if (type === "security") {
      const data = readSecurity()
      data.items.push({ ...item, id: genId(), updatedAt: now() })
      writeSecurity(data)
      return NextResponse.json({ ok: true })
    }

    if (type === "cost") {
      const data = readCosts()
      data.costs.push({ ...item, id: genId(), updatedAt: now() })
      writeCosts(data)
      return NextResponse.json({ ok: true })
    }

    if (type === "service") {
      const data = readCosts()
      if (!data.services) data.services = []
      data.services.push({ ...item, id: genId(), updatedAt: now() })
      writeCosts(data)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT — update item
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { type, id, ...updates } = body

    if (type === "security") {
      const data = readSecurity()
      const idx = data.items.findIndex((i: { id: string }) => i.id === id)
      if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
      data.items[idx] = { ...data.items[idx], ...updates, updatedAt: now() }
      writeSecurity(data)
      return NextResponse.json({ ok: true })
    }

    if (type === "cost") {
      const data = readCosts()
      const idx = data.costs.findIndex((i: { id: string }) => i.id === id)
      if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
      data.costs[idx] = { ...data.costs[idx], ...updates, updatedAt: now() }
      writeCosts(data)
      return NextResponse.json({ ok: true })
    }

    if (type === "service") {
      const data = readCosts()
      if (!data.services) data.services = []
      const idx = data.services.findIndex((i: { id: string }) => i.id === id)
      if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })
      data.services[idx] = { ...data.services[idx], ...updates, updatedAt: now() }
      writeCosts(data)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE — remove item
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { type, id } = body

    if (type === "security") {
      const data = readSecurity()
      data.items = data.items.filter((i: { id: string }) => i.id !== id)
      writeSecurity(data)
      return NextResponse.json({ ok: true })
    }

    if (type === "cost") {
      const data = readCosts()
      data.costs = data.costs.filter((i: { id: string }) => i.id !== id)
      writeCosts(data)
      return NextResponse.json({ ok: true })
    }

    if (type === "service") {
      const data = readCosts()
      if (!data.services) data.services = []
      data.services = data.services.filter((i: { id: string }) => i.id !== id)
      writeCosts(data)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
