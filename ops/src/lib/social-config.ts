/**
 * Social config · The Donor Map accounts and share-intent helpers.
 *
 * X and Bluesky have web compose intent URLs that pre-fill the caption.
 * Instagram and Facebook do not — neither platform supports posting an
 * image with caption from a browser intent. For those two, the workflow
 * is: copy caption to clipboard → open profile → manually upload image
 * and paste caption.
 *
 * Update the URLs here when accounts change. Keep the intent helpers in
 * one place so every editorial surface uses the same posting workflow.
 */

export type Platform = "x" | "bluesky" | "instagram" | "facebook" | "other"

export const SOCIAL_ACCOUNTS = {
  x: { handle: "@thedonormap", url: "https://x.com/thedonormap" },
  bluesky: { handle: "@thedonormap.bsky.social", url: "https://bsky.app/profile/thedonormap.bsky.social" },
  instagram: { handle: "@guerillaprop", url: "https://www.instagram.com/guerillaprop/" },
  facebook: { handle: "Guerilla Prop", url: "https://www.facebook.com/profile.php?id=100064085292406" },
  patreon: { handle: "Guerilla_Prop", url: "https://www.patreon.com/c/Guerilla_Prop" },
}

export const PLATFORM_META: Record<Platform, { label: string; canIntent: boolean; intentNote?: string }> = {
  x: {
    label: "X / Twitter",
    canIntent: true,
  },
  bluesky: {
    label: "Bluesky",
    canIntent: true,
  },
  instagram: {
    label: "Instagram",
    canIntent: false,
    intentNote: "Instagram has no web compose intent. Caption is copied to clipboard; profile opens for manual upload.",
  },
  facebook: {
    label: "Facebook",
    canIntent: false,
    intentNote: "Facebook web sharer only supports URL share, not image+caption. Caption is copied to clipboard; profile opens for manual upload.",
  },
  other: {
    label: "Other",
    canIntent: false,
  },
}

/** Build a compose-intent URL for the given platform. Returns null when the
 *  platform does not have a web compose intent (Instagram, Facebook). */
export function intentUrl(platform: Platform, caption: string): string | null {
  const enc = encodeURIComponent(caption)
  switch (platform) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${enc}`
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${enc}`
    default:
      return null
  }
}

/** For platforms without a web intent, return the profile URL the user
 *  should land on to post manually. */
export function profileUrl(platform: Platform): string | null {
  switch (platform) {
    case "instagram":
      return SOCIAL_ACCOUNTS.instagram.url
    case "facebook":
      return SOCIAL_ACCOUNTS.facebook.url
    default:
      return null
  }
}
