export const advisoryPackageTypes = [
  "month_end",
  "ytd",
  "board_package",
  "healthcare_rcm",
  "construction_wip",
  "manufacturing_variance",
];

export const advisorySignalSeverities = ["low", "medium", "high", "critical"];
export const advisorySignalStatuses = ["new", "reviewed", "dismissed", "converted_to_package"];
export const advisoryPackageStatuses = ["pending_review", "approved", "generated", "dismissed"];

export const defaultAdvisoryThresholds = {
  general: {
    revenueVariancePercent: 10,
    grossMarginVariancePercent: 5,
    ebitdaVariancePercent: 10,
    cashDeclinePercent: 15,
    arOver60IncreasePercent: 10,
    apPastDueIncreasePercent: 10,
  },
  healthcare: {
    dsoIncreaseDays: 5,
    cleanClaimRateDeclinePercent: 3,
    ppdIncreasePercent: 5,
    arOver90IncreasePercent: 10,
  },
  construction: {
    jobCostOverrunPercent: 5,
    retainageIncreasePercent: 10,
    underOverBillingVariancePercent: 5,
  },
  manufacturing: {
    materialVariancePercent: 5,
    laborEfficiencyVariancePercent: 5,
    scrapVariancePercent: 3,
  },
};

function normalizeIndustry(industry = "") {
  const value = String(industry || "").toLowerCase();
  if (/health|medical|care|rcm/.test(value)) return "healthcare";
  if (/construction|contractor|wip/.test(value)) return "construction";
  if (/manufactur|plant|factory|production/.test(value)) return "manufacturing";
  return "general";
}

export function getAdvisoryThresholds(industry = "general", overrides = {}) {
  const key = normalizeIndustry(industry);
  return {
    industryKey: key,
    general: {
      ...defaultAdvisoryThresholds.general,
      ...(overrides.general || {}),
    },
    healthcare: {
      ...defaultAdvisoryThresholds.healthcare,
      ...(overrides.healthcare || {}),
    },
    construction: {
      ...defaultAdvisoryThresholds.construction,
      ...(overrides.construction || {}),
    },
    manufacturing: {
      ...defaultAdvisoryThresholds.manufacturing,
      ...(overrides.manufacturing || {}),
    },
  };
}

export function thresholdForIndustry(industry, key, overrides = {}) {
  const thresholds = getAdvisoryThresholds(industry, overrides);
  const industryKey = thresholds.industryKey;
  return thresholds[industryKey]?.[key] ?? thresholds.general[key];
}
