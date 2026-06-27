/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */

import type { ProfServicesCitationHandle } from "./types";
import { PROF_SERVICES_CITATION_HANDLE_COUNT, PROF_SERVICES_CITATION_HANDLE_REGISTRY } from "./handles-registry.generated";
import { ProfServicesHandleNotResolvable } from "./errors";
export { PROF_SERVICES_CITATION_HANDLE_COUNT, PROF_SERVICES_CITATION_HANDLE_REGISTRY };

export function resolveProfServicesCitationHandle(handleId: string): ProfServicesCitationHandle {
  const entry = PROF_SERVICES_CITATION_HANDLE_REGISTRY[handleId];
  if (!entry) throw ProfServicesHandleNotResolvable(handleId);
  return entry as ProfServicesCitationHandle;
}

export function listProfServicesCitationHandleIds(): string[] {
  return Object.keys(PROF_SERVICES_CITATION_HANDLE_REGISTRY).sort();
}
