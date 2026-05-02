import { redirect } from "next/navigation"

/**
 * /distribution -> /distribution/cadence
 *
 * The Distribution surface is multi-tab. The bare URL lands on the
 * cadence tab, which is the "what to post when" plan David opens daily.
 *
 * Tabs:
 *   /distribution/cadence    - weekly rhythm + per-platform schedule
 *   /distribution/queue      - today's queue (memes + share-queue feeds)
 *   /distribution/targets    - adversarial + friendly profiles
 *   /distribution/algorithm  - boost levers + freeform notes
 *   /distribution/cards      - existing card generator (preserved)
 */
export default function DistributionRoot() {
  redirect("/distribution/cadence")
}
