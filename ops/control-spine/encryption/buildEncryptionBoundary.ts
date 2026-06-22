import type {
  ControlSpineEncryptionBoundaryKind,
  ControlSpineEncryptionBoundaryMarker,
  ControlSpineIsolationDimension,
  EncryptionKeyCustodyContract,
} from "../contracts";

/** H-5 deferral — FIPS-validated module selection is required and NOT satisfied in 42.5E. */
export const FIPS_VALIDATED_MODULE_SELECTION_PENDING = "PENDING_H5_SECURITY_ARCHITECT" as const;

export type FipsValidatedModuleSelectionStatus = typeof FIPS_VALIDATED_MODULE_SELECTION_PENDING;

export interface ControlSpineFipsModuleSelectionPlaceholder {
  fipsModuleSelectionPlaceholderId: string;
  fipsModuleSelectionPlaceholderKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  fipsValidatedModuleSelection: FipsValidatedModuleSelectionStatus;
  selectionDeferredToModuleReferenceId: "42.6_security_architect";
  assertsFipsValidated: false;
}

export type ControlSpineKeyScopeValidationOutcome = "valid" | "violation" | "not_shareable_restricted";

export type ControlSpineKeyScopeViolationReason =
  | "cross_tenant_key_scope"
  | "cross_customer_key_scope"
  | "cross_firm_key_scope"
  | "cross_client_key_scope"
  | "missing_key_scope"
  | "ambiguous_key_scope"
  | "isolation_dimension_mismatch";

export interface ControlSpineKeyIsolationScopeBinding {
  keyScopeReferenceId: string;
  customerTenantScopeKey: string;
  firmTenantScopeKey: string;
  clientTenantScopeKey: string | null;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
}

export interface BuildEncryptionBoundaryInput {
  dataDomainReferenceId: string;
  keyClassReferenceId: string;
  keyScopeReferenceId: string;
  encryptionKeyReferenceId: string;
  custodyAuthorityReferenceId: string;
  rotationScheduleReferenceId: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  separationRuleReferenceIds?: string[];
}

export interface ControlSpineEncryptionBoundaryBuildResult {
  encryptionBoundaryBuildResultId: string;
  encryptionBoundaryBuildResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  dataDomainReferenceId: string;
  keyClassReferenceId: string;
  fipsModuleSelectionPlaceholder: ControlSpineFipsModuleSelectionPlaceholder;
  buildTrace: string[];
  keyCustodyContract: EncryptionKeyCustodyContract;
}

export interface BuildKeyCustodyRecordInput {
  encryptionKeyReferenceId: string;
  custodyAuthorityReferenceId: string;
  rotationScheduleReferenceId: string;
  boundKeyScope: ControlSpineKeyIsolationScopeBinding | null | undefined;
  /** Scopes where key usage is attempted — used to detect PC-13 cross-scope sharing. */
  attemptedUsageScopeKeys?: Array<{
    customerTenantScopeKey: string;
    firmTenantScopeKey: string;
    clientTenantScopeKey?: string | null;
  }>;
  separationRuleReferenceIds?: string[];
}

