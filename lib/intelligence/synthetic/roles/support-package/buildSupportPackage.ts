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

export type SyntheticSupportPackageOutputType =
  | "journal_entry"
  | "reconciliation"
  | "schedule"
  | "analysis"
  | "audit_workpaper"
  | "report"
  | "realization_sheet"
  | "process_documentation"
  | "other";

export interface BuildSupportPackageInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  rolePreparerIdentity?: string;
  journalEntryCandidateReferenceId?: string;
  leadSheetReferenceId?: string;
  outputType?: SyntheticSupportPackageOutputType;
  detailedCalculationReferences?: string[];
  formulaReferences?: string[];
  sourceReportReferences?: string[];
  extractionParameterReferences?: string[];
  tieOutReferences?: string[];
  scheduleReferences?: string[];
  allocationLogicReferences?: string[];
  supportingFileReferences?: string[];
  invoiceReferences?: string[];
  statementReferences?: string[];
  exportReferences?: string[];
  contractReferences?: string[];
  screenshotReferences?: string[];
  emailReferences?: string[];
  assumptionNotes?: string[];
  reclassNotes?: string[];
  estimateNotes?: string[];
  redactionNotes?: string[];
  evidenceReferenceIds?: string[];
  supportPackageComplete?: boolean;
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
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticSupportPackage {
  supportPackageId: string;
  supportPackageKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  rolePreparerIdentity: string;
  journalEntryCandidateReferenceId: string;
  leadSheetReferenceId: string;
  outputType: SyntheticSupportPackageOutputType;
  detailedCalculationReferences: string[];
  formulaReferences: string[];
  sourceReportReferences: string[];
  extractionParameterReferences: string[];
  tieOutReferences: string[];
  scheduleReferences: string[];
  allocationLogicReferences: string[];
  supportingFileReferences: string[];
  invoiceReferences: string[];
  statementReferences: string[];
  exportReferences: string[];
  contractReferences: string[];
  screenshotReferences: string[];
  emailReferences: string[];
  assumptionNotes: string[];
  reclassNotes: string[];
  estimateNotes: string[];
  redactionNotes: string[];
  evidenceReferenceIds: string[];
  supportPackageComplete: boolean;
  isHardGateRequirement: true;
  outputCannotAdvanceWithoutSupportPackage: true;
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
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildSupportPackageResult {
  supportPackage: SyntheticSupportPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildSupportPackageInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildSupportPackageInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildSupportPackageInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildSupportPackageInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildSupportPackageInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildSupportPackageInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildSupportPackageInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildSupportPackageInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildSupportPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getSupportPackageComplete(input: BuildSupportPackageInput): boolean {
  if (input.supportPackageComplete !== undefined) {
    return input.supportPackageComplete;
  }

  return (
    hasValue(input.rolePreparerIdentity) &&
    getInputArray(input.evidenceReferenceIds).length > 0 &&
    (getInputArray(input.detailedCalculationReferences).length > 0 ||
      getInputArray(input.sourceReportReferences).length > 0 ||
      getInputArray(input.supportingFileReferences).length > 0)
  );
}

function collectMissingRequiredIdentifiers(input: BuildSupportPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.outputType)) {
    missing.push("outputType");
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

function buildDerivationHash(input: BuildSupportPackageInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    rolePreparerIdentity: input.rolePreparerIdentity ?? "",
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    leadSheetReferenceId: input.leadSheetReferenceId ?? "",
    outputType: input.outputType,
    detailedCalculationReferences: getInputArray(input.detailedCalculationReferences),
    formulaReferences: getInputArray(input.formulaReferences),
    sourceReportReferences: getInputArray(input.sourceReportReferences),
    extractionParameterReferences: getInputArray(input.extractionParameterReferences),
    tieOutReferences: getInputArray(input.tieOutReferences),
    scheduleReferences: getInputArray(input.scheduleReferences),
    allocationLogicReferences: getInputArray(input.allocationLogicReferences),
    supportingFileReferences: getInputArray(input.supportingFileReferences),
    invoiceReferences: getInputArray(input.invoiceReferences),
    statementReferences: getInputArray(input.statementReferences),
    exportReferences: getInputArray(input.exportReferences),
    contractReferences: getInputArray(input.contractReferences),
    screenshotReferences: getInputArray(input.screenshotReferences),
    emailReferences: getInputArray(input.emailReferences),
    assumptionNotes: getInputArray(input.assumptionNotes),
    reclassNotes: getInputArray(input.reclassNotes),
    estimateNotes: getInputArray(input.estimateNotes),
    redactionNotes: getInputArray(input.redactionNotes),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    supportPackageComplete: getSupportPackageComplete(input),
    isHardGateRequirement: true,
    outputCannotAdvanceWithoutSupportPackage: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildSupportPackage(input: BuildSupportPackageInput): BuildSupportPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      supportPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const outputType = input.outputType as SyntheticSupportPackageOutputType;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const supportPackageComplete = getSupportPackageComplete(input);
  const derivationHash = buildDerivationHash(input);
  const supportPackageKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    leadSheetReferenceId: input.leadSheetReferenceId ?? "",
    outputType,
    supportPackageComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const supportPackageId = stableSnapshotHash({
    supportPackageKey,
    artifactType: "SyntheticSupportPackage",
  });

  return {
    supportPackage: {
      supportPackageId,
      supportPackageKey,
      roleType,
      roleInstanceId,
      rolePreparerIdentity: input.rolePreparerIdentity ?? "",
      journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
      leadSheetReferenceId: input.leadSheetReferenceId ?? "",
      outputType,
      detailedCalculationReferences: getInputArray(input.detailedCalculationReferences),
      formulaReferences: getInputArray(input.formulaReferences),
      sourceReportReferences: getInputArray(input.sourceReportReferences),
      extractionParameterReferences: getInputArray(input.extractionParameterReferences),
      tieOutReferences: getInputArray(input.tieOutReferences),
      scheduleReferences: getInputArray(input.scheduleReferences),
      allocationLogicReferences: getInputArray(input.allocationLogicReferences),
      supportingFileReferences: getInputArray(input.supportingFileReferences),
      invoiceReferences: getInputArray(input.invoiceReferences),
      statementReferences: getInputArray(input.statementReferences),
      exportReferences: getInputArray(input.exportReferences),
      contractReferences: getInputArray(input.contractReferences),
      screenshotReferences: getInputArray(input.screenshotReferences),
      emailReferences: getInputArray(input.emailReferences),
      assumptionNotes: getInputArray(input.assumptionNotes),
      reclassNotes: getInputArray(input.reclassNotes),
      estimateNotes: getInputArray(input.estimateNotes),
      redactionNotes: getInputArray(input.redactionNotes),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      supportPackageComplete,
      isHardGateRequirement: true,
      outputCannotAdvanceWithoutSupportPackage: true,
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
