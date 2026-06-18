import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export type Phase405AuditAreaStatus = "PASS" | "PARTIAL" | "FAIL";

export type Phase405LockStatus = "locked" | "not_locked";

export interface Phase405AuditAreaResult {
  areaNumber: number;
  areaName: string;
  status: Phase405AuditAreaStatus;
  evidenceReferenceIds: string[];
  gaps: string[];
}

export interface BuildPhase405AuditPackageInput extends Partial<IntegrationBaseContract> {
  phase405ModulesCompleted?: string[];
  phase405ModuleCount?: number;
  auditAreaResults?: Phase405AuditAreaResult[];
  phase405VerifierPassed?: boolean;
  phase405TypeScriptPassed?: boolean;
  crossIsolationTestPassed?: boolean;
  allGuardrailMarkersPresent?: boolean;
  everyConnectorProducesActivityEntry?: boolean;
  everyConnectorStartsReadOnly?: boolean;
  writeModeOffByDefaultEverywhere?: boolean;
  credentialNeverInClearFormAnywhere?: boolean;
  phase40HandoffConsumed?: boolean;
  phase405LockedAt?: string;
  phase405AuditPackageComplete?: boolean;
}

export interface SyntheticPhase405AuditPackage extends IntegrationBaseContract {
  phase405AuditPackageId: string;
  phase405AuditPackageKey: string;
  auditAreaResults: Phase405AuditAreaResult[];
  phase405ModulesCompleted: string[];
  phase405ModuleCount: number;
  phase405VerifierPassed: boolean;
  phase405TypeScriptPassed: boolean;
  crossIsolationTestPassed: boolean;
  allGuardrailMarkersPresent: boolean;
  everyConnectorProducesActivityEntry: boolean;
  everyConnectorStartsReadOnly: boolean;
  writeModeOffByDefaultEverywhere: boolean;
  credentialNeverInClearFormAnywhere: boolean;
  phase40HandoffConsumed: boolean;
  phase405LockHash: string;
  phase405LockedAt: string;
  phase405LockStatus: Phase405LockStatus;
  phase405AuditPackageComplete: boolean;
}

