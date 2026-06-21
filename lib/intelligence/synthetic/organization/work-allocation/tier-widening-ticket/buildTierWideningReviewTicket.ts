import { stableSnapshotHash } from "../../../../core/hash";
import type {
  TierWideningGateResult,
  TierWideningRequest,
  TierWideningReviewTicket,
} from "../../contracts";

export interface BuildTierWideningReviewTicketInput {
  tierWideningGateResult?: TierWideningGateResult | null;
  tierWideningRequest?: TierWideningRequest | null;
  warnings?: string[];
}

export interface BuildTierWideningReviewTicketResult {
  tierWideningReviewTicket: TierWideningReviewTicket | null;
  skipped: boolean;
  warnings: string[];
}

/**
 * NON-SCOPE: human-review workflow and UI ("pulse box") that surfaces and resolves tickets
 * are downstream and not built here. The writer that turns an APPROVED ticket into a
 * customer_override RoleAuthorityTierConfig is a separate future module, NOT this one.
 * This module only creates the open ticket artifact.
 */
export function buildTierWideningReviewTicket(
  input: BuildTierWideningReviewTicketInput,
): BuildTierWideningReviewTicketResult {
  const warnings = [...(input.warnings ?? [])];
  const tierWideningGateResult = input.tierWideningGateResult;

  if (!tierWideningGateResult) {
    return {
      tierWideningReviewTicket: null,
      skipped: true,
      warnings: [...warnings, "missing tier widening gate result"],
    };
  }

  if (tierWideningGateResult.gateOutcome !== "requires_ticket") {
    return {
      tierWideningReviewTicket: null,
      skipped: true,
      warnings: [
        ...warnings,
        `gate outcome does not require ticket: ${tierWideningGateResult.gateOutcome}`,
      ],
    };
  }

  const tierWideningRequest = input.tierWideningRequest;

  if (!tierWideningRequest) {
    return {
      tierWideningReviewTicket: null,
      skipped: true,
      warnings: [...warnings, "missing tier widening request for ticket creation"],
    };
  }

  if (tierWideningRequest.tierWideningRequestId !== tierWideningGateResult.tierWideningRequestId) {
    return {
      tierWideningReviewTicket: null,
      skipped: true,
      warnings: [...warnings, "tier widening request id does not match gate result reference"],
    };
  }

  const derivationHash = stableSnapshotHash({
    tierWideningGateResultId: tierWideningGateResult.tierWideningGateResultId,
    tierWideningRequestId: tierWideningRequest.tierWideningRequestId,
    ticketStatus: "open",
    roleType: tierWideningRequest.roleType,
    currentMaxReviewLevel: tierWideningRequest.currentMaxReviewLevel,
    requestedMaxReviewLevel: tierWideningRequest.requestedMaxReviewLevel,
    requestReason: tierWideningRequest.requestReason,
    gateReason: tierWideningGateResult.gateReason,
  });
  const tierWideningReviewTicketKey = stableSnapshotHash({
    tierWideningGateResultId: tierWideningGateResult.tierWideningGateResultId,
    tierWideningRequestId: tierWideningRequest.tierWideningRequestId,
    ticketStatus: "open",
    boundPhase39SnapshotHash: tierWideningGateResult.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: tierWideningGateResult.boundPhase38SnapshotHash,
    derivationHash,
  });
  const tierWideningReviewTicketId = stableSnapshotHash({
    tierWideningReviewTicketKey,
    artifactType: "TierWideningReviewTicket",
  });

  return {
    tierWideningReviewTicket: {
      boundPhase39SnapshotHash: tierWideningGateResult.boundPhase39SnapshotHash,
      boundPhase38SnapshotHash: tierWideningGateResult.boundPhase38SnapshotHash,
      phase40StaleMarker: tierWideningGateResult.phase40StaleMarker,
      executable: false,
      executionReady: tierWideningGateResult.executionReady,
      scope: tierWideningGateResult.scope,
      customerIsolation: tierWideningGateResult.customerIsolation,
      firmIsolation: tierWideningGateResult.firmIsolation,
      clientIsolation: tierWideningGateResult.clientIsolation,
      containsPHI: tierWideningGateResult.containsPHI,
      derivationLineageIds: tierWideningGateResult.derivationLineageIds,
      derivationMethod: tierWideningGateResult.derivationMethod,
      derivationHash,
      confidenceFloorMetadata: tierWideningGateResult.confidenceFloorMetadata,
      sourceConfidenceReferenceIds: tierWideningGateResult.sourceConfidenceReferenceIds,
      evidenceReferenceIds: tierWideningGateResult.evidenceReferenceIds,
      lineageReferenceIds: tierWideningGateResult.lineageReferenceIds,
      trustMetadata: tierWideningGateResult.trustMetadata,
      confidenceMetadata: tierWideningGateResult.confidenceMetadata,
      governanceMetadata: tierWideningGateResult.governanceMetadata,
      warnings,
      skippedIndexes: tierWideningGateResult.skippedIndexes,
      phase39RoleHandoffHandle: tierWideningGateResult.phase39RoleHandoffHandle,
      phase39RoleInstanceReferenceIds: tierWideningGateResult.phase39RoleInstanceReferenceIds,
      tierWideningReviewTicketId,
      tierWideningReviewTicketKey,
      tierWideningGateResultId: tierWideningGateResult.tierWideningGateResultId,
      tierWideningRequestId: tierWideningRequest.tierWideningRequestId,
      ticketStatus: "open",
      roleType: tierWideningRequest.roleType,
      currentMaxReviewLevel: tierWideningRequest.currentMaxReviewLevel,
      requestedMaxReviewLevel: tierWideningRequest.requestedMaxReviewLevel,
      requestReason: tierWideningRequest.requestReason,
      gateReason: tierWideningGateResult.gateReason,
    },
    skipped: false,
    warnings,
  };
}
