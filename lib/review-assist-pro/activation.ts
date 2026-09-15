/**
 * Review Assist Pro activation — thin service-role wrapper around the
 * transactional RPC `activate_review_assist_pro_subscription`.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { RA_PRO_TIER_KEY } from "@/lib/review-assist-pro/limits";

export type RaProActivationInput = {
  companyId: string;
  buyerUserId: string;
  firmName: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  pricingStructure: string;
  pricingCadence: string;
  track: "pilot" | "standard";
};

export type RaProActivationResult = {
  ok: true;
  company_id: string;
  firm_id: string;
  membership_id: string;
  pilot_slot_id: string;
  pilot_slot_number: number | null;
  created_firm: boolean;
  track: string;
};

export class RaProActivationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "RaProActivationError";
  }
}

function mapRpcError(err: { message?: string; code?: string }): RaProActivationError {
  const msg = String(err.message || "activation_failed");
  if (msg.includes("pilot_cap_reached")) {
    return new RaProActivationError("pilot_cap_reached", "pilot_cap_reached");
  }
  if (msg.includes("activate_ra_pro_subscription_conflict")) {
    return new RaProActivationError("subscription_conflict", "subscription_conflict");
  }
  if (msg.includes("activate_ra_pro_customer_conflict")) {
    return new RaProActivationError("customer_conflict", "customer_conflict");
  }
  if (msg.includes("ra_pro_seat_cap_reached")) {
    return new RaProActivationError("seat_cap_reached", "seat_cap_reached");
  }
  if (msg.includes("activate_ra_pro_company_not_found")) {
    return new RaProActivationError("company_not_found", "company_not_found");
  }
  return new RaProActivationError(msg, err.code || "activation_failed");
}

export async function activateReviewAssistProSubscription(
  input: RaProActivationInput,
): Promise<RaProActivationResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("activate_review_assist_pro_subscription", {
    p_company_id: input.companyId,
    p_buyer_user_id: input.buyerUserId,
    p_firm_name: input.firmName,
    p_stripe_subscription_id: input.stripeSubscriptionId,
    p_stripe_customer_id: input.stripeCustomerId,
    p_pricing_structure: input.pricingStructure,
    p_pricing_cadence: input.pricingCadence,
    p_track: input.track,
  });

  if (error) throw mapRpcError(error);
  if (!data || typeof data !== "object" || (data as { ok?: boolean }).ok !== true) {
    throw new RaProActivationError("activation_invalid_response", "activation_failed");
  }
  return data as RaProActivationResult;
}

export { RA_PRO_TIER_KEY };
