/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { classifyRetention } from "../../../lib/intelligence/synthetic/libraries/construction/asc606/contract-balances";

function runPoison(id, input) {
  try {
    classifyRetention(input);
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
    {
      id: "KV-RET-1",
      pass: classifyRetention({ unconditionalRight: false, retentionPct: 5 }).classification === "contract-asset-retention",
      reason: "retention as contract asset",
    },
    runPoison("KV-RET-2", { unconditionalRight: false, retentionPct: 0 }),
  ];
}
