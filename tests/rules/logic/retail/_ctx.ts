import type { RuleContext } from "@/lib/rules/vertical-types";

export function rtlCtx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    firmClientId: "rtl-client-1",
    companyId: "co-rtl",
    industryVertical: "retail",
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

/** Memory account-list record for resolveAccounts. */
export function acctRecord(accounts: Array<{ account_id: string; account_name: string }>) {
  return { memory_id: "mem-acct", payload: { accounts } } as never;
}
