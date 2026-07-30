/**
 * FIX-STRIPE-CUSTOMER-ID-WRITE-PATH — the single writer to users.stripe_customer_id.
 *
 * resolveSubscriber() in lib/subscription-sync.js routes every subscription.*
 * webhook by looking the user up on users.stripe_customer_id. Before this
 * helper existed nothing wrote that column, so every webhook failed with
 * "No user linked to stripe_customer_id cus_XXX".
 *
 * Call this from any checkout-session creator BEFORE
 * stripe.checkout.sessions.create, then pass `customer: stripeCustomerId`
 * into the session instead of `customer_email`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EnsureStripeCustomerResult {
  stripeCustomerId: string;
  wasCreated: boolean;
}

/**
 * Structural subset of the Stripe client this helper needs. Lets callers inject
 * the client they already built (see stripeClient note in the params below)
 * without importing Stripe's types into a JS route.
 */
export interface StripeCustomerCreateClient {
  customers: {
    create(
      params: { email: string; metadata?: Record<string, string> },
      options?: { idempotencyKey?: string },
    ): Promise<{ id: string }>;
  };
}

export interface EnsureStripeCustomerParams {
  userId: string;
  email: string;
  /** Service-role client. Defaults to getSupabaseAdmin(). */
  admin?: SupabaseClient;
  /**
   * Defaults to the lib/stripe singleton, imported lazily because that module
   * throws at import time when STRIPE_SECRET_KEY is unset. Callers that degrade
   * gracefully on a missing key (app/api/create-checkout) must pass their own
   * client so importing this module never breaks their 503 path.
   */
  stripeClient?: StripeCustomerCreateClient;
}

export async function ensureStripeCustomerForUser(
  params: EnsureStripeCustomerParams,
): Promise<EnsureStripeCustomerResult> {
  const { userId, email } = params;

  const admin =
    params.admin ??
    ((await import("@/lib/supabase-admin.js")).getSupabaseAdmin() as unknown as SupabaseClient);

  // Fast path. This read — not the Stripe idempotency key — is what makes the
  // helper durably idempotent: Stripe expires idempotency keys after 24h, so
  // the key only closes the retry/race window on a single checkout attempt.
  const { data: userRow, error: readError } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(
      `ensureStripeCustomerForUser: users read failed for ${userId}: ${readError.message}`,
    );
  }

  const existing = userRow?.stripe_customer_id;
  if (typeof existing === "string" && existing.length > 0) {
    return { stripeCustomerId: existing, wasCreated: false };
  }

  const stripeClient =
    params.stripeClient ??
    ((await import("@/lib/stripe")).stripe as unknown as StripeCustomerCreateClient);

  let customerId: string;
  try {
    const customer = await stripeClient.customers.create(
      { email, metadata: { advisacor_user_id: userId } },
      { idempotencyKey: `advisacor-user-${userId}` },
    );
    customerId = customer.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ensureStripeCustomerForUser: stripe.customers.create failed for ${userId}: ${message}`,
    );
  }

  const { error: writeError } = await admin
    .from("users")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  if (writeError) {
    // Stripe now holds a customer our DB doesn't know about. Surfacing the
    // failure keeps checkout from proceeding on an unlinked customer; the
    // fast-path read plus the idempotency key reconcile it on retry.
    throw new Error(
      `ensureStripeCustomerForUser: failed to persist stripe_customer_id for ${userId}: ${writeError.message}`,
    );
  }

  return { stripeCustomerId: customerId, wasCreated: true };
}
