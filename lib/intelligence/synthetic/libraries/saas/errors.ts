/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

export interface SaasViolationError extends Error {
  code: string;
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
}

function createViolation(code: string, message: string): SaasViolationError {
  const err = new Error(message) as SaasViolationError;
  err.name = "SaasViolation";
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export function SaasViolation(code: string, message: string) {
  return createViolation(code, message);
}

export function SaasHandleNotResolvable(handleId: string) {
  return createViolation("SAAS_HANDLE_NOT_RESOLVABLE", `Handle not registered: ${handleId}`);
}
