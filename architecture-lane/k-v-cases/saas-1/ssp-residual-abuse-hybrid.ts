/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { allocateHybridSSP } from "../../../lib/intelligence/synthetic/libraries/saas/asc606/multi-element-ssp";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    allocateHybridSSP({ containsSaaSARRData: true }, { residualOnly: true, observable: 100 });
    return { id: "KV-SSP-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-SSP-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
