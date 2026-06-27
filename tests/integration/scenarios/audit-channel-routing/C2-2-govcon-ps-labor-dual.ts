import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface LaborAuditRoute {
  readonly entityId: string;
  readonly vertical: string;
  readonly channelId: "dcaa-audit" | "engagement-letter-audit";
}

export const scenario: IntegrationScenario = {
  id: "C2-2",
  category: "audit-channel-routing",
  title: "GovCon DCAA and PS engagement-letter dual routing",
  dependencies: ["kv-gc", "kv-ps"],
  execute(ctx) {
    ctx.participation.recordVertical("GC");
    ctx.participation.recordVertical("PS");

    const routes: LaborAuditRoute[] = [
      { entityId: "gc-contract", vertical: "GC", channelId: "dcaa-audit" },
      { entityId: "ps-engagement", vertical: "PS", channelId: "engagement-letter-audit" },
    ];

    for (const route of routes) {
      ctx.auditBus.appendChannel(route.channelId, {
        entityId: route.entityId,
        vertical: route.vertical,
        laborScope: route.vertical === "GC" ? "indirect-rates" : "engagement-terms",
        scoped: true,
      });
      ctx.participation.recordChannel(route.channelId);
    }

    ctx.state.routes = routes;
  },
  assertions: [
    assertion("C2-2-dcaa-channel", "GovCon entity emits dcaa-audit only", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("dcaa-audit");
      assertTrue(events.length === 1, "one dcaa event");
      assertTrue(events[0]?.payload.entityId === "gc-contract", "gc entity");
      assertTrue(events[0]?.payload.vertical === "GC", "gc vertical");
    }),
    assertion("C2-2-engagement-channel", "PS entity emits engagement-letter-audit only", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("engagement-letter-audit");
      assertTrue(events.length === 1, "one engagement event");
      assertTrue(events[0]?.payload.entityId === "ps-engagement", "ps entity");
    }),
    assertion("C2-2-dual-isolation", "Neither channel receives the other's vertical", (ctx) => {
      const dcaaHasPs = ctx.auditBus
        .eventsForChannel("dcaa-audit")
        .some((event) => event.payload.vertical === "PS");
      const engagementHasGc = ctx.auditBus
        .eventsForChannel("engagement-letter-audit")
        .some((event) => event.payload.vertical === "GC");
      assertTrue(!dcaaHasPs, "dcaa free of PS");
      assertTrue(!engagementHasGc, "engagement free of GC");
    }),
  ],
};
