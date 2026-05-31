import type { AccountingProvider, CanonicalSourceMetadata } from "../types";

export interface CanonicalTransaction {
  id: string;
  date: string;
  accountId?: string;
  accountName?: string;
  memo?: string;
  amount: number;
  source: CanonicalSourceMetadata;
}

export function normalizeTransactions(
  provider: AccountingProvider,
  rows: unknown[] = [],
  externalEntityId?: string,
): CanonicalTransaction[] {
  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    const externalRecordId = String(record.Id || record.id || record.TransactionID || record.transactionId || "");
    return {
      id: `${provider}:${externalRecordId || `${record.date || "undated"}:${record.amount || 0}`}`,
      date: String(record.TxnDate || record.date || record.Date || ""),
      accountId: String(record.accountId || record.AccountID || ""),
      accountName: String(record.accountName || record.AccountName || ""),
      memo: String(record.memo || record.Memo || record.Description || ""),
      amount: Number(record.amount ?? record.Amount ?? 0) || 0,
      source: {
        provider,
        providerFamily: provider,
        providerProduct: provider,
        externalEntityId,
        externalRecordId,
        sourceReport: "Transactions",
        raw: row,
      },
    };
  });
}
