import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticPayrollTaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "review_needed"
  | "complete";

export type SyntheticPayrollCommandCenterPersona = "controller" | "cfo" | "manager";

export interface BuildPayrollCommandCenterPackageInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  period?: string;
  payrollTaskReferenceIds?: string[];
  payrollTaskStatusMap?: Record<string, SyntheticPayrollTaskStatus>;
  approvalReferenceIds?: string[];
  approvalsNeedingHumanDecisionReferenceIds?: string[];
  deadlineReferenceIds?: string[];
  deadlineRiskReferenceIds?: string[];
  escalationReferenceIds?: string[];
  consumedPayrollIntelligenceReferenceIds?: string[];
  consumedFteIntelligenceReferenceIds?: string[];
  itemsRequiringHumanDecisionReferenceIds?: string[];
  itemsRequiringHumanDecisionCount?: number;
  payrollCloseStatusSummary?: string;
  surfacedToPersonas?: SyntheticPayrollCommandCenterPersona[];
  packageKeyTuple?: string;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  payrollCommandCenterPackageComplete?: boolean;
}

export interface SyntheticPayrollCommandCenterPackage
  extends SyntheticPhase39RoleHandoffConsumptionContract {
  payrollCommandCenterPackageId: string;
  payrollCommandCenterPackageKey: string;
  organizationalUnitId: string;
  period: string;
  payrollTaskReferenceIds: string[];
  payrollTaskStatusMap: Record<string, SyntheticPayrollTaskStatus>;
  approvalReferenceIds: string[];
  approvalsNeedingHumanDecisionReferenceIds: string[];
  deadlineReferenceIds: string[];
  deadlineRiskReferenceIds: string[];
  escalationReferenceIds: string[];
  consumedPayrollIntelligenceReferenceIds: string[];
  consumedFteIntelligenceReferenceIds: string[];
  itemsRequiringHumanDecisionReferenceIds: string[];
  itemsRequiringHumanDecisionCount: number;
  payrollCloseStatusSummary: string;
  surfacedToPersonas: SyntheticPayrollCommandCenterPersona[];
  packageKeyTuple: string;
  updateInPlace: true;
  noDuplicateOnRerun: true;
  noTimestampInHashInputs: true;
  containsSensitivePersonalData: true;
  noAutonomousPayrollRun: true;
  noAutonomousPaymentAuthorization: true;
  payrollApprovalRequiresHuman: true;
  inputSnapshotHash: string;
  isStale: boolean;
  containsPHI: boolean;
  payrollCommandCenterPackageComplete: boolean;
}

export interface BuildPayrollCommandCenterPackageResult {
  payrollCommandCenterPackage: SyntheticPayrollCommandCenterPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getInputRecord<T>(value: Record<string, T> | undefined): Record<string, T> {
  return value ?? {};
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getItemsRequiringHumanDecisionCount(input: BuildPayrollCommandCenterPackageInput): number {
  return input.itemsRequiringHumanDecisionCount ?? getInputArray(input.itemsRequiringHumanDecisionReferenceIds).length;
}

function getSharedBase(
  input: Partial<SyntheticOrganizationBaseContract>,
  parent: Partial<SyntheticOrganizationBaseContract>,
): SyntheticOrganizationBaseContract {
  return {
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? parent.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? parent.boundPhase38SnapshotHash ?? "",
    phase40StaleMarker: input.phase40StaleMarker ?? parent.phase40StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope ?? parent.scope,
    customerIsolation: input.customerIsolation ?? parent.customerIsolation,
    firmIsolation: input.firmIsolation ?? parent.firmIsolation,
    clientIsolation: input.clientIsolation ?? parent.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI ?? parent.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds ?? parent.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? parent.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata ?? parent.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(
      input.sourceConfidenceReferenceIds ?? parent.sourceConfidenceReferenceIds,
    ),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds ?? parent.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds ?? parent.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata ?? parent.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata ?? parent.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata ?? parent.governanceMetadata),
    warnings: getInputArray(input.warnings ?? parent.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes ?? parent.skippedIndexes),
  } as SyntheticOrganizationBaseContract;
}

function getPhase39HandoffBase(
  input: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
  parent: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
): SyntheticPhase39RoleHandoffConsumptionContract {
  return {
    ...getSharedBase(input, parent),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? parent.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(
      input.phase39RoleInstanceReferenceIds ?? parent.phase39RoleInstanceReferenceIds,
    ),
  };
}

function getInputSnapshotHash(input: BuildPayrollCommandCenterPackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      period: input.period ?? "",
      payrollTaskReferenceIds: getInputArray(input.payrollTaskReferenceIds),
      payrollTaskStatusMap: getInputRecord(input.payrollTaskStatusMap),
      approvalReferenceIds: getInputArray(input.approvalReferenceIds),
      approvalsNeedingHumanDecisionReferenceIds: getInputArray(
        input.approvalsNeedingHumanDecisionReferenceIds,
      ),
      deadlineReferenceIds: getInputArray(input.deadlineReferenceIds),
      deadlineRiskReferenceIds: getInputArray(input.deadlineRiskReferenceIds),
      escalationReferenceIds: getInputArray(input.escalationReferenceIds),
      consumedPayrollIntelligenceReferenceIds: getInputArray(input.consumedPayrollIntelligenceReferenceIds),
      consumedFteIntelligenceReferenceIds: getInputArray(input.consumedFteIntelligenceReferenceIds),
      itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
      itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
      payrollCloseStatusSummary: input.payrollCloseStatusSummary ?? "",
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      containsSensitivePersonalData: true,
      noAutonomousPayrollRun: true,
      noAutonomousPaymentAuthorization: true,
      payrollApprovalRequiresHuman: true,
      noTimestampInHashInputs: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildPayrollCommandCenterPackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function getPackageKeyTuple(input: BuildPayrollCommandCenterPackageInput): string {
  return input.packageKeyTuple ?? `${input.period ?? ""}_${input.organizationalUnitId ?? ""}_${getInputSnapshotHash(input)}`;
}

function collectMissingRequiredIdentifiers(input: BuildPayrollCommandCenterPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.period)) {
    missing.push("period");
  }

