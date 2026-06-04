import type { SyntheticSnapshotIndustryContext } from "../types/snapshot-storage";

export function buildSnapshotIndustryContext(input?: SyntheticSnapshotIndustryContext): SyntheticSnapshotIndustryContext {
  return {
    industryProfileId: input?.industryProfileId,
    industryProfileVersion: input?.industryProfileVersion,
    industryProfileEffectiveDate: input?.industryProfileEffectiveDate,
    industryProfileSource: input?.industryProfileSource,
  };
}
