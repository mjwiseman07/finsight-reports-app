/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

import { resolveSaasCitationHandle } from "../handles";
export const IFRS15_AGENT_HANDLES = ["IFRS15.AgentPrincipal"] as const;
export function resolveIfrs15AgentHandles(ctx: { containsSaaSARRData?: boolean }) {
  assertContainsSaaSARRData(ctx);
 return IFRS15_AGENT_HANDLES.map((h) => resolveSaasCitationHandle(h)); }
