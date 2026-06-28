import type { ExtractedFiling } from "../../../scripts/external-truth/types";

export interface FundAccountingEmitterInput {
  extracted: ExtractedFiling;
  narrativeHaystack: string;
  hasNetAssets: boolean;
  hasShares: boolean;
  hasNavNarrative: boolean;
  isNcsrOrNq: boolean;
}

export function buildFundAccountingEmitterInput(extracted: ExtractedFiling): FundAccountingEmitterInput {
  const narrativeHaystack = extracted.narrativeSnippets.join(" ").toLowerCase();
  const faNav = extracted.fund_accounting?.nav;
  const hasNetAssets =
    Boolean(faNav?.net_assets) ||
    extracted.numericFacts.some((fact) => /netassets/i.test(fact.tag));
  const hasShares =
    Boolean(faNav?.shares_outstanding) ||
    extracted.numericFacts.some((fact) =>
      /sharesoutstanding|entitycommonstocksharesoutstanding/i.test(fact.tag),
    );
  const hasNavNarrative = /net asset value|\bnav\b|per share/i.test(narrativeHaystack);
  const isNcsrOrNq =
    /n-csr|n-q/i.test(extracted.formType) || /n-csr|n-q/i.test(narrativeHaystack);
  return {
    extracted,
    narrativeHaystack,
    hasNetAssets,
    hasShares,
    hasNavNarrative,
    isNcsrOrNq,
  };
}

export function hasTopHoldingsInput(extracted: ExtractedFiling): boolean {
  const holdings = extracted.fund_accounting?.holdings;
  return Boolean(
    holdings &&
      holdings.top_n > 0 &&
      holdings.as_of_date &&
      holdings.entries &&
      holdings.entries.length > 0,
  );
}

export function hasDerivativesInput(extracted: ExtractedFiling): boolean {
  const contracts = extracted.fund_accounting?.derivatives?.contracts;
  return Boolean(contracts && contracts.length > 0 && contracts.every((c) => c.type && c.counterparty));
}

export function hasBrokerageInput(extracted: ExtractedFiling): boolean {
  const brokerage = extracted.fund_accounting?.brokerage;
  return Boolean(brokerage && brokerage.commissions_by_broker.length > 0);
}

export function hasPortfolioTurnoverInput(extracted: ExtractedFiling): boolean {
  const turnover = extracted.fund_accounting?.portfolio_turnover;
  return Boolean(turnover && turnover.numerator >= 0 && turnover.denominator > 0 && turnover.methodology);
}

export const HAPPY_TOP_HOLDINGS = {
  top_n: 10,
  as_of_date: "2026-03-31",
  entries: [
    { issuer: "Apple Inc", fair_value: 1_250_000_000, pct_of_net_assets: 7.2 },
    { issuer: "Microsoft Corp", fair_value: 1_100_000_000, pct_of_net_assets: 6.4 },
  ],
};

export const HAPPY_DERIVATIVES = {
  contracts: [
    {
      type: "index futures",
      counterparty: "CME Clearing",
      notional: 500_000_000,
      fair_value: 2_400_000,
      expiration: "2026-06-30",
    },
  ],
};

export const HAPPY_BROKERAGE = {
  commissions_by_broker: [
    { broker: "Goldman Sachs", amount: 125_000 },
    { broker: "Morgan Stanley", amount: 98_500 },
  ],
  soft_dollar_arrangements: "research services under soft-dollar policy",
};

export const HAPPY_TURNOVER = {
  numerator: 420_000_000,
  denominator: 8_500_000_000,
  methodology: "lesser of purchases or sales divided by average net assets",
};

export const HAPPY_NAV = {
  net_assets: 17_500_000_000,
  shares_outstanding: 850_000_000,
};
