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
import type { SyntheticErpAdapterKind } from "../erp-adapter-framework";
import type { SyntheticImportFileFormat } from "../import-template-engine";

export type SyntheticUniversalSchemaDirection = "import" | "export" | "bidirectional";

export type SyntheticUniversalSchemaValidationStatus = "not_run" | "passed" | "failed";

export interface SyntheticUniversalFileSchemaDefinition {
  schemaReferenceId: string;
  sheetOrFileName: string;
  delimiter: string;
  headerRequired: boolean;
}

export interface SyntheticCanonicalFieldDefinition {
  fieldName: string;
  fieldType: string;
  canonicalFieldReferenceId: string;
  required: boolean;
}

export interface SyntheticUniversalFieldDefinition {
  fieldName: string;
  canonicalFieldReferenceId: string;
  fieldDescription: string;
}

export interface SyntheticUniversalMappingRule {
  sourceFieldName: string;
  targetFieldName: string;
  ruleReferenceId: string;
  failClosedOnRuleFailure: true;
}

export interface SyntheticUniversalValidationRule {
  ruleName: string;
  ruleReferenceId: string;
  failureBehavior: "fail_closed";
}

export interface BuildUniversalCanonicalSchemaInput {
  adapterKind?: SyntheticErpAdapterKind;
  canonicalModelReferenceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  schemaDirection?: SyntheticUniversalSchemaDirection;
  supportedFileFormats?: SyntheticImportFileFormat[];
  csvSchemaDefinition?: SyntheticUniversalFileSchemaDefinition;
  xlsxSchemaDefinition?: SyntheticUniversalFileSchemaDefinition;
  canonicalFieldDefinitions?: SyntheticCanonicalFieldDefinition[];
  requiredCanonicalFields?: string[];
  optionalCanonicalFields?: string[];
  accountFieldDefinition?: SyntheticUniversalFieldDefinition;
  debitCreditFieldDefinition?: SyntheticUniversalFieldDefinition;
  dimensionFieldDefinitions?: SyntheticUniversalFieldDefinition[];
  entityFieldDefinition?: SyntheticUniversalFieldDefinition;
  periodFieldDefinition?: SyntheticUniversalFieldDefinition;
  importMappingRules?: SyntheticUniversalMappingRule[];
  exportMappingRules?: SyntheticUniversalMappingRule[];
  inboundValidationRules?: SyntheticUniversalValidationRule[];
  outboundFormattingRules?: SyntheticUniversalValidationRule[];
  schemaValidationStatus?: SyntheticUniversalSchemaValidationStatus;
  schemaValidationFailureReason?: string;
  universalSchemaComplete?: boolean;
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

export interface SyntheticUniversalCanonicalSchema {
  universalSchemaId: string;
  universalSchemaKey: string;
  adapterKind: "universal_fallback";
  canonicalModelReferenceId: string;
  schemaDirection: SyntheticUniversalSchemaDirection;
  supportedFileFormats: SyntheticImportFileFormat[];
  csvSchemaDefinition: SyntheticUniversalFileSchemaDefinition | null;
  xlsxSchemaDefinition: SyntheticUniversalFileSchemaDefinition | null;
  canonicalFieldDefinitions: SyntheticCanonicalFieldDefinition[];
  requiredCanonicalFields: string[];
  optionalCanonicalFields: string[];
  accountFieldDefinition: SyntheticUniversalFieldDefinition | null;
  debitCreditFieldDefinition: SyntheticUniversalFieldDefinition | null;
  dimensionFieldDefinitions: SyntheticUniversalFieldDefinition[];
  entityFieldDefinition: SyntheticUniversalFieldDefinition | null;
  periodFieldDefinition: SyntheticUniversalFieldDefinition | null;
  signAwareClassificationRequired: true;
  respectsSourceSystemClassification: true;
  importMappingRules: SyntheticUniversalMappingRule[];
  exportMappingRules: SyntheticUniversalMappingRule[];
  inboundValidationRules: SyntheticUniversalValidationRule[];
  outboundFormattingRules: SyntheticUniversalValidationRule[];
  schemaValidationStatus: SyntheticUniversalSchemaValidationStatus;
  schemaValidationFailureReason: string;
  anyErpCompatible: true;
  noNativeAdapterRequired: true;
  failClosedOnSchemaValidationFailure: true;
  failClosedOnRequiredFieldMissing: true;
  universalSchemaComplete: boolean;
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

export interface BuildUniversalCanonicalSchemaResult {
  universalCanonicalSchema: SyntheticUniversalCanonicalSchema | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildUniversalCanonicalSchemaInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildUniversalCanonicalSchemaInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildUniversalCanonicalSchemaInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildUniversalCanonicalSchemaInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildUniversalCanonicalSchemaInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildUniversalCanonicalSchemaInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildUniversalCanonicalSchemaInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildUniversalCanonicalSchemaInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildUniversalCanonicalSchemaInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getSchemaValidationStatus(input: BuildUniversalCanonicalSchemaInput): SyntheticUniversalSchemaValidationStatus {
  return input.schemaValidationStatus ?? "not_run";
}

function getUniversalSchemaComplete(input: BuildUniversalCanonicalSchemaInput): boolean {
  if (input.universalSchemaComplete !== undefined) {
    return input.universalSchemaComplete;
  }

  return (
    input.adapterKind === "universal_fallback" &&
    hasValue(input.schemaDirection) &&
    hasValue(input.canonicalModelReferenceId) &&
    getInputArray(input.requiredCanonicalFields).length > 0
  );
}

function collectMissingRequiredIdentifiers(input: BuildUniversalCanonicalSchemaInput): string[] {
  const missing: string[] = [];

  if (input.adapterKind !== "universal_fallback") {
    missing.push("adapterKind");
  }

  if (!hasValue(input.schemaDirection)) {
    missing.push("schemaDirection");
  }

  if (!hasValue(input.canonicalModelReferenceId)) {
    missing.push("canonicalModelReferenceId");
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

function buildDerivationHash(input: BuildUniversalCanonicalSchemaInput): string {
  return stableSnapshotHash({
    adapterKind: "universal_fallback",
    canonicalModelReferenceId: input.canonicalModelReferenceId ?? "",
    schemaDirection: input.schemaDirection,
    supportedFileFormats: getInputArray(input.supportedFileFormats),
    csvSchemaDefinition: input.csvSchemaDefinition ?? null,
    xlsxSchemaDefinition: input.xlsxSchemaDefinition ?? null,
    canonicalFieldDefinitions: getInputArray(input.canonicalFieldDefinitions),
    requiredCanonicalFields: getInputArray(input.requiredCanonicalFields),
    optionalCanonicalFields: getInputArray(input.optionalCanonicalFields),
    accountFieldDefinition: input.accountFieldDefinition ?? null,
    debitCreditFieldDefinition: input.debitCreditFieldDefinition ?? null,
    dimensionFieldDefinitions: getInputArray(input.dimensionFieldDefinitions),
    entityFieldDefinition: input.entityFieldDefinition ?? null,
    periodFieldDefinition: input.periodFieldDefinition ?? null,
    signAwareClassificationRequired: true,
    respectsSourceSystemClassification: true,
    importMappingRules: getInputArray(input.importMappingRules),
    exportMappingRules: getInputArray(input.exportMappingRules),
    inboundValidationRules: getInputArray(input.inboundValidationRules),
    outboundFormattingRules: getInputArray(input.outboundFormattingRules),
    schemaValidationStatus: getSchemaValidationStatus(input),
    schemaValidationFailureReason: input.schemaValidationFailureReason ?? "",
    anyErpCompatible: true,
    noNativeAdapterRequired: true,
    failClosedOnSchemaValidationFailure: true,
    failClosedOnRequiredFieldMissing: true,
    universalSchemaComplete: getUniversalSchemaComplete(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildUniversalCanonicalSchema(
  input: BuildUniversalCanonicalSchemaInput,
): BuildUniversalCanonicalSchemaResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      universalCanonicalSchema: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const canonicalModelReferenceId = input.canonicalModelReferenceId as string;
  const schemaDirection = input.schemaDirection as SyntheticUniversalSchemaDirection;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const schemaValidationStatus = getSchemaValidationStatus(input);
  const universalSchemaComplete = getUniversalSchemaComplete(input);
  const derivationHash = buildDerivationHash(input);
  const universalSchemaKey = stableSnapshotHash({
    adapterKind: "universal_fallback",
    companyId,
    canonicalModelReferenceId,
    schemaDirection,
    supportedFileFormats: getInputArray(input.supportedFileFormats),
    schemaValidationStatus,
    universalSchemaComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const universalSchemaId = stableSnapshotHash({
    universalSchemaKey,
    artifactType: "SyntheticUniversalCanonicalSchema",
  });

  return {
    universalCanonicalSchema: {
      universalSchemaId,
      universalSchemaKey,
      adapterKind: "universal_fallback",
      canonicalModelReferenceId,
      schemaDirection,
      supportedFileFormats: getInputArray(input.supportedFileFormats),
      csvSchemaDefinition: input.csvSchemaDefinition ?? null,
      xlsxSchemaDefinition: input.xlsxSchemaDefinition ?? null,
      canonicalFieldDefinitions: getInputArray(input.canonicalFieldDefinitions),
      requiredCanonicalFields: getInputArray(input.requiredCanonicalFields),
      optionalCanonicalFields: getInputArray(input.optionalCanonicalFields),
      accountFieldDefinition: input.accountFieldDefinition ?? null,
      debitCreditFieldDefinition: input.debitCreditFieldDefinition ?? null,
      dimensionFieldDefinitions: getInputArray(input.dimensionFieldDefinitions),
      entityFieldDefinition: input.entityFieldDefinition ?? null,
      periodFieldDefinition: input.periodFieldDefinition ?? null,
      signAwareClassificationRequired: true,
      respectsSourceSystemClassification: true,
      importMappingRules: getInputArray(input.importMappingRules),
      exportMappingRules: getInputArray(input.exportMappingRules),
      inboundValidationRules: getInputArray(input.inboundValidationRules),
      outboundFormattingRules: getInputArray(input.outboundFormattingRules),
      schemaValidationStatus,
      schemaValidationFailureReason: input.schemaValidationFailureReason ?? "",
      anyErpCompatible: true,
      noNativeAdapterRequired: true,
      failClosedOnSchemaValidationFailure: true,
      failClosedOnRequiredFieldMissing: true,
      universalSchemaComplete,
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
