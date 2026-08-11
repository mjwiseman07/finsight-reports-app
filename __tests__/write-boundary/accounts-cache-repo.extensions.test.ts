import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readAllXeroAccounts,
  readAllQboAccounts,
  markXeroAccountsInactive,
  markQboAccountsInactive,
} from "@/lib/accounting/write-boundary/accounts-cache-repo";

type ChainMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  then: (resolve: (value: { data: unknown; error: { message: string } | null }) => unknown) => unknown;
};

function makeAdminMock(returns: { data?: unknown; error?: { message: string } | null } = {}) {
  const chain = {} as ChainMock;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.neq = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  const result = { data: returns.data ?? [], error: returns.error ?? null };
  chain.then = (resolve) => resolve(result);
  return { from: vi.fn(() => chain), __chain: chain };
}

describe("readAllXeroAccounts", () => {
  it("does NOT filter by status — returns all rows for connection", async () => {
    const admin = makeAdminMock({
      data: [
        { connection_id: "c1", account_code: "090", status: "ACTIVE" },
        { connection_id: "c1", account_code: "999", status: "ARCHIVED" },
      ],
    });
    const rows = await readAllXeroAccounts(admin as unknown as SupabaseClient, "c1");
    expect(rows).toHaveLength(2);
    expect(admin.__chain.eq).toHaveBeenCalledWith("connection_id", "c1");
    const eqCalls = admin.__chain.eq.mock.calls as Array<[string, unknown]>;
    expect(eqCalls.some((c) => c[0] === "status")).toBe(false);
  });

  it("throws on Supabase error", async () => {
    const admin = makeAdminMock({ error: { message: "conn refused" } });
    await expect(readAllXeroAccounts(admin as unknown as SupabaseClient, "c1")).rejects.toThrow(
      /readAllXeroAccounts failed.*conn refused/,
    );
  });
});

describe("readAllQboAccounts", () => {
  it("does NOT filter by active — returns all rows for connection", async () => {
    const admin = makeAdminMock({
      data: [
        { connection_id: "c1", account_id: "1", active: true },
        { connection_id: "c1", account_id: "2", active: false },
      ],
    });
    const rows = await readAllQboAccounts(admin as unknown as SupabaseClient, "c1");
    expect(rows).toHaveLength(2);
    const eqCalls = admin.__chain.eq.mock.calls as Array<[string, unknown]>;
    expect(eqCalls.some((c) => c[0] === "active")).toBe(false);
  });

  it("throws on Supabase error", async () => {
    const admin = makeAdminMock({ error: { message: "timeout" } });
    await expect(readAllQboAccounts(admin as unknown as SupabaseClient, "c1")).rejects.toThrow(
      /readAllQboAccounts failed.*timeout/,
    );
  });
});

describe("markXeroAccountsInactive", () => {
  it("no-ops when exceptCodes is empty (defense against upstream empty response)", async () => {
    const admin = makeAdminMock({ data: [] });
    const marked = await markXeroAccountsInactive(admin as unknown as SupabaseClient, "c1", []);
    expect(marked).toBe(0);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("archives rows whose account_code is not in exceptCodes", async () => {
    const admin = makeAdminMock({ data: [{ id: "row-999" }] });
    const marked = await markXeroAccountsInactive(admin as unknown as SupabaseClient, "c1", [
      "090",
      "200",
    ]);
    expect(marked).toBe(1);
    expect(admin.__chain.update).toHaveBeenCalledWith({ status: "ARCHIVED" });
    expect(admin.__chain.not).toHaveBeenCalledWith("account_code", "in", `("090","200")`);
  });

  it("throws on Supabase error", async () => {
    const admin = makeAdminMock({ error: { message: "constraint violation" } });
    await expect(
      markXeroAccountsInactive(admin as unknown as SupabaseClient, "c1", ["090"]),
    ).rejects.toThrow(/markXeroAccountsInactive failed/);
  });
});

describe("markQboAccountsInactive", () => {
  it("no-ops when exceptIds is empty", async () => {
    const admin = makeAdminMock({ data: [] });
    const marked = await markQboAccountsInactive(admin as unknown as SupabaseClient, "c1", []);
    expect(marked).toBe(0);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("sets active=false on rows whose account_id is not in exceptIds", async () => {
    const admin = makeAdminMock({ data: [{ id: "row-x" }, { id: "row-y" }] });
    const marked = await markQboAccountsInactive(admin as unknown as SupabaseClient, "c1", [
      "1",
      "2",
      "3",
    ]);
    expect(marked).toBe(2);
    expect(admin.__chain.update).toHaveBeenCalledWith({ active: false });
    expect(admin.__chain.not).toHaveBeenCalledWith("account_id", "in", `("1","2","3")`);
  });

  it("throws on Supabase error", async () => {
    const admin = makeAdminMock({ error: { message: "fk violation" } });
    await expect(
      markQboAccountsInactive(admin as unknown as SupabaseClient, "c1", ["1"]),
    ).rejects.toThrow(/markQboAccountsInactive failed/);
  });
});
