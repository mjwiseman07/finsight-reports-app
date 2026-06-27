import type { ConsolidatedLine } from "../../mocks";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue, recordFrameworkAudit } from "../_helpers/assertions";

export const scenario: IntegrationScenario = {
  id: "C1-3",
  category: "consolidation-non-comingled",
  title: "Three-entity consolidation (US GAAP + IFRS + IFRS SME)",
  dependencies: ["kv-hc", "kv-npo"],
  execute(ctx) {
    ctx.participation.recordVertical("HC");
    ctx.participation.recordVertical("NPO");
    ctx.participation.recordFramework("US_GAAP");
    ctx.participation.recordFramework("IFRS");
    ctx.participation.recordFramework("IFRS_SME");

    const parent = ctx.mocks.entity({
      orgId: "org-tri",
      entityId: "parent",
      vertical: "HC",
      framework: "US_GAAP",
      inventory: ctx.mocks.usGaapInventory("FIFO"),
      ppe: ctx.mocks.usGaapPpe(),
    });
    const ifrsSub = ctx.mocks.entity({
      orgId: "org-tri",
      entityId: "ifrs-sub",
      vertical: "HC",
      framework: "IFRS",
      inventory: ctx.mocks.ifrsInventory("WeightedAverage"),
      ppe: ctx.mocks.ifrsPpeRevalued(3000),
    });
    const smeSub = ctx.mocks.entity({
      orgId: "org-tri",
      entityId: "sme-sub",
      vertical: "NPO",
      framework: "IFRS_SME",
      inventory: ctx.mocks.ifrsInventory("FIFO"),
    });

    for (const entity of [parent, ifrsSub, smeSub]) {
      ctx.registry.setElection(ctx.mocks.toRegistryEntry(entity));
    }

    const lines = ctx.mocks.consolidate([parent, ifrsSub, smeSub]);
    ctx.state.lines = lines;

    for (const line of lines) {
      recordFrameworkAudit(ctx, "restricted-net-asset-audit", line.entityId, line.framework);
      ctx.participation.recordChannel("restricted-net-asset-audit");
    }
  },
  assertions: [
    assertion("C1-3-three-frameworks", "All three frameworks present without collapse", (ctx) => {
      const lines = ctx.state.lines as ConsolidatedLine[];
      const frameworks = new Set(lines.map((line) => line.framework));
      assertTrue(frameworks.has("US_GAAP"), "US_GAAP present");
      assertTrue(frameworks.has("IFRS"), "IFRS present");
      assertTrue(frameworks.has("IFRS_SME"), "IFRS_SME present");
      assertTrue(frameworks.size === 3, "three distinct frameworks");
    }),
    assertion("C1-3-entity-bindings", "Entity-to-framework bindings preserved", (ctx) => {
      const lines = ctx.state.lines as ConsolidatedLine[];
      assertTrue(lines.find((l) => l.entityId === "parent")?.framework === "US_GAAP", "parent US_GAAP");
      assertTrue(lines.find((l) => l.entityId === "ifrs-sub")?.framework === "IFRS", "ifrs-sub IFRS");
      assertTrue(lines.find((l) => l.entityId === "sme-sub")?.framework === "IFRS_SME", "sme-sub IFRS_SME");
    }),
    assertion("C1-3-no-silent-fallback", "No silent fallback to default framework", (ctx) => {
      for (const line of (ctx.state.lines as ConsolidatedLine[]) ?? []) {
        assertTrue(
          line.framework === "US_GAAP" || line.framework === "IFRS" || line.framework === "IFRS_SME",
          "explicit framework only",
        );
      }
    }),
    assertion("C1-3-audit-scoped", "Restricted net asset audit records three entity-scoped events", (ctx) => {
      assertTrue(ctx.auditBus.eventsForChannel("restricted-net-asset-audit").length === 3, "three events");
    }),
  ],
};
