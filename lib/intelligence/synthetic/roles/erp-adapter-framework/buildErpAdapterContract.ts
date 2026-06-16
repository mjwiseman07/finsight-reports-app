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

export type SyntheticErpType =
  | "quickbooks"
  | "xero"
  | "sage_intacct"
  | "netsuite"
  | "dynamics"
  | "universal_canonical"
  | "other";

export type SyntheticErpAdapterKind = "native" | "universal_fallback";

export type SyntheticErpSupportedOperation =
  | "read_chart_of_accounts"
  | "read_dimensions"
  | "validate_mappings"
  | "submit_journal_entry"
  | "fetch_posting_status"
  | "attach_support"
  | "produce_import_file"
  | "produce_formatted_email";

export type SyntheticErpSupportedPostingMode = "direct_api" | "import_file" | "formatted_email";

export type SyntheticErpAuthenticationModel =
  | "oauth"
  | "api_key"
  | "service_account"
  | "firm_managed"
  | "not_applicable";

export type SyntheticErpConnectionInterface =
  | "rest_api"
  | "soap_api"
  | "file_import"
  | "integration_platform"
  | "canonical_schema";

export interface BuildErpAdapterContractInput {
  erpType?: SyntheticErpType;
  adapterKind?: SyntheticErpAdapterKind;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  canonicalModelReferenceId?: string;
  supportedOperations?: SyntheticErpSupportedOperation[];
  canReadChartOfAccounts?: boolean;
  canReadDimensions?: boolean;
  canValidateMappings?: boolean;
  canSubmitJournalEntry?: boolean;
  canFetchPostingStatus?: boolean;
  canAttachSupport?: boolean;
  supportedPostingModes?: SyntheticErpSupportedPostingMode[];
  postingModeDirectApiSupported?: boolean;
  postingModeImportFileSupported?: boolean;
  postingModeFormattedEmailSupported?: boolean;
  authenticationModel?: SyntheticErpAuthenticationModel;
  connectionInterface?: SyntheticErpConnectionInterface;
  importFileFallbackAvailable?: boolean;
  formattedEmailFallbackAvailable?: boolean;
  adapterContractComplete?: boolean;
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

export interface SyntheticErpAdapterContract {
  erpAdapterContractId: string;
  erpAdapterContractKey: string;
  erpType: SyntheticErpType;
  adapterKind: SyntheticErpAdapterKind;
  canonicalModelReferenceId: string;
  supportedOperations: SyntheticErpSupportedOperation[];
  canReadChartOfAccounts: boolean;
  canReadDimensions: boolean;
  canValidateMappings: boolean;
  canSubmitJournalEntry: boolean;
  canFetchPostingStatus: boolean;
  canAttachSupport: boolean;
  supportedPostingModes: SyntheticErpSupportedPostingMode[];
  postingModeDirectApiSupported: boolean;
  postingModeImportFileSupported: boolean;
  postingModeFormattedEmailSupported: boolean;
  authenticationModel: SyntheticErpAuthenticationModel;
  connectionInterface: SyntheticErpConnectionInterface;
  postsAsDraftNeverAutoApproves: true;
  failClosedOnConnectionFailure: true;
  failClosedOnMappingValidationFailure: true;
  importFileFallbackAvailable: boolean;
  formattedEmailFallbackAvailable: boolean;
  usefulWhenNativePostingUnavailable: true;
  adapterContractComplete: boolean;
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

export interface BuildErpAdapterContractResult {
  erpAdapterContract: SyntheticErpAdapterContract | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildErpAdapterContractInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildErpAdapterContractInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildErpAdapterContractInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildErpAdapterContractInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildErpAdapterContractInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildErpAdapterContractInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildErpAdapterContractInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildErpAdapterContractInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildErpAdapterContractInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getAuthenticationModel(input: BuildErpAdapterContractInput): SyntheticErpAuthenticationModel {
  return input.authenticationModel ?? "not_applicable";
}

function getConnectionInterface(input: BuildErpAdapterContractInput): SyntheticErpConnectionInterface {
  return input.connectionInterface ?? "canonical_schema";
}

function getAdapterContractComplete(input: BuildErpAdapterContractInput): boolean {
  if (input.adapterContractComplete !== undefined) {
    return input.adapterContractComplete;
  }

  return hasValue(input.erpType) && hasValue(input.adapterKind);
}

function collectMissingRequiredIdentifiers(input: BuildErpAdapterContractInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.erpType)) {
    missing.push("erpType");
  }

