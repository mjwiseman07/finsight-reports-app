import type { AccountingProvider, CanonicalChartOfAccountsItem } from "../types";

export function normalizeAccounts(
  provider: AccountingProvider,
  rows: unknown[] = [],
  externalEntityId?: string,
): CanonicalChartOfAccountsItem[] {
  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    const parentRef = record.ParentRef as Record<string, unknown> | undefined;
    const externalRecordId = String(record.Id || record.id || record.AccountID || record.accountId || record.account_code || record.number || "");
    return {
      id: `${provider}:${externalRecordId || record.Name || record.name || "account"}`,
      name: String(record.Name || record.name || record.account_name || "Unnamed account"),
      accountNumber: String(record.AcctNum || record.number || record.Code || record.account_code || ""),
      accountType: String(record.AccountType || record.type || record.account_type || ""),
      parentId: parentRef?.value ? `${provider}:${parentRef.value}` : String(record.parentId || ""),
      active: Boolean(record.Active ?? record.active ?? true),
      source: {
        provider,
        providerFamily: provider,
        providerProduct: provider,
        externalEntityId,
        externalRecordId,
        sourceReport: "ChartOfAccounts",
        raw: row,
      },
    };
  });
}
