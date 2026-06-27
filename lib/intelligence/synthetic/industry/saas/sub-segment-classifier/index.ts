import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import type { SaaSSubSegmentClassifierInput, SaaSSubSegment } from "./types";
import { classifySaaSSubSegmentPure } from "./pure-core";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";

export function classifySaaSSubSegment(
  ctx: SaaSSubSegmentClassifierInput,
  emitter = createSaasAuditEmitter(),
): SaaSSubSegment {
  assertContainsSaaSARRData(ctx);
  const segment = classifySaaSSubSegmentPure(ctx);
  emitter.emitArrMrr("sub-segment-classified", { segment, input: ctx });
  return segment;
}

export * from "./types";
export * from "./pure-core";
export * from "./rules";

