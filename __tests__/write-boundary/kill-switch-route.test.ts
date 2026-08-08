import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  resolveSuperAdminAccess: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  emitWriteLifecycleEvent: vi.fn(),
}));

vi.mock("@/lib/super-admin-security", () => ({
  resolveSuperAdminAccess: mocks.resolveSuperAdminAccess,
}));
vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }));
vi.mock("@/lib/accounting/write-boundary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/accounting/write-boundary")>();
  return {
    ...actual,
    emitWriteLifecycleEvent: mocks.emitWriteLifecycleEvent,
  };
});

import { POST } from "@/app/api/admin/write-boundary/[action]/route";

function makeAdmin(opts: {
  connection?: Record<string, unknown> | null;
  updateError?: { message: string } | null;
  userId?: string;
  companyId?: string | null;
} = {}) {
  const connection =
    opts.connection === undefined
      ? {
          id: "conn-1",
          tenant_or_realm_id: "realm-1",
          metadata_json: {},
          provider: "quickbooks",
        }
      : opts.connection;

  let updatedMetadata: Record<string, unknown> | null = null;

  const from = (table: string) => {
    if (table === "accounting_connections") {
      return {
        select: (cols: string) => ({
          eq: () => ({
            maybeSingle: async () => {
              if (cols.includes("user_id")) {
                return { data: connection ? { user_id: opts.userId ?? "user-1" } : null, error: null };
              }
              return {
                data: connection,
                error: connection ? null : { message: "not found" },
              };
            },
          }),
        }),
        update: (payload: { metadata_json: Record<string, unknown> }) => {
          updatedMetadata = payload.metadata_json;
          return {
            eq: async () => ({ error: opts.updateError ?? null }),
          };
        },
      };
    }
    if (table === "firm_clients") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: opts.companyId === null ? null : { id: "fc-1", company_id: opts.companyId ?? "co-1" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "pilot_slots") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: { id: "slot-1" }, error: null }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unmocked ${table}`);
  };

  return {
    client: { from } as unknown as SupabaseClient,
    getUpdated: () => updatedMetadata,
  };
}

describe("POST /api/admin/write-boundary/[action]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.emitWriteLifecycleEvent.mockResolvedValue("evt-1");
  });

  it("non-admin → 403", async () => {
    mocks.resolveSuperAdminAccess.mockResolvedValue({
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    });
    const res = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ action: "enable" }),
    });
    expect(res.status).toBe(403);
  });

  it("admin enable quickbooks → 200 + metadata true + emit", async () => {
    mocks.resolveSuperAdminAccess.mockResolvedValue({ userId: "admin-1" });
    const { client, getUpdated } = makeAdmin();
    mocks.getSupabaseAdmin.mockReturnValue(client);
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ connection_id: "conn-1", provider: "quickbooks" }),
      }),
      { params: Promise.resolve({ action: "enable" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.value).toBe(true);
    expect(body.key).toBe("write_enabled_quickbooks");
    expect(getUpdated()?.write_enabled_quickbooks).toBe(true);
    expect(mocks.emitWriteLifecycleEvent).toHaveBeenCalledTimes(1);
  });

  it("admin disable xero → 200 + metadata false", async () => {
    mocks.resolveSuperAdminAccess.mockResolvedValue({ userId: "admin-1" });
    const { client, getUpdated } = makeAdmin({
      connection: {
        id: "conn-1",
        tenant_or_realm_id: "t1",
        metadata_json: { write_enabled_xero: true },
        provider: "xero",
      },
    });
    mocks.getSupabaseAdmin.mockReturnValue(client);
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ connection_id: "conn-1", provider: "xero" }),
      }),
      { params: Promise.resolve({ action: "disable" }) },
    );
    expect(res.status).toBe(200);
    expect(getUpdated()?.write_enabled_xero).toBe(false);
  });

  it("invalid action → 400", async () => {
    mocks.resolveSuperAdminAccess.mockResolvedValue({ userId: "admin-1" });
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }), {
      params: Promise.resolve({ action: "delete" }),
    });
    expect(res.status).toBe(400);
  });

  it("missing connection_id → 400", async () => {
    mocks.resolveSuperAdminAccess.mockResolvedValue({ userId: "admin-1" });
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ provider: "quickbooks" }),
      }),
      { params: Promise.resolve({ action: "enable" }) },
    );
    expect(res.status).toBe(400);
  });

  it("connection not found → 404", async () => {
    mocks.resolveSuperAdminAccess.mockResolvedValue({ userId: "admin-1" });
    const { client } = makeAdmin({ connection: null });
    mocks.getSupabaseAdmin.mockReturnValue(client);
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ connection_id: "missing", provider: "quickbooks" }),
      }),
      { params: Promise.resolve({ action: "enable" }) },
    );
    expect(res.status).toBe(404);
  });
});
