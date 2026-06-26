/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

export interface GcViolationError extends Error {
  code: string;
  escalationAudits: { channel: string; code: string; message: string }[];
}

function violation(name: string, code: string, message: string): GcViolationError {
  const err = new Error(message) as GcViolationError;
  err.name = name;
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export const RateStateViolation = (msg: string) => violation("RateStateViolation", "GOVCON_RATE_STATE", msg);
export const Maar6Violation = (msg: string) => violation("Maar6Violation", "GOVCON_MAAR6", msg);
export const ExecCompViolation = (msg: string) => violation("ExecCompViolation", "GOVCON_EXEC_COMP", msg);
export const PerDiemCitationViolation = (msg: string) =>
  violation("PerDiemCitationViolation", "GOVCON_PER_DIEM_CITATION", msg);
