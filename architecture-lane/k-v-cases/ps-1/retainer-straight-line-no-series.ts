/**
 * @doctrine containsProfessionalEngagementData: true
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
import { evaluateRetainerSeries } from "../../../lib/intelligence/synthetic/libraries/prof-services/asc606/retainer-series";

function runPoison(id, input) {
  try {
    evaluateRetainerSeries(input);
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
    runPoison("KV-RET-1", { seriesOfDistinct: false, straightLineRequested: true }),
    runPoison("KV-RET-2", { seriesOfDistinct: false, straightLineRequested: true }),
  ];
}
