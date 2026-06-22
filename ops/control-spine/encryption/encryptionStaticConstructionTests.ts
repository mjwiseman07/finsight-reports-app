import type { ControlSpineIsolationDimension } from "../contracts";
import {
  buildEncryptionBoundary,
  buildKeyCustodyRecord,
  FIPS_VALIDATED_MODULE_SELECTION_PENDING,
  type ControlSpineKeyIsolationScopeBinding,
} from "./buildEncryptionBoundary";

export interface EncryptionStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
}

export interface EncryptionStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  buildTrace: string[];
  details: Record<string, unknown>;
}

function dimension(
  tenantScopeKey: string,
  referenceSuffix: string,
): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: `dim-ref:${referenceSuffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${referenceSuffix}`],
  };
}

function buildKeyScopeBinding(input: {
  keyScopeReferenceId: string;
  customerTenantScopeKey: string;
  firmTenantScopeKey: string;
  clientTenantScopeKey?: string | null;
}): ControlSpineKeyIsolationScopeBinding {
  const clientTenantScopeKey = input.clientTenantScopeKey ?? null;

  return {
    keyScopeReferenceId: input.keyScopeReferenceId,
    customerTenantScopeKey: input.customerTenantScopeKey,
    firmTenantScopeKey: input.firmTenantScopeKey,
    clientTenantScopeKey,
    customerIsolation: dimension(input.customerTenantScopeKey, `customer:${input.keyScopeReferenceId}`),
    firmIsolation: dimension(input.firmTenantScopeKey, `firm:${input.keyScopeReferenceId}`),
    clientIsolation: dimension(
      clientTenantScopeKey ?? "client-unscoped",
      `client:${input.keyScopeReferenceId}`,
    ),
  };
}

export const ENCRYPTION_STATIC_CONSTRUCTION_CASES: EncryptionStaticConstructionCase[] = [
  {
    caseId: "SC-BOUNDARY-DOCUMENTED",
    poisonCaseIds: [],
    description: "Encryption boundary record documents at-rest and in-transit for a data domain",
  },
  {
    caseId: "SC-KEY-CUSTODY-VALID",
    poisonCaseIds: [],
    description: "Key custody record bound to a single isolation scope (valid)",
  },
  {
    caseId: "SC-PC-13",
    poisonCaseIds: ["PC-13"],
    description: "Key referenced across two tenant scopes => cross_tenant_key_scope violation",
  },
  {
    caseId: "SC-FAIL-CLOSED-SCOPE",
    poisonCaseIds: [],
    description: "Key with missing/ambiguous scope => not_shareable_restricted",
  },
  {
    caseId: "SC-FIPS-PENDING",
    poisonCaseIds: [],
    description: "FIPS placeholder present and honestly marked PENDING — no fake validation",
  },
];

