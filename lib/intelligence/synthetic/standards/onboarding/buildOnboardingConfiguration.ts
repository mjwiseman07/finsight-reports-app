import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

type OnboardingConfigurationBase = Omit<StandardsBaseContract, "reportingFramework">;

export type CustomerAccountType = "single_entity" | "multi_entity" | "firm_with_clients";
export type OnboardingLockStatus = "pending" | "locked";

export interface BuildOnboardingConfigurationInput extends Partial<OnboardingConfigurationBase> {
  customerId?: string;
  customerAccountType?: CustomerAccountType;
  entityInventoryReferenceIds?: string[];
  perEntityFrameworkConfigurationReferenceIds?: string[];
  frameworkRegistryReferenceId?: string;
  selectedFrameworkIdentifiers?: StandardsReportingFramework[];
  activeFrameworkIdentifiers?: StandardsReportingFramework[];
  consolidationHierarchyReferenceId?: string;
  dualBookSetupReferenceIds?: string[];
  phase40GovernanceAuditReferenceId?: string;
  jurisdictionAdvisoryFlags?: string[];
  onboardingLockStatus?: OnboardingLockStatus;
  onboardingConfigurationComplete?: boolean;
}

export interface SyntheticOnboardingConfiguration extends OnboardingConfigurationBase {
  onboardingConfigurationId: string;
  onboardingConfigurationKey: string;
  customerId: string;
  customerAccountType: CustomerAccountType;
  entityInventoryReferenceIds: string[];
  perEntityFrameworkConfigurationReferenceIds: string[];
  frameworkSelectionPerEntity: true;
  onlyActiveFrameworksSelectableAtOnboarding: true;
  selectionFailsClosedIfNotActive: true;
  frameworkRegistryReferenceId: string;
  capturesFunctionalAndPresentationCurrency: true;
  consolidationHierarchyReferenceId: string;
  capturesParentChildOwnershipAndMethod: true;
  dualBookSetupReferenceIds: string[];
  dualBookSetupWhereApplicable: true;
  frameworkValidationAgainstJurisdiction: true;
  jurisdictionValidationIsAdvisoryNotAutoChange: true;
  producesEntityFrameworkConfigurationPerEntity: true;
  producesImmutableOnboardingAuditEntry: true;
  phase40GovernanceAuditReferenceId: string;
  onboardingLockGatesRoleActivation: true;
  onboardingLockStatus: OnboardingLockStatus;
  onboardingConfigurationComplete: boolean;
}

