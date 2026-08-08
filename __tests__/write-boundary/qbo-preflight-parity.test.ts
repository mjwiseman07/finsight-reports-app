/**
 * W1c.1 parity tests — verify the ported qbo-preflight helpers produce
 * bit-identical results to the originals under lib/erp/quickbooks/*.
 *
 * These tests intentionally exercise the port through the barrel so callers
 * cannot accidentally regress by importing the original path from the new
 * write-boundary namespace.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSupabaseAdmin,
  resolveQBOTokenForFirmClient,
  checkQBOHealth,
} = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  resolveQBOTokenForFirmClient: vi.fn(),
  checkQBOHealth: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));
// NOTE: We mock BOTH the original and ported token-resolver + health-checker
// paths so both the original and ported write-preflight modules pick up the
// mock. The parity test compares outputs from both entrypoints.
vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({
  resolveQBOTokenForFirmClient,
}));
vi.mock("@/lib/erp/quickbooks/health-checker", () => ({ checkQBOHealth }));
vi.mock(
  "@/lib/accounting/write-boundary/qbo-preflight/token-resolver",
  () => ({ resolveQBOTokenForFirmClient }),
);
vi.mock(
  "@/lib/accounting/write-boundary/qbo-preflight/health-checker",
  () => ({ checkQBOHealth }),
);

import { canPostToQBO as canPostOriginal } from "@/lib/erp/quickbooks/write-preflight";
import { qboPreflight } from "@/lib/accounting/write-boundary";

const canPostPorted = qboPreflight.canPostToQBO;

type FirmClientRow = {
  id: string;
  qbo_write_enabled: boolean;
  qbo_last_health_check_at: string | null;
  qbo_last_health_check_status: string | null;
};
type ConnRow = {
  qbo_edition: string | null;
  qbo_subscription_status: string | null;
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
  connectionId: "conn-1",
  ownerUserId: "u-1",
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  resolveQBOTokenForFirmClient.mockResolvedValue(tokenBundle);
  checkQBOHealth.mockResolvedValue({ status: "healthy" });
});

// Normalize dynamic fields (like health-check timestamps) before comparing.
function normalize(result: any) {
  const clone = JSON.parse(JSON.stringify(result));
  if (clone?.lastHealthCheck?.checkedAt) clone.lastHealthCheck.checkedAt = "<ts>";
  if (clone?.lastHealthCheck?.ageMinutes !== undefined) {
    clone.lastHealthCheck.ageMinutes = "<age>";
  }
  return clone;
}

const cases: Array<{
  name: string;
  fixture: () => void;
  call: (fn: typeof canPostOriginal) => Promise<any>;
}> = [
  {
    name: "subscription expired → subscription_read_only",
    fixture: () =>
      getSupabaseAdmin.mockReturnValue(
        makeSupabase({
          firmClient: healthyRecent,
          connection: { qbo_edition: "plus", qbo_subscription_status: "expired" },
        }),
      ),
    call: (fn) => fn("fc-1"),
  },
  {
    name: "simple_start + multicurrency → edition_missing_capability",
    fixture: () =>
      getSupabaseAdmin.mockReturnValue(
        makeSupabase({
          firmClient: healthyRecent,
          connection: {
            qbo_edition: "simple_start",
            qbo_subscription_status: "subscribed",
          },
        }),
      ),
    call: (fn) => fn("fc-1", { requireCapability: "multicurrency" }),
  },
  {
    name: "NULL edition + multicurrency → fail-closed",
    fixture: () =>
      getSupabaseAdmin.mockReturnValue(
        makeSupabase({
          firmClient: healthyRecent,
          connection: {
            qbo_edition: null,
            qbo_subscription_status: "subscribed",
          },
        }),
      ),
    call: (fn) => fn("fc-1", { requireCapability: "multicurrency" }),
  },
  {
    name: "plus + classes + subscribed → canWrite",
    fixture: () =>
      getSupabaseAdmin.mockReturnValue(
        makeSupabase({
          firmClient: healthyRecent,
          connection: {
            qbo_edition: "plus",
            qbo_subscription_status: "subscribed",
          },
        }),
      ),
    call: (fn) => fn("fc-1", { requireCapability: "classes" }),
  },
  {
    name: "simple_start + default JE + subscribed → canWrite",
    fixture: () =>
      getSupabaseAdmin.mockReturnValue(
        makeSupabase({
          firmClient: healthyRecent,
          connection: {
            qbo_edition: "simple_start",
            qbo_subscription_status: "subscribed",
          },
        }),
      ),
    call: (fn) => fn("fc-1"),
  },
];

describe("W1c.1 parity — canPostToQBO original vs ported", () => {
  for (const c of cases) {
    it(c.name, async () => {
      c.fixture();
      const original = await c.call(canPostOriginal);
      c.fixture(); // reset the supabase mock counter — same fixture, second call
      const ported = await c.call(canPostPorted);

      expect(normalize(ported)).toEqual(normalize(original));
    });
  }
});
