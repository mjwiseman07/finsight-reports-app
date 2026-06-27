import type { AttestedElection } from "../../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import {
  buildCacheKey,
  buildElectionFingerprint,
} from "../../../../lib/intelligence/synthetic/standards/resolver/memory/types";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface EntityMemoryBinding {
  readonly entityId: string;
  readonly handle: string;
  readonly cacheKey: string;
  readonly fingerprint: string | null;
}

function bindEntityMemory(
  orgId: string,
  entityId: string,
  framework: AttestedElection["framework"],
  election: AttestedElection | null,
  classification: "standard" | "phi-covered",
): EntityMemoryBinding {
  const handle = `mem://${orgId}/${entityId}`;
  const fingerprint = buildElectionFingerprint(election);
  const cacheKey = buildCacheKey({
    companyMemoryHandle: handle,
    framework,
    electionFingerprint: fingerprint,
    tenantClassification: classification,
  });
  return Object.freeze({ entityId, handle, cacheKey, fingerprint });
}

export const scenario: IntegrationScenario = {
  id: "C5-1",
  category: "memory-framework",
  title: "Per-entity memory cache keys",
  dependencies: [],
  execute(ctx) {
    ctx.participation.recordVertical("HC");
    ctx.participation.recordVertical("NPO");
    ctx.participation.recordFramework("US_GAAP");
    ctx.participation.recordFramework("IFRS");

    const orgId = "org-memory-1";
    const hcElection: AttestedElection = Object.freeze({
      orgId,
      framework: "US_GAAP",
      citationHandle: "ASC_105_10_05_1",
      attestedBy: "controller@hc.test",
      attestedAt: ctx.clock.nowISO(),
      attestationVersion: "1.0.0",
      note: "HC entity election",
    });
    const npoElection: AttestedElection = Object.freeze({
      orgId,
      framework: "IFRS",
      citationHandle: "IAS_1_PRESENTATION",
      attestedBy: "controller@npo.test",
      attestedAt: ctx.clock.nowISO(),
      attestationVersion: "1.0.0",
      note: "NPO entity election",
    });

    const bindings = Object.freeze([
      bindEntityMemory(orgId, "hc-entity", "US_GAAP", hcElection, "phi-covered"),
      bindEntityMemory(orgId, "npo-entity", "IFRS", npoElection, "standard"),
    ]);

    ctx.state.memoryBindings = bindings;

    for (const binding of bindings) {
      ctx.auditBus.appendChannel("memory-framework-dimension", {
        entityId: binding.entityId,
        cacheKey: binding.cacheKey,
        fingerprint: binding.fingerprint,
      });
      ctx.participation.recordChannel("memory-framework-dimension");
    }
  },
  assertions: [
    assertion("C5-1-distinct-keys", "Each entity receives a distinct cache key", (ctx) => {
      const bindings = ctx.state.memoryBindings as EntityMemoryBinding[];
      assertTrue(bindings.length === 2, "two bindings");
      assertTrue(bindings[0]?.cacheKey !== bindings[1]?.cacheKey, "keys differ");
    }),
    assertion("C5-1-handle-scoped", "Cache keys embed entity-specific handles", (ctx) => {
      const bindings = ctx.state.memoryBindings as EntityMemoryBinding[];
      assertTrue(bindings[0]?.cacheKey.includes("hc-entity"), "hc handle in key");
      assertTrue(bindings[1]?.cacheKey.includes("npo-entity"), "npo handle in key");
    }),
    assertion("C5-1-no-cross-leakage", "Fingerprints differ across entities", (ctx) => {
      const bindings = ctx.state.memoryBindings as EntityMemoryBinding[];
      assertTrue(bindings[0]?.fingerprint !== bindings[1]?.fingerprint, "fingerprints differ");
    }),
  ],
};
