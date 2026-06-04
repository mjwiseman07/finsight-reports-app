import type {
  SyntheticCompanyMemorySourceRef,
  SyntheticCompanyThresholdOverride,
  SyntheticThresholdOverrideOperator,
} from "./types";
import { stableMemoryHash } from "./stableMemoryHash";

export function buildThresholdOverride(input: {
  industryProfileId: string;
  industryProfileVersion: string;
  thresholdKey: string;
  metricKey: string;
  operator: SyntheticThresholdOverrideOperator;
  overrideValue?: number;
  overrideRange?: { min: number; max: number };
  overrideReasonCode: string;
  approvedBy: string;
  approvedAt: string;
  effectiveDate: string;
  retiredDate?: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
}): SyntheticCompanyThresholdOverride {
  const overrideId = stableMemoryHash({
    type: "threshold_override",
    industryProfileId: input.industryProfileId,
    industryProfileVersion: input.industryProfileVersion,
    thresholdKey: input.thresholdKey,
    metricKey: input.metricKey,
    effectiveDate: input.effectiveDate,
  });

  return {
    overrideId,
    industryProfileId: input.industryProfileId,
    industryProfileVersion: input.industryProfileVersion,
    thresholdKey: input.thresholdKey,
    metricKey: input.metricKey,
    operator: input.operator,
    overrideValue: input.overrideValue,
    overrideRange: input.overrideRange,
    overrideReasonCode: input.overrideReasonCode,
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    effectiveDate: input.effectiveDate,
    retiredDate: input.retiredDate,
    sourceRefs: input.sourceRefs,
  };
}
