import { stableSnapshotHash } from "../../../core/hash";
import type {
  ConsolidationMethod,
  StandardsBaseContract,
  StandardsReportingFramework,
} from "../contracts";

export type ConsolidationHierarchyMethod = Extract<ConsolidationMethod, "full" | "equity" | "proportionate">;

export interface BuildConsolidationHierarchyInput extends Partial<StandardsBaseContract> {
  parentEntityId?: string;
  parentReportingFramework?: StandardsReportingFramework;
  subsidiaryEntityReferenceIds?: string[];
  subsidiaryFrameworkMap?: Record<string, StandardsReportingFramework>;
  consolidationMethod?: ConsolidationHierarchyMethod;
  ownershipPercentage?: number;
  onboardingConfigurationReferenceId?: string;
  conversionEngineReferenceIds?: string[];
  consolidationHierarchyComplete?: boolean;
}

export interface SyntheticConsolidationHierarchy extends StandardsBaseContract {
  consolidationHierarchyId: string;
  consolidationHierarchyKey: string;
  parentEntityId: string;
  parentReportingFramework: StandardsReportingFramework;
  subsidiaryEntityReferenceIds: string[];
  subsidiaryFrameworkMap: Record<string, StandardsReportingFramework>;
  consolidationMethod: ConsolidationHierarchyMethod;
  ownershipPercentage: number;
  maintainsHierarchyFromOnboarding: true;
  onboardingConfigurationReferenceId: string;
  parentSubsidiaryFrameworkDiffersFlag: boolean;
  invokesConversionEngineWhenFrameworksDiffer: true;
  conversionEngineReferenceIds: string[];
  intercompanyTransactionsFrameworkTagged: true;
  identifiesEliminationsAcrossFrameworkBoundaries: true;
  consolidatedStatementsInParentFramework: true;
  respectsFrameworkSegregation: true;
  subsidiaryFrameworkKnowledgeNeverContaminatesParent: true;
  conversionEntriesAreFirstClassBridge: true;
  consolidationHierarchyComplete: boolean;
}

