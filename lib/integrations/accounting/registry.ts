import { dynamics365AccountingProvider } from "./providers/dynamics365";
import { netSuiteAccountingProvider } from "./providers/netsuite";
import { quickBooksAccountingProvider } from "./providers/quickbooks";
import { sageAccountingProvider } from "./providers/sage";
import { xeroAccountingProvider } from "./providers/xero";
import type { AccountingProvider, AccountingProviderAdapter } from "./types";

export const providerRegistry: Record<AccountingProvider, AccountingProviderAdapter> = {
  quickbooks: quickBooksAccountingProvider,
  xero: xeroAccountingProvider,
  sage: sageAccountingProvider,
  netsuite: netSuiteAccountingProvider,
  dynamics365: dynamics365AccountingProvider,
};

export function getAccountingProvider(provider: string): AccountingProviderAdapter {
  const normalizedProvider = String(provider || "").toLowerCase() as AccountingProvider;
  const adapter = providerRegistry[normalizedProvider];

  if (!adapter) {
    throw new Error(`Unsupported accounting provider: ${provider}`);
  }

  return adapter;
}

export function getEnabledProviders() {
  return Object.values(providerRegistry).map((provider) => ({
    provider: provider.provider,
    providerFamily: provider.providerFamily,
    providerProduct: provider.providerProduct,
    capabilities: provider.getCapabilities(),
  }));
}
