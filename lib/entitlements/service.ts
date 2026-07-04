/**
 * Entitlement state-change service. Upserts engagement_addons and publishes
 * entitlement category events to the immutable ledger_events log.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import type { AddonCode } from "./registry";
import { isAddonCode } from "./registry";

export interface ActivateInput {
  engagementId: string;
  addonCode: AddonCode;
  stripeSubscriptionItemId?: string;
  stripePriceId?: string;
  includedVolumeOverride?: number;
  overageUnitPriceCentsOverride?: number;
  actorType: "user" | "system" | "ai_agent" | "integration";
  actorId?: string;
  correlationId?: string;
  notes?: string;
}

export interface DeactivateInput {
  engagementId: string;
  addonCode: AddonCode;
  actorType: "user" | "system" | "ai_agent" | "integration";
  actorId?: string;
  correlationId?: string;
  reason?: string;
}

export async function activateAddon(input: ActivateInput): Promise<{ id: string }> {
  if (!isAddonCode(input.addonCode)) {
    throw new Error(`Unknown addon code: ${input.addonCode}`);
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("engagement_addons")
    .upsert(
      {
        engagement_id: input.engagementId,
        addon_code: input.addonCode,
        is_active: true,
        activated_at: now,
        deactivated_at: null,
        stripe_subscription_item_id: input.stripeSubscriptionItemId ?? null,
        stripe_price_id: input.stripePriceId ?? null,
        included_volume_override: input.includedVolumeOverride ?? null,
        overage_unit_price_cents_override: input.overageUnitPriceCentsOverride ?? null,
        notes: input.notes ?? null,
        created_by: input.actorId ?? null,
      },
      { onConflict: "engagement_id,addon_code" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`activateAddon failed: ${error?.message ?? "no row"}`);
  }

  await publishEvent({
    eventType: "entitlement.activated",
    eventCategory: "entitlement",
    aggregateType: "engagement_addon",
    aggregateId: data.id,
    engagementId: input.engagementId,
    actorType: input.actorType,
    actorId: input.actorId,
    correlationId: input.correlationId,
    payload: {
      addon_code: input.addonCode,
      stripe_subscription_item_id: input.stripeSubscriptionItemId ?? null,
      stripe_price_id: input.stripePriceId ?? null,
      included_volume_override: input.includedVolumeOverride ?? null,
      overage_unit_price_cents_override: input.overageUnitPriceCentsOverride ?? null,
    },
  });

  return { id: data.id };
}

export async function deactivateAddon(
  input: DeactivateInput,
): Promise<{ id: string | null }> {
  if (!isAddonCode(input.addonCode)) {
    throw new Error(`Unknown addon code: ${input.addonCode}`);
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("engagement_addons")
    .update({
      is_active: false,
      deactivated_at: now,
    })
    .eq("engagement_id", input.engagementId)
    .eq("addon_code", input.addonCode)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`deactivateAddon failed: ${error.message}`);
  }

  if (!data) {
    return { id: null };
  }

  await publishEvent({
    eventType: "entitlement.deactivated",
    eventCategory: "entitlement",
    aggregateType: "engagement_addon",
    aggregateId: data.id,
    engagementId: input.engagementId,
    actorType: input.actorType,
    actorId: input.actorId,
    correlationId: input.correlationId,
    payload: {
      addon_code: input.addonCode,
      reason: input.reason ?? null,
    },
  });

  return { id: data.id };
}
