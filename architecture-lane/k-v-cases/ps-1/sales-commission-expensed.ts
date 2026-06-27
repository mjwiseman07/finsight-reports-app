/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateSalesCommission } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc340-40/contract-costs";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

export function runCases() {
  try {
    evaluateSalesCommission(PROF_SERVICES_KV_CTX, { capitalizable: true, expensed: true });
    return [{ id: "KV-COM-1", pass: false, reason: "silent rejection" }];
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return [
      {
        id: "KV-COM-1",
        pass: audits.length > 0,
        reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
        escalationAudits: audits,
      },
    ];
  }
}
