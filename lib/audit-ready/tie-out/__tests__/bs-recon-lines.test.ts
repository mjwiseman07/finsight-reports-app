import { describe, it, expect, vi, beforeEach } from "vitest";

const linesOrder = vi.fn();
const linesEq = vi.fn(() => ({ order: linesOrder }));
const linesSelect = vi.fn(() => ({ eq: linesEq }));

const txnsOrder = vi.fn();
const txnsEq2 = vi.fn(() => ({ order: txnsOrder }));
const txnsEq1 = vi.fn(() => ({ eq: txnsEq2 }));
const txnsSelect = vi.fn(() => ({ eq: txnsEq1 }));

const runMaybeSingle = vi.fn();
const runEq = vi.fn(() => ({ maybeSingle: runMaybeSingle }));
const runSelect = vi.fn(() => ({ eq: runEq }));

const fromMock = vi.fn((table: string) => {
  if (table === "audit_ready_bs_recon_summary_lines") {
    return { select: linesSelect };
  }
  if (table === "audit_ready_bs_recon_transactions") {
    return { select: txnsSelect };
  }
  if (table === "audit_ready_tie_out_runs") {
    return { select: runSelect };
  }
  return { select: vi.fn() };
});

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import {
  getBsSummaryLines,
  getBsAccountTransactions,
} from "../bs-recon-lines";

beforeEach(() => {
  vi.clearAllMocks();
  linesOrder.mockResolvedValue({ data: [], error: null });
  txnsOrder.mockResolvedValue({ data: [], error: null });
  runMaybeSingle.mockResolvedValue({
    data: { subledger_source_url: null },
    error: null,
  });
});

describe("getBsSummaryLines", () => {
  it("returns rows ordered by sort_order ASC", async () => {
    const rows = [
      { id: "l1", sort_order: 1, qbo_account_name: "Cash" },
      { id: "l2", sort_order: 2, qbo_account_name: "AR" },
    ];
    linesOrder.mockResolvedValue({ data: rows, error: null });

    const result = await getBsSummaryLines("artifact-123");

    expect(fromMock).toHaveBeenCalledWith(
      "audit_ready_bs_recon_summary_lines",
    );
    expect(linesEq).toHaveBeenCalledWith(
      "summary_artifact_id",
      "artifact-123",
    );
    expect(linesOrder).toHaveBeenCalledWith("sort_order", {
      ascending: true,
    });
    expect(result).toEqual(rows);
  });

  it("returns empty array when artifact has no lines", async () => {
    linesOrder.mockResolvedValue({ data: [], error: null });
    const result = await getBsSummaryLines("artifact-empty");
    expect(result).toEqual([]);
  });

  it("throws when supabase returns an error", async () => {
    linesOrder.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    await expect(getBsSummaryLines("bad")).rejects.toBeTruthy();
  });
});

describe("getBsAccountTransactions", () => {
  it("returns transactions and subledger URL when both succeed", async () => {
    const dbRows = [
      {
        ordinal: 0,
        txn_date: "2026-06-15",
        txn_type: "Bill",
        doc_number: "1001",
        name_display: "Acme Vendor",
        memo: "Test",
        split_account: "AP",
        debit_cents: 0,
        credit_cents: 100000,
        net_cents: -100000,
        running_balance_cents: -100000,
        txn_ref: "txn-1",
      },
    ];
    txnsOrder.mockResolvedValue({ data: dbRows, error: null });
    runMaybeSingle.mockResolvedValue({
      data: { subledger_source_url: "https://qbo.example/report/123" },
      error: null,
    });

    const result = await getBsAccountTransactions("child-run-1", "acct-1");

    expect(fromMock).toHaveBeenCalledWith(
      "audit_ready_bs_recon_transactions",
    );
    expect(fromMock).toHaveBeenCalledWith("audit_ready_tie_out_runs");
    expect(txnsEq1).toHaveBeenCalledWith("run_id", "child-run-1");
    expect(txnsEq2).toHaveBeenCalledWith("qbo_account_id", "acct-1");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].name).toBe("Acme Vendor");
    expect(result.transactions[0].running_balance_cents).toBe(-100000);
    expect(result.subledgerSourceUrl).toBe(
      "https://qbo.example/report/123",
    );
  });

  it("returns null subledger URL when child run has none", async () => {
    txnsOrder.mockResolvedValue({ data: [], error: null });
    runMaybeSingle.mockResolvedValue({
      data: { subledger_source_url: null },
      error: null,
    });

    const result = await getBsAccountTransactions("child-run-2", "acct-2");
    expect(result.subledgerSourceUrl).toBeNull();
    expect(result.transactions).toEqual([]);
  });

  it("throws when transactions query fails", async () => {
    txnsOrder.mockResolvedValue({
      data: null,
      error: { message: "txn boom" },
    });
    await expect(
      getBsAccountTransactions("bad-run", "bad-acct"),
    ).rejects.toBeTruthy();
  });
});
