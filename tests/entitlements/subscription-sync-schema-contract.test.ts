/**
 * Schema contract for syncSubscriptionFromStripe.
 *
 * Regression guard for FIX-STRIPE-CUSTOMER-ID-WRITE-PATH Block 3: the
 * entitlements upsert sent `updated_at`, a column that does not exist, so
 * every subscription.* webhook failed with PGRST204 once it got past
 * resolveSubscriber. Nothing caught it because resolveSubscriber always threw
 * first (users.stripe_customer_id had no writer), so this line had never
 * executed in any environment.
 *
 * Column lists below were captured from information_schema on project
 * jzmdgwwiestcmmeuhhkr. If a migration adds columns, widen these sets.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const TABLE_COLUMNS: Record<string, string[]> = {
  subscriptions: [
    "id",
    "subscriber_type",
    "subscriber_id",
    "stripe_customer_id",
    "stripe_subscription_id",
    "status",
    "current_period_start",
    "current_period_end",
    "cancel_at_period_end",
    "canceled_at",
    "trial_start",
    "trial_end",
    "metadata",
    "created_at",
    "updated_at",
    "first_paid_charge_at",
  ],
  subscription_items: [
    "id",
    "subscription_id",
    "stripe_subscription_item_id",
    "stripe_price_id",
    "tier_key",
    "lookup_key",
    "track",
    "cadence",
    "quantity",
    "metered",
    "is_addon",
    "created_at",
    "updated_at",
  ],
  entitlements: [
    "subscriber_type",
    "subscriber_id",
    "active_tier_keys",
    "primary_tier_key",
    "flags",
    "seat_limit",
    "active_seat_count",
    "is_metered_seats",
    "status",
    "trial_end",
    "current_period_end",
    "computed_at",
  ],
};

const { upsertCalls, mockSupabase, stripeSub } = vi.hoisted(() => {
  const upsertCalls: Array<{ table: string; payload: Record<string, unknown>[] }> = [];

  const stripeSub = {
    id: "sub_TEST123",
    customer: "cus_TEST123",
    status: "canceled",
    current_period_start: 1783747256,
    current_period_end: 1786425656,
    trial_end: null,
    cancel_at_period_end: false,
    canceled_at: 1783747675,
    items: {
      data: [
        {
          id: "si_TEST123",
          quantity: 1,
          price: {
            id: "price_TEST123",
            lookup_key: "review_assist_std_mo",
            recurring: { usage_type: "licensed" },
          },
        },
      ],
    },
  };

  const makeTable = (table: string) => ({
    upsert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      upsertCalls.push({
        table,
        payload: Array.isArray(payload) ? payload : [payload],
      });
      const resolved = {
        data: { id: `${table}-row-id` },
        error: null,
      };
      return {
        select: () => ({ single: () => Promise.resolve(resolved) }),
        then: (
          onFulfilled: (v: { data: null; error: null }) => unknown,
        ) => Promise.resolve({ data: null, error: null }).then(onFulfilled),
      };
    },
    select() {
      return {
        eq: () => Promise.resolve({ data: [], error: null }),
        // users lookup in resolveSubscriber
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      };
    },
    delete() {
      return { in: () => Promise.resolve({ data: null, error: null }) };
    },
  });

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: "user-1" }, error: null }),
            }),
          }),
        };
      }
      if (table === "firms") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: "firm-1" }, error: null }),
            }),
          }),
        };
      }
      return makeTable(table);
    }),
  };

  return { upsertCalls, mockSupabase, stripeSub };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => mockSupabase,
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { retrieve: () => Promise.resolve(stripeSub) },
  },
}));

import { syncSubscriptionFromStripe } from "@/lib/subscription-sync";

describe("syncSubscriptionFromStripe schema contract", () => {
  beforeEach(() => {
    upsertCalls.length = 0;
  });

  it("only writes columns that exist on each table", async () => {
    await syncSubscriptionFromStripe("sub_TEST123");

    expect(upsertCalls.length).toBeGreaterThan(0);

    for (const call of upsertCalls) {
      const known = TABLE_COLUMNS[call.table];
      expect(known, `no column list for table ${call.table}`).toBeDefined();
      for (const row of call.payload) {
        const unknownColumns = Object.keys(row).filter((c) => !known.includes(c));
        expect(
          unknownColumns,
          `${call.table} upsert sent columns that do not exist: ${unknownColumns.join(", ")}`,
        ).toEqual([]);
      }
    }
  });

  it("stamps entitlements freshness via computed_at, not updated_at", async () => {
    await syncSubscriptionFromStripe("sub_TEST123");

    const entitlementsCall = upsertCalls.find((c) => c.table === "entitlements");
    expect(entitlementsCall).toBeDefined();

    const row = entitlementsCall!.payload[0];
    expect(row).not.toHaveProperty("updated_at");
    expect(typeof row.computed_at).toBe("string");
  });
});
