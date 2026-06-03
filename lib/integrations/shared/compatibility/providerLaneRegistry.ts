import { quickBooksLaneAdapter } from "../../quickbooks";
import { xeroLaneAdapter } from "../../xero";
import type { AccountingSystemAdapter, AccountingSystemAdapterSource } from "../contracts";

export const accountingProviderLaneRegistry: Record<AccountingSystemAdapterSource, AccountingSystemAdapter> = {
  quickbooks: quickBooksLaneAdapter,
  xero: xeroLaneAdapter,
};

export function getProviderLaneAdapter(sourceSystem: AccountingSystemAdapterSource): AccountingSystemAdapter {
  const adapter = accountingProviderLaneRegistry[sourceSystem];
  if (!adapter) throw new Error(`Unsupported accounting provider lane: ${sourceSystem}`);
  return adapter;
}
