import type { SyntheticIndustryProfile, SyntheticIndustryMaturityLevel } from "../types/industry-profile";

const maturityRank: Record<SyntheticIndustryMaturityLevel, number> = {
  basic: 1,
  intermediate: 2,
  advanced: 3,
  enterprise: 4,
};

function isMaturityCompatible(profile: SyntheticIndustryProfile, minimum?: SyntheticIndustryMaturityLevel) {
  if (!minimum || !profile.industryMaturityLevel) return true;
  return maturityRank[minimum] <= maturityRank[profile.industryMaturityLevel];
}

function hasDuplicate(values: string[]) {
  return new Set(values).size !== values.length;
}

function detectCircularInheritance(profile: SyntheticIndustryProfile, catalog: SyntheticIndustryProfile[]) {
  const seen = new Set<string>();
  let current: SyntheticIndustryProfile | undefined = profile;
  while (current?.parentProfile?.parentIndustryProfileId) {
    const parentId: string = current.parentProfile.parentIndustryProfileId;
    if (seen.has(parentId)) return true;
    seen.add(parentId);
    current = catalog.find((candidate) => candidate.industryProfileId === parentId);
  }
  return false;
}

export function validateIndustryProfile(profile: SyntheticIndustryProfile, catalog: SyntheticIndustryProfile[]) {
  const errors: string[] = [];
  if (!profile.industryProfileId) errors.push("missing_industryProfileId");
  if (!profile.industryName) errors.push("missing_industryName");
  if (!profile.version) errors.push("missing_version");
  if (!profile.effectiveDate) errors.push("missing_effectiveDate");
  if (!profile.profileStatus) errors.push("missing_profileStatus");
  if (!profile.industryMaturityLevel) errors.push("missing_industryMaturityLevel");
  if (!profile.kpiCatalog?.length) errors.push("missing_kpiCatalog");
  if (!profile.thresholdCatalog?.length) errors.push("missing_thresholdCatalog");
  if (!profile.benchmarkCatalog?.length) errors.push("missing_benchmarkCatalog");
  if (!profile.seasonalityProfile) errors.push("missing_seasonalityProfile");
  if (!profile.confidenceRules?.length) errors.push("missing_confidenceRules");
  if (!profile.evidenceExpectations?.length) errors.push("missing_evidenceExpectations");
  if (!profile.signalExpectations?.length) errors.push("missing_signalExpectations");
  if (!profile.recommendationExpectations?.length) errors.push("missing_recommendationExpectations");

  const kpiKeys = (profile.kpiCatalog || []).map((entry) => entry.kpiKey);
  if (hasDuplicate(kpiKeys)) errors.push("duplicate_kpi_keys");
  const thresholdKeys = (profile.thresholdCatalog || []).map((entry) => entry.thresholdKey);
  if (hasDuplicate(thresholdKeys)) errors.push("duplicate_threshold_keys");

  if (profile.parentProfile) {
    const parent = catalog.find((candidate) => candidate.industryProfileId === profile.parentProfile?.parentIndustryProfileId);
    if (!parent) errors.push("missing_parent_profile");
    if (detectCircularInheritance(profile, catalog)) errors.push("circular_inheritance");
  }

  for (const entry of profile.kpiCatalog || []) {
    if (entry.tier === "required" && !isMaturityCompatible(profile, entry.minimumMaturityLevel)) errors.push(`required_kpi_maturity_mismatch:${entry.kpiKey}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateIndustryProfileCatalog(catalog: SyntheticIndustryProfile[]) {
  const errors = catalog.flatMap((profile) => validateIndustryProfile(profile, catalog).errors.map((error) => `${profile.industryProfileId}:${error}`));
  const activeKeys = catalog
    .filter((profile) => profile.profileStatus === "active")
    .map((profile) => `${profile.industryProfileId}:${profile.effectiveDate}`);
  if (hasDuplicate(activeKeys)) errors.push("duplicate_active_profile_effective_date");
  return {
    valid: errors.length === 0,
    errors,
  };
}
