/**
 * donor-map — unified graph engine for thedonormap.org.
 *
 * Per ADR-0024, this is the only read path consumers should use to ask
 * "who is X" / "what's connected to X" / "how much did X give Y" against
 * the canonical JSONL stores. Three readers, three answers, no shared
 * validator was the bug class. One engine fixes the class.
 *
 * Status: plumbing layer complete (2026-04-29). Ships resolve / neighbors /
 * aggregate / paths / subgraph / timeline. Thesis-layer queries
 * (influenceMap, donorContradictions, etc.) are follow-up phases —
 * see content/Admin Notes/adr-0024-phase-plan-2026-04-29.md.
 */

export { Graph, type GraphStats } from "./graph"
export { Resolver } from "./resolver"
export { loadCanonicalStores, readJsonl, loadJsonl } from "./loader"
export type {
  LoaderOptions,
  RawCanonicalStores,
  RawEdge,
  RawEntity,
  RawFecRegistryEntry,
  RawLegislator,
} from "./loader"
export type {
  AggregateOpts,
  AggregateResult,
  Edge,
  EdgeStatus,
  EdgeType,
  NeighborsOpts,
  Node,
  NodeId,
  NodeType,
  Path,
  PathsOpts,
  ResolveArg,
  ResolveInput,
  SubgraphOpts,
  SubgraphResult,
  TimelineEntry,
  TimelineOpts,
  EntityId,
  BioguideId,
  FecCommitteeId,
  ProfilePath,
} from "./types"
export {
  AliasCollisionError,
  DuplicateBioguideError,
  FecRegistryConflictError,
  GraphLoadError,
  UnresolvableError,
} from "./errors"
export {
  CATEGORIES,
  BUCKETS,
  CATEGORY_META,
  classifyEdge,
  sumMonetaryEdgesDedup,
  currentCycle,
  filterEdgesByCycle,
  normalizeRole,
  normalizeEntityKey,
  lookupCategory,
  applySourceUpgrade,
} from "./edge-taxonomy"
export type {
  EdgeCategory,
  EdgeBucket,
  CategoryMeta,
  ClassifiableEdge,
  ClassifyResult,
} from "./edge-taxonomy"
