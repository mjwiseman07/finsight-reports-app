import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import type { ConstructionClassifierInput, ConstructionSubSegment } from "./types";
import { classifyConstructionSubSegmentPure } from "./pure-core";
import { createConAuditEmitter } from "../audit/con-audit-emitter";
import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";

export function classifyConstructionSubSegment(
  ctx: ConstructionClassifierInput,
  emitter = createConAuditEmitter(),
): ConstructionSubSegment {
  assertContainsConstructionContractData(ctx);
  const segment = classifyConstructionSubSegmentPure(ctx);
  emitter.emitPocProgress("sub-segment-classified", { naicsCode: ctx.naicsCode, segment });
  return segment;
}

export * from "./types";
export * from "./pure-core";

