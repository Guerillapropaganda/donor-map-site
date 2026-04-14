#!/usr/bin/env node
/**
 * seed-admin-user.cjs — Phase 2.5 helper
 *
 * Adds or promotes a user record to admin. Use after signing up via
 * Clerk to bootstrap yourself as admin.
 *
 * Usage:
 *   node scripts/seed-admin-user.cjs --email your@email.com
 *   node scripts/seed-admin-user.cjs --email your@email.com --clerk-id user_xxx
 *   node scripts/seed-admin-user.cjs --email your@email.com --dry-run
 */

const store = require("./lib/users-store.cjs")

const argv = process.argv.slice(2)
const DRY = argv.includes("--dry-run")
const emailFlag = argv.indexOf("--email")
const clerkFlag = argv.indexOf("--clerk-id")
const email = emailFlag !== -1 ? argv[emailFlag + 1] : null
const clerkId = clerkFlag !== -1 ? argv[clerkFlag + 1] : null

if (!email) {
  console.error("usage: node scripts/seed-admin-user.cjs --email your@email.com [--clerk-id user_xxx]")
  process.exit(1)
}

function main() {
  console.log("")
  console.log("═══ seed-admin-user ═══")
  console.log(`  email:    ${email}`)
  console.log(`  clerk_id: ${clerkId || "(will be backfilled on first login)"}`)
  console.log(`  dry-run:  ${DRY}`)
  console.log("")

  store.loadUsers()
  let user = store.getUserByEmail(email)

  if (user) {
    console.log(`  found existing user: ${user.id}  tier=${user.tier}  is_admin=${user.is_admin}`)
    if (user.is_admin) {
      console.log("  already admin — no change")
      return
    }
    if (DRY) {
      console.log("  WOULD promote to admin (dry-run)")
      return
    }
    user = store.updateUser(user.id, { tier: "admin", is_admin: true })
    console.log(`  promoted: ${user.id} → tier=admin is_admin=true`)
  } else {
    console.log("  no existing user — creating new admin record")
    if (DRY) {
      console.log("  WOULD create admin record (dry-run)")
      return
    }
    user = store.addOrFindUser({
      email,
      clerk_id: clerkId || null,
      tier: "admin",
      is_admin: true,
    })
    console.log(`  created: ${user.id}  ${user.email}`)
  }
  console.log("")
  console.log(`  total users: ${store.countUsers()}`)
  console.log("")
}

main()
