import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticCapabilityIntelligence } from "../capability-intelligence";
import type {
  SyntheticOutcomeConfidenceMetadata,
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface SyntheticAdoptionPatternMetadata {
  adoptionPatternReferenceIds: string[];
  adoptionPatternEvidenceIds: string[];
  adoptionPatternReviewRequired: boolean;
}

export interface SyntheticAbandonmentPatternMetadata {
  abandonmentPatternReferenceIds: string[];
  abandonmentPatternEvidenceIds: string[];
  abandonmentPatternReviewRequired: boolean;
}

export interface SyntheticAdoptionEffectivenessPatternMetadata {
  effectivenessPatternReferenceIds: string[];
  effectivenessPatternEvidenceIds: string[];
  effectivenessPatternReviewRequired: boolean;
}

export interface SyntheticRoleAdoptionMetadata {
  roleAdoptionReferenceIds: string[];
  roleAdoptionEvidenceIds: string[];
  roleAdoptionReviewRequired: boolean;
}

export interface SyntheticFirmAdoptionMetadata {
  firmAdoptionReferenceIds: string[];
  firmAdoptionEvidenceIds: string[];
  firmAdoptionReviewRequired: boolean;
}

export interface SyntheticClientAdoptionMetadata {
  clientAdoptionReferenceIds: string[];
  clientAdoptionEvidenceIds: string[];
  clientAdoptionReviewRequired: boolean;
}

export interface BuildAdoptionIntelligenceInput {
  adoptionIntelligenceKey: string;
  adoptionReferenceIds: string[];
  capabilityIntelligencePackages?: SyntheticCapabilityIntelligence[];
  adoptionPatternMetadata?: SyntheticAdoptionPatternMetadata;
  abandonmentPatternMetadata?: SyntheticAbandonmentPatternMetadata;
  effectivenessPatternMetadata?: SyntheticAdoptionEffectivenessPatternMetadata;
  roleAdoptionMetadata?: SyntheticRoleAdoptionMetadata;
  firmAdoptionMetadata?: SyntheticFirmAdoptionMetadata;
  clientAdoptionMetadata?: SyntheticClientAdoptionMetadata;
}

export interface SyntheticAdoptionIntelligence {
  adoptionIntelligenceId: string;
  adoptionIntelligenceKey: string;
  adoptionReferenceIds: string[];
  capabilityIntelligenceIds: string[];
  capabilityReferenceIds: string[];
  outcomeReferenceIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticOutcomeTrustMetadata[];
  confidenceMetadata: SyntheticOutcomeConfidenceMetadata[];
  governanceMetadata: SyntheticOutcomeGovernanceMetadata[];
  memoryCompatibilityMetadata: SyntheticOutcomeMemoryCompatibility[];
  learningCompatibilityMetadata: SyntheticOutcomeLearningCompatibility[];
  adoptionPatternMetadata?: SyntheticAdoptionPatternMetadata;
  abandonmentPatternMetadata?: SyntheticAbandonmentPatternMetadata;
  effectivenessPatternMetadata?: SyntheticAdoptionEffectivenessPatternMetadata;
  roleAdoptionMetadata?: SyntheticRoleAdoptionMetadata;
  firmAdoptionMetadata?: SyntheticFirmAdoptionMetadata;
  clientAdoptionMetadata?: SyntheticClientAdoptionMetadata;
  capabilityIntelligencePackages: SyntheticCapabilityIntelligence[];
  warnings: string[];
}

export interface BuildAdoptionIntelligenceResult {
  adoptionIntelligence: SyntheticAdoptionIntelligence | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getCapabilityIntelligencePackages(input: BuildAdoptionIntelligenceInput): SyntheticCapabilityIntelligence[] {
  return input.capabilityIntelligencePackages ?? [];
}

function getCapabilityReferenceIds(input: BuildAdoptionIntelligenceInput): string[] {
  return uniqueStable(getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.capabilityReferenceIds));
}

function getOutcomeReferenceIds(input: BuildAdoptionIntelligenceInput): string[] {
  return uniqueStable(getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds));
}

