/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

export interface ConstructionViolationError extends Error {
  code: string;
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
}

function createViolation(name: string, code: string, message: string): ConstructionViolationError {
  const err = new Error(message) as ConstructionViolationError;
  err.name = name;
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export function ConstructionViolation(code: string, message: string): ConstructionViolationError {
  return createViolation("ConstructionViolation", code, message);
}

export function ConstructionHandleNotResolvable(handleId: string): ConstructionViolationError {
  return createViolation(
    "ConstructionHandleNotResolvable",
    "CON_HANDLE_NOT_RESOLVABLE",
    `Citation handle not registered: ${handleId}`,
  );
}

export function ConstructionSubSegmentNotFound(subSegmentId: string): ConstructionViolationError {
  return createViolation(
    "ConstructionSubSegmentNotFound",
    "CON_SUBSEGMENT_NOT_FOUND",
    `Unknown construction sub-segment: ${subSegmentId}`,
  );
}
