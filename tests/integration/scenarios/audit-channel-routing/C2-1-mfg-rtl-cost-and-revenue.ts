import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface ChannelRouteEvent {
  readonly entityId: string;
  readonly vertical: string;
  readonly channelId: string;
}

export const scenario: IntegrationScenario = {
  id: "C2-1",
  category: "audit-channel-routing",
  title: "MFG cost audit and RTL revenue recognition routing",
  dependencies: ["kv-mfg", "kv-rtl"],
  execute(ctx) {
    ctx.participation.recordVertical("MFG");
    ctx.participation.recordVertical("RTL");

    const mfgEntity = ctx.mocks.entity({
      orgId: "org-routing",
      entityId: "mfg-entity",
      vertical: "MFG",
      framework: "US_GAAP",
      inventory: ctx.mocks.usGaapInventory("LIFO"),
    });
    const rtlEntity = ctx.mocks.entity({
      orgId: "org-routing",
      entityId: "rtl-entity",
      vertical: "RTL",
      framework: "US_GAAP",
      inventory: ctx.mocks.usGaapInventory("FIFO"),
    });

    const routes: ChannelRouteEvent[] = [
      { entityId: mfgEntity.entityId, vertical: "MFG", channelId: "manufacturing-cost-audit" },
      { entityId: rtlEntity.entityId, vertical: "RTL", channelId: "revenue-recognition" },
    ];

    for (const route of routes) {
      ctx.auditBus.appendChannel(route.channelId, {
        entityId: route.entityId,
        vertical: route.vertical,
        scoped: true,
      });
      ctx.participation.recordChannel(route.channelId);
    }

    ctx.state.routes = routes;
  },
  assertions: [
    assertion("C2-1-mfg-cost-channel", "Manufacturing entity routes to manufacturing-cost-audit", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("manufacturing-cost-audit");
      assertTrue(events.length === 1, "one mfg event");
      assertTrue(events[0]?.payload.entityId === "mfg-entity", "mfg entity id");
    }),
    assertion("C2-1-rtl-revenue-channel", "Retail entity routes to revenue-recognition", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("revenue-recognition");
      assertTrue(events.length === 1, "one rtl event");
      assertTrue(events[0]?.payload.entityId === "rtl-entity", "rtl entity id");
    }),
    assertion("C2-1-no-cross-routing", "Channels remain vertically isolated", (ctx) => {
      const mfgOnRevenue = ctx.auditBus
        .eventsForChannel("revenue-recognition")
        .some((event) => event.payload.vertical === "MFG");
      const rtlOnCost = ctx.auditBus
        .eventsForChannel("manufacturing-cost-audit")
        .some((event) => event.payload.vertical === "RTL");
      assertTrue(!mfgOnRevenue, "MFG not on revenue channel");
      assertTrue(!rtlOnCost, "RTL not on cost channel");
    }),
  ],
};
