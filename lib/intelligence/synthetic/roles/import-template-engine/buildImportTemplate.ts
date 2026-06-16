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
import type { SyntheticRoleType } from "../contracts";
import type { SyntheticErpType } from "../erp-adapter-framework";

export type SyntheticImportFileFormat = "csv" | "xlsx" | "xml" | "iif" | "qbo" | "erp_specific" | "other";

export type SyntheticImportTemplateValidationStatus = "not_run" | "passed" | "failed";

export type SyntheticImportTemplateDeliveryMethod = "drive_placement" | "email" | "both";

export interface SyntheticImportTemplateColumnDefinition {
  columnName: string;
  canonicalFieldReferenceId: string;
  required: boolean;
  formattingRuleReferenceId: string;
}

export interface SyntheticImportTemplateFieldMapping {
  canonicalFieldName: string;
  targetFieldName: string;
  targetFieldPath: string;
}

export interface SyntheticImportTemplateFormattingRule {
  fieldName: string;
  formatRule: string;
  failureBehavior: "fail_closed";
}

export interface SyntheticImportTemplateDebitCreditFormat {
  formatType: "single_amount_signed" | "separate_debit_credit_columns" | "debit_credit_indicator" | "other";
  debitIndicator: string;
  creditIndicator: string;
}

export interface BuildImportTemplateInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  journalEntryCandidateReferenceId?: string;
  workpaperPackageReferenceId?: string;
  targetErpType?: SyntheticErpType;
  importFileFormat?: SyntheticImportFileFormat;
  importTemplateSchemaReferenceId?: string;
  columnDefinitions?: SyntheticImportTemplateColumnDefinition[];
  requiredColumnMappings?: SyntheticImportTemplateFieldMapping[];
  fieldFormattingRules?: SyntheticImportTemplateFormattingRule[];
  accountFieldMapping?: SyntheticImportTemplateFieldMapping;
  dimensionFieldMappings?: SyntheticImportTemplateFieldMapping[];
  debitCreditFormat?: SyntheticImportTemplateDebitCreditFormat;
  dateFormat?: string;
  templateValidationStatus?: SyntheticImportTemplateValidationStatus;
  templateValidationFailureReason?: string;
  importFileReadyForDelivery?: boolean;
  deliveryMethod?: SyntheticImportTemplateDeliveryMethod;
  importTemplateComplete?: boolean;
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

export interface SyntheticImportTemplate {
  importTemplateId: string;
  importTemplateKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  journalEntryCandidateReferenceId: string;
  workpaperPackageReferenceId: string;
  targetErpType: SyntheticErpType;
  importFileFormat: SyntheticImportFileFormat;
  importTemplateSchemaReferenceId: string;
  columnDefinitions: SyntheticImportTemplateColumnDefinition[];
  requiredColumnMappings: SyntheticImportTemplateFieldMapping[];
  fieldFormattingRules: SyntheticImportTemplateFormattingRule[];
  accountFieldMapping: SyntheticImportTemplateFieldMapping | null;
  dimensionFieldMappings: SyntheticImportTemplateFieldMapping[];
  debitCreditFormat: SyntheticImportTemplateDebitCreditFormat | null;
  dateFormat: string;
  templateValidationStatus: SyntheticImportTemplateValidationStatus;
  templateValidationFailureReason: string;
  importFileReadyForDelivery: boolean;
  deliveryMethod: SyntheticImportTemplateDeliveryMethod;
  deliveredWithWorkpaperPackage: true;
  manualUploadByController: true;
  firstClassFallbackPath: true;
  failClosedOnTemplateValidationFailure: true;
  importTemplateComplete: boolean;
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

export interface BuildImportTemplateResult {
  importTemplate: SyntheticImportTemplate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildImportTemplateInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildImportTemplateInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildImportTemplateInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildImportTemplateInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildImportTemplateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildImportTemplateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildImportTemplateInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildImportTemplateInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildImportTemplateInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getTemplateValidationStatus(input: BuildImportTemplateInput): SyntheticImportTemplateValidationStatus {
  return input.templateValidationStatus ?? "not_run";
}

function getDeliveryMethod(input: BuildImportTemplateInput): SyntheticImportTemplateDeliveryMethod {
  return input.deliveryMethod ?? "drive_placement";
}

function getImportTemplateComplete(input: BuildImportTemplateInput): boolean {
  if (input.importTemplateComplete !== undefined) {
    return input.importTemplateComplete;
  }

  return (
    hasValue(input.targetErpType) &&
    hasValue(input.importFileFormat) &&
    hasValue(input.importTemplateSchemaReferenceId) &&
    getInputArray(input.columnDefinitions).length > 0
  );
}

function collectMissingRequiredIdentifiers(input: BuildImportTemplateInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.targetErpType)) {
    missing.push("targetErpType");
  }

