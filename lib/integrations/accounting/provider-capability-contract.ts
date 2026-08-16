/**
 * Provider capability contract for Scorecard availability.
 * Determines whether a KPI *can* be produced — never KPI math.
 */

import type { AccountingProvider, ProviderCapabilities } from "./types";

export type ScorecardCapabilityKey =
  | "balanceSheet"
  | "profitAndLoss"
  | "cashFlow"
  | "arAging"
  | "apAging"
  | "inventory"
  | "fixedAssets";

export type ScorecardProviderCapabilityContract = {
  provider: AccountingProvider | string;
  balanceSheet: boolean;
  profitAndLoss: boolean;
  cashFlow: boolean;
  arAging: boolean;
  apAging: boolean;
  inventory: boolean;
  fixedAssets: boolean;
  /** Human-readable reasons when a capability is false. */
  notes?: Partial<Record<ScorecardCapabilityKey, string>>;
};

/**
 * Map existing ProviderCapabilities (+ known provider policy) into the
 * Scorecard availability contract. Missing capability → NOT AVAILABLE,
 * never $0.
 */
export function toScorecardCapabilityContract(input: {
  provider: AccountingProvider | string;
  capabilities: ProviderCapabilities;
}): ScorecardProviderCapabilityContract {
  const { provider, capabilities } = input;
  const cashFlowSupported = capabilities.cash_flow
    ? Boolean(capabilities.cash_flow.supported)
    : Boolean(capabilities.supports_cash_flow);

  const notes: ScorecardProviderCapabilityContract["notes"] = {};
  if (!cashFlowSupported) {
    notes.cashFlow =
      capabilities.cash_flow?.customerMessage ||
      capabilities.cash_flow?.reason ||
      "Statement of Cash Flows is not available for this provider configuration.";
  }
  if (!capabilities.supports_pnl) {
    notes.profitAndLoss = "Profit and Loss is not available for this provider configuration.";
  }
  if (!capabilities.supports_balance_sheet) {
    notes.balanceSheet = "Balance Sheet is not available for this provider configuration.";
  }

  return {
    provider,
    balanceSheet: Boolean(capabilities.supports_balance_sheet),
    profitAndLoss: Boolean(capabilities.supports_pnl),
    cashFlow: cashFlowSupported,
    // Aging / inventory / FA are report-gated at sync time; default true when BS/PnL work
    // so absence is expressed as SOURCE_MISSING on the schedule, not capability false.
    arAging: true,
    apAging: true,
    inventory: true,
    fixedAssets: true,
    notes: Object.keys(notes).length ? notes : undefined,
  };
}

/** Availability outcome when a capability or source is absent. */
export const SOURCE_NOT_PROVIDED_MESSAGE = "NOT AVAILABLE — SOURCE NOT PROVIDED";
