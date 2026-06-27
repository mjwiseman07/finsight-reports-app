/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateIfrsConstraint } from "../../../lib/intelligence/synthetic/libraries/prof-services/ifrs/ifrs15";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

export function runCases() {
  try {
    evaluateIfrsConstraint(PROF_SERVICES_KV_CTX, { highlyProbable: false, usProbableOnly: true });
    return [{ id: "KV-IFRS-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return [
      {
        id: "KV-IFRS-1",
        pass: audits.length > 0,
        reason: audits.length > 0 ? "escalation-audit emitted (DIV-2)" : "missing escalation-audit",
        escalationAudits: audits,
      },
    ];
  }
}
