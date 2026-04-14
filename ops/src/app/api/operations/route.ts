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
    { id: "cf-proxy", name: "Cloudflare DNS proxy", description: "Route all traffic through Cloudflare for DDoS protection, CDN, and origin IP hiding", status: "not-started", priority: "critical", category: "infrastructure", notes: "", updatedAt: now() },
    { id: "sec-headers", name: "Security headers (CSP, X-Frame, HSTS)", description: "Add Content-Security-Policy, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy via Cloudflare Transform Rules", status: "not-started", priority: "critical", category: "application", notes: "Requires Cloudflare proxy first", updatedAt: now() },
    { id: "turnstile", name: "Cloudflare Turnstile on tip form", description: "Replace honeypot with invisible CAPTCHA alternative. Free, privacy-respecting", status: "not-started", priority: "high", category: "application", notes: "", updatedAt: now() },
    { id: "worker-ratelimit", name: "Worker rate limiting (IP-based)", description: "Track submissions by IP in Cloudflare KV, cap per hour. Validates input, strips HTML", status: "not-started", priority: "high", category: "application", notes: "", updatedAt: now() },
    { id: "branch-protect", name: "Branch protection on v4", description: "Require PR reviews, status checks, disable force push on deploy branch", status: "not-started", priority: "high", category: "infrastructure", notes: "", updatedAt: now() },
    { id: "pin-actions", name: "Pin GitHub Action versions to SHAs", description: "Use commit SHAs instead of tags to prevent supply chain attacks", status: "not-started", priority: "medium", category: "infrastructure", notes: "", updatedAt: now() },
    { id: "audit-secrets", name: "Audit commit history for leaked secrets", description: "Run gitleaks or trufflehog against full git history", status: "not-started", priority: "high", category: "monitoring", notes: "", updatedAt: now() },
    { id: "dependabot", name: "Dependabot security alerts", description: "Enable Dependabot for automated vulnerability detection and version updates", status: "not-started", priority: "medium", category: "monitoring", notes: "", updatedAt: now() },
    { id: "whois", name: "WHOIS privacy verified", description: "Confirm domain registrar has WHOIS privacy enabled, hiding personal info", status: "not-started", priority: "high", category: "personal", notes: "", updatedAt: now() },
    { id: "security-txt", name: "security.txt file", description: "Add .well-known/security.txt with contact info for responsible disclosure", status: "not-started", priority: "low", category: "application", notes: "", updatedAt: now() },
    { id: "codeowners", name: "CODEOWNERS file", description: "Require review for changes to workflows, scripts, and security-sensitive paths", status: "not-started", priority: "medium", category: "infrastructure", notes: "", updatedAt: now() },
    { id: "secret-scanning", name: "GitHub secret scanning", description: "Enable auto-detection of accidentally committed tokens and credentials", status: "not-started", priority: "medium", category: "monitoring", notes: "", updatedAt: now() },
    { id: "2fa", name: "2FA on all accounts (hardware key)", description: "Enable 2FA on GitHub, Cloudflare, domain registrar, email. Prefer YubiKey over TOTP", status: "not-started", priority: "critical", category: "personal", notes: "", updatedAt: now() },
    { id: "analytics", name: "GoatCounter analytics", description: "Privacy-respecting, cookie-free traffic analytics. Free for non-commercial use", status: "not-started", priority: "medium", category: "monitoring", notes: "", updatedAt: now() },
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
    { id: "svc-cloudflare", name: "Cloudflare", accountEmail: "guerillapropaganda@proton.me", plan: "Free", signupDate: "2026-04-12", loginUrl: "https://dash.cloudflare.com", notes: "Worker relay deployed. DNS proxy pending.", updatedAt: now() },
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
  return JSON.parse(fs.readFileSync(SECURITY_FILE, "utf-8"))
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
