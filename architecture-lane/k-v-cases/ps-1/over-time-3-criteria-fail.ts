/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateOverTimeCriteria } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/over-time-criteria";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

function runPoison(id: string, criteria: { c1: boolean; c2: boolean; c3: boolean }) {
  try {
    evaluateOverTimeCriteria(PROF_SERVICES_KV_CTX, criteria);
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
    runPoison("KV-OT-1", { c1: false, c2: false, c3: false }),
    runPoison("KV-OT-2", { c1: false, c2: false, c3: false }),
  ];
}