  if (!hasValue(input.adapterKind)) {
    missing.push("adapterKind");
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

function buildDerivationHash(input: BuildErpAdapterContractInput): string {
  return stableSnapshotHash({
    erpType: input.erpType,
    adapterKind: input.adapterKind,
    canonicalModelReferenceId: input.canonicalModelReferenceId ?? "",
    supportedOperations: getInputArray(input.supportedOperations),
    canReadChartOfAccounts: input.canReadChartOfAccounts === true,
    canReadDimensions: input.canReadDimensions === true,
    canValidateMappings: input.canValidateMappings === true,
    canSubmitJournalEntry: input.canSubmitJournalEntry === true,
    canFetchPostingStatus: input.canFetchPostingStatus === true,
    canAttachSupport: input.canAttachSupport === true,
    supportedPostingModes: getInputArray(input.supportedPostingModes),
    postingModeDirectApiSupported: input.postingModeDirectApiSupported === true,
    postingModeImportFileSupported: input.postingModeImportFileSupported === true,
    postingModeFormattedEmailSupported: input.postingModeFormattedEmailSupported === true,
    authenticationModel: getAuthenticationModel(input),
    connectionInterface: getConnectionInterface(input),
    postsAsDraftNeverAutoApproves: true,
    failClosedOnConnectionFailure: true,
    failClosedOnMappingValidationFailure: true,
    importFileFallbackAvailable: input.importFileFallbackAvailable === true,
    formattedEmailFallbackAvailable: input.formattedEmailFallbackAvailable === true,
    usefulWhenNativePostingUnavailable: true,
    adapterContractComplete: getAdapterContractComplete(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildErpAdapterContract(input: BuildErpAdapterContractInput): BuildErpAdapterContractResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      erpAdapterContract: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const erpType = input.erpType as SyntheticErpType;
  const adapterKind = input.adapterKind as SyntheticErpAdapterKind;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const adapterContractComplete = getAdapterContractComplete(input);
  const derivationHash = buildDerivationHash(input);
  const erpAdapterContractKey = stableSnapshotHash({
    erpType,
    adapterKind,
    companyId,
    canonicalModelReferenceId: input.canonicalModelReferenceId ?? "",
    supportedOperations: getInputArray(input.supportedOperations),
    supportedPostingModes: getInputArray(input.supportedPostingModes),
    authenticationModel: getAuthenticationModel(input),
    connectionInterface: getConnectionInterface(input),
    adapterContractComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const erpAdapterContractId = stableSnapshotHash({
    erpAdapterContractKey,
    artifactType: "SyntheticErpAdapterContract",
  });

  return {
    erpAdapterContract: {
      erpAdapterContractId,
      erpAdapterContractKey,
      erpType,
      adapterKind,
      canonicalModelReferenceId: input.canonicalModelReferenceId ?? "",
      supportedOperations: getInputArray(input.supportedOperations),
      canReadChartOfAccounts: input.canReadChartOfAccounts === true,
      canReadDimensions: input.canReadDimensions === true,
      canValidateMappings: input.canValidateMappings === true,
      canSubmitJournalEntry: input.canSubmitJournalEntry === true,
      canFetchPostingStatus: input.canFetchPostingStatus === true,
      canAttachSupport: input.canAttachSupport === true,
      supportedPostingModes: getInputArray(input.supportedPostingModes),
      postingModeDirectApiSupported: input.postingModeDirectApiSupported === true,
      postingModeImportFileSupported: input.postingModeImportFileSupported === true,
      postingModeFormattedEmailSupported: input.postingModeFormattedEmailSupported === true,
      authenticationModel: getAuthenticationModel(input),
      connectionInterface: getConnectionInterface(input),
      postsAsDraftNeverAutoApproves: true,
      failClosedOnConnectionFailure: true,
      failClosedOnMappingValidationFailure: true,
      importFileFallbackAvailable: input.importFileFallbackAvailable === true,
      formattedEmailFallbackAvailable: input.formattedEmailFallbackAvailable === true,
      usefulWhenNativePostingUnavailable: true,
      adapterContractComplete,
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
