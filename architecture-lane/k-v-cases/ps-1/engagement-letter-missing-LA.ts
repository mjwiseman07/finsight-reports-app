/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { validateEngagementLetter } from "../../../lib/intelligence/synthetic/libraries/prof-services/specialized/engagement-letter";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

export function runCases() {
  try {
    validateEngagementLetter(PROF_SERVICES_KV_CTX, { subSegment: "L", fieldsPresent: ["parties"] });
    return [{ id: "KV-EL-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = extractEscalationAudits(err);
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
