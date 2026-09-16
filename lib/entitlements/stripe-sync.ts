/**
 * Stripe webhook → entitlement sync.
 * Idempotent via stripe_webhook_events PK + durable lease ownership.
 *
 * Cutover note: the RA Pro commerce gate is an *admission* check only.
 * Closed/missing/malformed blocks RA Pro checkout.session.completed
 * *before* lease claim (retryable HTTP 500, no claim). Once admitted under an
 * open gate and claimed, the row is never deleted for gate reasons — closure
 * does not cancel in-flight work; main processing/failure semantics apply.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { activateAddon, deactivateAddon } from "./service";
import { isAddonCode, type AddonCode } from "./registry";
import {
  handleTcp1CheckoutCompleted,
  handleTcp1SubscriptionDeleted,
  type CheckoutCompletionOutcome,
} from "@/lib/tcp1/stripe-pilot-checkout";
import { reconcilePilotSlotStatus } from "@/lib/subscription-sync";
import {
  claimStripeWebhookEvent,
  finalizeStripeWebhookEvent,
} from "@/lib/entitlements/webhook-lease";
import {
  isRaProCutoverCommerceClosed,
  RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
} from "@/lib/review-assist-pro/cutover-commerce-gate";

export interface MinimalStripeEvent {
  id: string;
  type: string;
  livemode?: boolean;
  data: {
    object: {
      id: string;
      status?: string;
      metadata?: Record<string, string | undefined>;
      items?: {
        data: Array<{
          id: string;
          price?: { id: string; metadata?: Record<string, string | undefined> };
          metadata?: Record<string, string | undefined>;
        }>;
      };
    };
  };
}

export type StripeWebhookResult =
  | { status: "processed" | "skipped" | "duplicate" | "conflicted" }
  | { status: "retryable_error"; error: string }
  | { status: "lease_held" };

const HANDLED_TYPES = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
]);

function sanitizeFailureCode(code: string | undefined): string {
  const raw = (code || "unknown").replace(/[^a-zA-Z0-9:_-]/g, "_");
  return raw.slice(0, 64) || "unknown";
}

function isRaProCheckoutCompletedEvent(event: MinimalStripeEvent): boolean {
  if (event.type !== "checkout.session.completed") return false;
  return event.data.object.metadata?.tier_key === "review_assist_pro";
}

export async function handleStripeWebhook(
  event: MinimalStripeEvent,
  rawPayload: unknown,
): Promise<StripeWebhookResult> {
  // Admission check only: hold before lease claim so HTTP 500 stays retryable.
  // Never erase an admitted (claimed) row to make a gate hold retryable.
  // Never re-check the gate after claim.
  if (isRaProCheckoutCompletedEvent(event) && isRaProCutoverCommerceClosed()) {
    return {
      status: "retryable_error",
      error: RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
    };
  }

  void rawPayload;
  const claim = await claimStripeWebhookEvent({
    stripeEventId: event.id,
    eventType: event.type,
    livemode: Boolean(event.livemode),
  });

  if (claim.outcome === "duplicate_terminal") {
    return { status: "duplicate" };
  }
  if (claim.outcome === "lease_held") {
    return { status: "lease_held" };
  }

  const leaseToken = claim.leaseToken;

  if (!HANDLED_TYPES.has(event.type)) {
    const fin = await finalizeStripeWebhookEvent({
      stripeEventId: event.id,
      leaseToken,
      status: "skipped",
      failureCode: "unhandled_event_type",
    });
    if (!fin.ok) return { status: "lease_held" };
    return { status: "skipped" };
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        id: string;
        subscription?: string | null;
        customer?: string | null;
        metadata?: Record<string, string | undefined>;
      };
      const outcome = await handleTcp1CheckoutCompleted(session);
      return applyCheckoutOutcome(event.id, leaseToken, outcome);
    }

    const sub = event.data.object;
    const engagementId = sub.metadata?.engagement_id;

    if (!engagementId) {
      if (event.type === "customer.subscription.deleted" && sub.id) {
        await reconcilePilotSlotStatus(sub.id, "canceled");
      } else if (event.type === "customer.subscription.updated" && sub.id) {
        const stripeStatus = sub.status ?? "active";
        await reconcilePilotSlotStatus(sub.id, stripeStatus);
      }
      const fin = await finalizeStripeWebhookEvent({
        stripeEventId: event.id,
        leaseToken,
        status: "skipped",
        failureCode: "no_engagement_id",
      });
      if (!fin.ok) return { status: "lease_held" };
      return { status: "skipped" };
    }

    if (event.type === "customer.subscription.deleted") {
      await deactivateBySubscription(sub.items?.data.map((i) => i.id) ?? []);
      if (sub.id) {
        await handleTcp1SubscriptionDeleted(sub.id);
        await reconcilePilotSlotStatus(sub.id, "canceled");
      }
      const fin = await finalizeStripeWebhookEvent({
        stripeEventId: event.id,
        leaseToken,
        status: "processed",
      });
      if (!fin.ok) return { status: "lease_held" };
      return { status: "processed" };
    }

    const status = sub.status ?? "active";
    const shouldBeActive = status === "active" || status === "trialing";

    for (const item of sub.items?.data ?? []) {
      const addonCode = pickAddonCode(
        item.metadata?.addon_code ??
          item.price?.metadata?.addon_code ??
          sub.metadata?.addon_code,
      );
      if (!addonCode) continue;

      if (shouldBeActive) {
        await activateAddon({
          engagementId,
          addonCode,
          stripeSubscriptionItemId: item.id,
          stripePriceId: item.price?.id,
          actorType: "integration",
          actorId: "stripe:webhook",
          correlationId: event.id,
        });
      } else {
        await deactivateAddon({
          engagementId,
          addonCode,
          actorType: "integration",
          actorId: "stripe:webhook",
          correlationId: event.id,
          reason: `stripe status=${status}`,
        });
      }
    }

    const fin = await finalizeStripeWebhookEvent({
      stripeEventId: event.id,
      leaseToken,
      status: "processed",
    });
    if (!fin.ok) return { status: "lease_held" };
    return { status: "processed" };
  } catch (err) {
    const fin = await finalizeStripeWebhookEvent({
      stripeEventId: event.id,
      leaseToken,
      status: "retryable",
      failureCode: "handler_exception",
    });
    if (!fin.ok) {
      // Stale lease — another worker owns the event; do not throw as success.
      return { status: "lease_held" };
    }
    throw err;
  }
}

async function applyCheckoutOutcome(
  eventId: string,
  leaseToken: string,
  outcome: CheckoutCompletionOutcome,
): Promise<StripeWebhookResult> {
  switch (outcome.outcome) {
    case "handled": {
      const fin = await finalizeStripeWebhookEvent({
        stripeEventId: eventId,
        leaseToken,
        status: "processed",
      });
      if (!fin.ok) return { status: "lease_held" };
      return { status: "processed" };
    }
    case "not_applicable": {
      const fin = await finalizeStripeWebhookEvent({
        stripeEventId: eventId,
        leaseToken,
        status: "skipped",
        failureCode: sanitizeFailureCode(outcome.reason),
      });
      if (!fin.ok) return { status: "lease_held" };
      return { status: "skipped" };
    }
    case "permanent_conflict": {
      const fin = await finalizeStripeWebhookEvent({
        stripeEventId: eventId,
        leaseToken,
        status: "failed_conflict",
        failureCode: sanitizeFailureCode(outcome.reason),
      });
      if (!fin.ok) return { status: "lease_held" };
      return { status: "conflicted" };
    }
    case "retryable_failure": {
      const fin = await finalizeStripeWebhookEvent({
        stripeEventId: eventId,
        leaseToken,
        status: "retryable",
        failureCode: sanitizeFailureCode(outcome.reason),
      });
      if (!fin.ok) return { status: "lease_held" };
      return {
        status: "retryable_error",
        error: sanitizeFailureCode(outcome.reason),
      };
    }
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

function pickAddonCode(candidate: string | undefined): AddonCode | null {
  if (!candidate) return null;
  return isAddonCode(candidate) ? candidate : null;
}

async function deactivateBySubscription(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("engagement_addons")
    .select("engagement_id, addon_code, stripe_subscription_item_id")
    .in("stripe_subscription_item_id", itemIds);

  for (const row of data ?? []) {
    if (!isAddonCode(row.addon_code)) continue;
    await deactivateAddon({
      engagementId: row.engagement_id,
      addonCode: row.addon_code,
      actorType: "integration",
      actorId: "stripe:webhook",
      reason: "subscription_deleted",
    });
  }
}
