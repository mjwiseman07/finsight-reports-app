/**
 * Stripe webhook → entitlement sync. Idempotent via stripe_webhook_events PK.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { activateAddon, deactivateAddon } from "./service";
import { isAddonCode, type AddonCode } from "./registry";

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

const HANDLED_TYPES = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function handleStripeWebhook(
  event: MinimalStripeEvent,
  rawPayload: unknown,
): Promise<{ status: "processed" | "skipped" | "duplicate" }> {
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
      return { status: "duplicate" };
    }
    throw new Error(`stripe_webhook_events insert failed: ${insertError.message}`);
  }

  if (!HANDLED_TYPES.has(event.type)) {
    await markProcessed(event.id, "skipped");
    return { status: "skipped" };
  }

  try {
    const sub = event.data.object;
    const engagementId = sub.metadata?.engagement_id;

    if (!engagementId) {
      await markProcessed(event.id, "skipped", "no engagement_id in subscription metadata");
      return { status: "skipped" };
    }

    if (event.type === "customer.subscription.deleted") {
      await deactivateBySubscription(sub.items?.data.map((i) => i.id) ?? []);
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
    await markProcessed(event.id, "failed", err instanceof Error ? err.message : String(err));
    throw err;
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
