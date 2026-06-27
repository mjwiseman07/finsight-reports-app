import type { FrameworkId } from "../../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface DisclosureBlock {
  readonly blockId: string;
  readonly entityId: string;
  readonly sequence: number;
  readonly framework: FrameworkId;
  readonly vertical: string;
}

function handoffDisclosures(blocks: readonly DisclosureBlock[]): readonly DisclosureBlock[] {
  return Object.freeze([...blocks].sort((a, b) => a.sequence - b.sequence));
}

export const scenario: IntegrationScenario = {
  id: "C3-3",
  category: "disclosure-handoff",
  title: "MFG and RTL disclosure block handoff order",
  dependencies: ["kv-mfg", "kv-rtl"],
  execute(ctx) {
    ctx.participation.recordVertical("MFG");
    ctx.participation.recordVertical("RTL");
    ctx.participation.recordFramework("US_GAAP");

    const incoming: DisclosureBlock[] = [
      { blockId: "rtl-inventory", entityId: "rtl-entity", sequence: 2, framework: "US_GAAP", vertical: "RTL" },
      { blockId: "mfg-costing", entityId: "mfg-entity", sequence: 1, framework: "US_GAAP", vertical: "MFG" },
      { blockId: "mfg-capacity", entityId: "mfg-entity", sequence: 3, framework: "US_GAAP", vertical: "MFG" },
    ];

    const ordered = handoffDisclosures(incoming);
    ctx.state.disclosureBlocks = ordered;

    for (const block of ordered) {
      ctx.auditBus.appendChannel("variance-analysis", {
        blockId: block.blockId,
        entityId: block.entityId,
        vertical: block.vertical,
        sequence: block.sequence,
      });
      ctx.participation.recordChannel("variance-analysis");
    }
  },
  assertions: [
    assertion("C3-3-mfg-first", "Manufacturing disclosures lead handoff", (ctx) => {
      const blocks = ctx.state.disclosureBlocks as DisclosureBlock[];
      assertTrue(blocks[0]?.vertical === "MFG", "first vertical MFG");
      assertTrue(blocks[0]?.blockId === "mfg-costing", "first block mfg-costing");
    }),
    assertion("C3-3-rtl-middle", "Retail disclosure follows manufacturing opener", (ctx) => {
      const blocks = ctx.state.disclosureBlocks as DisclosureBlock[];
      assertTrue(blocks[1]?.vertical === "RTL", "second vertical RTL");
      assertTrue(blocks[1]?.blockId === "rtl-inventory", "rtl inventory block");
    }),
    assertion("C3-3-audit-sequence", "Variance analysis channel preserves handoff sequence", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("variance-analysis");
      assertTrue(events.length === 3, "three events");
      assertTrue(events[0]?.payload.sequence === 1, "seq 1 first");
      assertTrue(events[1]?.payload.sequence === 2, "seq 2 second");
      assertTrue(events[2]?.payload.sequence === 3, "seq 3 third");
    }),
  ],
};
