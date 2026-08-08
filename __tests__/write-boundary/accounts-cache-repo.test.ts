import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readXeroAccounts, readQboAccounts, countXeroAccounts } from "@/lib/accounting/write-boundary/accounts-cache-repo";

describe("readXeroAccounts", () => {
  test("filters by connection_id and status=ACTIVE", async () => {
    const eqActive = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqConn = vi.fn().mockReturnValue({ eq: eqActive });
    const select = vi.fn().mockReturnValue({ eq: eqConn });
    const admin = { from: vi.fn().mockReturnValue({ select }) } as unknown as SupabaseClient;
    await readXeroAccounts(admin, "conn-1");
    expect(admin.from).toHaveBeenCalledWith("xero_accounts_cache");
    expect(eqConn).toHaveBeenCalledWith("connection_id", "conn-1");
    expect(eqActive).toHaveBeenCalledWith("status", "ACTIVE");
  });

  test("throws on error", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    await expect(readXeroAccounts(admin, "conn-1")).rejects.toThrow(/readXeroAccounts failed/);
  });
});

describe("readQboAccounts", () => {
  test("filters by connection_id and active=true", async () => {
    const eqActive = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqConn = vi.fn().mockReturnValue({ eq: eqActive });
    const select = vi.fn().mockReturnValue({ eq: eqConn });
    const admin = { from: vi.fn().mockReturnValue({ select }) } as unknown as SupabaseClient;
    await readQboAccounts(admin, "conn-1");
    expect(eqActive).toHaveBeenCalledWith("active", true);
  });
});

describe("countXeroAccounts", () => {
  test("returns 0 when count is null", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: null, error: null }),
        }),
      }),
    } as unknown as SupabaseClient;
    expect(await countXeroAccounts(admin, "c1")).toBe(0);
  });
});
