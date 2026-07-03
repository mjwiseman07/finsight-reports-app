import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/qbo-rest", () => ({
  reportBalanceSheet: vi.fn(),
  qboReport: vi.fn(),
}));

import { reportBalanceSheet, qboReport } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/general/subledger_tie_check";
import type { RuleContext } from "@/lib/rules/vertical-types";

const bsMock = vi.mocked(reportBalanceSheet as (...a: unknown[]) => Promise<unknown>);
const reportMock = vi.mocked(qboReport as (...a: unknown[]) => Promise<unknown>);

function ctx(qbo: RuleContext["qbo"] = { accessToken: "t", realmId: "r" }): RuleContext {
  return {
    firmClientId: "client-1",
    companyId: "co-1",
    industryVertical: "general",
    accountingMethod: "accrual",
    targetType: "account",
    targetRef: "client-1",
    inputs: { endDate: "2026-06-30" },
    inputsHash: "h",
    qbo,
  };
}

function bs(ar: number, ap: number) {
  return {
    Rows: {
      Row: [
        { ColData: [{ value: "Accounts Receivable" }, { value: ar.toFixed(2) }] },
        { ColData: [{ value: "Accounts Payable" }, { value: ap.toFixed(2) }] },
      ],
    },
  };
}
function aging(total: number) {
  return { Rows: { Row: [{ ColData: [{ value: "TOTAL" }, { value: total.toFixed(2) }] }] } };
}

function wireReports(arSub: number, apSub: number) {
  reportMock.mockImplementation((_t, _r, name) =>
    Promise.resolve(name === "AgedReceivables" ? aging(arSub) : aging(apSub)),
  );
}

describe("gen.subledger_tie_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("suppresses within_tolerance when control == subledger", async () => {
    bsMock.mockResolvedValue(bs(10000, 5000));
    wireReports(10000, 5000);
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("within_tolerance");
  });

  it("fires subledger_out_of_tie when AR delta exceeds tolerance", async () => {
    bsMock.mockResolvedValue(bs(10000, 5000));
    wireReports(9900, 5000);
    const res = await evaluate(ctx());
    expect(res.fired).toBe(true);
    expect(res.outcome).toBe("fired");
    expect(res.reason_code).toBe("subledger_out_of_tie");
    const failures = res.reason_detail.failures as Array<{ subledger: string }>;
    expect(failures[0].subledger).toBe("AR");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(ctx(null));
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("qbo_unavailable");
  });

  it("returns error qbo_fetch_failed when a QBO call throws", async () => {
    bsMock.mockRejectedValue(new Error("500 from QBO"));
    wireReports(10000, 5000);
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("error");
    expect(res.reason_code).toBe("qbo_fetch_failed");
  });
});
