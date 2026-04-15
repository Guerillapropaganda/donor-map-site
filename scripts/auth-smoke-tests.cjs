#!/usr/bin/env node
// auth-smoke-tests.cjs — regression coverage for the Ops auth system
//
// These tests lock in the ADR-0009 auth architecture so a future
// refactor can't silently break the bypass or the tier hierarchy. They
// run against the CJS users-store (the same one the scripts + policy
// builder use). They do NOT import ops/src/lib/auth.ts directly
// because that's a TypeScript module compiled via Next's bundler and
// isn't loadable from Node without extra setup — instead, these tests
// validate the BEHAVIORAL CONTRACT that the auth layer depends on:
//
//   1. users-store tier hierarchy matches ADR-0002
//   2. admin bypass works at the data layer
//   3. getUserByEmail + getUserByClerkId work for recovery paths
//   4. seed-admin-user.cjs behavior: find by email, promote to admin
//
// Plus a doc-contract test that ADR-0009 + phase-2.5-setup.md exist
// and contain the expected recovery keywords. This catches accidental
// deletion of the recovery docs.
//
// Run: node --test scripts/auth-smoke-tests.cjs

const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.join(__dirname, "..")

// ─── Module contract: users-store exports everything auth.ts needs ────

test("users-schema exports tierAtLeast function", () => {
  const schema = require("./lib/users-schema.cjs")
  assert.equal(typeof schema.tierAtLeast, "function")
})

test("users-store exports getUserByEmail for drift recovery", () => {
  const store = require("./lib/users-store.cjs")
  assert.equal(typeof store.getUserByEmail, "function")
})

test("users-store exports getUserByClerkId for primary lookup", () => {
  const store = require("./lib/users-store.cjs")
  assert.equal(typeof store.getUserByClerkId, "function")
})

test("users-store exports addOrFindUser for first-login backfill", () => {
  const store = require("./lib/users-store.cjs")
  assert.equal(typeof store.addOrFindUser, "function")
})

test("users-store exports updateUser for the seed-admin script", () => {
  const store = require("./lib/users-store.cjs")
  assert.equal(typeof store.updateUser, "function")
})

// ─── Tier hierarchy: admin > newsroom > researcher > free-auth > anonymous ────

test("tierAtLeast: admin bypasses every requirement", () => {
  const { tierAtLeast } = require("./lib/users-schema.cjs")
  assert.equal(tierAtLeast("admin", "anonymous"), true)
  assert.equal(tierAtLeast("admin", "free-auth"), true)
  assert.equal(tierAtLeast("admin", "researcher"), true)
  assert.equal(tierAtLeast("admin", "newsroom"), true)
  assert.equal(tierAtLeast("admin", "admin"), true)
})

test("tierAtLeast: newsroom < admin", () => {
  const { tierAtLeast } = require("./lib/users-schema.cjs")
  assert.equal(tierAtLeast("newsroom", "admin"), false)
  assert.equal(tierAtLeast("newsroom", "newsroom"), true)
  assert.equal(tierAtLeast("newsroom", "researcher"), true)
})

test("tierAtLeast: researcher < newsroom", () => {
  const { tierAtLeast } = require("./lib/users-schema.cjs")
  assert.equal(tierAtLeast("researcher", "newsroom"), false)
  assert.equal(tierAtLeast("researcher", "researcher"), true)
  assert.equal(tierAtLeast("researcher", "free-auth"), true)
})

test("tierAtLeast: free-auth < researcher", () => {
  const { tierAtLeast } = require("./lib/users-schema.cjs")
  assert.equal(tierAtLeast("free-auth", "researcher"), false)
  assert.equal(tierAtLeast("free-auth", "free-auth"), true)
  assert.equal(tierAtLeast("free-auth", "anonymous"), true)
})

test("tierAtLeast: anonymous is the floor", () => {
  const { tierAtLeast } = require("./lib/users-schema.cjs")
  assert.equal(tierAtLeast("anonymous", "free-auth"), false)
  assert.equal(tierAtLeast("anonymous", "anonymous"), true)
})

// ─── Recovery path: ADR-0009 docs must exist ────

test("ADR-0009 auth architecture doc exists", () => {
  const p = path.join(ROOT, "content", "Decisions", "0009-auth-architecture.md")
  assert.ok(fs.existsSync(p), "content/Decisions/0009-auth-architecture.md missing")
})

test("ADR-0009 mentions OPS_AUTH_BYPASS", () => {
  const p = path.join(ROOT, "content", "Decisions", "0009-auth-architecture.md")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(content.includes("OPS_AUTH_BYPASS"), "ADR-0009 must document OPS_AUTH_BYPASS")
})

