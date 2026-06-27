/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { validateEngagementLetter } from "../../../lib/intelligence/synthetic/libraries/prof-services/specialized/engagement-letter";

export function runCases() {
  try {
    validateEngagementLetter({ subSegment: "L", fieldsPresent: ["parties"] });
    return [{ id: "KV-EL-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = err.escalationAudits || [];
    return [
      {
        id: "KV-EL-1",
        pass: audits.length > 0,
        reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
        escalationAudits: audits,
      },
    ];
  }
}
