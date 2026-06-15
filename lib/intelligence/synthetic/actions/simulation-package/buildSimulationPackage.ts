import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticPhase38StaleMarker,
  SyntheticSimulationPackageContract,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticExecutionReadiness } from "../execution-readiness";

export interface BuildSimulationPackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  executionReadinessPackages?: SyntheticExecutionReadiness[];
  simulatedActionCandidateIds?: string[];
  simulatedWorkflowCandidateIds?: string[];
  simulationLineageIds?: string[];
  simulationEvidenceReferenceIds?: string[];
  simulationKnowledgeReferenceIds?: string[];
  simulationMethodologyReferenceIds?: string[];
  simulationInputReferenceIds?: string[];
  simulationAssumptionReferenceIds?: string[];
  simulationOutputReferenceIds?: string[];
  boundPhase37SnapshotHash?: string;
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  derivationHash?: string;
  skippedIndexes?: number[];
}

export interface SyntheticSimulationPackage extends SyntheticSimulationPackageContract {
  simulationPackageId: string;
  simulationPackageKey: string;
}

export interface BuildSimulationPackageResult {
  simulationPackage: SyntheticSimulationPackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function getPhase37Handoff(input: BuildSimulationPackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildSimulationPackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildSimulationPackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getExecutionReadinessPackages(input: BuildSimulationPackageInput): SyntheticExecutionReadiness[] {
  return getInputArray(input.executionReadinessPackages);
}

function getSimulatedActionCandidateIds(input: BuildSimulationPackageInput): string[] {
  return [
    ...getInputArray(input.simulatedActionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.actionCandidateIds),
  ];
}

function getSimulatedWorkflowCandidateIds(input: BuildSimulationPackageInput): string[] {
  return [
    ...getInputArray(input.simulatedWorkflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.workflowCandidateIds),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildSimulationPackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildSimulationPackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getSimulationLineageIds(input: BuildSimulationPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.simulationLineageIds),
    ...getSimulatedActionCandidateIds(input),
    ...getSimulatedWorkflowCandidateIds(input),
    ...getExecutionReadinessPackages(input).map((executionReadiness) => executionReadiness.executionReadinessId),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getSimulationEvidenceReferenceIds(input: BuildSimulationPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.simulationEvidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness) => executionReadiness.evidenceReferenceIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getSimulationKnowledgeReferenceIds(input: BuildSimulationPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.simulationKnowledgeReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
  ];
}

function getSimulationMethodologyReferenceIds(input: BuildSimulationPackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.simulationMethodologyReferenceIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
  ];
}

function getSimulationInputReferenceIds(input: BuildSimulationPackageInput): string[] {
  return [
    ...getInputArray(input.simulationInputReferenceIds),
    ...getSimulatedActionCandidateIds(input),
    ...getSimulatedWorkflowCandidateIds(input),
    ...getExecutionReadinessPackages(input).map((executionReadiness) => executionReadiness.executionReadinessId),
  ];
}

function buildSimulationDeterminismHash(input: BuildSimulationPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    simulatedActionCandidateIds: getSimulatedActionCandidateIds(input),
    simulatedWorkflowCandidateIds: getSimulatedWorkflowCandidateIds(input),
    simulationLineageIds: getSimulationLineageIds(input),
    simulationEvidenceReferenceIds: getSimulationEvidenceReferenceIds(input),
    simulationKnowledgeReferenceIds: getSimulationKnowledgeReferenceIds(input),
    simulationMethodologyReferenceIds: getSimulationMethodologyReferenceIds(input),
    simulationInputReferenceIds: getSimulationInputReferenceIds(input),
    simulationAssumptionReferenceIds: getInputArray(input.simulationAssumptionReferenceIds),
    simulationOutputReferenceIds: getInputArray(input.simulationOutputReferenceIds),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
  });
}

function buildDerivationHash(input: BuildSimulationPackageInput): string {
  return input.derivationHash ?? stableSnapshotHash({
    simulationDeterminismHash: buildSimulationDeterminismHash(input),
    simulationInputReferenceIds: getSimulationInputReferenceIds(input),
    simulationAssumptionReferenceIds: getInputArray(input.simulationAssumptionReferenceIds),
    simulationOutputReferenceIds: getInputArray(input.simulationOutputReferenceIds),
  });
}

function buildSimulationPackageKey(input: BuildSimulationPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    simulatedActionCandidateIds: getSimulatedActionCandidateIds(input),
    simulatedWorkflowCandidateIds: getSimulatedWorkflowCandidateIds(input),
    simulationDeterminismHash: buildSimulationDeterminismHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    phase38StaleMarker: getPhase38StaleMarker(input),
    companyId: handoff?.companyId ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
  });
}

