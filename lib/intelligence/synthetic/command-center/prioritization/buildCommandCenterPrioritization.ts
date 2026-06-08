import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticCommandCenterEvidencePackage } from "../evidence";
import type {
  SyntheticCommandCenterAttentionMetadata,
  SyntheticCommandCenterDecisionQueueCompatibility,
  SyntheticCommandCenterPriority,
  SyntheticCommandCenterRoleVisibilityDescriptor,
  SyntheticCommandCenterRoutingDescriptor,
  SyntheticCommandCenterSurface,
  SyntheticCommandCenterValidationStatusMetadata,
  SyntheticCommandCenterWatchlistCompatibility,
} from "../types";

export interface BuildCommandCenterPrioritizationInput {
  evidencePackage: SyntheticCommandCenterEvidencePackage | null;
  priorityMetadata: SyntheticCommandCenterPriority;
  surfaceCompatibility: SyntheticCommandCenterSurface;
  attentionMetadata?: SyntheticCommandCenterAttentionMetadata;
  routingDescriptors?: SyntheticCommandCenterRoutingDescriptor[];
  roleVisibilityDescriptor?: SyntheticCommandCenterRoleVisibilityDescriptor;
  decisionQueueCompatibility?: SyntheticCommandCenterDecisionQueueCompatibility;
  watchlistCompatibility?: SyntheticCommandCenterWatchlistCompatibility;
  validationStatusMetadata?: SyntheticCommandCenterValidationStatusMetadata;
}

export interface SyntheticCommandCenterPrioritizationPackage {
  prioritizationPackageId: string;
  evidencePackageId: string;
  commandCenterCandidateId: string;
  companyId: string;
  commandCenterItemId: string;
  evidencePackage: SyntheticCommandCenterEvidencePackage;
  priorityMetadata: SyntheticCommandCenterPriority;
  attentionMetadata?: SyntheticCommandCenterAttentionMetadata;
  routingDescriptors: SyntheticCommandCenterRoutingDescriptor[];
  surfaceCompatibility: SyntheticCommandCenterSurface;
  roleVisibilityDescriptor?: SyntheticCommandCenterRoleVisibilityDescriptor;
  decisionQueueCompatibility?: SyntheticCommandCenterDecisionQueueCompatibility;
  watchlistCompatibility?: SyntheticCommandCenterWatchlistCompatibility;
  validationStatusMetadata?: SyntheticCommandCenterValidationStatusMetadata;
  warnings: string[];
}

export interface BuildCommandCenterPrioritizationResult {
  prioritizationPackage: SyntheticCommandCenterPrioritizationPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function buildPrioritizationPackageId(input: BuildCommandCenterPrioritizationInput): string {
  const evidencePackage = input.evidencePackage;

  return `command-center-prioritization:${stableSnapshotHash({
    evidencePackageId: evidencePackage?.evidencePackageId ?? null,
    commandCenterCandidateId: evidencePackage?.commandCenterCandidateId ?? null,
    companyId: evidencePackage?.companyId ?? null,
    commandCenterItemId: evidencePackage?.commandCenterItemId ?? null,
    priorityLevel: input.priorityMetadata?.priorityLevel ?? null,
    attentionCategory: input.priorityMetadata?.attentionCategory ?? null,
    surfaceCategory: input.surfaceCompatibility?.primarySurfaceCategory ?? null,
    routingCategories: (input.routingDescriptors ?? evidencePackage?.routingDescriptors ?? []).map(
      (descriptor) => descriptor.routingCategory,
    ),
    validationStatus:
      input.validationStatusMetadata?.validationStatus ?? evidencePackage?.validationStatusMetadata?.validationStatus,
    decisionQueueCompatible:
      input.decisionQueueCompatibility?.decisionQueueCompatible ??
      evidencePackage?.decisionQueueCompatibility?.decisionQueueCompatible,
    watchlistCompatible:
      input.watchlistCompatibility?.watchlistCompatible ?? evidencePackage?.watchlistCompatibility?.watchlistCompatible,
  })}`;
}

function validateInput(input: BuildCommandCenterPrioritizationInput): string[] {
  const warnings: string[] = [];
  const evidencePackage = input.evidencePackage;

  if (!evidencePackage) {
    warnings.push("evidencePackage is required.");
    return warnings;
  }

  if (!hasValue(evidencePackage.evidencePackageId)) {
    warnings.push("evidencePackage.evidencePackageId is required.");
  }
  if (!hasValue(evidencePackage.commandCenterCandidateId)) {
    warnings.push("evidencePackage.commandCenterCandidateId is required.");
  }
  if (!hasValue(evidencePackage.companyId)) warnings.push("evidencePackage.companyId is required.");
  if (!hasValue(evidencePackage.commandCenterItemId)) {
    warnings.push("evidencePackage.commandCenterItemId is required.");
  }
  if (!input.priorityMetadata) warnings.push("priorityMetadata is required.");
  if (!input.surfaceCompatibility) warnings.push("surfaceCompatibility is required.");
  if (!evidencePackage.validationMetadata) warnings.push("evidencePackage.validationMetadata is required.");

  if (!input.priorityMetadata || !input.surfaceCompatibility) {
    return warnings;
  }

  if (!hasValue(input.priorityMetadata.priorityLevel)) {
    warnings.push("priorityMetadata.priorityLevel is required.");
  }
  if (!hasValue(input.priorityMetadata.attentionCategory)) {
    warnings.push("priorityMetadata.attentionCategory is required.");
  }
  if (!hasValue(input.surfaceCompatibility.primarySurfaceCategory)) {
    warnings.push("surfaceCompatibility.primarySurfaceCategory is required.");
  }
  if (input.surfaceCompatibility.decisionSurfaceCategories.length === 0) {
    warnings.push("surfaceCompatibility.decisionSurfaceCategories must include at least one value.");
  }

  return warnings;
}

export function buildCommandCenterPrioritization(
  input: BuildCommandCenterPrioritizationInput,
): BuildCommandCenterPrioritizationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.evidencePackage) {
    return {
      prioritizationPackage: null,
      skipped: true,
      warnings,
    };
  }

  const evidencePackage = input.evidencePackage;

  return {
    prioritizationPackage: {
      prioritizationPackageId: buildPrioritizationPackageId(input),
      evidencePackageId: evidencePackage.evidencePackageId,
      commandCenterCandidateId: evidencePackage.commandCenterCandidateId,
      companyId: evidencePackage.companyId,
      commandCenterItemId: evidencePackage.commandCenterItemId,
      evidencePackage,
      priorityMetadata: input.priorityMetadata,
      attentionMetadata: input.attentionMetadata ?? evidencePackage.attentionMetadata,
      routingDescriptors: input.routingDescriptors ?? evidencePackage.routingDescriptors,
      surfaceCompatibility: input.surfaceCompatibility,
      roleVisibilityDescriptor: input.roleVisibilityDescriptor ?? evidencePackage.roleVisibilityDescriptor,
      decisionQueueCompatibility:
        input.decisionQueueCompatibility ?? evidencePackage.decisionQueueCompatibility,
      watchlistCompatibility: input.watchlistCompatibility ?? evidencePackage.watchlistCompatibility,
      validationStatusMetadata: input.validationStatusMetadata ?? evidencePackage.validationStatusMetadata,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
