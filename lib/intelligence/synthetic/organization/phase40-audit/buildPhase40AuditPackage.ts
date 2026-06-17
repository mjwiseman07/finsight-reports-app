import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticOrganizationBaseContract } from "../contracts";

export const PHASE40_COMPLETED_MODULES = [
  "contracts",
  "org-unit",
  "workforce-registry",
  "capacity",
  "work-allocation",
  "escalation",
  "org-health",
  "workforce-performance",
  "close-command-center",
  "audit-command-center",
  "revenue-cycle-command-center",
  "payroll-command-center",
  "digital-twin",
  "simulation",
  "digital-departments",
  "governance",
  "marketplace",
  "handoff",
] as const;

export const PHASE40_AUDIT_AREA_NAMES = [
  "All 18 Phase 40 module directories present with builder and index files",
  "Contract discipline: 40B-40R import contract types only from 40A; no module outside contracts defines a *Contract type",
  "Deterministic stableSnapshotHash IDs throughout, imported only from lib/intelligence/core/hash",
  "Fail-closed on missing identifiers throughout",
  "executable literal false on every output",
  "customerIsolation, firmIsolation, clientIsolation separate everywhere; containsPHI present everywhere",
  "Work allocation and escalation are recommendation-only",
  "Capacity is observational-only",
  "Org-health and workforce-performance are operational-metrics-only with no ranking, scoring, HR evaluation, or individual human performance scoring",
  "Workforce-registry human privacy markers all literal true",
  "All four command centers carry idempotency markers",
  "Revenue-cycle PHI markers literal true; healthcare units force containsPHI true; no PHI/non-PHI mixing",
  "Payroll safety markers literal true",
  "Simulation isolation markers present and never triggers real action",
  "Governance audit chain append-only, immutable, never edited or deleted, superseding creates new entry",
  "Marketplace deployment requires humanApproverId and fails closed without it",
  "Every recommendation-producing module produces a RecommendationAuditEntry",
  "Phase 39 handoff consumed; Phase 39/38 hashes present; handoff produces boundPhase40SnapshotHash; verifier, TypeScript, and cross-isolation pass",
] as const;

export type Phase40CompletedModuleIdentifier = (typeof PHASE40_COMPLETED_MODULES)[number];

export type SyntheticPhase40AuditAreaName = (typeof PHASE40_AUDIT_AREA_NAMES)[number];

export type SyntheticPhase40AuditAreaStatus = "PASS" | "PARTIAL" | "FAIL";

export type SyntheticPhase40LockStatus = "locked" | "not_locked";

export interface SyntheticPhase40AuditAreaResult {
  auditAreaNumber: number;
  auditAreaName: SyntheticPhase40AuditAreaName;
  auditAreaStatus: SyntheticPhase40AuditAreaStatus;
  gaps: string[];
  evidenceReferenceIds: string[];
}

export interface BuildPhase40AuditPackageInput extends Partial<SyntheticOrganizationBaseContract> {
  auditAreaResults?: SyntheticPhase40AuditAreaResult[];
  phase40ModulesCompleted?: Phase40CompletedModuleIdentifier[];
  phase40VerifierPassed?: boolean;
  phase40TypeScriptPassed?: boolean;
  crossIsolationTestPassed?: boolean;
  allGuardrailMarkersPresent?: boolean;
  allRecommendationsHaveAuditEntries?: boolean;
  phase39HandoffConsumed?: boolean;
  boundPhase40SnapshotHash?: string;
  phase40LockedAt?: string;
}

export interface SyntheticPhase40AuditPackage extends SyntheticOrganizationBaseContract {
  phase40AuditPackageId: string;
  phase40AuditPackageKey: string;
  auditAreaResults: SyntheticPhase40AuditAreaResult[];
  phase40ModulesCompleted: Phase40CompletedModuleIdentifier[];
  phase40ModuleCount: number;
  phase40VerifierPassed: boolean;
  phase40TypeScriptPassed: boolean;
  crossIsolationTestPassed: boolean;
  allGuardrailMarkersPresent: boolean;
  allRecommendationsHaveAuditEntries: boolean;
  phase39HandoffConsumed: boolean;
  phase40LockHash: string;
  phase40LockedAt: string;
  phase40LockStatus: SyntheticPhase40LockStatus;
  executable: false;
  executionReady: boolean;
}