  if (!hasValue(input.importFileFormat)) {
    missing.push("importFileFormat");
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

function buildDerivationHash(input: BuildImportTemplateInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    workpaperPackageReferenceId: input.workpaperPackageReferenceId ?? "",
    targetErpType: input.targetErpType,
    importFileFormat: input.importFileFormat,
    importTemplateSchemaReferenceId: input.importTemplateSchemaReferenceId ?? "",
    columnDefinitions: getInputArray(input.columnDefinitions),
    requiredColumnMappings: getInputArray(input.requiredColumnMappings),
    fieldFormattingRules: getInputArray(input.fieldFormattingRules),
    accountFieldMapping: input.accountFieldMapping ?? null,
    dimensionFieldMappings: getInputArray(input.dimensionFieldMappings),
    debitCreditFormat: input.debitCreditFormat ?? null,
    dateFormat: input.dateFormat ?? "",
    templateValidationStatus: getTemplateValidationStatus(input),
    templateValidationFailureReason: input.templateValidationFailureReason ?? "",
    importFileReadyForDelivery: input.importFileReadyForDelivery === true,
    deliveryMethod: getDeliveryMethod(input),
    deliveredWithWorkpaperPackage: true,
    manualUploadByController: true,
    firstClassFallbackPath: true,
    failClosedOnTemplateValidationFailure: true,
    importTemplateComplete: getImportTemplateComplete(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildImportTemplate(input: BuildImportTemplateInput): BuildImportTemplateResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      importTemplate: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const targetErpType = input.targetErpType as SyntheticErpType;
  const importFileFormat = input.importFileFormat as SyntheticImportFileFormat;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const templateValidationStatus = getTemplateValidationStatus(input);
  const importTemplateComplete = getImportTemplateComplete(input);
  const derivationHash = buildDerivationHash(input);
  const importTemplateKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    workpaperPackageReferenceId: input.workpaperPackageReferenceId ?? "",
    targetErpType,
    importFileFormat,
    importTemplateSchemaReferenceId: input.importTemplateSchemaReferenceId ?? "",
    templateValidationStatus,
    importTemplateComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const importTemplateId = stableSnapshotHash({
    importTemplateKey,
    artifactType: "SyntheticImportTemplate",
  });

  return {
    importTemplate: {
      importTemplateId,
      importTemplateKey,
      roleType,
      roleInstanceId,
      journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
      workpaperPackageReferenceId: input.workpaperPackageReferenceId ?? "",
      targetErpType,
      importFileFormat,
      importTemplateSchemaReferenceId: input.importTemplateSchemaReferenceId ?? "",
      columnDefinitions: getInputArray(input.columnDefinitions),
      requiredColumnMappings: getInputArray(input.requiredColumnMappings),
      fieldFormattingRules: getInputArray(input.fieldFormattingRules),
      accountFieldMapping: input.accountFieldMapping ?? null,
      dimensionFieldMappings: getInputArray(input.dimensionFieldMappings),
      debitCreditFormat: input.debitCreditFormat ?? null,
      dateFormat: input.dateFormat ?? "",
      templateValidationStatus,
      templateValidationFailureReason: input.templateValidationFailureReason ?? "",
      importFileReadyForDelivery: input.importFileReadyForDelivery === true,
      deliveryMethod: getDeliveryMethod(input),
      deliveredWithWorkpaperPackage: true,
      manualUploadByController: true,
      firstClassFallbackPath: true,
      failClosedOnTemplateValidationFailure: true,
      importTemplateComplete,
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
