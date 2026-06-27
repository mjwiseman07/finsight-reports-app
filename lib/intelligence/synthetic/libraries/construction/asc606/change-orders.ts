import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";
import type { ConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

type ConstructionCtx = { containsConstructionContractData?: boolean };

export function evaluateChangeOrder(
  ctx: ConstructionCtx,
  input: { separateContract: boolean; remainingDistinct: boolean },
  emitter: ConAuditEmitter = createConAuditEmitter(),
) {
  assertContainsConstructionContractData(ctx);
  if (input.separateContract) {
    emitter.emitPocProgress("change-order-evaluated", { path: "separate-contract", reasoning: input });
    return { path: "separate-contract" };
  }
  if (input.remainingDistinct) {
    emitter.emitPocProgress("change-order-evaluated", { path: "prospective", reasoning: input });
    return { path: "prospective" };
  }
  emitter.emitPocProgress("change-order-evaluated", { path: "cumulative-catch-up", reasoning: input });
  return { path: "cumulative-catch-up" };
}
