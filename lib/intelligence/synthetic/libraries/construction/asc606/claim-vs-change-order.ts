import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";
import type { ConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

export function discriminateClaimVsChangeOrder(ctx, input, emitter) {
  assertContainsConstructionContractData(ctx);
  const kind = input.kind === "claim" ? "claim" : "change-order";
  emitter.emitPocProgress(kind === "claim" ? "claim-evaluated" : "change-order-evaluated", {
    reasoningChain: input,
    costBreakdown: input.costBreakdown ?? {},
    constraintTest: input.constraintTest ?? {},
    enforceableRight: input.enforceableRight ?? false,
  });
  return { kind };
}