export interface BuildPhase40AuditPackageResult {
  phase40AuditPackage: SyntheticPhase40AuditPackage | null;
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

function getDerivationMethod(input: BuildPhase40AuditPackageInput): SyntheticOrganizationBaseContract["derivationMethod"] {
  return input.derivationMethod ?? "handoff_metadata_preservation";
}

function getPhase40ModulesCompleted(input: BuildPhase40AuditPackageInput): Phase40CompletedModuleIdentifier[] {
  return input.phase40ModulesCompleted ?? [...PHASE40_COMPLETED_MODULES];
}

function getExpectedAuditAreaResult(
  input: BuildPhase40AuditPackageInput,
  auditAreaName: SyntheticPhase40AuditAreaName,
  areaIndex: number,
): SyntheticPhase40AuditAreaResult {
  const auditAreaNumber = areaIndex + 1;
  const result = getInputArray(input.auditAreaResults).find(
    (candidate) => candidate.auditAreaNumber === auditAreaNumber || candidate.auditAreaName === auditAreaName,
  );

  return result ?? {
    auditAreaNumber,
    auditAreaName,
    auditAreaStatus: "FAIL",
    gaps: ["audit area result was not provided"],
    evidenceReferenceIds: [],
  };
}

function getAuditAreaResults(input: BuildPhase40AuditPackageInput): SyntheticPhase40AuditAreaResult[] {
  return PHASE40_AUDIT_AREA_NAMES.map((auditAreaName, areaIndex) =>
    getExpectedAuditAreaResult(input, auditAreaName, areaIndex),
  );
}

function allAuditAreasPass(input: BuildPhase40AuditPackageInput): boolean {
  return getAuditAreaResults(input).every((result) => result.auditAreaStatus === "PASS");
}

function allLockBooleansPass(input: BuildPhase40AuditPackageInput): boolean {
  return (
    input.phase40VerifierPassed === true &&
    input.phase40TypeScriptPassed === true &&
    input.crossIsolationTestPassed === true &&
    input.allGuardrailMarkersPresent === true &&
    input.allRecommendationsHaveAuditEntries === true &&
    input.phase39HandoffConsumed === true
  );
}

function getPhase40LockStatus(input: BuildPhase40AuditPackageInput): SyntheticPhase40LockStatus {
  return allAuditAreasPass(input) && allLockBooleansPass(input) ? "locked" : "not_locked";
}

function getPhase40LockHash(input: BuildPhase40AuditPackageInput): string {
  if (getPhase40LockStatus(input) !== "locked") {
    return "";
  }

  return stableSnapshotHash({
    auditAreaResults: getAuditAreaResults(input),
    phase40ModulesCompleted: getPhase40ModulesCompleted(input),
    phase40ModuleCount: getPhase40ModulesCompleted(input).length,
    phase40VerifierPassed: input.phase40VerifierPassed === true,
    phase40TypeScriptPassed: input.phase40TypeScriptPassed === true,
    crossIsolationTestPassed: input.crossIsolationTestPassed === true,
    allGuardrailMarkersPresent: input.allGuardrailMarkersPresent === true,
    allRecommendationsHaveAuditEntries: input.allRecommendationsHaveAuditEntries === true,
    phase39HandoffConsumed: input.phase39HandoffConsumed === true,
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
  });
}

function getPhase40LockedAt(input: BuildPhase40AuditPackageInput): string {
  if (getPhase40LockStatus(input) !== "locked") {
    return "";
  }

  return input.phase40LockedAt ?? `deterministic-phase40-lock:${getPhase40LockHash(input)}`;
}

function getDerivationLineageIds(input: BuildPhase40AuditPackageInput): string[] {
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getPhase40ModulesCompleted(input),
    input.boundPhase40SnapshotHash ?? "",
    input.boundPhase39SnapshotHash ?? "",
    input.boundPhase38SnapshotHash ?? "",
    getPhase40LockHash(input),
  ].filter((item) => item !== "");
}

function buildDerivationHash(input: BuildPhase40AuditPackageInput): string {
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    auditAreaResults: getAuditAreaResults(input),
    phase40ModulesCompleted: getPhase40ModulesCompleted(input),
    phase40LockStatus: getPhase40LockStatus(input),
    phase40LockHash: getPhase40LockHash(input),
    derivationLineageIds: getDerivationLineageIds(input),
  });
}

function buildPhase40AuditPackageKey(input: BuildPhase40AuditPackageInput): string {
  return stableSnapshotHash({
    phase40LockStatus: getPhase40LockStatus(input),
    phase40LockHash: getPhase40LockHash(input),
    phase40ModulesCompleted: getPhase40ModulesCompleted(input),
    phase40ModuleCount: getPhase40ModulesCompleted(input).length,
    auditAreaResults: getAuditAreaResults(input),
    scope: input.scope ?? null,
    customerIsolation: input.customerIsolation ?? null,
    firmIsolation: input.firmIsolation ?? null,
    clientIsolation: input.clientIsolation ?? null,
  });
}

