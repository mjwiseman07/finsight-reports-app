import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract } from "../contracts";

export const PHASE415_COMPLETED_MODULES = [
  "memory-reservation",
  "contracts",
  "framework-registry",
  "treatment-resolver",
  "framework-selector",
  "multi-framework",
  "currency-config",
  "framework-scoped-memory",
  "onboarding",
  "framework-change-governance",
  "consolidation",
  "libraries/us-gaap",
  "libraries/ifrs-for-smes",
  "libraries/full-ifrs",
  "differences-catalog",
  "conversion-engine",
  "reasonableness-checker",
  "currency-translation",
  "currency-tracking",
  "role-adapter",
  "disclosure-requirements",
] as const;

export const PHASE415_AUDIT_AREA_NAMES = [
  "All 21 Phase 41.5 module directories present with builder and index files across Waves 1-5",
  "Contract discipline: every module imports contract types only from 41.5B; no module outside contracts defines a *Contract type",
  "Deterministic stableSnapshotHash IDs throughout, imported only from lib/intelligence/core/hash",
  "Fail-closed on missing identifiers throughout",
  "executable literal false on every output",
  "customerIsolation, firmIsolation, clientIsolation separate everywhere; containsPHI present everywhere",
  "Memory framework-dimension reserved first (41.5A) before any framework-specific treatment memory; category split declared and enforced",
  "Framework registry fail-closed selection; non-active frameworks not selectable; no silent substitution",
  "Treatment resolver indirection; roles never reference framework content directly; fail-closed on non-active framework, unpopulated topic, unreviewed treatment",
  "Framework selector active-only; per-entity not per-company; immutable after onboarding lock; change requires governance",
  "Multi-framework per entity first-class; primary/secondary book segregation; framework-scoped retrieval required",
  "Functional/presentation currency separate; IAS 21 / ASC 830 translation rules; currency translation engine consumes config",
  "Framework-scoped memory discipline: retrieval requires framework, fail-closed when unspecified, cross-framework returns empty, never falls back; category class determines scope",
  "Onboarding per-entity framework capture; immutable governance audit entry; role activation gated on onboarding lock",
  "Framework change governance: governed event, multi-party approval, append-only immutable log, historical books immutable, applied only when approved",
  "Consolidation respects framework segregation; subsidiary knowledge never contaminates parent; conversion entries bridge frameworks",
  "Content libraries and Differences Catalog: builder never authors content; active requires per-treatment review attestation; containsCopyrightedText literal false; citation reference only; append-only history",
  "Conversion engine consumes Differences Catalog (never reimplements); human review before posting; framework-tagged; reversible",
  "Reasonableness checker observation-only; never asserts error; humans decide; material differences feed Phase 40F escalation",
  "Currency tracking: re-review flagging; no real-time currency claim; new treatment requires human review before active",
  "Role adapter: roles call resolver not hardcoded treatment; backward compatible for US GAAP; does not modify Phase 39 namespace",
  "Disclosure layer: framework-tagged never bleeds across frameworks; builder never authors; checklist generation deferred to Phase 45",
  "Verifier (41.5V) passes; TypeScript passes; framework segregation and four-entity topology tests pass",
  "Verifier red-team probe (13 poison cases) all rejected — verifier is a validated control, not pass-by-construction",
] as const;

export const PHASE415_CONTENT_CAVEAT =
  "This audit confirms the STRUCTURE of the standards layer: contracts, fail-closed discipline, segregation controls, attestation gates, and the verifier validated by red-team probe. It does NOT and cannot confirm that authored treatment CONTENT is correct. Treatments become active only when human-authored and attested per-treatment. US GAAP, IFRS for SMEs, and Full IFRS treatment content authorship and per-treatment attestation are the author's responsibility and proceed against this locked architecture. Customer-facing IFRS remains gated on authored+attested content, one real international entity validated, and Phase 42.5 baseline.";

export type Phase415CompletedModuleIdentifier = (typeof PHASE415_COMPLETED_MODULES)[number];

export type SyntheticPhase415AuditAreaName = (typeof PHASE415_AUDIT_AREA_NAMES)[number];

export type SyntheticPhase415AuditAreaStatus = "PASS" | "PARTIAL" | "FAIL";

export type SyntheticPhase415LockStatus = "locked" | "not_locked";

export interface SyntheticPhase415AuditAreaResult {
  auditAreaNumber: number;
  auditAreaName: SyntheticPhase415AuditAreaName;
  auditAreaStatus: SyntheticPhase415AuditAreaStatus;
  gaps: string[];
  evidenceReferenceIds: string[];
}

type Phase415AuditPackageBase = Omit<StandardsBaseContract, "reportingFramework">;

