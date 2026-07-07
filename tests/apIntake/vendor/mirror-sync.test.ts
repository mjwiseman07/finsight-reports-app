import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue({ eventId: "e1" }),
}));
vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: vi.fn().mockResolvedValue({ actionId: "a1", eventId: "e1" }),
}));

import { publishEvent } from "@/lib/events/publisher";
import { logAiAction } from "@/lib/ai/action-logger";
import { refreshVendorMirror } from "@/lib/ap-intake/vendor/mirror-sync";

function makeSupabase() {
  const upserts: Array<{ table: string; rows: Record<string, unknown>[] }> = [];
  return {
    from: (table: string) => ({
      upsert: async (rows: Record<string, unknown>[]) => {
        upserts.push({ table, rows });
        return { error: null };
      },
      update: (_patch: Record<string, unknown>) => ({
        eq: () => ({
          eq: () => ({
            filter: () => Promise.resolve({ error: null }),
          }),
        }),
      }),
    }),
    _upserts: upserts,
  };
}

const goodAdapter = {
  platform: "quickbooks",
  syncVendorMirror: async () => ({
    vendors: [
      {
        external_id: "1",
        display_name: "Acme Inc",
        active: true,
        sync_token: "0",
        primary_email: null,
        primary_phone: null,
      },
    ],
    synced_at: new Date().toISOString(),
  }),
};

const failingAdapter = {
  platform: "quickbooks",
  syncVendorMirror: async () => {
    throw new Error("qbo down");
  },
};

describe("refreshVendorMirror", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts rows and publishes ledger event", async () => {
    const supabase = makeSupabase();
    const result = await refreshVendorMirror({
      firmClientId: "fc-1",
      firmId: "firm-1",
      adapter: goodAdapter,
      supabase: supabase as never,
    });
    expect(result.synced).toBe(1);
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "vendor.mirror_refreshed",
        aggregateId: "fc-1",
      }),
      expect.anything(),
    );
    expect(supabase._upserts.length).toBe(1);
  });

  it("logs and re-throws on adapter failure without upserting", async () => {
    const supabase = makeSupabase();
    await expect(
      refreshVendorMirror({
        firmClientId: "fc-1",
        firmId: "firm-1",
        adapter: failingAdapter,
        supabase: supabase as never,
      }),
    ).rejects.toThrow("qbo down");
    expect(logAiAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCategory: "vendor_resolution",
        actionType: "mirror_refresh_failed",
      }),
    );
    expect(supabase._upserts.length).toBe(0);
  });
});