test("ADR-0009 mentions seed-admin-user.cjs recovery script", () => {
  const p = path.join(ROOT, "content", "Decisions", "0009-auth-architecture.md")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(content.includes("seed-admin-user"), "ADR-0009 must document the seed-admin script")
})

test("phase-2.5-setup.md has 'Recovery from Clerk lockout' section", () => {
  const p = path.join(ROOT, "content", "Admin Notes", "phase-2.5-setup.md")
  assert.ok(fs.existsSync(p), "phase-2.5-setup.md missing")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(
    content.includes("Recovery from Clerk lockout"),
    "phase-2.5-setup.md must have the recovery section",
  )
  assert.ok(
    content.includes("OPS_AUTH_BYPASS=1"),
    "recovery section must document the env var",
  )
})

// ─── Script contract: seed-admin-user.cjs still runs ────

test("seed-admin-user.cjs exists and is readable", () => {
  const p = path.join(ROOT, "scripts", "seed-admin-user.cjs")
  assert.ok(fs.existsSync(p), "scripts/seed-admin-user.cjs missing")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(content.includes("--email"), "seed-admin-user must accept --email flag")
  assert.ok(content.includes("--clerk-id"), "seed-admin-user must accept --clerk-id flag")
  assert.ok(content.includes("is_admin"), "seed-admin-user must set is_admin")
})

// ─── Users store data integrity: admin user is flagged correctly ────
// Protects against a script accidentally clobbering David's admin flag.

test("data/users.jsonl has at least one admin user", () => {
  const p = path.join(ROOT, "data", "users.jsonl")
  assert.ok(fs.existsSync(p), "data/users.jsonl missing")
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  let adminCount = 0
  for (const line of lines) {
    try {
      const u = JSON.parse(line)
      if (u.is_admin === true) adminCount++
    } catch {}
  }
  assert.ok(adminCount >= 1, "at least one admin user must exist in data/users.jsonl")
})

test("every users.jsonl record has required fields", () => {
  const p = path.join(ROOT, "data", "users.jsonl")
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    const u = JSON.parse(line)
    assert.ok(u.id, `user missing id: ${line.slice(0, 80)}`)
    assert.ok(u.email, `user missing email: ${u.id}`)
    assert.ok(u.tier, `user missing tier: ${u.id}`)
    assert.equal(typeof u.is_admin, "boolean", `user is_admin must be boolean: ${u.id}`)
  }
})

// ─── Guardrail: OPS_AUTH_BYPASS must be guarded in the auth source ────
// Reads ops/src/lib/auth.ts as text and verifies the guards exist.

test("ops/src/lib/auth.ts guards OPS_AUTH_BYPASS with NODE_ENV check", () => {
  const p = path.join(ROOT, "ops", "src", "lib", "auth.ts")
  assert.ok(fs.existsSync(p), "ops/src/lib/auth.ts missing")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(
    content.includes("OPS_AUTH_BYPASS"),
    "auth.ts must reference OPS_AUTH_BYPASS",
  )
  assert.ok(
    content.includes('NODE_ENV !== "production"'),
    "auth.ts must hard-disable bypass in production via NODE_ENV check",
  )
  assert.ok(
    content.includes("DEV_BYPASS_USER"),
    "auth.ts must define the synthetic bypass user",
  )
  assert.ok(
    content.includes("warnBypass"),
    "auth.ts must log bypass fires via warnBypass()",
  )
})

test("ops/src/lib/auth.ts has fall-through logging in currentUser", () => {
  const p = path.join(ROOT, "ops", "src", "lib", "auth.ts")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(
    content.includes("fall-through first-login"),
    "auth.ts currentUser must log Mode C fall-through per ADR-0009",
  )
})

test("DevModeBanner component exists and references bypass-status endpoint", () => {
  const p = path.join(ROOT, "ops", "src", "components", "DevModeBanner.tsx")
  assert.ok(fs.existsSync(p), "DevModeBanner.tsx missing")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(
    content.includes("/api/auth/bypass-status"),
    "DevModeBanner must call /api/auth/bypass-status",
  )
  assert.ok(
    content.includes("OPS_AUTH_BYPASS"),
    "DevModeBanner must show the env var name for recovery",
  )
})

test("/api/auth/bypass-status route exists", () => {
  const p = path.join(
    ROOT,
    "ops",
    "src",
    "app",
    "api",
    "auth",
    "bypass-status",
    "route.ts",
  )
  assert.ok(fs.existsSync(p), "api/auth/bypass-status/route.ts missing")
  const content = fs.readFileSync(p, "utf-8")
  assert.ok(
    content.includes("isAuthBypassActive"),
    "bypass-status route must call isAuthBypassActive()",
  )
})
