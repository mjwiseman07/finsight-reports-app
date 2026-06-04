import type { SyntheticIndustryProfile } from "../types/industry-profile";
import { syntheticIndustryProfileCatalog } from "./catalog";

function activeOn(profile: SyntheticIndustryProfile, effectiveDate?: string) {
  if (profile.profileStatus !== "active") return false;
  if (!effectiveDate) return true;
  if (profile.effectiveDate && profile.effectiveDate > effectiveDate) return false;
  if (profile.retiredDate && profile.retiredDate <= effectiveDate) return false;
  return true;
}

export function getIndustryProfile({
  industryProfileId,
  version,
  effectiveDate,
}: {
  industryProfileId: string;
  version?: string;
  effectiveDate?: string;
}): SyntheticIndustryProfile | null {
  return syntheticIndustryProfileCatalog.find((profile) =>
    profile.industryProfileId === industryProfileId &&
    (!version || profile.version === version) &&
    activeOn(profile, effectiveDate),
  ) || null;
}

export function listActiveIndustryProfiles(effectiveDate?: string): SyntheticIndustryProfile[] {
  return syntheticIndustryProfileCatalog.filter((profile) => activeOn(profile, effectiveDate));
}
