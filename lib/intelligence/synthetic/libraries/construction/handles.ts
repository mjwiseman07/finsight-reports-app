/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

import type { ConstructionCitationHandle } from "./types";
import {
  CONSTRUCTION_CITATION_HANDLE_COUNT,
  CONSTRUCTION_CITATION_HANDLE_REGISTRY,
} from "./handles-registry.generated";
import { ConstructionHandleNotResolvable } from "./errors";

export { CONSTRUCTION_CITATION_HANDLE_COUNT, CONSTRUCTION_CITATION_HANDLE_REGISTRY };

export function resolveConstructionCitationHandle(handleId: string): ConstructionCitationHandle {
  const entry = CONSTRUCTION_CITATION_HANDLE_REGISTRY[handleId];
  if (!entry) {
    throw ConstructionHandleNotResolvable(handleId);
  }
  if (!entry.url.startsWith("https://") && !entry.url.startsWith("http://")) {
    throw ConstructionHandleNotResolvable(handleId);
  }
  return entry as ConstructionCitationHandle;
}

export function listConstructionCitationHandleIds(): string[] {
  return Object.keys(CONSTRUCTION_CITATION_HANDLE_REGISTRY).sort();
}
