/**
 * JE-1 proposal / policy / idempotency hashes.
 * Uses measurement-snapshot SHA-256 canonical JSON (not Merkle).
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";
import type {
  JeExpectedEffect,
  JeProposalLine,
  JeProposalOriginType,
  JeProposalPolicy,
} from "./types";

function sortedStrings(values: readonly string[]): string[] {
  return [...values].map(String).sort((a, b) => a.localeCompare(b));
}

export function canonicalizeJeProposalPolicy(
  policy: JeProposalPolicy,
): Record<string, unknown> {
  return {
    accrualLiabilityAccountTypes: sortedStrings(policy.accrualLiabilityAccountTypes),
    accrualPlAccountTypes: sortedStrings(policy.accrualPlAccountTypes),
    allowCrossPeriod: false,
    allowedOriginTypes: sortedStrings(policy.allowedOriginTypes),
    maxLines: policy.maxLines,
    maxLineDescriptionChars: policy.maxLineDescriptionChars,
    maxMemoChars: policy.maxMemoChars,
    maxProposalAmountCents: policy.maxProposalAmountCents,
    prohibitedAccountIds: sortedStrings(policy.prohibitedAccountIds),
    prohibitedControlAccountTypes: sortedStrings(
      policy.prohibitedControlAccountTypes,
    ),
    reclassBsAccountTypes: sortedStrings(policy.reclassBsAccountTypes),
    reclassPlAccountTypes: sortedStrings(policy.reclassPlAccountTypes),
    requireAuthoritativeCcSource: true,
    requireAuthoritativeReconSource: policy.requireAuthoritativeReconSource,
    requireExpectedEffects: policy.requireExpectedEffects,
  };
}

export function hashJeProposalPolicy(policy: JeProposalPolicy): string {
  return sha256Hex(stableCanonicalJson(canonicalizeJeProposalPolicy(policy)));
}

function canonicalizeLine(line: JeProposalLine): Record<string, unknown> {
  return {
    accountId: String(line.accountId),
    classId: line.classId ?? null,
    creditCents: line.creditCents,
    debitCents: line.debitCents,
    departmentId: line.departmentId ?? null,
    description: line.description ?? null,
    locationId: line.locationId ?? null,
    sequence: line.sequence,
  };
}

function canonicalizeEffect(effect: JeExpectedEffect): Record<string, unknown> {
  switch (effect.type) {
    case "CC_EXCEPTION_CLEAR":
      return {
        exceptionCode: String(effect.exceptionCode),
        type: "CC_EXCEPTION_CLEAR",
      };
    case "RECON_OUTCOME_TARGET":
      return {
        reconKind: String(effect.reconKind),
        targetOutcome: String(effect.targetOutcome),
        type: "RECON_OUTCOME_TARGET",
      };
    case "RESIDUAL_DELTA":
      return {
        expectedDeltaCents: effect.expectedDeltaCents,
        reconKind: String(effect.reconKind),
        type: "RESIDUAL_DELTA",
      };
    case "ACCOUNT_RECLASS":
      return {
        amountCents: effect.amountCents,
        fromAccountId: String(effect.fromAccountId),
        toAccountId: String(effect.toAccountId),
        type: "ACCOUNT_RECLASS",
      };
    default: {
      const _exhaustive: never = effect;
      return _exhaustive;
    }
  }
}

export type JeProposalHashBody = {
  companyId: string;
  engagementId: string;
  firmClientId: string | null;
  periodEnd: string;
  sourceContinuousCloseRunId: string;
  sourceAccountingSyncId: string;
  sourceReconRunIds: readonly string[];
  originType: JeProposalOriginType;
  reasonCode: string;
  memo: string | null;
  currency: string;
  txnDate: string;
  lines: readonly JeProposalLine[];
  totalDebitsCents: number;
  totalCreditsCents: number;
  expectedEffects: readonly JeExpectedEffect[];
  policyHash: string;
};

export function canonicalizeJeProposal(body: JeProposalHashBody): Record<string, unknown> {
  const lines = [...body.lines]
    .map(canonicalizeLine)
    .sort((a, b) => Number(a.sequence) - Number(b.sequence));
  return {
    companyId: body.companyId,
    currency: body.currency,
    engagementId: body.engagementId,
    expectedEffects: body.expectedEffects.map(canonicalizeEffect),
    firmClientId: body.firmClientId,
    lines,
    memo: body.memo,
    originType: body.originType,
    periodEnd: body.periodEnd,
    policyHash: body.policyHash,
    reasonCode: body.reasonCode,
    sourceAccountingSyncId: body.sourceAccountingSyncId,
    sourceContinuousCloseRunId: body.sourceContinuousCloseRunId,
    sourceReconRunIds: sortedStrings(body.sourceReconRunIds),
    totalCreditsCents: body.totalCreditsCents,
    totalDebitsCents: body.totalDebitsCents,
    txnDate: body.txnDate,
  };
}

export function hashJeProposal(body: JeProposalHashBody): string {
  return sha256Hex(stableCanonicalJson(canonicalizeJeProposal(body)));
}

export function hashJeProposalIdempotencyKey(args: {
  companyId: string;
  engagementId: string;
  sourceContinuousCloseRunId: string;
  proposalHash: string;
}): string {
  return sha256Hex(
    stableCanonicalJson({
      companyId: args.companyId,
      engagementId: args.engagementId,
      proposalHash: args.proposalHash,
      sourceContinuousCloseRunId: args.sourceContinuousCloseRunId,
    }),
  );
}

export { sha256Hex, stableCanonicalJson };
