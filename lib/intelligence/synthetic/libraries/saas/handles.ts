/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import type { SaasCitationHandle } from "./types";
import { SAAS_CITATION_HANDLE_COUNT, SAAS_CITATION_HANDLE_REGISTRY } from "./handles-registry.generated";
import { SaasHandleNotResolvable } from "./errors";
export { SAAS_CITATION_HANDLE_COUNT, SAAS_CITATION_HANDLE_REGISTRY };

export function resolveSaasCitationHandle(handleId: string): SaasCitationHandle {
  const entry = SAAS_CITATION_HANDLE_REGISTRY[handleId];
  if (!entry) throw SaasHandleNotResolvable(handleId);
  return entry as SaasCitationHandle;
}
