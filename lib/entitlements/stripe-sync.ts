/**
 * Stripe webhook → entitlement sync. Idempotent via stripe_webhook_events PK.
 *
 * Checkout outcomes from handleTcp1CheckoutCompleted drive ledger status:
 * - handled → processed
 * - not_applicable → skipped
 * - permanent_conflict → failed (tagged permanent_conflict:…)
 * - retryable_failure → ledger row deleted so Stripe can retry
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
  | { status: "retryable_error"; error: string };

const HANDLED_TYPES = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
]);

const TERMINAL_STATUSES = new Set(["processed", "skipped", "failed"]);

export async function handleStripeWebhook(
  event: MinimalStripeEvent,
  rawPayload: unknown,
): Promise<StripeWebhookResult> {
  const supabase = createServiceClient();

  const { error: insertError } = await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processing_status: "processing",
    raw_payload: rawPayload ?? event,
    livemode: Boolean(event.livemode),
  });

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      const { data: existing } = await supabase
        .from("stripe_webhook_events")
        .select("processing_status")
        .eq("stripe_event_id", event.id)
        .maybeSingle();
      const status = (existing?.processing_status as string | undefined) ?? "processed";
      if (TERMINAL_STATUSES.has(status)) {
        return { status: "duplicate" };
      }
      // Non-terminal (e.g. stuck "processing") — reclaim for a fresh attempt.
      await supabase
        .from("stripe_webhook_events")
        .update({
          processing_status: "processing",
          processing_error: null,
          processed_at: null,
          raw_payload: rawPayload ?? event,
        })
        .eq("stripe_event_id", event.id);
    } else {
      throw new Error(`stripe_webhook_events insert failed: ${insertError.message}`);
    }
  }

  if (!HANDLED_TYPES.has(event.type)) {
    await markProcessed(event.id, "skipped");
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
      return applyCheckoutOutcome(event.id, outcome);
    }

    const sub = event.data.object;
    const engagementId = sub.metadata?.engagement_id;

    if (!engagementId) {
      // No engagement metadata = pilot-tier subscription (Solo BK, Review Assist,
      // Review Assist Pro). D-Entitlements does not own these, but we still
      // must reconcile pilot_slots on status transitions. This closes the
      // CRITICAL #1 hole where customer.subscription.updated → canceled/unpaid
      // never reached the pilot_slots table.
      if (event.type === "customer.subscription.deleted" && sub.id) {
        await reconcilePilotSlotStatus(sub.id, "canceled");
      } else if (event.type === "customer.subscription.updated" && sub.id) {
        const stripeStatus = sub.status ?? "active";
        await reconcilePilotSlotStatus(sub.id, stripeStatus);
      }
      await markProcessed(event.id, "skipped", "no engagement_id in subscription metadata (pilot_slots reconciled)");
      return { status: "skipped" };
    }

    if (event.type === "customer.subscription.deleted") {
      await deactivateBySubscription(sub.items?.data.map((i) => i.id) ?? []);
      if (sub.id) {
        await handleTcp1SubscriptionDeleted(sub.id);
        // Belt-and-suspenders: reconcile via the shared mapping in case the
        // subscription has no engagement metadata but does have a pilot_slots
        // row (pilot-tier subs go through the create-session flow which sets
        // tier_key but not engagement_id).
        await reconcilePilotSlotStatus(sub.id, "canceled");
      }
      await markProcessed(event.id, "processed");
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

    await markProcessed(event.id, "processed");
    return { status: "processed" };
  } catch (err) {
    // Do not consume idempotency on unexpected failures — allow Stripe retry.
    await releaseEventForRetry(event.id);
    throw err;
  }
}

async function applyCheckoutOutcome(
  eventId: string,
  outcome: CheckoutCompletionOutcome,
): Promise<StripeWebhookResult> {
  switch (outcome.outcome) {
    case "handled":
      await markProcessed(eventId, "processed");
      return { status: "processed" };
    case "not_applicable":
      await markProcessed(eventId, "skipped", outcome.reason);
      return { status: "skipped" };
    case "permanent_conflict":
      await markProcessed(
        eventId,
        "failed",
        `permanent_conflict:${outcome.reason}`,
      );
      return { status: "conflicted" };
    case "retryable_failure":
      await releaseEventForRetry(eventId);
      return { status: "retryable_error", error: outcome.reason };
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

async function markProcessed(
  eventId: string,
  status: "processed" | "skipped" | "failed",
  error?: string,
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("stripe_webhook_events")
    .update({
      processing_status: status,
      processed_at: new Date().toISOString(),
      processing_error: error ?? null,
    })
    .eq("stripe_event_id", eventId);
}

async function releaseEventForRetry(eventId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("stripe_webhook_events").delete().eq("stripe_event_id", eventId);
}
