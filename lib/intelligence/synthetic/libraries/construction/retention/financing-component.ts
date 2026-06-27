import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

export function evaluateFinancingComponent(ctx, input, emitter = createConAuditEmitter()) {
  assertContainsConstructionContractData(ctx);
  if (input.retentionMonths > 12 && input.interestRate > input.treasuryYield) {
    emitter.emitEscalation("CON_FINANCING_COMPONENT_FAIL", "significant financing");
    emitter.emitPocProgress("rejected-escalation", { input });
    throw Object.assign(new Error("CON_FINANCING_COMPONENT_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_FINANCING_COMPONENT_FAIL", message: "financing" }],
    });
  }
  return { significantFinancing: false };
}