  if (!hasValue(input.phase39RoleHandoffHandle)) {
    missing.push("phase39RoleHandoffHandle");
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

function buildPayrollCommandCenterPackageDerivationHash(
  input: BuildPayrollCommandCenterPackageInput,
): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    period: input.period ?? "",
    payrollTaskReferenceIds: getInputArray(input.payrollTaskReferenceIds),
    payrollTaskStatusMap: getInputRecord(input.payrollTaskStatusMap),
    approvalReferenceIds: getInputArray(input.approvalReferenceIds),
    approvalsNeedingHumanDecisionReferenceIds: getInputArray(
      input.approvalsNeedingHumanDecisionReferenceIds,
    ),
    deadlineReferenceIds: getInputArray(input.deadlineReferenceIds),
    deadlineRiskReferenceIds: getInputArray(input.deadlineRiskReferenceIds),
    escalationReferenceIds: getInputArray(input.escalationReferenceIds),
    consumedPayrollIntelligenceReferenceIds: getInputArray(input.consumedPayrollIntelligenceReferenceIds),
    consumedFteIntelligenceReferenceIds: getInputArray(input.consumedFteIntelligenceReferenceIds),
    itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
    itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
    payrollCloseStatusSummary: input.payrollCloseStatusSummary ?? "",
    surfacedToPersonas: getInputArray(input.surfacedToPersonas),
    packageKeyTuple: getPackageKeyTuple(input),
    updateInPlace: true,
    noDuplicateOnRerun: true,
    noTimestampInHashInputs: true,
    containsSensitivePersonalData: true,
    noAutonomousPayrollRun: true,
    noAutonomousPaymentAuthorization: true,
    payrollApprovalRequiresHuman: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    payrollCommandCenterPackageComplete: input.payrollCommandCenterPackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildPayrollCommandCenterPackage(
  input: BuildPayrollCommandCenterPackageInput,
): BuildPayrollCommandCenterPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      payrollCommandCenterPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const period = input.period as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const packageKeyTuple = getPackageKeyTuple(input);
  const derivationHash = buildPayrollCommandCenterPackageDerivationHash(input);
  const payrollCommandCenterPackageKey = stableSnapshotHash({
    period,
    organizationalUnitId,
    inputSnapshotHash,
    packageKeyTuple,
    noTimestampInHashInputs: true,
    containsSensitivePersonalData: true,
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );

  return {
    payrollCommandCenterPackage: {
      ...base,
      payrollCommandCenterPackageId: stableSnapshotHash({
        payrollCommandCenterPackageKey,
        artifactType: "SyntheticPayrollCommandCenterPackage",
      }),
      payrollCommandCenterPackageKey,
      organizationalUnitId,
      period,
      payrollTaskReferenceIds: getInputArray(input.payrollTaskReferenceIds),
      payrollTaskStatusMap: getInputRecord(input.payrollTaskStatusMap),
      approvalReferenceIds: getInputArray(input.approvalReferenceIds),
      approvalsNeedingHumanDecisionReferenceIds: getInputArray(
        input.approvalsNeedingHumanDecisionReferenceIds,
      ),
      deadlineReferenceIds: getInputArray(input.deadlineReferenceIds),
      deadlineRiskReferenceIds: getInputArray(input.deadlineRiskReferenceIds),
      escalationReferenceIds: getInputArray(input.escalationReferenceIds),
      consumedPayrollIntelligenceReferenceIds: getInputArray(input.consumedPayrollIntelligenceReferenceIds),
      consumedFteIntelligenceReferenceIds: getInputArray(input.consumedFteIntelligenceReferenceIds),
      itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
      itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
      payrollCloseStatusSummary: input.payrollCloseStatusSummary ?? "",
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      packageKeyTuple,
      updateInPlace: true,
      noDuplicateOnRerun: true,
      noTimestampInHashInputs: true,
      containsSensitivePersonalData: true,
      noAutonomousPayrollRun: true,
      noAutonomousPaymentAuthorization: true,
      payrollApprovalRequiresHuman: true,
      inputSnapshotHash,
      isStale,
      containsPHI,
      payrollCommandCenterPackageComplete: input.payrollCommandCenterPackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
