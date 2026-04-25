/**
 * Tiny in-memory canonical-store fixtures for fast unit tests.
 * Production-data smoke test lives in graph.smoke.test.ts.
 */
import type { RawCanonicalStores, RawEdge, RawEntity, RawLegislator, RawFecRegistryEntry } from "../loader"

export function makeStores(overrides: Partial<RawCanonicalStores> = {}): RawCanonicalStores {
  const entities: RawEntity[] = overrides.entities ?? [
    {
      id: "ent_test_001",
      name: "Acme Capital",
      profile_path: "content/Donors & Power Networks/Acme Capital.md",
      entity_type: "corporation",
      signals: { sector: "Wall Street" },
    },
    {
      id: "ent_test_002",
      name: "Jane Senator",
      profile_path: "content/Politicians/Democrats/Senate/Jane Senator/_Jane Senator Master Profile.md",
      entity_type: "politician",
    },
    {
      id: "ent_test_003",
      name: "Future Forward USA",
      profile_path: "content/Donors & Power Networks/Dark Money/Future Forward USA.md",
      entity_type: "donor",
    },
    {
      id: "ent_test_004",
      name: "Fairshake PAC",
      profile_path: "content/Donors & Power Networks/Crypto/Fairshake PAC.md",
      entity_type: "donor",
    },
  ]

  const edges: RawEdge[] = overrides.edges ?? [
    {
      id: "edge_001",
      from: "Acme Capital",
      to: "Jane Senator",
      type: "monetary",
      direction: "directed",
      confidence: 0.9,
      source: "fec-api",
      amount: 5000,
      cycle: 2024,
      role: "direct",
      evidence: ["FEC test fixture"],
      first_seen: "2024-01-01",
      last_verified: "2024-06-01",
      status: "active",
    },
    {
      id: "edge_002",
      from: "Acme Capital",
      to: "Jane Senator",
      type: "monetary",
      direction: "directed",
      confidence: 0.9,
      source: "fec-individual-bulk",
      amount: 2500,
      cycle: 2022,
      role: "employee-contributions",
      evidence: ["FEC test fixture 2"],
      first_seen: "2022-03-01",
      last_verified: "2024-06-01",
      status: "active",
    },
    {
      id: "edge_003",
      from: "Future Forward USA",
      to: "Jane Senator",
      type: "monetary",
      direction: "directed",
      confidence: 0.85,
      source: "fec-api",
      amount: 100000,
      cycle: 2024,
      role: "ie-support",
      evidence: ["FEC test fixture 3"],
      first_seen: "2024-09-01",
      last_verified: "2024-10-01",
      status: "active",
    },
    {
      id: "edge_deprecated",
      from: "Acme Capital",
      to: "Jane Senator",
      type: "monetary",
      direction: "directed",
      confidence: 0.5,
      source: "manual-ops",
      amount: 99999,
      cycle: 2020,
      role: null,
      evidence: ["should not appear in default queries"],
      first_seen: "2020-01-01",
      last_verified: "2024-01-01",
      status: "deprecated",
    },
  ]

  const legislators: RawLegislator[] = overrides.legislators ?? [
    {
      bioguide: "S000001",
      name_official: "Jane Senator",
      ids: { bioguide: "S000001" },
      current_term: { state: "CA", party: "Democrat", chamber: "senate" },
    },
  ]

  const fec_registry: Record<string, RawFecRegistryEntry> = overrides.fec_registry ?? {
    C00669259: {
      committee_id: "C00669259",
      fec_name: "FF PAC",
      vault_profile: "content/Donors & Power Networks/Dark Money/Future Forward USA.md",
      vault_slug: "future-forward-usa",
      aliases: ["FF PAC", "FUTURE FORWARD USA"],
      cycles: [2024],
      status: "mapped",
    },
  }

  return {
    entities,
    edges,
    legislators,
    fec_registry,
    files_read: ["__fixture__"],
  }
}