export interface BuildPhase415AuditPackageInput extends Partial<Phase415AuditPackageBase> {
  auditAreaResults?: SyntheticPhase415AuditAreaResult[];
  phase415ModulesCompleted?: Phase415CompletedModuleIdentifier[];
  phase415VerifierPassed?: boolean;
  phase415VerifierRedTeamProbePassed?: boolean;
  redTeamProbePoisonCasesRejected?: number;
  phase415TypeScriptPassed?: boolean;
  frameworkSegregationTestPassed?: boolean;
  fourEntityTopologyTestPassed?: boolean;
  allGuardrailMarkersPresent?: boolean;
  noReproducedStandardsText?: boolean;
  everyActiveTreatmentHasReviewAttestation?: boolean;
  memoryFrameworkDimensionReservedFirst?: boolean;
  phase40HandoffConsumed?: boolean;
  phase40_5HandoffConsumed?: boolean;
  phase39NamespaceUnmodified?: boolean;
  phase415LockedAt?: string;
  phase415AuditPackageComplete?: boolean;
}

export interface SyntheticPhase415AuditPackage extends Phase415AuditPackageBase {
  phase415AuditPackageId: string;
  phase415AuditPackageKey: string;
  auditAreaResults: SyntheticPhase415AuditAreaResult[];
  phase415ModulesCompleted: Phase415CompletedModuleIdentifier[];
  phase415ModuleCount: number;
  phase415VerifierPassed: boolean;
  phase415VerifierRedTeamProbePassed: boolean;
  redTeamProbePoisonCasesRejected: number;
  phase415TypeScriptPassed: boolean;
  frameworkSegregationTestPassed: boolean;
  fourEntityTopologyTestPassed: boolean;
  allGuardrailMarkersPresent: boolean;
  noReproducedStandardsText: boolean;
  everyActiveTreatmentHasReviewAttestation: boolean;
  memoryFrameworkDimensionReservedFirst: boolean;
  phase40HandoffConsumed: boolean;
  phase40_5HandoffConsumed: boolean;
  phase39NamespaceUnmodified: boolean;
  phase415LockHash: string;
  phase415LockedAt: string;
  phase415LockStatus: SyntheticPhase415LockStatus;
  phase415AuditPackageComplete: boolean;
  executable: false;
  executionReady: boolean;
}