export interface ControlSpineKeyCustodyBuildResult {
  keyCustodyBuildResultId: string;
  keyCustodyBuildResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  scopeValidationOutcome: ControlSpineKeyScopeValidationOutcome;
  scopeViolationReason: ControlSpineKeyScopeViolationReason | null;
  fipsModuleSelectionPlaceholder: ControlSpineFipsModuleSelectionPlaceholder;
  buildTrace: string[];
  keyCustodyContract: EncryptionKeyCustodyContract;
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicId(prefix: string, parts: string[]): string {
  return `${prefix}:${parts.filter(Boolean).join(":")}`;
}

function createFipsModuleSelectionPlaceholder(): ControlSpineFipsModuleSelectionPlaceholder {
  return {
    fipsModuleSelectionPlaceholderId: "fips-module-selection:pending-h5",
    fipsModuleSelectionPlaceholderKey: "fips-module-selection:pending-h5",
    containsVerticalComplianceLogic: false,
    executable: false,
    fipsValidatedModuleSelection: FIPS_VALIDATED_MODULE_SELECTION_PENDING,
    selectionDeferredToModuleReferenceId: "42.6_security_architect",
    assertsFipsValidated: false,
  };
}

function validateIsolationDimension(
  dimension: ControlSpineIsolationDimension | null | undefined,
): dimension is ControlSpineIsolationDimension {
  if (!dimension) {
    return false;
  }

  return (
    hasValue(dimension.isolationDimensionReferenceId) &&
    hasValue(dimension.tenantScopeKey) &&
    Array.isArray(dimension.boundaryReferenceIds)
  );
}

function validateKeyScopeBinding(
  binding: ControlSpineKeyIsolationScopeBinding | null | undefined,
  buildTrace: string[],
): { valid: true; binding: ControlSpineKeyIsolationScopeBinding } | {
  valid: false;
  reason: ControlSpineKeyScopeViolationReason;
} {
  if (!binding || !hasValue(binding.keyScopeReferenceId)) {
    buildTrace.push("scope:missing_key_scope");
    return { valid: false, reason: "missing_key_scope" };
  }

  if (
    !hasValue(binding.customerTenantScopeKey) ||
    !hasValue(binding.firmTenantScopeKey) ||
    !validateIsolationDimension(binding.customerIsolation) ||
    !validateIsolationDimension(binding.firmIsolation) ||
    !validateIsolationDimension(binding.clientIsolation)
  ) {
    buildTrace.push("scope:ambiguous_key_scope");
    return { valid: false, reason: "ambiguous_key_scope" };
  }

  if (binding.customerIsolation.tenantScopeKey !== binding.customerTenantScopeKey) {
    buildTrace.push("scope:isolation_dimension_mismatch:customer");
    return { valid: false, reason: "isolation_dimension_mismatch" };
  }

  if (binding.firmIsolation.tenantScopeKey !== binding.firmTenantScopeKey) {
    buildTrace.push("scope:isolation_dimension_mismatch:firm");
    return { valid: false, reason: "isolation_dimension_mismatch" };
  }

  if (
    hasValue(binding.clientTenantScopeKey) &&
    binding.clientIsolation.tenantScopeKey !== binding.clientTenantScopeKey
  ) {
    buildTrace.push("scope:isolation_dimension_mismatch:client");
    return { valid: false, reason: "isolation_dimension_mismatch" };
  }

  buildTrace.push(`scope:bound:${binding.keyScopeReferenceId}`);
  return { valid: true, binding };
}

function buildBoundaryMarkers(
  keyScopeReferenceId: string,
  dataDomainReferenceId: string,
): ControlSpineEncryptionBoundaryMarker[] {
  const kinds: ControlSpineEncryptionBoundaryKind[] = ["at_rest", "in_transit"];

  return kinds.map((boundaryKind) => ({
    boundaryMarkerReferenceId: buildDeterministicId("boundary-marker", [
      dataDomainReferenceId,
      boundaryKind,
      keyScopeReferenceId,
    ]),
    boundaryKind,
    keyScopeReferenceId,
  }));
}

function buildKeyCustodyContract(input: {
  encryptionKeyReferenceId: string;
  custodyAuthorityReferenceId: string;
  rotationScheduleReferenceId: string;
  keyScopeReferenceId: string;
  dataDomainReferenceId: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  separationRuleReferenceIds: string[];
}): EncryptionKeyCustodyContract {
  const keyCustodyContractId = buildDeterministicId("key-custody", [
    input.encryptionKeyReferenceId,
    input.keyScopeReferenceId,
  ]);

  return {
    keyCustodyContractId,
    keyCustodyContractKey: `key-custody:${input.dataDomainReferenceId}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    encryptionKeyReferenceId: input.encryptionKeyReferenceId,
    custodyAuthorityReferenceId: input.custodyAuthorityReferenceId,
    rotationScheduleReferenceId: input.rotationScheduleReferenceId,
    separationRuleReferenceIds: input.separationRuleReferenceIds,
    boundaryMarkers: buildBoundaryMarkers(input.keyScopeReferenceId, input.dataDomainReferenceId),
    keysDoNotCrossIsolationBoundaries: true,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
  };
}

/**
 * Documents at-rest and in-transit encryption boundaries for a data domain.
 * Builder/docs only — no live crypto or key material.
 */
export function buildEncryptionBoundary(
  input: BuildEncryptionBoundaryInput,
): ControlSpineEncryptionBoundaryBuildResult {
  const buildTrace: string[] = [
    "buildEncryptionBoundary:start",
    "policy:keys_do_not_cross_isolation_boundaries",
  ];

  const fipsModuleSelectionPlaceholder = createFipsModuleSelectionPlaceholder();
  buildTrace.push(`fips:${fipsModuleSelectionPlaceholder.fipsValidatedModuleSelection}`);

  const separationRuleReferenceIds = input.separationRuleReferenceIds ?? [
    "separation-rule:key-scope-per-isolation-boundary",
    "separation-rule:no-cross-tenant-key-reuse",
  ];

  const keyCustodyContract = buildKeyCustodyContract({
    encryptionKeyReferenceId: input.encryptionKeyReferenceId,
    custodyAuthorityReferenceId: input.custodyAuthorityReferenceId,
    rotationScheduleReferenceId: input.rotationScheduleReferenceId,
    keyScopeReferenceId: input.keyScopeReferenceId,
    dataDomainReferenceId: input.dataDomainReferenceId,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    separationRuleReferenceIds,
  });

  buildTrace.push(
    `domain:${input.dataDomainReferenceId}`,
    `key-class:${input.keyClassReferenceId}`,
    "boundary:at_rest_documented",
    "boundary:in_transit_documented",
    "build:complete",
  );

  return {
    encryptionBoundaryBuildResultId: buildDeterministicId("encryption-boundary-build", [
      input.dataDomainReferenceId,
      input.keyScopeReferenceId,
    ]),
    encryptionBoundaryBuildResultKey: "encryption-boundary:documented",
    containsVerticalComplianceLogic: false,
    executable: false,
    dataDomainReferenceId: input.dataDomainReferenceId,
    keyClassReferenceId: input.keyClassReferenceId,
    fipsModuleSelectionPlaceholder,
    buildTrace,
    keyCustodyContract,
  };
}

export function classifyKeyScopeSeparation(input: {
  boundKeyScope: ControlSpineKeyIsolationScopeBinding | null | undefined;
  attemptedUsageScopeKeys?: Array<{
    customerTenantScopeKey: string;
    firmTenantScopeKey: string;
    clientTenantScopeKey?: string | null;
  }>;
}): {
  scopeValidationOutcome: ControlSpineKeyScopeValidationOutcome;
  scopeViolationReason: ControlSpineKeyScopeViolationReason | null;
  evaluationTrace: string[];
} {
  const evaluationTrace: string[] = ["classifyKeyScopeSeparation:start", "policy:fail_closed_key_scope"];

  const scopeValidation = validateKeyScopeBinding(input.boundKeyScope, evaluationTrace);
  if (!scopeValidation.valid) {
    return {
      scopeValidationOutcome: "not_shareable_restricted",
      scopeViolationReason: scopeValidation.reason,
      evaluationTrace: [...evaluationTrace, "outcome:not_shareable_restricted"],
    };
  }

  const bound = scopeValidation.binding;
  const attemptedScopes = input.attemptedUsageScopeKeys ?? [];

  for (const attempted of attemptedScopes) {
    evaluationTrace.push(
      `attempt:customer:${attempted.customerTenantScopeKey}`,
      `attempt:firm:${attempted.firmTenantScopeKey}`,
    );

    if (attempted.customerTenantScopeKey !== bound.customerTenantScopeKey) {
      return {
        scopeValidationOutcome: "violation",
        scopeViolationReason: "cross_tenant_key_scope",
        evaluationTrace: [...evaluationTrace, "deny:cross_tenant_key_scope"],
      };
    }

    if (attempted.firmTenantScopeKey !== bound.firmTenantScopeKey) {
      return {
        scopeValidationOutcome: "violation",
        scopeViolationReason: "cross_firm_key_scope",
        evaluationTrace: [...evaluationTrace, "deny:cross_firm_key_scope"],
      };
    }

    const attemptedClient = attempted.clientTenantScopeKey ?? null;
    const boundClient = bound.clientTenantScopeKey ?? null;

    if (attemptedClient !== boundClient) {
      return {
        scopeValidationOutcome: "violation",
        scopeViolationReason: "cross_client_key_scope",
        evaluationTrace: [...evaluationTrace, "deny:cross_client_key_scope"],
      };
    }
  }

  evaluationTrace.push("scope:valid_single_isolation_binding");

  return {
    scopeValidationOutcome: "valid",
    scopeViolationReason: null,
    evaluationTrace,
  };
}

/**
 * Documents key custody, rotation policy, and key scope separation (PC-13).
 * Cross-scope key usage is marked violation — never valid.
 */
export function buildKeyCustodyRecord(input: BuildKeyCustodyRecordInput): ControlSpineKeyCustodyBuildResult {
  const buildTrace: string[] = ["buildKeyCustodyRecord:start", "policy:keys_do_not_cross_isolation_boundaries"];
  const fipsModuleSelectionPlaceholder = createFipsModuleSelectionPlaceholder();
  buildTrace.push(`fips:${fipsModuleSelectionPlaceholder.fipsValidatedModuleSelection}`);

  const classification = classifyKeyScopeSeparation({
    boundKeyScope: input.boundKeyScope,
    attemptedUsageScopeKeys: input.attemptedUsageScopeKeys,
  });

  buildTrace.push(...classification.evaluationTrace);

  const scopeValidation = validateKeyScopeBinding(input.boundKeyScope, buildTrace);
  const fallbackIsolation = (suffix: string): ControlSpineIsolationDimension => ({
    isolationDimensionReferenceId: buildDeterministicId("dim-ref", [`key-fallback:${suffix}`]),
    tenantScopeKey: buildDeterministicId("restricted", [suffix]),
    boundaryReferenceIds: [buildDeterministicId("boundary", [`key-fallback:${suffix}`])],
  });

  const boundScope = scopeValidation.valid
    ? scopeValidation.binding
    : {
        keyScopeReferenceId: "key-scope:restricted-not-shareable",
        customerTenantScopeKey: "restricted:unknown",
        firmTenantScopeKey: "restricted:unknown",
        clientTenantScopeKey: null,
        customerIsolation: fallbackIsolation("customer"),
        firmIsolation: fallbackIsolation("firm"),
        clientIsolation: fallbackIsolation("client"),
      };

  if (!scopeValidation.valid) {
    buildTrace.push("scope:fail_closed_most_restrictive");
  }

  const separationRuleReferenceIds = input.separationRuleReferenceIds ?? [
    "separation-rule:key-bound-to-single-isolation-scope",
    "separation-rule:rotation-schedule-documented",
    ...(classification.scopeValidationOutcome === "violation"
      ? [`separation-rule:violation:${classification.scopeViolationReason}`]
      : []),
  ];

  const keyCustodyContract = buildKeyCustodyContract({
    encryptionKeyReferenceId: input.encryptionKeyReferenceId,
    custodyAuthorityReferenceId: input.custodyAuthorityReferenceId,
    rotationScheduleReferenceId: input.rotationScheduleReferenceId,
    keyScopeReferenceId: boundScope.keyScopeReferenceId,
    dataDomainReferenceId: "data-domain:key-custody-record",
    customerIsolation: boundScope.customerIsolation,
    firmIsolation: boundScope.firmIsolation,
    clientIsolation: boundScope.clientIsolation,
    separationRuleReferenceIds,
  });

  buildTrace.push(`outcome:${classification.scopeValidationOutcome}`);

  return {
    keyCustodyBuildResultId: buildDeterministicId("key-custody-build", [
      input.encryptionKeyReferenceId,
      boundScope.keyScopeReferenceId,
      classification.scopeValidationOutcome,
    ]),
    keyCustodyBuildResultKey: `key-custody:${classification.scopeValidationOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    scopeValidationOutcome: classification.scopeValidationOutcome,
    scopeViolationReason: classification.scopeViolationReason,
    fipsModuleSelectionPlaceholder,
    buildTrace,
    keyCustodyContract,
  };
}