function buildSimulationPackageId(input: BuildSimulationPackageInput): string {
  return `synthetic-simulation-package:${stableSnapshotHash({
    simulationPackageKey: buildSimulationPackageKey(input),
    simulationDeterminismHash: buildSimulationDeterminismHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function validateSimulationPackageInput(input: BuildSimulationPackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);
  const simulatedActionCandidateIds = getSimulatedActionCandidateIds(input);
  const simulatedWorkflowCandidateIds = getSimulatedWorkflowCandidateIds(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (simulatedActionCandidateIds.length === 0 && simulatedWorkflowCandidateIds.length === 0) {
    warnings.push("at least one simulated action or workflow candidate reference is required.");
  }
  if (!handoff) return warnings;

  if (!hasValue(handoff.companyId)) warnings.push("phase37Handoff.companyId is required.");
  if (!hasValue(handoff.knowledgePackageHandle)) warnings.push("phase37Handoff.knowledgePackageHandle is required.");
  if (!hasValue(handoff.methodologyPackageHandle)) warnings.push("phase37Handoff.methodologyPackageHandle is required.");
  if (handoff.phase38MayConsume !== true) warnings.push("phase37Handoff.phase38MayConsume must be true.");
  if (handoff.phase38MayMutate !== false) warnings.push("phase37Handoff.phase38MayMutate must be false.");
  if (handoff.phase38MayWriteBack !== false) warnings.push("phase37Handoff.phase38MayWriteBack must be false.");

  getActionCandidates(input).forEach((actionCandidate, index) => {
    if (!hasValue(actionCandidate.actionCandidateId)) warnings.push(`actionCandidates[${index}].actionCandidateId is required.`);
    if (actionCandidate.executable !== false) warnings.push(`actionCandidates[${index}].executable must be false.`);
    if (actionCandidate.companyId !== handoff.companyId) warnings.push(`actionCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  getWorkflowCandidates(input).forEach((workflowCandidate, index) => {
    if (!hasValue(workflowCandidate.workflowCandidateId)) warnings.push(`workflowCandidates[${index}].workflowCandidateId is required.`);
    if (workflowCandidate.executable !== false) warnings.push(`workflowCandidates[${index}].executable must be false.`);
    if (workflowCandidate.companyId !== handoff.companyId) warnings.push(`workflowCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  return warnings;
}

export function buildSimulationPackage(input: BuildSimulationPackageInput): BuildSimulationPackageResult {
  const fatalWarnings = validateSimulationPackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      simulationPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = [
    ...getStringArrayProperty(handoff, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...getActionCandidates(input).flatMap((actionCandidate, index) =>
      actionCandidate.warnings.map((warning) => `actionCandidates[${index}]: ${warning}`),
    ),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate, index) =>
      workflowCandidate.warnings.map((warning) => `workflowCandidates[${index}]: ${warning}`),
    ),
    ...getExecutionReadinessPackages(input).flatMap((executionReadiness, index) =>
      executionReadiness.warnings.map((warning) => `executionReadinessPackages[${index}]: ${warning}`),
    ),
  ];

  return {
    simulationPackage: {
      simulationPackageId: buildSimulationPackageId(input),
      simulationPackageKey: buildSimulationPackageKey(input),
      simulatedActionCandidateIds: getSimulatedActionCandidateIds(input),
      simulatedWorkflowCandidateIds: getSimulatedWorkflowCandidateIds(input),
      simulationLineageIds: getSimulationLineageIds(input),
      simulationEvidenceReferenceIds: getSimulationEvidenceReferenceIds(input),
      simulationKnowledgeReferenceIds: getSimulationKnowledgeReferenceIds(input),
      simulationMethodologyReferenceIds: getSimulationMethodologyReferenceIds(input),
      simulationDeterminismHash: buildSimulationDeterminismHash(input),
      simulationInputReferenceIds: getSimulationInputReferenceIds(input),
      simulationAssumptionReferenceIds: getInputArray(input.simulationAssumptionReferenceIds),
      simulationOutputReferenceIds: getInputArray(input.simulationOutputReferenceIds),
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
      phase38StaleMarker: getPhase38StaleMarker(input),
      executable: false,
      executionReady: false,
      companyId: handoff.companyId,
      customerIsolation: handoff.customerIsolation,
      firmIsolation: handoff.firmIsolation,
      clientIsolation: handoff.clientIsolation,
      derivationHash: buildDerivationHash(input),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
