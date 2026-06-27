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
  id: "C3-2",
  category: "disclosure-handoff",
  title: "Cross-entity disclosure handoff with stable reorder",
  dependencies: [],
  execute(ctx) {
    ctx.participation.recordVertical("PS");
    ctx.participation.recordFramework("US_GAAP");

    const incoming: DisclosureBlock[] = [
      { blockId: "ps-engagement-scope", entityId: "ps-entity", sequence: 3, framework: "US_GAAP" },
      { blockId: "ps-revenue-policy", entityId: "ps-entity", sequence: 1, framework: "US_GAAP" },
      { blockId: "ps-contingencies", entityId: "ps-entity", sequence: 2, framework: "US_GAAP" },
    ];

    const firstPass = handoffDisclosures(incoming);
    ctx.clock.advance(1000);
    const secondPass = handoffDisclosures(incoming);

    ctx.state.disclosureBlocks = firstPass;
    ctx.state.secondPassOrder = secondPass.map((block) => block.blockId);

    for (const block of firstPass) {
      ctx.auditBus.appendChannel("audit-support", {
        blockId: block.blockId,
        entityId: block.entityId,
        sequence: block.sequence,
        handoffAt: ctx.clock.nowISO(),
      });
      ctx.participation.recordChannel("audit-support");
    }
  },
  assertions: [
    assertion("C3-2-sequence-order", "Blocks ordered 1-2-3 by sequence field", (ctx) => {
      const blocks = ctx.state.disclosureBlocks as DisclosureBlock[];
      assertTrue(blocks[0]?.blockId === "ps-revenue-policy", "first");
      assertTrue(blocks[1]?.blockId === "ps-contingencies", "second");
      assertTrue(blocks[2]?.blockId === "ps-engagement-scope", "third");
    }),
    assertion("C3-2-idempotent-reorder", "Re-handoff yields identical order", (ctx) => {
      const first = (ctx.state.disclosureBlocks as DisclosureBlock[]).map((block) => block.blockId);
      const second = ctx.state.secondPassOrder as string[];
      assertTrue(first.length === second.length, "same length");
      for (let i = 0; i < first.length; i += 1) {
        assertTrue(first[i] === second[i], `slot ${String(i)} stable`);
      }
    }),
    assertion("C3-2-single-entity-scope", "All blocks scoped to one entity", (ctx) => {
      const blocks = ctx.state.disclosureBlocks as DisclosureBlock[];
      assertTrue(blocks.every((block) => block.entityId === "ps-entity"), "single entity");
    }),
  ],
};
