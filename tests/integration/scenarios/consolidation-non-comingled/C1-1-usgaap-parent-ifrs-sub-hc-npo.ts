import type { ConsolidatedLine } from "../../mocks";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue, recordFrameworkAudit } from "../_helpers/assertions";

export const scenario: IntegrationScenario = {
  id: "C1-1",
  category: "consolidation-non-comingled",
  title: "US GAAP parent with IFRS subs (HC + NPO)",
  dependencies: ["kv-hc", "kv-npo"],
  execute(ctx) {
    ctx.participation.recordVertical("HC");
    ctx.participation.recordVertical("NPO");
    ctx.participation.recordFramework("US_GAAP");
    ctx.participation.recordFramework("IFRS");

    const parent = ctx.mocks.entity({
      orgId: "org-parent",
      entityId: "parent",
      vertical: "HC",
      framework: "US_GAAP",
      inventory: ctx.mocks.usGaapInventory("FIFO"),
      ppe: ctx.mocks.usGaapPpe(),
    });
    const hcSub = ctx.mocks.entity({
      orgId: "org-parent",
      entityId: "hc-sub",
      vertical: "HC",
      framework: "IFRS",
      inventory: ctx.mocks.ifrsInventory("FIFO"),
      ppe: ctx.mocks.ifrsPpeRevalued(5000),
    });
    const npoSub = ctx.mocks.entity({
      orgId: "org-parent",
      entityId: "npo-sub",
      vertical: "NPO",
      framework: "IFRS",
      inventory: ctx.mocks.ifrsInventory("WeightedAverage"),
    });

    for (const entity of [parent, hcSub, npoSub]) {
      ctx.registry.setElection(ctx.mocks.toRegistryEntry(entity));
    }

    const lines = ctx.mocks.consolidate([parent, hcSub, npoSub]);
    ctx.state.lines = lines;

    for (const line of lines) {
      recordFrameworkAudit(ctx, "restricted-net-asset-audit", line.entityId, line.framework);
      ctx.participation.recordChannel("restricted-net-asset-audit");
    }
  },
  assertions: [
    assertion("C1-1-framework-preserved", "Each entity framework binding preserved", (ctx) => {
      const lines = ctx.state.lines as ConsolidatedLine[];
      assertTrue(lines.find((l) => l.entityId === "parent")?.framework === "US_GAAP", "parent US_GAAP");
      assertTrue(lines.find((l) => l.entityId === "hc-sub")?.framework === "IFRS", "hc IFRS");
      assertTrue(lines.find((l) => l.entityId === "npo-sub")?.framework === "IFRS", "npo IFRS");
    }),
    assertion("C1-1-no-silent-fallback", "No silent fallback to default framework", (ctx) => {
      for (const line of (ctx.state.lines as ConsolidatedLine[]) ?? []) {
        assertTrue(line.framework === "US_GAAP" || line.framework === "IFRS", "explicit framework only");
      }
    }),
    assertion("C1-1-lifo-rim-absent-ifrs", "LIFO absent from IFRS inventory at runtime", (ctx) => {
      for (const line of (ctx.state.lines as ConsolidatedLine[]) ?? []) {
        if (line.inventory?.basis === "IFRS") {
          assertTrue(!line.hasLifoReserve, "IFRS inventory has no LIFO reserve");
          assertTrue(!("lifoReserve" in line.inventory), "no lifoReserve key on IFRS inventory");
        }
      }
    }),
    assertion("C1-1-revaluation-ifrs-only", "revaluationSurplus only on IFRS PPE lines", (ctx) => {
      for (const line of (ctx.state.lines as ConsolidatedLine[]) ?? []) {
        if (line.hasRevaluationSurplus) {
          assertTrue(line.ppe?.basis === "IFRS", "revaluation only IFRS");
        }
        if (line.ppe?.basis === "US_GAAP") {
          assertTrue(!line.hasRevaluationSurplus, "US GAAP has no revaluation surplus");
        }
      }
    }),
    assertion("C1-1-audit-scoped", "Audit channel records entity-scoped framework events", (ctx) => {
      assertTrue(ctx.auditBus.eventsForChannel("restricted-net-asset-audit").length === 3, "three events");
    }),
  ],
};
