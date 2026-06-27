import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface Asc606Route {
  readonly entityId: string;
  readonly vertical: string;
  readonly channelId: "construction-contract-audit" | "arr-mrr-audit";
  readonly asc606Topic: string;
}

export const scenario: IntegrationScenario = {
  id: "C2-3",
  category: "audit-channel-routing",
  title: "Construction contract and SaaS ARR/MRR ASC 606 dual routing",
  dependencies: ["kv-con", "kv-saas"],
  execute(ctx) {
    ctx.participation.recordVertical("CON");
    ctx.participation.recordVertical("SAAS");

    const routes: Asc606Route[] = [
      {
        entityId: "con-project",
        vertical: "CON",
        channelId: "construction-contract-audit",
        asc606Topic: "over-time-percent-complete",
      },
      {
        entityId: "saas-subscription",
        vertical: "SAAS",
        channelId: "arr-mrr-audit",
        asc606Topic: "subscription-recognition",
      },
    ];

    for (const route of routes) {
      ctx.auditBus.appendChannel(route.channelId, {
        entityId: route.entityId,
        vertical: route.vertical,
        asc606Topic: route.asc606Topic,
        scoped: true,
      });
      ctx.participation.recordChannel(route.channelId);
    }

    ctx.state.routes = routes;
  },
  assertions: [
    assertion("C2-3-construction-channel", "Construction entity routes to construction-contract-audit", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("construction-contract-audit");
      assertTrue(events.length === 1, "one con event");
      assertTrue(events[0]?.payload.asc606Topic === "over-time-percent-complete", "con topic");
    }),
    assertion("C2-3-saas-channel", "SaaS entity routes to arr-mrr-audit", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("arr-mrr-audit");
      assertTrue(events.length === 1, "one saas event");
      assertTrue(events[0]?.payload.asc606Topic === "subscription-recognition", "saas topic");
    }),
    assertion("C2-3-no-cross-routing", "ASC 606 channels remain vertically isolated", (ctx) => {
      const conOnArr = ctx.auditBus.eventsForChannel("arr-mrr-audit").some((event) => event.payload.vertical === "CON");
      const saasOnCon = ctx.auditBus
        .eventsForChannel("construction-contract-audit")
        .some((event) => event.payload.vertical === "SAAS");
      assertTrue(!conOnArr, "CON not on arr-mrr");
      assertTrue(!saasOnCon, "SAAS not on construction");
    }),
  ],
};
