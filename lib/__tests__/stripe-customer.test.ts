import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureStripeCustomerForUser,
  type StripeCustomerCreateClient,
} from "@/lib/stripe-customer";

const USER_ID = "11111111-2222-3333-4444-555555555555";

function makeAdmin(options: {
  existing?: string | null;
  readError?: { message: string };
  writeError?: { message: string };
}) {
  const updates: Array<Record<string, unknown>> = [];
  const admin = {
    from: (table: string) => {
      if (table !== "users") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve(
                options.readError
                  ? { data: null, error: options.readError }
                  : { data: { stripe_customer_id: options.existing ?? null }, error: null },
              ),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: () => {
            updates.push(patch);
            return Promise.resolve({
              data: null,
              error: options.writeError ?? null,
            });
          },
        }),
      };
    },
  } as unknown as SupabaseClient;
  return { admin, updates };
}

function makeStripe(id = "cus_test123") {
  const create = vi.fn(async () => ({ id }));
  const stripeClient = { customers: { create } } as unknown as StripeCustomerCreateClient;
  return { stripeClient, create };
}

describe("ensureStripeCustomerForUser", () => {
  it("reuses the existing stripe_customer_id without calling Stripe", async () => {
    const { admin, updates } = makeAdmin({ existing: "cus_already_linked" });
    const { stripeClient, create } = makeStripe();

    const result = await ensureStripeCustomerForUser({
      userId: USER_ID,
      email: "owner@example.com",
      admin,
      stripeClient,
    });

    expect(result).toEqual({ stripeCustomerId: "cus_already_linked", wasCreated: false });
    expect(create).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("creates a customer and persists it when the column is empty", async () => {
    const { admin, updates } = makeAdmin({ existing: null });
    const { stripeClient, create } = makeStripe("cus_fresh");

    const result = await ensureStripeCustomerForUser({
      userId: USER_ID,
      email: "owner@example.com",
      admin,
      stripeClient,
    });

    expect(result).toEqual({ stripeCustomerId: "cus_fresh", wasCreated: true });
    expect(updates).toEqual([{ stripe_customer_id: "cus_fresh" }]);
    expect(create).toHaveBeenCalledWith(
      { email: "owner@example.com", metadata: { advisacor_user_id: USER_ID } },
      { idempotencyKey: `advisacor-user-${USER_ID}` },
    );
  });

  it("throws when the users read fails", async () => {
    const { admin } = makeAdmin({ readError: { message: "boom" } });
    const { stripeClient, create } = makeStripe();

    await expect(
      ensureStripeCustomerForUser({
        userId: USER_ID,
        email: "owner@example.com",
        admin,
        stripeClient,
      }),
    ).rejects.toThrow(/users read failed/);
    expect(create).not.toHaveBeenCalled();
  });

  it("throws when persisting the customer id fails", async () => {
    const { admin } = makeAdmin({ existing: null, writeError: { message: "denied" } });
    const { stripeClient } = makeStripe();

    await expect(
      ensureStripeCustomerForUser({
        userId: USER_ID,
        email: "owner@example.com",
        admin,
        stripeClient,
      }),
    ).rejects.toThrow(/failed to persist stripe_customer_id/);
  });

  it("throws when Stripe rejects the create call", async () => {
    const { admin, updates } = makeAdmin({ existing: null });
    const stripeClient = {
      customers: {
        create: vi.fn(async () => {
          throw new Error("card_declined");
        }),
      },
    } as unknown as StripeCustomerCreateClient;

    await expect(
      ensureStripeCustomerForUser({
        userId: USER_ID,
        email: "owner@example.com",
        admin,
        stripeClient,
      }),
    ).rejects.toThrow(/stripe\.customers\.create failed/);
    expect(updates).toEqual([]);
  });
});