function runCase(caseDefinition: EncryptionStaticConstructionCase): EncryptionStaticConstructionCaseResult {
  const tenantAScope = buildKeyScopeBinding({
    keyScopeReferenceId: "key-scope:tenant-a",
    customerTenantScopeKey: "tenant-a",
    firmTenantScopeKey: "firm-a",
    clientTenantScopeKey: "client-a1",
  });

  const tenantBScope = {
    customerTenantScopeKey: "tenant-b",
    firmTenantScopeKey: "firm-b",
    clientTenantScopeKey: "client-b1",
  };

  switch (caseDefinition.caseId) {
    case "SC-BOUNDARY-DOCUMENTED": {
      const result = buildEncryptionBoundary({
        dataDomainReferenceId: "data-domain:platform-storage",
        keyClassReferenceId: "key-class:data-encryption-key",
        keyScopeReferenceId: tenantAScope.keyScopeReferenceId,
        encryptionKeyReferenceId: "encryption-key:dek-tenant-a-001",
        custodyAuthorityReferenceId: "custody-authority:founder-kms-policy",
        rotationScheduleReferenceId: "rotation-schedule:annual",
        customerIsolation: tenantAScope.customerIsolation,
        firmIsolation: tenantAScope.firmIsolation,
        clientIsolation: tenantAScope.clientIsolation,
      });

      const boundaryKinds = result.keyCustodyContract.boundaryMarkers.map((marker) => marker.boundaryKind);
      const passed =
        boundaryKinds.includes("at_rest") &&
        boundaryKinds.includes("in_transit") &&
        result.keyCustodyContract.keysDoNotCrossIsolationBoundaries === true &&
        result.containsVerticalComplianceLogic === false &&
        result.executable === false;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          boundaryKinds,
          dataDomainReferenceId: result.dataDomainReferenceId,
          keyClassReferenceId: result.keyClassReferenceId,
        },
      };
    }

    case "SC-KEY-CUSTODY-VALID": {
      const result = buildKeyCustodyRecord({
        encryptionKeyReferenceId: "encryption-key:dek-tenant-a-valid",
        custodyAuthorityReferenceId: "custody-authority:founder-kms-policy",
        rotationScheduleReferenceId: "rotation-schedule:annual",
        boundKeyScope: tenantAScope,
        attemptedUsageScopeKeys: [
          {
            customerTenantScopeKey: "tenant-a",
            firmTenantScopeKey: "firm-a",
            clientTenantScopeKey: "client-a1",
          },
        ],
      });

      const passed =
        result.scopeValidationOutcome === "valid" &&
        result.scopeViolationReason === null &&
        result.keyCustodyContract.keysDoNotCrossIsolationBoundaries === true;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          scopeValidationOutcome: result.scopeValidationOutcome,
          keyScopeReferenceId: result.keyCustodyContract.boundaryMarkers[0]?.keyScopeReferenceId,
        },
      };
    }

    case "SC-PC-13": {
      const result = buildKeyCustodyRecord({
        encryptionKeyReferenceId: "encryption-key:dek-shared-violation",
        custodyAuthorityReferenceId: "custody-authority:founder-kms-policy",
        rotationScheduleReferenceId: "rotation-schedule:annual",
        boundKeyScope: tenantAScope,
        attemptedUsageScopeKeys: [tenantBScope],
      });

      const passed =
        result.scopeValidationOutcome === "violation" &&
        result.scopeViolationReason === "cross_tenant_key_scope" &&
        result.keyCustodyContract.separationRuleReferenceIds.some((rule) =>
          rule.includes("cross_tenant_key_scope"),
        );

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          scopeValidationOutcome: result.scopeValidationOutcome,
          scopeViolationReason: result.scopeViolationReason,
        },
      };
    }

    case "SC-FAIL-CLOSED-SCOPE": {
      const result = buildKeyCustodyRecord({
        encryptionKeyReferenceId: "encryption-key:dek-ambiguous-scope",
        custodyAuthorityReferenceId: "custody-authority:founder-kms-policy",
        rotationScheduleReferenceId: "rotation-schedule:annual",
        boundKeyScope: {
          keyScopeReferenceId: "",
          customerTenantScopeKey: "tenant-a",
          firmTenantScopeKey: "firm-a",
          clientTenantScopeKey: "client-a1",
          customerIsolation: tenantAScope.customerIsolation,
          firmIsolation: tenantAScope.firmIsolation,
          clientIsolation: tenantAScope.clientIsolation,
        },
      });

      const passed =
        result.scopeValidationOutcome === "not_shareable_restricted" &&
        (result.scopeViolationReason === "missing_key_scope" ||
          result.scopeViolationReason === "ambiguous_key_scope") &&
        result.keyCustodyContract.boundaryMarkers[0]?.keyScopeReferenceId ===
          "key-scope:restricted-not-shareable";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          scopeValidationOutcome: result.scopeValidationOutcome,
          scopeViolationReason: result.scopeViolationReason,
          keyScopeReferenceId: result.keyCustodyContract.boundaryMarkers[0]?.keyScopeReferenceId,
        },
      };
    }

    case "SC-FIPS-PENDING": {
      const boundary = buildEncryptionBoundary({
        dataDomainReferenceId: "data-domain:fips-check",
        keyClassReferenceId: "key-class:data-encryption-key",
        keyScopeReferenceId: tenantAScope.keyScopeReferenceId,
        encryptionKeyReferenceId: "encryption-key:dek-fips-check",
        custodyAuthorityReferenceId: "custody-authority:founder-kms-policy",
        rotationScheduleReferenceId: "rotation-schedule:annual",
        customerIsolation: tenantAScope.customerIsolation,
        firmIsolation: tenantAScope.firmIsolation,
        clientIsolation: tenantAScope.clientIsolation,
      });

      const custody = buildKeyCustodyRecord({
        encryptionKeyReferenceId: "encryption-key:dek-fips-check",
        custodyAuthorityReferenceId: "custody-authority:founder-kms-policy",
        rotationScheduleReferenceId: "rotation-schedule:annual",
        boundKeyScope: tenantAScope,
      });

      const placeholder = boundary.fipsModuleSelectionPlaceholder;
      const passed =
        placeholder.fipsValidatedModuleSelection === FIPS_VALIDATED_MODULE_SELECTION_PENDING &&
        placeholder.assertsFipsValidated === false &&
        custody.fipsModuleSelectionPlaceholder.fipsValidatedModuleSelection ===
          FIPS_VALIDATED_MODULE_SELECTION_PENDING &&
        custody.fipsModuleSelectionPlaceholder.selectionDeferredToModuleReferenceId ===
          "42.6_security_architect";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: [...boundary.buildTrace, ...custody.buildTrace],
        details: {
          fipsValidatedModuleSelection: placeholder.fipsValidatedModuleSelection,
          assertsFipsValidated: placeholder.assertsFipsValidated,
          selectionDeferredToModuleReferenceId: placeholder.selectionDeferredToModuleReferenceId,
        },
      };
    }

    default:
      throw new Error(`Unknown encryption static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeEncryptionStaticConstructionTests(): {
  pass: boolean;
  results: EncryptionStaticConstructionCaseResult[];
} {
  const results = ENCRYPTION_STATIC_CONSTRUCTION_CASES.map(runCase);

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Confirms builders never emit live key material — reference IDs only. */
export function executeEncryptionNoKeyMaterialSmokeTest(): boolean {
  const scope = buildKeyScopeBinding({
    keyScopeReferenceId: "key-scope:smoke",
    customerTenantScopeKey: "tenant-smoke",
    firmTenantScopeKey: "firm-smoke",
  });

  const result = buildKeyCustodyRecord({
    encryptionKeyReferenceId: "encryption-key:ref-only-smoke",
    custodyAuthorityReferenceId: "custody-authority:policy-ref",
    rotationScheduleReferenceId: "rotation-schedule:ref",
    boundKeyScope: scope,
  });

  const serialized = JSON.stringify(result);

  return (
    !serialized.includes("BEGIN PRIVATE KEY") &&
    !serialized.includes("AES") &&
    !serialized.match(/[0-9a-f]{32,}/i) &&
    result.keyCustodyContract.encryptionKeyReferenceId.startsWith("encryption-key:")
  );
}
