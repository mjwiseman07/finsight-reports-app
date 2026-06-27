/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateContingentFee } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/contingent-success-fees";

function runPoison(id, input) {
  try {
    evaluateContingentFee(input);
    return { id, pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = err.escalationAudits || [];
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
