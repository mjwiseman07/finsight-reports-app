import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod } from "../../actions/contracts";
import type {
  SyntheticAuditScope,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export const PHASE39_COMPLETED_MODULES = [
  "contracts",
  "role-template",
  "role-capability",
  "role-restriction",
  "role-governance",
  "role-execution-audit-log",
  "rapid-onboarding",
  "rapid-role-activation",
  "existing-customer-activation",
  "role-dashboard",
  "overnight-scheduling",
  "email-intake",
  "attachment-parser",
  "email-task-mapper",
  "canonical-journal-entry",
  "je-validation",
  "je-reasonableness",
  "je-fraud-detection",
  "je-state-machine",
  "lead-sheet",
  "support-package",
  "workpaper-package",
  "drive-output",
  "folder-mapping",
  "read-access-context",
  "erp-adapter-framework",
  "quickbooks-adapter",
  "xero-adapter",
  "sage-intacct-adapter",
  "netsuite-adapter",
  "dynamics-adapter",
  "import-template-engine",
  "formatted-email-entry",
  "universal-canonical-schema",
  "ai-staff-accountant",
  "ai-senior-accountant",
  "ai-accounting-manager",
  "ai-controller-helper",
  "ai-cfo-helper",
  "ai-staff-auditor",
  "ai-senior-auditor",
  "ai-audit-manager-helper",
  "ai-partner-helper",
  "role-response",
  "controller-notification",
  "decline-warning",
  "morning-summary",
] as const;

export const PHASE39_AUDIT_AREA_NAMES = [
  "All 47 Phase 39 module directories present",
  "All builder and index files present per module",
  "Deterministic stableSnapshotHash IDs throughout",
  "Fail-closed on missing identifiers throughout",
  "executable literal false on every output",
  "customerIsolation, firmIsolation, clientIsolation separate everywhere",
  "self-approval prohibited where required",
  "audit opinion prohibited on all audit roles",
  "preparer-only sign-off on audit roles",
  "client email default off where required",
  "scheduled document checking default off",
  "never silently passes on fraud, reasonableness, decline, state machine",
  "posts as draft never auto approves on all ERP adapters",
  "sign-aware classification markers on all ERP adapters",
  "workpaper and support package hard gates present",
  "isNotReplacementForHuman on all role compositions",
  "overnight execution requires queue confirmation",
  "process intelligence persona surfacing restricted to controller and cfo",
  "phase 38, 37, and 34 handoff hashes present where required",
  "verifier and TypeScript both pass",
] as const;

export type Phase39CompletedModuleIdentifier = (typeof PHASE39_COMPLETED_MODULES)[number];

export type SyntheticPhase39AuditAreaName = (typeof PHASE39_AUDIT_AREA_NAMES)[number];

export type SyntheticPhase39AuditAreaStatus = "PASS" | "PARTIAL" | "FAIL";

export type SyntheticPhase39LockStatus = "locked" | "not_locked";

export interface SyntheticPhase39AuditAreaResult {
  auditAreaNumber: number;
  auditAreaName: SyntheticPhase39AuditAreaName;
  auditAreaStatus: SyntheticPhase39AuditAreaStatus;
  gaps: string[];
  evidenceReferenceIds: string[];
}

export interface BuildPhase39AuditPackageInput {
  auditAreaResults?: SyntheticPhase39AuditAreaResult[];
  phase39ModulesCompleted?: Phase39CompletedModuleIdentifier[];
  phase39VerifierPassed?: boolean;
  phase39TypeScriptPassed?: boolean;
  allGovernanceMarkersPresent?: boolean;
  allIsolationFieldsSeparate?: boolean;
  allExecutableFalse?: boolean;
  noBannedPatterns?: boolean;
  phase38HandoffConsumed?: boolean;
  phase39LockedAt?: string;
  executionReady?: boolean;
  scope?: SyntheticAuditScope;
  customerIsolation?: SyntheticMemoryObjectIsolationDimension;
  firmIsolation?: SyntheticMemoryObjectIsolationDimension;
  clientIsolation?: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticPhase39AuditPackage {
  phase39AuditPackageId: string;
  phase39AuditPackageKey: string;
  auditAreaResults: SyntheticPhase39AuditAreaResult[];
  phase39ModulesCompleted: Phase39CompletedModuleIdentifier[];
  phase39ModuleCount: number;
  phase39VerifierPassed: boolean;
  phase39TypeScriptPassed: boolean;
  allGovernanceMarkersPresent: boolean;
  allIsolationFieldsSeparate: boolean;
  allExecutableFalse: boolean;
  noBannedPatterns: boolean;
  phase38HandoffConsumed: boolean;
  phase39LockHash: string;
  phase39LockedAt: string;
  phase39LockStatus: SyntheticPhase39LockStatus;
  executable: false;
  executionReady: boolean;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildPhase39AuditPackageResult {
  phase39AuditPackage: SyntheticPhase39AuditPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getPhase39ModulesCompleted(input: BuildPhase39AuditPackageInput): Phase39CompletedModuleIdentifier[] {
  return input.phase39ModulesCompleted ?? [...PHASE39_COMPLETED_MODULES];
}

function getDerivationMethod(input: BuildPhase39AuditPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "handoff_metadata_preservation";
}

function getExpectedAuditAreaResult(
  input: BuildPhase39AuditPackageInput,
  areaName: SyntheticPhase39AuditAreaName,
  areaIndex: number,
): SyntheticPhase39AuditAreaResult {
  const result = getInputArray(input.auditAreaResults).find(
    (candidate) => candidate.auditAreaNumber === areaIndex + 1 || candidate.auditAreaName === areaName,
  );

  return result ?? {
    auditAreaNumber: areaIndex + 1,
    auditAreaName: areaName,
    auditAreaStatus: "FAIL",
    gaps: ["audit area result was not provided"],
    evidenceReferenceIds: [],
  };
}

function getAuditAreaResults(input: BuildPhase39AuditPackageInput): SyntheticPhase39AuditAreaResult[] {
  return PHASE39_AUDIT_AREA_NAMES.map((areaName, areaIndex) =>
    getExpectedAuditAreaResult(input, areaName, areaIndex),
  );
}

function allAuditAreasPass(input: BuildPhase39AuditPackageInput): boolean {
  return getAuditAreaResults(input).every((result) => result.auditAreaStatus === "PASS");
}

function allLockBooleansPass(input: BuildPhase39AuditPackageInput): boolean {
  return (
    input.phase39VerifierPassed === true &&
    input.phase39TypeScriptPassed === true &&
    input.allGovernanceMarkersPresent === true &&
    input.allIsolationFieldsSeparate === true &&
    input.allExecutableFalse === true &&
    input.noBannedPatterns === true &&
    input.phase38HandoffConsumed === true
  );
}

function getPhase39LockStatus(input: BuildPhase39AuditPackageInput): SyntheticPhase39LockStatus {
  return allAuditAreasPass(input) && allLockBooleansPass(input) ? "locked" : "not_locked";
}

function getPhase39LockHash(input: BuildPhase39AuditPackageInput): string {
  if (getPhase39LockStatus(input) !== "locked") {
    return "";
  }

  return stableSnapshotHash({
    auditAreaResults: getAuditAreaResults(input),
    phase39ModulesCompleted: getPhase39ModulesCompleted(input),
    phase39ModuleCount: getPhase39ModulesCompleted(input).length,
    phase39VerifierPassed: input.phase39VerifierPassed === true,
    phase39TypeScriptPassed: input.phase39TypeScriptPassed === true,
    allGovernanceMarkersPresent: input.allGovernanceMarkersPresent === true,
    allIsolationFieldsSeparate: input.allIsolationFieldsSeparate === true,
    allExecutableFalse: input.allExecutableFalse === true,
    noBannedPatterns: input.noBannedPatterns === true,
    phase38HandoffConsumed: input.phase38HandoffConsumed === true,
  });
}

function getPhase39LockedAt(input: BuildPhase39AuditPackageInput): string {
  if (getPhase39LockStatus(input) !== "locked") {
    return "";
  }

  return input.phase39LockedAt ?? `deterministic-phase39-lock:${getPhase39LockHash(input)}`;
}

function getDerivationLineageIds(input: BuildPhase39AuditPackageInput): string[] {
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getPhase39ModulesCompleted(input),
    getPhase39LockHash(input),
  ].filter((item) => item !== "");
}

function buildDerivationHash(input: BuildPhase39AuditPackageInput): string {
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    auditAreaResults: getAuditAreaResults(input),
    phase39ModulesCompleted: getPhase39ModulesCompleted(input),
    phase39LockStatus: getPhase39LockStatus(input),
    phase39LockHash: getPhase39LockHash(input),
    derivationLineageIds: getDerivationLineageIds(input),
  });
}

function buildPhase39AuditPackageKey(input: BuildPhase39AuditPackageInput): string {
  return stableSnapshotHash({
    phase39LockStatus: getPhase39LockStatus(input),
    phase39LockHash: getPhase39LockHash(input),
    phase39ModulesCompleted: getPhase39ModulesCompleted(input),
    phase39ModuleCount: getPhase39ModulesCompleted(input).length,
    auditAreaResults: getAuditAreaResults(input),
    scope: input.scope ?? null,
    customerIsolation: input.customerIsolation ?? null,
    firmIsolation: input.firmIsolation ?? null,
    clientIsolation: input.clientIsolation ?? null,
  });
}

function buildPhase39AuditPackageId(input: BuildPhase39AuditPackageInput): string {
  return stableSnapshotHash({
    phase39AuditPackageKey: buildPhase39AuditPackageKey(input),
    artifactType: "SyntheticPhase39AuditPackage",
  });
}

function collectMissingRequiredIdentifiers(input: BuildPhase39AuditPackageInput): string[] {
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

  if (!hasValue(getPhase39ModulesCompleted(input).length)) {
    missing.push("phase39ModulesCompleted");
  }

  return missing;
}

function getWarnings(input: BuildPhase39AuditPackageInput): string[] {
  const auditAreaWarnings = getAuditAreaResults(input)
    .filter((result) => result.auditAreaStatus !== "PASS")
    .map((result) => `phase39AuditArea[${result.auditAreaNumber}]: ${result.auditAreaStatus}`);

  return [
    ...auditAreaWarnings,
    ...(input.phase39VerifierPassed === true ? [] : ["phase39VerifierPassed is false."]),
    ...(input.phase39TypeScriptPassed === true ? [] : ["phase39TypeScriptPassed is false."]),
    ...(input.allGovernanceMarkersPresent === true ? [] : ["allGovernanceMarkersPresent is false."]),
    ...(input.allIsolationFieldsSeparate === true ? [] : ["allIsolationFieldsSeparate is false."]),
    ...(input.allExecutableFalse === true ? [] : ["allExecutableFalse is false."]),
    ...(input.noBannedPatterns === true ? [] : ["noBannedPatterns is false."]),
    ...(input.phase38HandoffConsumed === true ? [] : ["phase38HandoffConsumed is false."]),
    ...getInputArray(input.warnings),
  ];
}

export function buildPhase39AuditPackage(input: BuildPhase39AuditPackageInput): BuildPhase39AuditPackageResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      phase39AuditPackage: null,
      skipped: true,
      warnings: [`missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const auditAreaResults = getAuditAreaResults(input);
  const phase39ModulesCompleted = getPhase39ModulesCompleted(input);
  const phase39LockStatus = getPhase39LockStatus(input);
  const phase39LockHash = getPhase39LockHash(input);
  const warnings = getWarnings(input);

  return {
    phase39AuditPackage: {
      phase39AuditPackageId: buildPhase39AuditPackageId(input),
      phase39AuditPackageKey: buildPhase39AuditPackageKey(input),
      auditAreaResults,
      phase39ModulesCompleted,
      phase39ModuleCount: phase39ModulesCompleted.length,
      phase39VerifierPassed: input.phase39VerifierPassed === true,
      phase39TypeScriptPassed: input.phase39TypeScriptPassed === true,
      allGovernanceMarkersPresent: input.allGovernanceMarkersPresent === true,
      allIsolationFieldsSeparate: input.allIsolationFieldsSeparate === true,
      allExecutableFalse: input.allExecutableFalse === true,
      noBannedPatterns: input.noBannedPatterns === true,
      phase38HandoffConsumed: input.phase38HandoffConsumed === true,
      phase39LockHash,
      phase39LockedAt: getPhase39LockedAt(input),
      phase39LockStatus,
      executable: false,
      executionReady: input.executionReady === true,
      scope: input.scope as SyntheticAuditScope,
      customerIsolation: input.customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: input.firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: input.clientIsolation as SyntheticMemoryObjectIsolationDimension,
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: getDerivationMethod(input),
      derivationHash: buildDerivationHash(input),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
