/**
 * PR G — Accuracy Contract must pin to an explicit syncId.
 * No last-20 / candidates[0] selection.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertPeriodAlignedWithSync,
  composeAccuracyContract,
} from "@/lib/dashboard/accuracy-contract/compose-contract";

const COMPANY = "02edb6c6-a4f1-4bae-825d-2680136dad24";
const SYNC = "7c03f0e3-4aed-45ec-b02b-7e59d80fabae";
const CONN = "b718823a-0eb8-437d-beba-05c41f6482f9";

function makeAdmin(handlers: {
  syncRow?: Record<string, unknown> | null;
  receiptRow?: Record<string, unknown> | null;
}) {
  let syncLoads = 0;
  let receiptLoads = 0;

  const maybeSingle = vi.fn(async () => {
    // Sync load uses maybeSingle first.
    if (syncLoads === 0) {
      syncLoads += 1;
      return { data: handlers.syncRow ?? null, error: null };
    }
    // Receipt lookup
    if (receiptLoads === 0) {
      receiptLoads += 1;
      return { data: handlers.receiptRow ?? null, error: null };
    }
    // latest chain_seq
    return { data: { chain_seq: 10 }, error: null };
  });

  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit, maybeSingle }));
  const filter = vi.fn(() => ({ order, maybeSingle }));
  const lte = vi.fn(async () => ({ count: 3, error: null }));
  const eqChain = vi.fn(() => ({
    eq: eqChain,
    filter,
    order,
    limit,
    maybeSingle,
    lte,
  }));
  const select = vi.fn((_cols?: string, opts?: { count?: string; head?: boolean }) => {
    if (opts?.head) {
      return { eq: eqChain };
    }
    return { eq: eqChain };
  });

  return {
    from: vi.fn(() => ({ select })),
    __mocks: { maybeSingle, select },
  };
}

describe("PR G Accuracy Contract sync pinning", () => {
  it("static: compose and route no longer select last-20 / candidates[0]", () => {
    const compose = readFileSync(
      join(process.cwd(), "lib/dashboard/accuracy-contract/compose-contract.ts"),
      "utf8",
    );
    const route = readFileSync(
      join(process.cwd(), "app/api/dashboard/accuracy-contract/route.ts"),
      "utf8",
    );
    expect(compose).not.toMatch(/limit\(\s*20\s*\)/);
    expect(compose).not.toMatch(/candidates\s*\[\s*0\s*\]/);
    expect(compose).not.toMatch(/\.order\(\s*['"]last_synced_at['"]/);
    expect(compose).toContain("sync_id_required");
    expect(compose).toMatch(/\.eq\('id',\s*syncId\)/);
    expect(route).toContain("sync_id_required");
    expect(route).not.toMatch(/order\("last_synced_at"/);
    expect(route).toContain("Do not query \"latest sync\"");
  });

  it("assertPeriodAlignedWithSync accepts end-month key", () => {
    expect(() =>
      assertPeriodAlignedWithSync("2026-07", {
        start: "2026-07-01T00:00:00Z",
        end: "2026-07-31T00:00:00Z",
      }),
    ).not.toThrow();
  });

  it("assertPeriodAlignedWithSync rejects mismatched period", () => {
    expect(() =>
      assertPeriodAlignedWithSync("2025-01", {
        start: "2026-07-01T00:00:00Z",
        end: "2026-07-31T00:00:00Z",
      }),
    ).toMatchObject({});
    try {
      assertPeriodAlignedWithSync("2025-01", {
        start: "2026-07-01T00:00:00Z",
        end: "2026-07-31T00:00:00Z",
      });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as Error).message).toBe("period_sync_mismatch");
    }
  });

  it("composeAccuracyContract requires syncId", async () => {
    const admin = makeAdmin({ syncRow: null });
    await expect(
      composeAccuracyContract({
        admin: admin as never,
        companyId: COMPANY,
        syncId: "",
        industryType: "General",
        kpiCode: "cash_position",
        period: "2026-07",
      }),
    ).rejects.toMatchObject({ message: "sync_id_required", httpStatus: 400 });
  });

  it("composeAccuracyContract loads pinned sync by id and validates company/connection", async () => {
    const admin = makeAdmin({
      syncRow: {
        id: SYNC,
        company_id: COMPANY,
        connection_id: CONN,
        validation_status: "SUCCESS",
        report_period_start: "2026-07-01",
        report_period_end: "2026-07-31",
        last_synced_at: "2026-08-14T00:00:00Z",
        normalized_payload: {
          normalizedBalanceSheet: [],
          normalizedIncomeStatement: [],
        },
      },
      receiptRow: {
        id: "evt-1",
        chain_seq: 5,
        row_hash: "abc",
        prev_hash: null,
        created_at: "2026-08-14T00:00:00Z",
        event_kind: "pilot.lifecycle.accounting-sync-completed",
      },
    });

    // factorizeKpi may return unsupported for empty payload — still proves pin path.
    const result = await composeAccuracyContract({
      admin: admin as never,
      companyId: COMPANY,
      syncId: SYNC,
      connectionId: CONN,
      industryType: "General",
      kpiCode: "cash_position",
      period: "2026-07",
    });

    expect(result.accountingSyncsId).toBe(SYNC);
    expect(result.contract.period).toBe("2026-07");
    expect(result.contract.chain_receipt.event_id).toBe("evt-1");
    expect(admin.from).toHaveBeenCalledWith("accounting_syncs");
  });

  it("composeAccuracyContract rejects company mismatch", async () => {
    const admin = makeAdmin({
      syncRow: {
        id: SYNC,
        company_id: "other-company",
        connection_id: CONN,
        validation_status: "SUCCESS",
        report_period_start: "2026-07-01",
        report_period_end: "2026-07-31",
        normalized_payload: {},
      },
    });
    await expect(
      composeAccuracyContract({
        admin: admin as never,
        companyId: COMPANY,
        syncId: SYNC,
        industryType: "General",
        kpiCode: "cash_position",
        period: "2026-07",
      }),
    ).rejects.toMatchObject({ message: "sync_company_mismatch", httpStatus: 409 });
  });
});
