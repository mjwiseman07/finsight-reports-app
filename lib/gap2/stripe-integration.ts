import { createServiceClient } from "@/lib/supabase/service";
import {
  sendPurgeScheduledEmail,
  sendReactivationConfirmedEmail,
} from "@/lib/gap2/notifications";

/** Resolve firm id from Stripe subscription id. Company subscribers return null (firm purge only). */
export async function resolveFirmIdFromSubscription(
  stripe_subscription_id: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("subscriber_id, subscriber_type")
    .eq("stripe_subscription_id", stripe_subscription_id)
    .maybeSingle();
  if (!data) return null;
  if (data.subscriber_type !== "firm") return null;
  return data.subscriber_id as string;
}

export async function scheduleGap2Purge(args: {
  firm_id: string;
  stripe_subscription_id: string;
  stripe_customer_id?: string | null;
  reason: string;
  stripe_event_id?: string;
  triggered_by_user_id?: string | null;
  grace_days?: number;
}): Promise<string | null> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("subscription_purge_schedule")
    .select("id")
    .eq("firm_id", args.firm_id)
    .eq("status", "scheduled")
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", args.stripe_subscription_id)
    .maybeSingle();

  const { data, error } = await supabase.rpc("gap2_schedule_purge", {
    p_firm_id: args.firm_id,
    p_subscription_id: subRow?.id ?? null,
    p_stripe_subscription_id: args.stripe_subscription_id,
    p_stripe_customer_id: args.stripe_customer_id ?? null,
    p_reason: args.reason,
    p_triggered_by_user_id: args.triggered_by_user_id ?? null,
    p_triggered_by_stripe_event_id: args.stripe_event_id ?? null,
    p_grace_days: args.grace_days ?? 30,
  });

  if (error) {
    console.error("[gap2] schedule_purge failed", error);
    throw error;
  }

  const schedule_id = data as string | null;
  if (schedule_id) {
    void sendPurgeScheduledEmail(args.firm_id, schedule_id).catch((e) =>
      console.error("[gap2] notification email failed", e),
    );
  }
  return schedule_id;
}

export async function cancelGap2Purge(args: {
  firm_id: string;
  reason: string;
  stripe_event_id?: string;
  actor_user_id?: string | null;
}): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("gap2_cancel_purge", {
    p_firm_id: args.firm_id,
    p_cancelled_reason: args.reason,
    p_actor_user_id: args.actor_user_id ?? null,
  });
  if (error) {
    console.error("[gap2] cancel_purge failed", error);
    return null;
  }
  const schedule_id = data as string | null;
  if (schedule_id) {
    void sendReactivationConfirmedEmail(args.firm_id).catch((e) =>
      console.error("[gap2] reactivation email failed", e),
    );
  }
  return schedule_id;
}
