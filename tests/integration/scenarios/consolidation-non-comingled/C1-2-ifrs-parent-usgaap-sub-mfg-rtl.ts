import type { ConsolidatedLine } from "../../mocks";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue, recordFrameworkAudit } from "../_helpers/assertions";

export const scenario: IntegrationScenario = {
  id: "C1-2",
  category: "consolidation-non-comingled",
  title: "IFRS parent with US GAAP subs (MFG + RTL)",
  dependencies: ["kv-mfg", "kv-rtl"],
  execute(ctx) {
    ctx.participation.recordVertical("MFG");
    ctx.participation.recordVertical("RTL");
    ctx.participation.recordFramework("IFRS");
    ctx.participation.recordFramework("US_GAAP");

    const parent = ctx.mocks.entity({
      orgId: "org-parent",
      entityId: "parent",
      vertical: "MFG",
      framework: "IFRS",
      inventory: ctx.mocks.ifrsInventory("FIFO"),
      ppe: ctx.mocks.ifrsPpeRevalued(8000),
    });
    const mfgSub = ctx.mocks.entity({
      orgId: "org-parent",
      entityId: "mfg-sub",
      vertical: "MFG",
      framework: "US_GAAP",
      inventory: ctx.mocks.usGaapInventory("LIFO"),
      ppe: ctx.mocks.usGaapPpe(),
    });
    const rtlSub = ctx.mocks.entity({
      orgId: "org-parent",
      entityId: "rtl-sub",
      vertical: "RTL",
      framework: "US_GAAP",
      inventory: ctx.mocks.usGaapInventory("FIFO"),
    });

    for (const entity of [parent, mfgSub, rtlSub]) {
      ctx.registry.setElection(ctx.mocks.toRegistryEntry(entity));
    }

    const lines = ctx.mocks.consolidate([parent, mfgSub, rtlSub]);
    ctx.state.lines = lines;

    for (const line of lines) {
      recordFrameworkAudit(ctx, "manufacturing-cost-audit", line.entityId, line.framework);
      ctx.participation.recordChannel("manufacturing-cost-audit");
    }
  },
  assertions: [
    assertion("C1-2-framework-preserved", "Each entity framework binding preserved", (ctx) => {
      const lines = ctx.state.lines as ConsolidatedLine[];
      assertTrue(lines.find((l) => l.entityId === "parent")?.framework === "IFRS", "parent IFRS");
      assertTrue(lines.find((l) => l.entityId === "mfg-sub")?.framework === "US_GAAP", "mfg US_GAAP");
      assertTrue(lines.find((l) => l.entityId === "rtl-sub")?.framework === "US_GAAP", "rtl US_GAAP");
    }),
    assertion("C1-2-lifo-usgaap-only", "LIFO reserve only on US GAAP manufacturing sub", (ctx) => {
      const lines = ctx.state.lines as ConsolidatedLine[];
      assertTrue(lines.find((l) => l.entityId === "mfg-sub")?.hasLifoReserve === true, "mfg LIFO");
      assertTrue(lines.find((l) => l.entityId === "rtl-sub")?.hasLifoReserve === false, "rtl no LIFO");
      assertTrue(lines.find((l) => l.entityId === "parent")?.hasLifoReserve === false, "parent no LIFO");
    }),
    assertion("C1-2-revaluation-ifrs-only", "revaluationSurplus only on IFRS parent PPE", (ctx) => {
      const lines = ctx.state.lines as ConsolidatedLine[];
      assertTrue(lines.find((l) => l.entityId === "parent")?.hasRevaluationSurplus === true, "parent reval");
      assertTrue(lines.find((l) => l.entityId === "mfg-sub")?.hasRevaluationSurplus === false, "mfg no reval");
    }),
    assertion("C1-2-audit-scoped", "Manufacturing cost audit scoped per entity", (ctx) => {
      assertTrue(ctx.auditBus.eventsForChannel("manufacturing-cost-audit").length === 3, "three events");
    }),
  ],
};
