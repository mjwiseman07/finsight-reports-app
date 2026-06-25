/**
 * Phase 42.7C.2 — Panel Decision Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (panel selections support, not replace, controller judgment)
 *  - humanWorkerParityDoctrine: true (panel authority modeled on AICPA CGMA framework)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (panel-consumer deterministic logic byte-identical to c8bddc8)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 *  - advisoryBundlingDoctrine: true (one panel call = one audit entry; advisories bundled)
 */
export const LOCKED_CITATION_HANDLES = Object.freeze([
  "ASC_105_10_05_1",
  "IAS_1_PRESENTATION",
  "IFRS_FOR_SMES_S1",
  "SEC_REG_S_X",
  "SEC_FORM_20F_FPI",
] as const);

export type LockedCitationHandle = (typeof LOCKED_CITATION_HANDLES)[number];

const LOCKED_SET = new Set<string>(LOCKED_CITATION_HANDLES);

export function isLockedCitationHandle(handle: string): handle is LockedCitationHandle {
  return LOCKED_SET.has(handle);
}

export function filterLockedCitationHandles(handles: readonly string[]): LockedCitationHandle[] {
  return handles.filter(isLockedCitationHandle);
}

export function pickLockedCitationHandle(handles: readonly string[]): LockedCitationHandle {
  const filtered = filterLockedCitationHandles(handles);
  return filtered[0] ?? "ASC_105_10_05_1";
}
