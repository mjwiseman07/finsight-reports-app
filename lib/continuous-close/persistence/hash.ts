/**
 * CC-2B policy / input / idempotency hashes.
 *
 * Uses measurement-snapshot SHA-256 canonical JSON. Not Merkle / ledger-event hashing.
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";
import type { ContinuousCloseObservePolicy } from "@/lib/continuous-close/policy";
import type { AuthoritativeObservationMode } from "@/lib/audit-ready/authoritative-observation/types";
import type { SelectedUrmRuns } from "./types";

export type CanonicalObservePolicy = {
  assertion: {
    blockGapRate: number | null;
    gapsRequireReview: boolean;
  };
  evidence: {
    minEvidenceCountForReconciled: number;
    requireEvidenceForReconciled: boolean;
  };
  freshnessMaxAgeHours: number | null;
  mode: "OBSERVE";
  optionalReconKinds: string[];
  requiredReconKinds: string[];
  requireStatementControlSnapshotWhenContracted: boolean;
  requireUrmSourceSyncMatch: boolean;
  statementControlOptionalKeys: string[];
  statementControlRequiredKeys: string[];
  urm: {
    optionalBlockOutcomes: string[];
    optionalReviewOutcomes: string[];
    requiredBlockOutcomes: string[];
    requiredReviewOutcomes: string[];
  };
};

function sortedStrings(values: readonly string[]): string[] {
  return [...values].map(String).sort((a, b) => a.localeCompare(b));
}

export function canonicalizeObservePolicy(
  policy: ContinuousCloseObservePolicy,
): CanonicalObservePolicy {
  return {
    assertion: {
      blockGapRate: policy.assertion.blockGapRate,
      gapsRequireReview: policy.assertion.gapsRequireReview,
    },
    evidence: {
      minEvidenceCountForReconciled: policy.evidence.minEvidenceCountForReconciled,
      requireEvidenceForReconciled: policy.evidence.requireEvidenceForReconciled,
    },
    freshnessMaxAgeHours: policy.freshnessMaxAgeHours,
    mode: "OBSERVE",
    optionalReconKinds: sortedStrings(policy.optionalReconKinds),
    requiredReconKinds: sortedStrings(policy.requiredReconKinds),
    requireStatementControlSnapshotWhenContracted:
      policy.requireStatementControlSnapshotWhenContracted,
    requireUrmSourceSyncMatch: policy.requireUrmSourceSyncMatch,
    statementControlOptionalKeys: sortedStrings(policy.statementControlOptionalKeys),
    statementControlRequiredKeys: sortedStrings(policy.statementControlRequiredKeys),
    urm: {
      optionalBlockOutcomes: sortedStrings(policy.urm.optionalBlockOutcomes),
      optionalReviewOutcomes: sortedStrings(policy.urm.optionalReviewOutcomes),
      requiredBlockOutcomes: sortedStrings(policy.urm.requiredBlockOutcomes),
      requiredReviewOutcomes: sortedStrings(policy.urm.requiredReviewOutcomes),
    },
  };
}

export function hashObservePolicy(policy: ContinuousCloseObservePolicy): string {
  return sha256Hex(stableCanonicalJson(canonicalizeObservePolicy(policy)));
}

export type ObserveInputHashBody = {
  accountingSyncId: string;
  assertionReference: { closePeriodId: string } | null;
  observationMode: AuthoritativeObservationMode;
  policyHash: string;
  selectedUrmRuns: SelectedUrmRuns;
  statementControlContractVersion: number | null;
};

export function canonicalizeObserveInput(body: ObserveInputHashBody): ObserveInputHashBody {
  const selected: SelectedUrmRuns = {};
  if (body.selectedUrmRuns.ap_aging) selected.ap_aging = body.selectedUrmRuns.ap_aging;
  if (body.selectedUrmRuns.ar_aging) selected.ar_aging = body.selectedUrmRuns.ar_aging;
  if (body.selectedUrmRuns.inventory) selected.inventory = body.selectedUrmRuns.inventory;
  return {
    accountingSyncId: body.accountingSyncId,
    assertionReference: body.assertionReference,
    observationMode: body.observationMode,
    policyHash: body.policyHash,
    selectedUrmRuns: selected,
    statementControlContractVersion: body.statementControlContractVersion,
  };
}

export function hashObserveInput(body: ObserveInputHashBody): string {
  return sha256Hex(stableCanonicalJson(canonicalizeObserveInput(body)));
}

export type ObserveIdempotencyBody = {
  accountingSyncId: string;
  companyId: string;
  engagementId: string;
  inputHash: string;
  mode: "OBSERVE";
  periodEnd: string;
  policyHash: string;
};

export function hashObserveIdempotencyKey(body: ObserveIdempotencyBody): string {
  return sha256Hex(
    stableCanonicalJson({
      accountingSyncId: body.accountingSyncId,
      companyId: body.companyId,
      engagementId: body.engagementId,
      inputHash: body.inputHash,
      mode: "OBSERVE" as const,
      periodEnd: body.periodEnd,
      policyHash: body.policyHash,
    }),
  );
}

export function hashLedgerEventPayload(payload: Record<string, unknown>): string {
  return stableCanonicalJson(payload);
}

export { sha256Hex, stableCanonicalJson };
