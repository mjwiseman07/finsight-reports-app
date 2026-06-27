/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateRetainerSeries } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/retainer-series";
import { extractEscalationAudits, PROF_SERVICES_KV_CTX } from "../_helpers/kv-case-helpers";

function runPoison(id: string, input: { seriesOfDistinct: boolean; straightLineRequested: boolean }) {
  try {
    evaluateRetainerSeries(PROF_SERVICES_KV_CTX, input);
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
    runPoison("KV-RET-1", { seriesOfDistinct: false, straightLineRequested: true }),
    runPoison("KV-RET-2", { seriesOfDistinct: false, straightLineRequested: true }),
  ];
}
