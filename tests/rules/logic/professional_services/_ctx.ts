import type { RuleContext } from "@/lib/rules/vertical-types";

export function psCtx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    firmClientId: "ps-client-1",
    companyId: "co-ps",
    industryVertical: "professional_services",
    accountingMethod: "accrual",
    targetType: "period",
    targetRef: "2026-06",
    inputs: { periodEndDate: "2026-06-30" },
    inputsHash: "h",
    qbo: { accessToken: "tok", realmId: "realm" },
    ...overrides,
  };
}

export function plRow(label: string, amount: number) {
  return { ColData: [{ value: label }, { value: amount.toFixed(2) }] };
}

export function plReport(rows: ReturnType<typeof plRow>[]) {
  return { Rows: { Row: rows } };
}

export function memRecord(payload: Record<string, unknown>) {
  return { memory_id: "mem-test", payload } as never;
}

export function acctRecord(accounts: Array<{ account_id: string; account_name: string }>) {
  return { memory_id: "mem-acct", payload: { accounts } } as never;
}

/** Build a JournalEntry with one line touching an account by name. */
export function je(
  date: string,
  accountName: string,
  amount: number,
  postingType: "Debit" | "Credit",
  classId?: string,
) {
  return {
    Id: `je-${date}-${amount}`,
    TxnDate: date,
    Line: [
      {
        Amount: amount,
        JournalEntryLineDetail: {
          PostingType: postingType,
          AccountRef: { name: accountName },
          ...(classId ? { ClassRef: { value: classId } } : {}),
        },
      },
    ],
  };
}
