/**
 * Typed errors for the donor-map graph engine.
 *
 * Per ADR-0024: validation failures at load time mean the library
 * refuses to start. These error classes carry enough context (file path,
 * conflicting ids, candidate matches) for the caller to fix upstream.
 */

export class GraphLoadError extends Error {
  constructor(message: string, public readonly file?: string) {
    super(message)
    this.name = "GraphLoadError"
  }
}

/**
 * Two or more vault profiles claim the same bioguide id.
 * Caught by the duplicate-bioguide-sentinel pre-commit hook in the
 * normal case; this is the in-engine backstop.
 */
export class DuplicateBioguideError extends GraphLoadError {
  constructor(
    public readonly bioguide: string,
    public readonly profiles: string[],
  ) {
    super(
      `bioguide ${bioguide} is claimed by ${profiles.length} profiles: ${profiles.join(", ")}`,
    )
    this.name = "DuplicateBioguideError"
  }
}

/**
 * The Fairshake-class bug: an FEC committee id maps to more than one
 * vault profile, or maps to a profile that no longer exists on disk.
 */
export class FecRegistryConflictError extends GraphLoadError {
  constructor(
    public readonly committee_id: string,
    public readonly conflict:
      | { kind: "duplicate_profile"; profiles: string[] }
      | { kind: "missing_profile"; profile_path: string },
  ) {
    const detail =
      conflict.kind === "duplicate_profile"
        ? `maps to ${conflict.profiles.length} profiles: ${conflict.profiles.join(", ")}`
        : `maps to missing profile: ${conflict.profile_path}`
    super(`FEC committee ${committee_id} ${detail}`)
    this.name = "FecRegistryConflictError"
  }
}

/**
 * Two nodes are reachable by the same alias with no way to disambiguate.
 * Surfaces when relationships.jsonl edges reference a name that resolves
 * to more than one canonical node.
 */
export class AliasCollisionError extends GraphLoadError {
  constructor(
    public readonly alias: string,
    public readonly node_ids: string[],
  ) {
    super(`alias "${alias}" resolves to ${node_ids.length} nodes: ${node_ids.join(", ")}`)
    this.name = "AliasCollisionError"
  }
}

/** resolve() called with input that doesn't match any node. */
export class UnresolvableError extends Error {
  constructor(
    public readonly input: unknown,
    public readonly hint?: string,
  ) {
    super(`could not resolve input: ${JSON.stringify(input)}${hint ? ` (${hint})` : ""}`)
    this.name = "UnresolvableError"
  }
}
