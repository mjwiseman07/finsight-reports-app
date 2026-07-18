/**
 * Regression coverage for original D1 write-preflight behaviors
 * (write_disabled, realm_missing, unhealthy_connection).
 *
 * Phase Q7 added write-preflight.q7.test.ts for edition/subscription cases;
 * this file keeps the pre-Q7 gate outcomes covered.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdmin, resolveQBOTokenForFirmClient, checkQBOHealth } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  resolveQBOTokenForFirmClient: vi.fn(),
  checkQBOHealth: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({ resolveQBOTokenForFirmClient }));
vi.mock("@/lib/erp/quickbooks/health-checker", () => ({ checkQBOHealth }));

import { canPostToQBO } from "@/lib/erp/quickbooks/write-preflight";

function makeSupabase(firmClient: Record<string, unknown> | null) {
  return {
    from(table: string) {
      if (table === "firm_clients") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: firmClient, error: null }),
            }),
          }),
        };
      }
      if (table === "accounting_connections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { qbo_edition: "plus", qbo_subscription_status: "subscribed" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  checkQBOHealth.mockResolvedValue({ status: "healthy" });
  resolveQBOTokenForFirmClient.mockResolvedValue({
    realmId: "realm-1",
    accessToken: "tok",
    refreshToken: "ref",
    tokenSource: "accounting_connections",
    grantedScopes: ["com.intuit.quickbooks.accounting"],
  });
});

describe("canPostToQBO (D1 regression)", () => {
  it("returns write_disabled when qbo_write_enabled is false", async () => {
    getSupabaseAdmin.mockReturnValue(
      makeSupabase({
        id: "fc-1",
        qbo_write_enabled: false,
        qbo_last_health_check_at: new Date().toISOString(),
        qbo_last_health_check_status: "healthy",
      }),
    );
    const result = await canPostToQBO("fc-1");
    expect(result).toMatchObject({ canWrite: false, reason: "write_disabled" });
  });

  it("returns realm_missing when firm_client row is absent", async () => {
    getSupabaseAdmin.mockReturnValue(makeSupabase(null));
    const result = await canPostToQBO("fc-missing");
    expect(result).toMatchObject({ canWrite: false, reason: "realm_missing" });
  });

  it("returns unhealthy_connection when last health status is not healthy", async () => {
    getSupabaseAdmin.mockReturnValue(
      makeSupabase({
        id: "fc-1",
        qbo_write_enabled: true,
        qbo_last_health_check_at: new Date().toISOString(),
        qbo_last_health_check_status: "token_expired",
      }),
    );
    const result = await canPostToQBO("fc-1");
    expect(result).toMatchObject({ canWrite: false, reason: "unhealthy_connection" });
  });
});
