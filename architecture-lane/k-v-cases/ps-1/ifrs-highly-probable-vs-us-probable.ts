/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateIfrsConstraint } from "../../../lib/intelligence/synthetic/libraries/prof-services/ifrs/ifrs15";

export function runCases() {
  try {
    evaluateIfrsConstraint({ highlyProbable: false, usProbableOnly: true });
    return [{ id: "KV-IFRS-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = err.escalationAudits || [];
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
