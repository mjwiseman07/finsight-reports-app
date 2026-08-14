/**
 * PR G — Accuracy Contract must pin to an explicit syncId.
 * Authority validation runs before cache; stale schema fails closed.
 * No last-20 / first-candidate selection. Period keys are YYYY-MM only.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertPeriodAlignedWithSync,
  assertPinnedAccountingSyncAuthority,
  composeAccuracyContract,
  isValidAccuracyContractPeriod,
} from "@/lib/dashboard/accuracy-contract/compose-contract";
import { ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION } from "@/lib/integrations/accounting/payload-schema";

const COMPANY = "02edb6c6-a4f1-4bae-825d-2680136dad24";
const SYNC = "7c03f0e3-4aed-45ec-b02b-7e59d80fabae";
const CONN = "b718823a-0eb8-437d-beba-05c41f6482f9";

function makeAdmin(handlers: {
  syncRow?: Record<string, unknown> | null;
}) {
  let syncLoads = 0;
  let receiptLoads = 0;

  const maybeSingle = vi.fn(async () => {
    if (syncLoads === 0) {
      syncLoads += 1;
      return { data: handlers.syncRow ?? null, error: null };
    }
    if (receiptLoads === 0) {
      receiptLoads += 1;
      return {
        data: {
          id: "evt-1",
          chain_seq: 5,
          row_hash: "abc",
          prev_hash: null,
          created_at: "2026-08-14T00:00:00Z",
          event_kind: "pilot.lifecycle.accounting-sync-completed",
        },
        error: null,
      };
    }
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
  const select = vi.fn(() => ({ eq: eqChain }));

  return {
    from: vi.fn(() => ({ select })),
    __mocks: { maybeSingle, select },
  };
}

function successSync(overrides: Record<string, unknown> = {}) {
  return {
    id: SYNC,
    company_id: COMPANY,
    connection_id: CONN,
    validation_status: "SUCCESS",
    report_period_start: "2026-07-01",
    report_period_end: "2026-07-31",
    last_synced_at: "2026-08-14T00:00:00Z",
    normalized_payload: {
      schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION,
      normalizedBalanceSheet: [],
      normalizedIncomeStatement: [],
    },
    ...overrides,
  };
}

describe("PR G Accuracy Contract sync pinning + authority-before-cache", () => {
  it("static: compose/route pin syncId; validate before cache; no last-20 selection", () => {
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
    expect(compose).toContain("sync_schema_stale");
    expect(compose).toContain("assertPinnedAccountingSyncAuthority");
    expect(compose).toContain("persistedSyncNeedsSchemaRebuild");
    expect(compose).toContain("ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION");
    expect(route).toContain("assertPinnedAccountingSyncAuthority");
    expect(route).toContain("readCachedContract");
    expect(route.indexOf("assertPinnedAccountingSyncAuthority")).toBeLessThan(
      route.indexOf("readCachedContract"),
    );
    expect(route).toContain("isValidAccuracyContractPeriod");
    expect(route).not.toMatch(/\.\.\\./);
    expect(route).not.toMatch(/order\("last_synced_at"/);
  });

  it("period syntax: YYYY-MM only (ranges rejected)", () => {
    expect(isValidAccuracyContractPeriod("2026-07")).toBe(true);
    expect(isValidAccuracyContractPeriod("2026-07..2026-08")).toBe(false);
    expect(isValidAccuracyContractPeriod("2026")).toBe(false);
    expect(isValidAccuracyContractPeriod("")).toBe(false);
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

  it("current schema → PASS", async () => {
    const admin = makeAdmin({ syncRow: successSync() });
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
  });

  it("stale schema fresh path → FAIL CLOSED", async () => {
    const admin = makeAdmin({
      syncRow: successSync({
        normalized_payload: {
          schemaVersion: ACCOUNTING_NORMALIZED_PAYLOAD_SCHEMA_VERSION - 1,
          normalizedBalanceSheet: [],
          normalizedIncomeStatement: [],
        },
      }),
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
    ).rejects.toMatchObject({ message: "sync_schema_stale", httpStatus: 409 });
  });

  it("cached-path authority: mismatched connectionId → FAIL CLOSED", async () => {
    const admin = makeAdmin({ syncRow: successSync() });
    await expect(
      assertPinnedAccountingSyncAuthority({
        admin: admin as never,
        companyId: COMPANY,
        syncId: SYNC,
        connectionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        period: "2026-07",
      }),
    ).rejects.toMatchObject({ message: "sync_connection_mismatch", httpStatus: 409 });
  });

  it("cached-path authority: wrong company for pinned sync → FAIL CLOSED", async () => {
    const admin = makeAdmin({
      syncRow: successSync({ company_id: "other-company" }),
    });
    await expect(
      assertPinnedAccountingSyncAuthority({
        admin: admin as never,
        companyId: COMPANY,
        syncId: SYNC,
        period: "2026-07",
      }),
    ).rejects.toMatchObject({ message: "sync_company_mismatch", httpStatus: 409 });
  });

  it("cached-path authority: non-SUCCESS cannot bypass → FAIL CLOSED", async () => {
    const admin = makeAdmin({
      syncRow: successSync({ validation_status: "FAILED" }),
    });
    await expect(
      assertPinnedAccountingSyncAuthority({
        admin: admin as never,
        companyId: COMPANY,
        syncId: SYNC,
        period: "2026-07",
      }),
    ).rejects.toMatchObject({ message: "sync_not_success", httpStatus: 409 });
  });

  it("cached-path authority: stale schema cannot bypass → FAIL CLOSED", async () => {
    const admin = makeAdmin({
      syncRow: successSync({
        normalized_payload: { schemaVersion: 1 },
      }),
    });
    await expect(
      assertPinnedAccountingSyncAuthority({
        admin: admin as never,
        companyId: COMPANY,
        syncId: SYNC,
        period: "2026-07",
      }),
    ).rejects.toMatchObject({ message: "sync_schema_stale", httpStatus: 409 });
  });

  it("composeAccuracyContract rejects company mismatch", async () => {
    const admin = makeAdmin({
      syncRow: successSync({ company_id: "other-company" }),
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
