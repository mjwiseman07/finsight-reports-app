/**
 * Phase Q7 — write-preflight edition / subscription gate tests.
 *
 * Mocks getSupabaseAdmin, resolveQBOTokenForFirmClient, checkQBOHealth.
 * Covers the five Q7 capability cases from the paste block.
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

type ConnRow = {
  qbo_edition: string | null;
  qbo_subscription_status: string | null;
};

type FirmClientRow = {
  id: string;
  qbo_write_enabled: boolean;
  qbo_last_health_check_at: string | null;
  qbo_last_health_check_status: string | null;
};

function makeSupabase(opts: {
  firmClient: FirmClientRow | null;
  connection: ConnRow | null;
}) {
  return {
    from(table: string) {
      if (table === "firm_clients") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.firmClient, error: null }),
            }),
          }),
        };
      }
      if (table === "accounting_connections") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: opts.connection, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

const healthyRecent: FirmClientRow = {
  id: "fc-1",
  qbo_write_enabled: true,
  qbo_last_health_check_at: new Date().toISOString(),
  qbo_last_health_check_status: "healthy",
};

const tokenBundle = {
  realmId: "realm-1",
  accessToken: "tok",
  refreshToken: "ref",
  tokenSource: "accounting_connections" as const,
  grantedScopes: ["com.intuit.quickbooks.accounting"],
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveQBOTokenForFirmClient.mockResolvedValue(tokenBundle);
  checkQBOHealth.mockResolvedValue({ status: "healthy" });
});

describe("Phase Q7 — canPostToQBO edition / subscription gate", () => {
  it("blocks when subscription is expired (subscription_read_only)", async () => {
    getSupabaseAdmin.mockReturnValue(
      makeSupabase({
        firmClient: healthyRecent,
        connection: { qbo_edition: "plus", qbo_subscription_status: "expired" },
      }),
    );
    const result = await canPostToQBO("fc-1");
    expect(result.canWrite).toBe(false);
    expect(result.reason).toBe("subscription_read_only");
    expect(result.subscriptionStatus).toBe("expired");
    expect(result.edition).toBe("plus");
  });

  it("blocks multicurrency on simple_start (edition_missing_capability)", async () => {
    getSupabaseAdmin.mockReturnValue(
      makeSupabase({
        firmClient: healthyRecent,
        connection: { qbo_edition: "simple_start", qbo_subscription_status: "subscribed" },
      }),
    );
    const result = await canPostToQBO("fc-1", { requireCapability: "multicurrency" });
    expect(result.canWrite).toBe(false);
    expect(result.reason).toBe("edition_missing_capability");
    expect(result.missingCapability).toBe("multicurrency");
    expect(result.edition).toBe("simple_start");
  });

  it("treats NULL edition as simple_start for multicurrency (fail-closed)", async () => {
    getSupabaseAdmin.mockReturnValue(
      makeSupabase({
        firmClient: healthyRecent,
        connection: { qbo_edition: null, qbo_subscription_status: "subscribed" },
      }),
    );
    const result = await canPostToQBO("fc-1", { requireCapability: "multicurrency" });
    expect(result.canWrite).toBe(false);
    expect(result.reason).toBe("edition_missing_capability");
    expect(result.missingCapability).toBe("multicurrency");
    expect(result.edition).toBeNull();
  });

  it("allows classes on plus when subscribed", async () => {
    getSupabaseAdmin.mockReturnValue(
      makeSupabase({
        firmClient: healthyRecent,
        connection: { qbo_edition: "plus", qbo_subscription_status: "subscribed" },
      }),
    );
    const result = await canPostToQBO("fc-1", { requireCapability: "classes" });
    expect(result.canWrite).toBe(true);
    expect(result.edition).toBe("plus");
    expect(result.subscriptionStatus).toBe("subscribed");
  });

  it("allows default journal_entry_write on simple_start when subscribed", async () => {
    getSupabaseAdmin.mockReturnValue(
      makeSupabase({
        firmClient: healthyRecent,
        connection: { qbo_edition: "simple_start", qbo_subscription_status: "subscribed" },
      }),
    );
    const result = await canPostToQBO("fc-1");
    expect(result.canWrite).toBe(true);
    expect(result.edition).toBe("simple_start");
    expect(result.subscriptionStatus).toBe("subscribed");
  });
});
