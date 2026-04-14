/**
 * /sign-in — Phase 2.5 Clerk sign-in page
 *
 * Standard Clerk catch-all route. The <SignIn /> component handles
 * email + password, magic link, password reset, all of it. No UI work
 * on our side — Clerk renders a themed form that picks up our dark
 * mode via the ClerkProvider in app/layout.tsx.
 *
 * The [[...sign-in]] folder name is required by Clerk so the component
 * can handle sub-routes like /sign-in/verify-email internally.
 */

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "70vh",
      }}
    >
      <SignIn />
    </div>
  )
}