export interface BuildPhase415AuditPackageResult {
  phase415AuditPackage: SyntheticPhase415AuditPackage | null;
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

function getDerivationMethod(input: BuildPhase415AuditPackageInput): StandardsBaseContract["derivationMethod"] {
  return input.derivationMethod ?? "handoff_metadata_preservation";
}

function getPhase415ModulesCompleted(input: BuildPhase415AuditPackageInput): Phase415CompletedModuleIdentifier[] {
  return input.phase415ModulesCompleted ?? [...PHASE415_COMPLETED_MODULES];
}

function getExpectedAuditAreaResult(
  input: BuildPhase415AuditPackageInput,
  auditAreaName: SyntheticPhase415AuditAreaName,
  areaIndex: number,
): SyntheticPhase415AuditAreaResult {
  const auditAreaNumber = areaIndex + 1;
  const result = getInputArray(input.auditAreaResults).find(
    (candidate) => candidate.auditAreaNumber === auditAreaNumber || candidate.auditAreaName === auditAreaName,
  );

  return (
    result ?? {
      auditAreaNumber,
      auditAreaName,
      auditAreaStatus: "FAIL",
      gaps: ["audit area result was not provided"],
      evidenceReferenceIds: [],
    }
  );
}

function getAuditAreaResults(input: BuildPhase415AuditPackageInput): SyntheticPhase415AuditAreaResult[] {
  return PHASE415_AUDIT_AREA_NAMES.map((auditAreaName, areaIndex) =>
    getExpectedAuditAreaResult(input, auditAreaName, areaIndex),
  );
}

function allAuditAreasPass(input: BuildPhase415AuditPackageInput): boolean {
  return getAuditAreaResults(input).every((result) => result.auditAreaStatus === "PASS");
}

function allLockBooleansPass(input: BuildPhase415AuditPackageInput): boolean {
  return (
    input.phase415VerifierPassed === true &&
    input.phase415VerifierRedTeamProbePassed === true &&
    input.redTeamProbePoisonCasesRejected === 13 &&
    input.phase415TypeScriptPassed === true &&
    input.frameworkSegregationTestPassed === true &&
    input.fourEntityTopologyTestPassed === true &&
    input.allGuardrailMarkersPresent === true &&
    input.noReproducedStandardsText === true &&
    input.everyActiveTreatmentHasReviewAttestation === true &&
    input.memoryFrameworkDimensionReservedFirst === true &&
    input.phase40HandoffConsumed === true &&
    input.phase40_5HandoffConsumed === true &&
    input.phase39NamespaceUnmodified === true
  );
}

function getPhase415LockStatus(input: BuildPhase415AuditPackageInput): SyntheticPhase415LockStatus {
  return allAuditAreasPass(input) && allLockBooleansPass(input) ? "locked" : "not_locked";
}

function getPhase415LockHash(input: BuildPhase415AuditPackageInput): string {
  if (getPhase415LockStatus(input) !== "locked") {
    return "";
  }

  return stableSnapshotHash({
    auditAreaResults: getAuditAreaResults(input),
    phase415ModulesCompleted: getPhase415ModulesCompleted(input),
    phase415ModuleCount: getPhase415ModulesCompleted(input).length,
    phase415VerifierPassed: input.phase415VerifierPassed === true,
    phase415VerifierRedTeamProbePassed: input.phase415VerifierRedTeamProbePassed === true,
    redTeamProbePoisonCasesRejected: input.redTeamProbePoisonCasesRejected ?? 0,
    phase415TypeScriptPassed: input.phase415TypeScriptPassed === true,
    frameworkSegregationTestPassed: input.frameworkSegregationTestPassed === true,
    fourEntityTopologyTestPassed: input.fourEntityTopologyTestPassed === true,
    allGuardrailMarkersPresent: input.allGuardrailMarkersPresent === true,
    noReproducedStandardsText: input.noReproducedStandardsText === true,
    everyActiveTreatmentHasReviewAttestation: input.everyActiveTreatmentHasReviewAttestation === true,
    memoryFrameworkDimensionReservedFirst: input.memoryFrameworkDimensionReservedFirst === true,
    phase40HandoffConsumed: input.phase40HandoffConsumed === true,
    phase40_5HandoffConsumed: input.phase40_5HandoffConsumed === true,
    phase39NamespaceUnmodified: input.phase39NamespaceUnmodified === true,
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
  });
}

function getPhase415LockedAt(input: BuildPhase415AuditPackageInput): string {
  if (getPhase415LockStatus(input) !== "locked") {
    return "";
  }

  return input.phase415LockedAt ?? `deterministic-phase415-lock:${getPhase415LockHash(input)}`;
}

function getSharedBase(input: Partial<Phase415AuditPackageBase>): Phase415AuditPackageBase {
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
    derivationMethod: getDerivationMethod(input),
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
  } as Phase415AuditPackageBase;
}

function getDerivationLineageIds(input: BuildPhase415AuditPackageInput): string[] {
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getPhase415ModulesCompleted(input),
    input.boundPhase40SnapshotHash ?? "",
    input.boundPhase40_5SnapshotHash ?? "",
    input.boundPhase39SnapshotHash ?? "",
    input.boundPhase38SnapshotHash ?? "",
    getPhase415LockHash(input),
  ].filter((item) => item !== "");
}

function buildDerivationHash(input: BuildPhase415AuditPackageInput): string {
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    auditAreaResults: getAuditAreaResults(input),
    phase415ModulesCompleted: getPhase415ModulesCompleted(input),
    phase415LockStatus: getPhase415LockStatus(input),
    phase415LockHash: getPhase415LockHash(input),
    derivationLineageIds: getDerivationLineageIds(input),
  });
}

function buildPhase415AuditPackageKey(input: BuildPhase415AuditPackageInput): string {
  return stableSnapshotHash({
    phase415LockStatus: getPhase415LockStatus(input),
    phase415LockHash: getPhase415LockHash(input),
    phase415ModulesCompleted: getPhase415ModulesCompleted(input),
    phase415ModuleCount: getPhase415ModulesCompleted(input).length,
    auditAreaResults: getAuditAreaResults(input),
    scope: input.scope ?? null,
    customerIsolation: input.customerIsolation ?? null,
    firmIsolation: input.firmIsolation ?? null,
    clientIsolation: input.clientIsolation ?? null,
  });
}

function buildPhase415AuditPackageId(input: BuildPhase415AuditPackageInput): string {
  return stableSnapshotHash({
    phase415AuditPackageKey: buildPhase415AuditPackageKey(input),
    artifactType: "SyntheticPhase415AuditPackage",
  });
}

function collectMissingRequiredIdentifiers(input: BuildPhase415AuditPackageInput): string[] {
  const missing: string[] = [];

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

  if (getPhase415ModulesCompleted(input).length !== PHASE415_COMPLETED_MODULES.length) {
    missing.push("all 21 phase415ModulesCompleted");
  }

  if (!getInputArray(input.auditAreaResults).length) {
    missing.push("auditAreaResults");
  }

  return missing;
}

