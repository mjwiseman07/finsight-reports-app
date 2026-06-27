/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { allocateMultiElement } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/multi-element-ssp";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

function runPoison(
  id: string,
  input: { residualOnly?: boolean; observable?: number; adjustedMarket?: number },
) {
  try {
    allocateMultiElement(PROF_SERVICES_KV_CTX, input);
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
    runPoison("KV-SSP-1", { residualOnly: true, observable: 100 }),
    runPoison("KV-SSP-2", { residualOnly: true, adjustedMarket: 50 }),
  ];
}
