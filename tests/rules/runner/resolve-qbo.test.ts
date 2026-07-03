import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/qbo-for-firm-client", () => ({ getQboForFirmClient: vi.fn() }));

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped module, mocked here
import { getQboForFirmClient } from "@/lib/qbo-for-firm-client";
import { resolveQBOForClient } from "@/lib/rules/runner/resolve-qbo";

function mockSupabaseReturning(row: unknown, error: unknown = null) {
  const builder = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: row, error };
    },
  };
  return { from: () => builder };
}

const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const getQboMock = vi.mocked(getQboForFirmClient as (id: string) => Promise<unknown>);

describe("resolveQBOForClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy handle when status healthy and token resolves", async () => {
    getSupabaseAdminMock.mockReturnValue(
      mockSupabaseReturning({
        qbo_last_health_check_status: "healthy",
        company_id: "co-1",
      }) as unknown as ReturnType<typeof getSupabaseAdmin>,
    );
    getQboMock.mockResolvedValue({ accessToken: "tok", realmId: "realm" });

    const res = await resolveQBOForClient("client-1");
    expect(res).toEqual({
      handle: { accessToken: "tok", realmId: "realm" },
      healthy: true,
      reason: "ok",
    });
  });

  it("returns unhealthy without calling QBO when last status is not healthy", async () => {
    getSupabaseAdminMock.mockReturnValue(
      mockSupabaseReturning({
        qbo_last_health_check_status: "unhealthy",
        company_id: "co-1",
      }) as unknown as ReturnType<typeof getSupabaseAdmin>,
    );

    const res = await resolveQBOForClient("client-1");
    expect(res).toEqual({ handle: null, healthy: false, reason: "unhealthy" });
    expect(getQboMock).not.toHaveBeenCalled();
  });

  it("returns no_connection when firm_clients row is missing", async () => {
    getSupabaseAdminMock.mockReturnValue(
      mockSupabaseReturning(null) as unknown as ReturnType<typeof getSupabaseAdmin>,
    );
    const res = await resolveQBOForClient("client-1");
    expect(res).toEqual({ handle: null, healthy: false, reason: "no_connection" });
  });

  it("returns no_token when healthy but token resolution yields nothing", async () => {
    getSupabaseAdminMock.mockReturnValue(
      mockSupabaseReturning({
        qbo_last_health_check_status: "healthy",
        company_id: "co-1",
      }) as unknown as ReturnType<typeof getSupabaseAdmin>,
    );
    getQboMock.mockResolvedValue(null);
    const res = await resolveQBOForClient("client-1");
    expect(res).toEqual({ handle: null, healthy: false, reason: "no_token" });
  });

  it("returns no_token (does not throw) when token resolver throws", async () => {
    getSupabaseAdminMock.mockReturnValue(
      mockSupabaseReturning({
        qbo_last_health_check_status: "healthy",
        company_id: "co-1",
      }) as unknown as ReturnType<typeof getSupabaseAdmin>,
    );
    getQboMock.mockRejectedValue(new Error("no active QBO connection"));
    const res = await resolveQBOForClient("client-1");
    expect(res).toEqual({ handle: null, healthy: false, reason: "no_token" });
  });
});
