import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { resolveProfServicesCitationHandle } from "../handles";
import { createPsAuditEmitter } from "../../../industry/prof-services/audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../../../industry/prof-services/audit/ps-audit-emitter";

export const IAS38_SIX_CRITERIA = [
  "identifiable",
  "controlled",
  "futureBenefits",
  "costReliablyMeasured",
  "probableFutureBenefits",
  "developmentPhase",
] as const;

export function evaluateIas38Capitalization(
  ctx: { containsProfessionalEngagementData?: boolean },
  criteria: Record<(typeof IAS38_SIX_CRITERIA)[number], boolean>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  const pass = IAS38_SIX_CRITERIA.every((k) => criteria[k] === true);
  if (!pass) {
    emitter.emitEscalation("PS_IAS38_CAPITALIZATION_REFUSED", "IAS38 six-criterion gate failed");
    emitter.emitEngagementLetter("rejected-escalation", { criteria });
    throw Object.assign(new Error("PS_IAS38_CAPITALIZATION_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_IAS38_CAPITALIZATION_REFUSED", message: "ias38" }],
    });
  }
  emitter.emitEngagementLetter("ias38-capitalization-evaluated", { criteria, handle: resolveProfServicesCitationHandle("IAS38.Page") });
  return { capitalized: true };
}
