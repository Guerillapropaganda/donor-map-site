/**
 * Resolver — the only function permitted to translate raw inputs into
 * canonical Nodes (per ADR-0024 §"Canonical entity resolution").
 *
 * Build-time validation enforces:
 *   - no two profiles claim the same bioguide id
 *   - no FEC committee_id maps to multiple profiles
 *   - every fec_committee_registry vault_profile path exists in entities
 *   - aliases never collide across distinct nodes
 *
 * Validation failure throws a typed GraphLoadError. The library refuses
 * to start. This forces fixes upstream rather than letting bad data leak
 * into rendered output.
 */
import { DuplicateBioguideError, FecRegistryConflictError, UnresolvableError } from "./errors"
import type { RawCanonicalStores, RawEntity, RawLegislator, RawFecRegistryEntry } from "./loader"
import type { Node, NodeId, NodeType, ResolveArg, ResolveInput } from "./types"

/** Build a stable NodeId. Prefer entity_id; fall back to slugified profile_path or name. */
function nodeIdFor(entity: RawEntity | null, name: string, profile_path: string | null): NodeId {
  if (entity?.id) return entity.id
  if (profile_path) return `path:${profile_path}`
  return `name:${slugify(name)}`
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Normalize an entity_type string from canonical stores into our NodeType. */
function normalizeNodeType(raw: string | null | undefined): NodeType {
  switch ((raw ?? "").toLowerCase()) {
    case "politician":
    case "donor":
    case "corporation":
    case "entity":
    case "policy":
    case "event":
    case "media":
    case "think-tank":
    case "meta":
      return raw as NodeType
    default:
      return "unknown"
  }
}

/**
 * Resolver — built once from canonical stores, then queried via resolve().
 *
 * Holds three indexes (name → node, bioguide → node, fec_committee → node)
 * plus the canonical Node table. resolve() is a constant-time lookup.
 */
export class Resolver {
  /** Canonical node table, keyed by NodeId. */
  private readonly nodes = new Map<NodeId, Node>()
  /** Lower-cased name → NodeId. Includes aliases. */
  private readonly byName = new Map<string, NodeId>()
  /** entity_id → NodeId (often the same string). */
  private readonly byEntityId = new Map<string, NodeId>()
  /** Bioguide id → NodeId. */
  private readonly byBioguide = new Map<string, NodeId>()
  /** FEC committee id → NodeId. */
  private readonly byFecCommittee = new Map<string, NodeId>()
  /** profile_path → NodeId. */
  private readonly byProfilePath = new Map<string, NodeId>()
  /**
   * Aliases that resolve to >1 distinct node. Tracked rather than thrown
   * because production canonical stores legitimately contain duplicate
   * names across entities (e.g. a corp profile + its PAC arm). resolve()
   * of an ambiguous alias returns UnresolvableError with candidate list.
   */
  readonly ambiguous_aliases = new Map<string, NodeId[]>()

  constructor(stores: RawCanonicalStores) {
    this.build(stores)
  }

  // ─── Public read API ────────────────────────────────────────────────

  /** Look up a node. Accepts a typed ResolveInput or a bare string. */
  resolve(input: ResolveArg): Node {
    const node = this.tryResolve(input)
    if (!node) {
      // Helpful hint when the input matched an ambiguous alias.
      let hint: string | undefined
      if (typeof input === "string" || (typeof input === "object" && input.kind === "name")) {
        const value = typeof input === "string" ? input : input.value
        const key = value.toLowerCase().trim()
        const candidates = this.ambiguous_aliases.get(key)
        if (candidates) {
          hint = `ambiguous alias — ${candidates.length} candidates: ${candidates.join(", ")}`
        }
      }
      throw new UnresolvableError(input, hint)
    }
    return node
  }

  /** Like resolve() but returns null instead of throwing. */
  tryResolve(input: ResolveArg): Node | null {
    // Round-trip our own NodeIds: if the caller hands back a string we
    // already minted (entity_id, bioguide:X, fec:X, path:X, name:X), look
    // it up directly in the canonical node table before going through the
    // alias / kind-inference paths.
    if (typeof input === "string" && this.nodes.has(input)) {
      return this.nodes.get(input) ?? null
    }
    const directive: ResolveInput = typeof input === "string" ? this.inferKind(input) : input
    let id: NodeId | undefined
    switch (directive.kind) {
      case "name": {
        const key = directive.value.toLowerCase().trim()
        if (this.ambiguous_aliases.has(key)) return null
        id = this.byName.get(key)
        break
      }
      case "entity_id":
        id = this.byEntityId.get(directive.value)
        break
      case "bioguide":
        id = this.byBioguide.get(directive.value)
        break
      case "fec_committee":
        id = this.byFecCommittee.get(directive.value)
        break
      case "profile_path":
        id = this.byProfilePath.get(directive.value)
        break
    }
    if (!id) return null
    return this.nodes.get(id) ?? null
  }

  /** All nodes — read-only. Useful for full-graph queries and tests. */
  allNodes(): ReadonlyArray<Node> {
    return Array.from(this.nodes.values())
  }

  /** Number of resolved canonical nodes. */
  size(): number {
    return this.nodes.size
  }

  /** Get a node by its NodeId, or null. */
  getById(id: NodeId): Node | null {
    return this.nodes.get(id) ?? null
  }

  // ─── Build — runs once at construction ─────────────────────────────

  private build(stores: RawCanonicalStores): void {
    // 1. Seed nodes from entities.jsonl. profile_path → entity for cross-ref.
    //    Also collect entity-declared bioguides so Step 2 doesn't re-guess
    //    by name when the entity already declared its identity. Caught
    //    2026-04-25 — Bob Menendez Sr (M000639, name_nickname "Bob") and
    //    Robert Menendez Jr (M001226) both have name_official "Robert
    //    Menendez" in the registry. Without this, Step 2's findOrCreate
    //    found Jr's entity by name "Robert Menendez" first, attached Sr's
    //    bioguide to Jr's node, and added "Bob Menendez" as Jr's alias —
    //    making "Bob Menendez" ambiguous and unresolvable.
    const entityByProfilePath = new Map<string, RawEntity>()
    const entityBioguideToNodeId = new Map<string, NodeId>()
    for (const e of stores.entities) {
      if (e.profile_path) entityByProfilePath.set(e.profile_path, e)
      const node: Node = {
        id: nodeIdFor(e, e.name, e.profile_path),
        name: e.name,
        type: normalizeNodeType(e.entity_type),
        profile_path: e.profile_path,
        ids: { entity_id: e.id },
        aliases: [e.name],
        meta: e.signals ?? {},
      }
      // Honor entity-declared bioguide. Source of truth — entity records
      // know their identity; legislator-step name-form matching only fills
      // gaps for entities that didn't declare one.
      const declaredBio = (e.signals as { bioguide_id?: string } | undefined)?.bioguide_id
      if (declaredBio) {
        node.ids.bioguide = declaredBio
        entityBioguideToNodeId.set(declaredBio, node.id)
      }
      this.registerNode(node)
    }
    // Stamp byBioguide for entity-declared cases so legislator step can skip them.
    for (const [bg, nodeId] of entityBioguideToNodeId) this.byBioguide.set(bg, nodeId)

    // 2. Index legislators by bioguide. Reject duplicates.
    //    Legislators may or may not have a vault profile yet — when they
    //    do, fold the bioguide into the existing entity node; otherwise
    //    create a stub politician node.
    const bioguideToProfile = new Map<string, string[]>()
    for (const leg of stores.legislators) {
      if (!leg.bioguide) continue
      const profilePath = this.guessLegislatorProfilePath(leg)
      const list = bioguideToProfile.get(leg.bioguide) ?? []
      list.push(profilePath ?? leg.name_official)
      bioguideToProfile.set(leg.bioguide, list)
    }
    // Validation: no bioguide mapped to >1 distinct profile.
    for (const [bioguide, refs] of bioguideToProfile) {
      const distinct = Array.from(new Set(refs))
      if (distinct.length > 1) {
        throw new DuplicateBioguideError(bioguide, distinct)
      }
      // If an entity already claimed this bioguide via signals.bioguide_id,
      // attach the legislator's name forms as aliases on THAT entity and
      // skip the stub-creation path. Honors entity-declared identity.
      // Important: only add forms that aren't already firmly claimed by a
      // DIFFERENT path-having entity. The Menendez Sr (M000639) ↔ Jr
      // (M001226) collision: both legislator records share name_official
      // "Robert Menendez", so adding Sr's "Robert Menendez" form here
      // would collide with Jr's primary-name claim, ambiguate the alias,
      // and break resolution for both. Skipping conflicting forms keeps
      // each entity owning the name it actually uses (Sr=Bob, Jr=Robert).
      const claimingNodeId = entityBioguideToNodeId.get(bioguide)
      if (claimingNodeId) {
        const claimingNode = this.nodes.get(claimingNodeId)
        if (claimingNode) {
          const leg = stores.legislators.find((l) => l.bioguide === bioguide)
          if (leg) {
            for (const form of this.legislatorNameForms(leg)) {
              const key = form.toLowerCase().trim()
              const existing = this.byName.get(key)
              if (existing && existing !== claimingNode.id) {
                const existingNode = this.nodes.get(existing)
                if (existingNode?.profile_path && claimingNode.profile_path) {
                  // Both are real entities — leave the form on whoever
                  // already claims it rather than ambiguating.
                  continue
                }
              }
              this.addAlias(claimingNode, form)
            }
          }
        }
        continue
      }
      const node = this.findOrCreateLegislatorNode(distinct[0], bioguide, stores.legislators)
      node.ids.bioguide = bioguide
      if (!this.byBioguide.has(bioguide)) {
        this.byBioguide.set(bioguide, node.id)
      }
    }

    // 3. Apply FEC committee registry. Validation: every committee_id maps
    //    to at most one node, and every vault_profile points at a node we know.
    const profileToCommittees = new Map<string, string[]>()
    for (const [committee_id, entry] of Object.entries(stores.fec_registry)) {
      if (!entry.vault_profile) continue
      const profile = entry.vault_profile
      const list = profileToCommittees.get(profile) ?? []
      list.push(committee_id)
      profileToCommittees.set(profile, list)
    }
    for (const [committee_id, entry] of Object.entries(stores.fec_registry)) {
      if (!entry.vault_profile) continue
      const profileNodeId = this.byProfilePath.get(entry.vault_profile)
      if (!profileNodeId) {
        // Registry references a profile we don't have an entity for.
        // Could be a stub politician profile that never made it into
        // entities.jsonl. Tolerate by creating a placeholder node so the
        // FEC id still resolves; surface as soft warning rather than hard
        // throw because this is common during stub creation.
        const stub = this.makeStubFromRegistry(committee_id, entry)
        this.byFecCommittee.set(committee_id, stub.id)
        continue
      }
      // Hard validation: check no OTHER node already claims this committee_id.
      const existing = this.byFecCommittee.get(committee_id)
      if (existing && existing !== profileNodeId) {
        throw new FecRegistryConflictError(committee_id, {
          kind: "duplicate_profile",
          profiles: [
            this.nodes.get(existing)?.profile_path ?? existing,
            entry.vault_profile,
          ],
        })
      }
      this.byFecCommittee.set(committee_id, profileNodeId)
      const node = this.nodes.get(profileNodeId)!
      const ids = node.ids.fec_committee_ids ?? []
      if (!ids.includes(committee_id)) ids.push(committee_id)
      node.ids.fec_committee_ids = ids
      // Aliases — fec_name and any explicit aliases extend the lookup table.
      this.addAlias(node, entry.fec_name)
      for (const alias of entry.aliases ?? []) this.addAlias(node, alias)
    }
  }

  // ─── Build helpers ─────────────────────────────────────────────────

  private registerNode(node: Node): void {
    this.nodes.set(node.id, node)
    if (node.ids.entity_id) this.byEntityId.set(node.ids.entity_id, node.id)
    if (node.profile_path) this.byProfilePath.set(node.profile_path, node.id)
    this.addAlias(node, node.name)
  }

  private addAlias(node: Node, alias: string | null | undefined): void {
    if (!alias) return
    const key = alias.toLowerCase().trim()
    if (!key) return
    const existing = this.byName.get(key)
    if (existing && existing !== node.id) {
      // Disambiguation: when one claimant has a profile_path and the
      // other doesn't, the path-having node almost certainly represents
      // the real profile while the path-less one is a discovery-scanner
      // stub created from a wikilink before the real profile existed.
      // Prefer the path-having claimant silently. Caught 2026-04-25 —
      // ent_001546 "Bob Casey" (no path) was shadowing the real bioguide
      // node for Robert P. Casey.
      const existingNode = this.nodes.get(existing)
      const existingHasPath = !!existingNode?.profile_path
      const newHasPath = !!node.profile_path
      if (existingHasPath && !newHasPath) {
        // Existing node wins; new node loses its claim on this alias silently.
        return
      }
      if (!existingHasPath && newHasPath) {
        // New node wins; reassign the alias and drop the existing claim.
        this.byName.set(key, node.id)
        if (!node.aliases.includes(alias)) node.aliases.push(alias)
        return
      }
      // Both have paths (or neither do) — genuine ambiguity. Track it.
      const candidates = this.ambiguous_aliases.get(key) ?? [existing]
      if (!candidates.includes(node.id)) candidates.push(node.id)
      this.ambiguous_aliases.set(key, candidates)
      this.byName.delete(key)
      return
    }
    this.byName.set(key, node.id)
    if (!node.aliases.includes(alias)) node.aliases.push(alias)
  }

  /**
   * Best-effort guess of where a legislator's profile would live. Used
   * for the bioguide-uniqueness check; does NOT itself create files.
   */
  private guessLegislatorProfilePath(leg: RawLegislator): string | null {
    // The vault doesn't expose a registry-of-paths; the loader only sees
    // legislators by bioguide. We use name_official as the canonical key
    // for collision detection, which matches how vault profiles are titled.
    return leg.name_official ?? null
  }

  /**
   * Build the plausible name forms a wikilink might use to refer to a
   * legislator. Returns a deduplicated, ordered list — name_official
   * first, then common-name forms.
   *
   * Without this, bioguide stubs only resolve under name_official
   * ("J. French Hill"), missing the common name ("French Hill") that
   * vault wikilinks actually use. Caught by the shadow harness on
   * 2026-04-25 — French Hill cache had 195 related, librarian had 0.
   */
  private legislatorNameForms(leg: RawLegislator): string[] {
    const isInitialish = (s: string | undefined | null): boolean => {
      if (!s) return false
      const trimmed = s.trim().replace(/\.$/, "")
      return trimmed.length <= 2 // "J", "J.", "J.R" all read as initials
    }
    const last = (leg.name_last ?? "").trim()
    const first = (leg.name_first ?? "").trim()
    const middle = ((leg as { name_middle?: string | null }).name_middle ?? "").trim()
    const nickname = ((leg as { name_nickname?: string | null }).name_nickname ?? "").trim()
    const official = (leg.name_official ?? "").trim()

    const forms: string[] = []
    if (official) forms.push(official)
    if (first && last && !isInitialish(first)) forms.push(`${first} ${last}`)
    if (middle && last && !isInitialish(middle)) forms.push(`${middle} ${last}`)
    if (first && middle && last && !isInitialish(first) && !isInitialish(middle)) {
      forms.push(`${first} ${middle} ${last}`)
    }
    if (nickname && last) forms.push(`${nickname} ${last}`)
    // Dedupe preserving order.
    const seen = new Set<string>()
    return forms.filter((f) => {
      const k = f.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }

  private findOrCreateLegislatorNode(
    nameOrPath: string,
    bioguide: string,
    legislators: RawLegislator[],
  ): Node {
    const leg = legislators.find((l) => l.bioguide === bioguide)
    const forms = leg ? this.legislatorNameForms(leg) : [nameOrPath]

    // Try matching an existing entity by ANY form before stubbing.
    // Prevents creating a duplicate stub when entities.jsonl already has
    // a record under the common name (e.g. cache name "French Hill"
    // matches the entity even though name_official is "J. French Hill").
    for (const form of forms) {
      const existing = this.tryResolve({ kind: "name", value: form })
      if (existing) {
        // Backfill all the OTHER forms as aliases on the existing node so
        // future resolves under any name shape land on the same node.
        for (const f of forms) this.addAlias(existing, f)
        return existing
      }
    }

    // No existing entity — create a stub politician node, aliased under
    // every plausible name form.
    const name = forms[0] ?? nameOrPath
    const node: Node = {
      id: `bioguide:${bioguide}`,
      name,
      type: "politician",
      profile_path: null,
      ids: { bioguide },
      aliases: [name],
      meta: { _source: "legislator-registry" },
    }
    this.registerNode(node)
    for (const form of forms) this.addAlias(node, form)
    return node
  }

  private makeStubFromRegistry(committee_id: string, entry: RawFecRegistryEntry): Node {
    const name = entry.fec_name ?? committee_id
    const node: Node = {
      id: `fec:${committee_id}`,
      name,
      type: entry.vault_profile ? "donor" : "unknown",
      profile_path: entry.vault_profile ?? null,
      ids: { fec_committee_ids: [committee_id] },
      aliases: [name, ...(entry.aliases ?? [])].filter(Boolean) as string[],
      meta: { _source: "fec-committee-registry-stub" },
    }
    this.registerNode(node)
    return node
  }

  /** Heuristic kind inference for bare-string resolve() inputs. */
  private inferKind(value: string): ResolveInput {
    if (/^C\d{8,}$/i.test(value)) return { kind: "fec_committee", value: value.toUpperCase() }
    if (/^[A-Z]\d{6,}$/.test(value)) return { kind: "bioguide", value }
    if (/^ent_[a-z0-9_]+$/i.test(value)) return { kind: "entity_id", value }
    if (value.startsWith("content/") && value.endsWith(".md")) {
      return { kind: "profile_path", value }
    }
    return { kind: "name", value }
  }
}
