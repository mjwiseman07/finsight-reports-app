import type { AttestedElection } from "../../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import {
  buildCacheKey,
  buildElectionFingerprint,
} from "../../../../lib/intelligence/synthetic/standards/resolver/memory/types";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface MemorySnapshot {
  readonly entityId: string;
  readonly beforeKey: string;
  readonly afterKey: string;
}

export const scenario: IntegrationScenario = {
  id: "C5-2",
  category: "memory-framework",
  title: "Memory key isolation after election re-attestation",
  dependencies: [],
  execute(ctx) {
    ctx.participation.recordVertical("MFG");
    ctx.participation.recordFramework("US_GAAP");

    const orgId = "org-memory-2";
    const entityId = "mfg-entity";
    const handle = `mem://${orgId}/${entityId}`;

    const initialElection: AttestedElection = Object.freeze({
      orgId,
      framework: "US_GAAP",
      citationHandle: "ASC_105_10_05_1",
      attestedBy: "controller@mfg.test",
      attestedAt: ctx.clock.nowISO(),
      attestationVersion: "1.0.0",
      note: "initial attestation",
    });

    const beforeKey = buildCacheKey({
      companyMemoryHandle: handle,
      framework: "US_GAAP",
      electionFingerprint: buildElectionFingerprint(initialElection),
      tenantClassification: "standard",
    });

    ctx.clock.advance(60_000);

    const revisedElection: AttestedElection = Object.freeze({
      ...initialElection,
      attestedAt: ctx.clock.nowISO(),
      attestationVersion: "1.0.1",
      note: "re-attestation after registry review",
    });

    const afterKey = buildCacheKey({
      companyMemoryHandle: handle,
      framework: "US_GAAP",
      electionFingerprint: buildElectionFingerprint(revisedElection),
      tenantClassification: "standard",
    });

    const snapshot: MemorySnapshot = Object.freeze({
      entityId,
      beforeKey,
      afterKey,
    });

    ctx.state.snapshot = snapshot;
    ctx.state.peerKey = buildCacheKey({
      companyMemoryHandle: `mem://${orgId}/peer-entity`,
      framework: "US_GAAP",
      electionFingerprint: buildElectionFingerprint(initialElection),
      tenantClassification: "standard",
    });

    ctx.auditBus.appendChannel("memory-framework-dimension", {
      entityId,
      beforeKey,
      afterKey,
      reattested: true,
    });
    ctx.participation.recordChannel("memory-framework-dimension");
  },
  assertions: [
    assertion("C5-2-key-rotates", "Re-attestation changes cache key for same entity", (ctx) => {
      const snapshot = ctx.state.snapshot as MemorySnapshot;
      assertTrue(snapshot.beforeKey !== snapshot.afterKey, "key rotated");
    }),
    assertion("C5-2-peer-un affected", "Peer entity key unaffected by re-attestation", (ctx) => {
      const snapshot = ctx.state.snapshot as MemorySnapshot;
      const peerKey = ctx.state.peerKey as string;
      assertTrue(peerKey !== snapshot.afterKey, "peer distinct from after");
      assertTrue(peerKey.includes("peer-entity"), "peer handle preserved");
    }),
    assertion("C5-2-same-entity-scope", "Before and after keys share entity handle only", (ctx) => {
      const snapshot = ctx.state.snapshot as MemorySnapshot;
      assertTrue(snapshot.beforeKey.includes("mfg-entity"), "before scoped");
      assertTrue(snapshot.afterKey.includes("mfg-entity"), "after scoped");
      assertTrue(!snapshot.afterKey.includes("peer-entity"), "no peer leakage");
    }),
  ],
};
