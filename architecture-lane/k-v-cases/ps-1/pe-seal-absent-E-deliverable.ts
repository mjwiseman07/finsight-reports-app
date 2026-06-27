/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { assertPeSealPresent } from "../../../lib/intelligence/synthetic/libraries/prof-services/specialized/pe-seal";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

export function runCases() {
  try {
    assertPeSealPresent(PROF_SERVICES_KV_CTX, { subSegment: "E", sealPresent: false, deliverableRequiresSeal: true });
    return [{ id: "KV-PE-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return [
      {
        id: "KV-PE-1",
        pass: audits.length > 0,
        reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
        escalationAudits: audits,
      },
    ];
  }
}
