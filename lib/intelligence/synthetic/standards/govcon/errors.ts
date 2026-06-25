/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

export interface GovConViolationError extends Error {
  code: string;
  escalationAudits: { channel: "escalation-audit"; code: string; message: string }[];
}

function createViolation(
  name: string,
  code: string,
  message: string,
): GovConViolationError {
  const err = new Error(message) as GovConViolationError;
  err.name = name;
  err.code = code;
  err.escalationAudits = [{ channel: "escalation-audit", code, message }];
  return err;
}

export function GovConSubSegmentNotFound(subSegmentId: string): GovConViolationError {
  return createViolation(
    "GovConSubSegmentNotFound",
    "GOVCON_SUBSEGMENT_NOT_FOUND",
    `Unknown GovCon sub-segment: ${subSegmentId}`,
  );
}

export function GovConHandleNotResolvable(handleId: string): GovConViolationError {
  return createViolation(
    "GovConHandleNotResolvable",
    "GOVCON_HANDLE_NOT_RESOLVABLE",
    `Citation handle not registered: ${handleId}`,
  );
}

export function GovConIfrsHandleRejected(handleId: string): GovConViolationError {
  return createViolation(
    "GovConIfrsHandleRejected",
    "GOVCON_IFRS_HANDLE_REJECTED",
    `IFRS handle ${handleId} cannot be registered under govcon/ (US_GAAP_ONLY)`,
  );
}

export function GovConSubSegmentIsolationViolation(
  entitySubSegment: string,
  requestedHandle: string,
): GovConViolationError {
  return createViolation(
    "GovConSubSegmentIsolationViolation",
    "GOVCON_SUBSEGMENT_ISOLATION",
    `Handle ${requestedHandle} is not applicable to sub-segment ${entitySubSegment}`,
  );
}
