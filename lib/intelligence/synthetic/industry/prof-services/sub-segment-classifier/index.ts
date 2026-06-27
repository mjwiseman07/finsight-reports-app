import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import type { ProfServicesClassifierInput, ProfServicesSubSegment } from "./types";
import { classifyProfServicesSubSegmentPure } from "./pure-core";
import { createPsAuditEmitter } from "../audit/ps-audit-emitter";

export function classifyProfServicesSubSegment(
  ctx: ProfServicesClassifierInput,
  emitter = createPsAuditEmitter(),
): ProfServicesSubSegment {
  assertContainsProfessionalEngagementData(ctx);
  const segment = classifyProfServicesSubSegmentPure(ctx);
  emitter.emitEngagementLetter("sub-segment-classified", { naicsCode: ctx.naicsCode, segment });
  return segment;
}

export * from "./types";
export * from "./pure-core";

