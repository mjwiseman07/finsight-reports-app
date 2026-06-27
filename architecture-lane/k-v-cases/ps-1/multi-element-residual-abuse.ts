/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { allocateMultiElement } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/multi-element-ssp";

function runPoison(id, input) {
  try {
    allocateMultiElement(input);
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
    runPoison("KV-SSP-1", { residualOnly: true, observable: 100 }),
    runPoison("KV-SSP-2", { residualOnly: true, adjustedMarket: 50 }),
  ];
}
