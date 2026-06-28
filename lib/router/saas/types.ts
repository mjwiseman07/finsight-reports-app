import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { FrameworkUnsupportedError } from "./errors";

export interface SaasEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
  hasRevenuesTag: boolean;
  hasContractTags: boolean;
}

export function buildSaasEmitterInput(extracted: ExtractedFiling): SaasEmitterInput {
  const narrativeHaystack = extracted.narrativeSnippets.join(" ");
  const hasRevenuesTag = extracted.numericFacts.some((fact) => /Revenues?/i.test(fact.tag));
  const hasContractTags = extracted.numericFacts.some((fact) =>
    /ContractWithCustomer|DeferredRevenue|DeferredSalesCommission|CapitalizedContractCost/i.test(fact.tag),
  );
  return { extracted, narrativeHaystack, hasRevenuesTag, hasContractTags };
}

export function assertSaasFrameworkSupported(extracted: ExtractedFiling): void {
  if (extracted.framework !== "us-gaap" && extracted.framework !== "ifrs") {
    throw new FrameworkUnsupportedError(`SaaS framework not supported: ${extracted.framework}`);
  }
}

export function hasContractBalances(extracted: ExtractedFiling): boolean {
  const cr = extracted.contract_revenue;
  return Boolean(
    cr?.contract_asset?.current !== undefined && cr?.contract_liability?.current !== undefined,
  );
}

export function hasDeferredRevenueRollforward(extracted: ExtractedFiling): boolean {
  const roll = extracted.contract_revenue?.deferred_revenue_rollforward;
  return Boolean(
    roll &&
      roll.beginning_balance >= 0 &&
      roll.revenue_deferred >= 0 &&
      roll.revenue_recognized >= 0 &&
      roll.ending_balance >= 0,
  );
}

export function hasRevenueDisaggregation(extracted: ExtractedFiling): boolean {
  const categories = extracted.contract_revenue?.revenue_by_category;
  return Boolean(categories && Object.keys(categories).length >= 2);
}

export function hasCostToObtain(extracted: ExtractedFiling): boolean {
  const cto = extracted.contract_revenue?.cost_to_obtain;
  return Boolean(cto && cto.capitalized >= 0 && cto.amortization >= 0);
}

export function hasTransactionPriceAllocation(extracted: ExtractedFiling): boolean {
  const tpa = extracted.contract_revenue?.transaction_price_allocation;
  return Boolean(tpa && tpa.length >= 1);
}

export function hasRemainingPerformanceObligation(extracted: ExtractedFiling): boolean {
  const rpo = extracted.contract_revenue?.remaining_performance_obligation;
  return Boolean(rpo && rpo.total > 0 && rpo.within_twelve_months >= 0);
}

export function hasVariableConsideration(extracted: ExtractedFiling): boolean {
  const vc = extracted.contract_revenue?.variable_consideration;
  return Boolean(vc && vc.constrained_amount >= 0 && vc.constraint_rationale.length > 0);
}

export function hasPrincipalOrAgent(extracted: ExtractedFiling): boolean {
  return extracted.contract_revenue?.principal_or_agent === "principal" ||
    extracted.contract_revenue?.principal_or_agent === "agent";
}

export const HAPPY_CONTRACT_REVENUE: NonNullable<ExtractedFiling["contract_revenue"]> = {
  contract_asset: { current: 500_000_000, noncurrent: 200_000_000 },
  contract_liability: { current: 1_200_000_000, noncurrent: 800_000_000 },
  deferred_revenue_rollforward: {
    beginning_balance: 1_100_000_000,
    revenue_deferred: 4_500_000_000,
    revenue_recognized: 4_200_000_000,
    ending_balance: 1_400_000_000,
  },
  revenue_by_category: {
    subscription: 10_000_000_000,
    professional_services: 1_500_000_000,
    usage_based: 500_000_000,
  },
  cost_to_obtain: { capitalized: 800_000_000, amortization: 650_000_000 },
  transaction_price_allocation: [
    { obligation: "subscription license", amount: 9_000_000_000 },
    { obligation: "support services", amount: 3_000_000_000 },
  ],
  remaining_performance_obligation: { total: 25_000_000_000, within_twelve_months: 12_000_000_000 },
  variable_consideration: {
    constrained_amount: 120_000_000,
    constraint_rationale: "highly probable threshold applied to usage-based fees",
  },
  principal_or_agent: "principal",
};
