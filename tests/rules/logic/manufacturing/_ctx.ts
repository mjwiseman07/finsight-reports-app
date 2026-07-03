import type { RuleContext } from "@/lib/rules/vertical-types";

export function mfgCtx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    firmClientId: "mfg-client-1",
    companyId: "co-mfg",
    industryVertical: "manufacturing",
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

export function memRecord(payload: Record<string, unknown>) {
  return { memory_id: "mem-test", payload } as never;
}

export function plReport(rows: ReturnType<typeof plRow>[]) {
  return { Rows: { Row: rows } };
}
