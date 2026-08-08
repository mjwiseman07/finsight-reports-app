import { quickBooksWriteProvider } from "../../quickbooks/accounting-provider";
import { xeroWriteProvider } from "../../xero/accounting-provider";
import type { AccountingSystemAdapter, AccountingSystemAdapterSource } from "../contracts";

export const accountingProviderLaneRegistry: Record<AccountingSystemAdapterSource, AccountingSystemAdapter> = {
  quickbooks: quickBooksWriteProvider,
  xero: xeroWriteProvider,
};

export function getProviderLaneAdapter(sourceSystem: AccountingSystemAdapterSource): AccountingSystemAdapter {
  const adapter = accountingProviderLaneRegistry[sourceSystem];
  if (!adapter) throw new Error(`Unsupported accounting provider lane: ${sourceSystem}`);
  return adapter;
}