function getWarnings(input: BuildPhase415AuditPackageInput): string[] {
  const auditAreaWarnings = getAuditAreaResults(input)
    .filter((result) => result.auditAreaStatus !== "PASS")
    .map((result) => `phase415AuditArea[${result.auditAreaNumber}]: ${result.auditAreaStatus}`);

  const lockWarnings = [
    ...(input.phase415VerifierPassed === true ? [] : ["phase415VerifierPassed is false."]),
    ...(input.phase415VerifierRedTeamProbePassed === true ? [] : ["phase415VerifierRedTeamProbePassed is false."]),
    ...(input.redTeamProbePoisonCasesRejected === 13 ? [] : ["redTeamProbePoisonCasesRejected is not 13."]),
    ...(input.phase415TypeScriptPassed === true ? [] : ["phase415TypeScriptPassed is false."]),
    ...(input.frameworkSegregationTestPassed === true ? [] : ["frameworkSegregationTestPassed is false."]),
    ...(input.fourEntityTopologyTestPassed === true ? [] : ["fourEntityTopologyTestPassed is false."]),
    ...(input.allGuardrailMarkersPresent === true ? [] : ["allGuardrailMarkersPresent is false."]),
    ...(input.noReproducedStandardsText === true ? [] : ["noReproducedStandardsText is false."]),
    ...(input.everyActiveTreatmentHasReviewAttestation === true
      ? []
      : ["everyActiveTreatmentHasReviewAttestation is false."]),
    ...(input.memoryFrameworkDimensionReservedFirst === true ? [] : ["memoryFrameworkDimensionReservedFirst is false."]),
    ...(input.phase40HandoffConsumed === true ? [] : ["phase40HandoffConsumed is false."]),
    ...(input.phase40_5HandoffConsumed === true ? [] : ["phase40_5HandoffConsumed is false."]),
    ...(input.phase39NamespaceUnmodified === true ? [] : ["phase39NamespaceUnmodified is false."]),
  ];

  const contentCaveat =
    getPhase415LockStatus(input) === "locked" ? [PHASE415_CONTENT_CAVEAT] : [];

  return [...auditAreaWarnings, ...lockWarnings, ...contentCaveat, ...getInputArray(input.warnings)];
}

export function buildPhase415AuditPackage(input: BuildPhase415AuditPackageInput): BuildPhase415AuditPackageResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      phase415AuditPackage: null,
      skipped: true,
      warnings: [`missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const base = getSharedBase(input);
  const auditAreaResults = getAuditAreaResults(input);
  const phase415ModulesCompleted = getPhase415ModulesCompleted(input);
  const phase415LockStatus = getPhase415LockStatus(input);
  const phase415LockHash = getPhase415LockHash(input);
  const warnings = getWarnings(input);

  return {
    phase415AuditPackage: {
      ...base,
      phase415AuditPackageId: buildPhase415AuditPackageId(input),
      phase415AuditPackageKey: buildPhase415AuditPackageKey(input),
      auditAreaResults,
      phase415ModulesCompleted,
      phase415ModuleCount: phase415ModulesCompleted.length,
      phase415VerifierPassed: input.phase415VerifierPassed === true,
      phase415VerifierRedTeamProbePassed: input.phase415VerifierRedTeamProbePassed === true,
      redTeamProbePoisonCasesRejected: input.redTeamProbePoisonCasesRejected ?? 0,
      phase415TypeScriptPassed: input.phase415TypeScriptPassed === true,
      frameworkSegregationTestPassed: input.frameworkSegregationTestPassed === true,
      fourEntityTopologyTestPassed: input.fourEntityTopologyTestPassed === true,
      allGuardrailMarkersPresent: input.allGuardrailMarkersPresent === true,
      noReproducedStandardsText: input.noReproducedStandardsText === true,
      everyActiveTreatmentHasReviewAttestation: input.everyActiveTreatmentHasReviewAttestation === true,
      memoryFrameworkDimensionReservedFirst: input.memoryFrameworkDimensionReservedFirst === true,
      phase40HandoffConsumed: input.phase40HandoffConsumed === true,
      phase40_5HandoffConsumed: input.phase40_5HandoffConsumed === true,
      phase39NamespaceUnmodified: input.phase39NamespaceUnmodified === true,
      phase415LockHash,
      phase415LockedAt: getPhase415LockedAt(input),
      phase415LockStatus,
      phase415AuditPackageComplete: input.phase415AuditPackageComplete === true,
      executable: false,
      executionReady: input.executionReady === true,
      derivationLineageIds: getDerivationLineageIds(input),
      derivationHash: buildDerivationHash(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
