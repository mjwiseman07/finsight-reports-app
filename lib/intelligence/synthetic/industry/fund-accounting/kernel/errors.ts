/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 */

export interface FAViolationError extends Error {
  code: string;
}

function createViolation(
  name: string,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): FAViolationError {
  const err = new Error(message) as FAViolationError;
  err.name = name;
  err.code = code;
  if (extra) Object.assign(err, extra);
  return err;
}

export function SubSegmentIsolationViolation(
  message: string,
  entitySubSegment: string,
  requestedCapability: string,
): FAViolationError {
  return createViolation("SubSegmentIsolationViolation", "SubSegmentIsolationViolation", message, {
    entitySubSegment,
    requestedCapability,
  });
}

export function SubSegmentApplicabilityViolation(
  message: string,
  subSegment: string,
  capabilityKey: string,
): FAViolationError {
  return createViolation(
    "SubSegmentApplicabilityViolation",
    "SubSegmentApplicabilityViolation",
    message,
    { subSegment, capabilityKey },
  );
}

export function FrameworkMismatchViolation(
  message: string,
  entityFramework: string,
  requestedFramework: string,
): FAViolationError {
  return createViolation("FrameworkMismatchViolation", "FrameworkMismatchViolation", message, {
    entityFramework,
    requestedFramework,
  });
}

export function RegistrationRequiredEscalation(message: string, trigger: string): FAViolationError {
  return createViolation("RegistrationRequiredEscalation", "RegistrationRequiredEscalation", message, {
    trigger,
  });
}

export function TreatmentResolverBypassViolation(message: string): FAViolationError {
  return createViolation(
    "TreatmentResolverBypassViolation",
    "TreatmentResolverBypassViolation",
    message,
  );
}

export function CrossTenantMemoryViolation(message: string): FAViolationError {
  return createViolation("CrossTenantMemoryViolation", "CrossTenantMemoryViolation", message);
}

export function SidePocketIsolationViolation(message: string): FAViolationError {
  return createViolation("SidePocketIsolationViolation", "SidePocketIsolationViolation", message);
}

export function AuditEmissionBypassViolation(message: string): FAViolationError {
  return createViolation("AuditEmissionBypassViolation", "AuditEmissionBypassViolation", message);
}

export function RegistryMutationViolation(message: string): FAViolationError {
  return createViolation("RegistryMutationViolation", "RegistryMutationViolation", message);
}
