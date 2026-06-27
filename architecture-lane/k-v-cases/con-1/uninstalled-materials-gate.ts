/**
 * @doctrine containsConstructionContractData: true
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */
import { evaluateUninstalledMaterialsGate } from "../../../lib/intelligence/synthetic/libraries/construction/asc606/uninstalled-materials";

function runPoison(id, input) {
  try {
    evaluateUninstalledMaterialsGate(input);
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
    runPoison("KV-UM-1", { isCustomerOwned: true, costEqualsSellingPrice: true, notCustomForContract: true }),
    {
      id: "KV-UM-2",
      pass: evaluateUninstalledMaterialsGate({ isCustomerOwned: false, costEqualsSellingPrice: true, notCustomForContract: true }).includedInPoc === true,
      reason: "materials included when gate not met",
    },
  ];
}
