/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 */

export interface HCViolationError extends Error {
  code: string;
}

function createViolation(
  name: string,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): HCViolationError {
  const err = new Error(message) as HCViolationError;
  err.name = name;
  err.code = code;
  if (extra) Object.assign(err, extra);
  return err;
}

export function SubSegmentIsolationViolation(
  message: string,
  entitySubSegment: string,
  requestedCapability: string,
): HCViolationError {
  return createViolation("SubSegmentIsolationViolation", "SubSegmentIsolationViolation", message, {
    entitySubSegment,
    requestedCapability,
  });
}

export function SubSegmentApplicabilityViolation(
  message: string,
  subSegment: string,
  capabilityKey: string,
): HCViolationError {
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
): HCViolationError {
  return createViolation("FrameworkMismatchViolation", "FrameworkMismatchViolation", message, {
    entityFramework,
    requestedFramework,
  });
}

export function PHIDisclosureViolation(message: string): HCViolationError {
  return createViolation("PHIDisclosureViolation", "PHIDisclosureViolation", message);
}

export function PHIDerivedTaggingViolation(message: string): HCViolationError {
  return createViolation("PHIDerivedTaggingViolation", "PHIDerivedTaggingViolation", message);
}

export function Diversion340BViolation(message: string): HCViolationError {
  return createViolation("340BDiversionViolation", "340BDiversionViolation", message);
}

export function Part2ConfidentialityViolation(message: string): HCViolationError {
  return createViolation("Part2ConfidentialityViolation", "Part2ConfidentialityViolation", message);
}

export function CrossTenantPHIViolation(message: string): HCViolationError {
  return createViolation("CrossTenantPHIViolation", "CrossTenantPHIViolation", message);
}

export function AuditEmissionBypassViolation(message: string): HCViolationError {
  return createViolation("AuditEmissionBypassViolation", "AuditEmissionBypassViolation", message);
}

export function RegistryMutationViolation(message: string): HCViolationError {
  return createViolation("RegistryMutationViolation", "RegistryMutationViolation", message);
}

export function TreatmentResolverBypassViolation(message: string): HCViolationError {
  return createViolation(
    "TreatmentResolverBypassViolation",
    "TreatmentResolverBypassViolation",
    message,
  );
}

export function CharityCareSegregationViolation(message: string): HCViolationError {
  return createViolation("CharityCareSegregationViolation", "CharityCareSegregationViolation", message);
}

export function PayerRoutingViolation(message: string): HCViolationError {
  return createViolation("PayerRoutingViolation", "PayerRoutingViolation", message);
}

export function DiscountStackingViolation(message: string): HCViolationError {
  return createViolation("DiscountStackingViolation", "DiscountStackingViolation", message);
}

export function PlaceOfServiceViolation(message: string): HCViolationError {
  return createViolation("PlaceOfServiceViolation", "PlaceOfServiceViolation", message);
}

export function CmsCostReportViolation(message: string): HCViolationError {
  return createViolation("CmsCostReportViolation", "CmsCostReportViolation", message);
}

export function HipaaAuditSuppressionViolation(message: string): HCViolationError {
  return createViolation("HipaaAuditSuppressionViolation", "HipaaAuditSuppressionViolation", message);
}
