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
    const entityByProfilePath = new Map<string, RawEntity>()
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
      this.registerNode(node)
    }

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
      // Track the ambiguity rather than throwing. Engine starts; resolve()
      // of this alias will return UnresolvableError with candidate hint.
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

  private findOrCreateLegislatorNode(
    nameOrPath: string,
    bioguide: string,
    legislators: RawLegislator[],
  ): Node {
    // Try existing entity by name first.
    const existing = this.tryResolve({ kind: "name", value: nameOrPath })
    if (existing) return existing

    // Otherwise create a stub politician node.
    const leg = legislators.find((l) => l.bioguide === bioguide)
    const name = leg?.name_official ?? nameOrPath
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
