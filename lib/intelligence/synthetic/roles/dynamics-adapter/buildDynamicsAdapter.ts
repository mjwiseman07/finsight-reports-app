import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type { SyntheticActionHandoffPackage } from "../../actions/action-handoff-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticErpSupportedPostingMode } from "../erp-adapter-framework";

export type SyntheticDynamicsMappingValidationStatus = "not_run" | "passed" | "failed";

export type SyntheticDynamicsVariant = "business_central" | "finance_and_operations";

export interface BuildDynamicsAdapterInput {
  phase38Handoff: SyntheticActionHandoffPackage | null;
  dynamicsVariant?: SyntheticDynamicsVariant;
  erpAdapterContractReferenceId?: string;
  canonicalModelReferenceId?: string;
  companyConnectionReferenceId?: string;
  chartOfAccountsMappingReferenceId?: string;
  accountClassificationMappingReferenceId?: string;
  dimensionMappingReferenceId?: string;
  financialDimensionMappingReferenceId?: string;
  legalEntityStructureReferenceId?: string;
  supportedPostingModes?: SyntheticErpSupportedPostingMode[];
  postingModeDirectApiSupported?: boolean;
  postingModeImportFileSupported?: boolean;
  postingModeFormattedEmailSupported?: boolean;
  canReadChartOfAccounts?: boolean;
  canReadDimensions?: boolean;
  canReadLegalEntityStructure?: boolean;
  canValidateMappings?: boolean;
  canSubmitJournalEntry?: boolean;
  canFetchPostingStatus?: boolean;
  mappingValidationStatus?: SyntheticDynamicsMappingValidationStatus;
  mappingValidationFailureReason?: string;
  importFileFallbackAvailable?: boolean;
  formattedEmailFallbackAvailable?: boolean;
  adapterConfigurationComplete?: boolean;
  boundPhase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  phase39StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  companyId?: string;
  scope?: SyntheticAuditScope;
  customerIsolation?: SyntheticMemoryObjectIsolationDimension;
  firmIsolation?: SyntheticMemoryObjectIsolationDimension;
  clientIsolation?: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticDynamicsAdapter {
  dynamicsAdapterId: string;
  dynamicsAdapterKey: string;
  erpType: "dynamics";
  adapterKind: "native";
  dynamicsVariant: SyntheticDynamicsVariant;
  erpAdapterContractReferenceId: string;
  canonicalModelReferenceId: string;
  companyConnectionReferenceId: string;
  chartOfAccountsMappingReferenceId: string;
  accountClassificationMappingReferenceId: string;
  signAwareClassificationRequired: true;
  negativeCashReclassToLiabilityRequired: true;
  contraAccountSignAwareHandlingRequired: true;
  respectsSourceSystemClassification: true;
  dimensionMappingReferenceId: string;
  financialDimensionMappingReferenceId: string;
  legalEntityStructureReferenceId: string;
  supportedPostingModes: SyntheticErpSupportedPostingMode[];
  postingModeDirectApiSupported: boolean;
  postingModeImportFileSupported: boolean;
  postingModeFormattedEmailSupported: boolean;
  directApiPostsAsDraft: true;
  neverAutoApproves: true;
  canReadChartOfAccounts: boolean;
  canReadDimensions: boolean;
  canReadLegalEntityStructure: boolean;
  canValidateMappings: boolean;
  canSubmitJournalEntry: boolean;
  canFetchPostingStatus: boolean;
  authenticationModel: "oauth";
  connectionInterface: "rest_api";
  mappingValidationStatus: SyntheticDynamicsMappingValidationStatus;
  mappingValidationFailureReason: string;
  failClosedOnConnectionFailure: true;
  failClosedOnMappingValidationFailure: true;
  failClosedOnClassificationMappingFailure: true;
  failClosedOnUnknownDynamicsVariant: true;
  importFileFallbackAvailable: boolean;
  formattedEmailFallbackAvailable: boolean;
  adapterConfigurationComplete: boolean;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  phase39StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildDynamicsAdapterResult {
  dynamicsAdapter: SyntheticDynamicsAdapter | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildDynamicsAdapterInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildDynamicsAdapterInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildDynamicsAdapterInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildDynamicsAdapterInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildDynamicsAdapterInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildDynamicsAdapterInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildDynamicsAdapterInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildDynamicsAdapterInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildDynamicsAdapterInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getMappingValidationStatus(input: BuildDynamicsAdapterInput): SyntheticDynamicsMappingValidationStatus {
  return input.mappingValidationStatus ?? "not_run";
}

function getAdapterConfigurationComplete(input: BuildDynamicsAdapterInput): boolean {
  if (input.adapterConfigurationComplete !== undefined) {
    return input.adapterConfigurationComplete;
  }

  return (
    hasValue(input.dynamicsVariant) &&
    hasValue(input.erpAdapterContractReferenceId) &&
    hasValue(input.companyConnectionReferenceId) &&
    hasValue(input.chartOfAccountsMappingReferenceId) &&
    hasValue(input.financialDimensionMappingReferenceId) &&
    hasValue(input.legalEntityStructureReferenceId)
  );
}

function collectMissingRequiredIdentifiers(input: BuildDynamicsAdapterInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.dynamicsVariant)) {
    missing.push("dynamicsVariant");
  }

  if (!hasValue(input.erpAdapterContractReferenceId)) {
    missing.push("erpAdapterContractReferenceId");
  }

  if (!hasValue(input.companyConnectionReferenceId)) {
    missing.push("companyConnectionReferenceId");
  }

  if (!hasValue(getBoundPhase38SnapshotHash(input))) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!hasValue(getBoundPhase37SnapshotHash(input))) {
    missing.push("boundPhase37SnapshotHash");
  }