function getEvidenceReferenceIds(input: BuildAdoptionIntelligenceInput): string[] {
  return uniqueStable([
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...(input.adoptionPatternMetadata?.adoptionPatternEvidenceIds ?? []),
    ...(input.abandonmentPatternMetadata?.abandonmentPatternEvidenceIds ?? []),
    ...(input.effectivenessPatternMetadata?.effectivenessPatternEvidenceIds ?? []),
    ...(input.roleAdoptionMetadata?.roleAdoptionEvidenceIds ?? []),
    ...(input.firmAdoptionMetadata?.firmAdoptionEvidenceIds ?? []),
    ...(input.clientAdoptionMetadata?.clientAdoptionEvidenceIds ?? []),
  ]);
}

function buildAdoptionIntelligenceId(input: BuildAdoptionIntelligenceInput): string {
  return `synthetic-adoption-intelligence:${stableSnapshotHash({
    adoptionIntelligenceKey: input.adoptionIntelligenceKey,
    adoptionReferenceIds: input.adoptionReferenceIds,
    capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
    capabilityReferenceIds: getCapabilityReferenceIds(input),
    outcomeReferenceIds: getOutcomeReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    adoptionPatternReferenceIds: input.adoptionPatternMetadata?.adoptionPatternReferenceIds ?? [],
    abandonmentPatternReferenceIds: input.abandonmentPatternMetadata?.abandonmentPatternReferenceIds ?? [],
    effectivenessPatternReferenceIds: input.effectivenessPatternMetadata?.effectivenessPatternReferenceIds ?? [],
    roleAdoptionReferenceIds: input.roleAdoptionMetadata?.roleAdoptionReferenceIds ?? [],
    firmAdoptionReferenceIds: input.firmAdoptionMetadata?.firmAdoptionReferenceIds ?? [],
    clientAdoptionReferenceIds: input.clientAdoptionMetadata?.clientAdoptionReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildAdoptionIntelligenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.adoptionIntelligenceKey)) warnings.push("adoptionIntelligenceKey is required.");
  if (!Array.isArray(input.adoptionReferenceIds) || input.adoptionReferenceIds.length === 0) {
    warnings.push("adoptionReferenceIds must include at least one value.");
  }
  if (input.capabilityIntelligencePackages !== undefined && !Array.isArray(input.capabilityIntelligencePackages)) {
    warnings.push("capabilityIntelligencePackages must be an array.");
  }
  for (const artifact of getCapabilityIntelligencePackages(input)) {
    if (!hasValue(artifact.capabilityIntelligenceId)) warnings.push("capabilityIntelligenceId is required.");
  }

  return warnings;
}

export function buildAdoptionIntelligence(
  input: BuildAdoptionIntelligenceInput,
): BuildAdoptionIntelligenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      adoptionIntelligence: null,
      skipped: true,
      warnings,
    };
  }

  return {
    adoptionIntelligence: {
      adoptionIntelligenceId: buildAdoptionIntelligenceId(input),
      adoptionIntelligenceKey: input.adoptionIntelligenceKey,
      adoptionReferenceIds: input.adoptionReferenceIds,
      capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
      capabilityReferenceIds: getCapabilityReferenceIds(input),
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      trustMetadata: getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.trustMetadata),
      confidenceMetadata: getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.confidenceMetadata),
      governanceMetadata: getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
      memoryCompatibilityMetadata: getCapabilityIntelligencePackages(input).flatMap(
        (artifact) => artifact.memoryCompatibilityMetadata,
      ),
      learningCompatibilityMetadata: getCapabilityIntelligencePackages(input).flatMap(
        (artifact) => artifact.learningCompatibilityMetadata,
      ),
      adoptionPatternMetadata: input.adoptionPatternMetadata,
      abandonmentPatternMetadata: input.abandonmentPatternMetadata,
      effectivenessPatternMetadata: input.effectivenessPatternMetadata,
      roleAdoptionMetadata: input.roleAdoptionMetadata,
      firmAdoptionMetadata: input.firmAdoptionMetadata,
      clientAdoptionMetadata: input.clientAdoptionMetadata,
      capabilityIntelligencePackages: getCapabilityIntelligencePackages(input),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
