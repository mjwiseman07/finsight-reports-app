import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticAuditScope } from "../../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../organizational-memory/memory-object";
import type { SyntheticRoleCapabilityReviewLevel } from "../../../roles/role-capability";
import type { SyntheticRoleType } from "../../../roles/contracts";
import type {
  SyntheticPhase39RoleHandoffConsumptionContract,
  SyntheticTierWideningGateOutcome,
  TierWideningGateResult,
} from "../../contracts";

export interface BuildTierWideningGateResultInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  companyId?: string;
  roleType?: SyntheticRoleType;
  currentMaxReviewLevel?: SyntheticRoleCapabilityReviewLevel;
  requestedMaxReviewLevel?: SyntheticRoleCapabilityReviewLevel;
  requestReason?: string;
}

export interface BuildTierWideningGateResultResult {
  tierWideningGateResult: TierWideningGateResult | null;
  skipped: boolean;
  warnings: string[];
}

export interface TierWideningGateClassificationCore {
  gateOutcome: SyntheticTierWideningGateOutcome;
  gateReason: string;
}

const REVIEW_LEVEL_RANK: Record<SyntheticRoleCapabilityReviewLevel, number> = {
  none: 0,
  self: 1,
  senior: 2,
  manager: 3,
  controller: 4,
  partner: 5,
  cfo: 6,
  human_required: 7,
};

const CONTROLLER_REVIEW_LEVEL_RANK = REVIEW_LEVEL_RANK.controller;

/**
 * NON-CONFIGURABLE FLOOR: fraud/reasonableness flagged tasks route to human_controller in the
 * authority evaluator (40E-EXT-A), independent of tier config. That bright line is type-level
 * non-representable and is NOT and CANNOT be a widening target. This gate governs ONLY the
 * review-level tier boundary and never grants anything that touches that floor.
 */
export function classifyTierWideningGate(input: {
  currentMaxReviewLevel?: SyntheticRoleCapabilityReviewLevel;
  requestedMaxReviewLevel?: SyntheticRoleCapabilityReviewLevel;
  companyId?: string;
  roleType?: SyntheticRoleType;
  requestReason?: string;
}): TierWideningGateClassificationCore {
  if (!hasValue(input.companyId)) {
    return failClosedTicket("missing_company_id");
  }

  if (!hasValue(input.roleType)) {
    return failClosedTicket("missing_role_type");
  }

  if (!hasValue(input.requestReason)) {
    return failClosedTicket("missing_request_reason");
  }

  const currentRank = resolveReviewLevelRank(input.currentMaxReviewLevel);
  const requestedRank = resolveReviewLevelRank(input.requestedMaxReviewLevel);

  if (currentRank === null || requestedRank === null) {
    return failClosedTicket("unknown_or_unparseable_review_level");
  }

  if (requestedRank <= currentRank) {
    return failClosedTicket("not_a_widening_request");
  }

  const rankDelta = requestedRank - currentRank;

  if (requestedRank >= CONTROLLER_REVIEW_LEVEL_RANK) {
    return failClosedTicket("widening_at_or_above_controller_tier");
  }

  if (rankDelta > 1) {
    return failClosedTicket("widening_exceeds_adjacent_tier");
  }

  if (rankDelta === 1 && requestedRank < CONTROLLER_REVIEW_LEVEL_RANK) {
    return {
      gateOutcome: "auto_allowed",
      gateReason: "adjacent_widening_below_controller",
    };
  }

  return failClosedTicket("ambiguous_widening_request");
}

function failClosedTicket(gateReason: string): TierWideningGateClassificationCore {
  return {
    gateOutcome: "requires_ticket",
    gateReason,
  };
}

function resolveReviewLevelRank(
  reviewLevel: SyntheticRoleCapabilityReviewLevel | undefined,
): number | null {
  if (!reviewLevel) {
    return null;
  }

  const rank = REVIEW_LEVEL_RANK[reviewLevel];

  if (rank === undefined) {
    return null;
  }

  return rank;
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

function collectMissingHandoffIdentifiers(input: BuildTierWideningGateResultInput): string[] {
  const missing: string[] = [];

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

function buildTierWideningRequestId(input: BuildTierWideningGateResultInput): string {
  const tierWideningRequestKey = stableSnapshotHash({
    companyId: input.companyId ?? "",
    roleType: input.roleType ?? "",
    currentMaxReviewLevel: input.currentMaxReviewLevel ?? "",
    requestedMaxReviewLevel: input.requestedMaxReviewLevel ?? "",
    requestReason: input.requestReason ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
  });

  return stableSnapshotHash({
    tierWideningRequestKey,
    artifactType: "TierWideningRequest",
  });
}

function buildTierWideningGateResultDerivationHash(
  input: BuildTierWideningGateResultInput,
  classification: TierWideningGateClassificationCore,
): string {
  return stableSnapshotHash({
    companyId: input.companyId ?? "",
    roleType: input.roleType ?? "",
    currentMaxReviewLevel: input.currentMaxReviewLevel ?? "",
    requestedMaxReviewLevel: input.requestedMaxReviewLevel ?? "",
    requestReason: input.requestReason ?? "",
    gateOutcome: classification.gateOutcome,
    gateReason: classification.gateReason,
  });
}

export function buildTierWideningGateResult(
  input: BuildTierWideningGateResultInput,
): BuildTierWideningGateResultResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingHandoffIdentifiers = collectMissingHandoffIdentifiers(input);

  if (missingHandoffIdentifiers.length > 0) {
    return {
      tierWideningGateResult: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingHandoffIdentifiers.join(", ")}`,
      ],
    };
  }

  const classification = classifyTierWideningGate(input);
  const containsPHI = getContainsPHI(input.containsPHI);
  const tierWideningRequestId = buildTierWideningRequestId(input);
  const derivationHash = buildTierWideningGateResultDerivationHash(input, classification);
  const tierWideningGateResultKey = stableSnapshotHash({
    tierWideningRequestId,
    gateOutcome: classification.gateOutcome,
    gateReason: classification.gateReason,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const tierWideningGateResultId = stableSnapshotHash({
    tierWideningGateResultKey,
    artifactType: "TierWideningGateResult",
  });

  return {
    tierWideningGateResult: {
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash as string,
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash as string,
      phase40StaleMarker: input.phase40StaleMarker ?? "current",
      executable: false,
      executionReady: input.executionReady === true,
      scope: input.scope as SyntheticAuditScope,
      customerIsolation: input.customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: input.firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: input.clientIsolation as SyntheticMemoryObjectIsolationDimension,
      containsPHI,
      derivationLineageIds: getInputArray(input.derivationLineageIds),
      derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
      derivationHash,
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
      phase39RoleHandoffHandle: input.phase39RoleHandoffHandle as string,
      phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
      tierWideningGateResultId,
      tierWideningGateResultKey,
      tierWideningRequestId,
      gateOutcome: classification.gateOutcome,
      gateReason: classification.gateReason,
    },
    skipped: false,
    warnings,
  };
}
