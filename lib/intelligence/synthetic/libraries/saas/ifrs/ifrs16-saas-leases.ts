/**
 * @audit-channel arr-mrr-audit
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { resolveSaasCitationHandle } from "../handles";
export const IFRS16_SAAS_HANDLES = ["IFRS16.Page", "EUR-Lex.2017R1986.IFRS16", "IFRS16.SaaSHosting"] as const;
export function resolveIfrs16SaasHandles() { return IFRS16_SAAS_HANDLES.map((h) => resolveSaasCitationHandle(h)); }
