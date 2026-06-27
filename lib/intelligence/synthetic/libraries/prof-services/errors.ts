/**
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */
export interface ProfServicesViolationError extends Error {
  code: string;
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
}

function createViolation(code: string, message: string): ProfServicesViolationError {
  const err = new Error(message) as ProfServicesViolationError;
  err.name = "ProfServicesViolation";
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export function ProfServicesViolation(code: string, message: string) {
  return createViolation(code, message);
}

export function ProfServicesHandleNotResolvable(handleId: string) {
  return createViolation("PS_HANDLE_NOT_RESOLVABLE", `Handle not registered: ${handleId}`);
}
