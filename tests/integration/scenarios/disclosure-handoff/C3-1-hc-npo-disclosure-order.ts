import type { FrameworkId } from "../../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface DisclosureBlock {
  readonly blockId: string;
  readonly entityId: string;
  readonly sequence: number;
  readonly framework: FrameworkId;
}

function handoffDisclosures(blocks: readonly DisclosureBlock[]): readonly DisclosureBlock[] {
  return Object.freeze([...blocks].sort((a, b) => a.sequence - b.sequence));
}

export const scenario: IntegrationScenario = {
  id: "C3-1",
  category: "disclosure-handoff",
  title: "HC and NPO disclosure block handoff order",
  dependencies: ["kv-hc", "kv-npo"],
  execute(ctx) {
    ctx.participation.recordVertical("HC");
    ctx.participation.recordVertical("NPO");
    ctx.participation.recordFramework("US_GAAP");
    ctx.participation.recordFramework("IFRS");

    const incoming: DisclosureBlock[] = [
      { blockId: "npo-net-assets", entityId: "npo-sub", sequence: 2, framework: "IFRS" },
      { blockId: "hc-provider-services", entityId: "hc-sub", sequence: 1, framework: "US_GAAP" },
      { blockId: "hc-compliance", entityId: "hc-sub", sequence: 3, framework: "US_GAAP" },
    ];

    const ordered = handoffDisclosures(incoming);
    ctx.state.disclosureBlocks = ordered;
    ctx.state.expectedOrder = ["hc-provider-services", "npo-net-assets", "hc-compliance"];

    for (const block of ordered) {
      ctx.auditBus.appendChannel("financial-statements", {
        blockId: block.blockId,
        entityId: block.entityId,
        sequence: block.sequence,
        framework: block.framework,
      });
      ctx.participation.recordChannel("financial-statements");
    }
  },
  assertions: [
    assertion("C3-1-deterministic-order", "Disclosure blocks sorted by sequence", (ctx) => {
      const blocks = ctx.state.disclosureBlocks as DisclosureBlock[];
      const order = blocks.map((block) => block.blockId);
      const expected = ctx.state.expectedOrder as string[];
      assertTrue(order.length === expected.length, "block count");
      for (let i = 0; i < expected.length; i += 1) {
        assertTrue(order[i] === expected[i], `sequence slot ${String(i)}`);
      }
    }),
    assertion("C3-1-hc-before-npo", "HC disclosure precedes NPO in handoff", (ctx) => {
      const blocks = ctx.state.disclosureBlocks as DisclosureBlock[];
      const hcIndex = blocks.findIndex((block) => block.entityId === "hc-sub");
      const npoIndex = blocks.findIndex((block) => block.entityId === "npo-sub");
      assertTrue(hcIndex >= 0 && npoIndex >= 0, "both entities present");
      assertTrue(hcIndex < npoIndex, "HC before NPO");
    }),
    assertion("C3-1-audit-order-matches", "Audit channel sequence mirrors handoff order", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("financial-statements");
      assertTrue(events.length === 3, "three disclosure events");
      assertTrue(events[0]?.payload.blockId === "hc-provider-services", "first block");
      assertTrue(events[2]?.payload.blockId === "hc-compliance", "last block");
    }),
  ],
};
