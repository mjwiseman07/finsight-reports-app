/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";

export const MODULE_HANDLES = ["ASC.606-10-55-36", "ASC.606-10-55-37", "ASC.606-10-55-38", "ASC.606-10-55-39", "ASC.606-10-55-40"] as const;

export function resolveModuleHandles() {
  return MODULE_HANDLES.map((id) => resolveSaasCitationHandle(id));
}

export function classifySaasPrincipalVsAgent(input: { positiveControlEvidence: boolean; amount: number }) {
  if (!input.positiveControlEvidence) return { presentation: "net", amount: 0 };
  return { presentation: "gross", amount: input.amount };
}
