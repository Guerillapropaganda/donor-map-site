/**
 * donor-map — unified graph engine for thedonormap.org.
 *
 * Per ADR-0024, this is the only read path consumers should use to ask
 * "who is X" / "what's connected to X" / "how much did X give Y" against
 * the canonical JSONL stores. Three readers, three answers, no shared
 * validator was the bug class. One engine fixes the class.
 *
 * Status: skeleton (2026-04-25). Ships resolve / neighbors / aggregate.
 * paths / subgraph / timeline + thesis-layer queries are follow-up work.
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
  ResolveArg,
  ResolveInput,
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