  if (!hasValue(getCompanyId(input))) {
    missing.push("companyId");
  }

  if (!getScope(input)) {
    missing.push("scope");
  }

  if (!getCustomerIsolation(input)) {
    missing.push("customerIsolation");
  }

  if (!getFirmIsolation(input)) {
    missing.push("firmIsolation");
  }

  if (!getClientIsolation(input)) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildDerivationHash(input: BuildDynamicsAdapterInput): string {
  return stableSnapshotHash({
    erpType: "dynamics",
    adapterKind: "native",
    dynamicsVariant: input.dynamicsVariant ?? "",
    erpAdapterContractReferenceId: input.erpAdapterContractReferenceId ?? "",
    canonicalModelReferenceId: input.canonicalModelReferenceId ?? "",
    companyConnectionReferenceId: input.companyConnectionReferenceId ?? "",
    chartOfAccountsMappingReferenceId: input.chartOfAccountsMappingReferenceId ?? "",
    accountClassificationMappingReferenceId: input.accountClassificationMappingReferenceId ?? "",
    signAwareClassificationRequired: true,
    negativeCashReclassToLiabilityRequired: true,
    contraAccountSignAwareHandlingRequired: true,
    respectsSourceSystemClassification: true,
    dimensionMappingReferenceId: input.dimensionMappingReferenceId ?? "",
    financialDimensionMappingReferenceId: input.financialDimensionMappingReferenceId ?? "",
    legalEntityStructureReferenceId: input.legalEntityStructureReferenceId ?? "",
    supportedPostingModes: getInputArray(input.supportedPostingModes),
    postingModeDirectApiSupported: input.postingModeDirectApiSupported === true,
    postingModeImportFileSupported: input.postingModeImportFileSupported === true,
    postingModeFormattedEmailSupported: input.postingModeFormattedEmailSupported === true,
    directApiPostsAsDraft: true,
    neverAutoApproves: true,
    canReadChartOfAccounts: input.canReadChartOfAccounts === true,
    canReadDimensions: input.canReadDimensions === true,
    canReadLegalEntityStructure: input.canReadLegalEntityStructure === true,
    canValidateMappings: input.canValidateMappings === true,
    canSubmitJournalEntry: input.canSubmitJournalEntry === true,
    canFetchPostingStatus: input.canFetchPostingStatus === true,
    authenticationModel: "oauth",
    connectionInterface: "rest_api",
    mappingValidationStatus: getMappingValidationStatus(input),
    mappingValidationFailureReason: input.mappingValidationFailureReason ?? "",
    failClosedOnConnectionFailure: true,
    failClosedOnMappingValidationFailure: true,
    failClosedOnClassificationMappingFailure: true,
    failClosedOnUnknownDynamicsVariant: true,
    importFileFallbackAvailable: input.importFileFallbackAvailable === true,
    formattedEmailFallbackAvailable: input.formattedEmailFallbackAvailable === true,
    adapterConfigurationComplete: getAdapterConfigurationComplete(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildDynamicsAdapter(input: BuildDynamicsAdapterInput): BuildDynamicsAdapterResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      dynamicsAdapter: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const dynamicsVariant = input.dynamicsVariant as SyntheticDynamicsVariant;
  const erpAdapterContractReferenceId = input.erpAdapterContractReferenceId as string;
  const companyConnectionReferenceId = input.companyConnectionReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const mappingValidationStatus = getMappingValidationStatus(input);
  const adapterConfigurationComplete = getAdapterConfigurationComplete(input);
  const derivationHash = buildDerivationHash(input);
  const dynamicsAdapterKey = stableSnapshotHash({
    erpType: "dynamics",
    adapterKind: "native",
    dynamicsVariant,
    companyId,
    erpAdapterContractReferenceId,
    companyConnectionReferenceId,
    chartOfAccountsMappingReferenceId: input.chartOfAccountsMappingReferenceId ?? "",
    financialDimensionMappingReferenceId: input.financialDimensionMappingReferenceId ?? "",
    legalEntityStructureReferenceId: input.legalEntityStructureReferenceId ?? "",
    mappingValidationStatus,
    adapterConfigurationComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const dynamicsAdapterId = stableSnapshotHash({
    dynamicsAdapterKey,
    artifactType: "SyntheticDynamicsAdapter",
  });

  return {
    dynamicsAdapter: {
      dynamicsAdapterId,
      dynamicsAdapterKey,
      erpType: "dynamics",
      adapterKind: "native",
      dynamicsVariant,
      erpAdapterContractReferenceId,
      canonicalModelReferenceId: input.canonicalModelReferenceId ?? "",
      companyConnectionReferenceId,
      chartOfAccountsMappingReferenceId: input.chartOfAccountsMappingReferenceId ?? "",
      accountClassificationMappingReferenceId: input.accountClassificationMappingReferenceId ?? "",
      signAwareClassificationRequired: true,
      negativeCashReclassToLiabilityRequired: true,
      contraAccountSignAwareHandlingRequired: true,
      respectsSourceSystemClassification: true,
      dimensionMappingReferenceId: input.dimensionMappingReferenceId ?? "",
      financialDimensionMappingReferenceId: input.financialDimensionMappingReferenceId ?? "",
      legalEntityStructureReferenceId: input.legalEntityStructureReferenceId ?? "",
      supportedPostingModes: getInputArray(input.supportedPostingModes),
      postingModeDirectApiSupported: input.postingModeDirectApiSupported === true,
      postingModeImportFileSupported: input.postingModeImportFileSupported === true,
      postingModeFormattedEmailSupported: input.postingModeFormattedEmailSupported === true,
      directApiPostsAsDraft: true,
      neverAutoApproves: true,
      canReadChartOfAccounts: input.canReadChartOfAccounts === true,
      canReadDimensions: input.canReadDimensions === true,
      canReadLegalEntityStructure: input.canReadLegalEntityStructure === true,
      canValidateMappings: input.canValidateMappings === true,
      canSubmitJournalEntry: input.canSubmitJournalEntry === true,
      canFetchPostingStatus: input.canFetchPostingStatus === true,
      authenticationModel: "oauth",
      connectionInterface: "rest_api",
      mappingValidationStatus,
      mappingValidationFailureReason: input.mappingValidationFailureReason ?? "",
      failClosedOnConnectionFailure: true,
      failClosedOnMappingValidationFailure: true,
      failClosedOnClassificationMappingFailure: true,
      failClosedOnUnknownDynamicsVariant: true,
      importFileFallbackAvailable: input.importFileFallbackAvailable === true,
      formattedEmailFallbackAvailable: input.formattedEmailFallbackAvailable === true,
      adapterConfigurationComplete,
      boundPhase38SnapshotHash,
      boundPhase37SnapshotHash,
      phase39StaleMarker: getPhase39StaleMarker(input),
      executable: false,
      executionReady: input.executionReady === true,
      companyId,
      scope: scope as SyntheticAuditScope,
      customerIsolation: customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: clientIsolation as SyntheticMemoryObjectIsolationDimension,
      derivationLineageIds: getInputArray(input.derivationLineageIds),
      derivationMethod: getDerivationMethod(input),
      derivationHash,
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      materialityMetadata: getInputArray(input.materialityMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