export interface BuildPhase405AuditPackageResult {
  phase405AuditPackage: SyntheticPhase405AuditPackage | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE405_EXPECTED_MODULE_COUNT = 28;

export const PHASE405_FINAL_AUDIT_AREAS: ReadonlyArray<Pick<Phase405AuditAreaResult, "areaNumber" | "areaName">> = [
  {
    areaNumber: 1,
    areaName: "All 28 Phase 40.5 module directories present with builder and index files across Waves 1-4.5",
  },
  {
    areaNumber: 2,
    areaName:
      "Contract discipline: every module imports contract types only from 40.5A; no module outside contracts defines a Contract type",
  },
  {
    areaNumber: 3,
    areaName: "Deterministic stableSnapshotHash IDs throughout, imported only from lib/intelligence/core/hash",
  },
  {
    areaNumber: 4,
    areaName: "Fail-closed on missing identifiers throughout",
  },
  {
    areaNumber: 5,
    areaName: "executable literal false on every output",
  },
  {
    areaNumber: 6,
    areaName:
      "customerIsolation, firmIsolation, clientIsolation separate everywhere; containsPHI present everywhere; two-tier tenancy where applicable",
  },
  {
    areaNumber: 7,
    areaName: "Every newly-connected integration starts read-only; write mode off by default everywhere",
  },
  {
    areaNumber: 8,
    areaName:
      "Inbound data classification fail-closed to high sensitivity present on classification module and applied across connectors",
  },
  {
    areaNumber: 9,
    areaName:
      "Connector activity audit trail append-only/immutable; write entries require human approval and a linked recommendation audit entry",
  },
  {
    areaNumber: 10,
    areaName: "OAuth token lifecycle: token-by-handle, never plaintext, never logged, refresh fail-closed with escalation",
  },
  {
    areaNumber: 11,
    areaName: "Webhook signature verification fail-closed; per-tenant endpoints; untrusted-input gating",
  },
  {
    areaNumber: 12,
    areaName:
      "Sync state missed-sync escalation; cross-connector reconciliation requires human review, never silently resolved",
  },
  {
    areaNumber: 13,
    areaName:
      "Credential isolation: handle-only, no credential values, encrypted-at-rest, firm and client isolation, authorization required, vault never in repo",
  },
  {
    areaNumber: 14,
    areaName: "Connector framework: write off by default, capability fail-closed, per-tenant rate quota, sandbox cannot write",
  },
  {
    areaNumber: 15,
    areaName:
      "ERP connectors reuse Phase 39 adapters and carry sign-aware classification and posts-as-draft markers; Xero carries overdraft/sign-aware markers",
  },
  {
    areaNumber: 16,
    areaName:
      "Payments, HRIS/payroll, banking, CRM, and EDI safety guardrails are present and fail-closed",
  },
  {
    areaNumber: 17,
    areaName:
      "File-based and secure upload integrity verification, malformed/unverified fail-closed handling, per-tenant channels, and Phase 39 canonical schema reuse",
  },
  {
    areaNumber: 18,
    areaName: "Phase 40 handoff consumed; verifier and TypeScript both pass; cross-isolation test passes",
  },
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getSharedBase(input: Partial<IntegrationBaseContract>): IntegrationBaseContract {
  return {
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase405StaleMarker: input.phase405StaleMarker ?? "current",
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
  } as IntegrationBaseContract;
}

function normalizeAuditAreaResults(auditAreaResults: Phase405AuditAreaResult[] | undefined): Phase405AuditAreaResult[] {
  return PHASE405_FINAL_AUDIT_AREAS.map((area) => {
    const providedArea = auditAreaResults?.find((result) => result.areaNumber === area.areaNumber);

    return {
      areaNumber: area.areaNumber,
      areaName: providedArea?.areaName ?? area.areaName,
      status: providedArea?.status ?? "FAIL",
      evidenceReferenceIds: getInputArray(providedArea?.evidenceReferenceIds),
      gaps: getInputArray(providedArea?.gaps),
    };
  });
}

function areAllAreasPassed(auditAreaResults: Phase405AuditAreaResult[]): boolean {
  return (
    auditAreaResults.length === PHASE405_FINAL_AUDIT_AREAS.length &&
    auditAreaResults.every((areaResult) => areaResult.status === "PASS")
  );
}

function areAllLockGatesPassed(input: BuildPhase405AuditPackageInput): boolean {
  return (
    input.phase405VerifierPassed === true &&
    input.phase405TypeScriptPassed === true &&
    input.crossIsolationTestPassed === true &&
    input.allGuardrailMarkersPresent === true &&
    input.everyConnectorProducesActivityEntry === true &&
    input.everyConnectorStartsReadOnly === true &&
    input.writeModeOffByDefaultEverywhere === true &&
    input.credentialNeverInClearFormAnywhere === true &&
    input.phase40HandoffConsumed === true &&
    input.phase405ModuleCount === PHASE405_EXPECTED_MODULE_COUNT
  );
}

function getPhase405LockStatus(
  input: BuildPhase405AuditPackageInput,
  auditAreaResults: Phase405AuditAreaResult[],
): Phase405LockStatus {
  return areAllAreasPassed(auditAreaResults) && areAllLockGatesPassed(input) && hasValue(input.phase405LockedAt)
    ? "locked"
    : "not_locked";
}

function buildPhase405AuditPackageKey(input: BuildPhase405AuditPackageInput): string {
  return stableSnapshotHash({
    phase405ModulesCompleted: getInputArray(input.phase405ModulesCompleted),
    phase405ModuleCount: input.phase405ModuleCount ?? 0,
    auditAreaResults: normalizeAuditAreaResults(input.auditAreaResults),
    phase405VerifierPassed: input.phase405VerifierPassed === true,
    phase405TypeScriptPassed: input.phase405TypeScriptPassed === true,
    crossIsolationTestPassed: input.crossIsolationTestPassed === true,
    allGuardrailMarkersPresent: input.allGuardrailMarkersPresent === true,
    everyConnectorProducesActivityEntry: input.everyConnectorProducesActivityEntry === true,
    everyConnectorStartsReadOnly: input.everyConnectorStartsReadOnly === true,
    writeModeOffByDefaultEverywhere: input.writeModeOffByDefaultEverywhere === true,
    credentialNeverInClearFormAnywhere: input.credentialNeverInClearFormAnywhere === true,
    phase40HandoffConsumed: input.phase40HandoffConsumed === true,
    phase405LockedAt: input.phase405LockedAt ?? "",
  });
}

function buildPhase405LockHash(
  input: BuildPhase405AuditPackageInput,
  auditAreaResults: Phase405AuditAreaResult[],
): string {
  return stableSnapshotHash({
    phase405AuditPackageKey: buildPhase405AuditPackageKey(input),
    auditAreaResults,
    lockStatus: "locked",
    phase405LockedAt: input.phase405LockedAt ?? "",
  });
}

function buildPhase405AuditPackageId(input: BuildPhase405AuditPackageInput): string {
  return `synthetic-phase405-audit-package:${stableSnapshotHash({
    phase405AuditPackageKey: buildPhase405AuditPackageKey(input),
    artifactType: "SyntheticPhase405AuditPackage",
  })}`;
}

function buildDerivationHash(
  input: BuildPhase405AuditPackageInput,
  auditAreaResults: Phase405AuditAreaResult[],
  phase405LockStatus: Phase405LockStatus,
): string {
  return stableSnapshotHash({
    phase405AuditPackageKey: buildPhase405AuditPackageKey(input),
    auditAreaResults,
    phase405ModulesCompleted: getInputArray(input.phase405ModulesCompleted),
    phase405ModuleCount: input.phase405ModuleCount ?? 0,
    phase405VerifierPassed: input.phase405VerifierPassed === true,
    phase405TypeScriptPassed: input.phase405TypeScriptPassed === true,
    crossIsolationTestPassed: input.crossIsolationTestPassed === true,
    allGuardrailMarkersPresent: input.allGuardrailMarkersPresent === true,
    everyConnectorProducesActivityEntry: input.everyConnectorProducesActivityEntry === true,
    everyConnectorStartsReadOnly: input.everyConnectorStartsReadOnly === true,
    writeModeOffByDefaultEverywhere: input.writeModeOffByDefaultEverywhere === true,
    credentialNeverInClearFormAnywhere: input.credentialNeverInClearFormAnywhere === true,
    phase40HandoffConsumed: input.phase40HandoffConsumed === true,
    phase405LockStatus,
    phase405LockedAt: input.phase405LockedAt ?? "",
  });
}

function collectMissingRequiredIdentifiers(input: BuildPhase405AuditPackageInput): string[] {
  const missing: string[] = [];

  if (getInputArray(input.phase405ModulesCompleted).length === 0) {
    missing.push("phase405ModulesCompleted");
  }

  if (input.phase405ModuleCount === undefined) {
    missing.push("phase405ModuleCount");
  }

  if (getInputArray(input.auditAreaResults).length !== PHASE405_FINAL_AUDIT_AREAS.length) {
    missing.push("auditAreaResults");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
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

function getWarnings(
  input: BuildPhase405AuditPackageInput,
  auditAreaResults: Phase405AuditAreaResult[],
  phase405LockStatus: Phase405LockStatus,
): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(input.phase405ModuleCount !== PHASE405_EXPECTED_MODULE_COUNT
      ? [`phase405ModuleCount must equal ${PHASE405_EXPECTED_MODULE_COUNT} to lock Phase 40.5`]
      : []),
    ...auditAreaResults
      .filter((areaResult) => areaResult.status !== "PASS")
      .map((areaResult) => `area ${areaResult.areaNumber} is ${areaResult.status}`),
    ...(phase405LockStatus === "not_locked" ? ["Phase 40.5 remains not locked until all 18 areas pass"] : []),
    ...(phase405LockStatus === "not_locked" && !hasValue(input.phase405LockedAt)
      ? ["phase405LockedAt is required before recording a locked audit package"]
      : []),
  ];
}

export function buildPhase405AuditPackage(
  input: BuildPhase405AuditPackageInput,
): BuildPhase405AuditPackageResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      phase405AuditPackage: null,
      skipped: true,
      warnings: [`missing required audit package identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const auditAreaResults = normalizeAuditAreaResults(input.auditAreaResults);
  const phase405LockStatus = getPhase405LockStatus(input, auditAreaResults);
  const base = getSharedBase(input);
  const phase405AuditPackage: SyntheticPhase405AuditPackage = {
    ...base,
    phase405AuditPackageId: buildPhase405AuditPackageId(input),
    phase405AuditPackageKey: buildPhase405AuditPackageKey(input),
    auditAreaResults,
    phase405ModulesCompleted: getInputArray(input.phase405ModulesCompleted),
    phase405ModuleCount: input.phase405ModuleCount ?? 0,
    phase405VerifierPassed: input.phase405VerifierPassed === true,
    phase405TypeScriptPassed: input.phase405TypeScriptPassed === true,
    crossIsolationTestPassed: input.crossIsolationTestPassed === true,
    allGuardrailMarkersPresent: input.allGuardrailMarkersPresent === true,
    everyConnectorProducesActivityEntry: input.everyConnectorProducesActivityEntry === true,
    everyConnectorStartsReadOnly: input.everyConnectorStartsReadOnly === true,
    writeModeOffByDefaultEverywhere: input.writeModeOffByDefaultEverywhere === true,
    credentialNeverInClearFormAnywhere: input.credentialNeverInClearFormAnywhere === true,
    phase40HandoffConsumed: input.phase40HandoffConsumed === true,
    phase405LockHash: phase405LockStatus === "locked" ? buildPhase405LockHash(input, auditAreaResults) : "",
    phase405LockedAt: phase405LockStatus === "locked" ? input.phase405LockedAt ?? "" : "",
    phase405LockStatus,
    executable: false,
    executionReady: input.executionReady === true && phase405LockStatus === "locked",
    derivationHash: buildDerivationHash(input, auditAreaResults, phase405LockStatus),
    warnings: getWarnings(input, auditAreaResults, phase405LockStatus),
    phase405AuditPackageComplete: input.phase405AuditPackageComplete === true && phase405LockStatus === "locked",
  };

  return {
    phase405AuditPackage,
    skipped: false,
    warnings: phase405AuditPackage.warnings,
  };
}
