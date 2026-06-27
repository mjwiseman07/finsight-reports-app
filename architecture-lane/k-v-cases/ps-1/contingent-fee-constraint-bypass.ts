/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateContingentFee } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/contingent-success-fees";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

function runPoison(
  id: string,
  input: { probable: boolean; constrained: boolean; engagementLevel: boolean },
) {
  try {
    evaluateContingentFee(PROF_SERVICES_KV_CTX, input);
    return { id, pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id,
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}

export function runCases() {
  return [
    runPoison("KV-VC-1", { probable: true, constrained: false, engagementLevel: true }),
    runPoison("KV-VC-2", { probable: true, constrained: false, engagementLevel: false }),
  ];
}
