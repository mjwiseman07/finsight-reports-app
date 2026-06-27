/**
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { classifyHostingVsLicense } from "../../../lib/intelligence/synthetic/libraries/saas/asc606/hosting-vs-license";
import { extractEscalationAudits } from "../_helpers/kv-case-helpers";

export function runCase() {
  try {
    classifyHostingVsLicense({ containsSaaSARRData: true }, { treatedAs: "license", hostingIndicators: true });
    return { id: "KV-HOST-LIC-1", pass: false, reason: "silent rejection" };
  } catch (err) {
    const audits = extractEscalationAudits(err);
    return {
      id: "KV-HOST-LIC-1",
      pass: audits.length > 0,
      reason: audits.length > 0 ? "escalation-audit emitted" : "missing escalation-audit",
      escalationAudits: audits,
    };
  }
}
