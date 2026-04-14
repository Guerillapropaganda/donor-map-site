/**
 * /sign-up — Phase 2.5 Clerk sign-up page
 *
 * Standard Clerk catch-all route. The <SignUp /> component handles
 * the whole signup flow including email verification.
 */

import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "70vh",
      }}
    >
      <SignUp />
    </div>
  )
}
