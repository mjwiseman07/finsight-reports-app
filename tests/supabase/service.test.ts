import { describe, it, expect, vi } from "vitest";

const { adminSentinel, getSupabaseAdmin } = vi.hoisted(() => {
  const adminSentinel = { marker: "service-role-admin" };
  return { adminSentinel, getSupabaseAdmin: vi.fn(() => adminSentinel) };
});

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));

import { createServiceClient } from "@/lib/supabase/service";

describe("createServiceClient", () => {
  it("returns the admin client from getSupabaseAdmin", () => {
    const client = createServiceClient();
    expect(client).toBe(adminSentinel as never);
    expect(getSupabaseAdmin).toHaveBeenCalled();
  });

  it("delegates to getSupabaseAdmin on each call", () => {
    getSupabaseAdmin.mockClear();
    createServiceClient();
    createServiceClient();
    expect(getSupabaseAdmin).toHaveBeenCalledTimes(2);
  });
});
