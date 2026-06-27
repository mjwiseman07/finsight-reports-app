import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { createConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";
import type { ConAuditEmitter } from "../../../industry/construction/audit/con-audit-emitter";

export function evaluateClaimConstraint(ctx, input, emitter) {
  assertContainsConstructionContractData(ctx);
  const pass = input.probable && input.reliablyEstimable && input.collectionProbable;
  if (!pass) {
    emitter.emitEscalation("CON_CLAIM_CONSTRAINT_FAIL", "claim constraint failed");
    emitter.emitPocProgress("rejected-escalation", { reasoning: input });
    throw Object.assign(new Error("CON_CLAIM_CONSTRAINT_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_CLAIM_CONSTRAINT_FAIL", message: "claim" }],
    });
  }
  emitter.emitPocProgress("claim-evaluated", { reasoning: input });
  return { recognized: true };
}