function buildPhase40AuditPackageId(input: BuildPhase40AuditPackageInput): string {
  return stableSnapshotHash({
    phase40AuditPackageKey: buildPhase40AuditPackageKey(input),
    artifactType: "SyntheticPhase40AuditPackage",
  });
}

function collectMissingRequiredIdentifiers(input: BuildPhase40AuditPackageInput): string[] {
  const missing: string[] = [];

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

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (getPhase40ModulesCompleted(input).length !== PHASE40_COMPLETED_MODULES.length) {
    missing.push("all 18 phase40ModulesCompleted");
  }

  return missing;
}

function getWarnings(input: BuildPhase40AuditPackageInput): string[] {
  const auditAreaWarnings = getAuditAreaResults(input)
    .filter((result) => result.auditAreaStatus !== "PASS")
    .map((result) => `phase40AuditArea[${result.auditAreaNumber}]: ${result.auditAreaStatus}`);

  return [
    ...auditAreaWarnings,
    ...(input.phase40VerifierPassed === true ? [] : ["phase40VerifierPassed is false."]),
    ...(input.phase40TypeScriptPassed === true ? [] : ["phase40TypeScriptPassed is false."]),
    ...(input.crossIsolationTestPassed === true ? [] : ["crossIsolationTestPassed is false."]),
    ...(input.allGuardrailMarkersPresent === true ? [] : ["allGuardrailMarkersPresent is false."]),
    ...(input.allRecommendationsHaveAuditEntries === true ? [] : ["allRecommendationsHaveAuditEntries is false."]),
    ...(input.phase39HandoffConsumed === true ? [] : ["phase39HandoffConsumed is false."]),
    ...getInputArray(input.warnings),
  ];
}

export function buildPhase40AuditPackage(input: BuildPhase40AuditPackageInput): BuildPhase40AuditPackageResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      phase40AuditPackage: null,
      skipped: true,
      warnings: [`missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const auditAreaResults = getAuditAreaResults(input);
  const phase40ModulesCompleted = getPhase40ModulesCompleted(input);
  const phase40LockStatus = getPhase40LockStatus(input);
  const phase40LockHash = getPhase40LockHash(input);
  const warnings = getWarnings(input);
  const requiredScope = input.scope as SyntheticOrganizationBaseContract["scope"];
  const requiredCustomerIsolation = input.customerIsolation as SyntheticOrganizationBaseContract["customerIsolation"];
  const requiredFirmIsolation = input.firmIsolation as SyntheticOrganizationBaseContract["firmIsolation"];
  const requiredClientIsolation = input.clientIsolation as SyntheticOrganizationBaseContract["clientIsolation"];
  const requiredBoundPhase39SnapshotHash = input.boundPhase39SnapshotHash as string;
  const requiredBoundPhase38SnapshotHash = input.boundPhase38SnapshotHash as string;

  return {
    phase40AuditPackage: {
      phase40AuditPackageId: buildPhase40AuditPackageId(input),
      phase40AuditPackageKey: buildPhase40AuditPackageKey(input),
      auditAreaResults,
      phase40ModulesCompleted,
      phase40ModuleCount: phase40ModulesCompleted.length,
      phase40VerifierPassed: input.phase40VerifierPassed === true,
      phase40TypeScriptPassed: input.phase40TypeScriptPassed === true,
      crossIsolationTestPassed: input.crossIsolationTestPassed === true,
      allGuardrailMarkersPresent: input.allGuardrailMarkersPresent === true,
      allRecommendationsHaveAuditEntries: input.allRecommendationsHaveAuditEntries === true,
      phase39HandoffConsumed: input.phase39HandoffConsumed === true,
      phase40LockHash,
      phase40LockedAt: getPhase40LockedAt(input),
      phase40LockStatus,
      executable: false,
      executionReady: input.executionReady === true,
      boundPhase39SnapshotHash: requiredBoundPhase39SnapshotHash,
      boundPhase38SnapshotHash: requiredBoundPhase38SnapshotHash,
      phase40StaleMarker: input.phase40StaleMarker ?? "current",
      scope: requiredScope,
      customerIsolation: requiredCustomerIsolation,
      firmIsolation: requiredFirmIsolation,
      clientIsolation: requiredClientIsolation,
      containsPHI: getContainsPHI(input.containsPHI),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: getDerivationMethod(input),
      derivationHash: buildDerivationHash(input),
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
