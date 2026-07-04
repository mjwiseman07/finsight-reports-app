import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mocks ----------------------------------------------------------------
// Shared mock state must be created via vi.hoisted so the vi.mock factories
// (which are hoisted to the top of the module) can safely reference it.
const { state, mockSupabase, syncSpy } = vi.hoisted(() => {
  const state: Record<string, Array<Record<string, unknown>>> = {
    stripe_webhook_events: [],
    subscriptions: [],
  };

  const makeQuery = (name: string) => {
    const filters: Array<[string, unknown]> = [];
    const q: Record<string, unknown> = {
      insert(row: Record<string, unknown>) {
        if (name === "stripe_webhook_events") {
          const dup = state[name].find((r) => r.stripe_event_id === row.stripe_event_id);
          if (dup) {
            return Promise.resolve({ data: null, error: { code: "23505", message: "dup" } });
          }
        }
        if (!state[name]) state[name] = [];
        state[name].push({ ...row });
        return Promise.resolve({ data: [row], error: null });
      },
      update(patch: Record<string, unknown>) {
        return {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            const target = (state[name] ?? []).filter((r) => r[col] === val);
            for (const t of target) Object.assign(t, patch);
            return Promise.resolve({ data: target, error: null });
          },
        };
      },
      select() {
        return {
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            const rows = (state[name] ?? []).filter((r) => r[col] === val);
            return {
              maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
              single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
            };
          },
        };
      },
    };
    return q;
  };

  const mockSupabase = { from: vi.fn((n: string) => makeQuery(n)) };
  const syncSpy = vi.fn(async () => undefined);
  return { state, mockSupabase, syncSpy };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

// stripe: signature verification returns the parsed event untouched
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (raw: string) => JSON.parse(raw),
    },
  },
}));

// subscription-sync: no-op spy
vi.mock("@/lib/subscription-sync", () => ({
  syncSubscriptionFromStripe: syncSpy,
}));

// Import AFTER mocks are registered
import { POST } from "@/app/api/stripe-webhook/route";

function req(event: unknown): Request {
  const body = JSON.stringify(event);
  return new Request("http://x/api/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": "test-sig" },
    body,
  });
}

beforeEach(() => {
  state.stripe_webhook_events = [];
  state.subscriptions = [];
  syncSpy.mockClear();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

// ---- Tests ----------------------------------------------------------------
describe("legacy stripe-webhook route (post-followup)", () => {
  it("writes to new schema columns: raw_payload, processing_status, livemode", async () => {
    const evt = {
      id: "evt_test_1",
      type: "charge.refunded",
      livemode: false,
      data: { object: { id: "ch_1" } },
    };
    const res = await POST(req(evt) as unknown as never);
    expect(res.status).toBe(200);
    const row = state.stripe_webhook_events[0];
    expect(row.stripe_event_id).toBe("evt_test_1");
    expect(row.event_type).toBe("charge.refunded");
    expect(row.raw_payload).toEqual(evt);
    expect(row.processing_status).toBe("processed"); // updated after handler success
    expect(row.livemode).toBe(false);
    // Ensure the OLD column name 'payload' is NOT written
    expect(row.payload).toBeUndefined();
  });

  it("skips subscription events with engagement_id (routed to entitlements)", async () => {
    const evt = {
      id: "evt_sub_1",
      type: "customer.subscription.updated",
      livemode: false,
      data: {
        object: {
          id: "sub_1",
          metadata: { engagement_id: "eng-xyz" },
        },
      },
    };
    const res = await POST(req(evt) as unknown as never);
    expect(res.status).toBe(200);
    const row = state.stripe_webhook_events[0];
    expect(row.processing_status).toBe("skipped");
    expect(row.processing_error).toBe("routed_to_entitlements_webhook");
    // syncSubscriptionFromStripe must NOT have been called for engagement subs
    expect(syncSpy).not.toHaveBeenCalled();
  });

  it("still handles subscription events WITHOUT engagement_id (phase-1 subs)", async () => {
    const evt = {
      id: "evt_sub_2",
      type: "customer.subscription.updated",
      livemode: false,
      data: {
        object: {
          id: "sub_legacy",
          metadata: {}, // no engagement_id
        },
      },
    };
    const res = await POST(req(evt) as unknown as never);
    expect(res.status).toBe(200);
    expect(syncSpy).toHaveBeenCalledWith("sub_legacy");
    const row = state.stripe_webhook_events[0];
    expect(row.processing_status).toBe("processed");
  });

  it("returns 200 + duplicate:true on 23505 (idempotency preserved)", async () => {
    const evt = {
      id: "evt_dup",
      type: "charge.refunded",
      livemode: false,
      data: { object: { id: "ch_2" } },
    };
    await POST(req(evt) as unknown as never);
    const res2 = await POST(req(evt) as unknown as never);
    const body = (await (res2 as unknown as Response).json()) as { duplicate?: boolean };
    expect(body.duplicate).toBe(true);
  });

  it("marks row 'failed' with processing_error on handler exception", async () => {
    syncSpy.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const evt = {
      id: "evt_fail",
      type: "customer.subscription.updated",
      livemode: false,
      data: { object: { id: "sub_fail", metadata: {} } },
    };
    const res = await POST(req(evt) as unknown as never);
    expect(res.status).toBe(500);
    const row = state.stripe_webhook_events[0];
    expect(row.processing_status).toBe("failed");
    expect(row.processing_error).toBe("boom");
  });

  it("rejects with 400 when signature header is missing", async () => {
    const body = JSON.stringify({ id: "evt_x", type: "charge.refunded" });
    const r = new Request("http://x/api/stripe-webhook", { method: "POST", body });
    const res = await POST(r as unknown as never);
    expect(res.status).toBe(400);
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const evt = { id: "evt_no_secret", type: "charge.refunded" };
    const res = await POST(req(evt) as unknown as never);
    expect(res.status).toBe(500);
  });
});
