/**
 * Review Assist Pro entitlement checks for /reviewer.
 */
import { createServiceClient } from "@/lib/supabase/service";
import {
  RA_PRO_TIER_KEY,
  isRaProAuthorizingPilotStatus,
} from "@/lib/review-assist-pro/limits";

export type RaProFirmEntitlement = {
  firmId: string;
  billingCompanyId: string;
  pilotStatus: string;
};

/**
 * A firm is RA Pro–entitled when it has a canonical billing_company_id and that
 * company owns an authorizing review_assist_pro pilot_slots row.
 */
export async function resolveRaProEntitlementForFirm(
  firmId: string,
): Promise<RaProFirmEntitlement | null> {
  const supabase = createServiceClient();
  const { data: firm, error: firmErr } = await supabase
    .from("firms")
    .select("id, billing_company_id")
    .eq("id", firmId)
    .maybeSingle();
  if (firmErr) throw firmErr;
  if (!firm?.billing_company_id) return null;

  const { data: slot, error: slotErr } = await supabase
    .from("pilot_slots")
    .select("pilot_status, tier_key")
    .eq("company_id", firm.billing_company_id)
    .eq("tier_key", RA_PRO_TIER_KEY)
    .maybeSingle();
  if (slotErr) throw slotErr;
  if (!slot || !isRaProAuthorizingPilotStatus(slot.pilot_status as string)) {
    return null;
  }

  return {
    firmId: firm.id as string,
    billingCompanyId: firm.billing_company_id as string,
    pilotStatus: slot.pilot_status as string,
  };
}

/**
 * Filter membership firm IDs to those authorized for /reviewer under RA Pro 1A.
 * Firms without billing_company_id keep legacy firm-tier access (RA base / solo BK).
 * Firms with billing_company_id require an authorizing RA Pro company subscription.
 */
export async function filterReviewerAuthorizedFirmIds(
  firmIds: string[],
): Promise<string[]> {
  if (firmIds.length === 0) return [];
  const supabase = createServiceClient();

  const { data: firms, error } = await supabase
    .from("firms")
    .select("id, billing_company_id")
    .in("id", firmIds);
  if (error) throw error;

  const linked: Array<{ id: string; billing_company_id: string }> = [];
  const unlinked: string[] = [];
  for (const f of firms ?? []) {
    if (f.billing_company_id) {
      linked.push({ id: f.id as string, billing_company_id: f.billing_company_id as string });
    } else {
      unlinked.push(f.id as string);
    }
  }

  if (linked.length === 0) return unlinked;

  const companyIds = [...new Set(linked.map((f) => f.billing_company_id))];
  const { data: slots, error: slotErr } = await supabase
    .from("pilot_slots")
    .select("company_id, pilot_status")
    .eq("tier_key", RA_PRO_TIER_KEY)
    .in("company_id", companyIds);
  if (slotErr) throw slotErr;

  const authorizedCompanies = new Set(
    (slots ?? [])
      .filter((s) => isRaProAuthorizingPilotStatus(s.pilot_status as string))
      .map((s) => s.company_id as string),
  );

  const entitledLinked = linked
    .filter((f) => authorizedCompanies.has(f.billing_company_id))
    .map((f) => f.id);

  return [...unlinked, ...entitledLinked];
}
