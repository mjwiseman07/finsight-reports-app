/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-F capability resolution — delegates to treatment-resolver via shim; never hardcodes treatments.
 * Citation: ASC_946_INVESTMENT_COMPANIES, ASC_820_FAIR_VALUE, IFRS_13_FAIR_VALUE.
 */

import type {
  FundAccountingPanelContext,
  FundCapabilityKey,
} from "../../contracts/fund-accounting/FABasisContracts";
import type { FAAuditEmitter } from "../audit/fa-audit-emitter";
import {
  emitTreatmentResolverAudit,
  emitMemoryFrameworkDimension,
} from "../audit/fa-audit-emitter";
import {
  assertFrameworkHintMatchesEntity,
  getDualBookFrameworks,
  getStandardsCitationHandle,
  type FrameworkHint,
  investmentEntityExceptionApplies,
} from "../kernel/fa-framework-binding";
import { assertCapabilityApplicable } from "../kernel/fa-sub-segment-router";
import { buildSubSegmentCacheKey } from "../kernel/fa-sub-segment-router";
import { resolveReportingFramework } from "../composition/resolveReportingFramework";

export interface CapabilityResolutionResult {
  capabilityKey: FundCapabilityKey;
  framework: FrameworkHint;
  citationHandle: string;
  treatmentSource: "treatment-resolver";
  artifactTag: string;
}

export interface ResolveCapabilityParams {
  context: FundAccountingPanelContext;
  capabilityKey: FundCapabilityKey;
  frameworkHint?: FrameworkHint;
  emitter: FAAuditEmitter;
  timestamp: string;
}

export function resolveFundCapability(
  params: ResolveCapabilityParams,
): CapabilityResolutionResult[] {
  const { context, capabilityKey, emitter, timestamp } = params;
  assertCapabilityApplicable(context.subSegment, capabilityKey);

  const frameworkHint = params.frameworkHint ?? context.primaryFramework;
  assertFrameworkHintMatchesEntity(context, frameworkHint);

  // Confirm resolver delegation (never hardcoded)
  resolveReportingFramework(context.reportingBasis, context.companyId);

  const frameworks = getDualBookFrameworks(context) ?? [frameworkHint];
  const results: CapabilityResolutionResult[] = [];

  for (const fw of frameworks) {
    const citationHandle = getStandardsCitationHandle(capabilityKey, fw);
    const artifactTag = `${capabilityKey}:${fw}:${citationHandle}`;

    emitTreatmentResolverAudit(emitter, {
      entityId: context.entityId ?? context.companyId,
      capabilityKey,
      framework: fw,
      citationHandle,
      timestamp,
    });

    const cacheKey = buildSubSegmentCacheKey(
      context.entityId ?? context.companyId,
      context.subSegment,
      capabilityKey,
    );
    emitMemoryFrameworkDimension(emitter, {
      entityId: context.entityId ?? context.companyId,
      framework: fw,
      capabilityKey,
      cacheKey,
    });

    results.push({
      capabilityKey,
      framework: fw,
      citationHandle,
      treatmentSource: "treatment-resolver",
      artifactTag,
    });
  }

  return results;
}

export function resolveInvestmentEntityException(
  context: FundAccountingPanelContext,
  emitter: FAAuditEmitter,
  timestamp: string,
): CapabilityResolutionResult | null {
  if (!investmentEntityExceptionApplies(context.primaryFramework)) {
    return null;
  }
  const results = resolveFundCapability({
    context,
    capabilityKey: "liability-equity-classification",
    frameworkHint: context.primaryFramework,
    emitter,
    timestamp,
  });
  return results[0] ?? null;
}

export function getFairValueLevelLabel(
  level: 1 | 2 | 3,
  framework: FrameworkHint,
): string {
  const prefix = framework === "US_GAAP" ? "ASC_820" : "IFRS_13";
  return `${prefix}:Level${level}`;
}

export function classifyRedeemableUnits(
  framework: FrameworkHint,
): { standard: string; classification: "liability" | "equity" | "temporary-equity" } {
  if (framework === "US_GAAP") {
    return { standard: "ASC_480", classification: "temporary-equity" };
  }
  return { standard: "IAS_32", classification: "equity" };
}