export interface BuildConsolidationHierarchyResult {
  consolidationHierarchy: SyntheticConsolidationHierarchy | null;
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

function getSubsidiaryFrameworkMap(
  input: BuildConsolidationHierarchyInput,
): Record<string, StandardsReportingFramework> {
  return input.subsidiaryFrameworkMap ?? {};
}

function getParentSubsidiaryFrameworkDiffersFlag(
  parentReportingFramework: StandardsReportingFramework,
  subsidiaryFrameworkMap: Record<string, StandardsReportingFramework>,
): boolean {
  return Object.values(subsidiaryFrameworkMap).some(
    (subsidiaryFramework) => subsidiaryFramework !== parentReportingFramework,
  );
}

function getSharedBase(input: Partial<StandardsBaseContract>): StandardsBaseContract {
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
    reportingFramework: input.reportingFramework as StandardsReportingFramework,
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
  } as StandardsBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildConsolidationHierarchyInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.parentEntityId)) {
    missing.push("parentEntityId");
  }

  if (!input.parentReportingFramework) {
    missing.push("parentReportingFramework");
  }

  if (!hasValue(input.onboardingConfigurationReferenceId)) {
    missing.push("onboardingConfigurationReferenceId");
  }

  if (!input.consolidationMethod) {
    missing.push("consolidationMethod");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
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

function getUnmappedSubsidiaries(
  subsidiaryEntityReferenceIds: string[],
  subsidiaryFrameworkMap: Record<string, StandardsReportingFramework>,
): string[] {
  return subsidiaryEntityReferenceIds.filter(
    (subsidiaryEntityReferenceId) => !(subsidiaryEntityReferenceId in subsidiaryFrameworkMap),
  );
}

function buildConsolidationHierarchyKey(input: BuildConsolidationHierarchyInput): string {
  const subsidiaryFrameworkMap = getSubsidiaryFrameworkMap(input);
  const parentReportingFramework = input.parentReportingFramework as StandardsReportingFramework;

  return stableSnapshotHash({
    parentEntityId: input.parentEntityId ?? "",
    parentReportingFramework,
    subsidiaryEntityReferenceIds: getInputArray(input.subsidiaryEntityReferenceIds),
    subsidiaryFrameworkMap,
    consolidationMethod: input.consolidationMethod ?? "",
    ownershipPercentage: input.ownershipPercentage ?? 0,
    onboardingConfigurationReferenceId: input.onboardingConfigurationReferenceId ?? "",
    parentSubsidiaryFrameworkDiffersFlag: getParentSubsidiaryFrameworkDiffersFlag(
      parentReportingFramework,
      subsidiaryFrameworkMap,
    ),
    conversionEngineReferenceIds: getInputArray(input.conversionEngineReferenceIds),
  });
}

function buildConsolidationHierarchyId(input: BuildConsolidationHierarchyInput): string {
  return `synthetic-consolidation-hierarchy:${stableSnapshotHash({
    consolidationHierarchyKey: buildConsolidationHierarchyKey(input),
    artifactType: "SyntheticConsolidationHierarchy",
  })}`;
}

function buildDerivationHash(
  input: BuildConsolidationHierarchyInput,
  parentSubsidiaryFrameworkDiffersFlag: boolean,
): string {
  return stableSnapshotHash({
    consolidationHierarchyKey: buildConsolidationHierarchyKey(input),
    maintainsHierarchyFromOnboarding: true,
    invokesConversionEngineWhenFrameworksDiffer: true,
    intercompanyTransactionsFrameworkTagged: true,
    identifiesEliminationsAcrossFrameworkBoundaries: true,
    consolidatedStatementsInParentFramework: true,
    respectsFrameworkSegregation: true,
    subsidiaryFrameworkKnowledgeNeverContaminatesParent: true,
    conversionEntriesAreFirstClassBridge: true,
    parentSubsidiaryFrameworkDiffersFlag,
  });
}

function getWarnings(
  input: BuildConsolidationHierarchyInput,
  parentSubsidiaryFrameworkDiffersFlag: boolean,
): string[] {
  const subsidiaryEntityReferenceIds = getInputArray(input.subsidiaryEntityReferenceIds);
  const subsidiaryFrameworkMap = getSubsidiaryFrameworkMap(input);
  const unmappedSubsidiaries = getUnmappedSubsidiaries(
    subsidiaryEntityReferenceIds,
    subsidiaryFrameworkMap,
  );

  return [
    ...getInputArray(input.warnings),
    ...(unmappedSubsidiaries.length > 0
      ? [`subsidiary entities missing framework mapping: ${unmappedSubsidiaries.join(", ")}`]
      : []),
    ...(parentSubsidiaryFrameworkDiffersFlag &&
    getInputArray(input.conversionEngineReferenceIds).length === 0
      ? ["mixed-framework consolidation should reference the 41.5P conversion engine via conversionEngineReferenceIds"]
      : []),
    ...(parentSubsidiaryFrameworkDiffersFlag
      ? ["mixed-framework consolidation invokes conversion entries as first-class bridge artifacts; subsidiary framework knowledge never contaminates parent reasoning"]
      : []),
    "metadata-only consolidation hierarchy contract; live consolidation, conversion entries, and eliminations are deferred to the 41.5P engine and real-data validation",
  ];
}

export function buildConsolidationHierarchy(
  input: BuildConsolidationHierarchyInput,
): BuildConsolidationHierarchyResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      consolidationHierarchy: null,
      skipped: true,
      warnings: [
        `missing required consolidation hierarchy identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredParentEntityId = input.parentEntityId as string;
  const requiredParentReportingFramework = input.parentReportingFramework as StandardsReportingFramework;
  const requiredOnboardingConfigurationReferenceId = input.onboardingConfigurationReferenceId as string;
  const requiredConsolidationMethod = input.consolidationMethod as ConsolidationHierarchyMethod;
  const subsidiaryEntityReferenceIds = getInputArray(input.subsidiaryEntityReferenceIds);
  const subsidiaryFrameworkMap = getSubsidiaryFrameworkMap(input);
  const parentSubsidiaryFrameworkDiffersFlag = getParentSubsidiaryFrameworkDiffersFlag(
    requiredParentReportingFramework,
    subsidiaryFrameworkMap,
  );
  const base = getSharedBase(input);
  const consolidationHierarchy: SyntheticConsolidationHierarchy = {
    ...base,
    consolidationHierarchyId: buildConsolidationHierarchyId(input),
    consolidationHierarchyKey: buildConsolidationHierarchyKey(input),
    parentEntityId: requiredParentEntityId,
    parentReportingFramework: requiredParentReportingFramework,
    subsidiaryEntityReferenceIds,
    subsidiaryFrameworkMap,
    consolidationMethod: requiredConsolidationMethod,
    ownershipPercentage: input.ownershipPercentage ?? 0,
    maintainsHierarchyFromOnboarding: true,
    onboardingConfigurationReferenceId: requiredOnboardingConfigurationReferenceId,
    parentSubsidiaryFrameworkDiffersFlag,
    invokesConversionEngineWhenFrameworksDiffer: true,
    conversionEngineReferenceIds: getInputArray(input.conversionEngineReferenceIds),
    intercompanyTransactionsFrameworkTagged: true,
    identifiesEliminationsAcrossFrameworkBoundaries: true,
    consolidatedStatementsInParentFramework: true,
    respectsFrameworkSegregation: true,
    subsidiaryFrameworkKnowledgeNeverContaminatesParent: true,
    conversionEntriesAreFirstClassBridge: true,
    executable: false,
    derivationHash: buildDerivationHash(input, parentSubsidiaryFrameworkDiffersFlag),
    warnings: getWarnings(input, parentSubsidiaryFrameworkDiffersFlag),
    consolidationHierarchyComplete: input.consolidationHierarchyComplete === true,
  };

  return {
    consolidationHierarchy,
    skipped: false,
    warnings: consolidationHierarchy.warnings,
  };
}
