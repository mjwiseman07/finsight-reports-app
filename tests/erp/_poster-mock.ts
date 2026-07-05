import { vi } from "vitest";
import { makeMockDb, type MockDb } from "../pre-close/_mock-db";

export function makePosterMockDb(): MockDb & { auditRows: Record<string, unknown>[] } {
  const mock = makeMockDb();
  const auditRows: Record<string, unknown>[] = [];
  const innerFrom = mock.from as unknown as (table: string) => object;

  mock.__seed("assertions_catalog", [
    { assertion_id: "completeness" },
    { assertion_id: "accuracy" },
    { assertion_id: "cutoff" },
    { assertion_id: "existence_occurrence" },
  ]);

  mock.from = vi.fn((table: string) => {
    if (table === "je_post_attempts") {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: { attempt_id: "att-1", status: "pending", qbo_je_id: null },
              error: null,
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === "firm_clients") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { accounting_method: "accrual" }, error: null }),
          }),
        }),
      };
    }
    if (table === "je_posting_audit") {
      return {
        insert: async (row: Record<string, unknown>) => {
          auditRows.push(row);
          mock.__seed("je_posting_audit", [row]);
          return { error: null };
        },
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: auditRows.find((r) => r.status === "posted") ?? null,
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    return innerFrom(table);
  }) as typeof mock.from;

  return Object.assign(mock, { auditRows });
}

export function basePostPayload() {
  return {
    transaction_date: "2026-07-01",
    lines: [
      { account_id: "7", amount: 1.0, posting_type: "Debit" as const },
      { account_id: "35", amount: 1.0, posting_type: "Credit" as const },
    ],
  };
}
