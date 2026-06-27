import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";
import type { ConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

type ConstructionCtx = { containsConstructionContractData?: boolean };

export function evaluateUnpricedChangeOrder(
  ctx: ConstructionCtx,
  input: { enforceableRight: boolean; constraintPass: boolean },
  emitter: ConAuditEmitter = createConAuditEmitter(),
) {
  assertContainsConstructionContractData(ctx);
  if (!input.enforceableRight || !input.constraintPass) {
    emitter.emitEscalation("CON_UNPRICED_CO_REFUSED", "unpriced CO");
    emitter.emitPocProgress("rejected-escalation", { input });
    throw Object.assign(new Error("CON_UNPRICED_CO_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_UNPRICED_CO_REFUSED", message: "co" }],
    });
  }
  emitter.emitPocProgress("change-order-evaluated", { input });
  return { recognized: true };
}
