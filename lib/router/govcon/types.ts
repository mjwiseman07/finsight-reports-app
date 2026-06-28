import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkUnsupportedError } from "./errors";

export interface GovconEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
}

export function buildGovconEmitterInput(extracted: ExtractedFiling): GovconEmitterInput {
  return {
    extracted,
    narrativeHaystack: extracted.narrativeSnippets.join(" "),
  };
}

export function assertGovconFrameworkSupported(extracted: ExtractedFiling): void {
  if (extracted.framework !== "us-gaap" && extracted.framework !== "ifrs") {
    throw new FrameworkUnsupportedError(`GovCon framework not supported: ${extracted.framework}`);
  }
}

export function hasContractTypeMix(extracted: ExtractedFiling): boolean {
  const byType = extracted.govcon?.contracts?.by_type;
  return Boolean(byType && Object.keys(byType).length >= 3);
}

export function hasCasCoverage(extracted: ExtractedFiling): boolean {
  const cas = extracted.govcon?.cas_coverage;
  return Boolean(cas && cas.applicable_standards.length > 0 && cas.coverage_type);
}

export function hasBacklogSplit(extracted: ExtractedFiling): boolean {
  const backlog = extracted.govcon?.backlog;
  return Boolean(backlog && backlog.funded >= 0 && backlog.unfunded >= 0);
}

export function hasBacklogHorizon(extracted: ExtractedFiling): boolean {
  const backlog = extracted.govcon?.backlog;
  return Boolean(
    backlog &&
      backlog.funded >= 0 &&
      backlog.unfunded >= 0 &&
      backlog.horizon_years &&
      backlog.horizon_years.length > 0,
  );
}

export function hasUnallowableCosts(extracted: ExtractedFiling): boolean {
  const costs = extracted.govcon?.unallowable_costs;
  return Boolean(costs && costs.identified_categories.length > 0 && costs.exclusion_methodology);
}

export function hasIndirectRates(extracted: ExtractedFiling): boolean {
  const rates = extracted.govcon?.indirect_rates;
  return Boolean(rates && rates.fringe >= 0 && rates.overhead >= 0 && rates.ga >= 0 && rates.true_up_methodology);
}

export const HAPPY_GOVCON_US = {
  contracts: {
    by_type: { FFP: 42, CPFF: 18, CPIF: 12, T_AND_M: 8, IDIQ: 20 },
  },
  customer_concentration: { us_government_pct: 72 },
  cas_coverage: {
    applicable_standards: ["CAS 401", "CAS 410", "CAS 418"],
    coverage_type: "full" as const,
  },
  backlog: { funded: 28_000_000_000, unfunded: 12_500_000_000, option_years: 5 },
  unallowable_costs: {
    identified_categories: ["entertainment", "lobbying", "alcohol"],
    exclusion_methodology: "FAR 31.205 unallowable cost exclusion from forward pricing rates",
  },
  indirect_rates: {
    fringe: 0.28,
    overhead: 0.15,
    ga: 0.09,
    true_up_methodology: "annual forward pricing rate agreement true-up",
  },
};

export const HAPPY_GOVCON_IFRS = {
  contracts: {
    by_type: { fixed_price: 45, cost_reimbursable: 30, incentive: 15, service: 10 },
  },
  customer_concentration: { us_government_pct: 0 },
  backlog: { funded: 9_500_000_000, unfunded: 4_200_000_000, horizon_years: [3, 5, 7] },
};