export interface BuildOnboardingConfigurationResult {
  onboardingConfiguration: SyntheticOnboardingConfiguration | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getSelectedFrameworkIdentifiers(
  input: BuildOnboardingConfigurationInput,
): StandardsReportingFramework[] {
  return getInputArray(input.selectedFrameworkIdentifiers);
}

function getInactiveSelectedFrameworks(
  input: BuildOnboardingConfigurationInput,
): StandardsReportingFramework[] {
  const activeFrameworkIdentifiers = getInputArray(input.activeFrameworkIdentifiers);
  if (activeFrameworkIdentifiers.length === 0) {
    return [];
  }

  return getSelectedFrameworkIdentifiers(input).filter(
    (frameworkIdentifier) => !activeFrameworkIdentifiers.includes(frameworkIdentifier),
  );
}

function hasNonActiveFrameworkSelection(input: BuildOnboardingConfigurationInput): boolean {
  return getInactiveSelectedFrameworks(input).length > 0;
}

function getOnboardingLockStatus(input: BuildOnboardingConfigurationInput): OnboardingLockStatus {
  if (hasNonActiveFrameworkSelection(input)) {
    return "pending";
  }

  return input.onboardingLockStatus === "locked" ? "locked" : "pending";
}

function getSharedBase(input: Partial<OnboardingConfigurationBase>): OnboardingConfigurationBase {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase41_5StaleMarker: input.phase41_5StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as OnboardingConfigurationBase;
}

function collectMissingRequiredIdentifiers(input: BuildOnboardingConfigurationInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.customerId)) {
    missing.push("customerId");
  }

  if (!input.customerAccountType) {
    missing.push("customerAccountType");
  }

  if (!hasValue(input.frameworkRegistryReferenceId)) {
    missing.push("frameworkRegistryReferenceId");
  }

  if (getInputArray(input.entityInventoryReferenceIds).length === 0) {
    missing.push("entityInventoryReferenceIds");
  }

  if (getInputArray(input.perEntityFrameworkConfigurationReferenceIds).length === 0) {
    missing.push("perEntityFrameworkConfigurationReferenceIds");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildOnboardingConfigurationKey(input: BuildOnboardingConfigurationInput): string {
  return stableSnapshotHash({
    customerId: input.customerId ?? "",
    customerAccountType: input.customerAccountType ?? "",
    entityInventoryReferenceIds: getInputArray(input.entityInventoryReferenceIds),
    perEntityFrameworkConfigurationReferenceIds: getInputArray(
      input.perEntityFrameworkConfigurationReferenceIds,
    ),
    frameworkRegistryReferenceId: input.frameworkRegistryReferenceId ?? "",
    selectedFrameworkIdentifiers: getSelectedFrameworkIdentifiers(input),
    consolidationHierarchyReferenceId: input.consolidationHierarchyReferenceId ?? "",
    dualBookSetupReferenceIds: getInputArray(input.dualBookSetupReferenceIds),
    phase40GovernanceAuditReferenceId: input.phase40GovernanceAuditReferenceId ?? "",
    onboardingLockStatus: getOnboardingLockStatus(input),
  });
}

function buildOnboardingConfigurationId(input: BuildOnboardingConfigurationInput): string {
  return `synthetic-onboarding-configuration:${stableSnapshotHash({
    onboardingConfigurationKey: buildOnboardingConfigurationKey(input),
    artifactType: "SyntheticOnboardingConfiguration",
  })}`;
}

function buildDerivationHash(input: BuildOnboardingConfigurationInput): string {
  return stableSnapshotHash({
    onboardingConfigurationKey: buildOnboardingConfigurationKey(input),
    frameworkSelectionPerEntity: true,
    onlyActiveFrameworksSelectableAtOnboarding: true,
    selectionFailsClosedIfNotActive: true,
    capturesFunctionalAndPresentationCurrency: true,
    capturesParentChildOwnershipAndMethod: true,
    dualBookSetupWhereApplicable: true,
    frameworkValidationAgainstJurisdiction: true,
    jurisdictionValidationIsAdvisoryNotAutoChange: true,
    producesEntityFrameworkConfigurationPerEntity: true,
    producesImmutableOnboardingAuditEntry: true,
    onboardingLockGatesRoleActivation: true,
    onboardingLockStatus: getOnboardingLockStatus(input),
  });
}

function getWarnings(
  input: BuildOnboardingConfigurationInput,
  onboardingLockStatus: OnboardingLockStatus,
): string[] {
  const inactiveSelectedFrameworks = getInactiveSelectedFrameworks(input);
  const jurisdictionAdvisoryFlags = getInputArray(input.jurisdictionAdvisoryFlags);

  return [
    ...getInputArray(input.warnings),
    ...(inactiveSelectedFrameworks.length > 0
      ? [
          `onboarding selection fails closed for non-active frameworks: ${inactiveSelectedFrameworks.join(", ")}`,
        ]
      : []),
    ...(onboardingLockStatus === "pending" && input.onboardingLockStatus === "locked"
      ? ["onboarding lock rejected because one or more selected frameworks are not active"]
      : []),
    ...(onboardingLockStatus === "pending"
      ? ["Phase 39 role activation is gated on onboardingLockStatus locked; roles do not activate against pending onboarding"]
      : []),
    ...(onboardingLockStatus === "locked" && !hasValue(input.phase40GovernanceAuditReferenceId)
      ? ["locked onboarding should reference Phase 40P governance via phase40GovernanceAuditReferenceId for immutable audit entry"]
      : []),
    ...jurisdictionAdvisoryFlags.map((flag) => `jurisdiction advisory (no auto-change): ${flag}`),
    ...(getInputArray(input.dualBookSetupReferenceIds).length === 0 &&
    getSelectedFrameworkIdentifiers(input).length > 1
      ? ["entities with secondary frameworks should preserve dual-book setup references where applicable"]
      : []),
    "metadata-only onboarding configuration contract; live onboarding flow and UI are go-live concerns deferred to real-data validation",
  ];
}

export function buildOnboardingConfiguration(
  input: BuildOnboardingConfigurationInput,
): BuildOnboardingConfigurationResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      onboardingConfiguration: null,
      skipped: true,
      warnings: [
        `missing required onboarding configuration identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredCustomerId = input.customerId as string;
  const requiredCustomerAccountType = input.customerAccountType as CustomerAccountType;
  const requiredFrameworkRegistryReferenceId = input.frameworkRegistryReferenceId as string;
  const onboardingLockStatus = getOnboardingLockStatus(input);
  const base = getSharedBase(input);
  const onboardingConfiguration: SyntheticOnboardingConfiguration = {
    ...base,
    onboardingConfigurationId: buildOnboardingConfigurationId(input),
    onboardingConfigurationKey: buildOnboardingConfigurationKey(input),
    customerId: requiredCustomerId,
    customerAccountType: requiredCustomerAccountType,
    entityInventoryReferenceIds: getInputArray(input.entityInventoryReferenceIds),
    perEntityFrameworkConfigurationReferenceIds: getInputArray(
      input.perEntityFrameworkConfigurationReferenceIds,
    ),
    frameworkSelectionPerEntity: true,
    onlyActiveFrameworksSelectableAtOnboarding: true,
    selectionFailsClosedIfNotActive: true,
    frameworkRegistryReferenceId: requiredFrameworkRegistryReferenceId,
    capturesFunctionalAndPresentationCurrency: true,
    consolidationHierarchyReferenceId: input.consolidationHierarchyReferenceId ?? "",
    capturesParentChildOwnershipAndMethod: true,
    dualBookSetupReferenceIds: getInputArray(input.dualBookSetupReferenceIds),
    dualBookSetupWhereApplicable: true,
    frameworkValidationAgainstJurisdiction: true,
    jurisdictionValidationIsAdvisoryNotAutoChange: true,
    producesEntityFrameworkConfigurationPerEntity: true,
    producesImmutableOnboardingAuditEntry: true,
    phase40GovernanceAuditReferenceId: input.phase40GovernanceAuditReferenceId ?? "",
    onboardingLockGatesRoleActivation: true,
    onboardingLockStatus,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, onboardingLockStatus),
    onboardingConfigurationComplete:
      input.onboardingConfigurationComplete === true &&
      onboardingLockStatus === "locked" &&
      !hasNonActiveFrameworkSelection(input),
  };

  return {
    onboardingConfiguration,
    skipped: false,
    warnings: onboardingConfiguration.warnings,
  };
}
